/**
 * 基础 CRUD Service 单元测试
 * 验证现存 content-type（course-category / course-lesson / course）
 * 的基本 CRUD 操作正确调用 strapi API
 */
import courseCategoryFactory from "../server/src/services/course-category";
import courseLessonFactory from "../server/src/services/course-lesson";
import courseFactory from "../server/src/services/course";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("course-category service CRUD", () => {
  const UID = "plugin::zhao-course.course-category";
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = courseCategoryFactory({ strapi });
  });

  it("find 应调用 documents().findMany 并返回分页结构", async () => {
    const list = [{ id: 1, channelScope: "all" }];
    const mockFindMany = jest.fn().mockResolvedValue(list);
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

    const result = await service.find({});

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ sort: "asc" }],
        pagination: { page: 1, pageSize: 1000 },
      })
    );
    expect(result).toEqual({
      list,
      pagination: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
    });
  });

  it("findOne 应调用 documents().findOne", async () => {
    const mockResult = { id: 1, title: "测试" };
    const mockFindOne = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

    const result = await service.findOne("doc-1");

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindOne).toHaveBeenCalledWith({ documentId: "doc-1" });
    expect(result).toEqual(mockResult);
  });

  it("create 应调用 documents().create", async () => {
    const data = { title: "新分类" };
    const mockResult = { id: 1, ...data };
    const mockCreate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

    const result = await service.create(data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockCreate).toHaveBeenCalledWith({ data });
    expect(result).toEqual(mockResult);
  });

  it("update 应调用 documents().update", async () => {
    const data = { title: "更新" };
    const mockResult = { id: 1, title: "更新" };
    const mockUpdate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

    const result = await service.update("doc-1", data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockUpdate).toHaveBeenCalledWith({ documentId: "doc-1", data });
    expect(result).toEqual(mockResult);
  });

  it("delete 应调用 documents().delete", async () => {
    const mockResult = { id: 1 };
    const mockDelete = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

    const result = await service.delete("doc-1");

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
    expect(result).toEqual(mockResult);
  });
});

describe("course-lesson service CRUD", () => {
  const UID = "plugin::zhao-course.course-lesson";
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = courseLessonFactory({ strapi });
  });

  it("find 应调用 documents().findMany 与 count 并返回分页结构", async () => {
    const list = [{ id: 1 }];
    const mockFindMany = jest.fn().mockResolvedValue(list);
    const mockCount = jest.fn().mockResolvedValue(1);
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany, count: mockCount });

    const result = await service.find({ pagination: { page: 2, pageSize: 10 } });

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: { page: 2, pageSize: 10 } })
    );
    expect(mockCount).toHaveBeenCalledWith({ filters: {} });
    expect(result).toEqual({
      list,
      pagination: { page: 2, pageSize: 10, total: 1, pageCount: 1 },
    });
  });

  it("findOne 应调用 documents().findOne", async () => {
    const mockResult = { id: 1, title: "测试" };
    const mockFindOne = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

    const result = await service.findOne("doc-1");

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "doc-1", populate: expect.objectContaining({ course: true }) })
    );
    expect(result).toEqual(mockResult);
  });

  it("create 应调用 documents().create", async () => {
    const data = { title: "新课时" };
    const mockResult = { id: 1, documentId: "doc-new", ...data };
    const mockCreate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

    const result = await service.create(data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data }));
    expect(result).toEqual(mockResult);
  });

  it("update 应调用 documents().update", async () => {
    const data = { title: "更新" };
    const mockResult = { id: 1, documentId: "doc-1", title: "更新" };
    const mockUpdate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

    const result = await service.update("doc-1", data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1", data }));
    expect(result).toEqual(mockResult);
  });

  it("delete 应调用 documents().delete", async () => {
    const mockResult = { id: 1 };
    const mockDelete = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

    const result = await service.delete("doc-1");

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
    expect(result).toEqual(mockResult);
  });
});

describe("course service CRUD", () => {
  const UID = "plugin::zhao-course.course";
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = courseFactory({ strapi });
  });

  it("find（非 admin）应调用 documents().findMany 且 status=draft", async () => {
    const list = [{ id: 1, documentId: "d1" }];
    const mockFindMany = jest.fn().mockResolvedValue(list);
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

    const result = await service.find({}, false);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
    expect(result.list).toEqual(list);
    expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 1, pageCount: 1 });
  });

  it("find（非 admin，publicOnly）应设置 status=published", async () => {
    const mockFindMany = jest.fn().mockResolvedValue([{ id: 1, documentId: "d1" }]);
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

    await service.find({}, true);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
  });

  it("find（admin）应走 db.query 并按 documentId 去重优先保留草稿", async () => {
    const rows = [
      { documentId: "d1", publishedAt: "2024-01-01", title: "已发布" },
      { documentId: "d1", publishedAt: null, title: "草稿" },
    ];
    const mockFindMany = jest.fn().mockResolvedValue(rows);
    strapi.db = { query: jest.fn().mockReturnValue({ findMany: mockFindMany }) };

    const result = await service.find({}, false, {
      channelScope: { all: true, channelIds: [], isGuest: false },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
    });

    expect(strapi.db.query).toHaveBeenCalledWith(UID);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletedAt: null } }));
    expect(result.list).toHaveLength(1);
    expect(result.list[0].title).toBe("草稿");
  });

  it("findOne 应调用 documents().findOne", async () => {
    const mockResult = { id: 1, documentId: "doc-1", title: "测试" };
    const mockFindOne = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

    const result = await service.findOne("doc-1", false);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "doc-1", populate: expect.objectContaining({ lessons: true }) })
    );
    expect(result).toEqual(mockResult);
  });

  it("create 应调用 documents().create", async () => {
    const data = { title: "新课程" };
    const mockResult = { id: 1, documentId: "doc-new", ...data };
    const mockCreate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

    const result = await service.create(data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { title: "新课程" } }));
    expect(result).toEqual(mockResult);
  });

  it("update 应调用 documents().update", async () => {
    const data = { title: "更新" };
    const mockResult = { id: 1, documentId: "doc-1", title: "更新" };
    const mockUpdate = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

    const result = await service.update("doc-1", data);

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "doc-1", data: { title: "更新" } })
    );
    expect(result).toEqual(mockResult);
  });

  it("delete 应调用 documents().delete", async () => {
    const mockResult = { id: 1 };
    const mockDelete = jest.fn().mockResolvedValue(mockResult);
    strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

    const result = await service.delete("doc-1");

    expect(strapi.documents).toHaveBeenCalledWith(UID);
    expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
    expect(result).toEqual(mockResult);
  });
});