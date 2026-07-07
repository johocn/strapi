import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const lines: string[] = [];
    // 标题
    lines.push(`# ${brandInfo?.companyName || "Website"}`);
    if (brandInfo?.slogan) lines.push(`> ${brandInfo.slogan}`);
    lines.push("");
    // 概述
    if (brandInfo?.description) {
      lines.push("## Overview");
      lines.push(brandInfo.description);
      lines.push("");
    }
    // 核心页面
    lines.push("## Pages");
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](/articles/${a.slug}): ${a.excerpt || ""}`);
    }
    const products = await strapi.db.query("plugin::zhao-website.product").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const p of products) {
      lines.push(`- [${p.name}](/products/${p.slug}): ${p.tagline || ""}`);
    }
    lines.push("");
    // 第一真值
    lines.push("## Facts");
    const facts = await strapi.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      lines.push(`- ${f.claim}: ${f.canonicalValue}`);
    }
    return lines.join("\n");
  },
});
