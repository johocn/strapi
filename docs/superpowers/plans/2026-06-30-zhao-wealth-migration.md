# zhao-wealth 插件迁移与修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `e:\code\plugins\zhao-wealth` 完整源码迁移到 `e:\code\basic\plugins\zhao-wealth`，并修复 6 项已识别问题，使插件能在 basic 项目中正常启动并响应 API 请求。

**Architecture:** Strapi v5 插件，TypeScript 实现。Bull + Redis 异步队列驱动净值采集与年化计算。9 个 content-type 表通过 Strapi 自动建表。Cron 定时任务在交易日 18:00 触发采集、20:00 触发年化计算。Redis 不可用时优雅降级。

**Tech Stack:** Strapi v5、TypeScript、Bull、ioredis、axios、cheerio、luxon、PostgreSQL

**Spec:** [2026-06-30-zhao-wealth-migration-design.md](file:///e:/code/docs/superpowers/specs/2026-06-30-zhao-wealth-migration-design.md)

**Environment Notes:**
- 工作目录：`e:\code`
- basic 是 git 仓库，每个 Task 末尾需 commit
- PowerShell 命令语法（不用 `&&`，用 `;` 分隔）
- 项目无单元测试框架（spec 已明确不补测试），改用启动验证 + 接口 smoke test

---

## File Structure

迁移后 `basic/plugins/zhao-wealth/` 完整结构（仅列修改/新增文件）：

```
basic/plugins/zhao-wealth/
├── server/src/
│   ├── content-types/
│   │   ├── wealth-company/schema.json          [新增]
│   │   ├── wealth-product/schema.json          [新增]
│   │   ├── wealth-collect-config/schema.json   [新增]
│   │   ├── wealth-nav/schema.json              [新增]
│   │   ├── wealth-money-income/schema.json     [新增]
│   │   ├── wealth-annual-snapshot/schema.json  [新增]
│   │   ├── wealth-yearly-return/schema.json    [新增]
│   │   ├── wealth-customer-product/schema.json [新增]
│   │   ├── wealth-recommend-config/schema.json [新增]
│   │   └── index.ts                            [改写：import schema.json]
│   ├── services/
│   │   ├── annual-snapshot.ts                  [改写：修 calculateYearlyReturn]
│   │   ├── recommend-service.ts                [改写：UID 前缀]
│   │   ├── product.ts                          [改写：UID 前缀]
│   │   ├── customer-product.ts                 [改写：UID 前缀]
│   │   └── nav-calculator.ts                   [改写：UID 前缀]
│   ├── controllers/
│   │   ├── collect.ts                          [改写：UID 前缀 + 503 降级]
│   │   └── nav.ts                              [改写：UID 前缀]
│   ├── jobs/
│   │   ├── queue-setup.ts                      [改写：try/catch + 返回 null]
│   │   ├── collect-job.ts                      [改写：判空 + UID 前缀]
│   │   ├── calculate-job.ts                    [改写：判空 + UID 前缀]
│   │   └── index.ts                            [改写：判空]
│   ├── utils/
│   │   └── redis-client.ts                     [改写：优雅降级]
│   └── bootstrap.ts                            [改写：加 Cron]
└── package.json                                 [可能改：补缺失依赖]
```

---

## Task 1: 备份并清理目标目录

**Files:**
- 临时备份：`e:\code\basic\plugins\zhao-wealth.bak.YYYYMMDD\`

- [ ] **Step 1: 确认源目录完整存在**

```powershell
Test-Path "e:\code\plugins\zhao-wealth\server\src\index.ts"
Test-Path "e:\code\plugins\zhao-wealth\package.json"
Test-Path "e:\code\plugins\zhao-wealth\server\src\content-types\index.ts"
```

Expected: 三个都返回 `True`。任一为 `False` 立即停止并报告源码缺失。

- [ ] **Step 2: 备份现有 basic/plugins/zhao-wealth（空壳）**

```powershell
$timestamp = Get-Date -Format "yyyyMMdd"
Copy-Item -Path "e:\code\basic\plugins\zhao-wealth" -Destination "e:\code\basic\plugins\zhao-wealth.bak.$timestamp" -Recurse -Force
Write-Output "Backup created at e:\code\basic\plugins\zhao-wealth.bak.$timestamp"
```

Expected: 输出 `Backup created at ...`，备份目录存在。

- [ ] **Step 3: 删除 basic/plugins/zhao-wealth 下所有内容（保留空目录）**

```powershell
Get-ChildItem -Path "e:\code\basic\plugins\zhao-wealth" -Force | Remove-Item -Recurse -Force
Write-Output "Target cleaned"
```

Expected: 输出 `Target cleaned`，目录为空。

- [ ] **Step 4: Commit（备份不进 git，只记清理动作）**

```powershell
cd e:\code\basic
git add -A
git commit -m "chore(zhao-wealth): clean target dir before migration"
```

Expected: commit 成功。如无变更则跳过 commit。

---

## Task 2: 拷贝源码到目标目录

**Files:**
- 源：`e:\code\plugins\zhao-wealth\` 全部内容
- 目标：`e:\code\basic\plugins\zhao-wealth\`

- [ ] **Step 1: 拷贝源码（排除 dist/node_modules/package-lock.json）**

```powershell
$source = "e:\code\plugins\zhao-wealth"
$target = "e:\code\basic\plugins\zhao-wealth"
$exclude = @('dist', 'node_modules', 'package-lock.json')

robocopy $source $target /E /XD $exclude /XF package-lock.json
```

Expected: robocopy 退出码 1（表示成功拷贝了文件）。退出码 8+ 表示失败需停止。

- [ ] **Step 2: 验证关键文件已拷贝**

```powershell
Test-Path "e:\code\basic\plugins\zhao-wealth\package.json"
Test-Path "e:\code\basic\plugins\zhao-wealth\server\src\index.ts"
Test-Path "e:\code\basic\plugins\zhao-wealth\server\src\content-types\index.ts"
Test-Path "e:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts"
Test-Path "e:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts"
```

Expected: 全部 `True`。

- [ ] **Step 3: 验证 dist 和 node_modules 未拷贝**

```powershell
Test-Path "e:\code\basic\plugins\zhao-wealth\dist"
Test-Path "e:\code\basic\plugins\zhao-wealth\node_modules"
```

Expected: 两个都 `False`。

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth
git commit -m "feat(zhao-wealth): copy source from e:\code\plugins\zhao-wealth"
```

Expected: commit 成功，包含完整插件源码。

---

## Task 3: 安装依赖

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\package.json`（确认依赖）

- [ ] **Step 1: 查看 package.json 依赖**

```powershell
Get-Content "e:\code\basic\plugins\zhao-wealth\package.json" | Select-String -Pattern '"(bull|ioredis|axios|cheerio|luxon)"'
```

Expected: 输出包含这 5 个依赖项。若缺，下一步会补。

- [ ] **Step 2: 安装依赖**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npm install
```

Expected: 安装完成无致命错误。可能有 peerDependency 警告，忽略。

- [ ] **Step 3: 验证关键依赖可加载**

```powershell
cd e:\code\basic\plugins\zhao-wealth
node -e "require('bull'); require('ioredis'); require('axios'); require('cheerio'); require('luxon'); console.log('all deps ok')"
```

Expected: 输出 `all deps ok`。

- [ ] **Step 4: Commit（package-lock.json）**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/package-lock.json
git commit -m "chore(zhao-wealth): install dependencies"
```

Expected: commit 成功。

---

## Task 4: Fix 5 - 替换 UID 前缀（api:: → plugin::zhao-wealth.）

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/services/recommend-service.ts`（5 处）
- Modify: `basic/plugins/zhao-wealth/server/src/services/product.ts`（7 处）
- Modify: `basic/plugins/zhao-wealth/server/src/services/annual-snapshot.ts`（10 处）
- Modify: `basic/plugins/zhao-wealth/server/src/services/customer-product.ts`（9 处）
- Modify: `basic/plugins/zhao-wealth/server/src/services/nav-calculator.ts`（12 处）
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/nav.ts`（2 处）
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/collect.ts`（2 处，注意 collect.ts 还要重写降级，本 Task 先只改 UID）
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/collect-job.ts`（4 处）
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/calculate-job.ts`（2 处）

- [ ] **Step 1: 用 PowerShell 批量替换**

```powershell
$files = @(
  "e:\code\basic\plugins\zhao-wealth\server\src\services\recommend-service.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\services\product.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\services\customer-product.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\services\nav-calculator.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\controllers\nav.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\controllers\collect.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts",
  "e:\code\basic\plugins\zhao-wealth\server\src\jobs\calculate-job.ts"
)

foreach ($file in $files) {
  $content = Get-Content $file -Raw
  $new = $content -replace 'api::wealth-([a-z-]+)\.wealth-\1', 'plugin::zhao-wealth.wealth-$1'
  Set-Content -Path $file -Value $new -NoNewline
  Write-Output "Updated: $file"
}
```

Expected: 输出 9 行 `Updated: ...`。

- [ ] **Step 2: 验证替换完成（应返回 0 行）**

```powershell
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\**\*.ts" -Pattern "api::wealth"
```

Expected: 无任何输出（0 行匹配）。

- [ ] **Step 3: 验证新前缀已写入（应返回 51 行）**

```powershell
(Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\**\*.ts" -Pattern "plugin::zhao-wealth\.wealth").Count
```

Expected: `51`

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src
git commit -m "fix(zhao-wealth): replace api:: UID prefix with plugin::zhao-wealth (51 occurrences)"
```

Expected: commit 成功。

---

## Task 5: Fix 1 - 创建 9 个 schema.json 文件

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-company/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-collect-config/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-nav/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-money-income/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-annual-snapshot/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-yearly-return/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-customer-product/schema.json`
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-recommend-config/schema.json`

- [ ] **Step 1: 创建 wealth-company/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_companies",
  "info": {
    "singularName": "wealth-company",
    "pluralName": "wealth-companies",
    "displayName": "理财公司",
    "description": "银行理财公司信息管理"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "shortName": { "type": "string" },
    "companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary"], "default": "bank-subsidiary" },
    "website": { "type": "string" },
    "products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-product", "mappedBy": "company" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: 创建 wealth-product/schema.json**

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
    "productCode": { "type": "string", "unique": true, "required": true },
    "productName": { "type": "string", "required": true },
    "productType": { "type": "enumeration", "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund"], "required": true },
    "registerCode": { "type": "string", "unique": true },
    "riskLevel": { "type": "enumeration", "enum": ["R1", "R2", "R3", "R4", "R5"], "default": "R2" },
    "termType": { "type": "enumeration", "enum": ["short", "medium", "long"] },
    "issueDate": { "type": "date" },
    "maturityDate": { "type": "date" },
    "company": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-company", "inversedBy": "products" },
    "navs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-nav", "mappedBy": "product" },
    "moneyIncomes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-money-income", "mappedBy": "product" },
    "annualSnapshots": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-annual-snapshot", "mappedBy": "product" },
    "yearlyReturns": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-yearly-return", "mappedBy": "product" },
    "recommendWeight": { "type": "integer", "default": 0 },
    "recommendTags": { "type": "json" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 3: 创建 wealth-collect-config/schema.json**

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
    "product": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-wealth.wealth-product" },
    "collectMethod": { "type": "enumeration", "enum": ["web-crawler", "zip-pdf", "manual", "api"], "default": "web-crawler" },
    "collectUrl": { "type": "string" },
    "collectRules": { "type": "json" },
    "collectStatus": { "type": "enumeration", "enum": ["pending", "success", "failed"], "default": "pending" },
    "lastCollectTime": { "type": "datetime" },
    "failCount": { "type": "integer", "default": 0 },
    "failReason": { "type": "text" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 4: 创建 wealth-nav/schema.json**

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
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "navs" },
    "navDate": { "type": "date", "required": true },
    "unitNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "accNav": { "type": "decimal", "precision": 10, "scale": 4 },
    "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"], "default": "crawler" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 5: 创建 wealth-money-income/schema.json**

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
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "moneyIncomes" },
    "incomeDate": { "type": "date", "required": true },
    "tenThousandIncome": { "type": "decimal", "precision": 10, "scale": 6 },
    "sevenDayAnnual": { "type": "decimal", "precision": 10, "scale": 4 },
    "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"], "default": "crawler" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 6: 创建 wealth-annual-snapshot/schema.json**

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
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "annualSnapshots" },
    "snapshotDate": { "type": "date", "required": true },
    "annual1d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual3d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual7d": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual2w": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual1m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual3m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual6m": { "type": "decimal", "precision": 10, "scale": 6 },
    "annual1y": { "type": "decimal", "precision": 10, "scale": 6 },
    "isEstimate": { "type": "boolean", "default": false },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 7: 创建 wealth-yearly-return/schema.json**

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
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "yearlyReturns" },
    "year": { "type": "integer", "required": true },
    "annualReturn": { "type": "decimal", "precision": 10, "scale": 6 },
    "baseDays": { "type": "integer" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 8: 创建 wealth-customer-product/schema.json**

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
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product" },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" },
    "followTime": { "type": "datetime" },
    "sortOrder": { "type": "integer", "default": 0 },
    "remark": { "type": "string" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 9: 创建 wealth-recommend-config/schema.json**

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
    "product": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-wealth.wealth-product" },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" },
    "recommendOrder": { "type": "integer", "default": 0 },
    "recommendReason": { "type": "text" },
    "status": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 10: 验证 9 个 schema.json 已创建**

```powershell
Get-ChildItem -Path "e:\code\basic\plugins\zhao-wealth\server\src\content-types" -Recurse -Filter "schema.json" | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: `9`

- [ ] **Step 11: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types
git commit -m "feat(zhao-wealth): extract 9 schema.json files per project_memory hard constraint"
```

---

## Task 6: Fix 1 - 重写 content-types/index.ts 为 import 方式

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/content-types/index.ts`

- [ ] **Step 1: 用 import 方式重写 index.ts**

完整文件内容：

```typescript
'use strict';

import wealthCompany from './wealth-company/schema.json';
import wealthProduct from './wealth-product/schema.json';
import wealthCollectConfig from './wealth-collect-config/schema.json';
import wealthNav from './wealth-nav/schema.json';
import wealthMoneyIncome from './wealth-money-income/schema.json';
import wealthAnnualSnapshot from './wealth-annual-snapshot/schema.json';
import wealthYearlyReturn from './wealth-yearly-return/schema.json';
import wealthCustomerProduct from './wealth-customer-product/schema.json';
import wealthRecommendConfig from './wealth-recommend-config/schema.json';

export default {
  'wealth-company': { schema: wealthCompany },
  'wealth-product': { schema: wealthProduct },
  'wealth-collect-config': { schema: wealthCollectConfig },
  'wealth-nav': { schema: wealthNav },
  'wealth-money-income': { schema: wealthMoneyIncome },
  'wealth-annual-snapshot': { schema: wealthAnnualSnapshot },
  'wealth-yearly-return': { schema: wealthYearlyReturn },
  'wealth-customer-product': { schema: wealthCustomerProduct },
  'wealth-recommend-config': { schema: wealthRecommendConfig },
};
```

- [ ] **Step 2: 确认 tsconfig.json 启用 resolveJsonModule**

```powershell
Select-String -Path "e:\code\basic\plugins\zhao-wealth\tsconfig.json" -Pattern "resolveJsonModule"
```

Expected: 输出 `"resolveJsonModule": true`。若为 false 或缺失，编辑 tsconfig.json 在 compilerOptions 中加 `"resolveJsonModule": true`。

- [ ] **Step 3: 验证 TypeScript 编译通过**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误输出。若有错误，检查 schema.json 路径是否正确。

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/index.ts plugins/zhao-wealth/tsconfig.json
git commit -m "refactor(zhao-wealth): rewrite content-types/index.ts to import schema.json"
```

---

## Task 7: Fix 3 - 修复 calculateYearlyReturn bug

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/services/annual-snapshot.ts:84-119`

- [ ] **Step 1: 定位 bug 代码块**

```powershell
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts" -Pattern "yearStartNav"
```

Expected: 输出第 86、91 行附近的 `yearStartNav` / `yearEndNav` 查询，`where: { product: productId }` 缺少日期过滤。

- [ ] **Step 2: 替换 calculateYearlyReturn 中非货基分支**

将以下代码块（在 `} else {` 之后到 `calculateYearlyReturn` 结束的 `}` 之前）：

```typescript
      // 理财/普通基金年度收益计算
      const yearStartNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'asc' },
      });

      const yearEndNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
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
```

替换为：

```typescript
      // 理财/普通基金年度收益计算（修复：按当年日期范围过滤，避免取到全历史首尾）
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearStartNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: {
          product: productId,
          navDate: { $gte: yearStart, $lte: yearEnd },
        },
        orderBy: { navDate: 'asc' },
      });

      const yearEndNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: {
          product: productId,
          navDate: { $gte: yearStart, $lte: yearEnd },
        },
        orderBy: { navDate: 'desc' },
      });

      if (!yearStartNav || !yearEndNav) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年净值数据不完整`);
        return null;
      }

      const annualReturn = yearEndNav.unitNav / yearStartNav.unitNav - 1;
