'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * GET /v1/wealth/scores/leaderboard
   */
  async leaderboard(ctx) {
    try {
      const { productType, operationMode, period, riskLevel, page, pageSize } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.scoring-service').getScoreLeaderboard({
        productType,
        operationMode,
        period: period || 'm1',
        riskLevel,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 10,
      });
      ctx.body = paginatedResponse(result.records, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 评分榜单查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * GET /v1/wealth/products/:id/scores
   */
  async breakdown(ctx) {
    try {
      const { id } = ctx.params;
      const { period } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.scoring-service').getScoreBreakdown(Number(id), period || 'm1');
      if (!result) {
        ctx.body = errorResponse(404, '评分数据不存在');
        return;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 评分明细查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/wealth/scores/recalculate
   */
  async recalculate(ctx) {
    try {
      const { period } = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.scoring-service').recalculateAllScores(period || 'm1');
      ctx.body = successResponse(result, `评分重算完成: 成功${result.success}个, 失败${result.failed}个`);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 评分重算失败: ${error.message}`);
      ctx.body = errorResponse(500, '重算失败');
    }
  },
});
