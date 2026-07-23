describe("third-party-auth service getAuthUrl state 参数", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    const fakeConfig = { appId: "wx123", appSecret: "secret" };
    const configService = {
      findByPlatformAndAppType: jest.fn().mockResolvedValue(fakeConfig),
    };
    const pluginReturn = {
      service: jest.fn().mockImplementation((svcName: string) => {
        if (svcName === "third-party-config") return configService;
        return {};
      }),
      config: jest.fn().mockReturnValue({
        wechat: {
          official_account: { authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize" },
          open_platform: { authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect" },
        },
        douyin: {
          official_account: { authorizeUrl: "https://open.douyin.com/platform/oauth/connect/" },
        },
      }),
    };
    strapi = {
      plugin: jest.fn().mockReturnValue(pluginReturn),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    };
    service = require("../../server/src/services/third-party-auth").default({ strapi });
  });

  test("前端传 state → 透传给微信 authorizeUrl", async () => {
    const result = await service.getAuthUrl("wechat", "official_account", "http://redirect", undefined, "my-source-path");

    expect(result.state).toBe("my-source-path");
    expect(result.authUrl).toContain("state=my-source-path");
  });

  test("前端不传 state → 用随机值兜底", async () => {
    const result = await service.getAuthUrl("wechat", "official_account", "http://redirect", undefined, undefined);

    expect(result.state).toBeTruthy();
    expect(result.state).not.toBe("my-source-path");
    expect(result.state.length).toBeGreaterThan(5);
    expect(result.authUrl).toContain(`state=${result.state}`);
  });

  test("douyin 平台也支持 state 透传", async () => {
    const result = await service.getAuthUrl("douyin", "official_account", "http://redirect", undefined, "douyin-state");

    expect(result.state).toBe("douyin-state");
    expect(result.authUrl).toContain("state=douyin-state");
  });
});
