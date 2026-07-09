const UID = "plugin::zhao-logistics.landing-page";

export default {
  /**
   * GET /v1/landing-pages/:slug — 获取落地页内容
   */
  async getBySlug(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { slug } = ctx.params;
    if (!slug) return ctx.badRequest("slug 必填");

    const now = new Date().toISOString();
    const result = await strapi.db.query(UID).findOne({
      where: {
        site: siteId,
        slug,
        isActive: true,
        status: "published",
        deletedAt: null,
        $or: [{ startAt: null }, { startAt: { $lte: now } }],
        $or: [{ endAt: null }, { endAt: { $gte: now } }],
      },
      populate: { ogImage: true },
    });

    if (!result) return ctx.notFound("落地页不存在或已下线");
    ctx.body = { data: result };
  },
};
