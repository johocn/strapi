const register = ({ strapi: strapi2 }) => {
  strapi2.log.info("[zhao-website] register");
};
const bootstrap = async ({ strapi: strapi2 }) => {
  const logger = strapi2.plugin("zhao-common")?.service("logger") || strapi2.log;
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest) logger.info("[zhao-website] Initializing...");
  const websiteController = strapi2.plugin("zhao-website").controller("site-info");
  const koaApp = strapi2.server.app;
  koaApp.use(async (ctx, next) => {
    if (ctx.method !== "GET" || ctx.path !== "/api/v1/site-info") {
      return next();
    }
    ctx.state = ctx.state || {};
    await websiteController.info(ctx, next);
  });
  try {
    const authPlugin = strapi2.plugin("zhao-auth");
    if (authPlugin?.service("permission-sync")) {
      await authPlugin.service("permission-sync").syncAll();
      if (!isTest) logger.info("[zhao-website] Permissions synced");
    }
  } catch (err) {
    logger.error("[zhao-website] Permission sync failed:", err);
  }
  try {
    const db = strapi2.db.connection;
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_slug ON zhao_website_articles (site_id, slug) WHERE deleted_at IS NULL`).catch(() => {
    });
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_status ON zhao_website_articles (site_id, status, published_at DESC)`).catch(() => {
    });
    if (!isTest) logger.info("[zhao-website] DB indexes ensured");
  } catch (err) {
    logger.error("[zhao-website] Index creation failed:", err);
  }
  const rateLimitMap = /* @__PURE__ */ new Map();
  const RATE_LIMIT_WINDOW = 60 * 1e3;
  const RATE_LIMIT_MAX = 30;
  strapi2.server.use(async (ctx, next) => {
    if (!ctx.path.includes("/api/zhao-website/") || !ctx.path.includes("/leads/submit") && !ctx.path.includes("/interactions/track")) {
      return next();
    }
    const ip = ctx.request.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > RATE_LIMIT_MAX) {
        return ctx.tooManyRequests("Rate limit exceeded");
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
    if (rateLimitMap.size > 1e4) {
      for (const [k, v] of rateLimitMap) {
        if (now >= v.resetAt) rateLimitMap.delete(k);
      }
    }
    return next();
  });
  process.on("SIGTERM", async () => {
    logger.info("[zhao-website] SIGTERM received, flushing queues...");
    const visitLogService = strapi2.plugin("zhao-website")?.service("visit-log");
    const searchLogService = strapi2.plugin("zhao-website")?.service("search-log");
    try {
      if (visitLogService?._getWriter) {
        const writer = visitLogService._getWriter();
        if (writer?.stop) await writer.stop();
      }
      if (searchLogService?._getWriter) {
        const writer = searchLogService._getWriter();
        if (writer?.stop) await writer.stop();
      }
    } catch (err) {
      logger.error("[zhao-website] Queue flush failed:", err);
    }
    process.exit(0);
  });
  if (!isTest) logger.info("[zhao-website] Ready");
};
const config = {
  default: {}
};
const kind$h = "collectionType";
const collectionName$h = "zhao_website_seo_configs";
const info$h = { "singularName": "seo-config", "pluralName": "seo-configs", "displayName": "SEO 全局配置" };
const options$h = { "draftAndPublish": false };
const pluginOptions$h = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$h = { "site": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_seo_config" }, "defaultTitle": { "type": "string", "maxLength": 60 }, "titleTemplate": { "type": "string", "maxLength": 60 }, "defaultDescription": { "type": "string", "maxLength": 160 }, "defaultKeywords": { "type": "string", "maxLength": 200 }, "ogImage": { "type": "media" }, "favicon": { "type": "media" }, "googleSiteVerification": { "type": "string", "maxLength": 100 }, "baiduSiteVerification": { "type": "string", "maxLength": 100 }, "bingSiteVerification": { "type": "string", "maxLength": 100 }, "baiduAnalyticsId": { "type": "string", "maxLength": 50 }, "googleAnalyticsId": { "type": "string", "maxLength": 50 }, "customHeadCode": { "type": "text" }, "customBodyCode": { "type": "text" }, "enableSitemap": { "type": "boolean", "default": true }, "sitemapExcludeTypes": { "type": "json" }, "enableRobotsTxt": { "type": "boolean", "default": true }, "robotsContent": { "type": "text" }, "aiCrawlerPolicy": { "type": "enumeration", "enum": ["allow_all", "block_all", "selective"], "default": "allow_all" }, "geoRegion": { "type": "string", "maxLength": 20 }, "geoPlacename": { "type": "string", "maxLength": 100 }, "geoPosition": { "type": "string", "maxLength": 50 }, "geoICBM": { "type": "string", "maxLength": 50 }, "defaultLocale": { "type": "string", "maxLength": 10, "default": "zh-CN" }, "alternateLocales": { "type": "json" }, "hreflangStrategy": { "type": "enumeration", "enum": ["none", "subdirectory", "subdomain", "tld"], "default": "subdirectory" }, "organizationName": { "type": "string", "maxLength": 200 }, "organizationLogo": { "type": "media" }, "organizationType": { "type": "string", "maxLength": 50 }, "schemaSameAs": { "type": "json" }, "schemaContactPoint": { "type": "json" }, "icpNumber": { "type": "string", "maxLength": 50 }, "publicSecurityRecord": { "type": "string", "maxLength": 50 }, "extraConfig": { "type": "json" }, "deletedAt": { "type": "datetime", "default": null } };
const seoConfig$1 = {
  kind: kind$h,
  collectionName: collectionName$h,
  info: info$h,
  options: options$h,
  pluginOptions: pluginOptions$h,
  attributes: attributes$h
};
const kind$g = "collectionType";
const collectionName$g = "zhao_website_brand_infos";
const info$g = { "singularName": "brand-info", "pluralName": "brand-infos", "displayName": "企业品牌信息" };
const options$g = { "draftAndPublish": false };
const pluginOptions$g = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$g = { "site": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_brand_info" }, "companyName": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "shortName": { "type": "string", "maxLength": 100, "localized": true }, "slogan": { "type": "string", "maxLength": 200, "localized": true }, "logo": { "type": "media" }, "logoDark": { "type": "media" }, "favicon": { "type": "media" }, "description": { "type": "text", "localized": true }, "foundingDate": { "type": "date" }, "registeredAddress": { "type": "string", "maxLength": 500, "localized": true }, "officeAddress": { "type": "string", "maxLength": 500, "localized": true }, "contactPhone": { "type": "string", "maxLength": 30 }, "contactEmail": { "type": "email" }, "serviceHotline": { "type": "string", "maxLength": 30 }, "businessHours": { "type": "string", "maxLength": 100 }, "wechatQrCode": { "type": "media" }, "wechatPublicAccount": { "type": "string", "maxLength": 100 }, "miniProgramName": { "type": "string", "maxLength": 100 }, "socialLinks": { "type": "json" }, "offices": { "type": "json", "localized": true }, "certificates": { "type": "json", "localized": true }, "legalRepresentative": { "type": "string", "maxLength": 50 }, "registeredCapital": { "type": "string", "maxLength": 50 }, "unifiedSocialCreditCode": { "type": "string", "maxLength": 50 }, "businessScope": { "type": "text", "localized": true }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "brandInfos" }, "deletedAt": { "type": "datetime", "default": null } };
const brandInfo$1 = {
  kind: kind$g,
  collectionName: collectionName$g,
  info: info$g,
  options: options$g,
  pluginOptions: pluginOptions$g,
  attributes: attributes$g
};
const kind$f = "collectionType";
const collectionName$f = "zhao_website_articles";
const info$f = { "singularName": "article", "pluralName": "articles", "displayName": "资讯文章" };
const options$f = { "draftAndPublish": false };
const pluginOptions$f = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$f = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_articles" }, "title": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "title", "required": true, "localized": true }, "excerpt": { "type": "text", "localized": true }, "content": { "type": "text", "required": true, "localized": true }, "coverImage": { "type": "media" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "articles" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_articles" }, "author": { "type": "string", "maxLength": 50 }, "authorTitle": { "type": "string", "maxLength": 50 }, "isFeatured": { "type": "boolean", "default": false }, "isPinned": { "type": "boolean", "default": false }, "viewCount": { "type": "biginteger", "default": 0 }, "likeCount": { "type": "biginteger", "default": 0 }, "collectCount": { "type": "biginteger", "default": 0 }, "shareCount": { "type": "biginteger", "default": 0 }, "readingTime": { "type": "integer" }, "wordCount": { "type": "integer" }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "seoKeywords": { "type": "string", "maxLength": 200, "localized": true }, "canonicalUrl": { "type": "string", "maxLength": 500, "localized": true }, "ogTitle": { "type": "string", "maxLength": 200, "localized": true }, "ogDescription": { "type": "text", "localized": true }, "ogImage": { "type": "media" }, "ogType": { "type": "enumeration", "enum": ["article", "product", "website", "video"], "default": "article" }, "twitterCard": { "type": "enumeration", "enum": ["summary", "summary_large_image", "product"], "default": "summary_large_image" }, "schemaType": { "type": "string", "maxLength": 50 }, "schemaJson": { "type": "json", "localized": true }, "allowIndex": { "type": "boolean", "default": true }, "noFollow": { "type": "boolean", "default": false }, "sitemapPriority": { "type": "decimal", "default": 0.7 }, "sitemapFrequency": { "type": "enumeration", "enum": ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"], "default": "weekly" }, "sourceType": { "type": "enumeration", "enum": ["original", "studio", "external"], "default": "original" }, "sourceUrl": { "type": "string" }, "sourceArticleDraft": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.article-draft", "inversedBy": "websiteArticles" }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "articleMainEntities" }, "mentionedEntities": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "articleMentions" }, "structuredData": { "type": "json" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const article$2 = {
  kind: kind$f,
  collectionName: collectionName$f,
  info: info$f,
  options: options$f,
  pluginOptions: pluginOptions$f,
  attributes: attributes$f
};
const kind$e = "collectionType";
const collectionName$e = "zhao_website_article_categories";
const info$e = { "singularName": "article-category", "pluralName": "article-categories", "displayName": "文章分类" };
const options$e = { "draftAndPublish": false };
const pluginOptions$e = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$e = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_article_categories" }, "name": { "type": "string", "maxLength": 100, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "name", "required": true, "localized": true }, "description": { "type": "text", "localized": true }, "parent": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "children" }, "children": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article-category", "mappedBy": "parent" }, "articles": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article", "mappedBy": "category" }, "tutorials": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "category" }, "faqs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.faq", "mappedBy": "category" }, "downloads": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.download", "mappedBy": "category" }, "products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.product", "mappedBy": "category" }, "order": { "type": "integer", "default": 0 }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "status": { "type": "boolean", "default": true }, "deletedAt": { "type": "datetime", "default": null } };
const articleCategory$1 = {
  kind: kind$e,
  collectionName: collectionName$e,
  info: info$e,
  options: options$e,
  pluginOptions: pluginOptions$e,
  attributes: attributes$e
};
const kind$d = "collectionType";
const collectionName$d = "zhao_website_products";
const info$d = { "singularName": "product", "pluralName": "products", "displayName": "产品/方案" };
const options$d = { "draftAndPublish": false };
const pluginOptions$d = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$d = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_products" }, "name": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "name", "required": true, "localized": true }, "tagline": { "type": "string", "maxLength": 200, "localized": true }, "description": { "type": "text", "localized": true }, "content": { "type": "text", "localized": true }, "coverImage": { "type": "media" }, "images": { "type": "media", "multiple": true }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "products" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_products" }, "features": { "type": "json", "localized": true }, "specifications": { "type": "json", "localized": true }, "scenarios": { "type": "json" }, "priceRange": { "type": "string", "maxLength": 100 }, "priceUnit": { "type": "string", "maxLength": 20 }, "isFeatured": { "type": "boolean", "default": false }, "viewCount": { "type": "biginteger", "default": 0 }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "seoKeywords": { "type": "string", "maxLength": 200, "localized": true }, "canonicalUrl": { "type": "string", "maxLength": 500 }, "ogImage": { "type": "media" }, "allowIndex": { "type": "boolean", "default": true }, "sitemapPriority": { "type": "decimal", "default": 0.7 }, "sitemapFrequency": { "type": "enumeration", "enum": ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"], "default": "weekly" }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "productMainEntities" }, "mentionedEntities": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "productMentions" }, "cases": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.case", "mappedBy": "relatedProducts" }, "structuredData": { "type": "json" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const product$2 = {
  kind: kind$d,
  collectionName: collectionName$d,
  info: info$d,
  options: options$d,
  pluginOptions: pluginOptions$d,
  attributes: attributes$d
};
const kind$c = "collectionType";
const collectionName$c = "zhao_website_cases";
const info$c = { "singularName": "case", "pluralName": "cases", "displayName": "落地案例" };
const options$c = { "draftAndPublish": false };
const pluginOptions$c = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$c = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_cases" }, "title": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "title", "required": true, "localized": true }, "clientName": { "type": "string", "maxLength": 100, "required": true, "localized": true }, "clientLogo": { "type": "media" }, "clientIndustry": { "type": "string", "maxLength": 50 }, "clientDescription": { "type": "text", "localized": true }, "challenge": { "type": "text", "required": true, "localized": true }, "solution": { "type": "text", "required": true, "localized": true }, "results": { "type": "json", "required": true, "localized": true }, "testimonial": { "type": "text", "localized": true }, "testimonialAuthor": { "type": "string", "maxLength": 50 }, "testimonialTitle": { "type": "string", "maxLength": 100 }, "coverImage": { "type": "media" }, "images": { "type": "media", "multiple": true }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_cases" }, "relatedProducts": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.product", "inversedBy": "cases" }, "isFeatured": { "type": "boolean", "default": false }, "viewCount": { "type": "biginteger", "default": 0 }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "allowIndex": { "type": "boolean", "default": true }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "caseMainEntities" }, "mentionedEntities": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "caseMentions" }, "structuredData": { "type": "json" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const caseCt = {
  kind: kind$c,
  collectionName: collectionName$c,
  info: info$c,
  options: options$c,
  pluginOptions: pluginOptions$c,
  attributes: attributes$c
};
const kind$b = "collectionType";
const collectionName$b = "zhao_website_compliances";
const info$b = { "singularName": "compliance", "pluralName": "compliances", "displayName": "合规公示" };
const options$b = { "draftAndPublish": false };
const pluginOptions$b = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$b = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_compliances" }, "title": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "title", "required": true, "localized": true }, "category": { "type": "enumeration", "enum": ["notice", "policy", "report", "certificate", "agreement"], "required": true }, "content": { "type": "text", "required": true, "localized": true }, "effectiveDate": { "type": "date" }, "expiryDate": { "type": "date" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_compliances" }, "isPinned": { "type": "boolean", "default": false }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "allowIndex": { "type": "boolean", "default": true }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const compliance$2 = {
  kind: kind$b,
  collectionName: collectionName$b,
  info: info$b,
  options: options$b,
  pluginOptions: pluginOptions$b,
  attributes: attributes$b
};
const kind$a = "collectionType";
const collectionName$a = "zhao_website_faqs";
const info$a = { "singularName": "faq", "pluralName": "faqs", "displayName": "常见问答" };
const options$a = { "draftAndPublish": false };
const pluginOptions$a = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$a = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_faqs" }, "question": { "type": "text", "required": true, "localized": true }, "answer": { "type": "text", "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "question", "required": true }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "faqs" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_faqs" }, "order": { "type": "integer", "default": 0 }, "isFeatured": { "type": "boolean", "default": false }, "viewCount": { "type": "biginteger", "default": 0 }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "faqMainEntities" }, "mentionedEntities": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "faqMentions" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const faq$2 = {
  kind: kind$a,
  collectionName: collectionName$a,
  info: info$a,
  options: options$a,
  pluginOptions: pluginOptions$a,
  attributes: attributes$a
};
const kind$9 = "collectionType";
const collectionName$9 = "zhao_website_tutorials";
const info$9 = { "singularName": "tutorial", "pluralName": "tutorials", "displayName": "教程/操作指南" };
const options$9 = { "draftAndPublish": false };
const pluginOptions$9 = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$9 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_tutorials" }, "title": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "title", "required": true, "localized": true }, "description": { "type": "text", "localized": true }, "coverImage": { "type": "media" }, "steps": { "type": "json", "required": true, "localized": true }, "materials": { "type": "json" }, "estimatedTime": { "type": "string", "maxLength": 50 }, "difficulty": { "type": "enumeration", "enum": ["beginner", "intermediate", "advanced"], "default": "beginner" }, "result": { "type": "text", "localized": true }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "tutorials" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_tutorials" }, "order": { "type": "integer", "default": 0 }, "isFeatured": { "type": "boolean", "default": false }, "viewCount": { "type": "biginteger", "default": 0 }, "mainEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "tutorialMainEntities" }, "mentionedEntities": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "tutorialMentions" }, "structuredData": { "type": "json" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const tutorial$2 = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  pluginOptions: pluginOptions$9,
  attributes: attributes$9
};
const kind$8 = "collectionType";
const collectionName$8 = "zhao_website_downloads";
const info$8 = { "singularName": "download", "pluralName": "downloads", "displayName": "下载文件管理" };
const options$8 = { "draftAndPublish": false };
const pluginOptions$8 = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$8 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_downloads" }, "name": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "description": { "type": "text", "localized": true }, "file": { "type": "media", "required": true }, "fileType": { "type": "enumeration", "enum": ["whitepaper", "brochure", "datasheet", "template", "guide", "certificate", "other"], "default": "other" }, "fileSize": { "type": "biginteger" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.article-category", "inversedBy": "downloads" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag", "inversedBy": "website_downloads" }, "relatedContentType": { "type": "string", "maxLength": 30 }, "relatedContentId": { "type": "string" }, "requireLead": { "type": "boolean", "default": true }, "downloadCount": { "type": "biginteger", "default": 0 }, "isFeatured": { "type": "boolean", "default": false }, "order": { "type": "integer", "default": 0 }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft" }, "publishedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const download$2 = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  pluginOptions: pluginOptions$8,
  attributes: attributes$8
};
const kind$7 = "collectionType";
const collectionName$7 = "zhao_website_leads";
const info$7 = { "singularName": "lead", "pluralName": "leads", "displayName": "线索/留资" };
const options$7 = { "draftAndPublish": false };
const pluginOptions$7 = { "content-manager": { "visible": false }, "content-type-builder": { "visible": false } };
const attributes$7 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_leads" }, "type": { "type": "enumeration", "enum": ["contact", "download", "quote", "appointment", "demo", "partner", "intent_order", "referral"], "required": true }, "contactName": { "type": "string", "maxLength": 50 }, "contactPhone": { "type": "string", "maxLength": 30 }, "contactEmail": { "type": "email" }, "contactCompany": { "type": "string", "maxLength": 200 }, "contactTitle": { "type": "string", "maxLength": 100 }, "message": { "type": "text" }, "sourceType": { "type": "string", "maxLength": 30 }, "sourceId": { "type": "string" }, "referralCode": { "type": "string", "maxLength": 50 }, "sourceUrl": { "type": "string", "maxLength": 500 }, "downloadFileId": { "type": "string" }, "utmSource": { "type": "string", "maxLength": 100 }, "utmMedium": { "type": "string", "maxLength": 100 }, "utmCampaign": { "type": "string", "maxLength": 200 }, "utmContent": { "type": "string", "maxLength": 200 }, "utmTerm": { "type": "string", "maxLength": 200 }, "referrer": { "type": "string", "maxLength": 500 }, "userAgent": { "type": "string", "maxLength": 500 }, "ipAddress": { "type": "string", "maxLength": 50 }, "assignedTo": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "status": { "type": "enumeration", "enum": ["new", "contacted", "qualified", "unqualified", "converted", "invalid"], "default": "new" }, "followUpRecords": { "type": "json" }, "remark": { "type": "text" }, "convertedAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const lead$2 = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  pluginOptions: pluginOptions$7,
  attributes: attributes$7
};
const kind$6 = "collectionType";
const collectionName$6 = "zhao_website_visit_logs";
const info$6 = { "singularName": "visit-log", "pluralName": "visit-logs", "displayName": "访问日志" };
const options$6 = { "draftAndPublish": false };
const pluginOptions$6 = { "content-manager": { "visible": false }, "content-type-builder": { "visible": false } };
const attributes$6 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_visit_logs" }, "type": { "type": "enumeration", "enum": ["page_view", "article_view", "product_view", "case_view", "download_click", "cta_click", "search", "external_click"], "required": true }, "pageUrl": { "type": "string", "maxLength": 500 }, "pageTitle": { "type": "string", "maxLength": 200 }, "targetType": { "type": "string", "maxLength": 30 }, "targetId": { "type": "string" }, "referrer": { "type": "string", "maxLength": 500 }, "referrerDomain": { "type": "string", "maxLength": 200 }, "searchKeyword": { "type": "string", "maxLength": 200 }, "utmSource": { "type": "string", "maxLength": 100 }, "utmMedium": { "type": "string", "maxLength": 100 }, "utmCampaign": { "type": "string", "maxLength": 200 }, "userAgent": { "type": "string", "maxLength": 500 }, "deviceType": { "type": "enumeration", "enum": ["desktop", "mobile", "tablet"], "default": "desktop" }, "browser": { "type": "string", "maxLength": 50 }, "os": { "type": "string", "maxLength": 50 }, "ipAddress": { "type": "string", "maxLength": 50 }, "country": { "type": "string", "maxLength": 50 }, "region": { "type": "string", "maxLength": 100 }, "city": { "type": "string", "maxLength": 100 }, "sessionId": { "type": "string", "maxLength": 100 }, "visitorId": { "type": "string", "maxLength": 100 }, "userId": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "dwellTime": { "type": "integer" }, "scrollDepth": { "type": "integer" }, "deletedAt": { "type": "datetime", "default": null } };
const visitLog$1 = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  pluginOptions: pluginOptions$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_website_interactions";
const info$5 = { "singularName": "interaction", "pluralName": "interactions", "displayName": "内容互动记录" };
const options$5 = { "draftAndPublish": false };
const pluginOptions$5 = { "content-manager": { "visible": false }, "content-type-builder": { "visible": false } };
const attributes$5 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_interactions" }, "type": { "type": "enumeration", "enum": ["like", "collect", "share"], "required": true }, "targetType": { "type": "string", "maxLength": 30, "required": true }, "targetId": { "type": "string", "required": true }, "visitorId": { "type": "string", "maxLength": 100, "required": true }, "userId": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "ipAddress": { "type": "string", "maxLength": 50 }, "userAgent": { "type": "string", "maxLength": 500 }, "deletedAt": { "type": "datetime", "default": null } };
const interaction$1 = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  pluginOptions: pluginOptions$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_website_search_logs";
const info$4 = { "singularName": "search-log", "pluralName": "search-logs", "displayName": "搜索日志" };
const options$4 = { "draftAndPublish": false };
const pluginOptions$4 = { "content-manager": { "visible": false }, "content-type-builder": { "visible": false } };
const attributes$4 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_search_logs" }, "keyword": { "type": "string", "maxLength": 200, "required": true }, "resultCount": { "type": "integer", "default": 0 }, "visitorId": { "type": "string", "maxLength": 100 }, "ipAddress": { "type": "string", "maxLength": 50 }, "deletedAt": { "type": "datetime", "default": null } };
const searchLog$1 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  pluginOptions: pluginOptions$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_website_knowledge_entities";
const info$3 = { "singularName": "knowledge-entity", "pluralName": "knowledge-entities", "displayName": "知识图谱实体" };
const options$3 = { "draftAndPublish": false };
const pluginOptions$3 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$3 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_knowledge_entities" }, "entityType": { "type": "enumeration", "enum": ["Organization", "Person", "Product", "Service", "Place", "Event", "CreativeWork", "Article", "CaseStudy", "Offer", "Review", "FAQ", "HowTo", "BreadcrumbList", "Brand", "ContactPoint", "QuantitativeValue", "DefinedTerm"], "required": true }, "name": { "type": "string", "maxLength": 200, "required": true }, "slug": { "type": "uid", "targetField": "name", "required": true }, "identifier": { "type": "string", "maxLength": 100 }, "description": { "type": "text" }, "sameAs": { "type": "json" }, "image": { "type": "media" }, "url": { "type": "string", "maxLength": 500 }, "properties": { "type": "json" }, "refTargetType": { "type": "string", "maxLength": 30 }, "refTargetId": { "type": "string" }, "confidence": { "type": "decimal", "default": 1 }, "sourceType": { "type": "enumeration", "enum": ["official", "derived", "manual", "imported"], "default": "official" }, "lastVerifiedAt": { "type": "datetime" }, "verificationStatus": { "type": "enumeration", "enum": ["verified", "pending", "outdated", "conflict"], "default": "verified" }, "verifiedBy": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "status": { "type": "boolean", "default": true }, "brandInfos": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.brand-info", "mappedBy": "mainEntity" }, "subjectRelations": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.knowledge-relation", "mappedBy": "subject" }, "objectRelations": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.knowledge-relation", "mappedBy": "object" }, "faqMainEntities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.faq", "mappedBy": "mainEntity" }, "faqMentions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.faq", "mappedBy": "mentionedEntities" }, "tutorialMainEntities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "mainEntity" }, "tutorialMentions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "mentionedEntities" }, "articleMainEntities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article", "mappedBy": "mainEntity" }, "articleMentions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article", "mappedBy": "mentionedEntities" }, "firstTruthPolicies": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.first-truth-policy", "mappedBy": "mainEntity" }, "productMainEntities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.product", "mappedBy": "mainEntity" }, "productMentions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.product", "mappedBy": "mentionedEntities" }, "caseMainEntities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.case", "mappedBy": "mainEntity" }, "caseMentions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.case", "mappedBy": "mentionedEntities" }, "deletedAt": { "type": "datetime", "default": null } };
const knowledgeEntity = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_website_knowledge_relations";
const info$2 = { "singularName": "knowledge-relation", "pluralName": "knowledge-relations", "displayName": "知识图谱关系" };
const options$2 = { "draftAndPublish": false };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_knowledge_relations" }, "subjectEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "required": true, "inversedBy": "subjectRelations" }, "predicate": { "type": "string", "maxLength": 100, "required": true }, "objectEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "objectRelations" }, "objectValue": { "type": "json" }, "objectText": { "type": "text" }, "sourceUrl": { "type": "string", "maxLength": 500 }, "sourceType": { "type": "enumeration", "enum": ["official", "derived", "manual", "inferred"], "default": "manual" }, "confidence": { "type": "decimal", "default": 1 }, "lastVerifiedAt": { "type": "datetime" }, "verificationStatus": { "type": "enumeration", "enum": ["verified", "pending", "outdated", "conflict"], "default": "verified" }, "status": { "type": "boolean", "default": true }, "deletedAt": { "type": "datetime", "default": null } };
const knowledgeRelation = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_website_ai_summaries";
const info$1 = { "singularName": "ai-content-summary", "pluralName": "ai-content-summaries", "displayName": "机器可读摘要" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_ai_summaries" }, "targetType": { "type": "string", "maxLength": 30, "required": true }, "targetId": { "type": "string", "required": true }, "summaryType": { "type": "enumeration", "enum": ["tldr", "key_facts", "faq", "qa_pairs", "technical_spec", "executive_brief", "comparison", "howto"], "required": true }, "content": { "type": "json", "required": true }, "contentText": { "type": "text" }, "language": { "type": "string", "maxLength": 10, "default": "zh-CN" }, "version": { "type": "integer", "default": 1 }, "generatedBy": { "type": "enumeration", "enum": ["manual", "ai_assisted", "ai_generated", "hybrid"], "default": "manual" }, "aiProvider": { "type": "string", "maxLength": 50 }, "aiModel": { "type": "string", "maxLength": 100 }, "generatedAt": { "type": "datetime" }, "verifiedAt": { "type": "datetime" }, "verificationStatus": { "type": "enumeration", "enum": ["verified", "pending", "outdated", "conflict"], "default": "verified" }, "status": { "type": "boolean", "default": true }, "deletedAt": { "type": "datetime", "default": null } };
const aiContentSummary$2 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_website_first_truths";
const info = { "singularName": "first-truth-policy", "pluralName": "first-truth-policies", "displayName": "第一真值策略声明" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "website_first_truths" }, "claim": { "type": "string", "maxLength": 200, "required": true }, "claimKey": { "type": "string", "maxLength": 100, "required": true }, "claimCategory": { "type": "enumeration", "enum": ["business_license", "brand_claim", "technical_spec", "certification", "financial", "logistics_promise", "other"], "default": "brand_claim" }, "canonicalEntity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-website.knowledge-entity", "inversedBy": "firstTruthPolicies" }, "canonicalValue": { "type": "text", "required": true }, "canonicalValueType": { "type": "enumeration", "enum": ["text", "number", "date", "url", "json"], "default": "text" }, "canonicalSourceUrl": { "type": "string", "maxLength": 500 }, "canonicalSourceType": { "type": "enumeration", "enum": ["government", "official_site", "third_party_verified", "internal"], "default": "official_site" }, "conflictResolution": { "type": "enumeration", "enum": ["latest", "earliest", "highest_confidence", "manual"], "default": "manual" }, "lastVerifiedAt": { "type": "datetime", "required": true }, "verificationStatus": { "type": "enumeration", "enum": ["verified", "pending", "outdated", "conflict"], "default": "verified" }, "conflictDetails": { "type": "json" }, "priority": { "type": "integer", "default": 100 }, "status": { "type": "boolean", "default": true }, "deletedAt": { "type": "datetime", "default": null } };
const firstTruthPolicy = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "seo-config": { schema: seoConfig$1 },
  "brand-info": { schema: brandInfo$1 },
  "article": { schema: article$2 },
  "article-category": { schema: articleCategory$1 },
  "product": { schema: product$2 },
  "case": { schema: caseCt },
  "compliance": { schema: compliance$2 },
  "faq": { schema: faq$2 },
  "tutorial": { schema: tutorial$2 },
  "download": { schema: download$2 },
  "lead": { schema: lead$2 },
  "visit-log": { schema: visitLog$1 },
  "interaction": { schema: interaction$1 },
  "search-log": { schema: searchLog$1 },
  "knowledge-entity": { schema: knowledgeEntity },
  "knowledge-relation": { schema: knowledgeRelation },
  "ai-content-summary": { schema: aiContentSummary$2 },
  "first-truth-policy": { schema: firstTruthPolicy }
};
const article$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const { page = 1, pageSize = 10, category, tag, sort = "publishedAt:DESC" } = ctx.query;
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      page: Number(page),
      pageSize: Number(pageSize),
      category,
      tag,
      sort
    });
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article2 = await strapi.plugin("zhao-website").service("article").findOne(siteId, slug);
    if (!article2) return ctx.notFound("Article not found");
    strapi.plugin("zhao-website").service("article").incrementViewCount(siteId, article2.documentId).catch(() => {
    });
    ctx.body = article2;
  },
  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      ...ctx.query,
      category: categorySlug
    });
    ctx.body = result;
  },
  async featured(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("article").findFeatured(siteId, Number(ctx.query.limit) || 5);
    ctx.body = result;
  },
  async related(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article2 = await strapi.plugin("zhao-website").service("article").findOne(siteId, slug);
    if (!article2) return ctx.notFound("Article not found");
    const tagIds = (article2.tags || []).map((t) => t.documentId || t.id).slice(0, 3);
    if (tagIds.length === 0) {
      ctx.body = { results: [] };
      return;
    }
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      page: 1,
      pageSize: 5,
      tag: tagIds.join(","),
      exclude: article2.documentId
    });
    ctx.body = { results: Array.isArray(result) ? result : result.results || result };
  }
};
const product$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("product").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("product").findOne(siteId, slug);
    if (!item) return ctx.notFound("Product not found");
    strapi.plugin("zhao-website").service("product").incrementViewCount(siteId, item.documentId).catch(() => {
    });
    ctx.body = item;
  }
};
const casE = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("case").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("case").findOne(siteId, slug);
    if (!item) return ctx.notFound("Case not found");
    strapi.plugin("zhao-website").service("case").incrementViewCount(siteId, item.documentId).catch(() => {
    });
    ctx.body = item;
  }
};
const faq$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("faq").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("faq").findOne(siteId, slug);
    if (!item) return ctx.notFound("FAQ not found");
    ctx.body = item;
  },
  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("faq").find(siteId, {
      ...ctx.query,
      category: categorySlug
    });
    ctx.body = result;
  }
};
const tutorial$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("tutorial").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("tutorial").findOne(siteId, slug);
    if (!item) return ctx.notFound("Tutorial not found");
    strapi.plugin("zhao-website").service("tutorial").incrementViewCount(siteId, item.documentId).catch(() => {
    });
    ctx.body = item;
  },
  async byDifficulty(ctx) {
    const siteId = ctx.state.siteId;
    const { level } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("tutorial").find(siteId, {
      ...ctx.query,
      difficulty: level
    });
    ctx.body = result;
  }
};
const compliance$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("compliance").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("compliance").findOne(siteId, slug);
    if (!item) return ctx.notFound("Compliance not found");
    ctx.body = item;
  },
  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { category } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("compliance").find(siteId, {
      ...ctx.query,
      category
    });
    ctx.body = result;
  }
};
const download$1 = {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("download").find(siteId, ctx.query);
    ctx.body = result;
  },
  async download(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("download").findOne(siteId, slug);
    if (!item) return ctx.notFound("Download not found");
    if (item.requireForm && !ctx.state.user) {
      return ctx.forbidden("Form submission required");
    }
    strapi.plugin("zhao-website").service("download").incrementDownloadCount(siteId, item.documentId).catch(() => {
    });
    ctx.body = { url: item.file?.url, filename: item.fileName };
  }
};
const lead$1 = {
  async submit(ctx) {
    const siteId = ctx.state.siteId;
    if (ctx.request.body.website) {
      return ctx.body = { success: true };
    }
    const { type = "contact" } = ctx.request.body;
    const lead2 = await strapi.plugin("zhao-website").service("lead").createPublic(siteId, {
      ...ctx.request.body,
      type,
      ipAddress: ctx.request.ip,
      userAgent: ctx.request.headers["user-agent"],
      referrer: ctx.request.headers.referer,
      status: "new"
    }, ctx);
    ctx.body = { success: true, id: lead2.documentId };
  },
  async track(ctx) {
    const siteId = ctx.state.siteId;
    const { type, targetType, targetId, visitorId, userId } = ctx.request.body;
    if (!type || !targetType || !targetId || !visitorId) {
      return ctx.badRequest("Missing required fields: type, targetType, targetId, visitorId");
    }
    try {
      const result = await strapi.plugin("zhao-website").service("interaction").toggle(siteId, {
        type,
        targetType,
        targetId,
        visitorId,
        userId,
        ctx
        // service 内部用 ctx.request.ip / userAgent
      });
      ctx.body = { success: true, action: result.action };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
};
const seoOutput = {
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
    const brandInfo2 = await strapi.plugin("zhao-website").service("brand-info").find(siteId);
    const seoConfig2 = await strapi.plugin("zhao-website").service("seo-config").find(siteId);
    ctx.body = {
      name: brandInfo2?.companyName || "",
      short_name: brandInfo2?.shortName || "",
      icons: brandInfo2?.favicon ? [{ src: brandInfo2.favicon.url, sizes: "192x192" }] : [],
      theme_color: seoConfig2?.extraConfig?.themeColor || "#000000",
      display: "standalone"
    };
  }
};
const siteInfo = {
  async info(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      ctx.body = null;
      return;
    }
    const db = strapi.db.connection;
    const site = await db("zhao_site_configs").where("document_id", siteId).select(
      "id",
      "site_name",
      "site_description",
      "logo",
      "favicon",
      "icp_number",
      "seo_keywords",
      "seo_description",
      "customer_service_url",
      "domain",
      "template",
      "theme_config",
      "extra_config",
      "share_title",
      "share_description",
      "share_image"
    ).first();
    if (!site) {
      ctx.body = null;
      return;
    }
    let template = null;
    if (site.template) {
      template = await db("zhao_site_templates").where("id", site.template).select("id", "name", "display_name", "theme_config").first();
    }
    let brandInfo2 = null;
    let seoConfig2 = null;
    try {
      brandInfo2 = await strapi.plugin("zhao-website").service("brand-info").find(siteId);
    } catch (e) {
    }
    try {
      seoConfig2 = await strapi.plugin("zhao-website").service("seo-config").find(siteId);
    } catch (e) {
    }
    ctx.body = {
      siteName: site.site_name,
      siteDescription: site.site_description,
      logo: site.logo,
      favicon: site.favicon,
      icpNumber: site.icp_number,
      seoKeywords: site.seo_keywords,
      seoDescription: site.seo_description,
      customerServiceUrl: site.customer_service_url,
      domain: site.domain,
      shareTitle: site.share_title,
      shareDescription: site.share_description,
      shareImage: site.share_image,
      themeConfig: site.theme_config || {},
      extraConfig: site.extra_config || {},
      template: template ? { name: template.name, displayName: template.display_name, themeConfig: template.theme_config || {} } : { name: "default", displayName: "默认", themeConfig: {} },
      brandInfo: brandInfo2,
      seoConfig: seoConfig2
    };
  }
};
const adminArticle = {
  async find(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").findAdmin(siteId, ctx.query);
  },
  async findOne(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("article").findOneAdmin(siteId, documentId);
    if (!item) return ctx.notFound();
    ctx.body = item;
  },
  async create(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").create(siteId, ctx.request.body);
  },
  async update(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").update(siteId, documentId, ctx.request.body);
  },
  async delete(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    await strapi.plugin("zhao-website").service("article").softDelete(siteId, documentId);
    ctx.body = { success: true };
  },
  async publish(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").publish(siteId, documentId);
  },
  async archive(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").archive(siteId, documentId);
  },
  async batch(ctx) {
    const siteId = ctx.state.siteId;
    const { action, documentIds } = ctx.request.body;
    const results = [];
    for (const id of documentIds) {
      if (action === "publish") results.push(await strapi.plugin("zhao-website").service("article").publish(siteId, id));
      else if (action === "archive") results.push(await strapi.plugin("zhao-website").service("article").archive(siteId, id));
      else if (action === "delete") results.push(await strapi.plugin("zhao-website").service("article").softDelete(siteId, id));
    }
    ctx.body = { success: true, count: results.length };
  }
};
const adminSeoConfig = {
  async find(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").find(ctx.state.siteId);
  },
  async update(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").update(ctx.state.siteId, ctx.request.body);
  }
};
const adminBrandInfo = {
  async find(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").find(ctx.state.siteId);
  },
  async update(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").update(ctx.state.siteId, ctx.request.body);
  }
};
function createGenericController(serviceName) {
  return {
    async find(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).findAdmin(ctx.state.siteId, ctx.query);
    },
    async findOne(ctx) {
      const item = await strapi.plugin("zhao-website").service(serviceName).findOneAdmin(ctx.state.siteId, ctx.params.documentId);
      if (!item) return ctx.notFound();
      ctx.body = item;
    },
    async create(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).create(ctx.state.siteId, ctx.request.body);
    },
    async update(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
    },
    async delete(ctx) {
      await strapi.plugin("zhao-website").service(serviceName).softDelete(ctx.state.siteId, ctx.params.documentId);
      ctx.body = { success: true };
    }
  };
}
const generic = {
  "article-category": createGenericController("article-category"),
  product: createGenericController("product"),
  case: createGenericController("case"),
  compliance: createGenericController("compliance"),
  faq: createGenericController("faq"),
  tutorial: createGenericController("tutorial"),
  download: createGenericController("download"),
  lead: createGenericController("lead"),
  "visit-log": createGenericController("visit-log"),
  interaction: createGenericController("interaction"),
  "search-log": createGenericController("search-log")
};
const knowledgeGraph$1 = {
  // ===== 实体 =====
  async findEntities(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findEntities(ctx.state.siteId, ctx.query);
  },
  async createEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, ctx.request.body);
  },
  async updateEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async deleteEntity(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 关系 =====
  async findRelations(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findRelations(ctx.state.siteId, ctx.query);
  },
  async addRelation(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").addRelation({ siteId: ctx.state.siteId, ...ctx.request.body });
  },
  async deleteRelation(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteRelation(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 消歧 =====
  async disambiguate(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").disambiguate(ctx.state.siteId, ctx.request.body);
  },
  // ===== 导出 =====
  async exportGraph(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(ctx.state.siteId);
  }
};
const firstTruth$1 = {
  async find(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId);
  },
  async create(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, ctx.request.body);
  },
  async update(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async delete(ctx) {
    await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  async verify(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId);
  },
  async conflicts(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId);
  },
  async exportFacts(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId);
  }
};
const aiContentSummary$1 = {
  async findByTarget(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").findByTarget(ctx.state.siteId, ctx.query.targetType, ctx.query.targetId, ctx.query.summaryType);
  },
  async create(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").create(ctx.state.siteId, ctx.request.body);
  },
  async update(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async delete(ctx) {
    await strapi.plugin("zhao-website").service("ai-content-summary").softDelete(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  async regenerate(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").regenerate(ctx.state.siteId, ctx.params.documentId);
  }
};
const studioBridge$1 = {
  async publishFromStudio(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("studio-bridge").publishFromStudio(ctx.state.siteId, ctx.request.body);
  }
};
const stats = {
  async overview(ctx) {
    const siteId = ctx.state.siteId;
    const [articles, products, cases, leads] = await Promise.all([
      strapi.db.query("plugin::zhao-website.article").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.product").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.case").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.lead").count({ site: siteId, deletedAt: null })
    ]);
    ctx.body = { articles, products, cases, leads };
  },
  async leadStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("lead").stats(ctx.state.siteId, ctx.query.days);
  },
  async searchStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("search-log").stats(ctx.state.siteId, ctx.query.days);
  }
};
const adminGeneric = Object.fromEntries(
  Object.entries(generic).map(([key, value]) => [`${key}-admin`, value])
);
const controllers = {
  article: article$1,
  product: product$1,
  case: casE,
  faq: faq$1,
  tutorial: tutorial$1,
  compliance: compliance$1,
  download: download$1,
  lead: lead$1,
  "seo-output": seoOutput,
  "site-info": siteInfo,
  "article-admin": adminArticle,
  "seo-config-admin": adminSeoConfig,
  "brand-info-admin": adminBrandInfo,
  ...adminGeneric,
  "knowledge-graph": knowledgeGraph$1,
  "first-truth": firstTruth$1,
  "ai-content-summary": aiContentSummary$1,
  "studio-bridge": studioBridge$1,
  stats
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    publicRoute("GET", "/articles", "article.list"),
    publicRoute("GET", "/articles/featured", "article.featured"),
    publicRoute("GET", "/articles/category/:categorySlug", "article.byCategory"),
    publicRoute("GET", "/articles/:slug", "article.detail"),
    publicRoute("GET", "/articles/:slug/related", "article.related"),
    publicRoute("GET", "/products", "product.list"),
    publicRoute("GET", "/products/:slug", "product.detail"),
    publicRoute("GET", "/cases", "case.list"),
    publicRoute("GET", "/cases/:slug", "case.detail"),
    publicRoute("GET", "/faqs", "faq.list"),
    publicRoute("GET", "/faqs/category/:categorySlug", "faq.byCategory"),
    publicRoute("GET", "/faqs/:slug", "faq.detail"),
    publicRoute("GET", "/tutorials", "tutorial.list"),
    publicRoute("GET", "/tutorials/difficulty/:level", "tutorial.byDifficulty"),
    publicRoute("GET", "/tutorials/:slug", "tutorial.detail"),
    publicRoute("GET", "/compliance", "compliance.list"),
    publicRoute("GET", "/compliance/category/:category", "compliance.byCategory"),
    publicRoute("GET", "/compliance/:slug", "compliance.detail"),
    publicRoute("GET", "/downloads", "download.list"),
    publicRoute("GET", "/downloads/:slug", "download.download"),
    publicRoute("POST", "/leads/submit", "lead.submit"),
    publicRoute("POST", "/interactions/track", "lead.track"),
    publicRoute("GET", "/sitemap.xml", "seo-output.sitemap"),
    publicRoute("GET", "/robots.txt", "seo-output.robots"),
    publicRoute("GET", "/llms.txt", "seo-output.llmsTxt"),
    publicRoute("GET", "/manifest.json", "seo-output.manifest"),
    publicRoute("GET", "/site-info", "site-info.info")
  ]
});
const channelScopeRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const adminApi = () => ({
  type: "content-api",
  routes: [
    channelScopeRoute("GET", "/articles", "article-admin.find", "article.read"),
    channelScopeRoute("GET", "/articles/:documentId", "article-admin.findOne", "article.read"),
    channelScopeRoute("POST", "/articles", "article-admin.create", "article.create"),
    channelScopeRoute("PUT", "/articles/:documentId", "article-admin.update", "article.update"),
    channelScopeRoute("DELETE", "/articles/:documentId", "article-admin.delete", "article.update"),
    channelScopeRoute("POST", "/articles/:documentId/publish", "article-admin.publish", "article.publish"),
    channelScopeRoute("POST", "/articles/:documentId/archive", "article-admin.archive", "article.publish"),
    channelScopeRoute("POST", "/articles/batch", "article-admin.batch", "article.publish"),
    channelScopeRoute("GET", "/seo-config", "seo-config-admin.find", "seo-config.read"),
    channelScopeRoute("PUT", "/seo-config", "seo-config-admin.update", "seo-config.update"),
    channelScopeRoute("GET", "/brand-info", "brand-info-admin.find", "brand-info.read"),
    channelScopeRoute("PUT", "/brand-info", "brand-info-admin.update", "brand-info.update"),
    channelScopeRoute("GET", "/article-categories", "article-category-admin.find", "article-category.read"),
    channelScopeRoute("GET", "/article-categories/:documentId", "article-category-admin.findOne", "article-category.read"),
    channelScopeRoute("POST", "/article-categories", "article-category-admin.create", "article-category.create"),
    channelScopeRoute("PUT", "/article-categories/:documentId", "article-category-admin.update", "article-category.update"),
    channelScopeRoute("DELETE", "/article-categories/:documentId", "article-category-admin.delete", "article-category.delete"),
    channelScopeRoute("GET", "/products", "product-admin.find", "product.read"),
    channelScopeRoute("GET", "/products/:documentId", "product-admin.findOne", "product.read"),
    channelScopeRoute("POST", "/products", "product-admin.create", "product.create"),
    channelScopeRoute("PUT", "/products/:documentId", "product-admin.update", "product.update"),
    channelScopeRoute("DELETE", "/products/:documentId", "product-admin.delete", "product.delete"),
    channelScopeRoute("GET", "/cases", "case-admin.find", "case.read"),
    channelScopeRoute("GET", "/cases/:documentId", "case-admin.findOne", "case.read"),
    channelScopeRoute("POST", "/cases", "case-admin.create", "case.create"),
    channelScopeRoute("PUT", "/cases/:documentId", "case-admin.update", "case.update"),
    channelScopeRoute("DELETE", "/cases/:documentId", "case-admin.delete", "case.delete"),
    channelScopeRoute("GET", "/compliance", "compliance-admin.find", "compliance.read"),
    channelScopeRoute("GET", "/compliance/:documentId", "compliance-admin.findOne", "compliance.read"),
    channelScopeRoute("POST", "/compliance", "compliance-admin.create", "compliance.create"),
    channelScopeRoute("PUT", "/compliance/:documentId", "compliance-admin.update", "compliance.update"),
    channelScopeRoute("DELETE", "/compliance/:documentId", "compliance-admin.delete", "compliance.update"),
    channelScopeRoute("GET", "/faqs", "faq-admin.find", "faq.read"),
    channelScopeRoute("GET", "/faqs/:documentId", "faq-admin.findOne", "faq.read"),
    channelScopeRoute("POST", "/faqs", "faq-admin.create", "faq.create"),
    channelScopeRoute("PUT", "/faqs/:documentId", "faq-admin.update", "faq.update"),
    channelScopeRoute("DELETE", "/faqs/:documentId", "faq-admin.delete", "faq.delete"),
    channelScopeRoute("GET", "/tutorials", "tutorial-admin.find", "tutorial.read"),
    channelScopeRoute("GET", "/tutorials/:documentId", "tutorial-admin.findOne", "tutorial.read"),
    channelScopeRoute("POST", "/tutorials", "tutorial-admin.create", "tutorial.create"),
    channelScopeRoute("PUT", "/tutorials/:documentId", "tutorial-admin.update", "tutorial.update"),
    channelScopeRoute("DELETE", "/tutorials/:documentId", "tutorial-admin.delete", "tutorial.delete"),
    channelScopeRoute("GET", "/downloads", "download-admin.find", "download.read"),
    channelScopeRoute("GET", "/downloads/:documentId", "download-admin.findOne", "download.read"),
    channelScopeRoute("POST", "/downloads", "download-admin.create", "download.create"),
    channelScopeRoute("PUT", "/downloads/:documentId", "download-admin.update", "download.update"),
    channelScopeRoute("DELETE", "/downloads/:documentId", "download-admin.delete", "download.delete"),
    channelScopeRoute("GET", "/leads", "lead-admin.find", "lead.read"),
    channelScopeRoute("GET", "/leads/:documentId", "lead-admin.findOne", "lead.read"),
    channelScopeRoute("PUT", "/leads/:documentId", "lead-admin.update", "lead.update"),
    channelScopeRoute("DELETE", "/leads/:documentId", "lead-admin.delete", "lead.delete"),
    channelScopeRoute("GET", "/visit-logs", "visit-log-admin.find", "visit-log.read"),
    channelScopeRoute("GET", "/interactions", "interaction-admin.find", "interaction.read"),
    channelScopeRoute("GET", "/search-logs", "search-log-admin.find", "search-log.read"),
    channelScopeRoute("GET", "/kg/entities", "knowledge-graph.findEntities", "knowledge-entity.read"),
    channelScopeRoute("POST", "/kg/entities", "knowledge-graph.createEntity", "knowledge-entity.create"),
    channelScopeRoute("PUT", "/kg/entities/:documentId", "knowledge-graph.updateEntity", "knowledge-entity.update"),
    channelScopeRoute("DELETE", "/kg/entities/:documentId", "knowledge-graph.deleteEntity", "knowledge-entity.delete"),
    channelScopeRoute("GET", "/kg/relations", "knowledge-graph.findRelations", "knowledge-relation.read"),
    channelScopeRoute("POST", "/kg/relations", "knowledge-graph.addRelation", "knowledge-relation.create"),
    channelScopeRoute("DELETE", "/kg/relations/:documentId", "knowledge-graph.deleteRelation", "knowledge-relation.delete"),
    channelScopeRoute("POST", "/kg/disambiguate", "knowledge-graph.disambiguate", "knowledge-entity.read"),
    channelScopeRoute("GET", "/kg/export", "knowledge-graph.exportGraph", "knowledge-entity.read"),
    channelScopeRoute("GET", "/first-truths", "first-truth.find", "first-truth.read"),
    channelScopeRoute("GET", "/first-truths/:documentId", "first-truth.findOne", "first-truth.read"),
    channelScopeRoute("POST", "/first-truths", "first-truth.create", "first-truth.create"),
    channelScopeRoute("PUT", "/first-truths/:documentId", "first-truth.update", "first-truth.update"),
    channelScopeRoute("DELETE", "/first-truths/:documentId", "first-truth.delete", "first-truth.delete"),
    channelScopeRoute("POST", "/first-truths/:documentId/verify", "first-truth.verify", "first-truth.update"),
    channelScopeRoute("GET", "/first-truths/conflicts", "first-truth.conflicts", "first-truth.read"),
    channelScopeRoute("GET", "/first-truths/export", "first-truth.exportFacts", "first-truth.read"),
    channelScopeRoute("GET", "/ai-summaries", "ai-content-summary.findByTarget", "ai-summary.read"),
    channelScopeRoute("POST", "/ai-summaries", "ai-content-summary.create", "ai-summary.create"),
    channelScopeRoute("PUT", "/ai-summaries/:documentId", "ai-content-summary.update", "ai-summary.update"),
    channelScopeRoute("DELETE", "/ai-summaries/:documentId", "ai-content-summary.delete", "ai-summary.delete"),
    channelScopeRoute("POST", "/ai-summaries/:documentId/regenerate", "ai-content-summary.regenerate", "ai-summary.update"),
    channelScopeRoute("POST", "/studio-bridge/publish", "studio-bridge.publishFromStudio", "article.create"),
    channelScopeRoute("GET", "/stats/overview", "stats.overview", "article.read"),
    channelScopeRoute("GET", "/stats/leads", "stats.leadStats", "lead.read"),
    channelScopeRoute("GET", "/stats/search", "stats.searchStats", "search-log.read")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...contentApi().routes, ...adminApi().routes]
  }
};
const UID$f = "plugin::zhao-website.seo-config";
const seoConfig = ({ strapi: strapi2 }) => ({
  /**
   * 获取或创建租户的 SEO 配置（单例）
   */
  async ensureDefault(siteId) {
    const existing = await strapi2.db.query(UID$f).findOne({
      where: { site: siteId, deletedAt: null }
    });
    if (existing) return existing;
    return strapi2.db.query(UID$f).create({
      data: {
        site: siteId,
        defaultTitle: "",
        defaultLocale: "zh-CN",
        enableSitemap: true,
        enableRobotsTxt: true,
        aiCrawlerPolicy: "allow_all",
        hreflangStrategy: "subdirectory"
      }
    });
  },
  async find(siteId) {
    return this.ensureDefault(siteId);
  },
  async update(siteId, data) {
    const existing = await this.ensureDefault(siteId);
    return strapi2.db.query(UID$f).update({
      where: { id: existing.id },
      data
    });
  },
  /**
   * 公开路由返回（去除验证码字段）
   */
  async findPublic(siteId) {
    const config2 = await this.ensureDefault(siteId);
    const { googleSiteVerification, baiduSiteVerification, bingSiteVerification, ...publicFields } = config2;
    return publicFields;
  }
});
const UID$e = "plugin::zhao-website.brand-info";
const brandInfo = ({ strapi: strapi2 }) => ({
  async ensureDefault(siteId) {
    const existing = await strapi2.db.query(UID$e).findOne({
      where: { site: siteId, deletedAt: null }
    });
    if (existing) return existing;
    return strapi2.db.query(UID$e).create({
      data: {
        site: siteId,
        companyName: ""
      }
    });
  },
  async find(siteId) {
    return this.ensureDefault(siteId);
  },
  async update(siteId, data) {
    const existing = await this.ensureDefault(siteId);
    return strapi2.db.query(UID$e).update({
      where: { id: existing.id },
      data
    });
  },
  async findPublic(siteId) {
    return this.ensureDefault(siteId);
  }
});
async function generateUniqueSlug(strapi2, uid, siteId, title, excludeDocumentId) {
  const base = slugify(title);
  if (!base) {
    return `item-${Date.now()}`;
  }
  let candidate = base;
  let suffix = 1;
  while (suffix < 10) {
    const existing = await strapi2.db.query(uid).findOne({
      where: {
        site: siteId,
        slug: candidate,
        deletedAt: null,
        ...excludeDocumentId ? { documentId: { $ne: excludeDocumentId } } : {}
      }
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}
function slugify(text) {
  return String(text || "").toLowerCase().trim().replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
const STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived"
};
function isValidStatus(s) {
  return Object.values(STATUS).includes(s);
}
function applyStatusChange(data, newStatus) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (newStatus === STATUS.PUBLISHED && !data.publishedAt) {
    return { ...data, status: newStatus, publishedAt: now };
  }
  if (newStatus === STATUS.DRAFT) {
    return { ...data, status: newStatus, publishedAt: null };
  }
  return { ...data, status: newStatus };
}
async function firstTruthValidate(siteId, content) {
  const fullText = [content.title, content.excerpt, content.content, content.description].filter(Boolean).join("\n");
  if (!fullText) {
    return { hasError: false, conflicts: [] };
  }
  const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
    where: { site: siteId, deletedAt: null, status: true }
  });
  const conflicts = [];
  for (const truth of truths) {
    if (fullText.includes(truth.claim)) ;
  }
  const hasError = conflicts.some((c) => c.priority >= 80);
  return { hasError, conflicts };
}
const UID$d = "plugin::zhao-website.article";
const article = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, exclude, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    if (tag) {
      const tagIds = String(tag).split(",").map((s) => s.trim()).filter(Boolean);
      if (tagIds.length > 0) {
        try {
          const db = strapi2.db.connection;
          const rows = await db.select("article_id").from("zhao_website_articles_tags_lnk").whereIn("tag_id", tagIds);
          const articleIds = [...new Set(rows.map((r) => r.article_id))];
          if (articleIds.length === 0) return [];
          filters.id = { $in: articleIds };
        } catch (err) {
          strapi2.log.warn("[zhao-website] tag filter knex failed, fallback to no-tag:", err.message);
        }
      }
    }
    if (exclude) {
      const excludeIds = String(exclude).split(",").map((s) => s.trim()).filter(Boolean);
      if (excludeIds.length > 0) {
        const excludeRows = await strapi2.db.query(UID$d).findMany({
          where: { documentId: { $in: excludeIds } },
          select: ["id"]
        });
        const excludeNumericIds = excludeRows.map((r) => r.id);
        if (excludeNumericIds.length > 0) {
          filters.id = { ...filters.id || {}, $notIn: excludeNumericIds };
        }
      }
    }
    return strapi2.db.query(UID$d).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$d).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities", "ogImage"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$d).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$d).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { excerpt: { $containsi: keyword } },
          { content: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const articleRows = await knex("zhao_website_articles_tags_lnk").whereIn("tag_id", tagIds).select("article_id");
          const articleIds = [...new Set(articleRows.map((r) => r.article_id))];
          if (articleIds.length === 0) return [];
          filters.id = { $in: articleIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$d).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: { coverImage: true, category: true, tags: { populate: { tagGroup: true } } }
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$d).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: {
        coverImage: true,
        category: true,
        tags: { populate: { tagGroup: true } },
        mainEntity: true,
        mentionedEntities: true,
        ogImage: true,
        sourceArticleDraft: true,
        structuredData: true
      }
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$d, siteId, data.title || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$d).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Article not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$d, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$d).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$d).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$d).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$c = "plugin::zhao-website.article-category";
const articleCategory = ({ strapi: strapi2 }) => ({
  async find(siteId) {
    return strapi2.db.query(UID$c).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"]
    });
  },
  async findTree(siteId) {
    const all = await this.find(siteId);
    return buildTree(all);
  },
  async findAdmin(siteId) {
    return strapi2.db.query(UID$c).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"]
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["parent", "children"]
    });
  },
  async create(siteId, data) {
    return strapi2.db.query(UID$c).create({
      data: { ...data, site: siteId }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Category not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID$c).update({
      where: { id: existing.id },
      data
    });
  },
  async softDelete(siteId, documentId) {
    const existing = await strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(UID$c).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
});
function buildTree(items, parentId = null) {
  return items.filter((item) => {
    const pid = item.parent ? item.parent.id : null;
    return pid === parentId;
  }).map((item) => ({
    ...item,
    children: buildTree(items, item.id)
  }));
}
const UID$b = "plugin::zhao-website.product";
const product = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$b).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity", "images", "mentionedEntities", "ogImage"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$b).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "category", "tags", "mainEntity", "images", "mentionedEntities", "ogImage"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$b).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$b).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { name: { $containsi: keyword } },
          { description: { $containsi: keyword } },
          { content: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const productRows = await knex("zhao_website_products_tags_lnk").whereIn("tag_id", tagIds).select("product_id");
          const productIds = [...new Set(productRows.map((r) => r.product_id))];
          if (productIds.length === 0) return [];
          filters.id = { $in: productIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$b).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: { coverImage: true, category: true, tags: { populate: { tagGroup: true } } }
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$b).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: {
        coverImage: true,
        category: true,
        tags: { populate: { tagGroup: true } },
        mainEntity: true,
        images: true,
        mentionedEntities: true,
        ogImage: true,
        structuredData: true
      }
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$b, siteId, data.name || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$b).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Product not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$b, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$b).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$b).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$b).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$a = "plugin::zhao-website.case";
const caseService = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$a).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "clientLogo", "tags", "mainEntity", "images", "mentionedEntities", "relatedProducts"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$a).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "clientLogo", "tags", "mainEntity", "images", "mentionedEntities", "relatedProducts"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$a).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "clientLogo"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$a).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { challenge: { $containsi: keyword } },
          { solution: { $containsi: keyword } },
          { results: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "clientLogo"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const caseRows = await knex("zhao_website_cases_tags_lnk").whereIn("tag_id", tagIds).select("case_id");
          const caseIds = [...new Set(caseRows.map((r) => r.case_id))];
          if (caseIds.length === 0) return [];
          filters.id = { $in: caseIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$a).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: { coverImage: true, clientLogo: true, tags: { populate: { tagGroup: true } } }
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$a).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: {
        coverImage: true,
        clientLogo: true,
        tags: { populate: { tagGroup: true } },
        mainEntity: true,
        images: true,
        mentionedEntities: true,
        relatedProducts: true,
        structuredData: true
      }
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$a, siteId, data.title || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$a).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Case not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$a, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$a).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$a).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$a).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$9 = "plugin::zhao-website.compliance";
const compliance = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$9).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$9).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["tags"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$9).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { content: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const complianceRows = await knex("zhao_website_compliances_tags_lnk").whereIn("tag_id", tagIds).select("compliance_id");
          const complianceIds = [...new Set(complianceRows.map((r) => r.compliance_id))];
          if (complianceIds.length === 0) return [];
          filters.id = { $in: complianceIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$9).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: [{ tags: { populate: { tagGroup: true } } }]
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$9).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: [{ tags: { populate: { tagGroup: true } } }]
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$9, siteId, data.title || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$9).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Compliance not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$9, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$9).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$9).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$9).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$8 = "plugin::zhao-website.faq";
const faq = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$8).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["category", "tags", "mainEntity", "mentionedEntities"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$8).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["category", "tags", "mainEntity", "mentionedEntities"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$8).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["category"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$8).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { question: { $containsi: keyword } },
          { answer: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["category"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const faqRows = await knex("zhao_website_faqs_tags_lnk").whereIn("tag_id", tagIds).select("faq_id");
          const faqIds = [...new Set(faqRows.map((r) => r.faq_id))];
          if (faqIds.length === 0) return [];
          filters.id = { $in: faqIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$8).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["category", { tags: { populate: { tagGroup: true } } }]
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$8).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: [
        "category",
        { tags: { populate: { tagGroup: true } } },
        "mainEntity",
        "mentionedEntities"
      ]
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$8, siteId, data.question || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$8).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("FAQ not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$8, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$8).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$8).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$8).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$7 = "plugin::zhao-website.tutorial";
const tutorial = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$7).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$7).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$7).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$7).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { description: { $containsi: keyword } },
          { content: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const tutorialRows = await knex("zhao_website_tutorials_tags_lnk").whereIn("tag_id", tagIds).select("tutorial_id");
          const tutorialIds = [...new Set(tutorialRows.map((r) => r.tutorial_id))];
          if (tutorialIds.length === 0) return [];
          filters.id = { $in: tutorialIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$7).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: { coverImage: true, category: true, tags: { populate: { tagGroup: true } } }
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$7).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: {
        coverImage: true,
        category: true,
        tags: { populate: { tagGroup: true } },
        mainEntity: true,
        mentionedEntities: true
      }
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$7, siteId, data.title || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$7).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Tutorial not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$7, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$7).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$7).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$7).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  }
});
const UID$6 = "plugin::zhao-website.download";
const download = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published";
    if (category) filters.category = category;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    return strapi2.db.query(UID$6).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags", "file"]
    });
  },
  async findOne(siteId, slug) {
    return strapi2.db.query(UID$6).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["tags", "file"]
    });
  },
  async findFeatured(siteId, limit = 5) {
    return strapi2.db.query(UID$6).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["tags", "file"]
    });
  },
  async search(siteId, keyword, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi2.db.query(UID$6).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { name: { $containsi: keyword } },
          { description: { $containsi: keyword } }
        ]
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags", "file"]
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } }
    };
  },
  // ===== 管理端 =====
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (tagGroup) {
      const knex = strapi2.db.connection;
      const groupRow = await knex("zhao_tag_groups").where("slug", tagGroup).first() || await knex("zhao_tag_groups").where("document_id", tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", groupRow.id).select("tag_id");
        const tagIds = tagRows.map((r) => r.tag_id);
        if (tagIds.length > 0) {
          const downloadRows = await knex("zhao_website_downloads_tags_lnk").whereIn("tag_id", tagIds).select("download_id");
          const downloadIds = [...new Set(downloadRows.map((r) => r.download_id))];
          if (downloadIds.length === 0) return [];
          filters.id = { $in: downloadIds };
        } else {
          return [];
        }
      }
    }
    return strapi2.db.query(UID$6).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: [{ tags: { populate: { tagGroup: true } } }, "file"]
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$6).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: [{ tags: { populate: { tagGroup: true } } }, "file"]
    });
  },
  async create(siteId, data) {
    const slug = data.slug || await generateUniqueSlug(strapi2, UID$6, siteId, data.name || "untitled");
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi2.db.query(UID$6).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e = new Error("Download not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi2, UID$6, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi2.db.query(UID$6).update({
      where: { id: existing.id },
      data: updateData
    });
  },
  async publish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },
  async unpublish(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },
  async archive(siteId, documentId) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID$6).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async incrementViewCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$6).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 }
    });
  },
  async incrementDownloadCount(siteId, documentId) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi2.db.query(UID$6).update({
      where: { id: existing.id },
      data: { downloadCount: (existing.downloadCount || 0) + 1 }
    });
  }
});
const UID$5 = "plugin::zhao-website.lead";
const lead = ({ strapi: strapi2 }) => ({
  async createPublic(siteId, data, ctx) {
    if (data.website) {
      return { success: true, fake: true };
    }
    const enriched = {
      ...data,
      site: siteId,
      ipAddress: ctx?.request?.ip,
      userAgent: ctx?.request?.headers?.["user-agent"],
      referrer: ctx?.request?.headers?.referer,
      status: "new"
    };
    delete enriched.website;
    return strapi2.db.query(UID$5).create({ data: enriched });
  },
  async findMine(siteId, userId, query = {}) {
    return strapi2.db.query(UID$5).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { createdAt: "DESC" },
      limit: 50
    });
  },
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, status, type, assignedTo } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (assignedTo) filters.assignedTo = assignedTo;
    return strapi2.db.query(UID$5).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" }
    });
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID$5).update({
      where: { id: existing.id },
      data
    });
  },
  async assign(siteId, documentId, assignedToId) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID$5).update({
      where: { id: existing.id },
      data: { assignedTo: assignedToId }
    });
  },
  async followUp(siteId, documentId, record) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    const followUpRecords = Array.isArray(existing.followUpRecords) ? existing.followUpRecords : [];
    followUpRecords.push({
      time: (/* @__PURE__ */ new Date()).toISOString(),
      content: record.content,
      result: record.result
    });
    return strapi2.db.query(UID$5).update({
      where: { id: existing.id },
      data: { followUpRecords }
    });
  },
  async stats(siteId) {
    const all = await strapi2.db.query(UID$5).findMany({
      where: { site: siteId, deletedAt: null }
    });
    const byStatus = all.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    const byType = all.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});
    return { total: all.length, byStatus, byType };
  },
  async softDelete(siteId, documentId) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(UID$5).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
});
class AsyncWriter {
  constructor(opts) {
    this.queue = [];
    this.maxQueueSize = 1e4;
    this.timer = null;
    this.strapi = opts.strapi;
    this.ct = opts.ct;
    this.uid = opts.uid;
    this.flushIntervalMs = opts.flushIntervalMs;
    this.flushThreshold = opts.flushThreshold;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        this.strapi.log.error(`[async-writer:${this.ct}] flush failed`, err);
      });
    }, this.flushIntervalMs);
  }
  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
  enqueue(data) {
    if (this.queue.length >= this.maxQueueSize) {
      this.strapi.log.warn(`[async-writer:${this.ct}] queue overflow, dropping oldest`);
      this.queue.shift();
    }
    this.queue.push({ ct: this.ct, data });
    if (this.queue.length >= this.flushThreshold) {
      setImmediate(() => {
        this.flush().catch(() => {
        });
      });
    }
  }
  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      const rows = batch.map((item) => item.data);
      await this.strapi.db.connection(this.uid).insert(rows);
    } catch (err) {
      try {
        for (const item of batch) {
          await this.strapi.db.connection(this.uid).insert(item.data);
        }
      } catch (err2) {
        this.strapi.log.error(`[async-writer:${this.ct}] dead letter`, {
          count: batch.length,
          error: err2.message
        });
      }
    }
  }
}
const UID$4 = "plugin::zhao-website.visit-log";
let writerInstance$1 = null;
const visitLog = ({ strapi: strapi2 }) => ({
  _getWriter() {
    if (!writerInstance$1) {
      writerInstance$1 = new AsyncWriter({
        strapi: strapi2,
        ct: "visit-log",
        uid: "zhao_website_visit_logs",
        flushIntervalMs: 5e3,
        flushThreshold: 100
      });
      writerInstance$1.start();
    }
    return writerInstance$1;
  },
  async enqueueCreate(siteId, data) {
    this._getWriter().enqueue({ ...data, site_id: siteId, created_at: /* @__PURE__ */ new Date() });
  },
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi2.db.query(UID$4).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" }
    });
  },
  async findMine(siteId, userId, query = {}) {
    return strapi2.db.query(UID$4).findMany({
      where: { site: siteId, deletedAt: null, userId },
      limit: 50,
      orderBy: { createdAt: "DESC" }
    });
  },
  async stats(siteId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const items = await strapi2.db.query(UID$4).findMany({
      where: { site: siteId, createdAt: { $gte: since } }
    });
    const byType = items.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});
    return { total: items.length, byType, days };
  },
  async purgeOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const deleted = await strapi2.db.query(UID$4).deleteMany({
      where: { createdAt: { $lt: cutoff } }
    });
    return deleted?.count || 0;
  }
});
const UID$3 = "plugin::zhao-website.interaction";
const interaction = ({ strapi: strapi2 }) => ({
  async toggle(siteId, data) {
    const existing = await strapi2.db.query(UID$3).findOne({
      where: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        deletedAt: null
      }
    });
    if (existing) {
      await strapi2.db.query(UID$3).update({
        where: { id: existing.id },
        data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return { action: "removed" };
    }
    await strapi2.db.query(UID$3).create({
      data: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        userId: data.userId,
        ipAddress: data.ctx?.request?.ip,
        userAgent: data.ctx?.request?.headers?.["user-agent"]
      }
    });
    return { action: "created" };
  },
  async check(siteId, params) {
    const existing = await strapi2.db.query(UID$3).findOne({
      where: { site: siteId, deletedAt: null, ...params }
    });
    return { liked: !!existing };
  },
  async findAdmin(siteId, query = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi2.db.query(UID$3).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" }
    });
  },
  async stats(siteId, targetType, targetId) {
    const counts = {};
    for (const type of ["like", "collect", "share"]) {
      const items = await strapi2.db.query(UID$3).findMany({
        where: { site: siteId, type, targetType, targetId, deletedAt: null }
      });
      counts[type] = items.length;
    }
    return counts;
  },
  async softDelete(siteId, documentId) {
    const existing = await strapi2.db.query(UID$3).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(UID$3).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
});
const UID$2 = "plugin::zhao-website.search-log";
let writerInstance = null;
const searchLog = ({ strapi: strapi2 }) => ({
  _getWriter() {
    if (!writerInstance) {
      writerInstance = new AsyncWriter({
        strapi: strapi2,
        ct: "search-log",
        uid: "zhao_website_search_logs",
        flushIntervalMs: 1e4,
        flushThreshold: 200
      });
      writerInstance.start();
    }
    return writerInstance;
  },
  async log(siteId, keyword, resultCount, ctx) {
    this._getWriter().enqueue({
      site_id: siteId,
      keyword,
      result_count: resultCount,
      visitor_id: ctx?.state?.visitorId || "anonymous",
      ip_address: ctx?.request?.ip,
      created_at: /* @__PURE__ */ new Date()
    });
  },
  async findAdmin(siteId, query = {}) {
    return strapi2.db.query(UID$2).findMany({
      where: { site: siteId, deletedAt: null },
      limit: 50,
      orderBy: { createdAt: "DESC" }
    });
  },
  async stats(siteId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const items = await strapi2.db.query(UID$2).findMany({
      where: { site: siteId, createdAt: { $gte: since } }
    });
    const byKeyword = {};
    for (const item of items) {
      byKeyword[item.keyword] = (byKeyword[item.keyword] || 0) + 1;
    }
    return { total: items.length, topKeywords: Object.entries(byKeyword).sort((a, b) => b[1] - a[1]).slice(0, 20) };
  }
});
const PREDICATE_DICTIONARY = {
  Organization: [
    "founder",
    "foundingDate",
    "legalName",
    "areaServed",
    "numberOfEmployees",
    "contactPoint",
    "location",
    "hasOfferCatalog"
  ],
  Person: ["affiliation", "jobTitle", "worksFor", "alumniOf"],
  Product: ["manufacturer", "brand", "offers", "aggregateRating", "category"],
  Article: ["about", "mentions", "author", "publisher", "datePublished"],
  CaseStudy: ["subjectOf", "about", "mentions"],
  Event: ["organizer", "location", "startDate", "subEvent"],
  FAQ: ["about", "mentions", "mainEntity"],
  HowTo: ["about", "mentions", "hasStep"],
  Download: ["about", "mentions", "fileFormat"]
};
function isValidPredicate(entityType, predicate) {
  const list = PREDICATE_DICTIONARY[entityType] || [];
  return list.includes(predicate);
}
const HIERARCHICAL_PREDICATES = /* @__PURE__ */ new Set([
  "parent",
  "containsPlace",
  "subEvent",
  "hasPart"
]);
const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";
const knowledgeGraph = ({ strapi: strapi2 }) => ({
  // ===== 实体 =====
  async findEntities(siteId, query = {}) {
    const { entityType, page = 1, pageSize = 20 } = query;
    const filters = { site: siteId, deletedAt: null };
    if (entityType) filters.entityType = entityType;
    return strapi2.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["image"]
    });
  },
  async findEntityBySlug(siteId, slug) {
    return strapi2.db.query(ENTITY_UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: true },
      populate: ["image"]
    });
  },
  async findEntityByRef(params) {
    return strapi2.db.query(ENTITY_UID).findOne({
      where: { refTargetType: params.refTargetType, refTargetId: params.refTargetId, deletedAt: null }
    });
  },
  async upsertEntityFromContent(params) {
    const existing = await this.findEntityByRef({
      refTargetType: params.refTargetType,
      refTargetId: params.refTargetId
    });
    if (existing) {
      return strapi2.db.query(ENTITY_UID).update({
        where: { id: existing.id },
        data: { name: params.name, entityType: params.entityType }
      });
    }
    return strapi2.db.query(ENTITY_UID).create({
      data: {
        site: params.siteId,
        entityType: params.entityType,
        name: params.name,
        refTargetType: params.refTargetType,
        refTargetId: params.refTargetId,
        sourceType: "derived"
      }
    });
  },
  async createEntity(siteId, data) {
    return strapi2.db.query(ENTITY_UID).create({
      data: { ...data, site: siteId }
    });
  },
  async updateEntity(siteId, documentId, data) {
    const existing = await strapi2.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Entity not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data
    });
  },
  async deleteEntity(siteId, documentId) {
    const existing = await strapi2.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  // ===== 关系 =====
  async findRelations(siteId, query = {}) {
    const { subjectEntityId, predicate, objectEntityId, page = 1, pageSize = 20 } = query;
    const filters = { site: siteId, deletedAt: null };
    if (subjectEntityId) filters.subjectEntity = subjectEntityId;
    if (predicate) filters.predicate = predicate;
    if (objectEntityId) filters.objectEntity = objectEntityId;
    return strapi2.db.query(RELATION_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      populate: ["subjectEntity", "objectEntity"]
    });
  },
  async addRelation(params) {
    if (params.objectEntityId && params.subjectEntityId === params.objectEntityId) {
      const e = new Error("Self-relation not allowed");
      e.status = 400;
      e.code = "SELF_RELATION";
      throw e;
    }
    const hasEntity = !!params.objectEntityId;
    const hasValue = params.objectValue !== void 0 && params.objectValue !== null;
    const hasText = !!params.objectText;
    if (hasEntity && (hasValue || hasText)) {
      const e = new Error("objectEntity 与 objectValue/objectText 互斥");
      e.status = 400;
      e.code = "OBJECT_MUTEX";
      throw e;
    }
    if (!hasEntity && !hasValue && !hasText) {
      const e = new Error("客体不能为空");
      e.status = 400;
      e.code = "OBJECT_EMPTY";
      throw e;
    }
    if (params.objectEntityId && HIERARCHICAL_PREDICATES.has(params.predicate)) {
      const hasCycle = await this._detectCycle(params.subjectEntityId, params.objectEntityId, params.predicate);
      if (hasCycle) {
        const e = new Error("循环引用 not allowed for hierarchical predicate");
        e.status = 400;
        e.code = "CYCLE_DETECTED";
        throw e;
      }
    }
    const subjectEntity = await strapi2.db.query(ENTITY_UID).findOne({
      where: { documentId: params.subjectEntityId }
    });
    if (subjectEntity && !isValidPredicate(subjectEntity.entityType, params.predicate)) {
      strapi2.log.warn(`[kg] predicate "${params.predicate}" 不在 ${subjectEntity.entityType} 字典中`);
    }
    if (params.objectEntityId) {
      const existing = await strapi2.db.query(RELATION_UID).findOne({
        where: {
          subjectEntity: params.subjectEntityId,
          predicate: params.predicate,
          objectEntity: params.objectEntityId,
          deletedAt: null
        }
      });
      if (existing) return existing;
    }
    return strapi2.db.query(RELATION_UID).create({
      data: {
        site: params.siteId,
        subjectEntity: params.subjectEntityId,
        predicate: params.predicate,
        objectEntity: params.objectEntityId || null,
        objectValue: params.objectValue || null,
        objectText: params.objectText || null,
        sourceType: params.sourceType || "manual"
      }
    });
  },
  async _detectCycle(subjectId, objectId, predicate, visited = /* @__PURE__ */ new Set()) {
    if (subjectId === objectId) return true;
    if (visited.has(subjectId)) return false;
    visited.add(subjectId);
    const outRelations = await strapi2.db.query(RELATION_UID).findMany({
      where: { subjectEntity: objectId, predicate, deletedAt: null },
      populate: ["objectEntity"]
    });
    for (const rel of outRelations) {
      if (rel.objectEntity && rel.objectEntity.documentId) {
        if (await this._detectCycle(subjectId, rel.objectEntity.documentId, predicate, visited)) {
          return true;
        }
      }
    }
    return false;
  },
  async deleteRelation(siteId, documentId) {
    const existing = await strapi2.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(RELATION_UID).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  // ===== 消歧 =====
  async disambiguate(siteId, params) {
    const candidates = await strapi2.db.query(ENTITY_UID).findMany({
      where: {
        site: siteId,
        name: { $containsi: params.name },
        deletedAt: null,
        ...params.entityType ? { entityType: params.entityType } : {}
      }
    });
    if (candidates.length === 0) return null;
    const exact = candidates.find((c) => c.name === params.name);
    if (exact) return { entity: exact, confidence: 1 };
    const top = candidates[0];
    const confidence = top.name.length / params.name.length;
    if (confidence < 0.7) return null;
    return { entity: top, confidence };
  },
  // ===== 同步与校验 =====
  async syncFromContent(targetType, content) {
    const { knowledgeGraphSync } = await import("./kg-sync-DojemDpX.mjs");
    return knowledgeGraphSync(targetType, content);
  },
  async verifyAll(siteId) {
    const entities = await strapi2.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null }
    });
    let conflicts = 0;
    const report = [];
    for (const entity of entities) {
      const truths = await strapi2.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { site: siteId, canonicalEntity: entity.documentId, verificationStatus: "conflict" }
      });
      if (truths.length > 0) {
        conflicts += 1;
        report.push({ entityId: entity.documentId, conflictCount: truths.length });
        await strapi2.db.query(ENTITY_UID).update({
          where: { id: entity.id },
          data: { verificationStatus: "conflict" }
        });
      }
    }
    return { total: entities.length, conflicts, report };
  },
  // ===== JSON-LD 导出 =====
  async exportGraph(siteId) {
    const entities = await strapi2.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["image"]
    });
    const relations = await strapi2.db.query(RELATION_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["subjectEntity", "objectEntity"]
    });
    const graph = entities.map((e) => this._entityToJsonLd(e, relations.filter((r) => r.subjectEntity?.id === e.id)));
    return { "@context": "https://schema.org", "@graph": graph };
  },
  async exportEntity(siteId, slug) {
    const entity = await this.findEntityBySlug(siteId, slug);
    if (!entity) return null;
    const outgoing = await strapi2.db.query(RELATION_UID).findMany({
      where: { site: siteId, subjectEntity: entity.documentId, deletedAt: null },
      populate: ["objectEntity"]
    });
    const incoming = await strapi2.db.query(RELATION_UID).findMany({
      where: { site: siteId, objectEntity: entity.documentId, deletedAt: null },
      populate: ["subjectEntity"]
    });
    return this._entityToJsonLd(entity, outgoing, incoming);
  },
  _entityToJsonLd(entity, outgoing = [], incoming = []) {
    const jsonLd = {
      "@type": entity.entityType,
      "@id": entity.slug || entity.documentId,
      "name": entity.name
    };
    if (entity.description) jsonLd.description = entity.description;
    if (entity.url) jsonLd.url = entity.url;
    if (entity.image) jsonLd.image = entity.url;
    if (entity.properties) Object.assign(jsonLd, entity.properties);
    for (const rel of outgoing) {
      if (rel.objectEntity) {
        jsonLd[rel.predicate] = { "@id": rel.objectEntity.slug || rel.objectEntity.documentId };
      } else if (rel.objectValue) {
        jsonLd[rel.predicate] = rel.objectValue;
      } else if (rel.objectText) {
        jsonLd[rel.predicate] = rel.objectText;
      }
    }
    return jsonLd;
  },
  async exportFacts(siteId) {
    const truths = await strapi2.db.query("plugin::zhao-website.first-truth-policy").findMany({
      where: { site: siteId, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } }
    });
    return truths.map((t) => ({
      claimKey: t.claimKey,
      claim: t.claim,
      value: t.canonicalValue,
      valueType: t.canonicalValueType,
      sourceUrl: t.canonicalSourceUrl,
      sourceType: t.canonicalSourceType,
      category: t.claimCategory,
      priority: t.priority,
      lastVerifiedAt: t.lastVerifiedAt,
      verificationStatus: t.verificationStatus
    }));
  }
});
const UID$1 = "plugin::zhao-website.ai-content-summary";
const aiContentSummary = ({ strapi: strapi2 }) => ({
  async findByTarget(siteId, targetType, targetId, summaryType) {
    const filters = { site: siteId, targetType, targetId, deletedAt: null, status: true };
    if (summaryType) filters.summaryType = summaryType;
    return strapi2.db.query(UID$1).findMany({ where: filters });
  },
  async findPublic(siteId, query = {}) {
    const { targetType, targetId, summaryType } = query;
    return this.findByTarget(siteId, targetType, targetId, summaryType);
  },
  async findAdmin(siteId, query = {}) {
    return strapi2.db.query(UID$1).findMany({
      where: { site: siteId, deletedAt: null, ...query },
      orderBy: { updatedAt: "DESC" }
    });
  },
  async create(siteId, data) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: {
        site: siteId,
        targetType: data.targetType,
        targetId: data.targetId,
        summaryType: data.summaryType,
        language: data.language || "zh-CN",
        deletedAt: null
      }
    });
    if (existing) {
      return strapi2.db.query(UID$1).update({
        where: { id: existing.id },
        data: { ...data, version: (existing.version || 0) + 1 }
      });
    }
    return strapi2.db.query(UID$1).create({
      data: { ...data, site: siteId, language: data.language || "zh-CN", version: 1 }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID$1).update({
      where: { id: existing.id },
      data: { ...data, version: (existing.version || 1) + 1 }
    });
  },
  async regenerate(siteId, documentId) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) {
      const e = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID$1).update({
      where: { id: existing.id },
      data: {
        verificationStatus: "pending",
        generatedAt: null
      }
    });
  },
  async softDelete(siteId, documentId) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) return null;
    return strapi2.db.query(UID$1).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
});
const UID = "plugin::zhao-website.first-truth-policy";
const firstTruth = ({ strapi: strapi2 }) => ({
  async find(siteId, query = {}) {
    const { claimCategory, verificationStatus } = query;
    const filters = { site: siteId, deletedAt: null };
    if (claimCategory) filters.claimCategory = claimCategory;
    if (verificationStatus) filters.verificationStatus = verificationStatus;
    return strapi2.db.query(UID).findMany({
      where: filters,
      orderBy: { priority: "DESC", updatedAt: "DESC" },
      populate: ["canonicalEntity"]
    });
  },
  async findOne(siteId, documentId) {
    return strapi2.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["canonicalEntity"]
    });
  },
  async findByClaimKey(siteId, claimKey) {
    return strapi2.db.query(UID).findOne({
      where: { site: siteId, claimKey, deletedAt: null }
    });
  },
  async create(siteId, data) {
    const existing = await this.findByClaimKey(siteId, data.claimKey);
    if (existing) {
      const e = new Error(`claimKey "${data.claimKey}" 已存在`);
      e.status = 409;
      e.code = "CLAIM_KEY_EXISTS";
      throw e;
    }
    return strapi2.db.query(UID).create({
      data: {
        ...data,
        site: siteId,
        lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        verificationStatus: data.verificationStatus || "verified"
      }
    });
  },
  async update(siteId, documentId, data) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    if (data.canonicalValue && data.canonicalValue !== existing.canonicalValue) {
      await this._markRelatedEntitiesPending(siteId, existing.canonicalEntity);
    }
    return strapi2.db.query(UID).update({
      where: { id: existing.id },
      data: {
        ...data,
        lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        verificationStatus: data.verificationStatus || "verified"
      }
    });
  },
  async _markRelatedEntitiesPending(siteId, canonicalEntity) {
    if (!canonicalEntity) return;
    const entityId = canonicalEntity.documentId || canonicalEntity;
    const entity = await strapi2.db.query("plugin::zhao-website.knowledge-entity").findOne({
      where: { site: siteId, documentId: entityId, deletedAt: null }
    });
    if (entity) {
      await strapi2.db.query("plugin::zhao-website.knowledge-entity").update({
        where: { id: entity.id },
        data: { verificationStatus: "pending" }
      });
    }
  },
  async verify(siteId, documentId) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    return strapi2.db.query(UID).update({
      where: { id: existing.id },
      data: { verificationStatus: "verified", lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  async softDelete(siteId, documentId) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) return null;
    return strapi2.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  // ===== 冲突检测 =====
  async detectConflicts(siteId) {
    const truths = await strapi2.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: true }
    });
    const byKey = {};
    for (const t of truths) {
      const key = `${t.claimKey}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    }
    const conflicts = [];
    for (const [key, items] of Object.entries(byKey)) {
      if (items.length > 1) {
        const values = new Set(items.map((i) => i.canonicalValue));
        if (values.size > 1) {
          conflicts.push({
            claimKey: key,
            severity: "error",
            values: items.map((i) => ({
              value: i.canonicalValue,
              sourceUrl: i.canonicalSourceUrl,
              sourceType: i.canonicalSourceType
            }))
          });
        }
      }
    }
    return conflicts;
  }
});
const schemaBuilder = ({ strapi: strapi2 }) => ({
  // ===== Organization =====
  buildOrganization(brandInfo2, seoConfig2) {
    const org = {
      "@context": "https://schema.org",
      "@type": seoConfig2?.organizationType || "Organization",
      name: brandInfo2?.companyName,
      url: brandInfo2?.url || ""
    };
    if (brandInfo2?.logo) org.logo = brandInfo2.logo.url;
    if (brandInfo2?.description) org.description = brandInfo2.description;
    if (brandInfo2?.foundingDate) org.foundingDate = brandInfo2.foundingDate;
    if (brandInfo2?.registeredAddress) org.address = {
      "@type": "PostalAddress",
      streetAddress: brandInfo2.registeredAddress
    };
    if (brandInfo2?.contactPhone) org.contactPoint = {
      "@type": "ContactPoint",
      telephone: brandInfo2.contactPhone,
      contactType: "customer service"
    };
    if (seoConfig2?.schemaSameAs) org.sameAs = seoConfig2.schemaSameAs;
    if (seoConfig2?.schemaContactPoint) org.contactPoint = seoConfig2.schemaContactPoint;
    return org;
  },
  // ===== Article =====
  buildArticle(article2, brandInfo2) {
    const schema = {
      "@context": "https://schema.org",
      "@type": article2.schemaType || "Article",
      headline: article2.seoTitle || article2.title,
      datePublished: article2.publishedAt,
      dateModified: article2.updatedAt,
      author: {
        "@type": "Person",
        name: article2.author || brandInfo2?.companyName || ""
      }
    };
    if (article2.seoDescription) schema.description = article2.seoDescription;
    if (article2.coverImage) schema.image = article2.coverImage.url;
    if (article2.canonicalUrl) schema.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": article2.canonicalUrl
    };
    if (brandInfo2?.companyName) schema.publisher = {
      "@type": "Organization",
      name: brandInfo2.companyName
    };
    return schema;
  },
  // ===== Product =====
  buildProduct(product2, brandInfo2) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product2.seoTitle || product2.name
    };
    if (product2.description) schema.description = product2.description;
    if (product2.coverImage) schema.image = product2.coverImage.url;
    if (product2.brand) schema.brand = { "@type": "Brand", name: product2.brand };
    if (product2.specifications) {
      schema.additionalProperty = product2.specifications.map((s) => ({
        "@type": "PropertyValue",
        name: s.name,
        value: s.value
      }));
    }
    if (product2.priceRange) schema.offers = {
      "@type": "Offer",
      priceSpecification: { "@type": "PriceSpecification", priceCurrency: "CNY" }
    };
    return schema;
  },
  // ===== HowTo (tutorial) =====
  buildHowTo(tutorial2) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: tutorial2.title
    };
    if (tutorial2.description) schema.description = tutorial2.description;
    if (tutorial2.steps) {
      schema.step = tutorial2.steps.map((step, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.title,
        text: step.content
      }));
    }
    if (tutorial2.estimatedTime) schema.totalTime = tutorial2.estimatedTime;
    return schema;
  },
  // ===== FAQ =====
  buildFAQ(faqs) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer }
      }))
    };
  },
  // ===== BreadcrumbList =====
  buildBreadcrumb(items) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url
      }))
    };
  },
  // ===== WebSite =====
  buildWebSite(seoConfig2, siteUrl) {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: seoConfig2?.organizationName || "",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };
  }
});
const llmsTxt = ({ strapi: strapi2 }) => ({
  async generate(siteId) {
    await strapi2.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo2 = await strapi2.plugin("zhao-website").service("brand-info").get(siteId);
    const lines = [];
    lines.push(`# ${brandInfo2?.companyName || "Website"}`);
    if (brandInfo2?.slogan) lines.push(`> ${brandInfo2.slogan}`);
    lines.push("");
    if (brandInfo2?.description) {
      lines.push("## Overview");
      lines.push(brandInfo2.description);
      lines.push("");
    }
    lines.push("## Pages");
    const articles = await strapi2.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 100,
      orderBy: { publishedAt: "DESC" }
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](/articles/${a.slug}): ${a.excerpt || ""}`);
    }
    const products = await strapi2.db.query("plugin::zhao-website.product").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50
    });
    for (const p of products) {
      lines.push(`- [${p.name}](/products/${p.slug}): ${p.tagline || ""}`);
    }
    lines.push("");
    lines.push("## Facts");
    const facts = await strapi2.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      lines.push(`- ${f.claim}: ${f.canonicalValue}`);
    }
    return lines.join("\n");
  }
});
const INDEXABLE_CTS = [
  { uid: "plugin::zhao-website.article", pathPrefix: "/articles", priority: 0.7 },
  { uid: "plugin::zhao-website.product", pathPrefix: "/products", priority: 0.8 },
  { uid: "plugin::zhao-website.case", pathPrefix: "/cases", priority: 0.6 },
  { uid: "plugin::zhao-website.tutorial", pathPrefix: "/tutorials", priority: 0.6 },
  { uid: "plugin::zhao-website.faq", pathPrefix: "/faqs", priority: 0.5 }
];
const sitemap = ({ strapi: strapi2 }) => ({
  async generate(siteId, siteUrl) {
    const seoConfig2 = await strapi2.plugin("zhao-website").service("seo-config").get(siteId);
    const excludeTypes = seoConfig2?.sitemapExcludeTypes || [];
    const urls = [];
    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily"));
    for (const ct of INDEXABLE_CTS) {
      if (excludeTypes.includes(ct.uid.split(".").pop())) continue;
      const items = await strapi2.db.query(ct.uid).findMany({
        where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
        orderBy: { publishedAt: "DESC" }
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        urls.push(this._urlEntry(siteUrl, `${ct.pathPrefix}/${item.slug}`, String(ct.priority), "weekly", lastmod));
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
  },
  _urlEntry(siteUrl, path, priority, changefreq, lastmod) {
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    return `  <url><loc>${siteUrl}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  }
});
const robots = ({ strapi: strapi2 }) => ({
  async generate(siteId, siteUrl) {
    const seoConfig2 = await strapi2.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig2?.enableRobotsTxt) {
      return "User-agent: *\nDisallow: /";
    }
    if (seoConfig2.robotsContent) return seoConfig2.robotsContent;
    const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api"];
    if (seoConfig2.aiCrawlerPolicy === "block_all") {
      lines.unshift("User-agent: GPTBot", "Disallow: /", "User-agent: CCBot", "Disallow: /", "User-agent: *");
    }
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n");
  }
});
const searchEnginePush = ({ strapi: strapi2 }) => ({
  async pushToBaidu(siteId, urls) {
    const seoConfig2 = await strapi2.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig2?.baiduSiteVerification || !seoConfig2?.extraConfig?.searchPushTokens?.baidu) {
      return { skipped: true, reason: "no_baidu_config" };
    }
    const token = seoConfig2.extraConfig.searchPushTokens.baidu;
    const res = await fetch(`http://data.zz.baidu.com/urls?site=${seoConfig2.baiduSiteVerification}&token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: urls.join("\n")
    });
    return res.json();
  },
  async pushToBing(siteId, urls) {
    const seoConfig2 = await strapi2.plugin("zhao-website").service("seo-config").get(siteId);
    const apiKey = seoConfig2?.extraConfig?.searchPushTokens?.bing;
    if (!apiKey) return { skipped: true, reason: "no_bing_config" };
    const res = await fetch("https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ApiKey": apiKey },
      body: JSON.stringify({ siteUrl: urls[0], urlList: urls })
    });
    return res.json();
  },
  async pushAll(siteId, urls) {
    const [baidu, bing] = await Promise.allSettled([
      this.pushToBaidu(siteId, urls),
      this.pushToBing(siteId, urls)
    ]);
    return { baidu, bing };
  }
});
const studioBridge = ({ strapi: strapi2 }) => ({
  // 从 zhao-studio article-draft 复制快照到 zhao-website article
  async publishFromStudio(siteId, params) {
    const draft = await strapi2.db.query("plugin::zhao-studio.article-draft").findOne({
      where: { documentId: params.articleDraftDocumentId }
    });
    if (!draft) {
      const e = new Error("Article draft not found");
      e.status = 404;
      throw e;
    }
    const slug = params.overrides?.slug || draft.slug;
    const existing = await strapi2.db.query("plugin::zhao-website.article").findOne({
      where: { site: siteId, slug, deletedAt: null }
    });
    if (existing) {
      const e = new Error(`Slug "${slug}" 已存在`);
      e.status = 409;
      e.code = "SLUG_EXISTS";
      throw e;
    }
    const articleData = {
      site: siteId,
      title: params.overrides?.title || draft.title,
      slug,
      excerpt: params.overrides?.excerpt || draft.excerpt,
      content: params.overrides?.content || draft.content,
      coverImage: params.overrides?.coverImage || draft.coverImage,
      author: params.overrides?.author || draft.author,
      sourceType: "studio",
      sourceArticleDraft: draft.id,
      sourceUrl: draft.canonicalUrl,
      status: params.overrides?.status || "draft",
      publishedAt: params.overrides?.status === "published" ? (/* @__PURE__ */ new Date()).toISOString() : null
    };
    return strapi2.db.query("plugin::zhao-website.article").create({ data: articleData });
  }
});
const services = {
  "seo-config": seoConfig,
  "brand-info": brandInfo,
  "article": article,
  "article-category": articleCategory,
  "product": product,
  "case": caseService,
  "compliance": compliance,
  "faq": faq,
  "tutorial": tutorial,
  "download": download,
  "lead": lead,
  "visit-log": visitLog,
  "interaction": interaction,
  "search-log": searchLog,
  "knowledge-graph": knowledgeGraph,
  "ai-content-summary": aiContentSummary,
  "first-truth": firstTruth,
  "schema-builder": schemaBuilder,
  "llms-txt": llmsTxt,
  "sitemap": sitemap,
  "robots": robots,
  "search-engine-push": searchEnginePush,
  "studio-bridge": studioBridge
};
const hasWebsitePermission = (config2) => {
  return async (ctx, next) => {
    const user = ctx.state?.user || ctx.state?.auth?.credentials;
    if (!user) {
      return ctx.throw(401, "未认证");
    }
    const action = config2?.action;
    if (!action) {
      return await next();
    }
    const authService = strapi.plugin("zhao-auth").service("auth");
    const hasPermission = await authService.checkPermission(user, action);
    if (!hasPermission) {
      return ctx.throw(403, `需要 ${action} 权限`);
    }
    await next();
  };
};
const policies = {
  "has-website-permission": hasWebsitePermission
};
const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies
};
export {
  index as default
};
