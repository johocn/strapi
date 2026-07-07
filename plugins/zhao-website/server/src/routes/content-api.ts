type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 文章 =====
    publicRoute("GET", "/articles", "content-api.article.list"),
    publicRoute("GET", "/articles/featured", "content-api.article.featured"),
    publicRoute("GET", "/articles/category/:categorySlug", "content-api.article.byCategory"),
    publicRoute("GET", "/articles/:slug", "content-api.article.detail"),
    publicRoute("GET", "/articles/:slug/related", "content-api.article.related"),
    // ===== 产品 =====
    publicRoute("GET", "/products", "content-api.product.list"),
    publicRoute("GET", "/products/:slug", "content-api.product.detail"),
    // ===== 案例 =====
    publicRoute("GET", "/cases", "content-api.case.list"),
    publicRoute("GET", "/cases/:slug", "content-api.case.detail"),
    // ===== FAQ =====
    publicRoute("GET", "/faqs", "content-api.faq.list"),
    publicRoute("GET", "/faqs/category/:categorySlug", "content-api.faq.byCategory"),
    publicRoute("GET", "/faqs/:slug", "content-api.faq.detail"),
    // ===== 教程 =====
    publicRoute("GET", "/tutorials", "content-api.tutorial.list"),
    publicRoute("GET", "/tutorials/difficulty/:level", "content-api.tutorial.byDifficulty"),
    publicRoute("GET", "/tutorials/:slug", "content-api.tutorial.detail"),
    // ===== 合规 =====
    publicRoute("GET", "/compliance", "content-api.compliance.list"),
    publicRoute("GET", "/compliance/category/:category", "content-api.compliance.byCategory"),
    publicRoute("GET", "/compliance/:slug", "content-api.compliance.detail"),
    // ===== 下载 =====
    publicRoute("GET", "/downloads", "content-api.download.list"),
    publicRoute("GET", "/downloads/:slug", "content-api.download.download"),
    // ===== 留言/留资 =====
    publicRoute("POST", "/leads/submit", "content-api.lead.submit"),
    publicRoute("POST", "/interactions/track", "content-api.lead.track"),
    // ===== SEO 输出 =====
    publicRoute("GET", "/sitemap.xml", "content-api.seo-output.sitemap"),
    publicRoute("GET", "/robots.txt", "content-api.seo-output.robots"),
    publicRoute("GET", "/llms.txt", "content-api.seo-output.llmsTxt"),
    publicRoute("GET", "/manifest.json", "content-api.seo-output.manifest"),
    // ===== 站点信息 =====
    publicRoute("GET", "/site-info", "content-api.site-info.info"),
  ],
});
