# zhao-logistics Plan 1：插件骨架 + 核心业务 CT + Migrations + 基础 CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 zhao-logistics 插件骨架，创建 8 个核心业务 Content Type，编写数据库迁移脚本，实现基础 Admin API CRUD，使插件可加载、CT 可创建/查询/更新/删除。

**Architecture:** 遵循 zhao-website 插件模式：package.json 声明插件元数据 + strapi-server.js 入口 + server/src 目录结构；CT schema 用独立 schema.json 文件 + content-types/index.ts 汇总；migration 脚本放在 server/database/migrations/，由 zhao-common 的 migration-runner 统一执行；Admin API 用 generic controller 工厂模式按 serviceName 动态分发。

**Tech Stack:** Strapi v5 + TypeScript + PostgreSQL + knex（migration）

**配套设计文档**：[2026-07-09-zhao-logistics-plugin-design.md](../specs/2026-07-09-zhao-logistics-plugin-design.md)

**配套验收文档**：[2026-07-09-zhao-logistics-acceptance-manual.md](../specs/2026-07-09-zhao-logistics-acceptance-manual.md)

---

## 文件结构

本 Plan 创建/修改的文件清单：

**新建文件（插件骨架）**：
- `plugins/zhao-logistics/package.json` — 插件元数据 + 依赖声明
- `plugins/zhao-logistics/strapi-server.js` — 入口指向 dist
- `plugins/zhao-logistics/tsconfig.json` — TypeScript 配置
- `plugins/zhao-logistics/tsconfig.server.json` — 服务端 TS 配置
- `plugins/zhao-logistics/server/src/index.ts` — 插件注册入口
- `plugins/zhao-logistics/server/src/register.ts` — register 钩子
- `plugins/zhao-logistics/server/src/bootstrap.ts` — bootstrap 钩子（权限同步）
- `plugins/zhao-logistics/server/src/config.ts` — 插件配置

**新建文件（8 个核心业务 CT）**：
- `plugins/zhao-logistics/server/src/content-types/index.ts` — CT 汇总
- `plugins/zhao-logistics/server/src/content-types/quote-request/schema.json`
- `plugins/zhao-logistics/server/src/content-types/quote-field-rule/schema.json`
- `plugins/zhao-logistics/server/src/content-types/quote-price-rule/schema.json`
- `plugins/zhao-logistics/server/src/content-types/quote-price-formula/schema.json`
- `plugins/zhao-logistics/server/src/content-types/tracking-shipment/schema.json`
- `plugins/zhao-logistics/server/src/content-types/tracking-node/schema.json`
- `plugins/zhao-logistics/server/src/content-types/tracking-provider/schema.json`
- `plugins/zhao-logistics/server/src/content-types/contact-matrix/schema.json`

**新建文件（Services — 基础 CRUD）**：
- `plugins/zhao-logistics/server/src/services/index.ts`
- `plugins/zhao-logistics/server/src/services/quote-request.ts` — 询价单 CRUD
- `plugins/zhao-logistics/server/src/services/quote-field-rule.ts` — 动态字段规则 CRUD
- `plugins/zhao-logistics/server/src/services/quote-price-rule.ts` — 报价规则 CRUD
- `plugins/zhao-logistics/server/src/services/quote-price-formula.ts` — 报价公式 CRUD
- `plugins/zhao-logistics/server/src/services/tracking-shipment.ts` — 运单 CRUD
- `plugins/zhao-logistics/server/src/services/tracking-node.ts` — 追踪节点 CRUD
- `plugins/zhao-logistics/server/src/services/tracking-provider.ts` — API 配置 CRUD
- `plugins/zhao-logistics/server/src/services/contact-matrix.ts` — 渠道矩阵 CRUD

**新建文件（Controllers — Admin API generic）**：
- `plugins/zhao-logistics/server/src/controllers/index.ts`
- `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`
- `plugins/zhao-logistics/server/src/controllers/admin-api/generic.ts` — 通用 CRUD 工厂

**新建文件（Routes）**：
- `plugins/zhao-logistics/server/src/routes/index.ts`
- `plugins/zhao-logistics/server/src/routes/admin-api.ts`

**新建文件（权限定义）**：
- `plugins/zhao-logistics/server/src/config/permissions.ts`

**新建文件（数据库迁移）**：
- `plugins/zhao-logistics/server/database/migrations/001_add_composite_indexes.js`（Strapi v5 自动建表，仅需索引+约束）

**新建文件（测试）**：
- `plugins/zhao-logistics/tests/jest.config.ts`
- `plugins/zhao-logistics/tests/tsconfig.json`
- `plugins/zhao-logistics/tests/ct-loading.test.ts`
- `plugins/zhao-logistics/tests/quote-request-crud.test.ts`
- `plugins/zhao-logistics/tests/tracking-shipment-crud.test.ts`

**修改文件**：
- `plugins/zhao-common/server/src/services/migration-runner.ts:7-21` — PLUGIN_ORDER 增加 zhao-logistics
- `package.json`（basic 根目录）— dependencies 增加 zhao-logistics workspace 引用（如需）

---

## Task 1：创建插件骨架文件

**Files:**
- Create: `plugins/zhao-logistics/package.json`
- Create: `plugins/zhao-logistics/strapi-server.js`
- Create: `plugins/zhao-logistics/tsconfig.json`
- Create: `plugins/zhao-logistics/tsconfig.server.json`
- Create: `plugins/zhao-logistics/server/src/index.ts`
- Create: `plugins/zhao-logistics/server/src/register.ts`
- Create: `plugins/zhao-logistics/server/src/config.ts`

- [ ] **Step 1: 创建 package.json**

Create `plugins/zhao-logistics/package.json`:

