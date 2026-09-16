'use strict';

describe('compare-service.compareTrend', () => {
  let service: any;
  let mockFindOne: jest.Mock;
  let mockFindMany: jest.Mock;

  beforeEach(() => {
    mockFindOne = jest.fn();
    mockFindMany = jest.fn();
    const mockQuery = jest.fn().mockReturnValue({ findOne: mockFindOne, findMany: mockFindMany });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品查询：按 id 返回产品（普通产品默认，money-wealth 产品返回 money 类型）
    mockFindOne.mockImplementation((opts: any) => {
      if (opts.where && opts.where.id === 3) {
        return Promise.resolve({ id: 3, productName: '货币理财A', productType: 'money-wealth' });
      }
      if (opts.where && opts.where.id === 1) {
        return Promise.resolve({ id: 1, productName: '产品A', productType: 'bank-wealth' });
      }
      if (opts.where && opts.where.id === 2) {
        return Promise.resolve({ id: 2, productName: '产品B', productType: 'bank-wealth' });
      }
      return Promise.resolve(null);
    });

    // 净值/收益序列查询：按 product id 区分
    mockFindMany.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) {
        return Promise.resolve([
          { navDate: '2026-08-01', unitNav: 1.00 },
          { navDate: '2026-08-02', unitNav: 1.01 },
          { navDate: '2026-08-03', unitNav: 1.02 },
        ]);
      }
      if (pid === 2) {
        return Promise.resolve([
          { navDate: '2026-08-02', unitNav: 2.00 },
          { navDate: '2026-08-03', unitNav: 2.04 },
        ]);
      }
      if (pid === 3) {
        return Promise.resolve([
          { incomeDate: '2026-08-01', tenThousandIncome: 0.5 },
          { incomeDate: '2026-08-02', tenThousandIncome: 0.6 },
        ]);
      }
      return Promise.resolve([]);
    });

    const factory = require('../services/compare-service').default;
    service = factory({ strapi: mockStrapi });
  });

  it('普通产品按区间首条净值归一化为累计收益率%', async () => {
    const result = await service.compareTrend([1, 2], 'm1');
    expect(result.series).toHaveLength(2);
    expect(result.series[0].productId).toBe(1);
    // (1.01/1.00-1)*100=1, (1.02/1.00-1)*100=2
    expect(result.series[0].values).toEqual([0, 1, 2]);
  });

  it('货币理财按万份收益累计为累计收益率%', async () => {
    const result = await service.compareTrend([3, 2], 'm1');
    expect(result.series[0].productType).toBe('money-wealth');
    // 0.5/10000*100=0.005, (0.5+0.6)/10000*100=0.011；08-03 无收益记录，按前值 0.011 填充
    expect(result.series[0].values).toEqual([0.005, 0.011, 0.011]);
  });

  it('多产品按日期并集对齐，缺失前值填充、首点前补 0', async () => {
    const result = await service.compareTrend([1, 2], 'm1');
    expect(result.dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    // 产品B 首条净值 08-02 为基准：08-01 补 0，08-02 为 0，08-03 (2.04/2-1)*100=2
    expect(result.series[1].values).toEqual([0, 0, 2]);
  });

  it('产品数不足 2 个时应抛错', async () => {
    await expect(service.compareTrend([1], 'm1')).rejects.toThrow('对比产品数量必须为 2-4 个');
  });
});
