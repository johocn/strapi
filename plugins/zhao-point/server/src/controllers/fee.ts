import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(ctx: any) {
    const documentId = ctx.params.documentId as string;
    const userId = ctx.state?.user?.id;
    if (!userId) throw new errors.UnauthorizedError();
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId });
    if (!act) throw new errors.NotFoundError("活动不存在");
    const fee = await strapi.plugin("zhao-point").service("fee-service").resolveFee(act, userId);
    const detail = fee.mode === "tier" && fee.tier
      ? { tierId: fee.tierId, name: fee.tier.name }
      : (fee.mode === "factor" ? { base: fee.base } : {});
    ctx.body = { mode: fee.mode, cost: fee.cost, feeCollectAt: fee.feeCollectAt, ...detail };
  },
});