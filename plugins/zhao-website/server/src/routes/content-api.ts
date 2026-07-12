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
    publicRoute("GET", "/site-info", "site-info.info"),
    // 品牌话术公开路由（GEO AI 读取）
    publicRoute("GET", "/brand-voices", "brand-voice.publicList"),
    publicRoute("GET", "/brand-voices/by-category/:category", "brand-voice.publicByCategory"),
  ],
});