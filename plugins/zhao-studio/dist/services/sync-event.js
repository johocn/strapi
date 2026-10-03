"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-studio.sync-event";
const DRAFT_UID = "plugin::zhao-studio.article-draft";
exports.default = ({ strapi }) => ({
    // ===== 查询 =====
    async list(siteId, query = {}) {
        const { eventStatus, sourceContentType, page = 1, pageSize = 20 } = query;
        const filters = { site: siteId };
        if (eventStatus)
            filters.eventStatus = eventStatus;
        if (sourceContentType)
            filters.sourceContentType = sourceContentType;
        return strapi.db.query(UID).findMany({
            where: filters,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { createdAt: "DESC" },
            populate: ["targetDraftId"],
        });
    },
    async findOne(siteId, documentId) {
        return strapi.db.query(UID).findOne({
            where: { site: siteId, documentId },
            populate: ["targetDraftId"],
        });
    },
    // ===== 处理 =====
    async resolve(siteId, documentId, body) {
        const event = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId },
        });
        if (!event)
            throw new Error("Sync event not found");
        const { action, draftId, resolvedBy } = body;
        const now = new Date();
        let updateData;
        if (action === "create") {
            // 从 payload 创建新草稿
            const payload = event.eventPayload || {};
            const draft = await strapi.db.query(DRAFT_UID).create({
                data: {
                    site: siteId,
                    title: payload.title || event.sourceTitle || "Untitled",
                    content: payload.content || "",
                    sourceType: "website",
                    sourceContentType: event.sourceContentType,
                    sourceDocumentId: event.sourceDocumentId,
                },
            });
            updateData = {
                eventStatus: "resolved",
                resolvedAt: now,
                resolvedBy: resolvedBy || "system",
                targetDraftId: draft.documentId,
            };
        }
        else if (action === "update") {
            if (!draftId)
                throw new Error("draftId is required for update action");
            const payload = event.eventPayload || {};
            const existingDraft = await strapi.db.query(DRAFT_UID).findOne({
                where: { site: siteId, documentId: draftId },
            });
            if (!existingDraft)
                throw new Error("Draft not found");
            await strapi.db.query(DRAFT_UID).update({
                where: { id: existingDraft.id },
                data: {
                    title: payload.title || event.sourceTitle || existingDraft.title,
                    content: payload.content || existingDraft.content,
                },
            });
            updateData = {
                eventStatus: "resolved",
                resolvedAt: now,
                resolvedBy: resolvedBy || "system",
                targetDraftId: draftId,
            };
        }
        else if (action === "ignore") {
            updateData = {
                eventStatus: "ignored",
                resolvedAt: now,
                resolvedBy: resolvedBy || "system",
            };
        }
        else {
            throw new Error(`Unknown action: ${action}`);
        }
        const updated = await strapi.db.query(UID).update({
            where: { id: event.id },
            data: updateData,
        });
        return { ...updated, ...updateData };
    },
    // ===== Webhook 创建 =====
    async createFromWebhook(payload) {
        const { siteId, sourceContentType, sourceDocumentId, sourceUrl, sourceTitle, content } = payload;
        if (!siteId)
            throw new Error("siteId is required");
        return strapi.db.query(UID).create({
            data: {
                site: siteId,
                sourceType: "website",
                sourceContentType,
                sourceDocumentId,
                sourceUrl,
                sourceTitle,
                eventStatus: "pending",
                eventPayload: {
                    sourceContentType,
                    sourceDocumentId,
                    sourceUrl,
                    sourceTitle,
                    content,
                },
            },
        });
    },
});
//# sourceMappingURL=sync-event.js.map