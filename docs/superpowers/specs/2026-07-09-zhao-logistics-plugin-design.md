# zhao-logistics 插件设计：跨境物流获客成交系统

> 日期：2026-07-09 | 插件：zhao-logistics | 依赖：zhao-common, zhao-website, zhao-point, zhao-auth

---

## 1. 背景与目标

### 1.1 背景

`e:\code\site` 目录是一个跨境物流官网前端项目（React + Vite + Tailwind），面向中日韩越四国市场，核心目标是「引导咨询的转化机器」。当前为纯前端实现，所有数据为静态 JSON，无后端支持。

现有 `zhao-website` 插件是通用多租户官网系统（18 个 CT + 23 个 service），已具备内容管理、SEO 输出、留资、互动追踪、知识图谱等能力，但缺少物流垂直场景的询价、追踪、报价、渠道矩阵等功能。

### 1.2 目标

用当前 strapi 项目的多租户官网系统满足 site 目录的所有需求：
- **尽可能复用** zhao-website 现有能力（lead/SEO/互动/日志/内容管理）
- **补充功能独立拆分**到新插件 zhao-logistics，与 zhao-website 解耦
- 覆盖跨境物流获客成交全链路：引流 → 转化 → 成交 → 留存裂变 → 数据优化

### 1.3 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 插件形态 | 新建独立插件 zhao-logistics | 业务隔离清晰，不污染通用官网 |
| 追踪数据源 | 内部数据 + 外部 API 并存 | 港口物流：境内（内部）+ 境外（外部 API） |
| 动态表单 | 后端 CT 存规则 + 前端渲染 | 最大灵活度：字段/校验/联动/权限/模板/分组/必填/公式绑定全动态 |
| 报价引擎 | 公式引擎 + 规则表混合 | 规则表覆盖 80%，公式覆盖 20% 复杂场景 |
| 渠道矩阵 | 单 CT + JSON 字段 | 结构简单，复用 brand-info 的 socialLinks 思路 |
| 信任展示 | 扩展 brand-info JSON | 复用单例，避免新增 CT |
| 赔付承诺 | 复用 first-truth-policy | 复用冲突检测/校验机制，语义为「真值声明」 |

---

## 2. 整体架构

### 2.1 插件依赖关系

```
zhao-logistics
├── 依赖 zhao-common（site-config / site-template / 中间件 / policies）
├── 依赖 zhao-website（lead 扩展 / brand-info 扩展 / first-truth 扩展 / async-writer 模式）
├── 依赖 zhao-point（推荐奖励积分发放）
├── 依赖 zhao-tag（tag 关联，可选）
└── 依赖 zhao-auth（用户鉴权，content-api 需登录接口用）
```

### 2.2 复用关系

| 能力 | 复用来源 |
|------|----------|
| SEO 输出（sitemap/robots/llms.txt/schema.org） | zhao-website seo-output |
| 互动追踪（like/collect/share） | zhao-website interaction |
| 访问日志 | zhao-website visit-log |
| 搜索日志 | zhao-website search-log |
| 积分激励 | zhao-point 插件 |
| 内容营销（article/tutorial） | zhao-website |
| 案例展示 | zhao-website case |
| FAQ | zhao-website faq |
| 异步批量写入模式 | zhao-website async-writer |

### 2.3 插件目录结构

