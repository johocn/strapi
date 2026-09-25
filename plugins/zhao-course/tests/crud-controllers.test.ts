import courseCategoryFactory from "../server/src/controllers/course-category";
import courseLessonFactory from "../server/src/controllers/course-lesson";
import courseFactory from "../server/src/controllers/course";
import { createMockCtx, createControllerStrapi } from "./helpers/mock-ctx";

function createMockService(): Record<string, jest.Mock> {
  return {
    find: jest.fn().mockResolvedValue([{ id: 1 }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, title: "测试" }),
    create: jest.fn().mockResolvedValue({ id: 1, title: "新建" }),
    update: jest.fn().mockResolvedValue({ id: 1, title: "更新" }),
    delete: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

describe("course-category controller", () => {
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = createMockService();
    controller = courseCategoryFactory({ strapi: createControllerStrapi({ "course-category": mockService }) });
  });

  it("find 应调用 service.find 并返回 { data, meta } 信封", async () => {
    const ctx = createMockCtx({ query: { pagination: { page: 1 } } });

    await controller.find(ctx);

    expect(mockService.find).toHaveBeenCalledWith(ctx.query, {
      channelScope: { all: true, channelIds: [], isGuest: true },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
    });
    expect(ctx.body).toEqual({ data: [{ id: 1 }], meta: {} });
  });

  it("findOne 应调用 service.findOne 并返回 { data, meta } 信封", async () => {
    const ctx = createMockCtx({ params: { documentId: "doc-1" } });

    await controller.findOne(ctx);

    expect(mockService.findOne).toHaveBeenCalledWith("doc-1");
    expect(ctx.body).toEqual({ data: { id: 1, title: "测试" }, meta: {} });
  });

  it("findOne 返回 null 时应返回 404 与错误信息", async () => {
    mockService.findOne.mockResolvedValue(null);
    const ctx = createMockCtx({ params: { documentId: "nonexistent" } });

    await controller.findOne(ctx);

    expect(ctx.status).toBe(404);
    expect(ctx.body).toEqual({ error: "分类不存在" });
  });

  it("create 应调用 service.create 并设置状态201与数据信封", async () => {
    const ctx = createMockCtx({ request: { body: { title: "新建" } } });

    await controller.create(ctx);

    expect(mockService.create).toHaveBeenCalledWith({ title: "新建" }, { siteId: undefined });
    expect(ctx.status).toBe(201);
    expect(ctx.body).toEqual({ data: { id: 1, title: "新建" }, meta: {} });
  });

  it("update 应调用 service.update 并返回数据信封", async () => {
    const ctx = createMockCtx({
      params: { documentId: "doc-1" },
      request: { body: { title: "更新" } },
    });

    await controller.update(ctx);

    expect(mockService.update).toHaveBeenCalledWith("doc-1", { title: "更新" }, { siteId: undefined });
    expect(ctx.body).toEqual({ data: { id: 1, title: "更新" }, meta: {} });
  });

  it("delete 应调用 service.delete 并返回数据信封", async () => {
    const ctx = createMockCtx({ params: { documentId: "doc-1" } });

    await controller.delete(ctx);

    expect(mockService.delete).toHaveBeenCalledWith("doc-1");
    expect(ctx.body).toEqual({ data: { id: 1 }, meta: {} });
  });

  it("find 抛出异常时应设置 400 与错误 body（不抛出）", async () => {
    mockService.find.mockRejectedValue(new Error("DB error"));
    const ctx = createMockCtx();

    await controller.find(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "DB error" });
  });

  it("create 抛出异常时应设置 400 与错误 body（不抛出）", async () => {
    mockService.create.mockRejectedValue(new Error("Validation error"));
    const ctx = createMockCtx({ request: { body: { title: "测试" } } });

    await controller.create(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "Validation error" });
  });
});

describe("course-lesson controller", () => {
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = createMockService();
    controller = courseLessonFactory({ strapi: createControllerStrapi({ "course-lesson": mockService }) });
  });

  it("find 应调用 service.find 并返回 { data, meta } 信封", async () => {
    const ctx = createMockCtx({ query: { pagination: { page: 1 } } });

    await controller.find(ctx);

    expect(mockService.find).toHaveBeenCalledWith(ctx.query);
    expect(ctx.body).toEqual({ data: [{ id: 1 }], meta: {} });
  });

  it("findOne 应调用 service.findOne 并返回数据信封", async () => {
    const ctx = createMockCtx({ params: { documentId: "doc-1" } });

    await controller.findOne(ctx);

    expect(mockService.findOne).toHaveBeenCalledWith("doc-1");
    expect(ctx.body).toEqual({ data: { id: 1, title: "测试" }, meta: {} });
  });

  it("findOne 返回 null 时应返回 404 与错误信息", async () => {
    mockService.findOne.mockResolvedValue(null);
    const ctx = createMockCtx({ params: { documentId: "nonexistent" } });

    await controller.findOne(ctx);

    expect(ctx.status).toBe(404);
    expect(ctx.body).toEqual({ error: "课时不存在" });
  });

  it("create 缺少 title 时应返回 400 且不调用 service", async () => {
    const ctx = createMockCtx({ request: { body: {} } });

    await controller.create(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "缺少课时名称" });
    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("create 应调用 service.create 并设置状态201与数据信封", async () => {
    const ctx = createMockCtx({ request: { body: { title: "新建" } } });

    await controller.create(ctx);

    expect(mockService.create).toHaveBeenCalledWith({ title: "新建" });
    expect(ctx.status).toBe(201);
    expect(ctx.body).toEqual({ data: { id: 1, title: "新建" }, meta: {} });
  });

  it("update 缺少 documentId 时应返回 400 且不调用 service", async () => {
    const ctx = createMockCtx({ request: { body: { title: "更新" } } });

    await controller.update(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "缺少课时 ID" });
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it("update 应调用 service.update 并返回数据信封", async () => {
    const ctx = createMockCtx({
      params: { documentId: "doc-1" },
      request: { body: { title: "更新" } },
    });

    await controller.update(ctx);

    expect(mockService.update).toHaveBeenCalledWith("doc-1", { title: "更新" });
    expect(ctx.body).toEqual({ data: { id: 1, title: "更新" }, meta: {} });
  });

  it("delete 应调用 service.delete 并返回数据信封", async () => {
    const ctx = createMockCtx({ params: { documentId: "doc-1" } });

    await controller.delete(ctx);

    expect(mockService.delete).toHaveBeenCalledWith("doc-1");
    expect(ctx.body).toEqual({ data: { id: 1 }, meta: {} });
  });

  it("find 抛出异常时应设置 400 与错误 body（不抛出）", async () => {
    mockService.find.mockRejectedValue(new Error("DB error"));
    const ctx = createMockCtx();

    await controller.find(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "DB error" });
  });
});

