import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;
