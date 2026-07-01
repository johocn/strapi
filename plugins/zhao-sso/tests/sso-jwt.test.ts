/**
 * sso-jwt service 单元测试
 * 测试 token 签发与校验逻辑(不依赖真实 Strapi)
 */
import jwt from "jsonwebtoken";

const mockStrapi = {
  config: {
    get: (key: string) => {
      if (key === "plugin::zhao-sso") {
        return { jwt: { secret: "test_secret_for_unit_test", algorithm: "HS256", accessTokenExpiresIn: "15m", refreshTokenExpiresIn: "30d" } };
      }
      return null;
    },
  },
};

import ssoJwtFactory from "../server/src/services/sso-jwt";
const ssoJwt = ssoJwtFactory({ strapi: mockStrapi as any });

describe("sso-jwt service", () => {
  describe("signTokenPair", () => {
    it("应签发 access + refresh token 对", async () => {
      const pair = await ssoJwt.signTokenPair({ sub: "user-uuid-001", app_code: "default", roles: ["user"], channel: "ch1" });

      expect(pair).toHaveProperty("access_token");
      expect(pair).toHaveProperty("refresh_token");
      expect(pair).toHaveProperty("expires_in");
      expect(pair).toHaveProperty("token_type", "Bearer");
      expect(typeof pair.access_token).toBe("string");
      expect(typeof pair.refresh_token).toBe("string");
    });

    it("access token 应包含 type=access 和 jti", async () => {
      const pair = await ssoJwt.signTokenPair({ sub: "user-uuid-002", app_code: "default", roles: [], channel: undefined });
      const decoded = jwt.decode(pair.access_token) as any;

      expect(decoded.type).toBe("access");
      expect(decoded.jti).toBeDefined();
      expect(decoded.sub).toBe("user-uuid-002");
      expect(decoded.app_code).toBe("default");
    });

    it("refresh token 应包含 type=refresh", async () => {
      const pair = await ssoJwt.signTokenPair({ sub: "user-uuid-003", app_code: "app1", roles: [], channel: "ch" });
      const decoded = jwt.decode(pair.refresh_token) as any;

      expect(decoded.type).toBe("refresh");
      expect(decoded.jti).toBeDefined();
    });
  });

  describe("verifyToken", () => {
    it("应正确校验有效 token", async () => {
      const pair = await ssoJwt.signTokenPair({ sub: "user-uuid-004", app_code: "default", roles: ["user"], channel: undefined });
      const payload = await ssoJwt.verifyToken(pair.access_token);

      expect(payload.sub).toBe("user-uuid-004");
      expect(payload.type).toBe("access");
    });

    it("无效 token 应抛错", async () => {
      await expect(ssoJwt.verifyToken("invalid.token.here")).rejects.toThrow();
    });
  });

  describe("extractToken", () => {
    it("应从 Bearer header 提取 token", () => {
      const ctx = { request: { headers: { authorization: "Bearer abc123" } } };
      expect(ssoJwt.extractToken(ctx)).toBe("abc123");
    });

    it("无 authorization header 返回 null", () => {
      const ctx = { request: { headers: {} } };
      expect(ssoJwt.extractToken(ctx)).toBeNull();
    });

    it("非 Bearer 前缀返回 null", () => {
      const ctx = { request: { headers: { authorization: "Basic abc123" } } };
      expect(ssoJwt.extractToken(ctx)).toBeNull();
    });
  });
});
