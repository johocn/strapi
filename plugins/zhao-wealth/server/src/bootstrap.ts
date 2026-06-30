'use strict';

import jobs from './jobs';
import { isTradingDay } from './utils';
import { getCollectQueue, getCalculateQueue } from './jobs/queue-setup';

export default ({ strapi }) => {
  // 初始化队列任务
  jobs({ strapi });

  // 注册 Cron 定时任务
  // 8:00 交易日判断（仅日志）
  strapi.cron.add({
    'wealth-trading-day-check': {
      task: ({ strapi }) => {
        const today = new Date();
        const isTrading = isTradingDay(today);
        strapi.log.info(`[zhao-wealth] 交易日检查: ${today.toISOString().slice(0, 10)} ${isTrading ? '是交易日' : '非交易日'}`);
      },
      options: '0 8 * * *',
    },
  });

  // 18:00 交易日采集触发
  strapi.cron.add({
    'wealth-collect-trigger': {
      task: ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过采集');
          return;
        }

        const queue = getCollectQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 采集队列不可用（Redis 未就绪），跳过');
          return;
        }

        queue.add('collect-all', {});
        strapi.log.info('[zhao-wealth] 18:00 采集任务已触发');
      },
      options: '0 18 * * *',
    },
  });

  // 20:00 交易日年化快照计算
  strapi.cron.add({
    'wealth-calculate-trigger': {
      task: async ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过年化计算');
          return;
        }

        const queue = getCalculateQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过');
          return;
        }

        const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: { status: true },
        });

        for (const product of products) {
          queue.add('calculate-snapshot', { productId: product.id });
        }

        strapi.log.info(`[zhao-wealth] 20:00 年化计算任务已触发，${products.length}个产品`);
      },
      options: '0 20 * * *',
    },
  });

  strapi.log.info('[zhao-wealth] 插件已启动');
};
