# 财富 4 任务（榜单/净值精度/快照去重/指标补缺/展示残留）设计方案

> 日期：2026-09-16
> 状态：已确认（用户选定全部 4 任务）

## 任务 1：榜单排序修复 + 净值精度

### 1a 晨夕盈21（产品 6）未上榜

**根因**：`getScoreLeaderboard`（scoring-service.ts）先按 `recommendWeight desc` 分页取前 N 个产品（7 个产品 recommendWeight 全为 0/null，产品 6 被挤出前 5 分页），再在内存按综合分排序 → 榜单实际是"分页出的前 N 个产品再排序"，而非"全库评分 TopN"。产品 6 评分 78（全库最高）却不上榜。

**修复**：
- 产品查询改为全量（`limit: 500`），组装评分后排序，再 `slice(offset, offset+limit)` 取当前页
- `total` 保持产品总数不变
- 改动文件：`plugins/zhao-wealth/server/src/services/scoring-service.ts` 的 `getScoreLeaderboard`

**测试**（scoring-service.test.ts 新增）：
- 场景：6 个产品，评分最高的产品排在 recommendWeight 分页边界之外（如第 6 位），`getScoreLeaderboard({pageSize:5})` 必须包含该产品且排第一

### 1b 净值走势数值精度

**根因**：详情页走势图 Y 轴与最低/最高文字用 `toFixed(4)`，净值 1.010979 vs 1.011010 显示相同（1.0110），变动不可见。

**修复**：`pages/detail/index.vue` 中 3 处 `toFixed(4)` → `toFixed(6)`：
- Y 轴标签 max/min
- 趋势图下方最低净值/最高净值文字

净值表（`n.unit ?? n.unitNav`）已显示原值（8 位精度存储），不改。

## 任务 2：年化快照去重

**现状**：生产 `wealth_annual_snapshots` 有 **578 个 (product, snapshotDate) 重复日期**（同 product 同日期 2 条）。

**根因**：并发写入竞态——`recalculateSnapshots`/`recalculateMissing` 两处写入均为"findOne 判存在 → 不存在则 create"，两个 job 并发时都查到 null → 双双 create。

**修复**：
1. **存量清理**（SQL）：
   - 对每 (product, snapshotDate) 保留最小 `id`，删除其余重复行及其 lnk 关联
   - 先备份：`CREATE TABLE wealth_annual_snapshots_bak_20260916 AS SELECT * FROM wealth_annual_snapshots;`（含 lnk 表备份）
2. **代码防复发**：`recalculateSnapshots` 与 `recalculateMissing` 写入段加产品级 Redis 锁（复用现有 `acquireLock`/`releaseLock` util，lock key `wealth:annual-snapshot:{productId}`），锁内保持 findOne→update/create
3. **验证**：清理后重复计数=0；触发一次补缺重算后仍=0

**改动文件**：
- `plugins/zhao-wealth/server/src/services/nav-calculator.ts`（两处写入段加锁）
- `plugins/zhao-wealth/server/src/utils/queue.ts` 或现有锁工具（确认 lock 工具路径）

## 任务 3：风险指标补缺

**现状**：09-16 当天 `volatility`/`maxDrawdown` 有值，但 `rankPercentile`/`sharpe` 全部 null（7 产品 × 2 指标）。

**根因**：时序竞态——指标任务运行时当日净值/年化快照尚未生成：
- sharpe 依赖当日 `annualReturn`（findOne 当日快照 → null → sharpe null）
- rankPercentile 依赖当日快照样本（无当日快照 → valid<2 → null）

**修复**：
1. **数据层**：触发 `recalculate-risk-metric type=all`（service 两阶段：先补缺年化快照再算指标），验证：
   - 09-16 年化快照生成
   - 09-16 rankPercentile/sharpe 非空
2. **代码检查**：确认"采集成功 → 触发单产品补缺"链路存在（collect-job.ts 的 collect-single 成功后是否触发 `recalculate-risk-metric-product`）；若缺失则补上触发
3. **验证**：补缺后按产品查 09-16 指标全字段非空

**改动文件**：
- `plugins/zhao-wealth/server/src/jobs/collect-job.ts`（确认/补齐触发链）
- `plugins/zhao-wealth/server/src/services/risk-metric-service.ts`（如补缺缺陷）

## 任务 4：C 端展示残留修复

**流程**：
1. 走查三页（Playwright + 人工微信浏览器）：
   - hall 首页：货币理财筛选、最近更新排序、数据更新至提示、下拉刷新
   - detail 详情页：评分星级与维度分、净值 6 位显示、货币产品 7 日年化走势
   - compare 对比页：选品搜索、多曲线趋势卡、货币虚线、Y 轴百分比
2. 按走查发现的问题清单修复（问题列表在实施阶段产出）
3. 修复后复走查验证

**改动文件**：视走查结果（预期 `pages/hall/index.vue`、`pages/detail/index.vue`、`pages/compare/index.vue`、`services/api.ts`）

## 实施顺序与依赖

1. 任务 1（独立，后端+前端各一处）
2. 任务 2（独立，数据+后端）
3. 任务 3（独立，数据+后端）
4. 任务 4（依赖 1-3 部署完成后的线上走查）

后端任务（1a/2/3）统一重建 dist + 部署 joho；前端任务（1b/4）统一推送 wealth-line + 部署 v.joho.cn/wealth。

## 风险与回退

- **任务 2 清理**：已备份表，可一键恢复；唯一索引不做（Strapi 6 关联表无冗余列，跨表唯一约束侵入大），依赖锁防复发
- **任务 3 补缺**：幂等（补缺只补缺失）；若 rank 样本仍不足（同日有效快照<2），保留 null 属模型预期
- **任务 1 榜单**：产品量小（7 个），全量查询无性能风险