```

**变更要点**：
1. 在 `where` 中加 `navDate: { $gte: yearStart, $lte: yearEnd }` 限定当年范围
2. 删除 `startYear !== year || endYear !== year` 校验（已通过 where 限定保证）
3. `Math.pow(..., 365/365) - 1` 等价于直接除法，简化为 `yearEndNav.unitNav / yearStartNav.unitNav - 1`

- [ ] **Step 3: 验证 TypeScript 编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/annual-snapshot.ts
git commit -m "fix(zhao-wealth): calculateYearlyReturn now filters by year range instead of full history"
```

---

## Task 8: Fix 4 - 重写 utils/redis-client.ts 优雅降级

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/utils/redis-client.ts`

- [ ] **Step 1: 用以下完整内容覆盖 utils/redis-client.ts**

```typescript
'use strict';

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;
let redisAvailable: boolean | null = null; // null = 未检测, true = 可用, false = 不可用

/**
 * 获取 Redis 客户端（不可用时返回 null）
 */
export function getRedisClient(): Redis | null {
  if (redisAvailable === false) return null;
  if (!client) {
    try {
      client = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // 不自动重试
      });
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return client;
}

/**
 * 检测 Redis 是否可用（ping 失败时标记为不可用）
 */
export async function ensureRedisAvailable(): Promise<boolean> {
  if (redisAvailable === false) return false;
  const redis = getRedisClient();
  if (!redis) {
    redisAvailable = false;
    return false;
  }
  try {
    if (redis.status === 'wait' || redis.status === 'connect') {
      await redis.connect();
    }
    await redis.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

/**
 * 显式标记 Redis 不可用（用于队列初始化失败场景）
 */
export function markRedisUnavailable(): void {
  redisAvailable = false;
}

/**
 * 关闭 Redis 客户端
 */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      // 忽略关闭错误
    }
    client = null;
  }
  redisAvailable = null;
}

