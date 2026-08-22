export default ({ strapi }: any) => ({
  async sopStats(ctx: any) {
    const { from, to, scene } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getSopStats({ from, to, scene });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async repurchaseStats(ctx: any) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseStats({ from, to });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async courseD7Stats(ctx: any) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseD7Stats({ from, to });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async courseCompletionStats(ctx: any) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseCompletionStats({ from, to });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async repurchaseLeads(ctx: any) {
    try {
      const { from, to, page, pageSize, status } = ctx.query || {};
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseLeads({ from, to, page, pageSize, status });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateRepurchaseFollow(ctx: any) {
    try {
      const { status, remark } = ctx.request?.body || {};
      const data = await strapi.plugin("zhao-sso").service("sso-stats").updateRepurchaseFollow({ jobId: ctx.params.id, status, remark });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
});