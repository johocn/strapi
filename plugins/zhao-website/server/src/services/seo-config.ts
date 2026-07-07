import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.seo-config";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取或创建租户的 SEO 配置（单例）
   */
  async ensureDefault(siteId: number): Promise<any> {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null },
    });
    if (existing) return existing;

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

  async find(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },

  async update(siteId: number, data: any): Promise<any> {
    const existing = await this.ensureDefault(siteId);
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  /**
   * 公开路由返回（去除验证码字段）
   */
  async findPublic(siteId: number): Promise<any> {
    const config = await this.ensureDefault(siteId);
    const { googleSiteVerification, baiduSiteVerification, bingSiteVerification, ...publicFields } = config;
    return publicFields;
  },
});
