// claimKey 前缀 → 谓词映射：把「表述型真值」绑定到知识图谱关系的谓词上。
// 谓词必须落在 predicate-dictionary 中对应 entityType 的列表内，
// 派生时由调用方用 isValidPredicate(canonicalEntity.entityType, predicate) 二次校验。
const CLAIM_PREDICATE_RULES: Array<{ prefix: string; predicate: string }> = [
  { prefix: "core_domain_", predicate: "termCode" }, // DefinedTerm.termCode
  { prefix: "domain_", predicate: "termCode" }, // domain_*_def
  { prefix: "brand_slogan_", predicate: "slogan" }, // Organization.slogan
  { prefix: "core_keywords_", predicate: "keywords" }, // Organization.keywords
  { prefix: "brand_domain_", predicate: "sameAs" }, // Organization.sameAs
  { prefix: "area_served_", predicate: "areaServed" }, // Place / Service.areaServed
  { prefix: "platform_positioning_", predicate: "serviceType" }, // Service.serviceType
  { prefix: "service_scope_", predicate: "serviceType" }, // Service.serviceType
];

/**
 * claimKey → 谓词。未命中任何前缀返回 null（调用方必须 warn 后跳过，不可静默）。
 */
export function mapClaimToPredicate(claimKey: string): string | null {
  const key = String(claimKey ?? "").trim();
  if (!key) return null;
  for (const rule of CLAIM_PREDICATE_RULES) {
    if (key.startsWith(rule.prefix)) return rule.predicate;
  }
  return null;
}