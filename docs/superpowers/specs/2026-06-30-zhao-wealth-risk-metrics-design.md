# zhao-wealth 业绩归因增量设计

> 日期：2026-06-30
> 状态：已确认
> 前置依赖：zhao-wealth 迁移与修复（见 `2026-06-30-zhao-wealth-migration-design.md`）

## 一、目标

以金融专家视角补齐"专业金融服务决策支持"的关键缺口：业绩归因指标。

**设计原则**：专业 + 操作简单。客户无操作，全后台自动计算并暴露 API。

**YAGNI 排除**：不做 KYC 风险问卷、不做组合资产配置、不做到期流动性管理、不做信息披露推送。这些是后续增量。

## 二、四项核心指标

按金融行业标准，C 端客户决策真正需要的 4 个风险调整收益指标：

| 指标 | 金融含义 | 公式 | 客户决策价值 |
|---|---|---|---|
| 波动率 | 年化标准差 | `std(dailyReturns) × sqrt(250)` | 收益稳不稳，高波动=拿不住 |
| 最大回撤 | 历史最大跌幅 | `max((peak - trough) / peak)` | 最坏情况会亏多少 |
| 夏普比率 | 单位风险超额收益 | `(annualReturn - riskFreeRate) / volatility` | 专业标配，横向可比 |
| 同类排名百分位 | 同类横向对比 | `(rank / total) × 100` | 避免只看绝对收益误判 |

**精度规则**：
- 数据库保留 6 位小数
- 波动率/最大回撤前端展示乘 100 显示百分比
- 夏普比率直接显示数值
- 排名百分位显示"前 X%"

## 三、计算周期

只算长期 4 周期：`1m` / `3m` / `6m` / `1y`。

**排除短期**（1d/3d/7d/2w）：波动噪声大、参考价值低，且客户看不过来 4 指标 × 8 周期 = 32 个数字。

## 四、数据表设计

新建独立长表 `wealth-risk-metric`（不复用 wealth-annual-snapshot，避免字段膨胀与计算耦合）。

