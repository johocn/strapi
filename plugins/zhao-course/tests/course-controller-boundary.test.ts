import courseControllerFactory from "../server/src/controllers/course";

function createMockStrapi() {
  const mockCourseService = {
    find: jest.fn().mockResolvedValue([{ id: 1 }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, title: "测试课程" }),
    create: jest.fn().mockResolvedValue({ id: 1, title: "新课程" }),
    update: jest.fn().mockResolvedValue({ id: 1, title: "更新课程" }),
    delete: jest.fn().mockResolvedValue({ id: 1 }),
    publish: jest.fn().mockResolvedValue({ id: 1, status: "published" }),
  };

  return {
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue(mockCourseService),
    }),
    mockCourseService,
  } as any;
}

function createMockCtx(overrides: any = {}) {
  const body: any = {};
  const ctx: any = {
    params: {},
    query: {},
    request: { body },
    state: { user: { id: 1 } },
    _matchedRoute: "/admin/api/course",
    body: undefined,
    status: 200,
    throw: (status: number, msg: any) => {
      const err: any = new Error(typeof msg === "string" ? msg : String(msg));
      err.status = status;
      throw err;
    },
    notFound: (msg: string) => {
      ctx.body = { error: msg };
    },
    badRequest: (msg: string) => {
      ctx.body = { error: msg };
    },
    send: (data: any) => {
      ctx.body = data;
    },
    ...overrides,
  };
  return ctx;
}

