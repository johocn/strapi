import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-website] Initializing...");

  // 注册无插件前缀的路由（兼容旧版 API 路径）
  const websiteController = strapi.plugin("zhao-website").controller("site-info");
  const koaApp = strapi.server.app as any;
  koaApp.use(async (ctx: any, next: any) => {
    if (ctx.method !== "GET" || ctx.path !== "/api/v1/site-info") {
      return next();
    }
    ctx.state = ctx.state || {};
    await websiteController.info(ctx, next);
  });

  // 1. 同步权限到数据库（每次启动都同步，幂等）
  try {
    const authPlugin = strapi.plugin("zhao-auth");
    if (authPlugin?.service("permission-sync")) {
      await authPlugin.service("permission-sync").syncAll();
      if (!isTest) logger.info("[zhao-website] Permissions synced");
    }
  } catch (err) {
    logger.error("[zhao-website] Permission sync failed:", err);
  }

  // 2. 创建 DB 索引（幂等，迁移脚本已处理，此处仅兜底）
  try {
    const db = strapi.db.connection;
    // article 索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_slug ON zhao_website_articles (site_id, slug) WHERE deleted_at IS NULL`).catch(() => {});
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_status ON zhao_website_articles (site_id, status, published_at DESC)`).catch(() => {});
    // product/case/faq/tutorial 索引模式相同
    if (!isTest) logger.info("[zhao-website] DB indexes ensured");
  } catch (err) {
    logger.error("[zhao-website] Index creation failed:", err);
  }

  // 3. 注册限流中间件（内存 Map + honeypot）
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
  const RATE_LIMIT_MAX = 30; // 每窗口最多 30 次

  strapi.server.use(async (ctx, next) => {
    // 仅对 C 端 content-api 的 lead/track 路由限流
    if (!ctx.path.includes("/api/zhao-website/") || (!ctx.path.includes("/leads/submit") && !ctx.path.includes("/interactions/track"))) {
      return next();
    }
    const ip = ctx.request.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > RATE_LIMIT_MAX) {
        return ctx.tooManyRequests("Rate limit exceeded");
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
    // 定期清理过期条目
    if (rateLimitMap.size > 10000) {
      for (const [k, v] of rateLimitMap) {
        if (now >= v.resetAt) rateLimitMap.delete(k);
      }
    }
    return next();
  });

  // 4. SIGTERM flush（异步写入队列 flush）
  process.on("SIGTERM", async () => {
    logger.info("[zhao-website] SIGTERM received, flushing queues...");
    const visitLogService = strapi.plugin("zhao-website")?.service("visit-log");
    const searchLogService = strapi.plugin("zhao-website")?.service("search-log");
    try {
      if (visitLogService?._getWriter) {
        const writer = (visitLogService as any)._getWriter();
        if (writer?.stop) await writer.stop();
      }
      if (searchLogService?._getWriter) {
        const writer = (searchLogService as any)._getWriter();
        if (writer?.stop) await writer.stop();
      }
    } catch (err) {
      logger.error("[zhao-website] Queue flush failed:", err);
    }
    process.exit(0);
  });

  if (!isTest) logger.info("[zhao-website] Ready");
};

export default bootstrap;
