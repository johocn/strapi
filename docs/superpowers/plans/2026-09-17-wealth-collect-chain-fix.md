# 采集链路修复与年化计算健壮性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复无净值日风险指标污染、年化补缺锁竞争误报、短周期年化节假日失真三个问题

**Architecture:** 四个修复块——① `calculateAndSaveMetrics` 数据源检查（无净值/收益日跳过）+ `recalculateMissing` 日期源按产品类型分流；② `calculateMoneyFundSnapshot` 当日收益检查；③ `collect-job.ts` 删除冗余 `recalculate-product` 触发；④ `calculateNavSnapshot` 短周期改「自然日回溯 + 最近实际净值日锚定 + 容差 + 钳制」

**Tech Stack:** Strapi v5 插件（zhao-wealth）、TypeScript、Bull 队列、Jest

---

## 文件结构

| 文件 | 职责 | 改动 |
|------|------|------|
| `plugins/zhao-wealth/server/src/services/nav-calculator.ts` | 年化快照计算 | 修复块 2 + 4 |
| `plugins/zhao-wealth/server/src/services/risk-metric-service.ts` | 风险指标计算 | 修复块 1 |
| `plugins/zhao-wealth/server/src/jobs/collect-job.ts` | 采集任务 | 修复块 3 |
| `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts` | 年化快照测试 | 新增锚定测试 + 适配 2 处 |
| `plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts` | 风险指标测试 | 新增数据源检查测试 + 适配 1 处 |
| `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts` | 采集任务测试 | 新增触发精简测试 |

> **spec 矛盾裁决**：设计文档测试用例 #1 写「长假场景 1d/3d/7d 均非 null，间隔=9」，与已确认的容差参数（1d≤5）冲突——gap=9 时 1d 必然 null。本计划以用户确认的容差参数为准：长假场景断言 1d=null、3d/7d 有值（gap=9）。

---

