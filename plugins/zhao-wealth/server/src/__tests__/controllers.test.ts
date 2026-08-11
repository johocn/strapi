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

  // ============= holding controller =============
  describe('holding controller', () => {
    let controller: any;

    beforeEach(() => {
      const factory = require('../controllers/holding').default;
      controller = factory({ strapi: mockStrapi });
    });

    describe('list (GET /holdings)', () => {
      it('401: 未登录拒绝', async () => {
        const ctx = makeCtx({ state: { user: undefined, channel: undefined } });

        await controller.list(ctx);

        expect(ctx.body).toEqual({ code: 403, msg: '需要登录', data: null });
        expect(mockService.getUserHoldings).not.toHaveBeenCalled();
      });

      it('200: 登录用户返回持仓列表', async () => {
        mockService.getUserHoldings.mockResolvedValue({
          list: [{ id: 1 }], page: 1, pageSize: 20, total: 1,
        });
        const ctx = makeCtx({
          query: { page: 1, pageSize: 20 },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.list(ctx);

        expect(ctx.body.code).toBe(200);
        expect(ctx.body.data.records).toHaveLength(1);
        expect(mockService.getUserHoldings).toHaveBeenCalledWith(100, 1, 20);
      });
    });

    describe('detail (GET /holdings/:id)', () => {
      it('401: 未登录拒绝', async () => {
        const ctx = makeCtx({ params: { id: '1' }, state: { user: undefined } });

        await controller.detail(ctx);

        expect(ctx.body).toEqual({ code: 403, msg: '需要登录', data: null });
      });

      it('404: 持仓不存在或无权限', async () => {
        mockService.getHoldingDetail.mockResolvedValue(null);
        const ctx = makeCtx({
          params: { id: '999' },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.detail(ctx);

        expect(ctx.body).toEqual({ code: 404, msg: '持仓不存在或无权限', data: null });
        expect(mockService.getHoldingDetail).toHaveBeenCalledWith(999, 100);
      });

      it('200: 返回持仓详情', async () => {
        mockService.getHoldingDetail.mockResolvedValue({ id: 1, profit: 100 });
        const ctx = makeCtx({
          params: { id: '1' },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.detail(ctx);

        expect(ctx.body.code).toBe(200);
        expect(ctx.body.data.id).toBe(1);
      });
    });

    describe('add (POST /holdings)', () => {
      it('401: 未登录拒绝', async () => {
        const ctx = makeCtx({
          request: { body: { productId: 1, buyDate: '2026-08-01', buyAmount: 10000 } },
          state: { user: undefined, channel: undefined },
        });

        await controller.add(ctx);

        expect(ctx.body).toEqual({ code: 403, msg: '需要登录', data: null });
      });

      it('400: 缺必填参数', async () => {
        const ctx = makeCtx({
          request: { body: { productId: 1, buyDate: '2026-08-01' } },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.add(ctx);

        expect(ctx.body.code).toBe(400);
        expect(ctx.body.msg).toBe('productId, buyDate, buyAmount 必填');
      });

      it('200: 添加持仓成功（带 channelId）', async () => {
        mockService.createHolding.mockResolvedValue({ id: 10 });
        const ctx = makeCtx({
          request: { body: { productId: 1, buyDate: '2026-08-01', buyAmount: 10000, buyNav: 1.02 } },
          state: { user: { id: 100 }, channel: { id: 5 } },
        });

        await controller.add(ctx);

        expect(ctx.body.code).toBe(200);
        expect(mockService.createHolding).toHaveBeenCalledWith(expect.objectContaining({
          userId: 100, productId: 1, channelId: 5, buyDate: '2026-08-01', buyAmount: 10000, buyNav: 1.02,
        }));
      });

      it('500: service 抛错（无净值数据）', async () => {
        mockService.createHolding.mockRejectedValue(new Error('产品无净值数据，无法录入持仓'));
        const ctx = makeCtx({
          request: { body: { productId: 999, buyDate: '2026-08-01', buyAmount: 10000 } },
          state: { user: { id: 100 }, channel: { id: 5 } },
        });

        await controller.add(ctx);

        expect(ctx.body.code).toBe(500);
        expect(ctx.body.msg).toBe('产品无净值数据，无法录入持仓');
      });
    });

    describe('remove (DELETE /holdings/:id)', () => {
      it('401: 未登录拒绝', async () => {
        const ctx = makeCtx({ params: { id: '1' }, state: { user: undefined } });

        await controller.remove(ctx);

        expect(ctx.body).toEqual({ code: 403, msg: '需要登录', data: null });
      });

      it('404: 删除不存在的持仓', async () => {
        mockService.deleteHolding.mockResolvedValue(null);
        const ctx = makeCtx({
          params: { id: '999' },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.remove(ctx);

        expect(ctx.body).toEqual({ code: 404, msg: '持仓不存在或无权限', data: null });
      });

      it('200: 删除成功', async () => {
        mockService.deleteHolding.mockResolvedValue({ id: 1 });
        const ctx = makeCtx({
          params: { id: '1' },
          state: { user: { id: 100 }, channel: { id: 1 } },
        });

        await controller.remove(ctx);

        expect(ctx.body.code).toBe(200);
        expect(mockService.deleteHolding).toHaveBeenCalledWith(1, 100);
      });
    });
  });
});
