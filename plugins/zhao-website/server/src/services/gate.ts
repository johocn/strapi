import type { Core } from "@strapi/strapi";

const VISIT_LOG_UID = "plugin::zhao-website.visit-log";
const ARTICLE_UID = "plugin::zhao-website.article";
const ARTICLE_CAT_UID = "plugin::zhao-website.article-category";

/**
 * 只读门面：供 zhao-sso 跨插件调用，封装 visit-log / article 的查询，
 * 使 zhao-sso 不再直接操作 zhao-website 域的表（遵循表隔离）。
 * 仅只读聚合，不产生副作用。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 消息模板版本点击量（utmSource=msg 按 utmCampaign=code 分组统计） */
  async countMsgClicks(campaigns: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    const codes = [...new Set((campaigns || []).filter(Boolean))];
    for (const code of codes) {
      out[code] = await strapi.db
        .query(VISIT_LOG_UID)
        .count({ where: { utmSource: "msg", utmCampaign: code } })
        .catch(() => 0);
    }
    return out;
  },

  /** 近 since 内该用户的活跃访问数 */
  async countActive(userId: number, since: Date | string): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(VISIT_LOG_UID)
      .count({ where: { userId, createdAt: { $gte: since } } })
      .catch(() => 0);
  },

  /** 文章浏览记录（阅读深度用） */
  async listArticleReads(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<any[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { userId, type: "article_view" };
    if (opts.since) where.createdAt = { $gte: opts.since };
    return strapi.db
      .query(VISIT_LOG_UID)
      .findMany({ where, select: ["id", "dwellTime", "scrollDepth"], limit: opts.limit || 200 })
      .catch(() => []);
  },

  /** 近 since 内浏览过的文章分类名（visit-log targetId → article.category.name，去重） */
  async collectArticleCategories(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<string[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { userId, type: "article_view" };
    if (opts.since) where.createdAt = { $gte: opts.since };
    const reads = await strapi.db
      .query(VISIT_LOG_UID)
      .findMany({ where, select: ["targetId"], limit: opts.limit || 300 })
      .catch(() => []);
    const docIds = [...new Set(reads.map((r: any) => r.targetId).filter(Boolean))].slice(0, 200);
    if (!docIds.length) return [];
    const articles = await strapi.db
      .query(ARTICLE_UID)
      .findMany({
        where: { documentId: { $in: docIds } },
        populate: { category: { select: ["name"] } },
        limit: 200,
      })
      .catch(() => []);
    const seen = new Set<string>();
    const names: string[] = [];
    for (const a of articles) {
      if (a.category?.name && !seen.has(a.category.name)) {
        seen.add(a.category.name);
        names.push(a.category.name);
      }
    }
    return names;
  },

  /** 个性化推荐的文章：兴趣分类内已发布文章，或最新兜底；返回已映射的推荐项 */
  async recommendArticles(interests: string[], limit = 5): Promise<any[]> {
    let rows: any[] = [];
    if (interests?.length) {
      const cats = await strapi.db
        .query(ARTICLE_CAT_UID)
        .findMany({ where: { name: { $in: interests } }, select: ["id"] })
        .catch(() => []);
      const catIds = cats.map((c: any) => c.id);
      if (catIds.length) {
        rows = await strapi.db
          .query(ARTICLE_UID)
          .findMany({
            where: { category: catIds, status: "published" },
            populate: { category: { select: ["name"] } },
            limit: 100,
          })
          .catch(() => []);
      }
    }
    if (!rows.length) {
      rows = await strapi.db
        .query(ARTICLE_UID)
        .findMany({
          where: { status: "published" },
          populate: { category: { select: ["name"] } },
          orderBy: { publishedAt: "DESC" },
          limit: 100,
        })
        .catch(() => []);
    }
    return rows
      .sort(
        (a: any, b: any) =>
          new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
      )
      .slice(0, limit)
      .map((a: any) => ({
        documentId: a.documentId,
        id: a.id,
        title: a.seoTitle || a.title,
        excerpt: a.excerpt,
        category: a.category?.name ?? null,
        publishedAt: a.publishedAt || a.createdAt,
      }));
  },
});