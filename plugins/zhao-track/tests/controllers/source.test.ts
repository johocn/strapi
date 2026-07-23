import sourceControllerFactory from "../../server/src/controllers/source";

describe("source controller", () => {
  it("identify 返回 promoCampaignId 而非 promoChannelId", async () => {
    const identifyMock = jest.fn().mockResolvedValue({
      tag: { tagId: "t1", promoCampaign: { documentId: "camp1" }, scene: "wechat" },
      isNew: false,
    });
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "source-resolver" ? { identify: identifyMock } : null,
      }),
    };
    const ctx: any = {
      request: { body: { data: { utm: { utmSource: "wechat" }, deviceFingerprint: "fp1" } } },
      body: null,
    };
    const ctrl = sourceControllerFactory({ strapi });
    await ctrl.identify(ctx);
    expect(ctx.body.data.promoCampaignId).toBe("camp1");
    expect(ctx.body.data.promoChannelId).toBeUndefined();
  });

  it("promoCampaign 为空时返回 null", async () => {
    const identifyMock = jest.fn().mockResolvedValue({
      tag: { tagId: "t2", promoCampaign: null, scene: "direct" },
      isNew: true,
    });
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "source-resolver" ? { identify: identifyMock } : null,
      }),
    };
    const ctx: any = {
      request: { body: { deviceFingerprint: "fp2" } },
      body: null,
    };
    const ctrl = sourceControllerFactory({ strapi });
    await ctrl.identify(ctx);
    expect(ctx.body.data.promoCampaignId).toBeNull();
    expect(ctx.body.data.isNew).toBe(true);
  });

  it("identify 抛错时返回 400 + error", async () => {
    const identifyMock = jest.fn().mockRejectedValue(Object.assign(new Error("bad input"), { code: "TRACK_SOURCE_INVALID" }));
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "source-resolver" ? { identify: identifyMock } : null,
      }),
    };
    const ctx: any = {
      request: { body: {} },
      body: null,
      status: 200,
    };
    const ctrl = sourceControllerFactory({ strapi });
    await ctrl.identify(ctx);
    expect(ctx.status).toBe(400);
    expect(ctx.body.error).toBe("bad input");
    expect(ctx.body.code).toBe("TRACK_SOURCE_INVALID");
  });
});
