# 一对一引导咨询：服务人联系方式分级匹配设计

> **日期：** 2026-09-17
> **状态：** 已评审通过，待实施

## Goal

C 端咨询弹窗的微信/网点联系方式按「服务人 → 城市就近 → 全局」三级匹配展示，服务人配置低频变更、写入时更新缓存。

## 背景与现状

- 现有 `wealth-consult-config` 为**全局单条**配置：企业/个人微信二维码 + 微信号，`GET /v1/wealth/consult/config` 公开接口供 C 端咨询弹窗读取
- 推荐人关系在 zhao-sso：`sso_referral_relations`（inviter→invitee），sso_user 有 `invited_by` 字段；邀请码即 sso_user 邀请码，全局统一
- 当前代码**无**城市、网点、服务人维度

## 业务语义

- **服务人**：实际运营人员，通过一对一邀请码邀请客户。给谁建了服务人配置，谁即被视为服务人（不依赖角色字段）
- **客户邀请客户**：被邀请客户没有就近服务人，城市配置为其就近兜底
- **全局配置**：覆盖城市以外区域的最终兜底
- 企业微信二维码图片未上传时，微信 Tab 仅展示个人微信

## 数据模型

新 content-type：`wealth-consult-contact`，表 `wealth_consult_contacts`（一条记录 = 一个服务人）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `inviterId` | integer | 必填，唯一 | 服务人 sso_user id（邀请码全局唯一） |
| `nickname` | string | 可空 | 服务人员昵称 |
| `branchName` | string | 可空 | 网点名称 |
| `branchPhones` | json 数组 | 可空 | 网点电话，可多部 |
| `latitude` | decimal | 可空 | 纬度 |
| `longitude` | decimal | 可空 | 经度 |
| `city` | string | 可空 | 服务人所属城市（就近匹配键） |
| `enterpriseWechatQr` | media 单图 | 可空 | 企业微信二维码 |
| `enterpriseWechatId` | string | 可空 | 企业微信号 |
| `personalWechatQr` | media 单图 | 可空 | 个人微信二维码 |
| `personalWechatId` | string | 可空 | 个人微信号 |

## 匹配链路

`resolveContact({ userId, city, latitude, longitude })`：

```
1. userId 有 invited_by 且该推荐人 inviterId 命中服务人配置 → 返回该服务人配置
2. 否则按 city 查该城市服务人列表 →
     ├─ 命中 1 个 → 返回
     ├─ 命中多个 → 有经纬度按距离最近；无经纬度按 id 升序取第一 → 返回
     └─ 未命中 → 3
3. 读全局 wealth-consult-config →
     ├─ 企业微信二维码图片存在 → 返回企业+个人
     ├─ 仅个人微信图片 → 只返回个人
     └─ 都无 → 空字段占位（现状行为）
```

**跨城市不走就近搜索，城市未命中直接落全局兜底。**

## 接口

### `GET /api/zhao-wealth/v1/wealth/consult/config`（增强）

新增可选 query：`city`、`latitude`、`longitude`。返回结构与现状保持一致（含企业/个人微信 + 新增服务人字段）：

```json
{
  "code": 200,
  "data": {
    "nickname": "王经理",
    "branchName": "青岛银行市南支行",
    "branchPhones": ["0532-88886666", "13800000000"],
    "enterpriseWechatQr": "https://.../qr_ent.png",
    "enterpriseWechatId": "qd_wealth",
    "personalWechatQr": "https://.../qr_personal.png",
    "personalWechatId": "wang_1888"
  }
}
```

### 管理端

- `POST /api/zhao-wealth/v1/admin/consult-contacts` 创建服务人配置
- `GET /api/zhao-wealth/v1/admin/consult-contacts?page=&pageSize=` 列表
- `PUT /api/zhao-wealth/v1/admin/consult-contacts/:id` 更新
- `DELETE /api/zhao-wealth/v1/admin/consult-contacts/:id` 删除
- 写操作成功后失效服务层缓存对应键
- 服务人选择：管理端经 zhao-sso 现有 `GET /sso-user`（权限 `sso.user-read`）列表选择 inviterId

## C 端（strapi-wealth）

- 详情页咨询弹窗打开时尝试定位（H5 浏览器 Geolocation / `uni.getLocation`），成功携带 `city`+经纬度；失败/拒权 → 不带 city，自然落全局兜底
- 展示层沿用现状：企业微信有图展示企业+个人，无图仅个人；新增网点名称/服务人昵称/电话展示

## 风险点与决策

1. **H5 定位**：浏览器原生 Geolocation 拿经纬度（HTTPS 免 key），城市名由后端逆地理解析（腾讯地图 WebService key 仅存服务端 `apis.map.qq.com/ws/geocoder/v1/`）；定位失败降级全局兜底。前端不改集成 SDK。
2. **服务人识别**：只认 `wealth_consult_contacts.inviterId` 是否包含 `invited_by`，不引入角色字段。
3. **企业微信无图降级**：沿用现状仅显示个人微信，新接口保证返回结构一致。

## 缓存

- 服务层内存缓存，键：`inviter:{id}`、`city:{name}`、`global`
- 管理端写操作（增改删）后失效对应键；服务人表低频变更，不设 TTL 复杂策略
- 全局 `wealth-consult-config` 变更同步刷新 `global` 键

## 测试要点

- 匹配链路单测：邀请人命中 / 邀请人非服务人 → 城市 / 城市多服务人最近 / 城市未命中 → 全局 / 全局空占位 / 企业微信无图降级
- 缓存失效：写操作后对应键失效
- 接口契约：新增字段不破坏现有 C 端弹窗解析

## 范围外

- 不做跨城市就近搜索
- 不新增 sso_user 角色/字段
- 不改造现有全局 `wealth-consult-config` 表结构
