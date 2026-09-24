# C 端课程详情页 API 对接设计

## 背景

shao C 端现有 3 个课程学习页面（`course-detail` → `video-player` → `quiz`），交互流程已验证，但全部使用 mock 数据，未对接后端真实 API。后端（zhao-course、zhao-quiz、zhao-point 插件）已具备完整的进度追踪、答题校验、积分领取能力。

## 方案

渐进式对接：保持现有页面结构和交互流程不变，逐页替换 mock 为真实 API。

## 数据流

```
course-detail.vue
  ├── getCourseDetail(courseId) → 课程信息+封面
  ├── getLessonList(courseId) → 课时列表
  └── getMyLessonProgress(courseId) → 各课时进度/完成状态 [新增API]
        ↓ 点击课时
video-player.vue
  ├── 播放进度 → reportProgress(lessonId, progress)
  ├── 进度100% → markLessonComplete → 触发答题
  └── 底部栏"开始答题" → startQuiz()
        ↓ 答题
quiz.vue (弹窗/独立页)
  ├── getQuizByLesson(lessonId) → 题目列表
  ├── submitAnswer(lessonId, answers) → 提交答题
  └── claimPoints(lessonId) → 领取积分
```

## 各页面改动

### course-detail.vue

- 移除 `completed: idx < 2` 硬编码
- 新增 `getMyLessonProgress` API 调用，获取真实进度
- 底部栏显示真实完成数/总课时数
- 课程进度百分比 = 已完成课时数 / 总课时数

### video-player.vue

- `saveLearningProgress()` → 调用 `submitLessonProgress({ lessonId, progress })`
- `markLessonComplete()` → 调用 `reportProgress` 上报 100%
- `completeQuiz()` → 调用 `submitQuizAnswer` + `claimLessonPoints`
- 移除本地积分计算，改用后端返回值
- `getPointBalance()` → 实时查询积分余额

### quiz.vue

- `loadQuestions()` → 调用 `getQuizByLesson(lessonId)` 获取真实题目
- `submitAnswer()` → 调用后端 `submitQuizAnswer` 校验答案
- `finishQuiz()` → 调用 `claimLessonPoints` 领取积分
- 移除本地 `earnPoints` 调用

## API 对接清单

| API | 说明 | 状态 |
|---|---|---|
| `GET /zhao-course/v1/courses/:id` | 课程详情 | 已有 |
| `GET /zhao-course/v1/course-lessons?course=xxx` | 课时列表 | 已有 |
| `GET /zhao-course/v1/my/lesson-progress?course=xxx` | 用户课时进度 | 需确认路由 |
| `POST /zhao-course/v1/my/lesson-progress` | 上报课时进度 | 已有 reportProgress |
| `POST /zhao-course/v1/my/lesson-answer/:id` | 提交答题 | 已有 submitAnswer |
| `POST /zhao-course/v1/my/claim-lesson-points/:id` | 领取积分 | 已有 claimPoints |
| `GET /zhao-quiz/v1/quiz?lesson=xxx` | 获取课时题目 | 已有 |
| `GET /zhao-point/v1/my/point/balance` | 积分余额 | 已有 |

## 风险点

1. `getMyLessonProgress` 后端路由需确认是否已注册
2. `submitQuizAnswer` 的请求/响应格式需与后端 `lesson-progress.submitAnswer` 对齐
3. 视频播放器为模拟，后续替换真实播放器时需调整进度上报逻辑
