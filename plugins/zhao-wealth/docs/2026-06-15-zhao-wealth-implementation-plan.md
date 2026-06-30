# zhao-wealth 插件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 zhao-wealth Strapi 插件，管理理财基金数据，支持采集、年化计算、推荐功能。

**Architecture:** 模块化分层架构，按功能域分模块：采集模块（collectors）、计算模块（services/nav-calculator）、查询模块（controllers）、推荐模块（recommend-service）、任务模块（jobs）。复用 zhao-auth 权限体系和 zhao-channel Redis 配置。

**Tech Stack:** Strapi 5.x, TypeScript, Bull + Redis（队列任务）, Axios + Cheerio（爬虫）, PostgreSQL

---

## 文件结构

### 创建文件列表

**插件基础文件：**
- `E:\code\basic\plugins\zhao-wealth\package.json` - 插件配置
- `E:\code\basic\plugins\zhao-wealth\strapi-admin.js` - Admin入口
- `E:\code\basic\plugins\zhao-wealth\strapi-server.js` - Server入口
- `E:\code\basic\plugins\zhao-wealth\tsconfig.json` - 根配置
- `E:\code\basic\plugins\zhao-wealth\admin\tsconfig.json` - Admin配置
- `E:\code\basic\plugins\zhao-wealth\server\tsconfig.json` - Server配置

**Server端核心文件：**
- `E:\code\basic\plugins\zhao-wealth\server\src\index.ts` - Server主入口
- `E:\code\basic\plugins\zhao-wealth\server\src\register.ts` - 注册插件
- `E:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts` - 启动初始化
- `E:\code\basic\plugins\zhao-wealth\server\src\permissions.ts` - 权限定义

**Content-Types（9个schema.json）：**
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-company\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-collect-config\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-nav\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-money-income\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-annual-snapshot\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-yearly-return\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-customer-product\schema.json`
- `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-recommend-config\schema.json`

**Controllers：**
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\product.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\nav.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\annual.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\recommend.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\customer-product.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\controllers\collect.ts`

**Services：**
- `E:\code\basic\plugins\zhao-wealth\server\src\services\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\services\product.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\services\nav-calculator.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\services\recommend-service.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\services\customer-product.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts`

**Routes：**
- `E:\code\basic\plugins\zhao-wealth\server\src\routes\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\routes\content-api.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts`

**Policies：**
- `E:\code\basic\plugins\zhao-wealth\server\src\policies\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\policies\has-channel-access.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\policies\has-product-permission.ts`

**Utils：**
- `E:\code\basic\plugins\zhao-wealth\server\src\utils\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\utils\trading-day.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\utils\annual-formula.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\utils\redis-client.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\utils\response.ts`

**Collectors：**
- `E:\code\basic\plugins\zhao-wealth\server\src\collectors\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\collectors\base-collector.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\collectors\cbhb-collector.ts`

**Jobs：**
- `E:\code\basic\plugins\zhao-wealth\server\src\jobs\index.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\jobs\queue-setup.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts`
- `E:\code\basic\plugins\zhao-wealth\server\src\jobs\calculate-job.ts`

**Admin端：**
- `E:\code\basic\plugins\zhao-wealth\admin\src\index.ts`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pluginId.ts`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\App.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\HomePage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\ProductPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\CompanyPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\CollectConfigPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\NavDataPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\RecommendPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\pages\CustomerProductPage.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\components\Initializer.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\components\PluginIcon.tsx`
- `E:\code\basic\plugins\zhao-wealth\admin\src\utils\api.ts`
- `E:\code\basic\plugins\zhao-wealth\admin\src\utils\getTranslation.ts`
- `E:\code\basic\plugins\zhao-wealth\admin\src\translations\en.json`
- `E:\code\basic\plugins\zhao-wealth\admin\src\translations\zh-Hans.json`
- `E:\code\basic\plugins\zhao-wealth\admin\custom.d.ts`

---

## Task 1: 创建插件基础结构

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\package.json`
- Create: `E:\code\basic\plugins\zhao-wealth\strapi-admin.js`
- Create: `E:\code\basic\plugins\zhao-wealth\strapi-server.js`
- Create: `E:\code\basic\plugins\zhao-wealth\tsconfig.json`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\tsconfig.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\tsconfig.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "zhao-wealth",
  "version": "1.0.0",
  "description": "理财基金管理插件",
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
    },
    "./strapi-admin": {
      "types": "./dist/admin/src/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "cheerio": "^1.0.0",
    "bull": "^4.16.5"
  },
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/design-system": "^2.2.0",
    "@strapi/icons": "^2.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.3",
    "styled-components": "^6.4.1",
    "ioredis": "^5.6.1"
  },
  "strapi": {
    "kind": "plugin",
    "name": "zhao-wealth",
    "displayName": "Zhao Wealth",
    "description": "理财基金管理插件"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: 创建 strapi-admin.js**

```javascript
'use strict';

module.exports = require('./dist/admin/index');
```

- [ ] **Step 3: 创建 strapi-server.js**

```javascript
'use strict';

module.exports = require('./dist/server/index');
```

- [ ] **Step 4: 创建根 tsconfig.json**

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["server/src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: 创建 admin/tsconfig.json**

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/admin",
  "include": ["./src", "./custom.d.ts"],
  "compilerOptions": {
    "rootDir": "../",
    "baseUrl": "."
  }
}
```

