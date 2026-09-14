# 净值采集中心批量操作修复与增量计算设计（2026-09-14）

## 背景与目标

管理端「采集中心」页（`e:\code\web\src\pages\wealth\collect\index.vue`）的三个批量按钮存在失效问题，同时产品规模将从 3 只扩展至 100+ 只，需保证批量操作在规模下仍可用。

目标：
1. **修复失效按钮**：「手动批量采集 / 重算年化 / 重算风险指标」真实可用，展示真实执行结果（成功/失败汇总），不再"假成功"或"必失败"。
2. **支持 100+ 产品规模**：新增产品全量回溯计算，已有产品增量计算，避免每次全量重算。

## 问题根因（2026-09-14 代码查证）

| 按钮 | 现象 | 根因 |
|---|---|---|
| 重算风险指标 | 每次点击必报「重算失败」 | 前端 `recalculateRiskMetric()` 未传 body，后端 `risk-metric.recalculate` 强制要求 `type ∈ {risk-metric, all}`，缺省返回 400（`controllers/risk-metric.ts:68-72`）。对照监察页 `monitor/index.vue:149` 正确传了 `type: 'risk-metric'`，故监察页按钮正常 |
| 手动批量采集 | 提示「已触发/完成」但数据无变化 | 生产 Redis 可用（1Panel-redis-mJDW），`collect.trigger` 走异步队列立即返回；`collect-all` job 带 30min 分布式锁，残留锁会静默跳过；前端 2s 后刷新看不到结果 |
| 重算年化 | 同上"假成功" | `recalculate-all` job 异步执行，前端无进度/结果查询 |

**规模瓶颈（100+ 产品）**：现有 `recalculateAll()` 为全量重算（遍历全部产品 × 全部净值日期）。年化 100 产品 × 200 日 × 8 周期、风险指标 100 × 200 日 × 16 指标均达分钟级，且队列串行，不可持续。

## 设计决策（已与用户确认）

- **增量算法**：补缺（backfill missing）——按产品维度找出「有净值但无年化快照 / 无风险指标」的日期，只计算缺失部分。幂等、无需状态记录、天然兼容「新产品首次全量回溯」（新产品 diff = 全部历史净值）。
- **执行模式**：采集（外部网络 IO 重）保持异步队列；年化/风险指标批量任务改为**补缺 job**（接口/路由/前端 API 签名不变，仅替换 job 内部实现）。
- **反馈方式**：前端触发后**轮询现有接口**判断完成（采集状态聚合 + 监察三日期同步度），展示真实汇总。零 schema 变更、零新依赖。
- **计算闭环**：`collect-single` 成功后自动触发单产品年化 + 风险指标补缺，一次批量采集完成全链路。

## 核心算法：增量补缺

### 年化快照补缺（nav-calculator）

```sql
-- 有净值但无年化快照的 (product_id, nav_date)
SELECT DISTINCT n.product_id, n.nav_date
FROM wealth_navs n
LEFT JOIN wealth_annual_snapshots s
  ON s.product_id = n.product_id AND s.snapshot_date = n.nav_date
WHERE s.id IS NULL
ORDER BY n.nav_date ASC;
```

对每个缺失日期调用现有 `calculateSnapshot(productId, navDate)` → upsert（已存在则更新，否则创建，复用 `recalculateSnapshots` 内 upsert 逻辑）。

### 风险指标补缺（risk-metric-service）

风险指标依赖年化快照（sharpe/rankPercentile 需要 annualReturn），且 rankPercentile 需要**同日全部产品快照齐全**排名才准。故按两阶段执行：

1. **阶段一**：调用 `navCalculator.recalculateMissing(productId?)` 补齐年化快照。
2. **阶段二**：按日期升序补缺风险指标：

```sql
-- 有净值但无风险指标的 (product_id, nav_date)
SELECT DISTINCT n.product_id, n.nav_date
FROM wealth_navs n
LEFT JOIN wealth_risk_metric m
  ON m.product_id = n.product_id AND m.snapshot_date = n.nav_date
WHERE m.id IS NULL
ORDER BY n.nav_date ASC;
```

