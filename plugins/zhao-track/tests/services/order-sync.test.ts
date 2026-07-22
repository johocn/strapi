import orderSyncFactory from "../../server/src/services/order-sync";
import { createMockStrapi } from "../helpers/mock-strapi";

const buildMockStrapi = (opts: {
  platformExists?: boolean;
  couponExists?: boolean;
  existingOrders?: any[];
  adapterFetchResult?: any;
} = {}) => {
  const {
    platformExists = true,
    couponExists = true,
    existingOrders = [],
    adapterFetchResult = { list: [], total: 0, hasNext: false },
  } = opts;

  const orderFindMany = jest.fn().mockImplementation((args: any) => {
    const filters = args.filters || {};
    if (filters.orderId) {
      const found = existingOrders.filter((o) => o.orderId === filters.orderId);
      return Promise.resolve(found);
    }
    return Promise.resolve([]);
  });
  const orderCreate = jest.fn().mockResolvedValue({ documentId: "new-order" });
  const orderUpdate = jest.fn().mockResolvedValue({});

  const mockStrapi = createMockStrapi();
  mockStrapi.documents.mockImplementation((uid: string) => {
    if (uid === "plugin::zhao-deal.platform") {
      return {
        findMany: jest.fn().mockResolvedValue(platformExists ? [{
          code: "taobao", syncEnabled: true, fetchConfig: {},
        }] : []),
      };
    }
    if (uid === "plugin::zhao-deal.coupon") {
      return { findMany: jest.fn().mockResolvedValue(couponExists ? [{ documentId: "c1" }] : []) };
    }
    if (uid === "plugin::zhao-track.order") {
      return { findMany: orderFindMany, create: orderCreate, update: orderUpdate };
    }
    return { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() };
  });
  mockStrapi.plugin.mockImplementation((name: string) => {
    if (name === "zhao-deal") return {
      service: (svc: string) => {
        if (svc === "adapterRegistry") return {
          get: jest.fn().mockReturnValue({
            fetchOrders: jest.fn().mockResolvedValue(adapterFetchResult),
          }),
        };
        return null;
      },
    };
    return { service: jest.fn().mockReturnValue(null) };
  });
  return { mockStrapi, orderFindMany, orderCreate, orderUpdate };
};

describe("OrderSync.syncOrders", () => {
  it("新订单：创建并 stats.created++", async () => {
    const { mockStrapi, orderCreate } = buildMockStrapi({
      existingOrders: [],
      adapterFetchResult: {
        list: [{
          orderId: "po_1", couponId: "coupon_1", promoPid: "promo_001",
          commission: 5.2, amount: 100, commissionStatus: "paid",
          transactedAt: "2026-07-20T10:00:00Z",
        }],
        total: 1,
        hasNext: false,
      },
    });
    const svc = orderSyncFactory({ strapi: mockStrapi as any });
    const stats = await svc.syncOrders({ platformCode: "taobao" });
    expect(stats.fetched).toBe(1);
    expect(stats.created).toBe(1);
    expect(orderCreate).toHaveBeenCalled();
  });

  it("已存在订单：update 并 stats.updated++", async () => {
    const { mockStrapi, orderUpdate, orderCreate } = buildMockStrapi({
      existingOrders: [{ documentId: "o1", orderId: "po_1" }],
      adapterFetchResult: {
        list: [{
          orderId: "po_1", commission: 6.0, commissionStatus: "paid",
          amount: 120,
        }],
        total: 1,
        hasNext: false,
      },
    });
    const svc = orderSyncFactory({ strapi: mockStrapi as any });
    const stats = await svc.syncOrders({ platformCode: "taobao" });
    expect(stats.updated).toBe(1);
    expect(stats.created).toBe(0);
    expect(orderUpdate).toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("平台未启用抛 DEAL_ADAPTER_NOT_FOUND", async () => {
    const { mockStrapi } = buildMockStrapi({ platformExists: false });
    const svc = orderSyncFactory({ strapi: mockStrapi as any });
    await expect(svc.syncOrders({ platformCode: "taobao" }))
      .rejects.toMatchObject({ code: "DEAL_ADAPTER_NOT_FOUND" });
  });

  it("分页失败中断并记录 errors", async () => {
    const { mockStrapi } = buildMockStrapi({
      adapterFetchResult: { list: [], total: 0, hasNext: false },
    });
    mockStrapi.plugin.mockImplementation((name: string) => {
      if (name === "zhao-deal") return {
        service: () => ({
          get: jest.fn().mockReturnValue({
            fetchOrders: jest.fn().mockRejectedValue(new Error("network")),
          }),
        }),
      };
      return { service: jest.fn().mockReturnValue(null) };
    });
    const svc = orderSyncFactory({ strapi: mockStrapi as any });
    const stats = await svc.syncOrders({ platformCode: "taobao" });
    expect(stats.errors.length).toBeGreaterThan(0);
    expect(stats.fetched).toBe(0);
  });
});
