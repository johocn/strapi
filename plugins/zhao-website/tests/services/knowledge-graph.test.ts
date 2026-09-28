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
    // 归一化后 subject/object 需解析为不同数字 id，才不会被自引用校验先拦下
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-a" ? 1 : 2));
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

  test("addRelation 写入与幂等查询统一使用数字 id", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-a" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" }) // 谓词字典取 subject
      .mockResolvedValueOnce(null); // 幂等查询未命中

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-a",
      predicate: "mentions",
      objectEntityId: "doc-b",
    });

    expect(queryMock.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          site: 1,
          subjectEntity: 11,
          predicate: "mentions",
          objectEntity: 22,
        }),
      })
    );
    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subjectEntity: 11, objectEntity: 22 }),
      })
    );
  });

  test("addRelation 幂等命中 → 不重复写入", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-a" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" })
      .mockResolvedValueOnce({ id: 77, predicate: "mentions" });

    const result = await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-a",
      predicate: "mentions",
      objectEntityId: "doc-b",
    });

    expect(result).toEqual({ id: 77, predicate: "mentions" });
    expect(queryMock.create).not.toHaveBeenCalled();
  });

  test("addRelation subject 解析不到 → 400 ENTITY_NOT_FOUND", async () => {
    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "missing",
        predicate: "mentions",
        objectText: "x",
      })
    ).rejects.toMatchObject({ status: 400, code: "ENTITY_NOT_FOUND" });
  });

  test("_entityToJsonLd 同谓词多值合并为数组", () => {
    const jsonLd = service._entityToJsonLd(
      { documentId: "doc-a", name: "A", entityType: "Article", slug: "a" },
      [
        { predicate: "mentions", objectEntity: { slug: "b", documentId: "doc-b" } },
        { predicate: "mentions", objectEntity: { slug: "c", documentId: "doc-c" } },
        { predicate: "keywords", objectText: "k1" },
      ]
    );

    expect(Array.isArray(jsonLd.mentions)).toBe(true);
    expect(jsonLd.mentions).toHaveLength(2);
    expect(jsonLd.keywords).toBe("k1");
  });

  test("verifyAll 按实体数字 id 查询冲突真值并置实体为 conflict", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([{ id: 7, documentId: "doc-7" }]) // 实体
      .mockResolvedValueOnce([{ id: 1 }]); // 冲突真值

    const result = await service.verifyAll(1);

    expect(result.conflicts).toBe(1);
    expect(queryMock.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          $or: expect.arrayContaining([expect.objectContaining({ canonicalEntity: 7 })]),
        }),
      })
    );
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: { verificationStatus: "conflict" } })
    );
  });

  test("disambiguate 按 name+type 查询，返回 { entity, confidence }", async () => {
    const queryMock = mockStrapi.db.query();
    // 模拟精确匹配
    queryMock.findMany.mockResolvedValue([{ name: "Entity A", entityType: "Organization", documentId: "doc-a" }]);

    const result = await service.disambiguate(1, { name: "Entity A", entityType: "Organization" });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ site: 1, name: { $containsi: "Entity A" }, entityType: "Organization" }),
            expect.objectContaining({ site: null, name: { $containsi: "Entity A" }, entityType: "Organization" }),
          ]),
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
