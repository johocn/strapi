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
      await contentSync().syncOne(event.model.uid, event.result);
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
