# 财富端评分展示修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复财富端三处展示问题：数据不足产品不再硬评分（显示"数据积累中"）、榜单 7 日年化回退显示、同类排行前端隐藏但后端照常计算并备好 peerTotal。

**Architecture:** 后端 zhao-wealth 插件（Strapi v5）修改评分与风险指标服务；前端 strapi-wealth（uni-app Vue3）修改详情页展示。后端改动遵循 TDD（jest 测试位于插件 `__tests__` 目录），前端改动通过构建验证。部署遵循插件 dist 铁律（改 `server/src` 必须重建 dist 后提交）。

**Tech Stack:** Strapi v5 插件、Bull 队列、Jest、Vue3 + uni-app、TypeScript

**设计文档:** `e:\code\basic\docs\superpowers\specs\2026-09-18-wealth-score-display-fix-design.md`

---

## 文件结构

| 仓库 | 文件 | 责任 |
|---|---|---|
| basic | `plugins/zhao-wealth/server/src/services/scoring-service.ts` | 数据不足返回 null、榜单 populate/7d 回退/过滤/total |
| basic | `plugins/zhao-wealth/server/src/services/risk-metric-service.ts` | 同类排名阈值 5、返回 {rankPercentile, peerTotal}、写 peerTotal、expectedCount×5 |
| basic | `plugins/zhao-wealth/server/src/controllers/risk-metric.ts` | C 端透传 peerTotal |
| basic | `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts` | Task1/2 测试 |
| basic | `plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts` | Task3/4 测试（含既有用例更新） |
| strapi-wealth | `pages/detail/index.vue` | 评分区"数据积累中"、移除同类排名 |

**测试运行命令**（插件目录）：
```
cd e:\code\basic\plugins\zhao-wealth
npm test -- scoring-service.test.ts
npm test -- risk-metric-service.test.ts
```

---

### Task 1: calculateScore 数据不足返回 null

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\scoring-service.ts:175`
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\scoring-service.test.ts`

- [ ] **Step 1: 写失败测试**

在 `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\scoring-service.test.ts` 的 `describe('scoring-service 校准')` 内、最后一个 `it` 之后追加：

```ts
  it('年化为 null（数据不足）→ calculateScore 返回 null，不再硬算低分', async () => {
    mockProductFindOne.mockResolvedValue({ id: 8, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: null });
    mockMetricFindMany.mockResolvedValue([]);

    const score = await service.calculateScore(8, 'm1');
    expect(score).toBeNull();
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- scoring-service.test.ts`
Expected: 新用例 FAIL —— `expect(score).toBeNull()` 收到的是 `{ compositeScore: ... }` 对象

- [ ] **Step 3: 实现**

在 `e:\code\basic\plugins\zhao-wealth\server\src\services\scoring-service.ts` 的 `calculateScore` 中，`const metrics = await getProductMetrics(productId, period);` 之后插入：

