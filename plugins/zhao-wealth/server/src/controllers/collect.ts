'use strict';

import { successResponse, errorResponse } from '../utils';
import { getCollectQueue, getCalculateQueue, getRecalculateQueue } from '../jobs/queue-setup';
import { getCollector } from '../collectors';

export default ({ strapi }) => ({
  /**
   * 根据产品查找对应采集器
   * 优先从 collectRules.source 获取，其次从公司简称匹配
   */
  async getCollectorForProduct(productId: number) {
    const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
      where: { product: productId },
      populate: ['product', 'product.company'],
    });

    if (!config) return null;

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

    // 2. 从公司简称匹配
    if (!source && config.product?.company?.shortName) {
      source = config.product.company.shortName;
    }

    const collector = source ? getCollector(source) : null;
    return { collector, config, source };
  },

  /**
   * 同步采集单个产品净值（无 Redis 时的降级方案）
   */
  async collectNavSync(productId: number) {
    const result = await this.getCollectorForProduct(productId);
    if (!result) {
      throw new Error(`产品${productId}无采集配置`);
    }
    const { collector, config, source } = result;
    if (!collector) {
      throw new Error(`未找到匹配的采集器（source=${source || '未知'}）`);
    }

    const productCode = config.product?.productCode || config.product?.saleCode;
    if (!productCode) {
      throw new Error(`产品${productId}无产品代码，无法采集净值`);
    }

    strapi.log.info(`[zhao-wealth] 同步采集净值: productId=${productId}, productCode=${productCode}, source=${source}`);

    const registerCode = config.product?.registerCode || '';
    let navData: any[] = [];
    try {
      navData = await collector.collectNavData(productCode, { registerCode });
    } catch (collectError: any) {
      // P1修复：采集异常时持久化失败状态
      strapi.log.error(`[zhao-wealth] 产品${productId}采集异常: ${collectError.message}`);
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'failed',
          lastCollectTime: new Date(),
          failCount: (config.failCount || 0) + 1,
          failReason: collectError.message?.substring(0, 500) || '采集异常',
        },
      });
      throw collectError;
    }

    if (navData.length === 0) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}未采集到净值数据（productCode=${productCode}）`);
      // P3修复：空采集标记为 warning 而非 success
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
          failReason: '采集返回空数据',
        },
      });
      return { savedCount: 0, totalCollected: 0 };
    }

    let savedCount = 0;
    for (const nav of navData) {
      // 分离货币收益字段（杭银等货币型产品提供万份收益/七日年化，存入独立表）
      const { tenThousandIncome, sevenDayAnnualized, ...navOnly } = nav;

      // 检查是否已存在（按 product + navDate 去重）
      const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId, navDate: nav.navDate },
      });
      if (!existing) {
        await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
          data: { product: productId, ...navOnly },
        });
        savedCount++;
      }

      // 货币收益写入 money_incomes（若该日有收益数据）
      if (tenThousandIncome != null || sevenDayAnnualized != null) {
        const existingIncome = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findOne({
          where: { product: productId, incomeDate: nav.navDate },
        });
        const incomeData = {
          product: productId,
          incomeDate: nav.navDate,
          tenThousandIncome: tenThousandIncome != null ? Number(tenThousandIncome) : null,
          sevenDayAnnual: sevenDayAnnualized != null ? Number(sevenDayAnnualized) : null,
          dataSource: 'crawler',
        };
        if (existingIncome) {
          await strapi.db.query('plugin::zhao-wealth.wealth-money-income').update({
            where: { id: existingIncome.id },
            data: incomeData,
          });
        } else {
          await strapi.db.query('plugin::zhao-wealth.wealth-money-income').create({
            data: incomeData,
          });
        }
      }
    }

    // 更新采集配置状态
    await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
      where: { id: config.id },
      data: {
        collectStatus: 'success',
        lastCollectTime: new Date(),
        failCount: 0,
        failReason: null,
      },
    });

    strapi.log.info(`[zhao-wealth] 产品${productId}采集完成，保存${savedCount}/${navData.length}条净值`);
    return { savedCount, totalCollected: navData.length };
  },

  /**
   * 触发采集（后台）
   * 有 Redis 时使用异步队列，无 Redis 时降级为同步执行
   */
  async trigger(ctx) {
    try {
      const { productId } = ctx.request.body;
      const queue = getCollectQueue();

      if (queue) {
        // 有 Redis：使用异步队列
        if (productId) {
          queue.add('collect-single', { productId });
          ctx.body = successResponse({ productId }, '单产品采集任务已触发');
        } else {
          queue.add('collect-all', {});
          ctx.body = successResponse({}, '全量采集任务已触发');
        }
      } else {
        // 无 Redis：同步执行（开发环境降级）
        strapi.log.info('[zhao-wealth] Redis 不可用，降级为同步采集');

        if (productId) {
          const result = await this.collectNavSync(Number(productId));
          ctx.body = successResponse(
            { productId, ...result },
            `采集完成，保存${result.savedCount}条净值`
          );
        } else {
          // 批量采集：遍历所有有采集配置的产品
          const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
            populate: ['product'],
          });

          let successCount = 0;
          let failCount = 0;
          for (const config of configs) {
            try {
              if (config.product?.id) {
                await this.collectNavSync(config.product.id);
                successCount++;
              }
            } catch (e: any) {
              strapi.log.error(`[zhao-wealth] 产品${config.product?.id}采集失败: ${e.message}`);
              failCount++;
            }
          }

          ctx.body = successResponse(
            { successCount, failCount },
            `批量采集完成：成功${successCount}个，失败${failCount}个`
          );
        }
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发采集失败: ${error.message}`);
      ctx.body = errorResponse(500, `采集失败: ${error.message}`);
    }
  },

  /**
   * 查询采集状态（后台）
   */
  async status(ctx) {
    try {
      const { productId } = ctx.query;

      if (productId) {
        const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
          where: { product: Number(productId) },
        });

        ctx.body = successResponse(config);
      } else {
        const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
          populate: ['product'],
        });

        ctx.body = successResponse(configs);
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询采集状态失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 触发重算（后台）
   * 有 Redis 时使用异步队列，无 Redis 时降级为同步执行
   */
  async recalculate(ctx) {
    try {
      const { productId, startDate, endDate } = ctx.request.body;
      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();
      const navCalculator = strapi.service('plugin::zhao-wealth.nav-calculator');

      if (productId && startDate && endDate) {
        if (queue) {
          queue.add('recalculate-range', { productId, startDate, endDate });
          ctx.body = successResponse({ productId }, '指定范围重算任务已触发');
        } else {
          // 同步降级
          strapi.log.info(`[zhao-wealth] Redis 不可用，同步重算: productId=${productId}, ${startDate}~${endDate}`);
          await navCalculator.recalculateSnapshots(Number(productId), new Date(startDate), new Date(endDate));
          ctx.body = successResponse({ productId }, '指定范围重算完成（同步）');
        }
      } else if (productId) {
        if (queue) {
          queue.add('recalculate-product', { productId });
          ctx.body = successResponse({ productId }, '单产品重算任务已触发');
        } else {
          // 同步降级：查找产品的净值日期范围
          strapi.log.info(`[zhao-wealth] Redis 不可用，同步重算: productId=${productId}`);
          const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
            where: { product: Number(productId) },
            orderBy: { navDate: 'asc' },
          });
          if (navs.length > 0) {
            await navCalculator.recalculateSnapshots(Number(productId), new Date(navs[0].navDate), new Date(navs[navs.length - 1].navDate));
          }
          ctx.body = successResponse({ productId, navCount: navs.length }, '单产品重算完成（同步）');
        }
      } else {
        if (recalcQueue) {
          recalcQueue.add('recalculate-all', {});
          ctx.body = successResponse({}, '全量重算任务已触发');
        } else {
          // 同步降级
          strapi.log.info('[zhao-wealth] Redis 不可用，同步全量重算年化快照');
          await navCalculator.recalculateAll();
          ctx.body = successResponse({}, '全量重算完成（同步）');
        }
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发重算失败: ${error.message}`);
      ctx.body = errorResponse(500, `重算失败: ${error.message}`);
    }
  },
});
