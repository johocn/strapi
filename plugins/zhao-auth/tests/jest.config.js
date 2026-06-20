/** @type {import("jest").Config} */
const path = require("path");

const ROOT = path.resolve(__dirname, ".."); // E:\code\plugins\zhao-auth
const ROOT_NODE_MODULES = path.resolve(__dirname, "../../../basic/node_modules");

const config = {
  rootDir: ROOT,
  preset: path.join(ROOT_NODE_MODULES, "ts-jest"),
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      path.join(ROOT_NODE_MODULES, "ts-jest"),
      {
        tsconfig: path.join(ROOT, "tests", "tsconfig.json"),
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  restoreMocks: true,
};

module.exports = config;