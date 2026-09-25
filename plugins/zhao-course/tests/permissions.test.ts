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
      "course",
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

  it("总权限定义数量应为 19", () => {
    const count = Object.keys(PERMISSIONS).length;
    expect(count).toBe(19);
  });
});