/**
 * 分布式锁获取（Redis 不可用时返回 false）
 */
export async function acquireLock(key: string, ttl: number): Promise<boolean> {
  if (!(await ensureRedisAvailable())) return false;
  try {
    const redis = client!;
    const result = await redis.set(key, 'locked', 'PX', ttl * 1000, 'NX');
    return result === 'OK';
  } catch {
    redisAvailable = false;
    return false;
  }
}

/**
 * 分布式锁释放（Redis 不可用时静默跳过）
 */
export async function releaseLock(key: string): Promise<void> {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}
```

- [ ] **Step 2: 更新 utils/index.ts 导出**

编辑 `basic/plugins/zhao-wealth/server/src/utils/index.ts`，在 `redis-client` 的 import 行加上 `ensureRedisAvailable` 和 `markRedisUnavailable`：

```typescript
import { getRedisClient, acquireLock, releaseLock, ensureRedisAvailable, markRedisUnavailable, closeRedisClient } from './redis-client';
```

并在 `export { ... }` 中加上这三个新函数。

完整文件应为：

```typescript
'use strict';

import { isTradingDay, getTradingDays, getPreviousTradingDay, getNaturalDays } from './trading-day';
import { calculateAnnualReturn, calculateMoneyFundAnnual, calculateYearlyReturn, isEstimateValue } from './annual-formula';
import { getRedisClient, acquireLock, releaseLock, ensureRedisAvailable, markRedisUnavailable, closeRedisClient } from './redis-client';
import { successResponse, errorResponse, paginatedResponse } from './response';

