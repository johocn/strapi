import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

// 键必须与各 content-type lifecycles 中的 TARGET_TYPE 一致，且值必须是 knowledge-entity 枚举成员
const ENTITY_TYPE_MAP: Record<string, string> = {
  "website-article": "Article",
  "website-geo-article": "Article",
  "website-product": "Product",
  "website-case": "CaseStudy",
  "website-faq": "FAQ",
  "website-tutorial": "HowTo",
  "website-download": "CreativeWork",
  "website-compliance": "CreativeWork",
};

// 各 CT 实际具备的关系字段（只在缺失时按此 populate，避免对不存在的关系字段 populate 报错）
const RELATION_FIELDS: Record<string, string[]> = {
  "website-article": ["mainEntity", "mentionedEntities"],
  "website-product": ["mainEntity", "mentionedEntities"],
  "website-case": ["mainEntity", "mentionedEntities"],
  "website-faq": ["mainEntity", "mentionedEntities"],
  "website-tutorial": ["mainEntity", "mentionedEntities"],
  "website-geo-article": ["mentionedEntities"],
  "website-download": [],
  "website-compliance": [],
};

/**
 * 生命周期 event.result 不一定带关系数据，缺失时按 uid 回查一次。
 * 关系已存在时直接返回，不产生额外查询。
 */
async function withRelations(targetType: string, content: any): Promise<any> {
  const fields = RELATION_FIELDS[targetType] || [];
  if (fields.length === 0) return content;
  if (Array.isArray(content.mentionedEntities) && content.mainEntity !== undefined) return content;
  const uid = `plugin::zhao-website.${targetType.replace(/^website-/, "")}`;
  const full = await strapi.db.query(uid).findOne({
    where: { documentId: content.documentId },
    populate: fields,
  });
  return full ? { ...content, ...full } : content;
}

export async function knowledgeGraphSync(targetType: string, rawContent: any): Promise<void> {
  if (!rawContent || !rawContent.documentId) return;
  const kgService = strapi.plugin("zhao-website")?.service("knowledge-graph");
  if (!kgService) return;
  try {
    const content = await withRelations(targetType, rawContent);

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