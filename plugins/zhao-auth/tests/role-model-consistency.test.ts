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

  describe("assignRole 查询应 populate role 并读取 zhaoRoles", () => {
    it("查询用户时应 populate role 关联并 select zhaoRoles", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1, zhaoRoles: ["user"] },
        2: { id: 2, zhaoRoles: ["admin"] },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      await roleManagementService.assignRole(1, "channel-admin", 2, "测试");

      const targetCall = mockQueryResult.findOne.mock.calls.find(
        (call: any) => call[0]?.where?.id === 1
      );
      expect(targetCall[0].populate).toContain("role");
      expect(targetCall[0].select).toEqual(expect.arrayContaining(["id", "zhaoRoles"]));
    });
  });

  describe("getUserRoles 与 assignRole/revokeRole 数据模型一致性", () => {
    it("getUserRoles 应返回与 assignRole 相同格式的角色数据", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      mockQueryResult.findOne.mockImplementation(async (args: any) =>
        args?.where?.id === 1
          ? {
              id: 1,
              email: "test@example.com",
              username: "testuser",
              zhaoRoles: ["user", "channel-admin"],
              role: { id: 9, description: "角色元数据" },
            }
          : null
      );

      const result = await roleManagementService.getUserRoles(1);

      expect(result.user).toEqual(
        expect.objectContaining({ id: 1, email: "test@example.com", username: "testuser" })
      );
      expect(Array.isArray(result.roles)).toBe(true);
      expect(result.roles).toHaveLength(2);
      expect(result.roles.map((r: any) => r.name)).toEqual(
        expect.arrayContaining(["user", "channel-admin"])
      );
      expect(result.roles[0]).toEqual({ id: 9, name: "user", description: "角色元数据" });
    });
  });

  describe("assignRole 处理用户无 zhaoRoles 字段的情况", () => {
    it("用户记录无 zhaoRoles 字段时不应崩溃", async () => {
      const mockQuery = strapi.db.query as jest.Mock;
      const mockQueryResult = mockQuery();

      const users: Record<number, any> = {
        1: { id: 1 },
        2: { id: 2, zhaoRoles: ["admin"] },
      };
      mockQueryResult.findOne.mockImplementation(async (args: any) => users[args?.where?.id] ?? null);
      mockQueryResult.update.mockResolvedValueOnce({ success: true });

      const result = await roleManagementService.assignRole(1, "channel-admin", 2, "测试");

      expect(result.success).toBe(true);
      expect(result.message).toBe("角色 channel-admin 分配成功");
      expect(result.user.roles).toEqual(["channel-admin"]);
    });
  });
});