### Task 1: 短周期年化锚定（nav-calculator.ts）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts:31-88`
- Test: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts`

- [ ] **Step 1: 新增 4 个锚定测试（追加到 nav-calculator.test.ts 末尾）**

在 `nav-calculator.test.ts` 文件末尾追加：

```typescript
describe('nav-calculator.calculateNavSnapshot 短周期锚定与钳制', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockQueries[NAV_UID] = { findOne: jest.fn(), findMany: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('长假场景：净值 9/30、10/9，快照日 10/9 → 1d 超容差 null，3d/7d 有值（gap=9）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.0510, navDate: '2026-10-09' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-10-09', unitNav: 1.0510 },
      { navDate: '2026-09-30', unitNav: 1.0500 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-10-09T00:00:00Z'));

    expect(snapshot.annual1d).toBeNull(); // gap=9 > 5
    expect(snapshot.annual3d).toBeCloseTo(0.039366, 5); // (1.0510/1.0500)^(365/9)-1
    expect(snapshot.annual7d).toBeCloseTo(0.039366, 5);
    expect(snapshot.isEstimate).toBe(false); // gap7=9 >= 7
  });

  it('调休场景：净值 10/9、10/12，快照日 10/12 → 1d/3d 有值（gap=3），7d null（序列不足）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.0510, navDate: '2026-10-12' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-10-12', unitNav: 1.0510 },
      { navDate: '2026-10-09', unitNav: 1.0500 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-10-12T00:00:00Z'));

    expect(snapshot.annual1d).toBeCloseTo(0.122825, 5); // (1.0510/1.0500)^(365/3)-1
    expect(snapshot.annual3d).toBeCloseTo(0.122825, 5);
    expect(snapshot.annual7d).toBeNull(); // 无 navDate<=10/05 的净值
    expect(snapshot.isEstimate).toBe(false); // gap7=null
  });

  it('稀疏场景：净值 9/1、9/21，快照日 9/21 → 1d/3d/7d 全 null（gap=20 超容差）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.05, navDate: '2026-09-21' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-09-21', unitNav: 1.05 },
      { navDate: '2026-09-01', unitNav: 1.0 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-09-21T00:00:00Z'));

    expect(snapshot.annual1d).toBeNull(); // 20 > 5
    expect(snapshot.annual3d).toBeNull(); // 20 > 10
    expect(snapshot.annual7d).toBeNull(); // 20 > 15
  });

  it('跳变场景：净值 6/19=1.0、6/20=1.01，快照日 6/20 → 年化钳制到 1，isEstimate=true', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.01, navDate: '2026-06-20' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-06-20', unitNav: 1.01 },
      { navDate: '2026-06-19', unitNav: 1.0 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-06-20T00:00:00Z'));

    expect(snapshot.annual1d).toBe(1); // 1.01^365-1 ≈ 36.78 钳制到 +100%
    expect(snapshot.annual3d).toBeNull(); // 无更早净值
    expect(snapshot.annual7d).toBeNull();
    expect(snapshot.isEstimate).toBe(true); // 钳制强制标记
  });
});
```

- [ ] **Step 2: 运行新测试确认失败**

Run: `npm test -- --runInBand __tests__/nav-calculator.test.ts`
Expected: 新 4 个用例 FAIL（当前实现按交易日回溯：长假 1d 会因 prevDate 定位到 9/30 之前无净值而 null，但 3d/7d 也会因 `getPreviousTradingDay` 返回 9/28/9/22 等无净值日而 null；且无钳制逻辑）

- [ ] **Step 3: 修改 calculateNavSnapshot 为「自然日锚定 + 容差 + 钳制」**

替换 `plugins/zhao-wealth/server/src/services/nav-calculator.ts` 的导入行：

```typescript
import { getPreviousTradingDay, getNaturalDays, calculateAnnualReturn, calculateMoneyFundAnnual, toDateStr, acquireLock, releaseLock } from '../utils';
```

将 `calculateNavSnapshot` 方法（原 31-88 行）整体替换为：

```typescript
  async calculateNavSnapshot(productId: number, snapshotDate: Date) {
    const LONG_PERIODS = [
      { field: 'annual2w', days: 14 },
      { field: 'annual1m', days: 22 },
      { field: 'annual3m', days: 66 },
      { field: 'annual6m', days: 125 },
      { field: 'annual1y', days: 250 },
    ];
    // 短周期：自然日回溯 + 最近实际净值日锚定，容差防失真
    const SHORT_PERIODS = [
      { field: 'annual1d', days: 1, maxGap: 5 },
      { field: 'annual3d', days: 3, maxGap: 10 },
      { field: 'annual7d', days: 7, maxGap: 15 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
    };

    // 获取当日净值（使用日期字符串查询，避免时区偏移）
    const currentNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: productId, navDate: toDateStr(snapshotDate) },
    });

    if (!currentNav || !currentNav.unitNav) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}当日(${toDateStr(snapshotDate)})无净值数据`);
      return null;
    }

    // 一次查询历史净值序列（降序），供短周期锚定
    const navSeries = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: { product: productId, navDate: { $lte: toDateStr(snapshotDate) } },
      select: ['navDate', 'unitNav'],
      orderBy: { navDate: 'desc' },
      limit: 30,
    });
    const snapshotDateStr = toDateStr(snapshotDate);

    let isEstimate = false;
    let gap7: number | null = null;

    for (const period of SHORT_PERIODS) {
      const targetDate = new Date(snapshotDate);
      targetDate.setDate(targetDate.getDate() - period.days);
      const targetStr = toDateStr(targetDate);

      // 取 navDate <= targetDate 的最近一条实际净值（排除当日重复记录）
      const prevNav = navSeries.find((n: any) => {
        const nd = toDateStr(n.navDate);
        return nd <= targetStr && nd !== snapshotDateStr;
      });

      if (!prevNav || !prevNav.unitNav || Number(prevNav.unitNav) <= 0) {
        snapshot[period.field] = null;
        continue;
      }

      const gap = getNaturalDays(prevNav.navDate, snapshotDate);
      if (gap <= 0 || gap > period.maxGap) {
        snapshot[period.field] = null;
        continue;
      }

      let annualReturn = calculateAnnualReturn(prevNav.unitNav, currentNav.unitNav, gap);

      // 异常年化钳制 ±100%，钳制时标记估算
      if (annualReturn !== null) {
        if (annualReturn > 1) {
          annualReturn = 1;
          isEstimate = true;
        } else if (annualReturn < -1) {
          annualReturn = -1;
          isEstimate = true;
        }
      }

      if (period.field === 'annual7d') {
        gap7 = gap;
      }

      snapshot[period.field] = annualReturn;
    }

    // 长周期：保持原「N 个交易日回溯」逻辑
    for (const period of LONG_PERIODS) {
      const prevDate = getPreviousTradingDay(snapshotDate, period.days);

      if (!prevDate) {
        snapshot[period.field] = null;
        continue;
      }

      const prevNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId, navDate: toDateStr(prevDate) },
      });

      if (!prevNav || !prevNav.unitNav || prevNav.unitNav <= 0) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 产品${productId}周期${period.field}净值不足`);
        continue;
      }

      const naturalDays = getNaturalDays(prevDate, snapshotDate);
      const annualReturn = calculateAnnualReturn(prevNav.unitNav, currentNav.unitNav, naturalDays);

      // 确保不保存 NaN
      snapshot[period.field] = (annualReturn !== null && !isNaN(Number(annualReturn))) ? annualReturn : null;
    }

    // isEstimate：7d 实际间隔不足 7 天，或短周期发生钳制
    if (gap7 !== null && gap7 < 7) {
      isEstimate = true;
    }
    snapshot.isEstimate = isEstimate;

    return snapshot;
  }
