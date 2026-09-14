'use strict';

describe('monitor controller', () => {
  let mockStrapi: any;
  let mockService: any;

  beforeEach(() => {
    jest.resetModules();
    mockService = { getProductMonitorList: jest.fn() };
    mockStrapi = {
      db: { query: jest.fn() },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn().mockReturnValue(mockService),
    };
  });

  function makeCtx(overrides: any = {}) {
    return { query: {}, params: {}, request: { body: {} }, state: {}, body: null, ...overrides };
  }

  it('200: 返回监察列表', async () => {
    const factory = require('../controllers/monitor').default;
    const controller = factory({ strapi: mockStrapi });
    const data = { list: [{ id: 1, overall: 'ok' }], summary: { ok: 1, warning: 0, danger: 0 } };
    mockService.getProductMonitorList.mockResolvedValue(data);

    const ctx = makeCtx();
    await controller.list(ctx);

    expect(ctx.body).toEqual({ code: 200, msg: 'success', data });
    expect(mockService.getProductMonitorList).toHaveBeenCalledTimes(1);
  });

  it('500: 服务异常返回错误', async () => {
    const factory = require('../controllers/monitor').default;
    const controller = factory({ strapi: mockStrapi });
    mockService.getProductMonitorList.mockRejectedValue(new Error('db down'));

    const ctx = makeCtx();
    await controller.list(ctx);

    expect(ctx.body.code).toBe(500);
    expect(ctx.body.data).toBeNull();
  });
});
