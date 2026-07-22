export const createMockStrapi = (overrides: any = {}) => {
  const findMany = jest.fn().mockResolvedValue([]);
  const findOne = jest.fn().mockResolvedValue(null);
  const create = jest.fn().mockResolvedValue({ documentId: "doc1" });
  const update = jest.fn().mockResolvedValue({});
  const documents = jest.fn().mockImplementation(() => ({ findMany, findOne, create, update }));
  return {
    documents,
    plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(null), config: jest.fn() }),
    config: { get: jest.fn().mockReturnValue("test") },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    store: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
    ...overrides,
  };
};
