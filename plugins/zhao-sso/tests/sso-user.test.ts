/**
 * sso-user service 单元测试
 * 测试用户 CRUD、密码校验、绑定逻辑(mock strapi.db)
 */
import bcrypt from "bcryptjs";

const mockDb = {
  create: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
};

const mockStrapi = {
  db: { query: () => mockDb },
};

import ssoUserFactory from "../server/src/services/sso-user";
const ssoUser = ssoUserFactory({ strapi: mockStrapi as any });

describe("sso-user service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("应成功创建用户并哈希密码", async () => {
      mockDb.create.mockResolvedValue({ id: 1, uuid: "uuid-1", username: "testuser" });

      const user = await ssoUser.createUser({ username: "testuser", password: "pass123" });

      expect(mockDb.create).toHaveBeenCalled();
      const callArg = mockDb.create.mock.calls[0][0];
      expect(callArg.data.username).toBe("testuser");
      expect(callArg.data.password_hash).not.toBe("pass123");
      expect(callArg.data.uuid).toBeDefined();
      expect(callArg.data.status).toBe("active");
      expect(user.id).toBe(1);
    });

    it("username/mobile/email 全空应抛错", async () => {
      await expect(ssoUser.createUser({})).rejects.toThrow("username/mobile/email at least one required");
      expect(mockDb.create).not.toHaveBeenCalled();
    });
  });

  describe("findByIdentifier", () => {
    it("应按 $or 条件查询", async () => {
      mockDb.findOne.mockResolvedValue({ id: 1, username: "test" });
      const user = await ssoUser.findByIdentifier("test");

      expect(mockDb.findOne).toHaveBeenCalled();
      const arg = mockDb.findOne.mock.calls[0][0];
      expect(arg.where.$or).toHaveLength(3);
      expect(arg.where.$or[0].email).toBe("test");
      expect(user.id).toBe(1);
    });
  });

  describe("verifyPassword", () => {
    it("正确密码返回 true", async () => {
      const hash = await bcrypt.hash("pass123", 10);
      const user = { id: 1, password_hash: hash };
      const valid = await ssoUser.verifyPassword(user, "pass123");
      expect(valid).toBe(true);
    });

    it("错误密码返回 false", async () => {
      const hash = await bcrypt.hash("pass123", 10);
      const user = { id: 1, password_hash: hash };
      const valid = await ssoUser.verifyPassword(user, "wrong");
      expect(valid).toBe(false);
    });

    it("user 无 password_hash 时从 DB 重新加载", async () => {
      const hash = await bcrypt.hash("pass123", 10);
      mockDb.findOne.mockResolvedValue({ password_hash: hash });
      const user = { id: 1 };
      const valid = await ssoUser.verifyPassword(user, "pass123");
      expect(valid).toBe(true);
      expect(mockDb.findOne).toHaveBeenCalledWith({ where: { id: 1 }, select: ["password_hash"] });
    });
  });

  describe("isBlocked", () => {
    it("status=blocked 返回 true", async () => {
      expect(await ssoUser.isBlocked({ status: "blocked" })).toBe(true);
    });
    it("status=active 返回 false", async () => {
      expect(await ssoUser.isBlocked({ status: "active" })).toBe(false);
    });
  });

  describe("updateLoginInfo", () => {
    it("应递增 login_count 并更新 last_login_at", async () => {
      mockDb.findOne.mockResolvedValue({ login_count: 5 });
      mockDb.update.mockResolvedValue({ id: 1, login_count: 6 });

      await ssoUser.updateLoginInfo(1, "ch1");

      const updateArg = mockDb.update.mock.calls[0][0];
      expect(updateArg.data.login_count).toBe(6);
      expect(updateArg.data.last_login_at).toBeDefined();
      expect(updateArg.data.last_login_channel).toBe("ch1");
    });
  });
});
