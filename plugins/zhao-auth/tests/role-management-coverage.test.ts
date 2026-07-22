import type { Core } from "@strapi/strapi";
import createRoleManagementService from "../server/src/services/role-management.service";

function createMockStrapi() {
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();

  const userQueryMock = {
    findOne: mockFindOne,
    update: mockUpdate,
  };
  const logQueryMock = {
    create: mockCreate,
    findMany: mockFindMany,
    count: mockCount,
  };

  const mockQuery = jest.fn();
  mockQuery.mockImplementation((uid: string) => {
    if (uid === "plugin::users-permissions.user") return userQueryMock;
    if (uid === "plugin::zhao-auth.role-action-log") return logQueryMock;
    return {};
  });

  return {
    db: { query: mockQuery },
    log: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  } as unknown as Core.Strapi;
}

describe("role-management.service - getUserEffectivePermissions & checkPermission", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = createRoleManagementService({ strapi });
  });

  afterEach(async () => {
    await service.invalidateUserCache(1);
    await service.invalidateUserCache(2);
    await service.invalidateUserCache(999);
    jest.clearAllMocks();
  });

  describe("getUserEffectivePermissions", () => {
    it("用户不存在时返回空权限", async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null);
      (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: mockFindOne });
      const result = await service.getUserEffectivePermissions(999);
      expect(result.direct).toEqual([]);
      expect(result.inherited).toEqual([]);
      expect(result.effective).toEqual([]);
    });

    it("用户有角色时返回继承权限", async () => {
      const mockFindOne = jest.fn().mockResolvedValue({
        id: 1,
        role: { name: "instructor" },
      });
      (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: mockFindOne });
      const result = await service.getUserEffectivePermissions(1);
      expect(result.direct).toContain("instructor");
      expect(result.inherited).toContain("user");
      expect(result.effective).toContain("instructor");
      expect(result.effective).toContain("user");
    });

    it("用户无角色时返回空 direct", async () => {
      const mockFindOne = jest.fn().mockResolvedValue({ id: 2 });
      (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: mockFindOne });
      const result = await service.getUserEffectivePermissions(2);
      expect(result.direct).toEqual([]);
    });

    it("缓存命中时直接返回", async () => {
      const mockFindOne = jest.fn().mockResolvedValue({
        id: 1,
        role: { name: "admin" },
      });
      (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: mockFindOne });
      await service.getUserEffectivePermissions(1);
      const callCount = mockFindOne.mock.calls.length;
      await service.getUserEffectivePermissions(1);
      expect(mockFindOne.mock.calls.length).toBe(callCount);
    });
  });

  describe("checkPermission", () => {
    it("用户有权限时返回 true", async () => {
      const mockGetMyPermissions = jest.fn().mockResolvedValue(["admin"]);
      (strapi as any).plugin = jest.fn(() => ({
        service: jest.fn(() => ({ getMyPermissions: mockGetMyPermissions })),
      }));
      const result = await service.checkPermission(2, "admin");
      expect(mockGetMyPermissions).toHaveBeenCalledWith(2, undefined);
      expect(result).toBe(true);
    });

    it("用户无权限时返回 false", async () => {
      const mockGetMyPermissions = jest.fn().mockResolvedValue(["user.perm"]);
      (strapi as any).plugin = jest.fn(() => ({
        service: jest.fn(() => ({ getMyPermissions: mockGetMyPermissions })),
      }));
      const result = await service.checkPermission(2, "admin");
      expect(result).toBe(false);
    });

    it("用户不存在时返回 false", async () => {
      const mockGetMyPermissions = jest.fn().mockResolvedValue([]);
      (strapi as any).plugin = jest.fn(() => ({
        service: jest.fn(() => ({ getMyPermissions: mockGetMyPermissions })),
      }));
      const result = await service.checkPermission(999, "admin");
      expect(result).toBe(false);
    });
  });

  describe("invalidateUserCache", () => {
    it("清除缓存后重新查询数据库", async () => {
      const mockFindOne = jest.fn().mockResolvedValue({
        id: 2,
        role: { name: "admin" },
      });
      (strapi as any).db.query = jest.fn().mockReturnValue({ findOne: mockFindOne });
      await service.getUserEffectivePermissions(2);
      await service.invalidateUserCache(2);
      await service.getUserEffectivePermissions(2);
      expect(mockFindOne.mock.calls.length).toBe(2);
    });
  });
});

describe("role-management.service - extractRoleNames branches", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = createRoleManagementService({ strapi });
  });

  afterEach(() => jest.clearAllMocks());

  it("user.role 为单对象且含 name", async () => {
    const mockFindOne = jest.fn().mockResolvedValue({
      id: 1,
      role: { name: "channel-admin" },
    });
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (strapi as any).db.query = jest.fn((uid: string) => {
      if (uid === "plugin::users-permissions.user") return { findOne: mockFindOne, update: mockUpdate };
      return { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    });
    const result = await service.getUserRoles(1);
    expect(result.roles.map((r: any) => r.name)).toContain("channel-admin");
  });

  it("user.role 为单对象且含 type 无 name", async () => {
    const mockFindOne = jest.fn().mockResolvedValue({
      id: 1,
      role: { type: "plugin-manager" },
    });
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (strapi as any).db.query = jest.fn((uid: string) => {
      if (uid === "plugin::users-permissions.user") return { findOne: mockFindOne, update: mockUpdate };
      return { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    });
    const result = await service.getUserRoles(1);
    expect(result.roles.map((r: any) => r.name)).toContain("plugin-manager");
  });

  it("user.role 为单对象且无 name/type", async () => {
    const mockFindOne = jest.fn().mockResolvedValue({
      id: 1,
      role: { description: "some role" },
    });
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (strapi as any).db.query = jest.fn((uid: string) => {
      if (uid === "plugin::users-permissions.user") return { findOne: mockFindOne, update: mockUpdate };
      return { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    });
    const result = await service.getUserRoles(1);
    expect(result.roles).toEqual([]);
  });

  it("user 无 roles 和 role 字段时返回空", async () => {
    const mockFindOne = jest.fn().mockResolvedValue({ id: 1, email: "a@b.com" });
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (strapi as any).db.query = jest.fn((uid: string) => {
      if (uid === "plugin::users-permissions.user") return { findOne: mockFindOne, update: mockUpdate };
      return { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    });
    const result = await service.getUserRoles(1);
    expect(result.roles).toEqual([]);
  });
});
