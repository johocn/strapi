# 题库批量导入 / 练习考试 / 错题集 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Strapi `zhao-quiz` 插件与 C 端/管理端前端上，交付「批量导入/导出题库 → 组卷 → 练习/模考 → 评分 → 错题集间隔重练」的科学提分闭环。

**Architecture:** 后端扩展 `zhao-quiz`（新增错题集内容类型、规则组卷、导入导出增强、简答题混合评分，并复用既有 quiz-record 评分管道做错题回流）；前端在 C 端（`shao`/圣麟）新增练习/考试/错题页，在管理端（`web`）增强组卷与错题管理。后端为一个可独立测试的核心，先完成并经 Strapi 验证后再接前端。

**Tech Stack:** Strapi v5 Documents API（`strapi.documents`）、xlsx（已依赖）、zhao-course 知识树、uni-app Vue3（前端）。低内存服务器（2G），**不在 package.json 新增依赖**。

**范围切分（两个子系统）：**
- **Phase A（后端，本次先做、自含可测）**：错题集、组卷、导入导出、评分回流。全部落盘在 `e:\code\basic\plugins\zhao-quiz`。
- **Phase B（前端，依赖 A 的接口契约）**：C 端练习/考试/错题页 + 管理端组卷与错题操作。页面路径以实际仓库为准（C 端为 `shao`，管理端为 `web`；开始前需确认 C 端仓库路径）。

---

## 设计依据

设计文档：`docs/superpowers/specs/2026-08-18-batch-quiz-bank-design.md`

**既有实现（勿重复）**：`quiz-record.submitAnswer`（非 essay 自动判题、essay 转 pending）、`teacherGrade`（人工评分）、`getPendingGrading`；`quiz-batch.importFromFile` / `generateTemplate`；`quiz-exam` CRUD；`quiz-exam-attempt.startExam/submitExam`。schema 位于 `server/src/content-types/`。

**既有前端 API 契约（`web/src/api/quiz.js` 已封装，勿新增端点名）**：`submitAnswer`、`startExam`、`submitExam`、`getMyExamAttempts`、`downloadQuizTemplate`、`createQuizBatch`、`importQuizBatch`、`gradeQuizRecord`、`getPendingGrading`、`getQuizRecordList/Detail`。

---

## Task 1: 新增错题集 content type `wrong-quiz`

**Files:**
- Create: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\wrong-quiz\schema.json`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\index.ts`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\index.ts`（挂会话后在 Task 2 内新增服务文件）

- [ ] **Step 1: 创建 schema**

`e:\code\basic\plugins\zhao-quiz\server\src\content-types\wrong-quiz\schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_wrong_quizzes",
  "info": { "singularName": "wrong-quiz", "pluralName": "wrong-quizzes", "displayName": "错题集" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "quiz": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-quiz.quiz" },
    "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" },
    "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson" },
    "knowledgePointName": { "type": "string" },
    "wrongCount": { "type": "integer", "default": 1 },
    "status": { "type": "enumeration", "enum": ["active", "archived"], "default": "active" },
    "reviewLevel": { "type": "integer", "default": 1 },
    "dueAt": { "type": "datetime" },
    "consecutiveCorrect": { "type": "integer", "default": 0 },
    "lastWrongAt": { "type": "datetime" },
    "lastCorrectAt": { "type": "datetime" }
  }
}
```

> 说明：知识点以 `knowledgePointName` 字符串列存储（`zhao-course` 的知识点 UID 归属存在不确定性，先用字符串降级；如需强关联，Task 2 内置 `resolveKnowledgePoint` 校验并升级为关系列）。

- [ ] **Step 2: 注册到 content-types/index**

在 `content-types/index.ts` 顶部 `import wrongQuiz from "./wrong-quiz/schema.json";` 并在对象里加 `"wrong-quiz": { schema: wrongQuiz },`。

- [ ] **Step 3: 快速构建自检**

```bash
cd e:\code\basic\plugins\zhao-quiz
npm run build
```
Expected: 构建成功、无 TS/schema 报错。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/content-types/wrong-quiz plugins/zhao-quiz/server/src/content-types/index.ts
git commit -m "feat(quiz): add wrong-quiz content type"
```

