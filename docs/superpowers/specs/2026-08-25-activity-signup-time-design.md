# 线下活动报名时间联动设计

日期：2026-08-25
状态：待审阅
范围：web 运营端（h.joho.cn）活动表单「报名设置」区

## 1. 背景与目标

当前活动表单的「报名开始 / 报名结束」是两个独立的日期时间选择器，无默认值、无联动：
- 运营需要额外手工指定报名截止，且无法表达「报名截止 = 活动开始」这一最常见语义
- 修改活动开始时间后，报名截止不会自动跟随，容易产生「活动已开始但报名仍开着」的脏状态

目标：将「报名截止」建模为相对活动开始时间的提前量 `n`（整数小时），实现三个时间的双向联动与校验。

## 2. 数据模型

在 `plugin::zhao-point.activity` 的 schema 上新增一个字段（仅 web 运营端使用，C 端只读最终结果）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `signupStart` | datetime（已有） | 报名开始时间，默认当前时间，不能早于当前时间 |
| `signupEnd` | datetime（已有） | 报名结束时间，唯一权威截止值 |
| `signupAdvanceHours` | integer（新增） | 提前量 n（小时），`signupEnd = startTime - n`；允许 ≤ 0 |

> `signupEnd` 仍是后端与 C 端判断报名状态的唯一权威字段；`signupAdvanceHours` 仅用于联动与回填，不影响已存数据的读取。

## 3. 规则与校验

1. **`signupStart` ≥ 当前时间**：报名开始不能早于现在。新建活动默认 `signupStart = now`（立刻开始）。该规则仅作用于「新建 / 未发布」场景；已发布活动编辑时不强制（历史活动的 signupStart 必然在过去）。
2. **`signupEnd` > `signupStart`**：报名结束必须晚于报名开始。
3. **`endTime` > `startTime`**：活动结束晚于活动开始（已有校验，保留）。
4. **`signupEnd = startTime - n`**：报名截止由活动开始时间与提前量 n 决定（n 为整数小时，允许负数）。

## 4. 双向联动逻辑

### 4.1 改「活动开始时间」startTime
- 若 `n > 0`：`signupEnd = startTime - n`（报名截止相对活动开始提前 n 小时）。
- 若 `n ≤ 0` 且 `signupEnd` 已设置：**不调整** `signupEnd`（保留当前报名截止；提前量不生效，报名截止完全手动管理）。
- 若 `n ≤ 0` 且 `signupEnd` 尚未设置（新建默认）：`signupEnd = startTime`（「活动开始即截止」默认语义，仅首次兜底，不算调整已设值）。

### 4.2 改「报名结束时间」signupEnd
- 反推差值：`d = startTime - signupEnd`（小时，可为小数/负）
- 计算 `n = floor(d)`（向下取整）
- 若 `n > 0`：用 `signupEnd = startTime - n` 覆盖（将分钟级设置对齐到整数小时）
- 若 `n ≤ 0`：**不调整** `signupEnd`，保留用户手设值（即「活动开始后仍可报名」），n 记录为计算值（负/0）

### 4.3 改「提前量」n
- 若 `n > 0`：`signupEnd = startTime - n`
- 若 `n ≤ 0`：**不调整**已设置的 `signupEnd`（此时提前量输入置灰/提示不生效）；若 `signupEnd` 尚未设置则默认 `signupEnd = startTime`

### 4.4 编辑回填
- 新建：`signupStart = now`，`signupEnd = startTime`，`n = 0`
- 编辑已有活动：`n = floor(startTime - signupEnd)`（向下取整）回填到提前量输入，允许为负/0；`n ≤ 0` 时提示「报名截止晚于活动开始时间，提前量不生效」

## 5. UI 设计（web 运营端 form.vue 报名设置区）

```
活动开始  [日期+时间]   ← 变更时按 §4.1 联动报名截止
活动结束  [日期+时间]   ← 校验 endTime > startTime
────────────────────────────
报名开始  [日期+时间]   ← 默认当前时间；选择器不允许选过去时间
报名结束  [日期+时间]   ← 变更时按 §4.2 反推/取整；可设晚于活动开始（活动开始后仍可报名）
提前截止  [N] 小时      ← 整数输入（允许 0 或负数）；n>0 时联动 signupEnd；n≤0 时不联动并提示「报名截止晚于活动开始时间，提前量不生效」
```

## 6. 影响面

- **后端（zhao-point）**：schema 新增 `signupAdvanceHours` 字段（不参与 signup 判定逻辑）；admin 活动创建/更新处补轻量校验 `signupEnd > signupStart`、`endTime > startTime`（防止绕过前端）。
- **C 端（shao detail.vue）**：零改动。`signupEnd` 已由运营端算好存库，仍为唯一判断依据。
- **web 运营端（form.vue）**：报名设置区 UI 与联动逻辑改造（§4、§5），新增字段提交/回填。

## 7. 边界与风险

- **改 startTime 仅 n>0 跟随**：n ≤ 0 时（报名截止晚于活动开始）改 startTime 不调整 signupEnd，报名截止完全手动；若运营意图是让报名截止跟随活动开始，需把提前量改为正数。
- **取整吞分钟**：n>0 时手设的分钟级 signupEnd 会被 floor 对齐（如差 2.5h → n=2 → signupEnd=startTime-2h），属预期行为。
- **负数 floor 语义**：`floor(-2.5) = -3`，但 n ≤ 0 分支不覆盖 signupEnd，故无影响。
- **已发布活动编辑**：signupStart ≥ now 不强制，避免历史活动无法保存。

## 8. 测试要点

1. 新建：signupStart 默认 now、signupEnd 默认 startTime、n=0
2. 改 startTime（n>0）→ signupEnd 自动跟随；n≤0 → signupEnd 不变
3. 改 signupEnd 差 2.5h → n=2（floor），signupEnd 对齐为 startTime-2h
4. 改 signupEnd 到 startTime 之后 → n≤0（回填负/0），signupEnd 保留原值
5. 改 n 为负/0 → signupEnd 不变
6. 校验：signupEnd ≤ signupStart 报错；endTime ≤ startTime 报错；signupStart 早于 now 被阻止
7. 编辑回填：n = floor(startTime - signupEnd) 正确回填（可为负/0）
