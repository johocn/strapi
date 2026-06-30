import jwt, { SignOptions, Algorithm } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";
import type { SsoJwtPayload, SsoTokenPair } from "../types";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  const getSecret = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const secret = pluginConfig?.jwt?.secret || process.env.SSO_JWT_SECRET;
    if (!secret) throwErr("SSO_JWT_001", 500, "[zhao-sso] JWT secret not configured. Set SSO_JWT_SECRET env.");
    return secret;
  };

  const getAlgorithm = (): Algorithm => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return (pluginConfig?.jwt?.algorithm || "HS256") as Algorithm;
  };

  const getAccessTokenExpiry = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return pluginConfig?.jwt?.accessTokenExpiresIn || "15m";
  };

  const getRefreshTokenExpiry = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return pluginConfig?.jwt?.refreshTokenExpiresIn || "30d";
  };

  const signAccessToken = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<string> => {
    const signPayload: SsoJwtPayload = {
      ...payload,
      type: "access",
      jti: uuidv4(),
    };
    const options: SignOptions = {
      algorithm: getAlgorithm(),
      expiresIn: getAccessTokenExpiry() as any,
    };
    return jwt.sign(signPayload, getSecret(), options);
  };

  const signRefreshToken = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<string> => {
    const signPayload: SsoJwtPayload = {
      ...payload,
      type: "refresh",
      jti: uuidv4(),
    };
    const options: SignOptions = {
      algorithm: getAlgorithm(),
      expiresIn: getRefreshTokenExpiry() as any,
    };
    return jwt.sign(signPayload, getSecret(), options);
  };

  const signTokenPair = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<SsoTokenPair> => {
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: "Bearer",
    };
  };

  const verifyToken = async (token: string): Promise<SsoJwtPayload> => {
    return jwt.verify(token, getSecret(), { algorithms: [getAlgorithm()] }) as unknown as SsoJwtPayload;
  };

  const extractToken = (ctx: any): string | null => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };

  return {
    getSecret,
    signAccessToken,
    signRefreshToken,
    signTokenPair,
    verifyToken,
    extractToken,
  };
};
