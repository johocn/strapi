export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const results = await strapi
      .documents('plugin::zhao-studio.knowledge-point-index')
      .findMany(ctx.query);

    ctx.body = { data: results, meta: { pagination: ctx.query?.pagination || {} } };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const record = await strapi
      .documents('plugin::zhao-studio.knowledge-point-index')
      .findOne({ documentId: id });

    ctx.body = { data: record };
  },

  async create(ctx: any) {
    const record = await strapi
      .documents('plugin::zhao-studio.knowledge-point-index')
      .create({ data: ctx.request.body });

    ctx.body = { data: record };
  },

  async update(ctx: any) {
    const { id } = ctx.params;

    const record = await strapi
      .documents('plugin::zhao-studio.knowledge-point-index')
      .update({ documentId: id, data: ctx.request.body });

    ctx.body = { data: record };
  },

  async delete(ctx: any) {
    const { id } = ctx.params;

    await strapi
      .documents('plugin::zhao-studio.knowledge-point-index')
      .delete({ documentId: id });

    ctx.body = { data: { success: true } };
  },
});
