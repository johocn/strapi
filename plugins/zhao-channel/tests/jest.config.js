"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: "..",
    testMatch: ["<rootDir>/tests/**/*.test.ts"],
    moduleNameMapper: {
        "^@strapi/strapi$": "<rootDir>/node_modules/@strapi/strapi",
    },
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/server/tsconfig.json",
            },
        ],
    },
    moduleFileExtensions: ["js", "ts", "json"],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    restoreMocks: true,
};
exports.default = config;