### 4.1 Schema

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_risk_metrics",
  "info": {
    "singularName": "wealth-risk-metric",
    "pluralName": "wealth-risk-metrics",
    "displayName": "风险指标",
    "description": "业绩归因指标（波动率/最大回撤/夏普/同类排名）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-wealth.wealth-product",
      "inversedBy": "riskMetrics"
    },
    "snapshotDate": {
      "type": "date",
      "required": true
    },
    "period": {
      "type": "enumeration",
      "enum": ["1m", "3m", "6m", "1y"],
      "required": true
    },
    "metricName": {
      "type": "enumeration",
      "enum": ["volatility", "maxDrawdown", "sharpe", "rankPercentile"],
      "required": true
    },
    "metricValue": {
      "type": "decimal",
      "precision": 12,
      "scale": 6
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 4.2 复合唯一索引

`(product, snapshotDate, period, metricName)` —— 防止同日同周期同指标重复写入。

通过 Strapi schema 不能直接定义复合唯一索引，需在迁移脚本中执行：

```sql
CREATE UNIQUE INDEX wealth_risk_metrics_unique_idx
ON wealth_risk_metrics (product_id, snapshot_date, period, metric_name);
```

迁移脚本存放于 `server/database/migrations/001_add_risk_metric_unique_index.js`，按 zhao-common migration-runner 规范执行。

### 4.3 wealth-product schema 补充反向关系

在 `wealth-product/schema.json` 的 attributes 中加：

```json
"riskMetrics": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-wealth.wealth-risk-metric",
  "mappedBy": "product"
}
```

## 五、配置项

新增 `server/src/config.ts`：

```typescript
export default {
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  riskMetricPeriods: ['1m', '3m', '6m', '1y'],
  riskMetricBatchConcurrency: 5,
};
```

- `riskFreeRate`：夏普比率的无风险利率，默认 2%，通过环境变量覆盖
- `riskMetricPeriods`：可配置计算周期列表
- `riskMetricBatchConcurrency`：批量计算并发数

## 六、计算逻辑

### 6.1 波动率

```
1. 取 period 内所有交易日净值（按 navDate 升序）
2. 计算每日收益率：dailyReturns[i] = nav[i] / nav[i-1] - 1
3. 计算标准差：std = sqrt(sum((r - mean)^2) / (n - 1))
4. 年化：volatility = std × sqrt(250)
```

边界：
- 净值条数 < 2 时返回 null
- 期初净值 ≤ 0 时跳过并 warn

### 6.2 最大回撤

```
1. 取 period 内所有净值（按 navDate 升序）
2. 维护 runningPeak = max(runningPeak, nav[i])
3. drawdown[i] = (runningPeak - nav[i]) / runningPeak
4. maxDrawdown = max(drawdown)
```

返回负数（如 -0.05 表示 -5%）。边界：净值条数 < 2 时返回 null。

### 6.3 夏普比率

```
annualReturn = 复用 wealth-annual-snapshot.annual{period}
sharpe = (annualReturn - riskFreeRate) / volatility
```

依赖：必须先算完波动率，且对应周期的 annualReturn 存在。
返回 null 的情形：annualReturn 为 null、volatility 为 null 或 0。

### 6.4 同类排名百分位

```
1. 按 productType 分组所有产品
2. 取每个产品同期 annualReturn（从 wealth-annual-snapshot）
   - 跳过 annualReturn 为 null 的产品（不参与排名）
3. 按 annualReturn 降序排序
4. rankPercentile = (rank / total) × 100
   rank 从 1 开始，total 为同组有 annualReturn 数据的产品数
```

例：同类 50 个产品中 40 个有 annualReturn，某产品在 40 个中排第 4，则 `rankPercentile = (4/40) × 100 = 10`（前 10%）。

返回 null 的情形：
- 该产品自身 annualReturn 为 null
- 同类有 annualReturn 数据的产品数 < 2（无对比意义）

## 七、数据流

```
18:00 采集净值（已有）
    ↓
20:00 计算年化快照（已有）
    ↓
20:30 计算风险指标（新增）
    ├── 单产品：算波动率/最大回撤/夏普 → 写入 wealth-risk-metric
    └── 全局分组：按 productType 算同类排名 → 更新对应记录
```

队列任务走现有 `wealth-calculate` 队列，注册两个 processor：

| 任务名 | 触发方式 | 处理范围 |
|---|---|---|
| `calculate-risk-metric` | 每日 20:30 Cron | 仅当日快照 |
| `recalculate-all-risk-metrics` | admin 手动触发 | 全量历史补算 |

Redis 不可用时：
- 队列任务不执行（已有降级逻辑）
- admin 触发"重算风险指标"接口返回 503
- C 端查询接口仍可用（读取历史已计算数据）

## 八、新增文件清单

```
server/src/
├── config.ts                          # 新增插件配置
├── content-types/
│   └── wealth-risk-metric/
│       └── schema.json                # 新增表 schema
├── content-types/index.ts             # 修改：注册新 content-type
├── services/
│   ├── risk-metric-service.ts         # 新增：4 项指标计算 + 批量重算
│   └── index.ts                       # 修改：注册新 service
├── controllers/
│   ├── risk-metric.ts                 # 新增：C 端查询接口
│   └── index.ts                       # 修改：注册新 controller
├── routes/
│   ├── content-api.ts                 # 修改：加 GET /v1/wealth/products/:id/risk-metrics
│   └── index.ts                       # 无需改（content-api 已聚合）
├── jobs/
│   ├── risk-metric-job.ts             # 新增：每日 20:30 队列任务
│   └── index.ts                       # 修改：注册新 job
├── bootstrap.ts                       # 修改：加 20:30 Cron
└── database/migrations/
    └── 001_add_risk_metric_unique_index.js  # 新增：复合唯一索引迁移
```

修改 `wealth-product/schema.json`：加 `riskMetrics` 反向关系字段。

## 九、API 接口

### 9.1 C 端查询

```
GET /api/v1/wealth/products/:id/risk-metrics?period=1m,3m,6m,1y
```

**Query 参数**：
- `period`：逗号分隔的周期列表，默认全部 4 个

**响应**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "1m": {
      "volatility": 0.034521,
      "maxDrawdown": -0.012345,
      "sharpe": 1.234567,
      "rankPercentile": 15
    },
    "3m": { ... },
    "6m": { ... },
    "1y": { ... }
  }
}
```

**权限**：`plugin::zhao-auth.has-channel-access`（与其他 C 端接口一致）

**降级**：无数据时返回各字段为 null：

```json
{
  "1m": {
    "volatility": null,
    "maxDrawdown": null,
    "sharpe": null,
    "rankPercentile": null
  }
}
```

### 9.2 后台触发重算

复用现有 `POST /wealth-admin/v1/recalculate` 接口，扩展 `type` 参数：

```json
{
  "productId": 123,
  "type": "risk-metric"
}
```

`type` 可选值：
- `annual`（默认）：原有年化重算
- `risk-metric`：风险指标重算
- `all`：两者都重算

## 十、批量重算策略

### 10.1 首次部署补全

迁移完成后立即触发一次全量重算，补全历史风险指标数据：

```
queue.add('recalculate-all-risk-metrics', {})
```

job 内部：
1. 查所有产品
2. 每个产品查所有历史净值日期
3. 对每个日期算 4 周期 × 4 指标
4. 按 productType 分组算同类排名

预计耗时：100 个产品 × 250 天/年 × 4 周期 × 4 指标 = 40 万次计算。并发 5 时约 30 分钟。

### 10.2 日常增量

每日 20:30 Cron 触发，仅算当日快照：

```
queue.add('calculate-risk-metric', { snapshotDate: today })
```

job 内部：
1. 查当日有净值的产品
2. 每个产品算 4 周期 × 4 指标
3. 按 productType 分组算同类排名（更新当日记录）

## 十一、不做范围（YAGNI 排除）

- ❌ 索提诺比率（Sortino Ratio，夏普改进版，C 端过度）
- ❌ VaR（在险价值，需假设正态分布，客户难理解）
- ❌ 下行捕获率 / 上行捕获率
- ❌ Alpha / Beta（需引入基准数据采集，超范围）
- ❌ 前端图表可视化（只出 API，前端由前端组接）
- ❌ 历史指标回溯查询（只算当日快照，历史数据由首次批量重算补全后不再变更）
- ❌ 跨周期对比接口（如"1m 波动率 vs 3m 波动率"图表，留给前端组合）

## 十二、验收标准

- [ ] `wealth_risk_metrics` 表自动创建
- [ ] 复合唯一索引通过迁移脚本创建
- [ ] C 端接口 `GET /api/v1/wealth/products/:id/risk-metrics` 返回 4 周期 × 4 指标
- [ ] 后台 `POST /wealth-admin/v1/recalculate` 支持 `type=risk-metric`
- [ ] 首次全量重算后，每个有历史净值的产品至少有 1 条风险指标记录
- [ ] 波动率/夏普/最大回撤/排名百分位计算结果与手工验证一致（取 1 个产品 1 个周期核对）
- [ ] Redis 不可用时插件不崩溃，C 端查询接口仍返回历史数据

## 十三、计算正确性验证样例

取一个产品近 30 天净值，手工计算：

1. 波动率：Excel `=STDEV(日收益率数组) * SQRT(250)`
2. 最大回撤：Excel `=MAX((MAX(累计峰值) - 当前值) / MAX(累计峰值))`
3. 夏普：`(年化收益 - 0.02) / 波动率`
4. 同类排名：在同 productType 产品中按年化降序排名

与 API 返回值对比，误差应 < 0.000001（6 位小数精度）。
