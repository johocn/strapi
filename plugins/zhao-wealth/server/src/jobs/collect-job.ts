'use strict';

import { getCollectQueue } from './queue-setup';
import { getCollector } from '../collectors';
import { isTradingDay, acquireLock, releaseLock } from '../utils';

export function registerCollectJobs(strapi: any) {
  const queue = getCollectQueue();

  // 单产品采集
  queue.process('collect-single', async (job) => {
    const { productId } = job.data;

    const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
      where: { product: productId },
      populate: ['product'],
    });

    if (!config) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}无采集配置`);
      return;
    }

    const collector = getCollector(config.collectMethod);

    try {
      const navData = await collector.collectNavData(config.product.productCode);

      for (const nav of navData) {
        await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
          data: {
            product: productId,
            ...nav,
          },
        });
      }

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
        },
      });

      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，${navData.length}条净值`);

      // 触发年化计算
      const calculateQueue = getCollectQueue();
      calculateQueue.add('calculate-snapshot', { productId });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品${productId}采集失败: ${error.message}`);

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'failed',
          failCount: config.failCount + 1,
          failReason: error.message,
        },
      });
    }
  });

  // 全量采集
  queue.process('collect-all', async (job) => {
    const lockKey = 'wealth:collect:lock';
    const acquired = await acquireLock(lockKey, 30 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 采集任务已在执行中');
      return;
    }

    try {
      const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
        populate: ['product'],
      });

      for (const config of configs) {
        queue.add('collect-single', { productId: config.product.id });
      }

      strapi.log.info(`[zhao-wealth] 全量采集任务分发完成，${configs.length}个产品`);
    } finally {
      await releaseLock(lockKey);
    }
  });
}