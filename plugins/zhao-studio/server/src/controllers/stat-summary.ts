export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const { summaryType, date } = ctx.query;
    const filters: any = {};
    if (summaryType) filters.summaryType = summaryType;
    if (date) filters.date = date;

    const results = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({ filters });

    ctx.body = { data: results };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const record = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findOne({ documentId: id });

    ctx.body = { data: record };
  },
});
