import type { Core } from "@strapi/strapi";

/**
 * 生成 slug（基于 title），并校验在租户内唯一（含软删除排除）
 */
export async function generateUniqueSlug(
  strapi: Core.Strapi,
  uid: string,
  siteId: number,
  title: string,
  excludeDocumentId?: string
): Promise<string> {
  const base = slugify(title);
  if (!base) {
    return `item-${Date.now()}`;
  }
  let candidate = base;
  let suffix = 1;
  // 最多重试 10 次
  while (suffix < 10) {
    const existing = await strapi.db.query(uid).findOne({
      where: {
        site: siteId,
        slug: candidate,
        deletedAt: null,
        ...(excludeDocumentId ? { documentId: { $ne: excludeDocumentId } } : {}),
      },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
