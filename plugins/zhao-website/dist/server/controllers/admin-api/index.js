"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const article_1 = __importDefault(require("./article"));
const generic_1 = __importDefault(require("./generic"));
const knowledge_graph_1 = __importDefault(require("./knowledge-graph"));
const first_truth_1 = __importDefault(require("./first-truth"));
const ai_content_summary_1 = __importDefault(require("./ai-content-summary"));
const studio_bridge_1 = __importDefault(require("./studio-bridge"));
const stats_1 = __importDefault(require("./stats"));
exports.default = {
    article: article_1.default,
    ...generic_1.default,
    "knowledge-graph": knowledge_graph_1.default,
    "first-truth": first_truth_1.default,
    "ai-content-summary": ai_content_summary_1.default,
    "studio-bridge": studio_bridge_1.default,
    stats: stats_1.default,
};
//# sourceMappingURL=index.js.map