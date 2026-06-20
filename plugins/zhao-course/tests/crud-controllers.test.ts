import courseCategoryFactory from "../server/src/controllers/course-category";
import courseTagFactory from "../server/src/controllers/course-tag";
import courseFactory from "../server/src/controllers/course";
import knowledgePointFactory from "../server/src/controllers/knowledge-point";
import courseLessonFactory from "../server/src/controllers/course-lesson";
import { createMockCtx, createControllerStrapi } from "./helpers/mock-ctx";

interface TestCase {
  name: string;
  factory: Function;
  serviceName: string;
  notFoundMsg: string;
}

const simpleTestCases: TestCase[] = [
  { name: "course-category", factory: courseCategoryFactory, serviceName: "course-category", notFoundMsg: "分类不存在" },
  { name: "course-tag", factory: courseTagFactory, serviceName: "course-tag", notFoundMsg: "标签不存在" },
  { name: "knowledge-point", factory: knowledgePointFactory, serviceName: "knowledge-point", notFoundMsg: "知识点不存在" },
  { name: "course-lesson", factory: courseLessonFactory, serviceName: "course-lesson", notFoundMsg: "课时不存在" },
];

for (const tc of simpleTestCases) {
  describe(`${tc.name} controller`, () => {
    let strapi: any;
    let controller: any;
    let mockService: Record<string, jest.Mock>;

    beforeEach(() => {
      mockService = {
        find: jest.fn().mockResolvedValue([{ id: 1 }]),
        findOne: jest.fn().mockResolvedValue({ id: 1, title: "测试" }),
        create: jest.fn().mockResolvedValue({ id: 1, title: "新建" }),
        update: jest.fn().mockResolvedValue({ id: 1, title: "更新" }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
      };
      strapi = createControllerStrapi({ [tc.serviceName]: mockService });
      controller = tc.factory({ strapi });
    });

    describe("find", () => {
      it("应调用 service.find 并设置 ctx.body", async () => {
        const ctx = createMockCtx({ query: { pagination: { page: 1 } } });

        await controller.find(ctx);

        expect(mockService.find).toHaveBeenCalledWith(ctx.query);
        expect(ctx.body).toEqual([{ id: 1 }]);
      });
    });

    describe("findOne", () => {
      it("应调用 service.findOne 并设置 ctx.body", async () => {
        const ctx = createMockCtx({ params: { documentId: "doc-1" } });

        await controller.findOne(ctx);

        expect(mockService.findOne).toHaveBeenCalledWith("doc-1");
        expect(ctx.body).toEqual({ id: 1, title: "测试" });
      });

      it("service 返回 null 时应调用 ctx.notFound", async () => {
        mockService.findOne.mockResolvedValue(null);
        const ctx = createMockCtx({ params: { documentId: "nonexistent" } });

        await controller.findOne(ctx);

        expect(ctx.notFound).toHaveBeenCalledWith(tc.notFoundMsg);
      });
    });

    describe("create", () => {
      it("应调用 service.create 设置状态201和body", async () => {
        const ctx = createMockCtx({ request: { body: { title: "新建" } } });

        await controller.create(ctx);

        expect(mockService.create).toHaveBeenCalledWith({ title: "新建" });
        expect(ctx.status).toBe(201);
        expect(ctx.body).toEqual({ id: 1, title: "新建" });
      });
    });

    describe("update", () => {
      it("应调用 service.update 并设置 ctx.body", async () => {
        const ctx = createMockCtx({
          params: { documentId: "doc-1" },
          request: { body: { title: "更新" } },
        });

        await controller.update(ctx);

        expect(mockService.update).toHaveBeenCalledWith("doc-1", { title: "更新" });
        expect(ctx.body).toEqual({ id: 1, title: "更新" });
      });
    });

    describe("delete", () => {
      it("应调用 service.delete 并设置 ctx.body", async () => {
        const ctx = createMockCtx({ params: { documentId: "doc-1" } });

        await controller.delete(ctx);

        expect(mockService.delete).toHaveBeenCalledWith("doc-1");
        expect(ctx.body).toEqual({ id: 1 });
      });
    });

    describe("异常处理", () => {
      it("find 抛出异常时应 ctx.throw(500)", async () => {
        mockService.find.mockRejectedValue(new Error("DB error"));
        const ctx = createMockCtx();

        await expect(controller.find(ctx)).rejects.toThrow("DB error");
      });

      it("create 抛出异常时应 ctx.throw(400)", async () => {
        mockService.create.mockRejectedValue(new Error("Validation error"));
        const ctx = createMockCtx({ request: { body: { title: "测试" } } });

        await expect(controller.create(ctx)).rejects.toThrow("Validation error");
      });
    });
  });
}

describe("course controller", () => {
  let strapi: any;
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = {
      find: jest.fn().mockResolvedValue([{ id: 1 }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, title: "测试" }),
      create: jest.fn().mockResolvedValue({ id: 1, title: "新建" }),
      update: jest.fn().mockResolvedValue({ id: 1, title: "更新" }),
      delete: jest.fn().mockResolvedValue({ id: 1 }),
    };
    strapi = createControllerStrapi({ course: mockService });
    controller = courseFactory({ strapi });
  });

  describe("find", () => {
    it("应调用 service.find 并传递 publicOnly 参数", async () => {
      const ctx = createMockCtx({ query: { pagination: { page: 1 } }, path: "/api/zhao-course/v1/admin/courses" });

      await controller.find(ctx);

      expect(mockService.find).toHaveBeenCalledWith(ctx.query, false);
      expect(ctx.body).toEqual([{ id: 1 }]);
    });
  });

  describe("findOne", () => {
    it("应调用 service.findOne 并传递 publicOnly 参数", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" }, path: "/api/zhao-course/v1/admin/courses/doc-1" });

      await controller.findOne(ctx);

      expect(mockService.findOne).toHaveBeenCalledWith("doc-1", false);
      expect(ctx.body).toEqual({ id: 1, title: "测试" });
    });

    it("service 返回 null 时应调用 ctx.notFound", async () => {
      mockService.findOne.mockResolvedValue(null);
      const ctx = createMockCtx({ params: { documentId: "nonexistent" } });

      await controller.findOne(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith("课程不存在");
    });
  });

  describe("create", () => {
    it("应校验 title 并调用 service.create", async () => {
      const ctx = createMockCtx({ request: { body: { title: "新建课程" } } });

      await controller.create(ctx);

      expect(mockService.create).toHaveBeenCalledWith({ title: "新建课程" });
      expect(ctx.status).toBe(201);
      expect(ctx.body).toEqual({ id: 1, title: "新建" });
    });

    it("缺少 title 时应 ctx.throw(400)", async () => {
      const ctx = createMockCtx({ request: { body: {} } });

      await expect(controller.create(ctx)).rejects.toThrow("缺少课程标题");
    });

    it("title 为空字符串时应 ctx.throw(400)", async () => {
      const ctx = createMockCtx({ request: { body: { title: "   " } } });

      await expect(controller.create(ctx)).rejects.toThrow("课程标题必须是有效的字符串");
    });
  });

  describe("update", () => {
    it("应调用 service.update 并设置 ctx.body", async () => {
      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        request: { body: { title: "更新" } },
      });

      await controller.update(ctx);

      expect(mockService.update).toHaveBeenCalledWith("doc-1", { title: "更新" });
      expect(ctx.body).toEqual({ id: 1, title: "更新" });
    });
  });

  describe("delete", () => {
    it("应调用 service.delete 并设置 ctx.body", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });

      await controller.delete(ctx);

      expect(mockService.delete).toHaveBeenCalledWith("doc-1");
      expect(ctx.body).toEqual({ id: 1 });
    });
  });

  describe("异常处理", () => {
    it("find 抛出异常时应 ctx.throw(500)", async () => {
      mockService.find.mockRejectedValue(new Error("DB error"));
      const ctx = createMockCtx();

      await expect(controller.find(ctx)).rejects.toThrow("DB error");
    });

    it("create 抛出异常时应 ctx.throw(400)", async () => {
      mockService.create.mockRejectedValue(new Error("Validation error"));
      const ctx = createMockCtx({ request: { body: { title: "测试" } } });

      await expect(controller.create(ctx)).rejects.toThrow("Validation error");
    });
  });
});
