export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const drafts = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findMany();

    ctx.body = { data: drafts };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const draft = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: id });

    ctx.body = { data: draft };
  },
});