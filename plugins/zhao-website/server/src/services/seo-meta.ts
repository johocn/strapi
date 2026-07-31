import type { Core } from "@strapi/strapi";

const AI_CRAWLER_LIST = [
  "GPTBot", "CCBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "meta-external-agent", "Amazonbot", "Bytespider", "Sogou web spider",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, requestHost: string): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const schemaBuilder = strapi.plugin("zhao-website").service("schema-builder");

    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: siteId },
    });
    const siteUrl = siteConfig?.domain || `https://${requestHost}`;

    const title = seoConfig?.defaultTitle || brandInfo?.companyName || "";
    const description = seoConfig?.defaultDescription || brandInfo?.description || "";
    const keywords = seoConfig?.defaultKeywords || "";

    const og: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:type": "website",
      "og:site_name": brandInfo?.companyName || "",
      "og:locale": (seoConfig?.defaultLocale || "zh-CN").replace("-", "_"),
    };
    if (seoConfig?.ogImage?.url) og["og:image"] = `${siteUrl}${seoConfig.ogImage.url}`;

    const twitter: Record<string, string> = {
      "twitter:card": "summary_large_image",
    };
    if (seoConfig?.twitterSite) twitter["twitter:site"] = seoConfig.twitterSite;
    if (seoConfig?.twitterCreator) twitter["twitter:creator"] = seoConfig.twitterCreator;

    const geo: Record<string, string> = {};
    if (seoConfig?.geoRegion) geo["geo.region"] = seoConfig.geoRegion;
    if (seoConfig?.geoPlacename) geo["geo.placename"] = seoConfig.geoPlacename;
    if (seoConfig?.geoPosition) geo["geo.position"] = seoConfig.geoPosition;
    if (seoConfig?.geoICBM) geo["ICBM"] = seoConfig.geoICBM;

    const hreflang = this._buildHreflang(seoConfig, siteUrl);

    const verification: Record<string, string> = {};
    if (seoConfig?.googleSiteVerification) verification["google-site-verification"] = seoConfig.googleSiteVerification;
    if (seoConfig?.baiduSiteVerification) verification["baidu-site-verification"] = seoConfig.baiduSiteVerification;
    if (seoConfig?.bingSiteVerification) verification["bing-site-verification"] = seoConfig.bingSiteVerification;
    if (seoConfig?.sogouSiteVerification) verification["sogou_site_verification"] = seoConfig.sogouSiteVerification;

    const structuredData: any[] = [];
    if (seoConfig?.geoPosition) {
      structuredData.push(schemaBuilder.buildLocalBusiness(brandInfo, seoConfig));
    } else {
      structuredData.push(schemaBuilder.buildOrganization(brandInfo, seoConfig));
    }
    structuredData.push(schemaBuilder.buildWebSite(seoConfig, siteUrl));

    return {
      title,
      titleTemplate: seoConfig?.titleTemplate || "",
      description,
      keywords,
      canonical: siteUrl,
      og,
      twitter,
      geo,
      hreflang,
      verification,
      structuredData,
      customHeadCode: seoConfig?.customHeadCode || "",
      customBodyCode: seoConfig?.customBodyCode || "",
      analytics: {
        baiduAnalyticsId: seoConfig?.baiduAnalyticsId || "",
        googleAnalyticsId: seoConfig?.googleAnalyticsId || "",
      },
    };
  },

  _buildHreflang(seoConfig: any, siteUrl: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      const domainWithoutTld = host.split(".").slice(0, -1).join(".");
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? siteUrl : `${origin}/${locale}`;
        case "subdomain":
          return locale === defaultLocale ? siteUrl : `${origin.protocol}//${locale}.${host}`;
        case "tld":
          if (locale === defaultLocale) return siteUrl;
          const localeTld = locale.includes("-") ? locale.split("-")[1].toLowerCase() : locale.toLowerCase();
          return `${origin.protocol}//${domainWithoutTld}.${localeTld}`;
        default:
          return siteUrl;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale) });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt) });
    }
    result.push({ hreflang: "x-default", href: siteUrl });
    return result;
  },

  getAiCrawlerList(): string[] {
    return [...AI_CRAWLER_LIST];
  },
});