```ts
    // 数据不足：m1 年化为 null（净值样本不足）→ 无法评分，返回 null 由前端显示"数据积累中"
    if (metrics.annualReturn === null) return null;
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- scoring-service.test.ts`
Expected: 全部 PASS（含既有 8 个用例）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "fix(wealth): 年化缺失时评分返回 null，避免数据不足产品硬算低分"
```

---

### Task 2: getScoreLeaderboard 修复（populate / 7d 回退 / 过滤 / total）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\scoring-service.ts:278-339`
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\scoring-service.test.ts`

- [ ] **Step 1: 写失败测试**

在 `scoring-service.test.ts` 的 `describe` 内追加两个用例：

```ts
  it('榜单：最新快照无 7d 年化时回退取最近有值快照', async () => {
    const products = [
      { id: 1, productName: 'A', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
      { id: 2, productName: 'B', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
    ];
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findOne: mockProductFindOne, findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(2) };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return {
          findOne: mockSnapshotFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-17', annual1m: 0.05, annual7d: 0.03 },
            { product: { id: 2 }, snapshotDate: '2026-09-17', annual1m: 0.02, annual7d: null },
            { product: { id: 2 }, snapshotDate: '2026-09-16', annual1m: 0.02, annual7d: 0.025 },
          ]),
        };
      }
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') {
        return {
          findOne: mockScoreFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 80 },
            { product: { id: 2 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 70 },
          ]),
        };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockResolvedValue([]);

    const board = await service.getScoreLeaderboard({});
    expect(board.records).toHaveLength(2);
    expect(board.records.find((r: any) => r.id === 1)!.latestAnnual7d).toBe(0.03);
    // 产品2 最新快照（9/17）7d 为 null → 回退到 9/16 有值快照
    expect(board.records.find((r: any) => r.id === 2)!.latestAnnual7d).toBe(0.025);
  });

  it('榜单：评分 null（数据不足）产品被过滤且 total 重算', async () => {
    const products = [
      { id: 1, productName: 'A', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
      { id: 2, productName: 'B', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
    ];
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findOne: mockProductFindOne, findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(2) };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return {
          findOne: mockSnapshotFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-17', annual1m: 0.05, annual7d: 0.03 },
            { product: { id: 2 }, snapshotDate: '2026-09-17', annual1m: null, annual7d: null },
          ]),
        };
      }
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') {
        return {
          findOne: mockScoreFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 80 },
          ]),
        };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });
    // 产品2 无评分快照 → 实时计算 → annual1m null → calculateScore 返回 null
    mockProductFindOne.mockResolvedValue({ id: 2, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: null });
    mockMetricFindMany.mockResolvedValue([]);

    const board = await service.getScoreLeaderboard({});
    expect(board.records).toHaveLength(1);
    expect(board.records[0].id).toBe(1);
    expect(board.total).toBe(1); // 过滤后重算，而非产品总数 2
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- scoring-service.test.ts`
Expected: 两个新用例 FAIL（`latestAnnual7d` 为 null / `records` 含产品2 且 `total` 为 2）

- [ ] **Step 3: 实现**

在 `e:\code\basic\plugins\zhao-wealth\server\src\services\scoring-service.ts` 中做 4 处修改：

**3a.** `allScores` 查询加 populate（约 279 行）：

```ts
    const allScores = await scoreQuery.findMany({
      where: {
        product: { id: { $in: productIds } },
        period,
      },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 2,
      populate: ['product'],
    });
```

**3b.** `allAnnuals` 查询加 populate、limit 加大、构建 annual7dMap（约 301-314 行）：

```ts
    const allAnnuals = await annualQuery.findMany({
      where: {
        product: { id: { $in: productIds } },
      },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 30,
      populate: ['product'],
    });
    const annualMap: Record<number, any> = {};
    const annual7dMap: Record<number, any> = {};
    for (const a of allAnnuals) {
      const pid = a.product?.id || a.product;
      if (!annualMap[pid]) {
        annualMap[pid] = a;
      }
      // 7d 年化回退：每个产品保留最近一条 annual7d 有值的快照
      if (pid && a.annual7d != null && !isNaN(Number(a.annual7d)) && !annual7dMap[pid]) {
        annual7dMap[pid] = a;
      }
    }
```

**3c.** 组装逻辑用 annual7dMap（约 317-329 行）：

```ts
    const records = await Promise.all(products.map(async (product: any) => {
      const annual = annualMap[product.id];
      const annual7d = annual7dMap[product.id];
      const annualValue = annual ? Number(annual[annualField]) : null;
      return {
        ...product,
        score: scoreMap[product.id] || await calculateScore(product.id, period),
        [annualKey]: annualValue !== null && !isNaN(annualValue) ? annualValue : null,
        latestAnnual7d: annual7d?.annual7d != null && !isNaN(Number(annual7d.annual7d))
          ? Number(annual7d.annual7d)
          : null,
        annual1m: annualValue !== null && !isNaN(annualValue) ? annualValue : null,
      };
    }));

    // 过滤评分无效的产品（数据不足不占榜单名额），再按评分降序排序
    const validRecords = records.filter(r => r.score);
    validRecords.sort((a, b) => {
      const sa = Number(a.score?.compositeScore) || 0;
      const sb = Number(b.score?.compositeScore) || 0;
      return sb - sa;
    });

    return { records: validRecords.slice(offset, offset + limit), total: validRecords.length, page, pageSize: limit };
