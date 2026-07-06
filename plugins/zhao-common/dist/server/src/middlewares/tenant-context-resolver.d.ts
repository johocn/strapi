import { Core } from '@strapi/strapi';
/**
 * 租户上下文识别中间件
 * 优先级：x-site-id header > ?siteId query > 不处理（fallback 到 site-resolver）
 * 必须在 site-resolver 之前挂载，使 header/query 优先于域名识别
 * 输出：ctx.state.siteId（site-config 的 documentId 字符串）
 */
declare const tenantContextResolver: Core.MiddlewareFactory;
export default tenantContextResolver;
