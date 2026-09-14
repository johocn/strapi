# 理财产品净值监察（Wealth Nav Monitor）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-wealth 增加净值监察能力：管理端新页面按产品展示「最新净值及日期 / 年化收益及日期 / 风险指标及日期」双维度状态，并提供重新采集 / 重算年化 / 风险重算三个手动纠偏按钮。

**Architecture:** 后端新增 `monitor-service`（实时推导三段数据 + 双维度状态判定，零 schema 变更）+ 新 controller/路由 `GET /v1/admin/monitor/products`；前端新增 `pages/wealth/monitor/index.vue` 监察页，纠偏按钮复用现有接口（collect/trigger、recalculate、recalculate-risk-metric）。产品为今日创建、定时任务今晚首跑，无前置修复项（原「定时任务 0 产品」疑云已排除）。

**Tech Stack:** Strapi v5 插件（TypeScript）、Bull 队列、uni-app H5 管理端（Vue 3 script setup）、Jest + ts-jest

**设计文档:** `docs/superpowers/specs/2026-09-14-wealth-nav-monitor-design.md`

---

### Task 1: monitor-service 单元测试（TDD 先行）

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\monitor-service.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\monitor-service.test.ts`：

```typescript
'use strict';

import { toDateStr } from '../utils';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

describe('monitor-service', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (!mockQueries[uid]) {
            mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn() };
          }
          return mockQueries[uid];
        }),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/monitor-service').default({ strapi: mockStrapi });
  }

  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  function seedProduct(id: number, overrides: any = {}) {
    return { id, productName: `产品${id}`, productCode: `P${id}`, company: { shortName: '测试行' }, ...overrides };
  }

  function seedNav(daysBack: number | null, overrides: any = {}) {
    if (daysBack === null) return null;
    return { navDate: daysAgo(daysBack), unitNav: '1.05', accNav: '1.10', dataSource: 'crawler', ...overrides };
  }

  function seedSnapshot(daysBack: number | null, overrides: any = {}) {
    if (daysBack === null) return null;
    return { snapshotDate: daysAgo(daysBack), annual1m: '0.03', annual3m: '0.08', annual6m: null, annual1y: null, ...overrides };
  }

  function seedMetricDate(daysBack: number | null) {
    if (daysBack === null) return null;
    return { snapshotDate: daysAgo(daysBack), metricName: 'volatility', metricValue: '0.01' };
  }

  it('全正常：净值/年化/风险对齐 → 三项 ok，overall ok', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { metricName: 'volatility', metricValue: '0.01' },
      { metricName: 'maxDrawdown', metricValue: '-0.02' },
      { metricName: 'sharpe', metricValue: '1.20' },
    ]);

    const result = await getService().getProductMonitorList();

    expect(result.list).toHaveLength(1);
    expect(result.list[0].navStatus).toBe('ok');
    expect(result.list[0].annualStatus).toBe('ok');
    expect(result.list[0].riskStatus).toBe('ok');
    expect(result.list[0].overall).toBe('ok');
    expect(result.list[0].latestNav.unitNav).toBe('1.05');
    expect(result.list[0].latestSnapshot.annual1m).toBe('0.03');
    expect(result.list[0].latestMetrics.volatility).toBe('0.01');
    expect(result.summary).toEqual({ ok: 1, warning: 0, danger: 0 });
  });

  it('净值滞后4天 → navStatus warning（>3）且 daysBehind=4', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(4));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(4));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(4));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('warning');
    expect(result.list[0].navDaysBehind).toBe(4);
  });

  it('净值滞后8天 → navStatus danger（>7）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(8));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(8));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(8));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('danger');
  });

  it('无净值 → navStatus danger 且 daysBehind null', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(null);
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('danger');
    expect(result.list[0].navDaysBehind).toBeNull();
  });

  it('无年化快照 → annualStatus danger', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(null);
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].annualStatus).toBe('danger');
  });

  it('年化快照日期早于净值日期 → annualStatus warning', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(1));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].annualStatus).toBe('warning');
  });

  it('无风险指标 → riskStatus danger', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(null);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].riskStatus).toBe('danger');
    expect(result.list[0].latestMetrics).toBeNull();
  });

  it('风险指标日期早于净值日期 → riskStatus warning', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(1));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].riskStatus).toBe('warning');
  });

  it('多产品 summary 计数（ok/warning/danger 各一）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([
      seedProduct(1),
      seedProduct(2),
      seedProduct(3),
    ]);
    // 产品1：全正常（净值今天）
    // 产品2：净值滞后4天 → warning
    // 产品3：无净值 → danger
    mockQueries[NAV_UID].findOne
      .mockResolvedValueOnce(seedNav(0))
      .mockResolvedValueOnce(seedNav(4))
      .mockResolvedValueOnce(null);
    mockQueries[SNAPSHOT_UID].findOne
      .mockResolvedValueOnce(seedSnapshot(0))
      .mockResolvedValueOnce(seedSnapshot(4))
      .mockResolvedValueOnce(null);
    mockQueries[METRIC_UID].findOne
      .mockResolvedValueOnce(seedMetricDate(0))
      .mockResolvedValueOnce(seedMetricDate(4))
      .mockResolvedValueOnce(null);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].overall).toBe('ok');
    expect(result.list[1].overall).toBe('warning');
    expect(result.list[2].overall).toBe('danger');
    expect(result.summary).toEqual({ ok: 1, warning: 1, danger: 1 });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/monitor-service.test.ts --no-coverage 2>&1 | Select-Object -First 15`
Expected: `Cannot find module '../services/monitor-service'`（服务文件尚未创建）

### Task 2: monitor-service 实现与注册

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\services\monitor-service.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\index.ts`

