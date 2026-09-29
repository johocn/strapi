"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tag_sync_1 = require("../../services/utils/tag-sync");
const kg_sync_1 = require("../../services/utils/kg-sync");
const TARGET_TYPE = "website-compliance";
exports.default = {
    async afterCreate(event) {
        await (0, tag_sync_1.syncTagIndex)(event, TARGET_TYPE).catch(() => { });
        await (0, kg_sync_1.knowledgeGraphSync)(TARGET_TYPE, event.result).catch(() => { });
    },
    async afterUpdate(event) {
        await (0, tag_sync_1.syncTagIndex)(event, TARGET_TYPE).catch(() => { });
        await (0, kg_sync_1.knowledgeGraphSync)(TARGET_TYPE, event.result).catch(() => { });
    },
    async afterDelete(event) {
        await (0, tag_sync_1.removeTagIndex)(event, TARGET_TYPE).catch(() => { });
    },
};
//# sourceMappingURL=lifecycles.js.map