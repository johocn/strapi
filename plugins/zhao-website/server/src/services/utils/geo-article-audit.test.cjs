const { test } = require("node:test");
const assert = require("node:assert/strict");
const { auditGeoArticle } = require("./.build/geo-article-audit.cjs");

const PASSING = {
  type: "local-report",
  title: "吉林市近视手术医院怎么选",
  content: "本报告基于官方公开数据，请理性看待手术风险",
  faqQuestion: "",
  summaryPoints: "1. 公立私立均可做",
  localTips: "建议预约工作日上午",
  infoBoundary: "数据基于公开信息整理",
  sourceName: "吉林省卫健委",
  sourceUrl: "https://example.gov.cn",
  truthBasis: [{ claim: "数据以官方为准" }],
  mentionedEntities: [{ name: "XX眼科" }],
  authorName: "张医生",
  jsonLdType: "Article",
  businessData: [{ period: "2026年1-6月", content: "1200 台", caliber: "卫健委口径" }],
  ctaType: "consult-appointment",
  riskType: "health",
  reviewChecks: { eaat: true, tech: true, compliance: true, business: true },
  reviewerName: "李审核",
  reviewedAt: "2026-07-02",
};

test("达标文章 pass=true 且无缺漏", () => {
  const r = auditGeoArticle(PASSING);
  assert.equal(r.pass, true);
  assert.equal(r.missing.filter((m) => !m.passed).length, 0);
});

test("缺核心模块与 E-E-A-T 返回 error 缺漏", () => {
  const r = auditGeoArticle({ ...PASSING, summaryPoints: "", localTips: "", infoBoundary: "", truthBasis: [], mentionedEntities: [], sourceName: "", sourceUrl: "" });
  assert.equal(r.pass, false);
  const failed = r.missing.filter((m) => !m.passed);
  assert.ok(failed.some((m) => m.group === "核心模块"));
  assert.ok(failed.some((m) => m.group === "E-E-A-T"));
});

test("选型专属字段缺失被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, type: "local-list", listItems: [] });
  assert.equal(r.pass, false);
  assert.ok(r.missing.some((m) => m.field === "listItems" && !m.passed));
});

test("jsonLdType 与类型不匹配被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, type: "geo-faq", jsonLdType: "Article", faqQuestion: "吉林近视手术安全吗？" });
  assert.ok(r.missing.some((m) => m.field === "jsonLdType" && !m.passed));
});

test("标题无地域词被拦截", () => {
  const r = auditGeoArticle({ ...PASSING, title: "近视手术医院怎么选" });
  assert.ok(r.missing.some((m) => m.field === "title" && !m.passed));
});

test("正文金融关键词未覆盖风险类型 → warning", () => {
  const r = auditGeoArticle({ ...PASSING, content: "本产品预期收益率约 5%", riskType: "health" });
  assert.ok(r.missing.some((m) => m.group === "合规" && m.level === "warning" && !m.passed));
});
