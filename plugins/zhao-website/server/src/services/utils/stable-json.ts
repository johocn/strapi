/** JSON 稳定序列化：对象键排序，保证键序不同不误判为差异 */
export function stableJson(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
    .join(",")}}`;
}

/** diff 忽略的字段：主键/时间戳/派生字段，无审计价值 */
const IGNORED_DIFF_KEYS = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "lastVerifiedAt",
  "version",
]);

/** 字段级 diff：只返回真正发生变化的字段 { 字段: { before, after } } */
export function diffFields(before: any, after: any): Record<string, { before: any; after: any }> {
  const a = before && typeof before === "object" ? before : {};
  const b = after && typeof after === "object" ? after : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, { before: any; after: any }> = {};
  for (const k of keys) {
    if (IGNORED_DIFF_KEYS.has(k)) continue;
    const av = a[k] ?? null;
    const bv = b[k] ?? null;
    if (stableJson(av) === stableJson(bv)) continue;
    out[k] = { before: av, after: bv };
  }
  return out;
}