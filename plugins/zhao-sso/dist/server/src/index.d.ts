declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {
            jwt: {
                algorithm: string;
                accessTokenExpiresIn: string;
                refreshTokenExpiresIn: string;
            };
            security: {
                loginMaxAttempts: number;
                loginLockDuration: string;
                authCodeExpiresIn: string;
            };
            defaults: {
                appCode: string;
            };
            loginUrl: string;
            channelSync: {
                mode: "local";
                remoteUrl: string;
                appCode: string;
                appSecret: string;
            };
        };
    };
    contentTypes: {
        "sso-user": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    uuid: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    username: {
                        type: string;
                        unique: boolean;
                    };
                    mobile: {
                        type: string;
                        unique: boolean;
                    };
                    email: {
                        type: string;
                        unique: boolean;
                    };
                    password_hash: {
                        type: string;
                    };
                    avatar_url: {
                        type: string;
                    };
                    nickname: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    register_channel: {
                        type: string;
                    };
                    last_login_channel: {
                        type: string;
                    };
                    invite_code_used: {
                        type: string;
                    };
                    invited_by: {
                        type: string;
                    };
                    utm_source: {
                        type: string;
                    };
                    utm_medium: {
                        type: string;
                    };
                    utm_campaign: {
                        type: string;
                    };
                    last_login_at: {
                        type: string;
                    };
                    login_count: {
                        type: string;
                        default: number;
                        required: boolean;
                    };
                    password_changed_at: {
                        type: string;
                    };
                    third_party_bindings: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        "sso-third-party-binding": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    provider: {
                        type: string;
                        required: boolean;
                    };
                    provider_user_id: {
                        type: string;
                        required: boolean;
                    };
                    provider_union_id: {
                        type: string;
                    };
                    provider_nickname: {
                        type: string;
                    };
                    provider_avatar: {
                        type: string;
                    };
                    provider_data: {
                        type: string;
                    };
                    bound_at: {
                        type: string;
                        required: boolean;
                    };
                };
            };
        };
        "sso-app": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    app_code: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    app_name: {
                        type: string;
                        required: boolean;
                    };
                    app_secret: {
                        type: string;
                        required: boolean;
                    };
                    redirect_uris: {
                        type: string;
                        required: boolean;
                    };
                    allowed_grant_types: {
                        type: string;
                        required: boolean;
                    };
                    is_active: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                };
            };
        };
        "sso-channel": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    channel_code: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    channel_name: {
                        type: string;
                        required: boolean;
                    };
                    channel_type: {
                        type: string;
                        required: boolean;
                    };
                    utm_template: {
                        type: string;
                    };
                    is_active: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                };
            };
        };
        "sso-auth-code": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    code: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    app_code: {
                        type: string;
                        required: boolean;
                    };
                    redirect_uri: {
                        type: string;
                        required: boolean;
                    };
                    channel_code: {
                        type: string;
                    };
                    scopes: {
                        type: string;
                    };
                    expires_at: {
                        type: string;
                        required: boolean;
                    };
                    used: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                };
            };
        };
        "sso-token": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    app_code: {
                        type: string;
                        required: boolean;
                    };
                    access_token_jti: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    refresh_token: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    refresh_expires_at: {
                        type: string;
                        required: boolean;
                    };
                    revoked: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    revoked_at: {
                        type: string;
                    };
                    channel_code: {
                        type: string;
                    };
                };
            };
        };
        "sso-user-app-role": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    app_code: {
                        type: string;
                        required: boolean;
                    };
                    role: {
                        type: string;
                        required: boolean;
                    };
                };
            };
        };
        "sso-login-log": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    login_type: {
                        type: string;
                        required: boolean;
                    };
                    provider: {
                        type: string;
                    };
                    channel_code: {
                        type: string;
                    };
                    app_code: {
                        type: string;
                    };
                    ip: {
                        type: string;
                    };
                    user_agent: {
                        type: string;
                    };
                    success: {
                        type: string;
                        required: boolean;
                    };
                    fail_reason: {
                        type: string;
                    };
                };
            };
        };
        "sso-invite-code": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    code: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                    };
                    creator: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    invite_type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    max_uses: {
                        type: string;
                    };
                    use_count: {
                        type: string;
                        default: number;
                        required: boolean;
                    };
                    per_user_limit: {
                        type: string;
                        default: number;
                        required: boolean;
                    };
                    valid_from: {
                        type: string;
                    };
                    valid_until: {
                        type: string;
                    };
                    bonus_tags: {
                        type: string;
                    };
                    is_active: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                };
            };
        };
        "sso-invite-usage": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    invite_code: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    channel_code: {
                        type: string;
                    };
                    app_code: {
                        type: string;
                    };
                    used_at: {
                        type: string;
                        required: boolean;
                    };
                };
            };
        };
        "sso-referral-relation": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    inviter: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    invitee: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    invite_code: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    level: {
                        type: string;
                        required: boolean;
                    };
                    channel_code: {
                        type: string;
                    };
                };
            };
        };
        "sso-invite-stats": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    invite_code: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    total_invites: {
                        type: string;
                        required: boolean;
                    };
                    active_invites: {
                        type: string;
                        required: boolean;
                    };
                    last_invited_at: {
                        type: string;
                    };
                };
            };
        };
        "sso-oauth-config": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    provider: {
                        type: string;
                        required: boolean;
                    };
                    app_id: {
                        type: string;
                        required: boolean;
                    };
                    app_secret: {
                        type: string;
                        required: boolean;
                    };
                    scope: {
                        type: string;
                    };
                    extra_config: {
                        type: string;
                    };
                    redirect_uris: {
                        type: string;
                    };
                    is_enabled: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                };
            };
        };
        "sso-sms-code": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    mobile: {
                        type: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                    };
                    scene: {
                        type: string;
                        default: string;
                        required: boolean;
                    };
                    expires_at: {
                        type: string;
                        required: boolean;
                    };
                    used: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    ip: {
                        type: string;
                    };
                    provider: {
                        type: string;
                        default: string;
                    };
                };
            };
        };
    };
    controllers: {
        "auth-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            login(ctx: any): Promise<void>;
            sendSms(ctx: any): Promise<void>;
            register(ctx: any): Promise<void>;
            verify(ctx: any): Promise<void>;
            refresh(ctx: any): Promise<void>;
            logout(ctx: any): Promise<void>;
        };
        "oauth-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            authorize(ctx: any): Promise<void>;
            token(ctx: any): Promise<void>;
            wechatRedirect(ctx: any): Promise<void>;
            wechatCallback(ctx: any): Promise<void>;
            alipayRedirect(ctx: any): Promise<void>;
            alipayCallback(ctx: any): Promise<void>;
        };
        "user-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            me(ctx: any): Promise<void>;
            bind(ctx: any): Promise<void>;
            unbind(ctx: any): Promise<void>;
            changePassword(ctx: any): Promise<void>;
        };
        "channel-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            track(ctx: any): Promise<void>;
        };
        "admin-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            dashboard(ctx: any): Promise<void>;
            listUsers(ctx: any): Promise<void>;
            getUser(ctx: any): Promise<void>;
            updateUser(ctx: any): Promise<void>;
            listApps(ctx: any): Promise<void>;
            createApp(ctx: any): Promise<void>;
            updateApp(ctx: any): Promise<void>;
            listChannels(ctx: any): Promise<void>;
            createChannel(ctx: any): Promise<void>;
            updateChannel(ctx: any): Promise<void>;
            listLoginLogs(ctx: any): Promise<void>;
            channelReport(ctx: any): Promise<void>;
        };
    };
    routes: {
        "content-api": {
            type: string;
            routes: ({
                method: string;
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies?: undefined;
                };
            } | {
                method: string;
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: string[];
                };
            } | {
                method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: (string | {
                        name: string;
                        config: {
                            action: string;
                        };
                    })[];
                };
            })[];
        };
    };
    services: {
        "sso-jwt": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getSecret: () => string;
            signAccessToken: (payload: Omit<import('./types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
            signRefreshToken: (payload: Omit<import('./types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<string>;
            signTokenPair: (payload: Omit<import('./types').SsoJwtPayload, "type" | "jti" | "iat" | "exp">) => Promise<import('./types').SsoTokenPair>;
            verifyToken: (token: string) => Promise<import('./types').SsoJwtPayload>;
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
            getSync(): import('./services/channel-sync').IChannelSyncService | null;
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
    policies: {
        "sso-authenticated": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    middlewares: {
        "sso-auth": (ctx: any, next: any) => Promise<void>;
    };
};
export default _default;
