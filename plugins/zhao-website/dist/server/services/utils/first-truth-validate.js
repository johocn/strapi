"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstTruthValidate = firstTruthValidate;
/**
 * 扫描内容文本，对比 first-truth-policy。
 *
 * 诚实说明：当前只实现一条**可判定**规则 ——
 *   正文原样引用了某条真值的 claim，却未出现其 canonicalValue（规范表述）
 *   → 记一条 warning 并输出日志。
 *
 * 矛盾值拦截（error 级、priority>=80 阻止发布）需要真值提供"禁用值/替代值"清单，
 * 而 first-truth-policy 目前没有该字段，因此 hasError 恒为 false，发布拦截行为不变。
 * 待 forbiddenValues 字段落地后再启用 error 级。
 */
async function firstTruthValidate(siteId, content) {
    const fullText = [content.title, content.excerpt, content.content, content.description]
        .filter(Boolean)
        .join("\n");
    if (!fullText) {
        return { hasError: false, conflicts: [] };
    }
    // 查询当前租户所有启用的真值
    const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { site: siteId, deletedAt: null, status: true },
    });
    const conflicts = [];
    for (const truth of truths) {
        if (!truth.claim || !fullText.includes(truth.claim))
            continue;
        const canonical = truth.canonicalValue ? String(truth.canonicalValue) : "";
        // 引用了真值原句但没给出规范值 → 表述可能偏离第一真值
        if (canonical && !fullText.includes(canonical)) {
            conflicts.push({
                claimKey: truth.claimKey,
                claim: truth.claim,
                expectedValue: canonical,
                actualValue: "",
                priority: truth.priority ?? 0,
            });
        }
    }
    for (const c of conflicts) {
        strapi.log.warn(`[first-truth] 正文引用真值「${c.claimKey}」但未出现规范值「${c.expectedValue}」（priority=${c.priority}）`);
    }
    return { hasError: false, conflicts };
}
//# sourceMappingURL=first-truth-validate.js.map