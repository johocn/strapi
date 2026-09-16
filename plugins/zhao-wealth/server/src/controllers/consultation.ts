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
      const { submitType, name, phone, contactType, contactValue, wechatType, message, productId, portfolioPlanId, preferredTime, preferredChannel } = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').createBooking(String(userId), {
        submitType,
        name,
        phone,
        contactType,
        contactValue,
        wechatType,
        message,
        productId,
        portfolioPlanId,
        preferredTime,
        preferredChannel,
      });
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '提交成功，我们将在1个工作日内与您联系');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 创建预约咨询失败: ${error.message}`);
      ctx.body = errorResponse(500, '提交失败');
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

  /**
   * GET /v1/wealth/consult/config（公开）
   */
  async consultConfig(ctx) {
    try {
      const cfg = await strapi.service('plugin::zhao-wealth.consultation-service').getConsultConfig();
      ctx.body = successResponse(cfg);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * GET /v1/admin/consultations
   */
  async adminList(ctx) {
    try {
      const { page, pageSize, status, submitType } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminListBookings({ page, pageSize, status, submitType });
      ctx.body = successResponse({
        list: result.records,
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total },
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/admin/consultations/:id/reply
   */
  async adminReply(ctx) {
    try {
      const { id } = ctx.params;
      const { reply } = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').replyBooking(Number(id), reply);
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '回复成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 回复留言失败: ${error.message}`);
      ctx.body = errorResponse(500, '回复失败');
    }
  },

  /**
   * GET /v1/admin/consult-config
   */
  async adminGetConfig(ctx) {
    try {
      const cfg = await strapi.service('plugin::zhao-wealth.consultation-service').getConsultConfig();
      ctx.body = successResponse(cfg);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * PUT /v1/admin/consult-config
   */
  async adminUpdateConfig(ctx) {
    try {
      const body = ctx.request.body;
      const record = await strapi.service('plugin::zhao-wealth.consultation-service').adminUpdateConsultConfig(body);
      ctx.body = successResponse(record, '配置已保存');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置保存失败: ${error.message}`);
      ctx.body = errorResponse(500, '保存失败');
    }
  },
});
