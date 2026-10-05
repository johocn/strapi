/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // 测试文件匹配：只跑 plugin 自己的 tests/ 目录
  testMatch: ['**/tests/**/*.test.ts'],

  // 覆盖 server/src（被测代码）和 tests（测试代码）
  roots: ['<rootDir>/server/src', '<rootDir>/tests'],

  // ts-jest transform —— 用 plugin 自己的 tsconfig（include 只有 server/src，需要扩展覆盖 tests）
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'CommonJS',
          moduleResolution: 'node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          rootDir: '.',
          baseUrl: '.',
          paths: {
            '@strapi/strapi': ['../../node_modules/@strapi/strapi'],
            '@strapi/utils': ['../../node_modules/@strapi/utils'],
          },
        },
        diagnostics: false, // 跳过类型诊断加速测试
      },
    ],
  },

  // moduleNameMapper 留空 —— BullMQ/Playwright/ioredis/axios 用 virtual mock（测试内 { virtual: true }）
  // @strapi/strapi 等 peerDependencies 在 ts-jest paths 里已映射到根 node_modules

  // 覆盖默认的 testPathIgnorePatterns（不忽略 tests/）
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // 覆盖率收集 — 只收集 server/src
  collectCoverageFrom: ['server/src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '\\.d\\.ts$'],
};
