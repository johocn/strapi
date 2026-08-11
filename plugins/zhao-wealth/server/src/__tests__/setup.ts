'use strict';

// 全局 strapi mock，每个测试文件可覆盖
const mockDbQuery = jest.fn();
const mockStrapi = {
  db: { query: mockDbQuery },
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  plugin: jest.fn().mockReturnValue({ service: jest.fn() }),
  service: jest.fn(),
};

(global as any).strapi = mockStrapi;

export { mockStrapi, mockDbQuery };
