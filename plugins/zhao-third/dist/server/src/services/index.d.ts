declare const _default: {
    "third-party-auth": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getAuthUrl(platform: string, appType: string, redirectUrl: string, siteId?: string): Promise<{
            authUrl: any;
            state: string | null;
            appId: any;
        }>;
        getQrconnectUrl(redirectUrl: string, siteId?: string): Promise<{
            qrconnectUrl: string;
            redirectAuthUrl: string;
            state: string;
            appId: any;
        }>;
        handleCallback(params: {
            platform: string;
            appType: string;
            code: string;
            encryptedData?: string;
            iv?: string;
            inviteCode?: string;
            siteId?: string;
        }): Promise<{
            jwt: any;
            user: {
                id: any;
                username: any;
                email: any;
            };
            isNew: boolean;
        }>;
        exchangeToken(platform: string, appType: string, code: string, config: any, encryptedData?: string, iv?: string): Promise<Record<string, any> | {
            accessToken: any;
            openId: any;
            unionId: any;
            sessionKey: null;
            nickname: null;
            avatar: null;
        }>;
        exchangeWechatToken(appType: string, code: string, config: any, encryptedData?: string, iv?: string): Promise<Record<string, any>>;
        exchangeAlipayToken(code: string, config: any): Promise<{
            accessToken: any;
            openId: any;
            unionId: any;
            sessionKey: null;
            nickname: null;
            avatar: null;
        }>;
        exchangeDouyinToken(code: string, config: any): Promise<{
            accessToken: any;
            openId: any;
            unionId: null;
            sessionKey: null;
            nickname: null;
            avatar: null;
        }>;
        createUserFromThirdParty(platform: string, tokenResult: any, inviteCode?: string): Promise<any>;
        getPublicConfig(platform: string, appType: string, siteId?: string): Promise<{
            platform: any;
            appType: any;
            appId: any;
            enabled: any;
            authMode: string | null;
        } | null>;
        getJssdkSignature(url: string, siteId?: string): Promise<{
            appId: any;
            timestamp: string;
            nonceStr: string;
            signature: string;
        }>;
        updateProfile(userId: number | string, data: {
            nickname?: string;
            avatar?: string;
        }): Promise<{
            success: boolean;
        }>;
        wechatRedirectCallback(ctx: any): Promise<void>;
        buildFrontendRedirectUrl(ctx: any, result: any, state?: string): string;
        handleAuthError(ctx: any, message: string): void;
    };
    "third-party-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findConfig(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        findConfigs(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        createConfig(data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        updateConfig(documentId: string, data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        deleteConfig(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
        findByPlatformAndAppType(platform: string, appType: string, siteId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | {
            id: any;
            documentId: any;
            name: any;
            platform: any;
            appType: any;
            appId: any;
            appSecret: any;
            enabled: any;
        } | null>;
    };
    "third-party-account": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findByOpenId(platform: string, appType: string, openId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        findByUnionId(platform: string, unionId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        findByUser(userId: number | string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        createAccount(data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        updateAccount(documentId: string, data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        findAccounts(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map