```

**3d.** 删除旧排序块（原 331-338 行的 `records.sort` 与 `return` 段，被 3c 替代）。

**3e.** `calculateAndSaveScoreSnapshot` 改为先删后算（约 209-234 行），评分无效时旧快照不留存：

```ts
  async function calculateAndSaveScoreSnapshot(productId: number, snapshotDate: string, period: string): Promise<void> {
    // 先删除旧记录（无论本次评分是否有效，避免 C 端读到残留快照）
    const query = strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot');
    await query.deleteMany({
      where: { product: productId, snapshotDate, period },
    });

    const score = await calculateScore(productId, period);
    if (!score) return;
    ...
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- scoring-service.test.ts`
Expected: 全部 PASS（含 Task1 用例）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "fix(wealth): 榜单快照补 populate、7日年化回退、评分null产品过滤并重算total"
```

---

### Task 3: calculateRankPercentile 阈值 5 + 返回 { rankPercentile, peerTotal }

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\risk-metric-service.ts:226-260`
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\risk-metric-service.test.ts`

- [ ] **Step 1: 写失败测试**

在 `risk-metric-service.test.ts` 文件末尾追加（复用文件顶部已定义的 `d()` 辅助函数）：

```ts
describe('risk-metric-service.calculateRankPercentile', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, SNAPSHOT_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('样本 ≥5 时返回百分位与样本总数（按年化降序，第一名=1/5=20%）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([
      { product: { id: 1 }, annual1m: '0.05' },
      { product: { id: 2 }, annual1m: '0.04' },
      { product: { id: 3 }, annual1m: '0.03' },
      { product: { id: 4 }, annual1m: '0.02' },
      { product: { id: 5 }, annual1m: '0.01' },
    ]);

    const res = await getService().calculateRankPercentile(1, d(2), 'm1');
    expect(res).toEqual({ rankPercentile: 20, peerTotal: 5 });
  });

  it('样本 <5 时返回 null（无统计意义，不提供排名）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([
      { product: { id: 1 }, annual1m: '0.05' },
      { product: { id: 2 }, annual1m: '0.04' },
    ]);

    const res = await getService().calculateRankPercentile(1, d(2), 'm1');
    expect(res).toEqual({ rankPercentile: null, peerTotal: null });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- risk-metric-service.test.ts`
Expected: 新用例 FAIL（当前返回 `number | null`，`res` 为 20 / null，与对象不符）

- [ ] **Step 3: 实现**

将 `e:\code\basic\plugins\zhao-wealth\server\src\services\risk-metric-service.ts` 的 `calculateRankPercentile` 整体替换（约 226-260 行）：

```ts
  async calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<{ rankPercentile: number | null; peerTotal: number | null }> {
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];

    // 取当前产品
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return { rankPercentile: null, peerTotal: null };

    // 取同类所有产品当日快照（含产品信息用于 productType 过滤）
    const snapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
      where: {
        snapshotDate: toDateStr(snapshotDate),
        product: { productType: product.productType },
      },
      populate: ['product'],
    });

    // 过滤掉 annualReturn 为 null 的
    const valid = snapshots.filter(s => s[annualField] !== null && s[annualField] !== undefined);

    // 同类样本过少无统计意义，不提供排名
    if (valid.length < 5) return { rankPercentile: null, peerTotal: null };

    // 按 annualReturn 降序排序（PG numeric 返回字符串，需显式 Number() 转换）
    const sorted = valid.sort((a, b) => Number(b[annualField]) - Number(a[annualField]));

    // 找到当前产品的排名
    const rank = sorted.findIndex(s => s.product.id === productId) + 1;

    if (rank === 0) return { rankPercentile: null, peerTotal: null }; // 当前产品不在列表中

    return { rankPercentile: (rank / valid.length) * 100, peerTotal: valid.length };
  },
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- risk-metric-service.test.ts`
Expected: 新用例 PASS；既有用例中 4 处 `calculateRankPercentile` mock 因返回值变为对象而报错（Task 4 修复）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts
git commit -m "feat(wealth): 同类排名样本阈值5，返回{rankPercentile, peerTotal}"
```

---

### Task 4: calculateAndSaveMetrics 写 peerTotal + expectedCount×5 + 既有测试更新

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\risk-metric-service.ts:295-312`（metricEntries）、`:555`（expectedCount）
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\risk-metric-service.test.ts`

- [ ] **Step 1: 更新既有测试（先让实现后的语义一致）**

在 `risk-metric-service.test.ts` 中做以下替换：

**1a.** 第 118 行（`写入防御`用例）：
```ts
    service.calculateRankPercentile = jest.fn().mockResolvedValue(null);
```
改为：
```ts
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: null, peerTotal: null });
```
并把该用例断言（约 126 行）：
```ts
    expect(created).toEqual([null, -0.01, null, null]);
