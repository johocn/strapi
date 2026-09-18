'use strict';

jest.mock('../config', () => ({
  __esModule: true,
  default: { riskMetricPeriods: ['m1'], riskFreeRate: 0.02 },
}));

function d(day: number): Date {
  return new Date(`2026-06-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('risk-metric-service.recalculateMissing', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';
  const navRecalcMissing = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    navRecalcMissing.mockReset();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]), connection: { raw: jest.fn() } },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue({ recalculateMissing: navRecalcMissing }),
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('单产品：先年化补缺，再只补缺「有净值但无指标」的日期', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }, { navDate: d(2) }]);
    // d(1) 完整 5 条，d(2) 无记录 → 只补 d(2)
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) },
    ]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing(1);

    expect(navRecalcMissing).toHaveBeenCalledWith(1);
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ productId: 1, missingDates: 1 }]);
  });

  it('无缺失日期时零计算（幂等）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }]);
    // d(1) 完整 5 条
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) },
    ]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn();

    await service.recalculateMissing(1);

    expect(service.calculateAndSaveMetrics).not.toHaveBeenCalled();
  });

  it('无参 = 全产品补缺（阶段一也全量）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockQueries[NAV_UID].findMany
      .mockResolvedValueOnce([{ navDate: d(1) }])
      .mockResolvedValueOnce([{ navDate: d(2) }]);
    mockQueries[METRIC_UID].findMany.mockResolvedValue([]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing();

    expect(navRecalcMissing).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([
      { productId: 1, missingDates: 1 },
      { productId: 2, missingDates: 1 },
    ]);
  });

  it('波动率：仅 2 条净值（1 个收益样本）时返回 null 而非 NaN', async () => {
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: d(1), unitNav: '1.05' },
      { navDate: d(2), unitNav: '1.06' },
    ]);
    mockQueries['plugin::zhao-wealth.wealth-annual-snapshot'] = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, d(2), 'm1');

    expect(metrics.volatility).toBeNull();
    expect(Number.isNaN(metrics.volatility)).toBe(false);
  });

  it('写入防御：指标值为 NaN 时落库为 null（不会抛 Expected a valid Number）', async () => {
    const createMock = jest.fn().mockResolvedValue({});
    mockQueries[METRIC_UID].create = createMock;

    const service = getService();
    service.calculateMetricsForPeriod = jest.fn().mockResolvedValue({
      volatility: NaN,
      maxDrawdown: -0.01,
      sharpe: NaN,
      annualReturn: null,
    });
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: null, peerTotal: null });

    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 9, unitNav: 1.0 });

    await service.calculateAndSaveMetrics(1, d(2));

    const created = createMock.mock.calls.map((c: any) => c[0].data.metricValue);
    expect(created).toEqual([null, -0.01, null, null, null]);
  });

  it('recalculateMissing：日期记录数不足（并发残缺）时视为缺失并重算', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }, { navDate: d(2) }]);
    // 日期1 只有 2 条记录（应为 5 条），日期2 完整 5 条
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) },
      { snapshotDate: d(1) },
      { snapshotDate: d(2) },
      { snapshotDate: d(2) },
      { snapshotDate: d(2) },
      { snapshotDate: d(2) },
      { snapshotDate: d(2) },
    ]);

    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing(1);

    expect(service.calculateAndSaveMetrics).toHaveBeenCalledTimes(1);
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledWith(1, d(1));
    expect(result).toEqual([{ productId: 1, missingDates: 1 }]);
  });
});

describe('risk-metric-service.calculateAndSaveMetrics 数据源检查', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, INCOME_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]), connection: { raw: jest.fn() } },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue({ recalculateMissing: jest.fn() }),
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('净值型当日无净值 → 跳过，不写任何指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue(null);
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn();
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: null, peerTotal: null });

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].delete).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].create).not.toHaveBeenCalled();
  });

  it('货币型当日无收益 → 跳过，不写任何指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    mockQueries[INCOME_UID].findOne.mockResolvedValue(null);
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn();
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: null, peerTotal: null });

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).not.toHaveBeenCalled();
    expect(mockQueries[METRIC_UID].create).not.toHaveBeenCalled();
  });

  it('净值型当日有净值 → 正常写入 5 条指标', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 9, unitNav: 1.0 });
    const createMock = mockQueries[METRIC_UID].create;
    const service = getService();
    service.calculateMetricsForPeriod = jest.fn().mockResolvedValue({
      volatility: 0.1, maxDrawdown: -0.01, sharpe: 1.2, annualReturn: 0.05, incomeStability: null,
    });
    service.calculateRankPercentile = jest.fn().mockResolvedValue({ rankPercentile: 50, peerTotal: 8 });

    await service.calculateAndSaveMetrics(1, d(2));

    expect(service.calculateMetricsForPeriod).toHaveBeenCalledTimes(1);
    expect(mockQueries[METRIC_UID].delete).toHaveBeenCalledTimes(5);
    expect(mockQueries[METRIC_UID].create).toHaveBeenCalledTimes(5);
    const names = createMock.mock.calls.map((c: any) => c[0].data.metricName);
    expect(names).toContain('peerTotal');
    expect(createMock.mock.calls.find((c: any) => c[0].data.metricName === 'peerTotal')[0].data.metricValue).toBe(8);
  });

  it('recalculateMissing 货币型：日期源用收益日期而非净值日期', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1, productType: 'money-fund' }]);
    mockQueries[INCOME_UID].findMany.mockResolvedValue([{ incomeDate: d(1) }, { incomeDate: d(2) }]);
    // d(1) 完整 5 条，d(2) 无记录 → 只补 d(2)
    mockQueries[METRIC_UID].findMany.mockResolvedValue([
      { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) }, { snapshotDate: d(1) },
    ]);
    const service = getService();
    service.calculateAndSaveMetrics = jest.fn().mockResolvedValue(undefined);

    const result = await service.recalculateMissing(1);

    expect(mockQueries[NAV_UID].findMany).not.toHaveBeenCalled();
    expect(mockQueries[INCOME_UID].findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { product: 1 }, select: ['incomeDate'] })
    );
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledTimes(1);
    expect(service.calculateAndSaveMetrics).toHaveBeenCalledWith(1, d(2));
    expect(result).toEqual([{ productId: 1, missingDates: 1 }]);
  });
});

describe('risk-metric-service.calculateRankPercentile', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, SNAPSHOT_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('样本 ≥5 时返回百分位与样本总数（按年化降序，第一名=1/5=20%）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([
      { product: { id: 1 }, annual1m: '0.05' },
      { product: { id: 2 }, annual1m: '0.04' },
      { product: { id: 3 }, annual1m: '0.03' },
      { product: { id: 4 }, annual1m: '0.02' },
      { product: { id: 5 }, annual1m: '0.01' },
    ]);

    const res = await getService().calculateRankPercentile(1, d(2), 'm1');
    expect(res).toEqual({ rankPercentile: 20, peerTotal: 5 });
  });

  it('样本 <5 时返回 null（无统计意义，不提供排名）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'bank-wealth' });
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([
      { product: { id: 1 }, annual1m: '0.05' },
      { product: { id: 2 }, annual1m: '0.04' },
    ]);

    const res = await getService().calculateRankPercentile(1, d(2), 'm1');
    expect(res).toEqual({ rankPercentile: null, peerTotal: null });
  });
});
