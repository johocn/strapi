// server/src/utils/publish-helpers.ts
// publish 体系公共 helper：contentType 推断 + lnk 表手动插入

import type { Core } from '@strapi/strapi';

export type ContentType = 'article' | 'video' | 'gallery';

export const CONTENT_UID: Record<ContentType, string> = {
  article: 'plugin::zhao-studio.article-draft',
  video: 'plugin::zhao-studio.publish-video',
  gallery: 'plugin::zhao-studio.publish-gallery',
};

/** 从 schedule / record 文档推断 contentType */
export function detectContentType(doc: any): ContentType | null {
  if (!doc) return null;
  // 优先看已 populate 的 relation 对象
  if (doc.video?.documentId || doc.video) return 'video';
  if (doc.gallery?.documentId || doc.gallery) return 'gallery';
  if (doc.article?.documentId || doc.article) return 'article';
  // 看 json 字段（schedule.accountIds 是 json，但 schedule 没有 contentType 字段）
  return null;
}

/** content 数字 ID 在 lnk 表里的列名映射 */
export function contentLnkCol(type: ContentType): string {
  // schedule_article_lnk → article_draft_id (因为 target 是 article-draft)
  // schedule_video_lnk → publish_video_id
  // schedule_gallery_lnk → publish_gallery_id
  if (type === 'article') return 'article_draft_id';
  return `publish_${type}_id`;
}

/**
 * 手动插入 publish_schedules_xxx_lnk（创建 schedule 后 Strapi connect 不可靠时用）
 */
export async function insertScheduleLnk(
  strapi: Core.Strapi,
  contentType: ContentType,
  scheduleNumId: number,
  contentNumId: number,
): Promise<void> {
  const lnkTable = `zhao_publish_schedules_${contentType}_lnk`;
  try {
    await strapi.db.connection.query(
      `INSERT INTO ${lnkTable} (publish_schedule_id, ${contentLnkCol(contentType)}) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [scheduleNumId, contentNumId],
    );
  } catch (e) {
    strapi.log.warn(`[zhao-studio] schedule lnk insert (${lnkTable}) failed:`, (e as Error).message);
  }
}

/**
 * 手动插入 publish_records_xxx_lnk + publish_records_account_lnk
 */
export async function insertRecordLnks(
  strapi: Core.Strapi,
  contentType: ContentType,
  recordNumId: number,
  contentNumId: number,
  accountNumId: number,
): Promise<void> {
  try {
    // content lnk
    const clnkTable = `zhao_publish_records_${contentType}_lnk`;
    await strapi.db.connection.query(
      `INSERT INTO ${clnkTable} (publish_record_id, ${contentLnkCol(contentType)}) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [recordNumId, contentNumId],
    );
    // account lnk
    await strapi.db.connection.query(
      `INSERT INTO zhao_publish_records_account_lnk (publish_record_id, publish_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [recordNumId, accountNumId],
    );
  } catch (e) {
    strapi.log.warn('[zhao-studio] record lnk insert failed:', (e as Error).message);
  }
}

/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 lnk 表推断 contentType
 */
export async function inferContentTypeFromLnk(strapi: Core.Strapi, recordNumId: number): Promise<ContentType | null> {
  try {
    const tables: { ct: ContentType; table: string }[] = [
      { ct: 'video', table: 'zhao_publish_records_video_lnk' },
      { ct: 'gallery', table: 'zhao_publish_records_gallery_lnk' },
      { ct: 'article', table: 'zhao_publish_records_article_lnk' },
    ];
    for (const { ct, table } of tables) {
      const rows: any[] = await strapi.db.connection.query(
        `SELECT 1 FROM ${table} WHERE publish_record_id = $1 LIMIT 1`,
        [recordNumId],
      );
      if (rows.length > 0) return ct;
    }
  } catch { /* lnk 表可能不存在于某些环境 */ }
  return null;
}

/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 schedule lnk 表推断 contentType
 */
export async function inferContentTypeFromScheduleLnk(strapi: Core.Strapi, scheduleNumId: number): Promise<ContentType | null> {
  try {
    const tables: { ct: ContentType; table: string }[] = [
      { ct: 'video', table: 'zhao_publish_schedules_video_lnk' },
      { ct: 'gallery', table: 'zhao_publish_schedules_gallery_lnk' },
      { ct: 'article', table: 'zhao_publish_schedules_article_lnk' },
    ];
    for (const { ct, table } of tables) {
      const rows: any[] = await strapi.db.connection.query(
        `SELECT 1 FROM ${table} WHERE publish_schedule_id = $1 LIMIT 1`,
        [scheduleNumId],
      );
      if (rows.length > 0) return ct;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Strapi populate 拿不到 content 关系 → 直接查 lnk + content 表
 * 返回 { contentNumId, contentDocumentId } 或 null
 */
export async function resolveContentFromLnk(
  strapi: Core.Strapi,
  contentType: ContentType,
  recordNumId: number,
): Promise<{ contentNumId: number; contentDocumentId: string } | null> {
  try {
    const lnkTable = `zhao_publish_records_${contentType}_lnk`;
    const col = contentLnkCol(contentType);
    const contentTableMap: Record<ContentType, string> = {
      video: 'zhao_publish_videos',
      gallery: 'zhao_publish_galleries',
      article: 'zhao_article_drafts',
    };
    const contentTable = contentTableMap[contentType];
    const rows: any[] = await strapi.db.connection.query(
      `SELECT c.id, c.document_id FROM ${lnkTable} lnk JOIN ${contentTable} c ON c.id = lnk.${col} WHERE lnk.publish_record_id = $1 LIMIT 1`,
      [recordNumId],
    );
    if (rows.length > 0) {
      return { contentNumId: rows[0].id, contentDocumentId: rows[0].document_id };
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 创建 publish-record + 手动插 lnk 表（解决 Strapi plugin CT connect 不可靠问题）
 */
export async function createPublishRecord(
  strapi: Core.Strapi,
  contentType: ContentType,
  contentDocumentId: string,
  contentNumId: number,
  accountDocumentId: string,
  accountNumId: number,
  extraData: Record<string, any> = {},
): Promise<any> {
  const recordData: any = {
    account: { connect: [{ documentId: accountDocumentId }] },
    status: 'queued',
    ...extraData,
  };
  recordData[contentType] = { connect: [{ documentId: contentDocumentId }] };

  const record: any = await strapi
    .documents('plugin::zhao-studio.publish-record')
    .create({ data: recordData });

  await insertRecordLnks(strapi, contentType, record.id, contentNumId, accountNumId);
  return record;
}
