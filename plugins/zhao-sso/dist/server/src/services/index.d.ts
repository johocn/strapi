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
        updateNickname(userId: number, nickname: string): Promise<any>;
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
        getAccessToken(appType?: "official_account" | "open_platform" | "mini_program" | "app"): Promise<string>;
        getAccessTokenByConfig(config: {
            appId: string;
            appSecret: string;
        }): Promise<string>;
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
        sendInApp(opts: {
            user: number;
            scene: string;
            params?: Record<string, any>;
            link?: string;
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
        adminNotifyUsers(): number[];
        enqueueManualSop(entry: {
            code: string;
            title: string;
            scene: string;
            templateCode?: string;
            link?: string;
            audience: Record<string, any>;
            paramsTemplate?: Record<string, any>;
            description?: string;
        }): Promise<{
            todo: any;
            notified: number;
        }>;
        notifyAdmins({ todoId, scene, title }: {
            todoId: number;
            scene: string;
            title: string;
        }): Promise<number>;
        dispatchManualTodo(todoId: number, resolveTargetUsers: (audience: any) => Promise<number[]>): Promise<{
            sent: number;
            skipped: number;
            reason: string;
        } | {
            sent: number;
            skipped: number;
            reason?: undefined;
        }>;
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
    "sso-stats": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getSopStats(opts: {
            from?: string;
            to?: string;
            scene?: string;
        }): Promise<{
            from: string;
            to: string;
            summary: {
                sceneCount: number;
                total: number;
                sent: number;
                failed: number;
                quotaLimited: number;
                pending: number;
                sentRate: number;
            };
            rows: any[];
        }>;
        getRepurchaseStats(opts: {
            from?: string;
            to?: string;
        }): Promise<{
            from: string;
            to: string;
            windowDays: number;
            summary: {
                sent: number;
                convertedUsers: number;
                conversions: number;
                conversionRate: number;
            };
        }>;
        getCourseD7Stats(opts: {
            from?: string;
            to?: string;
        }): Promise<{
            from: string;
            to: string;
            windowDays: number;
            summary: {
                sent: number;
                convertedUsers: number;
                conversions: number;
                conversionRate: number;
            };
        }>;
        getCourseCompletionStats(opts: {
            from?: string;
            to?: string;
        }): Promise<{
            from: string;
            to: string;
            windowDays: number;
            summary: {
                sent: number;
                convertedUsers: number;
                conversions: number;
                conversionRate: number;
            };
        }>;
        getRepurchaseLeads(opts: {
            from?: string;
            to?: string;
            page?: number;
            pageSize?: number;
            status?: string;
        }): Promise<{
            from: string;
            to: string;
            windowDays: number;
            summary: {
                total: number;
                followed: number;
                deal: number;
            };
            pagination: {};
            rows: any[];
        }>;
        updateRepurchaseFollow({ jobId, status, remark }: {
            jobId: number;
            status: string;
            remark?: string;
        }): Promise<any>;
    };
    "sso-wx-callback": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getServerConfig(): Promise<{
            url: string;
            token: any;
            welcomeReply: any;
            encMode: string;
        }>;
        verifySignature: (params: {
            timestamp?: string | number;
            nonce?: string | number;
            signature?: string;
        }) => Promise<boolean>;
        handleXml(xml: string): Promise<string>;
    };
    "sso-wx-qrcode": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        create(data: {
            scene_key: string;
            title?: string;
            kind?: "temporary" | "permanent";
            expire_seconds?: number;
            qrcode_url?: string;
            remark?: string;
        }): Promise<any>;
        list(filters?: {
            page?: number;
            pageSize?: number;
            scene_key?: string;
        }): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
        findOne(id: number): Promise<any>;
        findBySceneKey(scene_key: string): Promise<any>;
        remove(id: number): Promise<any>;
        events(filters?: {
            page?: number;
            pageSize?: number;
            openid?: string;
        }): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
    };
    "sso-wx-menu": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(filters?: {
            page?: number;
            pageSize?: number;
            name?: string;
        }): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
        findOne(id: number): Promise<any>;
        create(data: {
            name: string;
            menu_json: any;
            enabled?: boolean;
        }): Promise<any>;
        update(id: number, data: {
            name?: string;
            menu_json?: any;
            enabled?: boolean;
        }): Promise<any>;
        remove(id: number): Promise<any>;
        publish(id: number): Promise<any>;
        deleteRemote(): Promise<any>;
        getRemote(): Promise<any>;
        listTemplates(): Promise<any>;
        addFromLibrary(data: {
            templateIdShort: string;
            keywordNameList?: string[];
        }): Promise<{
            template_id: any;
            errcode: number;
        }>;
    };
    "sso-wx-reply": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list: (filters?: {
            page?: number;
            pageSize?: number;
            trigger?: string;
            match?: string;
        }) => Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
        findOne: (id: number) => Promise<any>;
        create: (data: {
            trigger?: string;
            match?: string;
            reply_type?: string;
            text?: string;
            title?: string;
            desc?: string;
            pic_url?: string;
            link_url?: string;
            sort?: number;
            enabled?: boolean;
        }) => Promise<any>;
        update: (id: number, data: Record<string, any>) => Promise<any>;
        remove: (id: number) => Promise<any>;
        matchText(content: string): Promise<any>;
        findWelcome(): Promise<any>;
    };
    "sso-wx-material": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(filters?: {
            page?: number;
            pageSize?: number;
            type?: string;
            name?: string;
        }): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
        findOne(id: number): Promise<any>;
        create(data: {
            type?: string;
            name?: string;
            remark?: string;
            file?: import('./sso-wx-material').UploadFile;
        }): Promise<any>;
        remove(id: number): Promise<any>;
    };
    "sso-wx-article": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(filters?: {
            page?: number;
            pageSize?: number;
            title?: string;
            publish_state?: string;
        }): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                };
            };
        }>;
        findOne(id: number): Promise<any>;
        create(data: {
            title: string;
            author?: string;
            digest?: string;
            content?: string;
            thumb_media_id?: string;
            pic_url?: string;
            content_source_url?: string;
            show_cover_pic?: boolean;
        }): Promise<any>;
        update(id: number, data: Record<string, any>): Promise<any>;
        publish(id: number): Promise<any>;
        status(id: number): Promise<any>;
        remove(id: number): Promise<any>;
    };
};
export default _default;
