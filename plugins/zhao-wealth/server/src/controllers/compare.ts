'use strict';

import { successResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  /**
   * C 端：产品对比
   * GET /v1/wealth/compare?productIds=1,2,3&period=m1
   */
  async compare(ctx) {
    try {
      const { productIds, period = 'm1' } = ctx.query;

      if (!productIds) {
        ctx.body = errorResponse(400, 'productIds 参数必填');
        return;
      }

      const ids = String(productIds)
        .split(',')
        .map((s: string) => Number(s.trim()))
        .filter((n: number) => !isNaN(n) && n > 0);

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      if (!validPeriods.includes(period as string)) {
        ctx.body = errorResponse(400, '无效的 period，可选 m1/m3/m6/y1');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.compare-service').compareProducts(ids, period as string);

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品对比失败: ${error.message}`);
      ctx.body = errorResponse(500, error.message || '对比失败');
    }
  },
});
