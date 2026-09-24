# zhao-quiz 三层路由改造设计

## 目标

将 zhao-quiz 的路由架构从当前 2 层（Admin + Content-API 混合）改造为 3 层（公开/用户/管理员），完全对齐 zhao-course 的路由模式。

## 当前问题

1. Content-API 路由没有分层 — 公开/用户/管理员路由混在一个文件，用内联 middleware 区分
2. 没有使用 `publicRoute`/`userRoute`/`adminRoute` 辅助函数，每个路由重复写 middleware 配置
3. Admin 路由使用 `middlewares` 而非 `policies: []`，与 zhao-course 不一致
4. Content-API 路由缺少 `/v1` 前缀和 `/v1/admin` 前缀的分层

## 改造范围

### 改动文件

| 文件 | 改动 |
|------|------|
| `server/src/routes/content-api.ts` | 重写：引入 3 个辅助函数，3 层路由 |
| `server/src/routes/admin.ts` | 重写：改为 `policies: []` 模式 |

### 不改动文件

- `server/src/controllers/*.ts` — 零改动
- `server/src/services/*.ts` — 零改动
- `server/src/permissions.ts` — 零改动
- `server/src/policies/has-permission.ts` — 零改动
- `server/src/content-types/*/schema.json` — 零改动

## Content-API 路由设计

### 辅助函数

```typescript
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      "plugin::zhao-auth.authenticate",
      {
        name: "plugin::zhao-auth.authorize",
        config: { policies: [{ name: "is-authenticated" }] },
      },
    ],
  },
});

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      "plugin::zhao-auth.authenticate",
      {
        name: "plugin::zhao-auth.authorize",
        config: {
          policies: [
            { name: "is-authenticated" },
            { name: "has-quiz-permission", action: permission },
          ],
        },
      },
    ],
  },
});
```

### 公开路由（4 条）

| 方法 | 路径 | Handler |
|------|------|---------|
| GET | `/v1/quizzes` | quiz.find |
| GET | `/v1/quizzes/:documentId` | quiz.findOne |
| GET | `/v1/quiz-exams` | quiz-exam.find |
| GET | `/v1/quiz-exams/:documentId` | quiz-exam.findOne |

### 用户路由（6 条）

| 方法 | 路径 | Handler |
|------|------|---------|
| POST | `/v1/my/quiz-records/submit` | quiz-record.submitAnswer |
| GET | `/v1/my/quiz-records` | quiz-record.getUserRecords |
| POST | `/v1/my/quiz-exam-attempts/start` | quiz-exam-attempt.startExam |
| POST | `/v1/my/quiz-exam-attempts/:documentId/submit` | quiz-exam-attempt.submitExam |
| GET | `/v1/my/exam-attempts` | quiz-exam-attempt.getUserAttempts |
| GET | `/v1/my/quiz-exams/:documentId/questions` | quiz-exam.getQuestions |

### 管理员路由（22 条）

