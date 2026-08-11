'use strict';

const PERIOD_TO_ANNUAL_FIELD: Record<string, string> = {
  m1: 'annual1m',
  m3: 'annual3m',
  m6: 'annual6m',
  y1: 'annual1y',
};

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
      // 产品基本信息
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { id: productId },
        populate: ['company'],
      });

      if (!product) {
        throw new Error(`产品 ${productId} 不存在`);
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
});
