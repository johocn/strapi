import { Core } from '@strapi/strapi';
/**
 * 站点识别中间件
 * 识别顺序：query.domain → header x-site-domain → host
 * 输入值支持：纯 host（localhost）、带端口（localhost:5173）、完整 URL（http://localhost:5173/）
 * 未匹配到时不兜底，保持 siteId 为 null，由下游处理（多租户安全）
 */
declare const siteResolver: Core.MiddlewareFactory;
export default siteResolver;