```
e:\code\basic\plugins\zhao-logistics/
├── package.json
├── strapi-server.js                    # 入口指向 ./dist/server/index.js
├── server/
│   ├── src/
│   │   ├── index.ts                    # 插件注册入口
│   │   ├── bootstrap.ts                # 启动钩子（权限同步+定时任务注册）
│   │   ├── content-types/
│   │   │   ├── index.ts                # CT 注册汇总
│   │   │   ├── quote-request/schema.json
│   │   │   ├── quote-field-rule/schema.json
│   │   │   ├── quote-price-rule/schema.json
│   │   │   ├── quote-price-formula/schema.json
│   │   │   ├── tracking-shipment/schema.json
│   │   │   ├── tracking-node/schema.json
│   │   │   ├── tracking-provider/schema.json
│   │   │   ├── contact-matrix/schema.json
│   │   │   ├── review/schema.json
│   │   │   ├── subscription/schema.json
│   │   │   ├── landing-page/schema.json
│   │   │   ├── conversion-funnel/schema.json
│   │   │   ├── conversion-event/schema.json
│   │   │   ├── intent-order/schema.json
│   │   │   ├── referral/schema.json
│   │   │   └── customer-profile/schema.json
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   ├── quote-engine.ts
│   │   │   ├── tracking-aggregator.ts
│   │   │   ├── dynamic-form.ts
│   │   │   ├── funnel-tracker.ts
│   │   │   ├── referral-engine.ts
│   │   │   ├── customer-aggregator.ts
│   │   │   └── async-writer.ts         # 复用 zhao-website 模式（事件批量写入）
│   │   ├── providers/                  # 外部 API 适配器
│   │   │   ├── track17.ts
│   │   │   ├── afterShip.ts
│   │   │   ├── kuaidi100.ts
│   │   │   └── custom.ts
│   │   ├── controllers/
│   │   │   ├── admin-api/
│   │   │   │   ├── generic.ts          # 通用 CRUD 工厂（按 serviceName 动态分发）
│   │   │   │   ├── quote-engine.ts
│   │   │   │   ├── tracking.ts
│   │   │   │   ├── funnel.ts
│   │   │   │   ├── review.ts
│   │   │   │   ├── intent-order.ts
│   │   │   │   └── customer-profile.ts
│   │   │   └── content-api/
│   │   │       ├── quote.ts
│   │   │       ├── tracking.ts
│   │   │       ├── contact-matrix.ts
│   │   │       ├── review.ts
│   │   │       ├── landing-page.ts
│   │   │       ├── intent-order.ts
│   │   │       ├── funnel.ts
│   │   │       ├── referral.ts
│   │   │       └── customer-profile.ts
│   │   ├── routes/
│   │   │   ├── admin-api.ts
│   │   │   └── content-api.ts
│   │   ├── middlewares/
│   │   │   └── site-resolver.ts        # 复用 zhao-common site-resolver
│   │   ├── policies/
│   │   │   ├── has-tenant-access.ts    # 复用 zhao-common 模式
│   │   │   └── has-channel-scope.ts
│   │   ├── utils/
│   │   │   ├── slug.ts
│   │   │   └── tracking-no-generator.ts
│   │   └── config/
│   │       └── permissions.ts          # 权限定义（16 个 CT × 多操作）
│   └── database/
│       └── migrations/
│           ├── 001_create_core_tables.js
│           └── 002_add_composite_indexes.js
```

---

## 3. Content Types 字段设计（16 个新建 + 3 个扩展）

### 3.1 核心业务 CT（8 个）

#### 3.1.1 quote-request（询价单）

表名: `zhao_logistics_quote_requests` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | 租户隔离 |
| trackingNo | string(50) | | 询价单号（自动生成，如 QR20260709001） |
| routeId | string(50) | * | 线路 ID（关联 quote-price-rule.routeId） |
| origin | string(100) | * | 起运地 |
| destination | string(100) | * | 目的地 |
| serviceProvider | string(50) | | 服务商（FBA/parcel/consolidation/special） |
| cargoType | string(50) | * | 货物类型 |
| weight | decimal | * | 重量 kg |
| volume | decimal | | 体积 m³ |
| formData | json | * | 动态字段数据（按字段 key 存值） |
| quotedPrice | json | | 报价结果（minPrice/maxPrice/currency/breakdown） |
| status | enum: draft/submitted/quoted/accepted/rejected/expired | * | 默认 submitted |
| leadId | string | | 关联 lead 记录 ID（提交后自动创建 lead） |
| customerName | string(100) | * | 联系人 |
| customerContact | string(200) | * | 联系方式（JSON: {type, value}） |
| customerType | enum: individual/business/fba_seller | | 客户类型（影响动态字段） |
| utmSource | string(100) | | UTM 来源 |
| utmMedium | string(100) | | |
| utmCampaign | string(100) | | |
| lang | string(10) | * | 提交语言（cn/jp/kr/vn） |
| remark | text | | 备注 |
| expiresAt | datetime | | 报价过期时间 |
| deletedAt | datetime | | 软删 |

#### 3.1.2 quote-field-rule（动态字段规则）

表名: `zhao_logistics_quote_field_rules` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| name | string(100), localized | * | 规则名称（如「中日线 FBA 字段」） |
| routeId | string(50) | | 适用线路 ID（空=全线路通用） |
| serviceProvider | string(50) | | 适用服务商（空=全部） |
| customerType | enum: individual/business/fba_seller | | 适用客户类型（空=全部） |
| isActive | boolean | * | 默认 true |
| priority | integer | | 优先级（多规则命中时取最高） |
| fields | json, localized | * | 字段定义数组（见下） |
| deletedAt | datetime | | |

**fields JSON 结构**（支持显隐联动/校验/分组/权限/模板复用）：

```json
[
  {
    "key": "iossNumber",
    "label": "IOSS 编号",
    "type": "text|number|select|checkbox|textarea|date|file",
    "group": "tax",
    "required": true,
    "visibleWhen": {
      "field": "destination",
      "op": "eq",
      "value": "日本"
    },
    "options": [{"label": "选项", "value": "v1"}],
    "validation": {
      "pattern": "^[A-Z]{2}[0-9]{10}$",
      "min": 0,
      "max": 100,
      "messageKey": "validation.iossFormat"
    },
    "unit": "kg",
    "placeholder": "请输入 IOSS 编号",
    "permission": "authenticated|fba_seller",
    "order": 1
  }
]
```

