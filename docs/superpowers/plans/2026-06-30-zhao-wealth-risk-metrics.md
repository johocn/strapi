# zhao-wealth 业绩归因增量 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-wealth 插件新增 4 项业绩归因指标（波动率/最大回撤/夏普比率/同类排名百分位）× 4 周期（1m/3m/6m/1y），每日 20:30 自动计算并暴露 C 端查询接口。

**Architecture:** 新建独立长表 `wealth_risk_metrics` 存储指标（避免 wealth_annual_snapshots 字段膨胀）。新增 risk-metric-service 负责 4 项指标计算与批量重算，risk-metric-job 在 20:30 队列任务中调用 service。复用现有 wealth-calculate 队列。Redis 不可用时降级，C 端查询接口仍可读历史数据。

**Tech Stack:** Strapi v5、TypeScript、Bull、PostgreSQL、Decimal.js（可选，本期用原生 Number）

**Spec:** [2026-06-30-zhao-wealth-risk-metrics-design.md](file:///e:/code/docs/superpowers/specs/2026-06-30-zhao-wealth-risk-metrics-design.md)

**Environment Notes:**
- 工作目录：e:\code
- basic 是 git 仓库，工作区有大量无关改动，所有 commit 必须用 `git add plugins/zhao-wealth` 精确暂存，绝不用 `git add -A`
- PowerShell 命令语法（不用 `&&`，用 `;` 分隔）
- 插件路径：e:\code\basic\plugins\zhao-wealth
- 修改 TS 后必须 `cd plugins/zhao-wealth; npm run build` 才能让 Strapi 加载（dev 模式不自动编译这个插件）
- 项目无单元测试框架，改用启动验证 + 接口 smoke test + 手工计算对比
- Redis 可用（本地 6379 已验证）

---

## File Structure

新增/修改文件清单（迁移已完成，以下基于迁移后的代码状态）：

```
basic/plugins/zhao-wealth/server/src/
├── config.ts                                   [新增] 插件配置（riskFreeRate 等）
├── content-types/
│   ├── wealth-risk-metric/
│   │   └── schema.json                         [新增] 风险指标表 schema
│   ├── wealth-product/schema.json              [修改] 加 riskMetrics 反向关系
│   └── index.ts                                [修改] 注册 wealth-risk-metric
├── services/
│   ├── risk-metric-service.ts                  [新增] 4 项指标计算 + 批量重算
│   └── index.ts                                [修改] 注册 risk-metric-service
├── controllers/
│   ├── risk-metric.ts                          [新增] C 端查询 + 后台触发重算
│   └── index.ts                                [修改] 注册 risk-metric controller
├── routes/
│   ├── content-api.ts                          [修改] 加 GET /v1/wealth/products/:id/risk-metrics
│   └── admin-api.ts                            [修改] 加 POST /recalculate 接口扩展
├── jobs/
│   ├── risk-metric-job.ts                      [新增] 每日 20:30 队列任务
│   └── index.ts                                [修改] 注册 risk-metric-job
├── bootstrap.ts                                [修改] 加 20:30 Cron
└── database/migrations/
    └── 001_add_risk_metric_unique_index.js     [新增] 复合唯一索引迁移
```

---

## Task 1: 创建 config.ts 配置文件

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/config.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
'use strict';

export default {
  // 夏普比率的无风险利率（默认 2%，可通过环境变量覆盖）
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  // 计算周期列表
  riskMetricPeriods: ['1m', '3m', '6m', '1y'] as const,
  // 批量计算并发数
  riskMetricBatchConcurrency: 5,
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
git add plugins/zhao-wealth/server/src/config.ts
git commit -m "feat(zhao-wealth): add config.ts for risk metrics (riskFreeRate, periods, concurrency)"
```

---

## Task 2: 创建 wealth-risk-metric content-type schema

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/content-types/wealth-risk-metric/schema.json`

- [ ] **Step 1: 创建 schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_risk_metrics",
  "info": {
    "singularName": "wealth-risk-metric",
    "pluralName": "wealth-risk-metrics",
    "displayName": "风险指标",
    "description": "业绩归因指标（波动率/最大回撤/夏普/同类排名）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-wealth.wealth-product",
      "inversedBy": "riskMetrics"
    },
    "snapshotDate": {
      "type": "date",
      "required": true
    },
    "period": {
      "type": "enumeration",
      "enum": ["1m", "3m", "6m", "1y"],
      "required": true
    },
    "metricName": {
      "type": "enumeration",
      "enum": ["volatility", "maxDrawdown", "sharpe", "rankPercentile"],
      "required": true
    },
    "metricValue": {
      "type": "decimal",
      "precision": 12,
      "scale": 6
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: 修改 wealth-product/schema.json 加反向关系**

在 `e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json` 的 `attributes` 对象中，在 `yearlyReturns` 字段后追加：

```json
"riskMetrics": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-wealth.wealth-risk-metric",
  "mappedBy": "product"
},
```

注意逗号位置：`yearlyReturns` 字段后加逗号，再加 `riskMetrics`。

- [ ] **Step 3: 修改 content-types/index.ts 注册新 content-type**

编辑 `e:\code\basic\plugins\zhao-wealth\server\src\content-types\index.ts`，在 import 部分加：

```typescript
import wealthRiskMetric from './wealth-risk-metric/schema.json';
```

在 export default 对象末尾加（`wealth-recommend-config` 后）：

```typescript
'wealth-risk-metric': { schema: wealthRiskMetric },
```

- [ ] **Step 4: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 5: Build 并启动验证表创建**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npm run build
```

启动 Strapi（如果之前已停）：
```powershell
cd e:\code\basic
npm run dev
```

等待启动后，检查日志应包含 wealth-risk-metric 加载信息，且无 schema 错误。

- [ ] **Step 6: 验证表已创建**

新终端执行（需要 pg 模块，复用 basic 的 node_modules）：

```powershell
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`SELECT tablename FROM pg_tables WHERE tablename LIKE 'wealth_risk%' ORDER BY tablename`).then(r => { console.log(r.rows.map(x => x.tablename)); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); })"
```

Expected: 输出类似 `['wealth_risk_metrics', 'wealth_risk_metrics_product_lnk']`。

- [ ] **Step 7: 停止 Strapi**

Ctrl+C 或用 StopCommand 停止 dev 服务器。

- [ ] **Step 8: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types
git commit -m "feat(zhao-wealth): add wealth-risk-metric content-type with 4 metrics x 4 periods"
```

---

## Task 3: 创建迁移脚本添加复合唯一索引

**Files:**
- Create: `basic/plugins/zhao-wealth/server/database/migrations/001_add_risk_metric_unique_index.js`

- [ ] **Step 1: 创建 migrations 目录和文件**

```javascript
'use strict';

module.exports = {
  /**
   * 为 wealth_risk_metrics 表添加复合唯一索引
   * (product_id, snapshot_date, period, metric_name)
   * 防止同日同周期同指标重复写入
   */
  async up(db) {
    await db.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS wealth_risk_metrics_unique_idx
      ON wealth_risk_metrics (product_id, snapshot_date, period, metric_name)
    `);
  },

  async down(db) {
    await db.raw(`
      DROP INDEX IF EXISTS wealth_risk_metrics_unique_idx
    `);
  },
};
```

**注意**：根据 project_memory 记录，zhao-common 的 bootstrap 会按插件依赖顺序执行所有 pending migrations。此迁移脚本会被自动加载执行。

- [ ] **Step 2: 检查 zhao-common migration-runner 是否会扫描此目录**

用 Grep 搜索 `e:\code\basic\plugins\zhao-common\server\src` 中的 `migrations` 关键字，确认 migration-runner 是否扫描各插件的 `server/database/migrations/` 目录。

如果没有自动扫描机制，需要在 zhao-wealth 的 bootstrap.ts 中手动调用迁移执行。

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/database/migrations/001_add_risk_metric_unique_index.js
git commit -m "feat(zhao-wealth): add migration for risk_metrics composite unique index"
```

