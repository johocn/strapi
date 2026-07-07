# zhao-website 遗留问题修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-website 插件 3 个遗留问题：article.find tag/exclude 过滤、interaction track 接口对齐、mock 补全测试。

**Architecture:** 修改 2 个后端文件（article.ts service + lead.ts controller）+ 创建 1 个 mock helper + 重写 4 个测试文件。TDD 流程：先写失败测试，再实现，再验证通过。

**Tech Stack:** Strapi v5, TypeScript, Jest + ts-jest, Knex

**Spec:** `docs/superpowers/specs/2026-07-07-zhao-website-leftovers-design.md`

---

## 文件结构

| 文件 | 职责 | 操作 |
|---|---|---|
| `plugins/zhao-website/tests/helpers/mock-strapi.ts` | 手写 mock 工厂，模拟 strapi 对象 | 新建 |
| `plugins/zhao-website/server/src/services/article.ts` | article service find 方法增加 tag/exclude 过滤 | 修改 |
| `plugins/zhao-website/server/src/controllers/content-api/lead.ts` | track 方法对齐 interaction.toggle 签名 | 修改 |
| `plugins/zhao-website/tests/services/article.test.ts` | article service 7 个路径测试 | 重写 |
| `plugins/zhao-website/tests/services/knowledge-graph.test.ts` | KG service 6 个路径测试 | 重写 |
| `plugins/zhao-website/tests/services/first-truth.test.ts` | first-truth service 5 个路径测试 | 重写 |
| `plugins/zhao-website/tests/api/content-api.test.ts` | content-api controller 9 个路径测试 | 重写 |

---

### Task 1: 创建 mock-strapi helper

**Files:**
- Create: `plugins/zhao-website/tests/helpers/mock-strapi.ts`

- [ ] **Step 1: 创建 mock 工厂文件**

```ts
// tests/helpers/mock-strapi.ts

/**
 * 手写 mock 工厂，模拟 strapi 对象用于 service/controller 单元测试。
 * 不引入 jest-mock-extended 等新依赖。
 */

export function createMockStrapi(overrides: Record<string, any> = {}) {
  // 默认 query mock（按 UID 返回同一实例，测试可通过 mockReturnValueOnce 覆盖）
  const defaultQueryMock = {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1" }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };

  const queryFn = jest.fn().mockReturnValue(defaultQueryMock);

  const connectionMock = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockResolvedValue([]),
    raw: jest.fn().mockResolvedValue({ rows: [] }),
  };

  const mockStrapi = {
    db: {
      query: queryFn,
      connection: connectionMock,
    },
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({}),
    }),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    server: {
      use: jest.fn(),
      httpServer: {},
    },
    dirs: { static: { public: "/tmp/test-public" } },
    config: {
      get: jest.fn().mockReturnValue(undefined),
    },
    ...overrides,
  };

  // 同时设为全局（部分 utils 用 declare const strapi）
  (global as any).strapi = mockStrapi;

  return mockStrapi;
}

/**
 * 辅助：创建带特定 query 返回值的 mock
 * 用法：createMockStrapiWithQuery({ "plugin::zhao-website.article": { findOne: jest.fn().mockResolvedValue({...}) } })
 */
export function createMockStrapiWithQuery(queryOverrides: Record<string, Partial<ReturnType<typeof createDefaultQueryMock>>> = {}) {
  const defaultQueryMock = createDefaultQueryMock();
  const queryMocks: Record<string, any> = {};

  for (const [uid, overrides] of Object.entries(queryOverrides)) {
    queryMocks[uid] = { ...defaultQueryMock, ...overrides };
  }

  const queryFn = jest.fn((uid: string) => queryMocks[uid] || defaultQueryMock);

  const mockStrapi = {
    db: {
      query: queryFn,
      connection: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockResolvedValue([]),
        raw: jest.fn().mockResolvedValue({ rows: [] }),
      },
    },
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({}),
    }),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    server: { use: jest.fn(), httpServer: {} },
    dirs: { static: { public: "/tmp/test-public" } },
    config: { get: jest.fn().mockReturnValue(undefined) },
  };

  (global as any).strapi = mockStrapi;
  return mockStrapi;
}

function createDefaultQueryMock() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1" }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };
}
```

