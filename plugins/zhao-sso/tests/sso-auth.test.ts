/**
 * sso-auth service 单元测试
 * 测试登录/注册/token 校验逻辑(mock 依赖服务)
 */
const mockUser = { id: 1, uuid: "uuid-1", username: "testuser", status: "active", password_hash: "" };
const mockRoles = ["user"];
const mockTokenPair = { access_token: "access123", refresh_token: "refresh456", expires_in: 900, token_type: "Bearer" };

const mockUserService = {
  findByIdentifier: jest.fn(),
  findById: jest.fn(),
  findByUuid: jest.fn(),
  isBlocked: jest.fn().mockResolvedValue(false),
  verifyPassword: jest.fn(),
  updateLoginInfo: jest.fn(),
  createUser: jest.fn(),
};

const mockJwtService = {
  signTokenPair: jest.fn().mockResolvedValue(mockTokenPair),
  verifyToken: jest.fn(),
};

const mockLoginLogService = {
  getRecentFailCount: jest.fn().mockResolvedValue(0),
  log: jest.fn(),
};

const mockSmsService = {
  sendCode: jest.fn(),
  verifyCode: jest.fn(),
};

const mockTokenRecord = { revoked: false, refresh_expires_at: new Date(Date.now() + 86400000) };
const mockDbQuery = {
  findOne: jest.fn().mockResolvedValue(mockTokenRecord),
  findMany: jest.fn().mockResolvedValue([{ role: "user" }]),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
};
const mockDb = { query: () => mockDbQuery };

const mockStrapi = {
  db: mockDb,
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  documents: jest.fn().mockResolvedValue([]),
  plugin: (name: string) => {
    if (name === "zhao-sso") {
      return {
        service: (svc: string) => {
          if (svc === "sso-user") return mockUserService;
          if (svc === "sso-jwt") return mockJwtService;
          if (svc === "sso-login-log") return mockLoginLogService;
          if (svc === "sso-sms") return mockSmsService;
          if (svc === "channel-sync") return { getSync: () => null };
          return null;
        },
      };
    }
    return { service: () => null };
  },
};

import ssoAuthFactory from "../server/src/services/sso-auth";
const ssoAuth = ssoAuthFactory({ strapi: mockStrapi as any });

describe("sso-auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtService.verifyToken.mockResolvedValue({ jti: "jti1", type: "access", sub: "uuid-1", exp: 9999999999 });
    mockUserService.isBlocked.mockResolvedValue(false);
    mockUserService.findByUuid.mockResolvedValue(mockUser);
    mockUserService.findByIdentifier.mockResolvedValue(mockUser);
    mockDbQuery.findOne.mockResolvedValue(mockTokenRecord);
  });

  describe("login - password 类型", () => {
    it("正确用户名密码应登录成功", async () => {
      mockUserService.findByIdentifier.mockResolvedValue(mockUser);
      mockUserService.verifyPassword.mockResolvedValue(true);

      const result = await ssoAuth.login({
        type: "password",
        identifier: "testuser",
        password: "pass123",
        appCode: "default",
      });

      expect(result.access_token).toBe("access123");
      expect(result.user.username).toBe("testuser");
      expect(mockLoginLogService.log).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("用户不存在应抛 401", async () => {
      mockUserService.findByIdentifier.mockResolvedValue(null);

      await expect(
        ssoAuth.login({ type: "password", identifier: "nouser", password: "x", appCode: "default" })
      ).rejects.toMatchObject({ status: 401 });
    });

    it("密码错误应抛 401", async () => {
      mockUserService.findByIdentifier.mockResolvedValue(mockUser);
      mockUserService.verifyPassword.mockResolvedValue(false);

      await expect(
        ssoAuth.login({ type: "password", identifier: "testuser", password: "wrong", appCode: "default" })
      ).rejects.toMatchObject({ status: 401 });
    });

    it("用户被封禁应抛 403", async () => {
      mockUserService.findByIdentifier.mockResolvedValue({ ...mockUser, status: "blocked" });
      mockUserService.isBlocked.mockResolvedValue(true);

      await expect(
        ssoAuth.login({ type: "password", identifier: "testuser", password: "pass123", appCode: "default" })
      ).rejects.toMatchObject({ status: 403 });
    });

    it("IP 失败次数过多应抛 429", async () => {
      mockLoginLogService.getRecentFailCount.mockResolvedValue(5);

      await expect(
        ssoAuth.login({ type: "password", identifier: "u", password: "p", appCode: "default", ip: "1.1.1.1" })
      ).rejects.toMatchObject({ status: 429 });
    });
  });

  describe("login - sms 类型", () => {
    it("正确验证码应登录成功", async () => {
      mockSmsService.verifyCode.mockResolvedValue(true);
      mockUserService.findByIdentifier.mockResolvedValue(mockUser);

      const result = await ssoAuth.login({
        type: "sms",
        identifier: "13800138000",
        code: "1234",
        appCode: "default",
      });

      expect(mockSmsService.verifyCode).toHaveBeenCalledWith("13800138000", "1234", "login");
      expect(result.access_token).toBe("access123");
    });

    it("验证码错误应抛错", async () => {
      mockSmsService.verifyCode.mockRejectedValue(Object.assign(new Error("验证码错误"), { status: 400 }));

      await expect(
        ssoAuth.login({ type: "sms", identifier: "13800138000", code: "0000", appCode: "default" })
      ).rejects.toMatchObject({ status: 400 });
    });

    it("手机号未注册应抛 401", async () => {
      mockSmsService.verifyCode.mockResolvedValue(true);
      mockUserService.findByIdentifier.mockResolvedValue(null);

      await expect(
        ssoAuth.login({ type: "sms", identifier: "13800138000", code: "1234", appCode: "default" })
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("login - 不支持的类型", () => {
    it("type=unknown 应抛 400", async () => {
      await expect(
        ssoAuth.login({ type: "unknown", identifier: "x", appCode: "default" })
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("register", () => {
    it("应创建用户并返回 token", async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);

      const result = await ssoAuth.register({
        username: "newuser",
        password: "pass123",
        appCode: "default",
      });

      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(result.access_token).toBe("access123");
      expect(mockLoginLogService.log).toHaveBeenCalledWith(expect.objectContaining({ loginType: "register", success: true }));
    });
  });

  describe("verifyToken", () => {
    it("有效 access token 返回用户", async () => {
      mockJwtService.verifyToken.mockResolvedValue({ jti: "jti1", type: "access", sub: "uuid-1" });
      mockUserService.findByUuid.mockResolvedValue(mockUser);

      const result = await ssoAuth.verifyToken("valid-token");

      expect(result.user.uuid).toBe("uuid-1");
    });

    it("非 access token 应抛 401", async () => {
      mockJwtService.verifyToken.mockResolvedValue({ jti: "jti1", type: "refresh", sub: "uuid-1" });

      await expect(ssoAuth.verifyToken("refresh-token")).rejects.toMatchObject({ status: 401 });
    });
  });
});
