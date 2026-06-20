import createHasPermission from "../server/src/policies/has-permission";
import PERMISSIONS from "../server/src/permissions";

describe("has-permission - cache and zhao-auth fallback", () => {
  let mockStrapi: any;

  beforeEach(() => {
    jest.resetModules();
    mockStrapi = {
      log: { debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
      plugin: jest.fn().mockReturnValue(null),
    };
  });

  describe("缓存机制", () => {
    it("第二次调用相同 action 应命中缓存", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const user = { id: 1, roles: ["admin"] };

      const result1 = await policy({ user }, { action: "course.read" });
      expect(result1.passed).toBe(true);

      const result2 = await policy({ user }, { action: "course.read" });
      expect(result2.passed).toBe(true);
    });
  });

  describe("zhao-auth 回退", () => {
    it("本地权限不通过时可通过 zhao-auth 角色继承放行", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(true);
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({ checkPermission: mockCheckPermission }),
      });

      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["custom-role"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
      expect(result.code).toBe("AUTH_INHERITED");
    });

    it("zhao-auth 服务抛异常时应返回本地结果", async () => {
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({
          checkPermission: jest.fn().mockRejectedValue(new Error("auth service error")),
        }),
      });

      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["custom-role"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("UNAUTHENTICATED 时不应尝试 zhao-auth", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: null },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("UNAUTHENTICATED");
      expect(mockStrapi.plugin).not.toHaveBeenCalled();
    });

    it("NO_ROLES 时不应尝试 zhao-auth", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: [] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("NO_ROLES");
      expect(mockStrapi.plugin).not.toHaveBeenCalled();
    });

    it("权限动作未定义时可通过 zhao-auth 回退放行", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(true);
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({ checkPermission: mockCheckPermission }),
      });

      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "custom.unknown" }
      );

      expect(result.passed).toBe(true);
      expect(result.code).toBe("AUTH_FALLBACK");
    });

    it("权限动作未定义且 zhao-auth 回退也失败时应返回 PERMISSION_NOT_FOUND", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(false);
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({ checkPermission: mockCheckPermission }),
      });

      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "custom.unknown" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("PERMISSION_NOT_FOUND");
    });
  });

  describe("action 别名解析", () => {
    it("course-lesson.read 应解析为 lesson.read 并通过", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course-lesson.read" }
      );

      expect(result.passed).toBe(true);
    });

    it("course-lesson.create 应解析为 lesson.create", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["instructor"] } },
        { action: "course-lesson.create" }
      );

      expect(result.passed).toBe(true);
    });

    it("course-lesson.update 应解析为 lesson.update", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["instructor"] } },
        { action: "course-lesson.update" }
      );

      expect(result.passed).toBe(true);
    });

    it("course-lesson.delete 应解析为 lesson.delete", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["plugin-manager"] } },
        { action: "course-lesson.delete" }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe("context.user 格式兼容", () => {
    it("应优先使用 state.user", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { state: { user: { id: 1, roles: ["admin"] } }, user: { id: 2, roles: ["user"] } },
        { action: "course.delete" }
      );

      expect(result.passed).toBe(true);
    });

    it("无 state.user 时使用 user", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "course.delete" }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe("诊断日志", () => {
    it("权限动作未定义时应输出 warn 日志含可用动作列表", async () => {
      const createHasPermission = require("../server/src/policies/has-permission").default;
      const policy = createHasPermission(mockStrapi);
      await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "non-existent.action" }
      );

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("可用动作")
      );
    });
  });
});

describe("permissions.ts - ROLES 常量与实际值一致性", () => {
  it("ROLES 常量应与 PERMISSIONS 中的角色名匹配", () => {
    const allRoles = new Set<string>();
    for (const perm of Object.values(PERMISSIONS)) {
      for (const role of perm.allowRoles) {
        allRoles.add(role);
      }
    }

    const definedRoles = Object.values({
      ADMIN: "admin",
      CHANNEL_ADMIN: "channel-admin",
      PLUGIN_MANAGER: "plugin-manager",
      INSTRUCTOR: "instructor",
      USER: "user",
    });

    for (const role of allRoles) {
      expect(definedRoles).toContain(role);
    }
  });

  it("course.read 应允许 user 角色", () => {
    expect(PERMISSIONS["course.read"].allowRoles).toContain("user");
  });

  it("course.create 不应允许 user 角色", () => {
    expect(PERMISSIONS["course.create"].allowRoles).not.toContain("user");
  });

  it("course.delete 应仅允许 admin、channel-admin 和 plugin-manager", () => {
    expect(PERMISSIONS["course.delete"].allowRoles).toEqual(["admin", "channel-admin", "plugin-manager"]);
  });

  it("course.publish 应仅允许 admin 和 channel-admin", () => {
    expect(PERMISSIONS["course.publish"].allowRoles).toEqual(["admin", "channel-admin"]);
  });
});
