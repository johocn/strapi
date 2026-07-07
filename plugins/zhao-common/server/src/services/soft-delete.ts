import type { Core } from "@strapi/strapi";

const resolveUid = (contentType: string) =>
  contentType.includes("::") ? contentType : `plugin::${contentType}`;

// 软删除白名单：仅允许以下内容类型（基于 schema 扫描，均含 deletedAt 字段）
// 新增支持软删除的内容类型时需同步更新此列表
const SOFT_DELETE_WHITELIST = new Set([
  "plugin::zhao-tag.tag",
  "plugin::zhao-tag.knowledge-point",
  "plugin::zhao-quiz.quiz-exam",
  "plugin::zhao-quiz.quiz-batch",
  "plugin::zhao-quiz.quiz",
  "plugin::zhao-course.user-course-auth",
  "plugin::zhao-channel.channel",
  "plugin::zhao-course.course-lesson",
  "plugin::zhao-course.course-category",
  "plugin::zhao-course.course",
  "plugin::zhao-point.point-type",
  "plugin::zhao-point.point-rule",
  "plugin::zhao-point.point-redemption",
  "plugin::zhao-point.point-product",
  "plugin::zhao-point.pickup-location",
  // zhao-website CTs (18)
  "plugin::zhao-website.seo-config",
  "plugin::zhao-website.brand-info",
  "plugin::zhao-website.article",
  "plugin::zhao-website.article-category",
  "plugin::zhao-website.product",
  "plugin::zhao-website.case",
  "plugin::zhao-website.compliance",
  "plugin::zhao-website.faq",
  "plugin::zhao-website.tutorial",
  "plugin::zhao-website.lead",
  "plugin::zhao-website.visit-log",
  "plugin::zhao-website.interaction",
  "plugin::zhao-website.search-log",
  "plugin::zhao-website.knowledge-entity",
  "plugin::zhao-website.knowledge-relation",
  "plugin::zhao-website.ai-content-summary",
  "plugin::zhao-website.first-truth-policy",
  "plugin::zhao-website.download",
  // zhao-oss media-meta
  "plugin::zhao-oss.media-meta",
]);

// 校验 uid 是否在白名单内，不在则抛 400
function assertWhitelisted(uid: string) {
  if (!SOFT_DELETE_WHITELIST.has(uid)) {
    const e: any = new Error(`contentType "${uid}" 不支持软删除`);
    e.status = 400;
    throw e;
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 软删除：将 deletedAt 设为当前时间
   * 使用 strapi.db.query() 直接操作，绕过自动过滤
   */
  async softDelete(contentType: string, documentId: string) {
    const uid = resolveUid(contentType);
    assertWhitelisted(uid);
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
    assertWhitelisted(uid);
    const model = strapi.contentType(uid as any);
    if (!model) {
      strapi.log.warn(`[zhao-common] restore: contentType "${uid}" not found`);
      return null;
    }

    const existing = await strapi.db.query(uid).findOne({ where: { documentId, deletedAt: { $ne: null } } });
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
    assertWhitelisted(uid);
    const model = strapi.contentType(uid as any);
    if (!model) {
      strapi.log.warn(`[zhao-common] findDeleted: contentType "${uid}" not found`);
      return [];
    }

    const query: any = {
      where: { ...(options.filters && typeof options.filters === 'object' && !Array.isArray(options.filters) ? options.filters : {}), deletedAt: { $ne: null } },
    };
    if (options.sort && typeof options.sort === 'string') query.orderBy = options.sort;
    if (options.pagination) {
      const pageSize = options.pagination.pageSize ?? 25;
      query.limit = Math.min(Math.max(1, pageSize), 100);
      const page = Math.max(1, options.pagination.page ?? 1);
      query.offset = (page - 1) * query.limit;
    }

    const results = await strapi.db.query(uid).findMany(query);
    const total = await strapi.db.query(uid).count({ where: query.where });
    return {
      results: results ?? [],
      pagination: {
        total,
        page: Math.max(1, options.pagination.page ?? 1),
        pageSize: query.limit,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  },
});
