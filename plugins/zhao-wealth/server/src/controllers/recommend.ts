'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取推荐产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 10 } = ctx.query;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;

      if (!userId || !channelId) {
        ctx.body = errorResponse(403, '需要登录');
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