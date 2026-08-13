import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 创建预约咨询
     */
    createBooking(userId: string, bookingData: {
        name: string;
        phone: string;
        productId?: number;
        portfolioPlanId?: number;
        preferredTime?: string;
        preferredChannel?: string;
        message?: string;
    }): Promise<any>;
    /**
     * 获取用户的预约列表
     */
    getBookings(userId: string): Promise<any[]>;
    /**
     * 取消预约
     */
    cancelBooking(bookingId: number): Promise<any>;
};
export default _default;
