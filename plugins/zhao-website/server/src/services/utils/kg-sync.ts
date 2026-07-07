import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

const ENTITY_TYPE_MAP: Record<string, string> = {
  "website-article": "Article",
  "website-product": "Product",
  "website-case": "CaseStudy",
  "website-faq": "FAQ",
  "website-tutorial": "HowTo",
};

export async function knowledgeGraphSync(targetType: string, content: any): Promise<void> {
  if (!content || !content.documentId) return;
  const kgService = strapi.plugin("zhao-website")?.service("knowledge-graph");
  if (!kgService) return;
  try {
    // 1. mainEntity 已显式关联 → 跳过派生
    if (content.mainEntity && content.mainEntity.documentId) {
      // 已有显式关联，不派生
    } else {
      // 自动创建或更新实体（幂等 upsert by refTargetType + refTargetId）
      const entityType = ENTITY_TYPE_MAP[targetType] || "CreativeWork";
      await (kgService as any).upsertEntityFromContent({
        siteId: content.site,
        entityType,
        name: content.title || content.name || content.question,
        refTargetType: targetType,
        refTargetId: content.documentId,
      });
    }

    // 2. mentionedEntities 自动建立 mentions 关系（幂等 upsert）
    if (Array.isArray(content.mentionedEntities) && content.mentionedEntities.length > 0) {
      // 需要先获取 mainEntity 的 id
      const subjectEntity = await (kgService as any).findEntityByRef({
        refTargetType: targetType,
        refTargetId: content.documentId,
      });
      if (subjectEntity) {
        for (const mentioned of content.mentionedEntities) {
          if (mentioned.documentId) {
            await (kgService as any).addRelation({
              siteId: content.site,
              subjectEntityId: subjectEntity.documentId,
              predicate: "mentions",
              objectEntityId: mentioned.documentId,
              sourceType: "derived",
            });
          }
        }
      }
    }
  } catch (err) {
    // 解耦设计：失败不阻塞业务 CT 编辑
    strapi.log.warn(`[zhao-website] kg-sync failed for ${targetType}`, err);
  }
}
