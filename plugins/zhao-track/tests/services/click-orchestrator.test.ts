import clickOrchestratorFactory from "../../server/src/services/click-orchestrator";
import { createMockStrapi } from "../helpers/mock-strapi";

const buildMockStrapi = (overrides: any = {}) => {
  const couponFindMany = jest.fn().mockResolvedValue([{
    documentId: "c1", couponId: "coupon_1", promoLink: "https://original",
    amountDesc: "满 100 减 20", product: { title: "商品 A" },
    platform: { code: "taobao" },
  }]);
  const clickCreate = jest.fn().mockResolvedValue({ documentId: "click1" });
  const channelConfigFindMany = jest.fn().mockResolvedValue([{ documentId: "cfg1", promoPid: "promo_001" }]);
  const mockStrapi = createMockStrapi();
  mockStrapi.documents.mockImplementation((uid: string) => {
    if (uid === "plugin::zhao-deal.coupon") return { findMany: couponFindMany };
    if (uid === "plugin::zhao-track.click-event") return { create: clickCreate };
    if (uid === "plugin::zhao-studio.channel-platform-config") return { findMany: channelConfigFindMany };
    return { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), findOne: jest.fn() };
  });
  mockStrapi.plugin.mockImplementation((name: string) => {
    if (name === "zhao-track") return {
      service: (svc: string) => {
        if (svc === "rate-limiter") return { checkAndRecord: jest.fn().mockResolvedValue({ allowed: true }) };
        if (svc === "source-resolver") return { identify: jest.fn().mockResolvedValue({ tag: { documentId: "t1", tagId: "t1", promoCampaign: { documentId: "camp1", channel: { documentId: "ch1" } } } }) };
        return null;
      },
    };
    if (name === "zhao-deal") return {
      service: (svc: string) => {
        if (svc === "adapterRegistry") return {
          get: jest.fn().mockReturnValue({
            transformLink: jest.fn().mockResolvedValue({ resolvedLink: "https://resolved", promoPid: "promo_001" }),
          }),
        };
        return null;
      },
    };
    return { service: jest.fn().mockReturnValue(null) };
  });
  return { mockStrapi, couponFindMany, clickCreate, ...overrides };
};

describe("ClickOrchestrator", () => {
  it("完整流程：校验→频率→来源→置换链接→写 ClickEvent", async () => {
    const { mockStrapi, clickCreate } = buildMockStrapi();
    const svc = clickOrchestratorFactory({ strapi: mockStrapi as any });
    const result = await svc.orchestrate({
      couponId: "coupon_1", deviceFingerprint: "fp1",
      utm: { utmSource: "wechat" }, userAgent: "Mozilla/5.0",
    });
    expect(result.clickId).toBe("click1");
    expect(result.resolvedLink).toBe("https://resolved");
    expect(clickCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ promoPid: "promo_001", deviceFingerprint: "fp1" }),
    }));
  });

  it("couponId 不存在抛 DEAL_COUPON_NOT_FOUND", async () => {
    const { mockStrapi } = buildMockStrapi();
    mockStrapi.documents.mockImplementation(() => ({ findMany: jest.fn().mockResolvedValue([]) }));
    const svc = clickOrchestratorFactory({ strapi: mockStrapi as any });
    await expect(svc.orchestrate({ couponId: "nope", deviceFingerprint: "fp1" }))
      .rejects.toMatchObject({ code: "DEAL_COUPON_NOT_FOUND" });
  });

  it("sourceTagId 和 utm 都未提供抛 TRACK_SOURCE_INVALID", async () => {
    const { mockStrapi } = buildMockStrapi();
    const svc = clickOrchestratorFactory({ strapi: mockStrapi as any });
    await expect(svc.orchestrate({ couponId: "coupon_1", deviceFingerprint: "fp1" }))
      .rejects.toMatchObject({ code: "TRACK_SOURCE_INVALID" });
  });

  it("频率限制抛 TRACK_CLICK_RATE_LIMITED", async () => {
    const { mockStrapi } = buildMockStrapi();
    mockStrapi.plugin.mockImplementation((name: string) => {
      if (name === "zhao-track") return {
        service: (svc: string) => {
          if (svc === "rate-limiter") return { checkAndRecord: jest.fn().mockResolvedValue({ allowed: false }) };
          if (svc === "source-resolver") return { identify: jest.fn() };
          return null;
        },
      };
      return { service: jest.fn().mockReturnValue(null) };
    });
    const svc = clickOrchestratorFactory({ strapi: mockStrapi as any });
    await expect(svc.orchestrate({ couponId: "coupon_1", deviceFingerprint: "fp1", utm: { utmSource: "x" } }))
      .rejects.toMatchObject({ code: "TRACK_CLICK_RATE_LIMITED" });
  });

  it("adapter 不可用时降级返回原始 promoLink", async () => {
    const { mockStrapi, clickCreate } = buildMockStrapi();
    mockStrapi.plugin.mockImplementation((name: string) => {
      if (name === "zhao-track") return {
        service: (svc: string) => {
          if (svc === "rate-limiter") return { checkAndRecord: jest.fn().mockResolvedValue({ allowed: true }) };
          if (svc === "source-resolver") return { identify: jest.fn().mockResolvedValue({ tag: { documentId: "t1", tagId: "t1", promoCampaign: null } }) };
          return null;
        },
      };
      if (name === "zhao-deal") return { service: () => null };
      return { service: jest.fn().mockReturnValue(null) };
    });
    const svc = clickOrchestratorFactory({ strapi: mockStrapi as any });
    const result = await svc.orchestrate({ couponId: "coupon_1", deviceFingerprint: "fp1", utm: { utmSource: "x" } });
    expect(result.resolvedLink).toBe("https://original");
    expect(clickCreate).toHaveBeenCalled();
  });
});
