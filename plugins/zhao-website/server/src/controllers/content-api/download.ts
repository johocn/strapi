export default {
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("download").find(siteId, ctx.query);
    ctx.body = result;
  },

  async download(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("download").findOne(siteId, slug);
    if (!item) return ctx.notFound("Download not found");
    if (item.requireForm && !ctx.state.user) {
      return ctx.forbidden("Form submission required");
    }
    // 异步 +1 downloadCount
    strapi.plugin("zhao-website").service("download").incrementDownloadCount(siteId, item.documentId).catch(() => {});
    ctx.body = { url: item.file?.url, filename: item.fileName };
  },
};
