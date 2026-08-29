# 线下活动「会议时间」快捷选择与实时校验 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在活动表单中提供常用开始时间/时长快捷点选、新建默认时间初始化，并将时间关系校验改为改动即内联红字提示。

**Architecture:** 纯前端改动（`web/src/pages/activity/form.vue`）。`durationMinutes` 作为前端 ref 状态不落库，由 `endTime - startTime` 反推回填；快捷开始时间仅改日期的时间部分并联动 endTime；新增 `timeErrors` 计算属性驱动内联红字。后端与 C 端零改动。

**Tech Stack:** uni-app（Vue3 `<script setup>`）、Vant 风格自绘样式

---

## 文件结构

- 修改 `e:\code\web\src\pages\activity\form.vue`：唯一改动文件
  - 模板：活动时间区（L58-89）加入快捷开始时间/时长 chips + 活动错误红字；报名设置区（L257-295）加入报名错误红字
  - 逻辑：常量 + `durationMinutes` ref + `timeErrors` computed；`addMinutes`/`tomorrowDate` 工具；`onDatetime` 扩展；`pickStartTime`/`pickDuration`；`onMounted` 新建默认；`loadDetail` 回填
  - 样式：新增 `.time-chips`/`.time-chip`/`.time-chip-group`/`.time-chip.on`/`.form-error`

> 后端零改动：不新增 schema 字段，adminCreate/adminUpdate 校验保持既有实现不变。

---

### Task 1: form.vue 逻辑层（常量 / durationMinutes / timeErrors / 联动函数 / 默认值 / 回填）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue:819-897`（工具与联动函数区）
- Modify: `e:\code\web\src\pages\activity\form.vue:649-679`（form reactive 下方新增 ref/computed）
- Modify: `e:\code\web\src\pages\activity\form.vue:1434-1440`（onMounted）
- Modify: `e:\code\web\src\pages\activity\form.vue:1205-1216`（loadDetail 回填）

- [ ] **Step 1: 新增常量与前端状态**

在 `form` reactive 对象（L679 `learningPackageLessons:` 之后）下方新增：

```js
// 快捷开始时间（两位 HH:mm，仅改所选日期的时间部分）
const MORNING_TIMES = ['08:30', '09:00', '09:30']
const AFTERNOON_TIMES = ['14:00', '14:30', '15:00']
// 时长快捷选项（分钟 → 展示文案）
const DURATION_OPTIONS = [
  { m: 30, label: '0.5h' },
  { m: 60, label: '1h' },
  { m: 90, label: '1.5h' },
  { m: 120, label: '2h' },
  { m: 180, label: '3h' },
]
// 会议时长（前端状态，不落库）；null 表示未激活（手改 endTime 解除）
const durationMinutes = ref(null)
// 实时时间关系校验：{ activity: [], signup: [] }，改动即红字
const timeErrors = computed(() => {
  const activity = []
  const signup = []
  if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
    activity.push('活动结束时间必须晚于活动开始时间')
  }
  if (form.signupStart && form.signupEnd && new Date(form.signupEnd) <= new Date(form.signupStart)) {
    signup.push('报名结束时间必须晚于报名开始时间')
  }
  if (!isEdit.value && form.signupStart && new Date(form.signupStart) < new Date()) {
    signup.push('报名开始时间不能早于当前时间')
  }
  return { activity, signup }
})
```

> 说明：`durationMinutes` 使用 `ref` 而非放进 `form` reactive，因为它是纯前端状态，不能混入 `submitData` 提交。

- [ ] **Step 2: 新增 addMinutes / tomorrowDate 工具函数**

在 `nowLocalDT`（L861-864）之后新增：

```js
// iso 增加 mins 分钟后返回本地 "YYYY-MM-DDTHH:mm"；入参非法返回 ''
function addMinutes(iso, mins) {
  if (!iso || !Number.isFinite(mins)) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  d.setMinutes(d.getMinutes() + mins)
  return `${datePart(d)}T${timePart(d)}`
}
// 明天（本地）日期 "YYYY-MM-DD"，作为新建默认日与快捷开始时间未选日期的兜底
function tomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
```

