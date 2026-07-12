import ftServiceFactory from "../../server/src/services/first-truth";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("First Truth Global Layer", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = ftServiceFactory({ strapi: mockStrapi });
  });

  test("find merges global and tenant truths", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1 },
    ]);

    const result = await service.find(1, {});

    expect(result).toHaveLength(2);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null },
            { site: null, deletedAt: null },
          ],
        }),
      })
    );
  });

  test("findOne returns tenant first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, documentId: "doc-1", site: null });

    const result = await service.findOne(1, "doc-1");

    expect(result.site).toBeNull();
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
  });

  test("findOne returns tenant when both exist", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 2, documentId: "doc-1", site: 1 });

    const result = await service.findOne(1, "doc-1");

    expect(result.site).toBe(1);
    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
  });

  test("findByClaimKey returns tenant first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, claimKey: "founding_year", site: null });

    const result = await service.findByClaimKey(1, "founding_year");

    expect(result.site).toBeNull();
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
  });

  test("create with null siteId creates global truth", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", site: null });

    const result = await service.create(null, { claimKey: "founding_year", claim: "Founding Year", canonicalValue: "2010" });

    expect(result.site).toBeNull();
    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ site: null, claimKey: "founding_year" }),
      })
    );
  });

  test("update with null siteId updates global truth only", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null, canonicalValue: "2010" });

    await service.update(null, "doc-5", { canonicalValue: "2011" });

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("detectConflicts merges global and tenant truths for cross-layer detection", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null, status: true },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1, status: true },
    ]);

    const result = await service.detectConflicts(1);

    expect(result).toHaveLength(1);
    expect(result[0].claimKey).toBe("founding_year");
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null, status: true },
            { site: null, deletedAt: null, status: true },
          ],
        }),
      })
    );
  });

  test("verify with null siteId verifies global truth", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.verify(null, "doc-5");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });
});
