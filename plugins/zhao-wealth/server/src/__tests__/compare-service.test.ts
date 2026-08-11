'use strict';

describe('compare-service', () => {
  let service: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    const mockFindOne = jest.fn();
    const mockFindMany = jest.fn();
    mockQuery = jest.fn().mockReturnValue({ findOne: mockFindOne, findMany: mockFindMany });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 预设 product 查询
    mockFindOne.mockImplementation((opts: any) => {
      if (opts.where && opts.where.id === 1) {
        return Promise.resolve({ id: 1, productName: '产品A', productType: 'bank-wealth', riskLevel: 'R2', company: { name: '公司A' } });
      }
      if (opts.where && opts.where.id === 2) {
        return Promise.resolve({ id: 2, productName: '产品B', productType: 'bank-wealth', riskLevel: 'R3', company: { name: '公司B' } });
      }
      // 最新净值
      if (opts.orderBy && opts.orderBy.navDate === 'desc') {
        return Promise.resolve({ unitNav: 1.05, navDate: '2026-08-10' });
      }
      // 年化快照
      if (opts.where && opts.where.snapshotDate) {
        return Promise.resolve({ annual1m: 0.0412, annual3m: 0.0398, annual6m: 0.0456, annual1y: 0.0512 });
      }
      return Promise.resolve(null);
    });

    // 风险指标查询
    mockFindMany.mockImplementation((opts: any) => {
      if (opts.where && opts.where.metricName) {
        return Promise.resolve([{ metricValue: 0.012, snapshotDate: '2026-08-10' }]);
      }
      return Promise.resolve([]);
    });

    const factory = require('../services/compare-service').default;
    service = factory({ strapi: mockStrapi });
  });

  it('应返回多产品对比数据', async () => {
    const result = await service.compareProducts([1, 2], 'm1');

    expect(result).toHaveLength(2);
    expect(result[0].productId).toBe(1);
    expect(result[0].productName).toBe('产品A');
    expect(result[0].riskLevel).toBe('R2');
    expect(result[0].latestNav).toBeDefined();
    expect(result[0].annualSnapshot).toBeDefined();
  });

  it('产品数不足 2 个时应抛错', async () => {
    await expect(service.compareProducts([1], 'm1')).rejects.toThrow('对比产品数量必须为 2-4 个');
  });

  it('产品数超过 4 个时应抛错', async () => {
    await expect(service.compareProducts([1, 2, 3, 4, 5], 'm1')).rejects.toThrow('对比产品数量必须为 2-4 个');
  });
});
