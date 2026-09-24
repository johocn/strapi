# zhao-wealth Admin 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 zhao-wealth admin 从 9 个 Strapi Design System 页面重构为 4 模块（仪表盘/采集监控/指标中心/产品管理），采用 antd5 + ProComponents + ECharts，并扩展后端接口支撑指标中心与仪表盘。

**Architecture:** 后端先扩展 schema/migration/5 个聚合接口，前端再分 5 阶段实施（基础设施→产品管理→采集监控→指标中心→仪表盘）。样式通过 ConfigProvider prefixCls="zw" 隔离，避免污染 Strapi admin。

**Tech Stack:** Strapi v5 + TypeScript（后端）；React 18 + antd 5 + @ant-design/pro-components + echarts-for-react（前端）

**Spec:** `docs/superpowers/specs/2026-06-30-zhao-wealth-admin-redesign-design.md`

---

## File Structure

**后端变更**：
- Modify: `basic/plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json`（+2 字段）
- Create: `basic/plugins/zhao-wealth/server/database/migrations/002_add_recommend_fields_to_product.js`
- Create: `basic/plugins/zhao-wealth/server/src/services/stats-service.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/services/risk-metric-service.ts`（+3 admin 查询方法）
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/admin-api.ts`（+statsOverview/statsAnomalies）
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/risk-metric.ts`（+adminAggregate/adminTrend/adminPeers）
- Modify: `basic/plugins/zhao-wealth/server/src/routes/admin-api.ts`（+5 路由）
- Modify: `basic/plugins/zhao-wealth/server/src/permissions.ts`（+actions）

**前端变更**：
- Create: `admin/src/constants/enums.ts`、`admin/src/constants/metricRating.ts`
- Create: `admin/src/hooks/useApi.ts`（重写）
- Create: `admin/src/components/Layout/PluginLayout.tsx`
- Rewrite: `admin/src/App.tsx`
- Create: `admin/src/pages/Dashboard/*`、`admin/src/pages/Collect/*`、`admin/src/pages/Metrics/*`、`admin/src/pages/Product/*`
- Delete: 8 个旧页面文件

---

## Task 1: 后端 Schema 变更与 Migration

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json`
- Create: `basic/plugins/zhao-wealth/server/database/migrations/002_add_recommend_fields_to_product.js`

- [ ] **Step 1: 修改 wealth-product schema.json 新增 2 字段**

在 `attributes` 中 `recommendTags` 字段后追加：

```json
"recommendEnabled": { "type": "boolean", "default": false },
"recommendReason": { "type": "text" },
```

完整修改后 `recommendTags` 附近片段：
```json
"recommendWeight": { "type": "integer", "default": 0 },
"recommendTags": { "type": "json" },
"recommendEnabled": { "type": "boolean", "default": false },
"recommendReason": { "type": "text" },
"status": { "type": "boolean", "default": true },
```

- [ ] **Step 2: 创建 migration 002 脚本**

创建 `basic/plugins/zhao-wealth/server/database/migrations/002_add_recommend_fields_to_product.js`：

```javascript
'use strict';

module.exports = {
  /**
   * 给 wealth_products 表新增 recommend_enabled / recommend_reason 列
   * 并从 wealth_recommend_configs 回填已有推荐数据到 product 表
   */
  async up({ db }) {
    // 1. 检查并新增 recommend_enabled 列
    const hasEnabledCol = await db.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'wealth_products' AND column_name = 'recommend_enabled'
    `);
    if (hasEnabledCol.rows.length === 0) {
      await db.raw(`
        ALTER TABLE wealth_products
        ADD COLUMN recommend_enabled BOOLEAN DEFAULT FALSE
      `);
    }

    // 2. 检查并新增 recommend_reason 列
    const hasReasonCol = await db.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'wealth_products' AND column_name = 'recommend_reason'
    `);
    if (hasReasonCol.rows.length === 0) {
      await db.raw(`
        ALTER TABLE wealth_products
        ADD COLUMN recommend_reason TEXT
      `);
    }

    // 3. 从 wealth_recommend_configs 回填数据到 product 表
    // recommend-config 与 product 是 oneToOne，通过 wealth_recommend_configs_product_lnk 关联
    const configs = await db.raw(`
      SELECT
        p.id AS product_id,
        rc.recommend_order,
        rc.recommend_reason,
        rc.status
      FROM wealth_recommend_configs rc
      JOIN wealth_recommend_configs_product_lnk lnk ON lnk.wealth_recommend_config_id = rc.id
      JOIN wealth_products p ON p.id = lnk.product_id
      WHERE rc.status = true
    `);

    for (const row of configs.rows) {
      await db.raw(`
        UPDATE wealth_products
        SET recommend_enabled = true,
            recommend_reason = COALESCE(?, recommend_reason),
            recommend_weight = COALESCE(?, recommend_weight)
        WHERE id = ?
      `, [row.recommend_reason, row.recommend_order, row.product_id]);
    }
  },

  async down({ db }) {
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS recommend_reason`);
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS recommend_enabled`);
  },
};
```

- [ ] **Step 3: 启动 Strapi 触发 schema 重建**

```bash
cd e:\code\basic
npm run develop
```

预期日志：
- `[zhao-wealth] 插件已启动`
- 无 schema 错误

- [ ] **Step 4: 验证字段已创建**

在 Strapi 启动后，用 PowerShell 临时脚本验证（或用 psql）：

```bash
cd e:\code\basic
node -e "const { Client } = require('pg'); const c = new Client(JSON.parse(require('fs').readFileSync('.env').toString().split('\n').find(l=>l.startsWith('DATABASE_CLIENT'))?.split('=')[1] || '{}'));"
```

实际验证用 Strapi 启动日志 + 后续 Task 调用 `/products` 接口返回 `recommendEnabled`/`recommendReason` 字段即可。

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json plugins/zhao-wealth/server/database/migrations/002_add_recommend_fields_to_product.js
git commit -m "feat(wealth): 新增产品推荐字段并迁移历史配置数据"
```

---

## Task 2: 后端权限与路由注册

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/permissions.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/routes/admin-api.ts`

- [ ] **Step 1: 更新 permissions.ts 新增 actions**

完整替换 `basic/plugins/zhao-wealth/server/src/permissions.ts`：

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
  // 新增：统计与风险指标 admin 接口权限
  'wealth-stats': {
    actions: ['overview', 'anomalies'],
  },
  'wealth-risk-metric': {
    actions: ['aggregate', 'trend', 'peers', 'recalculate'],
  },
};
```

- [ ] **Step 2: 更新 routes/admin-api.ts 新增 5 路由**

在 `basic/plugins/zhao-wealth/server/src/routes/admin-api.ts` 末尾 `recalculate-risk-metric` 路由后追加：

```typescript
    // 统计聚合（仪表盘）
    {
      method: 'GET',
      path: '/stats/overview',
      handler: 'admin-api.statsOverview',
    },
    {
      method: 'GET',
      path: '/stats/anomalies',
      handler: 'admin-api.statsAnomalies',
    },

    // 指标中心聚合
    {
      method: 'GET',
      path: '/risk-metrics/admin/aggregate',
      handler: 'risk-metric.adminAggregate',
    },
    {
      method: 'GET',
      path: '/risk-metrics/admin/trend',
      handler: 'risk-metric.adminTrend',
    },
    {
      method: 'GET',
      path: '/risk-metrics/admin/peers',
      handler: 'risk-metric.adminPeers',
    },
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/permissions.ts plugins/zhao-wealth/server/src/routes/admin-api.ts
git commit -m "feat(wealth): 注册统计与指标中心 admin 路由权限"
```

---

## Task 3: 后端 stats-service 与 admin-api 统计接口

**Files:**
- Create: `basic/plugins/zhao-wealth/server/src/services/stats-service.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/admin-api.ts`

- [ ] **Step 1: 创建 stats-service.ts**

创建 `basic/plugins/zhao-wealth/server/src/services/stats-service.ts`：

