# 题库表单关联课时默认值与积分提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 web 端题库编辑表单两个问题：关联课时默认值被 watch 副作用清空；新增分值字段提示与关联课时积分配置状态展示。

**Architecture:** 仅修改 `web/pages/quiz/form.vue` 单文件。问题 1 通过 `isInitializing` ref 守卫 watch 跳过初始化期间的 lesson 清空；问题 2 通过 `getLessonDetail` 拉取课时积分配置并展示为只读 chip，同时为分值输入框加灰色提示。

**Tech Stack:** uni-app + Vue 3 Composition API + SCSS，无单元测试（项目惯例采用浏览器手动验证）。

---

## File Structure

- Modify: `e:\code\web\pages\quiz\form.vue`（单文件改动，包含模板、脚本、样式）
- Read-only reference: `e:\code\web\src\api\course.js`（已存在 `getLessonDetail` 导出，无需新增 API）
- Read-only reference: `e:\code\basic\plugins\zhao-course\server\src\content-types\course-lesson\schema.json`（确认 `enablePoints`/`pointsType`/`points` 字段存在）

---

### Task 1: 导入 getLessonDetail 并新增 isInitializing / lessonPointsInfo 状态

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:297`（import 行）
- Modify: `e:\code\web\pages\quiz\form.vue:310-328`（form reactive 之后新增 ref）

- [ ] **Step 1: 修改 import 行，加入 getLessonDetail**

打开 `e:\code\web\pages\quiz\form.vue`，定位 line 297：

```js
import { getCourseList, getLessonList } from '../../src/api/course.js'
```

改为：

```js
import { getCourseList, getLessonList, getLessonDetail } from '../../src/api/course.js'
```

- [ ] **Step 2: 新增 isInitializing 和 lessonPointsInfo ref**

定位 line 332 附近（`const showKnowledgePicker = ref(false)` 之后，或 `const courseList = ref([])` 之前），插入：

```js
const isInitializing = ref(false)
const lessonPointsInfo = ref(null)  // { enablePoints, pointsType, points }
```

- [ ] **Step 3: 验证改动无语法错误**

运行（在 `e:\code\web` 目录）：

```bash
npx vue-tsc --noEmit pages/quiz/form.vue 2>&1 | head -n 20
```

Expected: 无新增报错（项目可能本身有一些 TS 警告，重点关注本次改动行）

- [ ] **Step 4: Commit**

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "feat(quiz-form): import getLessonDetail and add isInitializing/lessonPointsInfo refs"
```

---

### Task 2: watch 加 isInitializing 守卫

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:347-354`（watch 块）

- [ ] **Step 1: 修改 watch 块，加入守卫**

定位 line 347-354：

```js
watch(() => form.course, async (newCourse) => {
  form.lesson = null
  if (newCourse) {
    await loadLessons(newCourse.documentId)
  } else {
    lessonList.value = []
  }
})
```

改为：

```js
watch(() => form.course, async (newCourse) => {
  if (isInitializing.value) return  // 初始化期间跳过清空
  form.lesson = null
  if (newCourse) {
    await loadLessons(newCourse.documentId)
  } else {
    lessonList.value = []
  }
})
```

- [ ] **Step 2: 验证 watch 改动无语法错误**

运行：

```bash
cd e:\code\web
npx vue-tsc --noEmit pages/quiz/form.vue 2>&1 | head -n 20
```

Expected: 无新增报错

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "fix(quiz-form): guard watch with isInitializing to prevent lesson clearing"
```

---

