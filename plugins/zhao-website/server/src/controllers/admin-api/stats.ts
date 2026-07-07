export default {
  async overview(ctx) {
    const siteId = ctx.state.siteId;
    const [articles, products, cases, leads] = await Promise.all([
      strapi.db.query("plugin::zhao-website.article").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.product").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.case").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.lead").count({ site: siteId, deletedAt: null }),
    ]);
    ctx.body = { articles, products, cases, leads };
  },
  async leadStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("lead").stats(ctx.state.siteId, ctx.query.days);
  },
  async searchStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("search-log").stats(ctx.state.siteId, ctx.query.days);
  },
};
