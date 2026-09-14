# 净值采集中心批量操作修复与增量计算 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复采集中心三个失效批量按钮（type 400 / 假成功），并将年化/风险指标全量重算改造为补缺增量计算，支撑 100+ 产品规模。

**Architecture:** 后端在 nav-calculator 与 risk-metric-service 新增 `recalculateMissing(productId?)` 补缺方法（应用层 diff「有净值但无快照/指标」的日期），4 个批量 job 与 2 个 controller 降级分支内部改为调用补缺方法（接口签名不变）；collect-single 成功后自动触发单产品年化+风险补缺，形成采集→计算闭环；collectStatus 枚举新增 `running` 供前端轮询完成判定。前端采集中心三个批量按钮触发后轮询现有接口（collect-configs + 监察接口）展示真实成功/失败汇总。

**Tech Stack:** Strapi v5 插件（TypeScript）、BullMQ（Redis 队列）、Vue 3 + uni-app（web 管理端）、jest（插件单测）。

**设计文档:** `docs/superpowers/specs/2026-09-14-wealth-collect-batch-fix-design.md`

---

## 文件结构

**后端（`plugins/zhao-wealth/server/src/`）：**
- Modify `services/nav-calculator.ts`：新增 `recalculateMissing(productId?)`（补缺年化快照）
- Modify `services/risk-metric-service.ts`：新增 `recalculateMissing(productId?)`（两阶段：先年化补缺、再指标补缺）
- Create `__tests__/nav-calculator.test.ts`：recalculateMissing 单测
- Create `__tests__/risk-metric-service.test.ts`：recalculateMissing 单测
- Modify `jobs/calculate-job.ts`：`recalculate-product` / `recalculate-all` 内部改补缺
- Modify `jobs/risk-metric-job.ts`：`recalculate-risk-metric-product` / `recalculate-all-risk-metrics` 内部改补缺
- Modify `controllers/collect.ts`：全量同步降级分支（约 L280）改 `recalculateMissing()`
- Modify `controllers/risk-metric.ts`：type 校验放宽（L68-72）+ 全量同步降级分支（L107）改 `recalculateMissing()`
- Modify `jobs/collect-job.ts`：采集成功联动改 `recalculate-product` + `recalculate-risk-metric-product`；job 开始置 `collectStatus='running'`
- Modify `content-types/wealth-collect-config/schema.json`：`collectStatus` 枚举新增 `'running'`

**前端（`web/src/`）：**
- Modify `api/wealth.js`：新增 `getAdminCollectConfigs()`
- Modify `pages/wealth/collect/index.vue`：三个批量按钮触发后轮询 + 结果汇总展示

---

### Task 1: nav-calculator 新增 recalculateMissing（TDD）

**Files:**
- Create: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts`
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts`

- [ ] **Step 1: 写失败测试**

创建 `__tests__/nav-calculator.test.ts`：