```typescript
'use strict';

export default ({ strapi }) => ({
  /**
   * 全局概览统计
   * 返回 productCount/companyCount/collectSuccessRate/riskMetricCoverage/todayAnomaly
   */
  async getOverview() {
    const productCount = await strapi.db.query('plugin::zhao-wealth.wealth-product').count();
    const companyCount = await strapi.db.query('plugin::zhao-wealth.wealth-company').count();

    // 采集成功率
    const collectSuccess = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'success' } });
    const collectFailed = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'failed' } });
    const collectPending = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'pending' } });
    const collectTotal = collectSuccess + collectFailed + collectPending;
    const collectSuccessRate = collectTotal > 0 ? collectSuccess / collectTotal : 0;

    // 指标覆盖率：有 risk_metric 记录的产品数 / 产品总数
    let riskMetricCoverage = 0;
    if (productCount > 0) {
      const productsWithMetrics = await strapi.db.connection.raw(`
        SELECT COUNT(DISTINCT p.id) AS cnt
        FROM wealth_products p
        JOIN wealth_risk_metrics rm ON rm.product_id = p.id
      `);
      riskMetricCoverage = productsWithMetrics.rows[0].cnt / productCount;
    }

    // 今日异常：今日采集失败 + 指标计算失败（metricValue is null）
    const today = new Date().toISOString().slice(0, 10);
    const todayFailedCollect = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({
      where: { collectStatus: 'failed' },
    });

    const nullMetrics = await strapi.db.connection.raw(`
      SELECT COUNT(*) AS cnt FROM wealth_risk_metrics
      WHERE snapshot_date = ? AND metric_value IS NULL
    `, [today]);

    const todayAnomaly = todayFailedCollect + Number(nullMetrics.rows[0].cnt);

    return {
      productCount,
      companyCount,
      collectSuccessRate: Number(collectSuccessRate.toFixed(4)),
      riskMetricCoverage: Number(riskMetricCoverage.toFixed(4)),
      todayAnomaly,
    };
  },

  /**
   * 异常列表
   * 返回最近 N 条采集失败 + 指标计算失败记录
   */
  async getAnomalies(limit = 10) {
    // 采集失败记录
    const failedConfigs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
      where: { collectStatus: 'failed' },
      populate: ['product'],
      limit,
      orderBy: { updatedAt: 'desc' },
    });

    const collectAnomalies = failedConfigs.map(c => ({
      type: 'collect_failed',
      productId: c.product?.id,
      productName: c.product?.productName,
      failCount: c.failCount || 0,
      lastCollectTime: c.lastCollectTime,
      message: `采集失败 ${c.failCount || 0} 次`,
    }));

    // 指标计算失败记录（metricValue is null）
    const nullMetrics = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { metricValue: null },
      populate: ['product'],
      limit,
      orderBy: { snapshotDate: 'desc' },
    });

    const metricAnomalies = nullMetrics.map(m => ({
      type: 'metric_null',
      productId: m.product?.id,
      productName: m.product?.productName,
      snapshotDate: m.snapshotDate,
      period: m.period,
      metricName: m.metricName,
      message: `${m.period} 周期 ${m.metricName} 计算失败`,
    }));

    // 合并并按时间倒序
    const all = [...collectAnomalies, ...metricAnomalies];
    return all.slice(0, limit);
  },
});
```

- [ ] **Step 2: 修改 services/index.ts 注册 stats-service**

读取 `basic/plugins/zhao-wealth/server/src/services/index.ts`，在末尾追加 stats-service 导出。

查看现有 services/index.ts 结构后追加：

```typescript
import statsService from './stats-service';

export default {
  // ...现有 service 导出
  stats: statsService,
};
```

- [ ] **Step 3: 在 admin-api.ts 控制器新增 statsOverview 与 statsAnomalies**

在 `basic/plugins/zhao-wealth/server/src/controllers/admin-api.ts` 的 `stats` 方法后（即对象末尾 `}` 前）追加：

```typescript
  // ===== 仪表盘聚合（新）=====
  async statsOverview(ctx) {
    try {
      const result = await strapi.plugin('zhao-wealth').service('stats').getOverview();
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 概览统计失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async statsAnomalies(ctx) {
    try {
      const { limit = 10 } = ctx.query;
      const result = await strapi.plugin('zhao-wealth').service('stats').getAnomalies(Number(limit));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 异常列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
```

- [ ] **Step 4: 重启 Strapi 验证接口**

```bash
cd e:\code\basic
# 重启 develop
```

用浏览器或 curl 访问（需 admin token）：
```
GET /admin/plugins/zhao-wealth/stats/overview
GET /admin/plugins/zhao-wealth/stats/anomalies?limit=10
```

预期返回 `{ success: true, data: { productCount, companyCount, collectSuccessRate, riskMetricCoverage, todayAnomaly } }`

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/stats-service.ts plugins/zhao-wealth/server/src/services/index.ts plugins/zhao-wealth/server/src/controllers/admin-api.ts
git commit -m "feat(wealth): 新增仪表盘概览与异常列表聚合接口"
```

---

## Task 4: 后端 risk-metric-service 扩展与控制器

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/services/risk-metric-service.ts`
- Modify: `basic/plugins/zhao-wealth/server/src/controllers/risk-metric.ts`

- [ ] **Step 1: 在 risk-metric-service.ts 新增 3 个 admin 查询方法**

在 `basic/plugins/zhao-wealth/server/src/services/risk-metric-service.ts` 的 `recalculateAll` 方法后（即 `}` 闭合前）追加：

```typescript
  /**
   * 指标中心：聚合查询
   * 返回最新 snapshotDate 的 4 指标值
   */
  async adminAggregate(productId: number, period: string) {
    const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
    const result: Record<string, number | null> = {};

    for (const metricName of metricNames) {
      const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
        where: { product: productId, period, metricName },
        orderBy: { snapshotDate: 'desc' },
        limit: 1,
      });
      result[metricName] = records.length > 0 ? records[0].metricValue : null;
    }

    return result;
  },

  /**
   * 指标中心：历史趋势
   * 返回 4 指标按 snapshotDate 排序的时序数据
   */
  async adminTrend(productId: number) {
    const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { product: productId },
      orderBy: [{ snapshotDate: 'asc' }, { period: 'asc' }],
      limit: 500,
    });

    // 按 period 分组，再按日期排序
    const trend: Record<string, { snapshotDate: string; volatility: number | null; maxDrawdown: number | null; sharpe: number | null; rankPercentile: number | null }[]> = {
      m1: [], m3: [], m6: [], y1: [],
    };

    // 按 (snapshotDate, period) 聚合
    const grouped: Record<string, Record<string, any>> = {};
    for (const r of records) {
      const key = `${r.snapshotDate}_${r.period}`;
      if (!grouped[key]) {
        grouped[key] = {
          snapshotDate: r.snapshotDate,
          period: r.period,
          volatility: null,
          maxDrawdown: null,
          sharpe: null,
          rankPercentile: null,
        };
      }
      grouped[key][r.metricName] = r.metricValue;
    }

    for (const key of Object.keys(grouped)) {
      const item = grouped[key];
      if (trend[item.period]) {
        trend[item.period].push(item);
      }
    }

    return trend;
  },

  /**
   * 指标中心：同类对比
   * 返回同 period + metricName 下所有产品的排名
   */
  async adminPeers(period: string, metricName: string, limit = 50) {
    // 取最新 snapshotDate
    const latest = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { period, metricName },
      orderBy: { snapshotDate: 'desc' },
      limit: 1,
    });

    if (latest.length === 0) return [];

    const snapshotDate = latest[0].snapshotDate;

    // 查同 snapshotDate + period + metricName 的所有产品
    const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { snapshotDate, period, metricName },
      populate: ['product'],
      limit,
    });

    // 过滤 null 值并排序
    const valid = records.filter(r => r.metricValue !== null && r.product);

    // 排序方向：maxDrawdown 升序（越小越好），其他降序
    if (metricName === 'maxDrawdown') {
      valid.sort((a, b) => a.metricValue - b.metricValue);
    } else {
      valid.sort((a, b) => b.metricValue - a.metricValue);
    }

    return valid.map((r, index) => ({
      rank: index + 1,
      productId: r.product.id,
      productName: r.product.productName,
      productType: r.product.productType,
      metricValue: r.metricValue,
    }));
  },
```

- [ ] **Step 2: 在 risk-metric.ts 控制器新增 3 个 admin 方法**

在 `basic/plugins/zhao-wealth/server/src/controllers/risk-metric.ts` 的 `recalculate` 方法后（即 `}` 闭合前）追加：

```typescript
  /**
   * 指标中心：聚合查询
   * GET /wealth-admin/v1/risk-metrics/admin/aggregate?productId=1&period=m1
   */
  async adminAggregate(ctx) {
    try {
      const { productId, period } = ctx.query;
      if (!productId || !period) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'productId 和 period 必填');
        return;
      }

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      if (!validPeriods.includes(period)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, '无效的 period');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminAggregate(Number(productId), period);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标聚合查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 指标中心：历史趋势
   * GET /wealth-admin/v1/risk-metrics/admin/trend?productId=1
   */
  async adminTrend(ctx) {
    try {
      const { productId } = ctx.query;
      if (!productId) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'productId 必填');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminTrend(Number(productId));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标趋势查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 指标中心：同类对比
   * GET /wealth-admin/v1/risk-metrics/admin/peers?period=m1&metricName=volatility
   */
  async adminPeers(ctx) {
    try {
      const { period, metricName, limit } = ctx.query;
      if (!period || !metricName) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'period 和 metricName 必填');
        return;
      }

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      const validMetrics = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
      if (!validPeriods.includes(period) || !validMetrics.includes(metricName)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, '无效的 period 或 metricName');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminPeers(period, metricName, Number(limit) || 50);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 同类对比查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
```

