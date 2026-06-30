'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取净值时序数据（C端）
   */
  async timeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end },
        },
        limit: Math.min(pageSize, 500),
        offset: (page - 1) * pageSize,
        orderBy: { navDate: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-nav').count({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end },
        },
      });

      const list = navs.map(n => ({
        date: n.navDate,
        unitNav: n.unitNav,
        accNav: n.accNav,
      }));

      ctx.body = paginatedResponse(list, page, pageSize, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值时序查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});