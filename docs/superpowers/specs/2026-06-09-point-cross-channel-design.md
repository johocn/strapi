# 积分商品跨渠道兑付设计方案

> 日期：2026-06-09
> 状态：已实现
> 更新：2026-06-10 新增 allowGlobalPoints 字段

---

## 一、问题

1. C 端商品查询缺少图片、渠道等完整字段
2. C 端商品没有按渠道过滤，所有用户看到所有商品
3. 用户渠道归属未确定，无法做渠道级商品可见性
4. 不支持跨渠道兑付，积分无法跨渠道使用

## 二、设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 积分扣减策略 | 渠道优先 + 全局兜底 + 用户选择 | 灵活且用户有选择权 |
| 全局积分来源 | 无渠道行为的积分自动为全局 | 签到等不涉及渠道的行为 channel = null |
| 用户渠道归属 | 优先邀请码，其次自提点选择 | 渐进式引导 |
| 跨渠道可见性 | 商品 allowCrossChannel 字段控制 | 精细化控制 |

## 三、数据模型变更

### point-product 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| allowCrossChannel | boolean | false | 是否允许跨渠道兑付 |
| allowGlobalPoints | boolean | true | 是否允许使用全局积分兑换 |

### point-record / point-redemption 无需变更

已有 `channel` 字段，`channel: null` 即为全局积分。

## 四、余额计算

```
用户总余额 = SUM(所有积分记录的 points)
渠道 A 余额 = SUM(channel = A 的积分记录的 points)
全局余额 = SUM(channel = null 的积分记录的 points)
```

getBalance 返回：
```json
{
  "balance": 130,
  "channelBalances": [
    { "channelId": 1, "channelName": "华东大区", "balance": 100 }
  ],
  "globalBalance": 30
}
```

## 五、商品可见性

```
用户可见商品 =
  用户所属渠道的商品（无论 allowCrossChannel 值）
  + 其他渠道中 allowCrossChannel = true 的商品

无渠道用户 = 只看 allowCrossChannel = true 的商品
```

## 六、兑换扣减逻辑

```
兑换商品（属于渠道 C，需要 N 积分）：

扣减顺序（固定，不可调整）：
1. 本渠道积分（商品所属渠道 C）
2. 其他渠道积分（仅 allowCrossChannel=true，用户多选渠道）
3. 全局积分（仅 allowGlobalPoints=true，用户同意）

用户控制：
- 只能选择是否启用某个渠道/全局，不能调整顺序
- selectedChannels: 用户选择的其他渠道 ID 数组
- useGlobalPoints: 是否使用全局积分

组合矩阵：
┌───────────────────┬───────────────────┬──────────────────────────────┐
│ allowCrossChannel │ allowGlobalPoints │ 可用来源                      │
├───────────────────┼───────────────────┼──────────────────────────────┤
│ false             │ false             │ 仅本渠道                      │
│ false             │ true              │ 本渠道 + 全局                  │
│ true              │ false             │ 本渠道 + 其他渠道              │
│ true              │ true              │ 本渠道 + 其他渠道 + 全局        │
└───────────────────┴───────────────────┴──────────────────────────────┘

扣减流程：
1. 扣本渠道积分 → 扣完或余额为0
2. allowCrossChannel=true 且 selectedChannels 非空 → 按用户选择顺序逐渠道扣减
3. allowGlobalPoints=true 且 useGlobalPoints=true → 扣全局积分
4. 仍有剩余 → 兑换失败，返回可用来源提示
```

扣减实现：事务内分别创建渠道扣减记录和全局扣减记录。

## 七、接口变更

| 接口 | 变更 |
|------|------|
| GET /v1/point/products | publicRoute → userRoute；按用户渠道过滤 |
| GET /v1/point/products/:id | publicRoute → userRoute；返回完整字段 |
| POST /v1/my/point/redeem | 新增 useGlobalPoints、selectedChannels 参数 |
| GET /v1/my/point/balance | 返回渠道积分明细 |

## 八、用户渠道归属流程

```
1. 邀请码注册 → 自动归属该渠道
2. 已登录无渠道 → 引导选择自提点 → 自提点关联渠道 → 自动归属
3. 兜底：无渠道用户只能看 allowCrossChannel = true 的商品
```

## 九、allowCrossChannel × allowGlobalPoints 组合

| allowCrossChannel | allowGlobalPoints | 效果 | 风险 |
|---|---|---|---|
| false | true | 仅本渠道可见，可用全局积分补足 | 无 |
| false | false | 仅本渠道可见，仅限渠道积分 | 无 |
| true | true | 跨渠道可见，可用全局积分 | 无 |
| true | false | 跨渠道可见，仅限渠道积分 | 跨渠道用户可能无该渠道积分，前端需提示"仅限渠道积分" |