```
改为：
```ts
    expect(created).toEqual([null, -0.01, null, null, null]);
```

**1b.** 第 183、197 行（`无净值跳过`/`无收益跳过`用例）：
```ts
    service.calculateRankPercentile = jest.fn();
```
改为：
```ts
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: null, peerTotal: null });
```

**1c.** 第 205-219 行（`净值型正常写入`用例）：`mockResolvedValue(50)` 改为：
```ts
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: 50, peerTotal: 8 });
```
断言 `delete`/`create` 次数 4 → 5：
```ts
    expect(mockQueries[METRIC_UID].delete).toHaveBeenCalledTimes(5);
    expect(mockQueries[METRIC_UID].create).toHaveBeenCalledTimes(5);
```
追加 peerTotal 写入断言：
```ts
    const names = createMock.calls.map((c: any) => c[0].data.metricName);
    expect(names).toContain('peerTotal');
    expect(createMock.calls.find((c: any) => c[0].data.metricName === 'peerTotal')[0].data.metricValue).toBe(8);
```
> 注意：该用例当前用 `mockQueries[METRIC_UID].create = createMock` 的方式捕获（见 107-127 行 `写入防御`用例模式），本用例需同样先取 `const createMock = mockQueries[METRIC_UID].create;`（其 beforeEach 已 `jest.fn()` 初始化）。

**1d.** `recalculateMissing` 相关用例中"完整 4 条"改为 5 条：
- 第 42-44 行（单产品用例，4 条 → 5 条）：
```ts
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) },
    ]);
```
改为 5 条（`d(1)` 重复 5 次）。
- 第 60-62 行（幂等用例）：同样 4 → 5。
- 第 133-140 行（日期记录数不足用例）：`d(2)` 完整 4 条 → 5 条。
- 第 225-227 行（货币型 recalculateMissing 用例）：`d(1)` 完整 4 条 → 5 条。

- [ ] **Step 2: 运行确认当前状态**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- risk-metric-service.test.ts`
Expected: 此时仍 FAIL（`calculateAndSaveMetrics` 尚未写 peerTotal，`create` 次数仍为 4）

- [ ] **Step 3: 实现**

**3a.** `calculateAndSaveMetrics` 中（约 295-312 行）替换为：

```ts
    for (const period of periods) {
      const metrics = await this.calculateMetricsForPeriod(productId, snapshotDate, period);
      const { rankPercentile, peerTotal } = await this.calculateRankPercentile(productId, snapshotDate, period);

      // 货币型 5 项（sharpe 不适用省略；peerTotal 为同类样本数，未来展示备用）
      const metricEntries: { metricName: string; metricValue: number | null }[] = isMoneyType
        ? [
            { metricName: 'volatility', metricValue: toFinite(metrics.volatility) },
            { metricName: 'maxDrawdown', metricValue: null },
            { metricName: 'rankPercentile', metricValue: toFinite(rankPercentile) },
            { metricName: 'incomeStability', metricValue: toFinite(metrics.incomeStability) },
            { metricName: 'peerTotal', metricValue: toFinite(peerTotal) },
          ]
        : [
            { metricName: 'volatility', metricValue: toFinite(metrics.volatility) },
            { metricName: 'maxDrawdown', metricValue: toFinite(metrics.maxDrawdown) },
            { metricName: 'sharpe', metricValue: toFinite(metrics.sharpe) },
            { metricName: 'rankPercentile', metricValue: toFinite(rankPercentile) },
            { metricName: 'peerTotal', metricValue: toFinite(peerTotal) },
          ];
```

**3b.** `recalculateMissing` 中（约 555 行）expectedCount 4 → 5：

