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

  test("exportGraph 实体查询排除派生实体（不进公开图谱）", async () => {
    const queryMock = mockStrapi.db.query();

    await service.exportGraph(1);

    const where = queryMock.findMany.mock.calls[0][0].where;
    for (const branch of where.$or) {
      expect(branch).toEqual(expect.objectContaining({ sourceType: { $ne: "derived" } }));
    }
  });

  test("upsertEntityFromContent 创建实体时显式写入 slug（中文标题自动生成为空串）", async () => {
    const queryMock = mockStrapi.db.query();

    await service.upsertEntityFromContent({
      siteId: 1,
      entityType: "Article",
      name: "职业没有一劳永逸：吉林职场人长期学习规划四步法",
      slug: "career-lifelong-learning-plan",
      refTargetType: "website-geo-article",
      refTargetId: "doc-9",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "career-lifelong-learning-plan", sourceType: "derived" }),
      })
    );
  });

  test("upsertEntityFromContent 缺 slug 时按 refTargetType-refTargetId 兜底", async () => {
    const queryMock = mockStrapi.db.query();

    await service.upsertEntityFromContent({
      siteId: 1,
      entityType: "Article",
      name: "中文标题",
      refTargetType: "website-geo-article",
      refTargetId: "doc-9",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "website-geo-article-doc-9" }) })
    );
  });

  test("upsertEntityFromContent 已有 slug 时不覆盖，空 slug 时补写", async () => {
    const queryMock = mockStrapi.db.query();

    queryMock.findOne.mockResolvedValueOnce({ id: 5, slug: "keep-me" });
    await service.upsertEntityFromContent({
      siteId: 1, entityType: "DefinedTerm", name: "教育", slug: "education",
      refTargetType: "website-geo-article", refTargetId: "doc-9",
    });
    expect(queryMock.update.mock.calls[0][0].data.slug).toBeUndefined();

    queryMock.findOne.mockResolvedValueOnce({ id: 21, slug: "" });
    await service.upsertEntityFromContent({
      siteId: 1, entityType: "Article", name: "中文标题", slug: "career-plan",
      refTargetType: "website-geo-article", refTargetId: "doc-9",
    });
    expect(queryMock.update.mock.calls[1][0].data.slug).toBe("career-plan");
  });

  test("findEntityBySlug 排除派生实体（不对外提供实体页）", async () => {
    const queryMock = mockStrapi.db.query();

    await service.findEntityBySlug(1, "career-plan");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slug: "career-plan", sourceType: { $ne: "derived" } }),
      })
    );
  });

  test("createEntity 写 create 流水并带操作人", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "A", version: 1 });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.createEntity(1, { name: "A", entityType: "Organization" }, { id: 7, label: "alice" });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "entity", targetId: "doc-1", action: "create", strict: false,
        actor: { id: 7, label: "alice" },
      })
    );
  });

  test("updateEntity version 递增且 diff 只含变更字段", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", name: "A", version: 2 });
    queryMock.update.mockResolvedValueOnce({ id: 3, version: 3 });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.updateEntity(1, "doc-3", { name: "B" }, { id: 7, label: "alice" });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ name: "B", version: 3 }) })
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update", version: 3,
        changedFields: { name: { before: "A", after: "B" } },
      })
    );
  });

  test("deleteEntity 写 delete 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3" });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.deleteEntity(1, "doc-3", { id: 7, label: "alice" });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "entity", targetId: "doc-3", action: "delete" })
    );
  });

  test("compareRelationWithTruth 状态变化才写 recheck 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5, claimKey: "k", canonicalValue: "200", canonicalValueType: "text",
    });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.compareRelationWithTruth({
      id: 9, documentId: "rel-9", site: 1, truthPolicy: 5, objectText: "180", verificationStatus: "verified",
    });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "relation", targetId: "rel-9", action: "recheck", actorLabel: "system" })
    );
    expect(audit.append.mock.calls[0][0].actor).toBeNull();
  });

  test("compareRelationWithTruth 状态未变 → 不写流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5, claimKey: "k", canonicalValue: "200", canonicalValueType: "text",
    });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.compareRelationWithTruth({
      id: 9, documentId: "rel-9", site: 1, truthPolicy: 5, objectText: "200", verificationStatus: "verified",
    });

    expect(audit.append).not.toHaveBeenCalled();
  });

  test("findEntityBySlug 排除 rejected 实体", async () => {
    const queryMock = mockStrapi.db.query();

    await service.findEntityBySlug(1, "career-plan");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verificationStatus: { $ne: "rejected" } }),
      })
    );
  });

  test("exportFacts 每条带 version", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { claimKey: "k", claim: "c", canonicalValue: "v", canonicalValueType: "text", verificationStatus: "verified", version: 4 },
      { claimKey: "k2", claim: "c2", canonicalValue: "v2", canonicalValueType: "text", verificationStatus: "verified", version: null },
    ]);

    const facts = await service.exportFacts(1);

    expect(facts[0].version).toBe(4);
    expect(facts[1].version).toBe(1);
  });

  test("_entityToJsonLd 输出 version 与 dateModified", () => {
    const jsonLd = service._entityToJsonLd({
      documentId: "doc-a", name: "A", entityType: "Organization", slug: "a",
      version: 3, updatedAt: "2026-09-29T00:00:00.000Z",
    });

    expect(jsonLd.version).toBe(3);
    expect(jsonLd.dateModified).toBe("2026-09-29T00:00:00.000Z");
  });

  test("addRelation 契约违规（termCode 挂超长文本）→ 400 RELATION_OBJECT_CONTRACT_VIOLATION", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-term" ? 11 : null));
    mockStrapi.db.query().findOne.mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" });

    await expect(
      service.addRelation({
        siteId: 1,
        subjectEntityId: "doc-term",
        predicate: "termCode",
        objectText: "甲".repeat(300),
      })
    ).rejects.toMatchObject({ status: 400, code: "RELATION_OBJECT_CONTRACT_VIOLATION" });
  });

  test("addRelation 契约通过（termCode 短文本）→ 正常写入", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-term" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-term",
      predicate: "termCode",
      objectText: "职业教育",
    });

    expect(queryMock.create).toHaveBeenCalled();
  });

  test("addRelation 未登记契约的字典谓词 → 仅告警不拒绝", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-org" ? 11 : null));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Organization" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-org",
      predicate: "brand",
      objectText: "Joho",
    });

    expect(queryMock.create).toHaveBeenCalled();
    expect(mockStrapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("contractUnregistered"));
  });

  test("updateRelation 改谓词触发契约校验违规 → 400", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 3, documentId: "rel-3", subjectEntity: 11, predicate: "mentions", objectText: "甲".repeat(300) }) // 关系存在（客体为超长文本）
      .mockResolvedValueOnce({ id: 11, entityType: "DefinedTerm" }); // 主体实体

    await expect(
      service.updateRelation(1, "rel-3", { predicate: "termCode" })
    ).rejects.toMatchObject({ status: 400, code: "RELATION_OBJECT_CONTRACT_VIOLATION" });
  });

  test("addRelation 带 evidenceText → 落库但不进公开出口字段", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-article" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Article" }) // subject
      .mockResolvedValueOnce({ id: 5, documentId: "truth-doc" }) // truth
      .mockResolvedValueOnce(null); // 幂等查询未命中

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-article",
      predicate: "cites",
      objectEntityId: "doc-canonical",
      truthPolicyId: "truth-doc",
      evidenceText: "学习是指获取知识、技能或经验的过程。",
      sourceType: "derived",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceText: "学习是指获取知识、技能或经验的过程。",
          truthPolicy: 5,
        }),
      })
    );
  });

  test("addRelation 绑定 truthPolicy → 幂等键为 site+S+P+truthPolicy（非文本）", async () => {
    service._resolveEntityId = jest.fn(async (ref: any) => (ref === "doc-article" ? 11 : 22));
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce({ id: 11, entityType: "Article" })
      .mockResolvedValueOnce({ id: 5, documentId: "truth-doc" })
      .mockResolvedValueOnce(null);

    await service.addRelation({
      siteId: 1,
      subjectEntityId: "doc-article",
      predicate: "cites",
      objectEntityId: "doc-canonical",
      truthPolicyId: "truth-doc",
      evidenceText: "段落",
      sourceType: "derived",
    });

    expect(queryMock.findOne).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, subjectEntity: 11, predicate: "cites", truthPolicy: 5 }),
      })
    );
  });

  test("_entityToJsonLd 隔离契约违规关系（termCode 挂超长文本不进输出）", () => {
    const jsonLd = service._entityToJsonLd(
      { documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning" },
      [
        { predicate: "termCode", objectText: "甲".repeat(300) },
        { predicate: "termCode", objectText: "职业教育" },
      ]
    );

    expect(jsonLd.termCode).toBe("职业教育");
  });

  test("_entityToJsonLd 未登记契约的关系照常输出", () => {
    const jsonLd = service._entityToJsonLd(
      { documentId: "doc-a", name: "A", entityType: "Organization", slug: "a" },
      [{ predicate: "brand", objectText: "任意长文本".repeat(50) }]
    );

    expect(jsonLd.brand).toBeDefined();
  });

  test("exportEntity 的 outgoing/incoming 不输出契约违规关系", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-org", name: "Joho", entityType: "Organization", slug: "joho-cn",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([
        { documentId: "rel-1", predicate: "slogan", objectText: "让学习更简单" },
        { documentId: "rel-2", predicate: "slogan", objectText: "长".repeat(300) },
      ]) // outgoing
      .mockResolvedValueOnce([]); // incoming

    const result = await service.exportEntity(1, "joho-cn");

    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0].objectText).toBe("让学习更简单");
  });

  test("exportGraph 过滤 rejected 实体（与另两个出口口径统一）", async () => {
    const queryMock = mockStrapi.db.query();

    await service.exportGraph(1);

    const where = queryMock.findMany.mock.calls[0][0].where;
    for (const branch of where.$or) {
      expect(branch).toEqual(expect.objectContaining({ verificationStatus: { $ne: "rejected" } }));
    }
  });

  test("exportGraph 节点 @id 为绝对 URL", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 1, domain: "www.joho.cn" }); // site-config
    queryMock.findMany
      .mockResolvedValueOnce([{ documentId: "doc-a", name: "A", entityType: "Organization", slug: "ent-a" }])
      .mockResolvedValueOnce([]);

    const result = await service.exportGraph(1);

    expect(result["@graph"][0]["@id"]).toBe("https://www.joho.cn/knowledge/ent-a");
  });

  test("exportGraph 传入 siteUrl 时 @id 绝对化（site-config.domain 缺失也能兜底）", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null); // site-config.domain 缺失
    queryMock.findMany
      .mockResolvedValueOnce([{ documentId: "doc-a", name: "A", entityType: "Organization", slug: "ent-a" }])
      .mockResolvedValueOnce([]);

    const result = await service.exportGraph(1, "www.joho.cn");

    expect(result["@graph"][0]["@id"]).toBe("https://www.joho.cn/knowledge/ent-a");
  });

  test("节点输出补 verificationStatus / confidence / lastVerifiedAt", () => {
    const jsonLd = service._entityToJsonLd({
      documentId: "doc-a", name: "A", entityType: "Organization", slug: "a",
      verificationStatus: "pending", confidence: 0.8, lastVerifiedAt: "2026-09-01T00:00:00.000Z",
    });

    expect(jsonLd.verificationStatus).toBe("pending");
    expect(jsonLd.confidence).toBe(0.8);
    expect(jsonLd.lastVerifiedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  test("无 siteUrl 时 @id 回退为 slug（单测/后台导出不受影响）", () => {
    const jsonLd = service._entityToJsonLd({ documentId: "doc-a", name: "A", entityType: "Organization", slug: "a" });
    expect(jsonLd["@id"]).toBe("a");
  });

  test("_entityToJsonLd 输出 sameAs（json 列原样透出给 AI 侧）", () => {
    const jsonLd = service._entityToJsonLd({
      documentId: "doc-term", name: "教育", entityType: "DefinedTerm", slug: "education",
      sameAs: ["https://www.wikidata.org/wiki/Q8434", "https://zh.wikipedia.org/wiki/教育"],
    });

    expect(jsonLd.sameAs).toEqual([
      "https://www.wikidata.org/wiki/Q8434",
      "https://zh.wikipedia.org/wiki/教育",
    ]);
  });

  test("无 sameAs 时不输出该字段", () => {
    const jsonLd = service._entityToJsonLd({ documentId: "doc-a", name: "A", entityType: "Organization", slug: "a" });

    expect(jsonLd.sameAs).toBeUndefined();
  });

  test("exportEntity 输出 subjectOf 指向解释文章（绝对 URL）", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([
      { slug: "career-learning", title: "长期学习规划", type: "geo-article" },
    ]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.exportEntity(1, "learning");

    expect(result.subjectOf).toEqual([
      { "@type": "Article", "@id": "https://www.joho.cn/geo-article/career-learning", name: "长期学习规划" },
    ]);
  });

  test("exportEntity 传入 siteUrl 时 @id 与 subjectOf 绝对化（site-config.domain 缺失也能兜底）", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([
      { slug: "career-learning", title: "长期学习规划", type: "geo-article" },
    ]);
    mockStrapi.db.query().findMany.mockResolvedValue([]);

    const result = await service.exportEntity(1, "learning", "www.joho.cn");

    expect(result["@id"]).toBe("https://www.joho.cn/knowledge/learning");
    expect(result.subjectOf[0]["@id"]).toBe("https://www.joho.cn/geo-article/career-learning");
  });

  test("无解释文章时不输出 subjectOf", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-term", name: "学习", entityType: "DefinedTerm", slug: "learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    mockStrapi.db.query().findMany.mockResolvedValue([]);

    const result = await service.exportEntity(1, "learning");

    expect(result.subjectOf).toBeUndefined();
  });

  test("_dedupeCitations 同 truthPolicy 仅保留最新一条", () => {
    const kept = service._dedupeCitations([
      { id: 1, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "旧" },
      { id: 2, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-09-01T00:00:00.000Z", objectValue: "新" },
      { id: 3, predicate: "cites", truthPolicy: { documentId: "t2" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "另一真值" },
      { id: 4, predicate: "mentions", objectEntity: { id: 9 } },
    ]);

    expect(kept.filter((r: any) => r.predicate === "cites")).toHaveLength(2);
    expect(kept.some((r: any) => r.id === 2)).toBe(true);
    expect(kept.some((r: any) => r.id === 1)).toBe(false);
    expect(kept.some((r: any) => r.predicate === "mentions")).toBe(true);
  });

  test("exportEntity 的 outgoing 对 cites 限流", async () => {
    service.findEntityBySlug = jest.fn().mockResolvedValue({
      id: 1, documentId: "doc-art", name: "文章", entityType: "Article", slug: "career-learning",
    });
    service._resolveEntityId = jest.fn().mockResolvedValue(1);
    service.findArticlesByEntity = jest.fn().mockResolvedValue([]);
    service._resolveSiteUrl = jest.fn().mockResolvedValue("https://www.joho.cn");
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([
        { id: 1, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-01-01T00:00:00.000Z", objectValue: "旧" },
        { id: 2, predicate: "cites", truthPolicy: { documentId: "t1" }, updatedAt: "2026-09-01T00:00:00.000Z", objectValue: "新" },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.exportEntity(1, "career-learning");

    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0].objectValue).toBe("新");
  });
});
