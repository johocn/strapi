# 财富评分模型校准 + 数据修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 校准评分模型（按类型收益标尺 + 对称负分 + operation_mode 别名权重），修复评分快照空/榜单失效，补齐生产指标与快照数据。

**Architecture:** 后端在 config.ts 加 `returnScaleByType`/`operationModeAliases`，scoring-service.ts 改对称负分公式、别名匹配、榜单实时兜底；admin-api.ts 新增 recalculate-scores 路由复用现有控制器；部署后触发数据补缺与评分重建并验证。

**Tech Stack:** Strapi v5 插件（TypeScript + jest）、Docker postgres（生产库）、zhao-auth admin 认证、SSH joho 部署。

**Spec:** `docs/superpowers/specs/2026-09-16-wealth-score-calibration-design.md`

---

### Task 1: config + scoring-service 校准（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/config.ts`
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts`
- Test: `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts`（整体替换）

- [ ] **Step 1: 替换测试文件（先 FAIL）**

将 `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts` 整个替换为：

```ts
'use strict';

describe('scoring-service 校准', () => {
  const pluginConfig = require('../config').default;

  let service: any;

  const mockProductFindOne = jest.fn();
  const mockSnapshotFindOne = jest.fn();
  const mockMetricFindMany = jest.fn();
  const mockScoreFindOne = jest.fn().mockResolvedValue(null);
  const mockScoreFindMany = jest.fn().mockResolvedValue([]);
  const mockOtherFindOne = jest.fn().mockResolvedValue(null);
  const mockOtherFindMany = jest.fn().mockResolvedValue([]);

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne };
    if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne };
    if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
    if (name === 'plugin::zhao-wealth.wealth-score-snapshot') return { findOne: mockScoreFindOne, findMany: mockScoreFindMany };
    return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/scoring-service').default;
    service = factory({
      strapi: {
        db: { query: mockQuery },
        config: { get: (k: string) => (k === 'plugin::zhao-wealth' ? pluginConfig : null) },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      },
    });
  });

  it('config 含按类型收益标尺与 operation_mode 别名', () => {
    expect(pluginConfig.scoreScales.returnScaleByType['money-wealth']).toBe(0.025);
    expect(pluginConfig.scoreScales.returnScaleByType['bank-wealth']).toBe(0.05);
    expect(pluginConfig.operationModeAliases['开放式净值型']).toBe('daily-open');
  });

  it('银行理财负收益按对称标尺计分（-2% → 30 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: -0.02 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.01, maxDrawdown: -0.01 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.returnScore).toBe(30); // 50 + (-0.02/0.05)*50
    expect(score!.compositeScore).toBe(52); // 30*.5 + 67*.25 + 80*.25
  });

  it('货币理财按 2.5% 标尺计分（2% → 90 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 3, productType: 'money-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockResolvedValue([{ metricValue: 0.0004 }]);

    const score = await service.calculateScore(3, 'm1');
    expect(score!.returnScore).toBe(90); // 50 + (0.02/0.025)*50
    expect(score!.weightProfile).toBe('money-wealth');
  });

  it('operation_mode 中文值经别名匹配 daily-open 权重', async () => {
    mockProductFindOne.mockResolvedValue({ id: 2, productType: 'bank-wealth', operationMode: '开放式净值型' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.0177 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(2, 'm1');
    expect(score!.weightProfile).toBe('bank-wealth:daily-open');
    expect(score!.weights).toEqual({ returns: 0.70, volatility: 0.20, drawdown: 0.10, peerRank: 0.00 });
  });

  it('评分快照表为空时榜单实时计算兜底', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.05 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.001, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const products = [{ id: 1, productName: 'A', recommendWeight: 1, productType: 'bank-wealth', operationMode: 'open' }];
    const productQuery = { findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(1) };
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') return productQuery;
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne, findMany: jest.fn().mockResolvedValue([]) };
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') return { findOne: mockScoreFindOne, findMany: mockScoreFindMany };
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });

    const result = await service.getScoreLeaderboard({});
    expect(result.records[0].score).not.toBeNull();
    expect(result.records[0].score.compositeScore).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试确认 FAIL**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx jest scoring-service --no-coverage`
Expected: FAIL（`returnScaleByType` undefined / returnScore 不符 / weightProfile 不符 / score 为 null）

- [ ] **Step 3: config.ts 新增两项配置**

在 `plugins/zhao-wealth/server/src/config.ts` 的 `scoreScales` 对象内、`volatilityScaleByType` 后追加：

```ts
    // 按产品类型细分收益标尺（货币类/银行理财正常年化低，全局 6% 按股基定标会失真）
    returnScaleByType: {
      'money-fund': 0.025,
      'money-wealth': 0.025,
      'bank-wealth': 0.05,
      'bond-fund': 0.10,
      'mixed-fund': 0.10,
      'stock-fund': 0.15,
    },
