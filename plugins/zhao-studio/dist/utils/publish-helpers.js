"use strict";
// server/src/utils/publish-helpers.ts
// publish 体系公共 helper：contentType 推断 + lnk 表手动插入
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTENT_UID = void 0;
exports.detectContentType = detectContentType;
exports.contentLnkCol = contentLnkCol;
exports.insertScheduleLnk = insertScheduleLnk;
exports.insertRecordLnks = insertRecordLnks;
exports.inferContentTypeFromLnk = inferContentTypeFromLnk;
exports.inferContentTypeFromScheduleLnk = inferContentTypeFromScheduleLnk;
exports.resolveContentFromLnk = resolveContentFromLnk;
exports.createPublishRecord = createPublishRecord;
exports.CONTENT_UID = {
    article: 'plugin::zhao-studio.article-draft',
    video: 'plugin::zhao-studio.publish-video',
    gallery: 'plugin::zhao-studio.publish-gallery',
};
/** 从 schedule / record 文档推断 contentType */
function detectContentType(doc) {
    if (!doc)
        return null;
    // 优先看已 populate 的 relation 对象
    if (doc.video?.documentId || doc.video)
        return 'video';
    if (doc.gallery?.documentId || doc.gallery)
        return 'gallery';
    if (doc.article?.documentId || doc.article)
        return 'article';
    // 看 json 字段（schedule.accountIds 是 json，但 schedule 没有 contentType 字段）
    return null;
}
/** content 数字 ID 在 lnk 表里的列名映射 */
function contentLnkCol(type) {
    // schedule_article_lnk → article_draft_id (因为 target 是 article-draft)
    // schedule_video_lnk → publish_video_id
    // schedule_gallery_lnk → publish_gallery_id
    if (type === 'article')
        return 'article_draft_id';
    return `publish_${type}_id`;
}
/**
 * 手动插入 publish_schedules_xxx_lnk（创建 schedule 后 Strapi connect 不可靠时用）
 */
async function insertScheduleLnk(strapi, contentType, scheduleNumId, contentNumId) {
    const lnkTable = `zhao_publish_schedules_${contentType}_lnk`;
    try {
        await strapi.db.connection.query(`INSERT INTO ${lnkTable} (publish_schedule_id, ${contentLnkCol(contentType)}) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [scheduleNumId, contentNumId]);
    }
    catch (e) {
        strapi.log.warn(`[zhao-studio] schedule lnk insert (${lnkTable}) failed:`, e.message);
    }
}
/**
 * 手动插入 publish_records_xxx_lnk + publish_records_account_lnk
 */
async function insertRecordLnks(strapi, contentType, recordNumId, contentNumId, accountNumId) {
    try {
        // content lnk
        const clnkTable = `zhao_publish_records_${contentType}_lnk`;
        await strapi.db.connection.query(`INSERT INTO ${clnkTable} (publish_record_id, ${contentLnkCol(contentType)}) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [recordNumId, contentNumId]);
        // account lnk
        await strapi.db.connection.query(`INSERT INTO zhao_publish_records_account_lnk (publish_record_id, publish_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [recordNumId, accountNumId]);
    }
    catch (e) {
        strapi.log.warn('[zhao-studio] record lnk insert failed:', e.message);
    }
}
/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 lnk 表推断 contentType
 */
async function inferContentTypeFromLnk(strapi, recordNumId) {
    try {
        const tables = [
            { ct: 'video', table: 'zhao_publish_records_video_lnk' },
            { ct: 'gallery', table: 'zhao_publish_records_gallery_lnk' },
            { ct: 'article', table: 'zhao_publish_records_article_lnk' },
        ];
        for (const { ct, table } of tables) {
            const rows = await strapi.db.connection.query(`SELECT 1 FROM ${table} WHERE publish_record_id = $1 LIMIT 1`, [recordNumId]);
            if (rows.length > 0)
                return ct;
        }
    }
    catch { /* lnk 表可能不存在于某些环境 */ }
    return null;
}
/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 schedule lnk 表推断 contentType
 */
async function inferContentTypeFromScheduleLnk(strapi, scheduleNumId) {
    try {
        const tables = [
            { ct: 'video', table: 'zhao_publish_schedules_video_lnk' },
            { ct: 'gallery', table: 'zhao_publish_schedules_gallery_lnk' },
            { ct: 'article', table: 'zhao_publish_schedules_article_lnk' },
        ];
        for (const { ct, table } of tables) {
            const rows = await strapi.db.connection.query(`SELECT 1 FROM ${table} WHERE publish_schedule_id = $1 LIMIT 1`, [scheduleNumId]);
            if (rows.length > 0)
                return ct;
        }
    }
    catch { /* ignore */ }
    return null;
}
/**
 * Strapi populate 拿不到 content 关系 → 直接查 lnk + content 表
 * 返回 { contentNumId, contentDocumentId } 或 null
 */
async function resolveContentFromLnk(strapi, contentType, recordNumId) {
    try {
        const lnkTable = `zhao_publish_records_${contentType}_lnk`;
        const col = contentLnkCol(contentType);
        const contentTableMap = {
            video: 'zhao_publish_videos',
            gallery: 'zhao_publish_galleries',
            article: 'zhao_article_drafts',
        };
        const contentTable = contentTableMap[contentType];
        const rows = await strapi.db.connection.query(`SELECT c.id, c.document_id FROM ${lnkTable} lnk JOIN ${contentTable} c ON c.id = lnk.${col} WHERE lnk.publish_record_id = $1 LIMIT 1`, [recordNumId]);
        if (rows.length > 0) {
            return { contentNumId: rows[0].id, contentDocumentId: rows[0].document_id };
        }
    }
    catch { /* ignore */ }
    return null;
}
/**
 * 创建 publish-record + 手动插 lnk 表（解决 Strapi plugin CT connect 不可靠问题）
 */
async function createPublishRecord(strapi, contentType, contentDocumentId, contentNumId, accountDocumentId, accountNumId, extraData = {}) {
    const recordData = {
        account: { connect: [{ documentId: accountDocumentId }] },
        status: 'queued',
        ...extraData,
    };
    recordData[contentType] = { connect: [{ documentId: contentDocumentId }] };
    const record = await strapi
        .documents('plugin::zhao-studio.publish-record')
        .create({ data: recordData });
    await insertRecordLnks(strapi, contentType, record.id, contentNumId, accountNumId);
    return record;
}
//# sourceMappingURL=publish-helpers.js.map