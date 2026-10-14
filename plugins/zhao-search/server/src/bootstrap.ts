import type { Core } from "@strapi/strapi";
import { CONTENT_MAP } from "./content-mapper";

// 监听的内容类型（lifecycle 增量与启动全量的范围）
const WATCHED = Object.keys(CONTENT_MAP);

// afterDelete 时 e.result 可能无字段，用 e.params 兜底构造待删除文档 id
const extractEntryId = (event: any) => {
  const where = event?.params?.where ?? {};
  return (
    where.documentId ??
    where.id ??
    event?.params?.documentId ??
    event?.result?.documentId ??
    event?.result?.id
  );
};

// 软删行被 zhao-common 全局过滤（beforeFindOne 注入 deletedAt:null）拦截后，
// db.query.findOne 读不到该行 → 用 knex 直连（不经过 lifecycles）读取 documentId
// 注意：where.id 是数字主键，必须按主键列查询（document_id 是字符串列，匹配不上）
const readDocumentIdRaw = async (strapi: any, uid: string, id: number | string): Promise<string | null> => {
  try {
    const meta: any = strapi.db.metadata.get(uid);
    const docColumn = meta?.attributes?.documentId?.columnName || "document_id";
    const pkColumn = meta?.attributes?.id?.columnName || "id";
    const table = meta?.tableName;
    if (!table) return null;
    const row = await strapi.db.connection(table).where(pkColumn, id).first(docColumn);
    return row?.[docColumn] ?? null;
  } catch (e: any) {
    strapi.log.error(`[zhao-search] raw 查询异常 uid=${uid} id=${id}: ${e?.message || e}`);
    return null;
  }
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-search] 插件已加载");

  const contentSync = () => strapi.plugin("zhao-search").service("content-sync");

  // lifecycle 增量同步（db 层订阅：admin 后台编辑与 documents API 写入均会触发；syncOne/removeOne 内部已 catch 降级）
  strapi.db.lifecycles.subscribe({
    async afterCreate(event: any) {
      if (!WATCHED.includes(event.model.uid)) return;
      await contentSync().syncOne(event.model.uid, event.result);
    },
    async afterUpdate(event: any) {
      if (!WATCHED.includes(event.model.uid)) return;
      const entry = event.result;
      if (!entry) {
        // 软删除场景：zhao-common 的全局软删过滤会让 db.update 收尾 findOne 查不到刚软删的行，
        // 导致 event.result 为 null。兜底：raw 读取 documentId，从索引移除该文档。
        const id = event?.params?.where?.id;
        if (id == null) return;
        const documentId = await readDocumentIdRaw(strapi, event.model.uid, id);
        if (!documentId) return;
        strapi.log.info(`[zhao-search] afterUpdate result 为空（软删过滤），按 documentId 移除索引 ${documentId}`);
        await contentSync().removeOne(event.model.uid, documentId);
        return;
      }
      await contentSync().syncOne(event.model.uid, entry);
    },
    async afterDelete(event: any) {
      if (!WATCHED.includes(event.model.uid)) return;
      await contentSync().removeOne(event.model.uid, extractEntryId(event));
    },
  });

  strapi.log.info(`[zhao-search] 已订阅 ${WATCHED.length} 个内容类型的增量同步`);

  // 启动全量：延迟到服务就绪后执行；幂等，失败仅记日志不阻塞启动
  setImmediate(() => {
    contentSync()
      .fullReindex()
      .then((result: any) => {
        if (result?.ok) strapi.log.info(`[zhao-search] 启动全量同步完成 ${JSON.stringify(result.counts)}`);
        else strapi.log.warn(`[zhao-search] 启动全量同步未成功 ${JSON.stringify(result)}`);
      })
      .catch((e: any) => strapi.log.warn(`[zhao-search] 启动全量同步失败（不影响启动）: ${e?.message || e}`));
  });
};

export default bootstrap;
