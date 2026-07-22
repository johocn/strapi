import clickFactory from "../../server/src/controllers/click";

const buildCtx = (body: any) => ({
  request: { body, header: { "user-agent": "ua-test" }, ip: "127.0.0.1" },
  ip: "127.0.0.1",
  body: null as any,
  status: 200 as number,
});

describe("click controller", () => {
  it("成功编排返回 200 + data", async () => {
    const orchestrate = jest.fn().mockResolvedValue({ clickId: "c1", resolvedLink: "https://x" });
    const strapi: any = { plugin: () => ({ service: () => ({ orchestrate }) }) };
    const ctrl = clickFactory({ strapi });
    const ctx = buildCtx({ couponId: 123, deviceFingerprint: "fp1", utm: { utmSource: "wx" } });
    await ctrl.click(ctx as any);
    expect(ctx.status).toBe(200);
    expect(ctx.body.data.clickId).toBe("c1");
    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({ couponId: "123", ip: "127.0.0.1" }));
  });

  it("DEAL_COUPON_NOT_FOUND → 404", async () => {
    const err: any = new Error("优惠券不存在"); err.code = "DEAL_COUPON_NOT_FOUND";
    const orchestrate = jest.fn().mockRejectedValue(err);
    const strapi: any = { plugin: () => ({ service: () => ({ orchestrate }) }) };
    const ctrl = clickFactory({ strapi });
    const ctx = buildCtx({ couponId: 999, deviceFingerprint: "fp1" });
    await ctrl.click(ctx as any);
    expect(ctx.status).toBe(404);
    expect(ctx.body.code).toBe("DEAL_COUPON_NOT_FOUND");
  });

  it("TRACK_CLICK_RATE_LIMITED → 429", async () => {
    const err: any = new Error("超限"); err.code = "TRACK_CLICK_RATE_LIMITED";
    const orchestrate = jest.fn().mockRejectedValue(err);
    const strapi: any = { plugin: () => ({ service: () => ({ orchestrate }) }) };
    const ctrl = clickFactory({ strapi });
    const ctx = buildCtx({ couponId: 1, deviceFingerprint: "fp1", utm: { utmSource: "x" } });
    await ctrl.click(ctx as any);
    expect(ctx.status).toBe(429);
  });
});
