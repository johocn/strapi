'use strict';

describe('annual-snapshot.calculateYearlyReturn money-wealth 分支', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';
  const YEARLY_UID = 'plugin::zhao-wealth.wealth-yearly-return';
  const NAV_UID = 'plugin::zhao-wealth.wealth-nav';

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    for (const uid of [PRODUCT_UID, INCOME_UID, YEARLY_UID, NAV_UID]) {
      mockQueries[uid] = { findOne: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() };
    }
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/annual-snapshot').default({ strapi: mockStrapi });
  }

  it('money-wealth 按万份收益累加计算年度收益（非净值分支）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-wealth' });
    mockQueries[INCOME_UID].findMany.mockResolvedValue(
      Array.from({ length: 365 }, (_, i) => ({ incomeDate: new Date(2026, 0, 1 + i), tenThousandIncome: 0.5 }))
    );
    mockQueries[YEARLY_UID].findOne.mockResolvedValue(null);
    mockQueries[YEARLY_UID].create.mockResolvedValue({ id: 10 });

    const service = getService();
    const result = await service.calculateYearlyReturn(1, 2026);

    // 0.5×365/365/10000×365 = 0.01825
    expect(result).not.toBeNull();
    expect(mockQueries[YEARLY_UID].create).toHaveBeenCalledWith({
      data: { product: 1, year: 2026, annualReturn: 0.01825, baseDays: 365 },
    });
    // 不应走净值查询
    expect(mockQueries[NAV_UID].findOne).not.toHaveBeenCalled();
  });

  it('bank-wealth 走净值分支', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 2, productType: 'bank-wealth' });
    mockQueries[YEARLY_UID].findOne.mockResolvedValue(null);
    // yearStartNav/yearEndNav
    mockQueries[NAV_UID].findOne
      .mockResolvedValueOnce({ unitNav: 1.0 })
      .mockResolvedValueOnce({ unitNav: 1.05 });
    mockQueries[YEARLY_UID].create.mockResolvedValue({ id: 11 });

    const service = getService();
    const result = await service.calculateYearlyReturn(2, 2026);

    expect(result).not.toBeNull();
    expect(mockQueries[YEARLY_UID].create).toHaveBeenCalledWith({
      data: { product: 2, year: 2026, annualReturn: 0.05, baseDays: 365 },
    });
  });
});
