import lessonProgressFactory from "../server/src/services/lesson-progress";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("lesson-progress service", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  describe("CRUD 基础操作", () => {
    it("find 应查询课时进度列表", async () => {
      const mockResult = [{ id: 1, progress: 50 }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const service = lessonProgressFactory({ strapi });
      const result = await service.find();

      expect(strapi.documents).toHaveBeenCalledWith("plugin::zhao-course.lesson-progress");
      expect(result).toEqual(mockResult);
    });

    it("create 应创建课时进度记录", async () => {
      const data = { user: 1, lesson: 1, course: 1, progress: 0 };
      const mockResult = { id: 1, ...data };
      const mockCreate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

      const service = lessonProgressFactory({ strapi });
      const result = await service.create(data);

      expect(mockCreate).toHaveBeenCalledWith({ data });
    });
  });

  describe("reportProgress", () => {
    it("课时不存在时应抛出错误", async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null);
      strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.reportProgress(1, { lessonDocumentId: "nonexistent" })).rejects.toThrow();
    });

    it("无进度记录时应创建新记录", async () => {
      const mockLesson = { id: 10, course: { id: 5 } };
      const mockLessonFindOne = jest.fn().mockResolvedValue(mockLesson);
      const mockDbFindOne = jest.fn().mockResolvedValue(null);
      const mockDbCreate = jest.fn().mockResolvedValue({ id: 1, progress: 50, isCompleted: false });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockLessonFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, create: mockDbCreate });

      const service = lessonProgressFactory({ strapi });
      const result = await service.reportProgress(1, {
        lessonDocumentId: "lesson-doc-1",
        playPosition: 30,
        duration: 60,
        progress: 50,
      });

      expect(mockDbCreate).toHaveBeenCalled();
    });

    it("进度100%时 isCompleted 应为 true", async () => {
      const mockLesson = { id: 10, course: { id: 5 } };
      const mockLessonFindOne = jest.fn().mockResolvedValue(mockLesson);
      const existingProgress = { id: 1, progress: 50, playPosition: 30, duration: 60, isCompleted: false };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      const mockDbUpdate = jest.fn().mockResolvedValue({ ...existingProgress, progress: 100, isCompleted: true });

      strapi.documents = jest.fn().mockReturnValue({ findOne: mockLessonFindOne });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      strapi.plugin.mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockReturnValue({ recalculate: jest.fn().mockResolvedValue({}) }),
          };
        }
        return { service: jest.fn() };
      });

      const service = lessonProgressFactory({ strapi });
      const result = await service.reportProgress(1, {
        lessonDocumentId: "lesson-doc-1",
        progress: 100,
      });

      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCompleted: true }),
        })
      );
    });
  });

  describe("submitAnswer", () => {
    it("进度记录不存在时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.submitAnswer(1, "nonexistent", true)).rejects.toThrow();
    });

    it("无权操作时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: { id: 999 }, lesson: { id: 10 },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.submitAnswer(1, "doc-1", true)).rejects.toThrow("无权操作此进度记录");
    });

    it("答题正确时应标记 isCompleted 和 isCorrect", async () => {
      const existingProgress = {
        id: 1, user: 1, isAnswered: false, isCorrect: false, isCompleted: false, course: 5,
        lesson: { id: 10 },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      const mockDbUpdate = jest.fn().mockResolvedValue({
        ...existingProgress, isAnswered: true, isCorrect: true, isCompleted: true, progress: 100,
      });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      strapi.plugin.mockImplementation((name: string) => {
        if (name === "zhao-course") {
          return {
            service: jest.fn().mockReturnValue({ recalculate: jest.fn().mockResolvedValue({}) }),
          };
        }
        return { service: jest.fn() };
      });

      const service = lessonProgressFactory({ strapi });
      const result = await service.submitAnswer(1, "doc-1", true);

      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAnswered: true, isCorrect: true, isCompleted: true }),
        })
      );
    });

    it("答题错误时不应标记 isCompleted", async () => {
      const existingProgress = {
        id: 1, user: 1, isAnswered: false, isCorrect: false, isCompleted: false, course: 5,
        lesson: { id: 10 },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      const mockDbUpdate = jest.fn().mockResolvedValue({
        ...existingProgress, isAnswered: true, isCorrect: false,
      });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      const service = lessonProgressFactory({ strapi });
      const result = await service.submitAnswer(1, "doc-1", false);

      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAnswered: true, isCorrect: false }),
        })
      );
    });
  });

  describe("claimPoints", () => {
    it("进度记录不存在时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue(null);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("无权操作时应抛出错误", async () => {
      const mockDbFindOne = jest.fn().mockResolvedValue({
        id: 1, user: { id: 999 }, lesson: { id: 10, enablePoints: true },
      });
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow("无权操作此进度记录");
    });

    it("积分已领取时应抛出错误", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: true, isCompleted: true,
        lesson: { id: 10, enablePoints: true, points: 50, pointsType: "lesson_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("课时未启用积分时应抛出错误", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false,
        lesson: { id: 10, enablePoints: false },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("lesson_points 类型且课时未完成时应抛出错误", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false, isCompleted: false,
        lesson: { id: 10, enablePoints: true, points: 50, pointsType: "lesson_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("quiz_points 类型且未答题时应抛出错误", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false, isAnswered: false,
        lesson: { id: 10, enablePoints: true, points: 50, pointsType: "quiz_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("quiz_points 类型且答题错误时应抛出错误", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false, isAnswered: true, isCorrect: false,
        lesson: { id: 10, enablePoints: true, points: 50, pointsType: "quiz_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

      const service = lessonProgressFactory({ strapi });
      await expect(service.claimPoints(1, "doc-1")).rejects.toThrow();
    });

    it("lesson_points 类型满足条件时应成功领取积分", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false, isCompleted: true,
        lesson: { id: 10, enablePoints: true, points: 50, pointsType: "lesson_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1, pointsEarned: 50, isPointsClaimed: true });

      strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

      const service = lessonProgressFactory({ strapi });
      const result = await service.claimPoints(1, "doc-1");

      expect(result.pointsEarned).toBe(50);
      expect(result.claimed).toBe(true);
    });

    it("quiz_points 类型答题正确时应成功领取积分", async () => {
      const existingProgress = {
        id: 1, user: 1, isPointsClaimed: false, isAnswered: true, isCorrect: true,
        lesson: { id: 10, enablePoints: true, points: 30, pointsType: "quiz_points" },
      };
      const mockDbFindOne = jest.fn().mockResolvedValue(existingProgress);
      const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1, pointsEarned: 30, isPointsClaimed: true });

      strapi.db.query = jest.fn().mockImplementation((uid: string) => {
        if (uid === "plugin::zhao-course.lesson-progress") {
          return { findOne: mockDbFindOne, update: mockDbUpdate };
        }
        if (uid === "plugin::zhao-quiz.quiz-record") {
          return {
            findMany: jest.fn().mockResolvedValue([
              { id: 1, quiz: { points: 30, documentId: "quiz-1" } },
            ]),
          };
        }
        return {};
      });

      const service = lessonProgressFactory({ strapi });
      const result = await service.claimPoints(1, "doc-1");

      expect(result.pointsEarned).toBe(30);
      expect(result.claimed).toBe(true);
    });
  });
});
