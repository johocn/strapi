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
    strapi?.log.error(`[zhao-point] activity tag-index sync failed ${documentId}: ${e.message}`);
  }
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
    await sync(event?.result?.documentId);
  },
  async afterUpdate(event: any) {
    await sync(event?.result?.documentId);
  },
  async afterDelete(event: any) {
    await remove(event?.result?.documentId);
  },
};