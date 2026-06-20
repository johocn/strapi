/**
 * auth.service 单元测试
 *
 * 测试策略：
 * - 使用 mock strapi 实例，避免启动真实 Strapi
 * - jwt.service 同样会被 mock
 * - 验证 authenticate / authorize / extractToken / getUser 行为
 * - 通过类型断言访问 registerPolicy（未暴露在接口上）
 */
import type { Core } from "@strapi/strapi";
import type Koa from "koa";
import type { AuthUser, AuthContext, PolicyConfig, PolicyHandler, AuthService } from "../server/src/utils/types";
import authServiceFactory from "../server/src/services/auth.service";

// registerPolicy 不在 AuthService 接口上，通过扩展类型访问
interface AuthServiceWithRegister extends AuthService {
  registerPolicy: (name: string, handler: PolicyHandler) => void;
}

// ========== Mock 工具 ==========
function createMockStrapi(): Core.Strapi {
  const jwtService = {
    verify: async (token: string) => {
      if (token === "expired.token") throw new Error("jwt expired");
      return { id: 1, email: "test@test.com" };
    },
    getSecret: () => "test-secret",
    extractToken: (ctx: any) => {
      const authHeader = ctx?.get?.("authorization") || ctx?.headers?.authorization;
      if (!authHeader || typeof authHeader !== "string") return null;
      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") return null;
      if (!parts[1]) return null;
      return parts[1];
    },
  };

  const mockStrapi = {
    plugin: (name: string) => {
      if (name === "zhao-auth") {
        return {
          service: (svc: string) => {
            if (svc === "auth") {
              return authServiceFactory({ strapi: mockStrapi as Core.Strapi });
            }
            if (svc === "jwt") return jwtService;
            throw new Error(`Unknown service: ${svc}`);
          },
        };
      }
      throw new Error(`Unknown plugin: ${name}`);
    },
    config: {
      get: (key: string) => {
        if (key === "plugin::users-permissions.jwtSecret") return "test-secret-key";
        return undefined;
      },
    },
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    db: {
      query: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    },
  } as unknown as Core.Strapi;
  return mockStrapi;
}

function createMockCtx(overrides?: Record<string, unknown>): Koa.Context {
  return {
    get: (name: string) => {
      if (name === "authorization") return "Bearer test.jwt.token";
      return undefined;
    },
    request: {
      body: {},
    } as Koa.Request,
    params: {},
    method: "GET",
    path: "/api/test",
    state: {},
    ...overrides,
  } as unknown as Koa.Context;
}

function createMockCtxWithAuth(authHeader: string | undefined): Koa.Context {
  return {
    get: (name: string) => name === "authorization" ? authHeader : undefined,
    request: {
      body: {},
    } as Koa.Request,
    params: {},
    method: "GET",
    path: "/api/test",
    state: {},
  } as unknown as Koa.Context;
}

