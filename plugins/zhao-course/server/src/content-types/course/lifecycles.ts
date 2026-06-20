import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const syncTagIndex = async (event: any) => {
    const { result } = event;
    if (!result?.documentId) return;

    const tagIds = (result.tags || [])
      .map((t: any) => t?.documentId)
      .filter(Boolean);

    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.sync("course", result.documentId, tagIds);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to sync tag-index for course ${result.documentId}: ${err}`);
    }
  };

  const removeTagIndex = async (event: any) => {
    const { result } = event;
    if (!result?.documentId) return;

    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.remove("course", result.documentId);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to remove tag-index for course ${result.documentId}: ${err}`);
    }
  };

  return {
    async afterCreate(event) {
      await syncTagIndex(event);
    },
    async afterUpdate(event) {
      await syncTagIndex(event);
    },
    async afterDelete(event) {
      await removeTagIndex(event);
    },
  };
};
