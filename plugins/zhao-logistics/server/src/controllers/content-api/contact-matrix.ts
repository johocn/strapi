const UID = "plugin::zhao-logistics.contact-matrix";

export default {
  /**
   * GET /v1/contact-matrix/:lang — 获取某语言渠道矩阵
   */
  async getByLang(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { lang } = ctx.params;
    if (!lang) return ctx.badRequest("lang 必填");

    const result = await strapi.db.query(UID).findOne({
      where: { site: siteId, lang, isActive: true, deletedAt: null },
    });
    if (!result) return ctx.notFound("该语言的联系渠道未配置");
    ctx.body = { data: result };
  },
};
