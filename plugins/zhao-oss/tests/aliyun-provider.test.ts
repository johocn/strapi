jest.mock("ali-oss", () => ({ __esModule: true, default: jest.fn() }));

import OSS from "ali-oss";
import { AliyunOssProvider } from "../server/src/services/providers/aliyun";

const MockOSS = OSS as unknown as jest.Mock;

interface FakeClient {
  put: jest.Mock;
  delete: jest.Mock;
  list: jest.Mock;
  signatureUrl: jest.Mock;
  getStream: jest.Mock;
}

let fakeClient: FakeClient;

const baseOptions = {
  region: "oss-cn-hangzhou",
  accessKeyId: "test-key",
  accessKeySecret: "test-secret",
  bucket: "test-bucket",
};

beforeEach(() => {
  fakeClient = {
    put: jest.fn().mockResolvedValue({ res: { headers: { etag: "etag-1" } } }),
    delete: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({ objects: [] }),
    signatureUrl: jest.fn(
      (key: string, opts: { expires: number }) =>
        `https://test-bucket.oss-cn-hangzhou.aliyuncs.com/${key}?Expires=${opts.expires}&Signature=sig`
    ),
    getStream: jest.fn().mockResolvedValue({
      stream: { pipe: jest.fn() },
      res: { status: 200, size: 12, headers: { "content-type": "image/png" } },
    }),
  };
  MockOSS.mockImplementation(() => fakeClient);
});

