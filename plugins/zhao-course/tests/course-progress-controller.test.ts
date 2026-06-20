import courseProgressFactory from "../server/src/controllers/course-progress";
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

describe("course-progress controller", () => {
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
      getUserProgresses: jest.fn().mockResolvedValue([{ id: 1, progress: 50 }]),
      claimPoints: jest.fn().mockResolvedValue({ pointsEarned: 100, claimed: true }),
    };
    strapi = createControllerStrapi({ "course-progress": mockService });
    controller = courseProgressFactory({ strapi });
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
      expect(ctx.notFound).toHaveBeenCalledWith("进度记录不存在");
    });

    it("create 应调用 service.create 并设置状态201", async () => {
      const ctx = createMockCtx({ request: { body: { user: 1, course: 1 } } });
      await controller.create(ctx);
      expect(mockService.create).toHaveBeenCalledWith({ user: 1, course: 1 });
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

  describe("myProgresses", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.getUserProgresses", async () => {
      const ctx = createMockCtx({ state: { user: { id: 42 } } });

      await controller.myProgresses(ctx);

      expect(mockService.getUserProgresses).toHaveBeenCalledWith(42);
      expect(ctx.body).toEqual([{ id: 1, progress: 50 }]);
    });

    it("service 抛出异常时应 ctx.throw(500)", async () => {
      mockService.getUserProgresses.mockRejectedValue(new Error("DB error"));
      const ctx = createMockCtx({ state: { user: { id: 1 } } });

      await expect(controller.myProgresses(ctx)).rejects.toThrow("DB error");
    });
  });

  describe("claimPoints", () => {
    it("应从 ctx.state.user 获取 userId 并调用 service.claimPoints", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        course: { documentId: "course-doc-1" },
      });
      const mockCheckAuth = jest.fn().mockResolvedValue({ authorized: true });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });
      strapi.plugin = jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockImplementation((svc: string) => {
              if (svc === "course-progress") return mockService;
              if (svc === "user-course-auth") return { checkAuth: mockCheckAuth };
              return {};
            }),
          };
        }
        return { service: jest.fn() };
      });

      const ctx = createMockCtx({
        params: { documentId: "course-doc-1" },
        state: { user: { id: 42 } },
      });

      await controller.claimPoints(ctx);

      expect(mockService.claimPoints).toHaveBeenCalledWith(42, "course-doc-1");
      expect(ctx.body).toEqual({ pointsEarned: 100, claimed: true });
    });

    it("缺少 documentId 时应 ctx.throw 400", async () => {
      const ctx = createMockCtx({
        params: {},
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("缺少课程进度 ID");
    });

    it("课程进度不存在时应 ctx.throw 404", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "nonexistent" },
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("课程进度不存在");
    });

    it("非本人进度应 ctx.throw 403", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 999 },
        course: { documentId: "course-doc-1" },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });

      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        state: { user: { id: 1 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("只能领取自己的课程积分");
    });

    it("未授权访问应 ctx.throw 403", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        course: { documentId: "course-doc-1" },
      });
      const mockCheckAuth = jest.fn().mockResolvedValue({ authorized: false });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });
      strapi.plugin = jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockImplementation((svc: string) => {
              if (svc === "course-progress") return mockService;
              if (svc === "user-course-auth") return { checkAuth: mockCheckAuth };
              return {};
            }),
          };
        }
        return { service: jest.fn() };
      });

      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        state: { user: { id: 42 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("未授权访问该课程");
    });

    it("service 抛出异常时应 ctx.throw", async () => {
      const mockProgressFindOne = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 42 },
        course: { documentId: "course-doc-1" },
      });
      const mockCheckAuth = jest.fn().mockResolvedValue({ authorized: true });
      mockService.claimPoints.mockRejectedValue(new Error("课程未启用积分"));

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockProgressFindOne });
      strapi.plugin = jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockImplementation((svc: string) => {
              if (svc === "course-progress") return mockService;
              if (svc === "user-course-auth") return { checkAuth: mockCheckAuth };
              return {};
            }),
          };
        }
        return { service: jest.fn() };
      });

      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        state: { user: { id: 42 } },
      });

      await expect(controller.claimPoints(ctx)).rejects.toThrow("课程未启用积分");
    });
  });
});
