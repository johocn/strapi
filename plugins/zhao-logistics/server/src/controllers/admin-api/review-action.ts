const UID = "plugin::zhao-logistics.review";

export default {
  async approve(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID).update({
      where: { documentId },
      data: { status: "approved", publishedAt: new Date().toISOString() },
    });
    ctx.body = { data: result };
  },

  async reject(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID).update({
      where: { documentId },
      data: { status: "rejected" },
    });
    ctx.body = { data: result };
  },

  async reply(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const { replyContent } = ctx.request.body;
    if (!siteId || !documentId || !replyContent) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID).update({
      where: { documentId },
      data: { replyContent, replyAt: new Date().toISOString() },
    });
    ctx.body = { data: result };
  },
};