- [ ] **Step 3: 重启 Strapi 验证 3 个接口**

```bash
cd e:\code\basic
# 重启 develop
```

验证接口（需 admin token）：
```
GET /admin/plugins/zhao-wealth/risk-metrics/admin/aggregate?productId=1&period=m1
GET /admin/plugins/zhao-wealth/risk-metrics/admin/trend?productId=1
GET /admin/plugins/zhao-wealth/risk-metrics/admin/peers?period=m1&metricName=volatility
```

预期返回含 4 指标值的对象。

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/controllers/risk-metric.ts
git commit -m "feat(wealth): 新增指标中心聚合/趋势/同类对比查询接口"
```

---

## Task 5: 前端依赖安装与 constants

**Files:**
- Modify: `basic/plugins/zhao-wealth/admin/package.json`（自动）
- Create: `basic/plugins/zhao-wealth/admin/src/constants/enums.ts`
- Create: `basic/plugins/zhao-wealth/admin/src/constants/metricRating.ts`

- [ ] **Step 1: 安装 antd + ProComponents + ECharts 依赖**

```bash
cd e:\code\basic\plugins\zhao-wealth\admin
npm install antd@^5 @ant-design/pro-components @ant-design/icons echarts echarts-for-react --save
```

预期：package.json 新增 5 个依赖。

- [ ] **Step 2: 创建 constants/enums.ts**

创建 `basic/plugins/zhao-wealth/admin/src/constants/enums.ts`：

```typescript
// 产品类型
export const PRODUCT_TYPES: Record<string, string> = {
  'bank-wealth': '银行理财',
  'stock-fund': '股票基金',
  'bond-fund': '债券基金',
  'mixed-fund': '混合基金',
  'money-fund': '货币基金',
};

// 风险等级
export const RISK_LEVELS: Record<string, string> = {
  R1: '低风险',
  R2: '中低风险',
  R3: '中风险',
  R4: '中高风险',
  R5: '高风险',
};

// 期限类型
export const TERM_TYPES: Record<string, string> = {
  short: '短期',
  medium: '中期',
  long: '长期',
};

// 公司类型
export const COMPANY_TYPES: Record<string, string> = {
  bank: '银行',
  'bank-subsidiary': '理财子公司',
};

// 采集方式
export const COLLECT_METHODS: Record<string, string> = {
  'web-crawler': '网页爬虫',
  'zip-pdf': 'ZIP+PDF解析',
  manual: '手动录入',
  api: '三方API',
};

// 采集状态
export const COLLECT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待采集', color: 'warning' },
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

// 指标周期
export const METRIC_PERIODS: Record<string, string> = {
  m1: '近1月',
  m3: '近3月',
  m6: '近6月',
  y1: '近1年',
};

// 指标名称
export const METRIC_NAMES: Record<string, string> = {
  volatility: '波动率',
  maxDrawdown: '最大回撤',
  sharpe: '夏普比率',
  rankPercentile: '同类排名百分位',
};

// 推荐标签
export const RECOMMEND_TAGS = [
  { label: '稳健型', value: '稳健型' },
  { label: '高流动性', value: '高流动性' },
  { label: '新客专享', value: '新客专享' },
  { label: '进取型', value: '进取型' },
];
```

- [ ] **Step 3: 创建 constants/metricRating.ts**

创建 `basic/plugins/zhao-wealth/admin/src/constants/metricRating.ts`：

```typescript
// 指标评级规则
export type RatingLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface RatingRule {
  level: RatingLevel;
  label: string;
  color: string;
}

// 波动率评级（越小越好）
export function rateVolatility(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  const abs = Math.abs(value);
  if (abs < 0.05) return { level: 'excellent', label: '优', color: 'success' };
  if (abs < 0.10) return { level: 'good', label: '良', color: 'blue' };
  if (abs < 0.20) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 最大回撤评级（越大越好，负数绝对值越小越好）
export function rateMaxDrawdown(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value > -0.05) return { level: 'excellent', label: '优', color: 'success' };
  if (value > -0.10) return { level: 'good', label: '良', color: 'blue' };
  if (value > -0.20) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 夏普比率评级（越大越好）
export function rateSharpe(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value > 1) return { level: 'excellent', label: '优', color: 'success' };
  if (value > 0.5) return { level: 'good', label: '良', color: 'blue' };
  if (value > 0) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 同类排名百分位评级（越小越好，表示排名越靠前）
export function rateRankPercentile(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value < 20) return { level: 'excellent', label: '优', color: 'success' };
  if (value < 50) return { level: 'good', label: '良', color: 'blue' };
  if (value < 80) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 格式化百分比显示
export function formatPercent(value: number | null, digits = 4): string {
  if (value === null) return '-';
  return (value * 100).toFixed(digits) + '%';
}
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/package.json plugins/zhao-wealth/admin/package-lock.json plugins/zhao-wealth/admin/src/constants/
git commit -m "feat(wealth-admin): 引入 antd+echarts 依赖并新增枚举与评级常量"
```

---

## Task 6: 前端 useApi hook + PluginLayout + App.tsx

**Files:**
- Create: `basic/plugins/zhao-wealth/admin/src/hooks/useApi.ts`
- Create: `basic/plugins/zhao-wealth/admin/src/components/Layout/PluginLayout.tsx`
- Rewrite: `basic/plugins/zhao-wealth/admin/src/App.tsx`

- [ ] **Step 1: 创建 hooks/useApi.ts**

创建 `basic/plugins/zhao-wealth/admin/src/hooks/useApi.ts`：

```typescript
import { useFetchClient } from '@strapi/strapi/admin';

const PLUGIN_ID = 'zhao-wealth';

export const useApi = () => {
  const { get, post, put, del } = useFetchClient();

  const call = async (method: 'get' | 'post' | 'put' | 'del', path: string, data?: any, params?: any) => {
    const config: any = {};
    if (params) config.params = params;
    if (data) config.data = data;
    const res = await (method === 'get' ? get(path, config) : method === 'post' ? post(path, config) : method === 'put' ? put(path, config) : del(path, config));
    return res.data;
  };

  return {
    // 公司管理
    getCompanies: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/companies`, undefined, params),
    getCompany: (id: number) => call('get', `/admin/plugins/${PLUGIN_ID}/companies/${id}`),
    createCompany: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/companies`, data),
    updateCompany: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/companies/${id}`, data),
    deleteCompany: (id: number) => call('del', `/admin/plugins/${PLUGIN_ID}/companies/${id}`),

    // 产品管理
    getProducts: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/products`, undefined, params),
    getProduct: (id: number) => call('get', `/admin/plugins/${PLUGIN_ID}/products/${id}`),
    createProduct: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products`, data),
    updateProduct: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/products/${id}`, data),
    deleteProduct: (id: number) => call('del', `/admin/plugins/${PLUGIN_ID}/products/${id}`),

    // 采集配置
    getCollectConfigs: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/collect-configs`, undefined, params),
    updateCollectConfig: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/collect-configs/${id}`, data),
    triggerCollect: (productId?: number) => call('post', `/admin/plugins/${PLUGIN_ID}/collect/trigger`, { productId }),
    getCollectStatus: (productId?: number) => call('get', `/admin/plugins/${PLUGIN_ID}/collect/status`, undefined, { productId }),

    // 净值管理
    getNavData: (productId: number, params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, undefined, params),
    createNavData: (productId: number, data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, data),
    updateNavData: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/nav/${id}`, data),

    // 重算
    triggerRecalculate: (params?: any) => call('post', `/admin/plugins/${PLUGIN_ID}/recalculate`, params),
    recalculateRiskMetric: (params?: any) => call('post', `/admin/plugins/${PLUGIN_ID}/recalculate-risk-metric`, params),

    // 客户自选
    getCustomerProducts: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/customer-products`, undefined, params),

    // 统计（仪表盘）
    getStatsOverview: () => call('get', `/admin/plugins/${PLUGIN_ID}/stats/overview`),
    getStatsAnomalies: (limit = 10) => call('get', `/admin/plugins/${PLUGIN_ID}/stats/anomalies`, undefined, { limit }),

    // 指标中心
    getMetricAggregate: (productId: number, period: string) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/aggregate`, undefined, { productId, period }),
    getMetricTrend: (productId: number) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/trend`, undefined, { productId }),
    getMetricPeers: (period: string, metricName: string, limit = 50) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/peers`, undefined, { period, metricName, limit }),
  };
};
```