---

## Task 4: 创建 risk-metric-service.ts（核心计算逻辑）

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/services/risk-metric-service.ts`

- [ ] **Step 1: 创建 risk-metric-service.ts**

```typescript
'use strict';

import pluginConfig from '../config';

/**
 * 周期对应的天数
 */
const PERIOD_DAYS: Record<string, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

/**
 * 计算日期范围 [startDate, endDate]
 * endDate 为 snapshotDate，startDate = snapshotDate - periodDays
 */
function getPeriodRange(snapshotDate: Date, period: string): { start: Date; end: Date } {
  const days = PERIOD_DAYS[period];
  const end = new Date(snapshotDate);
  const start = new Date(snapshotDate);
  start.setDate(start.getDate() - days);
  return { start, end };
}

/**
 * 计算波动率
 * std(dailyReturns) × sqrt(250)
 */
function calculateVolatility(navs: { navDate: string; unitNav: number }[]): number | null {
  if (navs.length < 2) return null;

  // 按日期升序
  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());

  // 计算每日收益率
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].unitNav;
    const curr = sorted[i].unitNav;
    if (prev <= 0) return null;
    returns.push(curr / prev - 1);
  }

  // 标准差（样本标准差，n-1）
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const std = Math.sqrt(variance);

  // 年化
  return std * Math.sqrt(250);
}

/**
 * 计算最大回撤
 * max((peak - trough) / peak)
 * 返回负数（如 -0.05 表示 -5%）
 */
