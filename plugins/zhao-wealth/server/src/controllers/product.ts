'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 100, productType, riskLevel } = ctx.query;

      const filters: any = { status: true };
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;

      const result = await strapi.service('plugin::zhao-wealth.product').findList(filters, page, pageSize);

      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 获取产品详情（C端）
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;

      const product = await strapi.service('plugin::zhao-wealth.product').findOne(Number(id));

      if (!product) {
        ctx.body = errorResponse(404, '产品不存在');
        return;
      }

      ctx.body = successResponse(product);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});