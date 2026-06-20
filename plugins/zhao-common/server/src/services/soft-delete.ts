import type { Core } from "@strapi/strapi";

const resolveUid = (contentType: string) =>
  contentType.includes("::") ? contentType : `plugin::${contentType}`;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 软删除：将 deletedAt 设为当前时间
   * 使用 strapi.db.query() 直接操作，绕过自动过滤
   */
  async softDelete(contentType: string, documentId: string) {
    const uid = resolveUid(contentType);
    const model = strapi.contentType(uid as any);
    if (!model) {
      strapi.log.warn(`[zhao-common] softDelete: contentType "${uid}" not found`);
      return null;
    }

    const existing = await strapi.db.query(uid).findOne({ where: { documentId } });
    if (!existing) {
      strapi.log.warn(`[zhao-common] softDelete: document "${documentId}" not found in ${uid}`);
      return null;
    }
    if (existing.deletedAt) {
      strapi.log.warn(`[zhao-common] softDelete: document "${documentId}" already soft-deleted`);
      return existing;
    }

    const now = new Date().toISOString();
    return strapi.db.query(uid).update({
      where: { documentId },
      data: { deletedAt: now, updatedAt: now },
    });
  },

  /**
   * 恢复已软删除的记录
   * 使用 strapi.db.query() 直接操作，绕过自动过滤
   */
  async restore(contentType: string, documentId: string) {
    const uid = resolveUid(contentType);
    const model = strapi.contentType(uid as any);
    if (!model) {
      strapi.log.warn(`[zhao-common] restore: contentType "${uid}" not found`);
      return null;
    }

    const existing = await strapi.db.query(uid).findOne({ where: { documentId } });
    if (!existing) {
      strapi.log.warn(`[zhao-common] restore: document "${documentId}" not found in ${uid}`);
      return null;
    }
    if (!existing.deletedAt) {
      strapi.log.warn(`[zhao-common] restore: document "${documentId}" is not soft-deleted`);
      return existing;
    }

    const now = new Date().toISOString();
    return strapi.db.query(uid).update({
      where: { documentId },
      data: { deletedAt: null, updatedAt: now },
    });
  },

  /**
   * 查询已软删除的记录（管理端"回收站"视图）
   * 支持分页和排序
   */
  async findDeleted(
    contentType: string,
    options: { filters?: Record<string, any>; pagination?: any; sort?: any } = {}
  ) {
    const uid = resolveUid(contentType);
    const model = strapi.contentType(uid as any);
    if (!model) {
      strapi.log.warn(`[zhao-common] findDeleted: contentType "${uid}" not found`);
      return [];
    }

    const query: any = {
      where: { ...options.filters, deletedAt: { $ne: null } },
    };
    if (options.sort) query.orderBy = options.sort;
    if (options.pagination) {
      query.limit = options.pagination.pageSize || 25;
      query.offset = ((options.pagination.page || 1) - 1) * query.limit;
    }

    return strapi.db.query(uid).findMany(query);
  },
});