对每个日期调用现有 `calculateAndSaveMetrics(productId, navDate)`（同日快照已齐，rank 准确）。

## 后端设计（zhao-wealth 插件 `server/src`）

### 1. `services/nav-calculator.ts` 新增 `recalculateMissing(productId?)`

- 无参 = 全产品补缺（按日期升序）；传 productId = 单产品补缺（新产品首次 = 全量回溯）。
- 返回 `{ productId, calculatedDates }[]` 明细。
- **保留原 `recalculateAll()`**（作为深度纠偏工具，不删除）。

### 2. `services/risk-metric-service.ts` 新增 `recalculateMissing(productId?)`

- 内部两阶段：先年化补缺，再风险指标补缺。
- 返回明细。保留原 `recalculateAll()`。

### 3. job 内部实现替换（接口/队列名不变）

| Job | 现实现（全量） | 改为（补缺） |
|---|---|---|
| `recalculate-all`（calculate-job.ts:55） | `navCalculator.recalculateAll()` | `navCalculator.recalculateMissing()` |
| `recalculate-product`（calculate-job.ts:27） | 遍历产品全部净值重算 | `navCalculator.recalculateMissing(productId)` |
| `recalculate-all-risk-metrics`（risk-metric-job.ts:37） | `riskMetricService.recalculateAll()` | `riskMetricService.recalculateMissing()` |
| `recalculate-risk-metric-product`（risk-metric-job.ts:17） | 遍历产品全部历史日期 | `riskMetricService.recalculateMissing(productId)` |

同时将 controller 同步降级分支（`collect.ts:280`、`risk-metric.ts:107`）改为 `recalculateMissing`，保持队列/降级行为一致。

### 4. 采集→计算闭环（collect-job.ts:119）

`collect-single` 成功后，将现有 `calculateQueue.add('calculate-snapshot', { productId })` 替换为：

```typescript
calculateQueue.add('recalculate-product', { productId });              // 单产品年化补缺
calculateQueue.add('recalculate-risk-metric-product', { productId });  // 单产品风险补缺
```

- 老产品：每日新增 1 条净值 → 只补该日，秒级。
- 新产品：首次采集历史净值入库 → 补缺 = 全量回溯该产品。
- `calculate-snapshot` / `calculate-risk-metric` job 保留（20:00 / 20:30 定时任务仍使用）。

### 5. `risk-metric.recalculate` type 校验修复（risk-metric.ts:68）

```typescript
if (type && type !== 'risk-metric' && type !== 'all') → 400
```

缺省不再报错：无 productId 且缺省 type → 触发 `recalculate-all-risk-metrics`（补缺）；有 productId → 触发 `recalculate-risk-metric-product`（补缺）。监察页传 `type: 'risk-metric'` 调用不受影响。

### 6. 采集任务运行状态标记（collect-job.ts + schema）

- `wealth-collect-config` schema 的 `collectStatus` 枚举新增 `'running'`（现为 `["pending","success","failed"]`）。Strapi v5 枚举列为 varchar、应用层校验，**无 DB 迁移**，但需重建 dist。
- `collect-single` job 开始置 `collectStatus='running'`，结束置 `'success'` / `'failed'`，供前端轮询聚合判断任务完成。
- 进程崩溃可能残留 `running`，前端轮询 180s 超时兜底提示，不影响后续任务（下次成功/失败会覆盖）。

## 前端设计（`e:\code\web`）

### 1. `src/api/wealth.js` 新增

```javascript
export function getAdminCollectConfigs(params = {}) {
  return adminGet(`${ADMIN}/collect-configs`, params).then(extractList)
}
```

（后端 `collectConfigsList` 已存在，返回 `{data:{records,...}}`，extractList 可解析；`getProductMonitor()` 已存在）

### 2. `src/pages/wealth/collect/index.vue` 批量按钮改造

通用流程（三个按钮一致）：点击 → 触发 → toast「任务已触发，处理中…」→ **轮询** → 展示真实汇总。