```typescript
'use strict';

import { toDateStr } from '../utils';

function d(day: number): Date {
  return new Date(`2026-06-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('nav-calculator.recalculateMissing', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, SNAPSHOT_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('单产品：只补缺「有净值但无快照」的日期，并返回明细', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    // 净值日期 6/1, 6/2, 6/3；已有快照仅 6/1
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }, { navDate: d(2) }, { navDate: d(3) }]);
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);
    mockQueries[SNAPSHOT_UID].create.mockResolvedValue({ id: 100 });

    const service = getService();
    service.calculateSnapshot = jest.fn(async (productId: number, snapshotDate: Date) => ({
      product: productId,
      snapshotDate,
      annual1d: 0.01,
    }));

    const result = await service.recalculateMissing(1);

    expect(mockQueries[NAV_UID].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { product: 1 } }));
    expect(service.calculateSnapshot).toHaveBeenCalledTimes(2); // 6/2, 6/3
    expect(mockQueries[SNAPSHOT_UID].create).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ productId: 1, missingDates: 2, calculated: 2 }]);
  });

  it('无缺失日期时零计算（幂等）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }]);
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

    const service = getService();
    service.calculateSnapshot = jest.fn();

    const result = await service.recalculateMissing(1);

    expect(service.calculateSnapshot).not.toHaveBeenCalled();
    expect(mockQueries[SNAPSHOT_UID].create).not.toHaveBeenCalled();
    expect(result).toEqual([{ productId: 1, missingDates: 0, calculated: 0 }]);
  });

  it('无参 = 全产品补缺', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockQueries[NAV_UID].findMany
      .mockResolvedValueOnce([{ navDate: d(1) }])   // 产品1
      .mockResolvedValueOnce([{ navDate: d(2) }]);  // 产品2
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([]);

    const service = getService();
    service.calculateSnapshot = jest.fn(async (productId: number, snapshotDate: Date) => ({ product: productId, snapshotDate }));

    const result = await service.recalculateMissing();

    expect(mockQueries[PRODUCT_UID].findMany).toHaveBeenCalledWith({});
    expect(result).toEqual([
      { productId: 1, missingDates: 1, calculated: 1 },
      { productId: 2, missingDates: 1, calculated: 1 },
    ]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd plugins/zhao-wealth && npx jest src/__tests__/nav-calculator.test.ts`
Expected: FAIL — `service.recalculateMissing is not a function`

- [ ] **Step 3: 实现 recalculateMissing**

在 `services/nav-calculator.ts` 末尾（`recalculateAll` 方法之后、闭包结束之前）新增：

```typescript
  /**
   * 补缺重算：只计算「有净值但无年化快照」的日期（增量）
   * 无 productId = 全产品；有 productId = 单产品（新产品首次采集后=全量回溯）
   */
  async recalculateMissing(productId?: number) {
    const filter = productId ? { where: { id: productId } } : {};
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany(filter);

    const results: { productId: number; missingDates: number; calculated: number }[] = [];

    for (const product of products) {
      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: { product: product.id },
        select: ['navDate'],
        orderBy: { navDate: 'asc' },
      });

      if (navs.length === 0) continue;

      const existingSnapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
        where: { product: product.id },
        select: ['snapshotDate'],
      });

      const existingDates = new Set(existingSnapshots.map((s: any) => toDateStr(s.snapshotDate)));
      const missingDates = navs.map((n: any) => toDateStr(n.navDate)).filter((dateStr: string) => !existingDates.has(dateStr));

      let calculated = 0;
      for (const dateStr of missingDates) {
        const snapshot = await this.calculateSnapshot(product.id, new Date(dateStr));
        if (snapshot) {
          await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
          calculated++;
        }
      }

      results.push({ productId: product.id, missingDates: missingDates.length, calculated });
    }

    strapi.log.info(`[zhao-wealth] 年化快照补缺完成，${results.length}个产品`);
    return results;
  },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd plugins/zhao-wealth && npx jest src/__tests__/nav-calculator.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts
git commit -m "feat(zhao-wealth): nav-calculator 新增 recalculateMissing 补缺重算"
```

---

### Task 2: risk-metric-service 新增 recalculateMissing（TDD）

**Files:**
- Create: `plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts`
- Modify: `plugins/zhao-wealth/server/src/services/risk-metric-service.ts`

- [ ] **Step 1: 写失败测试**

创建 `__tests__/risk-metric-service.test.ts`：

```typescript
'use strict';

