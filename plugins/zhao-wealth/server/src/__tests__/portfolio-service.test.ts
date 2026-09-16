'use strict';

describe('portfolio-service 配比简化', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-portfolio-plan') {
      return { create: mockCreate, update: mockUpdate, findOne: mockFindOne };
    }
    return { create: jest.fn(), update: jest.fn(), findOne: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/portfolio-service').default;
    service = factory({ strapi: { db: { query: mockQuery } } });
  });

  it('normalizeProducts：缺失配比自动填 1（等权），已有配比保留', () => {
    const normalized = service.normalizeProducts([
      { productId: 1, productName: 'A', addedDate: '2026-09-16' },
      { productId: 2, productName: 'B', allocationRatio: 0.3, addedDate: '2026-09-16' },
    ]);
    expect(normalized[0].allocationRatio).toBe(1);
    expect(normalized[1].allocationRatio).toBe(0.3);
  });

  it('createPlan 落库前自动等权填充', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    await service.createPlan('user-1', {
      planName: '测试组合',
      products: [{ productId: 1, productName: 'A', addedDate: '2026-09-16' }],
    });
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('updatePlan 落库前自动等权填充', async () => {
    mockUpdate.mockResolvedValue({ id: 2 });
    await service.updatePlan(2, {
      products: [{ productId: 3, productName: 'C', addedDate: '2026-09-16' }],
    });
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });
});
