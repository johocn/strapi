import type { PlatformAdapter, CouponBatch, OrderBatch, TransformLinkResult } from "../../../server/src/services/adapters/platform-adapter";

describe("PlatformAdapter 类型契约", () => {
  it("CouponBatch 包含 promoLink 与 couponAmount", () => {
    const c: CouponBatch = {
      couponId: "c1",
      amountDesc: "满 100 减 20",
      couponAmount: 20,
      promoLink: "https://s.click.taobao.com/xxx",
    };
    expect(c.couponId).toBe("c1");
    expect(c.couponAmount).toBe(20);
  });

  it("OrderBatch 含 amount 与 transactedAt", () => {
    const o: OrderBatch = {
      orderId: "o1",
      promoPid: "adzone_001",
      amount: 100,
      transactedAt: new Date(),
    };
    expect(o.amount).toBe(100);
    expect(o.promoPid).toBe("adzone_001");
  });

  it("TransformLinkResult 包含 resolvedLink 与 promoPid", () => {
    const r: TransformLinkResult = { resolvedLink: "https://...", promoPid: "pid_001" };
    expect(r.promoPid).toBe("pid_001");
  });

  it("PlatformAdapter 接口包含 4 个方法", () => {
    const adapter: PlatformAdapter = {
      platformCode: "mock",
      fetchCoupons: async () => ({ list: [], total: 0, hasNext: false }),
      fetchProducts: async () => ({ list: [], total: 0, hasNext: false }),
      transformLink: async (opts) => ({ resolvedLink: opts.promoLink, promoPid: opts.promoChannelId }),
      fetchOrders: async () => ({ list: [], total: 0, hasNext: false }),
    };
    expect(adapter.platformCode).toBe("mock");
    expect(typeof adapter.fetchCoupons).toBe("function");
    expect(typeof adapter.transformLink).toBe("function");
  });
});
