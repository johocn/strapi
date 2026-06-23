import { describe, it, expect } from "@jest/globals";

// 直接导入实际的路由配置文件，不使用mock
import routesConfig from "../server/src/routes/index";
import contentApiRoutes from "../server/src/routes/content-api";
import adminRoutes from "../server/src/routes/admin";

describe("zhao-common routes configuration structure", () => {
  describe("routes/index.ts", () => {
    it("should export named router format with admin and content-api keys", () => {
      expect(routesConfig).toBeDefined();
      expect(routesConfig.admin).toBeDefined();
      expect(routesConfig["content-api"]).toBeDefined();
    });

    it("should have content-api router with correct type", () => {
      const contentApi = routesConfig["content-api"] as any;
      expect(contentApi.type).toBe("content-api");
    });

    it("should have admin router with correct type", () => {
      expect((routesConfig.admin as any).type).toBe("admin");
    });
  });

  describe("content-api routes", () => {
    it("should export all required routes", () => {
      const contentApi = contentApiRoutes() as any;
      expect(contentApi.type).toBe("content-api");
      expect(contentApi.routes).toBeDefined();
      expect(Array.isArray(contentApi.routes)).toBe(true);
      expect(contentApi.routes.length).toBeGreaterThanOrEqual(3);
    });

    it("should register /v1/public/config route", () => {
      const contentApi = contentApiRoutes() as any;
      const route = contentApi.routes.find(
        (r: any) => r.path === "/v1/public/config"
      );
      expect(route).toBeDefined();
      expect(route.method).toBe("GET");
      expect(route.handler).toBe("config.getPublic");
      expect(route.config.auth).toBe(false);
    });
  });

  describe("admin routes", () => {
    it("should export admin routes with correct type", () => {
      expect(adminRoutes.type).toBe("admin");
      expect(Array.isArray(adminRoutes.routes)).toBe(true);
    });
  });

  describe("route handler format validation", () => {
    it("all content-api handlers should use short format (controller.action)", () => {
      const contentApi = contentApiRoutes() as any;
      contentApi.routes.forEach((route: any) => {
        expect(route.handler).toMatch(/^[a-z-]+\.[a-zA-Z]+$/);
      });
    });

    it("all admin handlers should use short format (controller.action)", () => {
      (adminRoutes as any).routes.forEach((route: any) => {
        expect(route.handler).toMatch(/^[a-z-]+\.[a-zA-Z]+$/);
      });
    });
  });
});
