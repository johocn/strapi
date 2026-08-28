import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 生成带参二维码 */
    create(ctx: any): Promise<void>;
    /** 二维码列表 */
    list(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    /**
     * C 端公开：按 scene 取或建带参二维码，返回 { wx_url }。
     * 未配置公众号/接口异常时返回 { wx_url: null }，前端据此跳过关注引导步，不阻塞报名。
     */
    getQrcode(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    /** 事件日志查询 */
    events(ctx: any): Promise<void>;
};
export default _default;
