import type { Core } from "@strapi/strapi";
import { CONTENT_MAP, documentIdsFor, toContentDocuments, type ContentTypeMap } from "../content-mapper";
import type { KbDocument } from "./meili";

const PAGE_SIZE = 200;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const logError = (msg: string, e: any) => strapi.log.error(`[zhao-search] ${msg}: ${e?.message || e}`);
  const meili = () => strapi.plugin("zhao-search").service("meili");

  // 发布条件：publishedAt 非空 + status=published + 未软删除（draftAndPublish=false 的自定义字段）
  const queryWhere = (m: ContentTypeMap) => {
    const where: any = { [m.publishedField]: { $ne: null } };
    if (m.statusField) where[m.statusField] = m.statusValue;
    if (m.deletedField) where[m.deletedField] = { $null: true };
    return where;
  };

  const syncRows = async (uid: string, rows: any[]): Promise<void> => {
    const docsByLocale: Record<string, KbDocument[]> = {};
    for (const row of rows) {
      for (const { locale, doc } of toContentDocuments(uid, row)) {
        (docsByLocale[locale] ||= []).push(doc);
      }
    }
    for (const [locale, docs] of Object.entries(docsByLocale)) {
      await meili().upsertDocuments(locale, docs);
    }
  };

  const doFullReindex = async () => {
    const startedAt = Date.now();
    try {
      await meili().ensureIndexes();
    } catch (e) {
      logError("Meili 不可用，全量同步中止", e);
      return { ok: false, error: e?.message || String(e) };
    }
    const counts: Record<string, number> = {};
    const errors: string[] = [];
    for (const [uid, m] of Object.entries(CONTENT_MAP)) {
      let offset = 0;
      let count = 0;
      try {
        for (;;) {
          const rows: any[] = await strapi.db.query(uid).findMany({
            where: queryWhere(m),
            populate: m.tagsField ? { [m.tagsField]: true } : undefined,
            limit: PAGE_SIZE,
            offset,
            orderBy: { id: "asc" },
          });
          await syncRows(uid, rows);
          count += rows.length;
          if (rows.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        counts[m.type] = count;
      } catch (e) {
        errors.push(`${uid}: ${e?.message || e}`);
        logError(`全量同步 ${uid} 失败`, e);
      }
    }
    return { ok: errors.length === 0, counts, errors, durationMs: Date.now() - startedAt };
  };

  const doSyncOne = async (uid: string, entry: any) => {
    if (!entry) return;
    const docs = toContentDocuments(uid, entry);
    if (docs.length) {
      for (const { locale, doc } of docs) {
        await meili().upsertDocuments(locale, [doc]);
        strapi.log.info(`[zhao-search] 已同步 ${doc.id}`);
      }
    } else {
      // 转草稿/下架/软删除 → 从索引移除
      await doRemoveOne(uid, entry.documentId ?? entry.id);
    }
  };

  const doRemoveOne = async (uid: string, entryId: any) => {
    if (entryId == null) return;
    const ids = documentIdsFor(uid, entryId);
    if (!ids.length) return;
    for (const locale of meili().locales) await meili().deleteDocuments(locale, ids);
  };

  // 对外统一 catch 降级：Meili 故障只记日志，不影响业务写入
  return {
    async fullReindex() {
      return doFullReindex();
    },

    async syncOne(uid: string, entry: any) {
      try {
        await doSyncOne(uid, entry);
      } catch (e) {
        logError(`增量同步失败 ${uid}`, e);
      }
    },

    async removeOne(uid: string, entryId: any) {
      try {
        await doRemoveOne(uid, entryId);
      } catch (e) {
        logError(`索引删除失败 ${uid}`, e);
      }
    },
  };
};