function calculateMaxDrawdown(navs: { navDate: string; unitNav: number }[]): number | null {
  if (navs.length < 2) return null;

  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());

  let peak = sorted[0].unitNav;
  let maxDrawdown = 0;

  for (const nav of sorted) {
    if (nav.unitNav > peak) {
      peak = nav.unitNav;
    }
    if (peak > 0) {
      const drawdown = (peak - nav.unitNav) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return -maxDrawdown; // 返回负数
}

/**
 * 计算夏普比率
 * (annualReturn - riskFreeRate) / volatility
 */
function calculateSharpe(annualReturn: number | null, volatility: number | null, riskFreeRate: number): number | null {
  if (annualReturn === null || volatility === null || volatility === 0) return null;
  return (annualReturn - riskFreeRate) / volatility;
}

export default ({ strapi }) => ({
  /**
   * 计算单个产品单个周期的 4 项指标
   * 返回 { volatility, maxDrawdown, sharpe, rankPercentile }
   * rankPercentile 需要在 calculateRankPercentile 中分组计算后填充
   */
  async calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
    volatility: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
    annualReturn: number | null;
  }> {
    const { start, end } = getPeriodRange(snapshotDate, period);

    // 取 period 内的净值
    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: productId,
        navDate: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) },
      },
      orderBy: { navDate: 'asc' },
    });

    const volatility = calculateVolatility(navs);
    const maxDrawdown = calculateMaxDrawdown(navs);

    // 取对应周期的年化收益（从 wealth-annual-snapshot）
    const annualField = `annual${period}`;
    const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: {
        product: productId,
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
      },
    });

    const annualReturn = snapshot ? snapshot[annualField] : null;

    const sharpe = calculateSharpe(annualReturn, volatility, pluginConfig.riskFreeRate);

    return { volatility, maxDrawdown, sharpe, annualReturn };
  },

  /**
   * 计算同类排名百分位
   * 按 productType 分组，按同期 annualReturn 降序排名
   * rankPercentile = (rank / total) × 100
   */
  async calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<number | null> {
    const annualField = `annual${period}`;

    // 取当前产品
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return null;

    // 取同类所有产品当日快照（含产品信息用于 productType 过滤）
    const snapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
      where: {
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        product: { productType: product.productType },
      },
      populate: ['product'],
    });

    // 过滤掉 annualReturn 为 null 的
    const valid = snapshots.filter(s => s[annualField] !== null && s[annualField] !== undefined);

    if (valid.length < 2) return null;

    // 按 annualReturn 降序排序
    const sorted = valid.sort((a, b) => b[annualField] - a[annualField]);

    // 找到当前产品的排名
    const rank = sorted.findIndex(s => s.product.id === productId) + 1;

    if (rank === 0) return null; // 当前产品不在列表中

    return (rank / valid.length) * 100;
  },

  /**
   * 计算单个产品的所有 4 周期 × 4 指标并写入数据库
   */
  async calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void> {
    const dateStr = snapshotDate.toISOString().slice(0, 10);
    const periods = pluginConfig.riskMetricPeriods;

    for (const period of periods) {
      const metrics = await this.calculateMetricsForPeriod(productId, snapshotDate, period);
      const rankPercentile = await this.calculateRankPercentile(productId, snapshotDate, period);

      const metricEntries: { metricName: string; metricValue: number | null }[] = [
        { metricName: 'volatility', metricValue: metrics.volatility },
        { metricName: 'maxDrawdown', metricValue: metrics.maxDrawdown },
        { metricName: 'sharpe', metricValue: metrics.sharpe },
        { metricName: 'rankPercentile', metricValue: rankPercentile },
      ];

      for (const entry of metricEntries) {
        // 先删除同日同周期同指标的旧记录（upsert 语义）
        await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').delete({
          where: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
          },
        });

        // 写入新记录（即使 metricValue 为 null 也写入，表示已计算但无数据）
        await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').create({
          data: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
            metricValue: entry.metricValue,
          },
        });
      }
    }

    strapi.log.info(`[zhao-wealth] 产品${productId}风险指标计算完成`);
  },

  /**
   * 批量计算当日所有产品的风险指标
   */
  async calculateAllForDate(snapshotDate: Date): Promise<void> {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      where: { status: true },
    });

    strapi.log.info(`[zhao-wealth] 开始计算 ${products.length} 个产品的风险指标`);

    for (const product of products) {
      try {
        await this.calculateAndSaveMetrics(product.id, snapshotDate);
      } catch (error) {
        strapi.log.error(`[zhao-wealth] 产品${product.id}风险指标计算失败: ${error.message}`);
      }
    }

    strapi.log.info(`[zhao-wealth] 风险指标批量计算完成`);
  },

  /**
   * 全量重算（补全历史数据）
   * 遍历所有有净值数据的历史日期
   */
  async recalculateAll(): Promise<void> {
    // 取所有有净值的日期（去重）
    const navDates = await strapi.db.connection.raw(`
      SELECT DISTINCT nav_date FROM wealth_navs ORDER BY nav_date ASC
    `);

    const dates = navDates.rows.map((r: { nav_date: string }) => new Date(r.nav_date));

    strapi.log.info(`[zhao-wealth] 全量重算风险指标，共 ${dates.length} 个日期`);

    for (const date of dates) {
      await this.calculateAllForDate(date);
    }

    strapi.log.info(`[zhao-wealth] 全量重算完成`);
  },
});
```

- [ ] **Step 2: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。若 `import pluginConfig from '../config'` 报错，检查 config.ts 是否正确导出 default。

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts
git commit -m "feat(zhao-wealth): add risk-metric-service with 4 metrics calculation (volatility/maxDrawdown/sharpe/rankPercentile)"
```

