import lessonProgressFactory from "../server/src/controllers/lesson-progress";
import { createMockCtx } from "./helpers/mock-ctx";

function createControllerStrapi(serviceMethodMap: Record<string, Record<string, jest.Mock>>): any {
  const services: Record<string, any> = {};
  for (const [svcName, methods] of Object.entries(serviceMethodMap)) {
    services[svcName] = methods;
  }

  return {
    plugin: jest.fn().mockImplementation((name: string) => {
      if (name === "zhao-course") {
        return {
          service: jest.fn().mockImplementation((svcName: string) => services[svcName] || {}),
        };
      }
      return { service: jest.fn() };
    }),
    db: {
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    },
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  };
}

describe("lesson-progress controller", () => {
  let strapi: any;
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = {
      find: jest.fn().mockResolvedValue([{ id: 1, progress: 50 }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, progress: 50 }),
      create: jest.fn().mockResolvedValue({ id: 1, progress: 0 }),
      update: jest.fn().mockResolvedValue({ id: 1, progress: 80 }),
      delete: jest.fn().mockResolvedValue({ id: 1 }),
      reportProgress: jest.fn().mockResolvedValue({ id: 1, progress: 60, isCompleted: false }),
      submitAnswer: jest.fn().mockResolvedValue({ id: 1, isAnswered: true, isCorrect: true }),
      claimPoints: jest.fn().mockResolvedValue({ pointsEarned: 50, claimed: true }),
    };
    strapi = createControllerStrapi({ "lesson-progress": mockService });
    controller = lessonProgressFactory({ strapi });
  });

  describe("CRUD 基础操作", () => {
    it("find 应调用 service.find", async () => {
      const ctx = createMockCtx();
      await controller.find(ctx);
      expect(mockService.find).toHaveBeenCalled();
      expect(ctx.body).toEqual([{ id: 1, progress: 50 }]);
    });

    it("findOne 应调用 service.findOne", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });
      await controller.findOne(ctx);
      expect(mockService.findOne).toHaveBeenCalledWith("doc-1");
    });

    it("findOne 返回 null 时应 ctx.notFound", async () => {
      mockService.findOne.mockResolvedValue(null);
      const ctx = createMockCtx({ params: { documentId: "nonexistent" } });
      await controller.findOne(ctx);
      expect(ctx.notFound).toHaveBeenCalledWith("课时进度不存在");
    });

    it("create 应调用 service.create 并设置状态201", async () => {
      const ctx = createMockCtx({ request: { body: { user: 1, lesson: 1, course: 1 } } });
      await controller.create(ctx);
      expect(mockService.create).toHaveBeenCalledWith({ user: 1, lesson: 1, course: 1 });
      expect(ctx.status).toBe(201);
    });

    it("update 应调用 service.update", async () => {
      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        request: { body: { progress: 80 } },
      });
      await controller.update(ctx);
      expect(mockService.update).toHaveBeenCalledWith("doc-1", { progress: 80 });
    });

    it("delete 应调用 service.delete", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });
      await controller.delete(ctx);
      expect(mockService.delete).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("reportProgress", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.reportProgress", async () => {
      const mockLessonFindOne = jest.fn().mockResolvedValue({
        id: 1,
        course: { documentId: "course-doc-1" },
      });
      const mockCheckAuth = jest.fn().mockResolvedValue({ authorized: true });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockLessonFindOne });
      strapi.plugin = jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockImplementation((svc: string) => {
              if (svc === "lesson-progress") return mockService;
              if (svc === "user-course-auth") return { checkAuth: mockCheckAuth };
              return {};
            }),
          };
        }
        return { service: jest.fn() };
      });

      const ctx = createMockCtx({
        state: { user: { id: 42 } },
        request: {
          body: {
            lessonId: 1,
            lessonDocumentId: "lesson-doc-1",
            playPosition: 30,
            duration: 60,
            progress: 50,
          },
        },
      });

      await controller.reportProgress(ctx);

      expect(mockService.reportProgress).toHaveBeenCalledWith(42, {
        lessonId: 1,
        lessonDocumentId: "lesson-doc-1",
        playPosition: 30,
        duration: 60,
        progress: 50,
      });
      expect(ctx.body).toEqual({ id: 1, progress: 60, isCompleted: false });
    });

    it("缺少 lessonId 时应 ctx.throw 400", async () => {
      const ctx = createMockCtx({
        state: { user: { id: 1 } },
        request: { body: { lessonDocumentId: "nonexistent" } },
      });

      await expect(controller.reportProgress(ctx)).rejects.toThrow("缺少课时 ID");
    });

    it("课时不存在时应 ctx.throw 404", async () => {
      const mockLessonFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockLessonFindOne });

      const ctx = createMockCtx({
        state: { user: { id: 1 } },
        request: { body: { lessonId: 999 } },
      });

      await expect(controller.reportProgress(ctx)).rejects.toThrow("课时不存在");
    });

    it("未授权访问时应 ctx.throw 403", async () => {
      const mockLessonFindOne = jest.fn().mockResolvedValue({
        id: 1,
        course: { documentId: "course-doc-1" },
      });
      const mockCheckAuth = jest.fn().mockResolvedValue({ authorized: false });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockLessonFindOne });
      strapi.plugin = jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockImplementation((svc: string) => {
              if (svc === "lesson-progress") return mockService;
              if (svc === "user-course-auth") return { checkAuth: mockCheckAuth };
              return {};
            }),
          };
        }
        return { service: jest.fn() };
      });

      const ctx = createMockCtx({
        state: { user: { id: 1 } },
        request: { body: { lessonId: 1 } },
      });

      await expect(controller.reportProgress(ctx)).rejects.toThrow("未授权访问该课程");
    });
  });

  describe("submitAnswer", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.submitAnswer", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        lesson: { populate: { course: true } },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "lesson-doc-1" },
        state: { user: { id: 42 } },
        request: { body: { isCorrect: true } },
      });

      await controller.submitAnswer(ctx);

      expect(mockService.submitAnswer).toHaveBeenCalledWith(42, "lesson-doc-1", true);
      expect(ctx.body).toEqual({ id: 1, isAnswered: true, isCorrect: true });
    });

    it("答题错误时应正常调用 service", async () => {
      mockService.submitAnswer.mockResolvedValue({ id: 1, isAnswered: true, isCorrect: false });
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        lesson: { populate: { course: true } },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "lesson-doc-1" },
        state: { user: { id: 42 } },
        request: { body: { isCorrect: false } },
      });

      await controller.submitAnswer(ctx);

      expect(mockService.submitAnswer).toHaveBeenCalledWith(42, "lesson-doc-1", false);
    });

    it("缺少 documentId 时应 ctx.throw 400", async () => {
      const ctx = createMockCtx({
        params: {},
        state: { user: { id: 1 } },
        request: { body: { isCorrect: true } },
      });

      await expect(controller.submitAnswer(ctx)).rejects.toThrow("缺少课时进度 ID");
    });

    it("课时进度不存在时应 ctx.throw 404", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "nonexistent" },
        state: { user: { id: 1 } },
        request: { body: { isCorrect: true } },
      });

      await expect(controller.submitAnswer(ctx)).rejects.toThrow("课时进度不存在");
    });

    it("非本人进度应 ctx.throw 403", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 999 },
        lesson: { populate: { course: true } },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        state: { user: { id: 1 } },
        request: { body: { isCorrect: true } },
      });

      await expect(controller.submitAnswer(ctx)).rejects.toThrow("只能操作自己的课时进度");
    });
  });

  describe("claimPoints", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.claimPoints", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        lesson: { populate: { course: true } },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "lesson-doc-1" },
        state: { user: { id: 42 } },
      });

      await controller.claimPoints(ctx);

      expect(mockService.claimPoints).toHaveBeenCalledWith(42, "lesson-doc-1");
      expect(ctx.body).toEqual({ pointsEarned: 50, claimed: true });
    });

    it("缺少 documentId 时应 ctx.throw 400", async () => {
      const ctx = createMockCtx({
        params: {},
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("缺少课时进度 ID");
    });

    it("课时进度不存在时应 ctx.throw 404", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "nonexistent" },
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("课时进度不存在");
    });

    it("非本人进度应 ctx.throw 403", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 999 },
        lesson: { populate: { course: true } },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("只能领取自己的课时积分");
    });
  });
});
