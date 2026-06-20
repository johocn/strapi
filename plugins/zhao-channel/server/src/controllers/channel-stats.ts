import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getDashboard(ctx: any) {
    try {
      const channelScope = ctx.state?.channelScope || { all: false, channelIds: [] };
      const result = await strapi.plugin("zhao-channel").service("channel-stats").getDashboard(channelScope);
      ctx.body = wrap(result);
    } catch (error: any) {
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message };
    }
  },
});
