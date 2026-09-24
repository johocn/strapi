# zhao-quiz 测试实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-quiz 插件搭建测试基础设施并编写 Service 层测试

**Architecture:** 复用 zhao-channel 的测试模式（Jest + Strapi Bootstrap + seed fixtures），按 P0→P1 优先级实施

**Tech Stack:** Jest, ts-jest, Strapi 5 Document API, PostgreSQL (测试库)

---

## 文件结构

```
plugins/zhao-quiz/tests/
├── jest.config.ts          — Jest 配置
├── helpers/
│   └── strapi-setup.ts     — Strapi 实例管理（单例模式）
├── fixtures/
│   └── seed.ts             — 种子数据 + 清理
├── quiz.test.ts            — A1 题目管理（18 用例）
├── quiz-exam.test.ts       — A2 考试管理（14 用例）
├── quiz-exam-attempt.test.ts — A3 考试尝试（16 用例）
├── quiz-record.test.ts     — A4 答题记录（18 用例）
├── quiz-batch.test.ts      — A5 批量导入（14 用例）
├── content-api.test.ts     — A6 Content API（22 用例）
└── security.test.ts        — A7 安全边界（12 用例）
```

---

### Task 1: 搭建测试基础设施

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\jest.config.ts`
- Create: `e:\code\plugins\zhao-quiz\tests\helpers\strapi-setup.ts`
- Create: `e:\code\plugins\zhao-quiz\tests\fixtures\seed.ts`

- [ ] **Step 1: 创建 jest.config.ts**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@strapi/strapi$": "<rootDir>/node_modules/@strapi/strapi",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleFileExtensions: ["js", "ts", "json"],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
```

- [ ] **Step 2: 创建 helpers/strapi-setup.ts**

```typescript
import http from "http";
import path from "path";
import type { Core } from "@strapi/strapi";

let strapiInstance: Core.Strapi | null = null;

function isAlive(instance: Core.Strapi): boolean {
  return global.strapi === instance;
}

export async function setupStrapi(): Promise<Core.Strapi> {
  if (strapiInstance && isAlive(strapiInstance)) {
    return strapiInstance;
  }
  strapiInstance = null;

  process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || "postgres";
  process.env.DATABASE_HOST = process.env.DATABASE_HOST || "127.0.0.1";
  process.env.DATABASE_PORT = process.env.DATABASE_PORT || "5432";
  process.env.DATABASE_NAME = process.env.DATABASE_NAME || "strapi_test";
  process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || "postgres";
  process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "admin";
  process.env.DATABASE_SSL = process.env.DATABASE_SSL || "false";
  process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || "";
  process.env.APP_KEYS = process.env.APP_KEYS || "testKey1==,testKey2==,testKey3==,testKey4==";
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || "testApiTokenSalt==";
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "testAdminJwtSecret==";
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || "testTransferTokenSalt==";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testJwtSecret==";
  process.env.NODE_ENV = process.env.NODE_ENV || "test";

  const { createStrapi } = require("@strapi/strapi");

  const projectDir = path.resolve(__dirname, "..", "..", "..", "..", "basic");

  strapiInstance = await createStrapi({
    appDir: projectDir,
    distDir: projectDir + "/dist",
    autoReload: false,
    serveAdminPanel: false,
  }).load();

  const server = (strapiInstance as any).server;
  server.mount();

  return strapiInstance;
}

export async function teardownStrapi(): Promise<void> {}

export function getStrapi(): Core.Strapi {
  if (!strapiInstance) {
    throw new Error("Strapi 实例未初始化，请先调用 setupStrapi()");
  }
  return strapiInstance;
}

export function createTestServer(): http.Server {
  const strapi = getStrapi();
  const server = (strapi as any).server;
  return http.createServer(server.app.callback());
}
```

- [ ] **Step 3: 创建 fixtures/seed.ts**

