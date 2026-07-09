# zhao-logistics Plan 3：获客成交 CT + 扩展现有 CT + 基础 CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 8 个获客成交 Content Type（review/subscription/landing-page/conversion-funnel/conversion-event/intent-order/referral/customer-profile），扩展 3 个 zhao-website 现有 CT（lead/brand-info/first-truth-policy），为新 CT 实现基础 Admin API CRUD，添加数据库索引和权限定义。

**Architecture:** 新 CT schema 遵循 Plan 1 已建立的模式（独立 schema.json + content-types/index.ts 汇总 + site manyToOne 关系 + deletedAt 软删 + i18n pluginOptions）。Service 遵循 Plan 1 的 CRUD 模式（findAdmin/findOneAdmin/createAdmin/updateAdmin/deleteAdmin），使用 strapi.db.query + 纯对象 populate。Controller 复用 Plan 1 的 createGenericController 工厂，Routes 复用 createCrudRoutes 工厂。扩展现有 CT 直接修改 zhao-website 的 schema.json。migration 脚本只负责索引/约束（Strapi v5 自动建表）。

**Tech Stack:** Strapi v5 + TypeScript + PostgreSQL + knex（migration）

**配套设计文档**：[2026-07-09-zhao-logistics-plugin-design.md](../specs/2026-07-09-zhao-logistics-plugin-design.md)（第 3.2-3.3 节）

**前置 Plan**：[Plan 1 — 插件骨架 + 核心业务 CT + Migrations + 基础 CRUD](./2026-07-09-zhao-logistics-plugin-skeleton-core-ct.md)

---

## 文件结构

本 Plan 创建/修改的文件清单：

**新建文件（8 个获客成交 CT schema）**：
- `plugins/zhao-logistics/server/src/content-types/review/schema.json` — 客户评价
- `plugins/zhao-logistics/server/src/content-types/subscription/schema.json` — 通知订阅
- `plugins/zhao-logistics/server/src/content-types/landing-page/schema.json` — 营销落地页
- `plugins/zhao-logistics/server/src/content-types/conversion-funnel/schema.json` — 转化漏斗
- `plugins/zhao-logistics/server/src/content-types/conversion-event/schema.json` — 转化事件
- `plugins/zhao-logistics/server/src/content-types/intent-order/schema.json` — 意向订单
- `plugins/zhao-logistics/server/src/content-types/referral/schema.json` — 推荐奖励
- `plugins/zhao-logistics/server/src/content-types/customer-profile/schema.json` — 客户档案

**新建文件（8 个基础 CRUD Service）**：
- `plugins/zhao-logistics/server/src/services/review.ts`
- `plugins/zhao-logistics/server/src/services/subscription.ts`
- `plugins/zhao-logistics/server/src/services/landing-page.ts`
- `plugins/zhao-logistics/server/src/services/conversion-funnel.ts`
- `plugins/zhao-logistics/server/src/services/conversion-event.ts`
- `plugins/zhao-logistics/server/src/services/intent-order.ts`
- `plugins/zhao-logistics/server/src/services/referral.ts`
- `plugins/zhao-logistics/server/src/services/customer-profile.ts`

**新建文件（数据库迁移）**：
- `plugins/zhao-logistics/server/database/migrations/002_add_conversion_indexes.js` — 获客成交 CT 索引

**修改文件（CT 汇总/Service 汇总/Controller 汇总/路由汇总/权限）**：
- `plugins/zhao-logistics/server/src/content-types/index.ts` — 追加 8 个新 CT
- `plugins/zhao-logistics/server/src/services/index.ts` — 追加 8 个新 service
- `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts` — 追加 8 个新 controller
- `plugins/zhao-logistics/server/src/routes/admin-api.ts` — 追加 8 组新路由（40 端点）
- `plugins/zhao-logistics/server/src/config/permissions.ts` — 追加 8 个新 CT 权限

**修改文件（扩展 zhao-website 现有 CT）**：
- `plugins/zhao-website/server/src/content-types/lead/schema.json` — type 枚举增加 intent_order/referral + 新增 referralCode 字段
- `plugins/zhao-website/server/src/content-types/brand-info/schema.json` — 新增 offices/certificates JSON 字段
- `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json` — claimCategory 枚举增加 logistics_promise

---

## Task 1：创建 8 个获客成交 CT schema.json + 更新 content-types/index.ts

**Files:**
- Create: `plugins/zhao-logistics/server/src/content-types/review/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/subscription/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/landing-page/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/conversion-funnel/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/conversion-event/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/intent-order/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/referral/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/customer-profile/schema.json`
- Modify: `plugins/zhao-logistics/server/src/content-types/index.ts`

- [ ] **Step 1: 创建 review/schema.json（客户评价，i18n: 是）**

