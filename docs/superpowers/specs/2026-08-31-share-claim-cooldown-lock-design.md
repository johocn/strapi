# 分享领分冷却锁定 + 按钮点亮/置灰 设计

日期：2026-08-31
关联：活动分享裂变 / 任务中心「分享活动」/ 活动页分享海报

## 背景

现有 `activity_share` 冷却逻辑存在两个问题：
1. **跨自然日自动解锁**：上次领分在昨天时，今天直接解锁，与「只有距上次成功≥30分钟才可领」冲突。
2. **按钮状态无反馈**：任务中心/活动页的「领取积分」按钮常亮，冷却失败仅 toast，用户无法感知能否领取、何时可领。

## 最终规则（已与需求方确认）

1. **领取门槛（单条件）**：距上次成功领取 ≥ 30 分钟。**去掉好友点击门槛**。跨日**不**自动解锁。
2. **按钮状态**：仅当满足门槛时「领取积分」按钮点亮；领取成功立即置灰，进入下一个 30 分钟冷却。
3. **每日上限**：保留（默认 4 次/日，按自然日重置次数，逻辑不变）。
4. **规则提示**：弹窗与按钮旁展示规则文案；未点亮时给出原因（还差 X 分钟 / 今日已领满 Y 次）。

> 说明：每日上限按自然日归零，但冷却**不**随跨日重置。即新的一天可继续领（次数够），但仍需距上次成功满 30 分钟。故两个状态需分别用「剩余冷却毫秒」与「今日次数」表达，不能互相替代。

## 后端改动（zhao-point）

### 1. 冷却判定调整
文件：`server/src/services/point.ts` → `earnPoints` 内 `action === "activity_share"` 分支（现 L246–282）
- 删除「跨自然日自动解锁」判断（`startOfToday` 分支及注释）与「好友点击」校验（`hasShareVisitSince`）。
- 改为：存在上次成功记录 `last` 时**始终**校验 `elapsed < interval`，否则报 `请 X 分钟后重试`。与日期无关。

### 2. 新增领取状态查询接口
- 路由：`content-api.ts` 新增 `userRoute("GET", "/my/point/share/status", "point.shareStatus")`（需登录）。
- 控制器 `point.shareStatus`：接收可选 `activityId`，返回 `activity_share` 状态：
  - `canClaim: boolean`
  - `points`（活动类按 `shareRewardPoints`，未配/非活动回退规则默认分）
  - `remainingMs`（距上次成功还需等待毫秒）
  - `dailyCount`、`dailyLimit`
  - `intervalMinutes`
- 逻辑：取最近一次 `action=activity_share` 成功记录与当日次数，计算 `remainingMs` 与 `canClaim`。

### 3. 写分/防重不变
- `earnShare` 校验与写分仍维持现有单事务防重（`SELECT FOR UPDATE`）。

## 前端改动（shao）

新增一个共享 `useShareClaim` 组合式函数（`utils/`），任务中心与活动页复用，避免重复逻辑。

### useShareClaim 能力
- `state`：`{ canClaim, remainingMs, points, dailyCount, dailyLimit, intervalMinutes }`
- `refresh()`：调用 `GET /my/point/share/status`；未登录/失败时回退可领默认态。
- `countdown`：`canClaim=false` 时，若 `remainingMs>0` 客户端每秒递减剩余时间并同步按钮点亮；到 0 自动 `refresh()`。
- `claim()`：成功后立即置灰并启动 30 分钟计时，toast 显示实际 +积分。

### 入口改造
1. **share-guide 弹窗**（`components/share-guide/share-guide.vue`）
   - 规则描述文案动态：`每次分享得 X 积分，每日最多 Y 次，两次间隔 N 分钟`
   - 「我已分享 · 领取积分」按钮按 `canClaim` 点亮/置灰；
   - 置灰时按钮下方展示原因：「还差 X 分钟可领取」「今日已领满 Y 次」。
2. **任务中心**（`pages/tasks/tasks.vue`）
   - 分享任务按钮按 `canClaim` 点亮/置灰；点击置灰按钮 toast 提示原因。
3. **活动页**（`pages/activity/detail.vue`）
   - 新增显式领积分按钮（点亮/置灰+原因）；点击领取成功后立即置灰。

## 错误处理
- 未登录：`canClaim=false`，按钮置灰并提示「登录后可领取」。
- 网络/查询失败：回退 `canClaim=true`（允许点按，后端作最终裁决），避免功能不可用。

## 校验口径
- 首次（无记录）：`canClaim=true`，可直接领。
- 领取成功后：按钮立即置灰；30 分钟内点按 → 后端返回「请 X 分钟后重试」。
- 满 30 分钟：点亮，可领（不受是否跨日影响）。
- 当日已领满 4 次：置灰提示「今日已领满」。
- 次日：每日次数重置为 0；冷却仍按上次成功时间判定（不满 30 分钟置灰）。