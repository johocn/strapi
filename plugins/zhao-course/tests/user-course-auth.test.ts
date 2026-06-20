/**
 * 用户课程授权 Service 单元测试
 */
import userCourseAuthFactory from "../server/src/services/user-course-auth";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("user-course-auth service", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  describe("find", () => {
    it("应调用 documents().findMany 查询授权列表", async () => {
      const mockResult = [{ id: 1, authType: "free" }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.find();

      expect(strapi.documents).toHaveBeenCalledWith("plugin::zhao-course.user-course-auth");
      expect(mockFindMany).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("findOne", () => {
    it("应调用 documents().findOne 查询单条授权", async () => {
      const mockResult = { id: 1, authType: "free" };
      const mockFindOne = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.findOne("doc-1");

      expect(mockFindOne).toHaveBeenCalledWith({ documentId: "doc-1", populate: { user: true, course: true } });
      expect(result).toEqual(mockResult);
    });
  });

  describe("create", () => {
    it("应调用 documents().create 创建授权记录", async () => {
      const data = { authType: "free", isExpired: false };
      const mockResult = { id: 1, ...data };
      const mockCreate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.create(data);

      expect(mockCreate).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockResult);
    });
  });

  describe("update", () => {
    it("应调用 documents().update 更新授权记录", async () => {
      const data = { isExpired: true };
      const mockResult = { id: 1, isExpired: true };
      const mockUpdate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.update("doc-1", data);

      expect(mockUpdate).toHaveBeenCalledWith({ documentId: "doc-1", data });
      expect(result).toEqual(mockResult);
    });
  });

  describe("delete", () => {
    it("应调用 documents().delete 删除授权记录", async () => {
      const mockResult = { id: 1 };
      const mockDelete = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.delete("doc-1");

      expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
      expect(result).toEqual(mockResult);
    });
  });

  describe("checkAuth", () => {
    it("课程不存在时应抛出错误", async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null);
      strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

      const service = userCourseAuthFactory({ strapi });
      await expect(service.checkAuth(1, "nonexistent")).rejects.toThrow();
    });

    it("免费课程应自动授权并返回 authorized: true", async () => {
      const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: false });
      const mockDbFindOne = jest.fn().mockResolvedValue(null); // 无已有授权
      const mockCreate = jest.fn().mockResolvedValue({ id: 1, authType: "free" });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne, create: mockCreate });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.checkAuth(1, "course-doc-1");

      expect(result.authorized).toBe(true);
    });

    it("免费课程已有授权时应直接返回 authorized: true", async () => {
      const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: false });
      const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, authType: "free" });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.checkAuth(1, "course-doc-1");

      expect(result.authorized).toBe(true);
    });

    it("收费课程无授权记录时应返回 authorized: false", async () => {
      const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
      const mockDbFindOne = jest.fn().mockResolvedValue(null);

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.checkAuth(1, "course-doc-1");

      expect(result.authorized).toBe(false);
    });

    it("收费课程授权已过期时应返回 authorized: false", async () => {
      const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
      const pastDate = new Date("2020-01-01").toISOString();
      const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, expiresAt: pastDate, isExpired: false });
      const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1, isExpired: true });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.checkAuth(1, "course-doc-1");

      expect(result.authorized).toBe(false);
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it("收费课程授权未过期时应返回 authorized: true", async () => {
      const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
      const futureDate = new Date("2099-12-31").toISOString();
      const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, expiresAt: futureDate, isExpired: false });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.checkAuth(1, "course-doc-1");

      expect(result.authorized).toBe(true);
    });
  });

  describe("getUserAuthCourses", () => {
    it("应查询用户未过期的授权课程", async () => {
      const mockResult = [{ id: 1, course: { id: 10 } }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.db.query = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const service = userCourseAuthFactory({ strapi });
      const result = await service.getUserAuthCourses(1);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { user: 1, isExpired: false },
        populate: { course: true },
      });
      expect(result).toEqual(mockResult);
    });
  });
});
