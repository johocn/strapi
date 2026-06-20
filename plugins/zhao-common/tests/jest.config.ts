import type { Config } from "jest";

/**
 * Jest config for zhao-common unit tests
 * Uses ts-jest with in-memory tsconfig to avoid ts-node dependency
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2020",
          module: "commonjs",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: "./dist",
          rootDir: ".",
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
  verbose: true,
};

export default config;