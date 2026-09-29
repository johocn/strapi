import healthFactory from "../../server/src/services/knowledge-health";
import { createMockStrapiWithQuery } from "../helpers/mock-strapi";

function setup(byUid: Record<string, any>) {
  const mockStrapi: any = createMockStrapiWithQuery(byUid);
  return healthFactory({ strapi: mockStrapi });
}

describe("knowledge-health.completeness", () => {
  test("统计实体缺口 / 事实缺口 / 关系违规", async () => {
    const service = setup({
      "plugin::zhao-website.knowledge-entity": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "e1", description: "d", url: "https://a", identifier: "1", sameAs: ["x"] },
          { documentId: "e2", description: "", url: "", identifier: "", sameAs: [] },
        ]),
      },
      "plugin::zhao-website.first-truth-policy": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "f1", claimKey: "k1", claimCategory: "other", canonicalSourceUrl: "https://s", canonicalSourceType: "official_site", canonicalEntity: { id: 1 } },
          { documentId: "f2", claimKey: "k2", claimCategory: "other", canonicalSourceUrl: "", canonicalSourceType: "internal", canonicalEntity: null },
        ]),
      },
      "plugin::zhao-website.knowledge-relation": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "r1", predicate: "termCode", objectText: "甲".repeat(300), subjectEntity: { entityType: "DefinedTerm" } },
          { documentId: "r2", predicate: "cites", objectEntity: { id: 2 }, truthPolicy: { id: 5 }, subjectEntity: { entityType: "Article" } },
          { documentId: "r3", predicate: "cites", objectEntity: { id: 3 }, truthPolicy: null, subjectEntity: { entityType: "Article" } },
        ]),
      },
    });

    const result = await service.completeness(1);

    expect(result.entities).toEqual({ total: 2, missingSameAs: 1, missingDescription: 1, missingUrl: 1, missingIdentifier: 1 });
    expect(result.facts).toEqual(expect.objectContaining({
      total: 2, missingSourceUrl: 1, internalSourceCount: 1, otherCategoryCount: 2, unboundCanonicalEntity: 1,
    }));
    expect(result.facts.emptyCategories).toContain("terminology_definition");
    expect(result.facts.unclassifiedOther).toHaveLength(2);
    // r1（超长文本）与 r3（citation 未绑真值）各构成 1 次契约违规
    expect(result.relations).toEqual({ total: 3, contractViolations: 2, missingTruthPolicy: 1 });
  });

  test("isCitable：有 sourceUrl 或权威来源类型", () => {
    const service = setup({});
    expect(service.isCitable({ canonicalSourceUrl: "https://x" })).toBe(true);
    expect(service.isCitable({ canonicalSourceType: "government" })).toBe(true);
    expect(service.isCitable({ canonicalSourceType: "internal" })).toBe(false);
  });
});

describe("knowledge-health.violations", () => {
  test("仅返回已登记契约的违规项，含预览", async () => {
    const service = setup({
      "plugin::zhao-website.knowledge-relation": {
        findMany: jest.fn().mockResolvedValue([
          { documentId: "r1", predicate: "termCode", objectText: "甲".repeat(300), subjectEntity: { name: "学习", entityType: "DefinedTerm" } },
          { documentId: "r2", predicate: "brand", objectText: "很长".repeat(200), subjectEntity: { name: "Joho", entityType: "Organization" } },
        ]),
      },
    });

    const rows = await service.violations(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      relationDocumentId: "r1",
      subjectEntity: "学习",
      predicate: "termCode",
    }));
    expect(rows[0].objectPreview.length).toBeLessThanOrEqual(80);
  });
});