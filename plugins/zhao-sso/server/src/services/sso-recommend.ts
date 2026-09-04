import type { Core } from "@strapi/strapi";

/** 只读门面（隔离：不直查他域表，经对应插件 service 调用） */
function courseGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-course")?.service?.("gate")) || null;
}

function websiteGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-website")?.service?.("gate")) || null;
}

function pointGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-point")?.service?.("gate")) || null;
}

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
    const g = courseGate(strapi);
    const enrolled = g?.listEnrolledCourseIds ? await g.listEnrolledCourseIds(upUserId || 0) : [];
    const rows = g?.recommendCourses ? await g.recommendCourses(interests, enrolled, limit) : [];
    return rows;
  },

  /** 推荐文章：兴趣分类内已发布文章，按发布时间排序；无兴趣 → 最新兜底 */
  async recArticles(interests: string[], limit: number) {
    const g = websiteGate(strapi);
    const rows = g?.recommendArticles ? await g.recommendArticles(interests, limit) : [];
    return rows;
  },

  /** 推荐活动：兴趣类型内报名中的活动，排除已报名，按开始时间排序；无匹配 → 报名中兜底 */
  async recActivities(interests: string[], upUserId: number | null, limit: number) {
    const g = pointGate(strapi);
    const signed = g?.listSignedActivityIds ? await g.listSignedActivityIds(upUserId || 0) : [];
    const rows = g?.recommendActivities ? await g.recommendActivities(interests, signed, limit) : [];
    return rows;
  },
});
