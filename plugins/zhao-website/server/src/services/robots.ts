import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.enableRobotsTxt) {
      return "User-agent: *\nDisallow: /";
    }
    if (seoConfig.robotsContent) return seoConfig.robotsContent;
    const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api"];
    // AI 爬虫策略
    if (seoConfig.aiCrawlerPolicy === "block_all") {
      lines.unshift("User-agent: GPTBot", "Disallow: /", "User-agent: CCBot", "Disallow: /", "User-agent: *");
    }
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n");
  },
});
