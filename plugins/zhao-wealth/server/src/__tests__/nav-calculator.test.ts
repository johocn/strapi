'use strict';

import { toDateStr } from '../utils';

function d(day: number): Date {
  return new Date(`2026-06-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('nav-calculator.recalculateMissing', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';
  const SNAPSHOT_UID = 'plugin::zhao-wealth.wealth-annual-snapshot';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, NAV_UID, SNAPSHOT_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('单产品：只补缺「有净值但无快照」的日期，并返回明细', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }, { navDate: d(2) }, { navDate: d(3) }]);
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);
    mockQueries[SNAPSHOT_UID].create.mockResolvedValue({ id: 100 });

    const service = getService();
    service.calculateSnapshot = jest.fn(async (productId: number, snapshotDate: Date) => ({
      product: productId,
      snapshotDate,
      annual1d: 0.01,
    }));

    const result = await service.recalculateMissing(1);

    expect(mockQueries[NAV_UID].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { product: 1 } }));
    expect(service.calculateSnapshot).toHaveBeenCalledTimes(2);
    expect(mockQueries[SNAPSHOT_UID].create).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ productId: 1, missingDates: 2, calculated: 2 }]);
  });

  it('无缺失日期时零计算（幂等）', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }]);
    mockQueries[NAV_UID].findMany.mockResolvedValue([{ navDate: d(1) }]);
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([{ snapshotDate: d(1) }]);

    const service = getService();
    service.calculateSnapshot = jest.fn();

    const result = await service.recalculateMissing(1);

    expect(service.calculateSnapshot).not.toHaveBeenCalled();
    expect(mockQueries[SNAPSHOT_UID].create).not.toHaveBeenCalled();
    expect(result).toEqual([{ productId: 1, missingDates: 0, calculated: 0 }]);
  });

  it('无参 = 全产品补缺', async () => {
    mockQueries[PRODUCT_UID].findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockQueries[NAV_UID].findMany
      .mockResolvedValueOnce([{ navDate: d(1) }])
      .mockResolvedValueOnce([{ navDate: d(2) }]);
    mockQueries[SNAPSHOT_UID].findMany.mockResolvedValue([]);

    const service = getService();
    service.calculateSnapshot = jest.fn(async (productId: number, snapshotDate: Date) => ({ product: productId, snapshotDate }));

    const result = await service.recalculateMissing();

    expect(mockQueries[PRODUCT_UID].findMany).toHaveBeenCalledWith({});
    expect(result).toEqual([
      { productId: 1, missingDates: 1, calculated: 1 },
      { productId: 2, missingDates: 1, calculated: 1 },
    ]);
  });
});
