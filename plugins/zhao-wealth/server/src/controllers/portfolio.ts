'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * GET /v1/wealth/portfolio-plans
   */
  async list(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { page, pageSize } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').getPlans(String(userId), {
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
      });
      ctx.body = paginatedResponse(result.records, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 组合方案列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/wealth/portfolio-plans
   */
  async create(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { planName, planType, products, totalAmount } = ctx.request.body;
      if (!planName || !products) {
        ctx.body = errorResponse(400, 'planName 和 products 必填');
        return;
      }
      const record = await strapi.service('plugin::zhao-wealth.portfolio-service').createPlan(String(userId), {
        planName,
        planType,
        products,
        totalAmount,
      });
      ctx.body = successResponse(record, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 创建组合方案失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  /**
   * GET /v1/wealth/portfolio-plans/:id
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;
      const record = await strapi.service('plugin::zhao-wealth.portfolio-service').getPlanDetail(Number(id));
      if (!record) {
        ctx.body = errorResponse(404, '组合方案不存在');
        return;
      }
      ctx.body = successResponse(record);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 组合方案详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * PUT /v1/wealth/portfolio-plans/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const record = await strapi.service('plugin::zhao-wealth.portfolio-service').updatePlan(Number(id), data);
      ctx.body = successResponse(record, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 更新组合方案失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  /**
   * DELETE /v1/wealth/portfolio-plans/:id
   */
  async remove(ctx) {
    try {
      const { id } = ctx.params;
      const record = await strapi.service('plugin::zhao-wealth.portfolio-service').deletePlan(Number(id));
      ctx.body = successResponse(record, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除组合方案失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  /**
   * GET /v1/wealth/portfolio-plans/:id/performance
   */
  async performance(ctx) {
    try {
      const { id } = ctx.params;
      const { period } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').calculatePlanPerformance(Number(id), period || 'm1');
      if (!result) {
        ctx.body = errorResponse(404, '组合方案不存在或无产品数据');
        return;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 组合业绩查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/wealth/portfolio-plans/:id/export
   */
  async export(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').exportPlanSummary(Number(id));
      if (!result) {
        ctx.body = errorResponse(404, '组合方案不存在');
        return;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 导出方案摘要失败: ${error.message}`);
      ctx.body = errorResponse(500, '导出失败');
    }
  },
});
