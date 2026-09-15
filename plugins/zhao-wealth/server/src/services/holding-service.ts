'use strict';

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const HOLDING = 'plugin::zhao-wealth.wealth-customer-holding';
  const NAV = 'plugin::zhao-wealth.wealth-nav';

  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  function daysBetween(from: string, to: string): number {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  async function getNavOnOrBefore(productId: number, date: string) {
    return strapi.db.query(NAV).findOne({
      where: { product: productId, navDate: { $lte: date } },
      orderBy: { navDate: 'desc' },
    });
  }

  async function getLatestNav(productId: number) {
    return strapi.db.query(NAV).findOne({
      where: { product: productId },
      orderBy: { navDate: 'desc' },
    });
  }

  /**
   * 计算持仓衍生指标：买入净值缺省取买入当日（或之前）净值，再缺省取最新净值
   */
  async function calcMetrics(holding: any): Promise<Record<string, any>> {
    const buyAmount = toNum(holding.buyAmount) || 0;
    const buyDate = holding.buyDate;
    const redeemDate = holding.status === 'redeemed' ? holding.redeemDate || buyDate : null;

    let buyNav = toNum(holding.buyNav);
    let navAnchor = redeemDate || buyDate;
    let latestNav: number | null = null;

    if (buyNav === null) {
      const buyNavRec = await getNavOnOrBefore(holding.product?.id || holding.product, navAnchor);
      buyNav = toNum(buyNavRec?.unitNav);
    }
    const latestRec = redeemDate
      ? await getNavOnOrBefore(holding.product?.id || holding.product, redeemDate)
      : await getLatestNav(holding.product?.id || holding.product);
    latestNav = toNum(latestRec?.unitNav);

    // 均无净值时按 1 处理（货币理财恒净值 1）
    if (buyNav === null || buyNav === 0) buyNav = 1;
    if (latestNav === null || latestNav === 0) latestNav = buyNav;

    const shares = buyAmount / buyNav;
    const currentValue = shares * latestNav;
    const profit = currentValue - buyAmount;
    const profitPercent = buyAmount > 0 ? profit / buyAmount : 0;
    const holdingDays = redeemDate ? daysBetween(buyDate, redeemDate) : daysBetween(buyDate, new Date().toISOString().split('T')[0]);
    let annualizedProfit: number | null = null;
    if (holdingDays > 0 && profitPercent > -1) {
      annualizedProfit = Math.pow(1 + profitPercent, 365 / holdingDays) - 1;
    }

    return {
      buyNav,
      shares,
      currentValue,
      profit,
      profitPercent,
      holdingDays,
      annualizedProfit,
      navDate: latestRec?.navDate || null,
    };
  }

  const populate = ['user', 'product.company'];

  async function list(params: { page?: number; pageSize?: number; status?: string; user?: number }) {
    const { page = 1, pageSize = 20, status, user } = params;
    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (user) where.user = Number(user);

    const query = strapi.db.query(HOLDING);
    const holdings = await query.findMany({ where, limit, offset, orderBy: { createdAt: 'desc' }, populate });
    const total = await query.count({ where });

    const records = [];
    for (const holding of holdings) {
      const metrics = await calcMetrics(holding);
      records.push({ ...holding, ...metrics });
    }

    return { records, pagination: { page, pageSize: limit, total } };
  }

  async function detail(id: number) {
    const holding = await strapi.db.query(HOLDING).findOne({ where: { id }, populate });
    if (!holding) return null;
    const metrics = await calcMetrics(holding);
    return { ...holding, ...metrics };
  }

  async function create(data: any) {
    const payload: any = {
      product: data.product,
      buyDate: data.buyDate,
      buyAmount: data.buyAmount,
    };
    if (data.user) payload.user = data.user;
    if (data.channel) payload.channel = data.channel;
    if (data.buyNav !== undefined && data.buyNav !== null && data.buyNav !== '') payload.buyNav = data.buyNav;
    if (data.remark) payload.remark = data.remark;
    if (data.status) payload.status = data.status;
    if (data.redeemDate) payload.redeemDate = data.redeemDate;

    const holding = await strapi.db.query(HOLDING).create({ data: payload });
    return detail(holding.id);
  }

  async function update(id: number, data: any) {
    const payload: any = {};
    for (const key of ['user', 'product', 'channel', 'buyDate', 'buyAmount', 'buyNav', 'remark', 'status', 'redeemDate']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    await strapi.db.query(HOLDING).update({ where: { id }, data: payload });
    return detail(id);
  }

  async function remove(id: number) {
    await strapi.db.query(HOLDING).delete({ where: { id } });
  }

  /**
   * 盈亏时序：从买入日到最新净值日，按日净值计算市值与盈亏
   */
  async function profitTrend(id: number) {
    const holding = await strapi.db.query(HOLDING).findOne({ where: { id } });
    if (!holding) return null;

    const productId = holding.product?.id || holding.product;
    const navs = await strapi.db.query(NAV).findMany({
      where: { product: productId, navDate: { $gte: holding.buyDate } },
      orderBy: { navDate: 'asc' },
      limit: 1000,
    });

    const buyNav = toNum(holding.buyNav) || toNum(navs[0]?.unitNav) || 1;
    const shares = (toNum(holding.buyAmount) || 0) / buyNav;

    const points = navs.map((nav: any) => {
      const value = shares * (toNum(nav.unitNav) || buyNav);
      return {
        date: nav.navDate,
        value,
        profit: value - (toNum(holding.buyAmount) || 0),
      };
    });

    return { points };
  }

  return { list, detail, create, update, remove, profitTrend };
};
