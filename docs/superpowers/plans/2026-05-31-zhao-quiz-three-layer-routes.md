# zhao-quiz 三层路由改造 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 zhao-quiz 路由从 2 层改造为 3 层（公开/用户/管理员），对齐 zhao-course 模式

**Architecture:** Content-API 引入 publicRoute/userRoute/adminRoute 辅助函数分层；Admin 路由改为 policies:[] 模式；Controller/Service/Schema 零改动

**Tech Stack:** Strapi 5, TypeScript, zhao-auth 中间件

---

### Task 1: 重写 Content-API 路由

**Files:**
- Modify: `e:\code\plugins\zhao-quiz\server\src\routes\content-api.ts`

- [ ] **Step 1: 重写 content-api.ts**

将整个文件替换为以下内容：

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

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/quizzes", "quiz.find"),
    publicRoute("GET", "/quizzes/:documentId", "quiz.findOne"),
    publicRoute("GET", "/quiz-exams", "quiz-exam.find"),
    publicRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne"),

    // ===== 用户路由 =====
    userRoute("POST", "/my/quiz-records/submit", "quiz-record.submitAnswer"),
    userRoute("GET", "/my/quiz-records", "quiz-record.getUserRecords"),
    userRoute("POST", "/my/quiz-exam-attempts/start", "quiz-exam-attempt.startExam"),
    userRoute("POST", "/my/quiz-exam-attempts/:documentId/submit", "quiz-exam-attempt.submitExam"),
    userRoute("GET", "/my/exam-attempts", "quiz-exam-attempt.getUserAttempts"),
    userRoute("GET", "/my/quiz-exams/:documentId/questions", "quiz-exam.getQuestions"),

    // ===== 管理员路由 =====
    adminRoute("GET", "/quizzes", "quiz.find", "quiz.read"),
    adminRoute("GET", "/quizzes/:documentId", "quiz.findOne", "quiz.read"),
    adminRoute("POST", "/quizzes", "quiz.create", "quiz.create"),
    adminRoute("PUT", "/quizzes/:documentId", "quiz.update", "quiz.update"),
    adminRoute("DELETE", "/quizzes/:documentId", "quiz.delete", "quiz.delete"),

    adminRoute("GET", "/quiz-exams", "quiz-exam.find", "quiz-exam.read"),
    adminRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne", "quiz-exam.read"),
    adminRoute("POST", "/quiz-exams", "quiz-exam.create", "quiz-exam.create"),
    adminRoute("PUT", "/quiz-exams/:documentId", "quiz-exam.update", "quiz-exam.update"),
    adminRoute("DELETE", "/quiz-exams/:documentId", "quiz-exam.delete", "quiz-exam.delete"),
    adminRoute("GET", "/quiz-exams/:documentId/questions", "quiz-exam.getQuestions", "quiz-exam.read"),

    adminRoute("GET", "/quiz-records", "quiz-record.find", "quiz-record.read"),
    adminRoute("GET", "/quiz-records/:documentId", "quiz-record.findOne", "quiz-record.read"),
    adminRoute("PUT", "/quiz-records/:documentId/grade", "quiz-record.teacherGrade", "quiz-record.grade"),
    adminRoute("GET", "/quiz-records/pending-grading", "quiz-record.getPendingGrading", "quiz-record.read"),

    adminRoute("GET", "/quiz-exam-attempts", "quiz-exam-attempt.find", "quiz-exam-attempt.read"),
    adminRoute("GET", "/quiz-exam-attempts/:documentId", "quiz-exam-attempt.findOne", "quiz-exam-attempt.read"),

    adminRoute("GET", "/quiz-batches", "quiz-batch.find", "quiz-batch.read"),
    adminRoute("GET", "/quiz-batches/:documentId", "quiz-batch.findOne", "quiz-batch.read"),
    adminRoute("POST", "/quiz-batches", "quiz-batch.create", "quiz-batch.create"),
    adminRoute("PUT", "/quiz-batches/:documentId", "quiz-batch.update", "quiz-batch.update"),
    adminRoute("DELETE", "/quiz-batches/:documentId", "quiz-batch.delete", "quiz-batch.delete"),
    adminRoute("POST", "/quiz-batches/:documentId/import", "quiz-batch.importFile", "quiz-batch.create"),
    adminRoute("GET", "/quiz-batches/template/download", "quiz-batch.downloadTemplate", "quiz-batch.read"),
  ],
});
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit --project e:\code\plugins\zhao-quiz\server\tsconfig.json`
Expected: 无错误

---

### Task 2: 重写 Admin 路由

**Files:**
- Modify: `e:\code\plugins\zhao-quiz\server\src\routes\admin.ts`

- [ ] **Step 1: 重写 admin.ts**

将整个文件替换为以下内容（policies: [] 模式，与 zhao-course 一致）：

```typescript
export default () => ({
  type: "admin" as const,
  routes: [
    { method: "GET" as const, path: "/quizzes", handler: "quiz.find", config: { policies: [] } },
    { method: "GET" as const, path: "/quizzes/:documentId", handler: "quiz.findOne", config: { policies: [] } },
    { method: "POST" as const, path: "/quizzes", handler: "quiz.create", config: { policies: [] } },
    { method: "PUT" as const, path: "/quizzes/:documentId", handler: "quiz.update", config: { policies: [] } },
    { method: "DELETE" as const, path: "/quizzes/:documentId", handler: "quiz.delete", config: { policies: [] } },

    { method: "GET" as const, path: "/quiz-records", handler: "quiz-record.find", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-records/:documentId", handler: "quiz-record.findOne", config: { policies: [] } },
    { method: "POST" as const, path: "/quiz-records", handler: "quiz-record.create", config: { policies: [] } },
    { method: "PUT" as const, path: "/quiz-records/:documentId", handler: "quiz-record.update", config: { policies: [] } },
    { method: "DELETE" as const, path: "/quiz-records/:documentId", handler: "quiz-record.delete", config: { policies: [] } },
    { method: "PUT" as const, path: "/quiz-records/:documentId/grade", handler: "quiz-record.teacherGrade", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-records/pending-grading", handler: "quiz-record.getPendingGrading", config: { policies: [] } },

    { method: "GET" as const, path: "/quiz-exams", handler: "quiz-exam.find", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.findOne", config: { policies: [] } },
    { method: "POST" as const, path: "/quiz-exams", handler: "quiz-exam.create", config: { policies: [] } },
    { method: "PUT" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.update", config: { policies: [] } },
    { method: "DELETE" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.delete", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-exams/:documentId/questions", handler: "quiz-exam.getQuestions", config: { policies: [] } },

    { method: "GET" as const, path: "/quiz-exam-attempts", handler: "quiz-exam-attempt.find", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-exam-attempts/:documentId", handler: "quiz-exam-attempt.findOne", config: { policies: [] } },
    { method: "POST" as const, path: "/quiz-exam-attempts", handler: "quiz-exam-attempt.create", config: { policies: [] } },
    { method: "PUT" as const, path: "/quiz-exam-attempts/:documentId", handler: "quiz-exam-attempt.update", config: { policies: [] } },
    { method: "DELETE" as const, path: "/quiz-exam-attempts/:documentId", handler: "quiz-exam-attempt.delete", config: { policies: [] } },

    { method: "GET" as const, path: "/quiz-batches", handler: "quiz-batch.find", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-batches/:documentId", handler: "quiz-batch.findOne", config: { policies: [] } },
    { method: "POST" as const, path: "/quiz-batches", handler: "quiz-batch.create", config: { policies: [] } },
    { method: "PUT" as const, path: "/quiz-batches/:documentId", handler: "quiz-batch.update", config: { policies: [] } },
    { method: "DELETE" as const, path: "/quiz-batches/:documentId", handler: "quiz-batch.delete", config: { policies: [] } },
    { method: "POST" as const, path: "/quiz-batches/:documentId/import", handler: "quiz-batch.importFile", config: { policies: [] } },
    { method: "GET" as const, path: "/quiz-batches/template/download", handler: "quiz-batch.downloadTemplate", config: { policies: [] } },
  ],
});
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit --project e:\code\plugins\zhao-quiz\server\tsconfig.json`
Expected: 无错误

---

### Task 3: 运行全量测试验证

- [ ] **Step 1: 运行 zhao-quiz 全量测试**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz" --no-cache`
Expected: 所有测试通过

- [ ] **Step 2: 检查是否有过时的 .js 编译文件**

Run: `dir /s /b e:\code\plugins\zhao-quiz\server\src\routes\*.js`
Expected: 无输出（不应有 .js 编译文件残留）

如果存在 .js 文件，删除它们。

---

### Task 4: 提交

- [ ] **Step 1: 提交改动**

```bash
cd e:\code
git add plugins/zhao-quiz/server/src/routes/content-api.ts plugins/zhao-quiz/server/src/routes/admin.ts
git commit -m "refactor: zhao-quiz 三层路由改造，对齐 zhao-course 模式"
```
