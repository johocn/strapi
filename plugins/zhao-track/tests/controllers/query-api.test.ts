import queryControllerFactory from "../../server/src/controllers/query";

describe("query controller API 参数", () => {
  let strapi: any;
  let findManyMock: jest.Mock;
  let countMock: jest.Mock;

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    countMock = jest.fn().mockResolvedValue(0);
    strapi = {
      documents: jest.fn().mockReturnValue({ findMany: findManyMock }),
      db: { query: jest.fn().mockReturnValue({ count: countMock }) },
    };
  });

  it("clicks 用 filters 不用 where，用 sort 不用 orderBy，用 start 不用 offset", async () => {
    const ctrl = queryControllerFactory({ strapi });
    const ctx: any = {
      query: { page: 1, pageSize: 10, promoCampaign: "camp1" },
      body: null,
    };
    await ctrl.clicks(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters).toBeDefined();
    expect(call.filters.promoCampaign).toBe("camp1");
    expect(call.where).toBeUndefined();
    expect(call.sort).toBeDefined();
    expect(call.orderBy).toBeUndefined();
    expect(call.start).toBe(0);
    expect(call.offset).toBeUndefined();
  });

  it("clicks 不接受 promoChannelId（旧字段）", async () => {
    const ctrl = queryControllerFactory({ strapi });
    const ctx: any = {
      query: { page: 1, pageSize: 10, promoChannelId: "ch1" },
      body: null,
    };
    await ctrl.clicks(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters.promoChannelId).toBeUndefined();
  });

  it("orders 不接受 orderStatus", async () => {
    const ctrl = queryControllerFactory({ strapi });
    const ctx: any = {
      query: { page: 1, pageSize: 10, orderStatus: "paid" },
      body: null,
    };
    await ctrl.orders(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters.orderStatus).toBeUndefined();
  });

  it("orders 接受 promoCampaign 和 commissionStatus", async () => {
    const ctrl = queryControllerFactory({ strapi });
    const ctx: any = {
      query: { page: 1, pageSize: 10, promoCampaign: "camp1", commissionStatus: "paid" },
      body: null,
    };
    await ctrl.orders(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters.promoCampaign).toBe("camp1");
    expect(call.filters.commissionStatus).toBe("paid");
  });

  it("sourceTags 用 promoCampaign 不用 promoChannelId", async () => {
    const ctrl = queryControllerFactory({ strapi });
    const ctx: any = {
      query: { page: 1, pageSize: 10, promoCampaign: "camp1" },
      body: null,
    };
    await ctrl.sourceTags(ctx);
    const call = findManyMock.mock.calls[0][0];
    expect(call.filters.promoCampaign).toBe("camp1");
    expect(call.filters.promoChannelId).toBeUndefined();
  });
});