function d(day: number): Date {
  return new Date(`2026-06-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('risk-metric-service.recalculateMissing', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';
  const navRecalcMissing = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    navRecalcMissing.mockReset();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]), connection: { raw: jest.fn() } },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue({ recalculateMissing: navRecalcMissing }),
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('单产品：先年化补缺，再只补缺「有净值但无指标」的日期', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }, { navDate: d(2) }]);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing(1);

    expect(navRecalcMissing).toHaveBeenCalledWith(1); // 阶段一：年化补缺
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledTimes(1); // 仅 6/2
    expect(result).toEqual([{ productId: 1, missingDates: 1 }]);
  });

  it('无缺失日期时零计算（幂等）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }]);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn();

    await service.recalculateMissing(1);

    expect(service.calculateAndSaveMetrics).not.toHaveBeenCalled();
  });

  it('无参 = 全产品补缺（阶段一也全量）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockQueries[NAV_UID].findMany
      .mockResolvedValueOnce([{ navDate: d(1) }])
      .mockResolvedValueOnce([{ navDate: d(2) }]);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing();

    expect(navRecalcMissing).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([
      { productId: 1, missingDates: 1 },
      { productId: 2, missingDates: 1 },
    ]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd plugins/zhao-wealth && npx jest src/__tests__/risk-metric-service.test.ts`
Expected: FAIL — `service.recalculateMissing is not a function`

- [ ] **Step 3: 实现 recalculateMissing**

在 `services/risk-metric-service.ts` 末尾（`recalculateAll` 方法之后、闭包结束之前）新增：

```typescript
  /**
   * 补缺重算风险指标（增量）
   * 两阶段：① 先补缺年化快照（sharpe/rank 依赖 annualReturn）
   *         ② 再按「有净值但无指标」的日期补缺，此时同日快照已齐，rank 准确
   */
  async recalculateMissing(productId?: number) {
    const navCalculator = strapi.service('plugin::zhao-wealth.nav-calculator');
    await navCalculator.recalculateMissing(productId);

    const filter = productId ? { where: { id: productId } } : {};
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany(filter);

    const results: { productId: number; missingDates: number }[] = [];

    for (const product of products) {
      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: { product: product.id },
        select: ['navDate'],
        orderBy: { navDate: 'asc' },
      });

      if (navs.length === 0) continue;

      const existingMetrics = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
        where: { product: product.id },
        select: ['snapshotDate'],
      });

      const existingDates = new Set(existingMetrics.map((m: any) => toDateStr(m.snapshotDate)));
      const missingDates = navs.map((n: any) => toDateStr(n.navDate)).filter((dateStr: string) => !existingDates.has(dateStr));

      for (const dateStr of missingDates) {
        try {
          await this.calculateAndSaveMetrics(product.id, new Date(dateStr));
        } catch (error: any) {
          strapi.log.error(`[zhao-wealth] 产品${product.id}风险指标补缺失败 ${dateStr}: ${error.message}`);
        }
      }

      results.push({ productId: product.id, missingDates: missingDates.length });
    }

    strapi.log.info(`[zhao-wealth] 风险指标补缺完成，${results.length}个产品`);
    return results;
  },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd plugins/zhao-wealth && npx jest src/__tests__/risk-metric-service.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts
git commit -m "feat(zhao-wealth): risk-metric-service 新增 recalculateMissing 两阶段补缺"
```

---

### Task 3: 批量 job 与 controller 降级分支改补缺 + type 校验修复

**Files:**
- Modify: `plugins/zhao-wealth/server/src/jobs/calculate-job.ts`
- Modify: `plugins/zhao-wealth/server/src/jobs/risk-metric-job.ts`
- Modify: `plugins/zhao-wealth/server/src/controllers/collect.ts`
- Modify: `plugins/zhao-wealth/server/src/controllers/risk-metric.ts`

- [ ] **Step 1: calculate-job.ts 单产品重算改补缺**

`recalculate-product` job（约 L27-40）body 替换为：

```typescript
  // 单产品补缺重算
  queue.process('recalculate-product', async (job) => {
    const { productId } = job.data;
    await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateMissing(productId);
  });
```

- [ ] **Step 2: calculate-job.ts 全量重算改补缺**

`recalculate-all` job（约 L55-69）内部调用替换（其余保留）：

```typescript
    try {
      await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateMissing();
    } finally {
      await releaseLock(lockKey);
    }
```

- [ ] **Step 3: risk-metric-job.ts 单产品重算改补缺**

`recalculate-risk-metric-product` job（约 L17-29）body 替换为：

```typescript
    // 单产品补缺重算（内部先补年化快照，再补风险指标）
    calcQueue.process('recalculate-risk-metric-product', async (job) => {
      const { productId } = job.data;
      await strapi.service('plugin::zhao-wealth.risk-metric-service').recalculateMissing(productId);
      strapi.log.info(`[zhao-wealth] 产品${productId}风险指标补缺完成`);
    });
```

- [ ] **Step 4: risk-metric-job.ts 全量重算改补缺**

`recalculate-all-risk-metrics` job（约 L37-51）内部调用替换：

```typescript
      try {
        await strapi.service('plugin::zhao-wealth.risk-metric-service').recalculateMissing();
      } finally {
        await releaseLock(lockKey);
      }
```

- [ ] **Step 5: collect.ts 全量同步降级改补缺**

`controllers/collect.ts` L278-282 替换为：

```typescript
          // 同步降级
          strapi.log.info('[zhao-wealth] Redis 不可用，同步全量年化补缺');
          await navCalculator.recalculateMissing();
          ctx.body = successResponse({}, '全量年化补缺完成（同步）');
```

- [ ] **Step 6: risk-metric.ts type 校验放宽 + 全量降级改补缺**

`controllers/risk-metric.ts` L68-72 替换为：

```typescript
      if (type && type !== 'risk-metric' && type !== 'all') {
        ctx.status = 400;
        ctx.body = errorResponse(400, "type 必须为 'risk-metric' 或 'all'");
        return;
      }
```

L107 替换为：

```typescript
          await riskMetricService.recalculateMissing();
          ctx.body = successResponse({}, '全量风险指标补缺完成（同步）');
```

- [ ] **Step 7: 编译验证**

Run: `cd plugins/zhao-wealth && npx tsc --noEmit -p tsconfig.json`
Expected: 无类型错误输出（exit 0）

- [ ] **Step 8: 提交**

```bash
git add plugins/zhao-wealth/server/src/jobs/calculate-job.ts plugins/zhao-wealth/server/src/jobs/risk-metric-job.ts plugins/zhao-wealth/server/src/controllers/collect.ts plugins/zhao-wealth/server/src/controllers/risk-metric.ts
git commit -m "feat(zhao-wealth): 批量 job 与降级分支改补缺重算，risk-metric type 校验放宽"
```

---

### Task 4: 采集→计算闭环 + running 状态标记 + schema 枚举

**Files:**
- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-collect-config/schema.json`
- Modify: `plugins/zhao-wealth/server/src/jobs/collect-job.ts`

- [ ] **Step 1: schema 枚举新增 running**

`content-types/wealth-collect-config/schema.json` L18 替换为：

```json
    "collectStatus": { "type": "enumeration", "enum": ["pending", "running", "success", "failed"], "default": "pending" },
```

- [ ] **Step 2: collect-single job 开始标记 running**

`jobs/collect-job.ts` 中 `collect-single` 处理函数开头（try 之前，拿到 config 之后）插入：

```typescript
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: { collectStatus: 'running' },
      });
