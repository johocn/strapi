'use strict';

export default ({ strapi }) => ({
  /**
   * 获取用户持仓列表（含实时盈亏）
   */
  async getUserHoldings(userId: number, page: number, pageSize: number) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const holdings = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findMany({
      where: { user: userId, status: 'holding' },
      limit,
      offset,
      orderBy: { buyDate: 'desc' },
      populate: ['product'],
    });

    const total = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').count({
      where: { user: userId, status: 'holding' },
    });

    // 补充实时盈亏
    const list = await Promise.all(holdings.map(async (h: any) => {
      const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: h.product.id },
        orderBy: { navDate: 'desc' },
      });

      const currentNav = latestNav?.unitNav || 0;
      const buyNav = Number(h.buyNav) || 1;
      const currentValue = Number(h.buyAmount) * (currentNav / buyNav);
      const profit = currentValue - Number(h.buyAmount);
      const profitPercent = buyNav > 0 ? (currentNav / buyNav - 1) : 0;

      return {
        ...h,
        latestNav,
        currentValue: Math.round(currentValue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitPercent: Math.round(profitPercent * 10000) / 10000,
      };
    }));

    return { list, page, pageSize: limit, total };
  },

  /**
   * 获取持仓详情
   */
  async getHoldingDetail(holdingId: number, userId: number) {
    const holding = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findOne({
      where: { id: holdingId, user: userId },
      populate: ['product'],
    });

    if (!holding) return null;

    const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: holding.product.id },
      orderBy: { navDate: 'desc' },
    });

    const currentNav = latestNav?.unitNav || 0;
    const buyNav = Number(holding.buyNav) || 1;
    const currentValue = Number(holding.buyAmount) * (currentNav / buyNav);
    const profit = currentValue - Number(holding.buyAmount);
    const profitPercent = buyNav > 0 ? (currentNav / buyNav - 1) : 0;

    return {
      ...holding,
      latestNav,
      currentValue: Math.round(currentValue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitPercent: Math.round(profitPercent * 10000) / 10000,
    };
  },

  /**
   * 创建持仓（buyNav 自动填充）
   */
  async createHolding(data: {
    userId: number;
    productId: number;
    channelId: number;
    buyDate: string;
    buyAmount: number;
    buyNav?: number;
    remark?: string;
    createdByManager?: number;
  }) {
    let buyNav = data.buyNav;

    // buyNav 未传时自动填充
    if (!buyNav) {
      // 先查 buyDate 当日净值
      let nav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: data.productId, navDate: data.buyDate },
      });

      // 当日无净值，取 buyDate 之前最近一日
      if (!nav) {
        nav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
          where: { product: data.productId, navDate: { $lt: data.buyDate } },
          orderBy: { navDate: 'desc' },
        });
      }

      if (!nav) {
        throw new Error('产品无净值数据，无法录入持仓');
      }

      buyNav = Number(nav.unitNav);
    }

    return await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').create({
      data: {
        user: data.userId,
        product: data.productId,
        channel: data.channelId,
        buyDate: data.buyDate,
        buyAmount: data.buyAmount,
        buyNav,
        remark: data.remark,
        status: 'holding',
        createdByManager: data.createdByManager,
      },
    });
  },

  /**
   * 计算持仓盈亏时序（思路 C：市值曲线）
   * marketValue = buyAmount * (currentNav / buyNav)
   * annualizedProfit = (currentNav / buyNav) ^ (365 / 持有天数) - 1
   */
  async calcProfitTrend(holdingId: number, startDate: string, endDate: string) {
    const holding = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findOne({
      where: { id: holdingId },
    });

    if (!holding) return [];

    const buyNav = Number(holding.buyNav) || 1;
    const buyAmount = Number(holding.buyAmount);
    const buyDate = new Date(holding.buyDate);

    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: holding.product,
        navDate: { $gte: startDate, $lte: endDate },
      },
      orderBy: { navDate: 'asc' },
    });

    return navs.map((nav: any) => {
      const currentNav = Number(nav.unitNav);
      const marketValue = buyAmount * (currentNav / buyNav);
      const profit = marketValue - buyAmount;
      const profitPercent = buyNav > 0 ? (currentNav / buyNav - 1) : 0;

      // 年化盈亏
      const navDate = new Date(nav.navDate);
      const holdingDays = Math.floor((navDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
      let annualizedProfit: number | null = null;
      if (holdingDays >= 1 && buyNav > 0) {
        annualizedProfit = Math.pow(currentNav / buyNav, 365 / holdingDays) - 1;
      }

      return {
        date: nav.navDate,
        nav: currentNav,
        marketValue: Math.round(marketValue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitPercent: Math.round(profitPercent * 10000) / 10000,
        annualizedProfit: annualizedProfit !== null
          ? Math.round(annualizedProfit * 1000000) / 1000000
          : null,
      };
    });
  },

  /**
   * 更新持仓
   */
  async updateHolding(holdingId: number, userId: number, data: any) {
    const holding = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findOne({
      where: { id: holdingId, user: userId },
    });

    if (!holding) return null;

    return await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').update({
      where: { id: holdingId },
      data,
    });
  },

  /**
   * 删除持仓
   */
  async deleteHolding(holdingId: number, userId: number) {
    const holding = await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').findOne({
      where: { id: holdingId, user: userId },
    });

    if (!holding) return null;

    return await strapi.db.query('plugin::zhao-wealth.wealth-customer-holding').delete({
      where: { id: holdingId },
    });
  },
});