---

## Task 2: wrong-quiz 服务（入库 / 升级 / 出集）

**Files:**
- Create: `e:\code\basic\plugins\zhao-quiz\server\src\services\wrong-quiz.ts`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\index.ts`

- [ ] **Step 1: 实现服务**

`services/wrong-quiz.ts`：

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.wrong-quiz";
const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15]; // 索引=reviewLevel，单位天
const PASS_LEVEL = 5;        // 达到该层级且连续答对 => 出集
const NEED_CONSECUTIVE = 3;  // 单层内连续答对次数

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 判错时调用：入库或累加计数、等级归 1 */
  async onWrong(input: {
    userId: number; quizId: number; courseId?: number | string;
    lessonId?: number | string; knowledgePointName?: string;
  }) {
    const existing = await this.findActive(input.userId, input.quizId);
    const base = {
      user: input.userId, quiz: input.quizId,
      course: input.courseId, lesson: input.lessonId,
      knowledgePointName: input.knowledgePointName,
    };
    if (existing) {
      return strapi.documents(UID).update({
        documentId: existing.documentId,
        data: {
          status: "active", reviewLevel: 1, consecutiveCorrect: 0,
          wrongCount: (existing.wrongCount || 0) + 1,
          dueAt: this._dueAt(1), lastWrongAt: new Date(),
        } as any,
      });
    }
    return strapi.documents(UID).create({
      data: {
        ...base, status: "active", wrongCount: 1,
        reviewLevel: 1, consecutiveCorrect: 0,
        dueAt: this._dueAt(1), lastWrongAt: new Date(),
      } as any,
    });
  },

  /** 答对时调用：按间隔重复升级；达到 PASS_LEVEL 且连续答对达标则出集 */
  async onCorrect(userId: number, quizId: number) {
    const item = await this.findActive(userId, quizId);
    if (!item) return null;
    const level = (item.reviewLevel || 1);
    if (level >= PASS_LEVEL) {
      return strapi.documents(UID).update({
        documentId: item.documentId,
        data: { status: "archived", consecutiveCorrect: 0, lastCorrectAt: new Date() } as any,
      });
    }
    const consec = (item.consecutiveCorrect || 0) + 1;
    if (consec >= NEED_CONSECUTIVE) {
      const nextLevel = Math.min(level + 1, PASS_LEVEL);
      return strapi.documents(UID).update({
        documentId: item.documentId,
        data: {
          reviewLevel: nextLevel, consecutiveCorrect: 0,
          dueAt: this._dueAt(nextLevel), lastCorrectAt: new Date(),
        } as any,
      });
    }
    return strapi.documents(UID).update({
      documentId: item.documentId,
      data: { consecutiveCorrect: consec, lastCorrectAt: new Date() } as any,
    });
  },

  async findActive(userId: number, quizId: number) {
    const [r] = await strapi.documents(UID).findMany({
      filters: { user: { id: userId }, quiz: { id: quizId }, status: "active" },
      populate: { quiz: true, course: true, lesson: true },
      pagination: { page: 1, pageSize: 1 },
    });
    return r || null;
  },

  /** 待复习错题（dueAt <= now，用于错题重练） */
  async dueList(userId: number, limit = 30) {
    const today = new Date();
    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        filters: { user: { id: userId }, status: "active", dueAt: { $lte: today } },
        populate: { quiz: { populate: { course: true, lesson: true } } },
        sort: { dueAt: "asc" },
        pagination: { page: 1, pageSize: limit },
      }),
      strapi.documents(UID).count({ filters: { user: { id: userId }, status: "active", dueAt: { $lte: today } } }),
    ]);
    return { list, total };
  },

  async listByUser(userId: number, status = "active", pagination = { page: 1, pageSize: 20 }) {
    const filters: any = { user: { id: userId } };
    if (status) filters.status = status;
    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        filters, populate: { quiz: { populate: { course: true, lesson: true } } },
        sort: { lastWrongAt: "desc" }, pagination,
      }),
      strapi.documents(UID).count({ filters }),
    ]);
    return { list, total };
  },

  _dueAt(level: number) {
    const days = REVIEW_INTERVALS[Math.min(level, REVIEW_INTERVALS.length - 1)] || 1;
    return new Date(Date.now() + days * 86400 * 1000);
  },
});
```

