import sourceResolverFactory from "../../server/src/services/source-resolver";

describe("source-resolver populate promoCampaign.channel", () => {
  let strapi: any;
  let findManyMock: jest.Mock;
  let findOneMock: jest.Mock;
  let createMock: jest.Mock;
  let updateMock: jest.Mock;

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    findOneMock = jest.fn().mockResolvedValue({ documentId: "new-tag", promoCampaign: null });
    createMock = jest.fn().mockResolvedValue({ documentId: "new-tag" });
    updateMock = jest.fn().mockResolvedValue({});
    strapi = {
      documents: jest.fn((uid: string) => {
        if (uid === "plugin::zhao-studio.promo-campaign") {
          return { findMany: jest.fn().mockResolvedValue([]) };
        }
        if (uid === "plugin::zhao-studio.promo-channel") {
          return { findMany: jest.fn().mockResolvedValue([]) };
        }
        return { findMany: findManyMock, findOne: findOneMock, create: createMock, update: updateMock };
      }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
  });

  it("步骤 1 sourceTagId 命中时 populate promoCampaign.channel", async () => {
    findManyMock.mockResolvedValue([{ documentId: "t1", tagId: "t1" }]);
    const svc = sourceResolverFactory({ strapi });
    await svc.identify({ sourceTagId: "t1" });
    const call = findManyMock.mock.calls[0][0];
    expect(call.populate).toEqual({ promoCampaign: { populate: { channel: true } } });
  });

  it("步骤 2 utm 组合查询时 populate promoCampaign.channel", async () => {
    findManyMock.mockResolvedValueOnce([{ documentId: "t1", tagId: "t1" }]); // 命中
    const svc = sourceResolverFactory({ strapi });
    await svc.identify({ utm: { utmSource: "wechat" } });
    // findMany 会被调用：第一次 source-tag 命中
    const tagCall = findManyMock.mock.calls.find((c: any) => c[0].filters && c[0].filters.utmSource === "wechat");
    expect(tagCall[0].populate).toEqual({ promoCampaign: { populate: { channel: true } } });
  });

  it("步骤 3 deviceFingerprint 查询时 populate promoCampaign.channel", async () => {
    findManyMock.mockResolvedValueOnce([{ documentId: "t1", deviceFingerprint: "fp1" }]);
    const svc = sourceResolverFactory({ strapi });
    await svc.identify({ deviceFingerprint: "fp1" });
    const fpCall = findManyMock.mock.calls.find((c: any) => c[0].filters && c[0].filters.deviceFingerprint === "fp1");
    expect(fpCall[0].populate).toEqual({ promoCampaign: { populate: { channel: true } } });
  });

  it("步骤 4 创建新 tag 后用 findOne 重新查询带 populate", async () => {
    findManyMock.mockResolvedValue([]); // 所有 findMany 都未命中
    const svc = sourceResolverFactory({ strapi });
    const result = await svc.identify({ utm: { utmSource: "newcamp" }, deviceFingerprint: "fp_new" });
    expect(createMock).toHaveBeenCalled();
    expect(findOneMock).toHaveBeenCalled();
    const findOneCall = findOneMock.mock.calls[0][0];
    expect(findOneCall.documentId).toBe("new-tag");
    expect(findOneCall.populate).toEqual({ promoCampaign: { populate: { channel: true } } });
    expect(result.tag).toEqual({ documentId: "new-tag", promoCampaign: null });
    expect(result.isNew).toBe(true);
  });
});
