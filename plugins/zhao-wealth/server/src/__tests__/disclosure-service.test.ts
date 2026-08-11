'use strict';

describe('disclosure-service', () => {
  let service: any;
  let mockFindOne: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockFindOne = jest.fn();
    const mockStrapi = {
      db: { query: jest.fn().mockReturnValue({ findOne: mockFindOne }) },
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const factory = require('../services/disclosure-service').default;
    service = factory({ strapi: mockStrapi });
  });

  it('应返回专属 productType 的生效文案', async () => {
    mockFindOne.mockResolvedValueOnce({
      id: 1, productType: 'bank-wealth', title: '银行理财披露', content: '...', effectiveDate: '2026-08-01',
    });

    const result = await service.getByProductType('bank-wealth');

    expect(result).not.toBeNull();
    expect(result.title).toBe('银行理财披露');
    expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { productType: 'bank-wealth', status: true },
      orderBy: { effectiveDate: 'desc' },
    }));
  });

  it('专属文案不存在时应回退到 all', async () => {
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 2, productType: 'all', title: '通用披露', content: '...', effectiveDate: '2026-01-01',
      });

    const result = await service.getByProductType('stock-fund');

    expect(result).not.toBeNull();
    expect(result.title).toBe('通用披露');
    expect(mockFindOne).toHaveBeenCalledTimes(2);
  });

  it('专属和 all 都无结果时返回 null', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await service.getByProductType('bond-fund');

    expect(result).toBeNull();
  });
});
