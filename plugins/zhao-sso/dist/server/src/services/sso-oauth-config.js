"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CONFIG_UID = "plugin::zhao-sso.sso-oauth-config";
exports.default = ({ strapi }) => ({
    async findByProvider(provider) {
        const row = await strapi.db.query(CONFIG_UID).findOne({
            where: { provider, is_enabled: true },
        });
        if (!row)
            return null;
        return {
            id: row.id,
            documentId: row.documentId,
            name: row.name,
            provider: row.provider,
            appType: row.app_type,
            appId: row.app_id,
            appSecret: row.app_secret,
            scope: row.scope,
            extraConfig: row.extra_config,
            redirectUris: row.redirect_uris,
            isEnabled: row.is_enabled,
        };
    },
    async findByProviderAndAppType(provider, appType) {
        const row = await strapi.db.query(CONFIG_UID).findOne({
            where: { provider, app_type: appType, is_enabled: true },
        });
        if (!row)
            return null;
        return {
            id: row.id,
            documentId: row.documentId,
            name: row.name,
            provider: row.provider,
            appType: row.app_type,
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
    async create(data) {
        return strapi.db.query(CONFIG_UID).create({
            data: {
                name: data.name,
                provider: data.provider,
                app_type: data.app_type || "default",
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
    async update(id, data) {
        return strapi.db.query(CONFIG_UID).update({ where: { id }, data });
    },
    async delete(id) {
        return strapi.db.query(CONFIG_UID).delete({ where: { id } });
    },
});
