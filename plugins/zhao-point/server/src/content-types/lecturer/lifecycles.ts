/* 讲师影子标签联动（对象式 lifecycle）
 * Strapi 插件 contentTypes 里的 lifecycles 必须是「事件 handler 对象」，
 * 因为 DB 层 models-lifecycles 订阅器执行 model.lifecycles[action](event)。
 * 事件对象不含 strapi，故通过 global.strapi 取运行时实例。
 */
const UID = "plugin::zhao-point.lecturer";
const GROUP_SLUG = "activity-lecturer";
const NAME_FIELD = "name";
const TAG_UID = "plugin::zhao-tag.tag";

const gStrapi = () => (globalThis as any)?.strapi;

/**
 * 影子标签防递归同步：
 * - 资源已关联 shadow tag → 仅同步其 name（改名复用原标签），不写资源字段，不触发资源 lifecycle，无递归。
 * - 资源未关联 → findOrCreate 并写一次资源 tag 字段；该写会再次触发 afterUpdate，
 *   但此时已有关联，走进上一分支 → 返回，递归一次即止。
 */
async function syncShadowTag(documentId: string, alias: string) {
  const strapi = gStrapi();
  const tagSvc = strapi?.plugin("zhao-tag")?.service("tag");
  if (!tagSvc) return;

  const cur = await strapi.documents(UID).findOne({
    documentId,
    populate: { tag: { fields: ["documentId", "name"] } },
  });
  const curTag = cur?.tag;

  if (curTag?.documentId) {
    // 已有影子标签：改名时同步 name
    if (curTag.name !== alias) {
      await strapi.documents(TAG_UID).update({ documentId: curTag.documentId, data: { name: alias } });
    }
    return;
  }

  // 首次：findOrCreate 定位/创建分组内同名标签
  const tagId = await tagSvc.findOrCreate({ groupSlug: GROUP_SLUG, name: alias });
  if (!tagId) return;
  await strapi.documents(UID).update({ documentId, data: { tag: tagId } });
}

const run = async (event: any) => {
  const { result } = event;
  if (!result?.documentId) return;
  const alias = result?.[NAME_FIELD];
  if (!alias) return;
  const strapi = gStrapi();
  try {
    await syncShadowTag(result.documentId, alias);
  } catch (e: any) {
    strapi?.log.error(`[zhao-point] ${GROUP_SLUG} shadow tag sync failed ${result.documentId}: ${e.message}`);
  }
};

export default {
  async afterCreate(event: any) {
    await run(event);
  },
  async afterUpdate(event: any) {
    await run(event);
  },
};