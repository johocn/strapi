import { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { Core } from '@strapi/strapi';
import { default as Koa } from 'koa';
export interface JwtPayload {
    id: number | string;
    [key: string]: unknown;
}
export interface JwtService {
    verify(token: string, secret?: string, options?: VerifyOptions): Promise<JwtPayload>;
    sign(payload: JwtPayload, options?: SignOptions): Promise<string>;
    getSecret(): string;
    extractToken(ctx: Koa.Context): string | null;
    refreshSecret?(): void;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => JwtService;
export default _default;
