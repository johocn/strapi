import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;
