# 系列报名费用分档（多维度组合）设计

> 阶段：设计确认 → 实施计划 → 开发验收
> 关联：阶段十四「系列报名规则细分 + 积分计费」（活动 `pointsCost`/`feeCollectAt`/`signup.pointsCharged`）

## 1. 目标

在既有「活动积分计费」之上，引入**多维度费用分档**能力：

- **多维度组合**：时间（早鸟/临期）、限量（名额档）、用户类型（segment S/A/B/C / 合伙人）可组合定价。
- **两套引擎互斥**：每个系列/活动在 `flat`（现有单值计费）| `tier`（档位列表）| `factor`（基础价叠加因子）三档定价模式中**选择其一**，互斥并存，不做同时叠加。

## 2. 数据模型（zhao-point）

### 2.1 `activity`（新增字段）
| 字段 | 类型 | 说明 |
|---|---|---|
| `pricingMode` | enum `flat\|tier\|factor`，默认 `flat` | 本场定价模式 |
| `feeTiers` | json | tier 引擎数据（模式互斥，仅 `tier` 有效） |
| `feeFactors` | json | factor 引擎数据（模式互斥，仅 `factor` 有效） |
| `pointsCost` | int，默认 0 | 保留；仅 `flat` 模式使用 |
| `feeCollectAt` | enum `signup\|checkin`，默认 `signup` | 保留；tier/factor 下统一计费点 |

变更为**增量式**：`pricingMode=flat` 时行为与阶段十四完全一致（零回归）。

### 2.2 `activity-series`
`defaultRules` JSON 扩展加入 `pricingMode/feeTiers/feeFactors`，作为场次排期生成的默认模板；`generateSchedule` 落成场次时继承为显式字段（可单场覆盖）。

### 2.3 `activity-signup`（新增字段）
| 字段 | 类型 | 说明 |
|---|---|---|
| `feeTierId` | string | tier 模式下所报档位 id；tier 限量计数依据 |

## 3. 定价解析 `services/fee-service.ts`（单一职责）

### 3.1 `resolveFee({ activity, profile })` 

`profile` 含 `{ userId, segment, isPartner, now }`（`segment` 取自 `plugin::zhao-sso.sso-user-profile.segment`，`isPartner` 取 referencer-relation 存在性；查不到按 `all`/最低档）。

按 `activity.pricingMode` 分派，返回 `{ mode, cost, feeCollectAt, tierId?, base? }`：

- **flat**：`cost = activity.pointsCost || 0`，`feeCollectAt = activity.feeCollectAt`
- **tier**：`feeTiers` 按 `order` 升序，取**第一个**同时满足：
  - 时间窗：`now ∈ [window.start, window.end]`（`null` 表示无界）
  - 限量：该档剩余名额 > 0（剩余 = `quota - 已用`；`quota` 为空表示不限）
  - 用户类型：`userType === 'all'` 或匹配 `profile.segment` / `isPartner`
  - 命中 → `{ cost: tier.pointsCost, feeCollectAt: tier.feeCollectAt || activity.feeCollectAt, tierId: tier.id }`
  - 无命中 → 回退 `activity.pointsCost`（flat 语义兜底）
- **factor**：`cost = feeFactors.base`，依序叠加适用因子，`cost = max(1, round)`
  - `window_discount`：`now < until` → `cost -= amount`
  - `window_upcharge`：`now >= from` → `cost += amount`
  - `segment_discount_percent`：`profile.segment` 达 `minSegment` → `cost *= (100 - percent)/100`
  - `flat_discount_amount`：常驻 `cost -= amount`（如新客券）

### 3.2 tier 限量持久化（防超卖）

该档已用 = `count(activity_signups where activityId AND feeTierId AND status = 'active')`。报名时事务内原子校验 `已用 < quota` 通过后建 active；`waiting` 不占档率。沿用阶段十四名额并发「事务内原子更新置位」模式，不引入 Redis 锁。

## 4. 流程接入（重构 `activity.ts` 现直读 `pointsCost` 处）

统一以 `resolveFee` 替换 `signup / promoteWaiting / checkin` 内的 `act.pointsCost` 直读：

- **signup**：`const {cost, feeCollectAt} = await resolveFee(...)` → 占位 → (signup 模式 && cost>0) 调 `deductPoints`（失败回滚占位返回 `insufficient_points`）→ 建 active，`pointsCharged=cost`、`feeTierId=tierId`
- **promoteWaiting**：`resolveFee` → 扣费，不足则回滚占位 `continue`（保持 waiting）
- **checkin**：`resolveFee().feeCollectAt === 'checkin' && cost > 0` 时扣费，不足返回 `insufficient_points`
- **cancel**：退 `signup.pointsCharged`（不重解析费用）

渠道处理沿用 `resolveUserChannelId`，扣费/占位强一致与幂等约定与阶段十四一致。

## 5. 接口

新增公开路由（**注册在 `/activities/:documentId` 之前**，避免被动态段吞路由）：

- `GET /zhao-point/v1/activities/:documentId/fee`：按当前用户 `profile` 返回 `{ mode, cost, feeCollectAt, tier?/factors? }` 定价预览

无其它新路由；管理端暂无需新增（费用结构随活动表单存）。

## 6. 前端

- **web 管理端**：活动表单 `pricingMode` 选择器，按模式切换编辑器——
  - `flat`：`pointsCost` 数字输入（现状）
  - `tier`：档列表编辑（名称/order/时间窗起止/名额/用户类型/价格/计费点）
  - `factor`：`base` 数字 + 因子行编辑（类型｜参数）
  - series 表单 `defaultRules` 同构
- **shao C端**：活动详情展示「现价 N 积分 + 档位/因子说明」（消费 fee 预览接口）

## 7. 验收 `scripts/accept-fee-tiers.cjs`

- flat 零回归（免费/计费/转账/退款与阶段十四一致）
- tier：时间窗切换价格；限量满档 → 自动降档到下一个适用档（无则回退 flat 兜底），且满档档位不售；用户类型档优先命中
- 余额不足时报名被拒（`insufficient_points`），与其档位或满档无关
- factor：各因子叠加运算正确、下限 1
- 幂等：重复报名/签到/取消
- 退款凭 `pointsCharged`
- 清理零残留（活动/系列/报名/扣退费记录/测试用户）

## 8. YAGNI（本期不做）

在线支付、多币种、档位调价审批流、因子作用于真实支付、tier 与 factor 同场同时叠加。