/**
 * 用户课程授权 Controller 单元测试
 */
import userCourseAuthFactory from "../server/src/controllers/user-course-auth";
import { createMockCtx, createControllerStrapi } from "./helpers/mock-ctx";

describe("user-course-auth controller", () => {
  let strapi: any;
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = {
      find: jest.fn().mockResolvedValue([{ id: 1, authType: "free" }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, authType: "free" }),
      create: jest.fn().mockResolvedValue({ id: 1, authType: "free" }),
      update: jest.fn().mockResolvedValue({ id: 1, isExpired: true }),
      delete: jest.fn().mockResolvedValue({ id: 1 }),
      checkAuth: jest.fn().mockResolvedValue({ authorized: true }),
      getUserAuthCourses: jest.fn().mockResolvedValue([{ id: 1, course: { id: 10 } }]),
    };
    strapi = createControllerStrapi({ "user-course-auth": mockService });
    controller = userCourseAuthFactory({ strapi });
  });

  describe("CRUD 基础操作", () => {
    it("find 应调用 service.find 并设置 ctx.body", async () => {
      const ctx = createMockCtx();
      await controller.find(ctx);
      expect(mockService.find).toHaveBeenCalled();
      expect(ctx.body).toEqual([{ id: 1, authType: "free" }]);
    });

    it("findOne 应调用 service.findOne", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });
      await controller.findOne(ctx);
      expect(mockService.findOne).toHaveBeenCalledWith("doc-1");
      expect(ctx.body).toEqual({ id: 1, authType: "free" });
    });

    it("findOne 返回 null 时应 ctx.notFound", async () => {
      mockService.findOne.mockResolvedValue(null);
      const ctx = createMockCtx({ params: { documentId: "nonexistent" } });
      await controller.findOne(ctx);
      expect(ctx.notFound).toHaveBeenCalledWith("授权记录不存在");
    });

    it("create 应调用 service.create 并设置状态201", async () => {
      const ctx = createMockCtx({ request: { body: { authType: "free" } } });
      await controller.create(ctx);
      expect(mockService.create).toHaveBeenCalledWith({ authType: "free" });
      expect(ctx.status).toBe(201);
    });

    it("update 应调用 service.update", async () => {
      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        request: { body: { isExpired: true } },
      });
      await controller.update(ctx);
      expect(mockService.update).toHaveBeenCalledWith("doc-1", { isExpired: true });
    });

    it("delete 应调用 service.delete", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });
      await controller.delete(ctx);
      expect(mockService.delete).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("checkAuth", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.checkAuth", async () => {
      const ctx = createMockCtx({
        params: { courseDocumentId: "course-doc-1" },
        state: { user: { id: 42 } },
      });

      await controller.checkAuth(ctx);

      expect(mockService.checkAuth).toHaveBeenCalledWith(42, "course-doc-1");
      expect(ctx.body).toEqual({ authorized: true });
    });

    it("service 抛出异常时应 ctx.throw", async () => {
      mockService.checkAuth.mockRejectedValue(new Error("课程不存在"));
      const ctx = createMockCtx({
        params: { courseDocumentId: "nonexistent" },
        state: { user: { id: 1 } },
      });

      await expect(controller.checkAuth(ctx)).rejects.toThrow("课程不存在");
    });
  });

  describe("myCourses", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.getUserAuthCourses", async () => {
      const ctx = createMockCtx({ state: { user: { id: 42 } } });

      await controller.myCourses(ctx);

      expect(mockService.getUserAuthCourses).toHaveBeenCalledWith(42);
      expect(ctx.body).toEqual([{ id: 1, course: { id: 10 } }]);
    });

    it("service 抛出异常时应 ctx.throw(500)", async () => {
      mockService.getUserAuthCourses.mockRejectedValue(new Error("DB error"));
      const ctx = createMockCtx({ state: { user: { id: 1 } } });

      await expect(controller.myCourses(ctx)).rejects.toThrow("DB error");
    });
  });
});
