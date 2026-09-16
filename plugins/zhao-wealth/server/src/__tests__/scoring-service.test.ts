'use strict';

describe('scoring-service 校准', () => {
  const pluginConfig = require('../config').default;

  let service: any;

  const mockProductFindOne = jest.fn();
  const mockSnapshotFindOne = jest.fn();
  const mockMetricFindMany = jest.fn();
  const mockScoreFindOne = jest.fn().mockResolvedValue(null);
  const mockScoreFindMany = jest.fn().mockResolvedValue([]);
  const mockOtherFindOne = jest.fn().mockResolvedValue(null);
  const mockOtherFindMany = jest.fn().mockResolvedValue([]);

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne };
    if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne };
    if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
    if (name === 'plugin::zhao-wealth.wealth-score-snapshot') return { findOne: mockScoreFindOne, findMany: mockScoreFindMany };
    return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/scoring-service').default;
    service = factory({
      strapi: {
        db: { query: mockQuery },
        config: { get: (k: string) => (k === 'plugin::zhao-wealth' ? pluginConfig : null) },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      },
    });
  });

  it('config 含按类型收益标尺与 operation_mode 别名', () => {
    expect(pluginConfig.scoreScales.returnScaleByType['money-wealth']).toBe(0.025);
    expect(pluginConfig.scoreScales.returnScaleByType['bank-wealth']).toBe(0.05);
    expect(pluginConfig.operationModeAliases['开放式净值型']).toBe('daily-open');
  });

  it('银行理财负收益按对称标尺计分（-2% → 30 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: -0.02 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.01, maxDrawdown: -0.01 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.returnScore).toBe(30); // 50 + (-0.02/0.05)*50
    expect(score!.compositeScore).toBe(52); // 30*.5 + 67*.25 + 80*.25
  });

  it('货币理财按 2.5% 标尺计分（2% → 90 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 3, productType: 'money-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockResolvedValue([{ metricValue: 0.0004 }]);

    const score = await service.calculateScore(3, 'm1');
    expect(score!.returnScore).toBe(90); // 50 + (0.02/0.025)*50
    expect(score!.weightProfile).toBe('money-wealth');
  });

  it('operation_mode 中文值经别名匹配 daily-open 权重', async () => {
    mockProductFindOne.mockResolvedValue({ id: 2, productType: 'bank-wealth', operationMode: '开放式净值型' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.0177 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(2, 'm1');
    expect(score!.weightProfile).toBe('bank-wealth:daily-open');
    expect(score!.weights).toEqual({ returns: 0.70, volatility: 0.20, drawdown: 0.10, peerRank: 0.00 });
  });

  it('评分快照表为空时榜单实时计算兜底', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.05 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.001, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const products = [{ id: 1, productName: 'A', recommendWeight: 1, productType: 'bank-wealth', operationMode: 'open' }];
    const productQuery = { findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(1) };
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne, ...productQuery };
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne, findMany: jest.fn().mockResolvedValue([]) };
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') return { findOne: mockScoreFindOne, findMany: mockScoreFindMany };
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });

    const result = await service.getScoreLeaderboard({});
    expect(result.records[0].score).not.toBeNull();
    expect(result.records[0].score.compositeScore).toBeGreaterThan(0);
  });
});
