/**
 * authenticate middleware 单元测试
 *
 * 测试策略：
 * - mock auth.service 行为
 * - 验证中间件对 publicPaths、token 提取、token 验证的处理
 */
import type Koa from "koa";
import type { Core } from "@strapi/strapi";
import type { AuthUser, AuthMiddlewareConfig } from "../server/src/utils/types";
import authenticateMiddlewareFactory from "../server/src/middlewares/authenticate";

// ========== Mock 工具 ==========
function createMockStrapi(authServiceOverrides?: Record<string, unknown>): Core.Strapi {
  return {
    plugin: () => ({
      service: (name: string) => {
        if (name === "auth") {
          return {
            extractToken: (ctx: Koa.Context) => {
              const h = ctx.get("authorization");
              if (h?.startsWith("Bearer ")) return h.slice(7);
              return null;
            },
            authenticate: async (token: string) => {
              if (token === "valid-token") return { id: 1, email: "test@test.com" } as AuthUser;
              if (token === "invalid-token") throw new Error("invalid token");
              if (token === "expired-token") throw new Error("jwt expired");
              return null;
            },
            ...authServiceOverrides,
          };
        }
        throw new Error(`Unknown service: ${name}`);
      },
    }),
  } as unknown as Core.Strapi;
}

function createMockCtx(authHeader?: string, path = "/api/test"): Koa.Context {
  return {
    get: (name: string) => {
      if (name === "authorization") return authHeader;
      return undefined;
    },
    request: {
      body: {},
    } as Koa.Request,
    params: {},
    method: "GET",
    path,
    state: {},
    unauthorized: (msg: string) => { throw new Error(`Unauthorized: ${msg}`); },
  } as unknown as Koa.Context;
}

function createNext(): Koa.Next {
  return async () => { /* noop */ };
}

// ========== 测试套件 ==========
describe("authenticate middleware", () => {
  it("公开路径应跳过认证直接 next", async () => {
    const config: AuthMiddlewareConfig = {
      publicPaths: ["/api/auth"],
    };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/auth/login");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("缺少 token 时应返回 401", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined);
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
    expect(next).not.toHaveBeenCalled();
  });

  it("携带有效 token 时应注入 user 并调用 next", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx("Bearer valid-token");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(ctx.state.user).toBeDefined();
    expect(ctx.state.user?.id).toBe(1);
    expect(next).toHaveBeenCalled();
  });

  it("无效 token 时应返回 401", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx("Bearer invalid-token");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("认证令牌无效或已过期");
    expect(next).not.toHaveBeenCalled();
  });

  it("格式错误的 Authorization 头（非 Bearer）应返回 401", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx("Basic dGVzdDpwYXNz");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
    expect(next).not.toHaveBeenCalled();
  });

  it("publicPaths 支持路径前缀匹配", async () => {
    const config: AuthMiddlewareConfig = {
      publicPaths: ["/api/public", "/api/auth"],
    };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/public/hello");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("非公开路径即使无 token 也需验证", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/protected");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
    expect(next).not.toHaveBeenCalled();
  });
});