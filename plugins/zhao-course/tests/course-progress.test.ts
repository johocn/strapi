/**
 * 课程进度 Service 单元测试
 */
import courseProgressFactory from "../server/src/services/course-progress";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("course-progress service", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  describe("CRUD 基础操作", () => {
    it("find 应查询进度列表", async () => {
      const mockResult = [{ id: 1, progress: 50 }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const service = courseProgressFactory({ strapi });
      const result = await service.find();

      expect(strapi.documents).toHaveBeenCalledWith("plugin::zhao-course.course-progress");
      expect(result).toEqual(mockResult);
    });

    it("findOne 应查询单条进度", async () => {
      const mockResult = { id: 1, progress: 50 };
      const mockFindOne = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

      const service = courseProgressFactory({ strapi });
      const result = await service.findOne("doc-1");

      expect(mockFindOne).toHaveBeenCalledWith({ documentId: "doc-1", populate: { user: true, course: true } });
    });

    it("create 应创建进度记录", async () => {
      const data = { user: 1, course: 1, progress: 0 };
      const mockResult = { id: 1, ...data };
      const mockCreate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

      const service = courseProgressFactory({ strapi });
      const result = await service.create(data);

      expect(mockCreate).toHaveBeenCalledWith({ data });
    });

    it("update 应更新进度记录", async () => {
      const data = { progress: 80 };
      const mockResult = { id: 1, progress: 80 };
      const mockUpdate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

      const service = courseProgressFactory({ strapi });
      const result = await service.update("doc-1", data);

      expect(mockUpdate).toHaveBeenCalledWith({ documentId: "doc-1", data });
    });

    it("delete 应删除进度记录", async () => {
      const mockResult = { id: 1 };
      const mockDelete = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

      const service = courseProgressFactory({ strapi });
      const result = await service.delete("doc-1");

      expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
    });
  });

  describe("getOrCreate", () => {
    it("已有进度记录时应直接返回", async () => {
      const existingProgress = { id: 1, user: 1, course: 1, totalLessons: 10 };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = courseProgressFactory({ strapi });
      const result = await service.getOrCreate(1, 1);

      expect(result).toEqual(existingProgress);
    });

    it("无进度记录时应创建新记录", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue(null);
      const mockDbCount = jest.fn().mockResolvedValue(5);
      const mockDbCreate = jest.fn().mockResolvedValue({ id: 1, totalLessons: 5, progress: 0 });

      strapi.db.query = jest.fn().mockImplementation((uid: string) => {
        if (uid === "plugin::zhao-course.course-progress") {
          return { findOne: mockDbFindOne, create: mockDbCreate };
        }
        if (uid === "plugin::zhao-course.course-lesson") {
          return { count: mockDbCount };
        }
        return {};
      });

      const service = courseProgressFactory({ strapi });
      const result = await service.getOrCreate(1, 1);

      expect(mockDbCount).toHaveBeenCalledWith({ where: { course: 1 } });
      expect(mockDbCreate).toHaveBeenCalled();
    });
  });

  describe("recalculate", () => {
    it("应正确计算课程进度百分比", async () => {
      const progress = { id: 1, user: 1, course: 1, totalLessons: 10, progress: 0 };
      const mockDbFindOne = jest.fn().mockResolvedValue(progress);
      const mockDbCount = jest.fn().mockResolvedValue(7); // 7/10 完成
      const mockDbUpdate = jest.fn().mockResolvedValue({ ...progress, completedLessons: 7, progress: 70 });

      strapi.db.query = jest.fn().mockImplementation((uid: string) => {
        if (uid === "plugin::zhao-course.course-progress") {
          return { findOne: mockDbFindOne, create: jest.fn().mockResolvedValue(progress), update: mockDbUpdate };
        }
        if (uid === "plugin::zhao-course.lesson-progress") {
          return { count: mockDbCount };
        }
        return {};
      });

      const service = courseProgressFactory({ strapi });
      const result = await service.recalculate(1, 1);

      expect(mockDbCount).toHaveBeenCalledWith({ where: { user: 1, course: 1, isCompleted: true } });
      expect(result.completedLessons).toBe(7);
      expect(result.isCompleted).toBe(false); // 7 < 10
    });

    it("所有课时完成时 isCompleted 应为 true", async () => {
      const progress = { id: 1, user: 1, course: 1, totalLessons: 5, progress: 0 };
      const mockDbFindOne = jest.fn().mockResolvedValue(progress);
      const mockDbCount = jest.fn().mockResolvedValue(5); // 5/5 完成
      const mockDbUpdate = jest.fn().mockResolvedValue({});

      strapi.db.query = jest.fn().mockImplementation((uid: string) => {
        if (uid === "plugin::zhao-course.course-progress") {
          return { findOne: mockDbFindOne, create: jest.fn().mockResolvedValue(progress), update: mockDbUpdate };
        }
        if (uid === "plugin::zhao-course.lesson-progress") {
          return { count: mockDbCount };
        }
        return {};
      });

      const service = courseProgressFactory({ strapi });
      const result = await service.recalculate(1, 1);

      expect(result.isCompleted).toBe(true);
    });
  });

  describe("claimPoints", () => {
    it("课程未启用积分时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: 1, isPointsClaimed: false,
        course: { id: 1, enablePoints: false },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = courseProgressFactory({ strapi });
      await expect(service.claimPoints(1, "1")).rejects.toThrow();
    });

    it("积分已领取时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: 1, isPointsClaimed: true,
        course: { id: 1, enablePoints: true, pointsType: "course_points", points: 100 },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = courseProgressFactory({ strapi });
      await expect(service.claimPoints(1, "1")).rejects.toThrow();
    });

    it("课程未完成时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: 1, isPointsClaimed: false, isCompleted: false,
        course: { id: 1, enablePoints: true, pointsType: "course_points", points: 100 },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = courseProgressFactory({ strapi });
      await expect(service.claimPoints(1, "1")).rejects.toThrow();
    });

    it("满足条件时应成功领取积分", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: 1, isPointsClaimed: false, isCompleted: true,
        course: { id: 1, enablePoints: true, pointsType: "course_points", points: 100, title: "测试课程" },
      });
      const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1, pointsEarned: 100, isPointsClaimed: true });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      const service = courseProgressFactory({ strapi });
      const result = await service.claimPoints(1, "1");

      expect(result.pointsEarned).toBe(100);
      expect(result.claimed).toBe(true);
    });
  });

  describe("getUserProgresses", () => {
    it("应查询用户的课程进度列表", async () => {
      const mockResult = [{ id: 1, progress: 50, course: { id: 1 } }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.db.query = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const service = courseProgressFactory({ strapi });
      const result = await service.getUserProgresses(1);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { user: 1 },
        populate: { course: true },
      });
      expect(result).toEqual(mockResult);
    });
  });
});
