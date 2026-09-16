# 财富评分模型校准 + 数据修复 设计文档

> 日期：2026-09-16
> 范围：zhao-wealth 插件（basic 仓库 main 分支）+ 生产数据（joho）
> 依据：三款产品（id=2/3/7）实况数据审查 + 用户确认的四项修复口径

## 背景与问题

审查发现评分模型存在 4 类问题：
1. **收益标尺 6% 一刀切**：货币理财/货基正常年化 1.5-2.5%，按 6% 标尺收益分永远 25-42，货币类收益维度无区分度
2. **负收益无区分**：`absoluteReturnScore = clamp(年化/6%×100, 0, 100)`，-8% 与 -50% 同为 0 分
3. **权重契约错位**：config 权重键为 `daily-open/fixed-term/closed`，生产 operation_mode 实际为"开放式净值型"/open/空 → 全部回退通用权重，日开产品 0.7/0.2/0.1 权重从未生效
4. **评分快照表为空（0 行）**：`getScoreLeaderboard` 依赖快照表，空表时分数全 null、按 0 排序 → 榜单实际未按评分排序（详情页实时计算正常）

另发现数据同步问题：09-16 风险指标已生成但当日年化快照缺失（净值采集后快照未补），导致 sharpe/rankPercentile 全空。

## 改动设计

### 1. 收益标尺按类型分 + 对称负分（config.ts + scoring-service.ts）

**config.ts** `scoreScales` 新增：
```ts
returnScaleByType: {
  'money-fund': 0.025,
  'money-wealth': 0.025,
  'bank-wealth': 0.05,
  'bond-fund': 0.10,
  'mixed-fund': 0.10,
  'stock-fund': 0.15,
},
// 默认 returnScale 0.06 保留，作为未知类型回退
```

**scoring-service.ts** `absoluteReturnScore` 改造：
```ts
function absoluteReturnScore(annualReturn: number | null, productType?: string): number {
  if (annualReturn === null || isNaN(Number(annualReturn))) return 50;
  const scale = (scoreScales.returnScaleByType && scoreScales.returnScaleByType[productType || ''])
    ?? scoreScales.returnScale;
  // 对称线性：0% → 50 中性分，+标尺 → 100，-标尺 → 0
  return clampScore(50 + (Number(annualReturn) / scale) * 50);
}
```
调用处 `calculateScore` 改为 `absoluteReturnScore(metrics.annualReturn, product.productType)`。

### 2. 权重契约：operation_mode 别名映射（config.ts + scoring-service.ts）

**config.ts** 新增：
```ts
operationModeAliases: {
  '开放式净值型': 'daily-open',
  '封闭式': 'closed',
  '定期开放': 'fixed-term',
},
```

**scoring-service.ts** `getWeightProfile` 改造：匹配前先过别名：
```ts
function getWeightProfile(productType: string, operationMode: string | null): string {
  if (operationMode) {
    const normalized = config?.operationModeAliases?.[operationMode] || operationMode;
    const specificKey = `${productType}:${normalized}`;
    if (scoreWeights[specificKey]) return specificKey;
  }
  return productType;
}
```

### 3. 评分快照重建 + 榜单实时兜底（scoring-service.ts + 数据）

**scoring-service.ts** `getScoreLeaderboard`：`scoreMap` 中缺失的产品实时计算兜底：
```ts
// 组装 records 时（score 字段）：
score: scoreMap[product.id] || await calculateScore(product.id, period),
```
性能：榜单 ≤50 条，实时计算每条约 4 次查询，可接受。

**数据**：部署后调用 `recalculateAllScores`（全量评分快照重建），接口触发（admin-api 现有 recalculate 相关路由，实施时确认）。

### 4. 补缺 + 根因排查（数据 + 代码）

**数据**：部署后对 7 个上架产品触发 `recalculateMissing`（快照+指标补缺），补齐 09-16 缺失快照，恢复 sharpe/rankPercentile。

**根因排查**：核查 collect-job / 补缺 job 的触发顺序——"指标日期(09-16)超前于年化快照(09-15)"的根因（疑：09-16 净值采集后，指标补缺先跑、快照补缺失败/未跑，或两 job 并行竞态）。修根因：collect 成功后统一走「快照补缺 → 指标补缺」串行链路（若已正确则只补数据）。

## 生产数据变更（部署后）

1. 触发 `recalculateAllScores`：生成全量评分快照（7 产品 × 1 周期 m1）
2. 触发 `recalculateMissing`（全产品）：补齐缺失快照与指标
3. 验证：评分快照 >0 行；产品 2/7 的 sharpe、rankPercentile 有值；产品 2 权重 profile 变为 bank-wealth:daily-open

## 预期评分变化（模型校准结果）

| 产品 | 旧综合分 | 新综合分（预计） | 变化原因 |
|---|---|---|---|
| id=2 渤银晨夕盈6号 | 64 | ≈54 | 权重切 daily-open（0.7/0.2/0.1）+ 收益分 50+1.77/5×50=68 → 68×0.7+98×0.2+100×0.1=47.6+19.6+10=77 更合理 |
| id=3 幸福99金钱包 | 60 | 收益分 50+1.8/2.5×50=86（若 annual1m 有值）→ 86×0.8+98×0.2=88.4 | 货币标尺 2.5% 大幅提升货币类收益分 |
| id=7 幸福99鸿益1年 | 34 | ≈34（-8.27% 超 -5% 标尺仍 0 收益分） | 1 星合理，负收益区间已预留区分 |

（实际以重算后为准；货币类 annual1m 缺失时维持 50 中性分）

## 风险与说明

- 评分/星级变化属预期（模型校准），C 端展示无需改代码，数值自动更新
- 对称分把 0 收益抬到 50 中性分：对长期 0 收益产品分数中性而非惩罚，符合稳健理财语境
- operation_mode 空值（产品 4/5）与 'open'（产品 7）不做别名猜测，维持通用权重
- 货币类 annual1m 依赖 30 天收益数据，数据不足时 returnScore=50 中性（现状维持）
