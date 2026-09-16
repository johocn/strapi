import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    createBooking: (userId: string, bookingData: {
        submitType?: string;
        name?: string;
        phone?: string;
        contactType?: string;
        contactValue?: string;
        wechatType?: string;
        message?: string;
        productId?: number;
        portfolioPlanId?: number;
        preferredTime?: string;
        preferredChannel?: string;
    }) => Promise<{
        ok: boolean;
        code: number;
        msg: string;
    } | {
        ok: boolean;
        record: any;
    }>;
    getBookings: (userId: string) => Promise<any[]>;
    cancelBooking: (bookingId: number) => Promise<any>;
    adminListBookings: (params: {
        page?: number;
        pageSize?: number;
        status?: string;
        submitType?: string;
    }) => Promise<{
        records: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    replyBooking: (bookingId: number, reply: string) => Promise<{
        ok: boolean;
        code: number;
        msg: string;
    } | {
        ok: boolean;
        record: any;
    }>;
    getConsultConfig: () => Promise<{
        enterpriseWechatQr: any;
        personalWechatQr: any;
        enterpriseWechatId: any;
        personalWechatId: any;
    }>;
    adminUpdateConsultConfig: (data: {
        enterpriseWechatQr?: number;
        personalWechatQr?: number;
        enterpriseWechatId?: string;
        personalWechatId?: string;
    }) => Promise<any>;
};
export default _default;
