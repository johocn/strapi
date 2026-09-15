# 货币理财风险评价模型修复实施计划（任务 2）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-wealth 货币理财（money-wealth）风险评价模型——年化/年度收益走收益型分支、风险指标改收益型（波动率/稳定度/排名）、评分权重与标尺按类型校准，并清理僵尸测试、排查契约错配。

**Architecture:** 三处后端修正（nav-calculator/annual-snapshot 的 isMoneyType 分支、risk-metric-service 收益型指标、scoring-service 类型化标尺）+ 两端展示适配（C 端 strapi-wealth detail 页、管理端 web metrics 页）+ 测试清理 + 契约排查。评分即时读取指标表，指标重算后评分自动生效。

**Tech Stack:** Strapi 5 插件（zhao-wealth）、TypeScript、Jest、uni-app（C 端）、Vue3（管理端）、PostgreSQL

**前置知识：**
- 插件 config 通过 `server/src/register.ts` L7 `strapi.config.set('plugin::zhao-wealth', pluginConfig)` 注入，定义在 `server/src/config.ts`
- 测试模式：`__tests__/*.test.ts` 用 `jest.resetModules()` + mockStrapi（`db.query` 按 UID 分发 mock）重构 service，参考 `__tests__/nav-calculator.test.ts`
- 部署铁律：dist 本地构建后提交（2G 服务器禁构建）；部署前 grep dist 自检；SSH 目标机 joho（39.97.54.5，用户 admin）
- 周期约定：风险指标周期 m1=30/m3=90/m6=180/y1=365 自然日，与 `calculateMoneyFundSnapshot` 的 period.days 一致

---