---

## Task 5: 注册 risk-metric-service 到 services/index.ts

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/services/index.ts`

- [ ] **Step 1: 修改 services/index.ts**

完整文件内容：

```typescript
'use strict';

import product from './product';
import navCalculator from './nav-calculator';
import annualSnapshot from './annual-snapshot';
import recommendService from './recommend-service';
import customerProduct from './customer-product';
import riskMetricService from './risk-metric-service';

export default {
  product,
  'nav-calculator': navCalculator,
  'annual-snapshot': annualSnapshot,
  'recommend-service': recommendService,
  'customer-product': customerProduct,
  'risk-metric-service': riskMetricService,
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
git add plugins/zhao-wealth/server/src/services/index.ts
git commit -m "feat(zhao-wealth): register risk-metric-service in services index"
```

---

## Task 6: 创建 risk-metric controller

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/controllers/risk-metric.ts`

- [ ] **Step 1: 创建 risk-metric.ts**

```typescript
'use strict';

import { successResponse, errorResponse } from '../utils';
import { getCalculateQueue, getRecalculateQueue } from '../jobs/queue-setup';

export default ({ strapi }) => ({
  /**
   * C 端查询：获取产品的风险指标
   * GET /v1/wealth/products/:id/risk-metrics?period=1m,3m,6m,1y
   */
  async getMetrics(ctx) {
    try {
      const { id } = ctx.params;
      const periodQuery = ctx.query.period as string;
      const periods = periodQuery
        ? periodQuery.split(',').map(p => p.trim())
        : ['1m', '3m', '6m', '1y'];

      const validPeriods = ['1m', '3m', '6m', '1y'];
      const invalidPeriods = periods.filter(p => !validPeriods.includes(p));
      if (invalidPeriods.length > 0) {
        ctx.status = 400;
        ctx.body = errorResponse(400, `无效的周期: ${invalidPeriods.join(', ')}`);
        return;
      }

      // 取每个周期最新的风险指标（按 snapshotDate 降序取第一条）
      const result: Record<string, any> = {};

      for (const period of periods) {
        const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
        const periodData: any = {};

        for (const metricName of metricNames) {
          const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
            where: {
              product: Number(id),
              period,
              metricName,
            },
            orderBy: { snapshotDate: 'desc' },
            limit: 1,
          });

          periodData[metricName] = records.length > 0 ? records[0].metricValue : null;
        }

        result[period] = periodData;
      }

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询风险指标失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 后台触发：重算风险指标
   * POST /wealth-admin/v1/recalculate
   * body: { productId?, type: 'risk-metric' | 'all' }
   */
  async recalculate(ctx) {
    try {
      const { productId, type } = ctx.request.body;

      if (type !== 'risk-metric' && type !== 'all') {
        ctx.status = 400;
        ctx.body = errorResponse(400, "type 必须为 'risk-metric' 或 'all'");
        return;
      }

      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();

      if (productId) {
        // 单产品重算
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        queue.add('recalculate-risk-metric-product', { productId });
        ctx.body = successResponse({ productId }, '单产品风险指标重算任务已触发');
      } else {
        // 全量重算
        if (!recalcQueue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        recalcQueue.add('recalculate-all-risk-metrics', {});
        ctx.body = successResponse({}, '全量风险指标重算任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发风险指标重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },
});
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
git add plugins/zhao-wealth/server/src/controllers/risk-metric.ts
git commit -m "feat(zhao-wealth): add risk-metric controller with C-end query and admin recalculate"
```

---

## Task 7: 注册 risk-metric controller 到 controllers/index.ts

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/index.ts`

- [ ] **Step 1: 修改 controllers/index.ts**

完整文件内容：

```typescript
'use strict';

import product from './product';
import nav from './nav';
import annual from './annual';
import recommend from './recommend';
import customerProduct from './customer-product';
import collect from './collect';
import adminApi from './admin-api';
import riskMetric from './risk-metric';

export default {
  product,
  nav,
  annual,
  recommend,
  'customer-product': customerProduct,
  collect,
  'admin-api': adminApi,
  'risk-metric': riskMetric,
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
git add plugins/zhao-wealth/server/src/controllers/index.ts
git commit -m "feat(zhao-wealth): register risk-metric controller"
```

---

## Task 8: 注册路由

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/routes/content-api.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/routes/admin-api.ts`

- [ ] **Step 1: 在 content-api.ts 末尾加风险指标查询路由**

在 `e:\code\basic\plugins\zhao-wealth\server\src\routes\content-api.ts` 的 `routes` 数组末尾（最后一个 `}` 后加逗号）追加：

```typescript
    // 风险指标查询
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/risk-metrics',
      handler: 'risk-metric.getMetrics',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
```

- [ ] **Step 2: 在 admin-api.ts 加风险指标重算路由**

在 `e:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts` 的 `routes` 数组中找到现有的 `/recalculate` 路由，修改为支持 `type` 参数。如果已有 `/recalculate` 路由，改为指向 `risk-metric.recalculate`；如果没有，在末尾追加：

```typescript
    // 风险指标重算
    {
      method: 'POST',
      path: '/recalculate-risk-metric',
      handler: 'risk-metric.recalculate',
    },
```

**注意**：不修改现有的 `/recalculate` 路由（那是年化重算），新增独立的 `/recalculate-risk-metric` 路由避免破坏现有功能。

- [ ] **Step 3: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/routes
git commit -m "feat(zhao-wealth): add risk-metrics routes (C-end query + admin recalculate)"
```

---

## Task 9: 创建 risk-metric-job.ts

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/jobs/risk-metric-job.ts`

- [ ] **Step 1: 创建 risk-metric-job.ts**

```typescript
'use strict';

import { getCalculateQueue, getRecalculateQueue } from './queue-setup';
import { acquireLock, releaseLock } from '../utils';

export function registerRiskMetricJobs(strapi: any) {
  // 单产品当日风险指标计算
  const calcQueue = getCalculateQueue();
  if (calcQueue) {
    calcQueue.process('calculate-risk-metric', async (job) => {
      const { productId, snapshotDate } = job.data;
      const date = snapshotDate ? new Date(snapshotDate) : new Date();
      await strapi.service('plugin::zhao-wealth.risk-metric-service').calculateAndSaveMetrics(productId, date);
    });

    // 单产品重算风险指标
    calcQueue.process('recalculate-risk-metric-product', async (job) => {
      const { productId } = job.data;
      // 重算所有历史日期
      const navDates = await strapi.db.connection.raw(`
        SELECT DISTINCT nav_date FROM wealth_navs WHERE product_id = ? ORDER BY nav_date ASC
      `, [productId]);

      for (const row of navDates.rows) {
        await strapi.service('plugin::zhao-wealth.risk-metric-service').calculateAndSaveMetrics(productId, new Date(row.nav_date));
      }

      strapi.log.info(`[zhao-wealth] 产品${productId}风险指标重算完成`);
    });
  } else {
    strapi.log.warn('[zhao-wealth] calculate queue 不可用，跳过 risk-metric job 注册');
  }

  // 全量重算风险指标
  const recalcQueue = getRecalculateQueue();
  if (recalcQueue) {
    recalcQueue.process('recalculate-all-risk-metrics', async (job) => {
      const lockKey = 'wealth:recalculate-risk-metric:lock';
      const acquired = await acquireLock(lockKey, 60 * 60);

      if (!acquired) {
        strapi.log.warn('[zhao-wealth] 风险指标重算任务已在执行中或 Redis 不可用');
        return;
      }

      try {
        await strapi.service('plugin::zhao-wealth.risk-metric-service').recalculateAll();
      } finally {
        await releaseLock(lockKey);
      }
    });
  } else {
    strapi.log.warn('[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all-risk-metrics 注册');
  }
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
git add plugins/zhao-wealth/server/src/jobs/risk-metric-job.ts
git commit -m "feat(zhao-wealth): add risk-metric-job for daily calculation and recalculation"
```

---

## Task 10: 注册 risk-metric-job 到 jobs/index.ts

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/index.ts`

- [ ] **Step 1: 修改 jobs/index.ts**

完整文件内容：

```typescript
'use strict';

import { setupQueues } from './queue-setup';
import { registerCollectJobs } from './collect-job';
import { registerCalculateJobs } from './calculate-job';
import { registerRiskMetricJobs } from './risk-metric-job';

export default ({ strapi }) => {
  setupQueues(strapi);
  registerCollectJobs(strapi);
  registerCalculateJobs(strapi);
  registerRiskMetricJobs(strapi);
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
git add plugins/zhao-wealth/server/src/jobs/index.ts
git commit -m "feat(zhao-wealth): register risk-metric-job in jobs index"
```

---

## Task 11: 在 bootstrap.ts 加 20:30 Cron

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/bootstrap.ts`

- [ ] **Step 1: 在 bootstrap.ts 中加第 4 个 Cron**

在 `e:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts` 中，在 `20:00 wealth-calculate-trigger` Cron 之后、`strapi.log.info('[zhao-wealth] 插件已启动')` 之前，追加：

```typescript
  // 20:30 交易日风险指标计算
  strapi.cron.add({
    'wealth-risk-metric-trigger': {
      task: async ({ strapi }) => {
        const today = new Date();
        // 复用 trading-day 工具判断
        const { isTradingDay } = require('./utils');
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过风险指标计算');
          return;
        }

        const queue = getCalculateQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过风险指标计算');
          return;
        }

        const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: { status: true },
        });

        for (const product of products) {
          queue.add('calculate-risk-metric', { productId: product.id, snapshotDate: today });
        }

        strapi.log.info(`[zhao-wealth] 20:30 风险指标计算任务已触发，${products.length}个产品`);
      },
      options: '30 20 * * *',
    },
  });
```

**注意**：bootstrap.ts 已 import `getCollectQueue, getCalculateQueue`，无需额外 import。`isTradingDay` 用 require 方式引入避免修改 import 列表（也可以改成顶部 import，但 require 更小改动）。

- [ ] **Step 2: 验证编译**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npx tsc --noEmit
```

Expected: 无错误。如果 `require` 在 TS ESM 模式报错，改为在文件顶部加 `import { isTradingDay } from './utils';`（但注意 bootstrap.ts 可能已 import，需检查重复）。

实际上 bootstrap.ts 顶部已有 `import { isTradingDay } from './utils';`，所以 task 内部直接用 `isTradingDay(today)` 即可，不需要 require。修改为：

```typescript
  // 20:30 交易日风险指标计算
  strapi.cron.add({
    'wealth-risk-metric-trigger': {
      task: async ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过风险指标计算');
          return;
        }

        const queue = getCalculateQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过风险指标计算');
          return;
        }

        const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: { status: true },
        });

        for (const product of products) {
          queue.add('calculate-risk-metric', { productId: product.id, snapshotDate: today });
        }

        strapi.log.info(`[zhao-wealth] 20:30 风险指标计算任务已触发，${products.length}个产品`);
      },
      options: '30 20 * * *',
    },
  });
