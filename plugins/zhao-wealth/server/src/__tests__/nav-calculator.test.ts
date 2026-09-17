'use strict';

import { toDateStr } from '../utils';

// 保留 utils 真实实现，仅 mock 锁函数（测试环境无 Redis 时 acquireLock 返回 false 会导致跳过）
jest.mock('../utils', () => {
  const actual = jest.requireActual('../utils');
  return {
    ...actual,
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  };
});

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

describe('nav-calculator.calculateMoneyFundSnapshot', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';

  // 06-01 ~ 06-20 共 20 天，万份收益恒 0.5
  const incomeDataset = Array.from({ length: 20 }, (_, i) => ({
    incomeDate: new Date(2026, 5, i + 1),
    tenThousandIncome: 0.5,
  }));

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockQueries[INCOME_UID] = {
      findOne: jest.fn().mockImplementation(({ where }: any) => {
        if (!where.incomeDate) return null;
        const ds = toDateStr(where.incomeDate);
        return incomeDataset.find((r) => toDateStr(r.incomeDate) === ds) || null;
      }),
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
        const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
        return incomeDataset.filter((r) => {
          const t = new Date(r.incomeDate).getTime();
          return t >= gte && t <= lte;
        });
      }),
    };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('8 期限全部输出：1日/3日/7日/2周 有值，1月及以上 null（待积累）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    const service = getService();

    // snapshotDate = 06-20：1日窗口 06-20（1条）、3日 06-18~20（3条）、7日 06-14~20（7条）、
    // 2周 06-07~20（14条）均可算；1月需 30 条不足 → null
    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 5, 20));

    expect(snapshot.annual1d).toBe(0.01825); // 0.5×365/10000
    expect(snapshot.annual3d).toBe(0.01825);
    expect(snapshot.annual7d).toBe(0.01825);
    expect(snapshot.annual2w).toBe(0.01825);
    expect(snapshot.annual1m).toBeNull();
    expect(snapshot.annual3m).toBeNull();
    expect(snapshot.annual6m).toBeNull();
    expect(snapshot.annual1y).toBeNull();
    expect(snapshot.isEstimate).toBe(false);
  });

  it('当日无收益记录 → 返回 null（不写全 null 快照）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    const service = getService();

    // snapshotDate = 07-01：数据集最晚 06-20，当日无收益
    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 6, 1));

    expect(snapshot).toBeNull();
  });

  it('3日窗口按均值年化：0.5/0.7/0.6 → 0.0219', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    mockQueries[INCOME_UID].findMany.mockImplementation(({ where }: any) => {
      const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
      const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
      const dataset = [
        { incomeDate: new Date(2026, 5, 18), tenThousandIncome: 0.5 },
        { incomeDate: new Date(2026, 5, 19), tenThousandIncome: 0.7 },
        { incomeDate: new Date(2026, 5, 20), tenThousandIncome: 0.6 },
      ];
      return dataset.filter((r) => {
        const t = new Date(r.incomeDate).getTime();
        return t >= gte && t <= lte;
      });
    });
    const service = getService();

    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 5, 20));

    expect(snapshot.annual3d).toBe(0.0219); // (0.5+0.7+0.6)/3 × 365 / 10000
    expect(snapshot.annual7d).toBeNull(); // 仅 3 条不足 7 天
  });
});

