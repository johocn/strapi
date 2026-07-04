import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag-index";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 业务方 lifecycle 调用：同步标签索引
   * 计算 diff：新增的入库，移除的删除
   */
  async sync(targetType: string, targetId: string, tagIds: string[]) {
    if (!targetType || !targetId) return;

    // 查询现有索引
    const existing = await strapi.documents(UID).findMany({
      filters: { targetType, targetId },
      populate: { tag: true },
    });

    const existingTagIds = new Set(
      (existing as any[]).map((r: any) => r.tag?.documentId).filter(Boolean)
    );
    const newTagIds = new Set(tagIds);

    // 删除被移除的索引
    const toRemove = (existing as any[]).filter(
      (r: any) => !newTagIds.has(r.tag?.documentId)
    );
    for (const r of toRemove) {
      if (r.documentId) {
        await strapi.documents(UID).delete({ documentId: r.documentId });
      }
    }

    // 新增缺失的索引
    const toAdd = tagIds.filter((id) => !existingTagIds.has(id));
    for (const tagDocumentId of toAdd) {
      await strapi.documents(UID).create({
        data: { targetType, targetId, tag: tagDocumentId },
      });
    }
  },

  /**
   * 业务方 lifecycle 调用：删除某业务记录的所有索引
   */
  async remove(targetType: string, targetId: string) {
    if (!targetType || !targetId) return;
    const records = await strapi.documents(UID).findMany({
      filters: { targetType, targetId },
    });
    for (const r of records as any[]) {
      if (r.documentId) {
        await strapi.documents(UID).delete({ documentId: r.documentId });
      }
    }
  },

  /**
   * 跨业务检索：按 tag 查所有关联内容
   * 返回 [{ targetType, targetId }]
   */
  async searchByTag(tagDocumentId: string, targetType?: string) {
    const filters: any = { tag: { documentId: tagDocumentId } };
    if (targetType) filters.targetType = targetType;
    return strapi.documents(UID).findMany({
      filters,
      fields: ["targetType", "targetId"],
    });
  },

  /**
   * 统计：标签被引用次数
   */
  async countByTag(tagDocumentId: string) {
    return strapi.documents(UID).count({
      filters: { tag: { documentId: tagDocumentId } },
    });
  },
});