export {
  isTradingDay,
  getTradingDays,
  getPreviousTradingDay,
  getNaturalDays,
  calculateAnnualReturn,
  calculateMoneyFundAnnual,
  calculateYearlyReturn,
  isEstimateValue,
  getRedisClient,
  acquireLock,
  releaseLock,
  ensureRedisAvailable,
  markRedisUnavailable,
  closeRedisClient,
  successResponse,
  errorResponse,
  paginatedResponse,
};
```

- [ ] **Step 3: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/utils
git commit -m "fix(zhao-wealth): redis-client graceful degradation when Redis unavailable"
```

---

## Task 9: Fix 4 - 重写 jobs/queue-setup.ts

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/queue-setup.ts`

- [ ] **Step 1: 用以下完整内容覆盖 queue-setup.ts**

```typescript
'use strict';

import Queue from 'bull';
import { markRedisUnavailable } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;
let queueSetupFailed = false;

export function setupQueues(strapi: any) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
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
  } catch (error) {
    queueSetupFailed = true;
    markRedisUnavailable();
    strapi.log.warn(`[zhao-wealth] Bull队列初始化失败，队列功能将不可用: ${error.message}`);
  }
}

export function getCollectQueue(): Queue.Queue | null {
  return collectQueue;
}

export function getCalculateQueue(): Queue.Queue | null {
  return calculateQueue;
}

