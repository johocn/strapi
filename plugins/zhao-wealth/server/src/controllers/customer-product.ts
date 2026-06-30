'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取用户自选列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20 } = ctx.query;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').getUserProducts(userId, page, pageSize);

      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 自选列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 添加自选（C端）
   */
  async add(ctx) {
    try {
      const { productId } = ctx.request.body;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;

      if (!userId || !channelId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').addProduct(userId, productId, channelId);

      ctx.body = successResponse(result, '添加成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 添加自选失败: ${error.message}`);
      ctx.body = errorResponse(500, '添加失败');
    }
  },

  /**
   * 删除自选（C端）
   */
  async remove(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.customer-product').removeProduct(userId, Number(id));

      if (!result) {
        ctx.body = errorResponse(404, '自选不存在或无权限');
        return;
      }

      ctx.body = successResponse(result, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除自选失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },
});