### Task 3: 改造 loadQuestionDetail 加 isInitializing 包裹与 lessonPointsInfo 加载

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:452-485`（loadQuestionDetail 函数）

- [ ] **Step 1: 替换 loadQuestionDetail 函数体**

定位 line 452-485，原函数：

```js
async function loadQuestionDetail() {
  if (!questionId.value) return
  try {
    const data = await getQuestionDetail(questionId.value)
    Object.assign(form, data)
    // 知识点现在混在 tags 中，按 tagGroup.slug === 'knowledge-point' 过滤
    if (data.tags && data.tags.length > 0) {
      form.knowledgePoints = data.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
    } else {
      form.knowledgePoints = []
    }
    const typeIdx = typeValues.indexOf(data.type)
    if (typeIdx > -1) {
      typeIndex.value = typeIdx
    }
    const difficultyIdx = difficultyValues.indexOf(data.difficulty)
    if (difficultyIdx > -1) {
      difficultyIndex.value = difficultyIdx
    }
    if (!form.options || !Array.isArray(form.options) || form.options.length === 0) {
      form.options = [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' }
      ]
    }
    if (form.course) {
      await loadLessons(form.course.documentId)
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
```

替换为：

```js
async function loadQuestionDetail() {
  if (!questionId.value) return
  try {
    isInitializing.value = true
    const data = await getQuestionDetail(questionId.value)
    Object.assign(form, data)
    // 知识点现在混在 tags 中，按 tagGroup.slug === 'knowledge-point' 过滤
    if (data.tags && data.tags.length > 0) {
      form.knowledgePoints = data.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
    } else {
      form.knowledgePoints = []
    }
    const typeIdx = typeValues.indexOf(data.type)
    if (typeIdx > -1) {
      typeIndex.value = typeIdx
    }
    const difficultyIdx = difficultyValues.indexOf(data.difficulty)
    if (difficultyIdx > -1) {
      difficultyIndex.value = difficultyIdx
    }
    if (!form.options || !Array.isArray(form.options) || form.options.length === 0) {
      form.options = [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' }
      ]
    }
    if (form.course) {
      await loadLessons(form.course.documentId)
    }
    // 关联课时积分配置加载
    if (form.lesson) {
      await loadLessonPointsInfo(form.lesson.documentId)
    }
    isInitializing.value = false
  } catch (e) {
    isInitializing.value = false
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
```

**关键差异**：
- 进入 try 块立即 `isInitializing.value = true`
- 在 `loadLessons` 和 `loadLessonPointsInfo` 都完成后才 `isInitializing.value = false`
- catch 块也置 false 防止卡死

- [ ] **Step 2: 验证函数语法**

运行：

```bash
cd e:\code\web
npx vue-tsc --noEmit pages/quiz/form.vue 2>&1 | head -n 20
```

Expected: 无新增报错（注意：`loadLessonPointsInfo` 函数尚未定义，下个 Task 会补上；本步可能报 `loadLessonPointsInfo is not defined`，可暂时接受）

- [ ] **Step 3: Commit（与 Task 4 合并提交，本步不单独 commit）**

本步骤不单独 commit，因为 `loadLessonPointsInfo` 尚未定义会导致运行时错误。继续 Task 4 后再合并提交。

---

### Task 4: 新增 loadLessonPointsInfo 函数并改造 selectLesson

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:436-439`（selectLesson 函数）
- Modify: `e:\code\web\pages\quiz\form.vue`（新增 loadLessonPointsInfo 函数，紧邻 selectLesson 之后）

- [ ] **Step 1: 替换 selectLesson 函数并新增 loadLessonPointsInfo**

定位 line 436-439，原函数：

```js
function selectLesson(lesson) {
  form.lesson = lesson
  showLessonPicker.value = false
}
```

替换为：

```js
async function selectLesson(lesson) {
  form.lesson = lesson
  showLessonPicker.value = false
  if (lesson) {
    await loadLessonPointsInfo(lesson.documentId)
  } else {
    lessonPointsInfo.value = null
  }
}

async function loadLessonPointsInfo(lessonDocId) {
  if (!lessonDocId) {
    lessonPointsInfo.value = null
    return
  }
  try {
    const data = await getLessonDetail(lessonDocId)
    lessonPointsInfo.value = {
      enablePoints: data.enablePoints ?? false,
      pointsType: data.pointsType ?? 'lesson_points',
      points: data.points ?? 0
    }
  } catch (e) {
    lessonPointsInfo.value = null
  }
}
```

- [ ] **Step 2: 验证函数定义完整**

运行：

```bash
cd e:\code\web
npx vue-tsc --noEmit pages/quiz/form.vue 2>&1 | head -n 20
```

Expected: 无 `loadLessonPointsInfo is not defined` 报错

- [ ] **Step 3: Commit（合并 Task 3 + Task 4）**

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "feat(quiz-form): load lesson points info on edit and select"
```

---

### Task 5: 模板加分值提示文案

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:189-197`（分值 form-item）

- [ ] **Step 1: 修改分值 form-item，加 form-tip 提示**

定位 line 189-197：

```html
<view class="form-item half">
  <text class="form-label">分值</text>
  <input 
    type="number" 
    v-model="form.points" 
    placeholder="0"
    class="form-input"
  />
</view>
```

改为：

```html
<view class="form-item half">
  <text class="form-label">分值</text>
  <input 
    type="number" 
    v-model="form.points" 
    placeholder="0"
    class="form-input"
  />
  <text class="form-tip">仅当关联课时积分类型=quiz_points 时生效</text>
</view>
```

- [ ] **Step 2: 验证模板语法**

打开浏览器访问 `http://localhost:5174/#/pages/quiz/form`（新增模式），确认分值下方显示灰色提示文案。

Expected: 提示文案 "仅当关联课时积分类型=quiz_points 时生效" 显示为灰色小字

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "feat(quiz-form): add points field hint about quiz_points requirement"
```

---

### Task 6: 模板加关联课时积分配置 chip 展示区

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue:55-65`（关联课时 form-item 之后插入 chip 展示区）

- [ ] **Step 1: 在关联课时 form-item 之后插入 chip 展示区**

定位 line 55-65（关联课时 form-item）：

```html
<view class="form-item">
  <text class="form-label">关联课时</text>
  <view 
    class="picker-value" 
    :class="{ empty: !form.lesson }"
    @click="showLessonPicker = true"
  >
    <text>{{ form.lesson?.title || '请选择课时' }}</text>
    <text class="picker-arrow">▼</text>
  </view>
</view>
```

在该 form-item 闭合 `</view>` 之后、`<view class="form-item">` 关联知识点之前，插入：

```html
<view class="lesson-points-info" v-if="form.lesson && lessonPointsInfo">
  <view class="info-chip" :class="{ off: !lessonPointsInfo.enablePoints }">
    {{ lessonPointsInfo.enablePoints ? '积分已开启' : '积分未开启' }}
  </view>
  <view class="info-chip" v-if="lessonPointsInfo.enablePoints">
    类型：{{ lessonPointsInfo.pointsType === 'quiz_points' ? '答题积分' : '课时积分' }}
  </view>
  <view class="info-chip warn" v-if="lessonPointsInfo.enablePoints && lessonPointsInfo.pointsType !== 'quiz_points'">
    当前课时类型不支持答题积分
  </view>
</view>
```

- [ ] **Step 2: 验证模板语法（无样式时 chip 会显示为默认文本，可接受）**

打开浏览器编辑链接 `http://localhost:5174/#/pages/quiz/form?id=bmlk6k2t75grerbqelobph63`，确认关联课时下方出现 chip 文本（暂无样式）。

Expected: 关联课时回显正常 + 下方显示 chip 文本（如 "积分已开启" "类型：答题积分"）

- [ ] **Step 3: Commit（与 Task 7 样式合并提交，本步暂不 commit）**

本步骤与 Task 7 样式合并提交，避免出现"无样式 chip"中间态被记录到 git 历史。

---

### Task 7: 新增 form-tip / lesson-points-info / info-chip 样式

**Files:**
- Modify: `e:\code\web\pages\quiz\form.vue`（`<style lang="scss" scoped>` 块末尾）

- [ ] **Step 1: 在 style 块末尾追加样式**

定位文件末尾 `</style>` 之前，追加：

```scss
.form-tip {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.4;
}
.lesson-points-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
  padding-left: 0;
}
.info-chip {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #91d5ff;
}
.info-chip.off {
  background: #f5f5f5;
  color: #999;
  border-color: #e8e8e8;
}
.info-chip.warn {
  background: #fff7e6;
  color: #fa8c16;
  border-color: #ffd591;
}
```

- [ ] **Step 2: 浏览器验证样式生效**

打开 `http://localhost:5174/#/pages/quiz/form?id=bmlk6k2t75grerbqelobph63`：

Expected:
- 分值下方灰色小字提示
- 关联课时下方 chip 圆角带边框，蓝色背景
- 若课时 `enablePoints=false` → 灰色 chip "积分未开启"
- 若课时 `enablePoints=true` 且 `pointsType=quiz_points` → 蓝色 "积分已开启" + 蓝色 "类型：答题积分"，无警告
- 若课时 `enablePoints=true` 且 `pointsType=lesson_points` → 蓝色两 chip + 橙色警告 "当前课时类型不支持答题积分"

- [ ] **Step 3: Commit（合并 Task 6 + Task 7）**

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "feat(quiz-form): show lesson points config chips and points field hint styling"
```

---

### Task 8: 端到端浏览器验证

**Files:**
- 无文件改动，仅手动验证

- [ ] **Step 1: 启动 web dev server（若未运行）**

```bash
cd e:\code\web
npm run dev
```

等待编译完成，访问 `http://localhost:5174/`

- [ ] **Step 2: 登录并打开编辑链接**

登录用户名 `1117`，密码 `a123456`，访问：

```
http://localhost:5174/#/pages/quiz/form?id=bmlk6k2t75grerbqelobph63
```

- [ ] **Step 3: 验证问题 1 已修复**

Expected:
- 关联课程字段显示课程标题（不为"请选择课程"）
- 关联课时字段显示课时标题（不为"请选择课时"，**关键验证点**）
- 关联知识点显示已选知识点 tags

- [ ] **Step 4: 验证问题 2 已修复**

Expected:
- 分值输入框下方显示灰色提示 "仅当关联课时积分类型=quiz_points 时生效"
- 关联课时下方显示积分配置 chip（具体颜色取决于课时实际配置）

- [ ] **Step 5: 验证手动切换关联课程行为正常**

点击"关联课程" → 选择其他课程 → 关联课时字段应被清空（watch 正常行为）

Expected: 关联课时清空为"请选择课时"，`lessonPointsInfo` chip 区域消失

- [ ] **Step 6: 验证手动选择新课时行为正常**

点击"关联课时" → 选择新课时 → chip 区域重新显示该课时的积分配置

Expected: chip 区域显示新课时对应的积分配置状态

- [ ] **Step 7: 验证新增模式无 chip 显示**

访问 `http://localhost:5174/#/pages/quiz/form`（无 id 参数）：

Expected: 关联课时为空，chip 区域不显示；分值提示文案仍显示

- [ ] **Step 8: 验证保存功能正常**

在编辑模式下修改任意字段（如分值），点击"保存"按钮：

Expected: 提示"更新成功"，1.5 秒后返回上一页

- [ ] **Step 9: 最终 Commit（若有任何微调）**

若验证过程发现需要微调样式或文案：

```bash
cd e:\code
git add web/pages/quiz/form.vue
git commit -m "fix(quiz-form): polish based on e2e verification"
```

若无需微调，跳过本步。

---

## Self-Review

### 1. Spec coverage

| Spec 改动 | 对应 Task | 状态 |
|---|---|---|
| 改动 1：watch isInitializing 守卫 | Task 2 | ✓ |
| 改动 1：loadQuestionDetail 包裹 | Task 3 | ✓ |
| 改动 2：分值字段灰色提示 | Task 5 | ✓ |
| 改动 3：lessonPointsInfo ref | Task 1 | ✓ |
| 改动 3：loadLessonPointsInfo 函数 | Task 4 | ✓ |
| 改动 3：selectLesson 改造 | Task 4 | ✓ |
| 改动 3：模板 chip 展示区 | Task 6 | ✓ |
| 改动 3：chip 样式 | Task 7 | ✓ |
| 改动 4：导入 getLessonDetail | Task 1 | ✓ |
| 验证点 1-6 | Task 8 | ✓ |

无遗漏。

### 2. Placeholder scan

- 无 TBD / TODO / "implement later"
- 所有代码块完整，无"Similar to Task N"
- 所有命令含 Expected 输出
- 无"add appropriate error handling"等模糊描述

### 3. Type consistency

- `isInitializing` ref(false) — Task 1 定义，Task 2/3 使用，命名一致
- `lessonPointsInfo` ref(null) — Task 1 定义，Task 3/4/6 使用，命名一致
- `loadLessonPointsInfo(lessonDocId)` — Task 3 调用，Task 4 定义，签名一致
- `selectLesson(lesson)` 改为 async — Task 4 定义，模板 onClick 调用不变
- chip class `off`/`warn` — Task 6 模板使用，Task 7 样式定义，一致

无类型/命名不一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-quiz-form-lesson-default-and-points-hint.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
