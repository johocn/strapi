'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 触发采集（后台）
   */
  async trigger(ctx) {
    try {
      const { productId } = ctx.request.body;

      // 加入采集队列
      const queue = strapi.plugin('zhao-wealth').queue('wealth-collect');

      if (productId) {
        queue.add('collect-single', { productId });
        ctx.body = successResponse({ productId }, '单产品采集任务已触发');
      } else {
        queue.add('collect-all', {});
        ctx.body = successResponse({}, '全量采集任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发采集失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },

  /**
   * 查询采集状态（后台）
   */
  async status(ctx) {
    try {
      const { productId } = ctx.query;

      if (productId) {
        const config = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findOne({
          where: { product: Number(productId) },
        });

        ctx.body = successResponse(config);
      } else {
        const configs = await strapi.db.query('api::wealth-collect-config.wealth-collect-config').findMany({
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
   */
  async recalculate(ctx) {
    try {
      const { productId, startDate, endDate } = ctx.request.body;

      const queue = strapi.plugin('zhao-wealth').queue('wealth-calculate');

      if (productId && startDate && endDate) {
        queue.add('recalculate-range', { productId, startDate, endDate });
        ctx.body = successResponse({ productId }, '指定范围重算任务已触发');
      } else if (productId) {
        queue.add('recalculate-product', { productId });
        ctx.body = successResponse({ productId }, '单产品重算任务已触发');
      } else {
        queue.add('recalculate-all', {});
        ctx.body = successResponse({}, '全量重算任务已触发');
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '触发失败');
    }
  },
});