import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;
