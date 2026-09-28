/**
 * claimKey → 谓词。未命中任何前缀返回 null（调用方必须 warn 后跳过，不可静默）。
 */
export declare function mapClaimToPredicate(claimKey: string): string | null;
