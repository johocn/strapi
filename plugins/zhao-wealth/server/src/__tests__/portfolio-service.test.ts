'use strict';

describe('portfolio-service 归属校验与创建校验', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();
  const mockProductCount = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-portfolio-plan') {
      return { create: mockCreate, update: mockUpdate, findOne: mockFindOne };
    }
    if (name === 'plugin::zhao-wealth.wealth-product') {
      return { count: mockProductCount, findMany: jest.fn() };
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
    mockProductCount.mockResolvedValue(1);
    mockCreate.mockResolvedValue({ id: 1 });
    const r = await service.createPlan('user-1', {
      planName: '测试组合',
      products: [{ productId: 1, productName: 'A', addedDate: '2026-09-16' }],
    });
    expect(r.ok).toBe(true);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('createPlan：products 为空数组返回 400', async () => {
    const r = await service.createPlan('user-1', { planName: '测试组合', products: [] });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('createPlan：包含无效产品（计数不匹配）返回 400', async () => {
    mockProductCount.mockResolvedValue(1); // 传了 2 个 productId，只存在 1 个
    const r = await service.createPlan('user-1', {
      planName: '测试组合',
      products: [
        { productId: 1, productName: 'A', addedDate: '2026-09-16' },
        { productId: 999, productName: 'X', addedDate: '2026-09-16' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('getPlanDetail：非本人返回 null，查询条件带 userId', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.getPlanDetail(1, 'other-user');
    expect(r).toBeNull();
    expect(mockFindOne.mock.calls[0][0].where).toEqual({ id: 1, userId: 'other-user' });
  });

  it('updatePlan：非本人返回 404 且不执行更新', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.updatePlan(1, 'other-user', { planName: 'x' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updatePlan 落库前自动等权填充（本人）', async () => {
    mockFindOne.mockResolvedValue({ id: 2, userId: 'user-1' });
    mockUpdate.mockResolvedValue({ id: 2 });
    const r = await service.updatePlan(2, 'user-1', {
      products: [{ productId: 3, productName: 'C', addedDate: '2026-09-16' }],
    });
    expect(r.ok).toBe(true);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('deletePlan：非本人返回 404', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.deletePlan(1, 'other-user');
    expect(r.ok).toBe(false);
    expect(r.code).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('deletePlan：本人归档成功', async () => {
    mockFindOne.mockResolvedValue({ id: 3, userId: 'user-1' });
    mockUpdate.mockResolvedValue({ id: 3, status: 'archived' });
    const r = await service.deletePlan(3, 'user-1');
    expect(r.ok).toBe(true);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.status).toBe('archived');
  });
});
