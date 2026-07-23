/**
 * TDD 失败测试：getPublic 控制器必须使用 ctx.state.siteDocumentId（documentId 字符串）
 * 而非 ctx.state.siteId（数字主键）传递给 service.getPublicConfig。
 *
 * 根因：siteConfigService.getConfig 内部把入参当作 documentId 字符串去 findOne，
 * 若误传数字 id（如 1），则 findOne({ documentId: 1 }) 永远查不到记录，
 * 导致 C 端 public/config 接口 site 字段返回空对象。
 */
import controllerFactory from "../../server/src/controllers/config";

describe("config controller getPublic - siteDocumentId 传递", () => {
  function createMockStrapi(getPublicConfig: jest.Mock) {
    const mockStrapi: any = {
      plugin: jest.fn().mockImplementation((name: string) => ({
        service: jest.fn().mockImplementation((svcName: string) => {
          if (name === "zhao-common" && svcName === "config") {
            return { getPublicConfig };
          }
          return {};
        }),
      })),
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
    return mockStrapi;
  }

  it("当 ctx.state 同时包含 siteId(数字) 与 siteDocumentId(字符串) 时，应传 siteDocumentId 给 getPublicConfig", async () => {
    const getPublicConfig = jest.fn().mockResolvedValue({ site: {} });
    const strapi = createMockStrapi(getPublicConfig);
    const controller = controllerFactory({ strapi } as any);

    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      query: {},
      body: undefined as any,
    };

    await controller.getPublic(ctx);

    expect(getPublicConfig).toHaveBeenCalledTimes(1);
    const firstArg = getPublicConfig.mock.calls[0][0];
    // 关键断言：第一参数应为 documentId 字符串，而非数字主键
    expect(firstArg).toBe("doc-abc");
    expect(firstArg).not.toBe(1);
  });

  it("当 ctx.state 仅包含 siteId 而无 siteDocumentId 时，应传 undefined 给 getPublicConfig", async () => {
    const getPublicConfig = jest.fn().mockResolvedValue({ site: {} });
    const strapi = createMockStrapi(getPublicConfig);
    const controller = controllerFactory({ strapi } as any);

    const ctx: any = {
      state: { siteId: 1 },
      query: {},
      body: undefined as any,
    };

    await controller.getPublic(ctx);

    expect(getPublicConfig).toHaveBeenCalledTimes(1);
    const firstArg = getPublicConfig.mock.calls[0][0];
    // 关键断言：siteDocumentId 不存在时应传 undefined，而不是数字 siteId
    expect(firstArg).toBeUndefined();
    expect(firstArg).not.toBe(1);
  });
});
