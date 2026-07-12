import kgServiceFactory from "../../server/src/services/knowledge-graph";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Graph Global Layer", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = kgServiceFactory({ strapi: mockStrapi });
  });

  test("findEntities uses $or to merge global and tenant entities", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, name: "Global AI", site: null },
      { id: 2, name: "Tenant AI", site: 1 },
    ]);

    const result = await service.findEntities(1, {});

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

  test("findEntityBySlug returns tenant entity first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, name: "Global AI", slug: "ai", site: null });

    const result = await service.findEntityBySlug(1, "ai");

    expect(result).toEqual({ id: 1, name: "Global AI", slug: "ai", site: null });
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
    expect(queryMock.findOne).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, slug: "ai" }),
      })
    );
    expect(queryMock.findOne).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        where: expect.objectContaining({ site: null, slug: "ai" }),
      })
    );
  });

  test("findEntityBySlug returns tenant entity when both exist", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 2, name: "Tenant AI", slug: "ai", site: 1 });

    const result = await service.findEntityBySlug(1, "ai");

    expect(result.name).toBe("Tenant AI");
    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
  });

  test("createEntity with null siteId creates global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Global", site: null });

    const result = await service.createEntity(null, { name: "Global", entityType: "Organization" });

    expect(result.site).toBeNull();
    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Global", site: null }),
      })
    );
  });

  test("updateEntity with null siteId updates global entity only", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.updateEntity(null, "doc-5", { name: "Updated" });

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("updateEntity with siteId does not match global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);

    await expect(service.updateEntity(1, "global-doc", { name: "X" })).rejects.toThrow("Entity not found");
  });

  test("deleteEntity with null siteId deletes global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.deleteEntity(null, "doc-5");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("disambiguate merges global and tenant candidates", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, name: "AI Global", site: null },
      { id: 2, name: "AI Tenant", site: 1 },
    ]);

    const result = await service.disambiguate(1, { name: "AI" });

    expect(result).toBeTruthy();
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ site: 1 }),
            expect.objectContaining({ site: null }),
          ]),
        }),
      })
    );
  });

  test("exportGraph merges global and tenant entities", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([{ id: 1, name: "Global", site: null, entityType: "Organization", slug: "global", status: true }])
      .mockResolvedValueOnce([]);

    const result = await service.exportGraph(1);

    expect(result["@graph"]).toHaveLength(1);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ site: 1 }),
            expect.objectContaining({ site: null }),
          ]),
        }),
      })
    );
  });

  test("exportFacts merges global and tenant truths", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1 },
    ]);

    const result = await service.exportFacts(1);

    expect(result).toHaveLength(2);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ site: 1 }),
            expect.objectContaining({ site: null }),
          ]),
        }),
      })
    );
  });
});
