import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    signup({ userId, activityId }: {
        userId: number;
        activityId: string;
    }): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    /**
     * 活动结束触点：本项目无可靠业务结束判定（无 cron、无专属关闭端点，adminUpdate 仅通用更新 status），
     * 因此提供公开 service 方法 closeActivity(activityId) 兼做“activity.closed”未到场回访埋点，不引入 cron。
     * 调用方在活动结束后自行调用；对活动期内未签到(attended_at 为空)且未取消的每个报名用户触发一次回访。
     */
    closeActivity(activityId: string): Promise<{
        ok: boolean;
        closed: boolean;
        revisitTriggered: number;
    }>;
    cancel({ userId, activityId }: {
        userId: number;
        activityId: number;
    }): Promise<{
        ok: boolean;
    }>;
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
        attendanceId: any;
        point: boolean;
        reason?: undefined;
    }>;
};
export default _default;
