import { knowledgeGraphSync, extractSectionText } from "../../server/src/services/utils/kg-sync";
import { mapClaimToPredicate } from "../../server/src/services/utils/claim-predicate-map";
import { createMockStrapi } from "../helpers/mock-strapi";

const HTML = [
  "<p>「一技傍身，吃遍天下」的时代正在过去。学习是指获取知识、技能或经验的过程。</p>",
  "<h2>一、引言</h2><p>无关内容</p>",
  "<h2>二、长期学习规划四步法</h2><p>学习是指<b>获取知识</b>、技能或经验的过程，贯穿人生各阶段。</p>",
  "<h2>三、结语</h2><p>无关内容</p>",
].join("");

function makeKgStub() {
  return {
    upsertEntityFromContent: jest.fn().mockResolvedValue(undefined),
    findEntityByRef: jest.fn().mockResolvedValue(null),
    addRelation: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

function makeContent(overrides: Record<string, any> = {}) {
  return {
    documentId: "geo-1",
    site: 1,
    content: HTML,
    mentionedEntities: [],
    truthBasisSections: [{ claimKey: "domain_learning_def", section: "二、长期学习规划四步法" }],
    truthBasis: [
      {
        documentId: "truth-1",
        claimKey: "domain_learning_def",
        canonicalEntity: { documentId: "ent-1", entityType: "DefinedTerm" },
      },
    ],
    ...overrides,
  };
}

describe("claim-predicate-map", () => {
  test("按 claimKey 前缀映射谓词", () => {
    expect(mapClaimToPredicate("domain_learning_def")).toBe("termCode");
    expect(mapClaimToPredicate("core_domain_ai")).toBe("termCode");
    expect(mapClaimToPredicate("brand_slogan_main")).toBe("slogan");
    expect(mapClaimToPredicate("core_keywords_2026")).toBe("keywords");
    expect(mapClaimToPredicate("brand_domain_official")).toBe("url");
    expect(mapClaimToPredicate("area_served_changchun")).toBe("areaServed");
    expect(mapClaimToPredicate("platform_positioning_app")).toBe("serviceType");
    expect(mapClaimToPredicate("service_scope_local")).toBe("serviceType");
  });

  test("未匹配前缀 / 空值 → null", () => {
    expect(mapClaimToPredicate("unknown_claim")).toBeNull();
    expect(mapClaimToPredicate("")).toBeNull();
    expect(mapClaimToPredicate(undefined as any)).toBeNull();
  });
});

describe("extractSectionText", () => {
  test("按 H2 标题定位段落并去标签", () => {
    const text = extractSectionText(HTML, "二、长期学习规划四步法");
    expect(text).toBe("学习是指获取知识、技能或经验的过程，贯穿人生各阶段。");
  });

  test("标题带序号差异时按包含匹配", () => {
    expect(extractSectionText(HTML, "长期学习规划四步法")).toContain("学习是指获取知识");
  });

  test("定位失败返回 null", () => {
    expect(extractSectionText(HTML, "不存在的段落")).toBeNull();
    expect(extractSectionText("", "任意")).toBeNull();
  });

  test("保留段名『开篇』取首个 H2 之前的引言段", () => {
    const text = extractSectionText(HTML, "开篇");
    expect(text).toBe("「一技傍身，吃遍天下」的时代正在过去。学习是指获取知识、技能或经验的过程。");
  });

  test("纯文本截断至 500 字", () => {
    const long = "甲".repeat(800);
    const text = extractSectionText(`<h2>标题</h2><p>${long}</p>`, "标题");
    expect(text).not.toBeNull();
    expect(text!.length).toBe(500);
  });
});

describe("knowledgeGraphSync 引用型派生", () => {
  let kgStub: any;

  beforeEach(() => {
    kgStub = makeKgStub();
    kgStub.upsertEntityFromContent = jest.fn().mockResolvedValue({ id: 9, documentId: "art-1" });
    createMockStrapi({
      plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(kgStub) }),
    });
  });

  test("geo-article：主体=文章派生实体，谓词=cites，客体=规范实体，段落进 evidenceText", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    expect(kgStub.addRelation).toHaveBeenCalledTimes(1);
    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 1,
        subjectEntityId: "art-1",
        predicate: "cites",
        objectEntityId: "ent-1",
        truthPolicyId: "truth-1",
        evidenceText: "学习是指获取知识、技能或经验的过程，贯穿人生各阶段。",
        sourceType: "derived",
      })
    );
  });

  test("段落文本不得进入属性谓词值域（反向用例）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    const call = kgStub.addRelation.mock.calls[0][0];
    expect(["slogan", "keywords", "termCode", "sameAs"]).not.toContain(call.predicate);
    expect(call.objectText).toBeUndefined();
    expect(call.evidenceText).toBeDefined();
  });

  test("真值无 canonicalEntity → 客体降级为 objectValue（规范值）", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasis: [
          { documentId: "truth-2", claimKey: "domain_learning_def", canonicalValue: "获取知识的过程" },
        ],
      })
    );

    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: "cites", objectValue: "获取知识的过程" })
    );
    expect(kgStub.addRelation.mock.calls[0][0].objectEntityId).toBeUndefined();
  });

  test("section='开篇' → 取引言段作为 evidenceText", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasisSections: [{ claimKey: "domain_learning_def", section: "开篇" }],
        truthBasis: [
          { documentId: "truth-13", claimKey: "domain_learning_def", canonicalEntity: { documentId: "ent-13", entityType: "DefinedTerm" } },
        ],
      })
    );

    expect(kgStub.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectEntityId: "art-1",
        predicate: "cites",
        objectEntityId: "ent-13",
        evidenceText: "「一技傍身，吃遍天下」的时代正在过去。学习是指获取知识、技能或经验的过程。",
      })
    );
  });

  test("正文未定位到段落 → warn 且不写入", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({ truthBasisSections: [{ claimKey: "domain_learning_def", section: "不存在的段落" }] })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("claimKey 未在文章 truthBasis 中找到对应真值 → warn 跳过", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasisSections: [{ claimKey: "unknown_claim", section: "一、引言" }],
        truthBasis: [
          { documentId: "truth-9", claimKey: "other_claim", canonicalEntity: { documentId: "ent-9", entityType: "Organization" } },
        ],
      })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("真值既无 canonicalEntity 也无 canonicalValue → warn 跳过", async () => {
    await knowledgeGraphSync(
      "website-geo-article",
      makeContent({
        truthBasis: [{ documentId: "truth-3", claimKey: "domain_learning_def", canonicalValue: "" }],
      })
    );

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("有 truthBasisSections 但未绑定 truthBasis → warn 且不写入", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ truthBasis: [] }));

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("geo-article 回查 populate 使用对象形式（混合数组会被 Strapi 拒绝）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent());

    const queryFn = (global as any).strapi.db.query as jest.Mock;
    const returnedQuery = queryFn.mock.results[0].value;
    expect(returnedQuery.findOne).toHaveBeenCalled();
    const args = returnedQuery.findOne.mock.calls[0][0];
    expect(Array.isArray(args.populate)).toBe(false);
    expect(args.populate).toEqual({
      mentionedEntities: true,
      site: true,
      truthBasis: { populate: ["canonicalEntity"] },
    });
  });

  test("派生实体 upsert 时带上内容 slug（中文标题自动生成会为空串）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ slug: "career-lifelong-learning-plan" }));

    expect(kgStub.upsertEntityFromContent).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 1,
        slug: "career-lifelong-learning-plan",
        refTargetType: "website-geo-article",
      })
    );
  });

  test("缺少 site → warn 且不派生（siteId 为写入必需）", async () => {
    await knowledgeGraphSync("website-geo-article", makeContent({ site: undefined }));

    expect(kgStub.addRelation).not.toHaveBeenCalled();
    expect(kgStub.upsertEntityFromContent).not.toHaveBeenCalled();
    expect((global as any).strapi.log.warn).toHaveBeenCalled();
  });

  test("非 geo-article 不触发引用派生", async () => {
    await knowledgeGraphSync("website-article", makeContent());

    expect(kgStub.addRelation).not.toHaveBeenCalled();
  });
});