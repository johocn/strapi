import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async identify(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const resolver = strapi.plugin("zhao-track").service("source-resolver");
      const { tag, isNew } = await resolver.identify({
        utm: body.utm,
        deviceFingerprint: body.deviceFingerprint,
        fullUrl: body.fullUrl,
        referer: body.referer,
      });
      ctx.body = wrap({
        tagId: tag.tagId,
        promoCampaignId: tag.promoCampaign?.documentId || null,
        scene: tag.scene,
        isNew,
      });
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});
