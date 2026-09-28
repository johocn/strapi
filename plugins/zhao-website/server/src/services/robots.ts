import type { Core } from "@strapi/strapi";

const AI_CRAWLER_LIST = [
  "GPTBot", "CCBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "meta-external-agent", "Amazonbot", "Bytespider", "Sogou web spider",
];

// 本插件对外 GEO 出口前缀；AI 爬虫需直读，故须在 Disallow: /api 之外单独放行
const GEO_API_PREFIX = "/api/zhao-website/v1/";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.enableRobotsTxt) {
      return "User-agent: *\nDisallow: /";
    }
    if (seoConfig.robotsContent) return seoConfig.robotsContent;

    const lines: string[] = [];

    const policy = seoConfig.aiCrawlerPolicy || "allow_all";
    if (policy === "block_all") {
      for (const bot of AI_CRAWLER_LIST) {
        lines.push(`User-agent: ${bot}`, "Disallow: /");
      }
    } else if (policy === "selective") {
      const allowed = seoConfig.allowedAiCrawlers || [];
      for (const bot of AI_CRAWLER_LIST) {
        if (!allowed.includes(bot)) {
          lines.push(`User-agent: ${bot}`, "Disallow: /");
        }
      }
    }

    lines.push("User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api");
    // robots 规范按最长匹配优先：更长的 Allow 覆盖上面那条 Disallow: /api，仅放行本插件 GEO 出口
    lines.push(`Allow: ${GEO_API_PREFIX}`);
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n") + "\n";
  },
});
