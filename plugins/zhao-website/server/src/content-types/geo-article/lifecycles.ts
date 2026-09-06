import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import { auditGeoArticle } from "../../services/utils/geo-article-audit";

const UID = "plugin::zhao-website.geo-article";
const ApplicationError = errors.ApplicationError;

const POPULATE = ["truthBasis", "mentionedEntities", "author"];

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

    if (!audit.pass) {
      throw new ApplicationError("发布未达标：请补齐以下缺漏项", {
        code: "GEO_AUDIT_FAIL",
        missing: audit.missing.filter((m) => !m.passed),
      });
    }
  },
});
