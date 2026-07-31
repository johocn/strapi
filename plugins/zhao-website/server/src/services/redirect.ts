import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.redirect-rule";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async match(siteId: number, requestPath: string): Promise<{ toUrl: string; statusCode: number } | null> {
    const rule = await strapi.db.query(UID).findOne({
      where: {
        $or: [{ site: siteId, fromPath: requestPath, isActive: true, deletedAt: null },
              { site: null, fromPath: requestPath, isActive: true, deletedAt: null }],
      },
    });
    if (rule) {
      return { toUrl: rule.toUrl, statusCode: rule.statusCode || 301 };
    }
    const wildcardRules = await strapi.db.query(UID).findMany({
      where: {
        $or: [{ site: siteId, isActive: true, deletedAt: null },
              { site: null, isActive: true, deletedAt: null }],
      },
    });
    for (const wr of wildcardRules) {
      if (wr.fromPath.endsWith("*")) {
        const prefix = wr.fromPath.slice(0, -1);
        if (requestPath.startsWith(prefix)) {
          const suffix = requestPath.substring(prefix.length);
          const toUrl = wr.toUrl.endsWith("*") ? wr.toUrl.slice(0, -1) + suffix : wr.toUrl;
          return { toUrl, statusCode: wr.statusCode || 301 };
        }
      }
    }
    return null;
  },
});