| 方法 | 路径 | Handler | 权限 |
|------|------|---------|------|
| GET | `/v1/admin/quizzes` | quiz.find | quiz.read |
| GET | `/v1/admin/quizzes/:documentId` | quiz.findOne | quiz.read |
| POST | `/v1/admin/quizzes` | quiz.create | quiz.create |
| PUT | `/v1/admin/quizzes/:documentId` | quiz.update | quiz.update |
| DELETE | `/v1/admin/quizzes/:documentId` | quiz.delete | quiz.delete |
| GET | `/v1/admin/quiz-exams` | quiz-exam.find | quiz-exam.read |
| GET | `/v1/admin/quiz-exams/:documentId` | quiz-exam.findOne | quiz-exam.read |
| POST | `/v1/admin/quiz-exams` | quiz-exam.create | quiz-exam.create |
| PUT | `/v1/admin/quiz-exams/:documentId` | quiz-exam.update | quiz-exam.update |
| DELETE | `/v1/admin/quiz-exams/:documentId` | quiz-exam.delete | quiz-exam.delete |
| GET | `/v1/admin/quiz-exams/:documentId/questions` | quiz-exam.getQuestions | quiz-exam.read |
| GET | `/v1/admin/quiz-records` | quiz-record.find | quiz-record.read |
| GET | `/v1/admin/quiz-records/:documentId` | quiz-record.findOne | quiz-record.read |
| PUT | `/v1/admin/quiz-records/:documentId/grade` | quiz-record.teacherGrade | quiz-record.grade |
| GET | `/v1/admin/quiz-records/pending-grading` | quiz-record.getPendingGrading | quiz-record.read |
| GET | `/v1/admin/quiz-exam-attempts` | quiz-exam-attempt.find | quiz-exam-attempt.read |
| GET | `/v1/admin/quiz-exam-attempts/:documentId` | quiz-exam-attempt.findOne | quiz-exam-attempt.read |
| GET | `/v1/admin/quiz-batches` | quiz-batch.find | quiz-batch.read |
| GET | `/v1/admin/quiz-batches/:documentId` | quiz-batch.findOne | quiz-batch.read |
| POST | `/v1/admin/quiz-batches` | quiz-batch.create | quiz-batch.create |
| PUT | `/v1/admin/quiz-batches/:documentId` | quiz-batch.update | quiz-batch.update |
| DELETE | `/v1/admin/quiz-batches/:documentId` | quiz-batch.delete | quiz-batch.delete |
| POST | `/v1/admin/quiz-batches/:documentId/import` | quiz-batch.importFile | quiz-batch.create |
| GET | `/v1/admin/quiz-batches/template/download` | quiz-batch.downloadTemplate | quiz-batch.read |

## Admin 路由设计

改为 `policies: []` 模式（Strapi admin session 自动认证），与 zhao-course 一致。

保留全部 28 条路由，去掉 `middlewares` 配置，改为 `policies: []`。

### 移除的路由

Content-API 中原有的以下路由移至 Admin 层（因为它们是管理操作，不应出现在 Content-API 中）：

- `quiz-record.create` — 管理员创建记录
- `quiz-record.update` — 管理员更新记录
- `quiz-record.delete` — 管理员删除记录
- `quiz-exam-attempt.create` — 管理员创建尝试
- `quiz-exam-attempt.update` — 管理员更新尝试
- `quiz-exam-attempt.delete` — 管理员删除尝试

这些路由仅保留在 Admin 路由中。

## 路由路径变化对照

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/quizzes` (content-api) | `/v1/quizzes` | 加 /v1 前缀 |
| `/quiz-exams` (content-api) | `/v1/quiz-exams` | 加 /v1 前缀 |
| `/quiz-records/submit` (content-api) | `/v1/my/quiz-records/submit` | 用户路由加 /v1/my |
| `/my/quiz-records` (content-api) | `/v1/my/quiz-records` | 加 /v1 前缀 |
| `/quiz-exam-attempts/start` (content-api) | `/v1/my/quiz-exam-attempts/start` | 用户路由加 /v1/my |
| `/quiz-exam-attempts/:documentId/submit` (content-api) | `/v1/my/quiz-exam-attempts/:documentId/submit` | 用户路由加 /v1/my |
| `/my/exam-attempts` (content-api) | `/v1/my/exam-attempts` | 加 /v1 前缀 |
| `/quiz-batches/template` (content-api) | `/v1/admin/quiz-batches/template/download` | 管理操作移至 admin 层 |
| `/quiz-exams/:documentId/questions` (content-api, take 权限) | `/v1/my/quiz-exams/:documentId/questions` | 用户参加考试获取题目 |

## 风险点

1. **路径变更**：Content-API 路由加 `/v1` 前缀，前端调用需同步更新
2. **Admin 路由认证模式变更**：从 `middlewares` 改为 `policies: []`，需验证 Strapi admin 路由行为
3. **部分路由从 content-api 移至 admin 层**：前端需确认这些路由的调用方式
