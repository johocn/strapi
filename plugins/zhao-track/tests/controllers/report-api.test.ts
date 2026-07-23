import reportControllerFactory from "../../server/src/controllers/report";

describe("report controller API 参数", () => {
  let strapi: any;
  let findManyMock: jest.Mock;

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    strapi = {
      documents: jest.fn().mockReturnValue({ findMany: findManyMock }),
    };
  });

  it("用 filters 不用 where，加 populate coupon+promoCampaign", async () => {
    const ctrl = reportControllerFactory({ strapi });
    const ctx: any = {
      query: { promoCampaign: "camp1", startDate: "2026-07-01", endDate: "2026-07-31" },
      body: null,
    };
    await ctrl.attributionReport(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters).toBeDefined();
    expect(call.filters.promoCampaign).toBe("camp1");
    expect(call.where).toBeUndefined();
    expect(call.populate).toEqual({ coupon: true, promoCampaign: true });
  });

  it("佣金用 commission 字段不用 commissionAmount", async () => {
    findManyMock.mockResolvedValue([
      { commission: 10.5, attributionQuality: "pid_match", transactedAt: "2026-07-20T10:00:00Z", coupon: { documentId: "c1" }, promoCampaign: { documentId: "camp1" } },
      { commission: 5.0, attributionQuality: "unmatched", transactedAt: "2026-07-21T10:00:00Z", coupon: { documentId: "c2" }, promoCampaign: null },
    ]);
    const ctrl = reportControllerFactory({ strapi });
    const ctx: any = { query: {}, body: null };
    await ctrl.attributionReport(ctx);
    const stats = ctx.body.data;
    expect(stats.totalCommission).toBe(15.5);
    expect(stats.matchedCommission).toBe(10.5);
    expect(stats.byQuality.pid_match).toBe(1);
    expect(stats.byQuality.unmatched).toBe(1);
  });

  it("groupBy=channel 用 promoCampaign.documentId 不用 promoChannelId", async () => {
    findManyMock.mockResolvedValue([
      { commission: 10, attributionQuality: "pid_match", transactedAt: "2026-07-20T10:00:00Z", coupon: { documentId: "c1" }, promoCampaign: { documentId: "camp1" } },
    ]);
    const ctrl = reportControllerFactory({ strapi });
    const ctx: any = { query: { groupBy: "channel" }, body: null };
    await ctrl.attributionReport(ctx);
    const stats = ctx.body.data;
    expect(stats.groups["camp1"]).toBeDefined();
    expect(stats.groups["camp1"].orders).toBe(1);
    expect(stats.groups["camp1"].commission).toBe(10);
  });
});
