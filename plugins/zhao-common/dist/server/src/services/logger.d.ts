import { Core } from '@strapi/strapi';
export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => Logger;
export default _default;
