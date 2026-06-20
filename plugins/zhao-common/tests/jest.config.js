/**
 * Jest config for zhao-common unit tests
 * Use .js to avoid ts-node dependency issues with Jest 30
 * ts-jest is resolved from root project's node_modules
 */
const path = require("path");

const PLUGIN_ROOT = path.resolve(__dirname, ".."); // E:\code\basic\plugins\zhao-common
const ROOT_NODE_MODULES = path.resolve(__dirname, "../../../node_modules");

const config = {
  rootDir: PLUGIN_ROOT,
  preset: path.join(ROOT_NODE_MODULES, "ts-jest"),
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      path.join(ROOT_NODE_MODULES, "ts-jest"),
      {
        tsconfig: {
          target: "ES2020",
          module: "commonjs",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: "./dist",
          rootDir: ".",
          moduleResolution: "node",
          paths: {
            "@strapi/strapi": [path.join(ROOT_NODE_MODULES, "@strapi/strapi")],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@strapi/strapi$": path.join(ROOT_NODE_MODULES, "@strapi/strapi"),
  },
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
  verbose: true,
};

module.exports = config;