```json
{
  "name": "zhao-logistics",
  "version": "1.0.0",
  "description": "跨境物流获客成交系统插件 - 询价/报价/追踪/落地页/漏斗/推荐/客户档案",
  "private": true,
  "type": "commonjs",
  "exports": {
    "./package.json": "./package.json",
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify",
    "test": "jest --config tests/jest.config.ts",
    "test:ts:back": "tsc -p tsconfig.server.json"
  },
  "dependencies": {
    "expr-eval": "^2.0.2"
  },
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0"
  },
  "strapi": {
    "kind": "plugin",
    "name": "zhao-logistics",
    "displayName": "Zhao Logistics",
    "description": "跨境物流获客成交系统插件"
  },
  "license": "MIT"
}
```

> 注：expr-eval 用于 Plan 2 的报价引擎公式求值，本 Plan 暂不使用，但提前声明依赖。

- [ ] **Step 2: 创建 strapi-server.js**

Create `plugins/zhao-logistics/strapi-server.js`:

```javascript
'use strict';
module.exports = require('./dist/server/index.js');
```

- [ ] **Step 3: 创建 tsconfig.json**

Create `plugins/zhao-logistics/tsconfig.json`:

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/default",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "sourceMap": true,
    "declaration": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["server/src/**/*.ts", "admin/src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: 创建 tsconfig.server.json**

Create `plugins/zhao-logistics/tsconfig.server.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["server/src/**/*.ts"]
}
```

- [ ] **Step 5: 创建 register.ts**

Create `plugins/zhao-logistics/server/src/register.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  // 权限注册（在 Plan 4 详细实现，此处先占位）
};

export default register;
```

- [ ] **Step 6: 创建 config.ts**

Create `plugins/zhao-logistics/server/src/config.ts`:

```typescript
export default {
  default: {
    // 预留配置项
  },
  validator() {
    // 配置校验
  },
};
```

- [ ] **Step 7: 创建 index.ts（不含 bootstrap，下一步创建）**

Create `plugins/zhao-logistics/server/src/index.ts`:

```typescript
import register from "./register";
import bootstrap from "./bootstrap";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

export default {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
};
```

> 注：policies 字段在 Plan 4 权限实现时添加。index.ts 引用的各模块在后续 Task 中创建，此时会有 TS 错误，属正常。

- [ ] **Step 8: Commit**

```bash
git add plugins/zhao-logistics/package.json plugins/zhao-logistics/strapi-server.js plugins/zhao-logistics/tsconfig.json plugins/zhao-logistics/tsconfig.server.json plugins/zhao-logistics/server/src/index.ts plugins/zhao-logistics/server/src/register.ts plugins/zhao-logistics/server/src/config.ts
git commit -m "feat(zhao-logistics): 创建插件骨架文件（package.json/入口/配置）"
```

---

## Task 2：创建 8 个核心业务 CT 的 schema.json

**Files:**
- Create: `plugins/zhao-logistics/server/src/content-types/quote-request/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/quote-field-rule/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/quote-price-rule/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/quote-price-formula/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/tracking-shipment/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/tracking-node/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/tracking-provider/schema.json`
- Create: `plugins/zhao-logistics/server/src/content-types/contact-matrix/schema.json`

- [ ] **Step 1: 创建 quote-request/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/quote-request/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_requests",
  "info": {
    "singularName": "quote-request",
    "pluralName": "quote-requests",
    "displayName": "物流询价单"
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
      "inversedBy": "logistics_quote_requests"
    },
    "trackingNo": {
      "type": "string",
      "maxLength": 50
    },
    "routeId": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "origin": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "destination": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "cargoType": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "weight": {
      "type": "decimal",
      "required": true
    },
    "volume": {
      "type": "decimal"
    },
    "formData": {
      "type": "json",
      "required": true
    },
    "quotedPrice": {
      "type": "json"
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "submitted", "quoted", "accepted", "rejected", "expired"],
      "default": "submitted",
      "required": true
    },
    "leadId": {
      "type": "string"
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
      "maxLength": 10,
      "required": true
    },
    "remark": {
      "type": "text"
    },
    "expiresAt": {
      "type": "datetime"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 2: 创建 quote-field-rule/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/quote-field-rule/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_field_rules",
  "info": {
    "singularName": "quote-field-rule",
    "pluralName": "quote-field-rules",
    "displayName": "询价动态字段规则"
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
      "inversedBy": "logistics_quote_field_rules"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true,
      "localized": true
    },
    "routeId": {
      "type": "string",
      "maxLength": 50
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "customerType": {
      "type": "enumeration",
      "enum": ["individual", "business", "fba_seller"]
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "priority": {
      "type": "integer",
      "default": 0
    },
    "fields": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 3: 创建 quote-price-rule/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/quote-price-rule/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_price_rules",
  "info": {
    "singularName": "quote-price-rule",
    "pluralName": "quote-price-rules",
    "displayName": "报价规则表"
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
      "inversedBy": "logistics_quote_price_rules"
    },
    "routeId": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "minWeight": {
      "type": "decimal",
      "required": true
    },
    "maxWeight": {
      "type": "decimal",
      "required": true
    },
    "pricePerKg": {
      "type": "decimal",
      "required": true
    },
    "currency": {
      "type": "string",
      "maxLength": 10,
      "default": "CNY",
      "required": true
    },
    "volumetricFactor": {
      "type": "integer"
    },
    "minCharge": {
      "type": "decimal"
    },
    "surcharges": {
      "type": "json"
    },
    "formula": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-logistics.quote-price-formula",
      "inversedBy": "price_rules"
    },
    "effectiveFrom": {
      "type": "date",
      "required": true
    },
    "effectiveTo": {
      "type": "date"
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

- [ ] **Step 4: 创建 quote-price-formula/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/quote-price-formula/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_quote_price_formulas",
  "info": {
    "singularName": "quote-price-formula",
    "pluralName": "quote-price-formulas",
    "displayName": "报价公式模板"
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
      "inversedBy": "logistics_quote_price_formulas"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true,
      "localized": true
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "expression": {
      "type": "text",
      "required": true
    },
    "variables": {
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

- [ ] **Step 5: 创建 tracking-shipment/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/tracking-shipment/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_tracking_shipments",
  "info": {
    "singularName": "tracking-shipment",
    "pluralName": "tracking-shipments",
    "displayName": "货物追踪主表"
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
      "inversedBy": "logistics_tracking_shipments"
    },
    "trackingNo": {
      "type": "string",
      "maxLength": 50,
      "required": true
    },
    "orderId": {
      "type": "string",
      "maxLength": 50
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "in_transit", "customs", "hold", "delivered", "exception", "returned"],
      "default": "pending",
      "required": true
    },
    "origin": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "destination": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "serviceProvider": {
      "type": "string",
      "maxLength": 50
    },
    "eta": {
      "type": "datetime"
    },
    "actualDelivery": {
      "type": "datetime"
    },
    "customerName": {
      "type": "string",
      "maxLength": 100
    },
    "customerContact": {
      "type": "string",
      "maxLength": 200
    },
    "lastSyncAt": {
      "type": "datetime"
    },
    "syncProvider": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-logistics.tracking-provider",
      "inversedBy": "shipments"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 6: 创建 tracking-node/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/tracking-node/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_tracking_nodes",
  "info": {
    "singularName": "tracking-node",
    "pluralName": "tracking-nodes",
    "displayName": "追踪节点"
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
      "inversedBy": "logistics_tracking_nodes"
    },
    "shipment": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-logistics.tracking-shipment",
      "required": true,
      "inversedBy": "nodes"
    },
    "nodeStatus": {
      "type": "enumeration",
      "enum": ["done", "active", "pending", "alert"],
      "required": true
    },
    "nodeType": {
      "type": "enumeration",
      "enum": ["picked_up", "export", "import", "customs", "hold", "delivery", "delivered", "exception"],
      "required": true
    },
    "location": {
      "type": "string",
      "maxLength": 100
    },
    "eventTime": {
      "type": "datetime",
      "required": true
    },
    "description": {
      "type": "text",
      "required": true,
      "localized": true
    },
    "dataSource": {
      "type": "enumeration",
      "enum": ["internal", "external"],
      "default": "internal",
      "required": true
    },
    "providerRef": {
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

- [ ] **Step 7: 创建 tracking-provider/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/tracking-provider/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_tracking_providers",
  "info": {
    "singularName": "tracking-provider",
    "pluralName": "tracking-providers",
    "displayName": "追踪 API 配置"
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
      "inversedBy": "logistics_tracking_providers"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "providerType": {
      "type": "enumeration",
      "enum": ["17track", "afterShip", "kuaidi100", "custom_api"],
      "required": true
    },
    "apiKey": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "apiSecret": {
      "type": "string",
      "maxLength": 200
    },
    "endpoint": {
      "type": "string",
      "maxLength": 500
    },
    "isEnabled": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "rateLimit": {
      "type": "integer"
    },
    "supportedCarriers": {
      "type": "json"
    },
    "extraConfig": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 8: 创建 contact-matrix/schema.json**

Create `plugins/zhao-logistics/server/src/content-types/contact-matrix/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_logistics_contact_matrices",
  "info": {
    "singularName": "contact-matrix",
    "pluralName": "contact-matrices",
    "displayName": "联系渠道矩阵"
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
      "inversedBy": "logistics_contact_matrices"
    },
    "lang": {
      "type": "enumeration",
      "enum": ["cn", "jp", "kr", "vn"],
      "required": true
    },
    "flag": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "short": {
      "type": "string",
      "maxLength": 10,
      "required": true
    },
    "primary": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "channels": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "hotline": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "email": {
      "type": "email",
      "required": true
    },
    "callbackNote": {
      "type": "text",
      "localized": true
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

- [ ] **Step 9: 创建 content-types/index.ts**

Create `plugins/zhao-logistics/server/src/content-types/index.ts`:

```typescript
import quoteRequest from "./quote-request/schema.json";
import quoteFieldRule from "./quote-field-rule/schema.json";
import quotePriceRule from "./quote-price-rule/schema.json";
import quotePriceFormula from "./quote-price-formula/schema.json";
import trackingShipment from "./tracking-shipment/schema.json";
import trackingNode from "./tracking-node/schema.json";
import trackingProvider from "./tracking-provider/schema.json";
import contactMatrix from "./contact-matrix/schema.json";

export default {
  "quote-request": { schema: quoteRequest },
  "quote-field-rule": { schema: quoteFieldRule },
  "quote-price-rule": { schema: quotePriceRule },
  "quote-price-formula": { schema: quotePriceFormula },
  "tracking-shipment": { schema: trackingShipment },
  "tracking-node": { schema: trackingNode },
  "tracking-provider": { schema: trackingProvider },
  "contact-matrix": { schema: contactMatrix },
};
```

- [ ] **Step 10: Commit**

```bash
git add plugins/zhao-logistics/server/src/content-types/
git commit -m "feat(zhao-logistics): 创建 8 个核心业务 CT schema（询价/报价/追踪/渠道矩阵）"
```

---

## Task 3：创建数据库迁移脚本

**Files:**
- Create: `plugins/zhao-logistics/server/database/migrations/001_add_composite_indexes.js`
- Modify: `plugins/zhao-common/server/src/services/migration-runner.ts:7-21`

> **重要**：Strapi v5 在 bootstrap 之前会自动根据 schema.json 同步表结构（创建表/添加列）。migration 脚本不负责建表，只负责：
> 1. 创建 Strapi 不自动创建的索引（复合索引、UNIQUE 索引、部分索引）
> 2. 创建 Strapi 不自动创建的约束
> 3. 数据迁移（本 Plan 无数据迁移需求）

- [ ] **Step 1: 在 PLUGIN_ORDER 中添加 zhao-logistics**

Modify `plugins/zhao-common/server/src/services/migration-runner.ts` 第 7-21 行：

```typescript
const PLUGIN_ORDER = [
  "zhao-common",
  "zhao-tag",
  "zhao-oss",
  "zhao-channel",
  "zhao-auth",
  "zhao-course",
  "zhao-point",
  "zhao-quiz",
  "zhao-third",
  "zhao-wealth",
  "zhao-sso",
  "zhao-studio",
  "zhao-website",
  "zhao-logistics",
];
```

- [ ] **Step 2: 创建 001 迁移脚本（复合索引）**

Create `plugins/zhao-logistics/server/database/migrations/001_add_composite_indexes.js`:

```javascript
'use strict';

module.exports = {
  async up({ db }) {
    // tracking_shipments: (site_id, tracking_no) UNIQUE
    await db.schema.alterTable('zhao_logistics_tracking_shipments', (table) => {
      table.unique(['site_id', 'tracking_no']);
    });

    // referrals 预留（Plan 3 创建表后生效）
    // customer_profiles 预留（Plan 3 创建表后生效）
    // landing_pages 预留（Plan 3 创建表后生效）

    // quote_requests: (site_id, route_id, status, created_at) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_requests_site_route_status
      ON zhao_logistics_quote_requests (site_id, route_id, status, created_at)
      WHERE deleted_at IS NULL`);

    // tracking_nodes: (site_id, shipment_id, event_time) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_tracking_nodes_site_shipment_time
      ON zhao_logistics_tracking_nodes (site_id, shipment_id, event_time)
      WHERE deleted_at IS NULL`);

    // quote_price_rules: (site_id, route_id, service_provider, min_weight, max_weight) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_price_rules_match
      ON zhao_logistics_quote_price_rules (site_id, route_id, service_provider, min_weight, max_weight)
      WHERE deleted_at IS NULL AND is_active = true`);

    // quote_field_rules: (site_id, is_active, priority) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_field_rules_match
      ON zhao_logistics_quote_field_rules (site_id, is_active, priority DESC)
      WHERE deleted_at IS NULL`);
  },

  async down({ db }) {
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_requests_site_route_status`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_tracking_nodes_site_shipment_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_price_rules_match`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_field_rules_match`);
    await db.schema.alterTable('zhao_logistics_tracking_shipments', (table) => {
      table.dropUnique(['site_id', 'tracking_no']);
    });
  },
};
```

> 注：原设计文档中的 002_add_composite_indexes.js 合并到 001 中。因 Strapi 自动建表，无需单独的 create_core_tables.js。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-common/server/src/services/migration-runner.ts plugins/zhao-logistics/server/database/migrations/001_add_composite_indexes.js
git commit -m "feat(zhao-logistics): 添加迁移脚本 + PLUGIN_ORDER 注册（复合索引+UNIQUE 约束）"
```

---

## Task 4：创建权限定义 + bootstrap

**Files:**
- Create: `plugins/zhao-logistics/server/src/config/permissions.ts`
- Create: `plugins/zhao-logistics/server/src/bootstrap.ts`

- [ ] **Step 1: 创建权限定义文件**

Create `plugins/zhao-logistics/server/src/config/permissions.ts`:

```typescript
/**
 * zhao-logistics 权限定义
 * 命名规范：zhao-logistics.{ct}.{action}
 * action: read / create / update / delete / publish
 */
export const PERMISSIONS = {
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
} as const;

/**
 * 系统角色权限映射
 * super-admin: 全部权限（Strapi 自动）
 * admin: 除 tracking-provider.create/update/delete 外的全部（API Key 安全）
 * editor: 内容管理权限
 * viewer: 全部 .read
 */
export const ROLE_PERMISSIONS = {
  admin: {
    "quote-request": ["read", "create", "update", "delete"],
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "quote-price-formula": ["read", "create", "update", "delete"],
    "tracking-shipment": ["read", "create", "update", "delete"],
    "tracking-node": ["read", "create", "update", "delete"],
    "tracking-provider": ["read"], // admin 只读 tracking-provider
    "contact-matrix": ["read", "create", "update", "delete"],
  },
  editor: {
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "contact-matrix": ["read", "create", "update", "delete"],
  },
  viewer: {
    "quote-request": ["read"],
    "quote-field-rule": ["read"],
    "quote-price-rule": ["read"],
    "quote-price-formula": ["read"],
    "tracking-shipment": ["read"],
    "tracking-node": ["read"],
    "tracking-provider": ["read"],
    "contact-matrix": ["read"],
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

- [ ] **Step 2: 创建 bootstrap.ts**

Create `plugins/zhao-logistics/server/src/bootstrap.ts`:

```typescript
import type { Core } from "@strapi/strapi";
import { PERMISSIONS, ROLE_PERMISSIONS, buildPermissionId } from "./config/permissions";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-logistics] Initializing...");

  // 1. 同步权限到数据库（每次启动都同步，幂等）
  try {
    const authPlugin = strapi.plugin("zhao-auth");
    if (authPlugin?.service("permission-sync")) {
      // 注册权限到 zhao-auth 的权限注册表
      const allPerms = [];
      for (const [ct, config] of Object.entries(PERMISSIONS)) {
        for (const action of config.actions) {
          allPerms.push({
            id: buildPermissionId(ct, action),
            displayName: `${config.displayName} - ${action}`,
          });
        }
      }
      // 调用 zhao-auth 注册权限（具体 API 在 Plan 4 对接，此处先 log）
      if (!isTest) logger.info(`[zhao-logistics] ${allPerms.length} permissions defined`);
    }
  } catch (err) {
    logger.error("[zhao-logistics] Permission definition failed:", err);
  }

  // 2. 角色权限同步（具体实现在 Plan 4，此处占位）
  // 3. 定时任务注册（具体实现在 Plan 4，此处占位）

  if (!isTest) logger.info("[zhao-logistics] Ready");
};

export default bootstrap;
```

> 注：权限同步的完整实现（写入 zhao-auth 权限表 + 角色绑定）在 Plan 4 完成。本 Task 先定义权限常量，bootstrap 中占位。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-logistics/server/src/config/permissions.ts plugins/zhao-logistics/server/src/bootstrap.ts
git commit -m "feat(zhao-logistics): 权限定义（8 CT × 4 操作）+ bootstrap 骨架"
```

---

## Task 5：创建 Services（基础 CRUD）

**Files:**
- Create: `plugins/zhao-logistics/server/src/services/index.ts`
- Create: `plugins/zhao-logistics/server/src/services/quote-request.ts`
- Create: `plugins/zhao-logistics/server/src/services/quote-field-rule.ts`
- Create: `plugins/zhao-logistics/server/src/services/quote-price-rule.ts`
- Create: `plugins/zhao-logistics/server/src/services/quote-price-formula.ts`
- Create: `plugins/zhao-logistics/server/src/services/tracking-shipment.ts`
- Create: `plugins/zhao-logistics/server/src/services/tracking-node.ts`
- Create: `plugins/zhao-logistics/server/src/services/tracking-provider.ts`
- Create: `plugins/zhao-logistics/server/src/services/contact-matrix.ts`

> **CRUD 模式说明**：所有 service 遵循统一签名：
> - `findAdmin(siteId, query)` — 后台列表查询（含分页/筛选/排序）
> - `findOneAdmin(siteId, documentId)` — 后台查单条
> - `createAdmin(siteId, data)` — 后台创建
> - `updateAdmin(siteId, documentId, data)` — 后台更新
> - `deleteAdmin(siteId, documentId)` — 后台软删（deletedAt 填充）
>
> 查询使用 `strapi.db.query(uid)` + 纯对象 populate 格式（避免 Strapi v5 混合格式 bug）。

- [ ] **Step 1: 创建 quote-request service**

Create `plugins/zhao-logistics/server/src/services/quote-request.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.quote-request";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, routeId, customerName, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (routeId) filters.routeId = routeId;
    if (customerName) filters.customerName = { $containsi: customerName };

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
    // 生成询价单号
    if (!data.trackingNo) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = await strapi.db.query(UID).count({ where: { site: siteId } });
      data.trackingNo = `QR${dateStr}${String(count + 1).padStart(3, "0")}`;
    }
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId },
    });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("询价单不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data,
    });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("询价单不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 2: 创建 quote-field-rule service**

Create `plugins/zhao-logistics/server/src/services/quote-field-rule.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.quote-field-rule";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, isActive, routeId, serviceProvider, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (isActive !== undefined) filters.isActive = isActive === "true" || isActive === true;
    if (routeId) filters.routeId = routeId;
    if (serviceProvider) filters.serviceProvider = serviceProvider;

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
    if (!existing) throw new Error("字段规则不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("字段规则不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 3: 创建 quote-price-rule service**

Create `plugins/zhao-logistics/server/src/services/quote-price-rule.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.quote-price-rule";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, routeId, serviceProvider, isActive, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (routeId) filters.routeId = routeId;
    if (serviceProvider) filters.serviceProvider = serviceProvider;
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
        populate: { formula: true },
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
      populate: { formula: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("报价规则不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("报价规则不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 4: 创建 quote-price-formula service**

Create `plugins/zhao-logistics/server/src/services/quote-price-formula.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.quote-price-formula";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, isActive, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
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
    if (!existing) throw new Error("报价公式不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("报价公式不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 5: 创建 tracking-shipment service**

Create `plugins/zhao-logistics/server/src/services/tracking-shipment.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.tracking-shipment";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, trackingNo, customerName, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (trackingNo) filters.trackingNo = { $containsi: trackingNo };
    if (customerName) filters.customerName = { $containsi: customerName };

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { syncProvider: true },
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
      populate: { syncProvider: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    // 校验 trackingNo 唯一性
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null },
    });
    if (existing) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("运单不存在或已删除");
    // 若修改 trackingNo，校验唯一性
    if (data.trackingNo && data.trackingNo !== existing.trackingNo) {
      const dup = await strapi.db.query(UID).findOne({
        where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null },
      });
      if (dup) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    }
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("运单不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 6: 创建 tracking-node service**

Create `plugins/zhao-logistics/server/src/services/tracking-node.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.tracking-node";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, shipmentId, nodeStatus, dataSource, sort = "eventTime:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (shipmentId) filters.shipment = shipmentId;
    if (nodeStatus) filters.nodeStatus = nodeStatus;
    if (dataSource) filters.dataSource = dataSource;

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { shipment: true },
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
      populate: { shipment: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("追踪节点不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("追踪节点不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 7: 创建 tracking-provider service**

Create `plugins/zhao-logistics/server/src/services/tracking-provider.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.tracking-provider";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, providerType, isEnabled, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (providerType) filters.providerType = providerType;
    if (isEnabled !== undefined) filters.isEnabled = isEnabled === "true" || isEnabled === true;

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
    if (!existing) throw new Error("API 配置不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("API 配置不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 8: 创建 contact-matrix service**

Create `plugins/zhao-logistics/server/src/services/contact-matrix.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.contact-matrix";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, lang, isActive, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (lang) filters.lang = lang;
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
    if (!existing) throw new Error("渠道矩阵不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("渠道矩阵不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});
```

- [ ] **Step 9: 创建 services/index.ts**

Create `plugins/zhao-logistics/server/src/services/index.ts`:

```typescript
import quoteRequest from "./quote-request";
import quoteFieldRule from "./quote-field-rule";
import quotePriceRule from "./quote-price-rule";
import quotePriceFormula from "./quote-price-formula";
import trackingShipment from "./tracking-shipment";
import trackingNode from "./tracking-node";
import trackingProvider from "./tracking-provider";
import contactMatrix from "./contact-matrix";

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
};
```

- [ ] **Step 10: Commit**

```bash
git add plugins/zhao-logistics/server/src/services/
git commit -m "feat(zhao-logistics): 8 个核心 CT 的基础 CRUD service（findAdmin/findOneAdmin/createAdmin/updateAdmin/deleteAdmin）"
```

---

## Task 6：创建 Admin API Controllers + Routes

**Files:**
- Create: `plugins/zhao-logistics/server/src/controllers/index.ts`
- Create: `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`
- Create: `plugins/zhao-logistics/server/src/controllers/admin-api/generic.ts`
- Create: `plugins/zhao-logistics/server/src/routes/index.ts`
- Create: `plugins/zhao-logistics/server/src/routes/admin-api.ts`

- [ ] **Step 1: 创建 generic controller（通用 CRUD 工厂）**

Create `plugins/zhao-logistics/server/src/controllers/admin-api/generic.ts`:

```typescript
import type { Core } from "@strapi/strapi";

/**
 * 通用 CRUD 控制器工厂
 * 按 serviceName 动态分发到对应 service
 * 前置条件：site-resolver 中间件已设置 ctx.state.siteId
 */
const createGenericController = (serviceName: string) => ({
  async find(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      return ctx.badRequest("siteId 未设置");
    }
    ctx.body = await strapi.plugin("zhao-logistics").service(serviceName).findAdmin(siteId, ctx.query);
  },

  async findOne(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    const result = await strapi.plugin("zhao-logistics").service(serviceName).findOneAdmin(siteId, documentId);
    if (!result) return ctx.notFound("记录不存在");
    ctx.body = { data: result };
  },

  async create(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).createAdmin(siteId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },

  async update(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).updateAdmin(siteId, documentId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },

  async delete(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).deleteAdmin(siteId, documentId);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },
});

export default createGenericController;
```

- [ ] **Step 2: 创建 admin-api/index.ts（8 个 CT 各自 controller）**

Create `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`:

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

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
};
```

- [ ] **Step 3: 创建 controllers/index.ts**

Create `plugins/zhao-logistics/server/src/controllers/index.ts`:

```typescript
import adminApi from "./admin-api";

export default {
  ...adminApi,
};
```

- [ ] **Step 4: 创建 admin-api 路由**

Create `plugins/zhao-logistics/server/src/routes/admin-api.ts`:

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
  ...createCrudRoutes("quote-request", "quote-requests"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments"),
  ...createCrudRoutes("tracking-node", "tracking-nodes"),
  ...createCrudRoutes("tracking-provider", "tracking-providers"),
  ...createCrudRoutes("contact-matrix", "contact-matrices"),
];

export default routes;
```

- [ ] **Step 5: 创建 routes/index.ts**

Create `plugins/zhao-logistics/server/src/routes/index.ts`:

```typescript
import adminApi from "./admin-api";

export default {
  "admin-api": {
    type: "admin",
    routes: adminApi,
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-logistics/server/src/controllers/ plugins/zhao-logistics/server/src/routes/
git commit -m "feat(zhao-logistics): Admin API 通用 CRUD controller + 8 个 CT 路由（40 个端点）"
```

---

## Task 7：创建测试配置 + CT 加载测试

**Files:**
- Create: `plugins/zhao-logistics/tests/jest.config.ts`
- Create: `plugins/zhao-logistics/tests/tsconfig.json`
- Create: `plugins/zhao-logistics/tests/ct-loading.test.ts`

- [ ] **Step 1: 创建 jest 配置**

Create `plugins/zhao-logistics/tests/jest.config.ts`:

```typescript
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^@strapi/strapi$": "<rootDir>/node_modules/@strapi/strapi",
  },
  collectCoverageFrom: ["server/src/**/*.ts", "!server/src/index.ts"],
  coverageDirectory: "coverage",
};
```

- [ ] **Step 2: 创建测试 tsconfig**

Create `plugins/zhao-logistics/tests/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["jest", "node"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: 创建 CT 加载测试**

Create `plugins/zhao-logistics/tests/ct-loading.test.ts`:

```typescript
import contentTypes from "../server/src/content-types";

describe("zhao-logistics Content Types", () => {
  const expectedCTs = [
    "quote-request",
    "quote-field-rule",
    "quote-price-rule",
    "quote-price-formula",
    "tracking-shipment",
    "tracking-node",
    "tracking-provider",
    "contact-matrix",
  ];

  test("应注册 8 个核心业务 CT", () => {
    expect(Object.keys(contentTypes)).toHaveLength(8);
    expectedCTs.forEach((ct) => {
      expect(contentTypes).toHaveProperty(ct);
    });
  });

  test("每个 CT 都有 schema", () => {
    for (const ct of expectedCTs) {
      expect(contentTypes[ct].schema).toBeDefined();
      expect(contentTypes[ct].schema.kind).toBe("collectionType");
    }
  });

  test("每个 CT 都关联 site-config", () => {
    for (const ct of expectedCTs) {
      const siteAttr = contentTypes[ct].schema.attributes.site;
      expect(siteAttr).toBeDefined();
      expect(siteAttr.type).toBe("relation");
      expect(siteAttr.target).toBe("plugin::zhao-common.site-config");
      expect(siteAttr.required).toBe(true);
    }
  });

  test("每个 CT 都有 deletedAt 软删字段", () => {
    for (const ct of expectedCTs) {
      expect(contentTypes[ct].schema.attributes.deletedAt).toBeDefined();
      expect(contentTypes[ct].schema.attributes.deletedAt.type).toBe("datetime");
    }
  });

  test("tracking-shipment 有 trackingNo 必填字段", () => {
    const attr = contentTypes["tracking-shipment"].schema.attributes.trackingNo;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("string");
    expect(attr.required).toBe(true);
  });

  test("quote-request status 默认 submitted", () => {
    const attr = contentTypes["quote-request"].schema.attributes.status;
    expect(attr.default).toBe("submitted");
  });

  test("quote-field-rule 开启 i18n", () => {
    const pluginOptions = contentTypes["quote-field-rule"].schema.pluginOptions;
    expect(pluginOptions.i18n.localized).toBe(true);
  });

  test("quote-price-rule 关联 quote-price-formula", () => {
    const attr = contentTypes["quote-price-rule"].schema.attributes.formula;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.quote-price-formula");
  });

  test("tracking-node 关联 tracking-shipment", () => {
    const attr = contentTypes["tracking-node"].schema.attributes.shipment;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.tracking-shipment");
    expect(attr.required).toBe(true);
  });

  test("tracking-shipment 关联 tracking-provider", () => {
    const attr = contentTypes["tracking-shipment"].schema.attributes.syncProvider;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.tracking-provider");
  });
});
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd plugins/zhao-logistics && npm test`

Expected: 8 tests passed

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-logistics/tests/
git commit -m "test(zhao-logistics): CT 加载测试（8 个核心 CT schema 校验）"
```

---

## Task 8：插件加载冒烟测试（手动）

**Files:**
- 无新建文件，手动验证

- [ ] **Step 1: 安装依赖**

Run: `cd e:\code\basic && npm install`

Expected: zhao-logistics 被识别为 workspace 包，依赖安装成功

- [ ] **Step 2: 构建插件**

Run: `cd plugins/zhao-logistics && npm run build`

Expected: `dist/server/index.js` 生成，无 TS 编译错误

- [ ] **Step 3: 启动 Strapi**

Run: `cd e:\code\basic && npm run develop`

Expected: 控制台输出
- `[zhao-logistics] Initializing...`
- `[zhao-logistics] 32 permissions defined`
- `[zhao-logistics] Ready`
- 无插件加载错误

- [ ] **Step 4: 验证数据库表创建**

Run: `psql -U postgres -d strapi_db -c "\dt zhao_logistics_*"`

Expected: 返回 8 个表
```
zhao_logistics_contact_matrices
zhao_logistics_quote_field_rules
zhao_logistics_quote_price_formulas
zhao_logistics_quote_price_rules
zhao_logistics_quote_requests
zhao_logistics_tracking_nodes
zhao_logistics_tracking_providers
zhao_logistics_tracking_shipments
```

- [ ] **Step 5: 验证迁移记录**

Run: `psql -U postgres -d strapi_db -c "SELECT plugin, version, name FROM zhao_schema_migrations WHERE plugin='zhao-logistics';"`

Expected: 返回 1 条记录
```
plugin         | version | name
zhao-logistics | 001     | add_composite_indexes
```

- [ ] **Step 6: 验证索引创建**

Run:
```bash
psql -U postgres -d strapi_db -c "\di idx_logistics_*"
```

Expected: 返回 4 个索引
```
idx_logistics_quote_field_rules_match
idx_logistics_quote_price_rules_match
idx_logistics_quote_requests_site_route_status
idx_logistics_tracking_nodes_site_shipment_time
```

- [ ] **Step 7: 验证后台 CT 可见**

操作步骤：
1. 浏览器访问 `http://localhost:1337/admin`
2. 登录管理员账号
3. 左侧菜单点击「Content Manager」
4. 在 Collection Types 列表中查找 zhao-logistics 相关 CT

Expected: 可见 8 个 CT（物流询价单/询价动态字段规则/报价规则表/报价公式模板/货物追踪主表/追踪节点/追踪 API 配置/联系渠道矩阵）

- [ ] **Step 8: 验证 quote-request 创建**

操作步骤：
1. 在 Content Manager 点击「物流询价单」
2. 点击「Create new entry」
3. 填写字段：
   - site：选择一个 site-config
   - routeId：cn-jp
   - origin：上海
   - destination：东京
   - cargoType：普货
   - weight：50
   - formData：`{}`
   - customerName：测试客户
   - customerContact：`{"type":"phone","value":"13800138000"}`
   - lang：cn
4. 点击「Save」

Expected: 保存成功，trackingNo 自动生成为 `QR20260709001` 格式

- [ ] **Step 9: 验证 API 访问**

Run:
```bash
curl -H "Authorization: Bearer <admin-token>" "http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests?pagination[page]=1&pagination[pageSize]=10"
```

Expected: 返回 JSON，包含上一步创建的询价单

- [ ] **Step 10: Commit 冒烟测试记录（如有配置调整）**

```bash
# 如有配置调整，提交；否则跳过
git status
# git add ... && git commit -m "fix(zhao-logistics): 冒烟测试配置调整"
```

---

## Task 9：quote-request CRUD 集成测试（手动 curl）

**Files:**
- 无新建文件，手动 curl 验证

- [ ] **Step 1: 获取 admin token**

Run:
```bash
curl -X POST http://localhost:1337/admin/login -H "Content-Type: application/json" -d '{"email":"admin@joho.cn","password":"Admin@2026"}'
```

Expected: 返回 `{"data":{"token":"..."}}`，记录 token

- [ ] **Step 2: 创建 quote-request**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "cn-jp",
    "origin": "上海",
    "destination": "东京",
    "cargoType": "普货",
    "weight": 50,
    "volume": 0.1,
    "formData": {"iossNumber": "IM1234567890"},
    "customerName": "测试客户",
    "customerContact": "{\"type\":\"phone\",\"value\":\"13800138000\"}",
    "lang": "cn"
  }'
```

Expected: 返回 `{data: {...}}`，包含自动生成的 trackingNo

- [ ] **Step 3: 查询列表**

Run:
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests?pagination[page]=1&pagination[pageSize]=10"
```

Expected: 返回 `{data: [...], pagination: {total: 1}}`

- [ ] **Step 4: 查询单条**

Run:
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests/<documentId>"
```

Expected: 返回 `{data: {...}}`

- [ ] **Step 5: 更新**

Run:
```bash
curl -X PUT http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests/<documentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "quoted", "quotedPrice": {"minPrice": 1750, "maxPrice": 1750, "currency": "CNY"}}'
```

Expected: 返回更新后的记录，status=quoted

- [ ] **Step 6: 删除（软删）**

Run:
```bash
curl -X DELETE http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests/<documentId> \
  -H "Authorization: Bearer <token>"
```

Expected: 返回 `{data: {...}}`，deletedAt 已填充

- [ ] **Step 7: 验证软删后查询不到**

Run:
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests?pagination[page]=1&pagination[pageSize]=10"
```

Expected: `pagination.total: 0`

---

## Task 10：tracking-shipment CRUD + 唯一性校验测试（手动 curl）

**Files:**
- 无新建文件，手动 curl 验证

- [ ] **Step 1: 创建 tracking-shipment**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/tracking-shipments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNo": "SF1234567890",
    "origin": "上海",
    "destination": "东京",
    "customerName": "测试客户",
    "customerContact": "{\"type\":\"phone\",\"value\":\"13800138000\"}"
  }'
