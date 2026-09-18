# 财富端评分展示修复设计（评分数据不足 / 榜单7日年化 / 同类排行）

日期：2026-09-18
状态：已确认方案
范围：basic 后端（zhao-wealth）+ strapi-wealth 前端

## 背景与问题

用户反馈三个展示问题：

1. **宁银晶耀（产品8）没有评分**：净值仅 11 条（C 份额 2026-09-02 起披露），m1 年化为 null，评分算法用 50 中性分参与加权，硬算出低分/1星，误导用户（产品8 采集源问题后续单独处理，本方案只处理展示侧）。
2. **综合评分榜 7 日年化没有显示**：`getScoreLeaderboard` 查年化快照未带 `populate: ['product']`，Strapi v5 返回的 relation 字段为 undefined，`annualMap` 按产品 id 匹配失败，`latestAnnual7d` 全为 null。
3. **同类排行数值错误 + 用语夸大**：PG numeric 返回字符串导致排序 NaN（P2 修复已在代码内，需确认部署）；"前X%"表述易被误解为"超越X%同类"，且同类样本常只有 2~3 个产品，"前50%"严重失真。

## 修复1：评分数据不足 → "数据积累中"

### 后端（scoring-service.ts）

- `calculateScore`：获取指标后，`metrics.annualReturn === null` 时直接返回 `null`（m1 年化缺失 = 数据不足，无法评分）。不再用中性 50 分硬算。
- `calculateAndSaveScoreSnapshot`：`score` 为 null 时**先删除该产品该日期的旧快照再返回**，避免 C 端读到残留的 compositeScore=0 旧快照。
- `getScoreLeaderboard`：组装后过滤 `score` 为 null 的产品，评分 null 的产品不占榜单名额、不参与排序；**过滤后按实际条数重算 total**（当前 total 来自过滤前 `productQuery.count`，需改为 `records.length` 口径），避免分页总数与展示条数不一致。

### 前端（detail/index.vue）

- `scoreData` 为 null 时，评分区显示"数据积累中"提示文案（与年化大数字"数据积累中"口径一致），隐藏星级、雷达图与分数。

### 判定标准

- 与年化计算逻辑一致：m1 年化（`annual1m`）为 null 即视为数据不足（m1 需 22 个工作日净值，产品8 仅 11 条自然不足）。
- 数据达到 m1 门槛后自动恢复评分，无需人工干预。

## 修复2：榜单 7 日年化回退

### 后端（scoring-service.ts getScoreLeaderboard）

- `allScores` 与 `allAnnuals` 两个快照查询补 `populate: ['product']`，修复 product 字段 undefined 导致 annualMap/scoreMap 匹配失败的问题。
- 7d 年化回退：`allAnnuals` 查询 limit 加大到 `productIds.length * 30`，构建两个映射：
  - `annualMap`：每个产品最新一条快照（用于 m1 年化展示）；
  - `annual7dMap`：每个产品**最近一条 annual7d 有值**的快照（节假日最新快照无 7d 时回退展示，不再空白）。

### 前端

- hall/index.vue 无需改动（`latestAnnual7d ?? annual7d` 字段名不变）。

## 修复3：同类排行隐藏展示，数据照常计算

> 用户决策（2026-09-18）：**首页/详情页同类排行全部隐藏**，后端数据照常计算并备好 `peerTotal`，未来展示方式待定。

### 后端（risk-metric-service.ts + controllers/risk-metric.ts）

- `calculateRankPercentile`：样本有效数阈值 `2 → 5`（`valid.length < 5` 返回 null）；确认 `Number()` 类型转换修复已部署（代码已含 P2 注释，实施时核对 git log）。
- 新增 `peerTotal` 指标记录：`calculateAndSaveMetrics` 每周期写入 `{ metricName: 'peerTotal', metricValue: 样本总数 }`（样本 <5 时与 rankPercentile 同为 null）。
  - 每周期记录数 4 → 5（货币型/非货币型均一致）。
  - `recalculateMissing` 的 `expectedCount = riskMetricPeriods.length * 4` 改为 `* 5`。
- C 端 `getMetrics`：`metricNames` 增加 `'peerTotal'`（透传备用，前端暂不消费）。

### 前端（detail/index.vue + hall/index.vue）

- **隐藏同类排行**：产品详情页（detail）的"同类排名"指标 cell 从模板移除；综合评分榜（hall）不新增任何同类排行展示。
- 未来展示方案待定，届时直接消费 `rankPercentile` + `peerTotal`（rank = round(rankPercentile / 100 × peerTotal)，显示"同类第X/共N名"）。

## 数据清理与重算

- 评分快照：部署后触发一次 `recalculate-all-scores`（m1），数据不足产品旧快照被清除，其余产品快照不变（或重写一致值）。
- 风险指标：部署后触发一次全量 `recalculateMissing`，所有有净值日期补齐 `peerTotal` 记录（expectedCount 5 判定），数据量小（8 产品 × 4 周期）。

## 部署范围

| 仓库 | 文件 | 说明 |
|---|---|---|
| basic | plugins/zhao-wealth/server/src/services/scoring-service.ts | 修复1+2 |
| basic | plugins/zhao-wealth/server/src/services/risk-metric-service.ts | 修复3（阈值/peerTotal/expectedCount） |
| basic | plugins/zhao-wealth/server/src/controllers/risk-metric.ts | 修复3（C 端透传 peerTotal） |
| strapi-wealth | pages/detail/index.vue | 评分区"数据积累中" + 移除"同类排名"cell |
| strapi-wealth | pages/hall/index.vue | 无改动（字段名不变） |

按插件 dist 铁律：basic 变更需 `npm run build` 重建 dist 后一并提交，再走 deploy.sh。

## 风险点

- **榜单过滤改变产品数量**：数据不足产品移出榜单后，榜单条目可能少于 pageSize，total 已按过滤后条数重算，前端分页正常。
- **旧快照清理**：仅在评分 null 时删除当日快照，不影响其他日期快照。
- **未来同类排行展示**：`rankPercentile` + `peerTotal` 已备好（rank = round(rankPercentile × total / 100)，因 rankPercentile = rank/total×100，反推为精确整数），待展示方案确定后前端直接消费。
- **产品8 后续处理**：采集源失效与份额问题按用户要求单独处理，不在本方案范围。
