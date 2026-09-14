'use strict';

import { toDateStr } from '../utils';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

describe('monitor-service', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;

  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, SNAPSHOT_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn() };
    }
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => mockQueries[uid]),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/monitor-service').default({ strapi: mockStrapi });
  }

  function seedProduct(id: number, overrides: any = {}) {
    return { id, productName: `产品${id}`, productCode: `P${id}`, company: { shortName: '测试行' }, ...overrides };
  }

  function seedNav(daysBack: number | null, overrides: any = {}) {
    if (daysBack === null) return null;
    return { navDate: daysAgo(daysBack), unitNav: '1.05', accNav: '1.10', dataSource: 'crawler', ...overrides };
  }

  function seedSnapshot(daysBack: number | null, overrides: any = {}) {
    if (daysBack === null) return null;
    return { snapshotDate: daysAgo(daysBack), annual1m: '0.03', annual3m: '0.08', annual6m: null, annual1y: null, ...overrides };
  }

  function seedMetricDate(daysBack: number | null) {
    if (daysBack === null) return null;
    return { snapshotDate: daysAgo(daysBack), metricName: 'volatility', metricValue: '0.01' };
  }

  it('全正常：净值/年化/风险对齐 → 三项 ok，overall ok', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { metricName: 'volatility', metricValue: '0.01' },
      { metricName: 'maxDrawdown', metricValue: '-0.02' },
      { metricName: 'sharpe', metricValue: '1.20' },
    ]);

    const result = await getService().getProductMonitorList();

    expect(result.list).toHaveLength(1);
    expect(result.list[0].navStatus).toBe('ok');
    expect(result.list[0].annualStatus).toBe('ok');
    expect(result.list[0].riskStatus).toBe('ok');
    expect(result.list[0].overall).toBe('ok');
    expect(result.list[0].latestNav.unitNav).toBe('1.05');
    expect(result.list[0].latestSnapshot.annual1m).toBe('0.03');
    expect(result.list[0].latestMetrics.volatility).toBe('0.01');
    expect(result.summary).toEqual({ ok: 1, warning: 0, danger: 0 });
  });

  it('净值滞后4天 → navStatus warning（>3）且 daysBehind=4', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(4));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(4));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(4));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('warning');
    expect(result.list[0].navDaysBehind).toBe(4);
  });

  it('净值滞后8天 → navStatus danger（>7）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(8));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(8));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(8));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('danger');
  });

  it('无净值 → navStatus danger 且 daysBehind null', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(null);
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].navStatus).toBe('danger');
    expect(result.list[0].navDaysBehind).toBeNull();
  });

  it('无年化快照 → annualStatus danger', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(null);
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].annualStatus).toBe('danger');
  });

  it('年化快照日期早于净值日期 → annualStatus warning', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(1));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(0));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].annualStatus).toBe('warning');
  });

  it('无风险指标 → riskStatus danger', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(null);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].riskStatus).toBe('danger');
    expect(result.list[0].latestMetrics).toBeNull();
  });

  it('风险指标日期早于净值日期 → riskStatus warning', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([seedProduct(1)]);
    mockQueries[NAV_UID].findOne.mockResolvedValue(seedNav(0));
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue(seedSnapshot(0));
    mockQueries[METRIC_UID].findOne.mockResolvedValue(seedMetricDate(1));
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].riskStatus).toBe('warning');
  });

  it('多产品 summary 计数（ok/warning/danger 各一）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([
      seedProduct(1),
      seedProduct(2),
      seedProduct(3),
    ]);
    // 产品1：全正常（净值今天）
    // 产品2：净值滞后4天 → warning
    // 产品3：无净值 → danger
    mockQueries[NAV_UID].findOne
      .mockResolvedValueOnce(seedNav(0))
      .mockResolvedValueOnce(seedNav(4))
      .mockResolvedValueOnce(null);
    mockQueries[SNAPSHOT_UID].findOne
      .mockResolvedValueOnce(seedSnapshot(0))
      .mockResolvedValueOnce(seedSnapshot(4))
      .mockResolvedValueOnce(null);
    mockQueries[METRIC_UID].findOne
      .mockResolvedValueOnce(seedMetricDate(0))
      .mockResolvedValueOnce(seedMetricDate(4))
      .mockResolvedValueOnce(null);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const result = await getService().getProductMonitorList();

    expect(result.list[0].overall).toBe('ok');
    expect(result.list[1].overall).toBe('warning');
    expect(result.list[2].overall).toBe('danger');
    expect(result.summary).toEqual({ ok: 1, warning: 1, danger: 1 });
  });
});