#### 3.1.3 quote-price-rule（报价规则表）

表名: `zhao_logistics_quote_price_rules` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| routeId | string(50) | * | 线路 ID |
| serviceProvider | string(50) | * | 服务商 |
| minWeight | decimal | * | 重量下限 kg |
| maxWeight | decimal | * | 重量上限 kg |
| pricePerKg | decimal | * | 每 kg 单价 |
| currency | string(10) | * | 默认 CNY |
| volumetricFactor | integer | | 体积系数（如 6000） |
| minCharge | decimal | | 最低收费 |
| surcharges | json | | 附加费（燃油/偏远/超长/超重，数组） |
| formulaId | manyToOne→quote-price-formula | | 绑定复杂公式 |
| effectiveFrom | date | * | 生效日期 |
| effectiveTo | date | | 失效日期 |
| isActive | boolean | * | 默认 true |
| deletedAt | datetime | | |

#### 3.1.4 quote-price-formula（报价公式模板）

表名: `zhao_logistics_quote_price_formulas` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| name | string(100), localized | * | 公式名称 |
| description | text, localized | | 公式说明 |
| expression | text | * | 表达式 |
| variables | json | * | 变量定义 |
| isActive | boolean | * | 默认 true |
| deletedAt | datetime | | |

**expression 示例**：
```
max(weight, volume * 1000000 / volumetricFactor) * pricePerKg + surcharge + minCharge
```

**variables JSON**：
```json
[
  {"key": "weight", "source": "quote-request.weight", "type": "number"},
  {"key": "volume", "source": "quote-request.volume", "type": "number"},
  {"key": "volumetricFactor", "source": "quote-price-rule.volumetricFactor", "type": "number"},
  {"key": "pricePerKg", "source": "quote-price-rule.pricePerKg", "type": "number"},
  {"key": "surcharge", "source": "quote-price-rule.surcharges", "type": "json", "transform": "sum"},
  {"key": "minCharge", "source": "quote-price-rule.minCharge", "type": "number"}
]
```

**安全沙箱选型**：使用 `mathjs` 的 `evaluate`（限制作用域，禁用函数赋值）或 `expr-eval`（纯数学表达式）。禁止使用 `eval()` 或 `vm` 模块。

#### 3.1.5 tracking-shipment（追踪主表）

表名: `zhao_logistics_tracking_shipments` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| trackingNo | string(50) | * | 运单号（unique per site） |
| orderId | string(50) | | 内部订单号（关联 ERP/TMS） |
| status | enum: pending/in_transit/customs/hold/delivered/exception/returned | * | 默认 pending |
| origin | string(100) | * | 起运地 |
| destination | string(100) | * | 目的地 |
| serviceProvider | string(50) | | 物流服务商 |
| eta | datetime | | 预计到达 |
| actualDelivery | datetime | | 实际到达 |
| customerName | string(100) | | 客户名 |
| customerContact | string(200) | | 客户联系方式 |
| lastSyncAt | datetime | | 最后同步时间 |
| syncProvider | manyToOne→tracking-provider | | 数据来源 |
| deletedAt | datetime | | |

#### 3.1.6 tracking-node（追踪节点）

表名: `zhao_logistics_tracking_nodes` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| shipment | manyToOne→tracking-shipment | * | 所属运单 |
| nodeStatus | enum: done/active/pending/alert | * | 节点状态 |
| nodeType | enum: picked_up/export/import/customs/hold/delivery/delivered/exception | * | 节点类型 |
| location | string(100) | | 节点位置 |
| eventTime | datetime | * | 事件时间 |
| description | text, localized | * | 节点描述 |
| dataSource | enum: internal/external | * | 数据源 |
| providerRef | string(50) | | 外部 API 引用 ID |
| deletedAt | datetime | | |

#### 3.1.7 tracking-provider（外部 API 配置）

表名: `zhao_logistics_tracking_providers` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| name | string(100) | * | 配置名称 |
| providerType | enum: 17track/afterShip/kuaidi100/custom_api | * | 提供商类型 |
| apiKey | string(200) | * | API Key（加密存储） |
| apiSecret | string(200) | | API Secret |
| endpoint | string(500) | | 自定义端点 |
| isEnabled | boolean | * | 默认 true |
| rateLimit | integer | | 限流（次/分钟） |
| supportedCarriers | json | | 支持的承运商列表 |
| extraConfig | json | | 扩展配置 |
| deletedAt | datetime | | |

#### 3.1.8 contact-matrix（联系渠道矩阵）

表名: `zhao_logistics_contact_matrices` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| lang | enum: cn/jp/kr/vn | * | 语言 |
| flag | string(10) | * | 国旗 emoji |
| short | string(10) | * | 简称 |
| primary | json, localized | * | 主渠道（type/label/href/hint/qrCode） |
| channels | json, localized | * | 全渠道矩阵数组 |
| hotline | json, localized | * | {label, tel, hours} |
| email | string(100) | * | 邮箱 |
| callbackNote | text, localized | | 回拨说明 |
| isActive | boolean | * | 默认 true |
| deletedAt | datetime | | |

