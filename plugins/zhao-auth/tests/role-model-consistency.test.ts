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

describe("A3+A5: 角色数据模型不一致 + assignRole 未 populate roles", () => {
  let strapi: Core.Strapi;
  let roleManagementService: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    roleManagementService = createRoleManagementService({ strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("assignRole 查询应 populate roles", () => {
    it("查询用户时应 populate roles 关联", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockResolvedValueOnce({
        id: 1,
        roles: [{ name: "user" }],
      });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      await roleManagementService.assignRole(1, "channel-admin", 2, "测试");

      const findOneCall = mockQueryResult.findOne.mock.calls[0][0];
      expect(findOneCall.populate).toContain("roles");
    });
  });

  describe("getUserRoles 与 assignRole/revokeRole 数据模型一致性", () => {
    it("getUserRoles 应返回与 assignRole 相同格式的角色数据", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const mockUser = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        roles: [
          { id: 1, name: "user", type: "user" },
          { id: 2, name: "channel-admin", type: "channel-admin" },
        ],
      };

      mockQueryResult.findOne.mockResolvedValueOnce(mockUser);

      const result = await roleManagementService.getUserRoles(1);

      expect(result.roles).toBeDefined();
      expect(Array.isArray(result.roles)).toBe(true);
      expect(result.roles.length).toBe(2);
      expect(result.roles.map((r: any) => r.name || r)).toEqual(
        expect.arrayContaining(["user", "channel-admin"])
      );
    });
  });

  describe("assignRole 处理用户无 roles 字段的情况", () => {
    it("用户记录无 roles 字段时不应崩溃", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockResolvedValueOnce({
        id: 1,
      });
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.assignRole(1, "user", 2, "测试");

      expect(result.success).toBe(true);
      expect(result.user.roles).toContain("user");
    });
  });
});
