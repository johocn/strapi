import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-third.third-party-config";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findConfig(filters: Record<string, any>) {
    return strapi.documents(CONFIG_UID).findFirst({ filters });
  },

  async findConfigs(filters: Record<string, any>) {
    return strapi.documents(CONFIG_UID).findMany({ filters });
  },

  async createConfig(data: Record<string, any>) {
    return strapi.documents(CONFIG_UID).create({ data });
  },

  async updateConfig(documentId: string, data: Record<string, any>) {
    return strapi.documents(CONFIG_UID).update({ documentId, data });
  },

  async deleteConfig(documentId: string) {
    return strapi.documents(CONFIG_UID).delete({ documentId });
  },

  async findByPlatformAndAppType(platform: string, appType: string, siteId?: string) {
    const filters: Record<string, any> = { platform, appType, enabled: true };
    if (siteId) {
      filters.site = { documentId: siteId };
    }
    return strapi.documents(CONFIG_UID).findFirst({ filters });
  },
});
