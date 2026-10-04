// server/src/controllers/stat-summary.ts

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    // 透传完整 Strapi ctx.query，同时兼容老的顶层参数写法（?summaryType=xxx）
    const query = { ...ctx.query };
    const topLevelFilters: Record<string, any> = {};
    if (ctx.query.summaryType) topLevelFilters.summaryType = ctx.query.summaryType;
    if (ctx.query.date) topLevelFilters.date = ctx.query.date;

    if (Object.keys(topLevelFilters).length > 0) {
      query.filters = { ...(query.filters || {}), ...topLevelFilters };
    }

    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 10;

    // Strapi 5 documents.findMany 带 pagination 时返回 { records, meta }
    const findManyRes: any = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({ ...query, pagination: { page, pageSize } });

    const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);

    const total = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .count({ filters: query.filters || {} });

    ctx.body = {
      data: records,
      meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
    };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const record = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findOne({ documentId: id });

    ctx.body = { data: record };
  },
});
