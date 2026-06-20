/**
 * Course Service 发布流程测试
 * 验证 find(publicOnly) 正确使用 Strapi D&P status 参数
 * 验证 publish 方法先更新自定义字段再调用 Strapi Document Service 的 publish
 */
import courseFactory from "../server/src/services/course";
import { createMockStrapi } from "./helpers/mock-strapi";

const UID = "plugin::zhao-course.course";

describe("course service 发布流程", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = courseFactory({ strapi });
  });

  describe("find", () => {
    it("publicOnly=true 时应传 status:'published'", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({}, true);

      expect(strapi.documents).toHaveBeenCalledWith(UID);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: "published" })
      );
    });

    it("publicOnly=false 时应传 status:'draft'", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({}, false);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft" })
      );
    });

    it("不应将非法 query 参数展开到 findMany", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({ isPublished: "true" }, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("isPublished");
    });

    it("publicOnly=true 时不应过滤自定义 status 字段（由 Strapi D&P status 保证）", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({}, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      // 自定义 status 字段不应出现在 filters 中，避免管理端发布但自定义 status 未更新的文档被过滤
      expect(callArgs.filters?.status).toBeUndefined();
    });

    it("publicOnly=false 时不应过滤自定义 status 字段", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({}, false);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.filters?.status).toBeUndefined();
    });

    it("应保留 query.filters 中的用户过滤条件", async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      await service.find({ filters: { difficulty: "advanced" } }, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.filters).toEqual(
        expect.objectContaining({ difficulty: "advanced" })
      );
    });
  });

  describe("publish", () => {
    it("应先更新自定义字段再调用 documents().publish()", async () => {
      const callOrder: string[] = [];
      const mockUpdate = jest.fn().mockImplementation(() => {
        callOrder.push("update");
        return Promise.resolve({ documentId: "doc-1", status: "published" });
      });
      const mockPublish = jest.fn().mockImplementation(() => {
        callOrder.push("publish");
        return Promise.resolve({ documentId: "doc-1", publishedAt: "2026-01-01T00:00:00.000Z" });
      });
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate, publish: mockPublish });

      await service.publish("doc-1");

      // update 必须在 publish 之前调用，确保 published 快照包含更新后的自定义字段
      expect(callOrder).toEqual(["update", "publish"]);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "doc-1",
          data: expect.objectContaining({ status: "published" }),
        })
      );
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-1" })
      );
    });

    it("应设置 publishDate 为当前时间（若未提供）", async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ documentId: "doc-1" });
      const mockPublish = jest.fn().mockResolvedValue({ documentId: "doc-1" });
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate, publish: mockPublish });

      await service.publish("doc-1");

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.publishDate).toBeDefined();
      // 应为 ISO 日期字符串
      expect(new Date(updateData.publishDate).toISOString()).toBe(updateData.publishDate);
    });
  });

  describe("create", () => {
    it("data.status 为 published 时应自动调用 publish", async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        status: "published",
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        status: "published",
      });
      const mockPublish = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        publishedAt: "2026-01-01T00:00:00.000Z",
      });
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate, update: mockUpdate, publish: mockPublish });

      await service.create({ title: "测试课程", status: "published" });

      expect(mockCreate).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-new" })
      );
    });

    it("data.status 非 published 时不应调用 publish", async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        status: "draft",
      });
      const mockPublish = jest.fn().mockResolvedValue({});
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate, publish: mockPublish });

      await service.create({ title: "测试课程", status: "draft" });

      expect(mockCreate).toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("data 无 status 时不应调用 publish", async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
      });
      const mockPublish = jest.fn().mockResolvedValue({});
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate, publish: mockPublish });

      await service.create({ title: "测试课程" });

      expect(mockCreate).toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("方法解构调用时（模拟 Strapi 插件加载）仍应正确调用 publish", async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        status: "published",
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        status: "published",
      });
      const mockPublish = jest.fn().mockResolvedValue({
        documentId: "doc-new",
        publishedAt: "2026-01-01T00:00:00.000Z",
        publishDate: "2026-01-01T00:00:00.000Z",
      });
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate, update: mockUpdate, publish: mockPublish });

      // 模拟 Strapi 插件系统解构 service 方法，导致 this 上下文丢失
      const serviceObj = courseFactory({ strapi });
      const createFn = serviceObj.create;
      await createFn({ title: "测试课程", status: "published" });

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-new" })
      );
    });
  });

  describe("update", () => {
    it("data.status 为 published 时应自动调用 publish", async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        documentId: "doc-1",
        status: "published",
      });
      const mockPublish = jest.fn().mockResolvedValue({
        documentId: "doc-1",
        publishedAt: "2026-01-01T00:00:00.000Z",
      });
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate, publish: mockPublish });

      await service.update("doc-1", { title: "更新课程", status: "published" });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-1" })
      );
    });

    it("data.status 非 published 时不应调用 publish", async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        documentId: "doc-1",
        status: "draft",
      });
      const mockPublish = jest.fn().mockResolvedValue({});
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate, publish: mockPublish });

      await service.update("doc-1", { title: "更新课程", status: "draft" });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("data 无 status 时不应调用 publish", async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        documentId: "doc-1",
      });
      const mockPublish = jest.fn().mockResolvedValue({});
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate, publish: mockPublish });

      await service.update("doc-1", { title: "更新课程" });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });
});
