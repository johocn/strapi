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

  test("addRelation objectText 型关系幂等：同 site+S+P+text 命中 → 不重复写入", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-a" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" }) // 谓词字典取 subject
      .mockResolvedValueOnce({ id: 77, predicate: "slogan", objectText: "让学习更简单" }); // 幂等命中

    const result = await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-a",
      predicate: "slogan",
      objectText: "让学习更简单",
    });

    expect(result).toEqual({ id: 77, predicate: "slogan", objectText: "让学习更简单" });
    expect(queryMock.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          site: 1,
          subjectEntity: 11,
          predicate: "slogan",
          objectText: "让学习更简单",
        }),
      })
    );
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

  // ===== 关系 × 真值桥接 =====
  test("addRelation 绑定 truthPolicyId → 归一为数字 id 且值命中写 verified", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-a" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" }) // 谓词字典取 subject
      .mockResolvedValueOnce({ id: 5, documentId: "truth-doc" }) // truthPolicyId 解析
      .mockResolvedValueOnce(null) // 文本型幂等查询未命中
      .mockResolvedValueOnce({
        id: 5,
        claimKey: "employee_count",
        canonicalValue: "200",
        canonicalValueType: "text",
      }); // compare 重新取真值
    // 真实 Strapi 的 create 会回填写入字段
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", objectText: "200", truthPolicy: 5 });

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-a",
      predicate: "mentions",
      objectText: "200",
      truthPolicyId: "truth-doc",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ truthPolicy: 5, objectText: "200" }) })
    );
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ verificationStatus: "verified" }),
      })
    );
  });

  test("compareRelationWithTruth 值不一致 → 写 conflict 并告警", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5,
      claimKey: "employee_count",
      canonicalValue: "200",
      canonicalValueType: "text",
    });

    const status = await service.compareRelationWithTruth({
      id: 9,
      truthPolicy: 5,
      objectText: "180",
    });

    expect(status).toBe("conflict");
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: expect.objectContaining({ verificationStatus: "conflict" }),
      })
    );
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });

  test("compareRelationWithTruth 无绑定 / 值为 objectEntity 指针 → null 且不写标记", async () => {
    const queryMock = mockStrapi.db.query();

    expect(await service.compareRelationWithTruth({ id: 9 })).toBeNull();
    expect(await service.compareRelationWithTruth({ id: 9, truthPolicy: 5, objectEntity: { id: 3 } })).toBeNull();
    expect(queryMock.update).not.toHaveBeenCalled();
  });

  test("compareRelationWithTruth 真值停用或软删 → 跳过不写标记", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);

    const status = await service.compareRelationWithTruth({ id: 9, truthPolicy: 5, objectText: "180" });

    expect(status).toBeNull();
    expect(queryMock.update).not.toHaveBeenCalled();
  });

  test("compareRelationWithTruth number 类型按数值比较（'200' 与 200 视为一致）", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5,
      claimKey: "employee_count",
      canonicalValue: "200",
      canonicalValueType: "number",
    });

    const status = await service.compareRelationWithTruth({ id: 9, truthPolicy: 5, objectValue: 200 });

    expect(status).toBe("verified");
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "verified" }) })
    );
  });

  test("compareRelationWithTruth comparisonMode=contains → 段落包含规范值即 verified", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5,
      claimKey: "domain_learning_def",
      canonicalValue: "获取知识、技能或经验的过程",
      canonicalValueType: "text",
      comparisonMode: "contains",
    });

    const status = await service.compareRelationWithTruth({
      id: 9,
      truthPolicy: 5,
      objectText: "学习是指获取知识、技能或经验的过程，贯穿人生各阶段。",
    });

    expect(status).toBe("verified");
  });

  test("compareRelationWithTruth comparisonMode=contains 但段落未出现规范值 → conflict", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5,
      claimKey: "domain_learning_def",
      canonicalValue: "获取知识、技能或经验的过程",
      canonicalValueType: "text",
      comparisonMode: "contains",
    });

    const status = await service.compareRelationWithTruth({
      id: 9,
      truthPolicy: 5,
      objectText: "学习是一种提升自我的方式。",
    });

    expect(status).toBe("conflict");
  });

  test("comparisonMode=contains 不作用于非 text 类型（number 仍全等）", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5,
      claimKey: "employee_count",
      canonicalValue: "200",
      canonicalValueType: "number",
      comparisonMode: "contains",
    });

    const status = await service.compareRelationWithTruth({ id: 9, truthPolicy: 5, objectText: "约200人" });

    expect(status).toBe("conflict");
  });

  test("updateRelation 解绑 truthPolicyId=null → 复位为 verified 且不重比", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "rel-3", truthPolicy: 5, verificationStatus: "conflict" });

    await service.updateRelation(1, "rel-3", { truthPolicyId: null });

    expect(queryMock.update).toHaveBeenCalledTimes(1);
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({
          truthPolicy: null,
          verificationStatus: "verified",
          lastVerifiedAt: null,
        }),
      })
    );
    // 解绑后无客体可比，不应再查真值
    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
  });

  test("updateRelation truthPolicyId 解析不到 → 400 TRUTH_NOT_FOUND", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 3, documentId: "rel-3" }) // 关系存在
      .mockResolvedValueOnce(null); // 真值解析失败

    await expect(
      service.updateRelation(1, "rel-3", { truthPolicyId: "missing-truth" })
    ).rejects.toMatchObject({ status: 400, code: "TRUTH_NOT_FOUND" });
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
