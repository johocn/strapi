import type { PlatformAdapter, CouponBatch, ProductBatch, OrderBatch, FetchCouponsOpts, FetchProductsOpts, FetchOrdersOpts } from "./platform-adapter";

export class MockAdapter implements PlatformAdapter {
  readonly platformCode = "mock";
  private couponList: CouponBatch[] = [];
  private productList: ProductBatch[] = [];
  private orderList: OrderBatch[] = [];

  setMockData(coupons: CouponBatch[], products: ProductBatch[], orders: OrderBatch[]) {
    this.couponList = coupons;
    this.productList = products;
    this.orderList = orders;
  }

  async fetchCoupons(opts: FetchCouponsOpts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.couponList.slice(start, start + opts.pageSize);
    return { list, total: this.couponList.length, hasNext: start + opts.pageSize < this.couponList.length };
  }

  async fetchProducts(opts: FetchProductsOpts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.productList.slice(start, start + opts.pageSize);
    return { list, total: this.productList.length, hasNext: start + opts.pageSize < this.productList.length };
  }

  async transformLink(opts: { promoLink: string; promoChannelId: string; sourceTagId?: string }) {
    return { resolvedLink: opts.promoLink + "?pid=" + opts.promoChannelId, promoPid: opts.promoChannelId };
  }

  async fetchOrders(opts: FetchOrdersOpts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.orderList.slice(start, start + opts.pageSize);
    return { list, total: this.orderList.length, hasNext: start + opts.pageSize < this.orderList.length };
  }
}
