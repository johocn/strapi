import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    authorize(ctx: any): Promise<void>;
    token(ctx: any): Promise<void>;
    wechatRedirect(ctx: any): Promise<void>;
    wechatCallback(ctx: any): Promise<void>;
    alipayRedirect(ctx: any): Promise<void>;
    alipayCallback(ctx: any): Promise<void>;
};
export default _default;