### Task 1: A1 - nav-calculator 货币类型判断扩展（money-wealth 走收益分支）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts:19`
- Test: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts`（文件末尾追加 describe）

- [ ] **Step 1: 写失败测试**——在 `nav-calculator.test.ts` 末尾追加 describe，验证 money-wealth 产品 `calculateSnapshot` 走 `calculateMoneyFundSnapshot`（收益分支）而非净值分支：

```typescript
describe('nav-calculator.calculateSnapshot money-wealth 分支', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('money-wealth 走收益型快照（calculateMoneyFundSnapshot）而非净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    const service = getService();
    service.calculateMoneyFundSnapshot = jest.fn().mockResolvedValue({ product: 1, snapshotDate: new Date(), annual1d: 0.01825 });
    service.calculateNavSnapshot = jest.fn().mockResolvedValue({ product: 1, snapshotDate: new Date(), annual1d: 0.0 });

    const snapshot = await service.calculateSnapshot(1, new Date(2026, 5, 20));

    expect(service.calculateMoneyFundSnapshot).toHaveBeenCalledWith(1, new Date(2026, 5, 20));
    expect(service.calculateNavSnapshot).not.toHaveBeenCalled();
    expect(snapshot.annual1d).toBe(0.01825);
  });

  it('bank-wealth 仍走净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    const service = getService();
    service.calculateMoneyFundSnapshot = jest.fn();
    service.calculateNavSnapshot = jest.fn().mockResolvedValue({ product: 2, annual1d: 0.02 });

    const snapshot = await service.calculateSnapshot(2, new Date(2026, 5, 20));

    expect(service.calculateNavSnapshot).toHaveBeenCalledWith(2, new Date(2026, 5, 20));
    expect(service.calculateMoneyFundSnapshot).not.toHaveBeenCalled();
    expect(snapshot.annual1d).toBe(0.02);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/nav-calculator.test.ts -t "money-wealth 分支" 2>&1`
Expected: FAIL——money-wealth 走了 `calculateNavSnapshot`（当前 `isMoneyFund` 只认 money-fund）

- [ ] **Step 3: 最小实现**——修改 `nav-calculator.ts:19`：

```typescript
// 原: const isMoneyFund = product.productType === 'money-fund';
const isMoneyType = product.productType === 'money-fund' || product.productType === 'money-wealth';

if (isMoneyType) {
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/nav-calculator.test.ts 2>&1`
Expected: PASS（含既有 6 个用例）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts
git commit -m "fix(zhao-wealth): money-wealth 年化快照走收益型分支（A1）"
```

---

### Task 2: A2 - annual-snapshot 货币类型判断扩展

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/annual-snapshot.ts:53`
- Create: `plugins/zhao-wealth/server/src/__tests__/annual-snapshot.test.ts`

- [ ] **Step 1: 写失败测试**——新建 `__tests__/annual-snapshot.test.ts`：

```typescript
'use strict';

describe('annual-snapshot.calculateYearlyReturn money-wealth 分支', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const YEARLY_UID = 'plugin::zhao-wealth.wealth-yearly-return';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, INCOME_UID, YEARLY_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/annual-snapshot').default({ strapi: mockStrapi });
  }

  it('money-wealth 按万份收益累加计算年度收益（非净值分支）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[INCOME_UID].findMany.mockResolvedValue(
      Array.from({ length: 365 }, (_, i) => ({ incomeDate: new Date(2026, 0, 1 + i), tenThousandIncome: 0.5 }))
    );
    mockQueries[YEARLY_UID].findOne.mockResolvedValue(null);
    mockQueries[YEARLY_UID].create.mockResolvedValue({ id: 10 });

    const service = getService();
    const result = await service.calculateYearlyReturn(1, 2026);

    // 0.5×365/365/10000×365 = 0.01825
    expect(result).not.toBeNull();
    expect(mockQueries[YEARLY_UID].create).toHaveBeenCalledWith({
      data: { product: 1, year: 2026, annualReturn: 0.01825, baseDays: 365 },
    });
    // 不应走净值查询
    expect(mockQueries[YEARLY_UID].findMany).not.toHaveBeenCalled();
  });

  it('bank-wealth 走净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    mockQueries[YEARLY_UID].findOne.mockResolvedValue(null);
    // yearStartNav/yearEndNav
    mockQueries[YEARLY_UID].findMany
      .mockResolvedValueOnce([{ unitNav: 1.0 }])
      .mockResolvedValueOnce([{ unitNav: 1.05 }]);
    mockQueries[YEARLY_UID].create.mockResolvedValue({ id: 11 });

    const service = getService();
    const result = await service.calculateYearlyReturn(2, 2026);

    expect(result).not.toBeNull();
    expect(mockQueries[YEARLY_UID].create).toHaveBeenCalledWith({
      data: { product: 2, year: 2026, annualReturn: 0.05, baseDays: 365 },
    });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/annual-snapshot.test.ts 2>&1`
Expected: FAIL——money-wealth 走净值分支（`wealth-nav` 查询无 mock → findOne 返回 undefined → 返回 null）

- [ ] **Step 3: 最小实现**——修改 `annual-snapshot.ts:53`：

```typescript
// 原: const isMoneyFund = product.productType === 'money-fund';
const isMoneyType = product.productType === 'money-fund' || product.productType === 'money-wealth';

if (isMoneyType) {
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/annual-snapshot.test.ts 2>&1`
Expected: PASS（2 个用例）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/annual-snapshot.ts plugins/zhao-wealth/server/src/__tests__/annual-snapshot.test.ts
git commit -m "fix(zhao-wealth): money-wealth 年度收益走收益型分支（A2）"
```

---

### Task 3: A3 - risk-metric-service 收益型风险指标分支

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/risk-metric-service.ts`（新增 2 个工具函数 + `calculateMetricsForPeriod` + `calculateAndSaveMetrics` + `adminAggregate`）
- Create: `plugins/zhao-wealth/server/src/__tests__/risk-metric-money.test.ts`

- [ ] **Step 1: 写失败测试**——新建 `__tests__/risk-metric-money.test.ts`：

```typescript
'use strict';

describe('risk-metric-service 货币型收益指标', () => {
  let service: any;
  let mockQueries: Record<string, any>;

  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  // 2026-08-01 ~ 08-10 万份收益交替 0.5/0.7
  const incomeDataset = Array.from({ length: 10 }, (_, i) => ({
    incomeDate: new Date(2026, 7, i + 1),
    tenThousandIncome: i % 2 === 0 ? 0.5 : 0.7,
  }));

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, INCOME_UID, SNAPSHOT_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), update: jest.fn() };
    }
    mockQueries[INCOME_UID].findMany.mockImplementation(({ where }: any) => {
      const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
      const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
      return incomeDataset.filter((r) => {
        const t = new Date(r.incomeDate).getTime();
        return t >= gte && t <= lte;
      });
    });
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('money-wealth：volatility=收益波动率，maxDrawdown/sharpe=null', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.01825 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    // std([0.5,0.7]交替 /10000) × sqrt(365) = 0.10541/10000 × 19.105 ≈ 0.0002014
    expect(metrics.maxDrawdown).toBeNull();
    expect(metrics.sharpe).toBeNull();
    expect(metrics.volatility).not.toBeNull();
    expect(metrics.volatility).toBeCloseTo(0.0002014, 6);
    expect(metrics.annualReturn).toBe(0.01825);
    // 净值分支不应被调用
    expect(mockQueries[NAV_UID].findMany).not.toHaveBeenCalled();
  });

  it('money-wealth：incomeStability = 万份收益变异系数', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.01825 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    // values=[0.5,0.7]×5，mean=0.6，样本std=0.10541 → CV=0.1757
    expect(metrics.incomeStability).toBeCloseTo(0.1757, 3);
  });

  it('bank-wealth：仍走净值分支，incomeStability=null', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-07-11', unitNav: 1.0 },
      { navDate: '2026-08-10', unitNav: 1.02 },
    ]);
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.02 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(2, new Date(2026, 7, 10), 'm1');

    expect(mockQueries[INCOME_UID].findMany).not.toHaveBeenCalled();
    expect(metrics.incomeStability).toBeNull();
    expect(metrics.maxDrawdown).toBe(0);
    expect(metrics.sharpe).not.toBeNull();
  });

  it('收益样本 < 2 时 volatility/incomeStability 为 null（防 std=0 满分）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: null });
    mockQueries[INCOME_UID].findMany.mockResolvedValue([
      { incomeDate: new Date(2026, 7, 9), tenThousandIncome: 0.5 },
    ]);

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    expect(metrics.volatility).toBeNull();
    expect(metrics.incomeStability).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/risk-metric-money.test.ts 2>&1`
Expected: FAIL——`metrics.incomeStability` undefined、money-wealth 走了净值分支（NAV findMany 被调用）

- [ ] **Step 3: 实现**——修改 `risk-metric-service.ts`：

**3a. 在 `calculateMaxDrawdown`（L97）之后新增两个工具函数：**

```typescript
/**
 * 收益型波动率：std(每日万份收益/10000) × sqrt(365)
 * 万份收益 = 每万元当日收益，/10000 得日收益率，年化按 365 天
 */
function calculateIncomeVolatility(incomes: { incomeDate: string; tenThousandIncome: number | string }[]): number | null {
  if (incomes.length < 2) return null;

  const sorted = [...incomes].sort((a, b) => new Date(a.incomeDate).getTime() - new Date(b.incomeDate).getTime());
  const returns: number[] = [];
  for (const r of sorted) {
    const v = Number(r.tenThousandIncome);
    if (!isNaN(v)) returns.push(v / 10000);
  }
  if (returns.length < 2) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365);
}

