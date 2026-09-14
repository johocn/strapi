'use strict';

import { toDateStr } from '../utils';

const NAV_STALE_YELLOW_DAYS = 3;
const NAV_STALE_RED_DAYS = 7;

export default ({ strapi }) => ({
  /**
   * 净值监察列表：每产品实时推导最新净值/年化/风险指标 + 双维度状态
   */
  async getProductMonitorList() {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      populate: ['company'],
      orderBy: { id: 'asc' },
    });

    const list: any[] = [];
    for (const product of products) {
      list.push(await this.buildProductMonitor(product));
    }

    return {
      list,
      summary: {
        ok: list.filter((p) => p.overall === 'ok').length,
        warning: list.filter((p) => p.overall === 'warning').length,
        danger: list.filter((p) => p.overall === 'danger').length,
      },
    };
  },

  async buildProductMonitor(product: any) {
    const latestNav: any = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: product.id },
      orderBy: { navDate: 'desc' },
    });

    const latestSnapshot: any = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: { product: product.id },
      orderBy: { snapshotDate: 'desc' },
    });

    const latestMetricDateRow: any = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findOne({
      where: { product: product.id },
      orderBy: { snapshotDate: 'desc' },
    });

    let latestMetrics: any = null;
    if (latestMetricDateRow) {
      const metricRows: any[] = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findMany({
        where: { product: product.id, snapshotDate: latestMetricDateRow.snapshotDate, period: 'm1' },
      });
      const metricMap: Record<string, number | null> = {};
      for (const row of metricRows) {
        metricMap[row.metricName] = row.metricValue;
      }
      latestMetrics = {
        snapshotDate: latestMetricDateRow.snapshotDate,
        volatility: metricMap.volatility ?? null,
        maxDrawdown: metricMap.maxDrawdown ?? null,
        sharpe: metricMap.sharpe ?? null,
      };
    }

    const navStatus = this.judgeNavStatus(latestNav);
    const annualStatus = this.judgeSyncStatus(
      latestSnapshot?.snapshotDate || null,
      latestNav?.navDate || null
    );
    const riskStatus = this.judgeSyncStatus(
      latestMetrics?.snapshotDate || null,
      latestNav?.navDate || null
    );

    const statuses = [navStatus.status, annualStatus, riskStatus];
    const overall = statuses.includes('danger') ? 'danger'
      : statuses.includes('warning') ? 'warning'
      : 'ok';

    return {
      id: product.id,
      productName: product.productName,
      productCode: product.productCode || product.saleCode || '',
      companyName: product.company?.shortName || product.company?.name || '',
      latestNav: latestNav
        ? {
            navDate: latestNav.navDate,
            unitNav: latestNav.unitNav,
            accNav: latestNav.accNav,
            dataSource: latestNav.dataSource,
          }
        : null,
      latestSnapshot: latestSnapshot
        ? {
            snapshotDate: latestSnapshot.snapshotDate,
            annual1m: latestSnapshot.annual1m,
            annual3m: latestSnapshot.annual3m,
            annual6m: latestSnapshot.annual6m,
            annual1y: latestSnapshot.annual1y,
          }
        : null,
      latestMetrics,
      navStatus: navStatus.status,
      navDaysBehind: navStatus.daysBehind,
      annualStatus,
      riskStatus,
      overall,
    };
  },

  /**
   * 净值新鲜度：距今天数 > 7 danger，> 3 warning，否则 ok
   */
  judgeNavStatus(latestNav: any) {
    if (!latestNav?.navDate) return { status: 'danger', daysBehind: null };
    const todayStr = toDateStr(new Date());
    const navDateStr = String(latestNav.navDate);
    const daysBehind = Math.floor(
      (new Date(todayStr).getTime() - new Date(navDateStr).getTime()) / 86400000
    );
    if (daysBehind > NAV_STALE_RED_DAYS) return { status: 'danger', daysBehind };
    if (daysBehind > NAV_STALE_YELLOW_DAYS) return { status: 'warning', daysBehind };
    return { status: 'ok', daysBehind };
  },

  /**
   * 同步度：dataDate 为空 → danger；dataDate < navDate → warning；否则 ok
   */
  judgeSyncStatus(dataDate: string | null, navDate: string | null) {
    if (!dataDate) return 'danger';
    if (!navDate) return 'ok';
    return dataDate < navDate ? 'warning' : 'ok';
  },
});
