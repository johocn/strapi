import PERMISSIONS, { ROLES } from "../server/src/permissions";

describe("权限定义完整性测试", () => {
  describe("角色定义", () => {
    it("应定义所有 zhao-auth 角色", () => {
      expect(ROLES.ADMIN).toBe("admin");
      expect(ROLES.CHANNEL_ADMIN).toBe("channel-admin");
      expect(ROLES.PLUGIN_MANAGER).toBe("plugin-manager");
      expect(ROLES.INSTRUCTOR).toBe("instructor");
      expect(ROLES.USER).toBe("user");
    });

    it("角色值应为字符串常量", () => {
      expect(typeof ROLES.ADMIN).toBe("string");
      expect(typeof ROLES.CHANNEL_ADMIN).toBe("string");
      expect(typeof ROLES.PLUGIN_MANAGER).toBe("string");
      expect(typeof ROLES.INSTRUCTOR).toBe("string");
      expect(typeof ROLES.USER).toBe("string");
    });
  });

  describe("course-category 权限", () => {
    it("应包含 read 权限且 user 及以上可用", () => {
      const perm = PERMISSIONS["course-category.read"];
      expect(perm).toBeDefined();
      expect(perm.allowRoles).toContain(ROLES.USER);
      expect(perm.allowRoles).toContain(ROLES.PLUGIN_MANAGER);
      expect(perm.allowRoles).toContain(ROLES.ADMIN);
    });

    it("应包含 create 权限且 plugin-manager 及以上可用", () => {
      const perm = PERMISSIONS["course-category.create"];
      expect(perm).toBeDefined();
      expect(perm.allowRoles).toContain(ROLES.PLUGIN_MANAGER);
      expect(perm.allowRoles).not.toContain(ROLES.USER);
    });

    it("应包含 update 权限且 plugin-manager 及以上可用", () => {
      const perm = PERMISSIONS["course-category.update"];
      expect(perm).toBeDefined();
      expect(perm.allowRoles).toContain(ROLES.PLUGIN_MANAGER);
      expect(perm.allowRoles).not.toContain(ROLES.USER);
    });

    it("应包含 delete 权限且仅 channel-admin 及以上可用", () => {
      const perm = PERMISSIONS["course-category.delete"];
      expect(perm).toBeDefined();
      expect(perm.allowRoles).toContain(ROLES.ADMIN);
      expect(perm.allowRoles).toContain(ROLES.CHANNEL_ADMIN);
      expect(perm.allowRoles).not.toContain(ROLES.PLUGIN_MANAGER);
    });
  });

  describe("course-tag 权限", () => {
    it("应包含完整的 CRUD 权限", () => {
      expect(PERMISSIONS["course-tag.read"]).toBeDefined();
      expect(PERMISSIONS["course-tag.create"]).toBeDefined();
      expect(PERMISSIONS["course-tag.update"]).toBeDefined();
      expect(PERMISSIONS["course-tag.delete"]).toBeDefined();
    });
  });

  describe("course 权限", () => {
    it("应包含完整的 CRUD 权限", () => {
      expect(PERMISSIONS["course.read"]).toBeDefined();
      expect(PERMISSIONS["course.create"]).toBeDefined();
      expect(PERMISSIONS["course.update"]).toBeDefined();
      expect(PERMISSIONS["course.delete"]).toBeDefined();
    });

    it("应包含 publish 权限且仅 channel-admin 及以上可用", () => {
      const perm = PERMISSIONS["course.publish"];
      expect(perm).toBeDefined();
      expect(perm.allowRoles).toContain(ROLES.ADMIN);
      expect(perm.allowRoles).toContain(ROLES.CHANNEL_ADMIN);
      expect(perm.allowRoles).not.toContain(ROLES.PLUGIN_MANAGER);
    });
  });

  describe("knowledge-point 权限", () => {
    it("应包含完整的 CRUD 权限", () => {
      expect(PERMISSIONS["knowledge-point.read"]).toBeDefined();
      expect(PERMISSIONS["knowledge-point.create"]).toBeDefined();
      expect(PERMISSIONS["knowledge-point.update"]).toBeDefined();
      expect(PERMISSIONS["knowledge-point.delete"]).toBeDefined();
    });
  });

  describe("lesson 权限", () => {
    it("应包含完整的 CRUD 权限", () => {
      expect(PERMISSIONS["lesson.read"]).toBeDefined();
      expect(PERMISSIONS["lesson.create"]).toBeDefined();
      expect(PERMISSIONS["lesson.update"]).toBeDefined();
      expect(PERMISSIONS["lesson.delete"]).toBeDefined();
    });
  });

  describe("user-course 权限", () => {
    it("应包含 grant 和 read 权限", () => {
      expect(PERMISSIONS["user-course.read"]).toBeDefined();
      expect(PERMISSIONS["user-course.grant"]).toBeDefined();
    });

    it("grant 权限仅 channel-admin 及以上可用", () => {
      const perm = PERMISSIONS["user-course.grant"];
      expect(perm.allowRoles).toContain(ROLES.CHANNEL_ADMIN);
      expect(perm.allowRoles).not.toContain(ROLES.PLUGIN_MANAGER);
    });
  });

  describe("course-progress 权限", () => {
    it("应仅包含 read 和 update 权限", () => {
      expect(PERMISSIONS["course-progress.read"]).toBeDefined();
      expect(PERMISSIONS["course-progress.update"]).toBeDefined();
      expect(PERMISSIONS["course-progress.create"]).toBeUndefined();
      expect(PERMISSIONS["course-progress.delete"]).toBeUndefined();
    });

    it("update 权限所有登录用户可用", () => {
      const perm = PERMISSIONS["course-progress.update"];
      expect(perm.allowRoles).toContain(ROLES.USER);
    });
  });

  describe("lesson-progress 权限", () => {
    it("应仅包含 read 和 update 权限", () => {
      expect(PERMISSIONS["lesson-progress.read"]).toBeDefined();
      expect(PERMISSIONS["lesson-progress.update"]).toBeDefined();
      expect(PERMISSIONS["lesson-progress.create"]).toBeUndefined();
      expect(PERMISSIONS["lesson-progress.delete"]).toBeUndefined();
    });
  });
});

