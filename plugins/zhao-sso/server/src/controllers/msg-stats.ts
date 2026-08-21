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
});