import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.section";

const CONTENT_UIDS = [
  "plugin::zhao-website.article",
  "plugin::zhao-website.geo-article",
  "plugin::zhao-website.tutorial",
  "plugin::zhao-website.faq",
  "plugin::zhao-website.product",
  "plugin::zhao-website.download",
];

const DEFAULT_THEME = { mode: "inherit", theme: "amber" };

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { status, locale } = query;
    const where: Record<string, any> = { site: siteId, deletedAt: null };
    if (status !== "all") where.status = status === "false" ? false : true;
    if (locale) where.locale = locale;
    return strapi.db.query(UID).findMany({
      where,
      orderBy: { order: "ASC" },
      populate: ["icon", "cover"],
    });
  },

  async findOne(siteId: number, slug: string, locale?: string) {
    const where: Record<string, any> = { site: siteId, slug, deletedAt: null, status: true };
    if (locale) where.locale = locale;
    const section = await strapi.db.query(UID).findOne({
      where,
      populate: ["icon", "cover"],
    });
    if (!section) return null;

    const counts: Record<string, number> = {};
    await Promise.all(
      CONTENT_UIDS.map(async (uid) => {
        counts[uid.split(".").pop() as string] = await strapi.db.query(uid).count({
          where: { site: siteId, section: section.id, status: "published", deletedAt: null },
        });
      })
    );

    return {
      ...section,
      themeConfig: { ...DEFAULT_THEME, ...(section.themeConfig || {}) },
      counts,
    };
  },
});
