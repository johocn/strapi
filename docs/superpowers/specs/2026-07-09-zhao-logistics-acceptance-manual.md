# zhao-logistics 插件手工验收文档

> 版本：1.0.0 | 日期：2026-07-09 | 配套设计：[2026-07-09-zhao-logistics-plugin-design.md](./2026-07-09-zhao-logistics-plugin-design.md)

---

## 目录

- [1. 验收概览](#1-验收概览)
- [2. 环境与账号准备](#2-环境与账号准备)
- [3. 依赖验收](#3-依赖验收)
- [4. 核心业务 CT 验收（8 个）](#4-核心业务-ct-验收8-个)
- [5. 获客成交 CT 验收（7 个）](#5-获客成交-ct-验收7-个)
- [6. 扩展现有 CT 验收（3 个）](#6-扩展现有-ct-验收3-个)
- [7. Services 验收（6 个）](#7-services-验收6-个)
- [8. Admin API 验收](#8-admin-api-验收)
- [9. Content API 验收](#9-content-api-验收)
- [10. 关键集成点验收](#10-关键集成点验收)
- [11. 权限验收](#11-权限验收)
- [12. 定时任务验收](#12-定时任务验收)

---

## 1. 验收概览

### 1.1 验收范围

| 类别 | 数量 | 说明 |
|------|------|------|
| 新建 CT | 16 个 | 8 核心业务 + 7 获客成交 + 1 漏斗事件表 |
| 扩展 CT | 3 个 | lead / brand-info / first-truth-policy |
| Services | 6 个 | quote-engine / tracking-aggregator / dynamic-form / funnel-tracker / referral-engine / customer-aggregator |
| Admin API | 16 套 CRUD + 10 个特殊操作 | |
| Content API | 15 个公开接口 | |
| 集成点 | 4 个 | 询价全链路 / 追踪订阅 / 推荐转化 / 漏斗追踪 |
| 定时任务 | 2 个 | 追踪同步 / 订阅通知 |

### 1.2 验收标准

- ✅ 通过：功能符合设计，无报错
- ⚠️ 部分通过：功能可用但有缺陷，需记录
- ❌ 失败：功能不可用或与设计不符

---

## 2. 环境与账号准备

### 2.1 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | 20.0+ |
| PostgreSQL | 14+ |
| Strapi | v5 |
| 插件 | zhao-common / zhao-website / zhao-point / zhao-auth / zhao-tag 已安装 |

### 2.2 启动步骤

1. 启动 Strapi：`cd e:\code\basic && npm run develop`
2. 确认控制台输出 `Server listening on http://localhost:1337`
3. 确认日志中无插件加载错误
4. 访问 `http://localhost:1337/admin` 登录后台

### 2.3 测试账号

| 角色 | 用户名 | 用途 |
|------|--------|------|
| super-admin | admin | 全量验收 |
| admin | test_admin | 验证 tracking-provider 权限隔离 |
| editor | test_editor | 验证内容管理权限 |
| viewer | test_viewer | 验证只读权限 |

### 2.4 测试数据准备

- 至少 1 个 site-config（含 domain）
- 至少 1 个 channel
- 至少 1 个 site-template
- brand-info 已配置（用于扩展验收）

---

## 3. 依赖验收

### 3.1 插件加载验证

**验收点**：Strapi 启动后 zhao-logistics 插件正常加载

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 启动日志无错误 | 无 `plugin::zhao-logistics` 加载错误 | | |
| 后台左侧菜单显示 | 出现 zhao-logistics 相关 CT 分组 | | |
| Content Manager 可见 16 个 CT | 在 Collection Types 列表中可见 | | |

### 3.2 数据库迁移验证

**验收点**：迁移脚本正确执行

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| zhao_schema_migrations 有记录 | 包含 zhao-logistics 的 001/002 两条 | | |
| 16 个表已创建 | psql 查询 `\dt zhao_logistics_*` 返回 16 个表 | | |
| 索引已创建 | tracking_shipments(site_id,tracking_no) UNIQUE 等 | | |

### 3.3 跨插件依赖验证

| 依赖插件 | 验证方法 | 预期 | 结果 |
|----------|----------|------|------|
| zhao-common | site-config 可查询 | 可查 | |
| zhao-website | lead CT 可创建 | 可创建 | |
| zhao-point | earnPoints 方法可调用 | 可调用 | |
| zhao-auth | 用户登录正常 | 正常 | |

---

## 4. 核心业务 CT 验收（8 个）

### 4.1 quote-request（询价单）

#### 4.1.1 表单字段验收

**后台编辑页字段清单**：

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | site-config 列表 | 可选择当前用户有权限的站点 |
| 2 | trackingNo | 询价单号 | 文本 | 否 | 自动生成 | 格式 QR+YYYYMMDD+3 位序号 | 保存后自动填充 |
| 3 | routeId | 线路 ID | 文本 | 是 | - | 如 cn-jp | 必填校验生效 |
| 4 | origin | 起运地 | 文本 | 是 | - | 如 上海 | 必填校验生效 |
| 5 | destination | 目的地 | 文本 | 是 | - | 如 东京 | 必填校验生效 |
| 6 | serviceProvider | 服务商 | 文本 | 否 | - | FBA/parcel/consolidation/special | 可空 |
| 7 | cargoType | 货物类型 | 文本 | 是 | - | 如 普货/带电/液体 | 必填校验生效 |
| 8 | weight | 重量 | 小数 | 是 | - | 单位 kg | 必填校验生效 |
| 9 | volume | 体积 | 小数 | 否 | - | 单位 m³ | 可空 |
| 10 | formData | 动态字段数据 | JSON | 是 | `{}` | key-value 对象 | JSON 格式校验 |
| 11 | quotedPrice | 报价结果 | JSON | 否 | - | {minPrice,maxPrice,currency,breakdown} | 可空（未报价时） |
| 12 | status | 状态 | 枚举 | 是 | submitted | draft/submitted/quoted/accepted/rejected/expired | 默认 submitted |
| 13 | leadId | 关联线索 ID | 文本 | 否 | - | lead documentId | 提交后自动创建 lead 并回填 |
| 14 | customerName | 联系人 | 文本 | 是 | - | 最长 100 字符 | 必填校验生效 |
| 15 | customerContact | 联系方式 | 文本 | 是 | - | JSON: {type,value} | 必填校验生效 |
| 16 | customerType | 客户类型 | 枚举 | 否 | - | individual/business/fba_seller | 可空 |
| 17 | utmSource | UTM 来源 | 文本 | 否 | - | 最长 100 字符 | 可空 |
| 18 | utmMedium | UTM 媒介 | 文本 | 否 | - | 最长 100 字符 | 可空 |
| 19 | utmCampaign | UTM 活动 | 文本 | 否 | - | 最长 100 字符 | 可空 |
| 20 | lang | 提交语言 | 文本 | 是 | - | cn/jp/kr/vn | 必填校验生效 |
| 21 | remark | 备注 | 长文本 | 否 | - | - | 可空 |
| 22 | expiresAt | 报价过期时间 | 日期时间 | 否 | - | - | 可空 |
| 23 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | 删除时自动填充 |

#### 4.1.2 列表页验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 列表显示字段 | trackingNo/routeId/destination/status/customerName/createdAt | | |
| 搜索功能 | 可按 trackingNo/customerName 搜索 | | |
| 状态筛选 | 可按 status 筛选 | | |
| 分页 | 默认每页 10 条 | | |
| 租户隔离 | 仅显示当前 site 的数据 | | |

#### 4.1.3 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| trackingNo 自动生成 | 创建时为空，保存后生成 QR+日期+序号 | | |
| status 流转 | submitted→quoted（报价后）→accepted/rejected | | |
| expiresAt 默认逻辑 | 报价后默认 7 天过期 | | |
| 软删 | 删除后 deletedAt 填充，列表不显示 | | |
| 租户隔离 | site 字段必填，查询按 site 过滤 | | |

---

### 4.2 quote-field-rule（动态字段规则）

#### 4.2.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | site-config 列表 | 可选 |
| 2 | name | 规则名称 | 文本(本地化) | 是 | - | 如「中日线 FBA 字段」 | 多语言可编辑 |
| 3 | routeId | 适用线路 ID | 文本 | 否 | - | 空表示全线路通用 | 可空 |
| 4 | serviceProvider | 适用服务商 | 文本 | 否 | - | 空表示全部 | 可空 |
| 5 | customerType | 适用客户类型 | 枚举 | 否 | - | individual/business/fba_seller | 可空 |
| 6 | isActive | 启用状态 | 布尔 | 是 | true | true/false | 默认 true |
| 7 | priority | 优先级 | 整数 | 否 | 0 | 数值越大越优先 | 可空 |
| 8 | fields | 字段定义 | JSON(本地化) | 是 | `[]` | 字段定义数组 | JSON 格式校验 |
| 9 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.2.2 fields JSON 结构验收

**验收点**：fields JSON 是否支持完整字段定义

| 字段属性 | 类型 | 必填 | 验收点 |
|----------|------|------|--------|
| key | string | 是 | 字段唯一标识，如 iossNumber |
| label | string | 是 | 显示标签，如「IOSS 编号」 |
| type | enum | 是 | text/number/select/checkbox/textarea/date/file |
| group | string | 否 | 分组标识，如 tax |
| required | boolean | 否 | 是否必填，默认 false |
| visibleWhen | object | 否 | 显隐联动：{field, op, value} |
| options | array | 否 | select 类型的选项列表 |
| validation | object | 否 | 校验规则：{pattern, min, max, messageKey} |
| unit | string | 否 | 单位，如 kg |
| placeholder | string | 否 | 占位提示 |
| permission | string | 否 | 权限标识，如 authenticated |
| order | integer | 否 | 排序序号 |

**测试用例**：

```json
[
  {
    "key": "iossNumber",
    "label": "IOSS 编号",
    "type": "text",
    "group": "tax",
    "required": true,
    "visibleWhen": { "field": "destination", "op": "eq", "value": "日本" },
    "validation": { "pattern": "^[A-Z]{2}[0-9]{10}$", "messageKey": "validation.iossFormat" },
    "placeholder": "请输入 IOSS 编号",
    "order": 1
  },
  {
    "key": "fbaWarehouse",
    "label": "FBA 仓库代码",
    "type": "select",
    "group": "logistics",
    "required": true,
    "visibleWhen": { "field": "serviceProvider", "op": "eq", "value": "FBA" },
    "options": [
      {"label": "东京仓", "value": "NRT1"},
      {"label": "大阪仓", "value": "KIX1"}
    ],
    "order": 2
  }
]
```

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| JSON 可保存 | 上述测试用例可正常保存 | | |
| JSON 格式错误时报错 | 缺少 key 时返回校验错误 | | |
| 多语言编辑 | 切换语言可编辑 label/placeholder | | |

#### 4.2.3 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 规则匹配优先级 | 按 priority 降序，取最高 | | |
| 多条件匹配 | routeId+serviceProvider+customerType 都满足才命中 | | |
| 空条件通配 | routeId 为空表示全线路通用 | | |

---

### 4.3 quote-price-rule（报价规则表）

#### 4.3.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | routeId | 线路 ID | 文本 | 是 | - | 如 cn-jp | 必填 |
| 3 | serviceProvider | 服务商 | 文本 | 是 | - | FBA/parcel/consolidation/special | 必填 |
| 4 | minWeight | 重量下限 | 小数 | 是 | - | 单位 kg | 必填 |
| 5 | maxWeight | 重量上限 | 小数 | 是 | - | 单位 kg | 必填，>minWeight |
| 6 | pricePerKg | 每 kg 单价 | 小数 | 是 | - | 如 35.5 | 必填，>0 |
| 7 | currency | 币种 | 文本 | 是 | CNY | CNY/JPY/USD | 默认 CNY |
| 8 | volumetricFactor | 体积系数 | 整数 | 否 | - | 如 6000 | 可空 |
| 9 | minCharge | 最低收费 | 小数 | 否 | - | 如 100 | 可空 |
| 10 | surcharges | 附加费 | JSON | 否 | `[]` | [{name,amount}] | 可空 |
| 11 | formulaId | 绑定公式 | 关联选择 | 否 | - | quote-price-formula 列表 | 可空 |
| 12 | effectiveFrom | 生效日期 | 日期 | 是 | - | YYYY-MM-DD | 必填 |
| 13 | effectiveTo | 失效日期 | 日期 | 否 | - | YYYY-MM-DD | 可空，>effectiveFrom |
| 14 | isActive | 启用状态 | 布尔 | 是 | true | - | 默认 true |
| 15 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.3.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 重量区间匹配 | weight >= minWeight 且 weight <= maxWeight | | |
| 附加费 JSON 格式 | [{name:"燃油附加费",amount:50}] | | |
| 生效日期校验 | effectiveTo > effectiveFrom | | |
| 规则去重 | 同 routeId+serviceProvider+weight 区间不重叠 | | |

---

### 4.4 quote-price-formula（报价公式模板）

#### 4.4.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 验收点 |
|------|--------|------|------|------|--------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | 可选 |
| 2 | name | 公式名称 | 文本(本地化) | 是 | - | 多语言 |
| 3 | description | 公式说明 | 长文本(本地化) | 否 | - | 可空 |
| 4 | expression | 表达式 | 长文本 | 是 | - | 如 max(weight,volume*1000000/volumetricFactor)*pricePerKg |
| 5 | variables | 变量定义 | JSON | 是 | `[]` | [{key,source,type,transform}] |
| 6 | isActive | 启用状态 | 布尔 | 是 | true | - |
| 7 | deletedAt | 软删时间 | 日期时间 | 否 | null | - |

#### 4.4.2 表达式安全验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 数学表达式可执行 | `max(weight, volume * 1000000 / volumetricFactor) * pricePerKg` 正常计算 | | |
| 禁用 require | `require('fs')` 抛错 | | |
| 禁用 process | `process.exit()` 抛错 | | |
| 禁用 eval | `eval('1+1')` 抛错 | | |
| 变量未定义时报错 | expression 引用不存在的变量时返回错误 | | |

---

### 4.5 tracking-shipment（追踪主表）

#### 4.5.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | trackingNo | 运单号 | 文本 | 是 | - | 如 SF1234567890 | 唯一(per site) |
| 3 | orderId | 内部订单号 | 文本 | 否 | - | ERP/TMS 订单号 | 可空 |
| 4 | status | 状态 | 枚举 | 是 | pending | pending/in_transit/customs/hold/delivered/exception/returned | 默认 pending |
| 5 | origin | 起运地 | 文本 | 是 | - | 如 上海 | 必填 |
| 6 | destination | 目的地 | 文本 | 是 | - | 如 东京 | 必填 |
| 7 | serviceProvider | 物流服务商 | 文本 | 否 | - | 如 SF/Yamato | 可空 |
| 8 | eta | 预计到达 | 日期时间 | 否 | - | - | 可空 |
| 9 | actualDelivery | 实际到达 | 日期时间 | 否 | - | - | 可空 |
| 10 | customerName | 客户名 | 文本 | 否 | - | - | 可空 |
| 11 | customerContact | 客户联系方式 | 文本 | 否 | - | - | 可空 |
| 12 | lastSyncAt | 最后同步时间 | 日期时间 | 否 | - | - | 同步后自动更新 |
| 13 | syncProvider | 数据来源 | 关联选择 | 否 | - | tracking-provider 列表 | 可空 |
| 14 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.5.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| trackingNo 唯一性 | 同一 site 下 trackingNo 不可重复 | | |
| status 流转 | pending→in_transit→customs→delivered | | |
| 异常状态 | hold/exception/returned 触发告警 | | |
| lastSyncAt 自动更新 | 外部 API 同步后更新 | | |

---

### 4.6 tracking-node（追踪节点）

#### 4.6.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | shipment | 所属运单 | 关联选择 | 是 | - | tracking-shipment 列表 | 必填 |
| 3 | nodeStatus | 节点状态 | 枚举 | 是 | - | done/active/pending/alert | 必填 |
| 4 | nodeType | 节点类型 | 枚举 | 是 | - | picked_up/export/import/customs/hold/delivery/delivered/exception | 必填 |
| 5 | location | 节点位置 | 文本 | 否 | - | 如 上海浦东仓库 | 可空 |
| 6 | eventTime | 事件时间 | 日期时间 | 是 | - | - | 必填 |
| 7 | description | 节点描述 | 长文本(本地化) | 是 | - | 如「货物已到达东京清关」 | 多语言 |
| 8 | dataSource | 数据源 | 枚举 | 是 | internal | internal/external | 默认 internal |
| 9 | providerRef | 外部 API 引用 ID | 文本 | 否 | - | 外部 API 返回的 ID | 外部同步时填充 |
| 10 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.6.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 节点按 eventTime 排序 | 查询时按 eventTime 升序 | | |
| 外部节点去重 | 同一 providerRef 不重复写入 | | |
| 异常节点标记 | nodeType=hold/exception 时 nodeStatus=alert | | |

---

### 4.7 tracking-provider（外部 API 配置）

#### 4.7.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | name | 配置名称 | 文本 | 是 | - | 如「17Track 主账号」 | 必填 |
| 3 | providerType | 提供商类型 | 枚举 | 是 | - | 17track/afterShip/kuaidi100/custom_api | 必填 |
| 4 | apiKey | API Key | 文本 | 是 | - | 加密存储 | 必填 |
| 5 | apiSecret | API Secret | 文本 | 否 | - | 加密存储 | 可空 |
| 6 | endpoint | 自定义端点 | 文本 | 否 | - | custom_api 时使用 | 可空 |
| 7 | isEnabled | 启用状态 | 布尔 | 是 | true | - | 默认 true |
| 8 | rateLimit | 限流 | 整数 | 否 | - | 次/分钟 | 可空 |
| 9 | supportedCarriers | 支持的承运商 | JSON | 否 | `[]` | 承运商代码数组 | 可空 |
| 10 | extraConfig | 扩展配置 | JSON | 否 | `{}` | 请求头/超时等 | 可空 |
| 11 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.7.2 权限验收

| 角色 | create | update | delete | read | 验收点 |
|------|--------|--------|--------|------|--------|
| super-admin | 是 | 是 | 是 | 是 | 全权限 |
| admin | **否** | **否** | **否** | 是 | API Key 安全考虑 |
| editor | 否 | 否 | 否 | 是 | 只读 |
| viewer | 否 | 否 | 否 | 是 | 只读 |

---

### 4.8 contact-matrix（联系渠道矩阵）

#### 4.8.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | lang | 语言 | 枚举 | 是 | - | cn/jp/kr/vn | 必填 |
| 3 | flag | 国旗 | 文本 | 是 | - | emoji 如 🇨🇳 | 必填 |
| 4 | short | 简称 | 文本 | 是 | - | 如 中/日/韩/越 | 必填 |
| 5 | primary | 主渠道 | JSON(本地化) | 是 | - | {type,label,href,hint,qrCode} | 必填 |
| 6 | channels | 全渠道矩阵 | JSON(本地化) | 是 | `[]` | 渠道数组 | 必填 |
| 7 | hotline | 热线 | JSON(本地化) | 是 | - | {label,tel,hours} | 必填 |
| 8 | email | 邮箱 | 邮箱 | 是 | - | 如 service@xxx.com | 邮箱格式校验 |
| 9 | callbackNote | 回拨说明 | 长文本(本地化) | 否 | - | - | 可空 |
| 10 | isActive | 启用状态 | 布尔 | 是 | true | - | 默认 true |
| 11 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 4.8.2 primary JSON 结构验收

```json
{
  "type": "line",
  "label": "LINE 咨询",
  "href": "https://line.me/...",
  "hint": "工作日 9:00-18:00",
  "qrCode": "media_id_xxx"
}
```

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| primary 可保存 | 上述 JSON 可正常保存 | | |
| channels 数组可保存 | 多渠道数组可保存 | | |
| 多语言编辑 | 切换语言可编辑 label/hint | | |

---

## 5. 获客成交 CT 验收（7 个）

### 5.1 review（客户评价）

#### 5.1.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | authorName | 评价人姓名 | 文本(本地化) | 是 | - | 最长 100 字符 | 多语言 |
| 3 | authorCompany | 评价人公司 | 文本 | 否 | - | 最长 100 字符 | 可空 |
| 4 | authorTitle | 评价人职位 | 文本 | 否 | - | 最长 50 字符 | 可空 |
| 5 | authorCountry | 评价人国家 | 文本 | 是 | - | cn/jp/kr/vn | 必填 |
| 6 | routeId | 使用线路 | 文本 | 否 | - | 如 cn-jp | 可空 |
| 7 | serviceProvider | 服务商 | 文本 | 否 | - | FBA/parcel/consolidation | 可空 |
| 8 | rating | 评分 | 整数 | 是 | - | 1-5 | 必填，范围校验 |
| 9 | content | 文字评价 | 长文本(本地化) | 是 | - | - | 多语言 |
| 10 | videoUrl | 视频评价 URL | 文本 | 否 | - | URL 格式 | 可空 |
| 11 | videoPoster | 视频封面 | 媒体 | 否 | - | 图片 | 可空 |
| 12 | images | 评价图片 | 媒体(多) | 否 | - | 图片数组 | 可空 |
| 13 | testimonialType | 评价类型 | 枚举 | 是 | text | text/video/case_study | 默认 text |
| 14 | isVerified | 已验证真实客户 | 布尔 | 是 | false | - | 默认 false |
| 15 | isFeatured | 是否精选 | 布尔 | 否 | false | - | 默认 false |
| 16 | publishedAt | 发布时间 | 日期时间 | 否 | - | - | 审核通过时填充 |
| 17 | status | 状态 | 枚举 | 是 | pending | pending/approved/rejected | 默认 pending |
| 18 | replyContent | 官方回复 | 长文本(本地化) | 否 | - | - | 可空 |
| 19 | replyAt | 回复时间 | 日期时间 | 否 | - | - | 回复时填充 |
| 20 | orderRef | 关联订单号 | 文本 | 否 | - | 用于验证 | 可空 |
| 21 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.1.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 提交评价默认 pending | 用户提交后 status=pending | | |
| 审核通过后 publishedAt 填充 | approve 操作后填充当前时间 | | |
| 公开列表仅显示 approved+isVerified | GET /reviews 过滤 | | |
| 精选评价排序优先 | isFeatured=true 排在前面 | | |

---

### 5.2 subscription（通知订阅）

#### 5.2.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | subscriberType | 订阅类型 | 枚举 | 是 | - | tracking_update/quote_reply/promotion/newsletter | 必填 |
| 3 | channel | 通知渠道 | 枚举 | 是 | - | email/line/kakao/zalo/wechat/sms | 必填 |
| 4 | channelTarget | 订阅目标 | 文本 | 是 | - | 邮箱/LINE ID/手机号 | 必填 |
| 5 | trackingNo | 关联运单号 | 文本 | 否 | - | tracking_update 类型时填写 | 可空 |
| 6 | quoteRequestId | 关联询价单 | 文本 | 否 | - | quote_reply 类型时填写 | 可空 |
| 7 | eventFilter | 事件过滤 | JSON | 否 | `{}` | 如{onlyAlert:true} | 可空 |
| 8 | frequency | 频率 | 枚举 | 是 | realtime | realtime/daily/weekly | 默认 realtime |
| 9 | isActive | 启用状态 | 布尔 | 是 | true | - | 默认 true |
| 10 | subscribedAt | 订阅时间 | 日期时间 | 是 | 当前时间 | - | 自动填充 |
| 11 | unsubscribedAt | 退订时间 | 日期时间 | 否 | - | - | 退订时填充 |
| 12 | language | 订阅语言 | 文本 | 是 | - | cn/jp/kr/vn | 必填 |
| 13 | lastNotifiedAt | 最后通知时间 | 日期时间 | 否 | - | - | 通知后自动更新 |
| 14 | notifyCount | 已通知次数 | 整数 | 否 | 0 | - | 通知后自增 |
| 15 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.2.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 退订后 isActive=false | 退订操作后 isActive 变 false | | |
| 退订后 unsubscribedAt 填充 | 退订时填充当前时间 | | |
| 通知后 notifyCount 自增 | 每次通知后 +1 | | |
| 通知后 lastNotifiedAt 更新 | 每次通知后更新 | | |

---

### 5.3 landing-page（营销落地页）

#### 5.3.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | slug | URL 标识 | UID | 是 | - | 如 fba-promo-2026 | 唯一 |
| 3 | title | 页面标题 | 文本(本地化) | 是 | - | 最长 200 字符 | 多语言 |
| 4 | campaignName | 活动名称 | 文本 | 是 | - | 最长 100 字符 | 必填 |
| 5 | utmSource | UTM 来源 | 文本 | 是 | - | 如 google/baidu | 必填 |
| 6 | utmMedium | UTM 媒介 | 文本 | 是 | - | 如 cpc/social | 必填 |
| 7 | utmCampaign | UTM 活动 | 文本 | 是 | - | 如 fba-promo | 必填 |
| 8 | utmContent | UTM 内容 | 文本 | 否 | - | A/B 版本标识 | 可空 |
| 9 | utmTerm | UTM 关键词 | 文本 | 否 | - | - | 可空 |
| 10 | conversionGoal | 转化目标 | 枚举 | 是 | - | quote_submit/contact_click/phone_call/download | 必填 |
| 11 | heroContent | Hero 区内容 | JSON(本地化) | 是 | - | {title,subtitle,ctaText,ctaAction,background} | 必填 |
| 12 | sections | 页面区块 | JSON(本地化) | 是 | `[]` | 区块数组 | 必填 |
| 13 | formConfig | 嵌入表单配置 | JSON | 否 | - | 引用 quote-field-rule | 可空 |
| 14 | seoTitle | SEO 标题 | 文本(本地化) | 否 | - | 最长 60 字符 | 可空 |
| 15 | seoDescription | SEO 描述 | 文本(本地化) | 否 | - | 最长 160 字符 | 可空 |
| 16 | ogImage | 分享图 | 媒体 | 否 | - | 图片 | 可空 |
| 17 | variant | A/B 版本标识 | 文本 | 否 | - | A/B/C | 可空 |
| 18 | parentPageId | 父落地页 | 文本 | 否 | - | A/B 测试时关联原版 | 可空 |
| 19 | isActive | 启用状态 | 布尔 | 是 | true | - | 默认 true |
| 20 | startAt | 上线时间 | 日期时间 | 否 | - | - | 可空 |
| 21 | endAt | 下线时间 | 日期时间 | 否 | - | - | 可空 |
| 22 | publishedAt | 发布时间 | 日期时间 | 否 | - | - | 发布时填充 |
| 23 | status | 状态 | 枚举 | 是 | draft | draft/published/archived | 默认 draft |
| 24 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.3.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| slug 唯一性 | 同一 site 下 slug 不可重复 | | |
| 公开访问仅 published | GET /landing-pages/:slug 仅返回 status=published | | |
| 时间窗口控制 | startAt/endAt 外不展示 | | |
| A/B 版本关联 | variant 子页面 parentPageId 指向原版 | | |

---

### 5.4 conversion-funnel（转化漏斗）

#### 5.4.1 funnel 主表字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 验收点 |
|------|--------|------|------|------|--------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | 可选 |
| 2 | name | 漏斗名称 | 文本 | 是 | - | 如「询价转化漏斗」 |
| 3 | lang | 语言 | 文本 | 否 | - | 空=全语言 |
| 4 | steps | 漏斗阶段定义 | JSON | 是 | `[]` | 阶段数组 |
| 5 | isActive | 启用状态 | 布尔 | 是 | true | - |
| 6 | deletedAt | 软删时间 | 日期时间 | 否 | null | - |

#### 5.4.2 conversion-event 事件表字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 验收点 |
|------|--------|------|------|------|--------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | 自动填充 |
| 2 | funnelId | 所属漏斗 | 关联选择 | 是 | - | 必填 |
| 3 | eventName | 事件名 | 文本 | 是 | - | 如 quote_submit |
| 4 | step | 阶段序号 | 整数 | 是 | - | 对应 funnel.steps |
| 5 | visitorId | 访客 ID | 文本 | 是 | - | 必填 |
| 6 | userId | 登录用户 | 关联选择 | 否 | - | 可空 |
| 7 | sessionId | 会话 ID | 文本 | 否 | - | 可空 |
| 8 | landingPageId | 落地页 ID | 文本 | 否 | - | 可空 |
| 9 | quoteRequestId | 关联询价单 | 文本 | 否 | - | 可空 |
| 10 | utmSource | UTM 来源 | 文本 | 否 | - | 可空 |
| 11 | utmMedium | UTM 媒介 | 文本 | 否 | - | 可空 |
| 12 | utmCampaign | UTM 活动 | 文本 | 否 | - | 可空 |
| 13 | lang | 事件语言 | 文本 | 否 | - | 可空 |
| 14 | ipAddress | IP 地址 | 文本 | 否 | - | 自动提取 |
| 15 | userAgent | User Agent | 文本 | 否 | - | 自动提取 |
| 16 | occurredAt | 事件时间 | 日期时间 | 是 | 当前时间 | 自动填充 |
| 17 | deletedAt | 软删时间 | 日期时间 | 否 | null | - |

#### 5.4.3 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 事件异步批量写入 | 高频事件批量写入不阻塞主流程 | | |
| 漏斗转化率计算 | 各阶段人数 + 转化率 + 平均时长 | | |
| 多维度筛选 | 按 lang/utmSource/日期范围筛选 | | |

---

### 5.5 intent-order（意向订单）

#### 5.5.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | orderNo | 意向单号 | 文本 | 是 | 自动生成 | IO+YYYYMMDD+3 位序号 | 自动生成 |
| 3 | quoteRequestId | 关联询价单 | 文本 | 是 | - | quote-request documentId | 必填 |
| 4 | customerName | 客户名 | 文本 | 是 | - | 最长 100 字符 | 必填 |
| 5 | customerContact | 联系方式 | 文本 | 是 | - | JSON: {type,value} | 必填 |
| 6 | customerType | 客户类型 | 枚举 | 否 | - | individual/business/fba_seller | 可空 |
| 7 | confirmedPrice | 确认报价 | JSON | 是 | - | {amount,currency,breakdown} | 必填 |
| 8 | cargoSummary | 货物摘要 | JSON | 是 | - | {weight,volume,packages,type} | 必填 |
| 9 | routeSummary | 线路摘要 | JSON | 是 | - | {origin,destination,serviceProvider} | 必填 |
| 10 | plannedShipDate | 预计发货日 | 日期 | 否 | - | YYYY-MM-DD | 可空 |
| 11 | actualShipDate | 实际发货日 | 日期 | 否 | - | YYYY-MM-DD | 可空 |
| 12 | status | 状态 | 枚举 | 是 | intent | intent/confirmed/shipping/delivered/cancelled | 默认 intent |
| 13 | assignedTo | 负责人 | 关联选择 | 否 | - | admin::user 列表 | 可空 |
| 14 | followUpRecords | 跟进记录 | JSON | 否 | `[]` | [{time,content,operator}] | 可空 |
| 15 | contractSigned | 是否签合同 | 布尔 | 否 | false | - | 默认 false |
| 16 | depositPaid | 是否付定金 | 布尔 | 否 | false | - | 默认 false |
| 17 | depositAmount | 定金金额 | 小数 | 否 | - | - | 可空 |
| 18 | convertedToOrderId | 转正式订单号 | 文本 | 否 | - | ERP 订单号 | 可空 |
| 19 | remark | 备注 | 长文本 | 否 | - | - | 可空 |
| 20 | leadId | 关联线索 | 文本 | 否 | - | lead documentId | 可空 |
| 21 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.5.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| orderNo 自动生成 | 创建时为空，保存后生成 IO+日期+序号 | | |
| status 流转 | intent→confirmed→shipping→delivered | | |
| convert 操作 | convert 后填充 convertedToOrderId + status=delivered | | |
| 关联 referral 转化 | convert 时触发 referral-engine.markConverted | | |

---

### 5.6 referral（推荐奖励）

#### 5.6.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | referralCode | 推荐码 | 文本 | 是 | - | 如 REF-XXXXXX | 唯一(per site) |
| 3 | referrerName | 推荐人姓名 | 文本 | 是 | - | 最长 100 字符 | 必填 |
| 4 | referrerContact | 推荐人联系方式 | 文本 | 是 | - | JSON: {type,value} | 必填 |
| 5 | referrerCustomerId | 推荐人客户档案 ID | 文本 | 否 | - | customer-profile ID | 可空 |
| 6 | refereeName | 被推荐人姓名 | 文本 | 是 | - | 最长 100 字符 | 必填 |
| 7 | refereeContact | 被推荐人联系方式 | 文本 | 是 | - | JSON: {type,value} | 必填 |
| 8 | refereeCustomerId | 被推荐人客户档案 ID | 文本 | 否 | - | customer-profile ID | 可空 |
| 9 | referralChannel | 推荐渠道 | 枚举 | 是 | - | friend/community/exhibition/partner/other | 必填 |
| 10 | referralSource | 推荐来源详情 | 文本 | 否 | - | 如展会名 | 可空 |
| 11 | status | 状态 | 枚举 | 是 | pending | pending/contacted/qualified/converted/rewarded/invalid | 默认 pending |
| 12 | quoteRequestId | 关联询价单 | 文本 | 否 | - | quote-request documentId | 可空 |
| 13 | intentOrderId | 关联意向订单 | 文本 | 否 | - | intent-order documentId | 可空 |
| 14 | rewardType | 奖励类型 | 枚举 | 是 | - | points/cash/discount/gift | 必填 |
| 15 | rewardAmount | 奖励数值 | 小数 | 否 | - | 积分数/金额数/折扣比例 | 可空 |
| 16 | rewardStatus | 奖励状态 | 枚举 | 否 | pending | pending/issued/claimed | 默认 pending |
| 17 | rewardIssuedAt | 奖励发放时间 | 日期时间 | 否 | - | - | 发放时填充 |
| 18 | conversionValue | 成交金额 | 小数 | 否 | - | 计算 ROI 用 | 可空 |
| 19 | convertedAt | 转化时间 | 日期时间 | 否 | - | - | 转化时填充 |
| 20 | remark | 备注 | 长文本 | 否 | - | - | 可空 |
| 21 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.6.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| referralCode 唯一性 | 同一 site 下不可重复 | | |
| 推荐码生成 | generateCode 返回唯一码 | | |
| applyCode 关联询价 | 被推荐人询价时关联 quoteRequestId | | |
| markConverted 触发积分 | rewardType=points 时调 zhao-point.earnPoints | | |
| status 流转 | pending→contacted→qualified→converted→rewarded | | |

---

### 5.7 customer-profile（客户档案）

#### 5.7.1 表单字段验收

| 序号 | 字段名 | 标签 | 类型 | 必填 | 默认值 | 选项/格式 | 验收点 |
|------|--------|------|------|------|--------|-----------|--------|
| 1 | site | 站点 | 关联选择 | 是 | - | - | 可选 |
| 2 | name | 客户名 | 文本 | 是 | - | 最长 100 字符 | 必填 |
| 3 | contactPhone | 电话 | 文本 | 是 | - | 最长 50 字符 | 必填 |
| 4 | contactEmail | 邮箱 | 邮箱 | 否 | - | - | 可空 |
| 5 | contactLine | LINE ID | 文本 | 否 | - | - | 可空 |
| 6 | contactWechat | 微信号 | 文本 | 否 | - | - | 可空 |
| 7 | contactKakao | Kakao ID | 文本 | 否 | - | - | 可空 |
| 8 | contactZalo | Zalo ID | 文本 | 否 | - | - | 可空 |
| 9 | company | 公司 | 文本 | 否 | - | 最长 100 字符 | 可空 |
| 10 | title | 职位 | 文本 | 否 | - | 最长 50 字符 | 可空 |
| 11 | customerType | 客户类型 | 枚举 | 是 | - | individual/business/fba_seller | 必填 |
| 12 | country | 国家 | 文本 | 是 | - | cn/jp/kr/vn | 必填 |
| 13 | preferredLang | 偏好语言 | 文本 | 否 | - | cn/jp/kr/vn | 可空 |
| 14 | preferredRoute | 常用线路 | JSON | 否 | `[]` | 线路数组 | 可空 |
| 15 | preferredService | 常用服务商 | JSON | 否 | `[]` | 服务商数组 | 可空 |
| 16 | totalQuoteCount | 累计询价数 | 整数 | 否 | 0 | - | 自动聚合 |
| 17 | totalOrderCount | 累计订单数 | 整数 | 否 | 0 | - | 自动聚合 |
| 18 | totalOrderValue | 累计成交额 | 小数 | 否 | 0 | - | 自动聚合 |
| 19 | lastQuoteAt | 最后询价时间 | 日期时间 | 否 | - | - | 自动更新 |
| 20 | lastOrderAt | 最后下单时间 | 日期时间 | 否 | - | - | 自动更新 |
| 21 | lifecycleStage | 生命周期阶段 | 枚举 | 是 | lead | lead/active/repeat/vip/churned | 默认 lead |
| 22 | tags | 客户标签 | JSON | 否 | `[]` | 标签数组 | 可空 |
| 23 | assignedTo | 负责人 | 关联选择 | 否 | - | admin::user 列表 | 可空 |
| 24 | sourceChannel | 首次来源渠道 | 文本 | 否 | - | landing-page/review/referral/direct | 可空 |
| 25 | utmSource | 首次 UTM 来源 | 文本 | 否 | - | - | 可空 |
| 26 | remark | 备注 | 长文本 | 否 | - | - | 可空 |
| 27 | relatedLeadIds | 关联线索 ID 数组 | JSON | 否 | `[]` | lead documentId 数组 | 自动更新 |
| 28 | relatedQuoteIds | 关联询价单 ID 数组 | JSON | 否 | `[]` | quote-request documentId 数组 | 自动更新 |
| 29 | relatedOrderIds | 关联意向订单 ID 数组 | JSON | 否 | `[]` | intent-order documentId 数组 | 自动更新 |
| 30 | deletedAt | 软删时间 | 日期时间 | 否 | null | - | - |

#### 5.7.2 业务逻辑验收

| 逻辑点 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 自动 upsert | lead/quote/order 创建时自动创建/更新档案 | | |
| 按 phone/email 去重 | 相同电话/邮箱合并为同一档案 | | |
| 聚合统计自动更新 | totalQuoteCount/totalOrderCount 自动更新 | | |
| 生命周期自动流转 | lead→active→repeat→vip/churned | | |
| merge 操作 | 合并重复档案，保留主档案 | | |

---

## 6. 扩展现有 CT 验收（3 个）

### 6.1 扩展 zhao-website.lead

#### 6.1.1 字段扩展验收

| 字段 | 修改类型 | 验收点 | 预期 | 实际 | 结果 |
|------|----------|--------|------|------|------|
| type | 枚举扩展 | 新增 intent_order/referral | type 选项包含原有 6 个 + 新增 2 个 | | |
| referralCode | 新增字段 | string(50) | lead 编辑页可见 referralCode 字段 | | |

#### 6.1.2 回归验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 原有 lead 创建正常 | type=contact 可创建 | | |
| 原有 lead 查询正常 | 列表页正常显示 | | |
| zhao-website 其他 CT 不受影响 | article/product 等正常 | | |

---

### 6.2 扩展 zhao-website.brand-info

#### 6.2.1 字段扩展验收

| 新增字段 | 类型 | 本地化 | 验收点 | 预期 | 实际 | 结果 |
|----------|------|--------|--------|------|------|------|
| offices | json | 是 | 办公室数组 | brand-info 编辑页可见 offices 字段，可多语言编辑 | | |
| certificates | json | 是 | 证书数组 | brand-info 编辑页可见 certificates 字段，可多语言编辑 | | |

#### 6.2.2 数据结构验收

**offices JSON 示例**：
```json
[
  {
    "city": "上海",
    "address": "上海市浦东新区xxx",
    "phone": "021-xxxx",
    "photo": "media_id_xxx",
    "mapLat": 31.2304,
    "mapLng": 121.4737,
    "mapZoom": 15
  }
]
```

**certificates JSON 示例**：
```json
[
  {
    "id": "cert-001",
    "title": "国际货运代理资质",
    "issuer": "商务部",
    "issueDate": "2024-01-01",
    "expiryDate": "2027-01-01",
    "image": "media_id_xxx",
    "verifyUrl": "https://verify.example.com/cert-001"
  }
]
```

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| offices 可保存 | 上述 JSON 可正常保存 | | |
| certificates 可保存 | 上述 JSON 可正常保存 | | |
| 多语言切换 | 切换语言可编辑不同语言内容 | | |

---

### 6.3 扩展 zhao-website.first-truth-policy

#### 6.3.1 字段扩展验收

| 字段 | 修改类型 | 验收点 | 预期 | 实际 | 结果 |
|------|----------|--------|------|------|------|
| claimCategory | 枚举扩展 | 新增 logistics_promise | 选项包含原有 6 个 + logistics_promise | | |

#### 6.3.2 赔付承诺数据验收

**测试数据**：
```json
{
  "claimKey": "delay_compensation",
  "claim": "延误即赔",
  "claimCategory": "logistics_promise",
  "canonicalValue": "延误超过承诺时效 1 天，按运费 5% 赔付，上限 500 元",
  "canonicalValueType": "text",
  "priority": 50
}
```

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| claimCategory 可选 logistics_promise | 下拉框可见该选项 | | |
| 赔付承诺可创建 | 上述数据可正常保存 | | |
| 原有声明不受影响 | business_license 等类型正常 | | |

---

## 7. Services 验收（6 个）

### 7.1 quote-engine（报价引擎）

#### 7.1.1 calculate 方法验收

**测试用例 1：简单规则匹配**

前置条件：
- quote-price-rule：routeId=cn-jp, serviceProvider=FBA, minWeight=0, maxWeight=100, pricePerKg=35, currency=CNY

输入：
```json
{
  "routeId": "cn-jp",
  "serviceProvider": "FBA",
  "weight": 50,
  "volume": 0.1
}
```

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 规则匹配 | 命中上述规则 | | |
| 基础运费 | 50 * 35 = 1750 | | |
| 体积重 | 0.1 * 1000000 / 6000 = 16.67 kg（<50） | | |
| 计费重 | max(50, 16.67) = 50 | | |
| 总价 | 1750 CNY | | |

**测试用例 2：公式计算**

前置条件：
- quote-price-formula：expression=`max(weight, volume * 1000000 / volumetricFactor) * pricePerKg + minCharge`
- quote-price-rule 绑定该公式，volumetricFactor=6000, minCharge=100

输入：weight=50, volume=0.5

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 体积重 | 0.5 * 1000000 / 6000 = 83.33 kg | | |
| 计费重 | max(50, 83.33) = 83.33 | | |
| 基础运费 | 83.33 * 35 = 2916.55 | | |
| 总价 | 2916.55 + 100 = 3016.55 CNY | | |

**测试用例 3：安全沙箱**

| 输入 expression | 预期 | 实际 | 结果 |
|-----------------|------|------|------|
| `require('fs')` | 抛错 | | |
| `process.exit()` | 抛错 | | |
| `eval('1+1')` | 抛错 | | |

#### 7.1.2 calculateMulti 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 多服务商比价 | 返回多个 QuoteResult | | |
| 无匹配规则时返回空 | 无规则的服务商不返回 | | |

#### 7.1.3 saveQuote 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 报价保存到 quote-request | quotedPrice 字段更新 | | |
| status 更新为 quoted | quote-request.status=quoted | | |
| expiresAt 自动设置 | 默认 7 天后 | | |

---

### 7.2 tracking-aggregator（追踪聚合器）

#### 7.2.1 getTracking 方法验收

**测试用例：内部+外部合并**

前置条件：
- tracking-shipment：trackingNo=SF123, syncProvider=17track
- tracking-node（internal）：2 条
- 外部 API 返回：3 条节点

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 内部节点返回 | 2 条 internal 节点 | | |
| 外部节点合并 | 3 条 external 节点 | | |
| 按 eventTime 排序 | 5 条节点按时间升序 | | |
| 异常检测 | hold/exception 节点标记 isAlert | | |

#### 7.2.2 syncFromProvider 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 外部 API 调用 | 按 providerType 分发 | | |
| 节点去重 | providerRef 相同不重复写入 | | |
| shipment.lastSyncAt 更新 | 同步后更新 | | |
| shipment.status 更新 | 根据最新节点更新 | | |

---

### 7.3 dynamic-form（动态表单引擎）

#### 7.3.1 loadFields 方法验收

**测试用例**：

前置条件：
- quote-field-rule 1：routeId=cn-jp, serviceProvider=FBA, priority=100, fields=[A,B]
- quote-field-rule 2：routeId=cn-jp, priority=50, fields=[C,D]

输入：{routeId: "cn-jp", serviceProvider: "FBA", lang: "cn"}

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 规则匹配 | 命中规则 1（priority 更高） | | |
| 字段返回 | 返回 [A,B] | | |
| 多语言标签 | 按 lang 返回对应语言 label | | |

#### 7.3.2 validate 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 必填校验 | required=true 字段为空时报错 | | |
| pattern 校验 | 格式不匹配时报错 | | |
| 隐藏字段不校验 | visibleWhen 不满足的字段不校验 | | |

---

### 7.4 funnel-tracker（漏斗追踪器）

#### 7.4.1 track 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 事件异步写入 | 不阻塞主流程 | | |
| visitorId 必填 | 为空时报错 | | |
| funnelId 自动匹配 | 不传时按 eventName 匹配 | | |
| IP/UA 自动提取 | 从 ctx 提取 | | |

#### 7.4.2 getStats 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 各阶段人数统计 | 返回每步 count | | |
| 转化率计算 | conversionRate + overallRate | | |
| 平均转化时长 | avgTimeFromPrevious | | |
| 多维度筛选 | 按 lang/utmSource/日期 | | |

---

### 7.5 referral-engine（推荐引擎）

#### 7.5.1 generateCode 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 推荐码生成 | 格式 REF-XXXXXX | | |
| 唯一性 | 同一 site 下不重复 | | |

#### 7.5.2 applyCode 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 有效推荐码 | 创建 referral 记录 | | |
| 无效推荐码 | 返回错误 | | |
| 关联询价 | 填充 quoteRequestId | | |

#### 7.5.3 markConverted 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| status 更新 | converted | | |
| 积分发放 | rewardType=points 时调 earnPoints | | |
| rewardStatus 更新 | issued | | |

---

### 7.6 customer-aggregator（客户档案聚合器）

#### 7.6.1 upsertFromLead 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 新客户创建 | phone 不存在时创建 | | |
| 老客户更新 | phone 存在时更新 | | |
| relatedLeadIds 追加 | 追加 lead ID | | |

#### 7.6.2 upsertFromOrder 方法验收

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| totalOrderCount 自增 | +1 | | |
| totalOrderValue 累加 | +成交金额 | | |
| lastOrderAt 更新 | 当前时间 | | |
| lifecycleStage 流转 | repeat/vip | | |

---

## 8. Admin API 验收

### 8.1 CT 标准 CRUD 验收

**验收范围**：16 个 CT × 5 操作（find/findOne/create/update/delete）

**通用验收点**（每个 CT 都需验证）：

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| GET /v1/admin/{ct} | 返回分页列表 | | |
| GET /v1/admin/{ct}/:documentId | 返回单条记录 | | |
| POST /v1/admin/{ct} | 创建成功 | | |
| PUT /v1/admin/{ct}/:documentId | 更新成功 | | |
| DELETE /v1/admin/{ct}/:documentId | 软删（deletedAt 填充） | | |
| 租户隔离 | 按 site 过滤 | | |
| 权限校验 | 无权限返回 403 | | |

**CT 列表**：
- [ ] quote-requests
- [ ] quote-field-rules
- [ ] quote-price-rules
- [ ] quote-price-formulas
- [ ] tracking-shipments
- [ ] tracking-nodes
- [ ] tracking-providers
- [ ] contact-matrices
- [ ] reviews
- [ ] subscriptions
- [ ] landing-pages
- [ ] conversion-funnels
- [ ] conversion-events（只读 find）
- [ ] intent-orders
- [ ] referrals
- [ ] customer-profiles

### 8.2 特殊操作验收

| 操作 | 路径 | 验收点 | 预期 | 实际 | 结果 |
|------|------|--------|------|------|------|
| 后台试算报价 | POST /v1/admin/quote-engine/calculate | 返回 QuoteResult | | | |
| 手动同步 | POST /v1/admin/tracking/sync/:trackingNo | 触发外部 API 同步 | | | |
| 批量同步 | POST /v1/admin/tracking/batch-sync | 批量同步多单 | | | |
| 漏斗统计 | GET /v1/admin/funnel/stats | 返回 FunnelStats | | | |
| 推荐统计 | GET /v1/admin/referrals/stats | 返回 ReferralStats | | | |
| 评价审核通过 | POST /v1/admin/reviews/:documentId/approve | status=approved | | | |
| 评价驳回 | POST /v1/admin/reviews/:documentId/reject | status=rejected | | | |
| 评价回复 | POST /v1/admin/reviews/:documentId/reply | replyContent 填充 | | | |
| 订单转化 | POST /v1/admin/intent-orders/:documentId/convert | status=delivered | | | |
| 档案合并 | POST /v1/admin/customer-profiles/merge | 合并重复档案 | | | |

---

## 9. Content API 验收

| 序号 | 方法 | 路径 | 鉴权 | 验收点 | 预期 | 实际 | 结果 |
|------|------|------|------|--------|------|------|------|
| 1 | GET | /v1/quote/fields | 无 | 返回动态字段 | 按 routeId/serviceProvider 返回 fields | | |
| 2 | POST | /v1/quote/calculate | 无 | 公开报价 | 返回 QuoteResult | | |
| 3 | POST | /v1/quote/submit | 无 | 提交询价 | 创建 quote-request + lead + customer-profile | | |
| 4 | GET | /v1/tracking/:trackingNo | 无 | 查询轨迹 | 返回合并节点 | | |
| 5 | POST | /v1/tracking/batch | 无 | 批量查询 | 最多 10 单 | | |
| 6 | POST | /v1/tracking/subscribe | 无 | 订阅通知 | 创建 subscription | | |
| 7 | GET | /v1/contact-matrix/:lang | 无 | 渠道矩阵 | 按 lang 返回 | | |
| 8 | GET | /v1/reviews | 无 | 评价列表 | 仅 approved+isVerified | | |
| 9 | POST | /v1/reviews/submit | 可选 | 提交评价 | status=pending | | |
| 10 | GET | /v1/landing-pages/:slug | 无 | 落地页 | 仅 published | | |
| 11 | GET | /v1/intent-orders/:orderNo | 需登录 | 我的订单 | 返回订单详情 | | |
| 12 | POST | /v1/funnel/track | 无 | 漏斗上报 | 异步写入 | | |
| 13 | POST | /v1/referral/apply | 无 | 应用推荐码 | 创建 referral | | |
| 14 | GET | /v1/referral/validate/:code | 无 | 验证推荐码 | 返回有效/无效 | | |
| 15 | GET | /v1/customer-profile | 需登录 | 我的档案 | 返回当前用户档案 | | |

---

## 10. 关键集成点验收

### 10.1 询价提交全链路

**测试步骤**：

1. 前置：配置 quote-field-rule + quote-price-rule
2. 调用 POST /v1/quote/submit，提交询价数据
3. 验证全链路

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 动态字段校验 | 必填字段为空时报错 | | |
| 报价计算 | 返回报价结果 | | |
| quote-request 创建 | 记录已创建，status=submitted | | |
| lead 创建 | type=quote，sourceId=quote-request documentId | | |
| customer-profile 创建/更新 | upsertFromQuote 执行 | | |
| 推荐码关联（如有） | referral.applyCode 执行 | | |
| 漏斗事件记录 | quote_submit 事件写入 | | |

### 10.2 追踪订阅通知

**测试步骤**：

1. 创建 tracking-shipment + tracking-provider
2. 调用 POST /v1/tracking/subscribe 订阅
3. 等待定时任务执行

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 订阅记录创建 | subscription 已创建 | | |
| 定时任务执行 | cron 每分钟执行 | | |
| 外部 API 同步 | tracking-node 新增 external 节点 | | |
| 通知发送 | 按 channel 发送通知 | | |
| notifyCount 自增 | +1 | | |

### 10.3 推荐转化奖励

**测试步骤**：

1. 创建 referral（rewardType=points）
2. 创建 intent-order（关联 referral）
3. 调用 POST /v1/admin/intent-orders/:documentId/convert

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| intent-order.status 更新 | delivered | | |
| referral.status 更新 | converted | | |
| zhao-point.earnPoints 调用 | 积分发放 | | |
| referral.rewardStatus 更新 | issued | | |
| customer-profile 更新 | upsertFromOrder 执行 | | |

### 10.4 落地页漏斗追踪

**测试步骤**：

1. 创建 landing-page + conversion-funnel
2. 前端访问落地页，上报各阶段事件

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| page_view 事件 | 写入 conversion-event | | |
| quote_form_view 事件 | 写入 | | |
| quote_submit 事件 | 写入，带 quoteRequestId | | |
| quote_quoted 事件 | 写入 | | |
| order_placed 事件 | 写入 | | |
| 漏斗统计查询 | GET /v1/admin/funnel/stats 返回转化率 | | |

---

## 11. 权限验收

### 11.1 系统角色权限同步

**验收点**：bootstrap 后权限自动同步

| 角色 | 权限范围 | 验收点 | 预期 | 实际 | 结果 |
|------|----------|--------|------|------|------|
| super-admin | 全部 | 17 个 CT 全权限 | | | |
| admin | 除 tracking-provider CUD | 可管理 15 个 CT，tracking-provider 只读 | | | |
| editor | 内容管理 | quote-field-rule/quote-price-rule/contact-matrix/review/landing-page CRUD | | | |
| viewer | 只读 | 全部 .read | | | |

### 11.2 权限隔离验收

| 测试场景 | 预期 | 实际 | 结果 |
|----------|------|------|------|
| editor 创建 tracking-provider | 403 | | |
| admin 创建 tracking-provider | 403 | | |
| super-admin 创建 tracking-provider | 成功 | | |
| viewer 创建任何 CT | 403 | | |

---

## 12. 定时任务验收

### 12.1 追踪同步任务

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| cron 注册 | bootstrap 中注册 | | |
| 执行频率 | 每分钟 | | |
| 查询 active subscription | tracking_update 类型 | | |
| 调用 syncFromProvider | 执行同步 | | |
| 限流控制 | 按 rateLimit 限流 | | |

### 12.2 订阅通知任务

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 检测新节点 | 对比 lastNotifiedAt | | |
| 异常状态通知 | hold/exception 触发 | | |
| 多渠道发送 | email/line/kakao | | |
| 频率控制 | realtime/daily/weekly | | |

---

## 附录：验收检查清单汇总

### A.1 CT 表单完整性（19 个 CT）

- [ ] quote-request（23 字段）
- [ ] quote-field-rule（9 字段 + fields JSON）
- [ ] quote-price-rule（15 字段）
- [ ] quote-price-formula（7 字段）
- [ ] tracking-shipment（14 字段）
- [ ] tracking-node（10 字段）
- [ ] tracking-provider（11 字段）
- [ ] contact-matrix（11 字段）
- [ ] review（21 字段）
- [ ] subscription（15 字段）
- [ ] landing-page（24 字段）
- [ ] conversion-funnel（6 字段）
- [ ] conversion-event（17 字段）
- [ ] intent-order（21 字段）
- [ ] referral（21 字段）
- [ ] customer-profile（30 字段）
- [ ] lead 扩展（type + referralCode）
- [ ] brand-info 扩展（offices + certificates）
- [ ] first-truth-policy 扩展（claimCategory）

### A.2 Services 完整性（6 个）

- [ ] quote-engine（calculate/calculateMulti/saveQuote）
- [ ] tracking-aggregator（getTracking/batchTracking/syncFromProvider）
- [ ] dynamic-form（loadFields/validate/resolveVisibility）
- [ ] funnel-tracker（track/getStats）
- [ ] referral-engine（generateCode/applyCode/markConverted/getStats）
- [ ] customer-aggregator（upsertFromLead/upsertFromQuote/upsertFromOrder/getProfile）

### A.3 路由完整性

- [ ] Admin API：16 套 CRUD + 10 个特殊操作
- [ ] Content API：15 个公开接口

### A.4 集成点完整性（4 个）

- [ ] 询价提交全链路（7 步）
- [ ] 追踪订阅通知（5 步）
- [ ] 推荐转化奖励（5 步）
- [ ] 落地页漏斗追踪（6 步）

### A.5 权限完整性

- [ ] 4 个角色权限同步
- [ ] tracking-provider 权限隔离
- [ ] 租户隔离

### A.6 定时任务完整性（2 个）

- [ ] 追踪同步（每分钟）
- [ ] 订阅通知（按频率）

---

**验收人**：_______________  **日期**：_______________

**验收结论**：□ 通过  □ 部分通过  □ 失败

**备注**：

____________________________________________________________________
