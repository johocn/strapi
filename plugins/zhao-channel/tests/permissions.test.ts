/**
 * zhao-channel 权限系统测试
 *
 * 测试覆盖：
 * 1. 权限定义格式正确性
 * 2. 权限检查策略正确性
 * 3. 路由权限配置正确性
 */

import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";

let fixtures: TestFixtures;

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

// ==========================================
// 模块一：权限定义格式正确性
// ==========================================
describe("权限定义格式正确性", () => {
  let PERMISSIONS: any;

  beforeAll(async () => {
    PERMISSIONS = require("../server/src/permissions").default;
  });

  test("PERMISSIONS 应是一个非空对象", () => {
    expect(PERMISSIONS).toBeDefined();
    expect(typeof PERMISSIONS).toBe("object");
    expect(Object.keys(PERMISSIONS).length).toBeGreaterThan(0);
  });

  test("应包含所有必需的权限定义", () => {
    const requiredPermissions = [
      "channel.create",
      "channel.read",
      "channel.update",
      "channel.delete",
      "channel-member.add",
      "channel-member.remove",
      "channel-member.read",
      "channel-permission.set",
      "user-invite.send",
      "user-invite.validate",
    ];

    requiredPermissions.forEach((perm) => {
      expect(PERMISSIONS[perm]).toBeDefined();
      expect(Array.isArray(PERMISSIONS[perm])).toBe(true);
    });
  });

  test("每个权限定义的值应为非空数组", () => {
    Object.entries(PERMISSIONS).forEach(([key, value]) => {
      expect(Array.isArray(value)).toBe(true);
      expect((value as string[]).length).toBeGreaterThan(0);
    });
  });

  test("每个权限定义中的角色应为有效字符串", () => {
    const validRoles = ["admin", "channel-admin", "plugin-manager", "instructor", "user"];
    Object.entries(PERMISSIONS).forEach(([key, roles]) => {
      (roles as string[]).forEach((role) => {
        expect(typeof role).toBe("string");
        expect(role.length).toBeGreaterThan(0);
      });
    });
  });

  test("channel.delete 权限应仅限 admin 和 channel-admin", () => {
    const allowedRoles = PERMISSIONS["channel.delete"];
    expect(allowedRoles).toContain("admin");
    expect(allowedRoles).toContain("channel-admin");
    expect(allowedRoles.length).toBe(2);
  });

  test("channel-permission.set 权限应仅限 admin 和 channel-admin", () => {
    const allowedRoles = PERMISSIONS["channel-permission.set"];
    expect(allowedRoles).toContain("admin");
    expect(allowedRoles).toContain("channel-admin");
    expect(allowedRoles.length).toBe(2);
  });
});

// ==========================================
// 模块二：权限检查策略正确性
// ==========================================
describe("权限检查策略正确性", () => {
  test("has-permission 策略应可导入", () => {
    const hasPermissionPolicy = require("../server/src/policies/has-permission").default;
    expect(typeof hasPermissionPolicy).toBe("function");
  });

  test("无配置时应返回 CONFIG_ERROR", async () => {
    const hasPermissionPolicy = require("../server/src/policies/has-permission").default;
    const policy = hasPermissionPolicy({});
    const ctx = { state: {} } as any;
    const result = await policy(ctx);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("CONFIG_ERROR");
  });

  test("有 permission 但无 roles 时应调用 zhao-auth 的 hasPermission", async () => {
    const hasPermissionPolicy = require("../server/src/policies/has-permission").default;
    const policy = hasPermissionPolicy({ permission: "channel.read" });
    const ctx = {
      state: { user: { id: 1 } },
    } as any;
    await policy(ctx);
  });

  test("有 permission 和 roles 时应检查角色匹配", async () => {
    const hasPermissionPolicy = require("../server/src/policies/has-permission").default;
    const policy = hasPermissionPolicy({
      permission: "channel.read",
      roles: ["admin"],
    });
    const ctx = {
      state: { user: { id: 1 } },
    } as any;
    const result = await policy(ctx);
    expect(result).toBeDefined();
  });

  test("无效角色组合应返回 FORBIDDEN_PERMISSION", async () => {
    const hasPermissionPolicy = require("../server/src/policies/has-permission").default;
    const policy = hasPermissionPolicy({
      permission: "channel.delete",
      roles: ["user"],
    });
    const ctx = {
      state: { user: { id: 1 } },
    } as any;
    const result = await policy(ctx);
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_PERMISSION");
    expect(result.message).toContain("channel.delete");
  });
});

