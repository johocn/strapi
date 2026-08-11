'use strict';

import { successResponse, errorResponse, paginatedResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * C 端：当前用户持仓列表
   * GET /v1/wealth/holdings
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20 } = ctx.query;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').getUserHoldings(userId, Number(page), Number(pageSize));

      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * C 端：持仓详情
   * GET /v1/wealth/holdings/:id
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').getHoldingDetail(Number(id), userId);

      if (!result) {
        ctx.body = errorResponse(404, '持仓不存在或无权限');
        return;
      }

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * C 端：持仓盈亏时序
   * GET /v1/wealth/holdings/:id/profit-trend?startDate=&endDate=
   */
  async profitTrend(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate } = ctx.query;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      // 验证持仓归属
      const holding = await strapi.service('plugin::zhao-wealth.holding-service').getHoldingDetail(Number(id), userId);
      if (!holding) {
        ctx.body = errorResponse(404, '持仓不存在或无权限');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').calcProfitTrend(Number(id), startDate, endDate);

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 持仓盈亏时序查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * C 端：添加持仓
   * POST /v1/wealth/holdings
   */
  async add(ctx) {
    try {
      const { productId, buyDate, buyAmount, buyNav, remark } = ctx.request.body;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;

      if (!userId || !channelId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      if (!productId || !buyDate || !buyAmount) {
        ctx.body = errorResponse(400, 'productId, buyDate, buyAmount 必填');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').createHolding({
        userId, productId, channelId, buyDate, buyAmount, buyNav, remark,
      });

      ctx.body = successResponse(result, '添加成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 添加持仓失败: ${error.message}`);
      ctx.body = errorResponse(500, error.message || '添加失败');
    }
  },

  /**
   * C 端：删除持仓
   * DELETE /v1/wealth/holdings/:id
   */
  async remove(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.body = errorResponse(403, '需要登录');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').deleteHolding(Number(id), userId);

      if (!result) {
        ctx.body = errorResponse(404, '持仓不存在或无权限');
        return;
      }

      ctx.body = successResponse(result, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除持仓失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  /**
   * 后台：渠道管理员查看客户持仓
   * GET /wealth-admin/v1/holdings
   */
  async adminList(ctx) {
    try {
      const { page = 1, pageSize = 20, channelId, userId } = ctx.query;
      const filters: any = {};
      if (channelId) filters.channel = channelId;
      if (userId) filters.user = userId;

      const limit = Math.min(Number(pageSize), 500);
      const offset = (Number(page) - 1) * limit;

      const records = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findMany({
        where: filters,
        limit,
        offset,
        orderBy: { buyDate: 'desc' },
        populate: ['product', 'user'],
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').count({ where: filters });

      ctx.body = successResponse({ records, page: Number(page), pageSize: limit, total });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 后台持仓列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * 后台：理财经理代客录入持仓
   * POST /wealth-admin/v1/holdings
   */
  async adminCreate(ctx) {
    try {
      const { userId, productId, channelId, buyDate, buyAmount, buyNav, remark } = ctx.request.body;
      const managerId = ctx.state.user?.id;

      if (!userId || !productId || !channelId || !buyDate || !buyAmount) {
        ctx.body = errorResponse(400, 'userId, productId, channelId, buyDate, buyAmount 必填');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.holding-service').createHolding({
        userId, productId, channelId, buyDate, buyAmount, buyNav, remark, createdByManager: managerId,
      });

      ctx.body = successResponse(result, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 后台创建持仓失败: ${error.message}`);
      ctx.body = errorResponse(500, error.message || '创建失败');
    }
  },
});
