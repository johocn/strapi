/**
 * TDD 失败测试：getPublicConfig 的 moduleGrantedForCurrentTenant 与 resolveModuleVisibility
 * 必须基于 siteDocumentId（documentId 字符串）判定，而非数字主键 siteId。
 *
 * 覆盖 4 个场景：
 * 1. documentId 在 moduleTenantGrants 数组中 → granted=true
 * 2. documentId 不在数组 → false
 * 3. globalEnabled=true 时即便未授权也 true
 * 4. resolveModuleVisibility 收到 documentId 字符串（"doc-abc"）而非数字主键（1）
 */
import serviceFactory from "../../server/src/services/config";

describe("config service getPublicConfig - 租户授权判定", () => {
  function buildBaseFullConfig() {
    return {
      siteName: "圣麟教育",
      extraConfig: {},
      moduleVisibility: {},
      featureFlags: { channel: true },
      themeConfig: { primaryColor: "#667eea" },
    };
  }

  function createMockStrapi(opts: {
    fullConfig?: any;
    globalConfig?: any;
    resolveModuleVisibility?: jest.Mock;
  }) {
    const siteConfigService = {
      getConfig: jest.fn().mockResolvedValue(opts.fullConfig ?? buildBaseFullConfig()),
    };
    const globalConfigService = {
      getGlobalConfig: jest.fn().mockResolvedValue(opts.globalConfig ?? {}),
    };
    const siteTemplateService = {
      getTemplate: jest.fn(),
    };
    const permissionService = {
      resolveModuleVisibility: opts.resolveModuleVisibility ?? jest.fn().mockResolvedValue({}),
    };

    const mockStrapi: any = {
      plugin: jest.fn().mockImplementation((name: string) => ({
        service: jest.fn().mockImplementation((svcName: string) => {
          if (name === "zhao-common" && svcName === "site-config") return siteConfigService;
          if (name === "zhao-common" && svcName === "global-config") return globalConfigService;
          if (name === "zhao-common" && svcName === "site-template") return siteTemplateService;
          if (name === "zhao-auth" && svcName === "permission") return permissionService;
          return {};
        }),
      })),
      db: {
        query: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
      },
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
    return { mockStrapi, siteConfigService, globalConfigService, permissionService };
  }

  it("documentId 在 moduleTenantGrants 数组中时，对应模块 moduleGrantedForCurrentTenant 应为 true", async () => {
    const { mockStrapi } = createMockStrapi({
      globalConfig: {
        moduleEnabled: {},
        moduleTenantGrants: { sso: ["doc-abc"] },
      },
    });
    const service = serviceFactory({ strapi: mockStrapi } as any);

    const result = await service.getPublicConfig("doc-abc");

    expect(result.moduleGrantedForCurrentTenant).toBeDefined();
    expect(result.moduleGrantedForCurrentTenant.sso).toBe(true);
  });

  it("documentId 不在 moduleTenantGrants 数组中时，对应模块应为 false", async () => {
    const { mockStrapi } = createMockStrapi({
      globalConfig: {
        moduleEnabled: {},
        moduleTenantGrants: { sso: ["doc-abc"] },
      },
    });
    const service = serviceFactory({ strapi: mockStrapi } as any);

    const result = await service.getPublicConfig("doc-other");

    expect(result.moduleGrantedForCurrentTenant).toBeDefined();
    expect(result.moduleGrantedForCurrentTenant.sso).toBe(false);
  });

  it("globalEnabled=true 时即便当前租户未授权，对应模块也应为 true", async () => {
    const { mockStrapi } = createMockStrapi({
      globalConfig: {
        moduleEnabled: { points: true },
        moduleTenantGrants: { points: ["doc-abc"] },
      },
    });
    const service = serviceFactory({ strapi: mockStrapi } as any);

    const result = await service.getPublicConfig("doc-other");

    expect(result.moduleGrantedForCurrentTenant).toBeDefined();
    expect(result.moduleGrantedForCurrentTenant.points).toBe(true);
  });

  it("resolveModuleVisibility 应收到 documentId 字符串（doc-abc），而非数字主键（1）", async () => {
    const resolveModuleVisibility = jest.fn().mockResolvedValue({});
    const { mockStrapi } = createMockStrapi({
      resolveModuleVisibility,
      globalConfig: {
        moduleEnabled: {},
        moduleTenantGrants: {},
      },
    });
    const service = serviceFactory({ strapi: mockStrapi } as any);

    await service.getPublicConfig("doc-abc");

    expect(resolveModuleVisibility).toHaveBeenCalledTimes(1);
    const arg = resolveModuleVisibility.mock.calls[0][0];
    // 关键断言：参数应为 documentId 字符串，而非数字主键
    expect(arg).toBe("doc-abc");
    expect(arg).not.toBe(1);
  });
});
