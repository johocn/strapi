'use strict';

import { successResponse, errorResponse } from '../utils';
import { getCalculateQueue, getRecalculateQueue } from '../jobs/queue-setup';

export default ({ strapi }) => ({
  /**
   * C 端查询：获取产品的风险指标
   * GET /v1/wealth/products/:id/risk-metrics?period=1m,3m,6m,1y
   */
  async getMetrics(ctx) {
    try {
      const { id } = ctx.params;
      const periodQuery = ctx.query.period as string;
      const periods = periodQuery
        ? periodQuery.split(',').map(p => p.trim())
        : ['m1', 'm3', 'm6', 'y1'];

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      const invalidPeriods = periods.filter(p => !validPeriods.includes(p));
      if (invalidPeriods.length > 0) {
        ctx.status = 400;
        ctx.body = errorResponse(400, `无效的周期: ${invalidPeriods.join(', ')}`);
        return;
      }

      // 取每个周期最新的风险指标（按 snapshotDate 降序取第一条）
      const result: Record<string, any> = {};

      for (const period of periods) {
        const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
        const periodData: any = {};

        for (const metricName of metricNames) {
          const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
            where: {
              product: Number(id),
              period,
              metricName,
            },
            orderBy: { snapshotDate: 'desc' },
            limit: 1,
          });

          periodData[metricName] = records.length > 0 ? records[0].metricValue : null;
        }

        result[period] = periodData;
      }

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询风险指标失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 后台触发：重算风险指标
   * POST /wealth-admin/v1/recalculate-risk-metric
   * body: { productId?, type: 'risk-metric' | 'all' }
   */
  async recalculate(ctx) {
    try {
      const { productId, type } = ctx.request.body;

      if (type !== 'risk-metric' && type !== 'all') {
        ctx.status = 400;
        ctx.body = errorResponse(400, "type 必须为 'risk-metric' 或 'all'");
        return;
      }

      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();

      if (productId) {
        // 单产品重算
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        queue.add('recalculate-risk-metric-product', { productId });
        ctx.body = successResponse({ productId }, '单产品风险指标重算任务已触发');
      } else {
        // 全量重算
        if (!recalcQueue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, '计算服务暂不可用（Redis 未就绪）');
          return;
        }
        recalcQueue.add('recalculate-all-risk-metrics', {});
        ctx.body = successResponse({}, '全量风险指标重算任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发风险指标重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },

  /**
   * 指标中心：聚合查询
   * GET /wealth-admin/v1/risk-metrics/admin/aggregate?productId=1&period=m1
   */
  async adminAggregate(ctx) {
    try {
      const { productId, period } = ctx.query;
      if (!productId || !period) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'productId 和 period 必填');
        return;
      }

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      if (!validPeriods.includes(period)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, '无效的 period');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminAggregate(Number(productId), period);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标聚合查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 指标中心：历史趋势
   * GET /wealth-admin/v1/risk-metrics/admin/trend?productId=1
   */
  async adminTrend(ctx) {
    try {
      const { productId } = ctx.query;
      if (!productId) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'productId 必填');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminTrend(Number(productId));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标趋势查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 指标中心：同类对比
   * GET /wealth-admin/v1/risk-metrics/admin/peers?period=m1&metricName=volatility
   */
  async adminPeers(ctx) {
    try {
      const { period, metricName, limit } = ctx.query;
      if (!period || !metricName) {
        ctx.status = 400;
        ctx.body = errorResponse(400, 'period 和 metricName 必填');
        return;
      }

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      const validMetrics = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
      if (!validPeriods.includes(period) || !validMetrics.includes(metricName)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, '无效的 period 或 metricName');
        return;
      }

      const result = await strapi.plugin('zhao-wealth').service('risk-metric').adminPeers(period, metricName, Number(limit) || 50);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 同类对比查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
