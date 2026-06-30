'use strict';

export default ({ strapi }) => ({
  /**
   * 获取年化快照时序数据
   */
  async getSnapshotTimeSeries(productId: number, startDate: Date, endDate: Date, page: number, pageSize: number) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const snapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate },
      },
      limit,
      offset,
      orderBy: { snapshotDate: 'desc' },
    });

    const total = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').count({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate },
      },
    });

    return { list: snapshots, page, pageSize: limit, total };
  },

  /**
   * 获取年度收益列表
   */
  async getYearlyReturns(productId: number) {
    const returns = await strapi.db.query('plugin::zhao-wealth.wealth-yearly-return').findMany({
      where: { product: productId },
      orderBy: { year: 'desc' },
    });

    return returns;
  },

  /**
   * 计算并保存年度收益
   */
  async calculateYearlyReturn(productId: number, year: number) {
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return null;

    const isMoneyFund = product.productType === 'money-fund';

    if (isMoneyFund) {
      // 货币基金年度收益计算
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: yearStart, $lte: yearEnd },
        },
      });

      if (incomes.length < 365) {
        strapi.log.warn(`[zhao-wealth] 货基${productId} ${year}年数据不完整`);
        return null;
      }

      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const avgIncome = totalIncome / incomes.length;
      const annualReturn = avgIncome * 365 / 10000;

      return await strapi.db.query('plugin::zhao-wealth.wealth-yearly-return').create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1000000) / 1000000,
          baseDays: 365,
        },
      });
    } else {
      // 理财/普通基金年度收益计算
      const yearStartNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'asc' },
      });

      const yearEndNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'desc' },
      });

      if (!yearStartNav || !yearEndNav) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年净值数据不完整`);
        return null;
      }

      // 检查是否为完整年度
      const startYear = new Date(yearStartNav.navDate).getFullYear();
      const endYear = new Date(yearEndNav.navDate).getFullYear();

      if (startYear !== year || endYear !== year) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年存续不足完整年度`);
        return null;
      }

      const annualReturn = Math.pow(yearEndNav.unitNav / yearStartNav.unitNav, 365 / 365) - 1;

      return await strapi.db.query('plugin::zhao-wealth.wealth-yearly-return').create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1000000) / 1000000,
          baseDays: 365,
        },
      });
    }
  },
});