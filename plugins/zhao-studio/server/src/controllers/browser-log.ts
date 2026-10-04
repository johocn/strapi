// server/src/controllers/browser-log.ts

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    // 透传完整 Strapi ctx.query，同时兼容老的顶层参数写法（?eventType=xxx）
    const query = { ...ctx.query };
    const topLevelFilters: Record<string, any> = {};
    if (ctx.query.eventType) topLevelFilters.eventType = ctx.query.eventType;
    if (ctx.query.deviceType) topLevelFilters.deviceType = ctx.query.deviceType;
    if (ctx.query.city) topLevelFilters.city = ctx.query.city;
    if (ctx.query.sessionId) topLevelFilters.sessionId = ctx.query.sessionId;

    if (Object.keys(topLevelFilters).length > 0) {
      query.filters = { ...(query.filters || {}), ...topLevelFilters };
    }

    const records = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany(query);

    const total = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .count({ filters: query.filters || {} });

    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 10;

    ctx.body = {
      data: records,
      meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
    };
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const record = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findOne({ documentId: id });

    ctx.body = { data: record };
  },
});