describe("course controller", () => {
  let controller: any;
  let mockService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockService = createMockService();
    controller = courseFactory({ strapi: createControllerStrapi({ course: mockService }) });
  });

  it("admin find 应传递 publicOnly=false 并返回列表信封", async () => {
    const ctx = createMockCtx({
      query: { pagination: { page: 1 } },
      path: "/api/zhao-course/v1/admin/courses",
    });

    await controller.find(ctx);

    expect(mockService.find).toHaveBeenCalledWith(ctx.query, false, {
      channelScope: { all: true, channelIds: [], isGuest: false },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
      userId: undefined,
      siteDocId: undefined,
    });
    expect(ctx.body).toEqual({ data: [{ id: 1 }], meta: {} });
  });

  it("非 admin find 应传递 publicOnly=true 并使用游客渠道范围", async () => {
    const ctx = createMockCtx({ query: {}, path: "/api/zhao-course/v1/courses" });

    await controller.find(ctx);

    expect(mockService.find).toHaveBeenCalledWith(ctx.query, true, {
      channelScope: { all: true, channelIds: [], isGuest: true },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
      userId: undefined,
      siteDocId: undefined,
    });
  });

  it("admin findOne 应传递 publicOnly=false 并返回数据信封", async () => {
    const ctx = createMockCtx({
      params: { documentId: "doc-1" },
      path: "/api/zhao-course/v1/admin/courses/doc-1",
    });

    await controller.findOne(ctx);

    expect(mockService.findOne).toHaveBeenCalledWith("doc-1", false, {
      userId: undefined,
      isAdmin: true,
      channelScope: undefined,
      siteDocId: undefined,
    });
    expect(ctx.body).toEqual({ data: { id: 1, title: "测试" }, meta: {} });
  });

  it("findOne 缺少 documentId 时应返回 400", async () => {
    const ctx = createMockCtx({ params: {} });

    await controller.findOne(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "缺少课程 ID" });
    expect(mockService.findOne).not.toHaveBeenCalled();
  });

  it("findOne 返回 null 时应返回 404 与错误信息", async () => {
    mockService.findOne.mockResolvedValue(null);
    const ctx = createMockCtx({ params: { documentId: "nonexistent" } });

    await controller.findOne(ctx);

    expect(ctx.status).toBe(404);
    expect(ctx.body).toEqual({ error: "课程不存在" });
  });

  it("create 应校验 title 并返回原始结果（未包裹信封）", async () => {
    const ctx = createMockCtx({ request: { body: { title: "新建课程" } } });

    await controller.create(ctx);

    expect(mockService.create).toHaveBeenCalledWith({ title: "新建课程" }, { siteId: undefined });
    expect(ctx.status).toBe(201);
    expect(ctx.body).toEqual({ id: 1, title: "新建" });
  });

  it("create 缺少 title 时应返回 400", async () => {
    const ctx = createMockCtx({ request: { body: {} } });

    await controller.create(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "缺少课程标题" });
    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("create title 为空白字符串时应返回 400", async () => {
    const ctx = createMockCtx({ request: { body: { title: "   " } } });

    await controller.create(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "课程标题必须是有效的字符串" });
    expect(mockService.create).not.toHaveBeenCalled();
  });

  it("update 应调用 service.update 并返回数据信封", async () => {
    const ctx = createMockCtx({
      params: { documentId: "doc-1" },
      request: { body: { title: "更新" } },
    });

    await controller.update(ctx);

    expect(mockService.update).toHaveBeenCalledWith("doc-1", { title: "更新" }, { siteId: undefined });
    expect(ctx.body).toEqual({ data: { id: 1, title: "更新" }, meta: {} });
  });

  it("delete 应调用 service.delete 并返回数据信封", async () => {
    const ctx = createMockCtx({ params: { documentId: "doc-1" } });

    await controller.delete(ctx);

    expect(mockService.delete).toHaveBeenCalledWith("doc-1");
    expect(ctx.body).toEqual({ data: { id: 1 }, meta: {} });
  });

  it("find 抛出异常时应设置 400 与错误 body（不抛出）", async () => {
    mockService.find.mockRejectedValue(new Error("DB error"));
    const ctx = createMockCtx({ path: "/api/zhao-course/v1/courses" });

    await controller.find(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "DB error" });
  });

  it("create 抛出异常时应设置 400 与错误 body（不抛出）", async () => {
    mockService.create.mockRejectedValue(new Error("Validation error"));
    const ctx = createMockCtx({ request: { body: { title: "测试" } } });

    await controller.create(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: "Validation error" });
  });
});