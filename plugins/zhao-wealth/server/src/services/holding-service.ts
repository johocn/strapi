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

      // P1修复：无净值数据时返回 null 而非 -100% 亏损
      const navVal = latestNav?.unitNav ? Number(latestNav.unitNav) : null;
      const buyNavVal = Number(h.buyNav) || 0;

      if (navVal === null || buyNavVal <= 0 || isNaN(navVal)) {
        return {
          ...h,
          latestNav,
          currentValue: null,
          profit: null,
          profitPercent: null,
        };
      }

      const currentValue = Number(h.buyAmount) * (navVal / buyNavVal);
      const profit = currentValue - Number(h.buyAmount);
      const profitPercent = navVal / buyNavVal - 1;

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

    // P1修复：无净值数据时返回 null 而非 -100% 亏损
    const navVal = latestNav?.unitNav ? Number(latestNav.unitNav) : null;
    const buyNavVal = Number(holding.buyNav) || 0;

    if (navVal === null || buyNavVal <= 0 || isNaN(navVal)) {
      return {
        ...holding,
        latestNav,
        currentValue: null,
        profit: null,
        profitPercent: null,
      };
    }

    const currentValue = Number(holding.buyAmount) * (navVal / buyNavVal);
    const profit = currentValue - Number(holding.buyAmount);
    const profitPercent = navVal / buyNavVal - 1;

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
      // P1修复：防止 buyNav 为 0 导致后续除零
      if (!buyNav || buyNav <= 0 || isNaN(buyNav)) {
        throw new Error(`产品净值无效（unitNav=${nav.unitNav}），无法录入持仓`);
      }
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
      populate: ['product'],
    });

    if (!holding) return [];

    const buyNav = Number(holding.buyNav) || 0;
    const buyAmount = Number(holding.buyAmount);
    const buyDate = new Date(holding.buyDate);

    // P1修复：buyNav 无效时返回空数组，避免后续全部 NaN
    if (buyNav <= 0 || isNaN(buyNav) || isNaN(buyAmount)) {
      strapi.log.warn(`[zhao-wealth] 持仓${holdingId}数据异常: buyNav=${holding.buyNav}, buyAmount=${holding.buyAmount}`);
      return [];
    }

    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: holding.product,
        navDate: { $gte: startDate, $lte: endDate },
      },
      orderBy: { navDate: 'asc' },
    });

    return navs.map((nav: any) => {
      // P1修复：NaN 防护，无效净值跳过计算
      const currentNav = Number(nav.unitNav);
      if (isNaN(currentNav) || currentNav <= 0) {
        return {
          date: nav.navDate,
          nav: null,
          marketValue: null,
          profit: null,
          profitPercent: null,
          annualizedProfit: null,
        };
      }

      const marketValue = buyAmount * (currentNav / buyNav);
      const profit = marketValue - buyAmount;
      const profitPercent = currentNav / buyNav - 1;

      // 年化盈亏
      const navDate = new Date(nav.navDate);
      const holdingDays = Math.floor((navDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
      let annualizedProfit: number | null = null;
      if (holdingDays >= 1) {
        annualizedProfit = Math.pow(currentNav / buyNav, 365 / holdingDays) - 1;
        if (isNaN(annualizedProfit) || !isFinite(annualizedProfit)) annualizedProfit = null;
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
