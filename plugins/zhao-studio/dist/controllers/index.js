"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const collect_1 = __importDefault(require("./collect"));
const draft_1 = __importDefault(require("./draft"));
const publish_1 = __importDefault(require("./publish"));
const internal_api_1 = __importDefault(require("./internal-api"));
const ai_1 = __importDefault(require("./ai"));
const analytics_1 = __importDefault(require("./analytics"));
const knowledge_index_1 = __importDefault(require("./knowledge-index"));
const browser_log_1 = __importDefault(require("./browser-log"));
const stat_summary_1 = __importDefault(require("./stat-summary"));
const sync_event_api_1 = __importDefault(require("./sync-event-api"));
const promo_channel_1 = __importDefault(require("./promo-channel"));
const promo_campaign_1 = __importDefault(require("./promo-campaign"));
const ab_test_1 = __importDefault(require("./ab-test"));
const channel_report_1 = __importDefault(require("./channel-report"));
const ad_1 = __importDefault(require("./ad"));
const poster_1 = __importDefault(require("./poster"));
const oauth_1 = __importDefault(require("./oauth"));
exports.default = {
    collect: collect_1.default,
    draft: draft_1.default,
    publish: publish_1.default,
    'internal-api': internal_api_1.default,
    ai: ai_1.default,
    analytics: analytics_1.default,
    'knowledge-index': knowledge_index_1.default,
    'browser-log': browser_log_1.default,
    'stat-summary': stat_summary_1.default,
    'sync-event-api': sync_event_api_1.default,
    'promo-channel': promo_channel_1.default,
    'promo-campaign': promo_campaign_1.default,
    'ab-test': ab_test_1.default,
    'channel-report': channel_report_1.default,
    ad: ad_1.default,
    'poster': poster_1.default,
    oauth: oauth_1.default,
};
//# sourceMappingURL=index.js.map