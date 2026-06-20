import http from "http";
import path from "path";
import type { Core } from "@strapi/strapi";

let strapiInstance: Core.Strapi | null = null;

function isAlive(instance: Core.Strapi): boolean {
  return global.strapi === instance;
}

export async function setupStrapi(): Promise<Core.Strapi> {
  if (strapiInstance && isAlive(strapiInstance)) {
    return strapiInstance;
  }
  strapiInstance = null;

  process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || "postgres";
  process.env.DATABASE_HOST = process.env.DATABASE_HOST || "127.0.0.1";
  process.env.DATABASE_PORT = process.env.DATABASE_PORT || "5432";
  process.env.DATABASE_NAME = process.env.DATABASE_NAME || "strapi_test";
  process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || "postgres";
  process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "admin";
  process.env.DATABASE_SSL = process.env.DATABASE_SSL || "false";
  process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || "";
  process.env.APP_KEYS = process.env.APP_KEYS || "testKey1==,testKey2==,testKey3==,testKey4==";
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || "testApiTokenSalt==";
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "testAdminJwtSecret==";
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || "testTransferTokenSalt==";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testJwtSecret==";
  process.env.NODE_ENV = process.env.NODE_ENV || "test";

  const { createStrapi } = require("@strapi/strapi");

  const projectDir = path.resolve(__dirname, "..", "..", "..", "..", "basic");

  strapiInstance = await createStrapi({
    appDir: projectDir,
    distDir: projectDir + "/dist",
    autoReload: false,
    serveAdminPanel: false,
  }).load();

  const server = (strapiInstance as any).server;
  server.mount();

  return strapiInstance;
}

export async function teardownStrapi(): Promise<void> {
}

export function getStrapi(): Core.Strapi {
  if (!strapiInstance) {
    throw new Error("Strapi 实例未初始化，请先调用 setupStrapi()");
  }
  return strapiInstance;
}

export function createTestServer(): http.Server {
  const strapi = getStrapi();
  const server = (strapi as any).server;
  return http.createServer(server.app.callback());
}
