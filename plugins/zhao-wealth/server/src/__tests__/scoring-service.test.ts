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
  const mockProductFindMany = jest.fn();
  const mockProductCount = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne, findMany: mockProductFindMany, count: mockProductCount };
    if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne, findMany: jest.fn().mockResolvedValue([]) };
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
    expect(pluginConfig.scoreScales.volatilityScaleByType['bank-wealth']).toBe(0.005);
    expect(pluginConfig.scoreScales.drawdownScaleByType['bank-wealth']).toBe(0.005);
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
    expect(score!.compositeScore).toBe(15); // 30*.5 + 0*.25 + 0*.25（波动1%/回撤1%超0.005标尺→0分）
  });

  it('银行理财波动分按 0.005 标尺（0.05% → 90 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.01 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.volatilityScore).toBe(90); // (1 - 0.0005/0.005)*100
  });

  it('银行理财回撤分按 0.005 标尺（-0.02% → 96 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.01 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: -0.0002 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.drawdownScore).toBe(96); // (1 + (-0.0002)/0.005)*100
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

  it('榜单：分页边界外的最高分产品必须上榜', async () => {
    const products = [1, 2, 3, 4, 5, 6].map((id) => ({
      id, productType: 'bank-wealth', operationMode: 'open', status: true, recommendWeight: 0,
    }));
    mockProductFindMany.mockResolvedValue(products);
    mockProductCount.mockResolvedValue(6);
    // 前序用例已覆盖 mockQuery 实现（clearAllMocks 不清除 mockImplementation），此处按既有风格重写
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne, findMany: mockProductFindMany, count: mockProductCount };
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') return { findOne: mockSnapshotFindOne, findMany: jest.fn().mockResolvedValue([]) };
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') return { findOne: mockScoreFindOne, findMany: mockScoreFindMany };
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });
    // 评分快照只覆盖前 5 个产品（产品 6 无快照 → 走实时计算，得分最高）
    mockScoreFindMany.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => ({ product: { id }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 60 + id }))
    );
    mockProductFindOne.mockResolvedValue({ id: 6, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const board = await service.getScoreLeaderboard({ pageSize: 5 });
    expect(board.records.length).toBe(5);
    expect(board.records[0].id).toBe(6); // 最高分产品必须排第一
    expect(board.total).toBe(6);
  });

  it('年化为 null（数据不足）→ calculateScore 返回 null，不再硬算低分', async () => {
    mockProductFindOne.mockResolvedValue({ id: 8, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: null });
    mockMetricFindMany.mockResolvedValue([]);

    const score = await service.calculateScore(8, 'm1');
    expect(score).toBeNull();
  });

  it('榜单：最新快照无 7d 年化时回退取最近有值快照', async () => {
    const products = [
      { id: 1, productName: 'A', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
      { id: 2, productName: 'B', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
    ];
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findOne: mockProductFindOne, findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(2) };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return {
          findOne: mockSnapshotFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-17', annual1m: 0.05, annual7d: 0.03 },
            { product: { id: 2 }, snapshotDate: '2026-09-17', annual1m: 0.02, annual7d: null },
            { product: { id: 2 }, snapshotDate: '2026-09-16', annual1m: 0.02, annual7d: 0.025 },
          ]),
        };
      }
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') {
        return {
          findOne: mockScoreFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 80 },
            { product: { id: 2 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 70 },
          ]),
        };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockResolvedValue([]);

    const board = await service.getScoreLeaderboard({});
    expect(board.records).toHaveLength(2);
    expect(board.records.find((r: any) => r.id === 1)!.latestAnnual7d).toBe(0.03);
    // 产品2 最新快照（9/17）7d 为 null → 回退到 9/16 有值快照
    expect(board.records.find((r: any) => r.id === 2)!.latestAnnual7d).toBe(0.025);
  });

  it('榜单：评分 null（数据不足）产品被过滤且 total 重算', async () => {
    const products = [
      { id: 1, productName: 'A', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
      { id: 2, productName: 'B', productType: 'bank-wealth', operationMode: 'open', recommendWeight: 1 },
    ];
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findOne: mockProductFindOne, findMany: jest.fn().mockResolvedValue(products), count: jest.fn().mockResolvedValue(2) };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return {
          findOne: mockSnapshotFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-17', annual1m: 0.05, annual7d: 0.03 },
            { product: { id: 2 }, snapshotDate: '2026-09-17', annual1m: null, annual7d: null },
          ]),
        };
      }
      if (name === 'plugin::zhao-wealth.wealth-risk-metric') return { findMany: mockMetricFindMany };
      if (name === 'plugin::zhao-wealth.wealth-score-snapshot') {
        return {
          findOne: mockScoreFindOne,
          findMany: jest.fn().mockResolvedValue([
            { product: { id: 1 }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 80 },
          ]),
        };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindMany };
    });
    // 产品2 无评分快照 → 实时计算 → annual1m null → calculateScore 返回 null
    mockProductFindOne.mockResolvedValue({ id: 2, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: null });
    mockMetricFindMany.mockResolvedValue([]);

    const board = await service.getScoreLeaderboard({});
    expect(board.records).toHaveLength(1);
    expect(board.records[0].id).toBe(1);
    expect(board.total).toBe(1); // 过滤后重算，而非产品总数 2
  });
});
