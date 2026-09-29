"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS = void 0;
exports.isValidStatus = isValidStatus;
exports.applyStatusChange = applyStatusChange;
exports.STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
};
function isValidStatus(s) {
    return Object.values(exports.STATUS).includes(s);
}
/**
 * 应用 status 变更：published 时设置 publishedAt
 */
function applyStatusChange(data, newStatus) {
    const now = new Date().toISOString();
    if (newStatus === exports.STATUS.PUBLISHED && !data.publishedAt) {
        return { ...data, status: newStatus, publishedAt: now };
    }
    if (newStatus === exports.STATUS.DRAFT) {
        return { ...data, status: newStatus, publishedAt: null };
    }
    return { ...data, status: newStatus };
}
//# sourceMappingURL=status.js.map