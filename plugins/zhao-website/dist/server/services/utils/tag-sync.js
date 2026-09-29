"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTagIndex = syncTagIndex;
exports.removeTagIndex = removeTagIndex;
async function syncTagIndex(event, targetType) {
    const result = event?.result;
    if (!result || !result.documentId)
        return;
    const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
    if (!tagIndexService || typeof tagIndexService.sync !== "function")
        return;
    const tagIds = Array.isArray(result.tags)
        ? result.tags.map((t) => t.documentId).filter(Boolean)
        : [];
    try {
        await tagIndexService.sync(targetType, result.documentId, tagIds);
    }
    catch (err) {
        strapi.log.warn(`[zhao-website] tag-sync failed for ${targetType}`, err);
    }
}
async function removeTagIndex(event, targetType) {
    const result = event?.result;
    if (!result || !result.documentId)
        return;
    const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
    if (!tagIndexService || typeof tagIndexService.remove !== "function")
        return;
    try {
        await tagIndexService.remove(targetType, result.documentId);
    }
    catch (err) {
        strapi.log.warn(`[zhao-website] tag-index remove failed for ${targetType}`, err);
    }
}
//# sourceMappingURL=tag-sync.js.map