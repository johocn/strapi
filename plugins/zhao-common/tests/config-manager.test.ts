import configManagerFactory from "../server/src/services/config-manager";

describe("config-manager service", () => {
  describe("get", () => {
    it("应返回插件配置中的指定值", () => {
      const mockStrapi = {
        plugin: () => ({ config: { apiKey: "abc", timeout: 5000 } }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.get("apiKey")).toBe("abc");
      expect(mgr.get("timeout")).toBe(5000);
    });

    it("当 key 不存在时应返回 undefined", () => {
      const mockStrapi = {
        plugin: () => ({ config: {} }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.get("missing")).toBeUndefined();
    });

    it("当 key 不存在时应返回默认值", () => {
      const mockStrapi = {
        plugin: () => ({ config: {} }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.get("missing", "defaultVal")).toBe("defaultVal");
    });

    it("当 plugin 返回 undefined 时应返回默认值", () => {
      const mockStrapi = {
        plugin: () => undefined,
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.get("anything", 42)).toBe(42);
    });

    it("应保持类型签名返回正确类型", () => {
      const mockStrapi = {
        plugin: () => ({ config: { count: 10 } }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      const val = mgr.get<number>("count", 0);
      expect(val).toBe(10);
    });
  });

  describe("getAll", () => {
    it("应返回所有配置", () => {
      const cfg = { debug: true, port: 3000 };
      const mockStrapi = {
        plugin: () => ({ config: cfg }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.getAll()).toEqual(cfg);
    });

    it("当无配置时应返回空对象", () => {
      const mockStrapi = {
        plugin: () => ({ config: null }),
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.getAll()).toEqual({});
    });

    it("当 plugin 不存在时应返回空对象", () => {
      const mockStrapi = {
        plugin: () => null,
      } as any;
      const mgr = configManagerFactory({ strapi: mockStrapi });

      expect(mgr.getAll()).toEqual({});
    });
  });
});