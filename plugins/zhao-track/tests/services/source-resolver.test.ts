import sourceResolverFactory from "../../server/src/services/source-resolver";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("SourceResolver", () => {
  it("提供 sourceTagId 命中则复用并更新 lastSeenAt", async () => {
    const update = jest.fn().mockResolvedValue({});
    const findMany = jest.fn().mockResolvedValue([{ documentId: "d1", tagId: "t1" }]);
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, update, create: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    const result = await svc.identify({ sourceTagId: "t1" });
    expect(result.isNew).toBe(false);
    expect(result.tag.documentId).toBe("d1");
    expect(update).toHaveBeenCalled();
  });

  it("仅提供 utm 且未命中则创建新 SourceTag（promoCampaign 为空）", async () => {
    const create = jest.fn().mockResolvedValue({ documentId: "d2", tagId: "new1", promoCampaign: null });
    const findMany = jest.fn().mockResolvedValue([]);
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, create, update: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    const result = await svc.identify({ utm: { utmSource: "wechat" } });
    expect(result.isNew).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ promoCampaign: null, utmSource: "wechat" }),
    }));
  });

  it("utm + deviceFingerprint 均未命中则创建新 SourceTag", async () => {
    const create = jest.fn().mockResolvedValue({ documentId: "d3" });
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany: jest.fn().mockResolvedValue([]), create, update: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    const result = await svc.identify({ utm: { utmSource: "douyin" }, deviceFingerprint: "fp1" });
    expect(result.isNew).toBe(true);
  });

  it("deviceFingerprint 命中 30 天内记录则复用", async () => {
    const update = jest.fn().mockResolvedValue({});
    const findMany = jest.fn().mockResolvedValue([{ documentId: "d4", deviceFingerprint: "fp1" }]);
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, update, create: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    const result = await svc.identify({ deviceFingerprint: "fp1" });
    expect(result.isNew).toBe(false);
    expect(result.tag.documentId).toBe("d4");
  });
});
