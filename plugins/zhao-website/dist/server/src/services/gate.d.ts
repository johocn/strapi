import { Core } from '@strapi/strapi';
/**
 * 只读门面：供 zhao-sso 跨插件调用，封装 visit-log / article 的查询，
 * 使 zhao-sso 不再直接操作 zhao-website 域的表（遵循表隔离）。
 * 仅只读聚合，不产生副作用。
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 消息模板版本点击量（utmSource=msg 按 utmCampaign=code 分组统计） */
    countMsgClicks(campaigns: string[]): Promise<Record<string, number>>;
    /** 近 since 内该用户的活跃访问数 */
    countActive(userId: number, since: Date | string): Promise<number>;
    /** 文章浏览记录（阅读深度用） */
    listArticleReads(userId: number, opts?: {
        since?: Date | string;
        limit?: number;
    }): Promise<any[]>;
    /** 近 since 内浏览过的文章分类名（visit-log targetId → article.category.name，去重） */
    collectArticleCategories(userId: number, opts?: {
        since?: Date | string;
        limit?: number;
    }): Promise<string[]>;
    /** 个性化推荐的文章：兴趣分类内已发布文章，或最新兜底；返回已映射的推荐项 */
    recommendArticles(interests: string[], limit?: number): Promise<any[]>;
};
export default _default;