- [ ] **Step 3: 扩展 onDatetime（startTime 时长跟随 / endTime 解除跟随）**

将现有 `onDatetime`（L842-849）替换为：

```js
function onDatetime(key, part, value) {
  const cur = form[key] || ''
  const date = part === 'date' ? value : datePart(cur)
  const time = part === 'time' ? value : timePart(cur)
  form[key] = `${date}T${time}`
  if (key === 'startTime') {
    if (durationMinutes.value) form.endTime = addMinutes(form.startTime, durationMinutes.value) // 时长激活则 endTime 跟随
    applySignupAdvance() // 改活动开始 → 按 n 联动报名截止（仅 n>0）
  }
  if (key === 'endTime') durationMinutes.value = null // 手改结束 → 解除时长跟随，chip 取消高亮
  if (key === 'signupEnd') backfillAdvance() // 改报名结束 → 反推 n 并对齐（仅 n>0）
}
```

- [ ] **Step 4: 新增 pickStartTime / pickDuration 点选函数**

在 `onDatetime`（L849）之后新增：

```js
// 快捷开始时间点选：仅改时间部分（保留已选日期，未选用明天兜底）；时长激活则 endTime 跟随
function pickStartTime(time) {
  const date = datePart(form.startTime) || tomorrowDate()
  form.startTime = `${date}T${time}`
  if (durationMinutes.value) form.endTime = addMinutes(form.startTime, durationMinutes.value)
  applySignupAdvance()
}
// 时长点选：激活时长，endTime = startTime + 时长
function pickDuration(mins) {
  durationMinutes.value = mins
  if (form.startTime) form.endTime = addMinutes(form.startTime, mins)
}
```

- [ ] **Step 5: onMounted 新建默认时间初始化**

将现有 `onMounted`（L1434-1440）替换为：

```js
onMounted(async () => {
  await loadSiteConfig()
  roleGate.value = isFeatureEnabled('roleGate')
  if (roleGate.value) loadRoleOptions()
  if (!isEdit.value) {
    form.signupStart = nowLocalDT() // 新建默认当前时间，立即开始
    const start = `${tomorrowDate()}T09:00` // 默认明天 9:00 开始
    form.startTime = start
    durationMinutes.value = 90 // 默认 1.5h
    form.endTime = addMinutes(start, 90) // 默认明天 10:30 结束
    applySignupAdvance() // n=0 且 signupEnd 空 → signupEnd = startTime（活动开始即截止）
  }
  loadDetail(); loadSeries(); loadResources(); loadCategories()
})
```

- [ ] **Step 6: loadDetail 编辑回填 durationMinutes**

在 `loadDetail` 的 `Object.assign(form, data, { ... })` 闭括号（L1216）之后新增：

```js
    // 编辑回填时长：由 endTime - startTime 反推（分钟），endTime<=startTime 时为 null（不激活）
    durationMinutes.value = data.startTime && data.endTime
      ? (() => {
          const diff = Math.round((new Date(data.endTime) - new Date(data.startTime)) / 60000)
          return diff > 0 ? diff : null
        })()
      : null
```

- [ ] **Step 7: 构建验证**

Run: `cd e:\code\web && $env:NODE_OPTIONS='--max-old-space-size=1024 --max-semi-space-size=64'; npm run build:h5`
Expected: 编译成功，无 JS/模板错误

---

### Task 2: form.vue 模板层（快捷 chips + 内联红字）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue:58-89`（活动时间区）
- Modify: `e:\code\web\src\pages\activity\form.vue:287-295`（报名设置区尾部）
- Modify: `e:\code\web\src\pages\activity\form.vue:1473`（样式区 form-tip 附近）

- [ ] **Step 1: 活动时间区插入快捷开始时间 / 时长 chips 与活动错误红字**

将 `</view>`（L89，活动时间 form-row 结束）替换为：

