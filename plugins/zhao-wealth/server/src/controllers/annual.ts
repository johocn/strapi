'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取年化快照时序数据（C端）
   */
  async snapshotTimeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const result = await strapi.service('plugin::zhao-wealth.annual-snapshot').getSnapshotTimeSeries(
        Number(id),
        start,
        end,
        page,
        pageSize
      );

      const list = result.list.map(s => ({
        date: s.snapshotDate,
        annual1d: s.annual1d,
        annual3d: s.annual3d,
        annual7d: s.annual7d,
        annual2w: s.annual2w,
        annual1m: s.annual1m,
        annual3m: s.annual3m,
        annual6m: s.annual6m,
        annual1y: s.annual1y,
        isEstimate: s.isEstimate,
      }));

      ctx.body = paginatedResponse(list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年化快照查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 获取年度收益列表（C端）
   */
  async yearlyReturns(ctx) {
    try {
      const { id } = ctx.params;

      const returns = await strapi.service('plugin::zhao-wealth.annual-snapshot').getYearlyReturns(Number(id));

      ctx.body = successResponse(returns);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年度收益查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});