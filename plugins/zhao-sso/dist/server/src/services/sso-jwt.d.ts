import { Core } from '@strapi/strapi';
import { SsoJwtPayload, SsoTokenPair } from '../types';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getSecret: () => string;
    signAccessToken: (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
    signRefreshToken: (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
    signTokenPair: (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<SsoTokenPair>;
    verifyToken: (token: string) => Promise<SsoJwtPayload>;
    extractToken: (ctx: any) => string | null;
};
export default _default;