```

- [ ] **Step 3: Commit**

```powershell
cd e:\code\basic
git add plugins/zhao-wealth/server/src/bootstrap.ts
git commit -m "feat(zhao-wealth): add 20:30 cron for daily risk metrics calculation"
```

---

## Task 12: Build 并启动验证

**Files:** 无（仅验证）

- [ ] **Step 1: Build 插件**

```powershell
cd e:\code\basic\plugins\zhao-wealth
npm run build
```

Expected: `Build complete!` 无错误。

- [ ] **Step 2: 启动 Strapi**

```powershell
cd e:\code\basic
npm run dev
```

等待启动，检查日志：
- `[zhao-wealth] 插件已启动` ✅
- `[zhao-wealth] Bull队列初始化完成` ✅
- 无 schema 错误
- 无 content-type 注册错误

- [ ] **Step 3: 验证 wealth_risk_metrics 表已创建**

新终端：

```powershell
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`SELECT tablename FROM pg_tables WHERE tablename LIKE 'wealth_risk%' ORDER BY tablename`).then(r => { console.log(r.rows.map(x => x.tablename)); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); })"
```

Expected: `['wealth_risk_metrics', 'wealth_risk_metrics_product_lnk']`

- [ ] **Step 4: 验证复合唯一索引（迁移执行后）**

```powershell
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`SELECT indexname FROM pg_indexes WHERE indexname = 'wealth_risk_metrics_unique_idx'`).then(r => { console.log('Index exists:', r.rows.length > 0); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); })"
```

Expected: `Index exists: true`

如果索引不存在，手动执行 SQL 创建：

```powershell
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`CREATE UNIQUE INDEX IF NOT EXISTS wealth_risk_metrics_unique_idx ON wealth_risk_metrics (product_id, snapshot_date, period, metric_name)`).then(() => { console.log('Index created'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); })"
```

- [ ] **Step 5: 验证 C 端路由注册**

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:1337/api/zhao-wealth/v1/wealth/products/1/risk-metrics
```

