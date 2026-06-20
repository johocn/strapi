# zhao-point Content-API 手册

基础 URL: `http://localhost:1337/api/zhao-point`

## 路由层级

| 层级 | URL 模式 | 认证 | 说明 |
|------|---------|------|------|
| 公开 | `/v1/...` | 无 | 浏览类接口，无需登录 |
| 注册用户 | `/v1/my/...` | zhao-auth JWT (is-authenticated) | 已登录用户个人操作 |
| 管理员 | `/v1/admin/...` | zhao-auth JWT + has-point-permission | 管理操作，需特定角色 |

## 认证方式

- 公开路由：无需认证
- 注册用户/管理员路由：请求头 `Authorization: Bearer <token>`

## 通用查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码（默认 1） |
| pageSize | integer | 每页条数（默认 20） |

---

## 一、公开路由

### 1.1 积分规则

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/point/rules` | 查询积分规则 |

#### GET /v1/point/rules 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| action | string | 按动作过滤 |
| category | string | 按分类过滤 |

### 1.2 兑换商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/point/products` | 商品列表 |
| GET | `/v1/point/products/:id` | 商品详情 |

#### GET /v1/point/products 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态过滤（默认 on_shelf） |
| deliveryType | string | 配送方式过滤 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 1.3 兑换比率

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/point/exchange-rate` | 查询积分兑换比率 |

#### GET /v1/point/exchange-rate 响应

```json
{
  "rate": 1.0
}
```

---

## 二、注册用户路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated`

### 2.1 积分查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/my/point/balance` | 查询积分余额 |
| GET | `/v1/my/point/records` | 查询积分记录 |
| GET | `/v1/my/point/statistics` | 查询积分统计 |

#### GET /v1/my/point/records 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 |
| pageSize | integer | 每页条数 |
| action | string | 按动作过滤 |
| type | string | 按类型过滤 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 2.2 积分兑换

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/my/point/redeem` | 兑换商品 |
| GET | `/v1/my/point/redeem/records` | 查询兑换记录 |

#### POST /v1/my/point/redeem 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | **是** | 商品 ID |
| itemName | string | 否 | 商品名称 |
| pointsCost | integer | **是** | 消耗积分 |
| quantity | integer | **是** | 兑换数量 |
| deliveryType | string | **是** | 配送方式 |
| receiverName | string | 否 | 收件人姓名 |
| receiverPhone | string | 否 | 收件人电话 |
| receiverAddress | string | 否 | 收件人地址 |
| remark | string | 否 | 备注 |

#### GET /v1/my/point/redeem/records 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态过滤 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 2.3 积分核销

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/my/point/verify/qrcode` | 生成核销二维码 |
| POST | `/v1/my/point/verify/scan` | 扫码核销 |
| POST | `/v1/my/point/verify/manual` | 手动核销 |
| GET | `/v1/my/point/verify/log` | 查询核销记录 |

#### POST /v1/my/point/verify/qrcode 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 否 | 渠道 ID |
| direction | string | 否 | 核销方向 |

#### POST /v1/my/point/verify/scan 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | **是** | 二维码 token |
| location | string | 否 | 位置信息 |

#### POST /v1/my/point/verify/manual 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| verifiedUserId | string | **是** | 被核销用户 ID |
| channelId | string | 否 | 渠道 ID |
| direction | string | 否 | 核销方向 |
| remark | string | 否 | 备注 |

#### GET /v1/my/point/verify/log 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| direction | string | 核销方向 |
| status | string | 状态 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 2.4 可用动作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/my/point/eligible-actions` | 查询可用积分动作 |

#### GET /v1/my/point/eligible-actions 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| channelId | string | 渠道 ID |

---

## 三、管理员路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated` + `has-point-permission`

### 3.1 积分发放/扣除

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/v1/admin/point/earn` | point.grant | 发放积分 |
| POST | `/v1/admin/point/deduct` | point.grant | 扣除积分 |

#### POST /v1/admin/point/earn 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | **是** | 积分动作标识 |
| source | string | 否 | 来源 |
| method | string | 否 | 获取方式 |
| remark | string | 否 | 备注 |
| orderId | string | 否 | 关联订单 ID |
| channelId | string | 否 | 关联渠道 ID |

#### POST /v1/admin/point/deduct 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | **是** | 积分动作标识 |
| points | integer | **是** | 扣除积分数 |
| source | string | 否 | 来源 |
| method | string | 否 | 扣除方式 |
| remark | string | 否 | 备注 |
| orderId | string | 否 | 关联订单 ID |

---

## 四、角色权限矩阵

| 权限动作 | admin | channel-admin | plugin-manager | instructor | user |
|---------|-------|--------------|----------------|------------|------|
| point.grant | ✅ | ✅ | ✅ | - | - |
| point.read | ✅ | ✅ | ✅ | - | ✅ |
| point-redeem | - | - | - | - | ✅ |
| point-record.read | ✅ | ✅ | ✅ | - | ✅ |
| point-rule.read | ✅ | ✅ | ✅ | - | - |
| point-rule.create/update | ✅ | ✅ | ✅ | - | - |
| point-rule.delete | ✅ | ✅ | - | - | - |
| point-product.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| point-product.create/update | ✅ | ✅ | ✅ | - | - |
| point-product.delete | ✅ | ✅ | - | - | - |
| point-redemption.read | ✅ | ✅ | ✅ | - | ✅ |
| point-redemption.approve | ✅ | ✅ | ✅ | - | - |
| point-config.read | ✅ | ✅ | ✅ | - | - |
| point-config.update | ✅ | ✅ | - | - | - |

---

## 五、Strapi Admin 后台路由

基础 URL: `http://localhost:1337/admin/plugins/zhao-point`

认证方式: Strapi admin session（Cookie 自动），`policies: []`

| 路径 | 说明 |
|------|------|
| `/point-rules` | 积分规则 CRUD |
| `/rule-templates` | 规则模板 CRUD |
| `/point-records` | 积分记录管理 |
| `/point-redemptions` | 兑换审核 |
| `/products` | 商品管理 |
| `/config` | 系统配置 |
| `/verifications` | 核销管理 |
| `/dashboard` | 仪表盘 |
