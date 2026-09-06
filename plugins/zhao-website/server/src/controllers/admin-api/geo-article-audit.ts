import { auditGeoArticle } from "../../services/utils/geo-article-audit";

const UID = "plugin::zhao-website.geo-article";
const POPULATE = ["truthBasis", "mentionedEntities", "author"];

export default {
  async check(ctx: any) {
    const { documentId } = ctx.params;
    const siteId = ctx.state.siteId;
    const doc = await strapi.db.query(UID).findOne({
      where: { documentId, site: siteId, deletedAt: null },
      populate: POPULATE,
    });
    if (!doc) return ctx.notFound("GeoArticle not found");

    const audit = auditGeoArticle({
      type: doc.type,
      title: doc.title,
      content: doc.content,
      faqQuestion: doc.faqQuestion,
      comparisonData: doc.comparisonData,
      listItems: doc.listItems,
      summaryPoints: doc.summaryPoints,
      localTips: doc.localTips,
      infoBoundary: doc.infoBoundary,
      sourceName: doc.sourceName,
      sourceUrl: doc.sourceUrl,
      truthBasis: doc.truthBasis,
      mentionedEntities: doc.mentionedEntities,
      author: doc.author,
      authorName: doc.authorName,
      jsonLdType: doc.jsonLdType,
      businessData: doc.businessData,
      ctaType: doc.ctaType,
      leadFormEnabled: doc.leadFormEnabled,
      riskType: doc.riskType,
      reviewChecks: doc.reviewChecks,
      reviewerName: doc.reviewerName,
      reviewedAt: doc.reviewedAt,
    });

    const total = audit.missing.length;
    const passedCount = audit.missing.filter((m) => m.passed).length;
    ctx.body = {
      documentId,
      status: doc.status,
      pass: audit.pass,
      score: total === 0 ? 1 : Math.round((passedCount / total) * 100) / 100,
      checks: audit.missing,
    };
  },
};
