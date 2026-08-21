# 活动名额候补 · 设计文档

- 日期：2026-08-21
- 负责人/参与者：TRAE (assistant) sync 用户
- 关联：线上线下活动闭环 → 活动运营 → **名额候补**（本阶段最小闭环）
- 仓库：basic（后端）· shao（C端）· web（管理端）

## 1. 背景与目标

线下活动在名额满后，C 端用户无法报名，体验与转化双重流失。本轮引入**名额候补**：

- 名额满时允许用户进入候补队列（不足为报不上）。
- 有人取消释放名额后，自动按候补顺序递补转正，并**即时**通知转正用户。
- C 端能看到自己的候补位置；管理端能查看/移出候补名单。

**核心指标**：满员活动不再「一刀切拒绝」，释放名额即时触达候补用户，降低转化流失、提升到场填位率。

## 2. 约束

- 复用现有架构：活动域在 `plugin::zhao-point`，消息触达走 `plugin::zhao-sso`（sso-msg / sso-sop / resolveSsoUserForUpUser）。
- 尽量不引入新表、不新增依赖（服务器 2G 内存安装依赖易 OOM）。
- 幂等：候选报名、递补、通知均需幂等；重放不产生重复名额/重复通知。
- 严格遵循 Strapi 相关 schema/命名/安全规范。

## 3. 数据模型

