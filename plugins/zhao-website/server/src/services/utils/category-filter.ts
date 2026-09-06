import type { Core } from "@strapi/strapi";

const CATEGORY_UID = "plugin::zhao-website.article-category";

/**
 * 把分类过滤值解析为数字分类 id（content-api 传的是 slug / documentId）：
 * 数字原样返回；slug/documentId 先查 article-category 转 id；未命中返回 -1 短路，
 * 避免直接把字符串比对 FK 整数列触发 SQL "invalid input syntax for type integer" 500
 */
export async function resolveCategoryFilter(
  strapi: Core.Strapi,
  siteId: number,
  category: any
): Promise<number> {
  const raw = String(category).trim();
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  const cat = await strapi.db.query(CATEGORY_UID).findOne({
    where: { site: siteId, $or: [{ slug: raw }, { documentId: raw }] },
    select: ["id"],
  });
  return cat?.id ?? -1;
}