```

> 说明：`isEstimateValue` 从 nav-calculator.ts 导入中移除（不再调用），但保留在 `utils/index.ts` 导出中不影响其他模块。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/nav-calculator.test.ts`
Expected: 全部 PASS（含原有 recalculateMissing、money-fund 用例）

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts
git commit -m "feat(zhao-wealth): 短周期年化改自然日锚定+容差+钳制"
```

---

### Task 2: 货币型无收益日快照返回 null（nav-calculator.ts）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts:93-136`
- Test: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts:135-163`

- [ ] **Step 1: 适配现有测试 + 新增当日无收益测试**

在 `nav-calculator.test.ts` 的 `calculateMoneyFundSnapshot` describe 中：

1. 「8 期限全部输出」测试（135 行）的 `mockQueries[INCOME_UID]` 增加 findOne 实现（mock 对象从仅有 findMany 改为）：

```typescript
    mockQueries[INCOME_UID] = {
      findOne: jest.fn().mockImplementation(({ where }: any) => {
        const ds = where.incomeDate ? new Date(where.incomeDate).getTime() : null;
        if (ds === null) return null;
        return incomeDataset.find((r) => new Date(r.incomeDate).getTime() === ds) || null;
      }),
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
        const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
        return incomeDataset.filter((r) => {
          const t = new Date(r.incomeDate).getTime();
          return t >= gte && t <= lte;
        });
      }),
    };
```

2. 「当日无收益记录 → annual1d 为 null」测试（154-163 行）整体替换为：

```typescript
  it('当日无收益记录 → 返回 null（不写全 null 快照）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    const service = getService();

    // snapshotDate = 07-01：数据集最晚 06-20，当日无收益
    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 6, 1));

    expect(snapshot).toBeNull();
  });
```

3. 「3日窗口按均值年化」测试（165 行）不需要改（findOne 用全局 incomeDataset，06-20 有记录）。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/nav-calculator.test.ts`
Expected: 3 个 money-fund 用例 FAIL（「8 期限」因 `findOne` 未实现返回 undefined 被新检查拦成 null；「当日无收益」因当前实现返回对象而非 null 断言失败）

- [ ] **Step 3: calculateMoneyFundSnapshot 开头加当日收益检查**

在 `plugins/zhao-wealth/server/src/services/nav-calculator.ts` 的 `calculateMoneyFundSnapshot` 方法中，`const snapshot: any = {` 之前插入：

