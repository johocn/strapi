import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    authorize(ctx: any): Promise<void>;
    /**
     * 标准 OAuth2 token 端点（RFC 6749）
     * 服务端到服务端调用，必须传 app_secret。
     * 支持 grant_type=authorization_code（换码）和 grant_type=refresh_token（刷新）。
     *
     * 与 exchange-token 的区别：本端点要求调用方持有 app_secret，适合后端直连；
     * exchange-token 是前端代理，不暴露 app_secret，仅支持 authorization_code。
     */
    token(ctx: any): Promise<void>;
    /**
     * 前端代理换 token（不暴露 app_secret）
     * 用于 OAuth 回跳中转页调用，前端只传 code + app_code + redirect_uri
     * 后端按 app_code 查 sso_apps 表获取 app_secret，复用 exchangeCode 逻辑
     *
     * 与 token 端点的区别：本端点不要求调用方传 app_secret（由后端自查），
     * 仅支持 authorization_code 流程，适合浏览器/小程序等前端环境；
     * token 端点是标准 OAuth2 端点，要求 app_secret，适合后端直连。
     * 命名保留现状：rename 会破坏所有前端调用方且无功能收益。
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
