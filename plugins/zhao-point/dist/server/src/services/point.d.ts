import { Core } from '@strapi/strapi';
export interface EarnPointsParams {
    userId: string | number;
    action: string;
    source?: string;
    method?: string;
    remark?: string;
    orderId?: string;
    channelId?: string | number;
    userChannelId?: string | number;
}
export interface DeductPointsParams {
    userId: string | number;
    action: string;
    points?: number;
    source?: string;
    method?: string;
    remark?: string;
    orderId?: string;
}
export interface AdminAdjustParams {
    userId: string | number;
    points: number;
    action?: string;
    remark?: string;
    operatorId: string | number;
}
export interface BatchAdjustItem {
    userId: string | number;
    points: number;
    action?: string;
    remark?: string;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    earnPoints: (params: EarnPointsParams) => Promise<any>;
    earnCustomPoints: (params: {
        userId: string | number;
        action: string;
        points: number;
        source?: string;
        remark?: string;
        channelId?: string | number;
        userChannelId?: string | number;
    }) => Promise<any>;
    deductPoints: (params: DeductPointsParams) => Promise<any>;
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
    adminAdjust: (params: AdminAdjustParams) => Promise<any>;
    batchAdjust: (items: BatchAdjustItem[], operatorId: string | number) => Promise<{
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
export default _default;
