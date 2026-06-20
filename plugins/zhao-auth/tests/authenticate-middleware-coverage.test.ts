import type Koa from "koa";
import type { Core } from "@strapi/strapi";
import type { AuthUser, AuthMiddlewareConfig } from "../server/src/utils/types";
import authenticateMiddlewareFactory from "../server/src/middlewares/authenticate";

function createMockStrapi(): Core.Strapi {
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
              throw new Error("invalid token");
            },
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
    request: { body: {} } as Koa.Request,
    params: {},
    method: "GET",
    path,
    state: {},
    unauthorized: (msg: string) => { throw new Error(`Unauthorized: ${msg}`); },
  } as unknown as Koa.Context;
}

describe("authenticate middleware - matchesPath branches", () => {
  it("精确匹配路径", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/api/auth"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/auth");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("前缀匹配（路径以 pattern/ 开头）", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/api/auth"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/auth/login");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("通配符匹配（pattern 以 * 结尾）", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/api/public/*"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/public/any/nested/path");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("通配符不匹配不同前缀", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/api/public/*"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/private/data");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
  });

  it("正则匹配（/^...$/ 格式）", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/^\\/api\\/v\\d+\\/.*$/"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/v1/resource");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("无效正则返回 false（不匹配）", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/^+invalid/"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/test");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
  });

  it("不匹配任何 publicPath 时需认证", async () => {
    const config: AuthMiddlewareConfig = { publicPaths: ["/api/auth"] };
    const middleware = authenticateMiddlewareFactory(config, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx(undefined, "/api/other");
    const next = jest.fn();
    await expect(middleware(ctx, next)).rejects.toThrow("缺少认证令牌");
  });

  it("认证成功后同时设置 ctx.user", async () => {
    const middleware = authenticateMiddlewareFactory({}, { strapi: createMockStrapi() } as { strapi: Core.Strapi });
    const ctx = createMockCtx("Bearer valid-token");
    const next = jest.fn();
    await middleware(ctx, next);
    expect(ctx.state.user).toBeDefined();
    expect((ctx as any).user).toBeDefined();
    expect((ctx as any).user.id).toBe(1);
  });
});
