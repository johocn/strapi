'use strict';

import { getCalculateQueue, getRecalculateQueue } from './queue-setup';
import { acquireLock, releaseLock } from '../utils';

export function registerRiskMetricJobs(strapi: any) {
  // 单产品当日风险指标计算
  const calcQueue = getCalculateQueue();
  if (calcQueue) {
    calcQueue.process('calculate-risk-metric', async (job) => {
      const { productId, snapshotDate } = job.data;
      const date = snapshotDate ? new Date(snapshotDate) : new Date();
      await strapi.service('plugin::zhao-wealth.risk-metric-service').calculateAndSaveMetrics(productId, date);
    });

    // 单产品重算风险指标
    calcQueue.process('recalculate-risk-metric-product', async (job) => {
      const { productId } = job.data;
      // 重算所有历史日期
      const navDates = await strapi.db.connection.raw(`
        SELECT DISTINCT nav_date FROM wealth_navs WHERE product_id = ? ORDER BY nav_date ASC
      `, [productId]);

      for (const row of navDates.rows) {
        await strapi.service('plugin::zhao-wealth.risk-metric-service').calculateAndSaveMetrics(productId, new Date(row.nav_date));
      }

      strapi.log.info(`[zhao-wealth] 产品${productId}风险指标重算完成`);
    });
  } else {
    strapi.log.warn('[zhao-wealth] calculate queue 不可用，跳过 risk-metric job 注册');
  }

  // 全量重算风险指标
  const recalcQueue = getRecalculateQueue();
  if (recalcQueue) {
    recalcQueue.process('recalculate-all-risk-metrics', async (job) => {
      const lockKey = 'wealth:recalculate-risk-metric:lock';
      const acquired = await acquireLock(lockKey, 60 * 60);

      if (!acquired) {
        strapi.log.warn('[zhao-wealth] 风险指标重算任务已在执行中或 Redis 不可用');
        return;
      }

      try {
        await strapi.service('plugin::zhao-wealth.risk-metric-service').recalculateAll();
      } finally {
        await releaseLock(lockKey);
      }
    });
  } else {
    strapi.log.warn('[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all-risk-metrics 注册');
  }
}