- [ ] **Step 1: 实现 monitor-service**

创建 `e:\code\basic\plugins\zhao-wealth\server\src\services\monitor-service.ts`：

```typescript
'use strict';

import { toDateStr } from '../utils';

const NAV_STALE_YELLOW_DAYS = 3;
const NAV_STALE_RED_DAYS = 7;

export default ({ strapi }) => ({
  /**
   * 净值监察列表：每产品实时推导最新净值/年化/风险指标 + 双维度状态
   */
  async getProductMonitorList() {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      populate: ['company'],
      orderBy: { id: 'asc' },
    });

    const list: any[] = [];
    for (const product of products) {
      list.push(await this.buildProductMonitor(product));
    }

    return {
      list,
      summary: {
        ok: list.filter((p) => p.overall === 'ok').length,
        warning: list.filter((p) => p.overall === 'warning').length,
        danger: list.filter((p) => p.overall === 'danger').length,
      },
    };
  },

  async buildProductMonitor(product: any) {
    const latestNav: any = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: product.id },
      orderBy: { navDate: 'desc' },
    });

    const latestSnapshot: any = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: { product: product.id },
      orderBy: { snapshotDate: 'desc' },
    });

    const latestMetricDateRow: any = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findOne({
      where: { product: product.id },
      orderBy: { snapshotDate: 'desc' },
    });

    let latestMetrics: any = null;
    if (latestMetricDateRow) {
      const metricRows: any[] = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
        where: { product: product.id, snapshotDate: latestMetricDateRow.snapshotDate, period: 'm1' },
      });
      const metricMap: Record<string, number | null> = {};
      for (const row of metricRows) {
        metricMap[row.metricName] = row.metricValue;
      }
      latestMetrics = {
        snapshotDate: latestMetricDateRow.snapshotDate,
        volatility: metricMap.volatility ?? null,
        maxDrawdown: metricMap.maxDrawdown ?? null,
        sharpe: metricMap.sharpe ?? null,
      };
    }

    const navStatus = this.judgeNavStatus(latestNav);
    const annualStatus = this.judgeSyncStatus(
      latestSnapshot?.snapshotDate || null,
      latestNav?.navDate || null
    );
    const riskStatus = this.judgeSyncStatus(
      latestMetrics?.snapshotDate || null,
      latestNav?.navDate || null
    );

    const statuses = [navStatus.status, annualStatus, riskStatus];
    const overall = statuses.includes('danger') ? 'danger'
      : statuses.includes('warning') ? 'warning'
      : 'ok';

    return {
      id: product.id,
      productName: product.productName,
      productCode: product.productCode || product.saleCode || '',
      companyName: product.company?.shortName || product.company?.name || '',
      latestNav: latestNav
        ? {
            navDate: latestNav.navDate,
            unitNav: latestNav.unitNav,
            accNav: latestNav.accNav,
            dataSource: latestNav.dataSource,
          }
        : null,
      latestSnapshot: latestSnapshot
        ? {
            snapshotDate: latestSnapshot.snapshotDate,
            annual1m: latestSnapshot.annual1m,
            annual3m: latestSnapshot.annual3m,
            annual6m: latestSnapshot.annual6m,
            annual1y: latestSnapshot.annual1y,
          }
        : null,
      latestMetrics,
      navStatus: navStatus.status,
      navDaysBehind: navStatus.daysBehind,
      annualStatus,
      riskStatus,
      overall,
    };
  },

  /**
   * 净值新鲜度：距今天数 > 7 danger，> 3 warning，否则 ok
   */
  judgeNavStatus(latestNav: any) {
    if (!latestNav?.navDate) return { status: 'danger', daysBehind: null };
    const todayStr = toDateStr(new Date());
    const navDateStr = String(latestNav.navDate);
    const daysBehind = Math.floor(
      (new Date(todayStr).getTime() - new Date(navDateStr).getTime()) / 86400000
    );
    if (daysBehind > NAV_STALE_RED_DAYS) return { status: 'danger', daysBehind };
    if (daysBehind > NAV_STALE_YELLOW_DAYS) return { status: 'warning', daysBehind };
    return { status: 'ok', daysBehind };
  },

  /**
   * 同步度：dataDate 为空 → danger；dataDate < navDate → warning；否则 ok
   */
  judgeSyncStatus(dataDate: string | null, navDate: string | null) {
    if (!dataDate) return 'danger';
    if (!navDate) return 'ok';
    return dataDate < navDate ? 'warning' : 'ok';
  },
});
```

