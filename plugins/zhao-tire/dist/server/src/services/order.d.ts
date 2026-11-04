import { Core } from '@strapi/strapi';
export declare const todayDateString: () => string;
/** 校验并归一化 YYYY-MM-DD，非法返回 null */
export declare const normalizeDate: (value: unknown) => string | null;
export declare const addMonths: (date: string, months: number) => string;
/** 起止日期之间的整月数（不足整月按 1 个月计） */
export declare const monthsBetween: (start: string, end: string) => number;
export declare const maskPhone: (phone: unknown) => string;
/** 后台订单列表与导出共用的筛选条件 */
export declare const buildOrderWhere: (query?: any) => any;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    create(input: any): Promise<{
        orderNo: any;
        amountTotal: any;
        status: any;
        duplicated: boolean;
        isFree?: undefined;
        freeReason?: undefined;
        referralCode?: undefined;
        paymentMethod?: undefined;
        rewardNo?: undefined;
        rewardAmount?: undefined;
    } | {
        orderNo: any;
        amountTotal: any;
        status: any;
        isFree: any;
        freeReason: any;
        referralCode: any;
        paymentMethod: any;
        rewardNo: any;
        rewardAmount: number;
        duplicated?: undefined;
    }>;
    detail(orderNo: string, phone: string): Promise<{
        orderNo: any;
        status: any;
        customerName: any;
        phone: string;
        plateNo: any;
        carType: any;
        tireSpec: any;
        withWheelRim: boolean;
        serviceType: any;
        returnMethod: any;
        pickupDate: string;
        pickupSlot: any;
        storageStartDate: string;
        expectedReturnDate: string;
        expireAt: string;
        months: number;
        packageSnapshot: any;
        addons: any;
        amountPackage: number;
        amountAddon: number;
        amountTotal: number;
        paymentMethod: any;
        paymentStatus: any;
        paidAmount: number;
        outstandingAmount: number;
        canPayOnline: boolean;
        rewardNo: any;
        rewardAmount: number;
        redemptionCode: any;
        redemptionCodeUsedAt: any;
        referralCode: any;
        referrerPhone: string;
        isFree: boolean;
        freeReason: any;
        outboundRequestStatus: any;
        outboundRequestedAt: any;
        outboundNote: any;
        note: any;
        renewals: any;
        timeline: any;
        locationCode: any;
        inboundAt: any;
        inboundPhotos: any;
        remainingDays: number;
        overdueDays: number;
        overdueFeeEstimate: number;
        canRenew: boolean;
        canRequestOutbound: boolean;
        createdAt: any;
    }>;
    renew(orderNo: string, months: number, paymentMethod?: string): Promise<{
        orderNo: any;
        months: number;
        amount: number;
        previousExpireAt: string;
        expireAt: string;
    }>;
    requestOutbound(orderNo: string, note?: string): Promise<{
        orderNo: any;
        outboundRequestStatus: string;
        outboundRequestedAt: string;
    }>;
    accept(orderNo: string, operatorId?: number): Promise<{
        orderNo: any;
        status: string;
    }>;
    reject(orderNo: string, reason?: string, operatorId?: number): Promise<{
        orderNo: any;
        status: string;
    }>;
    cancel(orderNo: string, reason?: string, operatorId?: number): Promise<{
        orderNo: any;
        status: string;
    }>;
    inbound(orderNo: string, payload?: {
        photos?: unknown;
        locationCode?: string;
        operatorId?: number;
    }): Promise<{
        orderNo: any;
        status: string;
        inboundAt: string;
        locationCode: string;
        redemptionCode: string;
    }>;
    outbound(orderNo: string, payload?: {
        photos?: unknown;
        operatorId?: number;
        redemptionCode?: string;
    }): Promise<{
        orderNo: any;
        status: string;
        outboundAt: string;
    }>;
    complete(orderNo: string, payload?: any): Promise<{
        orderNo: any;
        status: string;
        outboundAt: string;
    }>;
    approveOutbound(orderNo: string, operatorId?: number): Promise<{
        orderNo: any;
        status: string;
        outboundRequestStatus: string;
    }>;
    rejectOutbound(orderNo: string, reason?: string, operatorId?: number): Promise<{
        orderNo: any;
        status: any;
        outboundRequestStatus: string;
    }>;
    /** 后台改单：客户 / 车辆 / 日期 / 备注等可编辑字段 */
    updateDetails(orderNo: string, payload?: any, operatorId?: number): Promise<{
        orderNo: any;
        updated: string[];
    }>;
    /** 后台收款登记：所有到账统一落 tire-payment 流水 */
    registerPayment(orderNo: string, payload?: any, operatorId?: number): Promise<{
        orderNo: any;
        paymentMethod: string;
        paymentStatus: any;
        paidAmount: any;
        paymentNo: any;
        pending: boolean;
        duplicated: boolean;
    }>;
};
export default _default;