// ========== 套件 ==========
describe("auth.service", () => {
  let authService: AuthServiceWithRegister;
  let strapi: Core.Strapi;

  beforeEach(() => {
    strapi = createMockStrapi();
    authService = authServiceFactory({ strapi }) as AuthServiceWithRegister;
  });

  // ── authenticate ──
  describe("authenticate", () => {
    it("应解码 JWT 并返回标准化的 AuthUser", async () => {
      const user = await authService.authenticate("valid.token");
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
    });

    it("应将 role 字符串标准化为 roles 数组", async () => {
      const mockJwt = { id: 1, email: "a@b.com", role: "admin" };
      const mockStrapi = {
        plugin: () => ({
          service: () => ({
            verify: async () => mockJwt,
            getSecret: () => "secret",
          }),
        }),
        config: { get: () => "secret" },
        log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        db: { query: jest.fn().mockReturnValue({ findOne: jest.fn() }) },
      } as unknown as Core.Strapi;
      const svc = authServiceFactory({ strapi: mockStrapi });
      const user = await svc.authenticate("token");
      expect(user.roles).toEqual(["admin"]);
    });

    it("应将 role 对象标准化为 roles 数组", async () => {
      const mockJwt = { id: 2, email: "c@d.com", role: { name: "manager" } };
      const mockStrapi = {
        plugin: () => ({
          service: () => ({
            verify: async () => mockJwt,
            getSecret: () => "secret",
          }),
        }),
        config: { get: () => "secret" },
        log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        db: { query: jest.fn().mockReturnValue({ findOne: jest.fn() }) },
      } as unknown as Core.Strapi;
      const svc = authServiceFactory({ strapi: mockStrapi });
      const user = await svc.authenticate("token");
      expect(user.roles).toEqual(["manager"]);
    });

    it("当 JWT 无 role 时 roles 应为空数组", async () => {
      const mockJwt = { id: 3, email: "e@f.com" };
      const mockStrapi = {
        plugin: () => ({
          service: () => ({
            verify: async () => mockJwt,
            getSecret: () => "secret",
          }),
        }),
        config: { get: () => "secret" },
        log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        db: { query: jest.fn().mockReturnValue({ findOne: jest.fn() }) },
      } as unknown as Core.Strapi;
      const svc = authServiceFactory({ strapi: mockStrapi });
      const user = await svc.authenticate("token");
      expect(user.roles).toEqual([]);
    });

    it("应保留 JWT 的额外 payload", async () => {
      const mockJwt = { id: 4, email: "g@h.com", channelId: 10, extra: "data" };
      const mockStrapi = {
        plugin: () => ({
          service: () => ({
            verify: async () => mockJwt,
            getSecret: () => "secret",
          }),
        }),
        config: { get: () => "secret" },
        log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        db: { query: jest.fn().mockReturnValue({ findOne: jest.fn() }) },
      } as unknown as Core.Strapi;
      const svc = authServiceFactory({ strapi: mockStrapi });
      const user = await svc.authenticate("token");
      expect((user as Record<string, unknown>).channelId).toBe(10);
      expect((user as Record<string, unknown>).extra).toBe("data");
    });

    it("token 过期时应抛出异常", async () => {
      await expect(authService.authenticate("expired.token")).rejects.toThrow("jwt expired");
    });
  });

  // ── authorize ──
  describe("authorize", () => {
    const dummyContext: AuthContext = {
      user: { id: 1, email: "test@test.com", roles: ["admin"] },
      params: {},
      body: {},
      query: {},
      headers: {},
      method: "GET",
      path: "/api/test",
    };

    it("空策略数组应返回 passed: true", async () => {
      const result = await authService.authorize(dummyContext, []);
      expect(result.passed).toBe(true);
    });

    it("未传入 policies 时返回 passed: true（undefined）", async () => {
      const result = await authService.authorize(dummyContext, undefined as unknown as PolicyConfig[]);
      expect(result.passed).toBe(true);
    });

    it("所有策略通过时应返回 passed: true", async () => {
      const handler: PolicyHandler = async () => ({ passed: true });
      authService.registerPolicy("always-pass-1", handler);
      authService.registerPolicy("always-pass-2", handler);

      const result = await authService.authorize(dummyContext, [
        { name: "always-pass-1" },
        { name: "always-pass-2" },
      ]);
      expect(result.passed).toBe(true);
    });

    it("任意策略失败时应短路返回失败结果", async () => {
      authService.registerPolicy("pass-policy", async () => ({ passed: true }));
      authService.registerPolicy("fail-policy", async () => ({
        passed: false,
        code: "FORBIDDEN",
        message: "权限不足",
      }));
      authService.registerPolicy("unreachable-policy", async () => ({ passed: true }));

      const result = await authService.authorize(dummyContext, [
        { name: "pass-policy" },
        { name: "fail-policy" },
        { name: "unreachable-policy" },
      ]);
      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN");
      expect(result.message).toBe("权限不足");
    });

    it("未注册的策略应返回 POLICY_NOT_FOUND", async () => {
      const result = await authService.authorize(dummyContext, [
        { name: "non-existent-policy" },
      ]);
      expect(result.passed).toBe(false);
      expect(result.code).toBe("POLICY_NOT_FOUND");
    });

    it("可通过 registerPolicy 覆盖已注册的策略", async () => {
      authService.registerPolicy("test-policy", async () => ({
        passed: false,
        message: "original",
      }));
      authService.registerPolicy("test-policy", async () => ({
        passed: true,
        message: "overridden",
      }));

      const result = await authService.authorize(dummyContext, [
        { name: "test-policy" },
      ]);
      expect(result.passed).toBe(true);
    });
  });

  // ── extractToken ──
  describe("extractToken", () => {
    it("应从 Authorization: Bearer 头中提取 token", () => {
      const ctx = createMockCtx();
      const token = authService.extractToken(ctx);
      expect(token).toBe("test.jwt.token");
    });

    it("无 Authorization 头时应返回 null", () => {
      const ctx = createMockCtxWithAuth(undefined);
      const token = authService.extractToken(ctx);
      expect(token).toBeNull();
    });

    it("非 Bearer 格式应返回 null", () => {
      const ctx = createMockCtxWithAuth("Basic dGVzdDpwYXNz");
      const token = authService.extractToken(ctx);
      expect(token).toBeNull();
    });

    it("只有 Bearer 没有 token 时应返回 null", () => {
      const ctx = createMockCtxWithAuth("Bearer ");
      const token = authService.extractToken(ctx);
      expect(token).toBeNull();
    });
  });

  // ── getUser ──
  describe("getUser", () => {
    it("应从 ctx.state.user 中获取用户", () => {
      const testUser: AuthUser = { id: 1, email: "test@test.com" };
      const ctx = createMockCtx({ state: { user: testUser } });
      const user = authService.getUser(ctx);
      expect(user).toEqual(testUser);
    });

    it("ctx.state.user 为空时应返回 null", () => {
      const ctx = createMockCtx();
      const user = authService.getUser(ctx);
      expect(user).toBeNull();
    });
  });

  // ── registerPolicy ──
  describe("registerPolicy", () => {
    it("注册后策略应能被 authorize 调用", async () => {
      authService.registerPolicy("custom-check", async (ctx, config) => {
        if (ctx.user?.id === 1) return { passed: true };
        return { passed: false, code: "FORBIDDEN", message: "非指定用户" };
      });

      const resultPass = await authService.authorize(
        { user: { id: 1 }, params: {}, body: {}, query: {}, headers: {}, method: "GET", path: "/" },
        [{ name: "custom-check" }]
      );
      expect(resultPass.passed).toBe(true);

      const resultFail = await authService.authorize(
        { user: { id: 99 }, params: {}, body: {}, query: {}, headers: {}, method: "GET", path: "/" },
        [{ name: "custom-check" }]
      );
      expect(resultFail.passed).toBe(false);
      expect(resultFail.code).toBe("FORBIDDEN");
    });
  });

  // ── 内置策略加载（is-authenticated） ──
  describe("内置策略 is-authenticated", () => {
    it("有用户时通过", async () => {
      const ctx: AuthContext = {
        user: { id: 1, email: "a@b.com" },
        params: {}, body: {}, query: {}, headers: {},
        method: "GET", path: "/",
      };
      const result = await authService.authorize(ctx, [{ name: "is-authenticated" }]);
      expect(result.passed).toBe(true);
    });

    it("无用户时返回 UNAUTHENTICATED", async () => {
      const ctx: AuthContext = {
        user: null,
        params: {}, body: {}, query: {}, headers: {},
        method: "GET", path: "/",
      };
      const result = await authService.authorize(ctx, [{ name: "is-authenticated" }]);
      expect(result.passed).toBe(false);
      expect(result.code).toBe("UNAUTHENTICATED");
    });
  });
});