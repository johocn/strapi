# 活动分享裂变归因 + 报名奖励 + 运营裂变榜 设计文档

> 日期：2026-08-21
> 状态：已确认方案（用户决策）
> 前置：`2026-08-21-activity-share-poster-design.md` 已完成海报生成 + 二维码含 `inviteCode` 的前端能力；本设计在其上补齐「归因→奖励→看板」裂变闭环。

## 目标

补齐活动分享裂变的最后一环：A 用自己的邀请码分享活动详情页/海报 → B 扫码打开并**新报名该活动** → 系统给 A 发放**分享奖励积分**；全部发放落一张记录表做幂等防刷，运营端提供「裂变榜」统计。

奖励值**活动可配**（`shareRewardPoints`），未配置回退全局默认值。

范围：zhao-point 活动体系 + web 管理端裂变榜；shao C端海报与邀请码链路已具备，仅需确认真实用户分享给固定邀请码（现有逻辑已是，无改动）。

## 架构

```
C端 shao detail.vue（已有）
  └─ 海报/分享 URL 含 ?inviteCode=A的固定码  ← 已有，无需改
        │  B 扫码打开 → 登录后 inviteCode 落 sso_users.invite_code_used / sso_invite_usage
        ▼
后端 activity.ts signup（本次改）
  └─ signup 成功创建 active 报名后触发 shareReward():
       inviteeId = B(upUser)
       inviteCode = B 用过的码 → creator = 分享者 sso_user A（跳过虚拟用户）
       A_up = resolveUpUserForSsoUser(A)；取不到则跳过
       points = activity.shareRewardPoints ?? 全局默认；<=0 跳过
       (B, activity) 唯一去重，已发过跳过
       earnPoints(A_up, action=activity_share_reward, 挂 A 渠道)
       插入 activity-referral-reward
        ▼
web 管理端「裂变榜」（本次改）
  └─ 按 inviter 聚合记录：带来报名数 / 发放积分数 / 来源活动，可筛时间
```

## 数据模型

- Modify `activity`：加 `shareRewardPoints`（int，可空）。默认不设值时回退全局默认。
- Modify 系列 `defaultRules`（`series-service` generateSchedule 落成字段 + duplicate 复制）：加 `shareRewardPoints`，单场可覆盖。
- Create `activity-referral-reward`（裂变奖励记录，collectionType）：
  - `inviter`：relation manyToOne → upUser（分享者，课程侧用户）
  - `invitee`：relation manyToOne → upUser（被邀者，课程侧用户）
  - `activity`：relation manyToOne → activity
  - `points`：integer（发放积分）
  - `sourceInviteCode`：string（发起奖励的邀请码）
  - `issuedAt`：datetime
  - 唯一性：`(invitee, activity)` 唯一（应用层幂等 + 必要时 DB 唯一索引）
- 全局默认：活动系统插件 config 存 `defaultShareRewardPoints`（默认 0），`.env`/默认值回退。

## 后端逻辑（activity.ts 新增 shareReward 方法）

signup 成功创建 active 报名（feeTierId/pointsCharged 落账完成）后、返回成功前调用：

1. `reward = activity.shareRewardPoints ?? defaultShareRewardPoints`；`reward <= 0` 或 `activity.id` 缺失 → 跳过
2. 取被邀者 B 使用的邀请码：查 `sso_users`（upUser B → `resolveSsoUserForUpUser`）的 `invite_code_used`；无码 → 跳过
3. 由码找 `sso-invite-code` 的 `creator`（= 分享者 sso_user A）；记录为空或 A 为 `status=virtual` → 跳过（虚拟分享者无发放对象）
4. `resolveUpUserForSsoUser(A.id)` 得 A 的 upUser id；为 null → 跳过
5. 幂等：`activity-referral-reward` 已存在 `(invitee=B, activity)` 记录 → 跳过
6. `resolveUserChannelId(A_up)` 解析 A 渠道；`earnPoints({ userId: A_up, action: "activity_share_reward", source: "activity", method: "activity_share_reward", remark: 活动名, userChannelId })`
7. 事务内插入 `activity-referral-reward`（先查重，再插，避免并发重复）

- **触发范围**：仅新 active 报名；候补转正、已报名重复不触发；免费/收费活动只要配了 reward 都触发。
- **错误处理**：整个 shareReward 包 try/catch，失败仅日志，**绝不阻断报名主流程**。

## 接口

- Modify `content-api`（或新增 admin）：活动详情无需改（reward 不是 C端必要字段，可暂不返回；若需 C端展示"分享可得X积分"再在 detail 附带）。
- Create admin 聚合接口：裂变榜，按 inviter 聚合 `activity-referral-reward`，支持时间筛选；返回每分享者 `{ upUser, inviteeCount, totalPoints, 明细[活动/时间] }`。

## 前端（web 管理端）

- Create 页面「裂变榜」：表格按分享者聚合（带来报名数 / 发放积分 / 来源活动），时间范围筛选；入口挂在活动管理菜单。
- activity/series 表单是否加 `shareRewardPoints` 输入：建议加（活动可配置本次决策点），series form 进 defaultRules 编辑块。

## 测试 / 验收

- `scripts/accept-share-fission.cjs`（新增）：
  1. 免费活动配 reward=30：B 用 A 邀请码注册并报名 → 断言 A 收到 `activity_share_reward` +30、奖励记录入表
  2. 幂等：同一 B 再次对同活动报名 → 不重复发
  3. 虚拟分享者被跳过、无 inviteCode 被跳过
  4. reward<=0、未配(回退全局默认) 分支
  5. 候补转正不触发新奖励
  6. 裂变榜聚合正确（多活动/多分享者）
  7. 清理零残留
- 复用 `accept-fee-tiers.cjs` / `accept-series-rules.cjs` 的 PG 连接/登录/直插用户/积分核验写法（含渠道解析与 `_user_lnk` 关联）。

## 非目标（YAGNI）

- 不做分享点击/曝光埋点（不记"看了但没报名"）
- 不做多级分销佣金结算（当前仅一级 reward）
- 不做奖励批量重算/回补、不做裂变素材/模板配置化