describe("has-permission 策略测试", () => {
  let createHasPermission: (strapi: any) => any;
  let mockStrapi: any;

  beforeEach(() => {
    jest.resetModules();
    mockStrapi = {
      log: {
        debug: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      },
      plugin: jest.fn().mockReturnValue(null),
    };
    createHasPermission = require("../server/src/policies/has-permission").default;
  });

  describe("认证检查", () => {
    it("未认证用户应被拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy({ user: null }, { action: "course.read" });

      expect(result.passed).toBe(false);
      expect(result.code).toBe("UNAUTHENTICATED");
    });

    it("用户无 id 应被拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy({ user: { roles: ["user"] } }, { action: "course.read" });

      expect(result.passed).toBe(false);
      expect(result.code).toBe("UNAUTHENTICATED");
    });

    it("无 action 配置应返回错误", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        {}
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("PERMISSION_NOT_FOUND");
    });
  });

  describe("权限动作检查", () => {
    it("未定义的权限动作应被拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "non-existent.action" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("PERMISSION_NOT_FOUND");
    });

    it("user 角色应能读取课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
    });

    it("user 角色不应能创建课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.create" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("instructor 角色应能创建课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["instructor"] } },
        { action: "course.create" }
      );

      expect(result.passed).toBe(true);
    });

    it("instructor 角色不应能删除课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["instructor"] } },
        { action: "course.delete" }
      );

      expect(result.passed).toBe(false);
    });

    it("admin 角色应能删除课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "course.delete" }
      );

      expect(result.passed).toBe(true);
    });

    it("admin 角色应能发布课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "course.publish" }
      );

      expect(result.passed).toBe(true);
    });

    it("plugin-manager 角色不应能发布课程", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["plugin-manager"] } },
        { action: "course.publish" }
      );

      expect(result.passed).toBe(false);
    });
  });

  describe("角色覆盖检查", () => {
    it("应支持 config.roles 覆盖检查", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.read", roles: ["user"] }
      );

      expect(result.passed).toBe(true);
    });

    it("角色不匹配时应拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.read", roles: ["admin"] }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_ROLE_OVERRIDE");
    });
  });

  describe("用户角色为空检查", () => {
    it("用户无角色应被拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: [] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("NO_ROLES");
    });

    it("用户角色为 undefined 应被拒绝", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1 } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("NO_ROLES");
    });
  });

  describe("上下文格式兼容", () => {
    it("应支持 state.user 格式", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { state: { user: { id: 1, roles: ["user"] } } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
    });

    it("应支持直接 user 格式", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe("zhao-auth 集成", () => {
    it("应优先使用本地权限检查结果", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(false);
      const mockService = jest.fn().mockReturnValue({
        checkPermission: mockCheckPermission,
      });
      mockStrapi.plugin.mockReturnValue({
        service: mockService,
      });

      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
    });

    it("本地检查不通过时可通过 zhao-auth 角色继承放行", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(true);
      const mockService = jest.fn().mockReturnValue({
        checkPermission: mockCheckPermission,
      });
      mockStrapi.plugin.mockReturnValue({
        service: mockService,
      });

      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["unknown-role"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
      expect(result.code).toBe("AUTH_INHERITED");
    });

    it("zhao-auth 回退也失败时应返回 FORBIDDEN_PERMISSION", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(false);
      const mockService = jest.fn().mockReturnValue({
        checkPermission: mockCheckPermission,
      });
      mockStrapi.plugin.mockReturnValue({
        service: mockService,
      });

      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["unknown-role"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(false);
      expect(result.code).toBe("FORBIDDEN_PERMISSION");
    });

    it("权限动作未定义时可通过 zhao-auth 回退放行", async () => {
      const mockCheckPermission = jest.fn().mockResolvedValue(true);
      const mockService = jest.fn().mockReturnValue({
        checkPermission: mockCheckPermission,
      });
      mockStrapi.plugin.mockReturnValue({
        service: mockService,
      });

      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "non-existent.action" }
      );

      expect(result.passed).toBe(true);
      expect(result.code).toBe("AUTH_FALLBACK");
    });
  });

  describe("action 别名解析", () => {
    it("course-lesson.read 应解析为 lesson.read", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user"] } },
        { action: "course-lesson.read" }
      );

      expect(result.passed).toBe(true);
    });

    it("course-lesson.create 应解析为 lesson.create", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["instructor"] } },
        { action: "course-lesson.create" }
      );

      expect(result.passed).toBe(true);
    });

    it("course-lesson.delete 应解析为 lesson.delete", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["plugin-manager"] } },
        { action: "course-lesson.delete" }
      );

      expect(result.passed).toBe(true);
    });

    it("未定义的别名应保持原样", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "course.read" }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe("诊断日志", () => {
    it("权限动作未定义时应输出 warn 日志", async () => {
      const policy = createHasPermission(mockStrapi);
      await policy(
        { user: { id: 1, roles: ["admin"] } },
        { action: "non-existent.action" }
      );

      expect(mockStrapi.log.warn).toHaveBeenCalled();
    });
  });

  describe("多层角色检查", () => {
    it("admin 角色应具有所有权限", async () => {
      const policy = createHasPermission(mockStrapi);

      const actions = [
        "course.read",
        "course.create",
        "course.update",
        "course.delete",
        "course.publish",
        "course-category.delete",
        "user-course.grant",
      ];

      for (const action of actions) {
        const result = await policy(
          { user: { id: 1, roles: ["admin"] } },
          { action }
        );
        expect(result.passed).toBe(true);
      }
    });

    it("多角色用户应匹配任一允许的角色", async () => {
      const policy = createHasPermission(mockStrapi);
      const result = await policy(
        { user: { id: 1, roles: ["user", "instructor"] } },
        { action: "course.delete" }
      );

      expect(result.passed).toBe(false);
    });
  });
});

