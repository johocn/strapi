# 活动分享转发任务 + 分享引导示意图 设计文档

> 日期：2026-08-30
> 状态：已确认方案（用户决策）
> 前置：`2026-08-21-activity-share-fission-design.md` 已完成裂变归因→报名奖励→运营裂变榜闭环；本设计在其上补「转发任务 + 引导示意图」，与裂变奖励职责分离但共用活动分享入口。

## 目标

在任务中心新增「分享活动」任务：用户每次分享得 5 积分、可配冷却间隔与每日上限、点击即领；同时提供微信好友/朋友圈分享操作示意图引导客户上手分享。

与**邀请裂变奖励**明确区隔（两种独立积分）：
- `activity_share`：**转发即得**，5 分/次，可配 30 分钟间隔 + 每日最多 4 次。靠冷却+上限防刷。
- `activity_share_reward`：**好友经邀请码报名成功**才给邀请人发，动态配置。已上线，本设计不改。

## 架构

```
C端 任务中心 tasks.vue                          C端 活动详情 detail.vue
  └─ social 分组「分享活动」卡片                    └─ 「分享海报」入口（已有 share-poster）
      │ 去完成 → 分享引导弹窗（示意图）                     │ 生成海报时同步触发
      │    → 「我已分享」手动领积分                           ▼
      ▼                                                        │
   POST /zhao-point/v1/my/point/earn/custom (action=activity_share)  ─┤ 同一后端校验
      │                        │                               │
      ▼                        ▼                               ▼
后端 earnCustomPoints：每次分享后重置冷却 + 每日上限 + 一次性 统一校验       同 action，共享剩余次数与冷却
      ▼
积分记录 +5（remark=分享活动）
```

快速失败策略：`activity_share` 的冷却与上限完全在后端 `earnPoints` 校验，两入口（任务中心 / 活动海报）走同一个 `activity_share` action，因此**共享剩余次数与冷却**，杜绝双入口绕限。

## 后端逻辑

### 1. 积分规则配置（config/index.ts + bootstrap 同步）

在 rule 表新增 action：

```text
activity_share: {
  points: 5,           // 每次积分（运营端可改）
  limitPerDay: 4,      // 每日上限（运营端可改）
  isOneTime: false,
  description: "分享活动",
  taskGroup: "social",
  extraConfig: { intervalMinutes: 30 },  // 冷却间隔（分钟）
}
```

- `bootstrap.ts` 已会把规则同步为 `point-rule` 记录，运营端可在积分规则页编辑积分值 / 每日上限；`intervalMinutes` 存于 `extraConfig`。
- 快速失败：若该 action 在线上已被创建（旧数据），同步逻辑需 upsert 不重复。

### 2. earnPoints / earnCustomPoints 增加冷却校验

当 `rule.extraConfig?.intervalMinutes > 0` 时：

1. 查该用户最近一条同 action、`type=increase` 且**成功**的积分记录（`createdAt` 倒序取 1）。
2. 若上一条 `createdAt` 距今 < intervalMinutes 分钟，抛错 `POINT_020`「请 30 分钟后再试」，不落账。
3. 与现有 `limitPerDay`（countTodayAction）、`isOneTime`（checkOneTimeClaimed）叠加生效。

冷却基准（用户指定）：**每次分享成功后，冷却计时立即重置**——以最后一次成功分享时间为基准，距该时间 `< intervalMinutes` 分钟内不可再分享。因此"连点"会被间隔拦截，而分摊/规律分享不受限。

### 3. 接口

新增 C 端用户侧领取路由（现有 `POST /v1/admin/point/earn` 是管理员权限，C 端不可用；`earnPoints`/`earnCustomPoints` 服务已存在，仅需复用）：

- `POST /v1/my/point/earn/custom`（userRoute，is-authenticated），controller `point.earnCustom`：
  - `earnCustomPoints({ userId, action, source, remark, channelId/userChannelId })`，调用方（C 端）传 `action="activity_share"`。积分从 `point-rule` 规则取（`rule.points`），不信任客户端传的 points。
  - 返回积分记录；冷却/上限/一次性错误以对应 `POINT_xxx` 抛出。
