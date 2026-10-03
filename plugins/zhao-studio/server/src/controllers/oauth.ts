// server/src/controllers/oauth.ts

export default {
  async getAuthorizeUrl(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const url = await manager.getAuthorizeUrl(accountId);
    ctx.redirect(url); // 302 到平台授权页
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

    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const result = await manager.handleCallback(platformType, code, state);
    ctx.body = { ok: true, ...result };
  },

  async getStatus(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const status = await manager.getStatus(accountId);
    ctx.body = { ok: true, data: status };
  },

  async revoke(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    await manager.revokeAuthorization(accountId);
    ctx.body = { ok: true };
  },
};
