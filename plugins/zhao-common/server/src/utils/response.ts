/**
 * Strapi v5 标准 content-api 响应包装工具
 *
 * 单条: { data, meta }
 * 列表: { data, meta: { pagination } }
 */

/** 包装单条数据 */
export function wrap(data: any, meta: any = {}) {
  return { data, meta };
}

/** 包装列表数据，自动提取 results/pagination */
export function wrapList(result: any) {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
}
