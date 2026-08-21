import type { Core } from "@strapi/strapi";

const SERIES_UID = "plugin::zhao-point.activity-series";
const ACTIVITY_UID = "plugin::zhao-point.activity";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(params) {
    return strapi.documents(SERIES_UID).findMany(params);
  },

  async findOne(documentId: string) {
    return strapi.documents(SERIES_UID).findOne({ documentId });
  },

  async create(data) {
    return strapi.documents(SERIES_UID).create({ data });
  },

  async update(documentId: string, data) {
    return strapi.documents(SERIES_UID).update({ documentId, data });
  },

  async delete(documentId: string) {
    return strapi.documents(SERIES_UID).delete({ documentId });
  },

  /**
   * 查询某系列的已发布可报名场次（signup_open / ongoing），按开始时间升序。
   * 系列不存在返回 null。
   */
  async listActivities(seriesDocumentId: string) {
    const series = await strapi.documents(SERIES_UID).findOne({ documentId: seriesDocumentId });
    if (!series) return null;
    return strapi.db.query(ACTIVITY_UID).findMany({
      where: {
        belongsToSeries: series.id,
        status: { $in: ["signup_open", "ongoing"] },
      },
      orderBy: { startTime: "asc" },
    });
  },

  /**
   * 复制活动为新草稿：保留基础信息与预解锁课时/文章，重置时间、名额与状态。
   */
  async duplicate(activityDocumentId: string) {
    const src = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: { preUnlockArticles: { select: ["id"] }, preUnlockLessons: { select: ["id"] } },
    } as any);
    if (!src) throw new Error("活动不存在");

    const copy: any = {
      title: `${src.title}（副本）`,
      type: src.type,
      description: src.description,
      venueName: src.venueName,
      lat: src.lat,
      lng: src.lng,
      capacity: src.capacity,
      signupStart: src.signupStart,
      signupEnd: src.signupEnd,
      checkinMode: src.checkinMode,
      geoEnforced: src.geoEnforced,
      geoRadiusM: src.geoRadiusM,
      channelScope: src.channelScope,
      channelIds: src.channelIds,
      belongsToSeries: src.belongsToSeries?.id ?? src.belongsToSeries ?? null,
      startTime: null,
      endTime: null,
      usedCapacity: 0,
      status: "draft",
    };
    if ((src.preUnlockArticles || []).length) {
      copy.preUnlockArticles = src.preUnlockArticles.map((a: any) => a.id ?? a);
    }
    if ((src.preUnlockLessons || []).length) {
      copy.preUnlockLessons = src.preUnlockLessons.map((a: any) => a.id ?? a);
    }
    return strapi.documents(ACTIVITY_UID).create({ data: copy });
  },

  /**
   * 按系列排期(eachWeek: weekdays + time)批量生成日程草稿。
   * - 无排期或 weekdays 为空：返回 { generated: 0, reason: "no_schedule" }
   * - count 提供时：锚定"今天所在周的周一"往后逐周生成满 count 场即停止
   * - count 为空：滚动补齐到 generateWeeks 周
   * - 跳过过去场次、重复场次(查重 belongsToSeries+startTime 区间)
   */
  async generateSchedule(seriesDocumentId: string, { count }: { count?: number } = {}) {
    const series = await strapi.documents(SERIES_UID).findOne({ documentId: seriesDocumentId });
    if (!series) return { generated: 0, reason: "no_series" };
    const sched = series.schedule;
    if (!sched || !Array.isArray(sched.weekdays) || sched.weekdays.length === 0) {
      return { generated: 0, reason: "no_schedule" };
    }

    // 以今天所在周的周一为锚点
    const now = new Date();
    const anchor = new Date(now);
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day; // 0(周日)->往前6天到周一；1(周一)->0
    anchor.setDate(anchor.getDate() + mondayOffset);
    anchor.setHours(0, 0, 0, 0);

    // 排期时段
    const [h = 0, m = 0] = (sched.startTime || "09:00").split(":").map(Number);
    const durationMin = Number(sched.durationMin) || 60;

    // 系列最近一场（供 venueName 兜底）
    let latest: any = null;
    try {
      latest = await strapi.db.query(ACTIVITY_UID).findOne({
        where: { belongsToSeries: series.id },
        orderBy: { startTime: "desc" },
      });
    } catch { /* 最近一场取不到则用空 venue */ }
    const venueName = latest?.venueName ?? series.venueName ?? "";

    const weekdays = (sched.weekdays as number[]).map((wd) => {
      const v = Number(wd);
      return v === 0 ? 7 : v; // getDay() 0=周日 -> 7
    });

    // 目标生成场次 / 扫描周数
    const targetCount = Number(count) > 0 ? Number(count) : null;
    const weeks = Math.max(Number(sched.generateWeeks) || 8, 1);
    const maxScanWeeks = weeks * 7 * 2; // 兜底循环上限，防死循环
    const maxShiftedWeeks = (count ? Math.ceil(count / weekdays.length) : weeks) + maxScanWeeks;

    let generated = 0;

    for (let shift = 0; shift < maxShiftedWeeks; shift++) {
      if (targetCount !== null && generated >= targetCount) break;
      // 每 shift 为一周：wStart = anchor + shift*7天（向后扫描未来周）
      const wStart = new Date(anchor);
      wStart.setDate(anchor.getDate() + shift * 7);

      for (const wd of weekdays) {
        if (targetCount !== null && generated >= targetCount) break;

        // 构造该周几的起始日期：周日(7)视为下周周一前的周日，用当前周内第 wd 天（wd-1 为相对周一的偏移）
        const startDate = new Date(wStart);
        startDate.setDate(wStart.getDate() + (wd - 1));
        startDate.setHours(h, m, 0, 0);

        // 跳过过去场次
        if (new Date(startDate).getTime() <= now.getTime()) continue;

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + durationMin);

        // 查重：该时段内是否已有场次
        const exists = await strapi.db.query(ACTIVITY_UID).count({
          where: {
            belongsToSeries: series.id,
            startTime: { $between: [startDate.toISOString(), endDate.toISOString()] },
          },
        });
        if (exists > 0) continue;

        await strapi.documents(ACTIVITY_UID).create({
          data: {
            title: series.title,
            description: series.description,
            venueName,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            status: "draft",
            usedCapacity: 0,
            capacity: 100,
            belongsToSeries: series.id,
          },
        });
        generated++;
      }

      // count 为空：滚动补齐到 generateWeeks 周（扫描到目标周数即止）
      if (targetCount === null && shift + 1 >= weeks) break;
    }

    return { generated };
  },
});