import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async track(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { channel_code, utm_source, utm_medium, utm_campaign } = body;

      if (!channel_code) { ctx.status = 400; ctx.body = { error: "channel_code 必填" }; return; }

      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const result = await channelService.trackClick(channel_code, {
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign,
      });

      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "渠道不存在" };
        return;
      }

      ctx.body = { success: true, channel: result.channel, utm: result.utm };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  /** 服务间渠道 upsert（Vendure 新建租户时自动同步）：共享密钥头鉴权，防渠道遗漏 */
  async internalUpsert(ctx: any) {
    try {
      const expected = process.env.SSO_CHANNEL_SYNC_TOKEN;
      if (!expected) { ctx.status = 503; ctx.body = { error: "SSO_CHANNEL_SYNC_TOKEN 未配置" }; return; }
      const token = ctx.request.header?.["x-sso-sync-token"];
      if (!token || token !== expected) { ctx.status = 401; ctx.body = { error: "sync token 无效" }; return; }

      const body = ctx.request.body?.data || ctx.request.body;
      const { channel_code, channel_name, channel_type, description } = body;
      if (!channel_code) { ctx.status = 400; ctx.body = { error: "channel_code 必填" }; return; }
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(channel_code)) { ctx.status = 400; ctx.body = { error: "channel_code 格式非法" }; return; }

      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channel = await channelService.upsertByCode({ channel_code, channel_name, channel_type, description });
      ctx.body = { success: true, channel };
    } catch (e: any) {
      ctx.status = (e as any).status || 500; ctx.body = { error: e.message };
    }
  },
});
