import { Core } from '@strapi/strapi';
/** 基于画像兴趣标签的个性化推荐（C 端"猜你喜欢"）。
 * 兴趣为空时按 报名中的活动/最新文章/热门课程 兜底，保证接口永远可用。 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    recommendFor(ssoUserId: number, limit?: number): Promise<{
        interests: any;
        courses: any;
        articles: any;
        activities: any;
    }>;
    /** 推荐课程：兴趣分类内，排除已购/已报名，按学员数排序；无兴趣 → 最新课程兜底 */
    recCourses(interests: string[], upUserId: number | null, limit: number): Promise<any>;
    /** 推荐文章：兴趣分类内已发布文章，按发布时间排序；无兴趣 → 最新兜底 */
    recArticles(interests: string[], limit: number): Promise<any>;
    /** 推荐活动：兴趣类型内报名中的活动，排除已报名，按开始时间排序；无匹配 → 报名中兜底 */
    recActivities(interests: string[], upUserId: number | null, limit: number): Promise<any>;
};
export default _default;
