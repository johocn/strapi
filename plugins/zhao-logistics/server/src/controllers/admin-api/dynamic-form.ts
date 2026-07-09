/**
 * 动态表单 Admin API controller
 */
export default {
  async loadFields(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, customerType, lang } = ctx.query;

    const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
      routeId,
      serviceProvider,
      customerType,
      lang,
    });

    ctx.body = { data: fields };
  },

  async validate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { formData, fields } = ctx.request.body;
    if (!formData || !fields) return ctx.badRequest("formData 和 fields 必填");

    const result = await strapi.plugin("zhao-logistics").service("dynamic-form").validate(siteId, formData, fields);
    ctx.body = { data: result };
  },
};
