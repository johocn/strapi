import type { Core } from "@strapi/strapi";

const INDEXABLE_CTS = [
  { uid: "plugin::zhao-website.article", pathPrefix: "/articles", priority: 0.7 },
  { uid: "plugin::zhao-website.product", pathPrefix: "/products", priority: 0.8 },
  { uid: "plugin::zhao-website.case", pathPrefix: "/cases", priority: 0.6 },
  { uid: "plugin::zhao-website.tutorial", pathPrefix: "/tutorials", priority: 0.6 },
  { uid: "plugin::zhao-website.faq", pathPrefix: "/faqs", priority: 0.5 },
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const excludeTypes = seoConfig?.sitemapExcludeTypes || [];
    const urls: string[] = [];
    // 首页
    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily"));
    for (const ct of INDEXABLE_CTS) {
      if (excludeTypes.includes(ct.uid.split(".").pop())) continue;
      const items = await strapi.db.query(ct.uid).findMany({
        where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
        orderBy: { publishedAt: "DESC" },
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        urls.push(this._urlEntry(siteUrl, `${ct.pathPrefix}/${item.slug}`, String(ct.priority), "weekly", lastmod));
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  },

  _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string): string {
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    return `  <url><loc>${siteUrl}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  },
});
