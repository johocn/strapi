'use strict';

describe('risk-metric-service 增强', () => {
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

    const factory = require('../services/risk-metric-service').default;
    service = factory({ strapi: mockStrapi });
  });

  describe('getCalmarRatio', () => {
    it('应正确计算 Calmar 比率 = 年化收益 / |最大回撤|', async () => {
      // 年化快照返回 annual1y = 0.05
      mockFindOne.mockResolvedValueOnce({ annual1y: 0.05 });

      // 风险指标 maxDrawdown 返回 -0.01
      mockFindMany.mockResolvedValueOnce([
        { metricValue: -0.01, snapshotDate: '2026-08-10' },
      ]);

      const result = await service.getCalmarRatio(1, 'y1');

      // 0.05 / |-0.01| = 5
      expect(result).toBeCloseTo(5, 2);
    });

    it('最大回撤为 0 时应返回 null', async () => {
      mockFindOne.mockResolvedValueOnce({ annual1y: 0.05 });
      mockFindMany.mockResolvedValueOnce([
        { metricValue: 0, snapshotDate: '2026-08-10' },
      ]);

      const result = await service.getCalmarRatio(1, 'y1');

      expect(result).toBeNull();
    });

    it('年化收益为 null 时应返回 null', async () => {
      mockFindOne.mockResolvedValueOnce({ annual1y: null });
      mockFindMany.mockResolvedValueOnce([
        { metricValue: -0.01, snapshotDate: '2026-08-10' },
      ]);

      const result = await service.getCalmarRatio(1, 'y1');

      expect(result).toBeNull();
    });
  });
});