```

- [ ] **Step 3: 采集成功联动改补缺**

`jobs/collect-job.ts` L116-120 替换为：

```typescript
      // 触发年化+风险指标补缺（老产品只补新日期，新产品自动全量回溯）
      const calculateQueue = getCalculateQueue();
      if (calculateQueue) {
        calculateQueue.add('recalculate-product', { productId });
        calculateQueue.add('recalculate-risk-metric-product', { productId });
      }
```

- [ ] **Step 4: 运行既有测试确保无回归**

Run: `cd plugins/zhao-wealth && npx jest src/__tests__/`
Expected: 新增的 nav-calculator / risk-metric-service 测试 PASS；既有 suite 中除已知与本次无关的 holding-service/controllers 2 个既有失败外，其余 PASS

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/content-types/wealth-collect-config/schema.json plugins/zhao-wealth/server/src/jobs/collect-job.ts
git commit -m "feat(zhao-wealth): 采集成功联动年化+风险补缺，collectStatus 新增 running"
```

---

### Task 5: 插件构建 dist + 自检 + 推送

**Files:**
- Modify: `plugins/zhao-wealth/dist/`（构建产物）

- [ ] **Step 1: 重建 dist**

Run: `cd plugins/zhao-wealth && npm run build`
Expected: `dist/server/` 重新生成，exit 0

- [ ] **Step 2: dist 自检（部署铁律）**

Run: `rg -n "recalculateMissing|'running'|\"running\"" plugins/zhao-wealth/dist/server`
Expected: 至少命中 `recalculateMissing` 与 `running`（若 `running` 无命中则检查 schema.json 是否被打进 dist 的 `content-types/`）

- [ ] **Step 3: 提交（含 dist）**

```bash
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server/src
git commit -m "build(zhao-wealth): 重建 dist，含补缺重算与 running 状态"
git push
```

---

### Task 6: 前端 API 封装 + 采集中心批量按钮改造

**Files:**
- Modify: `web/src/api/wealth.js`
- Modify: `web/src/pages/wealth/collect/index.vue`

- [ ] **Step 1: api/wealth.js 新增 getAdminCollectConfigs**

在 wealth.js 中与 `getProductMonitor` 相邻处新增：

```javascript
export function getAdminCollectConfigs(params = {}) {
  return adminGet(`${ADMIN}/collect-configs`, params).then(extractList)
}
```

- [ ] **Step 2: collect/index.vue 新增轮询状态与结果区**

在 `<script setup>` 中新增（放在现有 batch 状态 ref 附近）：

