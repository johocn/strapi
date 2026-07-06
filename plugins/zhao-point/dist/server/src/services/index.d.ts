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
};
export default _default;