describe("权限层级关系", () => {
  it("read 权限应最宽松", () => {
    const readRoles = PERMISSIONS["course.read"].allowRoles;
    const createRoles = PERMISSIONS["course.create"].allowRoles;
    expect(readRoles.length).toBeGreaterThan(createRoles.length);
  });

  it("create/update 权限应相同层级", () => {
    const createRoles = PERMISSIONS["course.create"].allowRoles;
    const updateRoles = PERMISSIONS["course.update"].allowRoles;
    expect(createRoles).toEqual(updateRoles);
  });

  it("delete 权限应最严格", () => {
    const createRoles = PERMISSIONS["course.create"].allowRoles;
    const deleteRoles = PERMISSIONS["course.delete"].allowRoles;
    expect(deleteRoles.length).toBeLessThan(createRoles.length);
  });
});

describe("权限定义数量统计", () => {
  it("应包含所有必需实体的权限", () => {
    const entities = [
      "course-category",
      "course-tag",
      "course",
      "knowledge-point",
      "lesson",
      "user-course",
      "course-progress",
      "lesson-progress",
    ];

    for (const entity of entities) {
      const entityPerms = Object.keys(PERMISSIONS).filter((k) => k.startsWith(entity + "."));
      expect(entityPerms.length).toBeGreaterThan(0);
    }
  });

  it("总权限定义数量应大于 20", () => {
    const count = Object.keys(PERMISSIONS).length;
    expect(count).toBeGreaterThan(20);
  });
});