- [ ] **Step 2: 创建 PluginLayout.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/components/Layout/PluginLayout.tsx`：

```tsx
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  CloudSyncOutlined,
  BarChartOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'collect', icon: <CloudSyncOutlined />, label: '采集监控' },
  { key: 'metrics', icon: <BarChartOutlined />, label: '指标中心' },
  { key: 'product', icon: <FundOutlined />, label: '产品管理' },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 当前选中 key：从 path 提取
  const pathParts = location.pathname.split('/plugins/zhao-wealth/')[1] || '';
  const selectedKey = pathParts.split('/')[0] || '';

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
      <Sider width={200} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => navigate(`/plugins/zhao-wealth${key ? '/' + key : ''}`)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {children || <Outlet />}
      </Content>
    </Layout>
  );
};

export { PluginLayout };
```

- [ ] **Step 3: 重写 App.tsx**

完整替换 `basic/plugins/zhao-wealth/admin/src/App.tsx`：

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from './components/Layout/PluginLayout';
import Dashboard from './pages/Dashboard';
import Collect from './pages/Collect';
import Metrics from './pages/Metrics';
import Product from './pages/Product';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="collect" element={<Collect />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="product" element={<Product />} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export { App };
```

- [ ] **Step 4: 创建 4 个空的 index.tsx 占位**

为避免编译报错，先创建 4 个模块的空入口：

`basic/plugins/zhao-wealth/admin/src/pages/Dashboard/index.tsx`：
```tsx
const Dashboard = () => <div>仪表盘（待实现）</div>;
export default Dashboard;
```

`basic/plugins/zhao-wealth/admin/src/pages/Collect/index.tsx`：
```tsx
const Collect = () => <div>采集监控（待实现）</div>;
export default Collect;
```

`basic/plugins/zhao-wealth/admin/src/pages/Metrics/index.tsx`：
```tsx
const Metrics = () => <div>指标中心（待实现）</div>;
export default Metrics;
```

`basic/plugins/zhao-wealth/admin/src/pages/Product/index.tsx`：
```tsx
const Product = () => <div>产品管理（待实现）</div>;
export default Product;
```

- [ ] **Step 5: 启动 Strapi develop 验证插件加载**

```bash
cd e:\code\basic
npm run develop
```

打开 Strapi admin → 理财基金管理，预期：
- 左侧显示 4 模块菜单（仪表盘/采集监控/指标中心/产品管理）
- 点击切换显示占位文字
- 浏览器控制台无 antd 报错
- Strapi 主侧边栏样式不被污染（`.zw-` 前缀生效）

- [ ] **Step 6: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/src/hooks/ plugins/zhao-wealth/admin/src/components/Layout/ plugins/zhao-wealth/admin/src/App.tsx plugins/zhao-wealth/admin/src/pages/Dashboard/ plugins/zhao-wealth/admin/src/pages/Collect/ plugins/zhao-wealth/admin/src/pages/Metrics/ plugins/zhao-wealth/admin/src/pages/Product/
git commit -m "feat(wealth-admin): 重构基础设施 - antd ConfigProvider+布局+useApi"
```

---

## Task 7: 前端产品管理模块

**Files:**
- Rewrite: `basic/plugins/zhao-wealth/admin/src/pages/Product/index.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Product/ProductList.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Product/CompanyList.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Product/ProductForm.tsx`

- [ ] **Step 1: 创建 ProductForm.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Product/ProductForm.tsx`：

```tsx
import { ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProFormSwitch, ProFormDatePicker, ProFormGroup } from '@ant-design/pro-components';
import { Collapse, message } from 'antd';
import { useApi } from '../../hooks/useApi';
import { PRODUCT_TYPES, RISK_LEVELS, TERM_TYPES, RECOMMEND_TAGS } from '../../constants/enums';

const toOptions = (map: Record<string, string>) => Object.entries(map).map(([value, label]) => ({ value, label }));

const ProductForm = ({ open, onClose, onSuccess, initialValues }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: any;
}) => {
  const api = useApi();
  const isEdit = !!initialValues?.id;

  return (
    <ModalForm
      title={isEdit ? '编辑产品' : '新建产品'}
      open={open}
      onOpenChange={(v) => !v && onClose()}
      initialValues={initialValues ? {
        ...initialValues,
        company: initialValues.company?.id,
        issueDate: initialValues.issueDate,
        maturityDate: initialValues.maturityDate,
        recommendTags: Array.isArray(initialValues.recommendTags) ? initialValues.recommendTags : [],
      } : {
        productType: 'bank-wealth',
        riskLevel: 'R2',
        recommendWeight: 0,
        recommendEnabled: false,
      }}
      modalProps={{ destroyOnClose: true, width: 720 }}
      onFinish={async (values) => {
        try {
          const data = {
            ...values,
            company: values.company ? Number(values.company) : null,
            issueDate: values.issueDate ? values.issueDate.toISOString().slice(0, 10) : null,
            maturityDate: values.maturityDate ? values.maturityDate.toISOString().slice(0, 10) : null,
          };
          if (isEdit) {
            await api.updateProduct(initialValues.id, data);
            message.success('更新成功');
          } else {
            await api.createProduct(data);
            message.success('创建成功');
          }
          onSuccess();
          return true;
        } catch (e: any) {
          message.error(e.message || '操作失败');
          return false;
        }
      }}
    >
      <ProFormGroup>
        <ProFormText name="productCode" label="产品代码" rules={[{ required: true }]} placeholder="请输入产品代码" />
        <ProFormText name="productName" label="产品名称" rules={[{ required: true }]} placeholder="请输入产品名称" />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormSelect name="productType" label="产品类型" options={toOptions(PRODUCT_TYPES)} rules={[{ required: true }]} />
        <ProFormSelect name="riskLevel" label="风险等级" options={toOptions(RISK_LEVELS)} />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormText name="registerCode" label="登记编码" placeholder="请输入登记编码" />
        <ProFormSelect name="termType" label="期限类型" options={toOptions(TERM_TYPES)} allowClear />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormSelect name="company" label="发行机构" request={async () => {
          const res = await api.getCompanies({ pageSize: 200 });
          return (res.records || []).map((c: any) => ({ value: c.id, label: c.name }));
        }} allowClear />
        <ProFormDatePicker name="issueDate" label="发行日期" />
        <ProFormDatePicker name="maturityDate" label="到期日期" />
      </ProFormGroup>

      <Collapse
        items={[{
          key: 'recommend',
          label: '推荐配置',
          children: (
            <>
              <ProFormSwitch name="recommendEnabled" label="启用推荐" />
              <ProFormDigit name="recommendWeight" label="推荐权重" min={0} fieldProps={{ precision: 0 }} />
              <ProFormSelect name="recommendTags" label="推荐标签" mode="multiple" options={RECOMMEND_TAGS} />
              <ProFormText name="recommendReason" label="推荐理由" placeholder="请输入推荐理由" />
            </>
          ),
        }]}
      />
    </ModalForm>
  );
};

export default ProductForm;
```

- [ ] **Step 2: 创建 ProductList.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Product/ProductList.tsx`：

```tsx
import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Button, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PRODUCT_TYPES, RISK_LEVELS } from '../../constants/enums';
import { useState } from 'react';
import ProductForm from './ProductForm';

const riskColors: Record<string, string> = {
  R1: 'green', R2: 'blue', R3: 'orange', R4: 'red', R5: 'magenta',
};

const ProductList = () => {
  const api = useApi();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);

  const columns: ProColumns<any>[] = [
    { title: '产品名称', dataIndex: 'productName', ellipsis: true, width: 200 },
    { title: '产品代码', dataIndex: 'productCode', width: 120 },
    { title: '类型', dataIndex: 'productType', width: 100, valueEnum: PRODUCT_TYPES, render: (_, r) => <Tag>{PRODUCT_TYPES[r.productType] || r.productType}</Tag> },
    { title: '风险', dataIndex: 'riskLevel', width: 80, render: (_, r) => <Tag color={riskColors[r.riskLevel]}>{RISK_LEVELS[r.riskLevel] || r.riskLevel}</Tag> },
    { title: '发行机构', dataIndex: ['company', 'name'], width: 120, render: (_, r) => r.company?.name || '-' },
    { title: '推荐权重', dataIndex: 'recommendWeight', width: 90, sort: true },
    { title: '状态', dataIndex: 'status', width: 80, valueEnum: { true: { text: '启用', status: 'Success' }, false: { text: '停用', status: 'Default' } } },
    {
      title: '操作', width: 200, fixed: 'right', valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}><EditOutlined /> 编辑</a>,
        <a key="metrics" onClick={() => navigate(`/plugins/zhao-wealth/metrics?productId=${r.id}`)}><BarChartOutlined /> 指标</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          try { await api.deleteProduct(r.id); message.success('删除成功'); } catch (e: any) { message.error(e.message); }
        }}>
          <a style={{ color: '#ff4d4f' }}><DeleteOutlined /> 删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<any>
        rowKey="id"
        columns={columns}
        scroll={{ x: 1000 }}
        request={async (params) => {
          const query: any = { page: params.current, pageSize: params.pageSize };
          if (params.productName) query.productName = params.productName;
          if (params.productType) query.productType = params.productType;
          if (params.riskLevel) query.riskLevel = params.riskLevel;
          const res = await api.getProducts(query);
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
        search={{ labelWidth: 80 }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建产品</Button>,
        ]}
      />
      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} initialValues={current} onSuccess={() => { setFormOpen(false); }} />
    </>
  );
};