- [ ] **Step 2: 验证 mock helper 编译通过**

Run: `cd plugins/zhao-website && npx tsc --noEmit -p tests/tsconfig.json`
Expected: 无错误（或仅有与 @strapi/strapi 类型相关的不影响运行的警告）

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/tests/helpers/mock-strapi.ts
git commit -m "test(zhao-website): 添加 mock-strapi helper 工厂"
```

---

### Task 2: article.find tag + exclude 过滤（TDD）

**Files:**
- Modify: `plugins/zhao-website/server/src/services/article.ts`（find 方法 9-24 行）
- Test: `plugins/zhao-website/tests/services/article.test.ts`（先写 tag/exclude 测试）

- [ ] **Step 1: 重写 article.test.ts，包含 tag/exclude 测试 + 其他路径**

完整替换 `plugins/zhao-website/tests/services/article.test.ts`：

```ts
import articleServiceFactory from "../../server/src/services/article";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Article Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = articleServiceFactory({ strapi: mockStrapi });
  });

  test("find 默认只查 published", async () => {
    const queryMock = mockStrapi.db.query();
    await service.find(1, {});
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });

  test("find 带 tag 参数 → 调用 knex whereIn", async () => {
    // 模拟 knex 返回匹配的 article_id
    mockStrapi.db.connection.whereIn.mockResolvedValue([
      { article_id: 10 },
      { article_id: 20 },
    ]);
    const queryMock = mockStrapi.db.query();

    await service.find(1, { tag: "tag-1,tag-2" });

    // 断言 knex 被调用
    expect(mockStrapi.db.connection.select).toHaveBeenCalledWith("article_id");
    expect(mockStrapi.db.connection.from).toHaveBeenCalledWith("zhao_website_articles_tags_lnk");
    expect(mockStrapi.db.connection.whereIn).toHaveBeenCalledWith("tag_id", ["tag-1", "tag-2"]);
    // 断言主查询使用 $in 过滤
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { $in: [10, 20] },
        }),
      })
    );
  });

  test("find tag 无匹配 → 短路返回 []，不查主表", async () => {
    mockStrapi.db.connection.whereIn.mockResolvedValue([]);
    const queryMock = mockStrapi.db.query();

    const result = await service.find(1, { tag: "nonexistent" });

    expect(result).toEqual([]);
    expect(queryMock.findMany).not.toHaveBeenCalled();
  });

  test("find 带 exclude 参数 → 主查询使用 $notIn", async () => {
    // 模拟 documentId 查询返回 id
    const queryMock = mockStrapi.db.query();
    // 第一次调用 findMany 是 exclude 的 documentId → id 查询
    queryMock.findMany.mockResolvedValueOnce([{ id: 99 }]);

    await service.find(1, { exclude: "doc-exclude-1" });

    // 断言主查询 where.id 含 $notIn
    const lastCall = queryMock.findMany.mock.calls[queryMock.findMany.mock.calls.length - 1][0];
    expect(lastCall.where.id).toEqual(expect.objectContaining({ $notIn: [99] }));
  });

  test("findOne 只返回 published", async () => {
    const queryMock = mockStrapi.db.query();
    await service.findOne(1, "test-slug");
    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });

  test("create 调用写入 status: draft（默认）", async () => {
    const queryMock = mockStrapi.db.query();
    // findOne 返回 null（slug 不冲突）
    queryMock.findOne.mockResolvedValue(null);

    await service.create(1, { title: "Test", content: "Hello" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft", site: 1 }),
      })
    );
  });

  test("publish 调用 update 并设 status: published + publishedAt", async () => {
    const queryMock = mockStrapi.db.query();
    // findOneAdmin 返回已存在文章
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5", slug: "test" });

    await service.publish(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ status: "published" }),
      })
    );
    // publishedAt 应被设置
    const updateCall = queryMock.update.mock.calls[0][0];
    expect(updateCall.data.publishedAt).toBeDefined();
  });

  test("softDelete 设置 deletedAt", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.softDelete(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ deletedAt: expect.any(String) }),
      })
    );
  });
});
```

- [ ] **Step 2: 运行测试，验证 tag/exclude 测试失败**

Run: `cd plugins/zhao-website && npx jest tests/services/article.test.ts --config tests/jest.config.ts 2>&1 | head -40`
Expected: FAIL（find 未调用 knex，未传 $in/$notIn）

- [ ] **Step 3: 实现 article.ts find 方法的 tag + exclude 过滤**

修改 `plugins/zhao-website/server/src/services/article.ts`，替换 find 方法（9-24 行）：

将现有的 find 方法：
```ts
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published"; // 默认只查 published
    if (category) filters.category = category;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity"],
    });
  },
