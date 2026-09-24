# C端答题积分设计

## 需求

C端答题环节根据课程/课时积分配置，计算每题积分并在答完后统一发放。

## 积分规则

| 课程 enablePoints | 课时 enablePoints | 课时 pointsType | 每题积分 |
|---|---|---|---|
| 关 | - | - | 0（无积分） |
| 开 | 关 | - | 课程积分 ÷ 实际答题数 |
| 开 | 开 | lesson_points | 课时积分 ÷ 实际答题数 |
| 开 | 开 | quiz_points | 题库中该题的 points 字段 |

- 课时积分优先于课程积分
- 同一课程只允许获得一次答题积分
- 领取积分前需弹窗确认

## 答题流程

1. 点击"开始答题" → 后端从课时题库随机抽取 N 道题（默认2，可配置）
2. 逐题作答，答对显示"获得 X 积分"（仅展示，不发放）
3. 答完所有题 → 弹窗确认"领取积分"→ 后端一次性创建积分记录
4. 同一课程已领取过积分则提示"已领取"

## 后端修改

### 1. 新增 C 端答题接口 `POST /zhao-quiz/v1/my/quiz/start`

入参：`{ lessonDocumentId, count? }`（count 默认 2）

逻辑：
- 查询该课时下 isPublished=true 的题目
- 随机抽取 count 道（不足则全部返回）
- 返回题目列表（隐藏 answer）+ 积分配置信息

返回：
```json
{
  "questions": [...],
  "pointsConfig": {
    "enabled": true,
    "perQuestionPoints": 5,
    "pointsType": "lesson_points",
    "totalQuestions": 2
  }
}
```

积分计算逻辑（在 start 时预计算 perQuestionPoints）：
```
if (!course.enablePoints) → enabled=false, perQuestionPoints=0
else if (lesson.enablePoints && lesson.pointsType === 'quiz_points')
  → enabled=true, perQuestionPoints='per_question'（前端用题目自身 points）
else if (lesson.enablePoints)
  → enabled=true, perQuestionPoints=Math.floor(lesson.points / count)
else
  → enabled=true, perQuestionPoints=Math.floor(course.points / count)
```

### 2. 新增 C 端领取积分接口 `POST /zhao-quiz/v1/my/quiz/claim-points`

入参：`{ courseDocumentId, correctCount, totalQuestions }`

逻辑：
- 检查该用户该课程是否已领取过答题积分（查 point-record action='quiz_pass' + source=courseDocumentId）
- 已领取则返回错误
- 计算总积分 = perQuestionPoints × correctCount（或按 quiz_points 逐题累加）
- 调用 `strapi.plugin('zhao-point').service('point').earnPoints()` 创建积分记录
- 返回 `{ pointsEarned }`

### 3. 修改 `submitAnswer` 返回积分信息

在 `quiz-record.ts` 的 `submitAnswer` 返回中增加 `earnedPoints` 字段（仅展示用，不实际发放）。

## 前端修改（shao 目录）

### 1. api.ts 新增接口

```ts
export async function startQuiz(data: { lessonDocumentId: string; count?: number }) { ... }
export async function claimQuizPoints(data: { courseDocumentId: string; correctCount: number; totalQuestions: number }) { ... }
```

### 2. video-player.vue 修改

- `startQuiz()` 调用新接口 `startQuiz`，获取题目 + 积分配置
- `submitAnswer()` 根据积分配置显示每题积分（不再硬编码 +10）
- `completeQuiz()` 弹窗确认后调用 `claimQuizPoints`
- 答题抽取数量默认 2

### 3. quiz.vue 修改

同 video-player.vue 的答题逻辑调整。

## 常量

答题抽取数量默认值：`QUIZ_QUESTION_COUNT = 2`（前端常量，可扩展为后端配置）