/**
 * 收益稳定度：周期内万份收益变异系数 CV = std / mean，越小越稳
 */
function calculateIncomeStability(incomes: { incomeDate: string; tenThousandIncome: number | string }[]): number | null {
  if (incomes.length < 2) return null;

  const values: number[] = [];
  for (const r of incomes) {
    const v = Number(r.tenThousandIncome);
    if (!isNaN(v)) values.push(v);
  }
  if (values.length < 2) return null;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return null;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance) / mean;
}
```

**3b. 修改 `calculateMetricsForPeriod`（L125-159）——先查 product，货币型走收益分支：**

```typescript
  async calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
    volatility: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
    annualReturn: number | null;
    incomeStability: number | null;
  }> {
    const { start, end } = getPeriodRange(snapshotDate, period);

    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });
    const isMoneyType = !!product && (product.productType === 'money-fund' || product.productType === 'money-wealth');

    // 取对应周期的年化收益（从 wealth-annual-snapshot）
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];
    const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: {
        product: productId,
        snapshotDate: toDateStr(snapshotDate),
      },
    });
    const annualReturn = snapshot ? snapshot[annualField] : null;

    if (isMoneyType) {
      // 货币型：收益型指标（净值恒 1，净值波动/回撤/夏普无意义）
      const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: toDateStr(start), $lte: toDateStr(end) },
        },
        orderBy: { incomeDate: 'asc' },
      });

      const volatility = calculateIncomeVolatility(incomes);
      const incomeStability = calculateIncomeStability(incomes);

      return { volatility, maxDrawdown: null, sharpe: null, annualReturn, incomeStability };
    }

    // 净值型：原有净值指标
    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: productId,
        navDate: { $gte: toDateStr(start), $lte: toDateStr(end) },
      },
      orderBy: { navDate: 'asc' },
    });

    const volatility = calculateVolatility(navs);
    const maxDrawdown = calculateMaxDrawdown(navs);
    const sharpe = calculateSharpe(annualReturn, volatility, pluginConfig.riskFreeRate);

    return { volatility, maxDrawdown, sharpe, annualReturn, incomeStability: null };
  },