Expected: 403（鉴权失败，路由存在）或 200（无鉴权配置时）。404 表示路由未注册，需检查。

- [ ] **Step 6: 验证后台路由注册**

```powershell
curl.exe -s -o NUL -w "%{http_code}" -X POST http://localhost:1337/wealth-admin/v1/recalculate-risk-metric
```

Expected: 401/403（鉴权）或 400（参数错误，路由存在）。

- [ ] **Step 7: 停止 Strapi**

- [ ] **Step 8: Commit（如有启动修复）**

```powershell
cd e:\code\basic
git status
git add plugins/zhao-wealth
git commit -m "fix(zhao-wealth): startup verification fixes for risk metrics" -m "如有问题修复后填写具体变更"
```

若无变更跳过。

---

## Task 13: 手工计算正确性验证

**Files:** 无（仅验证）

- [ ] **Step 1: 准备测试数据**

通过 admin panel 或 SQL 插入一个测试产品和若干净值数据：

```powershell
cd e:\code\basic
node -e "
const {Pool} = require('pg');
const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'});

(async () => {
  // 创建测试产品
  const product = await p.query(`INSERT INTO wealth_products (product_code, product_name, product_type, risk_level, status, created_at, updated_at) VALUES ('TEST001', '测试产品', 'bank-wealth', 'R2', true, NOW(), NOW()) RETURNING id`);
  const productId = product.rows[0].id;
  console.log('Created product id:', productId);

  // 插入 30 天净值数据（模拟波动）
  const today = new Date();
  const navs = [];
  let baseNav = 1.0;
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // 模拟每日波动 -1% 到 +1%
    const change = (Math.random() - 0.5) * 0.02;
    baseNav = baseNav * (1 + change);
    navs.push({date: date.toISOString().slice(0,10), nav: parseFloat(baseNav.toFixed(4))});
  }

  for (const nav of navs) {
    await p.query(`INSERT INTO wealth_navs (product_id, nav_date, unit_nav, data_source, created_at, updated_at) VALUES ($1, $2, $3, 'manual', NOW(), NOW())`, [productId, nav.date, nav.nav]);
  }
  console.log('Inserted', navs.length, 'nav records');

  // 同时插入对应的年化快照（用于夏普计算）
  await p.query(`INSERT INTO wealth_annual_snapshots (product_id, snapshot_date, annual1m, is_estimate, created_at, updated_at) VALUES ($1, $2, 0.05, false, NOW(), NOW())`, [productId, today.toISOString().slice(0,10)]);
  console.log('Inserted annual snapshot');

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
"
```

