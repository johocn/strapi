export const createMockStrapi = (overrides: any = {}) => {
  const findMany = jest.fn().mockResolvedValue([]);
  const documents = jest.fn().mockImplementation((uid: string) => ({
    findMany,
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ documentId: "doc1" }),
    update: jest.fn().mockResolvedValue({}),
  }));
  return {
    documents,
    plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(null), config: jest.fn() }),
    config: { get: jest.fn().mockReturnValue("test") },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    store: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
    ...overrides,
  };
};
