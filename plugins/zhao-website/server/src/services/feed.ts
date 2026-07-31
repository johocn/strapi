import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generateRSS(siteId: number, siteUrl: string): Promise<string> {
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null },
      limit: 20,
      orderBy: { publishedAt: "DESC" },
    });

    const channelTitle = brandInfo?.companyName || "Website";
    const channelDesc = brandInfo?.description || "";
    const items = articles.map((a: any) => {
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : "";
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${siteUrl}/articles/${a.slug}</link>
      <description><![CDATA[${a.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid>${siteUrl}/articles/${a.slug}</guid>
    </item>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${channelTitle}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${channelDesc}]]></description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;
  },

  async generateAtom(siteId: number, siteUrl: string): Promise<string> {
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null },
      limit: 20,
      orderBy: { publishedAt: "DESC" },
    });

    const title = brandInfo?.companyName || "Website";
    const entries = articles.map((a: any) => {
      const updated = a.updatedAt ? new Date(a.updatedAt).toISOString() : "";
      const published = a.publishedAt ? new Date(a.publishedAt).toISOString() : "";
      return `  <entry>
    <title>${a.title}</title>
    <link href="${siteUrl}/articles/${a.slug}"/>
    <id>${siteUrl}/articles/${a.slug}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <summary>${a.excerpt || ""}</summary>
  </entry>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${title}</title>
  <link href="${siteUrl}"/>
  <id>${siteUrl}</id>
  <updated>${new Date().toISOString()}</updated>
${entries}
</feed>`;
  },
});
