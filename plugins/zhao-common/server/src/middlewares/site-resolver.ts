import type { Core } from "@strapi/strapi";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

/**
 * 从输入值提取 host（去协议、去端口、去路径）
 * 支持纯 host、带端口 host、完整 URL 三种格式
 */
function extractHost(input: string): string {
  let v = (input || "").trim();
  if (!v) return "";
  // 完整 URL：提取 host 部分
  if (/^https?:\/\//i.test(v)) {
    try {
      return new URL(v).hostname || "";
    } catch {
      return "";
    }
  }
  // 去端口
  return v.replace(/:\d+$/, "");
}

/**
 * 站点识别中间件
 * 识别顺序：query.domain → header x-site-domain → host
 * 输入值支持：纯 host（localhost）、带端口（localhost:5173）、完整 URL（http://localhost:5173/）
 * 未匹配到时不兜底，保持 siteId 为 null，由下游处理（多租户安全）
 */
const siteResolver: Core.MiddlewareFactory = (config, { strapi }) => {
  return async (ctx: any, next: any) => {
    const raw =
      (typeof ctx.query?.domain === "string" && ctx.query.domain) ||
      (typeof ctx.request?.header?.["x-site-domain"] === "string" && ctx.request.header["x-site-domain"]) ||
      ctx.request.header.host ||
      "";
    const domain = extractHost(raw);

    try {
      if (domain) {
        const records = await strapi.documents(SITE_CONFIG_UID).findMany({
          filters: { domain },
          populate: ["channels", "template"],
          limit: 1,
        });

        if (Array.isArray(records) && records.length > 0) {
          const site = records[0];
          ctx.state.siteId = site.documentId;
          ctx.state.siteChannelId = (site as any).channels?.[0]?.documentId ?? null;
        }
      }
    } catch (error) {
      strapi.log.error("[site-resolver] Failed to resolve site:", error);
    }

    await next();
  };
};

export default siteResolver;
