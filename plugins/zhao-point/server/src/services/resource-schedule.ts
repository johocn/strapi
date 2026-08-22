import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const LECTURER_UID = "plugin::zhao-point.lecturer";
const VENUE_UID = "plugin::zhao-point.venue";

type ResType = "lecturer" | "venue";
const UID: Record<ResType, string> = { lecturer: LECTURER_UID, venue: VENUE_UID };

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /** 解析资源 defaultBufferMin；不存在返回 null */
  async function bufferOf(type: ResType, id: number): Promise<number | null> {
    const row = await strapi.db.query(UID[type]).findOne({ where: { id } });
    if (!row) return null;
    return Number(row.defaultBufferMin ?? (type === "lecturer" ? 30 : 15));
  }

  /** 活动实际 id（可能是 numeric id 或 documentId） */
  function actIdOf(a: any): number {
    return typeof a === "number" ? a : a?.id;
  }

  /**
   * 检测资源在 [start, end] 时段（含缓冲）是否与其他活动冲突。
   * excludeActivityId 排除自身（改期场景）。
   * 返回冲突活动数组对象（未 populate 完整，仅取 id/title/startTime/endTime）。
   */
  async function detect(
    type: ResType,
    resourceId: number,
    start: Date,
    end: Date,
    excludeActivityId?: number
  ) {
    const buffer = await bufferOf(type, resourceId);
    if (buffer === null) throw Object.assign(new Error("资源不存在"), { status: 400, code: "RESOURCE_NOT_FOUND" });
    const winStart = new Date(start.getTime() - buffer * 60000);
    const winEnd = new Date(end.getTime() + buffer * 60000);
    const where: any = {
      [type]: resourceId,
      startTime: { $notNull: true },
      endTime: { $notNull: true },
      status: { $notIn: ["draft"] },
    };
    if (excludeActivityId) where.id = { $ne: excludeActivityId };
    const rows = await strapi.db.query(ACTIVITY_UID).findMany({
      where,
      select: ["id", "title", "startTime", "endTime"],
    });
    return rows.filter((r: any) => {
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      return rStart < winEnd && rEnd > winStart;
    });
  }

  return {
    LECTURER_UID,
    VENUE_UID,

    /**
     * 校验一组资源是否可用。
     * @param opts { start, end, excludeActivityId?, lecturerId?, venueId? }
     * @returns { ok: true } 或 { ok:false, conflicts: [...] }
     */
    async check(opts: {
      start: Date | string; end: Date | string;
      excludeActivityId?: number;
      lecturerId?: number; venueId?: number;
    }) {
      const start = new Date(opts.start);
      const end = new Date(opts.end);
      const conflicts: any[] = [];
      for (const type of ["lecturer", "venue"] as ResType[]) {
        const rid = opts[`${type}Id`];
        if (!rid) continue;
        const hits = await detect(type, rid, start, end, opts.excludeActivityId);
        for (const h of hits) {
          conflicts.push({
            resourceType: type,
            resourceId: rid,
            resourceName: "resource" /* controller 层回填 */,
            resourceBufferMin: null,
            conflictStart: h.startTime,
            conflictEnd: h.endTime,
            conflictActivityId: actIdOf(h),
            conflictActivityTitle: h.title,
            usedWindow: {
              start: new Date(start.getTime() - (await bufferOf(type, rid)!) * 60000),
              end: new Date(end.getTime() + (await bufferOf(type, rid)!) * 60000),
            },
          });
        }
      }
      return conflicts.length ? { ok: false, conflicts } : { ok: true };
    },

    /**
     * 为冲突资源返回接下来 N 个空闲建议时段（不含缓冲重叠；以目标时长 end-start 为基准）。
     * @returns Array<{ resourceId, resourceName, suggestStart, suggestEnd }>
     */
    async suggest(opts: {
      type: ResType; resourceId: number;
      start: Date | string; end: Date | string;
      n?: number; excludeActivityId?: number;
    }) {
      const n = opts.n ?? 3;
      const start = new Date(opts.start);
      const end = new Date(opts.end);
      const durMs = end.getTime() - start.getTime();
      const buffer = await bufferOf(opts.type, opts.resourceId);
      if (buffer === null) throw Object.assign(new Error("资源不存在"), { status: 400, code: "RESOURCE_NOT_FOUND" });
      const rows = await strapi.db.query(ACTIVITY_UID).findMany({
        where: {
          [opts.type]: opts.resourceId,
          startTime: { $notNull: true },
          endTime: { $notNull: true },
          status: { $notIn: ["draft"] },
          ...(opts.excludeActivityId ? { id: { $ne: opts.excludeActivityId } } : {}),
        },
        select: ["id", "title", "startTime", "endTime"],
        orderBy: { startTime: "asc" },
      });
      const busy = rows.map((r: any) => ({
        start: new Date(r.startTime).getTime() - buffer * 60000,
        end: new Date(r.endTime).getTime() + buffer * 60000,
      }));
      // 从原申请时段向后找空闲缝隙
      const results: any[] = [];
      let cursor = start.getTime();
      for (const b of busy) {
        if (b.end <= cursor) continue;
        const gapStart = Math.max(cursor, b.start);
        const windowStart = gapStart;
        const ok = b.end <= windowStart + durMs ? windowStart + durMs : -1;
        if (b.start >= windowStart + durMs) {
          // 前面已有足够空隙
          results.push({
            resourceId: opts.resourceId,
            suggestStart: new Date(windowStart).toISOString(),
            suggestEnd: new Date(windowStart + durMs).toISOString(),
          });
          cursor = windowStart + durMs;
          if (results.length >= n) break;
        }
        cursor = Math.max(cursor, b.end);
      }
      // 兜底：窗口之后紧排
      while (results.length < n) {
        results.push({
          resourceId: opts.resourceId,
          suggestStart: new Date(cursor).toISOString(),
          suggestEnd: new Date(cursor + durMs).toISOString(),
        });
        cursor += durMs;
      }
      return results;
    },
  };
};