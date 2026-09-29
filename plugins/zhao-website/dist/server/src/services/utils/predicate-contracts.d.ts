export type ObjectKind = "entity" | "value" | "citation";
export type PredicateContract = {
    objectKinds: ObjectKind[];
    /** value/text 形态的字符上限 */
    maxLength?: number;
};
export declare const PREDICATE_CONTRACTS: Record<string, Record<string, PredicateContract>>;
export declare function getPredicateContract(entityType: string, predicate: string): PredicateContract | null;
export type ObjectShape = {
    hasEntity: boolean;
    hasValue: boolean;
    hasText: boolean;
    textLength: number;
};
/**
 * 返回 null 表示通过，否则返回违规原因（中文，直接用于 400 响应文案）。
 * 契约语义：
 * - entity   ：必须给 objectEntity
 * - value    ：必须给 objectValue，或 objectText 且长度 ≤ maxLength
 * - citation ：必须给 objectEntity 或 objectValue，且必须绑定 truthPolicy
 */
export declare function validateObjectContract(entityType: string, predicate: string, shape: ObjectShape, truthPolicyId?: unknown): string | null;