### 3.2 获客成交 CT（7 个，第一+第二梯队）

#### 3.2.1 review（客户评价）— 第一梯队

表名: `zhao_logistics_reviews` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| authorName | string(100), localized | * | 评价人姓名 |
| authorCompany | string(100) | | 评价人公司 |
| authorTitle | string(50) | | 评价人职位 |
| authorCountry | string(10) | * | 评价人国家（cn/jp/kr/vn） |
| routeId | string(50) | | 使用线路 |
| serviceProvider | string(50) | | 服务商 |
| rating | integer | * | 评分 1-5 |
| content | text, localized | * | 文字评价 |
| videoUrl | string(500) | | 视频评价 URL |
| videoPoster | media | | 视频封面 |
| images | media, multiple | | 评价图片 |
| testimonialType | enum: text/video/case_study | * | 默认 text |
| isVerified | boolean | * | 是否已验证真实客户，默认 false |
| isFeatured | boolean | | 是否精选 |
| publishedAt | datetime | | 发布时间 |
| status | enum: pending/approved/rejected | * | 默认 pending |
| replyContent | text, localized | | 官方回复 |
| replyAt | datetime | | 回复时间 |
| orderRef | string(50) | | 关联订单号（验证用） |
| deletedAt | datetime | | |

#### 3.2.2 subscription（通知订阅）— 第一梯队

表名: `zhao_logistics_subscriptions` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| subscriberType | enum: tracking_update/quote_reply/promotion/newsletter | * | 订阅类型 |
| channel | enum: email/line/kakao/zalo/wechat/sms | * | 通知渠道 |
| channelTarget | string(200) | * | 订阅目标（邮箱/LINE ID/手机号） |
| trackingNo | string(50) | | 关联运单号 |
| quoteRequestId | string | | 关联询价单 |
| eventFilter | json | | 事件过滤 |
| frequency | enum: realtime/daily/weekly | * | 默认 realtime |
| isActive | boolean | * | 默认 true |
| subscribedAt | datetime | * | 订阅时间 |
| unsubscribedAt | datetime | | 退订时间 |
| language | string(10) | * | 订阅语言 |
| lastNotifiedAt | datetime | | 最后通知时间 |
| notifyCount | integer | | 已通知次数 |
| deletedAt | datetime | | |

#### 3.2.3 landing-page（营销落地页）— 第一梯队

表名: `zhao_logistics_landing_pages` | i18n: 是 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| slug | uid | * | URL 标识 |
| title | string(200), localized | * | 页面标题 |
| campaignName | string(100) | * | 活动名称 |
| utmSource | string(100) | * | UTM 来源 |
| utmMedium | string(100) | * | UTM 媒介 |
| utmCampaign | string(100) | * | UTM 活动 |
| utmContent | string(100) | | UTM 内容（A/B 版本标识） |
| utmTerm | string(100) | | UTM 关键词 |
| conversionGoal | enum: quote_submit/contact_click/phone_call/download | * | 转化目标 |
| heroContent | json, localized | * | Hero 区内容 |
| sections | json, localized | * | 页面区块数组 |
| formConfig | json | | 嵌入表单配置 |
| seoTitle | string(60), localized | | SEO 标题 |
| seoDescription | string(160), localized | | SEO 描述 |
| ogImage | media | | 分享图 |
| variant | string(20) | | A/B 版本标识 |
| parentPageId | string | | 父落地页 |
| isActive | boolean | * | 默认 true |
| startAt | datetime | | 上线时间 |
| endAt | datetime | | 下线时间 |
| publishedAt | datetime | | |
| status | enum: draft/published/archived | * | 默认 draft |
| deletedAt | datetime | | |

#### 3.2.4 conversion-funnel（转化漏斗）— 第一梯队

**主表**：

表名: `zhao_logistics_conversion_funnels` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| name | string(100) | * | 漏斗名称 |
| lang | string(10) | | 语言（空=全语言） |
| steps | json | * | 漏斗阶段定义数组 |
| isActive | boolean | * | 默认 true |
| deletedAt | datetime | | |

**steps JSON 结构**：
```json
[
  {"step": 1, "name": "visit", "eventName": "page_view"},
  {"step": 2, "name": "view_quote_form", "eventName": "quote_form_view"},
  {"step": 3, "name": "submit_quote", "eventName": "quote_submit"},
  {"step": 4, "name": "quoted", "eventName": "quote_quoted"},
  {"step": 5, "name": "accepted", "eventName": "quote_accepted"},
  {"step": 6, "name": "ordered", "eventName": "order_placed"}
]
```

**事件记录表**：