- [ ] **Step 6: 创建 server/tsconfig.json**

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "include": ["./src", "./src/**/*.json", "../tests/**/*.ts"],
  "compilerOptions": {
    "rootDir": "../",
    "baseUrl": ".",
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 7: 安装依赖**

Run: `cd E:\code\basic\plugins\zhao-wealth; npm install`

---

## Task 2: 创建 Content-Types

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-company\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-collect-config\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-nav\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-money-income\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-annual-snapshot\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-yearly-return\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-customer-product\schema.json`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-recommend-config\schema.json`

- [ ] **Step 1: 创建 content-types/index.ts**

```typescript
'use strict';

import wealthCompany from './wealth-company';
import wealthProduct from './wealth-product';
import wealthCollectConfig from './wealth-collect-config';
import wealthNav from './wealth-nav';
import wealthMoneyIncome from './wealth-money-income';
import wealthAnnualSnapshot from './wealth-annual-snapshot';
import wealthYearlyReturn from './wealth-yearly-return';
import wealthCustomerProduct from './wealth-customer-product';
import wealthRecommendConfig from './wealth-recommend-config';

export default {
  'wealth-company': wealthCompany,
  'wealth-product': wealthProduct,
  'wealth-collect-config': wealthCollectConfig,
  'wealth-nav': wealthNav,
  'wealth-money-income': wealthMoneyIncome,
  'wealth-annual-snapshot': wealthAnnualSnapshot,
  'wealth-yearly-return': wealthYearlyReturn,
  'wealth-customer-product': wealthCustomerProduct,
  'wealth-recommend-config': wealthRecommendConfig,
};
```

- [ ] **Step 2: 创建 wealth-company/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_companies",
  "info": {
    "singularName": "wealth-company",
    "pluralName": "wealth-companies",
    "displayName": "理财公司",
    "description": "银行理财公司信息"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "shortName": {
      "type": "string"
    },
    "companyType": {
      "type": "enumeration",
      "enum": ["bank", "bank-subsidiary"],
      "default": "bank-subsidiary"
    },
    "website": {
      "type": "string"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 3: 创建 wealth-product/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_products",
  "info": {
    "singularName": "wealth-product",
    "pluralName": "wealth-products",
    "displayName": "理财产品",
    "description": "理财/基金产品信息"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "productCode": {
      "type": "string",
      "unique": true,
      "required": true
    },
    "productName": {
      "type": "string",
      "required": true
    },
    "productType": {
      "type": "enumeration",
      "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund"],
      "required": true
    },
    "registerCode": {
      "type": "string",
      "unique": true
    },
    "riskLevel": {
      "type": "enumeration",
      "enum": ["R1", "R2", "R3", "R4", "R5"],
      "default": "R2"
    },
    "termType": {
      "type": "enumeration",
      "enum": ["short", "medium", "long"]
    },
    "issueDate": {
      "type": "date"
    },
    "maturityDate": {
      "type": "date"
    },
    "company": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-company.wealth-company",
      "inversedBy": "products"
    },
    "recommendWeight": {
      "type": "integer",
      "default": 0
    },
    "recommendTags": {
      "type": "json"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 4: 创建 wealth-collect-config/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_collect_configs",
  "info": {
    "singularName": "wealth-collect-config",
    "pluralName": "wealth-collect-configs",
    "displayName": "采集配置",
    "description": "产品数据采集配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::wealth-product.wealth-product"
    },
    "collectMethod": {
      "type": "enumeration",
      "enum": ["web-crawler", "zip-pdf", "manual", "api"],
      "default": "web-crawler"
    },
    "collectUrl": {
      "type": "string"
    },
    "collectRules": {
      "type": "json"
    },
    "collectStatus": {
      "type": "enumeration",
      "enum": ["pending", "success", "failed"],
      "default": "pending"
    },
    "lastCollectTime": {
      "type": "datetime"
    },
    "failCount": {
      "type": "integer",
      "default": 0
    },
    "failReason": {
      "type": "text"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 5: 创建 wealth-nav/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_navs",
  "info": {
    "singularName": "wealth-nav",
    "pluralName": "wealth-navs",
    "displayName": "净值数据",
    "description": "理财/基金净值数据（不含货币基金）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-product.wealth-product",
      "inversedBy": "navs"
    },
    "navDate": {
      "type": "date",
      "required": true
    },
    "unitNav": {
      "type": "decimal",
      "precision": 10,
      "scale": 4
    },
    "accNav": {
      "type": "decimal",
      "precision": 10,
      "scale": 4
    },
    "dataSource": {
      "type": "enumeration",
      "enum": ["crawler", "manual"],
      "default": "crawler"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 6: 创建 wealth-money-income/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_money_incomes",
  "info": {
    "singularName": "wealth-money-income",
    "pluralName": "wealth-money-incomes",
    "displayName": "货币基金收益",
    "description": "货币基金万份收益数据"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-product.wealth-product",
      "inversedBy": "moneyIncomes"
    },
    "incomeDate": {
      "type": "date",
      "required": true
    },
    "tenThousandIncome": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "sevenDayAnnual": {
      "type": "decimal",
      "precision": 10,
      "scale": 4
    },
    "dataSource": {
      "type": "enumeration",
      "enum": ["crawler", "manual"],
      "default": "crawler"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 7: 创建 wealth-annual-snapshot/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_annual_snapshots",
  "info": {
    "singularName": "wealth-annual-snapshot",
    "pluralName": "wealth-annual-snapshots",
    "displayName": "年化快照",
    "description": "各周期年化收益快照"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-product.wealth-product",
      "inversedBy": "annualSnapshots"
    },
    "snapshotDate": {
      "type": "date",
      "required": true
    },
    "annual1d": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual3d": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual7d": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual2w": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual1m": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual3m": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual6m": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "annual1y": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "isEstimate": {
      "type": "boolean",
      "default": false
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 8: 创建 wealth-yearly-return/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_yearly_returns",
  "info": {
    "singularName": "wealth-yearly-return",
    "pluralName": "wealth-yearly-returns",
    "displayName": "年度收益",
    "description": "历年年度收益统计"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-product.wealth-product",
      "inversedBy": "yearlyReturns"
    },
    "year": {
      "type": "integer",
      "required": true
    },
    "annualReturn": {
      "type": "decimal",
      "precision": 10,
      "scale": 6
    },
    "baseDays": {
      "type": "integer"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 9: 创建 wealth-customer-product/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_customer_products",
  "info": {
    "singularName": "wealth-customer-product",
    "pluralName": "wealth-customer-products",
    "displayName": "客户自选产品",
    "description": "客户关注的产品列表"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::wealth-product.wealth-product"
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::channel.channel"
    },
    "followTime": {
      "type": "datetime"
    },
    "sortOrder": {
      "type": "integer",
      "default": 0
    },
    "remark": {
      "type": "string"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 10: 创建 wealth-recommend-config/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_recommend_configs",
  "info": {
    "singularName": "wealth-recommend-config",
    "pluralName": "wealth-recommend-configs",
    "displayName": "推荐配置",
    "description": "手动推荐产品配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::wealth-product.wealth-product"
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::channel.channel"
    },
    "recommendOrder": {
      "type": "integer",
      "default": 0
    },
    "recommendReason": {
      "type": "text"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
}
```

---

## Task 3: 创建 Utils 工具模块

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\utils\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\utils\trading-day.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\utils\annual-formula.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\utils\redis-client.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\utils\response.ts`

- [ ] **Step 1: 创建 utils/index.ts**

```typescript
'use strict';

import { isTradingDay, getTradingDays, getPreviousTradingDay } from './trading-day';
import { calculateAnnualReturn, calculateMoneyFundAnnual, calculateYearlyReturn } from './annual-formula';
import { getRedisClient } from './redis-client';
import { successResponse, errorResponse } from './response';

export {
  isTradingDay,
  getTradingDays,
  getPreviousTradingDay,
  calculateAnnualReturn,
  calculateMoneyFundAnnual,
  calculateYearlyReturn,
  getRedisClient,
  successResponse,
  errorResponse,
};
```

- [ ] **Step 2: 创建 utils/trading-day.ts**

```typescript
'use strict';

import { DateTime } from 'luxon';

// 中国法定节假日配置（可扩展）
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
  '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
  '2026-06-14', '2026-06-15', '2026-06-16', // 端午
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', // 国庆
];

// 周末调休工作日配置
const WORKDAYS_ON_WEEKEND_2026 = [
  '2026-02-15', '2026-02-16', // 春节调休
  '2026-10-10', '2026-10-11', // 国庆调休
];

/**
 * 判断是否为交易日
 */
export function isTradingDay(date: Date): boolean {
  const dateStr = DateTime.fromJSDate(date).toISODate();
  const dayOfWeek = date.getDay();

  // 周末调休工作日
  if (WORKDAYS_ON_WEEKEND_2026.includes(dateStr)) {
    return true;
  }

  // 周末非交易日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 法定节假日非交易日
  if (HOLIDAYS_2026.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 获取指定日期往前N个交易日
 */
export function getPreviousTradingDay(currentDate: Date, tradingDaysCount: number): Date | null {
  let count = 0;
  let checkDate = new Date(currentDate);

  while (count < tradingDaysCount) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (isTradingDay(checkDate)) {
      count++;
    }
    // 防止无限循环（最多往前查365天）
    if (DateTime.fromJSDate(currentDate).diff(DateTime.fromJSDate(checkDate), 'days').days > 365) {
      return null;
    }
  }

  return checkDate;
}

/**
 * 获取两个日期之间的自然日天数（不含起始日，含结束日）
 */
export function getNaturalDays(startDate: Date, endDate: Date): number {
  const start = DateTime.fromJSDate(startDate);
  const end = DateTime.fromJSDate(endDate);
  return Math.floor(end.diff(start, 'days').days);
}

/**
 * 获取指定日期范围内的所有交易日
 */
export function getTradingDays(startDate: Date, endDate: Date): Date[] {
  const tradingDays: Date[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isTradingDay(current)) {
      tradingDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return tradingDays;
}
```

- [ ] **Step 3: 创建 utils/annual-formula.ts**

```typescript
'use strict';

/**
 * 净值复利年化计算
 * 公式: 年化 = (期末净值/期初净值)^(365/区间自然日天数) - 1
 */
export function calculateAnnualReturn(
  startNav: number,
  endNav: number,
  naturalDays: number
): number | null {
  // 边界检查
  if (startNav <= 0 || endNav <= 0) {
    return null;
  }

  if (naturalDays <= 0) {
    return null;
  }

  const ratio = endNav / startNav;
  const annualReturn = Math.pow(ratio, 365 / naturalDays) - 1;

  // 保留6位小数
  return Math.round(annualReturn * 1000000) / 1000000;
}

/**
 * 货币基金年化计算（万份收益单利）
 * 公式: 年化 = (周期万份收益总和 ÷ 周期自然天数) × 365 ÷ 10000
 */
export function calculateMoneyFundAnnual(
  totalIncome: number,
  naturalDays: number
): number | null {
  if (naturalDays <= 0) {
    return null;
  }

  const avgIncome = totalIncome / naturalDays;
  const annualReturn = avgIncome * 365 / 10000;

  return Math.round(annualReturn * 1000000) / 1000000;
}

/**
 * 年度收益计算
 */
export function calculateYearlyReturn(
  startNav: number,
  endNav: number,
  year: number,
  productType: string
): { annualReturn: number | null; baseDays: number } {
  // 判断是否为完整年度
  const yearDays = productType === 'money-fund' ? 365 : 365;

  const annualReturn = calculateAnnualReturn(startNav, endNav, yearDays);

  return {
    annualReturn,
    baseDays: yearDays,
  };
}

/**
 * 判断是否为短期估算值（自然日天数 < 7）
 */
export function isEstimateValue(naturalDays: number): boolean {
  return naturalDays < 7;
}
```

- [ ] **Step 4: 创建 utils/redis-client.ts**

```typescript
'use strict';

import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * 获取Redis客户端（复用现有配置）
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * 分布式锁获取
 */
export async function acquireLock(key: string, ttl: number): Promise<boolean> {
  const client = getRedisClient();
  const result = await client.set(key, 'locked', 'PX', ttl * 1000, 'NX');
  return result === 'OK';
}

/**
 * 分布式锁释放
 */
export async function releaseLock(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}
```

- [ ] **Step 5: 创建 utils/response.ts**

```typescript
'use strict';

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T | null;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, msg: string = 'success'): ApiResponse<T> {
  return {
    code: 200,
    msg,
    data,
  };
}

/**
 * 错误响应
 */
export function errorResponse(code: number, msg: string): ApiResponse<null> {
  return {
    code,
    msg,
    data: null,
  };
}

/**
 * 分页响应
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): ApiResponse<{ list: T[]; page: number; pageSize: number; total: number }> {
  return successResponse({
    list: data,
    page,
    pageSize,
    total,
  });
}
```

---

## Task 4: 创建 Services 服务层

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\product.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\nav-calculator.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\recommend-service.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\services\customer-product.ts`

- [ ] **Step 1: 创建 services/index.ts**

```typescript
'use strict';

import product from './product';
import navCalculator from './nav-calculator';
import annualSnapshot from './annual-snapshot';
import recommendService from './recommend-service';
import customerProduct from './customer-product';

export default {
  product,
  'nav-calculator': navCalculator,
  'annual-snapshot': annualSnapshot,
  'recommend-service': recommendService,
  'customer-product': customerProduct,
};
```

- [ ] **Step 2: 创建 services/product.ts**

```typescript
'use strict';

export default ({ strapi }) => ({
  /**
   * 获取产品列表
   */
  async findList(filters: any, page: number = 1, pageSize: number = 100) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const products = await strapi.db.query('api::wealth-product.wealth-product').findMany({
      where: filters,
      limit,
      offset,
      populate: ['company'],
    });

    const total = await strapi.db.query('api::wealth-product.wealth-product').count({
      where: filters,
    });

    return { list: products, page, pageSize: limit, total };
  },

  /**
   * 获取产品详情
   */
  async findOne(id: number) {
    const product = await strapi.db.query('api::wealth-product.wealth-product').findOne({
      where: { id },
      populate: ['company'],
    });

    // 获取最新净值
    const latestNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
      where: { product: id },
      orderBy: { navDate: 'desc' },
    });

    return {
      ...product,
      latestNav,
    };
  },

  /**
   * 创建产品
   */
  async create(data: any) {
    return strapi.db.query('api::wealth-product.wealth-product').create({ data });
  },

  /**
   * 更新产品
   */
  async update(id: number, data: any) {
    return strapi.db.query('api::wealth-product.wealth-product').update({
      where: { id },
      data,
    });
  },

  /**
   * 删除产品
   */
  async delete(id: number) {
    return strapi.db.query('api::wealth-product.wealth-product').delete({
      where: { id },
    });
  },
});
```

- [ ] **Step 3: 创建 services/nav-calculator.ts**

```typescript
'use strict';

import { getPreviousTradingDay, getNaturalDays, calculateAnnualReturn, calculateMoneyFundAnnual, isEstimateValue } from '../utils';

export default ({ strapi }) => ({
  /**
   * 计算单个产品的年化快照
   */
  async calculateSnapshot(productId: number, snapshotDate: Date) {
    const product = await strapi.db.query('api::wealth-product.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) {
      strapi.log.warn(`[zhao-wealth] 产品不存在: ${productId}`);
      return null;
    }

    const isMoneyFund = product.productType === 'money-fund';

    if (isMoneyFund) {
      return await this.calculateMoneyFundSnapshot(productId, snapshotDate);
    } else {
      return await this.calculateNavSnapshot(productId, snapshotDate);
    }
  },

  /**
   * 净值复利年化快照计算（理财/普通基金）
   */
  async calculateNavSnapshot(productId: number, snapshotDate: Date) {
    const periods = [
      { field: 'annual1d', days: 1 },
      { field: 'annual3d', days: 3 },
      { field: 'annual7d', days: 7 },
      { field: 'annual2w', days: 14 },
      { field: 'annual1m', days: 22 },
      { field: 'annual3m', days: 66 },
      { field: 'annual6m', days: 125 },
      { field: 'annual1y', days: 250 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
    };

    // 获取当日净值
    const currentNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
      where: { product: productId, navDate: snapshotDate },
    });

    if (!currentNav || !currentNav.unitNav) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}当日无净值数据`);
      return null;
    }

    for (const period of periods) {
      const prevDate = getPreviousTradingDay(snapshotDate, period.days);

      if (!prevDate) {
        snapshot[period.field] = null;
        continue;
      }

      const prevNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
        where: { product: productId, navDate: prevDate },
      });

      if (!prevNav || !prevNav.unitNav || prevNav.unitNav <= 0) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 产品${productId}周期${period.field}净值不足`);
        continue;
      }

      const naturalDays = getNaturalDays(prevDate, snapshotDate);
      const annualReturn = calculateAnnualReturn(prevNav.unitNav, currentNav.unitNav, naturalDays);

      snapshot[period.field] = annualReturn;
    }

    // 判断是否为估算值
    const minNaturalDays = getNaturalDays(getPreviousTradingDay(snapshotDate, 7), snapshotDate);
    snapshot.isEstimate = isEstimateValue(minNaturalDays || 0);

    return snapshot;
  },

  /**
   * 货币基金年化快照计算（万份收益单利）
   */
  async calculateMoneyFundSnapshot(productId: number, snapshotDate: Date) {
    const periods = [
      { field: 'annual7d', days: 7 },
      { field: 'annual1m', days: 30 },
      { field: 'annual3m', days: 90 },
      { field: 'annual6m', days: 180 },
      { field: 'annual1y', days: 365 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
      annual1d: null,
      annual3d: null,
      annual2w: null,
      isEstimate: false,
    };

    for (const period of periods) {
      const startDate = new Date(snapshotDate);
      startDate.setDate(startDate.getDate() - period.days);

      const incomes = await strapi.db.query('api::wealth-money-income.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: startDate, $lte: snapshotDate },
        },
      });

      if (incomes.length < period.days) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 货基${productId}周期${period.field}收益数据不足`);
        continue;
      }

      // 缺失日期填充0
      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const annualReturn = calculateMoneyFundAnnual(totalIncome, period.days);

      snapshot[period.field] = annualReturn;
    }

    return snapshot;
  },

  /**
   * 批量重算年化快照
   */
  async recalculateSnapshots(productId: number, startDate: Date, endDate: Date) {
    const navs = await strapi.db.query('api::wealth-nav.wealth-nav').findMany({
      where: {
        product: productId,
        navDate: { $gte: startDate, $lte: endDate },
      },
      orderBy: { navDate: 'asc' },
    });

    for (const nav of navs) {
      const snapshot = await this.calculateSnapshot(productId, nav.navDate);

      if (snapshot) {
        // 更新或创建快照
        const existing = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findOne({
          where: { product: productId, snapshotDate: nav.navDate },
        });

        if (existing) {
          await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').update({
            where: { id: existing.id },
            data: snapshot,
          });
        } else {
          await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').create({ data: snapshot });
        }
      }
    }

    strapi.log.info(`[zhao-wealth] 产品${productId}年化快照重算完成，${navs.length}条`);
  },

  /**
   * 全量重算所有产品年化快照
   */
  async recalculateAll() {
    const products = await strapi.db.query('api::wealth-product.wealth-product').findMany();

    for (const product of products) {
      const navs = await strapi.db.query('api::wealth-nav.wealth-nav').findMany({
        where: { product: product.id },
        orderBy: { navDate: 'asc' },
      });

      if (navs.length > 0) {
        const startDate = navs[0].navDate;
        const endDate = navs[navs.length - 1].navDate;
        await this.recalculateSnapshots(product.id, startDate, endDate);
      }
    }

    strapi.log.info(`[zhao-wealth] 全量年化快照重算完成，${products.length}个产品`);
  },
});
```

- [ ] **Step 4: 创建 services/annual-snapshot.ts**

```typescript
'use strict';

export default ({ strapi }) => ({
  /**
   * 获取年化快照时序数据
   */
  async getSnapshotTimeSeries(productId: number, startDate: Date, endDate: Date, page: number, pageSize: number) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const snapshots = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findMany({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate },
      },
      limit,
      offset,
      orderBy: { snapshotDate: 'desc' },
    });

    const total = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').count({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate },
      },
    });

    return { list: snapshots, page, pageSize: limit, total };
  },

  /**
   * 获取年度收益列表
   */
  async getYearlyReturns(productId: number) {
    const returns = await strapi.db.query('api::wealth-yearly-return.wealth-yearly-return').findMany({
      where: { product: productId },
      orderBy: { year: 'desc' },
    });

    return returns;
  },

  /**
   * 计算并保存年度收益
   */
  async calculateYearlyReturn(productId: number, year: number) {
    const product = await strapi.db.query('api::wealth-product.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return null;

    const isMoneyFund = product.productType === 'money-fund';

    if (isMoneyFund) {
      // 货币基金年度收益计算
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const incomes = await strapi.db.query('api::wealth-money-income.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: yearStart, $lte: yearEnd },
        },
      });

      if (incomes.length < 365) {
        strapi.log.warn(`[zhao-wealth] 货基${productId} ${year}年数据不完整`);
        return null;
      }

      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const avgIncome = totalIncome / incomes.length;
      const annualReturn = avgIncome * 365 / 10000;

      return await strapi.db.query('api::wealth-yearly-return.wealth-yearly-return').create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1000000) / 1000000,
          baseDays: 365,
        },
      });
    } else {
      // 理财/普通基金年度收益计算
      const yearStartNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'asc' },
      });

      const yearEndNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'desc' },
      });

      if (!yearStartNav || !yearEndNav) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年净值数据不完整`);
        return null;
      }

      // 检查是否为完整年度
      const startYear = new Date(yearStartNav.navDate).getFullYear();
      const endYear = new Date(yearEndNav.navDate).getFullYear();

      if (startYear !== year || endYear !== year) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年存续不足完整年度`);
        return null;
      }

      const annualReturn = Math.pow(yearEndNav.unitNav / yearStartNav.unitNav, 365 / 365) - 1;

      return await strapi.db.query('api::wealth-yearly-return.wealth-yearly-return').create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1000000) / 1000000,
          baseDays: 365,
        },
      });
    }
  },
});
```

- [ ] **Step 5: 创建 services/recommend-service.ts**

```typescript
'use strict';

export default ({ strapi }) => ({
  /**
   * 获取推荐产品列表
   */
  async getRecommendations(userId: number, channelId: number, limit: number = 10) {
    const recommendations: any[] = [];

    // 1. 手动配置推荐（最高优先级）
    const manualRecommend = await strapi.db.query('api::wealth-recommend-config.wealth-recommend-config').findMany({
      where: {
        channel: channelId,
        status: true,
      },
      orderBy: { recommendOrder: 'asc' },
      limit,
      populate: ['product'],
    });

    for (const config of manualRecommend) {
      const latestSnapshot = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findOne({
        where: { product: config.product.id },
        orderBy: { snapshotDate: 'desc' },
      });

      recommendations.push({
        productId: config.product.id,
        productName: config.product.productName,
        productType: config.product.productType,
        riskLevel: config.product.riskLevel,
        recommendSource: 'manual',
        recommendReason: config.recommendReason,
        annual1y: latestSnapshot?.annual1y,
        latestNav: null,
      });
    }

    // 2. 若不足limit条，补充客户偏好匹配
    if (recommendations.length < limit) {
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
      });

      if (user && user.riskPreference) {
        const matchedProducts = await strapi.db.query('api::wealth-product.wealth-product').findMany({
          where: {
            riskLevel: { $lte: user.riskPreference },
            status: true,
          },
          orderBy: { recommendWeight: 'desc' },
          limit: limit - recommendations.length,
        });

        for (const product of matchedProducts) {
          if (recommendations.some(r => r.productId === product.id)) continue;

          const latestSnapshot = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findOne({
            where: { product: product.id },
            orderBy: { snapshotDate: 'desc' },
          });

          recommendations.push({
            productId: product.id,
            productName: product.productName,
            productType: product.productType,
            riskLevel: product.riskLevel,
            recommendSource: 'preference',
            recommendReason: '符合您的风险偏好',
            annual1y: latestSnapshot?.annual1y,
            latestNav: null,
          });
        }
      }
    }

    // 3. 若仍不足limit条，补充年化收益排名
    if (recommendations.length < limit) {
      const topProducts = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findMany({
        where: {
          annual1y: { $ne: null },
        },
        orderBy: { annual1y: 'desc' },
        limit: limit - recommendations.length,
        populate: ['product'],
      });

      for (const snapshot of topProducts) {
        if (recommendations.some(r => r.productId === snapshot.product.id)) continue;

        recommendations.push({
          productId: snapshot.product.id,
          productName: snapshot.product.productName,
          productType: snapshot.product.productType,
          riskLevel: snapshot.product.riskLevel,
          recommendSource: 'annual-ranking',
          recommendReason: '近一年年化收益排名靠前',
          annual1y: snapshot.annual1y,
          latestNav: null,
        });
      }
    }

    return recommendations.slice(0, limit);
  },
});
```

- [ ] **Step 6: 创建 services/customer-product.ts**

```typescript
'use strict';

export default ({ strapi }) => ({
  /**
   * 获取用户自选产品列表
   */
  async getUserProducts(userId: number, page: number, pageSize: number) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const customerProducts = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findMany({
      where: { user: userId },
      limit,
      offset,
      orderBy: { sortOrder: 'asc', followTime: 'desc' },
      populate: ['product'],
    });

    const total = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').count({
      where: { user: userId },
    });

    // 补充最新净值和年化
    const list = await Promise.all(customerProducts.map(async (cp) => {
      const latestNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
        where: { product: cp.product.id },
        orderBy: { navDate: 'desc' },
      });

      const latestSnapshot = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findOne({
        where: { product: cp.product.id },
        orderBy: { snapshotDate: 'desc' },
      });

      return {
        ...cp,
        latestNav,
        latestSnapshot,
      };
    }));

    return { list, page, pageSize: limit, total };
  },

  /**
   * 添加自选产品
   */
  async addProduct(userId: number, productId: number, channelId: number) {
    // 检查是否已存在
    const existing = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findOne({
      where: { user: userId, product: productId },
    });

    if (existing) {
      return existing;
    }

    return await strapi.db.query('api::wealth-customer-product.wealth-customer-product').create({
      data: {
        user: userId,
        product: productId,
        channel: channelId,
        followTime: new Date(),
        sortOrder: 0,
      },
    });
  },

  /**
   * 删除自选产品
   */
  async removeProduct(userId: number, customerProductId: number) {
    const cp = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findOne({
      where: { id: customerProductId },
    });

    if (!cp || cp.user !== userId) {
      return null;
    }

    return await strapi.db.query('api::wealth-customer-product.wealth-customer-product').delete({
      where: { id: customerProductId },
    });
  },

  /**
   * 获取渠道下所有客户自选统计
   */
  async getChannelProductsStats(channelId: number) {
    const stats = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findMany({
      where: { channel: channelId },
      populate: ['product', 'user'],
    });

    // 按产品统计关注人数
    const productStats: Record<number, { productId: number; productName: string; followCount: number }> = {};

    for (const cp of stats) {
      const productId = cp.product.id;
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: cp.product.productName,
          followCount: 0,
        };
      }
      productStats[productId].followCount++;
    }

    return Object.values(productStats).sort((a, b) => b.followCount - a.followCount);
  },
});
```

---

## Task 5: 创建 Controllers 控制器

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\product.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\nav.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\annual.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\recommend.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\customer-product.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\controllers\collect.ts`

- [ ] **Step 1: 创建 controllers/index.ts**

```typescript
'use strict';

import product from './product';
import nav from './nav';
import annual from './annual';
import recommend from './recommend';
import customerProduct from './customer-product';
import collect from './collect';

export default {
  product,
  nav,
  annual,
  recommend,
  'customer-product': customerProduct,
  collect,
};
```

- [ ] **Step 2: 创建 controllers/product.ts**

```typescript
'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 100, productType, riskLevel } = ctx.query;

      const filters: any = { status: true };
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;

      const result = await strapi.service('api::wealth-product.wealth-product').findList(filters, page, pageSize);

      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 获取产品详情（C端）
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;

      const product = await strapi.service('api::wealth-product.wealth-product').findOne(Number(id));

      if (!product) {
        ctx.body = errorResponse(404, '产品不存在');
        return;
      }

      ctx.body = successResponse(product);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
```

- [ ] **Step 3: 创建 controllers/nav.ts**

```typescript
'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取净值时序数据（C端）
   */
  async timeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const navs = await strapi.db.query('api::wealth-nav.wealth-nav').findMany({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end },
        },
        limit: Math.min(pageSize, 500),
        offset: (page - 1) * pageSize,
        orderBy: { navDate: 'desc' },
      });

      const total = await strapi.db.query('api::wealth-nav.wealth-nav').count({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end },
        },
      });

      const list = navs.map(n => ({
        date: n.navDate,
        unitNav: n.unitNav,
        accNav: n.accNav,
      }));

      ctx.body = paginatedResponse(list, page, pageSize, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值时序查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
```

- [ ] **Step 4: 创建 controllers/annual.ts**

```typescript
'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取年化快照时序数据（C端）
   */
  async snapshotTimeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const result = await strapi.service('plugin::zhao-wealth.annual-snapshot').getSnapshotTimeSeries(
        Number(id),
        start,
        end,
        page,
        pageSize
      );

      const list = result.list.map(s => ({
        date: s.snapshotDate,
        annual1d: s.annual1d,
        annual3d: s.annual3d,
        annual7d: s.annual7d,
        annual2w: s.annual2w,
        annual1m: s.annual1m,
        annual3m: s.annual3m,
        annual6m: s.annual6m,
        annual1y: s.annual1y,
        isEstimate: s.isEstimate,
      }));

      ctx.body = paginatedResponse(list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年化快照查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 获取年度收益列表（C端）
   */
  async yearlyReturns(ctx) {
    try {
      const { id } = ctx.params;

      const returns = await strapi.service('plugin::zhao-wealth.annual-snapshot').getYearlyReturns(Number(id));

      ctx.body = successResponse(returns);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年度收益查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
```

- [ ] **Step 5: 创建 controllers/recommend.ts**

```typescript
'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取推荐产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 10 } = ctx.query;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;

      if (!userId || !channelId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const recommendations = await strapi.service('plugin::zhao-wealth.recommend-service').getRecommendations(
        userId,
        channelId,
        pageSize
      );

      ctx.body = paginatedResponse(recommendations, page, pageSize, recommendations.length);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
```

- [ ] **Step 6: 创建 controllers/customer-product.ts**

```typescript
'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取用户自选列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20 } = ctx.query;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').getUserProducts(userId, page, pageSize);

      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 自选列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 添加自选（C端）
   */
  async add(ctx) {
    try {
      const { productId } = ctx.request.body;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;

      if (!userId || !channelId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').addProduct(userId, productId, channelId);

      ctx.body = successResponse(result, '添加成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 添加自选失败: ${error.message}`);
      ctx.body = errorResponse(500, '添加失败');
    }
  },

  /**
   * 删除自选（C端）
   */
  async remove(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').removeProduct(userId, Number(id));

      if (!result) {
        ctx.body = errorResponse(404, '自选不存在或无权限');
        return;
      }

      ctx.body = successResponse(result, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除自选失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },
});
```

- [ ] **Step 7: 创建 controllers/collect.ts**

```typescript
'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 触发采集（后台）
   */
  async trigger(ctx) {
    try {
      const { productId } = ctx.request.body;

      // 加入采集队列
      const queue = strapi.plugin('zhao-wealth').queue('wealth-collect');

      if (productId) {
        queue.add('collect-single', { productId });
        ctx.body = successResponse({ productId }, '单产品采集任务已触发');
      } else {
        queue.add('collect-all', {});
        ctx.body = successResponse({}, '全量采集任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发采集失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },

  /**
   * 查询采集状态（后台）
   */
  async status(ctx) {
    try {
      const { productId } = ctx.query;

      if (productId) {
        const config = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findOne({
          where: { product: Number(productId) },
        });

        ctx.body = successResponse(config);
      } else {
        const configs = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findMany({
          populate: ['product'],
        });

        ctx.body = successResponse(configs);
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询采集状态失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 触发重算（后台）
   */
  async recalculate(ctx) {
    try {
      const { productId, startDate, endDate } = ctx.request.body;

      const queue = strapi.plugin('zhao-wealth').queue('wealth-calculate');

      if (productId && startDate && endDate) {
        queue.add('recalculate-range', { productId, startDate, endDate });
        ctx.body = successResponse({ productId }, '指定范围重算任务已触发');
      } else if (productId) {
        queue.add('recalculate-product', { productId });
        ctx.body = successResponse({ productId }, '单产品重算任务已触发');
      } else {
        queue.add('recalculate-all', {});
        ctx.body = successResponse({}, '全量重算任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },
});
```

---

## Task 6: 创建 Routes 路由

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\routes\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\routes\content-api.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts`

- [ ] **Step 1: 创建 routes/index.ts**

```typescript
'use strict';

import contentApi from './content-api';
import adminApi from './admin-api';

export default {
  'content-api': contentApi,
  'admin-api': adminApi,
};
```

- [ ] **Step 2: 创建 routes/content-api.ts**

```typescript
'use strict';

export default {
  routes: [
    // 产品列表
    {
      method: 'GET',
      path: '/v1/wealth/products',
      handler: 'product.list',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 产品详情
    {
      method: 'GET',
      path: '/v1/wealth/products/:id',
      handler: 'product.detail',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 净值时序
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/nav',
      handler: 'nav.timeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 年化快照时序
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/annual-snapshot',
      handler: 'annual.snapshotTimeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 年度收益列表
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/yearly-return',
      handler: 'annual.yearlyReturns',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 推荐产品列表
    {
      method: 'GET',
      path: '/v1/wealth/recommend',
      handler: 'recommend.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 客户自选列表
    {
      method: 'GET',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 添加自选
    {
      method: 'POST',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.add',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 删除自选
    {
      method: 'DELETE',
      path: '/v1/wealth/customer-products/:id',
      handler: 'customer-product.remove',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
  ],
};
```

- [ ] **Step 3: 创建 routes/admin-api.ts**

```typescript
'use strict';

export default {
  routes: [
    // 触发采集
    {
      method: 'POST',
      path: '/v1/collect/trigger',
      handler: 'collect.trigger',
      config: {
        policies: ['plugin::zhao-auth.has-permission'],
      },
    },
    // 查询采集状态
    {
      method: 'GET',
      path: '/v1/collect/status',
      handler: 'collect.status',
      config: {
        policies: ['plugin::zhao-auth.has-permission'],
      },
    },
    // 触发重算
    {
      method: 'POST',
      path: '/v1/recalculate',
      handler: 'collect.recalculate',
      config: {
        policies: ['plugin::zhao-auth.has-permission'],
      },
    },
  ],
};
```

---

## Task 7: 创建 Policies 策略

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\policies\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\policies\has-channel-access.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\policies\has-product-permission.ts`

- [ ] **Step 1: 创建 policies/index.ts**

```typescript
'use strict';

import hasChannelAccess from './has-channel-access';
import hasProductPermission from './has-product-permission';

export default {
  'has-channel-access': hasChannelAccess,
  'has-product-permission': hasProductPermission,
};
```

- [ ] **Step 2: 创建 policies/has-channel-access.ts**

```typescript
'use strict';

export default async (ctx, config, { strapi }) => {
  const user = ctx.state.user;

  if (!user) {
    return false;
  }

  // 复用 zhao-auth 的渠道权限检查
  const channelId = ctx.state.channel?.id;

  if (!channelId) {
    strapi.log.warn('[zhao-wealth] 用户无渠道信息');
    return false;
  }

  return true;
};
```

- [ ] **Step 3: 创建 policies/has-product-permission.ts**

```typescript
'use strict';

export default async (ctx, config, { strapi }) => {
  const user = ctx.state.user;

  if (!user) {
    return false;
  }

  // 检查管理员权限
  const role = user.role?.type;

  if (role === 'admin') {
    return true;
  }

  // 渠道管理员检查
  const channelId = ctx.state.channel?.id;

  if (role === 'channel-admin' && channelId) {
    return true;
  }

  return false;
};
```

---

## Task 8: 创建 Collectors 采集模块

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\collectors\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\collectors\base-collector.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\collectors\cbhb-collector.ts`

- [ ] **Step 1: 创建 collectors/index.ts**

```typescript
'use strict';

import BaseCollector from './base-collector';
import CbhbCollector from './cbhb-collector';

export default {
  'base-collector': BaseCollector,
  'cbhb-collector': CbhbCollector,
};

export function getCollector(collectMethod: string): BaseCollector {
  switch (collectMethod) {
    case 'web-crawler':
      return new CbhbCollector();
    default:
      return new BaseCollector();
  }
}
```

- [ ] **Step 2: 创建 collectors/base-collector.ts**

```typescript
'use strict';

export default class BaseCollector {
  /**
   * 采集产品基本信息
   */
  async collectProductInfo(productCode: string): Promise<any> {
    throw new Error('Method not implemented');
  }

  /**
   * 采集净值数据
   */
  async collectNavData(productCode: string): Promise<any[]> {
    throw new Error('Method not implemented');
  }

  /**
   * 数据入库
   */
  async saveToDatabase(productId: number, data: any): Promise<void> {
    throw new Error('Method not implemented');
  }
}
```

- [ ] **Step 3: 创建 collectors/cbhb-collector.ts**

```typescript
'use strict';

import axios from 'axios';
import * as cheerio from 'cheerio';
import BaseCollector from './base-collector';

const BASE_URL = 'https://www.cbhbwm.com.cn';

export default class CbhbCollector extends BaseCollector {
  /**
   * 采集渤银理财产品列表
   */
  async collectProductList(): Promise<string[]> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/qbcp/index.html`);
      const $ = cheerio.load(response.data);

      const productCodes: string[] = [];

      $('.product-item').each((_, el) => {
        const link = $(el).find('a').attr('href');
        if (link) {
          const match = link.match(/saleCode=([A-Z0-9]+)/);
          if (match) {
            productCodes.push(match[1]);
          }
        }
      });

      return productCodes;
    } catch (error) {
      console.error(`[CbhbCollector] 产品列表采集失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 采集单个产品详情
   */
  async collectProductInfo(productCode: string): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`);
      const $ = cheerio.load(response.data);

      const productInfo = {
        productCode,
        productName: $('.product-title').text().trim(),
        registerCode: $('.register-code').text().replace('登记编号：', '').trim(),
        riskLevel: this.parseRiskLevel($('.risk-type').text().trim()),
        productType: 'bank-wealth',
        company: '渤银理财',
      };

      return productInfo;
    } catch (error) {
      console.error(`[CbhbCollector] 产品${productCode}详情采集失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 采集净值数据
   */
  async collectNavData(productCode: string): Promise<any[]> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`);
      const $ = cheerio.load(response.data);

      const navData: any[] = [];

      $('.nav-table tbody tr').each((_, el) => {
        const date = $(el).find('td:nth-child(1)').text().trim();
        const unitNav = parseFloat($(el).find('td:nth-child(2)').text().trim());
        const accNav = parseFloat($(el).find('td:nth-child(3)').text().trim());

        if (date && unitNav) {
          navData.push({
            navDate: date,
            unitNav,
            accNav,
            dataSource: 'crawler',
          });
        }
      });

      return navData;
    } catch (error) {
      console.error(`[CbhbCollector] 产品${productCode}净值采集失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 解析风险等级
   */
  parseRiskLevel(text: string): string {
    if (text.includes('低风险') || text.includes('R1')) return 'R1';
    if (text.includes('中低风险') || text.includes('R2')) return 'R2';
    if (text.includes('中风险') || text.includes('R3')) return 'R3';
    if (text.includes('中高风险') || text.includes('R4')) return 'R4';
    if (text.includes('高风险') || text.includes('R5')) return 'R5';
    return 'R2';
  }
}
```

---

## Task 9: 创建 Jobs 队列任务

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\jobs\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\jobs\queue-setup.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\jobs\calculate-job.ts`

- [ ] **Step 1: 创建 jobs/index.ts**

```typescript
'use strict';

import { setupQueues } from './queue-setup';
import { registerCollectJobs } from './collect-job';
import { registerCalculateJobs } from './calculate-job';

export default ({ strapi }) => {
  setupQueues(strapi);
  registerCollectJobs(strapi);
  registerCalculateJobs(strapi);
};
```

- [ ] **Step 2: 创建 jobs/queue-setup.ts**

```typescript
'use strict';

import Queue from 'bull';
import { getRedisClient } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;

export function setupQueues(strapi: any) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  collectQueue = new Queue('wealth-collect', redisUrl, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  calculateQueue = new Queue('wealth-calculate', redisUrl, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  recalculateQueue = new Queue('wealth-recalculate', redisUrl, {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  strapi.log.info('[zhao-wealth] Bull队列初始化完成');
}

export function getCollectQueue(): Queue.Queue {
  return collectQueue!;
}

export function getCalculateQueue(): Queue.Queue {
  return calculateQueue!;
}

export function getRecalculateQueue(): Queue.Queue {
  return recalculateQueue!;
}
```

- [ ] **Step 3: 创建 jobs/collect-job.ts**

```typescript
'use strict';

import { getCollectQueue } from './queue-setup';
import { getCollector } from '../collectors';
import { isTradingDay, acquireLock, releaseLock } from '../utils';

export function registerCollectJobs(strapi: any) {
  const queue = getCollectQueue();

  // 单产品采集
  queue.process('collect-single', async (job) => {
    const { productId } = job.data;

    const config = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findOne({
      where: { product: productId },
      populate: ['product'],
    });

    if (!config) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}无采集配置`);
      return;
    }

    const collector = getCollector(config.collectMethod);

    try {
      const navData = await collector.collectNavData(config.product.productCode);

      for (const nav of navData) {
        await strapi.db.query('api::wealth-nav.wealth-nav').create({
          data: {
            product: productId,
            ...nav,
          },
        });
      }

      await strapi.db.query('api::wealth-collect-config.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
        },
      });

      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，${navData.length}条净值`);

      // 触发年化计算
      const calculateQueue = getCollectQueue();
      calculateQueue.add('calculate-snapshot', { productId });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品${productId}采集失败: ${error.message}`);

      await strapi.db.query('api::wealth-collect-config.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'failed',
          failCount: config.failCount + 1,
          failReason: error.message,
        },
      });
    }
  });

  // 全量采集
  queue.process('collect-all', async (job) => {
    const lockKey = 'wealth:collect:lock';
    const acquired = await acquireLock(lockKey, 30 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 采集任务已在执行中');
      return;
    }

    try {
      const configs = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findMany({
        populate: ['product'],
      });

      for (const config of configs) {
        queue.add('collect-single', { productId: config.product.id });
      }

      strapi.log.info(`[zhao-wealth] 全量采集任务分发完成，${configs.length}个产品`);
    } finally {
      await releaseLock(lockKey);
    }
  });
}
```

- [ ] **Step 4: 创建 jobs/calculate-job.ts**

```typescript
'use strict';

import { getCalculateQueue, getRecalculateQueue } from './queue-setup';
import { acquireLock, releaseLock } from '../utils';

export function registerCalculateJobs(strapi: any) {
  const queue = getCalculateQueue();

  // 单产品当日快照计算
  queue.process('calculate-snapshot', async (job) => {
    const { productId } = job.data;

    const today = new Date();
    const snapshot = await strapi.service('plugin::zhao-wealth.nav-calculator').calculateSnapshot(productId, today);

    if (snapshot) {
      await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').create({ data: snapshot });
      strapi.log.info(`[zhao-wealth] 产品${productId}年化快照计算完成`);
    }
  });

  // 单产品重算
  queue.process('recalculate-product', async (job) => {
    const { productId } = job.data;

    const navs = await strapi.db.query('api::wealth-nav.wealth-nav').findMany({
      where: { product: productId },
      orderBy: { navDate: 'asc' },
    });

    if (navs.length > 0) {
      const startDate = navs[0].navDate;
      const endDate = navs[navs.length - 1].navDate;
      await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateSnapshots(productId, startDate, endDate);
    }
  });

  // 指定范围重算
  queue.process('recalculate-range', async (job) => {
    const { productId, startDate, endDate } = job.data;
    await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateSnapshots(productId, new Date(startDate), new Date(endDate));
  });

  // 全量重算
  const recalcQueue = getRecalculateQueue();
  recalcQueue.process('recalculate-all', async (job) => {
    const lockKey = 'wealth:recalculate:lock';
    const acquired = await acquireLock(lockKey, 60 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 重算任务已在执行中');
      return;
    }

    try {
      await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateAll();
    } finally {
      await releaseLock(lockKey);
    }
  });
}
```

---

## Task 10: 创建 Server 主入口

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\register.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\server\src\permissions.ts`

- [ ] **Step 1: 创建 server/src/index.ts**

```typescript
'use strict';

import contentTypes from './content-types';
import controllers from './controllers';
import routes from './routes';
import services from './services';
import policies from './policies';
import register from './register';
import bootstrap from './bootstrap';

export default {
  contentTypes,
  controllers,
  routes,
  services,
  policies,
  register,
  bootstrap,
};
```

- [ ] **Step 2: 创建 server/src/register.ts**

```typescript
'use strict';

export default ({ strapi }) => {
  strapi.log.info('[zhao-wealth] 插件已注册');
};
```

- [ ] **Step 3: 创建 server/src/bootstrap.ts**

```typescript
'use strict';

import jobs from './jobs';

export default ({ strapi }) => {
  // 初始化队列任务
  jobs({ strapi });

  // 注册定时任务（Cron）
  strapi.cron.add({
    'wealth-trading-day-check': {
      schedule: '0 8 * * *',
      handler: async () => {
        const today = new Date();
        const isTrading = require('./utils/trading-day').isTradingDay(today);
        strapi.log.info(`[zhao-wealth] 今日交易日状态: ${isTrading}`);
      },
    },
    'wealth-collect-trigger': {
      schedule: '0 18 * * *',
      handler: async () => {
        const today = new Date();
        const isTrading = require('./utils/trading-day').isTradingDay(today);

        if (isTrading) {
          const queue = require('./jobs/queue-setup').getCollectQueue();
          queue.add('collect-all', {});
          strapi.log.info('[zhao-wealth] 采集任务已触发');
        } else {
          strapi.log.info('[zhao-wealth] 今日非交易日，跳过采集');
        }
      },
    },
    'wealth-calculate-trigger': {
      schedule: '0 20 * * *',
      handler: async () => {
        const today = new Date();
        const isTrading = require('./utils/trading-day').isTradingDay(today);

        if (isTrading) {
          const queue = require('./jobs/queue-setup').getCalculateQueue();
          const products = await strapi.db.query('api::wealth-product.wealth-product').findMany();

          for (const product of products) {
            queue.add('calculate-snapshot', { productId: product.id });
          }

          strapi.log.info('[zhao-wealth] 年化计算任务已触发');
        }
      },
    },
  });

  strapi.log.info('[zhao-wealth] 插件已启动');
};
```

- [ ] **Step 4: 创建 server/src/permissions.ts**

```typescript
'use strict';

export default {
  // 插件权限定义
  'wealth-product': {
    actions: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  'wealth-nav': {
    actions: ['find', 'findOne', 'create', 'update'],
  },
  'wealth-collect-config': {
    actions: ['find', 'findOne', 'create', 'update', 'trigger', 'status'],
  },
  'wealth-recommend-config': {
    actions: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  'wealth-customer-product': {
    actions: ['find', 'create', 'delete'],
  },
};
```

---

## Task 11: 创建 Admin 端基础文件

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\index.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\pluginId.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\custom.d.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\translations\en.json`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\translations\zh-Hans.json`

- [ ] **Step 1: 创建 admin/src/index.ts**

```typescript
'use strict';

import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginId from './pluginId';
import Initializer from './components/Initializer';
import PluginIcon from './components/PluginIcon';

const name = 'Zhao Wealth';

export default {
  register(app) {
    app.registerPlugin({
      id: pluginId,
      name,
      initializer: Initializer,
      isReady: false,
      icon: PluginIcon,
    });
  },
  bootstrap(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '理财基金管理',
      },
      Component: () => null,
      permissions: [],
    });
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return { data: {}, locale };
          });
      })
    );
    return importedTrads;
  },
};
```

- [ ] **Step 2: 创建 admin/src/pluginId.ts**

```typescript
'use strict';

const pluginId = 'zhao-wealth';

export default pluginId;
```

- [ ] **Step 3: 创建 admin/custom.d.ts**

```typescript
declare module '*.json' {
  const value: any;
  export default value;
}
```

- [ ] **Step 4: 创建 admin/src/translations/en.json**

```json
{
  "plugin.name": "Zhao Wealth",
  "plugin.description": "Wealth and Fund Management Plugin",
  "products.title": "Products",
  "companies.title": "Companies",
  "collect-config.title": "Collect Config",
  "nav-data.title": "NAV Data",
  "recommend.title": "Recommendations",
  "customer-products.title": "Customer Products"
}
```

- [ ] **Step 5: 创建 admin/src/translations/zh-Hans.json**

```json
{
  "plugin.name": "理财基金管理",
  "plugin.description": "理财基金管理插件",
  "products.title": "产品管理",
  "companies.title": "理财公司",
  "collect-config.title": "采集配置",
  "nav-data.title": "净值数据",
  "recommend.title": "推荐配置",
  "customer-products.title": "客户自选"
}
```

---

## Task 12: 创建 Admin Components

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\components\Initializer.tsx`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\components\PluginIcon.tsx`

- [ ] **Step 1: 创建 admin/src/components/Initializer.tsx**

```typescript
import React from 'react';

const Initializer = () => {
  return null;
};

export default Initializer;
```

- [ ] **Step 2: 创建 admin/src/components/PluginIcon.tsx`

```typescript
import React from 'react';
import { MoneyDollar } from '@strapi/icons';

const PluginIcon = () => <MoneyDollar />;

export default PluginIcon;
```

---

## Task 13: 创建 Admin Pages

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\pages\App.tsx`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\pages\HomePage.tsx`

- [ ] **Step 1: 创建 admin/src/pages/App.tsx**

```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import HomePage from './HomePage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
};

export default App;
```

- [ ] **Step 2: 创建 admin/src/pages/HomePage.tsx**

```typescript
import React from 'react';
import { Main, Box, Typography, Flex } from '@strapi/design-system';

const HomePage = () => {
  return (
    <Main>
      <Box padding={8}>
        <Typography variant="alpha">理财基金管理</Typography>
        <Flex direction="column" gap={4} marginTop={4}>
          <Typography variant="beta">数据概览</Typography>
          <Typography variant="pi">产品总数: 0</Typography>
          <Typography variant="pi">今日采集状态: 待配置</Typography>
          <Typography variant="pi">待重算任务数: 0</Typography>
        </Flex>
      </Box>
    </Main>
  );
};

export default HomePage;
```

---

## Task 14: 创建 Admin Utils

**Files:**
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\utils\api.ts`
- Create: `E:\code\basic\plugins\zhao-wealth\admin\src\utils\getTranslation.ts`

- [ ] **Step 1: 创建 admin/src/utils/api.ts**

```typescript
import { useFetchClient } from '@strapi/strapi/admin';

const pluginId = 'zhao-wealth';

export const useApi = () => {
  const { get, post, put, del } = useFetchClient();

  return {
    getProducts: async (params?: any) => {
      const response = await get(`/api/v1/${pluginId}/products`, { params });
      return response.data;
    },
    getProduct: async (id: number) => {
      const response = await get(`/api/v1/${pluginId}/products/${id}`);
      return response.data;
    },
    triggerCollect: async (productId?: number) => {
      const response = await post(`/wealth-admin/v1/collect/trigger`, { productId });
      return response.data;
    },
    getCollectStatus: async (productId?: number) => {
      const response = await get(`/wealth-admin/v1/collect/status`, { params: { productId } });
      return response.data;
    },
    triggerRecalculate: async (params?: any) => {
      const response = await post(`/wealth-admin/v1/recalculate`, params);
      return response.data;
    },
  };
};
```

- [ ] **Step 2: 创建 admin/src/utils/getTranslation.ts`

```typescript
import pluginId from '../pluginId';

const getTranslation = (id: string) => `${pluginId}.${id}`;

export default getTranslation;
```

---

## Task 15: 验证插件并启动

- [ ] **Step 1: 构建插件**

Run: `cd E:\code\basic\plugins\zhao-wealth; npm run build`

- [ ] **Step 2: 在主项目中注册插件**

检查 `E:\code\basic\config\plugins.js` 或 `E:\code\basic\config\plugins.ts`，确保插件已注册：

```typescript
// config/plugins.ts
export default {
  'zhao-wealth': {
    enabled: true,
    resolve: './plugins/zhao-wealth',
  },
};
```

- [ ] **Step 3: 启动主项目验证**

Run: `cd E:\code\basic; npm run dev`

Expected: 插件加载成功，日志显示 `[zhao-wealth] 插件已注册`

---

## 实现计划总结

| Task | 内容 | 文件数 |
|------|------|--------|
| Task 1 | 插件基础结构 | 6 |
| Task 2 | Content-Types | 10 |
| Task 3 | Utils工具模块 | 5 |
| Task 4 | Services服务层 | 6 |
| Task 5 | Controllers控制器 | 7 |
| Task 6 | Routes路由 | 3 |
| Task 7 | Policies策略 | 3 |
| Task 8 | Collectors采集模块 | 3 |
| Task 9 | Jobs队列任务 | 4 |
| Task 10 | Server主入口 | 4 |
| Task 11 | Admin基础文件 | 5 |
| Task 12 | Admin Components | 2 |
| Task 13 | Admin Pages | 2 |
| Task 14 | Admin Utils | 2 |
| Task 15 | 验证启动 | - |

**总计文件数: 62个文件**