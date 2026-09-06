import type { Core } from "@strapi/strapi";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

const DEFAULT_FILTERS = {
  siteScoped: true,
  defaultStatus: "published",
  excludeDeleted: true,
  allowIndex: "auto", // auto=有该字段才过滤 / strict=强制 / off=不过滤
};

/**
 * 统一内容过滤：把一级 filters 配置（global.filters）落到查询条件上。
 * 配置来源：站点合并配置（模板预设 + 租户覆盖），缺省用 DEFAULT_FILTERS 兜底。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 读取一级过滤配置（含模板合并链）
   * 注：ctx.state.siteId 为 site-config 的 numeric id，而 zhao-common.getConfig 按 documentId 查询，
   * 因此先按 numeric id 解析记录（带 template 关联）再走 getMergedConfig 合并；拿不到时回退 getConfig。
   */
  async getFilters(siteId: number): Promise<Record<string, any>> {
    try {
      const siteConfigService = strapi.plugin("zhao-common").service("site-config");
      const numericId = Number(siteId);
      let siteConfig: any = null;
      if (Number.isInteger(numericId) && numericId > 0) {
        siteConfig = await strapi.db.query(SITE_CONFIG_UID).findOne({
          where: { id: numericId },
          populate: ["template"],
        });
      }
      if (!siteConfig) {
        siteConfig = await siteConfigService.getConfig(siteId ? String(siteId) : "");
      }
      const merged = await strapi.plugin("zhao-common").service("site-template").getMergedConfig(siteConfig);
      return {
        ...DEFAULT_FILTERS,
        ...(merged?.config?.global?.filters || {}),
      };
    } catch {
      return { ...DEFAULT_FILTERS };
    }
  },

  /**
   * 构建查询条件
   * @param siteId 站点 ID
   * @param uid 内容模型 uid，如 plugin::zhao-website.article
   * @param extra 附加条件（调用方自定义，优先级最高）
   * @param locale 语言（可空，空则不加 locale 过滤）
   */
  async buildWhere(siteId: number, uid: string, extra: Record<string, any> = {}, locale?: string): Promise<Record<string, any>> {
    const f = await this.getFilters(siteId);
    const where: Record<string, any> = { ...extra };
    if (f.siteScoped) where.site = siteId;
    if (f.defaultStatus) where.status = f.defaultStatus;
    if (f.excludeDeleted) where.deletedAt = null;
    if (f.allowIndex === "strict") {
      where.allowIndex = true;
    } else if (f.allowIndex === "auto" && strapi.getModel(uid as any)?.attributes?.allowIndex) {
      where.allowIndex = true;
    }
    if (locale) where.locale = locale;
    return where;
  },

  /**
   * 统一查询入口：buildWhere + findMany
   */
  async findMany(uid: string, siteId: number, params: any = {}): Promise<any[]> {
    const { where = {}, locale, ...rest } = params;
    const fullWhere = await this.buildWhere(siteId, uid, where, locale);
    return strapi.db.query(uid).findMany({ ...rest, where: fullWhere });
  },

  /**
   * 统一计数入口
   */
  async count(uid: string, siteId: number, params: any = {}): Promise<number> {
    const { where = {}, locale, ...rest } = params;
    const fullWhere = await this.buildWhere(siteId, uid, where, locale);
    return strapi.db.query(uid).count({ ...rest, where: fullWhere });
  },
});