Create `plugins/zhao-logistics/server/src/content-types/review/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_reviews",
  "info": {
    "singularName": "review",
    "pluralName": "reviews",
    "displayName": "客户评价"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_reviews"
    },
    "authorName": {
      "type": "string",
      "maxLength": 100,
      "required": true,
      "localized": true
    },
    "authorCompany": {
      "type": "string",
      "maxLength": 100
    },
    "authorTitle": {
      "type": "string",
      "maxLength": 50
    },
    "authorCountry": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "routeId": {
      "type": "string",
      "maxLength": 50
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "rating": {
      "type": "integer",
      "required": true
    },
    "content": {
      "type": "text",
      "required": true,
      "localized": true
    },
    "videoUrl": {
      "type": "string",
      "maxLength": 500
    },
    "videoPoster": {
      "type": "media",
      "multiple": false
    },
    "images": {
      "type": "media",
      "multiple": true
    },
    "testimonialType": {
      "type": "enumeration",
      "enum": ["text", "video", "case_study"],
      "default": "text",
      "required": true
    },
    "isVerified": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "isFeatured": {
      "type": "boolean",
      "default": false
    },
    "publishedAt": {
      "type": "datetime"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected"],
      "default": "pending",
      "required": true
    },
    "replyContent": {
      "type": "text",
      "localized": true
    },
    "replyAt": {
      "type": "datetime"
    },
    "orderRef": {
      "type": "string",
      "maxLength": 50
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 2: 创建 subscription/schema.json（通知订阅，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/subscription/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_subscriptions",
  "info": {
    "singularName": "subscription",
    "pluralName": "subscriptions",
    "displayName": "通知订阅"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_subscriptions"
    },
    "subscriberType": {
      "type": "enumeration",
      "enum": ["tracking_update", "quote_reply", "promotion", "newsletter"],
      "required": true
    },
    "channel": {
      "type": "enumeration",
      "enum": ["email", "line", "kakao", "zalo", "wechat", "sms"],
      "required": true
    },
    "channelTarget": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "trackingNo": {
      "type": "string",
      "maxLength": 50
    },
    "quoteRequestId": {
      "type": "string"
    },
    "eventFilter": {
      "type": "json"
    },
    "frequency": {
      "type": "enumeration",
      "enum": ["realtime", "daily", "weekly"],
      "default": "realtime",
      "required": true
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "subscribedAt": {
      "type": "datetime",
      "required": true
    },
    "unsubscribedAt": {
      "type": "datetime"
    },
    "language": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "lastNotifiedAt": {
      "type": "datetime"
    },
    "notifyCount": {
      "type": "integer",
      "default": 0
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 3: 创建 landing-page/schema.json（营销落地页，i18n: 是）**

Create `plugins/zhao-logistics/server/src/content-types/landing-page/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_landing_pages",
  "info": {
    "singularName": "landing-page",
    "pluralName": "landing-pages",
    "displayName": "营销落地页"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_landing_pages"
    },
    "slug": {
      "type": "uid",
      "required": true
    },
    "title": {
      "type": "string",
      "maxLength": 200,
      "required": true,
      "localized": true
    },
    "campaignName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmContent": {
      "type": "string",
      "maxLength": 100
    },
    "utmTerm": {
      "type": "string",
      "maxLength": 100
    },
    "conversionGoal": {
      "type": "enumeration",
      "enum": ["quote_submit", "contact_click", "phone_call", "download"],
      "required": true
    },
    "heroContent": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "sections": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "formConfig": {
      "type": "json"
    },
    "seoTitle": {
      "type": "string",
      "maxLength": 60,
      "localized": true
    },
    "seoDescription": {
      "type": "string",
      "maxLength": 160,
      "localized": true
    },
    "ogImage": {
      "type": "media",
      "multiple": false
    },
    "variant": {
      "type": "string",
      "maxLength": 20
    },
    "parentPageId": {
      "type": "string"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "startAt": {
      "type": "datetime"
    },
    "endAt": {
      "type": "datetime"
    },
    "publishedAt": {
      "type": "datetime"
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "published", "archived"],
      "default": "draft",
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 4: 创建 conversion-funnel/schema.json（转化漏斗，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/conversion-funnel/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_conversion_funnels",
  "info": {
    "singularName": "conversion-funnel",
    "pluralName": "conversion-funnels",
    "displayName": "转化漏斗"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_conversion_funnels"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "lang": {
      "type": "string",
      "maxLength": 10
    },
    "steps": {
      "type": "json",
      "required": true
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 5: 创建 conversion-event/schema.json（转化事件，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/conversion-event/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_conversion_events",
  "info": {
    "singularName": "conversion-event",
    "pluralName": "conversion-events",
    "displayName": "转化事件"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_conversion_events"
    },
    "funnel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-logistics.conversion-funnel",
      "required": true,
      "inversedBy": "events"
    },
    "eventName": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "step": {
      "type": "integer",
      "required": true
    },
    "visitorId": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "sessionId": {
      "type": "string",
      "maxLength": 100
    },
    "landingPageId": {
      "type": "string"
    },
    "quoteRequestId": {
      "type": "string"
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 100
    },
    "lang": {
      "type": "string",
      "maxLength": 10
    },
    "ipAddress": {
      "type": "string",
      "maxLength": 45
    },
    "userAgent": {
      "type": "string",
      "maxLength": 500
    },
    "occurredAt": {
      "type": "datetime",
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

> 注：设计文档中 `funnelId` 和 `userId` 为关系字段，按 Strapi 命名规范使用 `funnel` 和 `user` 作为属性名（避免数据库列名出现 `funnel_id_id` 双重后缀问题）。非关系型 ID 引用字段（landingPageId/quoteRequestId）保持原名。

- [ ] **Step 6: 创建 intent-order/schema.json（意向订单，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/intent-order/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_intent_orders",
  "info": {
    "singularName": "intent-order",
    "pluralName": "intent-orders",
    "displayName": "意向订单"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_intent_orders"
    },
    "orderNo": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "quoteRequestId": {
      "type": "string",
      "required": true
    },
    "customerName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "customerContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "customerType": {
      "type": "enumeration",
      "enum": ["individual", "business", "fba_seller"]
    },
    "confirmedPrice": {
      "type": "json",
      "required": true
    },
    "cargoSummary": {
      "type": "json",
      "required": true
    },
    "routeSummary": {
      "type": "json",
      "required": true
    },
    "plannedShipDate": {
      "type": "date"
    },
    "actualShipDate": {
      "type": "date"
    },
    "status": {
      "type": "enumeration",
      "enum": ["intent", "confirmed", "shipping", "delivered", "cancelled"],
      "default": "intent",
      "required": true
    },
    "assignedTo": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "followUpRecords": {
      "type": "json"
    },
    "contractSigned": {
      "type": "boolean",
      "default": false
    },
    "depositPaid": {
      "type": "boolean",
      "default": false
    },
    "depositAmount": {
      "type": "decimal"
    },
    "convertedToOrderId": {
      "type": "string"
    },
    "remark": {
      "type": "text"
    },
    "leadId": {
      "type": "string"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 7: 创建 referral/schema.json（推荐奖励，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/referral/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_referrals",
  "info": {
    "singularName": "referral",
    "pluralName": "referrals",
    "displayName": "推荐奖励"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_referrals"
    },
    "referralCode": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "referrerName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "referrerContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "referrerCustomerId": {
      "type": "string"
    },
    "refereeName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "refereeContact": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "refereeCustomerId": {
      "type": "string"
    },
    "referralChannel": {
      "type": "enumeration",
      "enum": ["friend", "community", "exhibition", "partner", "other"],
      "required": true
    },
    "referralSource": {
      "type": "string",
      "maxLength": 100
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "contacted", "qualified", "converted", "rewarded", "invalid"],
      "default": "pending",
      "required": true
    },
    "quoteRequestId": {
      "type": "string"
    },
    "intentOrderId": {
      "type": "string"
    },
    "rewardType": {
      "type": "enumeration",
      "enum": ["points", "cash", "discount", "gift"],
      "required": true
    },
    "rewardAmount": {
      "type": "decimal"
    },
    "rewardStatus": {
      "type": "enumeration",
      "enum": ["pending", "issued", "claimed"],
      "default": "pending"
    },
    "rewardIssuedAt": {
      "type": "datetime"
    },
    "conversionValue": {
      "type": "decimal"
    },
    "convertedAt": {
      "type": "datetime"
    },
    "remark": {
      "type": "text"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 8: 创建 customer-profile/schema.json（客户档案，i18n: 否）**

Create `plugins/zhao-logistics/server/src/content-types/customer-profile/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_customer_profiles",
  "info": {
    "singularName": "customer-profile",
    "pluralName": "customer-profiles",
    "displayName": "客户档案"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_customer_profiles"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "contactPhone": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "contactEmail": {
      "type": "string",
      "maxLength": 100
    },
    "contactLine": {
      "type": "string",
      "maxLength": 100
    },
    "contactWechat": {
      "type": "string",
      "maxLength": 100
    },
    "contactKakao": {
      "type": "string",
      "maxLength": 100
    },
    "contactZalo": {
      "type": "string",
      "maxLength": 100
    },
    "company": {
      "type": "string",
      "maxLength": 100
    },
    "title": {
      "type": "string",
      "maxLength": 50
    },
    "customerType": {
      "type": "enumeration",
      "enum": ["individual", "business", "fba_seller"],
      "required": true
    },
    "country": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "preferredLang": {
      "type": "string",
      "maxLength": 10
    },
    "preferredRoute": {
      "type": "json"
    },
    "preferredService": {
      "type": "json"
    },
    "totalQuoteCount": {
      "type": "integer",
      "default": 0
    },
    "totalOrderCount": {
      "type": "integer",
      "default": 0
    },
    "totalOrderValue": {
      "type": "decimal",
      "default": 0
    },
    "lastQuoteAt": {
      "type": "datetime"
    },
    "lastOrderAt": {
      "type": "datetime"
    },
    "lifecycleStage": {
      "type": "enumeration",
      "enum": ["lead", "active", "repeat", "vip", "churned"],
      "default": "lead",
      "required": true
    },
    "tags": {
      "type": "json"
    },
    "assignedTo": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "sourceChannel": {
      "type": "string",
      "maxLength": 50
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100
    },
    "remark": {
      "type": "text"
    },
    "relatedLeadIds": {
      "type": "json"
    },
    "relatedQuoteIds": {
      "type": "json"
    },
    "relatedOrderIds": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 9: 更新 content-types/index.ts（追加 8 个新 CT）**

Modify `plugins/zhao-logistics/server/src/content-types/index.ts`:

```typescript
import quoteRequest from "./quote-request/schema.json";
import quoteFieldRule from "./quote-field-rule/schema.json";
import quotePriceRule from "./quote-price-rule/schema.json";
import quotePriceFormula from "./quote-price-formula/schema.json";
import trackingShipment from "./tracking-shipment/schema.json";
import trackingNode from "./tracking-node/schema.json";
import trackingProvider from "./tracking-provider/schema.json";
import contactMatrix from "./contact-matrix/schema.json";
import review from "./review/schema.json";
import subscription from "./subscription/schema.json";
import landingPage from "./landing-page/schema.json";
import conversionFunnel from "./conversion-funnel/schema.json";
import conversionEvent from "./conversion-event/schema.json";
import intentOrder from "./intent-order/schema.json";
import referral from "./referral/schema.json";
import customerProfile from "./customer-profile/schema.json";

export default {
  "quote-request": { schema: quoteRequest },
  "quote-field-rule": { schema: quoteFieldRule },
  "quote-price-rule": { schema: quotePriceRule },
  "quote-price-formula": { schema: quotePriceFormula },
  "tracking-shipment": { schema: trackingShipment },
  "tracking-node": { schema: trackingNode },
  "tracking-provider": { schema: trackingProvider },
  "contact-matrix": { schema: contactMatrix },
  "review": { schema: review },
  "subscription": { schema: subscription },
  "landing-page": { schema: landingPage },
  "conversion-funnel": { schema: conversionFunnel },
  "conversion-event": { schema: conversionEvent },
  "intent-order": { schema: intentOrder },
  "referral": { schema: referral },
  "customer-profile": { schema: customerProfile },
};
```

- [ ] **Step 10: Commit**

```bash
git add plugins/zhao-logistics/server/src/content-types/
git commit -m "feat(zhao-logistics): 创建 8 个获客成交 CT schema（评价/订阅/落地页/漏斗/事件/意向单/推荐/客户档案）"
```

---

## Task 2：扩展现有 CT（3 个 — 修改 zhao-website 的 schema.json）

**Files:**
- Modify: `plugins/zhao-website/server/src/content-types/lead/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/brand-info/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`

- [ ] **Step 1: 扩展 lead/schema.json（type 枚举增加 intent_order/referral + 新增 referralCode 字段）**

Modify `plugins/zhao-website/server/src/content-types/lead/schema.json`，在 `type` 枚举中追加 `"intent_order"` 和 `"referral"`，并在 `sourceId` 字段后新增 `referralCode` 字段：

将 `type` 属性修改为：

```json
    "type": {
      "type": "enumeration",
      "enum": ["contact", "download", "quote", "appointment", "demo", "partner", "intent_order", "referral"],
      "required": true
    },
```

在 `sourceId` 属性后新增 `referralCode`：

```json
    "sourceId": {
      "type": "string"
    },
    "referralCode": {
      "type": "string",
      "maxLength": 50
    },
```

修改后的完整 `type` 和 `sourceId`/`referralCode` 部分确认如下（其余字段不变）：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_leads",
  "info": {
    "singularName": "lead",
    "pluralName": "leads",
    "displayName": "线索/留资"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_leads"
    },
    "type": {
      "type": "enumeration",
      "enum": ["contact", "download", "quote", "appointment", "demo", "partner", "intent_order", "referral"],
      "required": true
    },
    "contactName": {
      "type": "string",
      "maxLength": 50
    },
    "contactPhone": {
      "type": "string",
      "maxLength": 30
    },
    "contactEmail": {
      "type": "email"
    },
    "contactCompany": {
      "type": "string",
      "maxLength": 200
    },
    "contactTitle": {
      "type": "string",
      "maxLength": 100
    },
    "message": {
      "type": "text"
    },
    "sourceType": {
      "type": "string",
      "maxLength": 30
    },
    "sourceId": {
      "type": "string"
    },
    "referralCode": {
      "type": "string",
      "maxLength": 50
    },
    "sourceUrl": {
      "type": "string",
      "maxLength": 500
    },
    "downloadFileId": {
      "type": "string"
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 200
    },
    "utmContent": {
      "type": "string",
      "maxLength": 200
    },
    "utmTerm": {
      "type": "string",
      "maxLength": 200
    },
    "referrer": {
      "type": "string",
      "maxLength": 500
    },
    "userAgent": {
      "type": "string",
      "maxLength": 500
    },
    "ipAddress": {
      "type": "string",
      "maxLength": 50
    },
    "assignedTo": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "status": {
      "type": "enumeration",
      "enum": ["new", "contacted", "qualified", "unqualified", "converted", "invalid"],
      "default": "new"
    },
    "followUpRecords": {
      "type": "json"
    },
    "remark": {
      "type": "text"
    },
    "convertedAt": {
      "type": "datetime"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

> 注：`sourceId` 语义扩展为关联 quote-request / intent-order / referral 的 documentId，字段定义不变。

- [ ] **Step 2: 扩展 brand-info/schema.json（新增 offices/certificates JSON 字段）**

Modify `plugins/zhao-website/server/src/content-types/brand-info/schema.json`，在 `socialLinks` 字段后新增 `offices` 和 `certificates` 两个字段：

在 `socialLinks` 属性后插入：

```json
    "offices": {
      "type": "json",
      "localized": true
    },
    "certificates": {
      "type": "json",
      "localized": true
    },
```

修改后的完整文件确认如下：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_brand_infos",
  "info": {
    "singularName": "brand-info",
    "pluralName": "brand-infos",
    "displayName": "企业品牌信息"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_brand_info"
    },
    "companyName": {
      "type": "string",
      "maxLength": 200,
      "required": true,
      "localized": true
    },
    "shortName": {
      "type": "string",
      "maxLength": 100,
      "localized": true
    },
    "slogan": {
      "type": "string",
      "maxLength": 200,
      "localized": true
    },
    "logo": {
      "type": "media"
    },
    "logoDark": {
      "type": "media"
    },
    "favicon": {
      "type": "media"
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "foundingDate": {
      "type": "date"
    },
    "registeredAddress": {
      "type": "string",
      "maxLength": 500,
      "localized": true
    },
    "officeAddress": {
      "type": "string",
      "maxLength": 500,
      "localized": true
    },
    "contactPhone": {
      "type": "string",
      "maxLength": 30
    },
    "contactEmail": {
      "type": "email"
    },
    "serviceHotline": {
      "type": "string",
      "maxLength": 30
    },
    "businessHours": {
      "type": "string",
      "maxLength": 100
    },
    "wechatQrCode": {
      "type": "media"
    },
    "wechatPublicAccount": {
      "type": "string",
      "maxLength": 100
    },
    "miniProgramName": {
      "type": "string",
      "maxLength": 100
    },
    "socialLinks": {
      "type": "json"
    },
    "offices": {
      "type": "json",
      "localized": true
    },
    "certificates": {
      "type": "json",
      "localized": true
    },
    "legalRepresentative": {
      "type": "string",
      "maxLength": 50
    },
    "registeredCapital": {
      "type": "string",
      "maxLength": 50
    },
    "unifiedSocialCreditCode": {
      "type": "string",
      "maxLength": 50
    },
    "businessScope": {
      "type": "text",
      "localized": true
    },
    "mainEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity",
      "inversedBy": "brandInfos"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 3: 扩展 first-truth-policy/schema.json（claimCategory 枚举增加 logistics_promise）**

Modify `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`，在 `claimCategory` 枚举中追加 `"logistics_promise"`：

将 `claimCategory` 属性修改为：

```json
    "claimCategory": {
      "type": "enumeration",
      "enum": [
        "business_license",
        "brand_claim",
        "technical_spec",
        "certification",
        "financial",
        "logistics_promise",
        "other"
      ],
      "default": "brand_claim"
    },
```

修改后的完整文件确认如下：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_first_truths",
  "info": {
    "singularName": "first-truth-policy",
    "pluralName": "first-truth-policies",
    "displayName": "第一真值策略声明"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_first_truths"
    },
    "claim": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "claimKey": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "claimCategory": {
      "type": "enumeration",
      "enum": [
        "business_license",
        "brand_claim",
        "technical_spec",
        "certification",
        "financial",
        "logistics_promise",
        "other"
      ],
      "default": "brand_claim"
    },
    "canonicalEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity",
      "inversedBy": "firstTruthPolicies"
    },
    "canonicalValue": {
      "type": "text",
      "required": true
    },
    "canonicalValueType": {
      "type": "enumeration",
      "enum": ["text", "number", "date", "url", "json"],
      "default": "text"
    },
    "canonicalSourceUrl": {
      "type": "string",
      "maxLength": 500
    },
    "canonicalSourceType": {
      "type": "enumeration",
      "enum": ["government", "official_site", "third_party_verified", "internal"],
      "default": "official_site"
    },
    "conflictResolution": {
      "type": "enumeration",
      "enum": ["latest", "earliest", "highest_confidence", "manual"],
      "default": "manual"
    },
    "lastVerifiedAt": {
      "type": "datetime",
      "required": true
    },
    "verificationStatus": {
      "type": "enumeration",
      "enum": ["verified", "pending", "outdated", "conflict"],
      "default": "verified"
    },
    "conflictDetails": {
      "type": "json"
    },
    "priority": {
      "type": "integer",
      "default": 100
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/lead/schema.json plugins/zhao-website/server/src/content-types/brand-info/schema.json plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json
git commit -m "feat(zhao-website): 扩展 lead/brand-info/first-truth-policy（物流获客成交字段）"
```

---

## Task 3：创建 8 个基础 CRUD Services + 更新 services/index.ts

**Files:**
- Create: `plugins/zhao-logistics/server/src/services/review.ts`
- Create: `plugins/zhao-logistics/server/src/services/subscription.ts`
- Create: `plugins/zhao-logistics/server/src/services/landing-page.ts`
- Create: `plugins/zhao-logistics/server/src/services/conversion-funnel.ts`
- Create: `plugins/zhao-logistics/server/src/services/conversion-event.ts`
- Create: `plugins/zhao-logistics/server/src/services/intent-order.ts`
- Create: `plugins/zhao-logistics/server/src/services/referral.ts`
- Create: `plugins/zhao-logistics/server/src/services/customer-profile.ts`
- Modify: `plugins/zhao-logistics/server/src/services/index.ts`

> **CRUD 模式说明**（与 Plan 1 一致）：
> - `findAdmin(siteId, query)` — 后台列表查询（含分页/筛选/排序）
> - `findOneAdmin(siteId, documentId)` — 后台查单条
> - `createAdmin(siteId, data)` — 后台创建
> - `updateAdmin(siteId, documentId, data)` — 后台更新
> - `deleteAdmin(siteId, documentId)` — 后台软删（deletedAt 填充）
>
> 查询使用 `strapi.db.query(uid)` + 纯对象 populate 格式。

- [ ] **Step 1: 创建 review service**

Create `plugins/zhao-logistics/server/src/services/review.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.review";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, testimonialType, isFeatured, authorCountry, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (testimonialType) filters.testimonialType = testimonialType;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    if (authorCountry) filters.authorCountry = authorCountry;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { videoPoster: true, images: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { videoPoster: true, images: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户评价不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户评价不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 2: 创建 subscription service**

Create `plugins/zhao-logistics/server/src/services/subscription.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.subscription";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, subscriberType, channel, isActive, trackingNo, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (subscriberType) filters.subscriberType = subscriberType;
    if (channel) filters.channel = channel;
    if (isActive !== undefined) filters.isActive = isActive === "true" || isActive === true;
    if (trackingNo) filters.trackingNo = trackingNo;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("订阅不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("订阅不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 3: 创建 landing-page service**

Create `plugins/zhao-logistics/server/src/services/landing-page.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.landing-page";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, campaignName, isActive, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (campaignName) filters.campaignName = { $containsi: campaignName };
    if (isActive !== undefined) filters.isActive = isActive === "true" || isActive === true;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { ogImage: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { ogImage: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("落地页不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("落地页不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 4: 创建 conversion-funnel service**

Create `plugins/zhao-logistics/server/src/services/conversion-funnel.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.conversion-funnel";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, isActive, lang, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (isActive !== undefined) filters.isActive = isActive === "true" || isActive === true;
    if (lang) filters.lang = lang;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("转化漏斗不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("转化漏斗不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 5: 创建 conversion-event service**

Create `plugins/zhao-logistics/server/src/services/conversion-event.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.conversion-event";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, funnel, eventName, visitorId, sort = "occurredAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (funnel) filters.funnel = funnel;
    if (eventName) filters.eventName = eventName;
    if (visitorId) filters.visitorId = visitorId;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { funnel: true, user: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { funnel: true, user: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("转化事件不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("转化事件不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 6: 创建 intent-order service**

Create `plugins/zhao-logistics/server/src/services/intent-order.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.intent-order";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, customerName, assignedTo, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (customerName) filters.customerName = { $containsi: customerName };
    if (assignedTo) filters.assignedTo = assignedTo;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { assignedTo: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { assignedTo: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    // 自动生成意向单号
    if (!data.orderNo) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = await strapi.db.query(UID).count({ where: { site: siteId } });
      data.orderNo = `IO${dateStr}${String(count + 1).padStart(3, "0")}`;
    }
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("意向订单不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("意向订单不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 7: 创建 referral service**

Create `plugins/zhao-logistics/server/src/services/referral.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.referral";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, referralCode, referralChannel, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (referralCode) filters.referralCode = { $containsi: referralCode };
    if (referralChannel) filters.referralChannel = referralChannel;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
  },

  async createAdmin(siteId: number, data: any) {
    // 校验推荐码唯一性（per site）
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, referralCode: data.referralCode, deletedAt: null },
    });
    if (existing) throw new Error(`推荐码 ${data.referralCode} 已存在`);
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("推荐记录不存在或已删除");
    // 若修改 referralCode，校验唯一性
    if (data.referralCode && data.referralCode !== existing.referralCode) {
      const dup = await strapi.db.query(UID).findOne({
        where: { site: siteId, referralCode: data.referralCode, deletedAt: null },
      });
      if (dup) throw new Error(`推荐码 ${data.referralCode} 已存在`);
    }
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("推荐记录不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 8: 创建 customer-profile service**

Create `plugins/zhao-logistics/server/src/services/customer-profile.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.customer-profile";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, customerType, lifecycleStage, country, name, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (customerType) filters.customerType = customerType;
    if (lifecycleStage) filters.lifecycleStage = lifecycleStage;
    if (country) filters.country = country;
    if (name) filters.name = { $containsi: name };

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { assignedTo: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { assignedTo: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 9: 更新 services/index.ts（追加 8 个新 service）**

Modify `plugins/zhao-logistics/server/src/services/index.ts`:

```typescript
import quoteRequest from "./quote-request";
import quoteFieldRule from "./quote-field-rule";
import quotePriceRule from "./quote-price-rule";
import quotePriceFormula from "./quote-price-formula";
import trackingShipment from "./tracking-shipment";
import trackingNode from "./tracking-node";
import trackingProvider from "./tracking-provider";
import contactMatrix from "./contact-matrix";
import review from "./review";
import subscription from "./subscription";
import landingPage from "./landing-page";
import conversionFunnel from "./conversion-funnel";
import conversionEvent from "./conversion-event";
import intentOrder from "./intent-order";
import referral from "./referral";
import customerProfile from "./customer-profile";

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "review": review,
  "subscription": subscription,
  "landing-page": landingPage,
  "conversion-funnel": conversionFunnel,
  "conversion-event": conversionEvent,
  "intent-order": intentOrder,
  "referral": referral,
  "customer-profile": customerProfile,
};
```

- [ ] **Step 10: Commit**

```bash
git add plugins/zhao-logistics/server/src/services/
git commit -m "feat(zhao-logistics): 8 个获客成交 CT 的基础 CRUD service"
```

---

## Task 4：创建 Admin API Controllers + Routes（复用 Plan 1 工厂模式）

**Files:**
- Modify: `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`
- Modify: `plugins/zhao-logistics/server/src/routes/admin-api.ts`

> **复用说明**：Plan 1 已创建 `controllers/admin-api/generic.ts`（createGenericController 工厂）和 `routes/admin-api.ts`（createCrudRoutes 工厂）。本 Task 仅在 index.ts / admin-api.ts 中追加 8 个新 CT 的注册，不修改工厂代码。

- [ ] **Step 1: 更新 controllers/admin-api/index.ts（追加 8 个新 controller）**

Modify `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`:

```typescript
import createGeneric from "./generic";

const quoteRequest = createGeneric("quote-request");
const quoteFieldRule = createGeneric("quote-field-rule");
const quotePriceRule = createGeneric("quote-price-rule");
const quotePriceFormula = createGeneric("quote-price-formula");
const trackingShipment = createGeneric("tracking-shipment");
const trackingNode = createGeneric("tracking-node");
const trackingProvider = createGeneric("tracking-provider");
const contactMatrix = createGeneric("contact-matrix");
const review = createGeneric("review");
const subscription = createGeneric("subscription");
const landingPage = createGeneric("landing-page");
const conversionFunnel = createGeneric("conversion-funnel");
const conversionEvent = createGeneric("conversion-event");
const intentOrder = createGeneric("intent-order");
const referral = createGeneric("referral");
const customerProfile = createGeneric("customer-profile");

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "review": review,
  "subscription": subscription,
  "landing-page": landingPage,
  "conversion-funnel": conversionFunnel,
  "conversion-event": conversionEvent,
  "intent-order": intentOrder,
  "referral": referral,
  "customer-profile": customerProfile,
};
```

- [ ] **Step 2: 更新 routes/admin-api.ts（追加 8 组新路由 = 40 端点）**

Modify `plugins/zhao-logistics/server/src/routes/admin-api.ts`:

```typescript
import type { Core } from "@strapi/strapi";

/**
 * 为指定 CT 生成标准 CRUD 路由
 * 路径前缀：/api/zhao-logistics/v1/admin/{ct-plural}
 */
const createCrudRoutes = (ctName: string, pluralName: string) => [
  {
    method: "GET",
    path: `/v1/admin/${pluralName}`,
    handler: `${ctName}.find`,
    config: {
      // policies: Plan 4 添加权限校验
    },
  },
  {
    method: "GET",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.findOne`,
    config: {},
  },
  {
    method: "POST",
    path: `/v1/admin/${pluralName}`,
    handler: `${ctName}.create`,
    config: {},
  },
  {
    method: "PUT",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.update`,
    config: {},
  },
  {
    method: "DELETE",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.delete`,
    config: {},
  },
];

const routes: Core.Route[] = [
  // Plan 1 核心 CT（8 CT × 5 = 40 端点）
  ...createCrudRoutes("quote-request", "quote-requests"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments"),
  ...createCrudRoutes("tracking-node", "tracking-nodes"),
  ...createCrudRoutes("tracking-provider", "tracking-providers"),
  ...createCrudRoutes("contact-matrix", "contact-matrices"),
  // Plan 3 获客成交 CT（8 CT × 5 = 40 端点）
  ...createCrudRoutes("review", "reviews"),
  ...createCrudRoutes("subscription", "subscriptions"),
  ...createCrudRoutes("landing-page", "landing-pages"),
  ...createCrudRoutes("conversion-funnel", "conversion-funnels"),
  ...createCrudRoutes("conversion-event", "conversion-events"),
  ...createCrudRoutes("intent-order", "intent-orders"),
  ...createCrudRoutes("referral", "referrals"),
  ...createCrudRoutes("customer-profile", "customer-profiles"),
];

export default routes;
```

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-logistics/server/src/controllers/admin-api/index.ts plugins/zhao-logistics/server/src/routes/admin-api.ts
git commit -m "feat(zhao-logistics): Admin API 追加 8 个获客成交 CT 路由（40 端点）"
```

---

## Task 5：migration 脚本 + permissions.ts 更新

**Files:**
- Create: `plugins/zhao-logistics/server/database/migrations/002_add_conversion_indexes.js`
- Modify: `plugins/zhao-logistics/server/src/config/permissions.ts`

- [ ] **Step 1: 创建 002 迁移脚本（获客成交 CT 索引）**

Create `plugins/zhao-logistics/server/database/migrations/002_add_conversion_indexes.js`:

```javascript
'use strict';

module.exports = {
  async up({ db }) {
    // referrals: (site_id, referral_code) UNIQUE — 推荐码唯一约束
    await db.schema.alterTable('zhao_logistics_referrals', (table) => {
      table.unique(['site_id', 'referral_code']);
    });

    // conversion_events: (site_id, funnel_id, occurred_at) — 漏斗事件时间线查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_events_funnel_time
      ON zhao_logistics_conversion_events (site_id, funnel_id, occurred_at)
      WHERE deleted_at IS NULL`);

    // conversion_events: (site_id, visitor_id, occurred_at) — 访客行为路径查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_events_visitor_time
      ON zhao_logistics_conversion_events (site_id, visitor_id, occurred_at)
      WHERE deleted_at IS NULL`);

    // customer_profiles: (site_id, contact_phone) — 按电话查询客户档案
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_customer_profiles_phone
      ON zhao_logistics_customer_profiles (site_id, contact_phone)
      WHERE deleted_at IS NULL`);

    // landing_pages: (site_id, slug) — 按 slug 查询落地页
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_landing_pages_slug
      ON zhao_logistics_landing_pages (site_id, slug)
      WHERE deleted_at IS NULL`);

    // intent_orders: (site_id, status, created_at) — 按状态查询意向单
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_intent_orders_status
      ON zhao_logistics_intent_orders (site_id, status, created_at)
      WHERE deleted_at IS NULL`);

    // reviews: (site_id, status, is_featured) — 精选评价查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_reviews_featured
      ON zhao_logistics_reviews (site_id, status, is_featured)
      WHERE deleted_at IS NULL`);

    // subscriptions: (site_id, channel_target, subscriber_type) — 订阅目标查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_subscriptions_target
      ON zhao_logistics_subscriptions (site_id, channel_target, subscriber_type)
      WHERE deleted_at IS NULL`);

    // conversion_funnels: (site_id, is_active) — 活跃漏斗查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_funnels_active
      ON zhao_logistics_conversion_funnels (site_id, is_active)
      WHERE deleted_at IS NULL`);
  },

  async down({ db }) {
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_funnel_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_visitor_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_customer_profiles_phone`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_landing_pages_slug`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_intent_orders_status`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_reviews_featured`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_subscriptions_target`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_funnels_active`);
    await db.schema.alterTable('zhao_logistics_referrals', (table) => {
      table.dropUnique(['site_id', 'referral_code']);
    });
  },
};
```

> 注：`conversion_events.funnel_id` 是 Strapi 为 conversion-event 的 `funnel` 关系字段生成的数据库列名（field name `funnel` → snake_case `funnel` + `_id` → `funnel_id`）。

- [ ] **Step 2: 更新 permissions.ts（追加 8 个新 CT 权限）**

Modify `plugins/zhao-logistics/server/src/config/permissions.ts`:

```typescript
/**
 * zhao-logistics 权限定义
 * 命名规范：zhao-logistics.{ct}.{action}
 * action: read / create / update / delete / publish
 */
export const PERMISSIONS = {
  // Plan 1 核心 CT
  "quote-request": {
    actions: ["read", "create", "update", "delete"],
    displayName: "询价单",
  },
  "quote-field-rule": {
    actions: ["read", "create", "update", "delete"],
    displayName: "询价动态字段规则",
  },
  "quote-price-rule": {
    actions: ["read", "create", "update", "delete"],
    displayName: "报价规则表",
  },
  "quote-price-formula": {
    actions: ["read", "create", "update", "delete"],
    displayName: "报价公式模板",
  },
  "tracking-shipment": {
    actions: ["read", "create", "update", "delete"],
    displayName: "货物追踪主表",
  },
  "tracking-node": {
    actions: ["read", "create", "update", "delete"],
    displayName: "追踪节点",
  },
  "tracking-provider": {
    actions: ["read", "create", "update", "delete"],
    displayName: "追踪 API 配置",
  },
  "contact-matrix": {
    actions: ["read", "create", "update", "delete"],
    displayName: "联系渠道矩阵",
  },
  // Plan 3 获客成交 CT
  "review": {
    actions: ["read", "create", "update", "delete"],
    displayName: "客户评价",
  },
  "subscription": {
    actions: ["read", "create", "update", "delete"],
    displayName: "通知订阅",
  },
  "landing-page": {
    actions: ["read", "create", "update", "delete"],
    displayName: "营销落地页",
  },
  "conversion-funnel": {
    actions: ["read", "create", "update", "delete"],
    displayName: "转化漏斗",
  },
  "conversion-event": {
    actions: ["read", "create", "update", "delete"],
    displayName: "转化事件",
  },
  "intent-order": {
    actions: ["read", "create", "update", "delete"],
    displayName: "意向订单",
  },
  "referral": {
    actions: ["read", "create", "update", "delete"],
    displayName: "推荐奖励",
  },
  "customer-profile": {
    actions: ["read", "create", "update", "delete"],
    displayName: "客户档案",
  },
} as const;

/**
 * 系统角色权限映射
 * super-admin: 全部权限（Strapi 自动）
 * admin: 除 tracking-provider.create/update/delete 外的全部（API Key 安全）
 * editor: 内容管理权限（评价/落地页/意向单/推荐等）
 * viewer: 全部 .read
 */
export const ROLE_PERMISSIONS = {
  admin: {
    // Plan 1 核心 CT
    "quote-request": ["read", "create", "update", "delete"],
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "quote-price-formula": ["read", "create", "update", "delete"],
    "tracking-shipment": ["read", "create", "update", "delete"],
    "tracking-node": ["read", "create", "update", "delete"],
    "tracking-provider": ["read"],
    "contact-matrix": ["read", "create", "update", "delete"],
    // Plan 3 获客成交 CT
    "review": ["read", "create", "update", "delete"],
    "subscription": ["read", "create", "update", "delete"],
    "landing-page": ["read", "create", "update", "delete"],
    "conversion-funnel": ["read", "create", "update", "delete"],
    "conversion-event": ["read", "create", "update", "delete"],
    "intent-order": ["read", "create", "update", "delete"],
    "referral": ["read", "create", "update", "delete"],
    "customer-profile": ["read", "create", "update", "delete"],
  },
  editor: {
    // Plan 1 核心 CT
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "contact-matrix": ["read", "create", "update", "delete"],
    // Plan 3 获客成交 CT
    "review": ["read", "create", "update", "delete"],
    "landing-page": ["read", "create", "update", "delete"],
    "intent-order": ["read", "create", "update", "delete"],
    "referral": ["read", "create", "update", "delete"],
    "subscription": ["read"],
    "conversion-funnel": ["read"],
    "conversion-event": ["read"],
    "customer-profile": ["read"],
  },
  viewer: {
    // Plan 1 核心 CT
    "quote-request": ["read"],
    "quote-field-rule": ["read"],
    "quote-price-rule": ["read"],
    "quote-price-formula": ["read"],
    "tracking-shipment": ["read"],
    "tracking-node": ["read"],
    "tracking-provider": ["read"],
    "contact-matrix": ["read"],
    // Plan 3 获客成交 CT
    "review": ["read"],
    "subscription": ["read"],
    "landing-page": ["read"],
    "conversion-funnel": ["read"],
    "conversion-event": ["read"],
    "intent-order": ["read"],
    "referral": ["read"],
    "customer-profile": ["read"],
  },
} as const;

/**
 * 生成权限标识符
 */
export function buildPermissionId(ct: string, action: string): string {
  return `zhao-logistics.${ct}.${action}`;
}

/**
 * 获取所有权限标识符列表
 */
export function getAllPermissionIds(): string[] {
  const ids: string[] = [];
  for (const [ct, config] of Object.entries(PERMISSIONS)) {
    for (const action of config.actions) {
      ids.push(buildPermissionId(ct, action));
    }
  }
  return ids;
}
```

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-logistics/server/database/migrations/002_add_conversion_indexes.js plugins/zhao-logistics/server/src/config/permissions.ts
git commit -m "feat(zhao-logistics): 获客成交 CT 迁移脚本（索引+UNIQUE）+ 权限定义更新（16 CT × 4 操作 = 64 权限）"
```

---

## Task 6：最终构建 + 提交

**Files:**
- 无新建文件

- [ ] **Step 1: TypeScript 类型检查**

Run: `cd plugins/zhao-logistics && npm run test:ts:back`

Expected: 无类型错误

- [ ] **Step 2: 构建插件**

Run: `cd plugins/zhao-logistics && npm run build`

Expected: `dist/server/index.js` 生成，无 TS 编译错误

- [ ] **Step 3: 启动 Strapi 验证表创建**

Run: `cd e:\code\basic && npm run develop`

Expected: 控制台输出
- `[zhao-logistics] Initializing...`
- `[zhao-logistics] 64 permissions defined`
- `[zhao-logistics] Ready`
- 无插件加载错误

- [ ] **Step 4: 验证数据库表创建**

Run: `psql -U postgres -d strapi_db -c "\dt zhao_logistics_*"`

Expected: 返回 16 个表（Plan 1 的 8 个 + Plan 3 的 8 个新增）

Plan 3 新增 8 个表：
```
zhao_logistics_conversion_events
zhao_logistics_conversion_funnels
zhao_logistics_customer_profiles
zhao_logistics_intent_orders
zhao_logistics_landing_pages
zhao_logistics_referrals
zhao_logistics_reviews
zhao_logistics_subscriptions
```

- [ ] **Step 5: 验证迁移记录**

Run: `psql -U postgres -d strapi_db -c "SELECT plugin, version, name FROM zhao_schema_migrations WHERE plugin='zhao-logistics';"`

Expected: 返回 2 条记录
```
plugin         | version | name
zhao-logistics | 001     | add_composite_indexes
zhao-logistics | 002     | add_conversion_indexes
```

- [ ] **Step 6: 验证索引创建**

Run: `psql -U postgres -d strapi_db -c "\di idx_logistics_*"`

Expected: 返回 Plan 1 的 4 个索引 + Plan 3 的 8 个索引 = 12 个索引

Plan 3 新增索引：
```
idx_logistics_conversion_events_funnel_time
idx_logistics_conversion_events_visitor_time
idx_logistics_conversion_funnels_active
idx_logistics_customer_profiles_phone
idx_logistics_intent_orders_status
idx_logistics_landing_pages_slug
idx_logistics_reviews_featured
idx_logistics_subscriptions_target
```

- [ ] **Step 7: 验证 zhao-website 扩展字段**

Run:
```bash
psql -U postgres -d strapi_db -c "\d zhao_website_leads" | grep referral_code
psql -U postgres -d strapi_db -c "\d zhao_website_brand_infos" | grep -E "offices|certificates"
```

Expected: 可见 `referral_code`、`offices`、`certificates` 列

- [ ] **Step 8: 验证后台 CT 可见**

操作步骤：
1. 浏览器访问 `http://localhost:1337/admin`
2. 登录管理员账号
3. 左侧菜单点击「Content Manager」
4. 在 Collection Types 列表中查找 zhao-logistics 相关 CT

Expected: 可见 16 个 CT（Plan 1 的 8 个 + Plan 3 新增 8 个：客户评价/通知订阅/营销落地页/转化漏斗/转化事件/意向订单/推荐奖励/客户档案）

- [ ] **Step 9: 验证 referral UNIQUE 约束**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/referrals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "REF001",
    "referrerName": "推荐人A",
    "referrerContact": "phone:13800138000",
    "refereeName": "被推荐人B",
    "refereeContact": "phone:13900139000",
    "referralChannel": "friend",
    "rewardType": "cash"
  }'

curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/referrals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "REF001",
    "referrerName": "推荐人C",
    "referrerContact": "phone:13700137000",
    "refereeName": "被推荐人D",
    "refereeContact": "phone:13600136000",
    "referralChannel": "community",
    "rewardType": "discount"
  }'
```

Expected: 第一次返回 201 创建成功；第二次返回 400 错误 `"推荐码 REF001 已存在"`

- [ ] **Step 10: 验证 intent-order 自动生成单号**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/intent-orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteRequestId": "doc-xxx",
    "customerName": "测试客户",
    "customerContact": "phone:13800138000",
    "confirmedPrice": {"amount": 5000, "currency": "CNY"},
    "cargoSummary": {"weight": 100, "type": "普货"},
    "routeSummary": {"origin": "上海", "destination": "东京"}
  }'
```

Expected: 返回 `{data: {...}}`，包含自动生成的 `orderNo` 格式为 `IO20260709001`

- [ ] **Step 11: 最终提交（如有 dist 变更）**

```bash
git status
# 若 dist 有变更且未被 gitignore
# git add plugins/zhao-logistics/dist/
# git commit -m "build(zhao-logistics): Plan 3 编译 dist 产物"
```

---

## Plan 3 完成验收标准

- [ ] 8 个获客成交 CT schema.json 创建完成，字段完整匹配设计文档 3.2 节
- [ ] review/landing-page 开启 i18n（pluginOptions.i18n.localized: true）
- [ ] 每个新 CT 都有 site manyToOne 关系 + deletedAt 软删字段
- [ ] content-manager visible: true, content-type-builder visible: false
- [ ] content-types/index.ts 注册 16 个 CT（Plan 1 的 8 个 + Plan 3 的 8 个）
- [ ] zhao-website.lead 的 type 枚举增加 intent_order/referral，新增 referralCode 字段
- [ ] zhao-website.brand-info 新增 offices/certificates JSON 字段（localized）
- [ ] zhao-website.first-truth-policy 的 claimCategory 枚举增加 logistics_promise
- [ ] 8 个新 CT 的基础 CRUD Service 创建完成（findAdmin/findOneAdmin/createAdmin/updateAdmin/deleteAdmin）
- [ ] services/index.ts 注册 16 个 service
- [ ] intent-order 自动生成 orderNo（IO+日期+序号）
- [ ] referral 推荐码唯一性校验（per site）
- [ ] controllers/admin-api/index.ts 注册 16 个 controller（复用 createGenericController）
- [ ] routes/admin-api.ts 生成 80 个端点（16 CT × 5 操作）
- [ ] 002_add_conversion_indexes.js 迁移脚本创建 8 个索引 + 1 个 UNIQUE 约束
- [ ] permissions.ts 定义 16 CT × 4 操作 = 64 个权限，ROLE_PERMISSIONS 更新
- [ ] Strapi 启动无错误，16 个数据库表自动创建
- [ ] 8 个新 CT 在后台 Content Manager 可见
- [ ] referral UNIQUE 约束生效（重复推荐码报错）
- [ ] intent-order orderNo 自动生成
- [ ] TypeScript 类型检查通过
- [ ] 插件构建成功

---

## 后续 Plan 预告

- **Plan 4**：Admin API 特殊操作 + Content API + 4 集成点 + 权限完整实现 + 定时任务
  - Admin API 特殊操作：评价审核/回复、订阅退订、落地页发布/归档、意向单状态流转、推荐奖励发放、客户档案聚合
  - Content API：前台评价展示、落地页渲染、转化事件上报、推荐码查询
  - 4 集成点：quote-request ↔ intent-order 转化、intent-order ↔ tracking-shipment 关联、referral ↔ customer-profile 关联、conversion-event ↔ landing-page 归因
  - 权限完整实现：zhao-auth 权限同步 + 角色绑定 + policy 中间件
  - 定时任务：报价过期自动关闭、订阅清理、转化漏斗聚合统计
``"}