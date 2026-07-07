import ftServiceFactory from "../../server/src/services/first-truth";
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
});
