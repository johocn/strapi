import {
  hasPermission,
  hasAnyRole,
  getEffectiveRoles,
  validatePermissionFormat,
  parsePermission,
} from "../server/src/utils/permission-helpers";
import { PermissionConfig } from "../server/src/utils/permission-types";

describe("Permission Helpers", () => {
  describe("hasPermission", () => {
    const permissionConfig: PermissionConfig = {
      admin: ["*"],
      'channel-admin': ["plugin:manage", "content:read", "content:create"],
      'plugin-manager': ["plugin:read", "plugin:update"],
      instructor: ["content:read", "course:create", "course:update"],
      user: ["content:read"],
    };

    it("应该返回 true 当用户具有所需权限", () => {
      expect(hasPermission(["user"], "content:read", permissionConfig)).toBe(true);
    });

    it("应该考虑继承的权限 - admin 通过继承链可以访问 user 的权限", () => {
      expect(hasPermission(["admin"], "content:read", permissionConfig)).toBe(true);
    });

    it("应该考虑继承的权限 - channel-admin 应该能访问自己的权限", () => {
      expect(hasPermission(["channel-admin"], "plugin:manage", permissionConfig)).toBe(true);
    });

    it("应该考虑继承的权限 - admin 应该能访问 plugin-manager 的权限", () => {
      expect(hasPermission(["admin"], "plugin:read", permissionConfig)).toBe(true);
    });

    it("应该考虑继承的权限 - instructor 应该能访问 user 的权限", () => {
      expect(hasPermission(["instructor"], "content:read", permissionConfig)).toBe(true);
    });

    it("应该支持通配符权限 - admin 可以访问任何权限", () => {
      expect(hasPermission(["admin"], "any:permission", permissionConfig)).toBe(true);
      expect(hasPermission(["admin"], "plugin:manage", permissionConfig)).toBe(true);
      expect(hasPermission(["admin"], "content:delete", permissionConfig)).toBe(true);
    });

    it("应该返回 false 当用户角色列表为空", () => {
      expect(hasPermission([], "content:read", permissionConfig)).toBe(false);
    });

    it("应该返回 false 当用户角色列表为 null", () => {
      expect(hasPermission(null as any, "content:read", permissionConfig)).toBe(false);
    });

    it("应该支持多角色 - 任一角色有权限即可", () => {
      expect(hasPermission(["user", "plugin-manager"], "plugin:update", permissionConfig)).toBe(true);
    });

    it("user 不应访问 instructor 的权限", () => {
      expect(hasPermission(["user"], "course:create", permissionConfig)).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("应该返回 true 当用户具有任意所需角色", () => {
      expect(hasAnyRole(["admin"], ["admin", "user"])).toBe(true);
      expect(hasAnyRole(["user"], ["admin", "user"])).toBe(true);
    });

    it("应该考虑继承的角色 - admin 通过继承链拥有 user 角色", () => {
      expect(hasAnyRole(["admin"], ["user"])).toBe(true);
    });

    it("应该考虑继承的角色 - instructor 拥有 user", () => {
      expect(hasAnyRole(["instructor"], ["user"])).toBe(true);
      expect(hasAnyRole(["channel-admin"], ["user"])).toBe(true);
      expect(hasAnyRole(["plugin-manager"], ["user"])).toBe(true);
    });

    it("应该返回 false 当用户角色列表为空", () => {
      expect(hasAnyRole([], ["admin", "user"])).toBe(false);
    });

    it("应该返回 false 当用户角色列表为 null", () => {
      expect(hasAnyRole(null as any, ["admin"])).toBe(false);
    });

    it("应该返回 true 当所需角色列表为空", () => {
      expect(hasAnyRole(["admin"], [])).toBe(true);
    });

    it("user 不应拥有 admin 角色", () => {
      expect(hasAnyRole(["user"], ["admin"])).toBe(false);
      expect(hasAnyRole(["user"], ["channel-admin"])).toBe(false);
    });
  });

  describe("getEffectiveRoles", () => {
    it("应该返回 admin 及其继承的所有低权限角色", () => {
      const roles = getEffectiveRoles(["admin"]);
      expect(roles).toContain("admin");
      expect(roles).toContain("channel-admin");
      expect(roles).toContain("plugin-manager");
      expect(roles).toContain("instructor");
      expect(roles).toContain("user");
    });

    it("应该返回 channel-admin 及其继承的角色", () => {
      const roles = getEffectiveRoles(["channel-admin"]);
      expect(roles).toContain("channel-admin");
      expect(roles).toContain("plugin-manager");
      expect(roles).toContain("instructor");
      expect(roles).toContain("user");
      expect(roles).not.toContain("admin");
    });

    it("应该返回 plugin-manager 及其继承的角色", () => {
      const roles = getEffectiveRoles(["plugin-manager"]);
      expect(roles).toContain("plugin-manager");
      expect(roles).toContain("instructor");
      expect(roles).toContain("user");
      expect(roles).not.toContain("channel-admin");
      expect(roles).not.toContain("admin");
    });

    it("应该返回 instructor 及其继承的 user", () => {
      const roles = getEffectiveRoles(["instructor"]);
      expect(roles).toContain("instructor");
      expect(roles).toContain("user");
      expect(roles).not.toContain("plugin-manager");
      expect(roles).not.toContain("channel-admin");
      expect(roles).not.toContain("admin");
    });

    it("应该返回 user 自身（无继承）", () => {
      const roles = getEffectiveRoles(["user"]);
      expect(roles).toEqual(["user"]);
    });

    it("应该正确处理多角色场景", () => {
      const roles = getEffectiveRoles(["instructor", "channel-admin"]);
      expect(roles).toContain("instructor");
      expect(roles).toContain("channel-admin");
      expect(roles).toContain("user");
      expect(roles).toContain("plugin-manager");
    });

    it("应该去重继承的角色", () => {
      const roles = getEffectiveRoles(["instructor", "plugin-manager"]);
      expect(roles.filter(r => r === "user")).toHaveLength(1);
      expect(roles.filter(r => r === "instructor")).toHaveLength(1);
    });

    it("应该返回空数组当角色列表为空", () => {
      const roles = getEffectiveRoles([]);
      expect(roles).toEqual([]);
    });

    it("应该返回空数组当角色列表为 null", () => {
      const roles = getEffectiveRoles(null as any);
      expect(roles).toEqual([]);
    });
  });

  describe("validatePermissionFormat", () => {
    it("应该验证正确的冒号格式权限", () => {
      expect(validatePermissionFormat("plugin:read")).toBe(true);
      expect(validatePermissionFormat("content:create")).toBe(true);
      expect(validatePermissionFormat("user:delete")).toBe(true);
    });

    it("应该验证正确的点号格式权限", () => {
      expect(validatePermissionFormat("plugin.read")).toBe(true);
      expect(validatePermissionFormat("content.create")).toBe(true);
    });

    it("应该拒绝无效格式", () => {
      expect(validatePermissionFormat("invalid")).toBe(false);
      expect(validatePermissionFormat("too:many:colons")).toBe(false);
      expect(validatePermissionFormat("")).toBe(false);
      expect(validatePermissionFormat(null as any)).toBe(false);
      expect(validatePermissionFormat(undefined as any)).toBe(false);
    });

    it("应该拒绝包含空格的权限字符串", () => {
      expect(validatePermissionFormat("plugin: read")).toBe(false);
      expect(validatePermissionFormat("plugin read")).toBe(false);
    });
  });

  describe("parsePermission", () => {
    it("应该正确解析冒号格式权限", () => {
      const result = parsePermission("plugin:read");
      expect(result).toEqual({ plugin: "plugin", action: "read" });
    });

    it("应该正确解析点号格式权限", () => {
      const result = parsePermission("content.create");
      expect(result).toEqual({ resource: "content", action: "create" });
    });

    it("应该返回 null 当权限格式无效", () => {
      expect(parsePermission("invalid")).toBe(null);
      expect(parsePermission("")).toBe(null);
    });
  });
});
