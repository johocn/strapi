// 谓词客体契约：约束「某个 entityType 的某个谓词，允许什么形态的客体」。
// 与 PREDICATE_DICTIONARY 同级；已登记契约 → 严格校验，未登记 → 放行（调用方负责 warn）。
export type ObjectKind = "entity" | "value" | "citation";

export type PredicateContract = {
  objectKinds: ObjectKind[];
  /** value/text 形态的字符上限 */
  maxLength?: number;
};

export const PREDICATE_CONTRACTS: Record<string, Record<string, PredicateContract>> = {
  Organization: {
    slogan: { objectKinds: ["value"], maxLength: 200 },
    keywords: { objectKinds: ["value"], maxLength: 200 },
    url: { objectKinds: ["value"], maxLength: 500 },
    sameAs: { objectKinds: ["value"], maxLength: 500 },
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  DefinedTerm: {
    termCode: { objectKinds: ["value"], maxLength: 60 },
    sameAs: { objectKinds: ["value"], maxLength: 500 },
    inDefinedTermSet: { objectKinds: ["entity"] },
  },
  Service: {
    serviceType: { objectKinds: ["value"], maxLength: 100 },
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  Place: {
    areaServed: { objectKinds: ["entity", "value"], maxLength: 100 },
  },
  Article: {
    cites: { objectKinds: ["citation"] },
  },
  CreativeWork: {
    cites: { objectKinds: ["citation"] },
  },
};

export function getPredicateContract(entityType: string, predicate: string): PredicateContract | null {
  return PREDICATE_CONTRACTS[entityType]?.[predicate] ?? null;
}

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
export function validateObjectContract(
  entityType: string,
  predicate: string,
  shape: ObjectShape,
  truthPolicyId?: unknown
): string | null {
  const contract = getPredicateContract(entityType, predicate);
  if (!contract) return null;

  const kinds = contract.objectKinds;
  const allowsEntity = kinds.includes("entity");
  const allowsValue = kinds.includes("value");
  const allowsCitation = kinds.includes("citation");

  const entityOk = shape.hasEntity && (allowsEntity || allowsCitation);
  const valueOk = shape.hasValue && (allowsValue || allowsCitation);
  const textOk =
    shape.hasText &&
    (allowsValue || allowsCitation) &&
    (!contract.maxLength || shape.textLength <= contract.maxLength);

  if (!entityOk && !valueOk && !textOk) {
    if (shape.hasText && contract.maxLength && shape.textLength > contract.maxLength) {
      return `objectText 长度 ${shape.textLength} 超出上限 ${contract.maxLength}`;
    }
    return `客体形态不符合契约（允许：${kinds.join("/")}）`;
  }
  if (allowsCitation && !truthPolicyId) {
    return "citation 谓词必须绑定 truthPolicy";
  }
  return null;
}