- **安全**：仅允许领取 `taskGroup=social` 且注册为"可自主领取"的 action（白名单校验，防客户端传入任意 action 刷分）。`activity_share` 加入白名单；`activity_share_reward`（裂变）**不在**白名单（由报名事件触发，不可手动领）。

### 4. 错误码

新增 `POINT_020 请XXX分钟后再试`（冷却中）；复用 `POINT_004 已达每日上限`。`point.earn` 与新增 `point.earnCustom` 的 catch 映射 `POINT_020`→400。

## C 端 shao

### 任务中心 tasks.vue（social 分组）

- `social` 分组自动展示「分享活动」卡片（后端 getTasks 已按规则聚合），显示今日 `今日 2/4`。
- 点「去完成」→ 弹出**分享引导弹窗**：
  - 标题「分享活动得积分」、说明「每分享 1 次得 5 积分，每日最多 4 次，两次间隔 30 分钟」。
  - 两个分享通道卡片：
    - 「分享给好友」：示意 点右上角 ⋮ → 分享给朋友
    - 「分享到朋友圈」：示意 点右上角 ⋮ → 分享到朋友圈
  - 底部按钮「我已分享 · 领 5 积分」→ 调领积分接口；成功后关弹窗、刷新任务计数、飘积分特效；若冷却中弹提示「请 30 分钟后再试」；若达上限提示。
- 单独抽一个 `share-guide` 示意组件，任务中心弹窗与活动页复用。

### 活动详情 detail.vue（分享海报入口）

- 点「分享海报」→ 生成海报后（或关闭海报弹窗时）同步触发一次 `POST /v1/my/point/earn/custom`（action=activity_share）领分（即得 5 分）。
- 与任务中心共用同一动作，因此共享剩余次数与 30 分钟冷却；冷却中静默或轻提示（不阻断海报查看）。

### C 端 API（services/api.ts）

新增 `claimActivityShare()` → `POST /zhao-point/v1/my/point/earn/custom`，body `{ action: "activity_share", source: "activity" }`，返回积分记录；任务中心与活动页共用此方法。

### 分享操作示意图（微信好友 / 朋友圈）

新增内联引导：两张卡片，各配简图：
- 微信好友：手机顶部省略号图标 → 文案标注"分享给好友"
- 朋友圈：手机顶部省略号图标 → 文案标注"分享到朋友圈"

纯示意（HTML/CSS 绘制，不需图片资源），放在 share-guide 组件内。

## 运营端 web（可选）

积分规则页已可编辑 `activity_share` 的积分值 / 每日上限。若需可视化编辑冷却分钟，则在规则表单 `extraConfig` 中加「分享间隔（分钟）」输入并入库；否则使用默认 30。**本次默认不做表单扩展，用默认值即可**（YAGNI），如需再补。

## 测试 / 验收

1. 首次分享 → +5 到账，任务 1/4。
2. 立即再次分享 → 提示"请 30 分钟后再试"，不落账。
3. 修改被测规则冷却为 0（临时）或等待冷却 → 再次分享成功 +5，到 2/4。
4. 当日第 5 次 → 提示"已达每日上限"。
5. 任务中心 + 活动海报两入口共用该 action，验证共享剩余次数与冷却（活动页分享后，任务中心再点会提示等待；次数共享）。
6. 跨天：新一天每日上限重置，但冷却计时以最后一次成功分享为准（如 23:50 分享后，00:00 后仍需等到次日 00:20 才可再分享）。
7. 清理零残留（测试完成后删测试积分记录与规则复原）。

## 非目标（YAGNI）

- 不真正监听微信分享是否成功（H5 无法可靠拿到分享回调），采用"手动点击已分享"模式。
- 不做分享曝光/点击埋点。
- 不做运营端冷却字段的可视化表单（用默认 30，需可配时再补）。
- 不修改现有 `activity_share_reward` 裂变奖励逻辑。