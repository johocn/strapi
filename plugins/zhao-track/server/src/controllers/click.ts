import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async click(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const orchestrator = strapi.plugin("zhao-track").service("click-orchestrator");
      const result = await orchestrator.orchestrate({
        couponId: String(body.couponId),
        sourceTagId: body.sourceTagId,
        deviceFingerprint: body.deviceFingerprint,
        utm: body.utm,
        referer: body.referer || ctx.request.header?.referer,
        userAgent: body.userAgent || ctx.request.header?.["user-agent"],
        ip: ctx.request.ip,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      const codeMap: Record<string, number> = {
        DEAL_COUPON_NOT_FOUND: 404,
        TRACK_SOURCE_INVALID: 400,
        TRACK_CLICK_RATE_LIMITED: 429,
      };
      ctx.status = codeMap[e.code] || 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});
