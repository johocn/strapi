// tests/helpers/mock-strapi.ts

/**
 * 手写 mock 工厂，模拟 strapi 对象用于 service/controller 单元测试。
 * 不引入 jest-mock-extended 等新依赖。
 */

export function createMockStrapi(overrides: Record<string, any> = {}) {
  // 默认 query mock（按 UID 返回同一实例，测试可通过 mockReturnValueOnce 覆盖）
  const defaultQueryMock = {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1" }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };

  const queryFn = jest.fn().mockReturnValue(defaultQueryMock);

  const connectionMock = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockResolvedValue([]),
    raw: jest.fn().mockResolvedValue({ rows: [] }),
  };

  const mockStrapi = {
    db: {
      query: queryFn,
      connection: connectionMock,
    },
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({}),
    }),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    server: {
      use: jest.fn(),
      httpServer: {},
    },
    dirs: { static: { public: "/tmp/test-public" } },
    config: {
      get: jest.fn().mockReturnValue(undefined),
    },
    ...overrides,
  };

  // 同时设为全局（部分 utils 用 declare const strapi）
  (global as any).strapi = mockStrapi;

  return mockStrapi;
}

/**
 * 辅助：创建带特定 query 返回值的 mock
 * 用法：createMockStrapiWithQuery({ "plugin::zhao-website.article": { findOne: jest.fn().mockResolvedValue({...}) } })
 */
export function createMockStrapiWithQuery(queryOverrides: Record<string, Partial<ReturnType<typeof createDefaultQueryMock>>> = {}) {
  const defaultQueryMock = createDefaultQueryMock();
  const queryMocks: Record<string, any> = {};

  for (const [uid, overrides] of Object.entries(queryOverrides)) {
    queryMocks[uid] = { ...defaultQueryMock, ...overrides };
  }

  const queryFn = jest.fn((uid: string) => queryMocks[uid] || defaultQueryMock);

  const mockStrapi = {
    db: {
      query: queryFn,
      connection: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockResolvedValue([]),
        raw: jest.fn().mockResolvedValue({ rows: [] }),
      },
    },
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({}),
    }),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    server: { use: jest.fn(), httpServer: {} },
    dirs: { static: { public: "/tmp/test-public" } },
    config: { get: jest.fn().mockReturnValue(undefined) },
  };

  (global as any).strapi = mockStrapi;
  return mockStrapi;
}

function createDefaultQueryMock() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1" }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };
}
