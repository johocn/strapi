'use strict';

describe('product.findList sortBy=annual7d', () => {
  let service: any;

  beforeEach(() => {
    const mockFindMany = jest.fn();
    const mockFindOne = jest.fn();
    const mockCount = jest.fn();
    const mockQuery = jest.fn().mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findMany: mockFindMany, count: mockCount };
      }
      return { findOne: mockFindOne, findMany: mockFindMany };
    });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品列表：3 个产品
    mockFindMany.mockImplementation((opts: any) => {
      if (opts.limit !== undefined && !opts.orderBy) {
        return Promise.resolve([
          { id: 1, productName: 'A' },
          { id: 2, productName: 'B' },
          { id: 3, productName: 'C' },
        ]);
      }
      return Promise.resolve([]);
    });
    mockCount.mockResolvedValue(3);

    // 聚合数据：产品1 annual7d=0.03，产品2 annual7d=0.05，产品3 无快照
    mockFindOne.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) return Promise.resolve({ annual7d: 0.03, annual1m: 0.04, snapshotDate: '2026-09-10' });
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
});
