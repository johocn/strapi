import type { Core } from "@strapi/strapi";
import { isValidPredicate } from "./predicate-dictionary";
import { mapClaimToPredicate } from "./claim-predicate-map";

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
const RELATION_FIELDS: Record<string, any[]> = {
  "website-article": ["mainEntity", "mentionedEntities"],
  "website-product": ["mainEntity", "mentionedEntities"],
  "website-case": ["mainEntity", "mentionedEntities"],
  "website-faq": ["mainEntity", "mentionedEntities"],
  "website-tutorial": ["mainEntity", "mentionedEntities"],
  // truthBasis 需带出 canonicalEntity，派生关系的主体取自真值的规范实体
  "website-geo-article": ["mentionedEntities", { truthBasis: { populate: ["canonicalEntity"] } }],
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

const MAX_OBJECT_TEXT = 500;

// 保留段名：正文首个 H2 之前的引言段，无对应 H2 标题
const PREAMBLE_SECTION = "开篇";

/** 文本归一：去 HTML 标签 / 常见实体、空白压缩（保留原文标点，仅用于段落定位与存储） */
function normalizePlain(v: any): string {
  return String(v ?? "")
    // 块级闭合标签与换行折成空格，避免相邻段落粘连
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 按 H2 标题从 HTML 正文定位段落，返回去标签纯文本（截断 500 字）。
 * 段名为保留值『开篇』时取首个 H2 之前的引言段。
 * 定位失败返回 null（调用方必须 warn，不可静默）。
 */
export function extractSectionText(html: string, section: string): string | null {
  const target = normalizePlain(section);
  if (!html || !target) return null;
  const parts = String(html).split(/<h2[^>]*>/i);
  if (target === PREAMBLE_SECTION) {
    const head = normalizePlain(parts[0]);
    return head ? head.slice(0, MAX_OBJECT_TEXT) : null;
  }
  for (let i = 1; i < parts.length; i++) {
    const close = parts[i].search(/<\/h2\s*>/i);
    if (close === -1) continue;
    const heading = normalizePlain(parts[i].slice(0, close));
    if (!heading) continue;
    if (heading === target || heading.includes(target) || target.includes(heading)) {
      const body = parts[i].slice(close).replace(/<\/h2\s*>/i, "");
      const text = normalizePlain(body);
      return text ? text.slice(0, MAX_OBJECT_TEXT) : null;
    }
  }
  return null;
}

/**
 * 从 truthBasisSections 派生「表述型」知识关系：
 * 主体 = 真值 canonicalEntity，谓词 = claimKey 前缀映射，客体 = 正文段落纯文本（objectText）。
 * 写入即由 addRelation 自动与真值比对，无需额外比对入口。
 */
async function syncTruthBasisRelations(content: any, kgService: any): Promise<void> {
  const sections = Array.isArray(content.truthBasisSections) ? content.truthBasisSections : [];
  if (sections.length === 0) return;
  const truths = Array.isArray(content.truthBasis) ? content.truthBasis : [];
  if (truths.length === 0) {
    strapi.log.warn(
      `[zhao-website] kg-sync: geo-article ${content.documentId} 配置了 truthBasisSections 但未绑定 truthBasis`
    );
    return;
  }
  const truthByKey = new Map<string, any>();
  for (const t of truths) {
    if (t && t.claimKey) truthByKey.set(String(t.claimKey), t);
  }

  for (const item of sections) {
    const claimKey = item && item.claimKey ? String(item.claimKey) : "";
    const section = item && item.section ? String(item.section) : "";
    if (!claimKey || !section) continue;

    const predicate = mapClaimToPredicate(claimKey);
    if (!predicate) {
      strapi.log.warn(`[zhao-website] kg-sync: claimKey "${claimKey}" 无谓词映射，跳过`);
      continue;
    }
    const truth = truthByKey.get(claimKey);
    if (!truth) {
      strapi.log.warn(`[zhao-website] kg-sync: claimKey "${claimKey}" 未在文章 truthBasis 中找到对应真值，跳过`);
      continue;
    }
    const entity = truth.canonicalEntity;
    if (!entity || !entity.documentId) {
      strapi.log.warn(`[zhao-website] kg-sync: 真值 "${claimKey}" 未绑定 canonicalEntity，跳过`);
      continue;
    }
    if (entity.entityType && !isValidPredicate(entity.entityType, predicate)) {
      strapi.log.warn(
        `[zhao-website] kg-sync: predicate "${predicate}" 不在 ${entity.entityType} 字典中（claimKey "${claimKey}"），跳过`
      );
      continue;
    }
    const objectText = extractSectionText(content.content, section);
    if (!objectText) {
      strapi.log.warn(`[zhao-website] kg-sync: 正文未定位到段落「${section}」（claimKey "${claimKey}"），跳过`);
      continue;
    }
    await kgService.addRelation({
      siteId: content.site,
      subjectEntityId: entity.documentId,
      predicate,
      objectText,
      truthPolicyId: truth.documentId,
      sourceType: "derived",
    });
  }
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

    // 3. truthBasisSections 派生表述型关系（主体取真值 canonicalEntity）
    if (targetType === "website-geo-article") {
      await syncTruthBasisRelations(content, kgService);
    }
  } catch (err) {
    // 解耦设计：失败不阻塞业务 CT 编辑
    strapi.log.warn(`[zhao-website] kg-sync failed for ${targetType}`, err);
  }
}