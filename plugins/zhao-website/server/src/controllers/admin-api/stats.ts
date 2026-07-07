export default {
  async overview(ctx: any) {
    const siteId = ctx.state.siteId;
    const [articles, products, cases, leads] = await Promise.all([
      strapi.db.query("plugin::zhao-website.article").count({ site: siteId, deletedAt: null } as any),
      strapi.db.query("plugin::zhao-website.product").count({ site: siteId, deletedAt: null } as any),
      strapi.db.query("plugin::zhao-website.case").count({ site: siteId, deletedAt: null } as any),
      strapi.db.query("plugin::zhao-website.lead").count({ site: siteId, deletedAt: null } as any),
    ]);
    ctx.body = { articles, products, cases, leads };
  },
  async leadStats(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("lead").stats(ctx.state.siteId, ctx.query.days);
  },
  async searchStats(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("search-log").stats(ctx.state.siteId, ctx.query.days);
  },
};