```ts
      const expectedCount = pluginConfig.riskMetricPeriods.length * 5;
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- risk-metric-service.test.ts`
Expected: 全部 PASS（含 Task3 新增用例）

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/risk-metric-service.ts plugins/zhao-wealth/server/src/__tests__/risk-metric-service.test.ts
git commit -m "feat(wealth): 风险指标写入peerTotal，expectedCount按每周期5条"
```

---

### Task 5: C 端透传 peerTotal

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\risk-metric.ts:32`

- [ ] **Step 1: 实现**

将 `controllers/risk-metric.ts` 的 `getMetrics` 中（约 32 行）：

```ts
        const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile', 'incomeStability'];
```

改为：

```ts
        const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile', 'incomeStability', 'peerTotal'];
```

- [ ] **Step 2: 运行既有测试确认无回归**

Run: `cd e:\code\basic\plugins\zhao-wealth; npm test -- controllers.test.ts risk-metric-job.test.ts`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-wealth/server/src/controllers/risk-metric.ts
git commit -m "feat(wealth): C端风险指标接口透传peerTotal备用"
```

---

### Task 6: 前端详情页评分区"数据积累中"

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue:25-41`、CSS 区

- [ ] **Step 1: 实现模板**

将评分区域（25-41 行）末尾追加 v-else 分支：

```vue
      <!-- 评分区域 -->
      <view v-if="scoreData" class="card score-section">
        <view class="score-header">
          <text class="section-title">综合评分</text>
          <StarRating :rating="scoreData.starRating" :score="scoreData.compositeScore" show-score />
        </view>
        <ScoreRadar
          :return-score="scoreData.returnScore"
          :volatility-score="scoreData.volatilityScore"
          :drawdown-score="scoreData.drawdownScore"
          :composite-score="scoreData.compositeScore"
        />
        <view class="score-footer">
          <text class="score-disclaimer">评分基于近{{ periodLabel }}数据加权计算，仅供参考</text>
          <text class="score-help" @click="showScoreExplain = true">评分说明 ›</text>
        </view>
      </view>
      <!-- 评分数据积累中（净值样本不足，无法评分） -->
      <view v-else class="card score-section">
        <view class="score-header">
          <text class="section-title">综合评分</text>
        </view>
        <view class="score-accum-tip">数据积累中，达到 30 天净值历史后自动展示评分</view>
      </view>
```

- [ ] **Step 2: 实现样式**

在 `<style>` 的 `.score-section { padding: 24rpx; }`（约 1316 行）附近追加：

```css
.score-accum-tip {
  padding: 40rpx 0 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
```

- [ ] **Step 3: 构建验证**

Run: `cd e:\code\strapi-wealth; npm run build:h5`
Expected: 构建成功，无编译错误

- [ ] **Step 4: 提交**

```bash
git add pages/detail/index.vue
git commit -m "feat(wealth-web): 评分数据不足显示数据积累中提示"
```

---

### Task 7: 前端详情页移除同类排名

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue:124-140`（货币型 metric-grid）、`:154`（metric-note）、`:668-672`（formatRankPercentile）

- [ ] **Step 1: 实现模板**

**1a.** 货币型 metric-grid（124-140 行）移除"同类排名"cell，并将剩余两个 cell 的 `third` class 去掉（恢复默认 50% 布局）：

```vue
        <view v-if="isCashManagement" class="metric-grid">
          <view class="metric-cell">
            <text class="metric-label">收益波动率</text>
            <text class="metric-value">{{ formatPercent(riskMetricData?.volatility) }}</text>
            <text class="metric-desc">万份收益年化波动幅度，越低越稳健</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">收益稳定度</text>
            <text class="metric-value">{{ formatPercent(riskMetricData?.incomeStability) }}</text>
            <text class="metric-desc">万份收益离散程度，越低越稳定</text>
          </view>
        </view>
```

**1b.** 非货币型 metric-note（154 行）去掉"同类样本过少不提供排名"：

```vue
        <view v-else class="metric-note">波动率、最大回撤基于近{{ getPeriodLabel(riskMetricPeriod) }}净值数据计算</view>
