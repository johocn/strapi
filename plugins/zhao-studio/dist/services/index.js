"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const collect_1 = __importDefault(require("./collect"));
const scraper_1 = __importDefault(require("./scraper"));
const quality_1 = __importDefault(require("./quality"));
const ai_assist_1 = __importDefault(require("./ai-assist"));
const publish_1 = __importDefault(require("./publish"));
const channel_adapter_1 = __importDefault(require("./channel-adapter"));
const internal_api_1 = __importDefault(require("./internal-api"));
const status_sync_1 = __importDefault(require("./status-sync"));
const analytics_1 = __importDefault(require("./analytics"));
const aggregation_1 = __importDefault(require("./aggregation"));
const sync_event_1 = __importDefault(require("./sync-event"));
const promo_channel_1 = __importDefault(require("./promo-channel"));
const promo_campaign_1 = __importDefault(require("./promo-campaign"));
const ab_test_1 = __importDefault(require("./ab-test"));
const channel_report_1 = __importDefault(require("./channel-report"));
const ad_1 = __importDefault(require("./ad"));
const poster_1 = __importDefault(require("./poster"));
const oauth_manager_1 = __importDefault(require("./auth/oauth-manager"));
const scheduler_1 = __importDefault(require("./scheduler"));
const publish_queue_1 = __importDefault(require("./publish-queue"));
exports.default = {
    collect: collect_1.default,
    scraper: scraper_1.default,
    quality: quality_1.default,
    'ai-assist': ai_assist_1.default,
    publish: publish_1.default,
    'channel-adapter': channel_adapter_1.default,
    'internal-api': internal_api_1.default,
    'status-sync': status_sync_1.default,
    analytics: analytics_1.default,
    aggregation: aggregation_1.default,
    'sync-event': sync_event_1.default,
    'promo-channel': promo_channel_1.default,
    'promo-campaign': promo_campaign_1.default,
    'ab-test': ab_test_1.default,
    'channel-report': channel_report_1.default,
    ad: ad_1.default,
    'poster': poster_1.default,
    'oauth-manager': oauth_manager_1.default,
    scheduler: scheduler_1.default,
    'publish-queue': publish_queue_1.default,
};
//# sourceMappingURL=index.js.map