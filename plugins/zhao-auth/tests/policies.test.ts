/**
 * 内置策略单元测试
 *
 * 测试策略：
 * - 直接导入策略工厂，传入 mock strapi 实例
 * - 验证 is-authenticated / has-role / has-course-permission 策略逻辑
 */
import type { Core } from "@strapi/strapi";
import type { AuthContext, AuthUser, PolicyResult } from "../server/src/utils/types";

import createIsAuthenticated from "../server/src/policies/is-authenticated";
import createHasRole from "../server/src/policies/has-role";
import createHasCoursePermission from "../server/src/policies/has-course-permission";

function createStrapi(): Core.Strapi {
  return {
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  } as unknown as Core.Strapi;
}

function makeContext(overrides?: Partial<AuthUser>): AuthContext {
  return {
    user: overrides ? { id: 1, ...overrides } as AuthUser : null,
    params: {},
    body: {},
    query: {},
    headers: {},
    method: "GET",
    path: "/api/test",
  };
}

// ========== is-authenticated ==========
describe("is-authenticated policy", () => {
  it("用户存在时应通过", () => {
    const policy = createIsAuthenticated(createStrapi());
    const ctx = makeContext({ email: "a@b.com" });
    const result = policy(ctx) as PolicyResult;
    expect(result.passed).toBe(true);
  });

  it("用户为 null 时应返回 UNAUTHENTICATED", () => {
    const policy = createIsAuthenticated(createStrapi());
    const ctx = makeContext();
    const result = policy(ctx) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("UNAUTHENTICATED");
  });
});

// ========== has-role ==========
describe("has-role policy", () => {
  it("用户角色匹配时应通过", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext({ roles: ["admin"] });
    const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
    expect(result.passed).toBe(true);
  });

  it("用户角色不匹配时应返回 FORBIDDEN_ROLE", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext({ roles: ["user"] });
    const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("多角色匹配任一即可通过", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext({ roles: ["editor"] });
    const result = policy(ctx, { roles: ["admin", "editor"] }) as PolicyResult;
    expect(result.passed).toBe(true);
  });

  it("用户无 roles 时应返回 FORBIDDEN_ROLE", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext({});
    const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("空角色列表视为未配置，应通过", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext({ roles: ["admin"] });
    const result = policy(ctx, { roles: [] }) as PolicyResult;
    expect(result.passed).toBe(true);
  });

  it("用户未认证时应返回 UNAUTHENTICATED", () => {
    const policy = createHasRole(createStrapi());
    const ctx = makeContext();
    const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("UNAUTHENTICATED");
  });
});

// ========== has-course-permission ==========
describe("has-course-permission policy", () => {
  it("用户未认证时应返回 UNAUTHENTICATED", () => {
    const policy = createHasCoursePermission(createStrapi());
    const ctx = makeContext();
    const result = policy(ctx, { permission: "course.read" }) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("未配置 permission 和 roles 时应返回 CONFIG_ERROR", () => {
    const policy = createHasCoursePermission(createStrapi());
    const ctx = makeContext({ roles: ["user"] });
    const result = policy(ctx, {}) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("CONFIG_ERROR");
  });

  // ========== 角色检查模式 ==========
  describe("角色检查模式", () => {
    it("用户角色匹配时应通过", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["admin"] });
      const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("用户角色不匹配时应返回 FORBIDDEN_ROLE", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["user"] });
      const result = policy(ctx, { roles: ["admin"] }) as PolicyResult;
      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // ========== 权限检查模式 ==========
  describe("权限检查模式", () => {
    it("course.create - admin 有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["admin"] });
      const result = policy(ctx, { permission: "course.create" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("course.create - channel-admin 有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["channel-admin"] });
      const result = policy(ctx, { permission: "course.create" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("course.create - user 无权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["user"] });
      const result = policy(ctx, { permission: "course.create" }) as PolicyResult;
      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("course.read - 所有角色都有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["user"] });
      const result = policy(ctx, { permission: "course.read" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("course.delete - instructor 无权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["instructor"] });
      const result = policy(ctx, { permission: "course.delete" }) as PolicyResult;
      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("user.manage - channel-admin 有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["channel-admin"] });
      const result = policy(ctx, { permission: "user.manage" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("user.manage - course-manager 无权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["course-manager"] });
      const result = policy(ctx, { permission: "user.manage" }) as PolicyResult;
      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("learning.access - 所有角色都有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["user"] });
      const result = policy(ctx, { permission: "learning.access" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("comment.create - 所有角色都有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["user"] });
      const result = policy(ctx, { permission: "comment.create" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("permission.config - admin 和 channel-admin 有权限", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["channel-admin"] });
      const result = policy(ctx, { permission: "permission.config" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("不存在的权限应返回 PERMISSION_NOT_FOUND", () => {
      const policy = createHasCoursePermission(createStrapi());
      const ctx = makeContext({ roles: ["admin"] });
      const result = policy(ctx, { permission: "unknown.permission" }) as PolicyResult;
      expect(result.passed).toBe(false);
      expect(result.code).toBe("PERMISSION_NOT_FOUND");
    });
  });

  // ========== 渠道管理员权限验证 ==========
  describe("channel-admin 角色权限", () => {
    const adminCtx = makeContext({ roles: ["channel-admin"] });
    const policy = createHasCoursePermission(createStrapi());

    it("channel-admin 可创建课程", () => {
      const result = policy(adminCtx, { permission: "course.create" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("channel-admin 可删除课程", () => {
      const result = policy(adminCtx, { permission: "course.delete" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("channel-admin 可管理用户", () => {
      const result = policy(adminCtx, { permission: "user.manage" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("channel-admin 可配置权限", () => {
      const result = policy(adminCtx, { permission: "permission.config" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });
  });

  // ========== 普通用户权限验证 ==========
  describe("user 角色权限", () => {
    const userCtx = makeContext({ roles: ["user"] });
    const policy = createHasCoursePermission(createStrapi());

    it("user 可阅读课程", () => {
      const result = policy(userCtx, { permission: "course.read" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("user 可访问学习内容", () => {
      const result = policy(userCtx, { permission: "learning.access" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("user 可发表评论", () => {
      const result = policy(userCtx, { permission: "comment.create" }) as PolicyResult;
      expect(result.passed).toBe(true);
    });

    it("user 不可创建课程", () => {
      const result = policy(userCtx, { permission: "course.create" }) as PolicyResult;
      expect(result.passed).toBe(false);
    });

    it("user 不可管理用户", () => {
      const result = policy(userCtx, { permission: "user.manage" }) as PolicyResult;
      expect(result.passed).toBe(false);
    });
  });
});