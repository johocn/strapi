// server/src/controllers/oauth.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getAuthorizeUrl(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const manager = strapi.plugin('zhao-studio').service('oauth-manager');
      const url = await manager.getAuthorizeUrl(accountId);
      ctx.redirect(url); // 302 到平台授权页
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  async handleCallback(ctx: any) {
    const { platformType } = ctx.params;
    const { code, state, error, error_description } = ctx.query;

    if (error) {
      ctx.body = { ok: false, error, error_description: error_description || '' };
      ctx.status = 400;
      return;
    }
    if (!code) {
      ctx.body = { ok: false, error: 'missing_code' };
      ctx.status = 400;
      return;
    }

    try {
      const manager = strapi.plugin('zhao-studio').service('oauth-manager');
      const result = await manager.handleCallback(platformType, code, state);
      ctx.body = { ok: true, ...result };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  async getStatus(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const manager = strapi.plugin('zhao-studio').service('oauth-manager');
      const status = await manager.getStatus(accountId);
      ctx.body = { ok: true, data: status };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  async revoke(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const manager = strapi.plugin('zhao-studio').service('oauth-manager');
      await manager.revokeAuthorization(accountId);
      ctx.body = { ok: true };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },
});
