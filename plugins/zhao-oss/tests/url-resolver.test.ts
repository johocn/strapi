import urlResolverFactory from "../server/src/services/url-resolver";

const OSS_BARE = "https://joho.oss-cn-beijing.aliyuncs.com/uploads/2026/09/26/a.jpg";

const signUrl = jest.fn(
  (key: string) =>
    `https://joho.oss-cn-beijing.aliyuncs.com/${key}?OSSAccessKeyId=k&Expires=3600&Signature=sig`
);

function createStrapi(
  options: {
    record?: { fileId: number; status: string; remoteUrl?: string } | null;
    healthy?: boolean;
    enableUrlRewrite?: boolean;
  } = {}
) {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const strapi: any = {
    log: logger,
    config: {
      get: jest.fn().mockReturnValue({
        fallbackToLocal: true,
        enableUrlRewrite: options.enableUrlRewrite !== false,
      }),
    },
    db: {
      query: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue(options.record ?? null),
        findMany: jest.fn().mockResolvedValue(options.record ? [options.record] : []),
      })),
    },
  };

  strapi.plugin = jest.fn(() => ({
    service: jest.fn((name: string) =>
      name === "logger"
        ? logger
        : {
            getPrimaryProvider: () => ({ signUrl }),
            isPrimaryHealthy: jest.fn().mockResolvedValue(options.healthy !== false),
          }
    ),
  }));

  return strapi;
}

beforeEach(() => {
  signUrl.mockClear();
});

describe("url-resolver 读时签名", () => {
  it("有 OSS 记录时返回签名 URL", async () => {
    const strapi = createStrapi({
      record: { fileId: 1, status: "success", remoteUrl: OSS_BARE },
    });
    const resolver = urlResolverFactory({ strapi });

    const url = await resolver.resolveUrl({ id: 1, url: "/static/uploads/a.jpg" });

    expect(signUrl).toHaveBeenCalledWith("uploads/2026/09/26/a.jpg");
    expect(url).toContain("Signature=sig");
  });

  it("无记录时本地相对路径原样返回，不签名", async () => {
    const resolver = urlResolverFactory({ strapi: createStrapi() });

    await expect(resolver.resolveUrl({ id: 2, url: "/static/uploads/a.jpg" })).resolves.toBe(
      "/static/uploads/a.jpg"
    );
    expect(signUrl).not.toHaveBeenCalled();
  });

  it("无记录但 file.url 已是 OSS 裸地址时同样签名", async () => {
    const resolver = urlResolverFactory({ strapi: createStrapi() });

    const url = await resolver.resolveUrl({ id: 3, url: OSS_BARE });

    expect(url).toContain("Signature=sig");
  });

  it("resolveUrls 批量结果同样带签名，本地地址不受影响", async () => {
    const strapi = createStrapi({
      record: { fileId: 1, status: "success", remoteUrl: OSS_BARE },
    });
    const resolver = urlResolverFactory({ strapi });

    const result = await resolver.resolveUrls([
      { id: 1, url: "/static/uploads/a.jpg" },
      { id: 2, url: "/static/uploads/b.jpg" },
    ]);

    expect(result.get(1)).toContain("Signature=sig");
    expect(result.get(2)).toBe("/static/uploads/b.jpg");
  });
});