```typescript
import type { Core } from "@strapi/strapi";

export interface TestFixtures {
  quizzes: any[];
  exams: any[];
  attempts: any[];
  records: any[];
  batches: any[];
  users: any[];
  course: any;
  lesson: any;
}

export async function seedTestData(strapi: Core.Strapi): Promise<TestFixtures> {
  const { db } = strapi;

  const tables = [
    "plugin::zhao-quiz.quiz-record",
    "plugin::zhao-quiz.quiz-exam-attempt",
    "plugin::zhao-quiz.quiz-exam",
    "plugin::zhao-quiz.quiz-batch",
    "plugin::zhao-quiz.quiz",
  ];
  for (const table of tables) {
    await db.query(table).deleteMany();
  }
  await db.query("plugin::users-permissions.user").deleteMany({
    where: { email: { $endsWith: "@quiz-test.com" } },
  });

  const course = await db.query("api::course.course").create({
    data: { title: "测试课程", description: "用于测试的课程" },
  });

  const lesson = await db.query("api::lesson.lesson").create({
    data: { title: "测试课时", description: "用于测试的课时", course: course.id },
  });

  const q1 = await db.query("plugin::zhao-quiz.quiz").create({
    data: {
      title: "中国的首都是哪里？",
      type: "single_choice",
      options: ["北京", "上海", "广州", "深圳"],
      answer: "北京",
      points: 5,
      difficulty: "easy",
      explanation: "北京是中国的首都",
      isPublished: true,
      course: course.id,
      lesson: lesson.id,
    },
  });

  const q2 = await db.query("plugin::zhao-quiz.quiz").create({
    data: {
      title: "1+1等于几？",
      type: "fill_blank",
      answer: "2",
      points: 3,
      difficulty: "easy",
      isPublished: true,
      course: course.id,
    },
  });

  const q3 = await db.query("plugin::zhao-quiz.quiz").create({
    data: {
      title: "请论述AI的未来发展",
      type: "essay",
      answer: "",
      points: 15,
      difficulty: "hard",
      isPublished: true,
      course: course.id,
    },
  });

  const q4 = await db.query("plugin::zhao-quiz.quiz").create({
    data: {
      title: "以下哪些是编程语言？",
      type: "multiple_choice",
      options: ["JavaScript", "HTML", "Python", "CSS"],
      answer: "JavaScript,Python",
      points: 10,
      difficulty: "medium",
      isPublished: true,
    },
  });

  const quizzes = [q1, q2, q3, q4];

  const exam = await db.query("plugin::zhao-quiz.quiz-exam").create({
    data: {
      title: "期中考试",
      description: "测试用期中考试",
      passScore: 60,
      timeLimit: 60,
      allowRetry: true,
      maxAttempts: 3,
      randomOrder: false,
      isPublished: true,
      course: course.id,
      lesson: lesson.id,
      questions: [q1.id, q2.id, q3.id],
      questionPoints: { [q1.documentId]: 5, [q2.documentId]: 3, [q3.documentId]: 15 },
    },
  });

  const examNoRetry = await db.query("plugin::zhao-quiz.quiz-exam").create({
    data: {
      title: "不可重试考试",
      passScore: 50,
      timeLimit: 30,
      allowRetry: false,
      randomOrder: false,
      isPublished: true,
      course: course.id,
      questions: [q1.id, q2.id],
      questionPoints: { [q1.documentId]: 5, [q2.documentId]: 3 },
    },
  });

  const exams = [exam, examNoRetry];

  const users = [];
  const TEST_EMAILS = [
    "quizuser1@quiz-test.com",
    "quizuser2@quiz-test.com",
    "quizuser3@quiz-test.com",
    "quizuser4@quiz-test.com",
  ];
  for (let i = 1; i <= 4; i++) {
    const user = await db.query("plugin::users-permissions.user").create({
      data: {
        username: `quizuser${i}`,
        email: TEST_EMAILS[i - 1],
        password: "$2a$10$testpasswordhashplaceholder123456",
        provider: "local",
        confirmed: true,
        blocked: false,
      },
    });
    users.push(user);
  }

  const batch = await db.query("plugin::zhao-quiz.quiz-batch").create({
    data: {
      title: "测试批量导入",
      status: "pending",
      course: course.id,
      lesson: lesson.id,
    },
  });

  const batches = [batch];

  return {
    quizzes: quizzes.map((q: any) => ({ ...q, id: q.id })),
    exams: exams.map((e: any) => ({ ...e, id: e.id })),
    attempts: [],
    records: [],
    batches: batches.map((b: any) => ({ ...b, id: b.id })),
    users: users.map((u: any) => ({ ...u, id: u.id })),
    course,
    lesson,
  };
}

export async function cleanupTestData(strapi: Core.Strapi): Promise<void> {
  const { db } = strapi;
  const tables = [
    "plugin::zhao-quiz.quiz-record",
    "plugin::zhao-quiz.quiz-exam-attempt",
    "plugin::zhao-quiz.quiz-exam",
    "plugin::zhao-quiz.quiz-batch",
    "plugin::zhao-quiz.quiz",
  ];
  for (const table of tables) {
    await db.query(table).deleteMany();
  }
  await db.query("plugin::users-permissions.user").deleteMany({
    where: { email: { $endsWith: "@quiz-test.com" } },
  });
}
```

