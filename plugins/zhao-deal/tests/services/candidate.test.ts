import candidateServiceFactory from "../../server/src/services/candidate";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Candidate Service", () => {
  describe("approveCouponCandidate", () => {
    it("候选不存在抛 DEAL_CANDIDATE_NOT_FOUND", async () => {
      const mockStrapi = createMockStrapi();
      mockStrapi.documents.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const svc = candidateServiceFactory({ strapi: mockStrapi as any });
      await expect(svc.approveCouponCandidate("d1")).rejects.toMatchObject({ code: "DEAL_CANDIDATE_NOT_FOUND" });
    });

    it("已 imported 抛 DEAL_CANDIDATE_ALREADY_IMPORTED", async () => {
      const mockStrapi = createMockStrapi();
      mockStrapi.documents.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ documentId: "d1", status: "imported" }),
      });
      const svc = candidateServiceFactory({ strapi: mockStrapi as any });
      await expect(svc.approveCouponCandidate("d1")).rejects.toMatchObject({ code: "DEAL_CANDIDATE_ALREADY_IMPORTED" });
    });

    it("pending 候选创建正式 Coupon 并更新 status", async () => {
      const create = jest.fn().mockResolvedValue({ documentId: "c1" });
      const update = jest.fn().mockResolvedValue({});
      const findMany = jest.fn().mockResolvedValue([]);
      const mockStrapi = createMockStrapi();
      mockStrapi.documents.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          documentId: "d1", status: "pending", couponId: "coupon_1",
          platform: { documentId: "p1" }, category: null,
          amountDesc: "满 100 减 20", promoLink: "l1",
        }),
        create,
        update,
        findMany,
      });
      const svc = candidateServiceFactory({ strapi: mockStrapi as any });
      const result = await svc.approveCouponCandidate("d1");
      expect(result.documentId).toBe("c1");
      expect(create).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "imported" }),
      }));
    });
  });

  describe("rejectCouponCandidate", () => {
    it("更新 status=rejected 并记录 rejectReason", async () => {
      const update = jest.fn().mockResolvedValue({});
      const mockStrapi = createMockStrapi();
      mockStrapi.documents.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ documentId: "d1", status: "pending" }),
        update,
      });
      const svc = candidateServiceFactory({ strapi: mockStrapi as any });
      await svc.rejectCouponCandidate("d1", "优惠力度不足");
      expect(update).toHaveBeenCalledWith({
        documentId: "d1",
        data: { status: "rejected", rejectReason: "优惠力度不足" },
      });
    });
  });
});
