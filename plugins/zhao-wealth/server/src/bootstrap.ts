'use strict';

import jobs from './jobs';
import { isTradingDay } from './utils';
import { getCollectQueue, getCalculateQueue } from './jobs/queue-setup';
import { initBrowser, destroyBrowser } from './playwright-manager';
import seedCompanies from './data/wealth-companies.json';

const COMPANY_UID = 'plugin::zhao-wealth.wealth-company';

async function initSeedCompanies(strapi: any) {
  try {
    const count = await strapi.db.query(COMPANY_UID).count({});
    if (count > 0) {
      strapi.log.info(`[zhao-wealth] 理财公司数据已存在（${count} 条），跳过初始化`);
      return;
    }

    for (const item of seedCompanies) {
      await strapi.documents(COMPANY_UID).create({ data: { ...item } });
    }
    strapi.log.info(`[zhao-wealth] 已初始化 ${seedCompanies.length} 家理财公司种子数据`);
  } catch (e: any) {
    strapi.log.warn(`[zhao-wealth] 理财公司种子数据初始化失败: ${e?.message || String(e)}`);
  }
}

export default async ({ strapi }) => {
  // 初始化队列任务
  await jobs({ strapi });

  // 初始化 Playwright Browser 单例
  const pwBrowser = await initBrowser();
  if (pwBrowser) {
    strapi.log.info('[zhao-wealth] Playwright Browser 已就绪');
  } else {
    strapi.log.warn('[zhao-wealth] Playwright Browser 不可用，采集功能将降级');
  }

  // 初始化理财公司种子数据（表空时导入）
  await initSeedCompanies(strapi);

  // 注册销毁钩子
  process.on('SIGTERM', async () => { await destroyBrowser(); });
  process.on('SIGINT', async () => { await destroyBrowser(); });

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

  // 20:30 交易日风险指标计算
  strapi.cron.add({
    'wealth-risk-metric-trigger': {
      task: async ({ strapi }) => {
        const today = new Date();
        if (!isTradingDay(today)) {
          strapi.log.info('[zhao-wealth] 非交易日，跳过风险指标计算');
          return;
        }

        const queue = getCalculateQueue();
        if (!queue) {
          strapi.log.warn('[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过风险指标计算');
          return;
        }

        const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: { status: true },
        });

        for (const product of products) {
          queue.add('calculate-risk-metric', { productId: product.id, snapshotDate: today });
        }

        strapi.log.info(`[zhao-wealth] 20:30 风险指标计算任务已触发，${products.length}个产品`);
      },
      options: '30 20 * * *',
    },
  });

  strapi.log.info('[zhao-wealth] 插件已启动');
};
