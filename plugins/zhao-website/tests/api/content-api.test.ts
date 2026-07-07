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