```

替换为：
```ts
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, category, tag, exclude, status, isFeatured, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published"; // 默认只查 published
    if (category) filters.category = category;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;

    // tag 过滤：knex 查 join 表拿 article_id 列表（OR 语义）
    if (tag) {
      const tagIds = String(tag).split(",").map((s) => s.trim()).filter(Boolean);
      if (tagIds.length > 0) {
        try {
          const db = strapi.db.connection;
          const rows = await db
            .select("article_id")
            .from("zhao_website_articles_tags_lnk")
            .whereIn("tag_id", tagIds);
          const articleIds = [...new Set(rows.map((r: any) => r.article_id))];
          if (articleIds.length === 0) return []; // 短路，避免 IN () 报错
          filters.id = { $in: articleIds };
        } catch (err) {
          strapi.log.warn("[zhao-website] tag filter knex failed, fallback to no-tag:", (err as Error).message);
        }
      }
    }

    // exclude 过滤：排除指定 documentId 对应的 article
    if (exclude) {
      const excludeIds = String(exclude).split(",").map((s) => s.trim()).filter(Boolean);
      if (excludeIds.length > 0) {
        const excludeRows = await strapi.db.query(UID).findMany({
          where: { documentId: { $in: excludeIds } },
          select: ["id"],
        });
        const excludeNumericIds = excludeRows.map((r: any) => r.id);
        if (excludeNumericIds.length > 0) {
          filters.id = { ...(filters.id || {}), $notIn: excludeNumericIds };
        }
      }
    }

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity"],
    });
  },
```

- [ ] **Step 4: 运行测试，验证全部通过**

Run: `cd plugins/zhao-website && npx jest tests/services/article.test.ts --config tests/jest.config.ts 2>&1 | tail -20`
Expected: PASS（8 个测试全部通过）

- [ ] **Step 5: 验证 tsc 编译**

Run: `cd plugins/zhao-website && npx tsc --noEmit -p tsconfig.server.json`
Expected: 退出码 0

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/article.ts plugins/zhao-website/tests/services/article.test.ts
git commit -m "feat(zhao-website): article.find 支持 tag+exclude 过滤（knex 直查 join 表）+ article service 测试"
```

---

### Task 3: interaction track 接口对齐（TDD）

**Files:**
- Modify: `plugins/zhao-website/server/src/controllers/content-api/lead.ts`（track 方法 21-30 行）
- Test: `plugins/zhao-website/tests/api/content-api.test.ts`（先写 track 测试）

- [ ] **Step 1: 在 content-api.test.ts 中写 track 测试（先只写 track 相关 2 个测试）**

完整替换 `plugins/zhao-website/tests/api/content-api.test.ts`：

