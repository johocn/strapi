import type { Core } from "@strapi/strapi";

const INDEXABLE_CTS = [
  { uid: "plugin::zhao-website.article", pathPrefix: "/articles", priority: 0.7, imageField: "coverImage" },
  { uid: "plugin::zhao-website.product", pathPrefix: "/products", priority: 0.8, imageField: "coverImage" },
  { uid: "plugin::zhao-website.case", pathPrefix: "/cases", priority: 0.6, imageField: null },
  { uid: "plugin::zhao-website.tutorial", pathPrefix: "/tutorials", priority: 0.6, imageField: "coverImage" },
  { uid: "plugin::zhao-website.faq", pathPrefix: "/faqs", priority: 0.5, imageField: null },
];

/** GEO 文章类型 → 前端静态页路径前缀（strapi-site 路由，无 en 翻译不附加 hreflang） */
const GEO_TYPE_PREFIX: Record<string, string> = {
  "geo-article": "/geo-article",
  "geo-faq": "/geo-faq",
  "local-report": "/local-report",
  "local-comparison": "/local-comparison",
  "local-list": "/local-list",
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const excludeTypes = seoConfig?.sitemapExcludeTypes || [];
    const urls: string[] = [];

    const hreflangEntries = this._buildHreflangEntries(seoConfig, siteUrl);

    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily", undefined, undefined, hreflangEntries));

    for (const ct of INDEXABLE_CTS) {
      if (excludeTypes.includes(ct.uid.split(".").pop())) continue;
      const populate: string[] = [];
      if (ct.imageField) populate.push(ct.imageField);
      const filterService = strapi.plugin("zhao-website").service("content-filter");
      const where = await filterService.buildWhere(siteId, ct.uid);
      const items = await strapi.db.query(ct.uid).findMany({
        where,
        orderBy: { publishedAt: "DESC" },
        populate: populate.length > 0 ? populate : undefined,
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        const imageUrl = ct.imageField && item[ct.imageField]?.url
          ? `${siteUrl}${item[ct.imageField].url}`
          : undefined;
        const itemHreflang = this._buildItemHreflang(seoConfig, siteUrl, `${ct.pathPrefix}/${item.slug}`);
        urls.push(this._urlEntry(siteUrl, `${ct.pathPrefix}/${item.slug}`, String(ct.priority), "weekly", lastmod, imageUrl, itemHreflang));
      }
    }

    // GEO 文章：路径前缀随 type 变化，按 type 分组生成（无 en 翻译，不附加 itemHreflang 避免 404 链接）
    if (!excludeTypes.includes("geo-article")) {
      const filterService = strapi.plugin("zhao-website").service("content-filter");
      const where = await filterService.buildWhere(siteId, "plugin::zhao-website.geo-article");
      const items = await strapi.db.query("plugin::zhao-website.geo-article").findMany({
        where,
        orderBy: { publishedAt: "DESC" },
        populate: ["coverImage"],
      });
      for (const item of items) {
        const prefix = GEO_TYPE_PREFIX[item.type];
        if (!prefix) continue;
        const lastmod = item.updatedAt || item.publishedAt;
        const imageUrl = item.coverImage?.url ? `${siteUrl}${item.coverImage.url}` : undefined;
        urls.push(this._urlEntry(siteUrl, `${prefix}/${item.slug}`, "0.8", "weekly", lastmod, imageUrl));
      }
    }

    // 知识实体静态页 /knowledge/[slug]（strapi-site 构建期枚举；无 en 翻译，不附加 itemHreflang）
    if (!excludeTypes.includes("knowledge-entity")) {
      const filterService = strapi.plugin("zhao-website").service("content-filter");
      const where = await filterService.buildWhere(siteId, "plugin::zhao-website.knowledge-entity");
      const items = await strapi.db.query("plugin::zhao-website.knowledge-entity").findMany({
        where,
        orderBy: { publishedAt: "DESC" },
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        urls.push(this._urlEntry(siteUrl, `/knowledge/${item.slug}`, "0.6", "monthly", lastmod));
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>`;
  },

  _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string, imageUrl?: string, hreflangEntries?: Array<{ hreflang: string; href: string }>): string {
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    const img = imageUrl
      ? `<image:image><image:loc>${imageUrl}</image:loc></image:image>`
      : "";
    const alternates = hreflangEntries && hreflangEntries.length > 0
      ? hreflangEntries.map(h => `<xhtml:link rel="alternate" hreflang="${h.hreflang}" href="${h.href}"/>`).join("")
      : "";
    return `  <url><loc>${siteUrl}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${img}${alternates}</url>`;
  },

  _buildHreflangEntries(seoConfig: any, siteUrl: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string, path: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin}/${locale}${path}`;
        case "subdomain":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin.protocol}//${locale}.${host}${path}`;
        case "tld":
          return `${siteUrl}${path}`;
        default:
          return `${siteUrl}${path}`;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale, "") });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt, "") });
    }
    result.push({ hreflang: "x-default", href: `${siteUrl}` });
    return result;
  },

  _buildItemHreflang(seoConfig: any, siteUrl: string, path: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin}/${locale}${path}`;
        case "subdomain":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin.protocol}//${locale}.${host}${path}`;
        default:
          return `${siteUrl}${path}`;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale) });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt) });
    }
    result.push({ hreflang: "x-default", href: `${siteUrl}${path}` });
    return result;
  },
});