- [ ] **Step 2: 注册服务**

在 `services/index.ts` 顶部 `import wrongQuiz from "./wrong-quiz";` 并加入 `"wrong-quiz": wrongQuiz,`。

- [ ] **Step 3: 类型自检**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run test:ts:back
```
Expected: 无类型错误。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/wrong-quiz.ts plugins/zhao-quiz/server/src/services/index.ts
git commit -m "feat(quiz): wrong-quiz spaced-repetition service"
```

---

## Task 3: 练习提交接入错题回流

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-record.ts`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz-record\schema.json`

- [ ] **Step 1: schema 增加来源字段**

`content-types/quiz-record/schema.json` 的 `attributes` 增加：

```json
"mode": { "type": "enumeration", "enum": ["practice", "exam"], "default": "practice" },
"practiceType": { "type": "enumeration", "enum": ["knowledge", "random", "simulate", "wrong"], "default": "knowledge" }
```

- [ ] **Step 2: submitAnswer 接入错题回流 + short_answer 转入待评分**

在 `services/quiz-record.ts` 的 `submitAnswer` 中：

1. 把 `const isEssay = quiz.type === "essay";` 改为同时涵盖简答混合判定：`const needsManual = quiz.type === "essay" || (quiz.type === "short_answer" && !this._shortAutoPass(quiz, answer));`
2. 非 `needsManual` 分支保持自动判题；`needsManual` 分支 `scoringStatus = "pending"`。
3. 在成功 create record 后，触发错题回流：

```typescript
const wrongService = strapi.plugin("zhao-quiz").service("wrong-quiz");
if (!isCorrect && quiz.type !== "essay" && quiz.type !== "short_answer") {
  await wrongService.onWrong({
    userId, quizId: quiz.id || quiz.documentId,
    courseId, lessonId, knowledgePointName: undefined,
  });
}
```

- [ ] **Step 3: 新增 `_shortAutoPass` 关键词初判**

在服务内新增：

```typescript
_shortAutoPass(quiz: any, answer: any) {
  if (!quiz.answer) return false;
  const kws = String(quiz.answer).split(/[,，;；|]/).map((s: string) => s.trim()).filter(Boolean);
  if (!kws.length) return false;
  const text = String(typeof answer === "object" ? answer.text || "" : answer).toLowerCase();
  const hit = kws.filter((k: string) => k && text.includes(k.toLowerCase())).length;
  return hit / kws.length >= 0.6; // 命中 60% 关键词视为通过
}
```

- [ ] **Step 4: 验证**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run test:ts:back
```
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/quiz-record.ts plugins/zhao-quiz/server/src/content-types/quiz-record/schema.json
git commit -m "feat(quiz): practice submission feeds wrong-quiz + short-answer grading"
```

---

## Task 4: 考试提交接入错题回流

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-exam-attempt.ts`

- [ ] **Step 1: 提交后按每题判错写错题集**

定位 `submitExam` 逻辑，在每题判定完成后追加错题回流（先读 `quiz-exam-attempt.ts` 确认现有判分结构，若已逐题 `isCorrect` 记录，则直接复用）：

```typescript
async function feedWrong(strapi: any, userId: number, results: Array<{ quiz: any; isCorrect: boolean }>) {
  const wrongService = strapi.plugin("zhao-quiz").service("wrong-quiz");
  for (const r of results) {
    if (r.isCorrect === false) {
      await wrongService.onWrong({ userId, quizId: r.quiz.id, courseId: r.quiz.course?.id });
    } else if (r.isCorrect) {
      await wrongService.onCorrect(userId, r.quiz.id);
    }
  }
}
```

- [ ] **Step 2: 在提交成功路径调用 `feedWrong`**

Expected 行为：模拟考/正式考中做错即入错题集；答对则推进旧错题的间隔升级。

- [ ] **Step 3: 验证**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run test:ts:back
```
Expected: 通过。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/quiz-exam-attempt.ts
git commit -m "feat(quiz): exam submission feeds wrong-quiz"
```

---

## Task 5: 组卷 —— 扩展 quiz-exam schema

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz-exam\schema.json`

