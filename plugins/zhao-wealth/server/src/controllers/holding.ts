'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * GET /v1/admin/holdings
   */
  async list(ctx) {
    try {
      const { page, pageSize, status, user } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.holding-service').list({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
        status,
        user,
      });
      ctx.body = paginatedResponse(result.records, result.pagination.page, result.pagination.pageSize, result.pagination.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * GET /v1/admin/holdings/:id
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;
      const holding = await strapi.service('plugin::zhao-wealth.holding-service').detail(Number(id));
      if (!holding) {
        ctx.body = errorResponse(404, '持仓不存在');
        return;
      }
      ctx.body = successResponse(holding);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/admin/holdings
   */
  async create(ctx) {
    try {
      const holding = await strapi.service('plugin::zhao-wealth.holding-service').create(ctx.request.body);
      ctx.body = successResponse(holding, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  /**
   * PUT /v1/admin/holdings/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const holding = await strapi.service('plugin::zhao-wealth.holding-service').update(Number(id), ctx.request.body);
      if (!holding) {
        ctx.body = errorResponse(404, '持仓不存在');
        return;
      }
      ctx.body = successResponse(holding, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  /**
   * DELETE /v1/admin/holdings/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.service('plugin::zhao-wealth.holding-service').remove(Number(id));
      ctx.body = successResponse(null, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓删除失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  /**
   * GET /v1/admin/holdings/:id/profit-trend
   */
  async profitTrend(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.service('plugin::zhao-wealth.holding-service').profitTrend(Number(id));
      if (!result) {
        ctx.body = errorResponse(404, '持仓不存在');
        return;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓盈亏时序查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
