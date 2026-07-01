// server/src/services/aggregation.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async aggregateArticleDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按文章分组
    const articleGroups: Record<string, any[]> = {};
    for (const log of pageViews) {
      const articleId = log.article?.documentId || log.article;
      if (articleId) {
        if (!articleGroups[articleId]) {
          articleGroups[articleId] = [];
        }
        articleGroups[articleId].push(log);
      }
    }

    // 查询阅读时长日志
    const readLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'read-duration',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 为每篇文章创建汇总
    for (const [articleId, logs] of Object.entries(articleGroups)) {
      const pv = logs.length;
      const uv = new Set(logs.map((l: any) => l.sessionId)).size;

      // 计算平均阅读时长和滚动深度
      const articleReadLogs = readLogs.filter(
        (l: any) => (l.article?.documentId || l.article) === articleId
      );
      const avgReadDuration = articleReadLogs.length > 0
        ? articleReadLogs.reduce((sum: number, l: any) => sum + (l.readDuration || 0), 0) / articleReadLogs.length
        : 0;
      const avgScrollDepth = articleReadLogs.length > 0
        ? articleReadLogs.reduce((sum: number, l: any) => sum + (l.scrollDepth || 0), 0) / articleReadLogs.length
        : 0;

      // 创建汇总记录
      await strapi.documents('plugin::zhao-studio.stat-summary').create({
        data: {
          date: startDate,
          article: articleId,
          summaryType: 'article-daily',
          pv,
          uv,
          avgReadDuration,
          avgScrollDepth,
        },
      });
    }
  },

  async aggregateAdSlotDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 ad-click 事件
    const adClicks = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'ad-click',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按广告位分组
    const adSlotGroups: Record<string, any[]> = {};
    for (const log of adClicks) {
      const adSlotId = log.adSlot?.documentId || log.adSlot;
      if (adSlotId) {
        if (!adSlotGroups[adSlotId]) {
          adSlotGroups[adSlotId] = [];
        }
        adSlotGroups[adSlotId].push(log);
      }
    }

    // 查询当天 PV
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const totalPv = pageViews.length;

    // 为每个广告位创建汇总
    for (const [adSlotId, logs] of Object.entries(adSlotGroups)) {
      const clickCount = logs.length;
      const clickRate = totalPv > 0 ? (clickCount / totalPv) * 100 : 0;

      // 创建汇总记录
      await strapi.documents('plugin::zhao-studio.stat-summary').create({
        data: {
          date: startDate,
          adSlot: adSlotId,
          summaryType: 'ad-slot-daily',
          clickCount,
          clickRate,
        },
      });
    }
  },

  async aggregateGlobalDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    const pv = pageViews.length;
    const uv = new Set(pageViews.map((l: any) => l.sessionId)).size;

    // 查询当天所有 ad-click 事件
    const adClicks = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'ad-click',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const clickCount = adClicks.length;
    const clickRate = pv > 0 ? (clickCount / pv) * 100 : 0;

    // 查询阅读时长日志
    const readLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'read-duration',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const avgReadDuration = readLogs.length > 0
      ? readLogs.reduce((sum: number, l: any) => sum + (l.readDuration || 0), 0) / readLogs.length
      : 0;
    const avgScrollDepth = readLogs.length > 0
      ? readLogs.reduce((sum: number, l: any) => sum + (l.scrollDepth || 0), 0) / readLogs.length
      : 0;

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'global-daily',
        pv,
        uv,
        clickCount,
        clickRate,
        avgReadDuration,
        avgScrollDepth,
      },
    });
  },

  async aggregateDeviceDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按设备类型分组
    const deviceStats: Record<string, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };

    for (const log of pageViews) {
      const deviceType = log.deviceType || 'desktop';
      deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;
    }

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'device-daily',
        deviceStats,
      },
    });
  },

  async aggregateRegionDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按地域分组
    const regionStats: Record<string, number> = {};

    for (const log of pageViews) {
      const country = log.country || 'Unknown';
      const city = log.city || 'Unknown';
      const key = `${country}/${city}`;
      regionStats[key] = (regionStats[key] || 0) + 1;
    }

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'region-daily',
        regionStats,
      },
    });
  },

  async runDailyAggregation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    try {
      await this.aggregateArticleDaily(yesterday);
      await this.aggregateAdSlotDaily(yesterday);
      await this.aggregateGlobalDaily(yesterday);
      await this.aggregateDeviceDaily(yesterday);
      await this.aggregateRegionDaily(yesterday);

      return { success: true, date: yesterday };
    } catch (error: any) {
      return { success: false, error: error.message, date: yesterday };
    }
  },
});