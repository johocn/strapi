import couponControllerFactory from "../../server/src/controllers/coupon";

describe("Coupon Controller", () => {
  it("get 未找到返回 404 + DEAL_COUPON_NOT_FOUND", async () => {
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          getCoupon: jest.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "DEAL_COUPON_NOT_FOUND" })),
        }),
      }),
    };
    const ctx: any = { params: { couponId: "x" } };
    const ctrl = couponControllerFactory({ strapi: mockStrapi as any });
    await ctrl.get(ctx);
    expect(ctx.status).toBe(404);
    expect(ctx.body.code).toBe("DEAL_COUPON_NOT_FOUND");
  });

  it("list 正常返回 wrap 结构", async () => {
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          listCoupons: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      }),
    };
    const ctx: any = { query: {} };
    const ctrl = couponControllerFactory({ strapi: mockStrapi as any });
    await ctrl.list(ctx);
    expect(ctx.body.data).toHaveLength(1);
  });

  it("getCollection 未找到返回 404", async () => {
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          getCollection: jest.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "DEAL_COLLECTION_NOT_FOUND" })),
        }),
      }),
    };
    const ctx: any = { params: { code: "x" } };
    const ctrl = couponControllerFactory({ strapi: mockStrapi as any });
    await ctrl.getCollection(ctx);
    expect(ctx.status).toBe(404);
  });
});
