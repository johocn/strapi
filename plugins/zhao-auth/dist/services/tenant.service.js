"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SITE_CONFIG_UID = "plugin::zhao-common.site-config";
exports.default = ({ strapi }) => ({
    async getMyTenants(userId, roles) {
        // admin 返回全部租户
        if (roles.includes("admin")) {
            const all = await strapi.db.query(SITE_CONFIG_UID).findMany({
                select: ["id", "documentId", "siteName", "domain"],
                limit: 1000,
            });
            return all.map((s) => ({
                id: s.id,
                documentId: s.documentId,
                name: s.siteName,
                domain: s.domain,
            }));
        }
        // 非 admin：复用 channel-permission 获取用户全部渠道（含角色继承与缓存）
        let channelIds = [];
        try {
            const channelPermission = strapi
                .plugin("zhao-channel")
                .service("channel-permission");
            const userChannels = await channelPermission.getUserAllChannels(userId);
            channelIds = (userChannels || []).filter((id) => typeof id === "number");
        }
        catch (e) {
            strapi.log.warn(`[tenant] failed to get user channels: ${e?.message || e}`);
        }
        if (channelIds.length === 0)
            return [];
        // 查 zhao_channels_sites_lnk 关联表获取租户数字 id
        const links = await strapi.db
            .connection("zhao_channels_sites_lnk")
            .whereIn("channel_id", channelIds)
            .select("site_config_id");
        const siteIds = [
            ...new Set(links.map((l) => l.site_config_id)),
        ].filter(Boolean);
        if (siteIds.length === 0)
            return [];
        // 查 site-config 表获取租户详情
        const sites = await strapi.db.query(SITE_CONFIG_UID).findMany({
            where: { id: { $in: siteIds } },
            select: ["id", "documentId", "siteName", "domain"],
        });
        return sites.map((s) => ({
            id: s.id,
            documentId: s.documentId,
            name: s.siteName,
            domain: s.domain,
        }));
    },
});
