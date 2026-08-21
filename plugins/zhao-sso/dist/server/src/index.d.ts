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
                    subscribe: {
                        type: string;
                    };
                    subscribe_at: {
                        type: string;
                    };
                    subscribe_check_at: {
                        type: string;
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
                    invite_code: {
                        type: string;
                    };
                    scopes: {
                        type: string;
                    };
                    is_new: {
                        type: string;
                        default: boolean;
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
                    app_code: {
                        type: string;
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
                    name: {
                        type: string;
                        required: boolean;
                    };
                    provider: {
                        type: string;
                        required: boolean;
                    };
                    app_type: {
                        type: string;
                        required: boolean;
                        enum: string[];
                        default: string;
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
        "msg-template": {
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
                    name: {
                        type: string;
                        required: boolean;
                    };
                    provider: {
                        type: string;
                        default: string;
                        required: boolean;
                    };
                    wxTemplateId: {
                        type: string;
                    };
                    wxTemplateFields: {
                        type: string;
                    };
                    content: {
                        type: string;
                    };
                    isEnabled: {
                        type: string;
                        default: boolean;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    dailyCap: {
                        type: string;
                    };
                    cooldownMinutes: {
                        type: string;
                    };
                };
            };
        };
        "msg-template-version": {
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
                    template: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                    };
                    name: {
                        type: string;
                    };
                    wxTemplateId: {
                        type: string;
                    };
                    wxTemplateFields: {
                        type: string;
                    };
                    content: {
                        type: string;
                    };
                    link: {
                        type: string;
                    };
                    weight: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    sentCount: {
                        type: string;
                        default: number;
                    };
                    successCount: {
                        type: string;
                        default: number;
                    };
                    clickCount: {
                        type: string;
                        default: number;
                    };
                    lastUsedAt: {
                        type: string;
                    };
                };
            };
        };
        "msg-job": {
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
                    scene: {
                        type: string;
                        required: boolean;
                    };
                    template: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    version: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    provider: {
                        type: string;
                        default: string;
                        required: boolean;
                    };
                    toTarget: {
                        type: string;
                    };
                    params: {
                        type: string;
                    };
                    link: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    retryCount: {
                        type: string;
                        default: number;
                    };
                    nextRetryAt: {
                        type: string;
                    };
                    wxMsgId: {
                        type: string;
                    };
                    result: {
                        type: string;
                    };
                    scheduledAt: {
                        type: string;
                    };
                    sentAt: {
                        type: string;
                    };
                    dedupeKey: {
                        type: string;
                        unique: boolean;
                    };
                };
            };
        };
        "sop-rule": {
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
                    name: {
                        type: string;
                        required: boolean;
                    };
                    source: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    event: {
                        type: string;
                    };
                    cronExpression: {
                        type: string;
                    };
                    templateCode: {
                        type: string;
                    };
                    scene: {
                        type: string;
                        required: boolean;
                    };
                    delayMinutes: {
                        type: string;
                        default: number;
                    };
                    link: {
                        type: string;
                    };
                    paramsTemplate: {
                        type: string;
                    };
                    enabled: {
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
        "sso-user-profile": {
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
                    segment: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    segmentScore: {
                        type: string;
                        default: number;
                    };
                    segmentReason: {
                        type: string;
                    };
                    dimensions: {
                        type: string;
                        default: {};
                    };
                    lastCalculatedAt: {
                        type: string;
                    };
                };
            };
        };
        "sso-follow-up": {
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
                    partner: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    customer: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    content: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    nextFollowAt: {
                        type: string;
                    };
                };
            };
        };
        "sso-quota-config": {
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
                    maxDailyPerUser: {
                        type: string;
                        default: number;
                    };
                    cooldownMinutes: {
                        type: string;
                        default: number;
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
            getApp(ctx: any): Promise<void>;
            deleteApp(ctx: any): Promise<void>;
            listChannels(ctx: any): Promise<void>;
            createChannel(ctx: any): Promise<void>;
            updateChannel(ctx: any): Promise<void>;
            listLoginLogs(ctx: any): Promise<void>;
            channelReport(ctx: any): Promise<void>;
        };
        token: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "auth-code": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        binding: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "oauth-config": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        role: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "invite-code": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
            validate(ctx: any): Promise<void>;
        };
        "invite-usage": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        referral: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "sms-code": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        message: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listTemplates(ctx: any): Promise<void>;
            getTemplate(ctx: any): Promise<void>;
            createTemplate(ctx: any): Promise<void>;
            updateTemplate(ctx: any): Promise<void>;
            deleteTemplate(ctx: any): Promise<void>;
            listJobs(ctx: any): Promise<void>;
            getJob(ctx: any): Promise<void>;
            sendNow(ctx: any): Promise<void>;
            sendBatch(ctx: any): Promise<void>;
            retryJob(ctx: any): Promise<void>;
            refreshSubscribe(ctx: any): Promise<void>;
        };
        sop: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        profile: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            detail(ctx: any): Promise<void>;
            recalcAll(ctx: any): Promise<void>;
        };
        partner: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            myCustomers(ctx: any): Promise<void>;
            customerDetail(ctx: any): Promise<void>;
            touch(ctx: any): Promise<void>;
            listFollowUps(ctx: any): Promise<void>;
            createFollowUp(ctx: any): Promise<void>;
            updateFollowUp(ctx: any): Promise<void>;
        };
        "msg-version": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
            activate(ctx: any): Promise<void>;
            abStats(ctx: any): Promise<void>;
        };
        "recommend-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            my(ctx: any): Promise<{
                error: string;
            }>;
        };
    };
    routes: {
        "content-api": {
            type: "content-api";
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
            validateRedirectUri(app: any, redirectUri: string): boolean;
            validateGrantType(app: any, grantType: string): boolean;
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
                inviteCode?: string;
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
            getAuthorizeUrl(state: string, appType: "official_account" | "open_platform" | "mini_program" | "app", scope?: string, callbackUrl?: string): Promise<string>;
            handleCallback(code: string, appType: "official_account" | "open_platform" | "mini_program" | "app"): Promise<{
                userId: any;
                isNew: boolean;
            }>;
            getJssdkSignature(url: string, appType: "official_account" | "open_platform" | "mini_program" | "app"): Promise<{
                appId: any;
                timestamp: string;
                nonceStr: string;
                signature: string;
            }>;
            getWechatLoginConfig(appType: "official_account" | "open_platform" | "mini_program" | "app"): Promise<{
                enabled: boolean;
                appType: "official_account" | "open_platform" | "mini_program" | "app";
                oauthScopes: any;
                appId: any;
            }>;
            querySubscribe(openid: string, provider?: string, appType?: "official_account" | "open_platform" | "mini_program" | "app"): Promise<0 | 1>;
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
            findOne(id: number): Promise<any>;
            delete(id: number): Promise<any>;
        };
        "sso-oauth-config": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findByProvider(provider: string): Promise<{
                id: any;
                documentId: any;
                name: any;
                provider: any;
                appType: any;
                appId: any;
                appSecret: any;
                scope: any;
                extraConfig: any;
                redirectUris: any;
                isEnabled: any;
            }>;
            findByProviderAndAppType(provider: string, appType: string): Promise<{
                id: any;
                documentId: any;
                name: any;
                provider: any;
                appType: any;
                appId: any;
                appSecret: any;
                scope: any;
                extraConfig: any;
                redirectUris: any;
                isEnabled: any;
            }>;
            list(): Promise<any[]>;
            create(data: {
                name: string;
                provider: string;
                app_type?: string;
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
                error?: undefined;
            } | {
                sent: boolean;
                provider: string;
                error: any;
                ttlMinutes: number;
            }>;
            verifyCode(mobile: string, code: string, scene?: string): Promise<boolean>;
            sendViaAliyun(mobile: string, code: string): Promise<any>;
            sendViaTencent(mobile: string, code: string): Promise<any>;
        };
        "sso-invite": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            validateInviteCode: (code: string, appCode: string) => Promise<any | null>;
            getOrCreateVirtualUser: (inviteCodeRecord: any) => Promise<any>;
            buildReferralRelation: (params: {
                inviteeId: number;
                inviteCode: string;
                appCode: string;
                channelCode?: string;
            }) => Promise<{
                success: boolean;
                message: string;
                skip?: boolean;
            }>;
        };
        "sso-msg": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            buildJob(opts: {
                user: number;
                scene: string;
                templateCode: string;
                params?: Record<string, any>;
                link?: string;
                scheduledAt?: string;
                dedupeKey?: string;
            }): Promise<{
                job: any;
                skipped: boolean;
            }>;
            sendNow(opts: {
                user: number;
                scene: string;
                templateCode: string;
                params?: Record<string, any>;
                link?: string;
                dedupeKey?: string;
            }): Promise<any>;
            sendJob(jobId: number): Promise<any>;
            getJob(jobId: number): Promise<any>;
            listPendingJobsForSend(limit?: number, dueOnly?: boolean): Promise<any[]>;
            refreshSubscribe(userId: number, appType?: string): Promise<any>;
        };
        "sso-sop": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            resolveSsoUserForUpUser(upUserId: number): Promise<any>;
            trigger(event: string, opts: {
                user: number;
                payload?: Record<string, any>;
                schedules?: Array<{
                    templateCode: string;
                    scene?: string;
                    scheduledAt?: string;
                    delayMinutes?: number;
                    params?: Record<string, any>;
                    link?: string;
                    dedupeKey?: string;
                }>;
            }): Promise<any[]>;
            runDueJobs(limit?: number): Promise<number>;
        };
        "sso-profile": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            resolveUpUserForSsoUser(ssoUserId: number): Promise<any>;
            calculateProfile(ssoUserId: number): Promise<{
                user: number;
                upUser: any;
                hasData: boolean;
                activity: number;
                reading: number;
                completion: number;
                attendance: number;
                payment: number;
                interests: any[];
            } | {
                activity: number;
                reading: number;
                completion: number;
                attendance: number;
                payment: number;
                interests: string[];
                user: number;
                upUser: any;
                hasData: boolean;
            }>;
            collectInterests(userId: number): Promise<string[]>;
            segmentOf(profile: any): {
                segment: string;
                segmentScore: number;
                segmentReason: string;
            };
            getProfile(ssoUserId: number): Promise<{
                segment: string;
                segmentScore: number;
                segmentReason: string;
                user: number;
                upUser: any;
                hasData: boolean;
                activity: number;
                reading: number;
                completion: number;
                attendance: number;
                payment: number;
                interests: any[];
            } | {
                segment: string;
                segmentScore: number;
                segmentReason: string;
                activity: number;
                reading: number;
                completion: number;
                attendance: number;
                payment: number;
                interests: string[];
                user: number;
                upUser: any;
                hasData: boolean;
            }>;
            recalcAll(limit?: number): Promise<{
                scanned: number;
                calculated: number;
                matchedSso: number;
            }>;
        };
        "sso-recommend": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            recommendFor(ssoUserId: number, limit?: number): Promise<{
                interests: any;
                courses: {
                    documentId: any;
                    id: any;
                    title: any;
                    category: any;
                    cover: any;
                    price: any;
                    isFree: any;
                    isPaid: any;
                    courseType: any;
                    pointsPrice: any;
                    studentCount: any;
                }[];
                articles: {
                    documentId: any;
                    id: any;
                    title: any;
                    excerpt: any;
                    category: any;
                    publishedAt: any;
                }[];
                activities: {
                    documentId: any;
                    id: any;
                    title: any;
                    type: any;
                    startTime: any;
                    endTime: any;
                    venueName: any;
                    capacity: any;
                    usedCapacity: any;
                }[];
            }>;
            recCourses(interests: string[], upUserId: number | null, limit: number): Promise<{
                documentId: any;
                id: any;
                title: any;
                category: any;
                cover: any;
                price: any;
                isFree: any;
                isPaid: any;
                courseType: any;
                pointsPrice: any;
                studentCount: any;
            }[]>;
            recArticles(interests: string[], limit: number): Promise<{
                documentId: any;
                id: any;
                title: any;
                excerpt: any;
                category: any;
                publishedAt: any;
            }[]>;
            recActivities(interests: string[], upUserId: number | null, limit: number): Promise<{
                documentId: any;
                id: any;
                title: any;
                type: any;
                startTime: any;
                endTime: any;
                venueName: any;
                capacity: any;
                usedCapacity: any;
            }[]>;
        };
        "sso-quota": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            evaluate(opts: {
                userId: number;
                scene: string;
                templateId?: number | null;
            }): Promise<{
                allowed: boolean;
                reason?: undefined;
                detail?: undefined;
            } | {
                allowed: boolean;
                reason: string;
                detail: {
                    sentCount: number;
                    dailyCap: any;
                    source: string;
                    gapMin?: undefined;
                    cooldownMinutes?: undefined;
                    lastSentAt?: undefined;
                };
            } | {
                allowed: boolean;
                reason: string;
                detail: {
                    gapMin: number;
                    cooldownMinutes: any;
                    lastSentAt: any;
                    source: string;
                    sentCount?: undefined;
                    dailyCap?: undefined;
                };
            }>;
        };
    };
    policies: {
        "sso-authenticated": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "fallback-authenticated": (policyContext: any, _config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "fallback-has-permission": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    middlewares: {
        "sso-auth": (ctx: any, next: any) => Promise<void>;
    };
};
export default _default;
