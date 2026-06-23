import { AliyunOssProvider } from "../server/src/services/providers/aliyun";

describe("AliyunOssProvider", () => {
  describe("initialize", () => {
    it("should throw clear error when required options are missing", async () => {
      const provider = new AliyunOssProvider();

      // 空配置
      await expect(provider.initialize({})).rejects.toThrow(
        /missing required/i
      );
    });

    it("should throw clear error when region is missing", async () => {
      const provider = new AliyunOssProvider();

      await expect(
        provider.initialize({
          accessKeyId: "test-key",
          accessKeySecret: "test-secret",
          bucket: "test-bucket",
        })
      ).rejects.toThrow(/region/i);
    });

    it("should throw clear error when accessKeyId is missing", async () => {
      const provider = new AliyunOssProvider();

      await expect(
        provider.initialize({
          region: "oss-cn-hangzhou",
          accessKeySecret: "test-secret",
          bucket: "test-bucket",
        })
      ).rejects.toThrow(/accessKeyId/i);
    });

    it("should throw clear error when bucket is missing", async () => {
      const provider = new AliyunOssProvider();

      await expect(
        provider.initialize({
          region: "oss-cn-hangzhou",
          accessKeyId: "test-key",
          accessKeySecret: "test-secret",
        })
      ).rejects.toThrow(/bucket/i);
    });
  });
});