```javascript
// 批量任务轮询
const batchTask = ref(null) // { type: 'collect' | 'annual' | 'risk', startedAt }
const batchResult = ref(null) // 最近一次批量操作结果
const POLL_INTERVAL = 5000
const POLL_TIMEOUT = 180000

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

function startPolling(type, isDone, onDone) {
  batchTask.value = { type, startedAt: Date.now() }
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const done = await isDone()
      if (done || Date.now() - batchTask.value.startedAt > POLL_TIMEOUT) {
        stopPolling()
        batchTask.value = null
        onDone(done)
      }
    } catch (e) {
      stopPolling()
      batchTask.value = null
      uni.showToast({ title: '查询任务状态失败', icon: 'none' })
    }
  }, POLL_INTERVAL)
}
```

在模板批量操作区上方新增状态条与结果区：

```html
    <!-- 批量任务处理中状态条 -->
    <view v-if="batchTask" class="batch-task-bar">
      <text class="batch-task-text">{{ batchTask.type === 'collect' ? '批量采集中' : batchTask.type === 'annual' ? '年化重算中' : '风险指标计算中' }}...</text>
    </view>

    <!-- 最近一次批量操作结果 -->
    <view v-if="batchResult" class="batch-result">
      <view class="result-header">
        <text class="result-title">最近一次批量操作结果</text>
        <text class="result-close" @click="batchResult = null">×</text>
      </view>
      <view class="result-summary">
        <text>成功 {{ batchResult.successCount }} 个</text>
        <text v-if="batchResult.failCount > 0" class="fail-text">失败 {{ batchResult.failCount }} 个</text>
      </view>
      <view v-for="(item, i) in (batchResult.failDetails || [])" :key="i" class="fail-detail">
        <text>{{ item.productName }}：{{ item.reason }}</text>
      </view>
    </view>
```

- [ ] **Step 3: 三个批量按钮 handler 改造**

将 `handleTriggerCollect` / `handleRecalculate` / `handleRecalcRisk` 三个函数体替换为：

```javascript
async function handleTriggerCollect() {
  batchCollecting.value = true
  try {
    await triggerCollect({})
    uni.showToast({ title: '批量采集任务已触发', icon: 'none' })
    startPolling('collect',
      async () => {
        const list = await getAdminCollectConfigs({ pageSize: 500 })
        return list.every(c => c.collectStatus !== 'running')
      },
      (done) => {
        refreshBatchResult('collect', done)
      })
  } catch (e) {
    uni.showToast({ title: e?.message || '触发失败', icon: 'none' })
  } finally {
    batchCollecting.value = false
  }
}

async function handleRecalculate() {
  recalculating.value = true
  try {
    await recalculate()
    uni.showToast({ title: '年化重算任务已触发', icon: 'none' })
    startPolling('annual',
      async () => {
        const res = await getProductMonitor()
        return res.list.every(p => p.annualStatus === 'ok')
      },
      (done) => {
        refreshBatchResult('annual', done)
      })
  } catch (e) {
    uni.showToast({ title: '重算失败', icon: 'none' })
  } finally {
    recalculating.value = false
  }
}

async function handleRecalcRisk() {
  recalcRisk.value = true
  try {
    await recalculateRiskMetric({ type: 'all' })
    uni.showToast({ title: '风险指标任务已触发', icon: 'none' })
    startPolling('risk',
      async () => {
        const res = await getProductMonitor()
        return res.list.every(p => p.riskStatus === 'ok')
      },
      (done) => {
        refreshBatchResult('risk', done)
      })
  } catch (e) {
    uni.showToast({ title: '重算失败', icon: 'none' })
  } finally {
    recalcRisk.value = false
  }
}

async function refreshBatchResult(type, done) {
  if (!done) {
    uni.showToast({ title: '任务仍在处理，可稍后刷新查看', icon: 'none' })
    return
  }
  const monitor = await getProductMonitor()
  const configs = await getAdminCollectConfigs({ pageSize: 500 })
  const failDetails = []
  if (type === 'collect') {
    for (const c of configs) {
      if (c.collectStatus === 'failed') {
        failDetails.push({ productName: c.product?.productName || `产品${c.product?.id}`, reason: c.failReason || '采集失败' })
      }
    }
  } else {
    for (const p of monitor.list) {
      const status = type === 'annual' ? p.annualStatus : p.riskStatus
      if (status !== 'ok') {
        failDetails.push({ productName: p.productName, reason: status === 'danger' ? '无计算数据' : '未同步到最新净值日期' })
      }
    }
  }
  batchResult.value = {
    successCount: (type === 'collect' ? configs.length : monitor.list.length) - failDetails.length,
    failCount: failDetails.length,
    failDetails,
  }
  loadOverview()
  loadAnomalies()
  uni.showToast({ title: `批量${type === 'collect' ? '采集' : type === 'annual' ? '年化' : '风险指标'}完成`, icon: 'success' })
}
```

