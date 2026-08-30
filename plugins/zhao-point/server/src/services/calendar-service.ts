import type { Core } from "@strapi/strapi";

const SERIES_UID = "plugin::zhao-point.activity-series";
const ACTIVITY_UID = "plugin::zhao-point.activity";

/** 解析 YYYY-MM，返回本地时区该月 [start, end) 边界；非法输入返回 null */
function monthRange(month: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec((month || "").trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  if (mon < 1 || mon > 12) return null;
  // Date(year, mon-1, ...) 按本地时区构造，得到该月本地 0 点
  return {
    start: new Date(year, mon - 1, 1, 0, 0, 0, 0),
    end: new Date(year, mon, 1, 0, 0, 0, 0),
  };
}

/** 活动 startTime（Date）按本地时区转 YYYY-MM-DD */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 按月聚合活动：
   * 1. 先对"有排期且 active"的系列做滚动惰性补齐（复用 series-service.generateSchedule，幂等，只填到 generateWeeks）；
   * 2. 按 startTime 落在该月（本地时区）过滤活动；
   * 3. includeAllStatus=true 返回全部状态（管理端），=false 仅 signup_open/ongoing（C端）；
   * 4. 按本地 YYYY-MM-DD 分组，返回 { days: [{ date, activities }] }；空月返回 days: []。
   */
  async getCalendarMonth({ month, includeAllStatus }: { month?: string; includeAllStatus?: boolean } = {}) {
    const range = monthRange(month || "");
    if (!range) return { days: [] };

    const seriesSvc = strapi.plugin("zhao-point").service("series-service");
    const seriesList = await strapi.documents(SERIES_UID).findMany({ filters: { status: "active" } });
    for (const s of seriesList) {
      if (s.schedule && Array.isArray(s.schedule.weekdays) && s.schedule.weekdays.length > 0) {
        await seriesSvc.generateSchedule(s.documentId);
      }
    }

    const rows = await strapi.db.query(ACTIVITY_UID).findMany({
      where: {
        ...(includeAllStatus ? {} : { status: { $in: ["signup_open", "ongoing"] } }),
        startTime: { $gte: range.start.toISOString(), $lt: range.end.toISOString() },
      },
      populate: { venue: true },
      orderBy: { startTime: "asc" },
    });

    const byDay = new Map<string, any[]>();
    for (const r of rows) {
      const key = localDateKey(new Date(r.startTime));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r);
    }

    const days = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, activities]) => ({ date, activities }));

    return { days };
  },
});