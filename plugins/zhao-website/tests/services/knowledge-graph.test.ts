import kgServiceFactory from "../../server/src/services/knowledge-graph";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Graph Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = kgServiceFactory({ strapi: mockStrapi });
  });

  test("createEntity 调用 db.query.create 并传入 siteId", async () => {
    const queryMock = mockStrapi.db.query();

    await service.createEntity(1, { name: "Entity A", entityType: "Organization", slug: "ent-a" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Entity A",
          entityType: "Organization",
          site: 1,
        }),
      })
    );
  });

  test("addRelation 自引用 → reject Self-relation", async () => {
    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "parent",
        objectEntityId: "doc-a",
      })
    ).rejects.toThrow("Self-relation");
  });

  test("addRelation objectEntityId + objectValue 同时存在 → reject 互斥", async () => {
    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "hasValue",
        objectEntityId: "doc-b",
        objectValue: 42,
      })
    ).rejects.toThrow("互斥");
  });

  test("addRelation 层级关系循环 → reject 循环引用", async () => {
    // mock _detectCycle 返回 true
    service._detectCycle = jest.fn().mockResolvedValue(true);

    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-a",
        predicate: "parent", // parent 在 HIERARCHICAL_PREDICATES 中
        objectEntityId: "doc-b",
      })
    ).rejects.toThrow("循环引用");
  });

  test("disambiguate 按 name+type 查询，返回 { entity, confidence }", async () => {
    const queryMock = mockStrapi.db.query();
    // 模拟精确匹配
    queryMock.findMany.mockResolvedValue([{ name: "Entity A", entityType: "Organization", documentId: "doc-a" }]);

    const result = await service.disambiguate(1, { name: "Entity A", entityType: "Organization" });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          site: 1,
          name: { $containsi: "Entity A" },
          entityType: "Organization",
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({
      entity: expect.objectContaining({ name: "Entity A" }),
      confidence: 1.0,
    }));
  });

  test("exportGraph 返回 JSON-LD { @context, @graph } 结构", async () => {
    const queryMock = mockStrapi.db.query();
    // 第一次调用 findMany 返回实体，第二次返回关系
    queryMock.findMany
      .mockResolvedValueOnce([{ documentId: "doc-a", name: "A", entityType: "Organization", slug: "ent-a" }])
      .mockResolvedValueOnce([
        { documentId: "rel-1", subjectEntity: { id: 1, documentId: "doc-a" }, predicate: "parent", objectEntity: { id: 2, documentId: "doc-b" } },
      ]);

    const result = await service.exportGraph(1);

    expect(result).toHaveProperty("@context", "https://schema.org");
    expect(result).toHaveProperty("@graph");
    expect(Array.isArray(result["@graph"])).toBe(true);
    expect(result["@graph"].length).toBeGreaterThan(0);
  });
});
