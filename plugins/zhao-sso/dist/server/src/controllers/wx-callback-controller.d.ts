import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** GET 接入验证：验签通过返回 echostr，否则 403 */
    verify(ctx: any): Promise<void>;
    /** POST 事件/消息回调：先验签，失败 403（不落库），通过后分发事件 */
    callback(ctx: any): Promise<void>;
    /** 后台：获取服务器配置（用于填入公众号服务器地址/Token） */
    serverConfig(ctx: any): Promise<void>;
};
export default _default;
