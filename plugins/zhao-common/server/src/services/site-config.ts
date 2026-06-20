import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-common.site-config";

const DEFAULT_CONFIG = {
  siteName: "",
  siteDescription: "",
  seoKeywords: "",
  seoDescription: "",
  tencentMapKey: "",
  shareTitle: "",
  shareDescription: "",
  customerServiceUrl: "",
  icpNumber: "",
  extraConfig: null,
};

// 公开接口返回的字段（不含敏感信息）
const PUBLIC_FIELDS = [
  "siteName", "siteDescription", "seoKeywords", "seoDescription",
  "tencentMapKey", "shareTitle", "shareDescription", "icpNumber",
  "customerServiceUrl",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取站点配置（管理员），无记录则返回默认值
   */
  async getConfig() {
    const records = await strapi.documents(UID).findMany({ populate: "*" });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return { ...DEFAULT_CONFIG };
  },

  /**
   * 更新站点配置（单例：有则更新，无则创建）
   */
  async updateConfig(data: any) {
    const records = await strapi.documents(UID).findMany({ populate: "*" });
    if (Array.isArray(records) && records.length > 0) {
      return strapi.documents(UID).update({ documentId: records[0].documentId, data });
    }
    return strapi.documents(UID).create({ data });
  },

  /**
   * 获取公开配置（不含敏感字段）
   */
  async getPublicConfig() {
    const config: any = await this.getConfig();
    const result: any = {};
    for (const key of PUBLIC_FIELDS) {
      result[key] = config[key] ?? DEFAULT_CONFIG[key];
    }
    // 媒体字段单独处理
    if (config.logo) result.logo = config.logo;
    if (config.favicon) result.favicon = config.favicon;
    if (config.shareImage) result.shareImage = config.shareImage;
    return result;
  },
});
