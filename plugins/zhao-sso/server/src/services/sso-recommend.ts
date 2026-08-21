import type { Core } from "@strapi/strapi";

const COURSE_UID = "plugin::zhao-course.course";
const COURSE_CAT_UID = "plugin::zhao-course.course-category";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const ARTICLE_UID = "plugin::zhao-website.article";
const ARTICLE_CAT_UID = "plugin::zhao-website.article-category";
const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";

/** 基于画像兴趣标签的个性化推荐（C 端"猜你喜欢"）。
 * 兴趣为空时按 报名中的活动/最新文章/热门课程 兜底，保证接口永远可用。 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async recommendFor(ssoUserId: number, limit = 5) {
    const profile = await strapi.plugin("zhao-sso").service("sso-profile").getProfile(ssoUserId);
    const interests = Array.isArray(profile.interests) ? profile.interests : [];
    const upUserId = profile.upUser?.id ?? null;
    const [courses, articles, activities] = await Promise.all([
      this.recCourses(interests, upUserId, limit),
      this.recArticles(interests, limit),
      this.recActivities(interests, upUserId, limit),
    ]);
    return { interests, courses, articles, activities };
  },

  /** 推荐课程：兴趣分类内，排除已购/已报名，按学员数排序；无兴趣 → 最新课程兜底 */
  async recCourses(interests: string[], upUserId: number | null, limit: number) {
    let enrolled = new Set<number>();
    if (upUserId) {
      const ens = await strapi.db.query(ENROLL_UID).findMany({
        where: { user: upUserId },
        populate: { course: { select: ["id"] } },
        limit: 500,
      });
      enrolled = new Set(ens.map((e: any) => e.course?.id).filter(Boolean));
    }
    let rows: any[] = [];
    if (interests.length) {
      const cats = await strapi.db.query(COURSE_CAT_UID).findMany({ where: { name: { $in: interests } }, select: ["id"] });
      const catIds = cats.map((c: any) => c.id);
      if (catIds.length) {
        rows = await strapi.db.query(COURSE_UID).findMany({
          where: { category: catIds },
          populate: { category: { select: ["name"] }, cover: true },
          limit: 100,
        });
      }
    }
    if (!rows.length) {
      rows = await strapi.db.query(COURSE_UID).findMany({
        populate: { category: { select: ["name"] }, cover: true },
        orderBy: { createdAt: "DESC" },
        limit: 100,
      });
    }
    return rows
      .filter((c: any) => !enrolled.has(c.id))
      .sort((a: any, b: any) => (b.studentCount || 0) - (a.studentCount || 0))
      .slice(0, limit)
      .map((c: any) => ({
        documentId: c.documentId,
        id: c.id,
        title: c.title,
        category: c.category?.name ?? null,
        cover: c.cover ?? null,
        price: c.price,
        isFree: c.isFree ?? true,
        isPaid: c.isPaid,
        courseType: c.courseType,
        pointsPrice: c.pointsPrice,
        studentCount: c.studentCount,
      }));
  },

  /** 推荐文章：兴趣分类内已发布文章，按发布时间排序；无兴趣 → 最新兜底 */
  async recArticles(interests: string[], limit: number) {
    let rows: any[] = [];
    if (interests.length) {
      const cats = await strapi.db.query(ARTICLE_CAT_UID).findMany({ where: { name: { $in: interests } }, select: ["id"] });
      const catIds = cats.map((c: any) => c.id);
      if (catIds.length) {
        rows = await strapi.db.query(ARTICLE_UID).findMany({
          where: { category: catIds, status: "published" },
          populate: { category: { select: ["name"] } },
          limit: 100,
        });
      }
    }
    if (!rows.length) {
      rows = await strapi.db.query(ARTICLE_UID).findMany({
        where: { status: "published" },
        populate: { category: { select: ["name"] } },
        orderBy: { publishedAt: "DESC" },
        limit: 100,
      });
    }
    return rows
      .sort((a: any, b: any) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
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

  /** 推荐活动：兴趣类型内报名中的活动，排除已报名，按开始时间排序；无匹配 → 报名中兜底 */
  async recActivities(interests: string[], upUserId: number | null, limit: number) {
    let signed = new Set<number>();
    if (upUserId) {
      const signs = await strapi.db.query(SIGNS_UID).findMany({
        where: { user: upUserId },
        populate: { activity: { select: ["id"] } },
        limit: 500,
      });
      signed = new Set(signs.map((s: any) => s.activity?.id).filter(Boolean));
    }
    let rows: any[] = [];
    if (interests.length) {
      rows = await strapi.db.query(ACTIVITY_UID).findMany({
        where: { status: "signup_open", type: { $in: interests } },
        limit: 100,
      });
    }
    if (!rows.length) {
      rows = await strapi.db.query(ACTIVITY_UID).findMany({ where: { status: "signup_open" }, limit: 100 });
    }
    return rows
      .filter((a: any) => !signed.has(a.id))
      .sort((a: any, b: any) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime())
      .slice(0, limit)
      .map((a: any) => ({
        documentId: a.documentId,
        id: a.id,
        title: a.title,
        type: a.type,
        startTime: a.startTime,
        endTime: a.endTime,
        venueName: a.venueName,
        capacity: a.capacity,
        usedCapacity: a.usedCapacity,
      }));
  },
});