```ts
// tests/api/content-api.test.ts

/**
 * Content API controller 测试：验证 controller → service 调用链 + 参数透传。
 * 使用 mock strapi，不启动真实 Strapi 实例。
 */

// article controller 依赖全局 strapi
import { createMockStrapi } from "../helpers/mock-strapi";

// 辅助：构造 mock ctx
function createMockCtx(overrides: Record<string, any> = {}): any {
  return {
    state: { siteId: 1 },
    request: { body: {}, query: {}, headers: {}, ip: "127.0.0.1" },
    params: {},
    body: null,
    status: 200,
    badRequest: jest.fn(function (this: any, msg: string) {
      this.status = 400;
      this.body = { error: msg };
    }),
    notFound: jest.fn(function (this: any, msg: string) {
      this.status = 404;
      this.body = { error: msg };
    }),
    tooManyRequests: jest.fn(function (this: any, msg: string) {
      this.status = 429;
      this.body = { error: msg };
    }),
    ...overrides,
  };
}

describe("Content API - interaction track", () => {
  let mockStrapi: any;
  let interactionService: any;
  let leadController: any;

  beforeEach(() => {
    interactionService = {
      toggle: jest.fn().mockResolvedValue({ action: "created" }),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue(interactionService),
      }),
    });
    // 动态导入 controller（依赖全局 strapi）
    leadController = require("../../server/src/controllers/content-api/lead").default;
  });

  test("track 正常调用 → 透传 targetType/visitorId 给 service", async () => {
    const ctx = createMockCtx({
      request: {
        body: {
          type: "like",
          targetType: "article",
          targetId: "doc-123",
          visitorId: "uuid-visitor-1",
          userId: 5,
        },
        headers: {},
        ip: "192.168.1.1",
      },
    });

    await leadController.track(ctx);

    expect(interactionService.toggle).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        type: "like",
        targetType: "article",
        targetId: "doc-123",
        visitorId: "uuid-visitor-1",
        userId: 5,
        ctx: expect.any(Object),
      })
    );
    expect(ctx.body).toEqual({ success: true, action: "created" });
  });

  test("track 缺参数 → 返回 400", async () => {
    const ctx = createMockCtx({
      request: { body: { type: "like" }, headers: {}, ip: "127.0.0.1" },
    });

    await leadController.track(ctx);

    expect(ctx.badRequest).toHaveBeenCalled();
    expect(interactionService.toggle).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试，验证 track 正常调用测试失败**

Run: `cd plugins/zhao-website && npx jest tests/api/content-api.test.ts --config tests/jest.config.ts 2>&1 | tail -30`
Expected: FAIL（controller 未传 targetType/visitorId）

- [ ] **Step 3: 修改 lead.ts track 方法**

修改 `plugins/zhao-website/server/src/controllers/content-api/lead.ts`，替换 track 方法（21-30 行）：

将现有的 track 方法：
```ts
  async track(ctx: any) {
    const siteId = ctx.state.siteId;
    const { type, targetId, action } = ctx.request.body;
    await strapi.plugin("zhao-website").service("interaction").toggle(siteId, {
      type, targetId, action,
      ipAddress: ctx.request.ip,
      userAgent: ctx.request.headers["user-agent"],
    });
    ctx.body = { success: true };
  },
```

替换为：
```ts
  async track(ctx: any) {
    const siteId = ctx.state.siteId;
    const { type, targetType, targetId, visitorId, userId } = ctx.request.body;

    // 必填校验
    if (!type || !targetType || !targetId || !visitorId) {
      return ctx.badRequest("Missing required fields: type, targetType, targetId, visitorId");
    }

    try {
      const result = await strapi.plugin("zhao-website").service("interaction").toggle(siteId, {
        type,
        targetType,
        targetId,
        visitorId,
        userId,
        ctx, // service 内部用 ctx.request.ip / userAgent
      });
      ctx.body = { success: true, action: result.action };
    } catch (err) {
      ctx.status = (err as any).status || 500;
      ctx.body = { error: (err as Error).message };
    }
  },
