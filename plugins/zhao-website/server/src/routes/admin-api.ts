type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const channelScopeRoute = (
  method: Method,
  path: string,
  handler: string,
  permission: string,
) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

export default () => ({
  type: "admin-api" as const,
  routes: [
    // ===== 文章管理（含 publish/archive/batch） =====
    channelScopeRoute("GET", "/articles", "admin-api.article.find", "article.read"),
    channelScopeRoute("GET", "/articles/:documentId", "admin-api.article.findOne", "article.read"),
    channelScopeRoute("POST", "/articles", "admin-api.article.create", "article.create"),
    channelScopeRoute("PUT", "/articles/:documentId", "admin-api.article.update", "article.update"),
    channelScopeRoute("DELETE", "/articles/:documentId", "admin-api.article.delete", "article.update"),
    channelScopeRoute("POST", "/articles/:documentId/publish", "admin-api.article.publish", "article.publish"),
    channelScopeRoute("POST", "/articles/:documentId/archive", "admin-api.article.archive", "article.publish"),
    channelScopeRoute("POST", "/articles/batch", "admin-api.article.batch", "article.publish"),
    // ===== SEO 配置（read/update） =====
    channelScopeRoute("GET", "/seo-config", "admin-api.seo-config.find", "seo-config.read"),
    channelScopeRoute("GET", "/seo-config/:documentId", "admin-api.seo-config.findOne", "seo-config.read"),
    channelScopeRoute("POST", "/seo-config", "admin-api.seo-config.create", "seo-config.update"),
    channelScopeRoute("PUT", "/seo-config/:documentId", "admin-api.seo-config.update", "seo-config.update"),
    channelScopeRoute("DELETE", "/seo-config/:documentId", "admin-api.seo-config.delete", "seo-config.update"),
    // ===== 品牌信息（read/update） =====
    channelScopeRoute("GET", "/brand-info", "admin-api.brand-info.find", "brand-info.read"),
    channelScopeRoute("GET", "/brand-info/:documentId", "admin-api.brand-info.findOne", "brand-info.read"),
    channelScopeRoute("POST", "/brand-info", "admin-api.brand-info.create", "brand-info.update"),
    channelScopeRoute("PUT", "/brand-info/:documentId", "admin-api.brand-info.update", "brand-info.update"),
    channelScopeRoute("DELETE", "/brand-info/:documentId", "admin-api.brand-info.delete", "brand-info.update"),
    // ===== 文章分类 =====
    channelScopeRoute("GET", "/article-categories", "admin-api.article-category.find", "article-category.read"),
    channelScopeRoute("GET", "/article-categories/:documentId", "admin-api.article-category.findOne", "article-category.read"),
    channelScopeRoute("POST", "/article-categories", "admin-api.article-category.create", "article-category.create"),
    channelScopeRoute("PUT", "/article-categories/:documentId", "admin-api.article-category.update", "article-category.update"),
    channelScopeRoute("DELETE", "/article-categories/:documentId", "admin-api.article-category.delete", "article-category.delete"),
    // ===== 产品 =====
    channelScopeRoute("GET", "/products", "admin-api.product.find", "product.read"),
    channelScopeRoute("GET", "/products/:documentId", "admin-api.product.findOne", "product.read"),
    channelScopeRoute("POST", "/products", "admin-api.product.create", "product.create"),
    channelScopeRoute("PUT", "/products/:documentId", "admin-api.product.update", "product.update"),
    channelScopeRoute("DELETE", "/products/:documentId", "admin-api.product.delete", "product.delete"),
    // ===== 案例 =====
    channelScopeRoute("GET", "/cases", "admin-api.case.find", "case.read"),
    channelScopeRoute("GET", "/cases/:documentId", "admin-api.case.findOne", "case.read"),
    channelScopeRoute("POST", "/cases", "admin-api.case.create", "case.create"),
    channelScopeRoute("PUT", "/cases/:documentId", "admin-api.case.update", "case.update"),
    channelScopeRoute("DELETE", "/cases/:documentId", "admin-api.case.delete", "case.delete"),
    // ===== 合规 =====
    channelScopeRoute("GET", "/compliance", "admin-api.compliance.find", "compliance.read"),
    channelScopeRoute("GET", "/compliance/:documentId", "admin-api.compliance.findOne", "compliance.read"),
    channelScopeRoute("POST", "/compliance", "admin-api.compliance.create", "compliance.create"),
    channelScopeRoute("PUT", "/compliance/:documentId", "admin-api.compliance.update", "compliance.update"),
    channelScopeRoute("DELETE", "/compliance/:documentId", "admin-api.compliance.delete", "compliance.update"),
    // ===== FAQ =====
    channelScopeRoute("GET", "/faqs", "admin-api.faq.find", "faq.read"),
    channelScopeRoute("GET", "/faqs/:documentId", "admin-api.faq.findOne", "faq.read"),
    channelScopeRoute("POST", "/faqs", "admin-api.faq.create", "faq.create"),
    channelScopeRoute("PUT", "/faqs/:documentId", "admin-api.faq.update", "faq.update"),
    channelScopeRoute("DELETE", "/faqs/:documentId", "admin-api.faq.delete", "faq.delete"),
    // ===== 教程 =====
    channelScopeRoute("GET", "/tutorials", "admin-api.tutorial.find", "tutorial.read"),
    channelScopeRoute("GET", "/tutorials/:documentId", "admin-api.tutorial.findOne", "tutorial.read"),
    channelScopeRoute("POST", "/tutorials", "admin-api.tutorial.create", "tutorial.create"),
    channelScopeRoute("PUT", "/tutorials/:documentId", "admin-api.tutorial.update", "tutorial.update"),
    channelScopeRoute("DELETE", "/tutorials/:documentId", "admin-api.tutorial.delete", "tutorial.delete"),
    // ===== 下载 =====
    channelScopeRoute("GET", "/downloads", "admin-api.download.find", "download.read"),
    channelScopeRoute("GET", "/downloads/:documentId", "admin-api.download.findOne", "download.read"),
    channelScopeRoute("POST", "/downloads", "admin-api.download.create", "download.create"),
    channelScopeRoute("PUT", "/downloads/:documentId", "admin-api.download.update", "download.update"),
    channelScopeRoute("DELETE", "/downloads/:documentId", "admin-api.download.delete", "download.delete"),
    // ===== 线索管理（read/update/delete） =====
    channelScopeRoute("GET", "/leads", "admin-api.lead.find", "lead.read"),
    channelScopeRoute("GET", "/leads/:documentId", "admin-api.lead.findOne", "lead.read"),
    channelScopeRoute("PUT", "/leads/:documentId", "admin-api.lead.update", "lead.update"),
    channelScopeRoute("DELETE", "/leads/:documentId", "admin-api.lead.delete", "lead.delete"),
    // ===== 数据日志（只读） =====
    channelScopeRoute("GET", "/visit-logs", "admin-api.visit-log.find", "visit-log.read"),
    channelScopeRoute("GET", "/interactions", "admin-api.interaction.find", "interaction.read"),
    channelScopeRoute("GET", "/search-logs", "admin-api.search-log.find", "search-log.read"),
    // ===== 知识图谱 - 实体 =====
    channelScopeRoute("GET", "/kg/entities", "admin-api.knowledge-graph.findEntities", "knowledge-entity.read"),
    channelScopeRoute("POST", "/kg/entities", "admin-api.knowledge-graph.createEntity", "knowledge-entity.create"),
    channelScopeRoute("PUT", "/kg/entities/:documentId", "admin-api.knowledge-graph.updateEntity", "knowledge-entity.update"),
    channelScopeRoute("DELETE", "/kg/entities/:documentId", "admin-api.knowledge-graph.deleteEntity", "knowledge-entity.delete"),
    // ===== 知识图谱 - 关系 =====
    channelScopeRoute("GET", "/kg/relations", "admin-api.knowledge-graph.findRelations", "knowledge-relation.read"),
    channelScopeRoute("POST", "/kg/relations", "admin-api.knowledge-graph.addRelation", "knowledge-relation.create"),
    channelScopeRoute("DELETE", "/kg/relations/:documentId", "admin-api.knowledge-graph.deleteRelation", "knowledge-relation.delete"),
    // ===== 知识图谱 - 消歧/导出 =====
    channelScopeRoute("POST", "/kg/disambiguate", "admin-api.knowledge-graph.disambiguate", "knowledge-entity.read"),
    channelScopeRoute("GET", "/kg/export", "admin-api.knowledge-graph.exportGraph", "knowledge-entity.read"),
    // ===== 第一真值 =====
    channelScopeRoute("GET", "/first-truths", "admin-api.first-truth.find", "first-truth.read"),
    channelScopeRoute("GET", "/first-truths/:documentId", "admin-api.first-truth.findOne", "first-truth.read"),
    channelScopeRoute("POST", "/first-truths", "admin-api.first-truth.create", "first-truth.create"),
    channelScopeRoute("PUT", "/first-truths/:documentId", "admin-api.first-truth.update", "first-truth.update"),
    channelScopeRoute("DELETE", "/first-truths/:documentId", "admin-api.first-truth.delete", "first-truth.delete"),
    channelScopeRoute("POST", "/first-truths/:documentId/verify", "admin-api.first-truth.verify", "first-truth.update"),
    channelScopeRoute("GET", "/first-truths/conflicts", "admin-api.first-truth.conflicts", "first-truth.read"),
    channelScopeRoute("GET", "/first-truths/export", "admin-api.first-truth.exportFacts", "first-truth.read"),
    // ===== AI 摘要 =====
    channelScopeRoute("GET", "/ai-summaries", "admin-api.ai-content-summary.findByTarget", "ai-summary.read"),
    channelScopeRoute("POST", "/ai-summaries", "admin-api.ai-content-summary.create", "ai-summary.create"),
    channelScopeRoute("PUT", "/ai-summaries/:documentId", "admin-api.ai-content-summary.update", "ai-summary.update"),
    channelScopeRoute("DELETE", "/ai-summaries/:documentId", "admin-api.ai-content-summary.delete", "ai-summary.delete"),
    channelScopeRoute("POST", "/ai-summaries/:documentId/regenerate", "admin-api.ai-content-summary.regenerate", "ai-summary.update"),
    // ===== Studio Bridge =====
    channelScopeRoute("POST", "/studio-bridge/publish", "admin-api.studio-bridge.publishFromStudio", "article.create"),
    // ===== 统计 =====
    channelScopeRoute("GET", "/stats/overview", "admin-api.stats.overview", "article.read"),
    channelScopeRoute("GET", "/stats/leads", "admin-api.stats.leadStats", "lead.read"),
    channelScopeRoute("GET", "/stats/search", "admin-api.stats.searchStats", "search-log.read"),
  ],
});
