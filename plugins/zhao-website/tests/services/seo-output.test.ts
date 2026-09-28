import robotsFactory from "../../server/src/services/robots";
import llmsTxtFactory from "../../server/src/services/llms-txt";
import contentFilterFactory from "../../server/src/services/content-filter";
import { createMockStrapi } from "../helpers/mock-strapi";

const SITE_URL = "https://example.com";

/**
 * 构造带按 UID 分发的 query mock：
 * byUid[uid].findMany 可传数组或 jest.fn（传 fn 便于断言 where）
 */
function setup(byUid: Record<string, { findMany?: any; findOne?: any }> = {}, services: Record<string, any> = {}) {
  const mockStrapi: any = createMockStrapi({ getModel: jest.fn().mockReturnValue(undefined) });
  const filterService = contentFilterFactory({ strapi: mockStrapi });
  const registry: Record<string, any> = {
    "content-filter": filterService,
    "seo-config": { get: jest.fn().mockResolvedValue({}) },
    "brand-info": { get: jest.fn().mockResolvedValue({}) },
    "first-truth": { find: jest.fn().mockResolvedValue([]) },
    ...services,
  };
  mockStrapi.plugin = jest.fn().mockReturnValue({
    service: jest.fn((name: string) => registry[name] || {}),
  });
  mockStrapi.db.query = jest.fn((uid: string) => {
    const cfg = byUid[uid] || {};
    return {
      findMany: typeof cfg.findMany === "function" ? cfg.findMany : jest.fn().mockResolvedValue(cfg.findMany || []),
      findOne: jest.fn().mockResolvedValue(cfg.findOne ?? null),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
  });
  return { mockStrapi, filterService, registry };
}

describe("robots 服务", () => {
  test("放行本插件 GEO 出口，且输出以换行结尾", async () => {
    const { mockStrapi } = setup({}, { "seo-config": { get: jest.fn().mockResolvedValue({ enableRobotsTxt: true }) } });
    const txt = await robotsFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("Allow: /api/zhao-website/v1/");
    expect(txt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    // Disallow: /api 仍在，靠更长路径的 Allow 覆盖（robots 规范最长匹配优先）
    expect(txt).toContain("Disallow: /api");
    expect(txt.endsWith("\n")).toBe(true);
  });

  test("block_all 策略逐个 AI 爬虫禁止", async () => {
    const { mockStrapi } = setup({}, {
      "seo-config": { get: jest.fn().mockResolvedValue({ enableRobotsTxt: true, aiCrawlerPolicy: "block_all" }) },
    });
    const txt = await robotsFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("User-agent: GPTBot\nDisallow: /");
    expect(txt).toContain("User-agent: ClaudeBot\nDisallow: /");
  });

  test("关闭 robots 时全站禁止", async () => {
    const { mockStrapi } = setup({}, { "seo-config": { get: jest.fn().mockResolvedValue({ enableRobotsTxt: false }) } });
    const txt = await robotsFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toBe("User-agent: *\nDisallow: /");
  });
});

describe("llms.txt 服务", () => {
  test("标题逐级兜底到 site-config.siteName（不再退化成 Website）", async () => {
    const { mockStrapi } = setup({
      "plugin::zhao-common.site-config": { findOne: { id: 1, siteName: "joho.cn" } },
    });
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt.startsWith("# joho.cn")).toBe(true);
  });

  test("brandInfo.companyName 优先于兜底值", async () => {
    const { mockStrapi } = setup(
      { "plugin::zhao-common.site-config": { findOne: { id: 1, siteName: "joho.cn" } } },
      { "brand-info": { get: jest.fn().mockResolvedValue({ companyName: "Joho 教育" }) } }
    );
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt.startsWith("# Joho 教育")).toBe(true);
  });

  test("Pages 按 type 分节收录 geo-article", async () => {
    const { mockStrapi } = setup({
      "plugin::zhao-website.geo-article": {
        findMany: [
          { type: "geo-faq", slug: "career-learning-faq", title: "职业规划常见问题", metaDescription: "问答摘要" },
          { type: "geo-article", slug: "learning-guide", title: "学习指南", metaDescription: "" },
        ],
      },
    });
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("### geo-faq");
    expect(txt).toContain(`- [职业规划常见问题](${SITE_URL}/geo-faq/career-learning-faq): 问答摘要`);
    expect(txt).toContain(`- [学习指南](${SITE_URL}/geo-article/learning-guide): `);
  });

  test("Knowledge Graph 段：排除派生实体，列出实体页与机器可读出口", async () => {
    const entitiesQuery = jest.fn().mockResolvedValue([
      { name: "学习", slug: "learning", description: "获取知识的过程" },
      { name: "派生遗留", slug: "" },
    ]);
    const { mockStrapi } = setup({
      "plugin::zhao-website.knowledge-entity": { findMany: entitiesQuery },
    });
    const txt = await llmsTxtFactory({ strapi: mockStrapi }).generate(1, SITE_URL);

    expect(txt).toContain("## Knowledge Graph");
    expect(txt).toContain(`- [学习](${SITE_URL}/knowledge/learning): 获取知识的过程`);
    // 空 slug 的遗留派生实体不进 llms.txt
    expect(txt).not.toContain("/knowledge/):");
    expect(txt).not.toContain("派生遗留");
    expect(txt).toContain(`- Graph: ${SITE_URL}/api/zhao-website/v1/knowledge-graph.json`);
    expect(txt).toContain(`- Facts: ${SITE_URL}/api/zhao-website/v1/facts.json`);

    // 查询侧必须带 sourceType 过滤，避免派生实体外泄
    expect(entitiesQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, status: "published", sourceType: { $ne: "derived" } }),
      })
    );
  });
});