```

**3c. 修改 `calculateAndSaveMetrics`（L205-245）——货币型写 4 项（volatility/maxDrawdown(null)/rankPercentile/incomeStability），净值型保持原 4 项：**

```typescript
  async calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void> {
    const dateStr = toDateStr(snapshotDate);
    const periods = pluginConfig.riskMetricPeriods;

    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });
    const isMoneyType = !!product && (product.productType === 'money-fund' || product.productType === 'money-wealth');

    for (const period of periods) {
      const metrics = await this.calculateMetricsForPeriod(productId, snapshotDate, period);
      const rankPercentile = await this.calculateRankPercentile(productId, snapshotDate, period);

      // 货币型 4 项（sharpe 不适用省略，保持每周期 4 条与 recalculateMissing 的 expectedCount 一致）
      const metricEntries = isMoneyType
        ? [
            { metricName: 'volatility', metricValue: toFinite(metrics.volatility) },
            { metricName: 'maxDrawdown', metricValue: null },
            { metricName: 'rankPercentile', metricValue: toFinite(rankPercentile) },
            { metricName: 'incomeStability', metricValue: toFinite(metrics.incomeStability) },
          ]
        : [
            { metricName: 'volatility', metricValue: toFinite(metrics.volatility) },
            { metricName: 'maxDrawdown', metricValue: toFinite(metrics.maxDrawdown) },
            { metricName: 'sharpe', metricValue: toFinite(metrics.sharpe) },
            { metricName: 'rankPercentile', metricValue: toFinite(rankPercentile) },
          ];

      for (const entry of metricEntries) {
        await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').delete({
          where: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
          },
        });

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
```

**3d. 修改 `adminAggregate`（L323-337）——指标列表加 incomeStability：**

```typescript
  async adminAggregate(productId: number, period: string) {
    const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile', 'incomeStability'];
    // ...其余不变
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/risk-metric-money.test.ts server/src/__tests__/risk-metric-service.test.ts server/src/__tests__/risk-metric-enhance.test.ts 2>&1`
Expected: PASS（新 4 用例 + 既有 risk-metric 测试不回归）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/risk-metric-money.test.ts
git commit -m "feat(zhao-wealth): 货币型收益风险指标（波动率/稳定度/排名）（A3）"
```

---

### Task 4: B - wealth-risk-metric schema 枚举加 incomeStability

**Files:**
- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-risk-metric/schema.json:31`

- [ ] **Step 1: 修改枚举**

```json
"metricName": {
  "type": "enumeration",
  "enum": ["volatility", "maxDrawdown", "sharpe", "rankPercentile", "incomeStability"],
  "required": true
}
```

- [ ] **Step 2: 提交**（schema 变更由 Strapi 启动自动同步，无测试）

```bash
git add plugins/zhao-wealth/server/src/content-types/wealth-risk-metric/schema.json
git commit -m "feat(zhao-wealth): risk-metric 枚举新增 incomeStability（B）"
```

---

### Task 5: C1/C2 - 评分权重表与波动率标尺按类型校准

**Files:**
- Modify: `plugins/zhao-wealth/server/src/config.ts`
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts:30,92-95,169`
- Create: `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts`

- [ ] **Step 1: 写失败测试**——新建 `__tests__/scoring-service.test.ts`：

```typescript
'use strict';

describe('scoring-service 权重与标尺', () => {
  const pluginConfig = require('../config').default;

  it('config 含 money-wealth 权重（drawdown=0）与按类型波动率标尺', () => {
    expect(pluginConfig.scoreWeights['money-wealth']).toEqual({
      returns: 0.80, volatility: 0.20, drawdown: 0.00, peerRank: 0.00,
    });
    expect(pluginConfig.scoreScales.volatilityScaleByType['bank-wealth']).toBe(0.03);
    expect(pluginConfig.scoreScales.volatilityScaleByType['money-wealth']).toBe(0.02);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/scoring-service.test.ts 2>&1`
Expected: FAIL——`scoreWeights['money-wealth']` undefined

- [ ] **Step 3: 实现**

**3a. 修改 `config.ts`：**

```typescript
  scoreWeights: {
    'bank-wealth:daily-open':  { returns: 0.70, volatility: 0.20, drawdown: 0.10, peerRank: 0.00 },
    'bank-wealth:fixed-term':  { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'bank-wealth:closed':      { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'bank-wealth':             { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'money-fund':              { returns: 0.70, volatility: 0.30, drawdown: 0.00, peerRank: 0.00 },
    'money-wealth':            { returns: 0.80, volatility: 0.20, drawdown: 0.00, peerRank: 0.00 },
    'stock-fund':              { returns: 0.40, volatility: 0.30, drawdown: 0.30, peerRank: 0.00 },
    'bond-fund':               { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'mixed-fund':              { returns: 0.40, volatility: 0.30, drawdown: 0.30, peerRank: 0.00 },
  } as Record<string, { returns: number; volatility: number; drawdown: number; peerRank: number }>,
```

```typescript
  scoreScales: {
    returnScale: 0.06,
    volatilityScale: 0.10,
    drawdownScale: 0.05,
    // 按产品类型覆盖波动率标尺（银行理财/货币类天然低波动，全局 0.10 按股票基金定标会失真）
    volatilityScaleByType: {
      'bank-wealth': 0.03,
      'money-fund': 0.02,
      'money-wealth': 0.02,
    },
  },
```

**3b. 修改 `scoring-service.ts:30` 默认值：**

```typescript
  const scoreScales = config?.scoreScales || { returnScale: 0.06, volatilityScale: 0.10, drawdownScale: 0.05, volatilityScaleByType: {} };
```

**3c. 修改 `scoring-service.ts:92-95`（absoluteVolatilityScore 接收 productType）：**

```typescript
  function absoluteVolatilityScore(volatility: number | null, productType?: string): number {
    if (volatility === null || isNaN(Number(volatility))) return 50;
    const scale = (scoreScales.volatilityScaleByType && scoreScales.volatilityScaleByType[productType || ''])
      ?? scoreScales.volatilityScale;
    return clampScore((1 - Number(volatility) / scale) * 100);
  }
```

**3d. 修改 `scoring-service.ts:169`（calculateScore 调用处）：**

```typescript
    const volatilityScore = absoluteVolatilityScore(metrics.volatility, product.productType);
```

**3e. 更新 `ScoreBreakdown.scales` 类型（L16）以包含新字段：**

```typescript
  scales: { returnScale: number; volatilityScale: number; drawdownScale: number; volatilityScaleByType?: Record<string, number> };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest server/src/__tests__/scoring-service.test.ts 2>&1`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/config.ts plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "fix(zhao-wealth): 评分权重补 money-wealth + 波动率标尺按类型校准（C1/C2）"
```

---

### Task 6: C3 - 南银净值产品回撤 null 根因验证（部署前，先查证后修复）

**Files:**
- Read: `plugins/zhao-wealth/server/src/services/risk-metric-service.ts:74-97`（calculateMaxDrawdown）
- 修复目标：根据查证结果决定（可能位置：calculateMaxDrawdown / 采集数据 / 时区）

- [ ] **Step 1: SSH joho 查询生产数据定位根因**

```bash
ssh joho "export PGPASSWORD=''; psql -h localhost -U strapi strapi -c \"SELECT p.product_code, r.period, r.snapshot_date, r.metric_name, r.metric_value FROM wealth_risk_metrics r JOIN wealth_products p ON r.product_id = p.id WHERE p.product_code = 'Z70026' AND r.metric_name IN ('maxDrawdown','volatility') ORDER BY r.snapshot_date DESC LIMIT 30;\""
```

（若密码为环境变量，改用远程 base64 脚本方式，见 memory 经验：Windows ssh 传含引号命令会被剥引号）

- [ ] **Step 2: 同时查窗口净值条数**（m1 周期应有约 30 条）

```bash
ssh joho "psql -h localhost -U strapi strapi -c \"SELECT count(*) FROM wealth_navs WHERE product_id = (SELECT id FROM wealth_products WHERE product_code = 'Z70026') AND nav_date >= CURRENT_DATE - INTERVAL '30 days';\""
```

- [ ] **Step 3: 判定与修复**
- 若 `maxDrawdown` 记录存在但值为 `0`/`-0`：是计算返回负零（`calculateMaxDrawdown` 净值单调时 maxDrawdown 恒 0），前端 null 判断导致显示缺失 → 修复前端 null/0 判定（见 Task 9/10），后端无需改
- 若 `maxDrawdown` 记录为 `NULL` 且窗口净值 ≥ 2 条：`calculateMaxDrawdown` 有缺陷 → 定位（候选：`isNaN(unitNav) continue` 后 peak 未更新）修复并补测试
- 若窗口净值 < 2 条：数据采集缺口 → 触发采集/重算，不做代码改动
- 将结论记录在 commit message 中

- [ ] **Step 4: 提交（如有代码改动）**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/
git commit -m "fix(zhao-wealth): 南银回撤 null 根因修复（B2 结论: <结论>）"
```

---

### Task 7: 后端接口补 incomeStability 字段（C 端/管理端消费）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/controllers/risk-metric.ts:32,179`

- [ ] **Step 1: C 端 risk 列表接口（L32）加 incomeStability**

```typescript
      for (const period of periods) {
        const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile', 'incomeStability'];
```

- [ ] **Step 2: adminPeers 有效指标列表（L179）加 incomeStability**

```typescript
      const validMetrics = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile', 'incomeStability'];
```

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-wealth/server/src/controllers/risk-metric.ts
git commit -m "feat(zhao-wealth): 风险指标接口返回 incomeStability（D1/D2 后端）"
```

---

### Task 8: E - 僵尸测试清理

**Files:**
- Delete: `plugins/zhao-wealth/server/src/__tests__/holding-service.test.ts`
- Modify: `plugins/zhao-wealth/server/src/__tests__/controllers.test.ts`（删除 holding controller describe 块）

- [ ] **Step 1: 删除僵尸测试文件**

```bash
git rm plugins/zhao-wealth/server/src/__tests__/holding-service.test.ts
```

- [ ] **Step 2: 定位 controllers.test.ts 中 holding 块范围**

Run: `cd e:\code\basic\plugins\zhao-wealth; Select-String -Path server/src/__tests__/controllers.test.ts -Pattern "describe\('holding|holding controller|controllers/holding"`
Expected: 找到 `describe('holding controller')` 起始行

- [ ] **Step 3: 删除 holding describe 块**（从 `// ============= holding controller =============` 注释到该 describe 块结束的 `});`），保留 disclosure 等有效测试

- [ ] **Step 4: 全量测试回绿验证**

Run: `cd e:\code\basic\plugins\zhao-wealth; npx jest 2>&1 | Select-Object -Last 20`
Expected: 全部 PASS（14 套件 → 13 套件，无失败）

- [ ] **Step 5: 提交**

```bash
git add -A plugins/zhao-wealth/server/src/__tests__/
git commit -m "test(zhao-wealth): 清理 holding 僵尸测试（E）"
```

---

### Task 9: D1 - C 端详情页货币理财风险展示（strapi-wealth 仓库 wealth-line 分支）

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue:120-136,342-343`
- 分支：wealth-line（`git checkout wealth-line`）

- [ ] **Step 1: 切换分支并确认**

Run: `cd e:\code\strapi-wealth; git checkout wealth-line; git pull origin wealth-line`

- [ ] **Step 2: 风险指标卡片按类型分支（L120-136）**——货币理财显示收益波动率/稳定度/排名，隐藏回撤与夏普：

```html
      <!-- 3. 风险指标 -->
      <view class="card">
        <view class="section-title">风险指标</view>
        <template v-if="isCashManagement">
          <view class="metric-grid">
            <view class="metric-cell">
              <text class="metric-label">收益波动率</text>
              <text class="metric-value">{{ formatPercent(riskMetricData?.volatility) }}</text>
              <text class="metric-desc">万份收益年化波动，越低越稳健</text>
            </view>
            <view class="metric-cell">
              <text class="metric-label">收益稳定度</text>
              <text class="metric-value">{{ formatPercent(riskMetricData?.incomeStability) }}</text>
              <text class="metric-desc">万份收益变异系数，越小越稳定</text>
            </view>
            <view class="metric-cell">
              <text class="metric-label">同类排名</text>
              <text class="metric-value">{{ riskMetricData?.rankPercentile != null ? '前 ' + formatPercent(riskMetricData.rankPercentile) : '--' }}</text>
              <text class="metric-desc">同类货币理财按年化收益排名</text>
            </view>
          </view>
          <view class="metric-note">收益波动率、稳定度基于近{{ getPeriodLabel(riskMetricPeriod) }}万份收益数据计算</view>
        </template>
        <template v-else>
          <view class="metric-grid">
            <view class="metric-cell">
              <text class="metric-label">波动率</text>
              <text class="metric-value">{{ formatPercent(riskMetricData?.volatility) }}</text>
              <text class="metric-desc">年化波动幅度，越低越稳健</text>
            </view>
            <view class="metric-cell">
              <text class="metric-label">最大回撤</text>
              <text class="metric-value down">{{ formatPercent(riskMetricData?.maxDrawdown) }}</text>
              <text class="metric-desc">区间内最大下跌幅度</text>
            </view>
          </view>
          <view class="metric-note">波动率、最大回撤基于近{{ getPeriodLabel(riskMetricPeriod) }}净值数据计算，同类样本过少不提供排名</view>
        </template>
      </view>
```

- [ ] **Step 3: 评分说明按类型（L342-343 附近）**——`showScoreExplain` 弹窗中，货币理财时波动率行文案改「收益波动率得分」：

在 L342-343 两行 text 前增加类型判断（示例）：
```html
<text class="explain-line">综合评分 = 收益得分 × {{ formatWeight(scoreData?.weights?.returns) }}</text>
<text class="explain-line">　　+ {{ isCashManagement ? '收益波动' : '波动率' }}得分 × {{ formatWeight(scoreData?.weights?.volatility) }}</text>
<text class="explain-line" v-if="!isCashManagement">　　+ 回撤得分 × {{ formatWeight(scoreData?.weights?.drawdown) }}</text>
```
（若原结构有 drawdown 行，用 v-if 包裹；实施时对照弹窗实际结构调整）

- [ ] **Step 4: 提交**

```bash
cd e:\code\strapi-wealth; git add pages/detail/index.vue
git commit -m "feat: 货币理财详情页收益型风险指标展示（D1）"
```

---

### Task 10: D2 - 管理端指标看板货币理财展示（web 仓库）

**Files:**
- Modify: `e:\code\web\src\pages\wealth\metrics\index.vue:56-78`
- 数据源：`getRiskMetrics` → `GET /zhao-website/.../risk-metrics/aggregate`（Task 7 已加 incomeStability）

- [ ] **Step 1: 确认产品类型来源**——`getAdminProductList` 返回项含 `productType`，`selectedProductId` 对应的产品对象即为当前类型：

```typescript
const selectedProductType = computed(() => {
  const p = products.value.find((x: any) => x.id === selectedProductId.value)
  return p?.productType || ''
})
const isMoneyType = computed(() => ['money-fund', 'money-wealth'].includes(selectedProductType.value))
```

- [ ] **Step 2: 风险指标区按类型分支（L56-78）**——货币理财显示收益波动率/稳定度/排名（移除 Calmar 卡——后端 aggregate 不返回 calmarRatio，属契约错配顺手修复）：

```html
      <view class="risk-section">
        <view class="section-title">风险指标</view>
        <view class="risk-grid">
          <template v-if="isMoneyType">
            <view class="risk-card">
              <text class="risk-label">收益波动率</text>
              <text class="risk-value">{{ formatPercent(metrics.volatility) }}</text>
            </view>
            <view class="risk-card">
              <text class="risk-label">收益稳定度</text>
              <text class="risk-value">{{ formatPercent(metrics.incomeStability) }}</text>
            </view>
            <view class="risk-card">
              <text class="risk-label">同类排名</text>
              <text class="risk-value" :class="getRankClass(metrics.rankPercentile)">
                前 {{ formatPercent(metrics.rankPercentile) }}
              </text>
            </view>
          </template>
          <template v-else>
            <view class="risk-card">
              <text class="risk-label">波动率</text>
              <text class="risk-value">{{ formatPercent(metrics.volatility) }}</text>
            </view>
            <view class="risk-card">
              <text class="risk-label">最大回撤</text>
              <text class="risk-value down">{{ formatPercent(metrics.maxDrawdown) }}</text>
            </view>
            <view class="risk-card">
              <text class="risk-label">同类排名</text>
              <text class="risk-value" :class="getRankClass(metrics.rankPercentile)">
                前 {{ formatPercent(metrics.rankPercentile) }}
              </text>
            </view>
          </template>
        </view>
      </view>
```
（原 Calmar 卡删除；`getRankClass`/`formatPercent` 已存在）

- [ ] **Step 3: 提交**

```bash
cd e:\code\web; git add src/pages/wealth/metrics/index.vue
git commit -m "feat: 指标看板货币理财收益型指标展示（D2）"
```

---

### Task 11: F - 契约错配排查（产出清单）

**Files:**
- Read: `e:\code\web\src\pages\wealth\` 下 7 页（collect/compare/disclosure/holding/metrics/monitor/product）
- Read: `e:\code\strapi-wealth\pages\` 下 4 页（detail/compare/hall/portfolio）
- 对照: `plugins/zhao-wealth/server/src/controllers/` 与 `routes/`

- [ ] **Step 1: 逐页对照字段/路径/参数**——记录不一致项（字段名、接口路径、参数风格、返回结构），产出问题清单

- [ ] **Step 2: 小问题顺手修，大问题记入清单**（清单写入 commit message 或 docs 注释，不新建文档）

- [ ] **Step 3: 提交**

```bash
git add -A e:\code\web\src\pages\wealth e:\code\strapi-wealth\pages
git commit -m "chore: 财富管理端/C端契约排查（F），产出问题清单"
```

---

### Task 12: 部署与验证

**Files:**
- 无代码改动，纯部署操作

- [ ] **Step 1: 本地重建 dist 并自检**

```bash
cd e:\code\basic\plugins\zhao-wealth; npm run build
Select-String -Path dist\server\*.js -Pattern "incomeStability|isMoneyType|volatilityScaleByType" -List | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: 命中 ≥ 3 个文件（无命中 = 未重建，必须重跑 build）

- [ ] **Step 2: 提交并推送 dist**

```bash
cd e:\code\basic; git add plugins/zhao-wealth; git commit -m "build(zhao-wealth): dist 重建（收益型风险指标）"; git push
```

- [ ] **Step 3: joho 部署**（deploy.sh 或手动 pull + 重启）

```bash
# 若 basic 仓库有 deploy.sh：按既有流程
# 手动方式：
ssh joho "cd /path/to/basic && git pull && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH; export PM2_HOME=/home/admin/.pm2; pm2 restart strapi"
```
Expected: strapi 重启成功，schema 枚举自动同步

- [ ] **Step 4: 触发存量数据重算**（年化补缺 + 风险指标补缺）

通过管理端接口或脚本触发：
```bash
# recalculateMissingAll（年化补缺）+ 风险指标补缺（risk-metric-service.recalculateMissing）
curl -X POST "https://h.joho.cn/api/zhao-wealth/v1/admin/recalculate-risk-metric" -H "Authorization: Bearer <admin token>" -d '{"type":"all"}'
```
（或按项目既有 job 触发方式，见 monitor 页「三键纠偏」）

- [ ] **Step 5: 部署 C 端与管理端**

```bash
# C 端（strapi-wealth wealth-line）：
cd e:\code\strapi-wealth; npm run build:h5; # 按既有流程部署 v.joho.cn/wealth
# 管理端（web）：
cd e:\code\web; npm run build; # 按既有流程部署 h.joho.cn
```

- [ ] **Step 6: 验证清单**
- 幸福99（money-wealth）：管理端/C 端年化 8 期限非 0（收益型）；风险指标 volatility=收益波动、incomeStability 有值、maxDrawdown=null、sharpe 无记录；评分不含 drawdown 权重（weights.drawdown=0）
- 南银 Z70026（bank-wealth）：波动得分 < 90（区分度恢复，波动 0.5% → 83 分）；maxDrawdown 有数值（Task 6 结论后）
- 管理端指标看板：货币理财显示收益波动/稳定度/排名 3 卡，净值型显示波动/回撤/排名 3 卡（Calmar 已移除）
- C 端详情页：货币理财风险卡片为收益型 3 格，净值型保持 2 格
- 全量测试回绿（13 套件）
- 接口未登录访问返回 401/403

---

## 自检记录（writing-plans skill 要求）

- **Spec 覆盖**：A1→Task1、A2→Task2、A3→Task3、B→Task4、C1/C2→Task5、C3→Task6、D1 后端→Task7、D1 前端→Task9、D2→Task10、E→Task8、F→Task11、部署验证→Task12，spec 全部条目均有对应任务
- **占位符扫描**：Task 6 的修复动作依赖生产查证结论，已按候选分支写全判定与动作，非占位
- **类型一致性**：`calculateMetricsForPeriod` 返回值增加 `incomeStability`，`calculateAndSaveMetrics`/测试断言同步；`absoluteVolatilityScore` 签名加 `productType`，调用处同步；Task 3 与 Task 7 的 `incomeStability` 枚举一致
