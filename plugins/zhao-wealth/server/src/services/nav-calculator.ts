'use strict';

import { getPreviousTradingDay, getNaturalDays, calculateAnnualReturn, calculateMoneyFundAnnual, isEstimateValue } from '../utils';

export default ({ strapi }) => ({
  /**
   * 计算单个产品的年化快照
   */
  async calculateSnapshot(productId: number, snapshotDate: Date) {
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) {
      strapi.log.warn(`[zhao-wealth] 产品不存在: ${productId}`);
      return null;
    }

    const isMoneyFund = product.productType === 'money-fund';

    if (isMoneyFund) {
      return await this.calculateMoneyFundSnapshot(productId, snapshotDate);
    } else {
      return await this.calculateNavSnapshot(productId, snapshotDate);
    }
  },

  /**
   * 净值复利年化快照计算（理财/普通基金）
   */
  async calculateNavSnapshot(productId: number, snapshotDate: Date) {
    const periods = [
      { field: 'annual1d', days: 1 },
      { field: 'annual3d', days: 3 },
      { field: 'annual7d', days: 7 },
      { field: 'annual2w', days: 14 },
      { field: 'annual1m', days: 22 },
      { field: 'annual3m', days: 66 },
      { field: 'annual6m', days: 125 },
      { field: 'annual1y', days: 250 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
    };

    // 获取当日净值
    const currentNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: productId, navDate: snapshotDate },
    });

    if (!currentNav || !currentNav.unitNav) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}当日无净值数据`);
      return null;
    }

    for (const period of periods) {
      const prevDate = getPreviousTradingDay(snapshotDate, period.days);

      if (!prevDate) {
        snapshot[period.field] = null;
        continue;
      }

      const prevNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId, navDate: prevDate },
      });

      if (!prevNav || !prevNav.unitNav || prevNav.unitNav <= 0) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 产品${productId}周期${period.field}净值不足`);
        continue;
      }

      const naturalDays = getNaturalDays(prevDate, snapshotDate);
      const annualReturn = calculateAnnualReturn(prevNav.unitNav, currentNav.unitNav, naturalDays);

      snapshot[period.field] = annualReturn;
    }

    // 判断是否为估算值
    const minNaturalDays = getNaturalDays(getPreviousTradingDay(snapshotDate, 7), snapshotDate);
    snapshot.isEstimate = isEstimateValue(minNaturalDays || 0);

    return snapshot;
  },

  /**
   * 货币基金年化快照计算（万份收益单利）
   */
  async calculateMoneyFundSnapshot(productId: number, snapshotDate: Date) {
    const periods = [
      { field: 'annual7d', days: 7 },
      { field: 'annual1m', days: 30 },
      { field: 'annual3m', days: 90 },
      { field: 'annual6m', days: 180 },
      { field: 'annual1y', days: 365 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
      annual1d: null,
      annual3d: null,
      annual2w: null,
      isEstimate: false,
    };

    for (const period of periods) {
      const startDate = new Date(snapshotDate);
      startDate.setDate(startDate.getDate() - period.days);

      const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: startDate, $lte: snapshotDate },
        },
      });

      if (incomes.length < period.days) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 货基${productId}周期${period.field}收益数据不足`);
        continue;
      }

      // 缺失日期填充0
      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const annualReturn = calculateMoneyFundAnnual(totalIncome, period.days);

      snapshot[period.field] = annualReturn;
    }

    return snapshot;
  },

  /**
   * 批量重算年化快照
   */
  async recalculateSnapshots(productId: number, startDate: Date, endDate: Date) {
    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: productId,
        navDate: { $gte: startDate, $lte: endDate },
      },
      orderBy: { navDate: 'asc' },
    });

    for (const nav of navs) {
      const snapshot = await this.calculateSnapshot(productId, nav.navDate);

      if (snapshot) {
        // 更新或创建快照
        const existing = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
          where: { product: productId, snapshotDate: nav.navDate },
        });

        if (existing) {
          await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').update({
            where: { id: existing.id },
            data: snapshot,
          });
        } else {
          await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
        }
      }
    }

    strapi.log.info(`[zhao-wealth] 产品${productId}年化快照重算完成，${navs.length}条`);
  },

  /**
   * 全量重算所有产品年化快照
   */
  async recalculateAll() {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany();

    for (const product of products) {
      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: { product: product.id },
        orderBy: { navDate: 'asc' },
      });

      if (navs.length > 0) {
        const startDate = navs[0].navDate;
        const endDate = navs[navs.length - 1].navDate;
        await this.recalculateSnapshots(product.id, startDate, endDate);
      }
    }

    strapi.log.info(`[zhao-wealth] 全量年化快照重算完成，${products.length}个产品`);
  },
});