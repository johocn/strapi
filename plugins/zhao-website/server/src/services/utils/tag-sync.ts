import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

export async function syncTagIndex(event: any, targetType: string): Promise<void> {
  const result = event?.result;
  if (!result || !result.documentId) return;
  const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
  if (!tagIndexService || typeof (tagIndexService as any).sync !== "function") return;

  const tagIds = Array.isArray(result.tags)
    ? result.tags.map((t: any) => t.documentId).filter(Boolean)
    : [];
  try {
    await (tagIndexService as any).sync(targetType, result.documentId, tagIds);
  } catch (err) {
    strapi.log.warn(`[zhao-website] tag-sync failed for ${targetType}`, err);
  }
}

export async function removeTagIndex(event: any, targetType: string): Promise<void> {
  const result = event?.result;
  if (!result || !result.documentId) return;
  const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
  if (!tagIndexService || typeof (tagIndexService as any).remove !== "function") return;

  try {
    await (tagIndexService as any).remove(targetType, result.documentId);
  } catch (err) {
    strapi.log.warn(`[zhao-website] tag-index remove failed for ${targetType}`, err);
  }
}