```typescript
    // 当日无收益 → 返回 null（堵住无收益日全 null 快照）
    const currentIncome = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findOne({
      where: { product: productId, incomeDate: toDateStr(snapshotDate) },
    });

    if (!currentIncome || currentIncome.tenThousandIncome == null) {
      strapi.log.warn(`[zhao-wealth] 货基${productId}当日(${toDateStr(snapshotDate)})无收益数据`);
      return null;
    }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/nav-calculator.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts
git commit -m "fix(zhao-wealth): 货币型无收益日快照返回 null 防全 null 污染"
```

---

### Task 3: 风险指标数据源检查 + 补缺日期源分流（risk-metric-service.ts）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/risk-metric-service.ts:265-318, 503-551`
- Test: `plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts`

- [ ] **Step 1: 适配「写入防御」现有测试 + 新增 4 个数据源检查测试**

在 `risk-metric-service.test.ts` 的「写入防御」测试（107-124 行）的 `await service.calculateAndSaveMetrics(1, d(2));` 之前插入两行 mock：

```typescript
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 9, unitNav: 1.0 });
```

在 `risk-metric-service.test.ts` 文件末尾追加：

```typescript
describe('risk-metric-service.calculateAndSaveMetrics 数据源检查', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, INCOME_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]), connection: { raw: jest.fn() } },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue({ recalculateMissing: jest.fn() }),
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('净值型当日无净值 → 跳过，不写任何指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue(null);
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn();
    service.calculateRankPercentile = jest.fn();

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].delete).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].create).not.toHaveBeenCalled();
  });

  it('货币型当日无收益 → 跳过，不写任何指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    mockQueries[INCOME_UID].findOne.mockResolvedValue(null);
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn();
    service.calculateRankPercentile = jest.fn();

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].create).not.toHaveBeenCalled();
  });

  it('净值型当日有净值 → 正常写入 4 条指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 9, unitNav: 1.0 });
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn().mockResolvedValue({
      volatility: 0.1, maxDrawdown: -0.01, sharpe: 1.2, annualReturn: 0.05, incomeStability: null,
    });
    service.calculateRankPercentile = jest.fn().mockResolvedValue(50);

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).toHaveBeenCalledTimes(1);
    expect(mockQueries[METRIC_UID].delete).toHaveBeenCalledTimes(4);
    expect(mockQueries[METRIC_UID].create).toHaveBeenCalledTimes(4);
  });

  it('recalculateMissing 货币型：日期源用收益日期而非净值日期', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1, productType: 'money-fund' }]);
    mockQueries[INCOME_UID].findMany.mockResolvedValue([{ incomeDate: d(1) }, { incomeDate: d(2) }]);
    // d(1) 完整 4 条，d(2) 无记录 → 只补 d(2)
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) },
    ]);
    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing(1);

    expect(mockQueries[NAV_UID].findMany).not.toHaveBeenCalled();
    expect(mockQueries[INCOME_UID].findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { product: 1 }, select: ['incomeDate'] })
    );
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledTimes(1);
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledWith(1, d(2));
    expect(result).toEqual([{ productId: 1, missingDates: 1 }]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/risk-metric-service.test.ts`
Expected: 新 4 个用例 FAIL（数据源检查未实现；货币型分流未实现）；「写入防御」因 mock 未适配而 FAIL

- [ ] **Step 3: calculateAndSaveMetrics 开头加数据源检查**

在 `plugins/zhao-wealth/server/src/services/risk-metric-service.ts` 的 `calculateAndSaveMetrics` 方法中，`const dateStr = toDateStr(snapshotDate);` 之后、`for (const period of periods)` 之前替换为：

