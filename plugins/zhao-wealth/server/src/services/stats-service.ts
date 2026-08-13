'use strict';

export default ({ strapi }) => ({
  /**
   * 全局概览统计
   * 返回 productCount/companyCount/collectSuccessRate/riskMetricCoverage/todayAnomaly
   */
  async getOverview() {
    const productCount = await strapi.db.query('plugin::zhao-wealth.wealth-product').count();
    const companyCount = await strapi.db.query('plugin::zhao-wealth.wealth-company').count();

    // 采集成功率
    const collectSuccess = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'success' } });
    const collectFailed = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'failed' } });
    const collectPending = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'pending' } });
    const collectTotal = collectSuccess + collectFailed + collectPending;
    const collectSuccessRate = collectTotal > 0 ? collectSuccess / collectTotal : 0;

    // 指标覆盖率：有 risk_metric 记录的产品数 / 产品总数（通过链接表关联）
    let riskMetricCoverage = 0;
    if (productCount > 0) {
      try {
        const productsWithMetrics = await strapi.db.connection.raw(`
          SELECT COUNT(DISTINCT lnk.wealth_product_id) AS cnt
          FROM wealth_risk_metrics_product_lnk lnk
        `);
        riskMetricCoverage = Number(productsWithMetrics.rows[0].cnt) / productCount;
      } catch {
        riskMetricCoverage = 0;
      }
    }

    // 今日采集：今日新增的净值记录数
    // P2修复：使用 UTC+8 时区获取"今日"，避免服务器非 UTC+8 时日期偏移
    const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const todayNavResult = await strapi.db.connection.raw(`
      SELECT COUNT(*) AS cnt FROM wealth_navs
      WHERE created_at >= ?
    `, [today]);
    const todayCollected = Number(todayNavResult.rows[0].cnt);

    // 失败数：采集状态为 failed 的配置数
    const failedCount = collectFailed;

    // 最后运行时间：最近一次采集成功的时间
    const lastConfig = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findOne({
      where: { collectStatus: 'success' },
      orderBy: { lastCollectTime: 'desc' },
    });
    const lastRunTime = lastConfig?.lastCollectTime
      ? new Date(lastConfig.lastCollectTime).toISOString().slice(0, 16).replace('T', ' ')
      : '--';

    return {
      totalProducts: productCount,
      companyCount,
      todayCollected,
      failedCount,
      lastRunTime,
      collectSuccessRate: Number(collectSuccessRate.toFixed(4)),
      riskMetricCoverage: Number(riskMetricCoverage.toFixed(4)),
    };
  },

  /**
   * 异常列表
   * 返回最近 N 条采集失败 + 指标计算失败记录
   */
  async getAnomalies(limit = 10) {
    // 采集失败记录
    const failedConfigs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
      where: { collectStatus: 'failed' },
      populate: ['product'],
      limit,
      orderBy: { updatedAt: 'desc' },
    });

    const collectAnomalies = failedConfigs.map(c => ({
      type: 'collect_failed',
      productId: c.product?.id,
      productName: c.product?.productName,
      failCount: c.failCount || 0,
      lastCollectTime: c.lastCollectTime,
      message: `采集失败 ${c.failCount || 0} 次`,
    }));

    // 指标计算失败记录（metricValue is null）
    const nullMetrics = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
      where: { metricValue: null },
      populate: ['product'],
      limit,
      orderBy: { snapshotDate: 'desc' },
    });

    const metricAnomalies = nullMetrics.map(m => ({
      type: 'metric_null',
      productId: m.product?.id,
      productName: m.product?.productName,
      snapshotDate: m.snapshotDate,
      period: m.period,
      metricName: m.metricName,
      message: `${m.period} 周期 ${m.metricName} 计算失败`,
    }));

    // 合并并按时间倒序
    const all = [...collectAnomalies, ...metricAnomalies];
    return all.slice(0, limit);
  },
});
