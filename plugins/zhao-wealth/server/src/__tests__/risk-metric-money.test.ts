'use strict';

describe('risk-metric-service 货币型收益指标', () => {
  let service: any;
  let mockQueries: Record<string, any>;
  let mockStrapi: any;

  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';
  const METRIC_UID = 'plugin::zhao-wealth.wealth-risk-metric';

  // 2026-08-01 ~ 08-10 万份收益交替 0.5/0.7
  const incomeDataset = Array.from({ length: 10 }, (_, i) => ({
    incomeDate: new Date(2026, 7, i + 1),
    tenThousandIncome: i % 2 === 0 ? 0.5 : 0.7,
  }));

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, INCOME_UID, SNAPSHOT_UID, METRIC_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), update: jest.fn() };
    }
    mockQueries[INCOME_UID].findMany.mockImplementation(({ where }: any) => {
      const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
      const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
      return incomeDataset.filter((r) => {
        const t = new Date(r.incomeDate).getTime();
        return t >= gte && t <= lte;
      });
    });
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/risk-metric-service').default({ strapi: mockStrapi });
  }

  it('money-wealth：volatility=收益波动率，maxDrawdown/sharpe=null', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.01825 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    // std([0.5,0.7]交替 /10000) × sqrt(365) = 0.10541/10000 × 19.105 ≈ 0.0002014
    expect(metrics.maxDrawdown).toBeNull();
    expect(metrics.sharpe).toBeNull();
    expect(metrics.volatility).not.toBeNull();
    expect(metrics.volatility).toBeCloseTo(0.0002014, 6);
    expect(metrics.annualReturn).toBe(0.01825);
    // 净值分支不应被调用
    expect(mockQueries[NAV_UID].findMany).not.toHaveBeenCalled();
  });

  it('money-wealth：incomeStability = 万份收益变异系数', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.01825 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    // values=[0.5,0.7]×5，mean=0.6，样本std=0.10541 → CV=0.1757
    expect(metrics.incomeStability).toBeCloseTo(0.1757, 3);
  });

  it('bank-wealth：仍走净值分支，incomeStability=null', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-07-20', unitNav: 1.0 },
      { navDate: '2026-08-01', unitNav: 1.01 },
      { navDate: '2026-08-10', unitNav: 1.02 },
    ]);
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: 0.02 });

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(2, new Date(2026, 7, 10), 'm1');

    expect(mockQueries[INCOME_UID].findMany).not.toHaveBeenCalled();
    expect(metrics.incomeStability).toBeNull();
    expect(metrics.maxDrawdown).toBe(0);
    expect(metrics.sharpe).not.toBeNull();
  });

  it('收益样本 < 2 时 volatility/incomeStability 为 null（防 std=0 满分）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[SNAPSHOT_UID].findOne.mockResolvedValue({ annual1m: null });
    mockQueries[INCOME_UID].findMany.mockResolvedValue([
      { incomeDate: new Date(2026, 7, 9), tenThousandIncome: 0.5 },
    ]);

    const service = getService();
    const metrics = await service.calculateMetricsForPeriod(1, new Date(2026, 7, 10), 'm1');

    expect(metrics.volatility).toBeNull();
    expect(metrics.incomeStability).toBeNull();
  });
});