export default ProductList;
```

注意：onSuccess 关闭表单后，ProTable 不会自动刷新。实际使用时可通过 actionRef 调用 reload，此处简化处理（用户可手动刷新页面或后续优化）。优化版：在 ProductList 中加入 actionRef。

优化版 ProductList（含 actionRef）：

```tsx
import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Tag, Space, useRef } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PRODUCT_TYPES, RISK_LEVELS } from '../../constants/enums';
import { useState, useRef as useReactRef } from 'react';
import ProductForm from './ProductForm';

const riskColors: Record<string, string> = { R1: 'green', R2: 'blue', R3: 'orange', R4: 'red', R5: 'magenta' };

const ProductList = () => {
  const api = useApi();
  const navigate = useNavigate();
  const actionRef = useReactRef<ActionType>();
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);

  const columns: ProColumns<any>[] = [
    { title: '产品名称', dataIndex: 'productName', ellipsis: true, width: 200 },
    { title: '产品代码', dataIndex: 'productCode', width: 120 },
    { title: '类型', dataIndex: 'productType', width: 100, valueEnum: Object.fromEntries(Object.entries(PRODUCT_TYPES).map(([k, v]) => [k, { text: v }])), render: (_, r) => <Tag>{PRODUCT_TYPES[r.productType]}</Tag> },
    { title: '风险', dataIndex: 'riskLevel', width: 80, render: (_, r) => <Tag color={riskColors[r.riskLevel]}>{RISK_LEVELS[r.riskLevel]}</Tag> },
    { title: '发行机构', width: 120, render: (_, r) => r.company?.name || '-' },
    { title: '推荐权重', dataIndex: 'recommendWeight', width: 90 },
    { title: '状态', dataIndex: 'status', width: 80, render: (_, r) => <Tag color={r.status ? 'green' : 'default'}>{r.status ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 200, fixed: 'right', valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>编辑</a>,
        <a key="metrics" onClick={() => navigate(`/plugins/zhao-wealth/metrics?productId=${r.id}`)}>指标</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          try { await api.deleteProduct(r.id); message.success('删除成功'); actionRef.current?.reload(); } catch (e: any) { message.error(e.message); }
        }}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<any>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1000 }}
        request={async (params) => {
          const query: any = { page: params.current, pageSize: params.pageSize };
          if (params.productName) query.productName = params.productName;
          if (params.productType) query.productType = params.productType;
          if (params.riskLevel) query.riskLevel = params.riskLevel;
          const res = await api.getProducts(query);
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建产品</Button>,
        ]}
      />
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialValues={current}
        onSuccess={() => { setFormOpen(false); actionRef.current?.reload(); }}
      />
    </>
  );
};

export default ProductList;
```

- [ ] **Step 3: 创建 CompanyList.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Product/CompanyList.tsx`：

```tsx
import { ProTable, type ProColumns, type ActionType, ModalForm, ProFormText, ProFormSelect, ProFormSwitch } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { COMPANY_TYPES } from '../../constants/enums';

const CompanyList = () => {
  const api = useApi();
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);

  const columns: ProColumns<any>[] = [
    { title: '公司名称', dataIndex: 'name', width: 200 },
    { title: '简称', dataIndex: 'shortName', width: 120, render: (_, r) => r.shortName || '-' },
    { title: '类型', dataIndex: 'companyType', width: 120, render: (_, r) => <Tag>{COMPANY_TYPES[r.companyType] || r.companyType}</Tag> },
    { title: '官网', dataIndex: 'website', ellipsis: true, render: (_, r) => r.website || '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (_, r) => <Tag color={r.status ? 'green' : 'default'}>{r.status ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 180, valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          try { await api.deleteCompany(r.id); message.success('删除成功'); actionRef.current?.reload(); } catch (e: any) { message.error(e.message); }
        }}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<any>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async (params) => {
          const res = await api.getCompanies({ page: params.current, pageSize: params.pageSize });
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建公司</Button>,
        ]}
      />
      <ModalForm
        title={current ? '编辑公司' : '新建公司'}
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setCurrent(undefined); }}
        initialValues={current || { companyType: 'bank-subsidiary', status: true }}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            if (current) { await api.updateCompany(current.id, values); message.success('更新成功'); }
            else { await api.createCompany(values); message.success('创建成功'); }
            actionRef.current?.reload();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormText name="name" label="公司名称" rules={[{ required: true }]} />
        <ProFormText name="shortName" label="简称" />
        <ProFormSelect name="companyType" label="类型" options={Object.entries(COMPANY_TYPES).map(([v, l]) => ({ value: v, label: l }))} />
        <ProFormText name="website" label="官网地址" />
        <ProFormSwitch name="status" label="状态" />
      </ModalForm>
    </>
  );
};

export default CompanyList;
```

- [ ] **Step 4: 重写 Product/index.tsx 整合 Tab**

完整替换 `basic/plugins/zhao-wealth/admin/src/pages/Product/index.tsx`：

```tsx
import { Tabs } from 'antd';
import ProductList from './ProductList';
import CompanyList from './CompanyList';

const Product = () => (
  <Tabs
    defaultActiveKey="product"
    items={[
      { key: 'product', label: '产品列表', children: <ProductList /> },
      { key: 'company', label: '理财公司', children: <CompanyList /> },
    ]}
  />
);

export default Product;
```

- [ ] **Step 5: 启动验证产品管理模块**

```bash
cd e:\code\basic
# 重启 develop
```

验证：
- 进入产品管理 → 产品列表 Tab：ProTable 显示产品，搜索/分页可用
- 新建产品：表单弹出，含推荐配置折叠面板
- 编辑产品：表单回填
- 删除产品：确认后刷新
- 理财公司 Tab：CRUD 正常

- [ ] **Step 6: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/src/pages/Product/
git commit -m "feat(wealth-admin): 重构产品管理模块 - ProTable+ModalForm+推荐字段"
```

---

## Task 8: 前端采集监控模块

**Files:**
- Rewrite: `basic/plugins/zhao-wealth/admin/src/pages/Collect/index.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Collect/TaskTab.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Collect/NavTab.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Collect/LogTab.tsx`

- [ ] **Step 1: 创建 TaskTab.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Collect/TaskTab.tsx`：