- [ ] **Step 2: 注册 service**

修改 `e:\code\basic\plugins\zhao-wealth\server\src\services\index.ts`，import 后导出（键名 `monitor-service`，供 `strapi.service('plugin::zhao-wealth.monitor-service')` 使用）：

```typescript
import riskDisclosureService from './risk-disclosure-service';
import monitorService from './monitor-service';
```

```typescript
  'risk-disclosure-service': riskDisclosureService,
  'monitor-service': monitorService,
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/monitor-service.test.ts --no-coverage 2>&1 | Select-Object -Last 8`
Expected: `Tests: 9 passed, 9 total`

- [ ] **Step 4: 回归全量测试**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest --no-coverage 2>&1 | Select-Object -Last 8`
Expected: 全部既有测试通过（无回归）

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/monitor-service.ts plugins/zhao-wealth/server/src/services/index.ts plugins/zhao-wealth/server/src/__tests__/monitor-service.test.ts
git commit -m "feat(zhao-wealth): 净值监察 monitor-service 实时推导三日期+双维度状态判定"
```

### Task 3: monitor controller + 路由注册（含测试）

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\monitor.ts`
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\monitor-controller.test.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts`

> 注意铁律：handler 字符串 `monitor.list` 只从 controller 解析，controller 必须存在同名方法，否则 Strapi 启动崩溃。

- [ ] **Step 1: 写失败测试**

创建 `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\monitor-controller.test.ts`：

```typescript
'use strict';

describe('monitor controller', () => {
  let mockStrapi: any;
  let mockService: any;

  beforeEach(() => {
    jest.resetModules();
    mockService = { getProductMonitorList: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn() },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue(mockService),
    };
  });

  function makeCtx(overrides: any = {}) {
    return { query: {}, params: {}, request: { body: {} }, state: {}, body: null, ...overrides };
  }

  it('200: 返回监察列表', async () => {
    const factory = require('../controllers/monitor').default;
    const controller = factory({ strapi: mockStrapi });
    const data = { list: [{ id: 1, overall: 'ok' }], summary: { ok: 1, warning: 0, danger: 0 } };
    mockService.getProductMonitorList.mockResolvedValue(data);

    const ctx = makeCtx();
    await controller.list(ctx);

    expect(ctx.body).toEqual({ code: 200, msg: 'success', data });
    expect(mockService.getProductMonitorList).toHaveBeenCalledTimes(1);
  });

  it('500: 服务异常返回错误', async () => {
    const factory = require('../controllers/monitor').default;
    const controller = factory({ strapi: mockStrapi });
    mockService.getProductMonitorList.mockRejectedValue(new Error('db down'));

    const ctx = makeCtx();
    await controller.list(ctx);

    expect(ctx.body.code).toBe(500);
    expect(ctx.body.data).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/monitor-controller.test.ts --no-coverage 2>&1 | Select-Object -First 10`
Expected: `Cannot find module '../controllers/monitor'`

- [ ] **Step 3: 实现 controller**