```

Expected: 返回 `{data: {...}}`

- [ ] **Step 2: 验证唯一性校验（重复 trackingNo）**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/tracking-shipments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNo": "SF1234567890",
    "origin": "上海",
    "destination": "东京"
  }'
```

Expected: 返回 400 错误，`"运单号 SF1234567890 已存在"`

- [ ] **Step 3: 创建 tracking-node（关联 shipment）**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-logistics/v1/admin/tracking-nodes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment": "<shipment-documentId>",
    "nodeStatus": "done",
    "nodeType": "picked_up",
    "location": "上海浦东仓库",
    "eventTime": "2026-07-09T10:00:00.000Z",
    "description": "货物已揽收",
    "dataSource": "internal"
  }'
```

Expected: 返回 `{data: {...}}`

- [ ] **Step 4: 查询 tracking-nodes 按 shipment 过滤**

Run:
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:1337/api/zhao-logistics/v1/admin/tracking-nodes?shipmentId=<shipment-documentId>&pagination[page]=1&pagination[pageSize]=10"
```

Expected: 返回上一步创建的节点

---

## Task 11：最终构建 + 提交

**Files:**
- 无新建文件

- [ ] **Step 1: TypeScript 类型检查**

Run: `cd plugins/zhao-logistics && npm run test:ts:back`

