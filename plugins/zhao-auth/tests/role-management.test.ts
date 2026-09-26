/**
 * 角色管理服务单元测试
 */
import type { Core } from "@strapi/strapi";
import createRoleManagementService from "../server/src/services/role-management.service";

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

describe("Role Management Service", () => {
  let strapi: Core.Strapi;
  let roleManagementService: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    roleManagementService = createRoleManagementService({ strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("assignRole", () => {
    it("成功分配角色给用户", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1, zhaoRoles: ["user"], role: { id: 3, description: "普通用户" } },
        2: { id: 2, zhaoRoles: ["admin"], role: { id: 1, description: "管理员" } },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.assignRole(1, "channel-admin", 2, "测试分配");

      expect(result.success).toBe(true);
      expect(result.message).toBe("角色 channel-admin 分配成功");
      expect(result.user.id).toBe(1);
      expect(result.user.roles).toContain("channel-admin");

      const updateArg = mockQueryResult.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 1 });
      expect(updateArg.data.zhaoRoles).toEqual(
        expect.arrayContaining([
          "user",
          expect.objectContaining({ role: "channel-admin", assignedByRole: "admin" }),
        ])
      );
    });

    it("用户不存在时抛出错误", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne.mockResolvedValueOnce(null);

      await expect(
        roleManagementService.assignRole(999, "channel-admin", 1)
      ).rejects.toThrow("用户不存在");
    });

    it("用户已拥有该角色时抛出错误", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockImplementation(async (args: any) =>
        args?.where?.id === 1 ? { id: 1, zhaoRoles: ["channel-admin"] } : null
      );

      try {
        await roleManagementService.assignRole(1, "channel-admin", 1);
        throw new Error("应当抛出异常");
      } catch (error: any) {
        expect(error.message).toBe("用户已拥有角色: channel-admin");
        expect(error.code).toBe("ROLE_ALREADY_ASSIGNED");
        expect(error.status).toBe(409);
      }
    });

    it("禁止手动分配绝对基础角色", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockImplementation(async (args: any) =>
        args?.where?.id === 1 ? { id: 1, zhaoRoles: ["instructor"] } : null
      );

      try {
        await roleManagementService.assignRole(1, "admin", 1);
        throw new Error("应当抛出异常");
      } catch (error: any) {
        expect(error.message).toBe("绝对基础角色 admin 不可手动分配");
        expect(error.code).toBe("ABSOLUTE_CORE_ROLE");
        expect(error.status).toBe(400);
      }
    });
  });

  describe("revokeRole", () => {
    it("成功撤销用户角色", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1, zhaoRoles: ["user", "channel-admin"] },
        2: { id: 2, zhaoRoles: ["admin"] },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.revokeRole(1, "channel-admin", 2, "测试撤销");

      expect(result.success).toBe(true);
      expect(result.message).toBe("角色 channel-admin 撤销成功");
      expect(result.user.id).toBe(1);
      expect(result.user.roles).toEqual(["user"]);

      const updateArg = mockQueryResult.update.mock.calls[0][0];
      expect(updateArg.data.zhaoRoles).toEqual(["user"]);
    });

    it("用户不存在时抛出错误", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne.mockResolvedValueOnce(null);

      await expect(
        roleManagementService.revokeRole(999, "channel-admin", 1)
      ).rejects.toThrow("用户不存在");
    });

    it("用户未拥有该角色时抛出错误", async () => {
      const mockUser = { id: 1, roles: [{ name: "user" }] };
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        roleManagementService.revokeRole(1, "channel-admin", 1)
      ).rejects.toThrow("用户未拥有角色: channel-admin");
    });

    it("用户仅有一个角色时抛出错误", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockImplementation(async (args: any) =>
        args?.where?.id === 1 ? { id: 1, zhaoRoles: ["user"] } : null
      );

      try {
        await roleManagementService.revokeRole(1, "user", 1);
        throw new Error("应当抛出异常");
      } catch (error: any) {
        expect(error.message).toBe("用户至少需要拥有一个角色");
        expect(error.code).toBe("MIN_ROLE_REQUIRED");
        expect(error.status).toBe(400);
      }
    });
  });

  describe("getUserRoles", () => {
    it("成功获取用户角色列表", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockImplementation(async (args: any) =>
        args?.where?.id === 1
          ? {
              id: 1,
              email: "test@example.com",
              username: "testuser",
              zhaoRoles: ["user", "channel-admin"],
              role: { id: 7, description: "角色元数据" },
            }
          : null
      );

      const result = await roleManagementService.getUserRoles(1);

      expect(result.user).toEqual({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      });
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]).toEqual({ id: 7, name: "user", description: "角色元数据" });
      expect(result.roles[1]).toEqual({ id: 7, name: "channel-admin", description: "角色元数据" });
    });

    it("用户不存在时抛出错误", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findOne.mockResolvedValueOnce(null);

      await expect(
        roleManagementService.getUserRoles(999)
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("batchAssignRoles", () => {
    it("成功批量分配角色", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1, zhaoRoles: ["admin"] },
        2: { id: 2, zhaoRoles: ["user"] },
        3: { id: 3, zhaoRoles: ["user"] },
        4: { id: 4, zhaoRoles: ["user"] },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValue({ success: true });

      const result = await roleManagementService.batchAssignRoles(
        [2, 3, 4],
        "plugin-manager",
        1,
        "批量分配"
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("批量分配完成: 3 成功, 0 失败");
      expect(result.results).toHaveLength(3);
      expect(result.results.map((r: any) => r.userId)).toEqual([2, 3, 4]);
      expect(result.results.every((r: any) => r.success)).toBe(true);
    });

    it("批量分配部分失败时返回部分成功", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1, zhaoRoles: ["admin"] },
        2: { id: 2, zhaoRoles: ["user"] },
        4: { id: 4, zhaoRoles: ["user"] },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValue({ success: true });

      const result = await roleManagementService.batchAssignRoles(
        [2, 999, 4],
        "plugin-manager",
        1
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("批量分配完成: 2 成功, 1 失败");
      expect(result.results.filter((r: any) => r.success).length).toBe(2);
      const failed = result.results.find((r: any) => !r.success);
      expect(failed.userId).toBe(999);
      expect(failed.message).toBe("用户不存在");
    });
  });

  describe("getActionLogs", () => {
    it("成功获取操作日志列表", async () => {
      const mockLogs = [
        {
          id: 1,
          operatorId: 1,
          targetUserId: 2,
          action: "assign",
          role: "channel-admin",
          reason: "测试",
          timestamp: "2024-01-15T10:00:00Z",
        },
      ];
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findMany.mockResolvedValueOnce(mockLogs);
      mockQueryResult.count.mockResolvedValueOnce(1);

      const result = await roleManagementService.getActionLogs(2, 1, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("支持按目标用户筛选", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.findMany.mockResolvedValueOnce([]);
      mockQueryResult.count.mockResolvedValueOnce(0);

      const result = await roleManagementService.getActionLogs(2);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("logAction", () => {
    it("成功记录操作日志", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.create.mockResolvedValueOnce({ success: true });

      await roleManagementService.logAction(1, 2, "assign", "channel-admin", "测试日志");

      expect(strapi.log.info).toHaveBeenCalled();
      expect(mockQueryResult.create).toHaveBeenCalled();
    });

    it("日志记录失败时不抛出异常", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();
      
      mockQueryResult.create.mockRejectedValueOnce(new Error("DB Error"));

      await expect(
        roleManagementService.logAction(1, 2, "assign", "channel-admin")
      ).resolves.not.toThrow();
    });
  });
});