- [ ] **Step 2: 启动 Strapi 并触发计算**

```powershell
cd e:\code\basic
npm run dev
```

新终端触发单产品风险指标计算（需先获取 admin token，或直接通过队列触发）：

最简单方式：直接调用 service 方法。创建临时脚本：

```powershell
cd e:\code\basic
node -e "
require('./dist');
const strapi = require('@strapi/strapi');
strapi().load().then(async s => {
  const productId = await s.db.query('plugin::zhao-wealth.wealth-product').findOne({ where: { productCode: 'TEST001' }});
  console.log('Product:', productId.id);
  await s.service('plugin::zhao-wealth.risk-metric-service').calculateAndSaveMetrics(productId.id, new Date());
  console.log('Calculation done');

  // 读取计算结果
  const metrics = await s.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
    where: { product: productId.id },
    orderBy: [{ period: 'asc' }, { metricName: 'asc' }],
  });
  console.log('Metrics:', JSON.stringify(metrics, null, 2));

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"
```

- [ ] **Step 3: 手工验证波动率**

用 Excel 或手工计算：
1. 取产品近 30 天净值
2. 计算每日收益率（curr/prev - 1）
3. 计算标准差（STDEV，样本标准差 n-1）
4. 乘以 sqrt(250) 年化

对比 API 返回的 volatility 值，误差应 < 0.000001。

- [ ] **Step 4: 手工验证最大回撤**

1. 取产品近 30 天净值
2. 计算每个时点的累计峰值
3. 计算每个时点相对峰值的回撤
4. 取最大回撤，取负数

对比 API 返回的 maxDrawdown 值。

- [ ] **Step 5: 手工验证夏普比率**

```
sharpe = (annualReturn - 0.02) / volatility
```

其中 annualReturn = 0.05（测试数据），volatility 用 Step 3 的结果。

对比 API 返回的 sharpe 值。

- [ ] **Step 6: 验证同类排名百分位**

由于只有 1 个测试产品，同类排名应返回 null（同类 < 2 无对比意义）。

- [ ] **Step 7: 清理测试数据**

