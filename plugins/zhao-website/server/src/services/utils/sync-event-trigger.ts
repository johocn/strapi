export async function triggerSyncEvent(contentType: string, content: any): Promise<void> {
  const strapi = (global as any).strapi;
  if (!strapi) return;
  if (!content || !content.documentId) return;
  const studioUrl = strapi.plugin("zhao-website")?.config("studioUrl") || "http://localhost:1337/api/zhao-studio";
  const internalKey = strapi.plugin("zhao-website")?.config("internalKey") || "";
  try {
    await fetch(`${studioUrl}/v1/webhooks/sync-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
      body: JSON.stringify({
        sourceContentType: contentType,
        sourceDocumentId: content.documentId,
        sourceUrl: content.slug ? `/articles/${content.slug}` : "",
        sourceTitle: content.title || content.name || "",
        siteId: content.site,
        content: content.content || content.description || "",
      }),
    });
  } catch (err) {
    strapi.log.warn(`[sync-event-trigger] Failed to trigger sync event: ${err}`);
  }
}