'use strict';

describe('product.findList sortBy', () => {
  let service: any;

  beforeEach(() => {
    const mockProductFindMany = jest.fn();
    const mockCount = jest.fn();
    const mockNavFindOne = jest.fn();
    const mockSnapshotFindOne = jest.fn();
    const mockOtherFindOne = jest.fn().mockResolvedValue(null);
    const mockQuery = jest.fn().mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findMany: mockProductFindMany, count: mockCount };
      }
      if (name === 'plugin::zhao-wealth.wealth-nav') {
        return { findOne: mockNavFindOne, findMany: mockNavFindOne };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return { findOne: mockSnapshotFindOne, findMany: mockSnapshotFindOne };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindOne };
    });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品列表：3 个产品
    mockProductFindMany.mockResolvedValue([
      { id: 1, productName: 'A' },
      { id: 2, productName: 'B' },
      { id: 3, productName: 'C' },
    ]);
    mockCount.mockResolvedValue(3);

    // 最新净值：产品1 → 09-15，产品2 → 09-10，产品3 无净值；无 where 时返回全库最新 09-15
    mockNavFindOne.mockImplementation((opts: any) => {
      if (!opts.where) {
        // 无 where：全库最新净值（findList 返回体 latestNavDate 查询）
        return Promise.resolve({ navDate: '2026-09-15T16:00:00.000Z', unitNav: 1.02 });
      }
      const pid = opts.where.product;
      if (pid === 1) return Promise.resolve({ navDate: '2026-09-15T16:00:00.000Z', unitNav: 1.02 });
      if (pid === 2) return Promise.resolve({ navDate: '2026-09-10T16:00:00.000Z', unitNav: 1.01 });
      return Promise.resolve(null);
    });

    // 年化快照：产品1 annual7d=0.03，产品2 annual7d=0.05，产品3 无
    mockSnapshotFindOne.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) return Promise.resolve({ annual7d: 0.03, annual1m: 0.04, snapshotDate: '2026-09-15' });
      if (pid === 2) return Promise.resolve({ annual7d: 0.05, annual1m: 0.06, snapshotDate: '2026-09-10' });
      return Promise.resolve(null);
    });

    const factory = require('../services/product').default;
    service = factory({ strapi: mockStrapi });
  });

  it('按最新年化快照 annual7d 降序排序，无数据排末尾', async () => {
    const result = await service.findList({ status: true }, 1, 10, { sortBy: 'annual7d' });
    const ids = result.list.map((p: any) => p.id);
    expect(ids).toEqual([2, 1, 3]);
    expect(result.list[0].latestAnnual7d).toBe(0.05);
  });

  it('sortBy=latestNav 按最新净值日期降序，无净值排末尾，并透传 latestNavDate', async () => {
    const result = await service.findList({ status: true }, 1, 10, { sortBy: 'latestNav' });
    const ids = result.list.map((p: any) => p.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(result.list[0].latestNavDate).toBe('2026-09-15');
    expect(result.list[2].latestNavDate).toBeNull();
  });

  it('findList 返回体附加全库最新净值日期 latestNavDate', async () => {
    const result = await service.findList({ status: true }, 1, 10, {});
    expect(result.latestNavDate).toBe('2026-09-15');
  });
});