describe("course controller - boundary tests", () => {
  let strapi: any;
  let controller: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    controller = courseControllerFactory({ strapi });
  });

  describe("create", () => {
    it("data 为 JSON 字符串时应正确解析", async () => {
      const ctx = createMockCtx({
        request: { body: JSON.stringify({ title: "解析课程", enrollStartDate: "2025-01-01" }) },
      });
      await controller.create(ctx);
      expect(strapi.mockCourseService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "解析课程" })
      );
    });

    it("data 为无效 JSON 字符串时应抛出 400", async () => {
      const ctx = createMockCtx({
        request: { body: "{invalid json" },
      });
      await expect(controller.create(ctx)).rejects.toThrow("无效的 JSON 数据");
    });

    it("缺少 title 时应抛出 400", async () => {
      const ctx = createMockCtx({
        request: { body: { description: "无标题课程" } },
      });
      await expect(controller.create(ctx)).rejects.toThrow("缺少课程标题");
    });

    it("title 为空字符串时应抛出 400", async () => {
      const ctx = createMockCtx({
        request: { body: { title: "   " } },
      });
      await expect(controller.create(ctx)).rejects.toThrow("课程标题必须是有效的字符串");
    });

    it("title 为非字符串时应抛出 400", async () => {
      const ctx = createMockCtx({
        request: { body: { title: 123 } },
      });
      await expect(controller.create(ctx)).rejects.toThrow("课程标题必须是有效的字符串");
    });

    it("日期字段为空字符串时应删除", async () => {
      const ctx = createMockCtx({
        request: { body: { title: "测试", enrollStartDate: "", courseEndDate: null, publishDate: undefined } },
      });
      await controller.create(ctx);
      const callData = strapi.mockCourseService.create.mock.calls[0][0];
      expect(callData.enrollStartDate).toBeUndefined();
      expect(callData.courseEndDate).toBeUndefined();
      expect(callData.publishDate).toBeUndefined();
    });

    it("日期字段有值时应保留", async () => {
      const ctx = createMockCtx({
        request: { body: { title: "测试", enrollStartDate: "2025-06-01" } },
      });
      await controller.create(ctx);
      const callData = strapi.mockCourseService.create.mock.calls[0][0];
      expect(callData.enrollStartDate).toBe("2025-06-01");
    });

    it("data 在 body.data 中时应使用 body.data", async () => {
      const ctx = createMockCtx({
        request: { body: { data: { title: "嵌套数据" } } },
      });
      await controller.create(ctx);
      expect(strapi.mockCourseService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "嵌套数据" })
      );
    });

    it("成功创建时 status 应为 201", async () => {
      const ctx = createMockCtx({
        request: { body: { title: "新课程" } },
      });
      await controller.create(ctx);
      expect(ctx.status).toBe(201);
    });
  });

  describe("update", () => {
    it("缺少 documentId 时应抛出 400", async () => {
      const ctx = createMockCtx({ params: {} });
      await expect(controller.update(ctx)).rejects.toThrow("缺少课程 ID");
    });

    it("data 为 JSON 字符串时应正确解析", async () => {
      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        request: { body: JSON.stringify({ title: "更新标题" }) },
      });
      await controller.update(ctx);
      expect(strapi.mockCourseService.update).toHaveBeenCalledWith("doc-1", expect.objectContaining({ title: "更新标题" }));
    });

    it("日期字段为空字符串时应删除", async () => {
      const ctx = createMockCtx({
        params: { documentId: "doc-1" },
        request: { body: { title: "测试", enrollStartDate: "" } },
      });
      await controller.update(ctx);
      const callData = strapi.mockCourseService.update.mock.calls[0][1];
      expect(callData.enrollStartDate).toBeUndefined();
    });
  });

  describe("findOne", () => {
    it("缺少 documentId 时应抛出 400", async () => {
      const ctx = createMockCtx({ params: {} });
      await expect(controller.findOne(ctx)).rejects.toThrow("缺少课程 ID");
    });

    it("课程不存在时应返回 notFound", async () => {
      strapi.mockCourseService.findOne.mockResolvedValueOnce(null);
      const ctx = createMockCtx({ params: { documentId: "nonexistent" } });
      await controller.findOne(ctx);
      expect(ctx.body).toEqual({ error: "课程不存在" });
    });
  });

  describe("delete", () => {
    it("缺少 documentId 时应抛出 400", async () => {
      const ctx = createMockCtx({ params: {} });
      await expect(controller.delete(ctx)).rejects.toThrow("缺少课程 ID");
    });
  });

  describe("publish", () => {
    it("缺少 documentId 时应抛出 400", async () => {
      const ctx = createMockCtx({ params: {} });
      await expect(controller.publish(ctx)).rejects.toThrow("缺少课程ID");
    });

    it("应调用 courseService.publish 发布课程", async () => {
      const ctx = createMockCtx({ params: { documentId: "doc-1" } });
      await controller.publish(ctx);
      expect(strapi.mockCourseService.publish).toHaveBeenCalledWith("doc-1");
    });
  });

  describe("find", () => {
    it("公开 API 路由应传 publicOnly=true", async () => {
      const ctx = createMockCtx({ path: "/api/zhao-course/v1/courses" });
      await controller.find(ctx);
      expect(strapi.mockCourseService.find).toHaveBeenCalledWith(ctx.query, true);
    });

    it("管理端路由应传 publicOnly=false", async () => {
      const ctx = createMockCtx({ path: "/api/zhao-course/v1/admin/courses" });
      await controller.find(ctx);
      expect(strapi.mockCourseService.find).toHaveBeenCalledWith(ctx.query, false);
    });

    it("Koa 嵌套路由 _matchedRoute 不含 /api 前缀时仍应正确判断 publicOnly", async () => {
      // 模拟 Strapi 插件 content-api 路由的真实场景：
      // _matchedRoute 可能只是子路由器的路径，不含 /api 前缀
      // 但 ctx.path 始终包含完整请求路径
      const ctx = createMockCtx({
        _matchedRoute: "/zhao-course/v1/courses",
        path: "/api/zhao-course/v1/courses",
      });
      await controller.find(ctx);
      expect(strapi.mockCourseService.find).toHaveBeenCalledWith(ctx.query, true);
    });

    it("admin 路由 _matchedRoute 不含 /api 前缀时仍应判断为 admin", async () => {
      const ctx = createMockCtx({
        _matchedRoute: "/zhao-course/v1/admin/courses",
        path: "/api/zhao-course/v1/admin/courses",
      });
      await controller.find(ctx);
      expect(strapi.mockCourseService.find).toHaveBeenCalledWith(ctx.query, false);
    });
  });
});
