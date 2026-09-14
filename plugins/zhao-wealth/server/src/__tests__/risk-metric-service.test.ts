'use strict';

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
    mockQueries[METRIC_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

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
    mockQueries[METRIC_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

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
});
