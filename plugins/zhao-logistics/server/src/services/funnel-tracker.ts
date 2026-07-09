import type { Core } from "@strapi/strapi";

const FUNNEL_UID = "plugin::zhao-logistics.conversion-funnel";
const EVENT_UID = "plugin::zhao-logistics.conversion-event";

export interface FunnelStats {
  steps: {
    step: number;
    name: string;
    eventName: string;
    count: number;
    conversionRate: number;
    overallRate: number;
    avgTimeFromPrevious: number | null;
  }[];
  totalVisitors: number;
  totalConverted: number;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 记录漏斗事件（同步写入，保证统计实时性）
   */
  async track(
    siteId: number,
    event: {
      funnelId?: string;
      eventName: string;
      visitorId: string;
      userId?: number;
      sessionId?: string;
      landingPageId?: string;
      quoteRequestId?: string;
      utm?: { source?: string; medium?: string; campaign?: string };
      lang?: string;
      ctx?: any;
    }
  ): Promise<void> {
    const ipAddress = event.ctx?.request?.ip;
    const userAgent = event.ctx?.request?.headers?.["user-agent"];

    // 若未传 funnelId，尝试按 eventName 匹配活跃漏斗
    let funnelId = event.funnelId;
    if (!funnelId) {
      const funnel = await strapi.db.query(FUNNEL_UID).findOne({
        where: { site: siteId, isActive: true, deletedAt: null },
      });
      funnelId = funnel?.documentId;
    }

    // 查漏斗定义获取 step 序号
    let step = 1;
    if (funnelId) {
      const funnel = await strapi.db.query(FUNNEL_UID).findOne({
        where: { documentId: funnelId, deletedAt: null },
      });
      if (funnel?.steps && Array.isArray(funnel.steps)) {
        const matched = funnel.steps.find((s: any) => s.eventName === event.eventName);
        if (matched) step = matched.step;
      }
    }

    await strapi.db.query(EVENT_UID).create({
      data: {
        site: siteId,
        funnelId: funnelId || null,
        eventName: event.eventName,
        step,
        visitorId: event.visitorId,
        userId: event.userId || null,
        sessionId: event.sessionId || null,
        landingPageId: event.landingPageId || null,
        quoteRequestId: event.quoteRequestId || null,
        utmSource: event.utm?.source || null,
        utmMedium: event.utm?.medium || null,
        utmCampaign: event.utm?.campaign || null,
        lang: event.lang || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        occurredAt: new Date().toISOString(),
      },
    });
  },

  /**
   * 查询漏斗转化率统计
   */
  async getStats(
    siteId: number,
    params: {
      funnelId: string;
      dateFrom?: string;
      dateTo?: string;
      lang?: string;
      utmSource?: string;
    }
  ): Promise<FunnelStats> {
    // 1. 加载漏斗定义
    const funnel = await strapi.db.query(FUNNEL_UID).findOne({
      where: { site: siteId, documentId: params.funnelId, deletedAt: null },
    });
    if (!funnel) throw new Error("漏斗不存在");

    const stepsDef: any[] = Array.isArray(funnel.steps) ? funnel.steps : [];
    if (stepsDef.length === 0) {
      return { steps: [], totalVisitors: 0, totalConverted: 0 };
    }

    // 2. 构建查询条件
    const where: any = {
      site: siteId,
      funnelId: params.funnelId,
      deletedAt: null,
    };
    if (params.dateFrom || params.dateTo) {
      where.occurredAt = {};
      if (params.dateFrom) where.occurredAt.$gte = params.dateFrom;
      if (params.dateTo) where.occurredAt.$lte = params.dateTo;
    }
    if (params.lang) where.lang = params.lang;
    if (params.utmSource) where.utmSource = params.utmSource;

    // 3. 查全部事件（按 step 分组计数）
    const allEvents = await strapi.db.query(EVENT_UID).findMany({
      where,
      orderBy: { occurredAt: "asc" },
    });

    // 4. 按 step 统计独立 visitor 数
    const stepVisitorMap = new Map<number, Set<string>>();
    const stepTimesMap = new Map<number, Map<string, number>>(); // step -> visitor -> 最早时间

    for (const ev of allEvents) {
      const step = ev.step;
      if (!stepVisitorMap.has(step)) stepVisitorMap.set(step, new Set());
      stepVisitorMap.get(step)!.add(ev.visitorId);

      if (!stepTimesMap.has(step)) stepTimesMap.set(step, new Map());
      const timeMap = stepTimesMap.get(step)!;
      const ts = new Date(ev.occurredAt).getTime();
      if (!timeMap.has(ev.visitorId) || timeMap.get(ev.visitorId)! > ts) {
        timeMap.set(ev.visitorId, ts);
      }
    }

    // 5. 计算每步统计
    const totalVisitors = stepVisitorMap.get(1)?.size || 0;
    const totalConverted = stepVisitorMap.get(stepsDef.length)?.size || 0;

    const steps = stepsDef
      .sort((a, b) => a.step - b.step)
      .map((s, idx) => {
        const count = stepVisitorMap.get(s.step)?.size || 0;
        const prevCount = idx > 0 ? stepVisitorMap.get(stepsDef[idx - 1].step)?.size || 0 : count;
        const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 10000) / 100 : 0;
        const overallRate = totalVisitors > 0 ? Math.round((count / totalVisitors) * 10000) / 100 : 0;

        // 平均耗时（与上一步的时间差）
        let avgTimeFromPrevious: number | null = null;
        if (idx > 0) {
          const prevTimes = stepTimesMap.get(stepsDef[idx - 1].step);
          const currTimes = stepTimesMap.get(s.step);
          if (prevTimes && currTimes) {
            const diffs: number[] = [];
            for (const [visitor, currTs] of currTimes) {
              const prevTs = prevTimes.get(visitor);
              if (prevTs !== undefined && currTs > prevTs) {
                diffs.push(currTs - prevTs);
              }
            }
            if (diffs.length > 0) {
              avgTimeFromPrevious = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
            }
          }
        }

        return {
          step: s.step,
          name: s.name,
          eventName: s.eventName,
          count,
          conversionRate,
          overallRate,
          avgTimeFromPrevious,
        };
      });

    return { steps, totalVisitors, totalConverted };
  },
});
