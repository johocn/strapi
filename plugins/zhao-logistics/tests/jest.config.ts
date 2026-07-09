export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^@strapi/strapi$": "<rootDir>/node_modules/@strapi/strapi",
  },
  collectCoverageFrom: ["server/src/**/*.ts", "!server/src/index.ts"],
  coverageDirectory: "coverage",
};
