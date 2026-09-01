import { Core } from '@strapi/strapi';
/** 宣传页允许的模块类型（与 C端渲染组件一一对应） */
export declare const PROMO_MODULE_TYPES: readonly ["cover", "info", "rich", "highlights", "speakers", "agenda", "images", "rewards", "contact", "message", "faq", "custom", "floatContact"];
/** 宣传页风格枚举 */
export declare const PROMO_TEMPLATES: readonly ["summit", "salon", "training", "action", "life"];
/** 按达成项累加发放分级积分：基础5 + 授权+5 + 联系方式+20 + 问卷+50 + 关注+50（关注奖励 isOneTime 防重） */
export declare function grantActivityPoints(strapi: any, userId: number, { loginAuth, subscribed, conditions }: {
    loginAuth: boolean;
    subscribed: boolean;
    conditions: Record<string, boolean>;
}): Promise<void>;
/**
 * 分级积分预览（单一来源）：base 基础报名 5；auth 微信授权登录额外 5（累计 10）；
 * contact 完善联系方式 20；survey 回答问卷 50；subscribe 关注公众号 50。
 * 预览与实际发放（grantActivityPoints）共用此配置，避免两处漂移。
 */
export declare function computePointsPreview({ loginAuth, subscribed, conditions }: {
    loginAuth: boolean;
    subscribed: boolean;
    conditions: Record<string, boolean>;
}): {
    base: number;
    auth: number;
    contact: number;
    survey: number;
    subscribe: number;
    total: number;
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
    /** 补填问卷：type=pre(活动前，报名后即可填，驱动 survey 解锁/积分) | post(活动后，需已签到且活动已结束，仅记录反馈) */
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
    /** 补填联系方式：更新 signup.formData → 重算解锁 → 本轮新达成联系方式补发 +20 */
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
    /** 用户关注公众号领积分的临时带参二维码（按用户缓存复用，有效期内不重复建码 → 临时码不限数量） */
    getFollowQrcode({ userId, activityId }: {
        userId: number;
        activityId: string;
    }): Promise<{
        ok: boolean;
        wx_url: any;
    }>;
    /** 补领关注公众号：已关注则补发关注积分(幂等)，并重算解锁新增权益 */
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
    /** 报名后权益状态：已报名用户回访时卡片区读取真实已领/可领/未达成（不入库） */
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
    /** 解锁状态探测：C 端报名前或关注/授权后调用，返回通道/条件/可领权益（不入库） */
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
    /** 合并联系方式：活动覆盖优先，否则回落站点 extraConfig.promoContact */
    getPromoContact(activityContact: any, siteDocumentId?: string): Promise<any | null>;
    /** 宣传页聚合：活动 + 模块 + 合并联系方式 + 奖励摘要 + 本人报名状态 */
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
    /** 用户留言（异步客服） */
    sendMessage({ userId, activityDocumentId, content }: {
        userId: number;
        activityDocumentId: string;
        content?: string;
    }): Promise<{
        documentId: string;
        status: any;
        createdAt: any;
    }>;
    /** 我的留言 + 运营回复列表（按活动） */
    listMyMessages({ userId, activityDocumentId }: {
        userId: number;
        activityDocumentId: string;
    }): Promise<{
        id: any;
        documentId: any;
        content: any;
        reply: any;
        status: any;
        repliedAt: any;
        createdAt: any;
        nickname: any;
    }[]>;
    /** 运营端留言列表（可按活动/状态过滤） */
    adminListMessages({ activity, status, page, pageSize }: {
        activity?: string;
        status?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        list: {
            id: any;
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
    /** 运营端回复留言：status→replied，记录 repliedAt */
    adminReplyMessage({ messageDocumentId, reply }: {
        messageDocumentId: string;
        reply?: string;
    }): Promise<{
        documentId: string;
        status: any;
        repliedAt: any;
    }>;
    /** 管理员通过公众号回复留言（供 zhao-sso 微信回调调用）：按消息 id 更新 reply，幂等 */
    replyMessageByWechat({ messageId, reply }: {
        messageId: number;
        reply: string;
    }): Promise<{
        documentId: any;
        status: any;
        repliedAt: any;
        skipped: boolean;
    } | {
        documentId: any;
        status: any;
        repliedAt: any;
        skipped?: undefined;
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
    /** 单课时临时授权判定：是否仍有效（活动期内、未过期、且活动仍开放该课时） */
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
    /** 运营手动授权单课时临时播放权（幂等复用 grantTempLessonLesson，source=manual） */
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
    /** 本活动本人已解锁学习内容：报名解锁(preUnlock*) + 签到解锁(learningPackage*) */
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
    /**
     * 活动结束触点：本项目无可靠业务结束判定（无 cron、无专属关闭端点，adminUpdate 仅通用更新 status），
     * 因此提供公开 service 方法 closeActivity(activityId) 兼做活动结束埋点（生成手动 SOP 待办），不引入 cron。
     * 调用方在活动结束后自行调用；不再逐人自动下发，改生成回放/复购/未到场回访三条待办给管理员手动发送，
     * 名单由 activity-sop-audience.resolveAudience 在点发时实时解析。
     */
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
    /**
     * 懒加载状态流转：读活动时按时间推进状态
     *  - signup_open && now>=startTime → ongoing
     *  - ongoing && now>=endTime → ended（走 closeActivity 收尾：评价引导/复购/回访/快照）
     * 返回是否发生流转；不引入 cron。
     */
    ensureTransitions(activityDocumentId: string): Promise<boolean>;
    /** 批量兜底：扫描到期的 signup_open/ongoing 活动统一推进（管理端聚合/启动时调用） */
    drainDueActivities(): Promise<{
        scanned: number;
        moved: number;
    }>;
    /** 管理端归档: 仅 ended -> archived; 幂等(已是 archived 直接返回) */
    adminArchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /** 管理端恢复: archived -> ended; 幂等(非 archived 抛错) */
    adminUnarchive(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    cancel({ userId, activityId }: {
        userId: number;
        activityId: number;
    }): Promise<{
        ok: boolean;
    }>;
    /**
     * 递补：从候补队列取最旧的一个 waiting 转正为 active（复用"used_capacity<capacity 原子占位"法，
     * cancel 释放一席后调用，故每次至多转正一人），并对转正用户即时通知。
     */
    promoteWaiting(activityId: number): Promise<{
        promoted: number;
    }>;
    /** 候补序号（1-based）：按 signupAt 升序、同时间按 id 升序，统计排在该候补记录之前的 waiting 数 + 1 */
    waitlistPositionOf(activityId: number, signup: {
        id: number;
        signupAt: Date | string;
    }): Promise<number>;
    /** 递补转正即时通知：resolve sso 用户 → sso-msg.sendNow(act_promoted)，幂等；匹配不到/模板缺失降级不断链 */
    notifyPromoted(upUserId: number, activityId: number): Promise<void>;
    /** 站内信发送助手：resolve sso-user → sso-msg.sendInApp；无 sso/失败降级不断链 */
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
export default _default;
