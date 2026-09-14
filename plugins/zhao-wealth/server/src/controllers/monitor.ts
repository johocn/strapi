'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * 净值监察列表（管理端）
   */
  async list(ctx) {
    try {
      const result = await strapi
        .service('plugin::zhao-wealth.monitor-service')
        .getProductMonitorList();
      ctx.body = successResponse(result, 'success');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值监察查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
});