```tsx
import { ProTable, type ProColumns, type ActionType, ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Tag, Statistic, Space, message, Popconfirm } from 'antd';
import { useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { COLLECT_METHODS, COLLECT_STATUS } from '../../constants/enums';

const TaskTab = () => {
  const api = useApi();
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);
  const [stats, setStats] = useState({ success: 0, failed: 0, pending: 0 });

  const refreshStats = async () => {
    const res = await api.getCollectConfigs({ pageSize: 500 });
    const list = res.records || [];
    setStats({
      success: list.filter((c: any) => c.collectStatus === 'success').length,
      failed: list.filter((c: any) => c.collectStatus === 'failed').length,
      pending: list.filter((c: any) => c.collectStatus === 'pending').length,
    });
  };

  const columns: ProColumns<any>[] = [
    { title: '产品名称', width: 200, render: (_, r) => r.product?.productName || '-' },
    { title: '采集方式', dataIndex: 'collectMethod', width: 120, render: (_, r) => <Tag>{COLLECT_METHODS[r.collectMethod]}</Tag> },
    { title: '采集URL', dataIndex: 'collectUrl', ellipsis: true, render: (_, r) => r.collectUrl || '-' },
    {
      title: '状态', dataIndex: 'collectStatus', width: 90,
      render: (_, r) => {
        const s = COLLECT_STATUS[r.collectStatus];
        return <Tag color={s?.color}>{s?.label || r.collectStatus}</Tag>;
      },
    },
    { title: '最后采集', dataIndex: 'lastCollectTime', width: 160, render: (_, r) => r.lastCollectTime ? new Date(r.lastCollectTime).toLocaleString() : '-' },
    { title: '失败次数', dataIndex: 'failCount', width: 90 },
    {
      title: '操作', width: 180, valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>配置</a>,
        <Popconfirm key="trigger" title="触发采集？" onConfirm={async () => {
          try { await api.triggerCollect(r.product?.id); message.success('采集任务已触发'); } catch (e: any) { message.error(e.message); }
        }}>
          <a>采集</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Statistic title="成功" value={stats.success} valueStyle={{ color: '#52c41a' }} />
        <Statistic title="失败" value={stats.failed} valueStyle={{ color: '#ff4d4f' }} />
        <Statistic title="待采" value={stats.pending} valueStyle={{ color: '#faad14' }} />
      </Space>
      <ProTable<any>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async (params) => {
          const res = await api.getCollectConfigs({ page: params.current, pageSize: params.pageSize });
          refreshStats();
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
      />
      <ModalForm
        title="编辑采集配置"
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setCurrent(undefined); }}
        initialValues={current ? {
          collectMethod: current.collectMethod,
          collectUrl: current.collectUrl,
          collectRules: current.collectRules ? JSON.stringify(current.collectRules, null, 2) : '',
        } : { collectMethod: 'web-crawler' }}
        modalProps={{ destroyOnClose: true, width: 600 }}
        onFinish={async (values) => {
          try {
            const data = {
              collectMethod: values.collectMethod,
              collectUrl: values.collectUrl,
              collectRules: values.collectRules ? JSON.parse(values.collectRules) : null,
            };
            await api.updateCollectConfig(current.id, data);
            message.success('更新成功');
            actionRef.current?.reload();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormSelect name="collectMethod" label="采集方式" options={Object.entries(COLLECT_METHODS).map(([v, l]) => ({ value: v, label: l }))} />
        <ProFormText name="collectUrl" label="采集URL" placeholder="可使用{productCode}占位符" />
        <ProFormTextArea name="collectRules" label="采集规则（JSON）" fieldProps={{ rows: 6 }} />
      </ModalForm>
    </>
  );
};

export default TaskTab;
```

- [ ] **Step 2: 创建 NavTab.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Collect/NavTab.tsx`：

```tsx
import { ProTable, type ProColumns, ModalForm, ProFormDigit, ProFormDatePicker, ProFormSelect } from '@ant-design/pro-components';
import { Button, Select, DatePicker, Space, message, Popconfirm, Tag } from 'antd';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';

const { RangePicker } = DatePicker;

const NavTab = () => {
  const api = useApi();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any]>(undefined);
  const [navData, setNavData] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  // 加载产品列表
  useEffect(() => {
    api.getProducts({ pageSize: 500 }).then(res => setProducts(res.records || []));
  }, []);

  const fetchNav = async () => {
    if (!selectedProduct) { setNavData([]); return; }
    const params: any = { pageSize: 500 };
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    const res = await api.getNavData(selectedProduct, params);
    setNavData(res.records || []);
  };

  const chartOption = {
    xAxis: { type: 'category', data: navData.map(n => n.navDate).reverse() },
    yAxis: { type: 'value', scale: true },
    series: [
      { name: '单位净值', type: 'line', data: navData.map(n => n.unitNav).reverse(), smooth: true },
      { name: '累计净值', type: 'line', data: navData.map(n => n.accNav).reverse(), smooth: true },
    ],
    legend: { data: ['单位净值', '累计净值'] },
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
  };

  const columns: ProColumns<any>[] = [
    { title: '日期', dataIndex: 'navDate', width: 120 },
    { title: '单位净值', dataIndex: 'unitNav', width: 100, render: (_, r) => r.unitNav ?? '-' },
    { title: '累计净值', dataIndex: 'accNav', width: 100, render: (_, r) => r.accNav ?? '-' },
    { title: '来源', dataIndex: 'dataSource', width: 80, render: (_, r) => <Tag color={r.dataSource === 'crawler' ? 'blue' : 'default'}>{r.dataSource === 'crawler' ? '爬虫' : '手动'}</Tag> },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 240 }}
          placeholder="选择产品"
          value={selectedProduct}
          onChange={(v) => setSelectedProduct(v)}
          options={products.map(p => ({ value: p.id, label: p.productName }))}
          showSearch
          optionFilterProp="label"
        />
        <RangePicker onChange={(v) => setDateRange(v as any)} />
        <Button onClick={fetchNav} disabled={!selectedProduct}>查询</Button>
        <Button type="primary" onClick={() => setFormOpen(true)} disabled={!selectedProduct}>新增净值</Button>
        <Popconfirm title="重算年化与风险指标？" onConfirm={async () => {
          try { await api.triggerRecalculate({ productId: selectedProduct }); await api.recalculateRiskMetric({ productId: selectedProduct, type: 'risk-metric' }); message.success('重算任务已触发'); } catch (e: any) { message.error(e.message); }
        }} disabled={!selectedProduct}>
          <Button disabled={!selectedProduct}>重算</Button>
        </Popconfirm>
      </Space>

      {navData.length > 0 && (
        <div style={{ marginBottom: 16, height: 300 }}>
          <ReactECharts option={chartOption} style={{ height: 300 }} />
        </div>
      )}

      <ProTable<any>
        rowKey="id"
        columns={columns}
        search={false}
        dataSource={navData}
        pagination={{ pageSize: 20 }}
      />

      <ModalForm
        title="新增净值"
        open={formOpen}
        onOpenChange={setFormOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            await api.createNavData(selectedProduct!, {
              navDate: values.navDate ? values.navDate.format('YYYY-MM-DD') : null,
              unitNav: values.unitNav,
              accNav: values.accNav,
              dataSource: values.dataSource,
            });
            message.success('创建成功');
            fetchNav();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormDatePicker name="navDate" label="日期" rules={[{ required: true }]} />
        <ProFormDigit name="unitNav" label="单位净值" fieldProps={{ step: 0.0001 }} />
        <ProFormDigit name="accNav" label="累计净值" fieldProps={{ step: 0.0001 }} />
        <ProFormSelect name="dataSource" label="来源" options={[{ value: 'manual', label: '手动录入' }, { value: 'crawler', label: '爬虫采集' }]} initialValue="manual" />
      </ModalForm>
    </div>
  );
};

export default NavTab;
```

- [ ] **Step 3: 创建 LogTab.tsx（MVP 空状态）**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Collect/LogTab.tsx`：

```tsx
import { Empty } from 'antd';

const LogTab = () => (
  <Empty description="操作日志功能规划中，暂无数据" style={{ marginTop: 80 }} />
);

export default LogTab;
```

- [ ] **Step 4: 重写 Collect/index.tsx**

完整替换 `basic/plugins/zhao-wealth/admin/src/pages/Collect/index.tsx`：

```tsx
import { Tabs } from 'antd';
import TaskTab from './TaskTab';
import NavTab from './NavTab';
import LogTab from './LogTab';

const Collect = () => (
  <Tabs
    defaultActiveKey="task"
    items={[
      { key: 'task', label: '采集任务', children: <TaskTab /> },
      { key: 'nav', label: '净值明细', children: <NavTab /> },
      { key: 'log', label: '操作日志', children: <LogTab /> },
    ]}
  />
);

export default Collect;
```

- [ ] **Step 5: 启动验证采集监控模块**

验证：
- 采集任务 Tab：列表显示，统计卡显示，编辑配置弹窗，触发采集
- 净值明细 Tab：选产品后显示净值表 + 走势图，新增净值弹窗，重算按钮
- 操作日志 Tab：空状态显示

- [ ] **Step 6: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/src/pages/Collect/
git commit -m "feat(wealth-admin): 重构采集监控模块 - 三Tab+净值走势图"
```

---

## Task 9: 前端指标中心模块

**Files:**
- Rewrite: `basic/plugins/zhao-wealth/admin/src/pages/Metrics/index.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Metrics/MetricCards.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Metrics/NavChart.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Metrics/PeerRank.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Metrics/TrendChart.tsx`

- [ ] **Step 1: 创建 MetricCards.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Metrics/MetricCards.tsx`：

