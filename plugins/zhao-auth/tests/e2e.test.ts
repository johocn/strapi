/**
 * 端到端测试 - 用户注册、角色分配和权限生效
 */
import type { Core } from "@strapi/strapi";
import createRoleManagementService from "../server/src/services/role-management.service";
import { ROLE_INHERITANCE, ROLE_HIERARCHY } from "../server/src/services/role-management.service";
import { getEffectiveRoles } from "../server/src/utils/permission-helpers";

interface MockUser {
  id: number;
  email: string;
  username: string;
  roles: string[];
}

function createMockStrapi(): Core.Strapi {
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();

  const mockQuery = jest.fn();
  mockQuery.mockReturnValue({
    findOne: mockFindOne,
    update: mockUpdate,
    create: mockCreate,
    findMany: mockFindMany,
    count: mockCount,
  });

  return {
    db: {
      query: mockQuery,
    },
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  } as any;
}

describe("End-to-End Permission Tests", () => {
  let strapi: Core.Strapi;
  let roleManagementService: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    roleManagementService = createRoleManagementService({ strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Role Assignment", () => {
    it("should assign channel-admin role to user", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, roles: [{ name: "user" }, { name: "channel-admin" }] });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.assignRole(1, "channel-admin", 2, "Promoted");

      expect(result.success).toBe(true);
      expect(result.user.roles).toContain("channel-admin");
    });

    it("should prevent assigning invalid role", async () => {
      await expect(
        roleManagementService.assignRole(1, "super-admin", 1)
      ).rejects.toThrow("不支持的角色类型");
    });

    it("should prevent duplicate role assignment", async () => {
      const mockUser = { id: 1, roles: [{ name: "channel-admin" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce({ 
        ...mockUser, 
        roles: [{ name: "channel-admin" }] 
      });

      await expect(
        roleManagementService.assignRole(1, "channel-admin", 1)
      ).rejects.toThrow("用户已拥有角色");
    });

    it("should handle non-existent user", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce(null);

      await expect(
        roleManagementService.assignRole(999, "channel-admin", 1)
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("Role Revocation", () => {
    it("should revoke role from user", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }, { name: "channel-admin" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce({ id: 1, roles: [{ name: "user" }] });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.revokeRole(1, "channel-admin", 2, "Demoted");

      expect(result.success).toBe(true);
      expect(result.user.roles).not.toContain("channel-admin");
    });

    it("should prevent revoking role user does not have", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce({ ...mockUser });

      await expect(
        roleManagementService.revokeRole(1, "channel-admin", 1)
      ).rejects.toThrow("用户未拥有角色");
    });

    it("should prevent revoking last role", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce({ ...mockUser });

      await expect(
        roleManagementService.revokeRole(1, "user", 1)
      ).rejects.toThrow("用户至少需要拥有一个角色");
    });
  });

  describe("Batch Role Assignment", () => {
    it("should batch assign roles to multiple users", async () => {
      const userIds = [1, 2, 3];
      
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      userIds.forEach(() => {
        mockQueryResult.findOne.mockResolvedValueOnce({ 
          id: 1, 
          roles: [{ name: "user" }] 
        });
      });
      mockQueryResult.update.mockResolvedValue({ success: true });

      const result = await roleManagementService.batchAssignRoles(
        userIds,
        "instructor",
        1,
        "Batch promotion"
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every((r: any) => r.success)).toBe(true);
    });

    it("should handle partial batch failure", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne
        .mockResolvedValueOnce({ id: 1, roles: [{ name: "user" }] })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 3, roles: [{ name: "user" }] });
      mockQueryResult.update.mockResolvedValue({ success: true });

      const result = await roleManagementService.batchAssignRoles(
        [1, 999, 3],
        "instructor",
        1
      );

      expect(result.success).toBe(false);
      expect(result.results.filter((r: any) => r.success).length).toBe(2);
      expect(result.results.filter((r: any) => !r.success).length).toBe(1);
    });
  });

  describe("User Roles Retrieval", () => {
    it("should retrieve user roles", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        roles: [
          { id: 1, name: "user", description: "普通用户" },
          { id: 2, name: "instructor", description: "讲师" },
        ],
      };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce(mockUser);

      const result = await roleManagementService.getUserRoles(1);

      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe("test@example.com");
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0].name).toBe("user");
      expect(result.roles[1].name).toBe("instructor");
    });

    it("should handle non-existent user", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findOne.mockResolvedValueOnce(null);

      await expect(
        roleManagementService.getUserRoles(999)
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("Role Action Logging", () => {
    it("should log role assignment action", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, roles: [{ name: "user" }, { name: "channel-admin" }] });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });
      mockQueryResult.create.mockResolvedValueOnce({ id: 1 });

      await roleManagementService.assignRole(1, "channel-admin", 2, "Test logging");

      expect(strapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Role action: assign channel-admin")
      );
      expect(mockQueryResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "assign",
            role: "channel-admin",
          }),
        })
      );
    });

    it("should log role revocation action", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }, { name: "channel-admin" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce({ id: 1, roles: [{ name: "user" }] });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });
      mockQueryResult.create.mockResolvedValueOnce({ id: 1 });

      await roleManagementService.revokeRole(1, "channel-admin", 2, "Test logging");

      expect(strapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Role action: revoke channel-admin")
      );
    });

    it("should retrieve action logs", async () => {
      const mockLogs = [
        {
          id: 1,
          operatorId: 1,
          targetUserId: 2,
          action: "assign",
          role: "channel-admin",
          timestamp: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          operatorId: 1,
          targetUserId: 3,
          action: "assign",
          role: "instructor",
          timestamp: "2024-01-15T11:00:00Z",
        },
      ];

      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findMany.mockResolvedValueOnce(mockLogs);
      mockQueryResult.count.mockResolvedValueOnce(2);

      const result = await roleManagementService.getActionLogs();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it("should filter action logs by user", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      mockQueryResult.findMany.mockResolvedValueOnce([]);
      mockQueryResult.count.mockResolvedValueOnce(0);

      const result = await roleManagementService.getActionLogs(2);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("Role Hierarchy Verification", () => {
    it("should have correct hierarchy values", () => {
      expect(ROLE_HIERARCHY.admin).toBe(100);
      expect(ROLE_HIERARCHY["channel-admin"]).toBe(80);
      expect(ROLE_HIERARCHY["plugin-manager"]).toBe(60);
      expect(ROLE_HIERARCHY.instructor).toBe(40);
      expect(ROLE_HIERARCHY.user).toBe(20);
    });

    it("should have correct inheritance chain", () => {
      expect(ROLE_INHERITANCE.admin).toEqual(["channel-admin", "plugin-manager", "instructor", "user"]);
      expect(ROLE_INHERITANCE["channel-admin"]).toEqual(["plugin-manager", "instructor", "user"]);
      expect(ROLE_INHERITANCE["plugin-manager"]).toEqual(["instructor", "user"]);
      expect(ROLE_INHERITANCE.instructor).toEqual(["user"]);
      expect(ROLE_INHERITANCE.user).toEqual([]);
    });

    it("should calculate effective roles correctly", () => {
      const adminEffective = getEffectiveRoles(["admin"]);
      expect(adminEffective).toContain("admin");
      expect(adminEffective).toContain("channel-admin");
      expect(adminEffective).toContain("plugin-manager");
      expect(adminEffective).toContain("instructor");
      expect(adminEffective).toContain("user");

      const channelAdminEffective = getEffectiveRoles(["channel-admin"]);
      expect(channelAdminEffective).toContain("channel-admin");
      expect(channelAdminEffective).toContain("plugin-manager");
      expect(channelAdminEffective).toContain("instructor");
      expect(channelAdminEffective).toContain("user");
      expect(channelAdminEffective).not.toContain("admin");

      const userEffective = getEffectiveRoles(["user"]);
      expect(userEffective).toEqual(["user"]);
    });

    it("should calculate effective roles from multiple direct roles", () => {
      const effectiveRoles = getEffectiveRoles(["instructor", "channel-admin"]);
      expect(effectiveRoles).toContain("instructor");
      expect(effectiveRoles).toContain("channel-admin");
      expect(effectiveRoles).toContain("user");
      expect(effectiveRoles).toContain("plugin-manager");
    });
  });

});
