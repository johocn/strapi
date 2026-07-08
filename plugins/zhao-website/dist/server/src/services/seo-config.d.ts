import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取或创建租户的 SEO 配置（单例）
     */
    ensureDefault(siteId: number): Promise<any>;
    find(siteId: number): Promise<any>;
    update(siteId: number, data: any): Promise<any>;
    /**
     * 公开路由返回（去除验证码字段）
     */
    findPublic(siteId: number): Promise<any>;
};
export default _default;
