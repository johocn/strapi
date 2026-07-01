'use strict';

import pluginConfig from '../config';

/**
 * 周期对应的天数
 */
const PERIOD_DAYS: Record<string, number> = {
  'm1': 30,
  'm3': 90,
  'm6': 180,
  'y1': 365,
};

/**
 * 周期到 wealth-annual-snapshot 字段的映射
 * Strapi v5 枚举值不能以数字开头，故用 m1/m3/m6/y1，但表字段是 annual1m/annual3m 等
 */
const PERIOD_TO_ANNUAL_FIELD: Record<string, string> = {
  'm1': 'annual1m',
  'm3': 'annual3m',
  'm6': 'annual6m',
  'y1': 'annual1y',
};

/**
 * 计算日期范围 [startDate, endDate]
 * endDate 为 snapshotDate，startDate = snapshotDate - periodDays
 */
function getPeriodRange(snapshotDate: Date, period: string): { start: Date; end: Date } {
  const days = PERIOD_DAYS[period];
  const end = new Date(snapshotDate);
  const start = new Date(snapshotDate);
  start.setDate(start.getDate() - days);
  return { start, end };
}

/**
 * 计算波动率
 * std(dailyReturns) × sqrt(250)
 */
function calculateVolatility(navs: { navDate: string; unitNav: number }[]): number | null {
  if (navs.length < 2) return null;

  // 按日期升序
  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());

  // 计算每日收益率
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].unitNav;
    const curr = sorted[i].unitNav;
    if (prev <= 0) return null;
    returns.push(curr / prev - 1);
  }

  // 标准差（样本标准差，n-1）
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const std = Math.sqrt(variance);

  // 年化
  return std * Math.sqrt(250);
}

/**
 * 计算最大回撤
 * max((peak - trough) / peak)
 * 返回负数（如 -0.05 表示 -5%）
 */
