function createGenericController(serviceName: string) {
  return {
    async find(ctx: any) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).findAdmin(ctx.state.siteId, ctx.query);
    },
    async findOne(ctx: any) {
      const item = await strapi.plugin("zhao-website").service(serviceName).findOneAdmin(ctx.state.siteId, ctx.params.documentId);
      if (!item) return ctx.notFound();
      ctx.body = item;
    },
    async create(ctx: any) {
      const body = ctx.request.body?.data ?? ctx.request.body;
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).create(ctx.state.siteId, body);
    },
    async update(ctx: any) {
      const body = ctx.request.body?.data ?? ctx.request.body;
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).update(ctx.state.siteId, ctx.params.documentId, body);
    },
    async delete(ctx: any) {
      await strapi.plugin("zhao-website").service(serviceName).softDelete(ctx.state.siteId, ctx.params.documentId);
      ctx.body = { success: true };
    },
  };
}

export default {
  "article-category": createGenericController("article-category"),
  author: createGenericController("author"),
  product: createGenericController("product"),
  case: createGenericController("case"),
  compliance: createGenericController("compliance"),
  faq: createGenericController("faq"),
  tutorial: createGenericController("tutorial"),
  download: createGenericController("download"),
  lead: createGenericController("lead"),
  "visit-log": createGenericController("visit-log"),
  interaction: createGenericController("interaction"),
  "search-log": createGenericController("search-log"),
  "brand-voice": createGenericController("brand-voice"),
};