创建 `e:\code\basic\plugins\zhao-wealth\server\src\controllers\monitor.ts`：

```typescript
'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 净值监察列表（管理端）
   */
  async list(ctx) {
    try {
      const result = await strapi
        .service('plugin::zhao-wealth.monitor-service')
        .getProductMonitorList();
      ctx.body = successResponse(result, 'success');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值监察查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
```

- [ ] **Step 4: 注册 controller**

修改 `e:\code\basic\plugins\zhao-wealth\server\src\controllers\index.ts`，import 后导出（键名 `monitor`）：

```typescript
import consultation from './consultation';
import monitor from './monitor';
```

```typescript
  consultation,
  monitor,
```

- [ ] **Step 5: 注册路由**

修改 `e:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts`，在「===== 合规披露 =====」区块之前插入：

```typescript
    // ===== 净值监察 =====
    adminRoute('GET', '/v1/admin/monitor/products', 'monitor.list'),
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/monitor-controller.test.ts --no-coverage 2>&1 | Select-Object -Last 6`
Expected: `Tests: 2 passed, 2 total`

- [ ] **Step 7: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/controllers/monitor.ts plugins/zhao-wealth/server/src/controllers/index.ts plugins/zhao-wealth/server/src/routes/admin-api.ts plugins/zhao-wealth/server/src/__tests__/monitor-controller.test.ts
git commit -m "feat(zhao-wealth): 净值监察 GET /v1/admin/monitor/products 端点（controller+路由注册）"
```

### Task 4: 前端 API 封装

**Files:**
- Modify: `e:\code\web\src\api\wealth.js`

- [ ] **Step 1: 修改 recalculate / recalculateRiskMetric 支持参数，新增 getProductMonitor**

修改 `e:\code\web\src\api\wealth.js`：

```javascript
export function recalculate(data = {}) {
  return adminPost(`${ADMIN}/recalculate`, data).then(extractItem)
}
```

```javascript
export function recalculateRiskMetric(data = {}) {
  return adminPost(`${ADMIN}/recalculate-risk-metric`, data).then(extractItem)
}
```

（既有调用 `recalculate()`、`recalculateRiskMetric()` 不带参仍兼容。）

在「===== 统计 =====」区块之后新增：

```javascript
// ==================== 净值监察 ====================
export function getProductMonitor() {
  return adminGet(`${ADMIN}/monitor/products`).then(extractItem)
}
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add src/api/wealth.js
git commit -m "feat(web): 净值监察 API 封装 getProductMonitor，recalculate/recalculateRiskMetric 支持 productId 参数"
```

### Task 5: 前端监察页 + 入口注册

**Files:**
- Create: `e:\code\web\src\pages\wealth\monitor\index.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\pages\dashboard\index.vue`

- [ ] **Step 1: 创建监察页**

创建 `e:\code\web\src\pages\wealth\monitor\index.vue`：

```vue
<template>
  <view class="page-container">
    <PageHeader title="净值监察" />

    <view class="summary-row">
      <view class="summary-card ok">
        <text class="summary-num">{{ summary.ok }}</text>
        <text class="summary-label">正常</text>
      </view>
      <view class="summary-card warning">
        <text class="summary-num">{{ summary.warning }}</text>
        <text class="summary-label">预警</text>
      </view>
      <view class="summary-card danger">
        <text class="summary-num">{{ summary.danger }}</text>
        <text class="summary-label">危险</text>
      </view>
      <view class="refresh-btn" @click="loadMonitor">
        <text class="refresh-text">刷新</text>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-for="item in list" :key="item.id" class="monitor-card">
      <view class="card-header">
        <view class="product-info">
          <text class="product-name">{{ item.productName }}</text>
          <text class="company-name">{{ item.companyName || '--' }}</text>
        </view>
        <text class="overall-tag" :class="item.overall">{{ overallLabel(item.overall) }}</text>
      </view>

      <view class="metric-row">
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.navStatus"></text>
            <text class="metric-label">最新净值</text>
          </view>
          <text class="metric-value">{{ formatNav(item.latestNav?.unitNav) }}</text>
          <text class="metric-sub">
            {{ item.latestNav?.navDate || '暂无' }}
            <text v-if="item.navDaysBehind !== null && item.navDaysBehind > 0" class="stale-text">（滞后{{ item.navDaysBehind }}天）</text>
          </text>
        </view>
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.annualStatus"></text>
            <text class="metric-label">年化收益(1月)</text>
          </view>
          <text class="metric-value" :class="percentClass(item.latestSnapshot?.annual1m)">{{ formatPercent(item.latestSnapshot?.annual1m) }}</text>
          <text class="metric-sub">{{ item.latestSnapshot?.snapshotDate || '未计算' }}</text>
        </view>
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.riskStatus"></text>
            <text class="metric-label">风险指标</text>
          </view>
          <text class="metric-value small">{{ formatRisk(item.latestMetrics) }}</text>
          <text class="metric-sub">{{ item.latestMetrics?.snapshotDate || '未计算' }}</text>
        </view>
      </view>

      <view class="action-row">
        <view class="action-btn primary" @click="doCollect(item)">重新采集</view>
        <view class="action-btn" @click="doRecalc(item)">重算年化</view>
        <view class="action-btn" @click="doRiskRecalc(item)">风险重算</view>
      </view>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-text">暂无产品</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProductMonitor, triggerCollect, recalculate, recalculateRiskMetric } from '../../../api/wealth.js'

