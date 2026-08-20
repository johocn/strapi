import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;