```

- [ ] **Step 4: 运行测试，验证 track 测试通过**

Run: `cd plugins/zhao-website && npx jest tests/api/content-api.test.ts --config tests/jest.config.ts 2>&1 | tail -15`
Expected: PASS（2 个测试通过）

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/controllers/content-api/lead.ts plugins/zhao-website/tests/api/content-api.test.ts
git commit -m "fix(zhao-website): interaction track 接口对齐（targetType/visitorId 必填校验 + 透传）+ track 测试"
```

---

### Task 4: 补全 content-api.test.ts 剩余路径

**Files:**
- Modify: `plugins/zhao-website/tests/api/content-api.test.ts`

- [ ] **Step 1: 在 content-api.test.ts 末尾追加剩余 7 个测试路径**

在文件末尾（最后一个 `});` 之前）追加以下 describe 块：

```ts
describe("Content API - article list/detail/featured/related", () => {
  let mockStrapi: any;
  let articleService: any;
  let articleController: any;

  beforeEach(() => {
    articleService = {
      find: jest.fn().mockResolvedValue([{ id: 1, title: "Test" }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1", title: "Test", tags: [{ documentId: "tag-1" }] }),
      findFeatured: jest.fn().mockResolvedValue([{ id: 2, title: "Featured" }]),
      incrementViewCount: jest.fn().mockResolvedValue(undefined),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue(articleService),
      }),
    });
    articleController = require("../../server/src/controllers/content-api/article").default;
  });

  test("GET /articles → service.find(siteId, query)", async () => {
    const ctx = createMockCtx({
      query: { page: "1", pageSize: "10", category: "news" },
    });

    await articleController.list(ctx);

    expect(articleService.find).toHaveBeenCalledWith(1, expect.objectContaining({
      page: 1, pageSize: 10, category: "news",
    }));
    expect(ctx.body).toEqual([{ id: 1, title: "Test" }]);
  });

  test("GET /articles/:slug → service.findOne + incrementViewCount", async () => {
    const ctx = createMockCtx({ params: { slug: "test-slug" } });

    await articleController.detail(ctx);

    expect(articleService.findOne).toHaveBeenCalledWith(1, "test-slug");
    expect(articleService.incrementViewCount).toHaveBeenCalledWith(1, "doc-1");
    expect(ctx.body).toEqual(expect.objectContaining({ title: "Test" }));
  });

  test("GET /articles/featured → service.findFeatured(limit)", async () => {
    const ctx = createMockCtx({ query: { limit: "3" } });

    await articleController.featured(ctx);

    expect(articleService.findFeatured).toHaveBeenCalledWith(1, 3);
    expect(ctx.body).toEqual([{ id: 2, title: "Featured" }]);
  });

  test("GET /articles/:slug/related → service.findOne + find(tag, exclude)", async () => {
    const ctx = createMockCtx({ params: { slug: "test-slug" } });

    await articleController.related(ctx);

    expect(articleService.findOne).toHaveBeenCalledWith(1, "test-slug");
    expect(articleService.find).toHaveBeenCalledWith(1, expect.objectContaining({
      tag: "tag-1",
      exclude: "doc-1",
    }));
  });
});

describe("Content API - leads submit + honeypot", () => {
  let mockStrapi: any;
  let leadService: any;
  let leadController: any;

  beforeEach(() => {
    leadService = {
      createPublic: jest.fn().mockResolvedValue({ documentId: "lead-1" }),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue(leadService),
      }),
    });
    leadController = require("../../server/src/controllers/content-api/lead").default;
  });

  test("POST /leads/submit → service.createPublic", async () => {
    const ctx = createMockCtx({
      request: {
        body: { name: "张三", phone: "13800138000", message: "测试", type: "contact" },
        headers: {},
        ip: "127.0.0.1",
      },
    });

    await leadController.submit(ctx);

    expect(leadService.createPublic).toHaveBeenCalled();
    expect(ctx.body).toEqual(expect.objectContaining({ success: true }));
  });

  test("POST /leads/submit 带 honeypot → 不调用 createPublic，直接返回 success", async () => {
    const ctx = createMockCtx({
      request: {
        body: { name: "bot", website: "spam", message: "spam" },
        headers: {},
        ip: "127.0.0.1",
      },
    });

    await leadController.submit(ctx);

    expect(leadService.createPublic).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({ success: true });
  });
});

describe("Content API - sitemap", () => {
  let mockStrapi: any;
  let sitemapService: any;
  let seoOutputController: any;

  beforeEach(() => {
    sitemapService = {
      generate: jest.fn().mockResolvedValue("<?xml version=\"1.0\"?><urlset></urlset>"),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue(sitemapService),
      }),
    });
    seoOutputController = require("../../server/src/controllers/content-api/seo-output").default;
  });

  test("GET /sitemap.xml → service.sitemap.generate", async () => {
    const ctx = createMockCtx({ state: { siteId: 1, siteUrl: "https://example.com" } });

    await seoOutputController.sitemap(ctx);

    expect(sitemapService.generate).toHaveBeenCalledWith(1, "https://example.com");
    expect(ctx.body).toContain("<?xml");
  });
});
```

