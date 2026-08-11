'use strict';

describe('holding-service', () => {
  let service: any;
  let mockQuery: jest.Mock;
  let mockFindMany: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockCreate: jest.Mock;
  let mockCount: jest.Mock;

  beforeEach(() => {
    mockFindMany = jest.fn();
    mockFindOne = jest.fn();
    mockCreate = jest.fn();
    mockCount = jest.fn();
    mockQuery = jest.fn().mockReturnValue({
      findMany: mockFindMany,
      findOne: mockFindOne,
      create: mockCreate,
      count: mockCount,
    });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();
    const factory = require('../services/holding-service').default;
    service = factory({ strapi: mockStrapi });
  });

  describe('getUserHoldings', () => {
    it('应返回用户持仓列表含实时盈亏', async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: 1, buyAmount: 10000, buyNav: 1.0, buyDate: '2026-07-15', product: { id: 10, productName: '产品A' } },
      ]);
      mockCount.mockResolvedValueOnce(1);
      // 最新净值查询
      mockFindOne.mockResolvedValueOnce({ unitNav: 1.05, navDate: '2026-08-10' });

      const result = await service.getUserHoldings(1, 1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].currentValue).toBe(10500);
      expect(result.list[0].profit).toBe(500);
      expect(result.list[0].profitPercent).toBeCloseTo(0.05, 4);
      expect(result.total).toBe(1);
    });
  });

  describe('createHolding - buyNav 自动填充', () => {
    it('未传 buyNav 时应从 buyDate 当日净值填充', async () => {
      mockFindOne
        .mockResolvedValueOnce(null)  // 查 buyDate 当日净值
        .mockResolvedValueOnce({ unitNav: 1.02, navDate: '2026-07-14' }); // 取前一日
      mockCreate.mockResolvedValueOnce({ id: 1 });

      const result = await service.createHolding({
        userId: 1, productId: 10, channelId: 1, buyDate: '2026-07-15', buyAmount: 10000,
      });

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ buyNav: 1.02 }),
      }));
    });

    it('产品无任何净值数据时应抛错', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.createHolding({
        userId: 1, productId: 10, channelId: 1, buyDate: '2026-07-15', buyAmount: 10000,
      })).rejects.toThrow('产品无净值数据，无法录入持仓');
    });
  });

  describe('calcProfitTrend', () => {
    it('应将净值序列转换为市值序列', async () => {
      // 持仓记录
      mockFindOne.mockResolvedValueOnce({
        id: 1, buyAmount: 10000, buyNav: 1.0, buyDate: '2026-07-15', product: 10,
      });
      // 净值序列
      mockFindMany.mockResolvedValueOnce([
        { navDate: '2026-07-15', unitNav: 1.0 },
        { navDate: '2026-07-16', unitNav: 1.01 },
        { navDate: '2026-07-17', unitNav: 1.02 },
      ]);

      const result = await service.calcProfitTrend(1, '2026-07-15', '2026-07-17');

      expect(result).toHaveLength(3);
      expect(result[0].marketValue).toBe(10000);
      expect(result[1].marketValue).toBe(10100);
      expect(result[2].marketValue).toBe(10200);
      expect(result[2].profit).toBe(200);
      expect(result[2].profitPercent).toBeCloseTo(0.02, 4);
    });

    it('持有天数 >= 1 时应计算 annualizedProfit', async () => {
      mockFindOne.mockResolvedValueOnce({
        id: 1, buyAmount: 10000, buyNav: 1.0, buyDate: '2026-07-15', product: 10,
      });
      mockFindMany.mockResolvedValueOnce([
        { navDate: '2026-07-15', unitNav: 1.0 },
        { navDate: '2026-08-15', unitNav: 1.03 }, // 31 天后
      ]);

      const result = await service.calcProfitTrend(1, '2026-07-15', '2026-08-15');

      // annualizedProfit = (1.03/1.0)^(365/31) - 1
      const expected = Math.pow(1.03, 365 / 31) - 1;
      expect(result[1].annualizedProfit).toBeCloseTo(expected, 4);
    });
  });
});
