export interface CouponBatch {
    couponId: string;
    amountDesc: string;
    couponAmount?: number;
    useCondition?: string;
    useScope?: string;
    startAt?: Date;
    endAt?: Date;
    receiveCount?: number;
    usedCount?: number;
    originalPrice?: number;
    onlineAt?: Date;
    offlineAt?: Date;
    promoLink: string;
    categoryCode?: string;
}
export interface ProductBatch {
    productId: string;
    title: string;
    mainImage?: string;
    detailUrl?: string;
    originalPrice?: number;
    couponAmount?: number;
    finalPrice?: number;
    sales30d?: number;
    reviewCount?: number;
    reviewScore?: number;
    brand?: string;
    categoryCode?: string;
}
export interface OrderBatch {
    orderId: string;
    couponId?: string;
    promoPid?: string;
    promoChannelId?: string;
    deviceFingerprint?: string;
    amount: number;
    commission?: number;
    commissionRate?: number;
    commissionStatus?: string;
    orderStatus?: string;
    transactedAt: Date;
}
export interface FetchCouponsOpts {
    pageSize: number;
    pageNo: number;
    startTime?: Date;
    endTime?: Date;
    categoryCodes?: string[];
    minAmount?: number;
    onlyRecommended?: boolean;
}
export interface FetchProductsOpts {
    pageSize: number;
    pageNo: number;
    startTime?: Date;
    endTime?: Date;
    categoryCodes?: string[];
    minSales?: number;
}
export interface FetchOrdersOpts {
    startTime?: Date;
    endTime?: Date;
    pageSize: number;
    pageNo: number;
    orderStatus?: string[];
    fetchConfig?: any;
}
export interface TransformLinkResult {
    resolvedLink: string;
    promoPid: string;
}
export interface PlatformAdapter {
    readonly platformCode: string;
    fetchCoupons(opts: FetchCouponsOpts): Promise<{
        list: CouponBatch[];
        total: number;
        hasNext: boolean;
    }>;
    fetchProducts(opts: FetchProductsOpts): Promise<{
        list: ProductBatch[];
        total: number;
        hasNext: boolean;
    }>;
    transformLink(opts: {
        promoLink: string;
        promoChannelId: string;
        sourceTagId?: string;
    }): Promise<TransformLinkResult>;
    fetchOrders(opts: FetchOrdersOpts): Promise<{
        list: OrderBatch[];
        total: number;
        hasNext: boolean;
    }>;
}