describe('nav-calculator.calculateSnapshot money-wealth 分支', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('money-wealth 走收益型快照（calculateMoneyFundSnapshot）而非净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    const service = getService();
    service.calculateMoneyFundSnapshot = jest.fn().mockResolvedValue({ product: 1, snapshotDate: new Date(), annual1d: 0.01825 });
    service.calculateNavSnapshot = jest.fn().mockResolvedValue({ product: 1, snapshotDate: new Date(), annual1d: 0.0 });

    const snapshot = await service.calculateSnapshot(1, new Date(2026, 5, 20));

    expect(service.calculateMoneyFundSnapshot).toHaveBeenCalledWith(1, new Date(2026, 5, 20));
    expect(service.calculateNavSnapshot).not.toHaveBeenCalled();
    expect(snapshot.annual1d).toBe(0.01825);
  });

  it('bank-wealth 仍走净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    const service = getService();
    service.calculateMoneyFundSnapshot = jest.fn();
    service.calculateNavSnapshot = jest.fn().mockResolvedValue({ product: 2, annual1d: 0.02 });

    const snapshot = await service.calculateSnapshot(2, new Date(2026, 5, 20));

    expect(service.calculateNavSnapshot).toHaveBeenCalledWith(2, new Date(2026, 5, 20));
    expect(service.calculateMoneyFundSnapshot).not.toHaveBeenCalled();
    expect(snapshot.annual1d).toBe(0.02);
  });
});

describe('nav-calculator.calculateNavSnapshot 短周期锚定与钳制', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockQueries[NAV_UID] = { findOne: jest.fn(), findMany: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('长假场景：净值 9/30、10/9，快照日 10/9 → 1d 超容差 null，3d/7d 有值（gap=9）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.0510, navDate: '2026-10-09' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-10-09', unitNav: 1.0510 },
      { navDate: '2026-09-30', unitNav: 1.0500 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-10-09T00:00:00Z'));

    expect(snapshot.annual1d).toBeNull(); // gap=9 > 5
    expect(snapshot.annual3d).toBeCloseTo(0.039361, 5); // (1.0510/1.0500)^(365/9)-1
    expect(snapshot.annual7d).toBeCloseTo(0.039361, 5);
    expect(snapshot.isEstimate).toBe(false); // gap7=9 >= 7
  });

  it('调休场景：净值 10/9、10/12，快照日 10/12 → 1d/3d 有值（gap=3），7d null（序列不足）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.0510, navDate: '2026-10-12' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-10-12', unitNav: 1.0510 },
      { navDate: '2026-10-09', unitNav: 1.0500 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-10-12T00:00:00Z'));

    expect(snapshot.annual1d).toBeCloseTo(0.122791, 5); // (1.0510/1.0500)^(365/3)-1
    expect(snapshot.annual3d).toBeCloseTo(0.122791, 5);
    expect(snapshot.annual7d).toBeNull(); // 无 navDate<=10/05 的净值
    expect(snapshot.isEstimate).toBe(false); // gap7=null
  });

  it('稀疏场景：净值 9/1、9/21，快照日 9/21 → 1d/3d/7d 全 null（gap=20 超容差）', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.05, navDate: '2026-09-21' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-09-21', unitNav: 1.05 },
      { navDate: '2026-09-01', unitNav: 1.0 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-09-21T00:00:00Z'));

    expect(snapshot.annual1d).toBeNull(); // 20 > 5
    expect(snapshot.annual3d).toBeNull(); // 20 > 10
    expect(snapshot.annual7d).toBeNull(); // 20 > 15
  });

  it('跳变场景：净值 6/19=1.0、6/20=1.01，快照日 6/20 → 年化钳制到 1，isEstimate=true', async () => {
    mockQueries[NAV_UID].findOne.mockResolvedValue({ id: 10, unitNav: 1.01, navDate: '2026-06-20' });
    mockQueries[NAV_UID].findMany.mockResolvedValue([
      { navDate: '2026-06-20', unitNav: 1.01 },
      { navDate: '2026-06-19', unitNav: 1.0 },
    ]);
    const service = getService();

    const snapshot = await service.calculateNavSnapshot(1, new Date('2026-06-20T00:00:00Z'));

    expect(snapshot.annual1d).toBe(1); // 1.01^365-1 ≈ 36.78 钳制到 +100%
    expect(snapshot.annual3d).toBeNull(); // 无更早净值
    expect(snapshot.annual7d).toBeNull();
    expect(snapshot.isEstimate).toBe(true); // 钳制强制标记
  });
});