```powershell
cd e:\code\basic
node -e "
const {Pool} = require('pg');
const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'});
p.query(`DELETE FROM wealth_risk_metrics WHERE product_id IN (SELECT id FROM wealth_products WHERE product_code = 'TEST001')`)
  .then(() => p.query(`DELETE FROM wealth_navs WHERE product_id IN (SELECT id FROM wealth_products WHERE product_code = 'TEST001')`))
  .then(() => p.query(`DELETE FROM wealth_annual_snapshots WHERE product_id IN (SELECT id FROM wealth_products WHERE product_code = 'TEST001')`))
  .then(() => p.query(`DELETE FROM wealth_products WHERE product_code = 'TEST001'`))
  .then(() => { console.log('Test data cleaned'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

- [ ] **Step 8: 停止 Strapi**

---

## Task 14: 最终验收

- [ ] **Step 1: 验收清单核对**

```powershell
# 验证 wealth_risk_metrics 表存在
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`SELECT COUNT(*) FROM pg_tables WHERE tablename = 'wealth_risk_metrics'`).then(r => { console.log('Table exists:', r.rows[0].count === '1'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"
```

```powershell
# 验证复合唯一索引存在
cd e:\code\basic
node -e "const {Pool} = require('pg'); const p = new Pool({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'}); p.query(`SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'wealth_risk_metrics_unique_idx'`).then(r => { console.log('Index exists:', r.rows[0].count === '1'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"
```

```powershell
# 验证 Cron 数量（应为 4：8:00/18:00/20:00/20:30）
(Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts" -Pattern "strapi.cron.add").Count
```

Expected: `4`

```powershell
# 验证 risk-metric-service 已注册
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\services\index.ts" -Pattern "risk-metric-service"
```

Expected: 2 行匹配（import + export）。

```powershell
# 验证 risk-metric controller 已注册
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\controllers\index.ts" -Pattern "risk-metric"
```

Expected: 2 行匹配。

```powershell
# 验证 C 端路由已配置
Select-String -Path "e:\code\basic\plugins\zhao-wealth\server\src\routes\content-api.ts" -Pattern "risk-metrics"
```

Expected: 1 行匹配。

- [ ] **Step 2: 启动 + 接口 smoke test**

```powershell
cd e:\code\basic
npm run dev
```

新终端：

```powershell
# C 端路由（应 403）
curl.exe -s -o NUL -w "risk-metrics: %{http_code}`n" http://localhost:1337/api/zhao-wealth/v1/wealth/products/1/risk-metrics

# 后台路由（应 401/403）
curl.exe -s -o NUL -w "recalculate-risk-metric: %{http_code}`n" -X POST http://localhost:1337/wealth-admin/v1/recalculate-risk-metric
```

Expected: risk-metrics 返回 403；recalculate-risk-metric 返回 401/403。

- [ ] **Step 3: 停止服务并查看 git log**

```powershell
cd e:\code\basic
git log --oneline -15
```

Expected: 看到 Task 1-12 的所有 commit。

- [ ] **Step 4: 最终 commit（如有修复）**

```powershell
cd e:\code\basic
git status
git add plugins/zhao-wealth
git commit -m "fix(zhao-wealth): risk metrics final verification fixes" -m "如有问题修复后填写"
```

若无变更跳过。

---

## Self-Review

**1. Spec 覆盖检查**：

| Spec 项 | 对应 Task |
|---|---|
| 四、数据表设计（wealth-risk-metric schema） | Task 2 |
| 四、复合唯一索引（迁移脚本） | Task 3 |
| 四、wealth-product 反向关系 | Task 2 Step 2 |
| 五、配置项（config.ts） | Task 1 |
| 六、计算逻辑（波动率/最大回撤/夏普/同类排名） | Task 4 |
| 七、数据流（20:30 Cron + 队列任务） | Task 9, 11 |
| 八、新增文件清单 | Task 1-11 |
| 九、API 接口（C 端查询 + 后台重算） | Task 6, 8 |
| 十、批量重算策略 | Task 4 (recalculateAll), Task 9 (recalculate-all job) |
| 十二、验收标准 | Task 14 |
| 十三、计算正确性验证 | Task 13 |

无遗漏。

**2. 占位符扫描**：无 TBD/TODO，所有代码块完整。

**3. 类型一致性**：
- `risk-metric-service` 在 Task 4 定义，在 Task 5 注册为 `'risk-metric-service'`，在 Task 9/11 调用为 `strapi.service('plugin::zhao-wealth.risk-metric-service')`。✅
- `risk-metric` controller 在 Task 6 定义，在 Task 7 注册为 `'risk-metric'`，在 Task 8 路由中调用为 `risk-metric.getMetrics` / `risk-metric.recalculate`。✅
- 队列任务名：`calculate-risk-metric` / `recalculate-risk-metric-product` / `recalculate-all-risk-metrics` 在 Task 9 (process) 和 Task 11 (add) 中一致。✅
- `pluginConfig.riskFreeRate` 在 Task 1 定义，在 Task 4 使用。✅

**4. 已知限制**：
- Task 3 迁移脚本是否被 zhao-common 自动执行需在 Task 3 Step 2 验证。若无自动机制，Task 12 Step 4 提供了手动创建索引的 fallback。
- Task 13 手工验证依赖测试数据，如果 Strapi service 直接调用方式有问题，需改为通过 HTTP 接口触发（需 admin token）。
- 同类排名百分位在测试场景下返回 null（同类产品不足），生产环境需有多个同类产品才能验证真实排名。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-30-zhao-wealth-risk-metrics.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent 执行，Task 间 review，快速迭代

**2. Inline Execution** - 在当前会话按 Task 顺序执行，分批 checkpoint review

Which approach?
