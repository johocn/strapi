declare const _default: {
    "sso-jwt": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getSecret: () => string;
        signAccessToken: (payload: Omit<import('../types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
        signRefreshToken: (payload: Omit<import('../types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
        signTokenPair: (payload: Omit<import('../types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<import('../types').SsoTokenPair>;
        verifyToken: (token: string) => Promise<import('../types').SsoJwtPayload>;
        extractToken: (ctx: any) => string | null;
    };
    "sso-user": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        createUser(data: {
            username?: string;
            mobile?: string;
            email?: string;
            password?: string;
            register_channel?: string;
            utm_source?: string;
            utm_medium?: string;
            utm_campaign?: string;
            invite_code_used?: string;
        }): Promise<any>;
        findByIdentifier(identifier: string): Promise<any>;
        findByUuid(uuid: string): Promise<any>;
        verifyPassword(user: any, password: string): Promise<boolean>;
        updateLoginInfo(userId: number, channelCode?: string): Promise<any>;
        changePassword(userId: number, newPassword: string): Promise<any>;
        isBlocked(user: any): Promise<boolean>;
        findById(id: number): Promise<any>;
        bindContact(userId: number, type: string, identifier: string, password?: string): Promise<any>;
        bindThirdParty(userId: number, providerData: {
            provider: string;
            provider_user_id: string;
            nickname?: string;
            avatar?: string;
            raw?: any;
        }): Promise<any>;
        unbindThirdParty(userId: number, provider: string): Promise<any>;
        count(where?: any): Promise<number>;
        findMany(params: {
            where?: any;
            orderBy?: any;
            limit?: number;
            offset?: number;
        }): Promise<any[]>;
        findOneWithBindings(id: number): Promise<any>;
        updateAdmin(id: number, body: any): Promise<any>;
    };
    "sso-login-log": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        log(params: {
            userId?: number;
            loginType: string;
            provider?: string;
            channelCode?: string;
            appCode?: string;
            ip?: string;
            userAgent?: string;
            success: boolean;
            failReason?: string;
        }): Promise<any>;
        getRecentFailCount(identifier: string, windowMinutes?: number): Promise<number>;
        getUserLogs(userId: number, limit?: number): Promise<any[]>;
        count(where?: any): Promise<number>;
        findManyPaginated(params: {
            where?: any;
            orderBy?: any;
            limit?: number;
            offset?: number;
            populate?: any;
        }): Promise<any[]>;
    };
    "sso-channel": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findByCode(channelCode: string): Promise<any>;
        trackClick(channelCode: string, utmParams?: Record<string, string>): Promise<{
            channel: any;
            utm: Record<string, string>;
        }>;
        listAll(): Promise<any[]>;
        count(where?: any): Promise<number>;
        listAllAdmin(): Promise<any[]>;
        create(data: {
            channel_code: string;
            channel_name: string;
            channel_type: string;
            utm_template?: string;
            is_active?: boolean;
            description?: string;
        }): Promise<any>;
        update(id: number, body: any): Promise<any>;
        channelReport(): Promise<any[]>;
    };
    "sso-oauth": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generateAuthCode(params: {
            userId: number;
            appCode: string;
            redirectUri: string;
            channelCode?: string;
            scopes?: string[];
        }): Promise<string>;
        exchangeCode(params: {
            code: string;
            appCode: string;
            appSecret: string;
            redirectUri: string;
        }): Promise<{
            userId: any;
            channelCode: any;
            scopes: any;
        }>;
        findApp(appCode: string): Promise<any>;
        validateRedirectUri(app: any, redirectUri: string): boolean;
    };
    "sso-auth": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        login: (params: {
            type: string;
            identifier?: string;
            password?: string;
            code?: string;
            appCode: string;
            channelCode?: string;
            ip?: string;
            userAgent?: string;
        }) => Promise<any>;
        register: (params: {
            username?: string;
            mobile?: string;
            email?: string;
            password?: string;
            appCode: string;
            channelCode?: string;
            inviteCode?: string;
            utmSource?: string;
            utmMedium?: string;
            utmCampaign?: string;
            ip?: string;
            userAgent?: string;
        }) => Promise<any>;
        verifyToken: (token: string) => Promise<{
            payload: any;
            user: any;
        }>;
        refreshToken: (refreshToken: string) => Promise<any>;
        logout: (accessToken: string) => Promise<{
            success: boolean;
        }>;
        getUserRoles: (userId: number, appCode: string) => Promise<string[]>;
        saveTokenRecord: (userId: number, appCode: string, tokenPair: any, channelCode?: string) => Promise<void>;
        sanitizeUser: (user: any) => any;
    };
    "sso-wechat": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getAuthorizeUrl(state: string): Promise<string>;
        handleCallback(code: string): Promise<{
            userId: any;
            isNew: boolean;
        }>;
    };
    "sso-alipay": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getAuthorizeUrl(state: string): Promise<string>;
        handleCallback(code: string): Promise<{
            userId: any;
            isNew: boolean;
        }>;
        requestToken(appId: string, privateKey: string, code: string): Promise<any>;
        fetchUserInfo(appId: string, privateKey: string, accessToken: string): Promise<any>;
        buildAlipayParams(appId: string, method: string, bizContent: any): Record<string, string>;
        signParams(params: Record<string, string>, privateKey: string): string;
    };
    "channel-sync": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getSync(): import('./channel-sync').IChannelSyncService | null;
    };
    "sso-app": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        count(where?: any): Promise<number>;
        findMany(params?: {
            orderBy?: any;
        }): Promise<any[]>;
        create(data: {
            app_code: string;
            app_name: string;
            app_secret?: string;
            redirect_uris?: string[];
            allowed_grant_types?: string[];
            is_active?: boolean;
            description?: string;
        }): Promise<any>;
        update(id: number, body: any): Promise<any>;
    };
    "sso-oauth-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findByProvider(provider: string): Promise<{
            id: any;
            documentId: any;
            provider: any;
            appId: any;
            appSecret: any;
            scope: any;
            extraConfig: any;
            redirectUris: any;
            isEnabled: any;
        }>;
        list(): Promise<any[]>;
        create(data: {
            provider: string;
            app_id: string;
            app_secret: string;
            scope?: string;
            extra_config?: any;
            redirect_uris?: string[];
            is_enabled?: boolean;
            description?: string;
        }): Promise<any>;
        update(id: number, data: Record<string, any>): Promise<any>;
        delete(id: number): Promise<any>;
    };
    "sso-sms": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        sendCode(mobile: string, scene?: string, ip?: string): Promise<{
            sent: boolean;
            provider: string;
            ttlMinutes: number;
        }>;
        verifyCode(mobile: string, code: string, scene?: string): Promise<boolean>;
        sendViaAliyun(_mobile: string, _code: string, _scene: string): Promise<never>;
        sendViaTencent(_mobile: string, _code: string, _scene: string): Promise<never>;
    };
};
export default _default;