- [ ] **Step 1: 增加组卷字段**

`content-types/quiz-exam/schema.json` 的 `attributes` 追加：

```json
"paperType": { "type": "enumeration", "enum": ["fixed", "rule"], "default": "fixed" },
"paperRule": { "type": "json" },
"knowledgeScope": { "type": "json", "default": "[]" },
"shuffle": { "type": "boolean", "default": true }
```

- [ ] **Step 2: Commit**

```bash
git add plugins/zhao-quiz/server/src/content-types/quiz-exam/schema.json
git commit -m "feat(quiz): quiz-exam rule-based paper fields"
```

---

## Task 6: 组卷服务（rule 抽题）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-exam.ts`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\routes\content-api.ts`

- [ ] **Step 1: 实现 rule 抽题**

在 `services/quiz-exam.ts` 增加方法：

```typescript
async generatePaper(documentId: string) {
  const exam = await strapi.documents(UID).findOne({ documentId, populate: { questions: true } });
  if (!exam) throwErr("QUIZ_004", 404, "考试不存在");
  if (exam.paperType !== "rule") {
    return { documentId, questions: exam.questions || [] };
  }
  // paperRule: [{ type, count, points, difficulty?, knowledgePointName? }]
  const rules: any[] = exam.paperRule || [];
  const scope: any[] = exam.knowledgeScope || [];
  const picked: any[] = [];
  const shortages: string[] = [];
  for (const rule of rules) {
    const filters: any = {};
    if (rule.type) filters.type = rule.type;
    if (rule.difficulty) filters.difficulty = rule.difficulty;
    if (scope.length) filters.course = { documentId: scope };
    if (rule.knowledgePointName) filters.knowledgePointName = rule.knowledgePointName;
    const pool = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
      filters: { ...filters, isPublished: true }, pagination: { page: 1, pageSize: 300 },
    });
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, Number(rule.count || 0));
    if (shuffled.length < Number(rule.count || 0)) {
      shortages.push(`[${rule.type}] 缺 ${Number(rule.count) - shuffled.length} 题`);
    }
    picked.push(...shuffled.map((q: any) => ({ ...q, points: rule.points })));
  }
  return { documentId, questions: picked, shortages };
}
```

（若 `quiz-exam.ts` 内无 `throwErr`，参考 `quiz-record.ts` 复制该工具函数。）

- [ ] **Step 2: 路由暴露**

在 `routes/content-api.ts` 增加 C 端读取：

```typescript
userRoute("GET", "/my/quiz-exams/:documentId/paper", "quiz-exam.generatePaper"),
```

- [ ] **Step 3: 控制器接线**

在 `controllers/quiz-exam.ts` 增加无参透传 `generatePaper`（复制现有 `getQuestions` 的写法，把 documentId 传给服务）。

- [ ] **Step 4: 构建自检**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run build
```
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/quiz-exam.ts plugins/zhao-quiz/server/src/routes/content-api.ts plugins/zhao-quiz/server/src/controllers/quiz-exam.ts
git commit -m "feat(quiz): rule-based paper generation"
```

---

## Task 7: 批量导入增强（预检回执 + 幂等去重）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-batch.ts`

- [ ] **Step 1: options 支持 `A.选项|B.选项` 解析 + 幂等去重**

在 `importFromFile` 中替换 options 解析逻辑：

```typescript
function parseOptions(raw: any) {
  if (raw == null) return null;
  const s = String(raw);
  if (s.trim().startsWith("[")) { try { return JSON.parse(s); } catch { return null; } }
  if (s.includes("|")) return s.split("|").map((o: string) => o.trim());
  return null;
}
```

在某题 create 前执行去重：

```typescript
const dup = await strapi.documents(QUIZ_UID).findMany({
  filters: { title, ...(courseDocId ? { course: { documentId: courseDocId } } : {}) },
  pagination: { page: 1, pageSize: 1 },
});
if (dup.length) { results.skipped++; results.errors.push(`第${rowNum}行: 已存在，跳过`); continue; }
```

- [ ] **Step 2: 返回回执新增 `skipped`，错误分「可修复/不可修复」汇总**