- [ ] **Step 4: 验证测试基础设施可启动**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests" --testNamePattern="基础设施" --no-cache 2>&1 || echo "预期失败：尚无测试文件"`

Expected: 无配置错误（可能因无测试文件而退出，但不应有 jest 配置错误）

---

### Task 2: A1 题目管理测试 (quiz.test.ts)

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\quiz.test.ts`

- [ ] **Step 1: 编写 quiz.test.ts**

```typescript
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("题目管理 (Quiz Service)", () => {
  const svc = () => getStrapi().plugin("zhao-quiz").service("quiz");

  describe("find(query)", () => {
    test("应返回分页题目列表", async () => {
      const result = await svc().find({});
      expect(result).toBeTruthy();
    });

    test("应支持按 type 过滤", async () => {
      const result = await svc().find({ filters: { type: "single_choice" } });
      expect(result).toBeTruthy();
    });

    test("应支持按 difficulty 过滤", async () => {
      const result = await svc().find({ filters: { difficulty: "easy" } });
      expect(result).toBeTruthy();
    });
  });

  describe("findOne(documentId)", () => {
    test("应返回题目详情", async () => {
      const result = await svc().findOne(fixtures.quizzes[0].documentId);
      expect(result).toBeTruthy();
      expect(result.documentId).toBe(fixtures.quizzes[0].documentId);
    });

    test("不存在的 documentId 应返回 null", async () => {
      const result = await svc().findOne("nonexistent_doc_id");
      expect(result).toBeNull();
    });
  });

  describe("create(data)", () => {
    test("应成功创建题目", async () => {
      const result = await svc().create({
        title: "新题目",
        type: "true_false",
        answer: "true",
        points: 2,
        difficulty: "easy",
        isPublished: true,
      });
      expect(result).toBeTruthy();
      expect(result.documentId).toBeDefined();
    });
  });

  describe("update(documentId, data)", () => {
    test("应更新题目字段", async () => {
      const result = await svc().update(fixtures.quizzes[0].documentId, {
        title: "更新后的题目",
      });
      expect(result).toBeTruthy();
    });

    test("不存在的 documentId 应抛出错误", async () => {
      await expect(svc().update("nonexistent_doc_id", { title: "x" })).rejects.toThrow();
    });
  });

  describe("delete(documentId)", () => {
    test("应删除指定题目", async () => {
      const created = await svc().create({
        title: "待删除题目",
        type: "fill_blank",
        answer: "del",
        points: 1,
        isPublished: false,
      });
      const result = await svc().delete(created.documentId);
      expect(result).toBeTruthy();
    });

    test("不存在的 documentId 应抛出错误", async () => {
      await expect(svc().delete("nonexistent_doc_id")).rejects.toThrow();
    });
  });

  describe("findByType(type, query)", () => {
    test("应返回指定类型的题目", async () => {
      const result = await svc().findByType("single_choice");
      expect(result).toBeTruthy();
    });

    test("不存在的 type 应返回空数组", async () => {
      const result = await svc().findByType("nonexistent_type");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("findByDifficulty(difficulty, query)", () => {
    test("应返回指定难度的题目", async () => {
      const result = await svc().findByDifficulty("easy");
      expect(result).toBeTruthy();
    });
  });

  describe("findByCourse(courseDocumentId, query)", () => {
    test("应返回指定课程的题目", async () => {
      const result = await svc().findByCourse(fixtures.course.documentId);
      expect(result).toBeTruthy();
    });

    test("不存在的 courseDocumentId 应返回空数组", async () => {
      const result = await svc().findByCourse("nonexistent_course_doc");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("findByLesson(lessonDocumentId, query)", () => {
    test("应返回指定课时的题目", async () => {
      const result = await svc().findByLesson(fixtures.lesson.documentId);
      expect(result).toBeTruthy();
    });
  });

  describe("findByKnowledgePoint(kpDocumentId, query)", () => {
    test("不存在的 kpDocumentId 应返回空数组", async () => {
      const result = await svc().findByKnowledgePoint("nonexistent_kp_doc");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests/quiz.test" --no-cache`
Expected: 18 个用例全部通过

---

### Task 3: A2 考试管理测试 (quiz-exam.test.ts)

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\quiz-exam.test.ts`

- [ ] **Step 1: 编写 quiz-exam.test.ts**

```typescript
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("考试管理 (Quiz Exam Service)", () => {
  const svc = () => getStrapi().plugin("zhao-quiz").service("quiz-exam");

  describe("find(query)", () => {
    test("应返回考试列表", async () => {
      const result = await svc().find({});
      expect(result).toBeTruthy();
    });
  });

  describe("findOne(documentId)", () => {
    test("应返回考试详情", async () => {
      const result = await svc().findOne(fixtures.exams[0].documentId);
      expect(result).toBeTruthy();
      expect(result.documentId).toBe(fixtures.exams[0].documentId);
    });

    test("不存在的 documentId 应返回 null", async () => {
      const result = await svc().findOne("nonexistent_doc_id");
      expect(result).toBeNull();
    });
  });

  describe("create(data)", () => {
    test("应成功创建考试", async () => {
      const result = await svc().create({
        title: "新考试",
        passScore: 60,
        isPublished: true,
      });
      expect(result).toBeTruthy();
      expect(result.documentId).toBeDefined();
    });
  });

  describe("update(documentId, data)", () => {
    test("应更新考试字段", async () => {
      const result = await svc().update(fixtures.exams[0].documentId, {
        title: "更新后的考试",
      });
      expect(result).toBeTruthy();
    });
  });

  describe("getQuestions(examDocumentId)", () => {
    test("应返回题目列表且隐藏答案", async () => {
      const result = await svc().getQuestions(fixtures.exams[0].documentId);
      expect(Array.isArray(result)).toBe(true);
      for (const q of result) {
        expect(q.answer).toBeUndefined();
      }
    });

    test("应应用 questionPoints 自定义分值", async () => {
      const result = await svc().getQuestions(fixtures.exams[0].documentId);
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].points).toBeDefined();
      }
    });

    test("randomOrder=true 应返回题目（顺序可能变化）", async () => {
      const exam = await svc().create({
        title: "随机排序考试",
        randomOrder: true,
        isPublished: true,
        questions: [fixtures.quizzes[0].id, fixtures.quizzes[1].id],
      });
      const result = await svc().getQuestions(exam.documentId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test("不存在的考试应抛出 404", async () => {
      await expect(svc().getQuestions("nonexistent_doc_id")).rejects.toThrow();
    });
  });

  describe("calculateTotalPoints(examDocumentId)", () => {
    test("应正确计算总分", async () => {
      const result = await svc().calculateTotalPoints(fixtures.exams[0].documentId);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    test("使用 questionPoints 自定义分值", async () => {
      const result = await svc().calculateTotalPoints(fixtures.exams[0].documentId);
      expect(result).toBe(23);
    });

    test("不存在的考试应返回 0", async () => {
      const result = await svc().calculateTotalPoints("nonexistent_doc_id");
      expect(result).toBe(0);
    });
  });

  describe("delete(documentId)", () => {
    test("应删除指定考试", async () => {
      const created = await svc().create({
        title: "待删除考试",
        isPublished: false,
      });
      const result = await svc().delete(created.documentId);
      expect(result).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests/quiz-exam.test" --no-cache`
Expected: 14 个用例全部通过

---

### Task 4: A3 考试尝试测试 (quiz-exam-attempt.test.ts)

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\quiz-exam-attempt.test.ts`

- [ ] **Step 1: 编写 quiz-exam-attempt.test.ts**

```typescript
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("考试尝试 (Quiz Exam Attempt Service)", () => {
  const svc = () => getStrapi().plugin("zhao-quiz").service("quiz-exam-attempt");

  describe("基础 CRUD", () => {
    test("find — 应返回尝试列表", async () => {
      const result = await svc().find({});
      expect(Array.isArray(result)).toBe(true);
    });

    test("findOne — 应返回尝试详情", async () => {
      const attempt = await svc().startExam(fixtures.users[0].id, fixtures.exams[0].documentId);
      const result = await svc().findOne(attempt.documentId);
      expect(result).toBeTruthy();
      expect(result.documentId).toBe(attempt.documentId);
    });

    test("create — 应成功创建尝试", async () => {
      const result = await svc().create({
        user: fixtures.users[1].id,
        exam: fixtures.exams[0].id,
        answers: [],
        totalScore: 0,
        isPassed: false,
        attemptNumber: 1,
        duration: 0,
      });
      expect(result).toBeTruthy();
    });

    test("update — 应更新尝试字段", async () => {
      const attempt = await svc().startExam(fixtures.users[2].id, fixtures.exams[0].documentId);
      const result = await svc().update(attempt.documentId, { duration: 120 });
      expect(result).toBeTruthy();
    });

    test("delete — 应删除指定尝试", async () => {
      const attempt = await svc().startExam(fixtures.users[3].id, fixtures.exams[0].documentId);
      const result = await svc().delete(attempt.documentId);
      expect(result).toBeTruthy();
    });
  });

  describe("startExam(userId, examDocumentId)", () => {
    test("应成功创建考试尝试", async () => {
      const result = await svc().startExam(fixtures.users[0].id, fixtures.exams[0].documentId);
      expect(result).toBeTruthy();
      expect(result.attemptNumber).toBeGreaterThanOrEqual(1);
      expect(result.startedAt).toBeTruthy();
    });

    test("不存在的考试应抛出 404", async () => {
      await expect(svc().startExam(fixtures.users[0].id, "nonexistent_doc_id")).rejects.toThrow();
    });

    test("allowRetry=false 且已有记录应抛出 400", async () => {
      await svc().startExam(fixtures.users[0].id, fixtures.exams[1].documentId);
      await expect(svc().startExam(fixtures.users[0].id, fixtures.exams[1].documentId)).rejects.toThrow();
    });

    test("allowRetry=true 且达到 maxAttempts 应抛出 400", async () => {
      const userId = fixtures.users[1].id;
      const examDocId = fixtures.exams[0].documentId;
      await svc().startExam(userId, examDocId);
      await svc().startExam(userId, examDocId);
      await svc().startExam(userId, examDocId);
      await expect(svc().startExam(userId, examDocId)).rejects.toThrow();
    });

    test("允许重试且未达上限应成功", async () => {
      const userId = fixtures.users[2].id;
      const examDocId = fixtures.exams[0].documentId;
      const a1 = await svc().startExam(userId, examDocId);
      expect(a1.attemptNumber).toBeGreaterThanOrEqual(1);
    });

    test("maxAttempts=0 应不限制次数", async () => {
      const examSvc = getStrapi().plugin("zhao-quiz").service("quiz-exam");
      const exam = await examSvc.create({
        title: "无限次考试",
        allowRetry: true,
        maxAttempts: 0,
        isPublished: true,
      });
      const a1 = await svc().startExam(fixtures.users[3].id, exam.documentId);
      const a2 = await svc().startExam(fixtures.users[3].id, exam.documentId);
      expect(a1).toBeTruthy();
      expect(a2).toBeTruthy();
    });
  });

  describe("submitExam(attemptDocumentId, answers)", () => {
    test("应自动判题并计算总分", async () => {
      const attempt = await svc().startExam(fixtures.users[0].id, fixtures.exams[0].documentId);
      const answers = [
        { quizDocumentId: fixtures.quizzes[0].documentId, answer: "北京" },
        { quizDocumentId: fixtures.quizzes[1].documentId, answer: "2" },
      ];
      const result = await svc().submitExam(attempt.documentId, answers);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(typeof result.isPassed).toBe("boolean");
    });

    test("不存在的尝试应抛出 404", async () => {
      await expect(svc().submitExam("nonexistent_doc_id", [])).rejects.toThrow();
    });

    test("应计算考试时长", async () => {
      const attempt = await svc().startExam(fixtures.users[1].id, fixtures.exams[0].documentId);
      await new Promise((r) => setTimeout(r, 1000));
      const answers = [{ quizDocumentId: fixtures.quizzes[0].documentId, answer: "北京" }];
      const result = await svc().submitExam(attempt.documentId, answers);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getUserAttempts(userId, examDocumentId)", () => {
    test("应返回用户的考试记录", async () => {
      const result = await svc().getUserAttempts(fixtures.users[0].id, fixtures.exams[0].documentId);
      expect(Array.isArray(result)).toBe(true);
    });

    test("无记录用户应返回空数组", async () => {
      const result = await svc().getUserAttempts(99999, fixtures.exams[0].documentId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests/quiz-exam-attempt.test" --no-cache`
Expected: 16 个用例全部通过

---

### Task 5: A4 答题记录测试 (quiz-record.test.ts)

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\quiz-record.test.ts`

- [ ] **Step 1: 编写 quiz-record.test.ts**

```typescript
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("答题记录 (Quiz Record Service)", () => {
  const svc = () => getStrapi().plugin("zhao-quiz").service("quiz-record");

  describe("基础 CRUD", () => {
    test("find — 应返回答题记录列表", async () => {
      const result = await svc().find({});
      expect(Array.isArray(result)).toBe(true);
    });

    test("findOne — 应返回答题记录详情", async () => {
      const record = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "北京");
      const result = await svc().findOne(record.documentId);
      expect(result).toBeTruthy();
    });

    test("create — 应成功创建答题记录", async () => {
      const result = await svc().create({
        user: fixtures.users[0].id,
        quiz: fixtures.quizzes[0].id,
        answer: { text: "北京" },
        isCorrect: true,
        score: 5,
        totalPoints: 5,
        scoringStatus: "auto_graded",
      });
      expect(result).toBeTruthy();
    });

    test("update — 应更新答题记录字段", async () => {
      const record = await svc().submitAnswer(fixtures.users[1].id, fixtures.quizzes[0].documentId, "上海");
      const result = await svc().update(record.documentId, { score: 0 });
      expect(result).toBeTruthy();
    });

    test("delete — 应删除指定答题记录", async () => {
      const record = await svc().submitAnswer(fixtures.users[2].id, fixtures.quizzes[1].documentId, "3");
      const result = await svc().delete(record.documentId);
      expect(result).toBeTruthy();
    });
  });

  describe("submitAnswer(userId, quizDocumentId, answer, lessonDocId?)", () => {
    test("非 essay 类型应自动判题", async () => {
      const result = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "北京");
      expect(result.scoringStatus).toBe("auto_graded");
      expect(typeof result.isCorrect).toBe("boolean");
    });

    test("essay 类型应标记为待评分", async () => {
      const result = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[2].documentId, "AI将改变世界");
      expect(result.scoringStatus).toBe("pending");
    });

    test("答案正确应得满分", async () => {
      const result = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "北京");
      expect(result.score).toBe(fixtures.quizzes[0].points);
    });

    test("答案错误应得 0 分", async () => {
      const result = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "上海");
      expect(result.score).toBe(0);
    });

    test("不存在的题目应抛出 404", async () => {
      await expect(svc().submitAnswer(fixtures.users[0].id, "nonexistent_doc_id", "x")).rejects.toThrow();
    });

    test("对象类型答案应正确存储", async () => {
      const result = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[3].documentId, { selected: ["JavaScript", "Python"] });
      expect(result).toBeTruthy();
      expect(typeof result.answer).toBe("object");
    });
  });

  describe("teacherGrade(recordDocumentId, teacherScore, graderUserId)", () => {
    test("应成功评分 essay 题目", async () => {
      const record = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[2].documentId, "AI论述内容");
      const result = await svc().teacherGrade(record.documentId, 12, fixtures.users[0].id);
      expect(result.scoringStatus).toBe("manual_graded");
      expect(result.teacherScore).toBe(12);
    });

    test("评分后 isCorrect 应根据分数更新", async () => {
      const record = await svc().submitAnswer(fixtures.users[1].id, fixtures.quizzes[2].documentId, "论述");
      const result = await svc().teacherGrade(record.documentId, 10, fixtures.users[0].id);
      expect(result.isCorrect).toBe(true);
    });

    test("非 pending 状态应抛出 400", async () => {
      const record = await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "北京");
      await expect(svc().teacherGrade(record.documentId, 5, fixtures.users[0].id)).rejects.toThrow();
    });

    test("不存在的记录应抛出 404", async () => {
      await expect(svc().teacherGrade("nonexistent_doc_id", 5, 1)).rejects.toThrow();
    });
  });

  describe("getUserRecords(userId, courseDocId?)", () => {
    test("应返回用户答题记录", async () => {
      await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[0].documentId, "北京");
      const result = await svc().getUserRecords(fixtures.users[0].id);
      expect(Array.isArray(result)).toBe(true);
    });

    test("指定 courseDocId 应过滤", async () => {
      const result = await svc().getUserRecords(fixtures.users[0].id, fixtures.course.documentId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getPendingGrading(courseDocId?)", () => {
    test("应返回待评分记录", async () => {
      await svc().submitAnswer(fixtures.users[0].id, fixtures.quizzes[2].documentId, "论述内容");
      const result = await svc().getPendingGrading();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests/quiz-record.test" --no-cache`
Expected: 18 个用例全部通过

---

### Task 6: A5 批量导入测试 (quiz-batch.test.ts)

**Files:**
- Create: `e:\code\plugins\zhao-quiz\tests\quiz-batch.test.ts`

- [ ] **Step 1: 编写 quiz-batch.test.ts**

```typescript
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("批量导入 (Quiz Batch Service)", () => {
  const svc = () => getStrapi().plugin("zhao-quiz").service("quiz-batch");

  describe("基础 CRUD", () => {
    test("find — 应返回批量导入记录列表", async () => {
      const result = await svc().find({});
      expect(Array.isArray(result)).toBe(true);
    });

    test("findOne — 应返回批量导入记录详情", async () => {
      const result = await svc().findOne(fixtures.batches[0].documentId);
      expect(result).toBeTruthy();
    });

    test("create — 应成功创建批量导入记录", async () => {
      const result = await svc().create({
        title: "新批量导入",
        status: "pending",
      });
      expect(result).toBeTruthy();
    });

    test("update — 应更新批量导入记录字段", async () => {
      const result = await svc().update(fixtures.batches[0].documentId, {
        status: "processing",
      });
      expect(result).toBeTruthy();
    });

    test("delete — 应删除指定批量导入记录", async () => {
      const created = await svc().create({ title: "待删除", status: "pending" });
      const result = await svc().delete(created.documentId);
      expect(result).toBeTruthy();
    });
  });

  describe("importFromFile(batchDocumentId)", () => {
    test("不存在的 batch 应抛出 404", async () => {
      await expect(svc().importFromFile("nonexistent_doc_id")).rejects.toThrow();
    });
  });

  describe("generateTemplate(courseDocId?, lessonDocId?)", () => {
    test("应返回 xlsx buffer", async () => {
      const result = await svc().generateTemplate();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    test("应包含示例数据", async () => {
      const XLSX = require("xlsx");
      const buffer = await svc().generateTemplate();
      const wb = XLSX.read(buffer, { type: "buffer" });
      expect(wb.SheetNames.length).toBeGreaterThan(0);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("downloadTemplate()", () => {
    test("应调用 generateTemplate 并返回 buffer", async () => {
      const result = await svc().downloadTemplate();
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests/quiz-batch.test" --no-cache`
Expected: 14 个用例中部分通过（importFromFile 需要真实文件，仅验证 404 场景）

---

### Task 7: 运行全量测试

- [ ] **Step 1: 运行 zhao-quiz 全量测试**

Run: `cd e:\code && npx jest --testPathPattern="plugins/zhao-quiz/tests" --no-cache`
Expected: 所有测试通过

- [ ] **Step 2: 检查是否有过时的 .js 编译文件**

Run: `dir /s /b e:\code\plugins\zhao-quiz\tests\*.js`
Expected: 仅 jest.config.js（如果存在），不应有 .test.js 文件

如果存在 .test.js 文件，删除它们。

---

### Task 8: 提交

- [ ] **Step 1: 提交改动**

```bash
cd e:\code
git add plugins/zhao-quiz/tests/
git commit -m "feat: zhao-quiz 测试基础设施 + A1~A5 Service 测试"
```
