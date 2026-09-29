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
export declare function firstTruthValidate(siteId: number, content: {
    title?: string;
    excerpt?: string;
    content?: string;
    description?: string;
}): Promise<ValidationResult>;
//# sourceMappingURL=first-truth-validate.d.ts.map