- [ ] **Step 2: 运行测试，验证全部通过**

Run: `cd plugins/zhao-website && npx jest tests/api/content-api.test.ts --config tests/jest.config.ts 2>&1 | tail -20`
Expected: PASS（9 个测试全部通过）

注意：如果 article controller detail 方法中 `article.documentId` 访问失败（因为 incrementViewCount 是异步 `.catch(() => {})`），检查 controller 是否正确。测试中 incrementViewCount 是同步 mock，不影响。

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/tests/api/content-api.test.ts
git commit -m "test(zhao-website): 补全 content-api 测试（article list/detail/featured/related + leads honeypot + sitemap）"
```

---

### Task 5: 补全 knowledge-graph.test.ts

**Files:**
- Modify: `plugins/zhao-website/tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 完整重写 knowledge-graph.test.ts**

完整替换 `plugins/zhao-website/tests/services/knowledge-graph.test.ts`：

```ts
import kgServiceFactory from "../../server/src/services/knowledge-graph";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Graph Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = kgServiceFactory({ strapi: mockStrapi });
  });

  test("createEntity 调用 db.query.create 并传入 siteId", async () => {
    const queryMock = mockStrapi.db.query();

    await service.createEntity(1, { name: "Entity A", entityType: "Organization", slug: "ent-a" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Entity A",
          entityType: "Organization",
          site: 1,
        }),
      })
    );
  });

  test("addRelation 自引用 → reject Self-relation", async () => {
    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "parent",
        objectEntityId: "doc-a",
      })
    ).rejects.toThrow("Self-relation");
  });

  test("addRelation objectEntityId + objectValue 同时存在 → reject 互斥", async () => {
    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "hasValue",
        objectEntityId: "doc-b",
        objectValue: 42,
      })
    ).rejects.toThrow("互斥");
  });

  test("addRelation 层级关系循环 → reject 循环引用", async () => {
    // mock _detectCycle 返回 true
    service._detectCycle = jest.fn().mockResolvedValue(true);

    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "parent", // parent 在 HIERARCHICAL_PREDICATES 中
        objectEntityId: "doc-b",
      })
    ).rejects.toThrow("循环引用");
  });

  test("disambiguate 按 name+type 查询", async () => {
    const queryMock = mockStrapi.db.query();
    // 模拟精确匹配
    queryMock.findMany.mockResolvedValue([{ name: "Entity A", entityType: "Organization", documentId: "doc-a" }]);

    const result = await service.disambiguate(1, { name: "Entity A", entityType: "Organization" });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          site: 1,
          name: { $containsi: "Entity A" },
          entityType: "Organization",
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ name: "Entity A" }));
  });

  test("exportGraph 返回 { nodes, edges } 结构", async () => {
    const queryMock = mockStrapi.db.query();
    // 第一次调用 findMany 返回实体，第二次返回关系
    queryMock.findMany
      .mockResolvedValueOnce([{ documentId: "doc-a", name: "A", entityType: "Organization", slug: "ent-a" }])
      .mockResolvedValueOnce([
        { documentId: "rel-1", subjectEntity: { documentId: "doc-a" }, predicate: "parent", objectEntity: { documentId: "doc-b" } },
      ]);

    const result = await service.exportGraph(1);

    expect(result).toHaveProperty("nodes");
    expect(result).toHaveProperty("edges");
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试**

Run: `cd plugins/zhao-website && npx jest tests/services/knowledge-graph.test.ts --config tests/jest.config.ts 2>&1 | tail -20`
Expected: PASS（6 个测试通过）

注意：如果 exportGraph 测试失败，检查 exportGraph 实际返回结构是否为 `{ nodes, edges }`。先 Read `server/src/services/knowledge-graph.ts` 270-320 行确认。

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "test(zhao-website): 补全 knowledge-graph service 测试（自引用/互斥/循环/disambiguate/exportGraph）"
```

