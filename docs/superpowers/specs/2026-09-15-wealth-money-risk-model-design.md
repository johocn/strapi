# 货币理财风险评价模型修复与重新规划（任务 2）

- 日期：2026-09-15
- 范围：zhao-wealth 插件（basic 仓库）+ C 端财富前端（strapi-wealth wealth-line）+ 管理端（web 仓库 h.joho.cn）

## 1. 背景与目标

「幸福99」等货币理财（money-wealth）产品净值恒为 1.0（行业惯例，收益体现在万份收益/七日年化）。当前风险评价链路仍按净值型产品处理，导致货币理财的年化、风险指标、评分全面失真。另发现南银净值产品评分存在「波动满分不合理、回撤无数值」缺陷。

目标：
1. 货币理财走收益型风险评价（年化按万份收益、风险指标按收益序列），展示层同步适配
2. 净值型评分标尺按产品类型细分，恢复区分度；修复回撤 null
3. 清理僵尸测试，全量测试回绿
4. 顺带排查管理端/C 端契约错配，产出清单

## 2. 问题全景与根因

| # | 位置 | 问题 | 后果 |
|---|------|------|------|
| A1 | `nav-calculator.calculateSnapshot` | `isMoneyFund = productType === 'money-fund'`，money-wealth 走净值分支 | 年化快照 8 期限恒 0 |
| A2 | `annual-snapshot.calculateYearlyReturn` | 同上，只认 money-fund | 年度收益恒 0 |
| A3 | `risk-metric-service.calculateMetricsForPeriod` | 净值恒 1 → 波动率=0、回撤=0、夏普=null | 风险指标失真 |
| A4 | `calculateRankPercentile` | 依赖 A1 的恒 0 年化 | 同类排名失真 |
| A5 | `scoring-service.getWeights` | 无 money-wealth 权重，回退 bank-wealth（drawdown 权重 0.25） | 回撤=0 白拿 25% 满分 |
| A6 | C 端 detail 页 | 货币理财显示「波动率 0% / 回撤 0%」 | 展示误导 |
| B1 | `scoring-service` volatilityScale=0.10 | 按股票基金定标，银行理财年化波动 0.3%-1% → 得分 95-100 | 波动满分无区分度 |
| B2 | `risk-metric-service.calculateMaxDrawdown` | 南银净值产品 maxDrawdown 写库为 null | 回撤无数值，根因待生产验证 |

顺带：`holding-service.test.ts` 与 `controllers.test.ts` 的 holding 块引用已删除的 holding 模块，17 个测试失败（僵尸测试）。

## 3. 设计 A：年化/年度收益分支修复（A1/A2）

`nav-calculator.calculateSnapshot` 与 `annual-snapshot.calculateYearlyReturn` 的货币类型判断统一改为：

```ts
const isMoneyType = product.productType === 'money-fund' || product.productType === 'money-wealth';
```

- `calculateSnapshot`：isMoneyType 走 `calculateMoneyFundSnapshot`（万份收益单利年化，8 期限），money-wealth 复用 money-fund 既有逻辑
- `calculateYearlyReturn`：isMoneyType 走万份收益累加年化
- money-wealth 的 `wealth-money-incomes` 数据由杭银等采集器写入（已有），无需新增采集

## 4. 设计 B：货币理财收益型风险指标（A3/A4）

`risk-metric-service.calculateMetricsForPeriod` 增加 isMoneyType 分支（同时覆盖 money-fund，同病同治）：

| metricName | 货币理财语义 | 算法 |
|---|---|---|
| `volatility`（复用） | 收益波动率 | `std(每日万份收益/10000) × sqrt(365)`，与净值型同量纲 |
| `incomeStability`（新枚举） | 收益稳定度 | 周期内万份收益变异系数 `CV = std/mean`，越小越稳 |
| `rankPercentile`（复用） | 收益型排名 | A1 修复后按同类（money-wealth 组）年化排序，现有分组逻辑自动正确；同类样本 < 2 时置 null（沿用现有判定） |
| `maxDrawdown` / `sharpe` | 不适用 | 置 null |

约束：
- **`incomes.length >= 2` 才计算 volatility/incomeStability**，不足则 null（防 std=0 → 波动满分，与净值型 `returns.length < 2` 对称）
- `wealth-risk-metric` content-type 的 `metricName` 枚举新增 `incomeStability`
- 指标写入统一走 `toFinite` sanitize（沿用现有约定）

