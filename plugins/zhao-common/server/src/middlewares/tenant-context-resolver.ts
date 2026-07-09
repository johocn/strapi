import type { Core } from "@strapi/strapi";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

/**
 * 租户上下文识别中间件
 * 优先级：x-site-id header > ?siteId query > 不处理（fallback 到 site-resolver）
 * 必须在 site-resolver 之前挂载，使 header/query 优先于域名识别
 * 输出：ctx.state.siteId（数字 id，用于 db.query）、ctx.state.siteDocumentId（documentId 字符串，用于 documentService）
 */
const tenantContextResolver: Core.MiddlewareFactory = (
  config,
  { strapi }: { strapi: Core.Strapi }
) => {
  return async (ctx: any, next: () => Promise<void>) => {
    // 若上游已设置 siteId，不覆盖
    if (ctx.state?.siteId) {
      return await next();
    }

    const siteIdFromHeader = ctx.request?.headers?.["x-site-id"];
    const siteIdFromQuery = ctx.query?.siteId;
    const rawSiteId = siteIdFromHeader || siteIdFromQuery;

    if (rawSiteId) {
      try {
        // 查询 site-config，获取数字 id 和 documentId
        const site = await strapi.db.query(SITE_CONFIG_UID).findOne({
          where: { documentId: String(rawSiteId) },
        });
        if (site) {
          ctx.state.siteId = site.id;
          ctx.state.siteDocumentId = site.documentId;
        }
      } catch {
        // 查询失败，保持 undefined，由 site-resolver 处理
      }
    }

    // 若两种来源都未命中，保持 ctx.state.siteId 为 undefined，由下游 site-resolver 处理
    return await next();
  };
};

export default tenantContextResolver;