```typescript
    const dateStr = toDateStr(snapshotDate);
    const periods = pluginConfig.riskMetricPeriods;

    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });
    if (!product) return;

    const isMoneyType = product.productType === 'money-fund' || product.productType === 'money-wealth';

    // 数据源检查：当日无净值/收益 → 跳过，不写任何指标记录
    if (isMoneyType) {
      const income = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findOne({
        where: { product: productId, incomeDate: dateStr },
      });
      if (!income || income.tenThousandIncome == null) {
        strapi.log.warn(`[zhao-wealth] 产品${productId}当日(${dateStr})无收益数据，跳过风险指标计算`);
        return;
      }
    } else {
      const nav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId, navDate: dateStr },
      });
      if (!nav || nav.unitNav == null) {
        strapi.log.warn(`[zhao-wealth] 产品${productId}当日(${dateStr})无净值数据，跳过风险指标计算`);
        return;
      }
    }
```

> 原方法内已有的 `const product = ...findOne` 与 `const isMoneyType = ...` 两行（269-272 行）与新代码重复，需一并删除。

- [ ] **Step 4: recalculateMissing 日期源按产品类型分流**

替换 `plugins/zhao-wealth/server/src/services/risk-metric-service.ts` 的 `recalculateMissing` 方法中，`for (const product of products) {` 到 `if (navs.length === 0) continue;` 段（原 512-519 行）为：

```typescript
    for (const product of products) {
      const isMoneyType = product.productType === 'money-fund' || product.productType === 'money-wealth';

      // 日期源按产品类型分流：净值型用净值日期，货币型用收益日期
      const dateField = isMoneyType ? 'incomeDate' : 'navDate';
      const dataDates = await strapi.db.query(
        isMoneyType ? 'plugin::zhao-wealth.wealth-money-income' : 'plugin::zhao-wealth.wealth-nav'
      ).findMany({
        where: { product: product.id },
        select: [dateField],
        orderBy: { [dateField]: 'asc' },
      });

      if (dataDates.length === 0) continue;
```

并替换 `missingDates` 构造行（原 534-536 行）为：

```typescript
      const missingDates = dataDates
        .map((n: any) => toDateStr(n[dateField]))
        .filter((dateStr: string) => (dateCounts.get(dateStr) || 0) < expectedCount);
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/risk-metric-service.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts
git commit -m "fix(zhao-wealth): 风险指标无数据日跳过 + 补缺日期源按产品类型分流"
```

---

### Task 4: 去除采集后冗余年化触发（collect-job.ts）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/jobs/collect-job.ts:188-193`
- Test: `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts`

- [ ] **Step 1: 新增触发精简测试（追加到 collect-job.test.ts 末尾）**

```typescript
describe('collect-job.collect-single 队列触发', () => {
  let handler: any;
  let calculateQueue: any;
  let configQuery: any;
  let navQuery: any;
  let mockStrapi: any;

  beforeEach(() => {
    jest.resetModules();
    calculateQueue = { add: jest.fn() };
    const collectQueue = {
      process: jest.fn((name: string, fn: any) => {
        if (name === 'collect-single') handler = fn;
      }),
    };
    jest.doMock('../jobs/queue-setup', () => ({
      getCollectQueue: jest.fn(() => collectQueue),
      getCalculateQueue: jest.fn(() => calculateQueue),
    }));
    jest.doMock('../collectors', () => ({
      getCollector: jest.fn(() => ({
        collectNavData: jest.fn().mockResolvedValue([]),
      })),
    }));
    jest.doMock('../utils', () => ({
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    }));

    configQuery = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        collectStatus: 'idle',
        failCount: 0,
        product: { id: 5, productCode: 'P001', saleCode: 'S001', company: { shortName: 'test' } },
      }),
      update: jest.fn(),
    };
    navQuery = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn() };
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'plugin::zhao-wealth.wealth-collect-config') return configQuery;
          if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
          throw new Error(`unexpected uid: ${uid}`);
        }),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  it('采集成功后只触发 recalculate-risk-metric-product，不再触发 recalculate-product', async () => {
    require('../jobs/collect-job').registerCollectJobs(mockStrapi);
    await handler({ data: { productId: 5 } });

    expect(calculateQueue.add).toHaveBeenCalledTimes(1);
    expect(calculateQueue.add).toHaveBeenCalledWith('recalculate-risk-metric-product', { productId: 5 });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/collect-job.test.ts`
