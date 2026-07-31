import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const lines: string[] = [];

    lines.push(`# ${brandInfo?.companyName || "Website"}`);
    if (brandInfo?.slogan) lines.push(`> ${brandInfo.slogan}`);
    lines.push("");

    if (brandInfo?.description) {
      lines.push("## Overview");
      lines.push(brandInfo.description);
      lines.push("");
    }

    lines.push("## Pages");

    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](${siteUrl}/articles/${a.slug}): ${a.excerpt || ""}`);
    }

    const products = await strapi.db.query("plugin::zhao-website.product").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const p of products) {
      lines.push(`- [${p.name}](${siteUrl}/products/${p.slug}): ${p.tagline || ""}`);
    }

    const tutorials = await strapi.db.query("plugin::zhao-website.tutorial").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const t of tutorials) {
      lines.push(`- [${t.title}](${siteUrl}/tutorials/${t.slug}): ${t.description || ""}`);
    }

    const cases = await strapi.db.query("plugin::zhao-website.case").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const c of cases) {
      lines.push(`- [${c.title || c.clientName}](${siteUrl}/cases/${c.slug}): ${c.clientIndustry || ""}`);
    }

    const faqs = await strapi.db.query("plugin::zhao-website.faq").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const f of faqs) {
      lines.push(`- [FAQ: ${f.question}](${siteUrl}/faqs/${f.slug})`);
    }

    const compliances = await strapi.db.query("plugin::zhao-website.compliance").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 30,
    });
    for (const c of compliances) {
      lines.push(`- [${c.title}](${siteUrl}/compliance/${c.slug})`);
    }

    lines.push("");

    lines.push("## Facts");
    const facts = await strapi.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      const sourceUrl = f.canonicalSourceUrl ? ` (source: ${f.canonicalSourceUrl})` : "";
      lines.push(`- ${f.claim}: ${f.canonicalValue}${sourceUrl}`);
    }

    lines.push("");
    lines.push("## Brand Voice");
    const voices = await strapi.db.query("plugin::zhao-website.brand-voice").findMany({
      where: { $or: [{ site: siteId, status: true, deletedAt: null }, { site: null, status: true, deletedAt: null }] },
      orderBy: { category: "ASC" },
    });
    for (const v of voices) {
      lines.push(`- [${v.category}] ${v.name}: ${v.content.substring(0, 200)}`);
    }
    lines.push("");

    return lines.join("\n");
  },
});
