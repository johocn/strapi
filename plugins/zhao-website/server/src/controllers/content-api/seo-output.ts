async function getSiteUrl(siteId: number, fallbackHost: string): Promise<string> {
  const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
    where: { id: siteId },
  });
  return siteConfig?.domain || `https://${fallbackHost}`;
}

export default {
  async sitemap(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("sitemap").generate(siteId, siteUrl);
    ctx.type = "application/xml";
    ctx.body = xml;
  },

  async robots(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const txt = await strapi.plugin("zhao-website").service("robots").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async llmsTxt(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const txt = await strapi.plugin("zhao-website").service("llms-txt").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async manifest(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").find(siteId);
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").find(siteId);

    const icons: any[] = [];
    if (brandInfo?.favicon?.url) {
      icons.push({ src: `${siteUrl}${brandInfo.favicon.url}`, sizes: "192x192", type: "image/png" });
    }
    if (brandInfo?.logo?.url) {
      icons.push({ src: `${siteUrl}${brandInfo.logo.url}`, sizes: "512x512", type: "image/png" });
    }

    ctx.body = {
      name: brandInfo?.companyName || "",
      short_name: brandInfo?.shortName || brandInfo?.companyName?.substring(0, 6) || "",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: seoConfig?.extraConfig?.themeColor || "#000000",
      categories: ["education", "productivity"],
      icons,
    };
  },
};
