# 线下活动奖励权益 v2：递进式领取 + 关注公众号条件 + 问卷表单

## 背景与目标

v1（2026-08-23 spec）中奖励解锁采用「权益各自 condition + 信息解锁通道(infoChannels)多选、任一命中即解锁」的平铺模型。运营复盘发现该模型存在以下问题：

1. 「信息解锁通道」多选与「命中其一即可解锁」语义冗余——多选无意义；
2. 缺少「关注公众号」这一高价值解锁条件；
3. 客户领取权益时「分叉选择条件」体验割裂，缺少引导客户持续留资/达成的递进路径；
4. 活动编辑页功能膨胀，维护成本高。

本 spec 按**重大决策**重构为「递进式领取」模型。

## 重大决策（以本 spec 为准，覆盖 v1 语义）

- **解锁通道单选**：`channel` 四选一（留电话/答问卷/微信授权/关注公众号），是「开启权益选项」的必需门槛——客户必须先完成它，才能进入权益领取区。
- **权益各自独立 condition**：在通道门槛之上叠加，用于引导客户留下更多信息/达成更高条件。
- **递进式领取，不再分叉**：报名 → 完成通道 → 解锁权益区 → 已满足各自条件的权益可领取；未满足条件的权益展示「去达成」引导（去关注/授权/填电话/补问卷），达成后回来即可领。客户按**选择方式**（全选/任选N/单选）自由勾选领取。
- 与 v1「客户可选择留联系方式或答问卷领权益」的分叉语义**冲突，以本 spec 为准**。

## 数据结构变更

### activity.rewardConfig（重构 JSON）

```json
{
  "loginEnabled": true,
  "channel": { "type": "contact|survey|wechat_auth|subscribe", "label": "留联系方式" },
  "selectMode": "all | one | any",
  "selectN": 2,
  "rewards": [
    { "id": "r1", "type": "points", "name": "报名积分", "amount": 50, "mode": "single", "condition": "none" }
  ]
}
```

- `condition` 扩为五值：`none | wechat_auth | subscribe | contact | survey`
- 兼容迁移：旧 `infoChannels` 数组 → 取第一个映射为 `channel`（`contact`/`survey` 直接对应；`wechat_auth`/`subscribe` 无则默认 `contact`）；多选语义废弃。

### activity.questionnaire（新活动级 JSON 字段，与 formConfig 平级）

```json
{
  "enabled": true,
  "title": "调查问卷",
  "fields": [ { "key": "q1", "label": "满意度", "type": "radio", "options": ["满意","一般","不满意"], "required": false } ]
}
```

- 报名表单下方独立配置区；`fields` 复用 formConfig 字段编辑器同款机制（text/phone/textarea/radio/select/multi/number）。
- 默认预置「调查问卷模板」（满意度/收获/改进建议等，见 web 端模板常量）。
- `survey` 条件可用性 = `enabled && fields.length > 0`。
- 报名时**选填**；领取时未达成 `survey` 条件可**补填**。

### activity-signup（报名记录扩展）

- 新增 `questionnaireData` JSON 字段：问卷答案 `{ key: value }`。
- `unlockInfo` 扩展：

```json
{
  "loginAuth": true,
  "subscribed": true,
  "channelDone": true,
  "conditions": { "contact": true, "survey": false },
  "chosenRewards": ["r1", "r3"]
}
```

## 后端判定逻辑（zhao-point activity.ts）

### 数据可得性（管理端条件可用性）

| condition | 可用条件 |
|---|---|
| wechat_auth | 始终可用 |
| subscribe | 始终可用 |
| contact | 报名表单 formConfig 存在 `type=phone && required=true` 字段 |
| survey | questionnaire.enabled && questionnaire.fields.length > 0 |

### 通道门槛 + 权益判定（signup 时）

