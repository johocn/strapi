import { PlatformAdapter, CouponBatch, ProductBatch, OrderBatch, FetchCouponsOpts, FetchProductsOpts, FetchOrdersOpts } from './platform-adapter';
export declare class MockAdapter implements PlatformAdapter {
    readonly platformCode = "mock";
    private couponList;
    private productList;
    private orderList;
    setMockData(coupons: CouponBatch[], products: ProductBatch[], orders: OrderBatch[]): void;
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
    }): Promise<{
        resolvedLink: string;
        promoPid: string;
    }>;
    fetchOrders(opts: FetchOrdersOpts): Promise<{
        list: OrderBatch[];
        total: number;
        hasNext: boolean;
    }>;
}
