const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/server/src/$1",
  },
  clearMocks: true,
  collectCoverageFrom: ["server/src/**/*.ts", "!server/src/index.ts"],
};

module.exports = config;
