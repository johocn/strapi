'use strict';

export default ({ strapi }) => ({
  /**
   * 按 productType 查询生效披露文案
   * 先查专属类型，无结果回退到 all
   */
  async getByProductType(productType: string) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-disclosure');

    // 1. 先查专属 productType
    const specific = await query.findOne({
      where: { productType, status: true },
      orderBy: { effectiveDate: 'desc' },
    });

    if (specific) {
      return specific;
    }

    // 2. 回退到 all
    const general = await query.findOne({
      where: { productType: 'all', status: true },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!general) {
      strapi.log.warn(`[zhao-wealth] 未找到 productType=${productType} 的披露文案`);
    }

    return general || null;
  },
});