```html
        </view>
        <view class="form-item">
          <text class="form-label">常用开始时间</text>
          <view class="time-chips">
            <text class="time-chip-group">上午</text>
            <text class="time-chip" v-for="t in MORNING_TIMES" :key="t" @click="pickStartTime(t)">{{ t }}</text>
            <text class="time-chip-group">下午</text>
            <text class="time-chip" v-for="t in AFTERNOON_TIMES" :key="t" @click="pickStartTime(t)">{{ t }}</text>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">时长</text>
          <view class="time-chips">
            <text
              class="time-chip"
              :class="{ on: durationMinutes === d.m }"
              v-for="d in DURATION_OPTIONS"
              :key="d.m"
              @click="pickDuration(d.m)"
            >{{ d.label }}</text>
          </view>
        </view>
        <view v-for="err in timeErrors.activity" :key="err" class="form-error">{{ err }}</view>
```

- [ ] **Step 2: 报名设置区尾部插入报名错误红字**

在 `advanceTip()` 提示行（L293）之后新增：

```html
          <text v-if="advanceTip()" class="form-tip">{{ advanceTip() }}</text>
          <view v-for="err in timeErrors.signup" :key="err" class="form-error">{{ err }}</view>
```

- [ ] **Step 3: 新增样式（chips 与红字）**

在 `.form-tip` 样式（L1473）之后新增：

```css
.time-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 16rpx; }
.time-chip { padding: 10rpx 28rpx; border: 1rpx solid #ddd; border-radius: 32rpx; font-size: 26rpx; color: #666; background: #fafbfe; }
.time-chip.on { color: #fff; border-color: #667eea; background: #667eea; }
.time-chip-group { font-size: 24rpx; color: #999; }
.form-error { font-size: 24rpx; color: #ff4d4f; margin: -8rpx 0 20rpx; }
```

- [ ] **Step 4: 构建验证**

Run: `cd e:\code\web && $env:NODE_OPTIONS='--max-old-space-size=1024 --max-semi-space-size=64'; npm run build:h5`
Expected: 编译成功，无模板/JS/样式错误

---

### Task 3: 手动验收 + 收口

**Files:**
- Modify: 无（仅验证）

- [ ] **Step 1: 手动验收 8 条要点（对齐设计文档）**

本地启动 web dev 或打开 H5 构建产物，逐条核对：

1. 新建：startTime=明天 9:00、endTime=明天 10:30、signupStart=当前、signupEnd=明天 9:00；`1.5h` chip 高亮，其余时长 chip 不高亮
2. 点快捷「14:00」：startTime=明天 14:00，endTime 跟随=明天 15:30（时长仍激活）
3. 点时长「2h」：endTime=明天 16:00，`2h` chip 高亮
4. 手改 endTime=明天 13:00：所有时长 chip 取消高亮；再点「9:30」，endTime 不再跟随（保持 13:00）
5. 改 startTime 至晚于 endTime：立即红字「活动结束时间必须晚于活动开始时间」；改回即消除
6. 新建模式改 signupStart 为过去时间：立即红字「报名开始时间不能早于当前时间」
7. 编辑回填：库内 start=明天 9:00、end=明天 11:00 → `2h` chip 高亮；改 start=明天 10:00 → end 跟随=明天 12:00
8. 提交校验（后端兜底）不变：时间关系非法仍返回 400

- [ ] **Step 2: 收口清理**

1. 调试标记自查：`grep -rn "DEBUG\|console\.log" e:\code\web\src\pages\activity\form.vue` → 仅既有代码，无本次新增调试日志
2. 确认变更文件：`e:\code\web\src\pages\activity\form.vue`（唯一源码改动）
3. 无需还原根 app dist（本次无插件/后端改动）
4. 变更未提交，待用户确认后统一提交

---

## 手动回归注意

- 本次仅前端改动，不触碰后端 schema 与校验、不触碰 C 端（shao），活动其他表单功能（报名奖励、问卷、排期冲突预检）不受影响。
- `durationMinutes` 为前端态，刷新/重进编辑页由 `endTime - startTime` 反推，无持久化副作用。
