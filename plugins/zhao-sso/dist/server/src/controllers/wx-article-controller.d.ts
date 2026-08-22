import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 创建图文草稿 */
    create(ctx: any): Promise<void>;
    list(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    /** 更新 + 重提草稿 */
    update(ctx: any): Promise<void>;
    /** 发布草稿 */
    publish(ctx: any): Promise<void>;
    /** 发布状态刷新 */
    status(ctx: any): Promise<void>;
    /** 删除草稿 */
    delete(ctx: any): Promise<void>;
};
export default _default;