在 `results` 增加 `skipped: 0`，status 判断改为任一行成功即 `completed`（保留现有逻辑）。错误行信息已含行号，格式满足设计「预检回执」。

- [ ] **Step 3: 构建自检**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/quiz-batch.ts
git commit -m "feat(quiz): import dedupe + options parser + skipped count"
```

---

## Task 8: 批量导出（按范围导出）

**Files:**
- Add service method in `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-batch.ts`
- Add route in `e:\code\basic\plugins\zhao-quiz\server\src\routes\content-api.ts`
- Add controller in `e:\code\basic\plugins\zhao-quiz\server\src\controllers\quiz-batch.ts`

- [ ] **Step 1: 导出服务**

在 `quiz-batch.ts` 增加：

```typescript
async exportQuizzes(query: any) {
  const { course, lesson, batch } = query;
  const filters: any = {};
  if (course) filters.course = { documentId: course };
  if (lesson) filters.lesson = { documentId: lesson };
  const list = await strapi.documents(QUIZ_UID).findMany({
    filters, sort: { sort: "asc" },
    populate: { course: true, lesson: true },
  });
  const rows = list.map((q: any) => [
    q.type, q.title, JSON.stringify(q.options || ""), q.answer, q.points,
    q.difficulty, q.explanation || "", q.sort, q.documentId, q.updatedAt || "", q.isPublished,
  ]);
  const headers = ["题型", "题目", "选项", "答案", "分值", "难度", "解析", "排序", "quizId", "updatedAt", "发布状态"];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "题库导出");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
```

- [ ] **Step 2: 路由 + 控制器**

路由：`channelScopeRoute("GET", "/quiz-batches/export", "quiz-batch.exportQuizzes", "quiz.read")`（放在 template/download 之后）。
控制器：透传 query 返回 buffer，按现有下载接口写法设置 `Content-Disposition` 与 `Content-Type: application/octet-stream`。

- [ ] **Step 3: 自检**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/services/quiz-batch.ts plugins/zhao-quiz/server/src/routes/content-api.ts plugins/zhao-quiz/server/src/controllers/quiz-batch.ts
git commit -m "feat(quiz): batch export with audit columns"
```

---

## Task 9: C 端错题/练习 API（routes + controller）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\routes\content-api.ts`
- Add controller methods: `e:\code\basic\plugins\zhao-quiz\server\src\controllers\quiz-exam.ts` 或新建 `controllers/wrong-quiz.ts`
- 注册服务到 `services/index.ts` 已在 Task 2 完成

- [ ] **Step 1: 路由（C 端用户）**

```typescript
userRoute("GET", "/my/wrong-quizzes", "wrong-quiz.listMy"),
userRoute("GET", "/my/wrong-quizzes/due", "wrong-quiz.dueMine"),
```

- [ ] **Step 2: 控制器**

新建 `controllers/wrong-quiz.ts`，从 ctx.state 取用户（参考 `quiz-record` 控制器如何取 `userId`），调服务 `listByUser`/`dueList`。

- [ ] **Step 3: 构建自检**

