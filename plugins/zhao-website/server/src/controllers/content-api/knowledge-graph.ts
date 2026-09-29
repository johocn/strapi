export default {
  async exportGraph(ctx: any) {
    const siteId = ctx.state.siteId;
    // 传入请求 Host 作 siteUrl 兜底：site-config.domain 为空时 @id 仍能绝对化
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(siteId, ctx.request.host);
    ctx.type = "application/json";
    ctx.body = data;
  },

  async exportEntity(ctx: any) {
    const siteId = ctx.state.siteId;
    const slug = ctx.params.slug;
    const data = await strapi
      .plugin("zhao-website")
      .service("knowledge-graph")
      .exportEntity(siteId, slug, ctx.request.host);
    if (!data) {
      ctx.status = 404;
      ctx.body = { error: "Entity not found" };
      return;
    }
    ctx.type = "application/json";
    ctx.body = data;
  },

  async exportFacts(ctx: any) {
    const siteId = ctx.state.siteId;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(siteId);
    ctx.type = "application/json";
    ctx.body = data;
  },
};
