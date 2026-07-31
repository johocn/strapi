import type { Core } from "@strapi/strapi";

const AI_CRAWLER_LIST = [
  "GPTBot", "CCBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "meta-external-agent", "Amazonbot", "Bytespider", "Sogou web spider",
];

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
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n");
  },
});