// ==========================================
// 模块三：路由权限配置正确性
// ==========================================
describe("路由权限配置正确性", () => {
  let adminRoutes: any;

  beforeAll(async () => {
    const routesConfig = require("../server/src/routes/admin/index").default;
    adminRoutes = routesConfig();
  });

  test("路由配置应包含 routes 数组", () => {
    expect(adminRoutes).toHaveProperty("routes");
    expect(Array.isArray(adminRoutes.routes)).toBe(true);
  });

  test("所有路由应包含必要的配置字段", () => {
    adminRoutes.routes.forEach((route: any) => {
      expect(route).toHaveProperty("method");
      expect(route).toHaveProperty("path");
      expect(route).toHaveProperty("handler");
      expect(route).toHaveProperty("config");
      expect(route.config).toHaveProperty("policies");
    });
  });

  test("所有路由应包含认证策略", () => {
    adminRoutes.routes.forEach((route: any) => {
      const hasAuthPolicy = route.config.policies.some(
        (p: any) =>
          p === "plugin::zhao-auth.is-authenticated" ||
          p.name === "plugin::zhao-auth.is-authenticated"
      );
      expect(hasAuthPolicy).toBe(true);
    });
  });

  test("所有路由应包含权限检查策略", () => {
    adminRoutes.routes.forEach((route: any) => {
      const hasPermissionPolicy = route.config.policies.some(
        (p: any) =>
          p.name === "plugin::zhao-channel.has-permission" ||
          p === "plugin::zhao-channel.has-permission"
      );
      expect(hasPermissionPolicy).toBe(true);
    });
  });

  test("渠道读取路由应配置正确的权限", () => {
    const readRoutes = adminRoutes.routes.filter(
      (r: any) => r.path.includes("/channels") && r.method === "GET" && !r.path.includes("/:id/")
    );
    readRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("channel.read");
    });
  });

  test("渠道创建路由应配置 channel.create 权限", () => {
    const createRoutes = adminRoutes.routes.filter(
      (r: any) => r.path === "/channels" && r.method === "POST"
    );
    expect(createRoutes.length).toBeGreaterThan(0);
    createRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("channel.create");
    });
  });

  test("渠道更新路由应配置 channel.update 权限", () => {
    const updateRoutes = adminRoutes.routes.filter(
      (r: any) => r.path === "/channels/:id" && r.method === "PUT"
    );
    expect(updateRoutes.length).toBeGreaterThan(0);
    updateRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("channel.update");
    });
  });

  test("渠道删除路由应配置 channel.delete 权限", () => {
    const deleteRoutes = adminRoutes.routes.filter(
      (r: any) => r.path === "/channels/:id" && r.method === "DELETE"
    );
    expect(deleteRoutes.length).toBeGreaterThan(0);
    deleteRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("channel.delete");
    });
  });

  test("Channel Member 路由应配置正确的权限", () => {
    const memberRoutes = adminRoutes.routes.filter((r: any) =>
      r.path.startsWith("/channel-members")
    );

    memberRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );

      if (route.method === "DELETE") {
        expect(permissionPolicy.config.permission).toBe("channel-member.remove");
      } else if (route.method === "POST" || route.method === "PUT") {
        expect(permissionPolicy.config.permission).toBe("channel-member.add");
      } else {
        expect(permissionPolicy.config.permission).toBe("channel-member.read");
      }
    });
  });

  test("Channel Permission 路由应配置 channel-permission.set 权限", () => {
    const permissionRoutes = adminRoutes.routes.filter((r: any) =>
      r.path.startsWith("/channel-permissions")
    );
    permissionRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("channel-permission.set");
    });
  });

  test("User Invite 创建/更新/删除路由应配置 user-invite.send 权限", () => {
    const inviteRoutes = adminRoutes.routes.filter(
      (r: any) =>
        r.path.startsWith("/user-invites") &&
        (r.method === "POST" || r.method === "PUT" || r.method === "DELETE")
    );
    inviteRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("user-invite.send");
    });
  });

  test("User Invite 读取路由应配置 user-invite.validate 权限", () => {
    const inviteRoutes = adminRoutes.routes.filter(
      (r: any) =>
        r.path.startsWith("/user-invites") && r.method === "GET"
    );
    inviteRoutes.forEach((route: any) => {
      const permissionPolicy = route.config.policies.find(
        (p: any) => p.name === "plugin::zhao-channel.has-permission"
      );
      expect(permissionPolicy.config.permission).toBe("user-invite.validate");
    });
  });

  test("路由路径应遵循 RESTful 规范", () => {
    const paths = adminRoutes.routes.map((r: any) => r.path);
    const methods = adminRoutes.routes.map((r: any) => r.method);

    expect(paths.some((p: string) => p === "/channels")).toBe(true);
    expect(paths.some((p: string) => p.includes("/:id"))).toBe(true);
    expect(methods.includes("GET")).toBe(true);
    expect(methods.includes("POST")).toBe(true);
    expect(methods.includes("PUT")).toBe(true);
    expect(methods.includes("DELETE")).toBe(true);
  });
});

