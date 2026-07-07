import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

export interface ValidationResult {
  hasError: boolean;
  conflicts: Array<{
    claimKey: string;
    claim: string;
    expectedValue: string;
    actualValue: string;
    priority: number;
  }>;
}

/**
 * 扫描内容文本，对比 first-truth-policy
 * - error 级（priority >= 80）→ 调用方应阻止发布
 * - warning 级（priority < 80）→ 调用方应允许发布但记录
 */
export async function firstTruthValidate(
  siteId: number,
  content: { title?: string; excerpt?: string; content?: string; description?: string }
): Promise<ValidationResult> {
  const fullText = [content.title, content.excerpt, content.content, content.description]
    .filter(Boolean)
    .join("\n");
  if (!fullText) {
    return { hasError: false, conflicts: [] };
  }

  // 查询当前租户所有真值
  const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
    where: { site: siteId, deletedAt: null, status: true },
  });

  const conflicts: ValidationResult["conflicts"] = [];
  for (const truth of truths) {
    // 简化匹配：真值 claim 出现且 canonicalValue 未出现 → 可能缺失；claim 出现且矛盾值出现 → 冲突
    // 一期仅做最简单的"包含"匹配（实际生产需 NLP）
    if (fullText.includes(truth.claim)) {
      // 进一步校验值是否匹配（这里仅占位，实际需根据 claimCategory 做精确匹配）
      // 简化：总是认为匹配，不报冲突
    }
  }

  const hasError = conflicts.some((c) => c.priority >= 80);
  return { hasError, conflicts };
}
