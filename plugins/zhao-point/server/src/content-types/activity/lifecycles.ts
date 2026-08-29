/* 活动 tag-index 同步（对象式 lifecycle）
 * Strapi 插件 contentTypes 里的 lifecycles 必须是「事件 handler 对象」，
 * 因为 DB 层 models-lifecycles 订阅器执行 model.lifecycles[action](event)。
 * 事件对象不含 strapi，故通过 global.strapi 取运行时实例。
 */
const ACTIVITY_UID = "plugin::zhao-point.activity";
const CATEGORY_GROUP = "activity-category";

const gStrapi = () => (globalThis as any)?.strapi;

function tagIdOf(rel: any): string | undefined {
  if (!rel) return undefined;
  const t = (rel as any).tag;
  if (typeof t === "string") return t;
  return t?.documentId ?? t?.id ?? undefined;
}

async function syncActivityIndex(documentId: string) {
  const strapi = gStrapi();
  const tagSvc = strapi?.plugin("zhao-tag")?.service("tag");
  const indexSvc = strapi?.plugin("zhao-tag")?.service("tag-index");
  if (!tagSvc || !indexSvc) return;

  // 必须显式 populate 深层关系，否则取不到 tag
  const act = await strapi.documents(ACTIVITY_UID).findOne({
    documentId,
    populate: {
      lecturer: { populate: ["tag"] },
      venue: { populate: ["tag"] },
      belongsToSeries: { populate: ["tag"] },
    },
  });
  const tagIds = new Set<string>();
  for (const d of [tagIdOf(act?.lecturer), tagIdOf(act?.venue), tagIdOf(act?.belongsToSeries)]) {
    if (d) tagIds.add(d);
  }
  if (act?.category) {
    const catDocId = await tagSvc.findOrCreate({ groupSlug: CATEGORY_GROUP, name: String(act.category) });
    if (catDocId) tagIds.add(catDocId);
  }

  await indexSvc.sync("activity", documentId, Array.from(tagIds));
}

async function sync(documentId: string) {
  const strapi = gStrapi();
  if (!documentId) return;
  try {
    await syncActivityIndex(documentId);
  } catch (e: any) {
    strapi?.log.error(`[zhao-point] activity tag-index sync failed ${documentId}: ${e?.stack || e?.message}`);
  }
}

/** 延迟到主事务提交后（新 task）执行索引同步。
 * afterCreate/afterUpdate 内调用 documents API 会共享外层事务，
 * 一旦同步中的 entity-validator 因 relations 校验抛错（Invalid relations），
 * 会污染外层事务导致活动本身被回滚（接口返回 200 但数据未落库）。
 * 用 setImmediate 把同步放到独立事件循环任务，索引失败仅打日志，绝不影响活动保存。 */
function syncDeferred(documentId: string) {
  if (!documentId) return;
  setImmediate(async () => {
    await sync(documentId);
  });
}

async function remove(documentId: string) {
  const strapi = gStrapi();
  if (!documentId) return;
  try {
    const indexSvc = strapi?.plugin("zhao-tag")?.service("tag-index");
    if (indexSvc) await indexSvc.remove("activity", documentId);
  } catch (e: any) {
    strapi?.log.error(`[zhao-point] activity tag-index remove failed ${documentId}: ${e.message}`);
  }
}

export default {
  async afterCreate(event: any) {
    syncDeferred(event?.result?.documentId);
  },
  async afterUpdate(event: any) {
    syncDeferred(event?.result?.documentId);
  },
  async afterDelete(event: any) {
    await remove(event?.result?.documentId);
  },
};