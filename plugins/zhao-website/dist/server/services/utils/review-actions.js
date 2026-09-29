"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyReview = applyReview;
const stable_json_1 = require("./stable-json");
/** 审核动作 → 目标状态 */
const STATUS_BY_ACTION = {
    submit: "pending",
    approve: "verified",
    reject: "rejected",
};
/**
 * 三表共用的审核动作：先更新状态（事实），再写严格流水（证据）。
 * 非原子（未封装事务），流水失败直接 500 让人核查，避免静默无记录。
 */
async function applyReview(strapi, params) {
    const { uid, targetType, siteId, documentId, action, actor, reason, extraData } = params;
    if (action === "reject" && !String(reason ?? "").trim()) {
        const e = new Error("驳回必须填写理由");
        e.status = 400;
        e.code = "REASON_REQUIRED";
        throw e;
    }
    const existing = await strapi.db.query(uid).findOne({
        where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
        const e = new Error("Record not found");
        e.status = 404;
        e.code = "NOT_FOUND";
        throw e;
    }
    const status = STATUS_BY_ACTION[action];
    const version = (Number(existing.version) || 1) + 1;
    const data = { verificationStatus: status, version, ...(extraData || {}) };
    if (action === "approve")
        data.lastVerifiedAt = new Date().toISOString();
    const updated = await strapi.db.query(uid).update({ where: { id: existing.id }, data });
    const audit = strapi.plugin("zhao-website").service("knowledge-audit");
    await audit.append({
        siteId,
        targetType,
        targetId: documentId,
        action,
        actor,
        reason: reason ?? null,
        version,
        strict: true,
        changedFields: (0, stable_json_1.diffFields)({ verificationStatus: existing.verificationStatus }, { verificationStatus: status }),
    });
    return updated;
}
//# sourceMappingURL=review-actions.js.map