`plugin::zhao-point.activity-signup`（[schema](file:///e:/code/basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json)）：

- `status` 枚举由 `["active","cancelled"]` 扩为 `["active","cancelled","waiting"]`。
- 语义：
  - `active`：已报名（占用名额，计入 `used_capacity`）。
  - `waiting`：候补排队（**不**占用名额，不计入 `used_capacity`）。
  - `cancelled`：已取消（无论原为 active 或 waiting）。

**注意**：改 content-type 枚举后，需在插件目录 `npm run build` 重编译 dist，且 `strapi develop` 构建时会重新生成 `types/generated/contentTypes.d.ts`（schema 为主，生成类型为次）。

## 4. 后端服务逻辑（`plugin::zhao-point/service/activity`）

### 4.1 `signup({userId, activityId})`

1. 校验活动存在、`status === "signup_open"`、报名窗口（signupStart/signupEnd）内（沿用现有）。
2. **去重**：`findOne` 扩展为 `status: {$in: ["active","waiting"]}`，命中即返回 `already_signed_up`（禁止同一用户既报名又排队）。若已 `cancelled` 则允许重报（重新占位/排队）。
3. 名额判断：
   - `used_capacity < capacity` → 走现有原子 `increment used_capacity`，建 `active` signup（同现逻辑，含积分/课程授权/SOP 埋点）。
   - 否则（满员）→ 建 `waiting` signup，`waitlistedUntil` 不设（无需）。返回 `{ ok:true, waitlisted:true, position }`。
4. `position`：该活动按 `signupAt` 升序第 N 个 `waiting`。在「满→候补」创建时原子计数（见 5 竞态）。

### 4.2 `cancel({userId, activityId})`

- 按 `status` 分支：
  - `waiting`：仅置 `status=cancelled`，**不**递减 used_capacity、**不**触发递补。
  - `active`：置 `status=cancelled` 并 `decrement used_capacity`（沿用现有），随后调用 `promoteWaiting(activityId)`（递补该活动被释放的一席）。

### 4.3 新增 `promoteWaiting(activityId)`

- 事务内：选取该活动**最旧**（signupAt 升序）的一个 `waiting` signup → 置 `active`、`signupAt` 更新为当前时间（或保留原候补时间、新增 promoted 标记可选）、`increment used_capacity`。
- 若有转正发生：
  - 调用 `sso-sop.resolveSsoUserForUpUser(upUserId)`；匹配不到则跳过（左侧触达，记日志，不阻断）。
  - `sso-msg.sendNow({ scene:"activity.promoted", templateCode:"act_promoted", user: ssoId, params: { 活动名/开始时间 }, link: 活动详情, dedupeKey:"activity:promote:{upUserId}:{activityDocId}" })` 幂等。
- 只在「释放名额恰好一个」场景由 cancel 触发；释放席数=1，故每次 cancel(active) 至多转正一人，满足「释放一席只转正一人」。

### 4.4 消息模板 seed

- 在 zhao-sso 的模板 seed（参考现有 `act_confirm/act_before/...`）新增 `act_promoted`（场景 `activity.promoted`），bootstrap 幂等创建，本地验收走 `MSG_WECHAT_PROVIDER=mock`。
- 模板参数：活动名、开始时间、活动详情 link。

## 5. 并发/竞态与一致性

- **递补原子性**：cancel(active) 的「递减 + 递补 + 选人」放入同一数据库事务；选人用「取最旧 waiting」+ 对释放的那一席位计数。避免并发 cancel 时重复递补。
- **能力释放**：`decrement used_capacity` 由现有三次 cancel(active) 各自独立完成，释放席位天然逐份归还；`promoteWaiting` 每次只吃一份。
- **幂等键**：通知 `dedupeKey` 保证重试/重放不重复发送。
- **去重**：signup 的 active/waiting 联合去重，防止恶意重复排队。

## 6. 前端

### 6.1 shao（C端）

- 活动详情报名按钮态：
  - 未报名 & 有名额 → 「报名」
  - 未报名 & 满员 → 「候补」（点击进入候补）
  - 已在候补 → 显示「候补中 #n」；由「我的活动」刷新确认后续状态
- 我的活动列表区分「候补中」与「待签到来场 / 已报名」两态。
- 接口封装在 `services/api.ts`（沿用现有 activity 相关 API）。

### 6.2 web（管理端）

- 活动详情新增「候补名单」区块：候补人数、名单（用户/候补时间升序）、支持逐个取消（仅移出名单，不发放名额）。
- 沿用现有 activity admin API 与前端封装。

## 7. 测试与验收

验收脚本 `scripts/accept-waitlist.cjs`（可复用，参考 accept-activity.cjs 风格）：

1. 满员活动：报名成功（active）→ 再报一人到号（waiting，position 正确）。
2. 既有 active cancel 释放 → 最旧 waiting 自动转正为 active，used_capacity 恢复一致。
3. 转正触发 `act_promoted` 通知（mock sendNow 记录断言，dedupeKey 幂等）。
4. waiting cancel：仅变 cancelled，used_capacity 不变。
5. 同一用户 active+waiting 重复报名被拒（already_signed_up）。
6. 通知匹配不到 sso 时降级不报错。
7. 清理：删除造的活动/signup，零残留。

## 8. 风险点与缓解

| 风险 | 缓解 |
| --- | --- |
| 改枚举导致 dist/types 未重编译 | 插件目录 `npm run build` + develop 构建重新生成 contentTypes.d.ts；用 grep dist 验证字符串 |
| 并发 cancel → 重复/过量递补 | 事务 + 每释放一席只转正一人 |
| 通知匹配不到 sso 用户 | resolveSsoUserForUpUser 返回 null → 跳过 + 记日志，不断链 |
| 候选名额 `used_capacity` 与 active 数漂移 | 递补 increment 与 cancel decrement 同事务；accept 脚本断言一致性 |
| 前端把候补当 active 展示到签到页 | 签到仍只认 active（原逻辑排除 waiting）、前端按钮态区分 |

## 9. 不做（YAGNI）

- 不引入独立候补表（复用 signup.status）。
- 本轮不引入候补上限配置、候补超时自动移除、分享裂变、活动系列（后续方向另行排期）。

## 10. 收口

阶段收官固定三步：验收 PASS → git status 清理临时脚本 + `git restore dist/` 还原构建 churn → 三仓库 origin/main 无未推送提交后再更新记忆。