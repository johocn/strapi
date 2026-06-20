import type { Core } from "@strapi/strapi";

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export default ({ strapi }: { strapi: Core.Strapi }): Logger => ({
  info(message: string, meta?: Record<string, unknown>) {
    strapi.log.info(`[zhao-common] ${message}`, meta || {});
  },

  warn(message: string, meta?: Record<string, unknown>) {
    strapi.log.warn(`[zhao-common] ${message}`, meta || {});
  },

  error(message: string, meta?: Record<string, unknown>) {
    strapi.log.error(`[zhao-common] ${message}`, meta || {});
  },

  debug(message: string, meta?: Record<string, unknown>) {
    strapi.log.debug(`[zhao-common] ${message}`, meta || {});
  },
});