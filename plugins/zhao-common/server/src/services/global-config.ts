import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-common.global-config";

/**
 * 全局配置服务
 * 管理跨租户的全局模块开关和租户授权列表
 * 约定：全系统仅 1 条记录，通过 findFirst 读取
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getGlobalConfig() {
    try {
      const result = await strapi.documents(UID).findFirst({});
      return result || { moduleEnabled: {}, moduleTenantGrants: {}, moduleVisibility: {} };
    } catch (e) {
      strapi.log.error("[global-config] getGlobalConfig failed:", e);
      return { moduleEnabled: {}, moduleTenantGrants: {}, moduleVisibility: {} };
    }
  },

  async updateGlobalConfig(data: {
    moduleEnabled?: Record<string, boolean>;
    moduleTenantGrants?: Record<string, string[]>;
    moduleVisibility?: Record<string, string[]>;
  }) {
    const existing = await this.getGlobalConfig();
    const documentId = existing?.documentId;

    const updateData = {
      moduleEnabled: data.moduleEnabled ?? existing.moduleEnabled ?? {},
      moduleTenantGrants: data.moduleTenantGrants ?? existing.moduleTenantGrants ?? {},
      moduleVisibility: data.moduleVisibility ?? existing.moduleVisibility ?? {},
    };

    if (documentId) {
      return await strapi.documents(UID).update({ documentId, data: updateData });
    } else {
      return await strapi.documents(UID).create({ data: updateData });
    }
  },
});
