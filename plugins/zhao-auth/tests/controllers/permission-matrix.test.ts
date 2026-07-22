// tests/controllers/permission-matrix.test.ts
// 注意：Strapi v5 controller 标准模式是 export default ({ strapi }) => ({ async method(ctx) {} })
// 路由 'permission-matrix.getMatrix' 会调用 controller 对象的 getMatrix 方法（已注入 strapi）
describe('permission matrix controller', () => {
  const createMockStrapi = (overrides: any = {}) => ({
    db: { query: jest.fn(() => ({ findMany: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) })) },
    documents: jest.fn(() => ({ findMany: jest.fn().mockResolvedValue([]) })),
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({
        getMyPermissions: jest.fn().mockResolvedValue([]),
        invalidatePermissionCache: jest.fn(),
      })),
    })),
    log: { error: jest.fn(), warn: jest.fn() },
    ...overrides,
  });

  it('GET /permissions/matrix returns role x action matrix', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([
      { role: 'ADMIN', permissions: ['zhao-deal.coupon.manage'], isSystem: true, seedVersion: '2026-07-22' },
      { role: 'CHANNEL_ADMIN', permissions: [], isSystem: true, seedVersion: '2026-07-22' },
    ]);
    const mockStrapi = createMockStrapi({
      db: { query: jest.fn(() => ({ findMany: mockFindMany, findOne: jest.fn() })) },
    });

    const controllerFactory = require('../../server/src/controllers/permission-matrix').default;
    const controller = controllerFactory({ strapi: mockStrapi });
    const ctx = { send: jest.fn(), throw: jest.fn() };
    await controller.getMatrix(ctx);

    expect(ctx.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ role: 'ADMIN' }),
        ]),
      })
    );
  });

  it('PUT /permissions/roles/:role updates permissions', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const mockFindOne = jest.fn().mockResolvedValue({ id: 1, role: 'CHANNEL_ADMIN', isSystem: true });
    const mockStrapi = createMockStrapi({
      db: { query: jest.fn(() => ({ findOne: mockFindOne, update: mockUpdate })) },
    });

    const controllerFactory = require('../../server/src/controllers/permission-matrix').default;
    const controller = controllerFactory({ strapi: mockStrapi });
    const ctx = {
      params: { role: 'CHANNEL_ADMIN' },
      request: { body: { permissions: ['zhao-deal.coupon.manage'] } },
      send: jest.fn(),
      throw: jest.fn(),
    };
    await controller.updateRolePermissions(ctx);

    expect(mockUpdate).toHaveBeenCalled();
    expect(ctx.send).toHaveBeenCalled();
  });

  it('POST /permissions/roles/:role/reset resets to default', async () => {
    const mockFindOne = jest.fn().mockResolvedValue({ id: 1, role: 'CHANNEL_ADMIN', isSystem: true });
    const mockUpdate = jest.fn().mockResolvedValue({});
    const mockStrapi = createMockStrapi({
      db: { query: jest.fn(() => ({ findOne: mockFindOne, update: mockUpdate })) },
    });

    const controllerFactory = require('../../server/src/controllers/permission-matrix').default;
    const controller = controllerFactory({ strapi: mockStrapi });
    const ctx = {
      params: { role: 'CHANNEL_ADMIN' },
      send: jest.fn(),
      throw: jest.fn(),
    };
    await controller.resetRolePermissions(ctx);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('cannot reset admin role', async () => {
    const mockStrapi = createMockStrapi();

    const controllerFactory = require('../../server/src/controllers/permission-matrix').default;
    const controller = controllerFactory({ strapi: mockStrapi });
    const ctx = {
      params: { role: 'ADMIN' },
      throw: jest.fn(),
      send: jest.fn(),
    };
    await controller.resetRolePermissions(ctx);

    expect(ctx.throw).toHaveBeenCalledWith(403, expect.any(String));
  });
});
