"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tag_sync_1 = require("../../services/utils/tag-sync");
const kg_sync_1 = require("../../services/utils/kg-sync");
const TARGET_TYPE = "website-product";
const PATH_PREFIX = "/products";
async function pushToSearchEngines(event) {
    try {
        const result = event.result;
        if (result.status !== "published")
            return;
        const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
            where: { id: result.site },
        });
        if (!siteConfig?.domain)
            return;
        const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
        await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
        strapi.plugin("zhao-website").service("cache")?.invalidate();
    }
    catch (e) {
        strapi.log.warn("[zhao-website] product search engine push failed:", e);
    }
}
exports.default = {
    async afterCreate(event) {
        await (0, tag_sync_1.syncTagIndex)(event, TARGET_TYPE).catch(() => { });
        await (0, kg_sync_1.knowledgeGraphSync)(TARGET_TYPE, event.result).catch(() => { });
        await pushToSearchEngines(event);
    },
    async afterUpdate(event) {
        await (0, tag_sync_1.syncTagIndex)(event, TARGET_TYPE).catch(() => { });
        await (0, kg_sync_1.knowledgeGraphSync)(TARGET_TYPE, event.result).catch(() => { });
        await pushToSearchEngines(event);
    },
    async afterDelete(event) {
        await (0, tag_sync_1.removeTagIndex)(event, TARGET_TYPE).catch(() => { });
        strapi.plugin("zhao-website").service("cache")?.invalidate();
    },
};
//# sourceMappingURL=lifecycles.js.map