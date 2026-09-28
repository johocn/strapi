import ftServiceFactory from "../../server/src/services/first-truth";
import { firstTruthValidate } from "../../server/src/services/utils/first-truth-validate";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("First Truth Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = ftServiceFactory({ strapi: mockStrapi });
  });

  test("create claimKey 已存在 → reject", async () => {
    const queryMock = mockStrapi.db.query();
    // findByClaimKey 返回已存在记录
    queryMock.findOne.mockResolvedValue({ id: 1, claimKey: "founding-date" });

    await expect(
      service.create(1, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2020-01-01" })
    ).rejects.toThrow("已存在");
  });

  test("create claimKey 不存在 → 调用 db.query.create", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue(null); // findByClaimKey 返回 null

    await service.create(1, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2020-01-01" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimKey: "founding-date",
          site: 1,
          verificationStatus: "verified",
        }),
      })
    );
  });

  test("verify 设置 verificationStatus: verified", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.verify(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ verificationStatus: "verified" }),
      })
    );
  });

  test("detectConflicts 同 claimKey 不同 canonicalValue → 返回 severity: error", async () => {
    const queryMock = mockStrapi.db.query();
    // 模拟两条同 claimKey 但不同 canonicalValue 的记录
    queryMock.findMany.mockResolvedValue([
      { claimKey: "revenue", canonicalValue: "100万", canonicalSourceUrl: "url1", canonicalSourceType: "official" },
      { claimKey: "revenue", canonicalValue: "200万", canonicalSourceUrl: "url2", canonicalSourceType: "report" },
    ]);

    const conflicts = await service.detectConflicts(1);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe("error");
    expect(conflicts[0].claimKey).toBe("revenue");
  });

  test("softDelete 设置 deletedAt", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.softDelete(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ deletedAt: expect.any(String) }),
      })
    );
  });

  test("_markRelatedEntitiesPending 租户实体未命中时兜底全局实体", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null) // 租户实体
      .mockResolvedValueOnce({ id: 9, documentId: "ent-9" }); // 全局实体

    await service._markRelatedEntitiesPending(1, { documentId: "ent-9" });

    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 9 }, data: { verificationStatus: "pending" } })
    );
  });

  test("_markRelatedEntitiesPending siteId=null 只查全局实体", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 9 });

    await service._markRelatedEntitiesPending(null, { documentId: "ent-9" });

    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "ent-9" }),
      })
    );
  });

  test("firstTruthValidate 命中 claim 但缺规范值 → 产出 warning 且不拦截", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { claimKey: "brand_slogan", claim: "让学习更有价值", canonicalValue: "让学习更有价值（joho.cn）", priority: 90 },
    ]);

    const result = await firstTruthValidate(1, { content: "我们的主张是让学习更有价值" });

    expect(result.hasError).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].claimKey).toBe("brand_slogan");
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });

  test("firstTruthValidate 规范值已出现 → 无 warning", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { claimKey: "brand_slogan", claim: "让学习更有价值", canonicalValue: "让学习更有价值（joho.cn）", priority: 90 },
    ]);

    const result = await firstTruthValidate(1, {
      content: "我们的主张是让学习更有价值（joho.cn），欢迎体验",
    });

    expect(result.hasError).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });
});
