import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generateAuthCode(params: {
        userId: number;
        appCode: string;
        redirectUri: string;
        channelCode?: string;
        inviteCode?: string;
        scopes?: string[];
        isNew?: boolean;
    }): Promise<string>;
    exchangeCode(params: {
        code: string;
        appCode: string;
        appSecret: string;
        redirectUri: string;
    }): Promise<{
        userId: any;
        channelCode: any;
        inviteCode: any;
        scopes: any;
        isNew: boolean;
    }>;
    /**
     * 内部方法：校验并核销授权码，不校验 app_secret
     * 用于服务端内部调用（如 exchange-token 代理接口，app_secret 由后端自查）
     */
    exchangeCodeInternal(params: {
        code: string;
        appCode: string;
        app: any;
        redirectUri: string;
    }): Promise<{
        userId: any;
        channelCode: any;
        inviteCode: any;
        scopes: any;
        isNew: boolean;
    }>;
    findApp(appCode: string): Promise<any>;
    /**
     * 校验 redirect_uri 是否在白名单中
     * 剥离 query 参数后比对（origin + path + hash），
     * 与 zhao-third 行为对齐：不因 query 参数阻断合法回调地址。
     * 白名单条目示例：https://h.joho.cn/#/pages/sso/login-callback
     * 实际 redirectUri 可能携带 ?return_url=...&app_code=... 等参数，只比对基础部分。
     */
    validateRedirectUri(app: any, redirectUri: string): boolean;
    /**
     * 校验 app 是否允许使用指定 grant_type
     * allowed_grant_types 为 sso_apps 表的 JSON 字段，如 ["authorization_code", "refresh_token"]
     * 未配置或非数组时视为允许所有（向后兼容旧数据）
     */
    validateGrantType(app: any, grantType: string): boolean;
};
export default _default;
