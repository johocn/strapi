# 线下活动页「会议时间」快捷选择与实时校验 设计文档

> 关联设计：`2026-08-25-activity-signup-time-design.md`（报名时间联动，本设计在其之上增强会议时间编辑体验，不改变既有联动规则）

## 背景与目标

当前活动表单中「活动开始时间 / 活动结束时间」仅靠日期时间选择器手工录入，存在两个体验问题：

1. 开始时间需逐项手填，无常用时段快捷入口；
2. 时间关系（结束晚于开始等）只在提交时校验，用户改完才发现报错，返工成本高。

目标：

- 新建活动默认「明天 9:00」开始，配合默认时长直接生成完整活动时间；
- 提供常用开始时间（上午/下午）与常用时长快捷按钮，点选即完成时间填写；
- 改动时间时即时校验并内联红字提示，无需等到提交。

## 术语

| 术语 | 说明 |
|---|---|
| startTime | 活动开始时间（活动表单字段） |
| endTime | 活动结束时间（活动表单字段） |
| durationMinutes | 会议时长（分钟），**前端表单状态，不落库** |
| signupStart / signupEnd | 报名开始 / 结束时间（既有字段） |
| n（signupAdvanceHours） | 报名提前截止小时数（既有字段，整数，可负/0） |

## 功能设计

### 1. 新建活动默认值

仅「新建」模式初始化一次，编辑模式按库内数据回填，不覆盖用户已选值。

| 字段 | 新建默认 | 说明 |
|---|---|---|
| startTime | 明天 9:00（本地时间） | 规避「今天 9:00 已过」的过去时间问题 |
| durationMinutes | 90（1.5h） | 默认时长，保证表单一进来即完整可用 |
| endTime | startTime + 1.5h = 明天 10:30 | 由默认时长联动生成 |
| signupStart | 当前时间 | 既有默认，不变 |
| signupAdvanceHours | 0 | 既有默认，不变 |
| signupEnd | startTime（明天 9:00） | 沿用「活动开始即截止」默认（n=0 且 signupEnd 未设置时） |

> 说明：若取消默认时长，新建后 endTime 为空且实时校验立即报红，体验不佳，故默认 1.5h。

### 2. 快捷开始时间按钮

活动开始时间下方提供常用时段 chip，**点选仅修改所选日期的时间部分**（保留已选日期，未选日期则用默认日期「明天」）。

- 上午组：`8:30 / 9:00 / 9:30`
- 下午组：`14:00 / 14:30 / 15:00`

点选后触发（顺序）：

1. 更新 startTime 的时间部分；
2. 若时长处于激活态（见 §3），`endTime = startTime + durationMinutes`；
3. 触发既有报名截止联动 `applySignupAdvance()`（n>0 或 signupEnd 为空时）。

### 3. 时长快捷与联动

活动开始/结束时间之间提供时长 chip：`0.5h / 1h / 1.5h / 2h / 3h`。

**联动规则（时长作为表单状态，不新增持久化字段）：**

- **点选时长**：`durationMinutes = 选中值`，`endTime = startTime + durationMinutes`，该 chip 高亮为激活态；
- **改 startTime**（快捷按钮或 picker）：若 `durationMinutes` 激活，`endTime = startTime + durationMinutes` 跟随；
- **手改 endTime**（picker）：`durationMinutes = null`，解除时长跟随，所有 chip 取消高亮（语义与「n≤0 手动管理报名截止」一致）；
- **编辑回填**：`durationMinutes = endTime - startTime`（分钟）反推，命中预设则高亮对应 chip；`endTime ≤ startTime` 时为 null（不激活）。

> 不落库原因：endTime / startTime 已持久化，时长可由二者差反推，避免新增 schema 字段与迁移成本。

### 4. 实时校验（改动即校验，内联红字）

新增计算属性 `timeErrors`，在表单时间区下方以**内联红字**（新增 `.form-error` 样式，区别于 `.form-tip` 灰色提示）展示；随输入即时显隐，满足即消除。

| 校验 | 触发 | 文案 |
|---|---|---|
| endTime > startTime | 改 startTime / endTime / 时长 | `活动结束时间必须晚于活动开始时间` |
| signupEnd > signupStart | 改 signupStart / signupEnd | `报名结束时间必须晚于报名开始时间` |
| signupStart ≥ 当前时间（仅新建） | 改 signupStart | `报名开始时间不能早于当前时间` |

- 非法中间态**不锁死输入**（允许继续编辑），仅红字提示，提交时保留最终校验兜底（后端校验不变）。
- 实时校验仅前端行为；后端 adminCreate/adminUpdate 校验保持既有实现不变。

### 5. 与既有报名截止联动的关系

本设计**不改变** `2026-08-25-activity-signup-time-design.md` 的联动规则：

- `applySignupAdvance()` 逻辑不变（n>0 跟随、n≤0 不调整已设值、signupEnd 为空则默认 = startTime）；
- 快捷开始时间、时长跟随仅新增对 `endTime` 的处理，报名截止联动照常触发。

## UI 布局

```
活动开始 [日期+时间选择器]
  常用开始时间：[上午] 8:30 9:00 9:30 ｜ [下午] 14:00 14:30 15:00
  时长：[0.5h] [1h] [1.5h] [2h] [3h]
活动结束 [日期+时间选择器]   ← 手改解除时长跟随
  [红字] 活动结束时间必须晚于活动开始时间
报名开始 [日期+时间选择器]
报名结束 [日期+时间选择器]
  提前截止（小时）[输入]（既有）
  [红字] 报名结束时间必须晚于报名开始时间 / 报名开始时间不能早于当前时间
```

## 边界与风险

- 时长为空且未激活时，改 startTime 不联动 endTime（纯手动）。
- 非法时间中间态允许保留编辑，红字提示，提交拦截（后端兜底）。
- 默认值仅新建初始化一次，不覆盖用户已选值。
- 时长仅前端状态，刷新/重进编辑页由 endTime-startTime 反推，无持久化副作用。

## 验收要点

1. 新建：startTime=明天 9:00、endTime=明天 10:30、signupStart=当前、signupEnd=明天 9:00、2h chip 未高亮、1.5h chip 高亮。
2. 点快捷「14:00」：startTime=明天 14:00，endTime 跟随=明天 15:30。
3. 点时长「2h」：endTime=明天 16:00，2h chip 高亮。
4. 手改 endTime=明天 13:00：时长 chip 全部取消高亮；再点「9:30」，endTime 不再跟随（保持 13:00）。
5. 改 startTime 至晚于 endTime：立即红字「活动结束时间必须晚于活动开始时间」。
6. 新建模式改 signupStart 为过去时间：立即红字「报名开始时间不能早于当前时间」。
7. 编辑回填：库内 start=明天9:00、end=明天11:00 → 2h chip 高亮；改 start=明天10:00 → end 跟随=明天12:00。
8. 提交校验（后端）不变：时间关系非法仍返回 400。

## 影响面

- **仅前端**：`web/src/pages/activity/form.vue`（模板 chip 区 + 校验红字；逻辑 durationMinutes 状态、applyDuration、onDatetime 扩展、timeErrors 计算、新建默认）。
- **后端零改动**：不新增 schema 字段，adminCreate/adminUpdate 校验不变。
- **C 端（shao）零改动**。
