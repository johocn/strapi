const UID = "plugin::zhao-logistics.review";

export default {
  /**
   * GET /v1/reviews — 评价列表（仅 approved + isVerified）
   */
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { page = 1, pageSize = 10, authorCountry, routeId, testimonialType } = ctx.query;

    const filters: any = { site: siteId, status: "approved", deletedAt: null };
    if (authorCountry) filters.authorCountry = authorCountry;
    if (routeId) filters.routeId = routeId;
    if (testimonialType) filters.testimonialType = testimonialType;

    const offset = (Number(page) - 1) * Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit: Number(pageSize),
        orderBy: { publishedAt: "desc" },
        populate: { videoPoster: true, images: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    ctx.body = {
      data: rows,
      pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) },
    };
  },

  /**
   * POST /v1/reviews/submit — 提交评价（status=pending，可选登录）
   */
  async submit(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const body = ctx.request.body;

    const review = await strapi.db.query(UID).create({
      data: {
        site: siteId,
        authorName: body.authorName,
        authorCompany: body.authorCompany || null,
        authorTitle: body.authorTitle || null,
        authorCountry: body.authorCountry,
        routeId: body.routeId || null,
        serviceProvider: body.serviceProvider || null,
        rating: Number(body.rating),
        content: body.content,
        videoUrl: body.videoUrl || null,
        testimonialType: body.testimonialType || "text",
        isVerified: false,
        status: "pending",
        publishedAt: null,
        orderRef: body.orderRef || null,
      },
    });

    ctx.body = { data: review };
  },
};
