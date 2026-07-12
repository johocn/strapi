export default {
  // ===== 特殊操作 =====
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").resolveVariables(
      ctx.state.siteId, ctx.params.documentId, ctx.request.body.variables || {}
    );
  },
  async listByCategory(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(
      ctx.state.siteId, ctx.params.category
    );
  },

  // ===== 全局话术 =====
  async createGlobal(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").create(null, ctx.request.body);
  },
  async updateGlobal(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").update(null, ctx.params.documentId, ctx.request.body);
  },
  async deleteGlobal(ctx: any) {
    await strapi.plugin("zhao-website").service("brand-voice").softDelete(null, ctx.params.documentId);
    ctx.body = { success: true };
  },

  // ===== 公开方法（GEO AI 读取） =====
  async publicList(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(
      ctx.state.siteId, ctx.query.category
    );
  },
  async publicByCategory(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").getRefContent(
      ctx.state.siteId, ctx.params.category
    );
  },
};