```

- [ ] **Step 2: 移除失效代码**

删除 `formatRankPercentile` 函数（约 667-672 行）：

```ts
// 同类排名显示：rankPercentile = (rank/total)×100，越小越靠前（如 前12.5%）
function formatRankPercentile(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  const n = Number(v)
  return `前${n.toFixed(n % 1 === 0 ? 0 : 1)}%`
}
```

同时删除 CSS 中不再使用的 `.metric-cell.third` 规则（约 1231-1234 行）：
```css
/* 货币理财收益型指标：3 列等宽 */
.metric-cell.third {
  width: calc((100% - 40rpx) / 3);
}
```

- [ ] **Step 3: 构建验证**

Run: `cd e:\code\strapi-wealth; npm run build:h5`
Expected: 构建成功；检查产物中不再包含 `formatRankPercentile` 与"同类排名"字符串

- [ ] **Step 4: 提交**

```bash
git add pages/detail/index.vue
git commit -m "feat(wealth-web): 隐藏同类排名展示（后端数据照常计算）"
```

---

### Task 8: 构建 dist + 部署 + 数据重算验证

**Files:**
- 部署：basic 仓库 deploy.sh；strapi-wealth 构建产物部署到服务器 wealth 目录

- [ ] **Step 1: 后端重建 dist 并提交**

```bash
cd e:\code\basic\plugins\zhao-wealth
npm run build
```
Expected: dist/server/index.js 生成成功

**自检**：`rg -n "peerTotal" dist/server/index.js` 必须命中；`rg -n "annual7dMap" dist/server/index.js` 必须命中。未命中 = dist 未重建成功，禁止提交。

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(wealth): 重建dist并提交（评分/榜单/同类排行修复）"
git push
```

- [ ] **Step 2: 后端部署**

按既有流程执行部署（deploy.sh），部署后重启 strapi：
```bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi
```
验证启动：`pm2 logs strapi --lines 30 --nostream` 无报错，startup 时间正常。

- [ ] **Step 3: 触发数据重算**

触发评分全量重算 + 风险指标全量补缺（通过管理端 API 或队列，参照既有运维流程）：
1. `recalculate-all-scores`（m1）：数据不足产品旧快照被清除
2. `recalculateMissing`（全量）：所有有净值日期补齐 peerTotal（expectedCount 5 判定）

- [ ] **Step 4: 数据验证**

```sql
-- 每周期 5 条指标（含 peerTotal）
SELECT snapshot_date, period, count(*) FROM wealth_risk_metrics
WHERE product_id = 1 GROUP BY snapshot_date, period ORDER BY 1 DESC LIMIT 3;
-- 产品8（宁银晶耀）评分快照应已清除
SELECT count(*) FROM wealth_score_snapshots WHERE product_id = 8;
```
Expected: 每周期 5 条；产品8 评分快照 0 条（数据不足）。

- [ ] **Step 5: 前端构建部署**

```bash
cd e:\code\strapi-wealth
npm run build:h5
```
将产物部署到服务器 wealth 目录（旧版本先备份为 `wealth_bak_<时间戳>`，参照既有流程）。

- [ ] **Step 6: 线上验证**

- 综合评分榜：`GET /api/wealth/v1/leaderboard`（或对应 C 端接口）返回的产品均带非 null 的 `score` 与 `latestAnnual7d`；数据不足产品不在榜单
- 详情页：数据不足产品评分区显示"数据积累中"；风险指标卡片不再出现"同类排名"
- 产品详情页正常产品评分、7 日年化展示正常

---

## Self-Review

**Spec 覆盖检查：**
- 修复1（评分数据不足→null）→ Task 1（calculateScore）+ Task 2 过滤/total/快照清理（3e）+ Task 6（前端"数据积累中"）
- 修复2（populate + 7d 回退）→ Task 2 ✓
- 修复3（阈值5 + peerTotal + 隐藏展示）→ Task 3/4/5（后端）、Task 7（前端隐藏）✓
- 数据清理/重算 → Task 8 ✓
- 部署 → Task 8 ✓

**占位符扫描：** 无 TBD/TODO；所有步骤含完整代码。

**类型一致性：** `calculateRankPercentile` 返回类型 `{ rankPercentile: number|null; peerTotal: number|null }` 在 Task 3 定义、Task 4 消费；`metricEntries` 每周期 5 条与 `expectedCount×5` 一致；C 端 `peerTotal` 字段与存储 metricName 一致。