在 `<script setup>` 顶部声明轮询定时器变量：

```javascript
let pollTimer = null
```

- [ ] **Step 4: 前端构建验证**

Run: `cd web && npm run build:h5`
Expected: build 成功（exit 0），产物含新页面代码

- [ ] **Step 5: 提交**

```bash
cd e:\code\web
git add src/api/wealth.js src/pages/wealth/collect/index.vue
git commit -m "feat(wealth): 采集中心批量按钮轮询反馈与结果汇总"
```

---

### Task 7: 部署验证

**Files:** 无代码改动，部署操作

- [ ] **Step 1: 插件部署**

```bash
# 后端插件 dist 已在 Task 5 推送；在 joho 走 deploy.sh 拉取重启
ssh joho "bash /www/apps/strapi/deploy.sh"
```

- [ ] **Step 2: 前端部署**

```powershell
# 管理端 web 部署目标站点为 h.joho.cn（title=web）
e:\code\web\deploy-h5.ps1
```

- [ ] **Step 3: 线上验证**

- 登录管理端 → 采集中心：点击三个批量按钮，确认均有「任务已触发」反馈、轮询后展示真实成功/失败汇总；「重算风险指标」不再报 400。
- 触发一次批量采集后，监察页三状态（净值/年化/风险）均转 `ok`。
- 观察 pm2 日志：`ssh joho "tail -100 /home/admin/.pm2/logs/strapi-out.log | grep zhao-wealth"` 应出现「年化快照补缺完成 / 风险指标补缺完成」日志。
- 幂等验证：对同一批产品重复触发年化补缺，日志应显示 missingDates 为 0 或极小。

---

## Self-Review

**1. Spec coverage（设计文档 → 任务映射）：**
- 风险指标 type 400 修复 → Task 3 Step 6 ✅
- 批量采集/年化/风险指标假成功 → Task 6（前端轮询真实反馈）+ Task 4（running 状态）✅
- nav-calculator.recalculateMissing → Task 1 ✅
- risk-metric-service.recalculateMissing 两阶段 → Task 2 ✅
- 4 个 job 改补缺 → Task 3 Steps 1-4 ✅
- controller 降级分支改补缺 → Task 3 Steps 5-6 ✅
- 采集→计算闭环 → Task 4 Step 3 ✅
- schema 枚举 running → Task 4 Step 1 ✅
- 前端 getAdminCollectConfigs + 批量按钮 → Task 6 ✅
- dist 重建 + 自检 → Task 5 ✅
- 部署验证 → Task 7 ✅
- 保留 recalculateAll（深度纠偏）→ 设计为保留方法，任务中未删除 ✅

**2. Placeholder scan:** 全部步骤含实际代码与命令，无 TBD/TODO/「适当处理」类占位。

**3. Type consistency:**
- `recalculateMissing(productId?: number)` 在 nav-calculator（Task 1）与 risk-metric-service（Task 2）签名一致，Task 3 调用处参数匹配。
- `recalculateMissing` 返回 `{ productId, missingDates, calculated }[]` / `{ productId, missingDates }[]`，job 与 controller 均只 await 不消费返回值，无类型依赖。
- 前端 `getProductMonitor()` 返回 `{ list, summary }`（monitor-service.getProductMonitorList 结构），Task 6 使用 `res.list`、`p.annualStatus` / `p.riskStatus` 与监察页现有用法一致。
- `getAdminCollectConfigs` 返回 `records` 数组（`collectConfigsList` 的 paginatedResponse 结构），Task 6 使用 `c.collectStatus`、`c.failReason`、`c.product.productName` 与 schema 字段一致。
- 轮询完成判定 `annualStatus === 'ok'`：monitor-service 对无净值产品返回 'ok'（`judgeSyncStatus(_, null)`），与「无净值产品视为完成」语义一致。
