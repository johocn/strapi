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
