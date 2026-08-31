# 分享领分冷却锁定 + 按钮点亮/置灰 设计

日期：2026-08-31
关联：活动分享裂变 / 任务中心「分享活动」/ 活动页分享海报

## 背景

现有 `activity_share` 冷却逻辑存在两个问题：
1. **跨自然日自动解锁**：上次领分在昨天时，今天直接解锁，与「只有距上次成功≥30分钟才可领」冲突。
2. **按钮状态无反馈**：任务中心/活动页的「领取积分」按钮常亮，冷却失败仅 toast，用户无法感知能否领取、何时可领。

## 最终规则（已与需求方确认）

1. **领取门槛（双条件）**：距上次成功领取 ≥ 30 分钟 **且** 本次已累计到好友点击（埋点信号）。跨日**不**自动解锁。
2. **按钮状态**：仅当满足门槛时「领取积分」按钮点亮；领取成功立即置灰，进入下一个 30 分钟冷却。
3. **每日上限**：保留（默认 4 次/日，按自然日重置次数，逻辑不变）。
4. **规则提示**：弹窗与按钮旁展示规则文案；未点亮时给出原因（缺好友点击 / 还差 X 分钟）。

> 说明：每日上限按自然日归零，但冷却**不**随跨日重置。即新的一天可继续领（次数够），但仍需距上次成功满 30 分钟且采集到好友点击。

## 后端改动（zhao-point）

### 1. 冷却判定调整
文件：`server/src/services/point.ts` → `earnPoints` 内 `action === "activity_share"` 分支（现 L246–282）
- 删除「跨自然日自动解锁」判断（`startOfToday` 分支及注释）。
- 改为：存在上次成功记录 `last` 时**始终**校验 —— ① `hasShareVisitSince(userId, lastAt)` 不满足则报「需好友点击」；② `elapsed < interval` 则报「请 X 分钟后重试」。二者与日期无关。

### 2. 新增领取状态查询接口
- 路由：`content-api.ts` 新增 `userRoute("GET", "/my/point/share/status", "point.shareStatus")`（需登录）。
- 控制器 `point.shareStatus`：接收可选 `activityId`，返回 `activity_share` 状态：
  - `canClaim: boolean`
  - `points`（活动类按 `shareRewardPoints`，未配/非活动回退规则默认分）
  - `remainingMs`（距上次成功还需等待毫秒；无可领时若缺好友点击，需单独表达）
  - `needFriendVisit: boolean`
  - `dailyCount`、`dailyLimit`
  - `intervalMinutes`
- 复用 `point` service 内现有逻辑（最近一次成功记录、好友点击、当日次数），避免重复查询。

### 3. 前端并发/幂等不变
- `earnShare` 校验与写分仍维持现有单事务防重（`SELECT FOR UPDATE`）。

## 前端改动（shao）

新增一个共享 `useShareClaim` 组合式函数（`utils/` 或 `composables/`），任务中心与活动页复用，避免重复逻辑。

### useShareClaim 能力
- `state`：`{ canClaim, needFriendVisit, remainingMs, points, dailyCount, dailyLimit }`
- `refresh()`：调用 `GET /my/point/share/status`，未登录时置为可领默认态。
- `countdown`：`canClaim=false && !needFriendVisit` 时，客户端每秒递减剩余时间并同步按钮点亮；到 0 自动 `refresh()`。
- `claim()`：成功后立即置灰并启动 30 分钟计时，toast 显示实际 +积分。

### 入口改造
1. **share-guide 弹窗**（`components/share-guide/share-guide.vue`）
   - 规则描述文案改为动态：`每次分享得 X 积分，每日最多 Y 次，两次间隔 30 分钟，需好友点击`
   - 「我已分享 · 领取积分」按钮按 `canClaim` 点亮/置灰；
   - 置灰时按钮下方展示原因：「缺好友点击，邀请好友点开你的链接」「还差 X 分钟可领取」。
2. **任务中心**（`pages/tasks/tasks.vue`）
   - 「去分享」打开前先 `refresh()`；`isCompleted` 后置灰。
   - 分享任务卡片/入口在不可领时显示置灰态与原因。
3. **活动页**（`pages/activity/detail.vue`）
   - 现有「关闭海报静默领分」（`onSharePosterClosed`）改为**显式**领分按钮（点亮/置灰+原因）。
   - 保留可在分享海报区提供入口；关闭海报仍可触发（若可领），否则提示原因。

## 错误处理
- 未登录：`canClaim=false`，按钮置灰并提示「登录后可领取」。
- 网络/查询失败：回退 `canClaim=true`（允许点按，后端作最终裁决），避免功能不可用。

## 校验口径
- 首次（无记录）：`canClaim=true`，可直接领。
- 领取成功后：按钮立即置灰；30 分钟内点按 → 后端返回「请 X 分钟后重试」。
- 满 30 分钟但无好友点击：置灰提示「缺好友点击」。
- 满 30 分钟且有好友点击：点亮，可领。
- 次日：每日次数重置为 0；冷却仍按上次成功时间判定（不满 30 分钟置灰）。