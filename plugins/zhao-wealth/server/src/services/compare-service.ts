'use strict';

const PERIOD_TO_ANNUAL_FIELD: Record<string, string> = {
  m1: 'annual1m',
  m3: 'annual3m',
  m6: 'annual6m',
  y1: 'annual1y',
};

const PERIOD_TO_DAYS: Record<string, number> = { m1: 30, m3: 90, m6: 180, y1: 365 };

export default ({ strapi }) => ({
  /**
   * 多产品对比
   * 一次返回多产品的年化快照 + 风险指标 + 最新净值
   */
  async compareProducts(productIds: number[], period: string) {
    // 数量校验
    if (productIds.length < 2 || productIds.length > 4) {
      throw new Error('对比产品数量必须为 2-4 个');
    }

    const annualField = PERIOD_TO_ANNUAL_FIELD[period] || PERIOD_TO_ANNUAL_FIELD.m1;

    const results = await Promise.all(productIds.map(async (productId: number) => {
      // 产品基本信息（仅上架产品可对比）
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { id: productId, status: true },
        populate: ['company'],
      });

      if (!product) {
        throw new Error(`产品 ${productId} 不存在或已下架`);
      }

      // 最新净值
      const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: productId },
        orderBy: { navDate: 'desc' },
      });

      // 最新年化快照
      const latestSnapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
        where: { product: productId },
        orderBy: { snapshotDate: 'desc' },
      });

      // 风险指标（取最新日期的 4 项指标）
      const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
      const riskMetric: Record<string, number | null> = {};

      for (const metricName of metricNames) {
        const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
          where: { product: productId, period, metricName },
          orderBy: { snapshotDate: 'desc' },
          limit: 1,
        });
        riskMetric[metricName] = records.length > 0 ? records[0].metricValue : null;
      }

      // Calmar 比率 = 年化收益 / |最大回撤|
      const annualReturn = latestSnapshot ? latestSnapshot[annualField] : null;
      const maxDrawdown = riskMetric.maxDrawdown;
      const calmarRatio = (annualReturn !== null && maxDrawdown !== null && maxDrawdown !== 0)
        ? annualReturn / Math.abs(maxDrawdown)
        : null;

      return {
        productId: product.id,
        productName: product.productName,
        productType: product.productType,
        riskLevel: product.riskLevel,
        companyName: product.company?.name || null,
        latestNav: latestNav || null,
        annualSnapshot: latestSnapshot
          ? {
              annual1m: latestSnapshot.annual1m,
              annual3m: latestSnapshot.annual3m,
              annual6m: latestSnapshot.annual6m,
              annual1y: latestSnapshot.annual1y,
              isEstimate: latestSnapshot.isEstimate,
            }
          : null,
        riskMetric: {
          ...riskMetric,
          calmarRatio,
        },
      };
    }));

    return results;
  },

  /**
   * 多产品累计收益趋势对比
   * 普通产品：区间首条净值归一化 (nav/base-1)*100
   * 货币理财：万份收益累计 (Σ tenThousandIncome/10000)*100
   * 统一日期轴对齐，缺失前值填充、首点前补 0
   */
  async compareTrend(productIds: number[], period: string) {
    if (productIds.length < 2 || productIds.length > 4) {
      throw new Error('对比产品数量必须为 2-4 个');
    }

    const days = PERIOD_TO_DAYS[period] || 30;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const series = await Promise.all(productIds.map(async (productId: number) => {
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { id: productId, status: true },
      });
      if (!product) {
        throw new Error(`产品 ${productId} 不存在或已下架`);
      }

      let points: { date: string; value: number }[] = [];
      if (product.productType === 'money-wealth') {
        const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
          where: { product: productId, incomeDate: { $gte: startStr, $lte: endStr } },
          orderBy: { incomeDate: 'asc' },
          limit: 2000,
        });
        let cum = 0;
        points = incomes.map((r: any) => {
          cum += Number(r.tenThousandIncome || 0) / 10000;
          return { date: r.incomeDate, value: Math.round(cum * 100 * 1e6) / 1e6 };
        });
      } else {
        const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
          where: { product: productId, navDate: { $gte: startStr, $lte: endStr } },
          orderBy: { navDate: 'asc' },
          limit: 2000,
        });
        if (navs.length > 0) {
          const base = Number(navs[0].unitNav) || 1;
          points = navs.map((r: any) => ({
            date: r.navDate,
            value: Math.round((((Number(r.unitNav) || base) / base - 1) * 100) * 1e6) / 1e6,
          }));
        }
      }

      return {
        productId: product.id,
        productName: product.productName,
        productType: product.productType,
        points,
      };
    }));

    // 日期并集（升序去重）
    const dateSet = new Set<string>();
    for (const s of series) {
      for (const p of s.points) dateSet.add(p.date);
    }
    const dates = [...dateSet].sort();

    // 按日期轴对齐：缺失前值填充，首点前补 0
    const aligned = series.map((s) => {
      const values: number[] = [];
      let last: number | null = null;
      let idx = 0;
      for (const d of dates) {
        while (idx < s.points.length && s.points[idx].date < d) {
          last = s.points[idx].value;
          idx++;
        }
        if (idx < s.points.length && s.points[idx].date === d) {
          last = s.points[idx].value;
          idx++;
        }
        values.push(last === null ? 0 : last);
      }
      return {
        productId: s.productId,
        productName: s.productName,
        productType: s.productType,
        values,
      };
    });

    return { period, startDate: startStr, endDate: endStr, dates, series: aligned };
  },
});
