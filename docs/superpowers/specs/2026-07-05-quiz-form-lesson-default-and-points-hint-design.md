# 题库表单关联课时默认值与积分提示设计

**Date**: 2026-07-05
**Status**: Approved
**Owner**: dev

## 背景

Web 端题库编辑页 `pages/quiz/form.vue?id=bmlk6k2t75grerbqelobph63` 存在两个问题：

1. **关联课时默认值丢失**：编辑模式下，关联课程能正确回显，但关联课时被清空为"请选择课时"。课程已开启答题积分，进入编辑入口时正常应回显关联课程、课时、知识点，当前仅关联课程有默认值。
2. **积分录入缺失提示与配置展示**：课程内容允许在 lesson 级别设置 `enablePoints`/`pointsType`，但题库录入环节仅有"分值"输入框，没有任何提示告知用户该分值何时生效，也没有展示关联课时的积分配置状态，用户体验缺失。

## 根因

### 问题 1：watch 副作用清空已赋值字段

[form.vue:347-354](file:///e:/code/web/pages/quiz/form.vue#L347-L354)：

```js
watch(() => form.course, async (newCourse) => {
  form.lesson = null  // ← Object.assign 后触发，清空了已赋值的 lesson
  if (newCourse) {
    await loadLessons(newCourse.documentId)
  } else {
    lessonList.value = []
  }
})
```

[form.vue:452-485](file:///e:/code/web/pages/quiz/form.vue#L452-L485) 的 `loadQuestionDetail`：

```js
const data = await getQuestionDetail(questionId.value)
Object.assign(form, data)  // ← 这里设置了 form.course 和 form.lesson
// ...
if (form.course) {
  await loadLessons(form.course.documentId)  // loadLessons 完成后 watch 仍可能再次触发
}
```

`Object.assign(form, data)` 一次性写入 `course` 和 `lesson`，但 `course` 变化触发 watch 异步执行 `form.lesson = null`，覆盖刚赋值的 `lesson`。

### 问题 2：积分录入缺乏上下文提示

- quiz schema 的 `points` 字段是"每题分值"，仅在 `lesson.pointsType === 'quiz_points'` 时被 video-player 积分逻辑采用
- form.vue 已有"分值"输入框（line 189-197），但无任何提示说明生效条件
- 关联课时后无法看到该课时的积分配置状态（`enablePoints`/`pointsType`），用户无法判断当前题目的分值是否会生效

## 设计

### 范围

仅修改 [form.vue](file:///e:/code/web/pages/quiz/form.vue) 单文件。不改后端、不改 quiz schema、不改其他页面。

### 改动 1：watch 加 `isInitializing` 守卫

新增 `isInitializing` ref，`loadQuestionDetail` 中 `Object.assign` 前置 true，`loadLessons` 完成后置 false，watch 内 `if (isInitializing.value) return` 跳过清空。

```js
const isInitializing = ref(false)

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

`loadQuestionDetail` 改造：

```js
async function loadQuestionDetail() {
  if (!questionId.value) return
  try {
    isInitializing.value = true
    const data = await getQuestionDetail(questionId.value)
    Object.assign(form, data)
    // 知识点过滤、typeIndex、difficultyIndex、options 兜底（保持原逻辑）
    if (data.tags && data.tags.length > 0) {
      form.knowledgePoints = data.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
    } else {
      form.knowledgePoints = []
    }
    const typeIdx = typeValues.indexOf(data.type)
    if (typeIdx > -1) typeIndex.value = typeIdx
    const difficultyIdx = difficultyValues.indexOf(data.difficulty)
    if (difficultyIdx > -1) difficultyIndex.value = difficultyIdx
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
    // 关联课时积分配置加载（问题 2）
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

**注意**：`isInitializing.value = false` 必须在 `loadLessons` 和 `loadLessonPointsInfo` 都完成后才置位，确保整个初始化期间 watch 都被守卫。

### 改动 2：分值字段加灰色提示

模板 [form.vue:189-197](file:///e:/code/web/pages/quiz/form.vue#L189-L197)：

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

样式新增：

```scss
.form-tip {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.4;
}
```

### 改动 3：关联课时积分配置状态展示

新增 `lessonPointsInfo` ref + `loadLessonPointsInfo` 函数：

```js
const lessonPointsInfo = ref(null)  // { enablePoints, pointsType, points }

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

`selectLesson` 改造（用户主动切换课时也加载积分配置）：

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
```

模板：在"关联课时"form-item 下方新增积分配置状态展示区（仅当 `form.lesson && lessonPointsInfo` 时显示）：

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

样式：

```scss
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

### 改动 4：导入 getLessonDetail

[form.vue:297](file:///e:/code/web/pages/quiz/form.vue#L297)：

```js
import { getCourseList, getLessonList, getLessonDetail } from '../../src/api/course.js'
```

`getLessonDetail` 已存在于 [web/src/api/course.js:80](file:///e:/code/web/src/api/course.js#L80)，无需新增 API。

## 验证点

1. 编辑链接 `form?id=bmlk6k2t75grerbqelobph63`：
   - 关联课程自动显示课程标题
   - 关联课时自动显示课时标题（不被清空）
   - 关联知识点自动显示已选知识点
2. 编辑模式下，关联课时下方显示积分配置 chip：
   - 课时 `enablePoints=true` 且 `pointsType=quiz_points` → 显示"积分已开启"+"类型：答题积分"，无警告
   - 课时 `enablePoints=true` 且 `pointsType=lesson_points` → 显示警告 chip"当前课时类型不支持答题积分"
   - 课时 `enablePoints=false` → 显示灰色"积分未开启"
3. 手动切换关联课程：lessonList 刷新，lesson 被清空（watch 正常行为），`lessonPointsInfo` 被清空
4. 手动选择新课时：`lessonPointsInfo` 重新加载并显示对应 chip
5. 分值输入框下方显示灰色提示"仅当关联课时积分类型=quiz_points 时生效"
6. 新增题目模式（无 id）：`lessonPointsInfo` 始终为 null，不显示 chip

## 不做的事

- 不修改 quiz schema（不加 `enablePoints`/`pointsType` 字段，积分配置层级保持 course → lesson → quiz）
- 不修改后端代码（不动 zhao-quiz/zhao-course 服务）
- 不改造 points 字段为 picker（保持 number input）
- 不处理 channelScope/channelIds 表单字段（与本任务无关，已有独立任务）
- 不重构 watch 为 flush: 'post'（isInitializing 守卫更明确）
- 不在创建/更新提交时附带 lessonPointsInfo（仅作展示，不持久化）

## 风险

- **低**：改动集中在单文件，watch 守卫是 Vue 3 标准模式
- **回归点**：`isInitializing` 必须在所有 await 完成后才置 false，否则 watch 可能在中途触发
  - 已在设计中明确：`loadLessons` 和 `loadLessonPointsInfo` 都 await 完成后才 `isInitializing.value = false`
- **网络开销**：编辑模式多一次 `getLessonDetail` 请求（仅一次，可接受）
