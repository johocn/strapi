import type { Core } from "@strapi/strapi";
import authServiceFactory from "../server/src/services/auth.service";
import type { AuthService, AuthUser, PolicyConfig, PolicyHandler } from "../server/src/utils/types";

interface AuthServiceWithRegister extends AuthService {
  registerPolicy: (name: string, handler: PolicyHandler) => void;
}

function createFullMockStrapi(overrides?: Record<string, unknown>): Core.Strapi {
  const jwtService = {
    verify: async (token: string) => {
      if (token === "expired.token") throw new Error("jwt expired");
      if (token === "roles-array") return { id: 1, email: "a@b.com", roles: ["admin", "user"] };
      if (token === "roles-objects") return { id: 2, email: "c@d.com", roles: [{ type: "instructor" }, { type: "user" }] };
      if (token === "roles-empty-strings") return { id: 3, email: "e@f.com", roles: ["", "admin", "  "] };
      if (token === "role-string") return { id: 4, email: "g@h.com", role: "channel-admin" };
      if (token === "role-object-type") return { id: 5, email: "i@j.com", role: { type: "plugin-manager" } };
      if (token === "role-object-name") return { id: 6, email: "k@l.com", role: { name: "instructor" } };
      if (token === "role-empty-string") return { id: 7, email: "m@n.com", role: "" };
      if (token === "no-role") return { id: 8, email: "o@p.com" };
      return { id: 99, email: "default@test.com" };
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

  const dbFindOne = jest.fn().mockResolvedValue(null);
  const mockStrapi = {
    plugin: (name: string) => {
      if (name === "zhao-auth") {
        return {
          service: (svc: string) => {
            if (svc === "auth") return authServiceFactory({ strapi: mockStrapi as Core.Strapi });
            if (svc === "jwt") return jwtService;
            throw new Error(`Unknown service: ${svc}`);
          },
        };
      }
      throw new Error(`Unknown plugin: ${name}`);
    },
    config: { get: () => "test-secret-key" },
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    db: {
      query: jest.fn().mockReturnValue({ findOne: dbFindOne }),
    },
    ...overrides,
  } as unknown as Core.Strapi;
  return mockStrapi;
}

describe("auth.service - normalizeUser branches", () => {
  it("roles 为字符串数组时正确提取", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("roles-array");
    expect(user.roles).toEqual(["admin", "user"]);
  });

  it("roles 为对象数组时提取 type 字段", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("roles-objects");
    expect(user.roles).toEqual(["instructor", "user"]);
  });

  it("roles 数组中过滤空字符串", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("roles-empty-strings");
    expect(user.roles).toEqual(["admin"]);
  });

  it("role 为字符串时转为数组", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("role-string");
    expect(user.roles).toEqual(["channel-admin"]);
  });

  it("role 为对象且含 type 时提取 type", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("role-object-type");
    expect(user.roles).toEqual(["plugin-manager"]);
  });

  it("role 为对象且含 name 时提取 name", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("role-object-name");
    expect(user.roles).toEqual(["instructor"]);
  });

  it("role 为空字符串时 roles 为空数组", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("role-empty-string");
    expect(user.roles).toEqual([]);
  });
});

describe("auth.service - authenticate DB role loading", () => {
  it("JWT 无角色时从数据库加载 role（数组）", async () => {
    const dbFindOne = jest.fn().mockResolvedValue({
      id: 8,
      role: [{ type: "admin" }, { type: "user" }],
    });
    const strapi = createFullMockStrapi();
    (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: dbFindOne });
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("no-role");
    expect(user.roles).toContain("admin");
    expect(user.roles).toContain("user");
  });

  it("JWT 无角色时从数据库加载 role（单对象 type）", async () => {
    const dbFindOne = jest.fn().mockResolvedValue({
      id: 8,
      role: { type: "instructor" },
    });
    const strapi = createFullMockStrapi();
    (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: dbFindOne });
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("no-role");
    expect(user.roles).toEqual(["instructor"]);
  });

  it("JWT 无角色时数据库用户无 role 字段", async () => {
    const dbFindOne = jest.fn().mockResolvedValue({ id: 8 });
    const strapi = createFullMockStrapi();
    (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: dbFindOne });
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("no-role");
    expect(user.roles).toEqual([]);
  });

  it("JWT 无角色时数据库查询失败不崩溃", async () => {
    const dbFindOne = jest.fn().mockRejectedValue(new Error("DB error"));
    const strapi = createFullMockStrapi();
    (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: dbFindOne });
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const user = await svc.authenticate("no-role");
    expect(user).toBeDefined();
    expect(user.id).toBe(8);
  });
});

describe("auth.service - authorize error handling", () => {
  const dummyContext = {
    user: { id: 1, email: "test@test.com", roles: ["admin"] },
    params: {}, body: {}, query: {}, headers: {}, method: "GET", path: "/",
  };

  it("策略抛出 UnauthorizedError 时返回 UNAUTHENTICATED", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const err = new Error("not authorized") as any;
    err.name = "UnauthorizedError";
    svc.registerPolicy("throw-unauth", async () => { throw err; });
    const result = await svc.authorize(dummyContext, [{ name: "throw-unauth" }]);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("策略抛出 ForbiddenError 时返回 FORBIDDEN", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const err = new Error("forbidden") as any;
    err.name = "ForbiddenError";
    svc.registerPolicy("throw-forbidden", async () => { throw err; });
    const result = await svc.authorize(dummyContext, [{ name: "throw-forbidden" }]);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
  });

  it("策略抛出 PolicyError 时返回 FORBIDDEN", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    const err = new Error("policy error") as any;
    err.name = "PolicyError";
    svc.registerPolicy("throw-policy", async () => { throw err; });
    const result = await svc.authorize(dummyContext, [{ name: "throw-policy" }]);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
  });

  it("策略抛出未知错误时返回 POLICY_ERROR", async () => {
    const strapi = createFullMockStrapi();
    const svc = authServiceFactory({ strapi }) as AuthServiceWithRegister;
    svc.registerPolicy("throw-unknown", async () => { throw new Error("unknown"); });
    const result = await svc.authorize(dummyContext, [{ name: "throw-unknown" }]);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("POLICY_ERROR");
  });
});