```

在 `scoreWeights` 定义后（`scoreScales` 之前）追加顶层别名表：

```ts
  // operation_mode 生产值与权重键的别名映射（数据为中文/简写，config 键为英文规范值）
  operationModeAliases: {
    '开放式净值型': 'daily-open',
    '封闭式': 'closed',
    '定期开放': 'fixed-term',
  },
```

- [ ] **Step 4: scoring-service.ts 三处改动**

在 `plugins/zhao-wealth/server/src/services/scoring-service.ts`：

a) 顶部读取配置处（第 30 行 `scoreScales` 定义后）追加别名读取：
```ts
  const operationModeAliases = config?.operationModeAliases || {};
```

b) `getWeightProfile`（第 53-61 行）整体替换为：
```ts
  function getWeightProfile(productType: string, operationMode: string | null): string {
    if (operationMode) {
      const normalized = operationModeAliases[operationMode] || operationMode;
      const specificKey = `${productType}:${normalized}`;
      if (scoreWeights[specificKey]) {
        return specificKey;
      }
    }
    return productType;
  }
```

c) `absoluteReturnScore`（第 84-87 行）整体替换为（对称线性：0%→50 中性，+标尺→100，-标尺→0）：
```ts
  function absoluteReturnScore(annualReturn: number | null, productType?: string): number {
    if (annualReturn === null || isNaN(Number(annualReturn))) return 50;
    const scale = (scoreScales.returnScaleByType && scoreScales.returnScaleByType[productType || ''])
      ?? scoreScales.returnScale;
    return clampScore(50 + (Number(annualReturn) / scale) * 50);
  }
```

d) `calculateScore` 调用处（第 171 行）改为传类型：
```ts
    const returnScore = absoluteReturnScore(metrics.annualReturn, product.productType);
```

e) `getScoreLeaderboard` 组装处（第 315 行 `score: scoreMap[product.id] || null,`）改为实时兜底：
```ts
        score: scoreMap[product.id] || await calculateScore(product.id, period),
```

- [ ] **Step 5: 运行测试确认 PASS**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx jest scoring-service --no-coverage`
Expected: 5 个用例全部 PASS

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/config.ts plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "feat(zhao-wealth): 评分校准-按类型收益标尺+对称负分+operation_mode别名"
```

---

### Task 2: admin-api 新增评分重算路由（供数据触发）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/routes/admin-api.ts`

- [ ] **Step 1: 新增路由**

在 `plugins/zhao-wealth/server/src/routes/admin-api.ts` 的 adminRoute 列表中（`/v1/admin/recalculate-risk-metric` 行附近）追加：

```ts
    adminRoute('POST', '/v1/admin/recalculate-scores', 'scoring.recalculate'),
```