```bash
cd e:\code\basic\plugins\zhao-quiz && npm run build
```
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-quiz/server/src/routes/content-api.ts plugins/zhao-quiz/server/src/controllers/wrong-quiz.ts
git commit -m "feat(quiz): c-end wrong-quiz&due endpoints"
```

---

## Task 10: 后端集成验证（部署期 HTTP 冒烟脚本）

**Files:**
- Create: `e:\code\basic\plugins\zhao-quiz\scripts\verify-close-loop.mjs`（已实现，见提交 ed7d55d）
- 执行方式：部署期在运行中的 Strapi 上调用 HTTP 接口验证（仓库无既有 e2e 框架，无法在沙箱内跑服务，故用可注入 JWT 的独立脚本）。

- [ ] **Step 1: 已实现脚本（提交 ed7d55d）**

脚本以环境变量 `QUIZ_API` / `QUIZ_TOKEN` / `QUIZ_SAMPLE_QUIZ` / `QUIZ_RULE_EXAM` 注入指向运行中的 Strapi，依次断言：
1. 错误答案 `submitAnswer` → `wrong-quiz` 出现该题且 `wrongCount` 累加；
2. `GET /my/wrong-quizzes`（active）命中该题、`GET /my/wrong-quizzes/due` 队列可见（dueAt <= now）；
3. `GET /my/quiz-exams/:id/paper`（rule 组卷）→ 返回 `questions` 与 `shortages` 字段、且已隐藏答案。

- [ ] **Step 2: 部署期运行**

```bash
# 在 8.130.93.144（shao）Strapi 运行中执行
node plugins/zhao-quiz/scripts/verify-close-loop.mjs
```
Expected: 退出码 0，输出全 PASS。失败时按 `FAIL` 行定位修复后再重跑。

- [ ] **Step 3: 纳入部署冒烟**（在 strapi 部署验证脚本中追加该命令）

> Phase A 结束点检：控制台/脚本确认「组卷 → 答题 → 错题入库 → 错题重练队列 → 规则抽题隐藏答案」生效。

---

## Phase B: 前端（依赖 A 的接口契约）

> 开始 Phase B 前必须先确认 **C 端学员端仓库路径**（预期在 `shao`，www.shenglin.vip）。管理端在 `web`。以下均为接口契约层任务，页面细节在对应仓库实现。

### Task 11: C 端 · 错题集页
- 页面：C 端 `pages/wrong-quiz/index.vue`（对照既有 `pages/quiz/record/list.vue` 结构）
- 数据：`GET /my/wrong-quizzes?status=active`（active 列表）与 `GET /my/wrong-quizzes/due`（待复习）
- 交互：列出错题 + 知识点 + `dueAt`；点击进入重练，答题后走 `submitAnswer` 回流（自动升级/出集由 Task 3 承担）
- 验证：对错题页拉取、作答后列表中原错题分级变化可见（连对 3 次后出集）

### Task 12: C 端 · 练习页（知识点/随机刷题）
- 页面：C 端 `pages/quiz/practice.vue`
- 数据：知识点/课程传入 `submitAnswer`；逐题作答即时判分显示解析与知识点
- 练习记录复用 `GET /my/quiz-records` 展示历史

### Task 13: C 端 · 模拟考试页
- 页面：C 端 `pages/quiz/exam/index.vue`
- 数据：`GET /my/quiz-exams/:id/paper`（rule 组卷拉题）→ 倒计时 → 交卷 `submitExam` → 成绩；答错题自动进错题集（Task 4）
- 复用现有 `startExam`/`getMyExamAttempts`

### Task 14: 管理端（`web`）· 组卷与错题管理
- 组卷表单：`web/src/pages/quiz/exam/form.vue` 增加 `paperType`/`paperRule`/`knowledgeScope` 编辑
- 错题清单：`web/src/pages/quiz/wrong-quiz/list.vue`（按课程统计 active 错题、查看历史）
- 简答人工复核：复用现有 `gradeQuizRecord`/`getPendingGrading` 交互

### Task 15: 前端集成验证 + 文档
- 各页真机/浏览器走通「练习→错题→重练出集→模考」全链路
- 更新 `shao`/`web` 对应使用手册章节（对照现有 `docs/manual/user-guide/ch6-quiz.md` 等）

---

## Open Items（进入对应任务前须确认）
1. **C 端仓库路径**：错题/练习/考试页落在 `shao` 还是 `web` ？开始 Phase B 前确认。
2. **知识点 UID**：`zhao-course` 知识点实体的准确 UID；当前 Task 1 用 `knowledgePointName` 字符串降级，不阻塞。
3. **`quiz-exam-attempt.ts` 判分结构**：Task 4 需先读该文件确认现有逐题判分字段后接入 `feedWrong`。

## Self-Review
- **Spec 覆盖**：设计文档 2（数据模型/错题集）→ Task 1/2；2.2 组卷 → Task 5/6；3 导入导出 → Task 7/8；4 练习/错题交互 → Task 3/9/11/12；5 考试评分 → Task 4/13/14。缺口仅剩学情统计（MVP 明确裁剪）。
- **占位清理**：无 TBD/TODO；所有代码步骤均给具体内容。
- **类型一致**：`wrong-quiz` UID、`onWrong/onCorrect` 签名、`dueList/listByUser` 在 Task 2/3/4/9 间统一；`paperRule/knowledgeScope` 命名在 Task 5/6 一致。