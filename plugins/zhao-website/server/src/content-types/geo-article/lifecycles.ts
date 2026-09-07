import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import { auditGeoArticle } from "../../services/utils/geo-article-audit";

const UID = "plugin::zhao-website.geo-article";
const ApplicationError = errors.ApplicationError;

const POPULATE = ["truthBasis", "mentionedEntities", "author"];

function assertAuditPass(audit: { pass: boolean; missing: { passed: boolean }[] }) {
  if (!audit.pass) {
    throw new ApplicationError("发布未达标：请补齐以下缺漏项", {
      code: "GEO_AUDIT_FAIL",
      missing: audit.missing.filter((m) => !m.passed),
    });
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    // 仅在"转为 published"时校验；已发布文章再次保存不拦截
    if (!data || data.status !== "published") return;
    const existing = await strapi.db.query(UID).findOne({ where, populate: POPULATE });
    if (!existing || existing.status === "published") return;

    const merged = { ...existing, ...data };
    const audit = auditGeoArticle({
      type: merged.type,
      title: merged.title,
      content: merged.content,
      faqQuestion: merged.faqQuestion,
      comparisonData: merged.comparisonData,
      listItems: merged.listItems,
      summaryPoints: merged.summaryPoints,
      localTips: merged.localTips,
      infoBoundary: merged.infoBoundary,
      sourceName: merged.sourceName,
      sourceUrl: merged.sourceUrl,
      truthBasis: merged.truthBasis,
      mentionedEntities: merged.mentionedEntities,
      author: merged.author,
      authorName: merged.authorName,
      jsonLdType: merged.jsonLdType,
      businessData: merged.businessData,
      ctaType: merged.ctaType,
      leadFormEnabled: merged.leadFormEnabled,
      riskType: merged.riskType,
      reviewChecks: merged.reviewChecks,
      reviewerName: merged.reviewerName,
      reviewedAt: merged.reviewedAt,
    });

    assertAuditPass(audit);
  },

  async beforeCreate(event: any) {
    const { data } = event.params;
    // 仅在"创建即发布"时校验（服务层已强制非 published，此为内容管理器 UI 旁路的第二道防线）
    if (!data || data.status !== "published") return;
    // auditGeoArticle 只判 truthBasis/mentionedEntities 非空数组、author truthy，id 数组可直接通过
    assertAuditPass(
      auditGeoArticle({
        type: data.type,
        title: data.title,
        content: data.content,
        faqQuestion: data.faqQuestion,
        comparisonData: data.comparisonData,
        listItems: data.listItems,
        summaryPoints: data.summaryPoints,
        localTips: data.localTips,
        infoBoundary: data.infoBoundary,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        truthBasis: Array.isArray(data.truthBasis) ? data.truthBasis : data.truthBasis ? [data.truthBasis] : [],
        mentionedEntities: Array.isArray(data.mentionedEntities) ? data.mentionedEntities : data.mentionedEntities ? [data.mentionedEntities] : [],
        author: data.author,
        authorName: data.authorName,
        jsonLdType: data.jsonLdType,
        businessData: data.businessData,
        ctaType: data.ctaType,
        leadFormEnabled: data.leadFormEnabled,
        riskType: data.riskType,
        reviewChecks: data.reviewChecks,
        reviewerName: data.reviewerName,
        reviewedAt: data.reviewedAt,
      })
    );
  },
});
