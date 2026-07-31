export default {
  async exportGraph(ctx: any) {
    const siteId = ctx.state.siteId;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(siteId);
    ctx.type = "application/json";
    ctx.body = data;
  },

  async exportEntity(ctx: any) {
    const siteId = ctx.state.siteId;
    const slug = ctx.params.slug;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportEntity(siteId, slug);
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
