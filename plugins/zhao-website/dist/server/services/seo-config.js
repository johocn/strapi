"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.seo-config";
exports.default = ({ strapi }) => ({
    /**
     * 获取或创建租户的 SEO 配置（单例）
     */
    async ensureDefault(siteId) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, deletedAt: null },
        });
        if (existing)
            return existing;
        return strapi.db.query(UID).create({
            data: {
                site: siteId,
                defaultTitle: "",
                defaultLocale: "zh-CN",
                enableSitemap: true,
                enableRobotsTxt: true,
                aiCrawlerPolicy: "allow_all",
                hreflangStrategy: "subdirectory",
            },
        });
    },
    async find(siteId) {
        return this.ensureDefault(siteId);
    },
    async get(siteId) {
        return this.find(siteId);
    },
    async update(siteId, data) {
        const existing = await this.ensureDefault(siteId);
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data,
        });
    },
    /**
     * 公开路由返回（去除验证码字段）
     */
    async findPublic(siteId) {
        const config = await this.ensureDefault(siteId);
        const { googleSiteVerification, baiduSiteVerification, bingSiteVerification, ...publicFields } = config;
        return publicFields;
    },
});
//# sourceMappingURL=seo-config.js.map