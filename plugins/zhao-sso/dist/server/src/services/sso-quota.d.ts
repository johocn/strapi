import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 频控判定（发送前调用）
     * @param opts { userId, scene, templateId }
     * @returns { allowed: boolean, reason?: 'daily_cap'|'cooldown', detail? }
     */
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
export default _default;
