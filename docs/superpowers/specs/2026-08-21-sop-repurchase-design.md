# SOP 复购触达 + 转化归因设计

> 阶段：自动化进阶 · SOP 触达/复购场景（在触达频控与效果报表之上增量补齐）

## 1. 背景与目标

SOP 引擎已具备事件触发（`sso-sop.trigger`）、定时调度、规则 CRUD、触达频控与按场景聚合的触达漏斗报表；活动后运营三合一（`closeActivity`）已埋了 `act_receipt` / `act_repurchase` / `act_revisit` 的触发 job。但存在两个缺口：

1. **触达链路未打通**：bootstrap 只 seed 了 `sop-rule`，**未 seed 消息模板**（`act_*` 模板不存在）→ `closeActivity` 建的复购/回执/挽回 job 因模板缺失被吞，实际一条都发不出。
2. **无转化归因**：运营看不到「复购触达 → 用户真的再次报名」的效果，SOP 报表 spec 已明确转化归因延后到单独一期。本轮补齐。

## 2. 本轮范围

- **打通复购/回执/挽回触达发送链路**：bootstrap seed 消息模板（含 link 指向既有落地页），让 `activity.*` SOP 触达真实可发送。
- **复购转化归因报表**：纯查询（不落库），按「触达后固定窗口（默认 7 天）内该用户是否再报名」判定转化，输出复购触达漏斗 + 转化率。
- 落地承接**复用既有分享/活动落地页**（`pages/activity/list`、`pages/activity/series`），不做新落地页。

**不在本轮**：其他场景（课程 d7）转化、触达 A/B 实验、复杂归因模型（多触点/时间衰减）。

## 3. SOP 触达消息模板 seed（打通发送链路）

### 需要 seed 的模板（msg-template，幂等按 code）
| code | name | link（跳转既有落地页） |
|---|---|---|
| `act_confirm` | 活动报名成功确认 | `/pages/activity/detail`（业务 payload 覆盖） |
| `act_before` | 活动开始前提醒 | `/pages/activity/detail` |
| `act_receipt` | 活动结束回执（感谢+评价邀请） | `/pages/activity/detail` |
| `act_repurchase` | 复购/转介邀请 | `/pages/activity/list`（活动列表） |
| `act_noshow_revisit` | 未到场挽回 | `/pages/activity/list` |

- provider=`wechat`，isEnabled=true，content 用多语言占位文案（可后台改）。
- 版本：每个模板 seed 一个 `active` 版本（code=`{tplCode}_v1`，sentCount=0），供 `sso-msg` 发送取用。
- link 默认指向既有落地页，业务 payload 传入时按 `renderLink` 占位替换覆盖。

### seed 位置
在 [bootstrap.ts](file:///e:/code/basic/plugins/zhao-sso/server/src/bootstrap.ts) 的 SOP 规则 seed 块**之前**幂等 seed 模板+版本。bootstrap 现在因 `SSO_DEFAULT_APP_SECRET` 未配置而提前 return——需把模板/规则 seed 移到 return 之前独立执行（不只依赖密钥存在）。

## 4. 复购转化归因报表

### 判定模型（已确认：纯查询不落库，触达后固定窗口）

一次「复购触达 job」（scene=`activity.repurchase`）对该用户的转化判定：

- 该 job `status='sent'`（已送达）；
- 记 `touchAt = job.sent_at`；
- 以 sso-user 为桥梁：`sso-profile.resolveUpUserForSsoUser(job.user)` → upUser；
- 该 upUser 在 `(touchAt, touchAt + window]` 内新增 `activity-signup`（`status='active'`）**任一** → 记为转化。窗口 `window` 默认 7 天（rule[].conversionWindowDays ?? 7）。

### 归因目标
只把 `activity.repurchase`（复购触达）作为转化源；`act_receipt`/`act_revisit` 不参与转化计数。

### 数据源
- `sso_msg_jobs`（scene=activity.repurchase, status=sent, sent_at ∈ [from,to]）
- `bootstrap seed 的 `activity-sop-rule`（携 conversionWindowDays 配置，按 scene=activity.repurchase 取）
- `sso-sop.resolveSsoUserForUpUser` / `sso-profile.resolveUpUserForSsoUser` 双向桥接
- `activity-signup`（up_user 视角查再报名转正项）

### 接口（zhao-sso 新增）

`GET /api/zhao-sso/v1/admin/msg/repurchase-stats?from=&to=`（scope `sso.msg.read`）

Response `200`：
```json
{
  "from": "…", "to": "…",
  "windowDays": 7,
  "summary": {
    "sent": 120,           // 区间内送达的复购触达 job 数
    "convertedUsers": 18,  // 至少再报名一次的独立 upUser 数
    "conversions": 21,     // 转正再报名条数（1 用户可多次）
    "conversionRate": 15   // round(convertedUsers / sent * 100)
  }
}
```
配置项 `conversionWindowDays` 存于 `sop-rule`（scope rule，scene=activity.repurchase，可空默认 7），避免单独建配置表。

实现要点：一次查询先取送达复购 job 列表（分页/游标防爆），并行 `resolveUpUserForSsoUser` + 窗口内 signup count。为控制复杂度，sent 量用单查询，再按 upUser 聚合去重。

## 5. 统计口径与边界

- `sent` = `sso_msg_jobs`（scene=activity.repurchase, status=sent, sent_at∈[from,to]）
- 同一 upUser 收到多条复购触达：converted 去重；conversions 按 signup 条数计（触达窗口重叠的去重，避免同一报名被多触达重复计——取该用户最靠近报名的一次 sent 触达归因）
- `from>to` 返回 400
- 无数据时返回 `{summary: 全 0/0%}`，不报错

## 6. 前端

web 运营端新增页 `src/pages/msg/repurchase.vue`：日期范围筛选 + 汇总卡片（送达/转化用户/转 化条数/转化率）+ 说明“默认 7 天转化窗口”。复用 `sopStats.vue` 的 API/token 约定与卡片/表格样式。

## 7. 风险与约束

- **模板缺失是当前触达发不出的根因**——seed 后需重启 dev 生效，验收用 `GET /msg-templates` 确认 5 个模板 + active 版本存在。
- 转化判定强依赖 sso 绑定桥接：upUser 查不到 ssoUser（或反之）自动跳过，验收预插 sso users 数据。
- 纯查询性能：送达 job 量大时逐 user 查 signup 有 N+1 风险，先用游标分批 + 窗口内批量 count 缓解，不引入缓存/落库。
- 不新增 dependencies；全部复用现有 zhao-sso/zhao-point/strapi 能力。