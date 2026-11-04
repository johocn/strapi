import type { Core } from "@strapi/strapi";

export const SECTION_UID = "plugin::zhao-website.section";

/**
 * 把板块过滤值解析为数字板块 id（content-api 传 slug / documentId）：
 * 数字原样返回；slug/documentId 先查 section 转 id；未命中返回 -1 短路，
 * 避免直接把字符串比对 FK 整数列触发数据库 500
 */
export async function resolveSectionFilter(
  strapi: Core.Strapi,
  siteId: number,
  section: any
): Promise<number> {
  const raw = String(section).trim();
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  const row = await strapi.db.query(SECTION_UID).findOne({
    where: {
      site: siteId,
      deletedAt: null,
      $or: [{ slug: raw }, { documentId: raw }],
    },
    select: ["id"],
  });
  return row?.id ?? -1;
}

/**
 * 取板块 slug（用于生成带板块前缀的内容 slug）；板块为空或未命中返回 null
 */
export async function getSectionSlug(
  strapi: Core.Strapi,
  siteId: number,
  section: any
): Promise<string | null> {
  if (section === undefined || section === null || section === "") return null;
  const raw = String(section).trim();
  const where: Record<string, any> = { site: siteId, deletedAt: null };
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) {
    where.id = numeric;
  } else {
    where.$or = [{ slug: raw }, { documentId: raw }];
  }
  const row = await strapi.db.query(SECTION_UID).findOne({ where, select: ["slug"] });
  return row?.slug ?? null;
}