Expected: 无类型错误

- [ ] **Step 2: 运行所有测试**

Run: `cd plugins/zhao-logistics && npm test`

Expected: 全部测试通过

- [ ] **Step 3: 构建插件**

Run: `cd plugins/zhao-logistics && npm run build`

Expected: `dist/server/index.js` 生成

- [ ] **Step 4: 验证 dist 产物**

Run: `ls plugins/zhao-logistics/dist/server/`

Expected: 可见 `index.js` 和 `index.mjs`

- [ ] **Step 5: 最终提交（如 dist 未被 gitignore）**

检查 .gitignore：
```bash
cat plugins/zhao-logistics/.gitignore 2>/dev/null || echo "无 .gitignore"
```

若 dist 未被忽略，提交 dist：
```bash
git add plugins/zhao-logistics/dist/
git commit -m "build(zhao-logistics): 编译 dist 产物"
```

- [ ] **Step 6: 推送（可选）**

```bash
git push origin main
```

---

## Plan 1 完成验收标准

- [ ] 插件可加载，Strapi 启动无错误
- [ ] 8 个核心业务 CT 在后台 Content Manager 可见
- [ ] 8 个数据库表自动创建
- [ ] 迁移脚本执行，4 个索引 + 1 个 UNIQUE 约束创建
- [ ] Admin API 40 个端点（8 CT × 5 操作）可访问
- [ ] quote-request CRUD 完整（创建/查询/更新/删除/软删）
- [ ] tracking-shipment 唯一性校验生效
- [ ] tracking-node 可关联 tracking-shipment
- [ ] quote-request.trackingNo 自动生成（QR+日期+序号）
- [ ] 软删后查询不到（deletedAt 过滤生效）
- [ ] 租户隔离（siteId 过滤生效）
- [ ] CT 加载单元测试通过（8 个测试）

---

## 后续 Plan 预告

- **Plan 2**：6 个 Services 实现（quote-engine 报价引擎 / tracking-aggregator 追踪聚合 / dynamic-form 动态表单 / funnel-tracker 漏斗追踪 / referral-engine 推荐引擎 / customer-aggregator 客户档案聚合）
- **Plan 3**：7 获客成交 CT + 3 扩展现有 CT（review/subscription/landing-page/conversion-funnel/conversion-event/intent-order/referral/customer-profile + lead/brand-info/first-truth-policy 扩展）
- **Plan 4**：Admin API 特殊操作 + Content API + 4 集成点 + 权限完整实现 + 定时任务
