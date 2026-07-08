const ENTITY_TYPE_MAP = {
  "website-article": "Article",
  "website-product": "Product",
  "website-case": "CaseStudy",
  "website-faq": "FAQ",
  "website-tutorial": "HowTo"
};
async function knowledgeGraphSync(targetType, content) {
  if (!content || !content.documentId) return;
  const kgService = strapi.plugin("zhao-website")?.service("knowledge-graph");
  if (!kgService) return;
  try {
    if (content.mainEntity && content.mainEntity.documentId) {
    } else {
      const entityType = ENTITY_TYPE_MAP[targetType] || "CreativeWork";
      await kgService.upsertEntityFromContent({
        siteId: content.site,
        entityType,
        name: content.title || content.name || content.question,
        refTargetType: targetType,
        refTargetId: content.documentId
      });
    }
    if (Array.isArray(content.mentionedEntities) && content.mentionedEntities.length > 0) {
      const subjectEntity = await kgService.findEntityByRef({
        refTargetType: targetType,
        refTargetId: content.documentId
      });
      if (subjectEntity) {
        for (const mentioned of content.mentionedEntities) {
          if (mentioned.documentId) {
            await kgService.addRelation({
              siteId: content.site,
              subjectEntityId: subjectEntity.documentId,
              predicate: "mentions",
              objectEntityId: mentioned.documentId,
              sourceType: "derived"
            });
          }
        }
      }
    }
  } catch (err) {
    strapi.log.warn(`[zhao-website] kg-sync failed for ${targetType}`, err);
  }
}
export {
  knowledgeGraphSync
};