---

### Task 6: 补全 first-truth.test.ts

**Files:**
- Modify: `plugins/zhao-website/tests/services/first-truth.test.ts`

- [ ] **Step 1: 完整重写 first-truth.test.ts**

完整替换 `plugins/zhao-website/tests/services/first-truth.test.ts`：

```ts
import ftServiceFactory from "../../server/src/services/first-truth";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("First Truth Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = ftServiceFactory({ strapi: mockStrapi });
  });

  test("create claimKey 已存在 → reject", async () => {
    const queryMock = mockStrapi.db.query();
    // findByClaimKey 返回已存在记录
    queryMock.findOne.mockResolvedValue({ id: 1, claimKey: "founding-date" });

    await expect(
      service.create(1, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2020-01-01" })
    ).rejects.toThrow("已存在");
  });

  test("create claimKey 不存在 → 调用 db.query.create", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue(null); // findByClaimKey 返回 null

    await service.create(1, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2020-01-01" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimKey: "founding-date",
          site: 1,
          verificationStatus: "verified",
        }),
      })
    );
  });

  test("verify 设置 verificationStatus: verified", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.verify(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ verificationStatus: "verified" }),
      })
    );
  });

  test("detectConflicts 同 claimKey 不同 canonicalValue → 返回 severity: error", async () => {
    const queryMock = mockStrapi.db.query();
    // 模拟两条同 claimKey 但不同 canonicalValue 的记录
    queryMock.findMany.mockResolvedValue([
      { claimKey: "revenue", canonicalValue: "100万", canonicalSourceUrl: "url1", canonicalSourceType: "official" },
      { claimKey: "revenue", canonicalValue: "200万", canonicalSourceUrl: "url2", canonicalSourceType: "report" },
    ]);

    const conflicts = await service.detectConflicts(1);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe("error");
    expect(conflicts[0].claimKey).toBe("revenue");
  });

  test("softDelete 设置 deletedAt", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.softDelete(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ deletedAt: expect.any(String) }),
      })
    );
  });
});
```

- [ ] **Step 2: 运行测试**

