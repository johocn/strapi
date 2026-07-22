import type { Core } from "@strapi/strapi";

const wrap = (data: any) => ({ data });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async approve(ctx: any) {
    try {
      const documentId = ctx.params.documentId;
      const result = await strapi.plugin("zhao-deal").service("candidate").approveCouponCandidate(documentId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async reject(ctx: any) {
    try {
      const documentId = ctx.params.documentId;
      const body = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-deal").service("candidate").rejectCouponCandidate(documentId, body.reason || "");
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async approveProduct(ctx: any) {
    try {
      const documentId = ctx.params.documentId;
      const result = await strapi.plugin("zhao-deal").service("candidate").approveProductCandidate(documentId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async batchApprove(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { documentIds } = body;
      const results = [];
      for (const id of documentIds) {
        try {
          results.push(await strapi.plugin("zhao-deal").service("candidate").approveCouponCandidate(id));
        } catch (e: any) {
          results.push({ documentId: id, error: e.message });
        }
      }
      ctx.body = wrap(results);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async batchReject(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { documentIds, reason } = body;
      const results = [];
      for (const id of documentIds) {
        try {
          results.push(await strapi.plugin("zhao-deal").service("candidate").rejectCouponCandidate(id, reason || ""));
        } catch (e: any) {
          results.push({ documentId: id, error: e.message });
        }
      }
      ctx.body = wrap(results);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
});
