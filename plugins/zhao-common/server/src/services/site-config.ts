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
  domain: "",
  extraConfig: null,
};

const PUBLIC_FIELDS = [
  "siteName", "siteDescription", "seoKeywords", "seoDescription",
  "tencentMapKey", "shareTitle", "shareDescription", "icpNumber",
  "customerServiceUrl", "domain",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取站点配置，支持按 documentId 查询
   * 多租户安全：siteId 为空时不兜底，返回空配置，避免泄露其他租户数据
   */
  async getConfig(siteId?: string) {
    if (siteId) {
      const record = await strapi.documents(UID).findOne({ documentId: siteId, populate: ["channels", "template", "logo", "favicon", "shareImage"] });
      if (record) return record;
    }
    return { ...DEFAULT_CONFIG };
  },

  /**
   * 按 domain 查询站点配置
   */
  async getConfigByDomain(domain: string) {
    const records = await strapi.documents(UID).findMany({
      filters: { domain },
      populate: ["channels", "template", "logo", "favicon", "shareImage"],
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return null;
  },

  /**
   * 校验 domain 唯一性（非空时检查重复）
   */
  async _validateDomainUnique(domain: string | null | undefined, excludeDocumentId?: string) {
    if (!domain || typeof domain !== "string" || !domain.trim()) return;
    const filters: Record<string, any> = { domain };
    const records = await strapi.documents(UID).findMany({ filters });
    if (Array.isArray(records)) {
      for (const record of records) {
        if (record.documentId !== excludeDocumentId) {
          const e: any = new Error(`域名 "${domain}" 已被其他站点占用`);
          e.status = 409;
          throw e;
        }
      }
    }
  },

  /**
   * 更新站点配置
   */
  async updateConfig(documentId: string, data: any) {
    if (data.domain !== undefined) {
      await this._validateDomainUnique(data.domain, documentId);
    }
    return strapi.documents(UID).update({ documentId, data });
  },

  /**
   * 创建站点配置
   */
  async createConfig(data: any) {
    if (data.domain !== undefined) {
      await this._validateDomainUnique(data.domain);
    }
    return strapi.documents(UID).create({ data });
  },

  async deleteConfig(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },

  /**
   * 获取公开配置（不含敏感字段）
   * @deprecated 使用 config 服务的 getPublicConfig（支持模板合并）
   */
  async getPublicConfig(siteId?: string) {
    const config: any = await this.getConfig(siteId);
    const result: any = {};
    for (const key of PUBLIC_FIELDS) {
      result[key] = config[key] ?? DEFAULT_CONFIG[key];
    }
    if (config.logo) result.logo = config.logo;
    if (config.favicon) result.favicon = config.favicon;
    if (config.shareImage) result.shareImage = config.shareImage;
    return result;
  },
});
