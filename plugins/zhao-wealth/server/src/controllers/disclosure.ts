'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * C 端：按 productType 获取披露文案
   * GET /v1/wealth/disclosure?productType=bank-wealth
   */
  async getByProductType(ctx) {
    try {
      const { productType } = ctx.query;

      if (!productType) {
        ctx.body = errorResponse(400, 'productType 参数必填');
        return;
      }

      const validTypes = ['bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund'];
      if (!validTypes.includes(productType)) {
        ctx.body = errorResponse(400, '无效的 productType');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.disclosure-service').getByProductType(productType);

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询披露文案失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 后台：披露文案列表
   * GET /wealth-admin/v1/disclosures
   */
  async adminList(ctx) {
    try {
      const { page = 1, pageSize = 20, productType } = ctx.query;
      const filters: any = {};
      if (productType) filters.productType = productType;

      const limit = Math.min(Number(pageSize), 500);
      const offset = (Number(page) - 1) * limit;

      const records = await strapi.db.query('plugin::zhao-wealth.wealth-disclosure').findMany({
        where: filters,
        limit,
        offset,
        orderBy: { effectiveDate: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-disclosure').count({ where: filters });

      ctx.body = successResponse({ records, page: Number(page), pageSize: limit, total });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 披露文案列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 后台：创建披露文案
   * POST /wealth-admin/v1/disclosures
   */
  async adminCreate(ctx) {
    try {
      const { productType, title, content, effectiveDate, status } = ctx.request.body;

      if (!productType || !title || !content || !effectiveDate) {
        ctx.body = errorResponse(400, 'productType, title, content, effectiveDate 必填');
        return;
      }

      const record = await strapi.db.query('plugin::zhao-wealth.wealth-disclosure').create({
        data: { productType, title, content, effectiveDate, status: status !== undefined ? status : true },
      });

      ctx.body = successResponse(record, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 创建披露文案失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  /**
   * 后台：更新披露文案
   * PUT /wealth-admin/v1/disclosures/:id
   */
  async adminUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const record = await strapi.db.query('plugin::zhao-wealth.wealth-disclosure').update({
        where: { id: Number(id) },
        data,
      });

      if (!record) {
        ctx.body = errorResponse(404, '披露文案不存在');
        return;
      }

      ctx.body = successResponse(record, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 更新披露文案失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  /**
   * 后台：删除披露文案
   * DELETE /wealth-admin/v1/disclosures/:id
   */
  async adminDelete(ctx) {
    try {
      const { id } = ctx.params;

      const record = await strapi.db.query('plugin::zhao-wealth.wealth-disclosure').delete({
        where: { id: Number(id) },
      });

      if (!record) {
        ctx.body = errorResponse(404, '披露文案不存在');
        return;
      }

      ctx.body = successResponse(record, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除披露文案失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },
});