| 按钮 | 触发调用 | 完成判定（轮询） |
|---|---|---|
| 手动批量采集 | `triggerCollect({})` | `getAdminCollectConfigs`：所有配置 `collectStatus !== 'running'` 视为完成；汇总 success/failed（failReason 展示） |
| 重算年化 | `recalculate({})` | `getProductMonitor`：所有产品 `annualStatus === 'ok'` 视为完成 |
| 重算风险指标 | `recalculateRiskMetric({ type: 'all' })` | `getProductMonitor`：所有产品 `riskStatus === 'ok'` 视为完成 |

- 轮询间隔 5s，超时上限 180s；超时后提示「任务仍在处理，可稍后刷新查看」，不阻塞页面。
- 完成后 toast「成功 X 个 / 失败 Y 个」；失败时在页面「最近一次批量操作结果」区域展示明细（产品名 + 原因），来源：采集取 config.failReason，年化/风险取监察接口中未同步的产品清单。
- 页面新增「任务处理中」状态条（任务类型 + 轮询中动画）。
- 操作完成后刷新概览 / 异动 / 监察数据。

### 3. `src/pages/wealth/monitor/index.vue`

无需改动（单产品按钮已正确传参；后端补缺化后行为更快）。

## 性能估算

| 操作 | 3 产品（现状） | 100+ 产品（增量） |
|---|---|---|
| 全量采集（异步队列） | ~10s | 100-300s（网络 IO，异步无超时问题） |
| 年化补缺（每产品每日 1 条） | 秒级 | 100 产品 × 8 周期 ≈ 秒级~十几秒 |
| 风险补缺（每产品每日 1 条） | 秒级 | 100 × 16 指标 + rank 查询 ≈ 十几秒 |
| 新产品首次（200 日历史） | — | 单产品补缺 ≈ 几十秒（队列异步） |

100 产品量级下，每次增量计算均为秒级~几十秒，队列串行执行无前端超时问题；全量重算（分钟级）仅保留为深度纠偏工具，不再作为批量按钮默认行为。

## 兼容性与风险

1. **接口签名不变**：所有路由、请求/响应结构不变，仅 job 内部实现替换 + type 校验放宽。监控页、定时任务、C 端均不受影响。
2. **rankPercentile 准确性**：两阶段补缺保证同日快照先齐后算指标，rank 准确。
3. **补缺幂等**：重复触发无副作用（diff 为空即无操作）。
4. **锁残留**：`collect-all` 30min 锁残留会导致任务静默跳过，前端轮询超时后提示占用可能，用户可稍后重试（不列为本次改造范围）。
5. **dist 重建铁律**：插件 `server/src` 全部改动必须 `npm run build` 重建 dist 并随提交推送，部署前 grep 自检新方法关键字（如 `recalculateMissing`）。
6. **前端部署目标**：管理端 web 部署目标站点为 **h.joho.cn**（title=web），非 admin.joho.cn（DEPLOYMENT.md 已过时）。

## 验收标准

1. 采集中心三个批量按钮点击后均有「任务已触发」反馈，轮询完成后展示真实成功/失败汇总；风险指标按钮不再报 400。
2. 批量采集完成后，各产品年化快照与风险指标自动补齐至最新净值日期（监察页三状态转 ok）。
3. 新增产品（首次采集入库）后，该产品年化/风险指标自动全量回溯，无需手动逐日计算。
4. 重复触发补缺无副作用（幂等）。
5. 全量重算接口（`recalculateAll`）仍可用（深度纠偏场景）。
6. 部署自检：`grep dist/server 是否含 recalculateMissing`；前端构建后验证 `/api/zhao-wealth/v1/admin/collect-configs` 与 `/monitor/products` 可访问。

## 部署注意

1. 插件：`plugins/zhao-wealth` 下 `npm run build` → git commit（含 dist）+ push → 走 `deploy.sh`。**本次含 schema 枚举变更（collectStatus 加 'running'）**，必须重建 dist 后推送，否则新状态写入失败。
2. 管理端 web：`e:\code\web` 构建部署至 h.joho.cn。
3. 部署后验证：触发一次批量采集，观察 pm2 日志 `[zhao-wealth]` 采集/年化/风险补缺记录；监察页三状态同步。