describe("AliyunOssProvider", () => {
  describe("initialize", () => {
    it("将必填项映射给 new OSS(config)，secure 缺省为 true", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      // 两个 client：读写用（可带内网 endpoint）+ 出签用（必须公网）
      expect(MockOSS).toHaveBeenCalledTimes(2);
      const config = MockOSS.mock.calls[0][0];
      expect(config).toMatchObject({
        region: "oss-cn-hangzhou",
        accessKeyId: "test-key",
        accessKeySecret: "test-secret",
        bucket: "test-bucket",
        secure: true,
      });
      // 未传 cname/internalEndpoint 时不设置 endpoint/cname
      expect(config.endpoint).toBeUndefined();
      expect(config.cname).toBeUndefined();
    });

    it("显式 secure:false 时 config.secure 为 false", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions, secure: false });

      expect(MockOSS.mock.calls[0][0].secure).toBe(false);
    });

    it("传 cname 时 config.endpoint === cname 且 config.cname === true", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions, cname: "cdn.example.com" });

      const config = MockOSS.mock.calls[0][0];
      expect(config.endpoint).toBe("cdn.example.com");
      expect(config.cname).toBe(true);
    });

    it("传 internalEndpoint 时 config.endpoint === internalEndpoint", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({
        ...baseOptions,
        internalEndpoint: "oss-cn-hangzhou-internal.aliyuncs.com",
      });

      const config = MockOSS.mock.calls[0][0];
      expect(config.endpoint).toBe("oss-cn-hangzhou-internal.aliyuncs.com");
      expect(config.cname).toBeUndefined();
    });
  });

  describe("getUrl", () => {
    it("无 cname 时使用 bucket 默认域名，secure 决定协议", async () => {
      const httpsProvider = new AliyunOssProvider();
      await httpsProvider.initialize({ ...baseOptions });
      expect(httpsProvider.getUrl("a/b.jpg")).toBe(
        "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/a/b.jpg"
      );

      const httpProvider = new AliyunOssProvider();
      await httpProvider.initialize({ ...baseOptions, secure: false });
      expect(httpProvider.getUrl("a/b.jpg")).toBe(
        "http://test-bucket.oss-cn-hangzhou.aliyuncs.com/a/b.jpg"
      );
    });

    it("有 cname 时使用自定义域名，secure:false 时为 http", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions, cname: "cdn.example.com" });
      expect(provider.getUrl("a.jpg")).toBe("https://cdn.example.com/a.jpg");

      const insecure = new AliyunOssProvider();
      await insecure.initialize({ ...baseOptions, cname: "cdn.example.com", secure: false });
      expect(insecure.getUrl("a.jpg")).toBe("http://cdn.example.com/a.jpg");
    });
  });

  describe("signUrl", () => {
    it("用签名 client 出签，key 去前导斜杠，默认 3600 秒", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      const url = provider.signUrl("/uploads/2026/09/26/a.jpg");

      expect(fakeClient.signatureUrl).toHaveBeenCalledWith("uploads/2026/09/26/a.jpg", {
        expires: 3600,
      });
      expect(url).toContain("Expires=3600");
    });

    it("支持 signedUrlExpires 配置与调用时覆盖", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions, signedUrlExpires: 120 });
      provider.signUrl("a.jpg");
      expect(fakeClient.signatureUrl).toHaveBeenLastCalledWith("a.jpg", { expires: 120 });

      provider.signUrl("a.jpg", 60);
      expect(fakeClient.signatureUrl).toHaveBeenLastCalledWith("a.jpg", { expires: 60 });
    });

    it("签名 client 不带 internalEndpoint，避免签出内网域名", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({
        ...baseOptions,
        internalEndpoint: "oss-cn-hangzhou-internal.aliyuncs.com",
      });

      expect(MockOSS.mock.calls[0][0].endpoint).toBe("oss-cn-hangzhou-internal.aliyuncs.com");
      expect(MockOSS.mock.calls[1][0].endpoint).toBeUndefined();
    });

    it("未 initialize 就调用 signUrl 抛出未初始化错误", () => {
      const provider = new AliyunOssProvider();
      expect(() => provider.signUrl("a.jpg")).toThrow(
        "Aliyun OSS provider not initialized. Call initialize() first."
      );
    });
  });

  describe("getObjectStream", () => {
    it("委托读写 client 的 getStream，key 去前导斜杠，透出响应头与大小", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({
        ...baseOptions,
        internalEndpoint: "oss-cn-hangzhou-internal.aliyuncs.com",
      });

      const result = await provider.getObjectStream("/share/poster/a.png");

      expect(fakeClient.getStream).toHaveBeenCalledWith("share/poster/a.png");
      expect(result.headers["content-type"]).toBe("image/png");
      expect(result.size).toBe(12);
      expect(result.stream).toBeDefined();
    });

    it("res 缺失时 headers 为空对象", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      fakeClient.getStream.mockResolvedValueOnce({ stream: { pipe: jest.fn() }, res: undefined });

      const result = await provider.getObjectStream("share/a.png");
      expect(result.headers).toEqual({});
      expect(result.size).toBeUndefined();
    });

    it("未 initialize 就调用抛出未初始化错误", async () => {
      const provider = new AliyunOssProvider();
      await expect(provider.getObjectStream("share/a.png")).rejects.toThrow(
        "Aliyun OSS provider not initialized. Call initialize() first."
      );
    });
  });

  describe("upload", () => {
    it("默认 basePath 为 uploads，透传 mime/Cache-Control，返回 URL 与 etag", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      const result = await provider.upload({
        buffer: Buffer.from("data"),
        filename: "photo.JPG",
        mimeType: "image/jpeg",
        fileSize: 4,
      });

      expect(fakeClient.put).toHaveBeenCalledTimes(1);
      const [key, buffer, opts] = fakeClient.put.mock.calls[0];
      expect(key).toMatch(/^uploads\/\d{4}\/\d{2}\/\d{2}\/\d+-[0-9a-f]{8}\.jpg$/);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(opts.mime).toBe("image/jpeg");
      expect(opts.headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");

      expect(result).toEqual({
        key,
        url: `https://test-bucket.oss-cn-hangzhou.aliyuncs.com/${key}`,
        etag: "etag-1",
        provider: "aliyun",
      });
    });

    it("尊重自定义 basePath 前缀", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions, basePath: "media" });

      await provider.upload({
        buffer: Buffer.from("x"),
        filename: "a.png",
        mimeType: "image/png",
        fileSize: 1,
      });

      expect(fakeClient.put.mock.calls[0][0].startsWith("media/")).toBe(true);
    });

    it("未 initialize 就调用 upload 抛出未初始化错误", async () => {
      const provider = new AliyunOssProvider();

      await expect(
        provider.upload({
          buffer: Buffer.from("x"),
          filename: "a.png",
          mimeType: "image/png",
          fileSize: 1,
        })
      ).rejects.toThrow("Aliyun OSS provider not initialized. Call initialize() first.");
    });
  });

  describe("delete", () => {
    it("委托 client.delete 并传入 key", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      await provider.delete("uploads/2024/01/01/x.jpg");

      expect(fakeClient.delete).toHaveBeenCalledWith("uploads/2024/01/01/x.jpg");
    });

    it("未 initialize 就调用 delete 抛出未初始化错误", async () => {
      const provider = new AliyunOssProvider();

      await expect(provider.delete("a.jpg")).rejects.toThrow(
        "Aliyun OSS provider not initialized. Call initialize() first."
      );
    });
  });

  describe("checkHealth", () => {
    it("client.list 正常时返回 true", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      fakeClient.list.mockResolvedValueOnce({ objects: [] });
      await expect(provider.checkHealth()).resolves.toBe(true);
    });

    it("client.list 抛错时返回 false", async () => {
      const provider = new AliyunOssProvider();
      await provider.initialize({ ...baseOptions });

      fakeClient.list.mockRejectedValueOnce(new Error("network error"));
      await expect(provider.checkHealth()).resolves.toBe(false);
    });

    it("未 initialize 时返回 false", async () => {
      const provider = new AliyunOssProvider();

      await expect(provider.checkHealth()).resolves.toBe(false);
    });
  });
});