表名: `zhao_logistics_conversion_events` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| funnelId | manyToOne→conversion-funnel | * | 所属漏斗 |
| eventName | string(50) | * | 事件名 |
| step | integer | * | 阶段序号 |
| visitorId | string(100) | * | 访客 ID |
| userId | manyToOne→users-permissions.user | | 登录用户 |
| sessionId | string(100) | | 会话 ID |
| landingPageId | string | | 落地页 ID |
| quoteRequestId | string | | 关联询价单 |
| utmSource | string(100) | | UTM 来源 |
| utmMedium | string(100) | | |
| utmCampaign | string(100) | | |
| lang | string(10) | | 事件语言 |
| ipAddress | string(45) | | |
| userAgent | string(500) | | |
| occurredAt | datetime | * | 事件时间 |
| deletedAt | datetime | | |

#### 3.2.5 intent-order（意向订单）— 第二梯队

表名: `zhao_logistics_intent_orders` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| orderNo | string(50) | * | 意向单号（自动生成） |
| quoteRequestId | string | * | 关联询价单 |
| customerName | string(100) | * | 客户名 |
| customerContact | string(200) | * | 联系方式 |
| customerType | enum: individual/business/fba_seller | | 客户类型 |
| confirmedPrice | json | * | 确认报价 |
| cargoSummary | json | * | 货物摘要 |
| routeSummary | json | * | 线路摘要 |
| plannedShipDate | date | | 预计发货日 |
| actualShipDate | date | | 实际发货日 |
| status | enum: intent/confirmed/shipping/delivered/cancelled | * | 默认 intent |
| assignedTo | manyToOne→admin::user | | 负责人 |
| followUpRecords | json | | 跟进记录数组 |
| contractSigned | boolean | | 是否签合同 |
| depositPaid | boolean | | 是否付定金 |
| depositAmount | decimal | | 定金金额 |
| convertedToOrderId | string | | 转正式订单号 |
| remark | text | | |
| leadId | string | | 关联 lead |
| deletedAt | datetime | | |

#### 3.2.6 referral（推荐奖励）— 第二梯队

表名: `zhao_logistics_referrals` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| referralCode | string(50) | * | 推荐码（唯一 per site） |
| referrerName | string(100) | * | 推荐人姓名 |
| referrerContact | string(200) | * | 推荐人联系方式 |
| referrerCustomerId | string | | 推荐人客户档案 ID |
| refereeName | string(100) | * | 被推荐人姓名 |
| refereeContact | string(200) | * | 被推荐人联系方式 |
| refereeCustomerId | string | | 被推荐人客户档案 ID |
| referralChannel | enum: friend/community/exhibition/partner/other | * | 推荐渠道 |
| referralSource | string(100) | | 推荐来源详情 |
| status | enum: pending/contacted/qualified/converted/rewarded/invalid | * | 默认 pending |
| quoteRequestId | string | | 关联询价单 |
| intentOrderId | string | | 关联意向订单 |
| rewardType | enum: points/cash/discount/gift | * | 奖励类型 |
| rewardAmount | decimal | | 奖励数值 |
| rewardStatus | enum: pending/issued/claimed | | 默认 pending |
| rewardIssuedAt | datetime | | 奖励发放时间 |
| conversionValue | decimal | | 成交金额 |
| convertedAt | datetime | | 转化时间 |
| remark | text | | |
| deletedAt | datetime | | |

#### 3.2.7 customer-profile（客户档案）— 第二梯队

表名: `zhao_logistics_customer_profiles` | i18n: 否 | 软删: deletedAt

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| site | manyToOne→site-config | * | |
| name | string(100) | * | 客户名 |
| contactPhone | string(50) | * | 电话 |
| contactEmail | string(100) | | 邮箱 |
| contactLine | string(100) | | LINE ID |
| contactWechat | string(100) | | 微信号 |
| contactKakao | string(100) | | Kakao ID |
| contactZalo | string(100) | | Zalo ID |
| company | string(100) | | 公司 |
| title | string(50) | | 职位 |
| customerType | enum: individual/business/fba_seller | * | 客户类型 |
| country | string(10) | * | 国家 |
| preferredLang | string(10) | | 偏好语言 |
| preferredRoute | json | | 常用线路数组 |
| preferredService | json | | 常用服务商数组 |
| totalQuoteCount | integer | | 累计询价数 |
| totalOrderCount | integer | | 累计订单数 |
| totalOrderValue | decimal | | 累计成交额 |
| lastQuoteAt | datetime | | 最后询价时间 |
| lastOrderAt | datetime | | 最后下单时间 |
| lifecycleStage | enum: lead/active/repeat/vip/churned | * | 默认 lead |
| tags | json | | 客户标签数组 |
| assignedTo | manyToOne→admin::user | | 负责人 |
| sourceChannel | string(50) | | 首次来源渠道 |
| utmSource | string(100) | | 首次 UTM 来源 |
| remark | text | | |
| relatedLeadIds | json | | 关联 lead ID 数组 |
| relatedQuoteIds | json | | 关联询价单 ID 数组 |
| relatedOrderIds | json | | 关联意向订单 ID 数组 |
| deletedAt | datetime | | |

