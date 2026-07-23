import clickOrchestratorFactory from "../../server/src/services/click-orchestrator";

describe("click-orchestrator PLATFORM_TYPE_MAP", () => {
  let strapi: any;
  let configFindMany: jest.Mock;
  let clickCreate: jest.Mock;
  let couponFindMany: jest.Mock;

  const buildStrapi = (platformCode: string) => {
    couponFindMany = jest.fn().mockResolvedValue([{
      documentId: "c1",
      couponId: "coupon_1",
      platform: { documentId: "p1", code: platformCode },
      product: { documentId: "prod1" },
      promoLink: "https://example.com",
      amountDesc: "满100减10",
    }]);
    configFindMany = jest.fn().mockResolvedValue([{ documentId: "cfg1", promoPid: "pid_001" }]);
    clickCreate = jest.fn().mockResolvedValue({ documentId: "click1" });

    strapi = {
      documents: jest.fn((uid: string) => {
        if (uid === "plugin::zhao-deal.coupon") return { findMany: couponFindMany };
        if (uid === "plugin::zhao-studio.channel-platform-config") return { findMany: configFindMany };
        if (uid === "plugin::zhao-track.click-event") return { create: clickCreate };
        return { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() };
      }),
      plugin: jest.fn((name: string) => {
        if (name === "zhao-track") return {
          service: (svc: string) => {
            if (svc === "rate-limiter") return { checkAndRecord: jest.fn().mockResolvedValue({ allowed: true }) };
            if (svc === "source-resolver") return {
              identify: jest.fn().mockResolvedValue({
                tag: { documentId: "t1", tagId: "t1", promoCampaign: { documentId: "camp1", channel: { documentId: "ch1" } } },
                isNew: false,
              }),
            };
            return null;
          },
        };
        if (name === "zhao-studio") return { service: () => null };
        if (name === "zhao-deal") return { service: () => null };
        return { service: () => null };
      }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
  };

  const runOrchestrate = async (platformCode: string) => {
    buildStrapi(platformCode);
    const svc = clickOrchestratorFactory({ strapi });
    await svc.orchestrate({
      couponId: "coupon_1",
      sourceTagId: "t1",
      deviceFingerprint: "fp1",
    });
    return configFindMany.mock.calls[0][0];
  };

  it("douyin 平台查询 ChannelPlatformConfig 时用 douyin-ecom", async () => {
    const callArgs = await runOrchestrate("douyin");
    expect(callArgs.filters.platform.type).toBe("douyin-ecom");
  });

  it("taobao 平台查询时用 taobao（不变）", async () => {
    const callArgs = await runOrchestrate("taobao");
    expect(callArgs.filters.platform.type).toBe("taobao");
  });

  it("pdd 平台查询时用 pdd（不变）", async () => {
    const callArgs = await runOrchestrate("pdd");
    expect(callArgs.filters.platform.type).toBe("pdd");
  });

  it("jd 平台查询时用 jd（不变）", async () => {
    const callArgs = await runOrchestrate("jd");
    expect(callArgs.filters.platform.type).toBe("jd");
  });
});
