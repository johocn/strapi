import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    signup({ userId, activityId, formData }: {
        userId: number;
        activityId: string;
        formData?: any;
    }): Promise<{
        ok: boolean;
        reason: string;
        waitlisted?: undefined;
        position?: undefined;
    } | {
        ok: boolean;
        waitlisted: boolean;
        position: number;
        reason?: undefined;
    } | {
        ok: boolean;
        reason?: undefined;
        waitlisted?: undefined;
        position?: undefined;
    }>;
    /**
     * 活动结束触点：本项目无可靠业务结束判定（无 cron、无专属关闭端点，adminUpdate 仅通用更新 status），
     * 因此提供公开 service 方法 closeActivity(activityId) 兼做“activity.closed”未到场回访埋点，不引入 cron。
     * 调用方在活动结束后自行调用；对活动期内未签到(attended_at 为空)且未取消的每个报名用户触发一次回访。
     */
    closeActivity(activityId: string): Promise<{
        ok: boolean;
        closed: boolean;
        reviewTriggered: number;
        revisitTriggered: number;
        repurchaseTriggered: number;
    }>;
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
