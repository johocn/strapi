import adapterRegistryFactory, { initRegistry } from "../../server/src/services/adapter-registry-service";

describe("adapterRegistry service", () => {
  it("factory 返回 AdapterRegistry 实例（非 undefined）", () => {
    const registry = adapterRegistryFactory({ strapi: {} as any });
    expect(registry).toBeDefined();
    expect(registry.has).toBeDefined();
    expect(registry.get).toBeDefined();
  });

  it("initRegistry 注册启用的平台适配器", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { code: "taobao", syncEnabled: true, appKey: "k1", appSecret: "s1", apiEndpoint: "e1" },
      { code: "pdd", syncEnabled: false },
    ]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const strapi: any = {
      documents,
      config: { get: jest.fn().mockReturnValue("production") },
      log: { info: jest.fn(), warn: jest.fn() },
    };
    const registry = await initRegistry(strapi);
    expect(registry.has("taobao")).toBe(true);
    expect(registry.has("pdd")).toBe(false);
  });

  it("factory 在 initRegistry 之后返回同一实例", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const strapi: any = {
      documents,
      config: { get: jest.fn().mockReturnValue("production") },
      log: { info: jest.fn(), warn: jest.fn() },
    };
    await initRegistry(strapi);
    const registry = adapterRegistryFactory({ strapi });
    expect(registry.has("taobao")).toBe(false);
    // 是同一实例（initRegistry 注册了空平台列表）
    expect(registry.list()).toEqual([]);
  });
});
