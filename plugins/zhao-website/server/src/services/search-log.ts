import type { Core } from "@strapi/strapi";
import { AsyncWriter } from "./utils/async-writer";

const UID = "plugin::zhao-website.search-log";

let writerInstance: AsyncWriter | null = null;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  _getWriter(): AsyncWriter {
    if (!writerInstance) {
      writerInstance = new AsyncWriter({
        strapi,
        ct: "search-log",
        uid: "zhao_website_search_logs",
        flushIntervalMs: 10000,
        flushThreshold: 200,
      });
      writerInstance.start();
    }
    return writerInstance;
  },

  async log(siteId: number, keyword: string, resultCount: number, ctx: any) {
    this._getWriter().enqueue({
      site_id: siteId,
      keyword,
      result_count: resultCount,
      visitor_id: ctx?.state?.visitorId || "anonymous",
      ip_address: ctx?.request?.ip,
      created_at: new Date(),
    });
  },

  async findAdmin(siteId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      limit: 50,
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await strapi.db.query(UID).findMany({
      where: { site: siteId, createdAt: { $gte: since } },
    });
    const byKeyword: Record<string, number> = {};
    for (const item of items) {
      byKeyword[item.keyword] = (byKeyword[item.keyword] || 0) + 1;
    }
    return { total: items.length, topKeywords: Object.entries(byKeyword).sort((a, b) => b[1] - a[1]).slice(0, 20) };
  },
});
