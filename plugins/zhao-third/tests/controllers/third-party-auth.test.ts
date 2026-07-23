describe("third-party-auth controllers siteId type fix", () => {
  let strapi: any;
  let controller: any;
  let authService: any;  // 提升到 describe 作用域

  beforeEach(() => {
    authService = {
      getAuthUrl: jest.fn().mockResolvedValue({ authUrl: "http://test", state: "s", appId: "a" }),
      getQrconnectUrl: jest.fn().mockResolvedValue({ qrconnectUrl: "http://qr", authUrl: "http://test" }),
      handleCallback: jest.fn().mockResolvedValue({ token: "t", user: {}, isNewUser: false }),
      getPublicConfig: jest.fn().mockResolvedValue({ platform: "wechat", appId: "a" }),
      getJssdkSignature: jest.fn().mockResolvedValue({ appId: "a", timestamp: 1, nonceStr: "n", signature: "s" }),
    };
    const pluginReturn = { service: jest.fn().mockReturnValue(authService) };
    strapi = {
      plugin: jest.fn().mockReturnValue(pluginReturn),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    };
    controller = require("../../server/src/controllers/third-party-auth").default({ strapi });
  });

  test("authUrl 读 siteDocumentId 而非 siteId 传给 service", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { platform: "wechat", appType: "official_account", redirectUrl: "http://r" } },
    };

    await controller.authUrl(ctx);

    expect(authService.getAuthUrl).toHaveBeenCalledWith(
      "wechat", "official_account", "http://r", "doc-abc", undefined
    );
  });

  test("qrconnectUrl 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { redirectUrl: "http://r" } },
    };

    await controller.qrconnectUrl(ctx);

    expect(authService.getQrconnectUrl).toHaveBeenCalledWith("http://r", "doc-abc");
  });

  test("callback 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { platform: "wechat", appType: "official_account", code: "c" } },
    };

    await controller.callback(ctx);

    expect(authService.handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "doc-abc" })
    );
  });

  test("publicConfig 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      params: { platform: "wechat", appType: "official_account" },
    };

    await controller.publicConfig(ctx);

    expect(authService.getPublicConfig).toHaveBeenCalledWith("wechat", "official_account", "doc-abc");
  });

  test("jssdkSignature 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { url: "http://test.com" } },
    };

    await controller.jssdkSignature(ctx);

    expect(authService.getJssdkSignature).toHaveBeenCalledWith("http://test.com", "doc-abc");
  });
});
