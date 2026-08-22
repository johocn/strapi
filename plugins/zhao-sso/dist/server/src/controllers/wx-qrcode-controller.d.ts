import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 生成带参二维码 */
    create(ctx: any): Promise<void>;
    /** 二维码列表 */
    list(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    /** 事件日志查询 */
    events(ctx: any): Promise<void>;
};
export default _default;
