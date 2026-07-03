import type { Core } from "@strapi/strapi";

/**
 * 租户上下文识别中间件
 * 优先级：x-site-id header > ?siteId query > 不处理（fallback 到 site-resolver）
 * 必须在 site-resolver 之前挂载，使 header/query 优先于域名识别
 * 输出：ctx.state.siteId（site-config 的 documentId 字符串）
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

    if (siteIdFromHeader) {
      ctx.state.siteId = String(siteIdFromHeader);
    } else if (siteIdFromQuery) {
      ctx.state.siteId = String(siteIdFromQuery);
    }

    // 若两种来源都未命中，保持 ctx.state.siteId 为 undefined，由下游 site-resolver 处理
    return await next();
  };
};

export default tenantContextResolver;
