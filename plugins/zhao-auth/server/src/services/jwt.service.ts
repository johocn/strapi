// E:\code\plugins\zhao-auth\server\src\services\jwt.service.ts
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import type { Core } from "@strapi/strapi";
import type Koa from "koa"; // 添加 Koa 类型

// 定义 JWT Payload 类型
export interface JwtPayload {
  id: number | string;
  [key: string]: unknown;
}

// 定义 JwtService 接口（与 types.ts 保持一致）
export interface JwtService {
  verify(token: string, secret?: string, options?: VerifyOptions): Promise<JwtPayload>;
  sign(payload: JwtPayload, options?: SignOptions): Promise<string>;
  getSecret(): string;
  extractToken(ctx: Koa.Context): string | null;
  refreshSecret?(): void; // 可选方法，便于测试
}

export default ({ strapi }: { strapi: Core.Strapi }): JwtService => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  let cachedSecret: string | null = null;

  const getSecret = (): string => {
    if (cachedSecret) return cachedSecret;

    // 辅助函数：校验 secret 是否有效（非空字符串）
    const isValidSecret = (secret: unknown): secret is string => 
      typeof secret === "string" && secret.trim() !== "";

    // 优先级：users-permissions 插件 > admin 配置 > 环境变量
    try {
      const apiJwt = strapi.config.get("plugin::users-permissions.jwtSecret");
      if (isValidSecret(apiJwt)) {
        cachedSecret = apiJwt;
        return cachedSecret;
      }
    } catch {
      // 插件未启用，忽略
    }

    try {
      const adminJwt = strapi.config.get("admin.auth.secret");
      if (isValidSecret(adminJwt)) {
        cachedSecret = adminJwt;
        return cachedSecret;
      }
    } catch {
      // 未配置 admin secret
    }

    const envJwt = process.env.JWT_SECRET;
    if (isValidSecret(envJwt)) {
      cachedSecret = envJwt;
      return cachedSecret;
    }

    throwErr("JWT_001", 500,
      "JWT secret not configured. Set JWT_SECRET env or configure users-permissions plugin."
    );
  };

  const refreshSecret = (): void => {
    cachedSecret = null;
  };

  const extractToken = (ctx: Koa.Context): string | null => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };

  return {
    async verify(token: string, secret?: string, options?: VerifyOptions): Promise<JwtPayload> {
      const resolvedSecret = secret || getSecret();
      // async 函数会自动包装返回值/异常
      return jwt.verify(token, resolvedSecret, options) as JwtPayload;
    },

    async sign(payload: JwtPayload, options?: SignOptions): Promise<string> {
      const secret = getSecret();
      const signOptions: SignOptions = { expiresIn: "30d", ...options };
      return jwt.sign(payload, secret, signOptions);
    },

    getSecret,
    extractToken,
    refreshSecret, // 可选暴露，便于测试
  };
};