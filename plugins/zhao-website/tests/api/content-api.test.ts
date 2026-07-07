// tests/api/content-api.test.ts

/**
 * Content API controller 测试：验证 controller → service 调用链 + 参数透传。
 * 使用 mock strapi，不启动真实 Strapi 实例。
 */

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
    const ctx = createMockCtx({
      state: { siteId: 1 },
      request: { host: "example.com", headers: {}, ip: "127.0.0.1", body: {}, query: {} },
    });

    await seoOutputController.sitemap(ctx);

    expect(sitemapService.generate).toHaveBeenCalledWith(1, "https://example.com");
    expect(ctx.body).toContain("<?xml");
  });
});