```
channelDone = (channel.type == contact  ? conditions.contact
             : channel.type == survey   ? conditions.survey
             : channel.type == wechat_auth ? loginAuth
             : channel.type == subscribe ? subscribed)
```
- `loginAuth`：复用现有 `hasWechatAuth(strapi, userId)`（sso 绑定/授权态）。
- `subscribed`：查 `sso-third-party-binding`（provider=wechat, user=upUserId）`subscribe` 字段；判定前调用 zhao-sso `refreshSubscribe` 刷新（非关键路径失败静默，mock 环境返回 1）。无绑定返回 false。
- `conditions.contact`：`collectFormData` 后表单含非空电话（phone 字段）。
- `conditions.survey`：`questionnaireData` 至少一个字段有值。

**权益可领 = channelDone AND 满足该权益 condition**（none=过通道即领；wechat_auth=loginAuth；subscribe=subscribed；contact=conditions.contact；survey=conditions.survey）。

### selectMode 约束（对 mode=multi 的权益）

- `all`：全部已解锁 multi 自动勾选；
- `one`：最多选 1 个（后端校验 `chosenRewards ∩ multiIds` 数量 ≤ 1）；
- `any`：最多选 `selectN` 个（后端校验 ≤ selectN，默认 1）。

签名 `signupActivity(activityId, formData, questionnaireData, chosenRewards)` 入参扩展 `questionnaireData`；奖励发放仍逐项幂等（`act:{docId}:{uid}:{rewardId}`）。

### 补填问卷接口（新增）

`PUT /api/zhao-point/v1/activity/signup/:signupId/questionnaire`，body `{ answers }`：
1. 更新 `activity_signup.questionnaireData`；
2. 重算 unlockInfo（重读表单/问卷/关注状态）；
3. 若本次新增解锁了 multi 权益，返回新增解锁列表供 C 端二次领取（调用现有发放逻辑，幂等）；
4. 返回 `{ ok, unlockInfo, newlyUnlocked: [...] }`。

## C 端流程（shao pages/activity/detail.vue）

1. 报名表单渲染（含下方问卷区，选填，复用字段渲染）；
2. 提交报名 → 完成通道引导（未完成通道则引导对应动作：留电话/填问卷/授权/关注）；
3. 权益区：展示已解锁（channelDone+condition 满足）可勾选；未解锁展示「去达成」引导（关注公众号跳关注页、授权、补填问卷）；
4. 按 selectMode 约束勾选 multi 权益（one 单选、any 限 N 个、all 全选）；
5. 确认报名 → 报名后若存在未达成的 survey 权益，可补填问卷解锁二次领取。

## web 管理端（拆组件）

form.vue 拆分两个独立组件（挂载于活动编辑页）：

- `components/activity-reward-config.vue`：启用开关、通道单选（radio 四选一）、权益选择方式（selectMode 下拉 + selectN 输入）、权益列表编辑器（类型/名称/发放方式/附加条件/参数/增删排序）。
  - 条件下拉可用性按「数据可得性」禁用：`contact` 需表单电话必输、`survey` 需问卷开启且有题，并提示原因。
- `components/activity-questionnaire.vue`：启用开关、标题、字段编辑器（复用现有字段编辑 UI/模板导入）、默认「调查问卷模板」按钮。

form.vue 保留基础信息、报名表单、费用、渠道/角色、奖励开关与两个组件挂载。

## 验收要点

验收脚本 `scripts/accept-activity-reward-v2.cjs` 端到端覆盖：
- 通道四类各自作为门槛（contact/survey/wechat_auth/subscribe），未过通道权益区不可领；
- 权益五条件独立判定（含 subscribe，mock 视为已关注）；
- selectMode 三态（all 全领/one 超选拒绝/any 限 N）；
- 补填问卷 → 解锁 survey 权益 → 二次领取幂等；
- 报名选填问卷场景；
- 旧 `infoChannels`/`loginRequired` 数据兼容迁移；
- 清理零残留。

## 风险点

- **关注状态实时性**：绑定表 `subscribe` 依赖微信事件回调，signup 判定时先 `refreshSubscribe` 刷新，失败静默降级为缓存值。
- **补填重算幂等**：二次领取沿用现有 `act:{docId}:{uid}:{rewardId}` 幂等键，防重复发放。
- **拆组件回归**：rewardConfig/问卷拆组件后表单提交字段合并逻辑需回归（submit 时聚合各组件数据）。
- **非微信环境**：subscribe/wechat_auth 条件一律 false，仅 contact/survey 可用。
