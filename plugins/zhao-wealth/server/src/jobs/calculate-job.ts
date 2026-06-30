'use strict';

import { getCalculateQueue, getRecalculateQueue } from './queue-setup';
import { acquireLock, releaseLock } from '../utils';

export function registerCalculateJobs(strapi: any) {
  const queue = getCalculateQueue();
  if (!queue) {
    strapi.log.warn('[zhao-wealth] calculate queue 不可用，跳过 job 注册');
    return;
  }

  // 单产品当日快照计算
  queue.process('calculate-snapshot', async (job) => {
    const { productId } = job.data;

    const today = new Date();
    const snapshot = await strapi.service('plugin::zhao-wealth.nav-calculator').calculateSnapshot(productId, today);

    if (snapshot) {
      await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
      strapi.log.info(`[zhao-wealth] 产品${productId}年化快照计算完成`);
    }
  });

  // 单产品重算
  queue.process('recalculate-product', async (job) => {
    const { productId } = job.data;

    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: { product: productId },
      orderBy: { navDate: 'asc' },
    });

    if (navs.length > 0) {
      const startDate = navs[0].navDate;
      const endDate = navs[navs.length - 1].navDate;
      await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateSnapshots(productId, startDate, endDate);
    }
  });

  // 指定范围重算
  queue.process('recalculate-range', async (job) => {
    const { productId, startDate, endDate } = job.data;
    await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateSnapshots(productId, new Date(startDate), new Date(endDate));
  });

  // 全量重算
  const recalcQueue = getRecalculateQueue();
  if (!recalcQueue) {
    strapi.log.warn('[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all 注册');
    return;
  }

  recalcQueue.process('recalculate-all', async (job) => {
    const lockKey = 'wealth:recalculate:lock';
    const acquired = await acquireLock(lockKey, 60 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 重算任务已在执行中或 Redis 不可用');
      return;
    }

    try {
      await strapi.service('plugin::zhao-wealth.nav-calculator').recalculateAll();
    } finally {
      await releaseLock(lockKey);
    }
  });
}
