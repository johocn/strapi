export function createMockStrapi() {
  const queryMock = {
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  };

  return {
    db: {
      query: jest.fn(() => queryMock),
    },
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({})),
    })),
    documents: jest.fn(() => ({
      findMany: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    })),
  } as any;
}