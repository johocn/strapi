'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * POST /v1/wealth/consultations
   */
  async create(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { name, phone, productId, portfolioPlanId, preferredTime, preferredChannel, message } = ctx.request.body;
      if (!name || !phone) {
        ctx.body = errorResponse(400, 'name 和 phone 必填');
        return;
      }
      const record = await strapi.service('plugin::zhao-wealth.consultation-service').createBooking(String(userId), {
        name,
        phone,
        productId,
        portfolioPlanId,
        preferredTime,
        preferredChannel,
        message,
      });
      ctx.body = successResponse(record, '预约成功，我们将在1个工作日内与您联系');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 创建预约咨询失败: ${error.message}`);
      ctx.body = errorResponse(500, '预约失败');
    }
  },

  /**
   * GET /v1/wealth/consultations
   */
  async list(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const records = await strapi.service('plugin::zhao-wealth.consultation-service').getBookings(String(userId));
      ctx.body = successResponse(records);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 预约列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/wealth/consultations/:id/cancel
   */
  async cancel(ctx) {
    try {
      const { id } = ctx.params;
      const record = await strapi.service('plugin::zhao-wealth.consultation-service').cancelBooking(Number(id));
      ctx.body = successResponse(record, '已取消预约');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 取消预约失败: ${error.message}`);
      ctx.body = errorResponse(500, '取消失败');
    }
  },

  /**
   * GET /v1/wealth/products/:id/risk-disclosure
   */
  async disclosure(ctx) {
    try {
      const { id } = ctx.params;
      const { period } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.risk-disclosure-service').getDynamicDisclosure(Number(id), period || 'm1');
      if (!result) {
        ctx.body = errorResponse(404, '产品不存在');
        return;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 风险揭示查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