Expected: 新用例 FAIL（`calculateQueue.add` 被调用 2 次而非 1 次）

- [ ] **Step 3: 删除冗余触发**

替换 `plugins/zhao-wealth/server/src/jobs/collect-job.ts` 的 188-193 行为：

```typescript
      // 触发风险指标补缺（内部第一步即年化快照补缺，含新增日期）
      const calculateQueue = getCalculateQueue();
      if (calculateQueue) {
        calculateQueue.add('recalculate-risk-metric-product', { productId });
      }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/collect-job.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-wealth/server/src/jobs/collect-job.ts plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts
git commit -m "fix(zhao-wealth): 去除采集后冗余年化触发消除锁竞争误报"
```

---

### Task 5: 全量回归 + 重建 dist

**Files:**
- Test: 全部 `plugins/zhao-wealth/server/src/__tests__/*.test.ts`

- [ ] **Step 1: 全量测试**

Run: `npm test -- --runInBand`
Expected: 全部 PASS（尤其确认 `risk-metric-money.test.ts`、`risk-metric-job.test.ts`、`risk-metric-enhance.test.ts` 未受 Task 3 影响）

- [ ] **Step 2: 重建 dist（铁律：不重建 dist 功能静默失效）**

Run: `npm run build`
Expected: 构建成功，`plugins/zhao-wealth/dist` 更新

- [ ] **Step 3: 自检 dist 含新逻辑**

Run: `rg "maxGap|无收益数据，跳过风险指标计算" plugins/zhao-wealth/dist`
Expected: 有命中（确认新代码已进 bundle）

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist 含采集链路修复"
```

---

### Task 6: 部署 + 存量脏数据清理

**Files:**
- 无代码改动（部署与 SQL）

- [ ] **Step 1: 推送 basic 仓库**

```bash
git push
```

- [ ] **Step 2: 部署 joho 并重启**

```bash
./deploy.sh
ssh joho "export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH; export PM2_HOME=/home/admin/.pm2; pm2 restart strapi"
```

- [ ] **Step 3: 生产执行清理 SQL（先备份，可回滚）**

在 joho 上 psql 执行：

```sql
-- 备份
COPY wealth_risk_metrics TO '/tmp/wealth_risk_metrics_20260917_bak.csv' CSV HEADER;
COPY wealth_annual_snapshots TO '/tmp/wealth_annual_snapshots_20260917_bak.csv' CSV HEADER;

-- 清理 9/17 无净值日垃圾指标（当日所有产品均无净值/收益）
DELETE FROM wealth_risk_metrics WHERE snapshot_date = '2026-09-17';
-- 清理 9/17 无收益日货币型全 null 快照（产品3）
DELETE FROM wealth_annual_snapshots WHERE snapshot_date = '2026-09-17' AND annual_1_m IS NULL AND annual_3_m IS NULL AND annual_6_m IS NULL AND annual_1_y IS NULL;
```

Expected: 128 条风险指标 + 产品3 全 null 快照被删除，C 端自动回落 9/16 正常指标

- [ ] **Step 4: 验证**

1. `GET /api/zhao-wealth/v1/admin/collect/status` 确认采集配置正常
2. C 端产品详情页风险评估展示 9/16 数据（sharpe/rank 有值）
3. 手动触发一次采集（管理端或 `curl` 触发 collect-single），确认日志无「0个产品」误报、9/16 快照/指标不重复写

---

## 风险点

- 短周期锚定改变 1d/3d/7d 口径：正常日更产品数值不变（间隔=1/3/7），仅节假日/缺失场景由 null 变为有效值或钳制值，属改善
- 钳制 ±100% 对刚成立产品（1-2 天数据）可能误钳制，但成立初期各周期多为 null，影响极小
- SQL 直删先备份 CSV，可回滚
- Task 1 与 spec 测试用例 #1 的差异见文首「spec 矛盾裁决」：以容差参数为准
