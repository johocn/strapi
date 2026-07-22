import { PlatformAdapter, FetchCouponsOpts, FetchProductsOpts, FetchOrdersOpts } from './platform-adapter';
import { AdapterConfig } from './taobao-adapter';
export declare class PddAdapter implements PlatformAdapter {
    readonly platformCode = "pdd";
    private appKey;
    private appSecret;
    private apiEndpoint;
    constructor(config: AdapterConfig);
    fetchCoupons(_opts: FetchCouponsOpts): Promise<{
        list: any[];
        total: number;
        hasNext: boolean;
    }>;
    fetchProducts(_opts: FetchProductsOpts): Promise<{
        list: any[];
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
    fetchOrders(_opts: FetchOrdersOpts): Promise<{
        list: any[];
        total: number;
        hasNext: boolean;
    }>;
}
