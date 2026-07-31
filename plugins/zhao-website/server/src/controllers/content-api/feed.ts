async function getSiteUrl(siteId: number, fallbackHost: string): Promise<string> {
  const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
    where: { id: siteId },
  });
  return siteConfig?.domain || `https://${fallbackHost}`;
}

export default {
  async rss(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("feed").generateRSS(siteId, siteUrl);
    ctx.type = "application/rss+xml";
    ctx.body = xml;
  },

  async atom(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("feed").generateAtom(siteId, siteUrl);
    ctx.type = "application/atom+xml";
    ctx.body = xml;
  },
};
