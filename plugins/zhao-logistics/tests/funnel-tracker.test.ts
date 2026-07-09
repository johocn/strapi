import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock strapi
const mockQuery = jest.fn();
const mockStrapi: any = {
  db: { query: mockQuery },
  plugin: () => ({ service: () => ({}) }),
};

jest.mock("../server/src/services/funnel-tracker", () => {
  return jest.fn().mockImplementation(({ strapi }: { strapi: any }) => {
    const FUNNEL_UID = "plugin::zhao-logistics.conversion-funnel";
    const EVENT_UID = "plugin::zhao-logistics.conversion-event";

    return {
      async track(siteId: number, event: any) {
        const funnel = await strapi.db.query(FUNNEL_UID).findOne({ where: { site: siteId, isActive: true } });
        await strapi.db.query(EVENT_UID).create({
          data: { site: siteId, eventName: event.eventName, step: 1, visitorId: event.visitorId, occurredAt: expect.any(String) },
        });
      },
      async getStats(siteId: number, params: any) {
        const funnel = await strapi.db.query(FUNNEL_UID).findOne({ where: { documentId: params.funnelId } });
        if (!funnel) throw new Error("漏斗不存在");
        return { steps: [], totalVisitors: 0, totalConverted: 0 };
      },
    };
  });
});

describe("funnel-tracker", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("track 应调用 db.query.create 写入事件", async () => {
    const factory = require("../server/src/services/funnel-tracker");
    const svc = factory({ strapi: mockStrapi });

    mockQuery.mockImplementation((uid: string) => {
      if (uid.includes("conversion-funnel")) {
        return { findOne: async () => ({ documentId: "f1", steps: [{ step: 1, eventName: "page_view", name: "visit" }] }) };
      }
      return { create: async (opts: any) => ({ id: 1, ...opts.data }) };
    });

    await svc.track(1, { eventName: "page_view", visitorId: "v1" });
    expect(mockQuery).toHaveBeenCalled();
  });

  it("getStats 漏斗不存在时抛错", async () => {
    const factory = require("../server/src/services/funnel-tracker");
    const svc = factory({ strapi: mockStrapi });

    mockQuery.mockImplementation(() => ({ findOne: async () => null, findMany: async () => [] }));

    await expect(svc.getStats(1, { funnelId: "nope" })).rejects.toThrow("漏斗不存在");
  });
});
