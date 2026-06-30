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
});
