import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-sso.sso-oauth-config";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByProvider(provider: string) {
    const row = await strapi.db.query(CONFIG_UID).findOne({
      where: { provider, is_enabled: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.documentId,
      provider: row.provider,
      appId: row.app_id,
      appSecret: row.app_secret,
      scope: row.scope,
      extraConfig: row.extra_config,
      redirectUris: row.redirect_uris,
      isEnabled: row.is_enabled,
    };
  },

  async list() {
    const rows = await strapi.db.query(CONFIG_UID).findMany({
      orderBy: { provider: "ASC" },
    });
    return rows;
  },

  async create(data: {
    provider: string;
    app_id: string;
    app_secret: string;
    scope?: string;
    extra_config?: any;
    redirect_uris?: string[];
    is_enabled?: boolean;
    description?: string;
  }) {
    return strapi.db.query(CONFIG_UID).create({
      data: {
        provider: data.provider,
        app_id: data.app_id,
        app_secret: data.app_secret,
        scope: data.scope || null,
        extra_config: data.extra_config || {},
        redirect_uris: data.redirect_uris || [],
        is_enabled: data.is_enabled !== undefined ? data.is_enabled : true,
        description: data.description || null,
      },
    });
  },

  async update(id: number, data: Record<string, any>) {
    return strapi.db.query(CONFIG_UID).update({ where: { id }, data });
  },

  async delete(id: number) {
    return strapi.db.query(CONFIG_UID).delete({ where: { id } });
  },
});
