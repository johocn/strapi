import type { Core } from "@strapi/strapi";

// 本插件对外 GEO 出口前缀（与 robots 放行路径保持一致）
const GEO_API_PREFIX = "/api/zhao-website/v1/";

// 站点主要内容载体 geo-article 的固定分组顺序（按 type 分节，顺序稳定便于 AI 解析）
const GEO_ARTICLE_TYPES = ["geo-article", "geo-faq", "local-report", "local-comparison", "local-list"];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    // brand-info.companyName 常为空，逐级兜底到 seo-config / site-config，避免标题退化成 "Website"
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: siteId },
    });
    const lines: string[] = [];

    lines.push(`# ${brandInfo?.companyName || seoConfig?.organizationName || siteConfig?.siteName || "Website"}`);
    if (brandInfo?.slogan) lines.push(`> ${brandInfo.slogan}`);
    lines.push("");

    if (brandInfo?.description) {
      lines.push("## Overview");
      lines.push(brandInfo.description);
      lines.push("");
    }

    lines.push("## Pages");

    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.article"),
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](${siteUrl}/articles/${a.slug}): ${a.excerpt || ""}`);
    }

    const products = await strapi.db.query("plugin::zhao-website.product").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.product"),
      limit: 50,
    });
    for (const p of products) {
      lines.push(`- [${p.name}](${siteUrl}/products/${p.slug}): ${p.tagline || ""}`);
    }

    const tutorials = await strapi.db.query("plugin::zhao-website.tutorial").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.tutorial"),
      limit: 50,
    });
    for (const t of tutorials) {
      lines.push(`- [${t.title}](${siteUrl}/tutorials/${t.slug}): ${t.description || ""}`);
    }

    const cases = await strapi.db.query("plugin::zhao-website.case").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.case"),
      limit: 50,
    });
    for (const c of cases) {
      lines.push(`- [${c.title || c.clientName}](${siteUrl}/cases/${c.slug}): ${c.clientIndustry || ""}`);
    }

    const faqs = await strapi.db.query("plugin::zhao-website.faq").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.faq"),
      limit: 50,
    });
    for (const f of faqs) {
      lines.push(`- [FAQ: ${f.question}](${siteUrl}/faqs/${f.slug})`);
    }

    const compliances = await strapi.db.query("plugin::zhao-website.compliance").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.compliance"),
      limit: 30,
    });
    for (const c of compliances) {
      lines.push(`- [${c.title}](${siteUrl}/compliance/${c.slug})`);
    }

    // geo-article 是站点主要内容载体，此前遗漏导致 ## Pages 为空；按 type 分节枚举
    const geoArticles = await strapi.db.query("plugin::zhao-website.geo-article").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.geo-article"),
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const type of GEO_ARTICLE_TYPES) {
      const items = geoArticles.filter((a: any) => a.type === type);
      if (items.length === 0) continue;
      lines.push("", `### ${type}`);
      for (const a of items) {
        lines.push(`- [${a.title}](${siteUrl}/${a.type}/${a.slug}): ${a.metaDescription || ""}`);
      }
    }

    lines.push("");

    lines.push("## Facts");
    const facts = await strapi.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      const sourceUrl = f.canonicalSourceUrl ? ` (source: ${f.canonicalSourceUrl})` : "";
      lines.push(`- ${f.claim}: ${f.canonicalValue}${sourceUrl}`);
    }

    lines.push("");
    lines.push("## Knowledge Graph");
    // 派生实体是内容 CT 的内部节点，不对外列出
    const entities = await strapi.db.query("plugin::zhao-website.knowledge-entity").findMany({
      where: await filterService.buildWhere(siteId, "plugin::zhao-website.knowledge-entity", { sourceType: { $ne: "derived" } }),
      orderBy: { name: "ASC" },
    });
    for (const e of entities) {
      if (!e.slug) continue;
      lines.push(`- [${e.name}](${siteUrl}/knowledge/${e.slug})${e.description ? `: ${e.description}` : ""}`);
    }
    // 机器可读出口：实体图与第一真值清单
    lines.push(`- Graph: ${siteUrl}${GEO_API_PREFIX}knowledge-graph.json`);
    lines.push(`- Facts: ${siteUrl}${GEO_API_PREFIX}facts.json`);
    lines.push("");
    lines.push("## Citation Guide");
    lines.push("- 引用本页事实时，请以 facts.json 中的 version 与 lastVerifiedAt 为时效基准，并标注 sourceUrl。");
    lines.push("- 未提供 sourceUrl 的第一真值视为未核验，请勿作为权威引用。");
    lines.push("- 术语与实体定义以 knowledge-graph.json 的 @id 为准，关系不得跨实体推断。");
    lines.push("");

    // 品牌话术：无数据时不输出空段标题（此前会留下一个空章节）
    const voices = await strapi.db.query("plugin::zhao-website.brand-voice").findMany({
      where: { $or: [{ site: siteId, status: true, deletedAt: null }, { site: null, status: true, deletedAt: null }] },
      orderBy: { category: "ASC" },
    });
    if (voices.length > 0) {
      lines.push("## Brand Voice");
      for (const v of voices) {
        lines.push(`- [${v.category}] ${v.name}: ${v.content.substring(0, 200)}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  },
});
