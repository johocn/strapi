import { Core } from '@strapi/strapi';
/**
 * 统一内容过滤：把一级 filters 配置（global.filters）落到查询条件上。
 * 配置来源：站点合并配置（模板预设 + 租户覆盖），缺省用 DEFAULT_FILTERS 兜底。
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 读取一级过滤配置（含模板合并链）
     * 注：ctx.state.siteId 为 site-config 的 numeric id，而 zhao-common.getConfig 按 documentId 查询，
     * 因此先按 numeric id 解析记录（带 template 关联）再走 getMergedConfig 合并；拿不到时回退 getConfig。
     */
    getFilters(siteId: number): Promise<Record<string, any>>;
    /**
     * 构建查询条件
     * @param siteId 站点 ID
     * @param uid 内容模型 uid，如 plugin::zhao-website.article
     * @param extra 附加条件（调用方自定义，优先级最高）
     * @param locale 语言（可空，空则不加 locale 过滤）
     */
    buildWhere(siteId: number, uid: string, extra?: Record<string, any>, locale?: string): Promise<Record<string, any>>;
    /**
     * 统一查询入口：buildWhere + findMany
     */
    findMany(uid: string, siteId: number, params?: any): Promise<any[]>;
    /**
     * 统一计数入口
     */
    count(uid: string, siteId: number, params?: any): Promise<number>;
};
export default _default;