## 5. 设计 C：评分模型修复（A5/B1/B2）

### C1 权重表补 money-wealth（A5）

```ts
scoreWeights['money-wealth'] = { returns: 0.80, volatility: 0.20, drawdown: 0.00, peerRank: 0.00 };
```

货币理财评分 = 80% 收益 + 20% 收益波动，回撤/排名不参与（回撤无概念、同类样本少）。

### C2 波动标尺按类型细分（B1）

`scoreScales` 保持全局默认（0.10 服务股票/混合基金），新增按类型覆盖：

```ts
volatilityScaleByType: {
  'bank-wealth': 0.03,
  'money-fund': 0.02,
  'money-wealth': 0.02,
}
```

`absoluteVolatilityScore` 接收 productType 参数，按类型取标尺。效果：南银产品波动 0.5% → 83 分（原 95+），区分度恢复。

### C3 回撤 null 根因（B2）

实施第一步：查 joho 生产库 `wealth-risk-metrics` 中南银产品（Z70026 等）的 maxDrawdown 记录与对应周期窗口净值条数，定位根因（候选：窗口净值不足 2 条 / 净值精度 / 时区边界偏移），确认后针对性修复。不预设结论。

### C4 评分即时生效

评分 `getProductMetrics` 实时读 `wealth-risk-metric` 与 `wealth-annual-snapshot` 表计算，**指标重算后评分自动更新，无需单独迁移**。

## 6. 设计 D：展示层

### D1 C 端详情页（strapi-wealth wealth-line，detail 页）

- 货币理财风险卡片：显示「收益波动率」「收益稳定度」「同类排名」，隐藏回撤与夏普
- 净值型：保持现状（B2 修复后回撤有值）
- 评分解释文案按类型切换（净值型解释波动/回撤，货币型解释收益波动/稳定度）
- 具体行号与数据源（product detail 接口 vs 单独 risk 接口）实施时确认

### D2 管理端指标中心（web 仓库 metrics 页）

- money-wealth 产品显示收益型指标语义（波动=收益波动、稳定度、排名），回撤/夏普显示「-」
- 新增 `incomeStability` 的展示接入（指标中心列表/metricName 映射）

## 7. 设计 E：僵尸测试修复

- 删除 `holding-service.test.ts`（holding 模块已删，持仓由 portfolio 承担）
- `controllers.test.ts`：删除 `describe('holding controller')` 块，保留 disclosure 等有效测试
- 目标：全量测试回绿（13 套件全过）

## 8. 设计 F：契约错配排查（产出清单）

对照管理端 7 页（collect/compare/disclosure/holding/metrics/monitor/product）与 C 端（detail/compare/hall/portfolio）与后端契约：
- 字段名 / 接口路径 / 参数风格
- 本次只产出问题清单 + 顺手修小问题；涉及面大的单独立为任务 3

## 9. 部署与验证

### 部署

1. basic 后端：schema 枚举变更（incomeStability）Strapi 启动自动同步；本地 dist 重建 + 自检 grep（`incomeStability`/`isMoneyType`/`volatilityScaleByType`）；git commit + push；joho `deploy.sh` + pm2 restart（2G 服务器禁止构建，dist 本地构建后提交）
2. 存量数据重算：部署后触发年化补缺 + 风险指标补缺 job（`recalculateMissingAll` + 风险指标补缺），幸福99 及存量货币产品指标自动重算；净值型产品指标一并重算（评分即时生效）
3. C 端 strapi-wealth：detail 页改动 → 构建部署 v.joho.cn/wealth（wealth-line 分支）
4. 管理端 web：metrics 页改动 → 构建部署 h.joho.cn

### 验证清单

- 幸福99（money-wealth）：年化 8 期限非 0（收益型）、volatility=收益波动率、incomeStability 有值、maxDrawdown=null、评分不含 drawdown 权重且波动得分非满分
- 南银 Z70026（bank-wealth）：波动得分恢复区分度（<90）、回撤有数值
- 全量测试回绿（僵尸测试清理后）
- C 端货币理财风险卡片与管理端指标中心展示正确
- 未登录访问接口 401/403

## 10. 任务边界

- 本次 = 任务 2：A/B/C/D/E/F
- 契约排查产出的大问题 → 任务 3（独立规划）
