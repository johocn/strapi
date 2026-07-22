import type { PlatformAdapter, FetchCouponsOpts, FetchProductsOpts, FetchOrdersOpts } from "./platform-adapter";

export interface AdapterConfig {
  appKey: string;
  appSecret: string;
  apiEndpoint: string;
}

export class TaobaoAdapter implements PlatformAdapter {
  readonly platformCode = "taobao";
  private appKey: string;
  private appSecret: string;
  private apiEndpoint: string;

  constructor(config: AdapterConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.apiEndpoint = config.apiEndpoint;
  }

  async fetchCoupons(_opts: FetchCouponsOpts) {
    // TODO: 调用淘宝客 API + MD5 签名
    return { list: [], total: 0, hasNext: false };
  }

  async fetchProducts(_opts: FetchProductsOpts) {
    return { list: [], total: 0, hasNext: false };
  }

  async transformLink(opts: { promoLink: string; promoChannelId: string; sourceTagId?: string }) {
    // TODO: 调淘宝客链接转换接口，注入 promoChannelId 作为 adzone_id
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }

  async fetchOrders(_opts: FetchOrdersOpts) {
    return { list: [], total: 0, hasNext: false };
  }
}