- [ ] **Step 2: 运行既有路由测试确认无回归**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx jest controllers --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/routes/admin-api.ts
git commit -m "feat(zhao-wealth): 新增 admin 评分重算路由（复用 scoring.recalculate）"
```

---

### Task 3: 全量测试 + 重建 dist + 推送 main

**Files:**
- Modify: `plugins/zhao-wealth/dist/*`（构建产物）

- [ ] **Step 1: 全量测试**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`
Expected: 全部 PASS（若存在与本任务无关的既有失败套件，记录但不处理）

- [ ] **Step 2: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`
Expected: `✓ built` / `Build complete!`

- [ ] **Step 3: dist 自检**

Run: `rg -l "returnScaleByType" e:\code\basic\plugins\zhao-wealth\dist\server`
Expected: 命中（否则重跑 build）

- [ ] **Step 4: 提交并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(zhao-wealth): 重建 dist（评分校准 + recalculate-scores 路由）"
git push origin main
```
注意：只能 add 上述两个目录，禁止 `git add .`/`-A`

---

### Task 4: 部署 joho + 数据触发与验证

**Files:** 无（远程部署与数据操作）

- [ ] **Step 1: git pull + dist 自检 + pm2 restart**

```powershell
$script = @'
#!/bin/bash
set -e
cd /www/apps/strapi
git pull origin main >/dev/null 2>&1
if grep -rq "returnScaleByType" plugins/zhao-wealth/dist/server; then
  echo "DIST_CHECK_OK"
else
  echo "DIST_CHECK_FAIL" >&2
  exit 1
fi
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
sleep 8
echo "DONE"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: `DIST_CHECK_OK` → `PM2_RESTART_OK` → `DONE`

- [ ] **Step 2: 获取 admin token**

```powershell
$cmd = 'curl -s -X POST "http://localhost:1337/api/zhao-auth/auth/local" -H "Content-Type: application/json" -d "{\"identifier\":\"admin\",\"password\":\"Admin@12345\"}"'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: 响应含 `jwt` 字段，提取 token（记录到变量供后续步骤）

- [ ] **Step 3: 触发快照+指标补缺（recalculate-risk-metric type=all）**

```powershell
$cmd = 'TOKEN=PASTE_TOKEN; curl -s -X POST "http://localhost:1337/api/zhao-wealth/v1/admin/recalculate-risk-metric" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"type\":\"all\"}"'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: 成功响应（任务已触发或同步完成）。若返回 Redis 队列已触发，等待 30-60 秒让 job 跑完

- [ ] **Step 4: 触发评分快照重建（admin/recalculate-scores）**

```powershell
$cmd = 'TOKEN=PASTE_TOKEN; curl -s -X POST "http://localhost:1337/api/zhao-wealth/v1/admin/recalculate-scores" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"period\":\"m1\"}"'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: `{ total: 7, success: 7, failed: 0 }`

- [ ] **Step 5: 数据验证（psql 查询）**

```powershell
$script = @'
#!/bin/bash
C="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
echo "=== SCORE SNAPSHOT count ==="
$C -t -c "SELECT count(*) FROM wealth_score_snapshots;"
echo "=== SCORES products 2,3,7 ==="
$C -c "SELECT l.wealth_product_id AS pid, s.period, s.composite_score, s.return_score, s.volatility_score, s.drawdown_score, s.star_rating, s.snapshot_date, s.weight_profile FROM wealth_score_snapshots s JOIN wealth_score_snapshots_product_lnk l ON l.wealth_score_snapshot_id = s.id WHERE l.wealth_product_id IN (2,3,7) ORDER BY pid, s.snapshot_date DESC LIMIT 9;"
echo "=== METRICS product 2,7 sharpe/rank (latest) ==="
$C -c "SELECT l.wealth_product_id AS pid, s.period, s.metric_name, s.metric_value, s.snapshot_date FROM wealth_risk_metrics s JOIN wealth_risk_metrics_product_lnk l ON l.wealth_risk_metric_id = s.id WHERE l.wealth_product_id IN (2,7) AND s.metric_name IN ('sharpe','rankPercentile') ORDER BY pid, s.period, s.metric_name LIMIT 16;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: ① 评分快照 count > 0；② 产品 2/3/7 有评分记录且 weight_profile 产品 2 为 `bank-wealth:daily-open`；③ 产品 2/7 的 sharpe、rankPercentile 至少部分有值

---

### Task 5: 指标超前快照根因排查（代码核查 + 修复）

**Files:** 只读核查（若发现明确根因且修复 ≤5 行则修，否则报告）

- [ ] **Step 1: 核查 collect 成功后触发链路**

Read `plugins/zhao-wealth/server/src/controllers/collect.ts`（collect-single 成功分支）与 `plugins/zhao-wealth/server/src/jobs/collect-job.ts`，确认：
- 采集成功后触发顺序是「年化快照补缺 → 风险指标补缺」还是两 job 并行/顺序不确定
- 风险指标补缺内部是否先 `navCalculator.recalculateMissing` 再算指标（recalculateMissing 已如此，确认 collect 链路是否复用它）

- [ ] **Step 2: 核查 job 队列消费顺序**

Read `plugins/zhao-wealth/server/src/jobs/*.ts`（recalculate 相关 job），确认无并发竞态（如指标 job 与快照 job 并行消费、指标先算导致当日快照缺失）。

- [ ] **Step 3: 结论与处理**

- 若根因为链路顺序问题且改动明确（≤5 行）：直接修复并 commit `fix(zhao-wealth): 采集后先补年化快照再补风险指标`
- 若根因是偶发 job 失败/时序：报告结论，说明 re-run recalculate-risk-metric 已可自愈（Task 4 已执行），不做代码改动
- 报告必须包含：根因定位、证据（代码位置/日志）、处理方式

---

## Self-Review

**1. Spec coverage:**
- ✅ 按类型收益标尺 + 对称负分：Task 1（config returnScaleByType + absoluteReturnScore）
- ✅ 权重别名：Task 1（config operationModeAliases + getWeightProfile）
- ✅ 榜单实时兜底：Task 1（getScoreLeaderboard 实时计算）
- ✅ 评分快照重建：Task 2（admin 路由）+ Task 4（数据触发）
- ✅ 补缺：Task 4（recalculate-risk-metric type=all 覆盖快照+指标）
- ✅ 根因排查：Task 5

**2. Placeholder scan:** 无 TBD/占位；代码块完整；Task 4 中 `PASTE_TOKEN` 为运行时填充值，有明确获取步骤（Step 2）

**3. Type consistency:**
- `returnScaleByType[productType]`（Task 1 定义/读取）一致
- `operationModeAliases[operationMode]`（Task 1 config 定义、getWeightProfile 读取）一致
- `absoluteReturnScore(annualReturn, productType)` 签名（Task 1 Step 4c/d）一致
- admin 路由 handler `scoring.recalculate`（Task 2）与既有控制器方法名（scoring.ts:49）一致
