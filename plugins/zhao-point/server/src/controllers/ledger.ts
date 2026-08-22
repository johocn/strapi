import { Core } from "@strapi/strapi";

function wrap(data: any) { return { data }; }
const ledSvc = (s: any) => s.plugin("zhao-point").service("activity-ledger");

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /adm/ledgers                    全部快照（?activityDocumentId= 过滤；?page=&pageSize=）
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", activityDocumentId } = ctx.query;
      const result = await ledSvc(strapi).list({
        page: Number(page),
        pageSize: Number(pageSize),
        activityDocumentId,
      });
      ctx.body = { data: result.list, meta: { pagination: result.pagination } };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities/:documentId/ledger    手动重归档（新增 source=manual 快照）
  async regenerate(ctx: any) {
    try {
      const upd = await ledSvc(strapi).regenerate(ctx.params.documentId);
      ctx.body = wrap(upd);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /adm/ledgers/:documentId/settle    标记快照已结算/回退未结（body:{settleStatus:'settled'|'pending'}）
  async settle(ctx: any) {
    try {
      const upd = await ledSvc(strapi).settle(ctx.params.documentId, ctx.request.body || {});
      ctx.body = wrap(upd);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});