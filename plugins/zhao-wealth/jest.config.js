/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        resolveJsonModule: true,
        target: 'ES2020',
        module: 'commonjs',
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/server/src/__tests__/setup.ts'],
  clearMocks: true,
};
