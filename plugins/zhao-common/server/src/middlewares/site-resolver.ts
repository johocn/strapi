import type { Core } from "@strapi/strapi";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

/**
 * 站点识别中间件
 * 根据请求 Host 头查询 site-config，注入 ctx.state.siteId / siteChannelId
 */
const siteResolver: Core.MiddlewareFactory = (config, { strapi }) => {
  return async (ctx: any, next: any) => {
    const host = ctx.request.header.host?.replace(/:\d+$/, "") ?? "";

    try {
      if (host) {
        const records = await strapi.documents(SITE_CONFIG_UID).findMany({
          filters: { domain: host },
          populate: ["channel", "template"],
        });

        if (Array.isArray(records) && records.length > 0) {
          const site = records[0];
          ctx.state.siteId = site.documentId;
          ctx.state.siteChannelId = (site as any).channel?.id ?? null;
        }
      }
      // host 为空或未匹配时，使用第一个站点作为兜底
      if (!ctx.state.siteId) {
        const allRecords = await strapi.documents(SITE_CONFIG_UID).findMany({
          populate: ["channel", "template"],
        });
        if (Array.isArray(allRecords) && allRecords.length > 0) {
          const site = allRecords[0];
          ctx.state.siteId = site.documentId;
          ctx.state.siteChannelId = (site as any).channel?.id ?? null;
        }
      }
    } catch {
      // site-config 不可用时静默跳过
    }

    await next();
  };
};

export default siteResolver;
