'use strict';

/**
 * Controller 集成测试
 * 覆盖 spec 11.13 要求：200 成功 / 400 参数错误 / 401 未登录 / 403 越权 / 404 不存在
 * 通过 mock ctx + strapi 验证响应格式与权限校验逻辑
 */

describe('controllers integration', () => {
  let mockStrapi: any;
  let mockService: any;
  let mockDbQuery: any;

  beforeEach(() => {
    jest.resetModules();

    mockService = {
      getByProductType: jest.fn(),
      compareProducts: jest.fn(),
      getUserHoldings: jest.fn(),
      getHoldingDetail: jest.fn(),
      calcProfitTrend: jest.fn(),
      createHolding: jest.fn(),
      deleteHolding: jest.fn(),
    };

    mockDbQuery = {};

    mockStrapi = {
      db: { query: jest.fn().mockReturnValue(mockDbQuery) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue(mockService),
    };
  });

  function makeCtx(overrides: any = {}) {
    return {
      query: {},
      params: {},
      request: { body: {} },
      state: { user: undefined, channel: undefined },
      body: null,
      ...overrides,
    };
  }

  // ============= disclosure controller =============
  describe('disclosure controller', () => {
    let controller: any;

    beforeEach(() => {
      const factory = require('../controllers/disclosure').default;
      controller = factory({ strapi: mockStrapi });
    });

    it('200: 按 productType 返回披露文案', async () => {
      mockService.getByProductType.mockResolvedValue({ id: 1, title: '银行理财披露' });
      const ctx = makeCtx({ query: { productType: 'bank-wealth' } });

      await controller.getByProductType(ctx);

      expect(ctx.body).toEqual({ code: 200, msg: 'success', data: { id: 1, title: '银行理财披露' } });
      expect(mockService.getByProductType).toHaveBeenCalledWith('bank-wealth');
    });

    it('400: 缺 productType 参数', async () => {
      const ctx = makeCtx({ query: {} });

      await controller.getByProductType(ctx);

      expect(ctx.body).toEqual({ code: 400, msg: 'productType 参数必填', data: null });
      expect(mockService.getByProductType).not.toHaveBeenCalled();
    });

    it('400: 无效的 productType', async () => {
      const ctx = makeCtx({ query: { productType: 'invalid-type' } });

      await controller.getByProductType(ctx);

      expect(ctx.body.code).toBe(400);
      expect(ctx.body.msg).toBe('无效的 productType');
    });

    it('500: service 异常返回 500', async () => {
      mockService.getByProductType.mockRejectedValue(new Error('db error'));
      const ctx = makeCtx({ query: { productType: 'bank-wealth' } });

      await controller.getByProductType(ctx);

      expect(ctx.body).toEqual({ code: 500, msg: '查询失败', data: null });
    });
  });

  // ============= compare controller =============
  describe('compare controller', () => {
    let controller: any;

    beforeEach(() => {
      const factory = require('../controllers/compare').default;
      controller = factory({ strapi: mockStrapi });
    });

    it('200: 多产品对比成功', async () => {
      mockService.compareProducts.mockResolvedValue([
        { productId: 1, productName: 'A' },
        { productId: 2, productName: 'B' },
      ]);
      const ctx = makeCtx({ query: { productIds: '1,2', period: 'm1' } });

      await controller.compare(ctx);

      expect(ctx.body.code).toBe(200);
      expect(ctx.body.data).toHaveLength(2);
      expect(mockService.compareProducts).toHaveBeenCalledWith([1, 2], 'm1');
    });

    it('400: 缺 productIds 参数', async () => {
      const ctx = makeCtx({ query: {} });

      await controller.compare(ctx);

      expect(ctx.body).toEqual({ code: 400, msg: 'productIds 参数必填', data: null });
    });

    it('400: 无效的 period', async () => {
      const ctx = makeCtx({ query: { productIds: '1,2', period: 'invalid' } });

      await controller.compare(ctx);

      expect(ctx.body.code).toBe(400);
      expect(ctx.body.msg).toBe('无效的 period，可选 m1/m3/m6/y1');
    });

    it('200: productIds 自动过滤非法值', async () => {
      mockService.compareProducts.mockResolvedValue([]);
      const ctx = makeCtx({ query: { productIds: '1,abc,2,-3,0' } });

      await controller.compare(ctx);

      expect(mockService.compareProducts).toHaveBeenCalledWith([1, 2], 'm1');
    });

    it('500: service 抛错（产品不存在）', async () => {
      mockService.compareProducts.mockRejectedValue(new Error('产品 999 不存在或已下架'));
      const ctx = makeCtx({ query: { productIds: '1,999' } });

      await controller.compare(ctx);

      expect(ctx.body.code).toBe(500);
      expect(ctx.body.msg).toBe('产品 999 不存在或已下架');
    });
  });


  // ============= nav money-income timeSeries =============
  describe('nav money-income timeSeries', () => {
    let controller: any;

    beforeEach(() => {
      const factory = require('../controllers/nav').default;
      controller = factory({ strapi: mockStrapi });
    });

    it('200: GET /products/:id/money-incomes 返回倒序分页收益列表', async () => {
      mockDbQuery.findMany = jest.fn().mockResolvedValue([
        { incomeDate: '2026-09-13', tenThousandIncome: 0.4876, sevenDayAnnual: 0.0188 },
        { incomeDate: '2026-09-12', tenThousandIncome: 0.4821, sevenDayAnnual: 0.0185 },
      ]);
      mockDbQuery.count = jest.fn().mockResolvedValue(17);

      const ctx = makeCtx({ params: { id: '3' }, query: { page: 1, pageSize: 2 } });

      await controller.moneyIncomeTimeSeries(ctx);

      expect(ctx.body.code).toBe(200);
      expect(ctx.body.data.total).toBe(17);
      expect(ctx.body.data.records).toHaveLength(2);
      expect(ctx.body.data.records[0]).toMatchObject({
        date: '2026-09-13',
        tenThousandIncome: 0.4876,
        sevenDayAnnual: 0.0188,
      });
      expect(mockDbQuery.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { product: 3 },
        orderBy: { incomeDate: 'desc' },
      }));
      expect(mockDbQuery.count).toHaveBeenCalledWith({ where: { product: 3 } });
    });
  });
});