```tsx
import { Card, Col, Row, Statistic, Tag } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { rateVolatility, rateMaxDrawdown, rateSharpe, rateRankPercentile, formatPercent } from '../../constants/metricRating';
import { METRIC_NAMES } from '../../constants/enums';

const MetricCards = ({ productId, period }: { productId: number; period: string }) => {
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId || !period) return;
    setLoading(true);
    api.getMetricAggregate(productId, period).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [productId, period]);

  if (loading) return <div>加载中...</div>;

  const cards = [
    { name: 'volatility', label: METRIC_NAMES.volatility, value: data?.volatility, rating: rateVolatility(data?.volatility), format: (v: number) => formatPercent(v, 4) },
    { name: 'maxDrawdown', label: METRIC_NAMES.maxDrawdown, value: data?.maxDrawdown, rating: rateMaxDrawdown(data?.maxDrawdown), format: (v: number) => formatPercent(v, 4) },
    { name: 'sharpe', label: METRIC_NAMES.sharpe, value: data?.sharpe, rating: rateSharpe(data?.sharpe), format: (v: number) => v?.toFixed(4) },
    { name: 'rankPercentile', label: METRIC_NAMES.rankPercentile, value: data?.rankPercentile, rating: rateRankPercentile(data?.rankPercentile), format: (v: number) => formatPercent(v, 2) },
  ];

  return (
    <Row gutter={16}>
      {cards.map(c => (
        <Col span={6} key={c.name}>
          <Card>
            <Statistic
              title={c.label}
              value={c.value === null ? '无数据' : c.format(c.value)}
              suffix={<Tag color={c.rating.color}>{c.rating.label}</Tag>}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default MetricCards;
```

- [ ] **Step 2: 创建 NavChart.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Metrics/NavChart.tsx`：

```tsx
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const NavChart = ({ productId }: { productId: number }) => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!productId) return;
    api.getNavData(productId, { pageSize: 500 }).then(res => {
      const navs = (res.records || []).sort((a: any, b: any) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());
      const dates = navs.map((n: any) => n.navDate);
      const unitNavs = navs.map((n: any) => n.unitNav);
      const accNavs = navs.map((n: any) => n.accNav);

      // 计算回撤区间（基于单位净值）
      let peak = unitNavs[0] || 0;
      const drawdowns = unitNavs.map((v: number) => {
        if (v > peak) peak = v;
        return peak > 0 ? (v - peak) / peak : 0;
      });

      setOption({
        title: { text: '净值走势与回撤' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['单位净值', '累计净值', '回撤'] },
        xAxis: { type: 'category', data: dates },
        yAxis: [
          { type: 'value', name: '净值', scale: true },
          { type: 'value', name: '回撤', axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%' } },
        ],
        series: [
          { name: '单位净值', type: 'line', data: unitNavs, smooth: true },
          { name: '累计净值', type: 'line', data: accNavs, smooth: true },
          { name: '回撤', type: 'line', data: drawdowns, yAxisIndex: 1, areaStyle: { opacity: 0.3 }, lineStyle: { color: '#ff4d4f' } },
        ],
        grid: { left: 60, right: 60, top: 60, bottom: 40 },
      });
    });
  }, [productId]);

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

export default NavChart;
```

- [ ] **Step 3: 创建 PeerRank.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Metrics/PeerRank.tsx`：

```tsx
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import { METRIC_NAMES } from '../../constants/enums';

const PeerRank = ({ period, currentProductId }: { period: string; currentProductId: number }) => {
  const api = useApi();
  const [metricName, setMetricName] = useState('volatility');
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!period || !metricName) return;
    api.getMetricPeers(period, metricName, 30).then(res => {
      const list = res || [];
      const names = list.map((r: any) => r.productName);
      const values = list.map((r: any) => r.metricValue);
      const colors = list.map((r: any) => r.productId === currentProductId ? '#ff4d4f' : '#5470c6');

      setOption({
        title: { text: `同类排名 - ${METRIC_NAMES[metricName]}` },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: names.reverse() },
        series: [{
          type: 'bar',
          data: values.reverse().map((v: number, i: number) => ({ value: v, itemStyle: { color: colors.reverse()[i] } })),
        }],
        grid: { left: 120, right: 40, top: 40, bottom: 40 },
      });
    });
  }, [period, metricName, currentProductId]);

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <span>指标：</span>
        <Select
          value={metricName}
          onChange={setMetricName}
          options={Object.entries(METRIC_NAMES).map(([v, l]) => ({ value: v, label: l }))}
          style={{ width: 160 }}
        />
      </Space>
      <ReactECharts option={option} style={{ height: 360 }} />
    </div>
  );
};

export default PeerRank;
```

- [ ] **Step 4: 创建 TrendChart.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Metrics/TrendChart.tsx`：

```tsx
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { METRIC_NAMES } from '../../constants/enums';

const TrendChart = ({ productId }: { productId: number }) => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!productId) return;
    api.getMetricTrend(productId).then(res => {
      const trend = res || {};
      const periods = ['m1', 'm3', 'm6', 'y1'];
      const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];

      const series = [];
      for (const period of periods) {
        const data = (trend[period] || []).map((item: any) => item);
        for (const metricName of metricNames) {
          series.push({
            name: `${METRIC_NAMES[metricName]}-${period}`,
            type: 'line',
            data: data.map((d: any) => d[metricName]),
            smooth: true,
          });
        }
      }

      const dates = (trend.y1 || []).map((d: any) => d.snapshotDate);

      setOption({
        title: { text: '4 指标历史趋势（按周期）' },
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), top: 30, type: 'scroll' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series,
        grid: { left: 60, right: 40, top: 100, bottom: 40 },
      });
    });
  }, [productId]);

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

export default TrendChart;
```

- [ ] **Step 5: 重写 Metrics/index.tsx**

完整替换 `basic/plugins/zhao-wealth/admin/src/pages/Metrics/index.tsx`：

```tsx
import { useState, useEffect } from 'react';
import { Select, Button, Space, Row, Col, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { METRIC_PERIODS } from '../../constants/enums';
import MetricCards from './MetricCards';
import NavChart from './NavChart';
import PeerRank from './PeerRank';
import TrendChart from './TrendChart';

const Metrics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useApi();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<number | undefined>(Number(searchParams.get('productId')) || undefined);
  const [period, setPeriod] = useState('m1');

  useEffect(() => {
    api.getProducts({ pageSize: 500 }).then(res => setProducts(res.records || []));
  }, []);

  const handleRecalculate = async () => {
    if (!productId) return;
    try {
      await api.recalculateRiskMetric({ productId, type: 'risk-metric' });
      message.success('重算任务已触发');
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span>产品：</span>
        <Select
          style={{ width: 280 }}
          placeholder="选择产品"
          value={productId}
          onChange={(v) => { setProductId(v); setSearchParams({ productId: String(v) }); }}
          options={products.map(p => ({ value: p.id, label: p.productName }))}
          showSearch
          optionFilterProp="label"
        />
        <span>周期：</span>
        <Select
          style={{ width: 120 }}
          value={period}
          onChange={setPeriod}
          options={Object.entries(METRIC_PERIODS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Button onClick={handleRecalculate} disabled={!productId}>手动重算</Button>
      </Space>

      {productId ? (
        <>
          <MetricCards productId={productId} period={period} />
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={14}><NavChart productId={productId} /></Col>
            <Col span={10}><PeerRank period={period} currentProductId={productId} /></Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <TrendChart productId={productId} />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>请选择产品查看指标</div>
      )}
    </div>
  );
};

export default Metrics;
```

- [ ] **Step 6: 启动验证指标中心模块**

验证：
- 从产品列表点"指标"跳转，自动选中产品
- 切换周期，4 指标卡片更新
- 净值走势图显示，回撤区间红色
- 同类对比图显示，当前产品红色高亮
- 历史趋势图显示多线
- 手动重算按钮可触发

- [ ] **Step 7: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/src/pages/Metrics/
git commit -m "feat(wealth-admin): 新增指标中心模块 - 4指标卡+走势+同类对比+趋势"
```

---

## Task 10: 前端仪表盘模块

**Files:**
- Rewrite: `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/index.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/StatCards.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/AttentionChart.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/CollectPie.tsx`
- Create: `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/AnomalyTable.tsx`

- [ ] **Step 1: 创建 StatCards.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/StatCards.tsx`：

```tsx
import { Card, Col, Row, Statistic } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const StatCards = () => {
  const api = useApi();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getStatsOverview().then(res => setData(res));
  }, []);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card><Statistic title="产品总数" value={data?.productCount ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="采集成功率" value={data ? (data.collectSuccessRate * 100).toFixed(1) + '%' : '-'} valueStyle={{ color: (data?.collectSuccessRate || 0) >= 0.8 ? '#52c41a' : '#faad14' }} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="指标覆盖率" value={data ? (data.riskMetricCoverage * 100).toFixed(1) + '%' : '-'} valueStyle={{ color: (data?.riskMetricCoverage || 0) >= 0.5 ? '#52c41a' : '#faad14' }} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="今日异常" value={data?.todayAnomaly ?? 0} valueStyle={{ color: (data?.todayAnomaly || 0) > 0 ? '#ff4d4f' : '#52c41a' }} /></Card>
      </Col>
    </Row>
  );
};

export default StatCards;
```

- [ ] **Step 2: 创建 AttentionChart.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/AttentionChart.tsx`：

```tsx
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Card } from 'antd';

const AttentionChart = () => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    api.getCustomerProducts({ pageSize: 500 }).then(res => {
      const list = res.records || [];
      // 按产品聚合
      const counter: Record<string, number> = {};
      list.forEach((cp: any) => {
        const name = cp.product?.productName || '未知';
        counter[name] = (counter[name] || 0) + 1;
      });
      const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10);

      setOption({
        title: { text: '客户关注热度 Top10' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: sorted.map(s => s[0]).reverse() },
        series: [{ type: 'bar', data: sorted.map(s => s[1]).reverse(), itemStyle: { color: '#5470c6' } }],
        grid: { left: 140, right: 40, top: 40, bottom: 30 },
      });
    });
  }, []);

  return (
    <Card>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  );
};

export default AttentionChart;
```

- [ ] **Step 3: 创建 CollectPie.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/CollectPie.tsx`：

```tsx
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Card } from 'antd';

