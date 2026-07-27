import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    authorize(ctx: any): Promise<void>;
    token(ctx: any): Promise<void>;
    /**
     * 前端代理换 token（不暴露 app_secret）
     * 用于 OAuth 回跳中转页调用，前端只传 code + app_code + redirect_uri
     * 后端按 app_code 查 sso_apps 表获取 app_secret，复用 exchangeCode 逻辑
     */
    exchangeToken(ctx: any): Promise<void>;
    wechatRedirect(ctx: any): Promise<void>;
    wechatCallback(ctx: any): Promise<void>;
    passwordAuthorize(ctx: any): Promise<void>;
    wechatMiniProgramLogin(ctx: any): Promise<void>;
    wechatAppLogin(ctx: any): Promise<void>;
    jssdkSignature(ctx: any): Promise<void>;
    wechatConfig(ctx: any): Promise<void>;
    alipayRedirect(ctx: any): Promise<void>;
    alipayCallback(ctx: any): Promise<void>;
};
export default _default;
