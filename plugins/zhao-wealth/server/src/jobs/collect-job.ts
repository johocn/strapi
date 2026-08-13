'use strict';

import { getCollectQueue, getCalculateQueue } from './queue-setup';
import { getCollector } from '../collectors';
import { acquireLock, releaseLock } from '../utils';

/**
 * 根据采集配置查找对应采集器
 * 优先从 collectRules.source 获取，其次从公司简称匹配
 */
async function getCollectorForConfig(strapi: any, config: any) {
  // 1. 尝试从 collectRules.source 获取
  let source: string | null = null;
  if (config.collectRules) {
    try {
      const rules = typeof config.collectRules === 'string'
        ? JSON.parse(config.collectRules)
        : config.collectRules;
      source = rules?.source || null;
    } catch { /* ignore */ }
  }

  // 2. 从公司简称匹配（需要 populate company）
  if (!source && config.product?.company?.shortName) {
    source = config.product.company.shortName;
  }

  // 3. 如果 product 没有 populate company，单独查询
  if (!source && config.product?.id) {
    const fullProduct = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: config.product.id },
      populate: ['company'],
    });
    if (fullProduct?.company?.shortName) {
      source = fullProduct.company.shortName;
    }
  }

  const collector = source ? getCollector(source) : null;
  return { collector, source };
}

export function registerCollectJobs(strapi: any) {
  const queue = getCollectQueue();
  if (!queue) {
    strapi.log.warn('[zhao-wealth] collect queue 不可用，跳过 job 注册');
    return;
  }

  // 单产品采集
  queue.process('collect-single', async (job) => {
    const { productId } = job.data;

    const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
      where: { product: productId },
      populate: ['product', 'product.company'],
    });

    if (!config) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}无采集配置`);
      return;
    }

    const { collector, source } = await getCollectorForConfig(strapi, config);

    if (!collector) {
      strapi.log.error(`[zhao-wealth] 产品${productId}未找到匹配的采集器（source=${source || '未知'}）`);
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'failed',
          failCount: (config.failCount || 0) + 1,
          failReason: `未找到匹配的采集器（source=${source || '未知'}）`,
        },
      });
      return;
    }

    try {
      const productCode = config.product?.productCode || config.product?.saleCode;
      if (!productCode) {
        throw new Error('产品无代码，无法采集');
      }

      const navData = await collector.collectNavData(productCode);

      let savedCount = 0;
      for (const nav of navData) {
        // 去重
        const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
          where: { product: productId, navDate: nav.navDate },
        });
        if (existing) continue;

        await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
          data: {
            product: productId,
            ...nav,
          },
        });
        savedCount++;
      }

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
        },
      });

      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，保存${savedCount}/${navData.length}条净值`);

      // 触发年化计算
      const calculateQueue = getCalculateQueue();
      if (calculateQueue) {
        calculateQueue.add('calculate-snapshot', { productId });
      }
    } catch (error) {
      // P2修复：安全获取错误信息，防止非 Error 对象 throw 时 message 为 undefined
      const errMsg = error instanceof Error ? error.message : String(error);
      strapi.log.error(`[zhao-wealth] 产品${productId}采集失败: ${errMsg}`);

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'failed',
          failCount: (config.failCount || 0) + 1,
          failReason: errMsg,
        },
      });
    }
  });

  // 全量采集
  queue.process('collect-all', async (job) => {
    const lockKey = 'wealth:collect:lock';
    const acquired = await acquireLock(lockKey, 30 * 60);

    if (!acquired) {
      strapi.log.warn('[zhao-wealth] 采集任务已在执行中或 Redis 不可用');
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
