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
    // 无 siteId 时按平台类型查第一条
    if (!siteId) {
      return strapi.documents(CONFIG_UID).findFirst({
        filters: { platform, appType, enabled: true },
      });
    }

    // 有 siteId 时完全用 knex 查询（Strapi v5 Document Service 的 filters.id 和 manyToOne 关联过滤均不稳定）
    // 链路：site-config.documentId → site-config.id → third_party_configs_site_lnk.site_config_id
    //      → third_party_config_id → third_party_configs 记录
    const knex = strapi.db.connection;

    // 1. site-config documentId → id
    const siteRow = await knex("zhao_site_configs")
      .select("id")
      .where("document_id", siteId)
      .first();
    if (!siteRow) return null;

    // 2. 通过关联表查 third_party_config_id
    const linkRow = await knex("third_party_configs_site_lnk")
      .select("third_party_config_id")
      .where("site_config_id", siteRow.id)
      .first();
    if (!linkRow) return null;

    // 3. 直接用 knex 查 third_party_configs 表（只取已发布记录）
    const row = await knex("third_party_configs")
      .select("id", "document_id", "name", "platform", "app_type", "app_id", "app_secret", "enabled")
      .where("id", linkRow.third_party_config_id)
      .where("platform", platform)
      .where("app_type", appType)
      .where("enabled", true)
      .whereNotNull("published_at")
      .first();

    if (!row) return null;

    // 返回 camelCase 字段名（与 Document Service 返回格式一致）
    return {
      id: row.id,
      documentId: row.document_id,
      name: row.name,
      platform: row.platform,
      appType: row.app_type,
      appId: row.app_id,
      appSecret: row.app_secret,
      enabled: row.enabled,
    };
  },
});
