declare const _default: {
    point: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        earnPoints: (params: import('./point').EarnPointsParams) => Promise<any>;
        earnCustomPoints: (params: {
            userId: string | number;
            action: string;
            points: number;
            source?: string;
            remark?: string;
            channelId?: string | number;
            userChannelId?: string | number;
        }) => Promise<any>;
        deductPoints: (params: import('./point').DeductPointsParams) => Promise<any>;
        refundPoints: (params: {
            userId: string | number;
            action: string;
            points: number;
            source?: string;
            method?: string;
            remark?: string;
            orderId?: string;
            channelId?: string | number;
            userChannelId?: string | number;
        }) => Promise<any>;
        getBalance: (userId: string | number) => Promise<{
            balance: number;
            channelBalances: {
                channelId: number;
                channelName: string;
                balance: number;
            }[];
            globalBalance: number;
        }>;
        getRecords: (userId: string | number, params?: {
            page?: number;
            pageSize?: number;
            action?: string;
            type?: string;
            startDate?: string;
            endDate?: string;
            channelId?: string | number;
        }) => Promise<{
            records: any[];
            total: number;
            balance: number;
            page: number;
            pageSize: number;
        }>;
        getStatistics: (userId: string | number) => Promise<{
            todayEarned: number;
            todaySpent: number;
            monthEarned: number;
            monthSpent: number;
            totalEarned: number;
            totalSpent: number;
            balance: number;
            expiringSoon: number;
        }>;
        adminAdjust: (params: import('./point').AdminAdjustParams) => Promise<any>;
        batchAdjust: (items: import('./point').BatchAdjustItem[], operatorId: string | number) => Promise<{
            success: any[];
            failed: any[];
            totalSuccess: number;
            totalFailed: number;
        }>;
        getExpiringPoints: (userId: string | number, withinDays: number) => Promise<{
            points: any;
            records: any[];
        }>;
        applyExpiryDeduction: (userId: string | number) => Promise<{
            deducted: number;
            records: any[];
        }>;
        getRules: (params?: {
            action?: string;
            category?: string;
            enabled?: boolean;
        }) => Promise<any[]>;
        findOneRule: (action: string) => Promise<any>;
        upsertRule: (data: {
            action: string;
            category: string;
            points: number;
            description?: string;
            limitPerDay?: number;
            limitPerUser?: number;
            limitPerDayPerUser?: number;
            isOneTime?: boolean;
            enabled?: boolean;
            priority?: number;
            taskGroup?: string;
            extraConfig?: any;
            name?: string;
            icon?: string;
            linkType?: string;
            linkTargetId?: string;
            linkTitle?: string;
            linkThumb?: string;
        }) => Promise<{
            action: string;
            category: string;
            points: number;
            description?: string;
            limitPerDay?: number;
            limitPerUser?: number;
            limitPerDayPerUser?: number;
            isOneTime?: boolean;
            enabled?: boolean;
            priority?: number;
            taskGroup?: string;
            extraConfig?: any;
            name?: string;
            icon?: string;
            linkType?: string;
            linkTargetId?: string;
            linkTitle?: string;
            linkThumb?: string;
        }>;
        deleteRule: (action: string) => Promise<{
            success: boolean;
        }>;
        getDefaultConfig: () => {
            increaseRules: {
                daily_sign_in: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                daily_sign_in_streak: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {
                        streakMilestones: number[];
                        streakBonusPoints: number[];
                    };
                };
                daily_first_login: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                online_duration: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                browse_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                like_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                comment_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                share_article: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                watch_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                like_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                comment_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                share_video: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                click_ad: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                watch_ad: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_lesson: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                review_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_quiz: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                quiz_perfect: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                quiz_pass: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                invite_register: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                invite_purchase: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                follow_official_account: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                join_community: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_share: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {
                        intervalMinutes: number;
                    };
                };
                new_user_reward: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                complete_profile: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                bind_phone: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                bind_wechat: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                birthday_reward: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                submit_feedback: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                report_violation: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                purchase_course: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                browse_page: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                task_complete: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                qr_scan_verify: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_auth: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_contact: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_signup_survey: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_attend: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                activity_share_reward: {
                    points: number;
                    limitPerDay: number;
                    isOneTime: boolean;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
            };
            decreaseRules: {
                redeem_gift: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                redeem_coupon: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                exchange_course: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                exchange_membership: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                lottery_cost: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                unlock_content: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                cancel_order_penalty: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                violation_penalty: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                refund_deduct: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
                expiration_deduct: {
                    points: number;
                    description: string;
                    taskGroup: string;
                    extraConfig: {};
                };
            };
            defaultOperator: string;
        };
        listRecords: (params: {
            userId?: string;
            action?: string;
            type?: string;
            startDate?: string;
            endDate?: string;
            page: number;
            pageSize: number;
            extraWhere?: Record<string, any>;
        }) => Promise<{
            records: any[];
            total: number;
            page: number;
            pageSize: number;
        }>;
        findRecordByDocumentId: (documentId: string) => Promise<any>;
        findVerificationByDocumentId: (documentId: string) => Promise<any>;
        getMergedRule: (action: string) => Promise<any | null>;
        getTasks: (userId: number) => Promise<Record<string, any[]>>;
        getShareStatus: (params: {
            userId: number | string;
            activityId?: string | number | null;
        }) => Promise<{
            action: string;
            canClaim: boolean;
            points: number;
            remainingMs: number;
            dailyCount: number;
            dailyLimit: number;
            intervalMinutes: number;
        }>;
    };
    redemption: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        createProduct: (data: any) => Promise<any>;
        updateProduct: (id: string | number, data: any) => Promise<any>;
        deleteProduct: (id: string | number) => Promise<any>;
        getProducts: (filters?: {
            status?: string;
            deliveryType?: string;
            name?: string;
            page?: number;
            pageSize?: number;
            userId?: string | number;
            siteId?: string;
            extraWhere?: Record<string, any>;
        }) => Promise<{
            records: any[];
            total: number;
            page: number;
            pageSize: number;
        }>;
        getProduct: (id: string | number, userId?: string | number) => Promise<any>;
        adjustStock: (id: string | number, delta: number) => Promise<any>;
        createRedemption: (params: {
            userId: string | number;
            productId?: string | number;
            itemName?: string;
            pointsCost?: number;
            quantity?: number;
            deliveryType?: string;
            pickupLocationId?: string | number;
            receiverName?: string;
            receiverPhone?: string;
            receiverAddress?: string;
            remark?: string;
            channelId?: string | number;
            useGlobalPoints?: boolean;
            selectedChannels?: (string | number)[];
        }) => Promise<any>;
        reviewRedemption: (redemptionId: string | number, status: string, operatorId: string | number, extra?: {
            expressCompany?: string;
            trackingNumber?: string;
        }) => Promise<any>;
        getRedemptions: (filters?: {
            status?: string;
            userId?: string | number;
            deliveryType?: string;
            page?: number;
            pageSize?: number;
            startDate?: string;
            endDate?: string;
            extraWhere?: Record<string, any>;
        }) => Promise<{
            records: any[];
            total: number;
            page: number;
            pageSize: number;
        }>;
        getRedemption: (id: string | number) => Promise<any>;
        getUserRedemptions: (userId: string | number, filters?: {
            status?: string;
            page?: number;
            pageSize?: number;
        }) => Promise<{
            records: any[];
            total: number;
            page: number;
            pageSize: number;
        }>;
        verifyRedemption: (pickupCode: string, operatorId: string | number) => Promise<any>;
    };
    "rule-engine": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        validateAction: (params: {
            userId: string | number;
            action: string;
            source?: string;
            channelId?: string | number;
        }) => Promise<{
            valid: boolean;
            rule: any;
            reason: string;
            todayCount?: undefined;
        } | {
            valid: boolean;
            rule: any;
            reason: string;
            todayCount: number;
        } | {
            valid: boolean;
            rule: any;
            reason?: undefined;
            todayCount?: undefined;
        }>;
        getEligibleActions: (userId: string | number, channelId?: string | number) => Promise<any[]>;
        getTemplates: (filters?: {
            category?: string;
            enabled?: boolean;
        }) => Promise<any[]>;
        createTemplate: (data: any) => Promise<any>;
        updateTemplate: (id: string | number, data: any) => Promise<any>;
        deleteTemplate: (id: string | number) => Promise<any>;
        applyTemplate: (templateId: string | number, targetAction: string) => Promise<any>;
        batchEnableActions: (actions: string[], enabled: boolean) => Promise<{
            updated: number;
        }>;
    };
    verification: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generateQRCode: (params: {
            verifierId: string | number;
            channelId: string | number;
            direction: "superior_to_subordinate" | "subordinate_to_superior";
        }) => Promise<{
            token: string;
            qrCodeData: string;
            expiresAt: string;
            verificationId: any;
        }>;
        verifyByQRCode: (params: {
            token: string;
            verifiedUserId: string | number;
            verifierId?: string | number;
            location?: {
                lat: number;
                lng: number;
            };
        }) => Promise<any>;
        manualVerify: (params: {
            verifierId: string | number;
            verifiedUserId: string | number;
            channelId: string | number;
            direction: "superior_to_subordinate" | "subordinate_to_superior";
            remark?: string;
        }) => Promise<any>;
        verifyChannelHierarchy: (params: {
            verifierId: string | number;
            verifiedUserId: string | number;
            channelId: string | number;
        }) => Promise<any>;
        getVerificationLog: (filters?: {
            verifierId?: string | number;
            verifiedUserId?: string | number;
            channelId?: string | number;
            direction?: string;
            status?: string;
            method?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            pageSize?: number;
            extraWhere?: Record<string, any>;
        }) => Promise<{
            records: any[];
            total: number;
            page: number;
            pageSize: number;
        }>;
        getVerificationStats: (channelId?: string | number) => Promise<{
            totalVerifications: number;
            approved: number;
            rejected: number;
            pending: number;
            byDirection: {
                superiorToSubordinate: number;
                subordinateToSuperior: number;
            };
        }>;
    };
    "config-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getConfig: () => Promise<any>;
        updateConfig: (data: any) => Promise<any>;
        isModuleEnabled: (moduleName?: "earn" | "redeem" | "expiry") => Promise<boolean>;
        getDashboardStats: () => Promise<{
            totalUsers: number;
            activeUsersToday: number;
            activeUsers: number;
            totalPointsIssued: number;
            totalIssued: number;
            totalPointsSpent: number;
            totalRedeemed: number;
            totalBalance: number;
            pendingRedemptions: number;
            pendingPickups: number;
            pickupLocationCount: number;
            expiringSoonPoints: number;
            topEarnActions: {
                count: number;
                totalPoints: number;
                action: string;
            }[];
        }>;
        findTypes: (filters?: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        findOneType: (documentId: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        createType: (data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        updateType: (documentId: string, data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        deleteType: (documentId: string) => Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
    };
    "sign-in": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        signIn: (userId: number) => Promise<{
            signInDate: string;
            streakDays: any;
            pointsEarned: number;
            isStreakReward: boolean;
        }>;
        getSignInStatus: (userId: number) => Promise<{
            isSignedInToday: boolean;
            streakDays: number;
            recentDates: any[];
        }>;
    };
    activity: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        signup({ userId, activityId, formData, preQuestionnaireData, chosenRewards }: {
            userId: number;
            activityId: string;
            formData?: any;
            preQuestionnaireData?: any;
            chosenRewards?: string[];
        }): Promise<{
            ok: boolean;
            reason: string;
            waitlisted?: undefined;
            position?: undefined;
            signupId?: undefined;
        } | {
            ok: boolean;
            waitlisted: boolean;
            position: number;
            signupId: any;
            reason?: undefined;
        } | {
            unlockInfo?: {
                pointsPreview: {
                    base: number;
                    auth: number;
                    contact: number;
                    survey: number;
                    subscribe: number;
                    total: number;
                };
                loginAuth: boolean;
                subscribed: boolean;
                channelDone: boolean;
                conditions: Record<string, boolean>;
                chosenRewards: any[];
            };
            ok: boolean;
            granted: {
                id: string;
                type: string;
                name: string;
                message: string;
                link?: string;
            }[];
            signupId: any;
            pointsPreview: {
                base: number;
                auth: number;
                contact: number;
                survey: number;
                subscribe: number;
                total: number;
            };
            reason?: undefined;
            waitlisted?: undefined;
            position?: undefined;
        }>;
        fillQuestionnaire({ userId, signupId, answers, type }: {
            userId: number;
            signupId: number;
            answers?: any;
            type?: "pre" | "post";
        }): Promise<{
            ok: boolean;
            type: string;
            postDone: boolean;
            unlockInfo?: undefined;
            newlyUnlocked?: undefined;
        } | {
            ok: boolean;
            unlockInfo: any;
            newlyUnlocked: any[];
            type?: undefined;
            postDone?: undefined;
        }>;
        fillContact({ userId, signupId, formData }: {
            userId: number;
            signupId: number;
            formData?: any;
        }): Promise<{
            ok: boolean;
            unlockInfo: any;
            newlyUnlocked: any[];
            newlyContact: boolean;
        }>;
        getFollowQrcode({ userId, activityId }: {
            userId: number;
            activityId: string;
        }): Promise<{
            ok: boolean;
            wx_url: any;
        }>;
        claimSubscribe({ userId, signupId }: {
            userId: number;
            signupId: number;
        }): Promise<{
            ok: boolean;
            subscribed: boolean;
            newlyUnlocked: any[];
            unlockInfo?: undefined;
        } | {
            ok: boolean;
            subscribed: boolean;
            unlockInfo: any;
            newlyUnlocked: any[];
        }>;
        signupUnlockStatus({ userId, signupId }: {
            userId: number;
            signupId: number;
        }): Promise<{
            ok: boolean;
            hasReward: boolean;
            loginAuth: boolean;
            subscribed: boolean;
            contactDone: boolean;
            surveyDone: boolean;
            formData: any;
            questionnaireData: any;
            preQuestionnaireData: any;
            postSurveyAllowed: boolean;
            pointsPreview: {
                base: number;
                auth: number;
                contact: number;
                survey: number;
                subscribe: number;
                total: number;
            };
            channel?: undefined;
            channelDone?: undefined;
            rewards?: undefined;
        } | {
            ok: boolean;
            hasReward: boolean;
            loginAuth: boolean;
            subscribed: boolean;
            channel: {
                type: string;
                label?: string;
            };
            channelDone: boolean;
            contactDone: boolean;
            surveyDone: boolean;
            formData: any;
            questionnaireData: any;
            preQuestionnaireData: any;
            postSurveyAllowed: boolean;
            rewards: any;
            pointsPreview: {
                base: number;
                auth: number;
                contact: number;
                survey: number;
                subscribe: number;
                total: number;
            };
        }>;
        unlockCheck({ userId, activityDocumentId, formData, preQuestionnaireData }: {
            userId: number;
            activityDocumentId: string;
            formData?: any;
            preQuestionnaireData?: any;
        }): Promise<{
            ok: boolean;
            hasReward: boolean;
            loginAuth: boolean;
            subscribed: boolean;
            conditions: {
                contact: boolean;
                survey: boolean;
                post_survey: boolean;
            };
            pointsPreview: {
                base: number;
                auth: number;
                contact: number;
                survey: number;
                subscribe: number;
                total: number;
            };
            channel?: undefined;
            channelDone?: undefined;
            selectMode?: undefined;
            selectN?: undefined;
            rewards?: undefined;
        } | {
            ok: boolean;
            hasReward: boolean;
            loginAuth: boolean;
            subscribed: boolean;
            channel: {
                type: string;
                label?: string;
            };
            conditions: {
                contact: boolean;
                survey: boolean;
                post_survey: boolean;
            };
            channelDone: boolean;
            selectMode: any;
            selectN: number;
            rewards: any[];
            pointsPreview: {
                base: number;
                auth: number;
                contact: number;
                survey: number;
                subscribe: number;
                total: number;
            };
        }>;
        getPromoContact(activityContact: any, siteDocumentId?: string): Promise<any | null>;
        promoDetail({ activityDocumentId, userId, siteDocumentId }: {
            activityDocumentId: string;
            userId?: number;
            siteDocumentId?: string;
        }): Promise<{
            activity: import('@strapi/types/dist/modules/documents').AnyDocument;
            modules: any[];
            contact: any;
            rewards: any;
            signupStatus: any;
        }>;
        sendMessage({ userId, activityDocumentId, content }: {
            userId: number;
            activityDocumentId: string;
            content?: string;
        }): Promise<{
            documentId: string;
            status: any;
            createdAt: any;
        }>;
        listMyMessages({ userId, activityDocumentId }: {
            userId: number;
            activityDocumentId: string;
        }): Promise<{
            documentId: any;
            content: any;
            reply: any;
            status: any;
            repliedAt: any;
            createdAt: any;
        }[]>;
        adminListMessages({ activity, status, page, pageSize }: {
            activity?: string;
            status?: string;
            page: number;
            pageSize: number;
        }): Promise<{
            list: {
                documentId: any;
                content: any;
                reply: any;
                status: any;
                repliedAt: any;
                createdAt: any;
                user: {
                    id: any;
                    documentId: any;
                    username: any;
                    nickname: any;
                    avatar: any;
                    phone: any;
                };
                activity: {
                    documentId: any;
                    title: any;
                };
            }[];
            pagination: {
                page: number;
                pageSize: number;
                pageCount: number;
                total: number;
            };
        }>;
        adminReplyMessage({ messageDocumentId, reply }: {
            messageDocumentId: string;
            reply?: string;
        }): Promise<{
            documentId: string;
            status: any;
            repliedAt: any;
        }>;
        listPublicReviews({ activityDocumentId, page, pageSize }: {
            activityDocumentId: string;
            page?: number;
            pageSize?: number;
        }): Promise<{
            rows: {
                id: any;
                rating: any;
                nps: any;
                review: any;
                reviewedAt: any;
                user: {
                    id: any;
                    username: any;
                    nickname: any;
                    avatar: any;
                };
            }[];
            summary: {
                count: number;
                avgRating: number;
                avgNps: number;
                reviewCount: number;
            };
            pagination: {
                page: number;
                pageSize: number;
                pageCount: number;
                total: number;
            };
        }>;
        isLessonTempAuthorized({ userId, lessonDocumentId }: {
            userId: number;
            lessonDocumentId: string;
        }): Promise<{
            authorized: boolean;
            reason: string;
            auth?: undefined;
        } | {
            authorized: boolean;
            auth: any;
            reason?: undefined;
        }>;
        adminGrantTempLesson(opts: {
            activityId: string;
            userId: number;
            lessonDocumentId: string;
            source?: "signup" | "milestone" | "manual";
            expiresAt?: string | Date | null;
        }): Promise<{
            ok: boolean;
            expiresAt: any;
        }>;
        getLearningContent({ userId, activityDocumentId }: {
            userId: number;
            activityDocumentId: string;
        }): Promise<{
            checkedIn: boolean;
            articles: {
                documentId: any;
                title: any;
                url: any;
            }[];
            lessons: {
                documentId: any;
                title: any;
                course: {
                    documentId: any;
                    title: any;
                };
            }[];
            courses: any[];
        }>;
        closeActivity(activityId: string): Promise<{
            ok: boolean;
            closed: boolean;
            already: boolean;
            todosGenerated: number;
        } | {
            ok: boolean;
            closed: boolean;
            todosGenerated: number;
            already?: undefined;
        }>;
        ensureTransitions(activityDocumentId: string): Promise<boolean>;
        drainDueActivities(): Promise<{
            scanned: number;
            moved: number;
        }>;
        adminArchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        adminUnarchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        cancel({ userId, activityId }: {
            userId: number;
            activityId: number;
        }): Promise<{
            ok: boolean;
        }>;
        promoteWaiting(activityId: number): Promise<{
            promoted: number;
        }>;
        waitlistPositionOf(activityId: number, signup: {
            id: number;
            signupAt: Date | string;
        }): Promise<number>;
        notifyPromoted(upUserId: number, activityId: number): Promise<void>;
        notifyInApp(upUserId: number, activityId: number, scene: string, params: Record<string, any>, dedupeKey: string): Promise<void>;
        checkin({ userId, activityId, method, lat, lng }: {
            userId: number;
            activityId: string;
            method: "worker_scan" | "self";
            lat?: number;
            lng?: number;
        }): Promise<{
            ok: boolean;
            reason: string;
            attendanceId: any;
            point: any;
        } | {
            ok: boolean;
            reason: string;
            attendanceId?: undefined;
            point?: undefined;
        } | {
            ok: boolean;
            attendanceId: any;
            point: boolean;
            reason?: undefined;
        }>;
    };
    "series-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(params: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
        listActivities(seriesDocumentId: string): Promise<any[]>;
        duplicate(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        generateSchedule(seriesDocumentId: string, { count }?: {
            count?: number;
        }): Promise<{
            generated: number;
            reason: string;
        } | {
            generated: number;
            reason?: undefined;
        }>;
    };
    "calendar-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getCalendarMonth({ month, includeAllStatus }?: {
            month?: string;
            includeAllStatus?: boolean;
        }): Promise<{
            days: {
                date: string;
                activities: any[];
            }[];
        }>;
    };
    "fee-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        resolveUserProfile(upUserId: number): Promise<{
            segment: string;
            isPartner: boolean;
        }>;
        tierUsage(activityId: number, tierId: string): Promise<number>;
        resolveFee(activity: any, upUserId: number, opts?: {
            now?: string;
            excludeTierId?: string;
        }): Promise<{
            mode: string;
            cost: number;
            feeCollectAt: any;
            tierId: any;
            tier: any;
            base?: undefined;
        } | {
            mode: string;
            cost: number;
            feeCollectAt: any;
            tierId: any;
            tier: any;
            base: any;
        }>;
    };
    "activity-stats": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getOverview({ status }?: {
            status?: string;
        }): Promise<{
            summary: {
                activityCount: number;
                signupCount: number;
                attendedCount: number;
                attendanceRate: number;
                reviewCount: number;
                avgRating: number;
                avgNps: number;
                pointsChargedSum: any;
                referralPoints: any;
                referralCount: number;
                attendPointsGlobal: any;
            };
            rows: any[];
        }>;
    };
    form: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        validateFormData: typeof import('./form').validateFormData;
        collectFormData: typeof import('./form').collectFormData;
        channelFilled: typeof import('./form').channelFilled;
        collectQuestionnaire: typeof import('./form').collectQuestionnaire;
    };
    "resource-schedule": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        LECTURER_UID: string;
        VENUE_UID: string;
        check(opts: {
            start: Date | string;
            end: Date | string;
            excludeActivityId?: number;
            lecturerId?: number;
            venueId?: number;
        }): Promise<{
            ok: boolean;
            conflicts: any[];
        } | {
            ok: boolean;
            conflicts?: undefined;
        }>;
        suggest(opts: {
            type: "lecturer" | "venue";
            resourceId: number;
            start: Date | string;
            end: Date | string;
            n?: number;
            excludeActivityId?: number;
        }): Promise<any[]>;
    };
    "activity-ledger": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generate(activityId: string, source?: "auto" | "manual"): Promise<any>;
        list(params?: {
            activityDocumentId?: string;
            page?: number;
            pageSize?: number;
        }): Promise<{
            list: any[];
            pagination: {
                page: number;
                pageSize: number;
                pageCount: number;
                total: number;
            };
        }>;
        regenerate(activityId: string): Promise<any>;
        generateAutoIfAbsent(activityId: string): Promise<any>;
        settle(ledgerDocumentId: string, body?: {
            settleStatus?: string;
        }): Promise<any>;
    };
    "activity-sop-audience": ({ strapi }: {
        strapi: any;
    }) => {
        resolveAudience(audience: any): Promise<any>;
    };
};
export default _default;