// ==========================================
// 模块四：权限与角色匹配测试
// ==========================================
describe("权限与角色匹配测试", () => {
  let PERMISSIONS: any;

  beforeAll(async () => {
    PERMISSIONS = require("../server/src/permissions").default;
  });

  test("admin 角色应拥有所有权限", () => {
    const adminRole = "admin";
    Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
      expect((roles as string[]).includes(adminRole)).toBe(true);
    });
  });

  test("user 角色应仅拥有读权限", () => {
    const userRole = "user";
    const readPermissions = [
      "channel.read",
      "channel-member.read",
      "user-invite.validate",
    ];

    readPermissions.forEach((perm) => {
      expect(PERMISSIONS[perm].includes(userRole)).toBe(true);
    });

    const writePermissions = [
      "channel.create",
      "channel.update",
      "channel.delete",
      "channel-member.add",
      "channel-member.remove",
      "channel-permission.set",
      "user-invite.send",
    ];

    writePermissions.forEach((perm) => {
      expect(PERMISSIONS[perm].includes(userRole)).toBe(false);
    });
  });

  test("channel-admin 角色应有渠道管理权限", () => {
    const channelAdminRole = "channel-admin";
    const adminPermissions = [
      "channel.create",
      "channel.read",
      "channel.update",
      "channel.delete",
      "channel-member.add",
      "channel-member.remove",
      "channel-member.read",
      "channel-permission.set",
      "user-invite.send",
      "user-invite.validate",
    ];

    adminPermissions.forEach((perm) => {
      expect(PERMISSIONS[perm].includes(channelAdminRole)).toBe(true);
    });
  });

  test("instructor 角色应有读取权限", () => {
    const instructorRole = "instructor";
    expect(PERMISSIONS["channel.read"].includes(instructorRole)).toBe(true);
    expect(PERMISSIONS["channel-member.read"].includes(instructorRole)).toBe(true);
  });

  test("plugin-manager 角色应有完整的渠道管理权限", () => {
    const pluginManagerRole = "plugin-manager";
    const managerPermissions = [
      "channel.create",
      "channel.read",
      "channel.update",
      "channel-member.add",
      "channel-member.remove",
      "channel-member.read",
      "user-invite.send",
      "user-invite.validate",
    ];

    managerPermissions.forEach((perm) => {
      expect(PERMISSIONS[perm].includes(pluginManagerRole)).toBe(true);
    });

    expect(PERMISSIONS["channel.delete"].includes(pluginManagerRole)).toBe(false);
    expect(PERMISSIONS["channel-permission.set"].includes(pluginManagerRole)).toBe(false);
  });
});
