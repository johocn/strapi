import type { Core } from "@strapi/strapi";
import { AsyncWriter } from "./utils/async-writer";

const UID = "plugin::zhao-website.visit-log";

let writerInstance: AsyncWriter | null = null;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  _getWriter(): AsyncWriter {
    if (!writerInstance) {
      writerInstance = new AsyncWriter({
        strapi,
        ct: "visit-log",
        uid: "zhao_website_visit_logs",
        flushIntervalMs: 5000,
        flushThreshold: 100,
      });
      writerInstance.start();
    }
    return writerInstance;
  },

  async enqueueCreate(siteId: number, data: any) {
    this._getWriter().enqueue({ ...data, site_id: siteId, created_at: new Date() });
  },

  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
    });
  },

  async findMine(siteId: number, userId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, userId },
      limit: 50,
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await strapi.db.query(UID).findMany({
      where: { site: siteId, createdAt: { $gte: since } },
    });
    const byType = items.reduce((acc: any, v: any) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});
    return { total: items.length, byType, days };
  },

  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const deleted = await strapi.db.query(UID).deleteMany({
      where: { createdAt: { $lt: cutoff } },
    });
    return deleted?.count || 0;
  },
});
