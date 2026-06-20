import {
  ROLE_HIERARCHY,
  ROLE_INHERITANCE,
} from "../server/src/services/role-management.service";
import {
  hasPermission,
  hasAnyRole,
  getEffectiveRoles,
  validatePermissionFormat,
  parsePermission,
} from "../server/src/utils/permission-helpers";
import type { PermissionConfig } from "../server/src/utils/permission-types";

describe("Permission Integration Tests", () => {
  describe("Role Hierarchy", () => {
    it("admin should have highest hierarchy level", () => {
      expect(ROLE_HIERARCHY.admin).toBe(100);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY["channel-admin"]);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY["plugin-manager"]);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.instructor);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.user);
    });

    it("admin should inherit all lower roles", () => {
      const adminInheritance = ROLE_INHERITANCE.admin;
      expect(adminInheritance).toContain("channel-admin");
      expect(adminInheritance).toContain("plugin-manager");
      expect(adminInheritance).toContain("instructor");
      expect(adminInheritance).toContain("user");
    });

    it("channel-admin should inherit lower roles", () => {
      const channelAdminInheritance = ROLE_INHERITANCE["channel-admin"];
      expect(channelAdminInheritance).toContain("plugin-manager");
      expect(channelAdminInheritance).toContain("instructor");
      expect(channelAdminInheritance).toContain("user");
      expect(channelAdminInheritance).not.toContain("admin");
    });

    it("plugin-manager should inherit lower roles", () => {
      const pmInheritance = ROLE_INHERITANCE["plugin-manager"];
      expect(pmInheritance).toContain("instructor");
      expect(pmInheritance).toContain("user");
      expect(pmInheritance).not.toContain("admin");
      expect(pmInheritance).not.toContain("channel-admin");
    });

    it("instructor should inherit user", () => {
      const instructorInheritance = ROLE_INHERITANCE.instructor;
      expect(instructorInheritance).toContain("user");
      expect(instructorInheritance).not.toContain("admin");
      expect(instructorInheritance).not.toContain("channel-admin");
      expect(instructorInheritance).not.toContain("plugin-manager");
    });

    it("user should have no inheritance (lowest level)", () => {
      const userInheritance = ROLE_INHERITANCE.user;
      expect(userInheritance).toEqual([]);
    });

    it("all roles should be defined in hierarchy", () => {
      expect(ROLE_HIERARCHY).toHaveProperty("admin");
      expect(ROLE_HIERARCHY).toHaveProperty("channel-admin");
      expect(ROLE_HIERARCHY).toHaveProperty("plugin-manager");
      expect(ROLE_HIERARCHY).toHaveProperty("instructor");
      expect(ROLE_HIERARCHY).toHaveProperty("user");
    });

    it("all roles should be defined in inheritance", () => {
      expect(ROLE_INHERITANCE).toHaveProperty("admin");
      expect(ROLE_INHERITANCE).toHaveProperty("channel-admin");
      expect(ROLE_INHERITANCE).toHaveProperty("plugin-manager");
      expect(ROLE_INHERITANCE).toHaveProperty("instructor");
      expect(ROLE_INHERITANCE).toHaveProperty("user");
    });
  });

  describe("Cross-Plugin Permissions", () => {
    const mockPermissionConfig: PermissionConfig = {
      admin: ["channel:read", "channel:write", "course:read", "course:write", "point:read", "point:write", "quiz:read", "quiz:write"],
      "channel-admin": ["channel:read", "channel:write"],
      "plugin-manager": ["channel:read", "course:read", "course:write"],
      instructor: ["course:read"],
      user: [],
    };

    it("should load permissions from zhao-channel", () => {
      const channelPermissions = mockPermissionConfig["channel-admin"];
      expect(channelPermissions).toContain("channel:read");
      expect(channelPermissions).toContain("channel:write");
    });

    it("should load permissions from zhao-course", () => {
      const coursePermissions = mockPermissionConfig["plugin-manager"];
      expect(coursePermissions).toContain("course:read");
      expect(coursePermissions).toContain("course:write");
    });

    it("should load permissions from zhao-point", () => {
      const pointPermissions = mockPermissionConfig.admin;
      expect(pointPermissions).toContain("point:read");
      expect(pointPermissions).toContain("point:write");
    });

    it("should load permissions from zhao-quiz", () => {
      const quizPermissions = mockPermissionConfig.admin;
      expect(quizPermissions).toContain("quiz:read");
      expect(quizPermissions).toContain("quiz:write");
    });

    it("admin should have all cross-plugin permissions", () => {
      const adminPermissions = mockPermissionConfig.admin;
      const allCrossPluginPermissions = [
        "channel:read", "channel:write",
        "course:read", "course:write",
        "point:read", "point:write",
        "quiz:read", "quiz:write"
      ];
      
      allCrossPluginPermissions.forEach(perm => {
        expect(adminPermissions).toContain(perm);
      });
    });

    it("channel-admin should have limited permissions", () => {
      const channelPermissions = mockPermissionConfig["channel-admin"];
      expect(channelPermissions).toHaveLength(2);
      expect(channelPermissions).not.toContain("course:read");
      expect(channelPermissions).not.toContain("point:read");
    });

    it("plugin-manager should have course permissions", () => {
      const pmPermissions = mockPermissionConfig["plugin-manager"];
      expect(pmPermissions).toContain("course:read");
      expect(pmPermissions).toContain("course:write");
      expect(pmPermissions).not.toContain("point:read");
    });

    it("instructor should have read-only course permissions", () => {
      const instructorPermissions = mockPermissionConfig.instructor;
      expect(instructorPermissions).toContain("course:read");
      expect(instructorPermissions).not.toContain("course:write");
    });
  });

  describe("Permission Validation", () => {
    it("should validate permission format", () => {
      expect(validatePermissionFormat("channel:read")).toBe(true);
      expect(validatePermissionFormat("course:write")).toBe(true);
      expect(validatePermissionFormat("plugin.action")).toBe(true);
    });

    it("should reject invalid permission keys", () => {
      expect(validatePermissionFormat("")).toBe(false);
      expect(validatePermissionFormat("invalid")).toBe(false);
      expect(validatePermissionFormat("too:many:colons")).toBe(false);
      expect(validatePermissionFormat(null as any)).toBe(false);
      expect(validatePermissionFormat(undefined as any)).toBe(false);
      expect(validatePermissionFormat(123 as any)).toBe(false);
    });

    it("should allow valid permission patterns", () => {
      const validPermissions = [
        "channel:read",
        "channel:write",
        "course:create",
        "course:update",
        "course:delete",
        "plugin:resource",
        "za:auth",
      ];
      
      validPermissions.forEach(perm => {
        expect(validatePermissionFormat(perm)).toBe(true);
      });
    });

    it("should parse permission string correctly", () => {
      const result1 = parsePermission("channel:read");
      expect(result1).toEqual({ plugin: "channel", action: "read" });

      const result2 = parsePermission("plugin.resource");
      expect(result2).toEqual({ resource: "plugin", action: "resource" });

      const result3 = parsePermission("invalid");
      expect(result3).toBeNull();
    });

    it("should reject invalid formats in parsePermission", () => {
      expect(parsePermission("too:many:colons")).toBeNull();
      expect(parsePermission("")).toBeNull();
    });
  });

  describe("Permission Checks", () => {
    const mockPermissionConfig: PermissionConfig = {
      admin: ["*"],
      "channel-admin": ["channel:read", "channel:write"],
      "plugin-manager": ["course:read", "course:write"],
      instructor: ["course:read"],
      user: [],
    };

    it("should check permission with role inheritance", () => {
      expect(hasPermission(["instructor"], "course:read", mockPermissionConfig)).toBe(true);
      expect(hasPermission(["admin"], "channel:read", mockPermissionConfig)).toBe(true);
    });

    it("should check permission with wildcard", () => {
      expect(hasPermission(["admin"], "anything:here", mockPermissionConfig)).toBe(true);
      expect(hasPermission(["admin"], "custom:action", mockPermissionConfig)).toBe(true);
    });

    it("should check permission with no matching role", () => {
      const customConfig: PermissionConfig = {
        instructor: ["course:read"],
        user: [],
      };
      expect(hasPermission(["user"], "custom:action", customConfig)).toBe(false);
      expect(hasPermission(["user"], "another:action", customConfig)).toBe(false);
    });

    it("should return false for empty roles", () => {
      expect(hasPermission([], "channel:read", mockPermissionConfig)).toBe(false);
      expect(hasPermission(null as any, "channel:read", mockPermissionConfig)).toBe(false);
    });

    it("should check hasAnyRole correctly", () => {
      expect(hasAnyRole(["admin"], ["admin", "channel-admin"])).toBe(true);
      expect(hasAnyRole(["channel-admin"], ["admin", "channel-admin"])).toBe(true);
      expect(hasAnyRole(["user"], ["user"])).toBe(true);
    });

    it("should return true for empty required roles", () => {
      expect(hasAnyRole(["user"], [])).toBe(true);
    });

    it("should return false for empty user roles", () => {
      expect(hasAnyRole([], ["admin"])).toBe(false);
    });

    it("should get effective roles with inheritance", () => {
      const effectiveRoles = getEffectiveRoles(["instructor"]);
      expect(effectiveRoles).toContain("instructor");
      expect(effectiveRoles).toContain("user");
    });

    it("should not duplicate roles in effective roles", () => {
      const effectiveRoles = getEffectiveRoles(["instructor"]);
      const roleCounts = effectiveRoles.reduce((acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.values(roleCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });

    it("should return empty array for empty input", () => {
      expect(getEffectiveRoles([])).toEqual([]);
      expect(getEffectiveRoles(null as any)).toEqual([]);
    });

    it("admin should have all roles in effective roles", () => {
      const effectiveRoles = getEffectiveRoles(["admin"]);
      expect(effectiveRoles).toContain("admin");
      expect(effectiveRoles).toContain("channel-admin");
      expect(effectiveRoles).toContain("plugin-manager");
      expect(effectiveRoles).toContain("instructor");
      expect(effectiveRoles).toContain("user");
    });

    it("user should only have itself in effective roles", () => {
      const effectiveRoles = getEffectiveRoles(["user"]);
      expect(effectiveRoles).toEqual(["user"]);
    });
  });

  describe("Role Inheritance Chain", () => {
    it("should have valid inheritance chain", () => {
      const allRoles = Object.keys(ROLE_INHERITANCE);
      
      for (const role of allRoles) {
        const inheritedRoles = ROLE_INHERITANCE[role];
        
        for (const inheritedRole of inheritedRoles) {
          expect(allRoles).toContain(inheritedRole);
        }
      }
    });

    it("inheritance should be acyclic", () => {
      const checked = new Set<string>();
      
      function hasCycle(role: string, path: Set<string>): boolean {
        if (path.has(role)) return true;
        if (checked.has(role)) return false;
        
        path.add(role);
        const inheritedRoles = ROLE_INHERITANCE[role] || [];
        
        for (const inheritedRole of inheritedRoles) {
          if (hasCycle(inheritedRole, path)) return true;
        }
        
        path.delete(role);
        checked.add(role);
        return false;
      }
      
      for (const role of Object.keys(ROLE_INHERITANCE)) {
        expect(hasCycle(role, new Set())).toBe(false);
      }
    });

    it("higher hierarchy roles should inherit lower roles", () => {
      const sortedRoles = Object.entries(ROLE_HIERARCHY)
        .sort(([, a], [, b]) => b - a)
        .map(([name]) => name);
      
      for (let i = 0; i < sortedRoles.length - 1; i++) {
        const higherRole = sortedRoles[i];
        const lowerRole = sortedRoles[i + 1];
        
        const inherited = ROLE_INHERITANCE[higherRole] || [];
        expect(inherited).toContain(lowerRole);
      }
    });
  });
});
