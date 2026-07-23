import attributionFactory from "../../server/src/services/attribution";
import { createMockStrapi } from "../helpers/mock-strapi";

const ORDER_UID = "plugin::zhao-track.order";
const CLICK_EVENT_UID = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";
const CAMPAIGN_UID = "plugin::zhao-studio.promo-campaign";

const buildMockStrapi = (opts: {
  orders?: any[];
  clicksByRule?: Record<string, any[]>;
  channelConfigsByPid?: Record<string, any[]>;
  campaignsByChannel?: Record<string, any[]>;
} = {}) => {
  const { orders = [], clicksByRule = {}, channelConfigsByPid = {}, campaignsByChannel = {} } = opts;
  const orderUpdate = jest.fn().mockResolvedValue({});
  const clickFindMany = jest.fn().mockImplementation((args: any) => {
    const filters = args.filters || {};
    if (filters.deviceFingerprint) return Promise.resolve(clicksByRule.rule2 || []);
    if (filters.promoCampaign && filters.promoCampaign.$in) return Promise.resolve(clicksByRule.rule1 || []);
    if (filters.promoPid) return Promise.resolve(clicksByRule.rule3 || []);
    if (filters.coupon) return Promise.resolve(clicksByRule.rule4 || []);
    return Promise.resolve([]);
  });
  const channelConfigFindMany = jest.fn().mockImplementation((args: any) => {
    const pid = args.filters?.promoPid;
    return Promise.resolve(channelConfigsByPid[pid] || []);
  });
  const campaignFindMany = jest.fn().mockImplementation((args: any) => {
    const channelId = args.filters?.channel;
    return Promise.resolve(campaignsByChannel[channelId] || []);
  });

  const mockStrapi = createMockStrapi();
  mockStrapi.documents.mockImplementation((uid: string) => {
    if (uid === ORDER_UID) return {
      findMany: jest.fn().mockResolvedValue(orders),
      update: orderUpdate,
    };
    if (uid === CLICK_EVENT_UID) return { findMany: clickFindMany };
    if (uid === CHANNEL_CONFIG_UID) return { findMany: channelConfigFindMany };
    if (uid === CAMPAIGN_UID) return { findMany: campaignFindMany };
    return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), findOne: jest.fn() };
  });
  return { mockStrapi, orderUpdate, clickFindMany };
};

describe("Attribution.findMatchingClick", () => {
  it("规则 1：promoPid 通过 ChannelPlatformConfig 反查命中 → pid_match", async () => {
    const order = {
      documentId: "o1", orderId: "po1", promoPid: "promo_001",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({
      channelConfigsByPid: { promo_001: [{ documentId: "cfg1", channel: { documentId: "ch1" } }] },
      campaignsByChannel: { ch1: [{ documentId: "camp1" }] },
      clicksByRule: { rule1: [{ documentId: "click1", clickedAt: "2026-07-18T10:00:00Z" }] },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result).not.toBeNull();
    expect(result?.quality).toBe("pid_match");
  });

  it("规则 2：deviceFingerprint 命中 → click_match", async () => {
    const order = {
      documentId: "o2", orderId: "po2", promoPid: "promo_002", deviceFingerprint: "fp1",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({
      clicksByRule: { rule2: [{ documentId: "click2" }] },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result?.quality).toBe("click_match");
  });

  it("规则 3：order.promoPid 直接匹配 ClickEvent.promoPid → weak_match + sourceTagId", async () => {
    const order = {
      documentId: "o3", orderId: "po3", promoPid: "promo_003",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({
      // 不提供 channelConfigsByPid → 规则 1 反查失败
      clicksByRule: {
        rule3: [{ documentId: "click3", promoCampaign: "camp3", sourceTag: { documentId: "stag3" } }],
      },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result).not.toBeNull();
    expect(result?.quality).toBe("weak_match");
    expect(result?.sourceTagId).toBe("stag3");
  });

  it("规则 4：仅 coupon 匹配 → fallback_match", async () => {
    const order = {
      documentId: "o4", orderId: "po4",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({
      clicksByRule: { rule4: [{ documentId: "click4" }] },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result?.quality).toBe("fallback_match");
  });

  it("无任何匹配返回 null", async () => {
    const order = {
      documentId: "o5", orderId: "po5",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({ clicksByRule: {} });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result).toBeNull();
  });
});

describe("Attribution.run", () => {
  it("扫描 pending 订单、匹配并 update，幂等只处理 matchedClick=null", async () => {
    const orders = [
      { documentId: "o1", orderId: "po1", promoPid: "promo_001", transactedAt: "2026-07-20T10:00:00Z", coupon: { documentId: "c1" } },
      { documentId: "o2", orderId: "po2", transactedAt: "2026-07-20T10:00:00Z", coupon: { documentId: "c1" } },
    ];
    const { mockStrapi, orderUpdate } = buildMockStrapi({
      orders,
      channelConfigsByPid: { promo_001: [{ documentId: "cfg1", channel: { documentId: "ch1" } }] },
      campaignsByChannel: { ch1: [{ documentId: "camp1" }] },
      clicksByRule: {
        rule1: [{ documentId: "click1", clickedAt: "2026-07-18T10:00:00Z" }],
        rule4: [{ documentId: "click2" }],
      },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const stats = await svc.run();
    expect(stats.total).toBe(2);
    expect(stats.matched).toBe(2);
    expect(stats.byQuality.pid_match).toBe(1);
    expect(stats.byQuality.fallback_match).toBe(1);
    expect(orderUpdate).toHaveBeenCalledTimes(2);
  });
});
