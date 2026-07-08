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
export declare function firstTruthValidate(siteId: number, content: {
    title?: string;
    excerpt?: string;
    content?: string;
    description?: string;
}): Promise<ValidationResult>;
