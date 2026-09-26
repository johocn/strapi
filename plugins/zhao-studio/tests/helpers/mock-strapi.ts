export const createMockStrapi = (overrides: any = {}) => {
  const findMany = jest.fn().mockResolvedValue([]);
  const findOne = jest.fn().mockResolvedValue(null);
  const create = jest.fn().mockResolvedValue({ documentId: 'doc1' });
  const update = jest.fn().mockResolvedValue({});
  const deleteFn = jest.fn().mockResolvedValue({});
  const documents = jest.fn().mockImplementation(() => ({ findMany, findOne, create, update, delete: deleteFn }));
  // db.query(uid) 始终返回同一实例，测试可用 mockResolvedValueOnce 控制调用序列
  const dbQueryMock = {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ documentId: 'doc1' }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  };
  return {
    db: { query: jest.fn(() => dbQueryMock) },
    documents,
    plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(null), config: jest.fn() }),
    config: { get: jest.fn().mockReturnValue('test') },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    store: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
    ...overrides,
  };
};