### 3.3 扩展现有 CT（3 个）

#### 3.3.1 扩展 zhao-website.lead

| 字段 | 修改内容 |
|------|----------|
| type | 枚举增加：`quote` / `intent_order` / `referral` |
| sourceId | 语义扩展：关联 quote-request / intent-order / referral 的 documentId |
| referralCode | 新增 string(50)，推荐码 |

#### 3.3.2 扩展 zhao-website.brand-info

| 新增字段 | 类型 | 说明 |
|----------|------|------|
| offices | json, localized | 办公室数组：`[{city, address, phone, photo, mapLat, mapLng, mapZoom}]` |
| certificates | json, localized | 证书数组：`[{id, title, issuer, issueDate, expiryDate, image, verifyUrl}]` |

#### 3.3.3 扩展 zhao-website.first-truth-policy

| 字段 | 修改内容 |
|------|----------|
| claimCategory | 枚举增加：`logistics_promise` |

**赔付承诺数据示例**：
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

---

## 4. Services 设计（6 个）

### 4.1 quote-engine（报价引擎）

**文件**：`plugins/zhao-logistics/server/src/services/quote-engine.ts`

**核心方法**：
- `async calculate(siteId, input): Promise<QuoteResult>` — 计算报价（公开+后台共用）
  1. 匹配 quote-price-rule（routeId + serviceProvider + weight 区间）
  2. 若 rule.formulaId 存在，加载 quote-price-formula
  3. 解析 variables（从 input + rule 提取值）
  4. 沙箱执行 expression（用 mathjs/expr-eval，禁用 require/process）
  5. 返回 {minPrice, maxPrice, currency, breakdown}
- `async calculateMulti(siteId, input): Promise<QuoteResult[]>` — 批量计算（多服务商比价）
- `async saveQuote(siteId, quoteRequestId, result): Promise<void>` — 保存报价到 quote-request

**QuoteResult 结构**：
```typescript
interface QuoteResult {
  ruleId: string;
  formulaId?: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  breakdown: {
    base: number;
    volumetricWeight: number;
    surcharges: {name: string, amount: number}[];
    minCharge: number;
    formula?: string;
  };
  expiresAt: string;
}
```

**安全沙箱选型**：使用 `mathjs` 的 `evaluate`（限制作用域，禁用函数赋值）或 `expr-eval`（纯数学表达式，更安全）。禁止使用 `eval()` 或 `vm` 模块。

### 4.2 tracking-aggregator（追踪聚合器）

**核心方法**：
- `async getTracking(siteId, trackingNo): Promise<TrackingResult>` — 查询运单轨迹（内部 + 外部合并）
  1. 查 tracking-shipment
  2. 查 tracking-node（internal 源）
  3. 若 shipment.syncProvider 存在，调用外部 API
  4. 合并节点，按 eventTime 排序
  5. 检测异常状态（hold/exception 节点）
  6. 返回 {shipment, nodes, isAlert, alertNodes}
- `async batchTracking(siteId, trackingNos: string[]): Promise<TrackingResult[]>` — 批量查询（最多 10 单）
- `async syncFromProvider(siteId, trackingNo): Promise<void>` — 同步外部 API
  1. 加载 tracking-provider 配置
  2. 调用外部 API（按 providerType 分发）
  3. 增量写入 tracking-node（dataSource=external，去重 providerRef）
  4. 更新 shipment.lastSyncAt + status

**外部 API 适配器**（strategy 模式）：
- `providers/track17.ts` — 17Track API
- `providers/afterShip.ts` — AfterShip API
- `providers/kuaidi100.ts` — 快递100 API
- `providers/custom.ts` — 自定义 API（按 endpoint + extraConfig 调用）

### 4.3 dynamic-form（动态表单引擎）

**核心方法**：
- `async loadFields(siteId, context: {routeId?, serviceProvider?, customerType?, lang}): Promise<FormField[]>` — 加载字段规则
- `async validate(siteId, formData, fields): Promise<ValidationResult>` — 校验表单数据
- `resolveVisibility(formData, fields): FormField[]` — 解析显隐联动（前端用）

**FormField 结构**：
```typescript
interface FormField {
  key: string;
  label: string;
  type: 'text'|'number'|'select'|'checkbox'|'textarea'|'date'|'file';
  group: string;
  required: boolean;
  visible: boolean;
  visibleWhen?: { field: string, op: string, value: any };
  options?: { label: string, value: string }[];
  validation?: { pattern?: string, min?: number, max?: number, messageKey?: string };
  unit?: string;
  placeholder?: string;
  permission?: string;
  order: number;
}
```

### 4.4 funnel-tracker（漏斗追踪器）

