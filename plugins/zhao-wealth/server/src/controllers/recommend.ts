'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取推荐产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 10 } = ctx.query;
      const userId = ctx.state.ssoUser?.sub;
      const channelId = ctx.state.ssoUser?.channel;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      // channel 为可选：未提供渠道时不报错，返回空列表
      if (!channelId) {
        ctx.body = paginatedResponse([], page, pageSize, 0);
        return;
      }

      const recommendations = await strapi.service('plugin::zhao-wealth.recommend-service').getRecommendations(
        userId,
        channelId,
        pageSize
      );

      ctx.body = paginatedResponse(recommendations, page, pageSize, recommendations.length);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});