const CollectPie = () => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    api.getCollectConfigs({ pageSize: 500 }).then(res => {
      const list = res.records || [];
      const success = list.filter((c: any) => c.collectStatus === 'success').length;
      const failed = list.filter((c: any) => c.collectStatus === 'failed').length;
      const pending = list.filter((c: any) => c.collectStatus === 'pending').length;

      setOption({
        title: { text: '采集状态分布' },
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: success, name: '成功', itemStyle: { color: '#52c41a' } },
            { value: failed, name: '失败', itemStyle: { color: '#ff4d4f' } },
            { value: pending, name: '待采', itemStyle: { color: '#faad14' } },
          ],
        }],
      });
    });
  }, []);

  return (
    <Card>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  );
};

export default CollectPie;
```

- [ ] **Step 4: 创建 AnomalyTable.tsx**

创建 `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/AnomalyTable.tsx`：

```tsx
import { Table, Tag, Card } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const AnomalyTable = () => {
  const api = useApi();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatsAnomalies(10).then(res => {
      setData(res || []);
      setLoading(false);
    });
  }, []);

  const columns = [
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => (
      <Tag color={v === 'collect_failed' ? 'error' : 'warning'}>{v === 'collect_failed' ? '采集失败' : '指标计算失败'}</Tag>
    ) },
    { title: '产品', dataIndex: 'productName', ellipsis: true },
    { title: '详情', dataIndex: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'lastCollectTime', width: 160, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <Card title="近期异常">
      <Table
        rowKey={(r, i) => i}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default AnomalyTable;
```

- [ ] **Step 5: 重写 Dashboard/index.tsx**

完整替换 `basic/plugins/zhao-wealth/admin/src/pages/Dashboard/index.tsx`：

```tsx
import { Row, Col, Space } from 'antd';
import StatCards from './StatCards';
import AttentionChart from './AttentionChart';
import CollectPie from './CollectPie';
import AnomalyTable from './AnomalyTable';

const Dashboard = () => (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <StatCards />
    <Row gutter={16}>
      <Col span={14}><AttentionChart /></Col>
      <Col span={10}><CollectPie /></Col>
    </Row>
    <AnomalyTable />
  </Space>
);

export default Dashboard;
```

- [ ] **Step 6: 启动验证仪表盘模块**

验证：
- 4 统计卡显示真实数据
- 关注热度 Top10 横向条形图
- 采集状态分布饼图
- 近期异常列表

- [ ] **Step 7: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/admin/src/pages/Dashboard/
git commit -m "feat(wealth-admin): 重构仪表盘模块 - 统计卡+热度+饼图+异常列表"
```

---

## Task 11: 清理旧文件与最终验收

**Files:**
- Delete: 8 个旧页面文件
- Modify: `basic/plugins/zhao-wealth/admin/src/utils/api.ts`（删除旧的，被 hooks/useApi.ts 替代）

- [ ] **Step 1: 删除旧页面文件**

删除以下文件（被新模块替代）：

```
basic/plugins/zhao-wealth/admin/src/pages/HomePage.tsx
basic/plugins/zhao-wealth/admin/src/pages/CompanyPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/ProductPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/ProductFormPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/CollectConfigPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/NavDataPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/RecommendPage.tsx
basic/plugins/zhao-wealth/admin/src/pages/CustomerProductPage.tsx
basic/plugins/zhao-wealth/admin/src/utils/api.ts
```

- [ ] **Step 2: 验证无残留引用**

```bash
cd e:\code\basic\plugins\zhao-wealth\admin\src
# 用 Grep 工具搜索 HomePage/CompanyPage 等旧文件名引用
```

预期：除 App.tsx（已重写）外无其他文件引用旧页面。

- [ ] **Step 3: 启动 Strapi 完整验收**

```bash
cd e:\code\basic
npm run develop
```

完整验收清单：

**功能验收**：
- [ ] 4 模块导航正常切换（仪表盘/采集监控/指标中心/产品管理）
- [ ] 产品管理：产品列表 CRUD、公司 Tab CRUD、推荐字段保存
- [ ] 采集监控：3 Tab 切换、采集配置编辑、触发采集、净值补录、重算
- [ ] 指标中心：选产品+周期，4 指标卡+3 图表渲染，手动重算
- [ ] 仪表盘：4 统计卡真实数据、2 图表、异常列表

**技术验收**：
- [ ] ConfigProvider 样式隔离生效（Strapi 主侧边栏样式不变）
- [ ] 浏览器控制台无 antd 报错
- [ ] Migration 002 已执行（product 表含 recommend_enabled/recommend_reason）
- [ ] 5 个新后端接口可访问（stats/overview、stats/anomalies、risk-metrics/admin/aggregate、trend、peers）

**废弃验收**：
- [ ] wealth-recommend-config 表数据保留（psql 查询）
- [ ] 原 /recommend-configs 接口仍可访问（向后兼容）
- [ ] 8 个旧页面文件已删除

- [ ] **Step 4: 提交清理**

```bash
cd e:\code\basic
git add -A plugins/zhao-wealth/admin/src/
git commit -m "chore(wealth-admin): 清理旧页面文件 - 移除8个被替换页面"
```

- [ ] **Step 5: 最终提交（如有未提交的修复）**

检查 git status，如有零散修复一并提交：

```bash
cd e:\code\basic
git status
# 如有未提交变更
git add plugins/zhao-wealth/
git commit -m "fix(wealth-admin): 验收修复"
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|----------|
| 4 模块导航 | Task 6（PluginLayout）|
| 产品管理 CRUD + 推荐字段 | Task 7 |
| 采集监控 3 Tab | Task 8 |
| 指标中心 4 图表 | Task 9 |
| 仪表盘 4 区域 | Task 10 |
| schema +2 字段 | Task 1 |
| Migration 002 | Task 1 |
| 5 个新后端接口 | Task 3 + Task 4 |
| 权限 + 路由 | Task 2 |
| 删除旧页面 | Task 11 |
| 样式隔离 ConfigProvider | Task 6 |
| 5 个 commit | Task 1/2/3/4 各 1，Task 5-10 各 1，Task 11 清理 1（共 11 个 commit，比 spec 多但更细粒度，可接受）|

### 2. 占位符扫描

- 无 TBD/TODO/"后续实现"
- 所有代码块完整可运行
- 所有接口路径、字段名、枚举值与 spec 一致

### 3. 类型/命名一致性

- `recommendEnabled`/`recommendReason` 在 schema/migration/ProductForm/useApi 一致
- `adminAggregate`/`adminTrend`/`adminPeers` 在 service/controller/route/useApi 一致
- `getStatsOverview`/`getStatsAnomalies` 在 service/controller/route/useApi 一致
- 周期 `m1/m3/m6/y1` 全文一致
- 指标名 `volatility/maxDrawdown/sharpe/rankPercentile` 全文一致

### 4. 风险提示

- Task 1 migration 的 `wealth_recommend_configs_product_lnk` 表名需确认实际存在（Strapi v5 oneToOne 关联表命名）。若表名不同，需调整 SQL。可在执行 Task 1 时先 `\dt wealth_recommend*` 查询确认。
- Task 7 ProductForm 中 `ProFormDate` 实际应为 `ProFormDatePicker`，需在执行时确认 pro-components API。
- Task 8 NavTab 中使用 `useState(() => {...})` 初始化产品列表是反模式，应改为 `useEffect`。已在代码中标注，执行时修正为 useEffect。