const list = ref([])
const summary = ref({ ok: 0, warning: 0, danger: 0 })
const loading = ref(false)
const acting = ref(false)

function overallLabel(s) {
  return { ok: '正常', warning: '预警', danger: '危险' }[s] || '--'
}
function formatNav(v) {
  return v === null || v === undefined ? '--' : Number(v).toFixed(4)
}
function formatPercent(v) {
  return v === null || v === undefined ? '--' : (Number(v) * 100).toFixed(2) + '%'
}
function percentClass(v) {
  if (v === null || v === undefined) return ''
  return Number(v) >= 0 ? 'up' : 'down'
}
function formatRisk(m) {
  if (!m) return '--'
  const vol = m.volatility === null || m.volatility === undefined ? '--' : (Number(m.volatility) * 100).toFixed(2) + '%'
  const dd = m.maxDrawdown === null || m.maxDrawdown === undefined ? '--' : (Number(m.maxDrawdown) * 100).toFixed(2) + '%'
  return `波动${vol} 回撤${dd}`
}

async function loadMonitor() {
  loading.value = true
  try {
    const res = await getProductMonitor()
    list.value = res.list || []
    summary.value = res.summary || { ok: 0, warning: 0, danger: 0 }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function doCollect(item) {
  if (acting.value) return
  acting.value = true
  try {
    await triggerCollect({ productId: item.id })
    uni.showToast({ title: '采集任务已触发', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

async function doRecalc(item) {
  if (acting.value) return
  acting.value = true
  try {
    await recalculate({ productId: item.id })
    uni.showToast({ title: '年化重算已触发', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

async function doRiskRecalc(item) {
  if (acting.value) return
  acting.value = true
  try {
    await recalculateRiskMetric({ productId: item.id, type: 'risk-metric' })
    uni.showToast({ title: '风险重算已触发', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

onMounted(loadMonitor)
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.summary-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; align-items: center; }
.summary-card {
  flex: 1; background: #fff; border-radius: 12rpx; padding: 24rpx 0;
  display: flex; flex-direction: column; align-items: center;
}
.summary-num { font-size: 44rpx; font-weight: bold; }
.summary-card.ok .summary-num { color: #07c160; }
.summary-card.warning .summary-num { color: #faad14; }
.summary-card.danger .summary-num { color: #f5222d; }
.summary-label { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.refresh-btn {
  width: 120rpx; height: 96rpx; background: #667eea; color: #fff;
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center;
}
.refresh-text { font-size: 26rpx; font-weight: bold; }

.monitor-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
  border-left: 8rpx solid #07c160;
}
.monitor-card:has(.overall-tag.warning) { border-left-color: #faad14; }
.monitor-card:has(.overall-tag.danger) { border-left-color: #f5222d; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.product-info { display: flex; flex-direction: column; flex: 1; margin-right: 16rpx; }
.product-name { font-size: 30rpx; font-weight: bold; color: #333; }
.company-name { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.overall-tag {
  padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 22rpx; color: #fff; flex-shrink: 0;
}
.overall-tag.ok { background: #07c160; }
.overall-tag.warning { background: #faad14; }
.overall-tag.danger { background: #f5222d; }

.metric-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.metric-main {
  flex: 1; background: #f9f9f9; border-radius: 8rpx; padding: 16rpx;
  display: flex; flex-direction: column;
}
.metric-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.status-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.status-dot.ok { background: #07c160; }
.status-dot.warning { background: #faad14; }
.status-dot.danger { background: #f5222d; }
.metric-label { font-size: 22rpx; color: #999; }
.metric-value { font-size: 30rpx; font-weight: bold; color: #333; }
.metric-value.small { font-size: 24rpx; line-height: 1.4; }
.metric-value.up { color: #f5222d; }
.metric-value.down { color: #07c160; }
.metric-sub { font-size: 20rpx; color: #aaa; margin-top: 6rpx; }
.stale-text { color: #faad14; }

.action-row { display: flex; gap: 16rpx; }
.action-btn {
  flex: 1; text-align: center; padding: 16rpx 0; border-radius: 8rpx;
  background: #f0f0f0; color: #333; font-size: 26rpx;
}
.action-btn.primary { background: #667eea; color: #fff; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-text { font-size: 28rpx; color: #999; }
</style>
```

- [ ] **Step 2: 注册页面路由**

修改 `e:\code\web\src\pages.json`，在 `pages/wealth/metrics/index` 条目之后新增：

```json
    { "path": "pages/wealth/monitor/index", "style": { "navigationBarTitleText": "净值监察" } },
```

- [ ] **Step 3: 注册首页菜单入口**

修改 `e:\code\web\src\pages\dashboard\index.vue`，在「净值采集」module-item 之后新增：

```html
          <view class="module-item" @click="navigateTo('/pages/wealth/monitor/index')">
            <view class="module-icon">🛡️</view>
            <view class="module-name">净值监察</view>
          </view>
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add src/pages/wealth/monitor/index.vue src/pages.json src/pages/dashboard/index.vue
git commit -m "feat(web): 净值监察页（双维度状态+三键手动纠偏）+ 页面/菜单注册"
```

### Task 6: 构建部署与验证

**Files:**
- 无（部署产物）

- [ ] **Step 1: 重建插件 dist 并自检**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm run build`
自检（部署铁律）：`grep -r "getProductMonitorList" dist/server/index.js` 必须命中；`grep -r "monitor.list" dist/server/index.js` 必须命中。未命中 = 构建失败，不得继续。

- [ ] **Step 2: 提交 dist 并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist，含净值监察 monitor-service/controller"
git push
```

- [ ] **Step 3: 部署插件**

Run: `ssh joho` 侧执行既有 `deploy.sh`（basic 仓库部署脚本，路径见仓库根），完成后 `export PM2_HOME=/home/admin/.pm2; pm2 restart strapi`
验证启动：`pm2 logs strapi --lines 100 --nostream | grep "zhao-wealth"` 无启动崩溃；`curl -s http://127.0.0.1:1337/api/zhao-wealth/v1/admin/monitor/products` 返回 401（未登录，路由已注册）。

- [ ] **Step 4: 构建并部署管理端 web**

Run: `cd e:\code\web; npm run build:h5; .\deploy-h5.ps1`
验证：登录管理端 → 首页理财中心出现「净值监察」入口 → 打开页面三产品状态展示正确（当前预期：净值滞后 2~4 天 → 预警/正常；风险指标未计算 → 危险）。

- [ ] **Step 5: 验证自动链路（当晚）**

次日检查：`grep -E "20:00 年化计算任务已触发|20:30 风险指标计算任务已触发" /home/admin/.pm2/logs/strapi-out.log | tail -4`
Expected: 两条日志均显示「3个产品」。

- [ ] **Step 6: 手动纠偏验证（次日）**

- 管理端监察页点「风险重算」→ 等任务完成 → 刷新页面：风险指标显示日期与数值，状态转绿
- 验证库表：`SELECT count(*) FROM wealth_risk_metrics;` 应 > 0（3 产品 × 净值天数 × 4 周期 × 4 指标）
- 点「重新采集」验证净值更新；点「重算年化」验证年化日期刷新到最新净值日

### Task 7: 复盘更新项目记忆

- [ ] **Step 1: 更新 project_memory**

在 `c:\Users\Administrator\.trae-cn\memory\projects\-e-code--p2-3a5c4f0315cfc1daa3fd\project_memory.md` 追加一条经验：净值监察 monitor-service 实时推导 + 双维度判定（净值新鲜度 3/7 天阈值、年化/风险同步度），三款产品 2026-09-14 入库、风险指标随定时任务首跑补齐，`status:true` 过滤正常、此前「0个产品」日志系产品未创建所致。