**核心方法**：
- `async track(siteId, event: {funnelId?, eventName, visitorId, userId?, sessionId?, landingPageId?, quoteRequestId?, utm?, lang, ctx}): Promise<void>` — 记录漏斗事件（异步批量写入，复用 zhao-website async-writer 模式）
- `async getStats(siteId, params: {funnelId, dateFrom, dateTo, lang?, utmSource?}): Promise<FunnelStats>` — 查询漏斗转化率

**FunnelStats 结构**：
```typescript
interface FunnelStats {
  steps: {
    step: number;
    name: string;
    eventName: string;
    count: number;
    conversionRate: number;
    overallRate: number;
    avgTimeFromPrevious: number;
  }[];
  totalVisitors: number;
  totalConverted: number;
}
```

### 4.5 referral-engine（推荐引擎）

**核心方法**：
- `async generateCode(siteId, referrerInfo): Promise<string>` — 生成推荐码
- `async applyCode(siteId, code, refereeInfo): Promise<Referral>` — 应用推荐码
- `async markConverted(siteId, referralId, intentOrderId, conversionValue): Promise<void>` — 标记推荐转化（调 zhao-point 发放积分）
- `async getStats(siteId, params): Promise<ReferralStats>` — 查询推荐统计

### 4.6 customer-aggregator（客户档案聚合器）

**核心方法**：
- `async upsertFromLead(siteId, leadId): Promise<CustomerProfile>` — 从 lead 创建/更新客户档案
- `async upsertFromQuote(siteId, quoteRequestId): Promise<CustomerProfile>` — 询价提交时更新
- `async upsertFromOrder(siteId, intentOrderId): Promise<CustomerProfile>` — 订单成交时更新
- `async getProfile(siteId, profileId): Promise<CustomerProfileDetail>` — 聚合查询（含关联 lead/quote/order 列表）

---

## 5. Routes 设计

### 5.1 Admin API（`/v1/admin/*`，鉴权链同 zhao-website）

**CT 标准 CRUD**（16 个 CT 各自 find/findOne/create/update/delete）：
- `/quote-requests` / `/quote-field-rules` / `/quote-price-rules` / `/quote-price-formulas`
- `/tracking-shipments` / `/tracking-nodes` / `/tracking-providers`
- `/contact-matrices`
- `/reviews` / `/subscriptions` / `/landing-pages`
- `/conversion-funnels` / `/conversion-events`（只读 find）
- `/intent-orders` / `/referrals` / `/customer-profiles`

**特殊操作**：

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | /quote-engine/calculate | 后台试算报价 |
| POST | /tracking/sync/:trackingNo | 手动同步外部 API |
| POST | /tracking/batch-sync | 批量同步 |
| GET | /funnel/stats | 漏斗转化率统计 |
| GET | /referrals/stats | 推荐统计 |
| POST | /reviews/:documentId/approve | 审核通过评价 |
| POST | /reviews/:documentId/reject | 驳回评价 |
| POST | /reviews/:documentId/reply | 官方回复评价 |
| POST | /intent-orders/:documentId/convert | 标记转正式订单 |
| POST | /customer-profiles/merge | 合并重复客户档案 |

### 5.2 Content API（`/v1/*`，公开）

| 方法 | 路径 | 用途 | 鉴权 |
|------|------|------|------|
| GET | /quote/fields | 加载动态字段规则 | 无 |
| POST | /quote/calculate | 公开报价计算 | 无 |
| POST | /quote/submit | 提交询价（自动建 lead + quote-request + customer-profile） | 无 |
| GET | /tracking/:trackingNo | 查询轨迹 | 无 |
| POST | /tracking/batch | 批量查询（最多 10 单） | 无 |
| POST | /tracking/subscribe | 订阅运单更新 | 无 |
| GET | /contact-matrix/:lang | 获取某语言渠道矩阵 | 无 |
| GET | /reviews | 评价列表（仅 approved + isVerified） | 无 |
| POST | /reviews/submit | 提交评价（status=pending） | 可选登录 |
| GET | /landing-pages/:slug | 获取落地页内容 | 无 |
| GET | /intent-orders/:orderNo | 查询我的意向订单 | 需登录 |
| POST | /funnel/track | 漏斗事件上报 | 无 |
| POST | /referral/apply | 应用推荐码 | 无 |
| GET | /referral/validate/:code | 验证推荐码有效性 | 无 |
| GET | /customer-profile | 查询当前用户客户档案 | 需登录 |

---

## 6. 关键集成点

### 6.1 询价提交全链路

```
POST /v1/quote/submit
  ├─ dynamic-form.loadFields()      # 加载字段规则
  ├─ dynamic-form.validate()        # 校验
  ├─ quote-engine.calculate()       # 计算报价
  ├─ 创建 quote-request 记录
  ├─ 调用 zhao-website.lead.createPublic()  # 创建 lead（type=quote）
  ├─ customer-aggregator.upsertFromQuote() # 创建/更新客户档案
  ├─ referral-engine.applyCode()    # 若有推荐码，关联
  └─ funnel-tracker.track('quote_submit')  # 漏斗事件
```

