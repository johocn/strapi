export default {
  async list(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").list(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").findOne(ctx.state.siteId, ctx.params.documentId);
  },
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").resolve(
      ctx.state.siteId, ctx.params.documentId, ctx.request.body
    );
  },
  async createFromWebhook(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").createFromWebhook(ctx.request.body);
  },
};