Run: `cd plugins/zhao-website && npx jest tests/services/first-truth.test.ts --config tests/jest.config.ts 2>&1 | tail -20`
Expected: PASS（5 个测试通过）

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/tests/services/first-truth.test.ts
git commit -m "test(zhao-website): 补全 first-truth service 测试（claimKey 唯一/verify/detectConflicts/softDelete）"
```

---

### Task 7: 全量验证

**Files:**
- 无修改，仅验证

- [ ] **Step 1: 运行全部测试**

Run: `cd plugins/zhao-website && npx jest --config tests/jest.config.ts 2>&1 | tail -30`
Expected: 所有测试通过（content-types.test.ts 可能因无真实 Strapi 环境失败，其余 4 个文件全部 PASS）

注意：content-types.test.ts 启动真实 Strapi 实例，如无数据库环境会失败。这是预期的——该测试不在本 spec 范围内修改。如需跳过：`npx jest --config tests/jest.config.ts --testPathIgnorePatterns="content-types"`

- [ ] **Step 2: 验证 tsc 编译**

Run: `cd plugins/zhao-website && npx tsc --noEmit -p tsconfig.server.json`
Expected: 退出码 0

- [ ] **Step 3: 验证无 `expect(true).toBe(true)` 占位**

Run: `cd plugins/zhao-website && Select-String -Path "tests/services/*.test.ts","tests/api/*.test.ts" -Pattern "expect\(true\).toBe\(true\)"`
Expected: 无匹配（4 个测试文件中不再有占位）

- [ ] **Step 4: 最终 commit（如有遗漏修复）**

如果前面步骤有未 commit 的修复：
```bash
cd e:\code\basic
git add -A
git commit -m "fix(zhao-website): 全量验证修复"
```

如无遗漏，跳过此步。

---

## 自我审查

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task | 状态 |
|---|---|---|
| §2 article.find tag+exclude 过滤 | Task 2 | ✅ |
| §3 interaction track 接口对齐 | Task 3 | ✅ |
| §4.3.1 article.test.ts 7 个路径 | Task 2（tag/exclude/findOne/create/publish/softDelete） | ✅ |
| §4.3.2 knowledge-graph.test.ts 6 个路径 | Task 5 | ✅ |
| §4.3.3 first-truth.test.ts 5 个路径 | Task 6 | ✅ |
| §4.3.4 content-api.test.ts 9 个路径 | Task 3（track×2）+ Task 4（article×4 + leads×2 + sitemap×1） | ✅ |
| §4.4 Mock 工具 | Task 1 | ✅ |
| §5 错误处理与边界 | Task 2（tag 短路 + 降级）+ Task 3（400 校验） | ✅ |
| §6 验收标准 | Task 7 | ✅ |

### 2. 占位符扫描

- 无 "TBD"、"TODO"、"implement later"
- 每个测试步骤都包含完整代码
- 每个实现步骤都包含完整代码

### 3. 类型一致性

| 方法名 | 定义 Task | 调用 Task | 一致性 |
|---|---|---|---|
| `find(siteId, query)` 含 tag/exclude | Task 2（article.ts） | Task 2（article.test.ts）、Task 4（content-api.test.ts related） | ✅ |
| `toggle(siteId, { type, targetType, targetId, visitorId, userId, ctx })` | 已存在（interaction.ts） | Task 3（lead.ts track） | ✅ |
| `incrementViewCount(siteId, documentId)` | 已存在（article.ts） | Task 4（content-api.test.ts detail） | ✅ |
| `createMockStrapi()` | Task 1（mock-strapi.ts） | Task 2-6（所有测试文件） | ✅ |

### 4. 已知风险

1. **join 表名 `zhao_website_articles_tags_lnk`**：按 project_memory 规则推导，实现时如不一致需调整。Task 2 Step 3 的代码中表名是硬编码的，如运行时报错需查实际表名。
2. **HIERARCHICAL_PREDICATES**：Task 5 循环检测测试用 `"parent"`（实际在字典中），不是 spec 示例的 `"parentOf"`。
3. **content-types.test.ts**：启动真实 Strapi，无 DB 环境会失败，不在本 spec 范围。
4. **exportGraph 返回结构**：Task 5 测试假设返回 `{ nodes, edges }`，如实际结构不同需调整断言。

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-zhao-website-leftovers.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查，快速迭代

**2. Inline Execution** - 在当前会话中按序执行，批量执行 + 检查点审查

**Which approach?**
