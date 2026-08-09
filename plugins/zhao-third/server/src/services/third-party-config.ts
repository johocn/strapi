import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-third.third-party-config";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findConfig(filters: Record<string, any>) {
    return strapi.documents(CONFIG_UID).findFirst({ filters });
  },

  async findConfigs(filters: Record<string, any>) {
    return strapi.documents(CONFIG_UID).findMany({ filters });
  },

  /**
   * 按站点 documentId 查询所有关联的三方配置（用 knex 避免 Strapi v5 Document Service manyToOne 过滤不稳定）
   * 返回全字段（含 token/encodingAESKey/merchantId），供管理后台 list 接口使用
   */
  async findConfigsBySite(siteDocumentId: string) {
    const knex = strapi.db.connection;

    // 1. site-config documentId → id
    const siteRow = await knex("zhao_site_configs")
      .select("id")
      .where("document_id", siteDocumentId)
      .first();
    if (!siteRow) return [];

    // 2. 通过关联表查所有 third_party_config_id
    const linkRows = await knex("third_party_configs_site_lnk")
      .select("third_party_config_id")
      .where("site_config_id", siteRow.id);

    if (!linkRows || linkRows.length === 0) return [];

    const configIds = linkRows.map((r: any) => r.third_party_config_id);

    // 3. 查 third_party_configs 全字段（用 SELECT * 避免列名 snake_case 转换歧义）
    const rows = await knex("third_party_configs")
      .select("*")
      .whereIn("id", configIds)
      .orderBy("id", "asc");

    // 返回 camelCase 字段名（与 Document Service 返回格式一致）
    // 用 Strapi 内置的列名映射工具避免手写 snake_case
    return rows.map((row: any) => {
      // Strapi v5 snake_case → camelCase 映射
      const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const mapped: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        mapped[toCamel(k)] = v;
      }
      return {
        id: mapped.id,
        documentId: mapped.documentId,
        name: mapped.name,
        platform: mapped.platform,
        appType: mapped.appType,
        appId: mapped.appId,
        appSecret: mapped.appSecret,
        token: mapped.token,
        encodingAESKey: mapped.encodingAesKey ?? mapped.encodingAEsKey ?? mapped.encodingAESKey,
        merchantId: mapped.merchantId,
        enabled: mapped.enabled,
      };
    });
  },

  /**
   * 重复性校验：同一站点下不允许存在相同 platform+appType 的配置
   * @param excludeDocumentId 更新时排除当前记录的 documentId
   * @returns 已存在的冲突记录，null 表示无冲突
   */
  async checkDuplicate(platform: string, appType: string, siteDocumentId: string, excludeDocumentId?: string) {
    const knex = strapi.db.connection;

    // 1. site-config documentId → id
    const siteRow = await knex("zhao_site_configs")
      .select("id")
      .where("document_id", siteDocumentId)
      .first();
    if (!siteRow) return null;

    // 2. 通过关联表查所有 third_party_config_id
    const linkRows = await knex("third_party_configs_site_lnk")
      .select("third_party_config_id")
      .where("site_config_id", siteRow.id);

    if (!linkRows || linkRows.length === 0) return null;

    const configIds = linkRows.map((r: any) => r.third_party_config_id);

    // 3. 查是否有同 platform+appType 的记录
    const query = knex("third_party_configs")
      .select("id", "document_id", "name", "platform", "app_type")
      .whereIn("id", configIds)
      .where("platform", platform)
      .where("app_type", appType);

    if (excludeDocumentId) {
      query.whereNot("document_id", excludeDocumentId);
    }

    const conflict = await query.first();
    return conflict || null;
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
    // 注意：此函数仅用于登录授权流程，只需 appId/appSecret 等基础字段
    // token/encodingAESKey/merchantId 等扩展字段通过 Document Service 读取（list/get 接口）
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
