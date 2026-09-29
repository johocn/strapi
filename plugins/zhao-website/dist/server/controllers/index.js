"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const article_1 = __importDefault(require("./content-api/article"));
const geo_article_1 = __importDefault(require("./content-api/geo-article"));
const product_1 = __importDefault(require("./content-api/product"));
const case_1 = __importDefault(require("./content-api/case"));
const faq_1 = __importDefault(require("./content-api/faq"));
const tutorial_1 = __importDefault(require("./content-api/tutorial"));
const compliance_1 = __importDefault(require("./content-api/compliance"));
const download_1 = __importDefault(require("./content-api/download"));
const lead_1 = __importDefault(require("./content-api/lead"));
const seo_output_1 = __importDefault(require("./content-api/seo-output"));
const site_info_1 = __importDefault(require("./content-api/site-info"));
const seo_meta_1 = __importDefault(require("./content-api/seo-meta"));
const feed_1 = __importDefault(require("./content-api/feed"));
const knowledge_graph_1 = __importDefault(require("./content-api/knowledge-graph"));
const article_2 = __importDefault(require("./admin-api/article"));
const seo_config_1 = __importDefault(require("./admin-api/seo-config"));
const brand_info_1 = __importDefault(require("./admin-api/brand-info"));
const invite_trace_1 = __importDefault(require("./content-api/invite-trace"));
const generic_1 = __importDefault(require("./admin-api/generic"));
const knowledge_graph_2 = __importDefault(require("./admin-api/knowledge-graph"));
const first_truth_1 = __importDefault(require("./admin-api/first-truth"));
const ai_content_summary_1 = __importDefault(require("./admin-api/ai-content-summary"));
const studio_bridge_1 = __importDefault(require("./admin-api/studio-bridge"));
const stats_1 = __importDefault(require("./admin-api/stats"));
const brand_voice_1 = __importDefault(require("./admin-api/brand-voice"));
const geo_article_audit_1 = __importDefault(require("./admin-api/geo-article-audit"));
const geo_article_admin_1 = __importDefault(require("./admin-api/geo-article-admin"));
const knowledge_health_1 = __importDefault(require("./admin-api/knowledge-health"));
const adminGeneric = Object.fromEntries(Object.entries(generic_1.default).map(([key, value]) => [`${key}-admin`, value]));
const knowledgeGraph = {
    ...knowledge_graph_2.default,
    ...knowledge_graph_1.default,
};
exports.default = {
    article: article_1.default,
    "geo-article": geo_article_1.default,
    product: product_1.default,
    case: case_1.default,
    faq: faq_1.default,
    tutorial: tutorial_1.default,
    compliance: compliance_1.default,
    download: download_1.default,
    lead: lead_1.default,
    "seo-output": seo_output_1.default,
    "site-info": site_info_1.default,
    "seo-meta": seo_meta_1.default,
    feed: feed_1.default,
    "invite-trace": invite_trace_1.default,
    "article-admin": article_2.default,
    "seo-config-admin": seo_config_1.default,
    "brand-info-admin": brand_info_1.default,
    ...adminGeneric,
    "knowledge-graph": knowledgeGraph,
    "first-truth": first_truth_1.default,
    "ai-content-summary": ai_content_summary_1.default,
    "studio-bridge": studio_bridge_1.default,
    stats: stats_1.default,
    "brand-voice": brand_voice_1.default,
    "geo-article-audit": geo_article_audit_1.default,
    "geoArticleAdmin": geo_article_admin_1.default,
    "knowledge-health": knowledge_health_1.default,
};
//# sourceMappingURL=index.js.map