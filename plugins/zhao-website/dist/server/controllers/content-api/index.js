"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const article_1 = __importDefault(require("./article"));
const geo_article_1 = __importDefault(require("./geo-article"));
const product_1 = __importDefault(require("./product"));
const case_1 = __importDefault(require("./case"));
const faq_1 = __importDefault(require("./faq"));
const tutorial_1 = __importDefault(require("./tutorial"));
const compliance_1 = __importDefault(require("./compliance"));
const download_1 = __importDefault(require("./download"));
const lead_1 = __importDefault(require("./lead"));
const seo_output_1 = __importDefault(require("./seo-output"));
const site_info_1 = __importDefault(require("./site-info"));
const seo_meta_1 = __importDefault(require("./seo-meta"));
const knowledge_graph_1 = __importDefault(require("./knowledge-graph"));
const feed_1 = __importDefault(require("./feed"));
const invite_trace_1 = __importDefault(require("./invite-trace"));
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
    "knowledge-graph": knowledge_graph_1.default,
    "feed": feed_1.default,
    "invite-trace": invite_trace_1.default,
};
//# sourceMappingURL=index.js.map