export function getRecalculateQueue(): Queue.Queue | null {
  return recalculateQueue;
}

export function isQueueAvailable(): boolean {
  return !queueSetupFailed && collectQueue !== null;
}
```

- [ ] **Step 2: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/jobs/queue-setup.ts
git commit -m "fix(zhao-wealth): queue-setup returns null instead of throwing when Redis unavailable"
```

---

## Task 10: Fix 4 - 重写 jobs/collect-job.ts 和 calculate-job.ts

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/collect-job.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/calculate-job.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/index.ts`

- [ ] **Step 1: 用以下完整内容覆盖 collect-job.ts**

```typescript
'use strict';

import { getCollectQueue } from './queue-setup';
import { getCollector } from '../collectors';
import { isTradingDay, acquireLock, releaseLock } from '../utils';

export function registerCollectJobs(strapi: any) {
  const queue = getCollectQueue();
  if (!queue) {
    strapi.log.warn('[zhao-wealth] collect queue 不可用，跳过 job 注册');
    return;
  }

  // 单产品采集
  queue.process('collect-single', async (job) => {
    const { productId } = job.data;

    const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
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
        await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
          data: {
            product: productId,
            ...nav,
          },
        });
      }

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
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
      if (calculateQueue) {
        calculateQueue.add('calculate-snapshot', { productId });
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品${productId}采集失败: ${error.message}`);

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
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
      strapi.log.warn('[zhao-wealth] 采集任务已在执行中或 Redis 不可用');
      return;
    }

    try {
      const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
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

- [ ] **Step 2: 用以下完整内容覆盖 calculate-job.ts**

```typescript
'use strict';

import { getCalculateQueue, getRecalculateQueue } from './queue-setup';
import { acquireLock, releaseLock } from '../utils';

export function registerCalculateJobs(strapi: any) {
  const queue = getCalculateQueue();
  if (!queue) {
    strapi.log.warn('[zhao-wealth] calculate queue 不可用，跳过 job 注册');
    return;
  }

  // 单产品当日快照计算
  queue.process('calculate-snapshot', async (job) => {
    const { productId } = job.data;

    const today = new Date();
    const snapshot = await strapi.service('plugin::zhao-wealth.nav-calculator').calculateSnapshot(productId, today);

    if (snapshot) {
      await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
      strapi.log.info(`[zhao-wealth] 产品${productId}年化快照计算完成`);
    }
  });

  // 单产品重算
  queue.process('recalculate-product', async (job) => {
    const { productId } = job.data;

    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
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
  if (!recalcQueue) {
    strapi.log.warn('[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all 注册');
    return;
  }

  recalcQueue.process('recalculate-all', async (job) => {
    const lockKey = 'wealth:recalculate:lock';
    const acquired = await acquireLock(lockKey, 60 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 重算任务已在执行中或 Redis 不可用');
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

- [ ] **Step 3: 用以下完整内容覆盖 jobs/index.ts**

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

- [ ] **Step 4: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 5: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/jobs
git commit -m "fix(zhao-wealth): jobs check queue null before process/add"
```

---

## Task 11: Fix 4 - 重写 controllers/collect.ts 加 503 降级

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/collect.ts`

- [ ] **Step 1: 用以下完整内容覆盖 controllers/collect.ts**

```typescript
'use strict';

import { successResponse, errorResponse } from '../utils';
import { getCollectQueue, getCalculateQueue, getRecalculateQueue } from '../jobs/queue-setup';

export default ({ strapi }) => ({
  /**
   * 触发采集（后台）
   */
  async trigger(ctx) {
    try {
      const { productId } = ctx.request.body;
      const queue = getCollectQueue();

      if (!queue) {
        ctx.status = 503;
        ctx.body = errorResponse(503, '采集服务暂不可用（Redis 未就绪）');
        return;
      }

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
        const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
          where: { product: Number(productId) },
        });

        ctx.body = successResponse(config);
      } else {
        const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
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
      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();

      if (productId && startDate && endDate) {
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        queue.add('recalculate-range', { productId, startDate, endDate });
        ctx.body = successResponse({ productId }, '指定范围重算任务已触发');
      } else if (productId) {
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        queue.add('recalculate-product', { productId });
        ctx.body = successResponse({ productId }, '单产品重算任务已触发');
      } else {
        if (!recalcQueue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        recalcQueue.add('recalculate-all', {});
        ctx.body = successResponse({}, '全量重算任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },
});
```

**注意**：原代码使用 `strapi.plugin('zhao-wealth').queue('wealth-collect')` 获取队列，但项目未在 plugin API 上注册 queue 访问器。改为直接从 `getCollectQueue()` 等导出函数获取，更直接。

- [ ] **Step 2: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/controllers/collect.ts
git commit -m "fix(zhao-wealth): controllers/collect returns 503 when queue unavailable"
```

---

## Task 12: Fix 2 - 重写 bootstrap.ts 加 Cron

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/bootstrap.ts`

- [ ] **Step 1: 用以下完整内容覆盖 bootstrap.ts**

```typescript
'use strict';

import jobs from './jobs';
import { isTradingDay } from './utils';
import { getCollectQueue, getCalculateQueue } from './jobs/queue-setup';

export default ({ strapi }) => {
  // 初始化队列任务
  jobs({ strapi });

  // 注册 Cron 定时任务
  // 8:00 交易日判断（仅日志）
  strapi.cron.add({
    'wealth-trading-day-check': {
      task: ({ strapi }) => {
        const today = new Date();
        const isTrading = isTradingDay(today);
        strapi.log.info(`[zhao-wealth] 交易日检查: ${today.toISOString().slice(0, 10)} ${isTrading ? '是交易日' : '非交易日'}`);
      },
      options: '0 8 * * *',
    },
  });

  // 18:00 交易日采集触发
  strapi.cron.add({
    'wealth-collect-trigger': {
      task: ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过采集');
          return;
        }

        const queue = getCollectQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 采集队列不可用（Redis 未就绪），跳过');
          return;
        }

        queue.add('collect-all', {});
        strapi.log.info('[zhao-wealth] 18:00 采集任务已触发');
      },
      options: '0 18 * * *',
    },
  });

  // 20:00 交易日年化快照计算
  strapi.cron.add({
    'wealth-calculate-trigger': {
      task: async ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过年化计算');
          return;
        }

        const queue = getCalculateQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过');
          return;
        }

        const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: { status: true },
        });

        for (const product of products) {
          queue.add('calculate-snapshot', { productId: product.id });
        }

        strapi.log.info(`[zhao-wealth] 20:00 年化计算任务已触发，${products.length}个产品`);
      },
      options: '0 20 * * *',
    },
  });

  strapi.log.info('[zhao-wealth] 插件已启动');
};
```

- [ ] **Step 2: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/bootstrap.ts
git commit -m "feat(zhao-wealth): register 3 cron tasks (8:00/18:00/20:00) per design 7.1"
```

---

## Task 13: Fix 6 - 启动验证

**Files:**
- 验证日志和数据库表

- [ ] **Step 1: 启动 basic 项目（dev 模式自动编译 TS）**

```powershell
cd e:\code\basic
npm run dev
```

等待 Strapi 启动日志稳定（约 30-60 秒）。

Expected:
- 日志含 `[zhao-wealth] 插件已启动`
- 若 Redis 不可用：日志含 `[zhao-wealth] Bull队列初始化失败，队列功能将不可用`
- 若 Redis 可用：日志含 `[zhao-wealth] Bull队列初始化完成`
- 无致命错误（FATAL / unhandledRejection）

如果出现 TS 编译错误，根据错误信息修正对应文件后重启。

- [ ] **Step 2: 验证 9 张数据表已创建**

在另一个终端执行：

```powershell
cd e:\code\basic
node -e "const knex = require('./node_modules/strapi').database; knex.raw(\"SELECT tablename FROM pg_tables WHERE tablename LIKE 'wealth_%' ORDER BY tablename\").then(r => { console.log(r.rows); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"
```

Expected: 输出 9 张表：`wealth_annual_snapshots`、`wealth_collect_configs`、`wealth_companies`、`wealth_customer_products`、`wealth_money_incomes`、`wealth_navs`、`wealth_products`、`wealth_recommend_configs`、`wealth_yearly_returns`。

若表未自动创建，需触发 schema 强制重建（删除 `strapi_database_schema` 表中 `plugin::zhao-wealth` 相关记录后重启 Strapi）。

- [ ] **Step 3: 验证路由注册**

```powershell
curl -s -o NUL -w "%{http_code}" http://localhost:1337/api/v1/wealth/products
```

Expected: 401 或 403（表示路由已注册但需鉴权）。返回 404 表示路由未注册，需检查 `routes/index.ts`。

- [ ] **Step 4: 验证后台路由注册**

```powershell
curl -s -o NUL -w "%{http_code}" http://localhost:1337/wealth-admin/v1/companies
```

Expected: 401 或 403。

- [ ] **Step 5: 验证 admin panel 中插件菜单可见**

打开浏览器访问 `http://localhost:1337/admin`，登录后在左侧菜单查找"理财"或"Wealth"分类。

Expected: 菜单中可见插件入口。若不可见，检查 `admin/src/index.ts` 的 menu 注册配置。

- [ ] **Step 6: 验证 UID 修复生效（无 db.query 报错）**

调用任意一个 C 端接口（即使鉴权失败，db.query 错误会在日志中暴露）：

```powershell
curl -s http://localhost:1337/api/v1/wealth/products
```

检查 Strapi 日志：
- 不应出现 `Cannot find content type: api::wealth-xxx` 类错误
- 鉴权失败错误（401/403）是正常的

- [ ] **Step 7: 若 Redis 可用，验证队列任务可触发**

跳过此步如果 Redis 未配置。如配置了 Redis，在 admin panel 触发一次采集，观察日志：

Expected: 日志含 `[zhao-wealth] 全量采集任务分发完成` 或 `产品xxx采集成功`。

- [ ] **Step 8: 停止 dev 服务器**

Ctrl+C 停止 npm run dev。

- [ ] **Step 9: Commit（如有启动修复）**

```powershell
cd e:\code\basic
git status
git add -A
git commit -m "fix(zhao-wealth): startup verification fixes" -m "如有问题修复后填写具体变更"
```

若 `git status` 显示无变更，跳过此 commit。

---

## Task 14: 验收清单核对与最终 commit

- [ ] **Step 1: 逐项核对验收清单**

```powershell
# 验证 UID 替换完成
(Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\**\*.ts" -Pattern "api::wealth").Count
```

Expected: `0`

```powershell
# 验证 9 个 schema.json 存在
Get-ChildItem -Path "e:\code\basic\plugins\zhao-wealth\server\src\content-types" -Recurse -Filter "schema.json" | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: `9`

```powershell
# 验证 calculateYearlyReturn bug 已修
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\services\annual-snapshot.ts" -Pattern "navDate: { \$gte: yearStart"
```

Expected: 至少 2 行匹配（yearStartNav 和 yearEndNav 各一处）。

```powershell
# 验证 bootstrap.ts 含 3 个 Cron
(Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts" -Pattern "strapi.cron.add").Count
```

Expected: `3`

```powershell
# 验证队列返回类型为 nullable
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\jobs\queue-setup.ts" -Pattern "Queue \| null"
```

Expected: 至少 3 行匹配（三个 get 函数返回类型）。

- [ ] **Step 2: 跑一次完整启动 + 接口 smoke test**

```powershell
cd e:\code\basic
npm run dev
```

新终端：

```powershell
# C 端路由（应 401/403）
curl -s -o NUL -w "products: %{http_code}`n" http://localhost:1337/api/v1/wealth/products
curl -s -o NUL -w "navs: %{http_code}`n" http://localhost:1337/api/v1/wealth/navs

# 后台路由（应 401/403）
curl -s -o NUL -w "admin companies: %{http_code}`n" http://localhost:1337/wealth-admin/v1/companies
```

Expected: 三个都返回 401 或 403。

- [ ] **Step 3: 停止服务并最终 commit**

```powershell
cd e:\code\basic
git log --oneline -15
```

Expected: 看到 Task 1-13 的所有 commit 信息。

```powershell
git status
```

Expected: working tree clean（或仅有未跟踪的 .bak 目录，应加入 .gitignore）。

- [ ] **Step 4: 清理备份目录（可选）**

```powershell
$timestamp = Get-Date -Format "yyyyMMdd"
Remove-Item -Path "e:\code\basic\plugins\zhao-wealth.bak.$timestamp" -Recurse -Force
Write-Output "Backup removed"
```

Expected: 输出 `Backup removed`。

---

## Self-Review

**1. Spec 覆盖检查**：

| Spec 项 | 对应 Task |
|---|---|
| 二、迁移策略（文件迁移 + 依赖安装） | Task 1, 2, 3 |
| 3.1 Fix 1: 9 个 schema.json | Task 5 |
| 3.1 Fix 1: 重写 index.ts | Task 6 |
| 3.2 Fix 2: bootstrap Cron | Task 12 |
| 3.3 Fix 3: calculateYearlyReturn | Task 7 |
| 3.4 Fix 4: redis-client | Task 8 |
| 3.4 Fix 4: queue-setup | Task 9 |
| 3.4 Fix 4: collect-job/calculate-job | Task 10 |
| 3.4 Fix 4: controllers/collect 503 | Task 11 |
| 3.5 Fix 5: UID 前缀 | Task 4 |
| 3.6 Fix 6: 启动验证 | Task 13 |
| 六、验收标准 | Task 14 |

无遗漏。

**2. 占位符扫描**：无 TBD/TODO/"implement later"，所有代码块均完整。

**3. 类型一致性**：
- `getCollectQueue()` / `getCalculateQueue()` / `getRecalculateQueue()` 在 Task 9 改为返回 `Queue.Queue | null`，在 Task 10/11/12 调用端均做了判空。✅
- `ensureRedisAvailable` / `markRedisUnavailable` / `closeRedisClient` 在 Task 8 新增并在 utils/index.ts 导出。✅
- `isQueueAvailable` 在 Task 9 新增但未在 Task 10/11 使用（用 `if (!queue)` 替代），保留以备未来扩展。✅

**4. 已知限制**：
- Task 13 启动验证可能暴露 Strapi v5 db.query relation filter 不稳定问题（spec 5.1 风险点）。若发现，按 project_memory 经验改用 knex 直查，超出本计划范围。
- cbhb-collector 的 CSS selector 是占位符，采集会失败但不影响启动（spec 已明确不修复）。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-30-zhao-wealth-migration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent 执行，Task 间 review，快速迭代

**2. Inline Execution** - 在当前会话按 Task 顺序执行，分批 checkpoint review

Which approach?
