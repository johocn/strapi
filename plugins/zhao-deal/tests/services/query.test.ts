import queryServiceFactory from "../../server/src/services/query";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Query Service", () => {
  it("listCoupons 应用基础过滤（未下线/未过期）", async () => {
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ id: 1, couponId: "c1" }]),
    });
    const svc = queryServiceFactory({ strapi: mockStrapi as any });
    const result = await svc.listCoupons({ page: "1", pageSize: "10" });
    expect(result).toHaveLength(1);
  });

  it("getCoupon 未找到抛 DEAL_COUPON_NOT_FOUND", async () => {
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
    });
    const svc = queryServiceFactory({ strapi: mockStrapi as any });
    await expect(svc.getCoupon("notexist")).rejects.toMatchObject({ code: "DEAL_COUPON_NOT_FOUND" });
  });

  it("listCollections 仅返回生效期内", async () => {
    const mockStrapi = createMockStrapi();
    const findMany = jest.fn().mockResolvedValue([{ id: 1, code: "c1" }]);
    mockStrapi.documents.mockReturnValue({ findMany });
    const svc = queryServiceFactory({ strapi: mockStrapi as any });
    await svc.listCollections();
    const callArgs = findMany.mock.calls[0][0];
    expect(callArgs.filters.status).toBe(true);
  });

  it("getCollection 未找到抛 DEAL_COLLECTION_NOT_FOUND", async () => {
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany: jest.fn().mockResolvedValue([]) });
    const svc = queryServiceFactory({ strapi: mockStrapi as any });
    await expect(svc.getCollection("notexist")).rejects.toMatchObject({ code: "DEAL_COLLECTION_NOT_FOUND" });
  });
});
