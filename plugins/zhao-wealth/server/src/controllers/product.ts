'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 获取产品列表（C端）
   * 支持参数：
   *   - page / pageSize 分页
   *   - productType 产品类型
   *   - riskLevel 风险等级
   *   - operationMode 运作模式（daily-open/fixed-term/closed）
   *   - productName 产品名称模糊搜索
   *   - sortBy 排序（score/annual1m/volatility）
   */
  async list(ctx) {
    try {
      const {
        page = 1,
        pageSize = 100,
        productType,
        riskLevel,
        operationMode,
        productName,
        sortBy,
      } = ctx.query;

      const filters: any = { status: true };
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;
      if (operationMode) filters.operationMode = operationMode;
      if (productName) {
        filters.productName = { $containsi: productName };
      }

      const options: any = {};
      if (sortBy) options.sortBy = sortBy;

      const result = await strapi
        .service('plugin::zhao-wealth.product')
        .findList(filters, Number(page), Number(pageSize), options);

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
