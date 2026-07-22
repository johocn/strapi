import type { PlatformAdapter, FetchCouponsOpts, FetchProductsOpts, FetchOrdersOpts } from "./platform-adapter";
import type { AdapterConfig } from "./taobao-adapter";

export class DouyinAdapter implements PlatformAdapter {
  readonly platformCode = "douyin";
  private appKey: string;
  private appSecret: string;
  private apiEndpoint: string;

  constructor(config: AdapterConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.apiEndpoint = config.apiEndpoint;
  }

  async fetchCoupons(_opts: FetchCouponsOpts) { return { list: [], total: 0, hasNext: false }; }
  async fetchProducts(_opts: FetchProductsOpts) { return { list: [], total: 0, hasNext: false }; }
  async transformLink(opts: { promoLink: string; promoChannelId: string; sourceTagId?: string }) {
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }
  async fetchOrders(_opts: FetchOrdersOpts) { return { list: [], total: 0, hasNext: false }; }
}