### 6.2 追踪订阅通知

```
POST /v1/tracking/subscribe
  ├─ 创建 subscription 记录
  └─ 定时任务（bootstrap 注册 cron，每分钟执行）：
      ├─ 查 active subscription（tracking_update 类型）
      ├─ tracking-aggregator.syncFromProvider() 同步外部 API
      ├─ 检测新节点/异常状态
      └─ 按订阅 channel 发送通知（邮件/LINE/Kakao，调外部 API）
```

### 6.3 推荐转化奖励

```
POST /v1/admin/intent-orders/:documentId/convert
  ├─ 更新 intent-order.status=delivered + convertedToOrderId
  ├─ 查 referral（intentOrderId=当前订单）
  ├─ referral-engine.markConverted()
  │   ├─ 更新 referral.status=converted
  │   └─ 若 rewardType=points，调 zhao-point 授予积分
  └─ customer-aggregator.upsertFromOrder() 更新客户档案
```

### 6.4 落地页漏斗追踪

```
前端访问 /landing-pages/:slug
  ├─ 返回 landing-page 内容
  └─ 前端上报 funnel 事件：
      ├─ page_view（落地页访问）
      ├─ quote_form_view（查看询价表单）
      ├─ quote_submit（提交询价，带 quoteRequestId）
      ├─ quote_quoted（报价完成）
      └─ order_placed（下单成交）
```

---

## 7. 权限设计

### 7.1 权限定义

17 个 CT × 5 操作（read/create/update/delete/publish），命名 `zhao-logistics.{ct}.{action}`：

```
zhao-logistics.quote-request.read/create/update/delete
zhao-logistics.quote-field-rule.read/create/update/delete
zhao-logistics.quote-price-rule.read/create/update/delete
zhao-logistics.quote-price-formula.read/create/update/delete
zhao-logistics.tracking-shipment.read/create/update/delete
zhao-logistics.tracking-node.read/create/update/delete
zhao-logistics.tracking-provider.read/create/update/delete
zhao-logistics.contact-matrix.read/create/update/delete
zhao-logistics.review.read/create/update/delete/publish
zhao-logistics.subscription.read/update/delete
zhao-logistics.landing-page.read/create/update/delete/publish
zhao-logistics.conversion-funnel.read/create/update/delete
zhao-logistics.conversion-event.read
zhao-logistics.intent-order.read/create/update/delete
zhao-logistics.referral.read/create/update/delete
zhao-logistics.customer-profile.read/update/delete/merge
```

### 7.2 系统角色权限同步（bootstrap 中执行）

| 角色 | 权限范围 |
|------|----------|
| super-admin | 全部权限 |
| admin | 除 tracking-provider.create/update/delete 外的全部 |
| editor | 内容管理（quote-field-rule/quote-price-rule/contact-matrix/review/landing-page CRUD） |
| viewer | 全部 .read |

---

## 8. 数据库迁移

### 8.1 001_create_core_tables.js

创建 16 个表：
- quote_requests / quote_field_rules / quote_price_rules / quote_price_formulas
- tracking_shipments / tracking_nodes / tracking_providers
- contact_matrices
- reviews / subscriptions / landing_pages
- conversion_funnels / conversion_events
- intent_orders / referrals / customer_profiles

### 8.2 002_add_composite_indexes.js

| 表 | 索引字段 | 类型 |
|----|----------|------|
| quote_requests | (site_id, route_id, status, created_at) | 普通索引 |
| tracking_shipments | (site_id, tracking_no) | UNIQUE |
| tracking_nodes | (site_id, shipment_id, event_time) | 普通索引 |
| conversion_events | (site_id, funnel_id, visitor_id, occurred_at) | 普通索引（高频查询） |
| customer_profiles | (site_id, contact_phone) / (site_id, contact_email) | 普通索引 |
| referrals | (site_id, referral_code) | UNIQUE |
| landing_pages | (site_id, slug) | UNIQUE |

---

## 9. 范围说明

### 9.1 本次实施范围

- 16 个新建 CT + 3 个扩展现有 CT
- 6 个 Services（quote-engine/tracking-aggregator/dynamic-form/funnel-tracker/referral-engine/customer-aggregator）
- Admin API + Content API 全套路由
- 外部追踪 API 适配器（17Track/AfterShip/快递100/自定义）
- 权限同步 + 数据库迁移
- 定时任务（追踪同步 + 订阅通知）

### 9.2 不做范围（第三梯队，超出官网职责）

- 合同/协议在线签署（属于交易系统，可对接第三方电子签）
- 定金/预付款支付集成（属于交易系统，可对接支付宝/微信/PayPal）
- 实时舱位/运力查询（属于运营系统）
- A/B 测试框架（复杂度高，建议用第三方工具）
- 智能客服机器人（建议接第三方）
