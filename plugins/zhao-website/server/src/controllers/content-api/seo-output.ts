export default {
  async sitemap(ctx) {
    const siteId = ctx.state.siteId;
    const siteUrl = `https://${ctx.request.host}`;
    const xml = await strapi.plugin("zhao-website").service("sitemap").generate(siteId, siteUrl);
    ctx.type = "application/xml";
    ctx.body = xml;
  },

  async robots(ctx) {
    const siteId = ctx.state.siteId;
    const siteUrl = `https://${ctx.request.host}`;
    const txt = await strapi.plugin("zhao-website").service("robots").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async llmsTxt(ctx) {
    const siteId = ctx.state.siteId;
    const txt = await strapi.plugin("zhao-website").service("llms-txt").generate(siteId);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async manifest(ctx) {
    const siteId = ctx.state.siteId;
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").find(siteId);
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").find(siteId);
    ctx.body = {
      name: brandInfo?.companyName || "",
      short_name: brandInfo?.shortName || "",
      icons: brandInfo?.favicon ? [{ src: brandInfo.favicon.url, sizes: "192x192" }] : [],
      theme_color: seoConfig?.extraConfig?.themeColor || "#000000",
      display: "standalone",
    };
  },
};