function calculateMaxDrawdown(navs: { navDate: string; unitNav: number }[]): number | null {
  if (navs.length < 2) return null;

  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());

  let peak = sorted[0].unitNav;
  let maxDrawdown = 0;

  for (const nav of sorted) {
    if (nav.unitNav > peak) {
      peak = nav.unitNav;
    }
    if (peak > 0) {
      const drawdown = (peak - nav.unitNav) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return -maxDrawdown; // 返回负数
}

/**
 * 计算夏普比率
 * (annualReturn - riskFreeRate) / volatility
 */
function calculateSharpe(annualReturn: number | null, volatility: number | null, riskFreeRate: number): number | null {
  if (annualReturn === null || volatility === null || volatility === 0) return null;
  return (annualReturn - riskFreeRate) / volatility;
}

export default ({ strapi }) => ({
  /**
   * 计算单个产品单个周期的 4 项指标
   * 返回 { volatility, maxDrawdown, sharpe, rankPercentile }
   * rankPercentile 需要在 calculateRankPercentile 中分组计算后填充
   */
  async calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
    volatility: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
    annualReturn: number | null;
  }> {
    const { start, end } = getPeriodRange(snapshotDate, period);

    // 取 period 内的净值
    const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
      where: {
        product: productId,
        navDate: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) },
      },
      orderBy: { navDate: 'asc' },
    });

    const volatility = calculateVolatility(navs);
    const maxDrawdown = calculateMaxDrawdown(navs);

    // 取对应周期的年化收益（从 wealth-annual-snapshot）
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];
    const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: {
        product: productId,
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
      },
    });

    const annualReturn = snapshot ? snapshot[annualField] : null;

    const sharpe = calculateSharpe(annualReturn, volatility, pluginConfig.riskFreeRate);

    return { volatility, maxDrawdown, sharpe, annualReturn };
  },

  /**
   * 计算同类排名百分位
   * 按 productType 分组，按同期 annualReturn 降序排名
   * rankPercentile = (rank / total) × 100
   */
  async calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<number | null> {
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];

    // 取当前产品
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return null;

    // 取同类所有产品当日快照（含产品信息用于 productType 过滤）
    const snapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
      where: {
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        product: { productType: product.productType },
      },
      populate: ['product'],
    });

    // 过滤掉 annualReturn 为 null 的
    const valid = snapshots.filter(s => s[annualField] !== null && s[annualField] !== undefined);

    if (valid.length < 2) return null;

    // 按 annualReturn 降序排序
    const sorted = valid.sort((a, b) => b[annualField] - a[annualField]);

    // 找到当前产品的排名
    const rank = sorted.findIndex(s => s.product.id === productId) + 1;

    if (rank === 0) return null; // 当前产品不在列表中

    return (rank / valid.length) * 100;
  },

  /**
   * 计算单个产品的所有 4 周期 × 4 指标并写入数据库
   */
  async calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void> {
    const dateStr = snapshotDate.toISOString().slice(0, 10);
    const periods = pluginConfig.riskMetricPeriods;

    for (const period of periods) {
      const metrics = await this.calculateMetricsForPeriod(productId, snapshotDate, period);
      const rankPercentile = await this.calculateRankPercentile(productId, snapshotDate, period);

      const metricEntries: { metricName: string; metricValue: number | null }[] = [
        { metricName: 'volatility', metricValue: metrics.volatility },
        { metricName: 'maxDrawdown', metricValue: metrics.maxDrawdown },
        { metricName: 'sharpe', metricValue: metrics.sharpe },
        { metricName: 'rankPercentile', metricValue: rankPercentile },
      ];

      for (const entry of metricEntries) {
        // 先删除同日同周期同指标的旧记录（upsert 语义）
        await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').delete({
          where: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
          },
        });

        // 写入新记录（即使 metricValue 为 null 也写入，表示已计算但无数据）
        await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').create({
          data: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
            metricValue: entry.metricValue,
          },
        });
      }
    }

    strapi.log.info(`[zhao-wealth] 产品${productId}风险指标计算完成`);
  },

  /**
   * 批量计算当日所有产品的风险指标
   */
  async calculateAllForDate(snapshotDate: Date): Promise<void> {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      where: { status: true },
    });

    strapi.log.info(`[zhao-wealth] 开始计算 ${products.length} 个产品的风险指标`);

    for (const product of products) {
      try {
        await this.calculateAndSaveMetrics(product.id, snapshotDate);
      } catch (error) {
        strapi.log.error(`[zhao-wealth] 产品${product.id}风险指标计算失败: ${error.message}`);
      }
    }

    strapi.log.info(`[zhao-wealth] 风险指标批量计算完成`);
  },

  /**
   * 全量重算（补全历史数据）
   * 遍历所有有净值数据的历史日期
   */
  async recalculateAll(): Promise<void> {
    // 取所有有净值的日期（去重）
    const navDates = await strapi.db.connection.raw(`
      SELECT DISTINCT nav_date FROM wealth_navs ORDER BY nav_date ASC
    `);

    const dates = navDates.rows.map((r: { nav_date: string }) => new Date(r.nav_date));

    strapi.log.info(`[zhao-wealth] 全量重算风险指标，共 ${dates.length} 个日期`);

    for (const date of dates) {
      await this.calculateAllForDate(date);
    }

    strapi.log.info(`[zhao-wealth] 全量重算完成`);
  },

  /**
   * 指标中心：聚合查询
   * 返回最新 snapshotDate 的 4 指标值
   */
  async adminAggregate(productId: number, period: string) {
    const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];
    const result: Record<string, number | null> = {};

    for (const metricName of metricNames) {
      const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
        where: { product: productId, period, metricName },
        orderBy: { snapshotDate: 'desc' },
        limit: 1,
      });
      result[metricName] = records.length > 0 ? records[0].metricValue : null;
    }

    return result;
  },

  /**
   * 指标中心：历史趋势
   * 返回 4 指标按 snapshotDate 排序的时序数据
   */
  async adminTrend(productId: number) {
    const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { product: productId },
      orderBy: [{ snapshotDate: 'asc' }, { period: 'asc' }],
      limit: 500,
    });

    type MetricItem = { snapshotDate: string; period: string; volatility: number | null; maxDrawdown: number | null; sharpe: number | null; rankPercentile: number | null };

    const trend: Record<string, MetricItem[]> = {
      m1: [], m3: [], m6: [], y1: [],
    };

    const grouped: Record<string, MetricItem> = {};
    for (const r of records) {
      const key = `${r.snapshotDate}_${r.period}`;
      if (!grouped[key]) {
        grouped[key] = {
          snapshotDate: r.snapshotDate,
          period: r.period,
          volatility: null,
          maxDrawdown: null,
          sharpe: null,
          rankPercentile: null,
        };
      }
      grouped[key][r.metricName as keyof MetricItem] = r.metricValue;
    }

    for (const key of Object.keys(grouped)) {
      const item = grouped[key];
      if (trend[item.period]) {
        trend[item.period].push(item);
      }
    }

    return trend;
  },

  /**
   * 指标中心：同类对比
   * 返回同 period + metricName 下所有产品的排名
   */
  async adminPeers(period: string, metricName: string, limit = 50) {
    // 取最新 snapshotDate
    const latest = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { period, metricName },
      orderBy: { snapshotDate: 'desc' },
      limit: 1,
    });

    if (latest.length === 0) return [];

    const snapshotDate = latest[0].snapshotDate;

    // 查同 snapshotDate + period + metricName 的所有产品
    const records = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { snapshotDate, period, metricName },
      populate: ['product'],
      limit,
    });

    // 过滤 null 值并排序
    const valid = records.filter(r => r.metricValue !== null && r.product);

    // 排序方向：maxDrawdown 升序（越小越好），其他降序
    if (metricName === 'maxDrawdown') {
      valid.sort((a, b) => a.metricValue - b.metricValue);
    } else {
      valid.sort((a, b) => b.metricValue - a.metricValue);
    }

    return valid.map((r, index) => ({
      rank: index + 1,
      productId: r.product.id,
      productName: r.product.productName,
      productType: r.product.productType,
      metricValue: r.metricValue,
    }));
  },
});
