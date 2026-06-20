import { sumQuizPoints, calculateLessonPoints, calculateCoursePoints } from "../server/src/utils/points-calculator";

describe("points-calculator", () => {
  describe("sumQuizPoints", () => {
    it("无答题记录时返回 0", async () => {
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue([]) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await sumQuizPoints(strapi, 1, 10);
      expect(result.total).toBe(0);
      expect(result.detail).toEqual({});
    });

    it("有正确答题记录时累加积分", async () => {
      const records = [
        { id: 1, quiz: { points: 10, documentId: "q1" } },
        { id: 2, quiz: { points: 20, documentId: "q2" } },
      ];
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue(records) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await sumQuizPoints(strapi, 1, 10);
      expect(result.total).toBe(30);
      expect(result.detail["q1"]).toEqual({ points: 10, isCorrect: true });
      expect(result.detail["q2"]).toEqual({ points: 20, isCorrect: true });
    });

    it("积分为 0 的记录不加入 detail", async () => {
      const records = [
        { id: 1, quiz: { points: 0, documentId: "q1" } },
        { id: 2, quiz: { points: 15, documentId: "q2" } },
      ];
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue(records) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await sumQuizPoints(strapi, 1, 10);
      expect(result.total).toBe(15);
      expect(result.detail["q1"]).toBeUndefined();
    });

    it("quiz 无 documentId 时用 id 作为 key", async () => {
      const records = [
        { id: 1, quiz: { points: 10, id: 99 } },
      ];
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue(records) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await sumQuizPoints(strapi, 1, 10);
      expect(result.detail["99"]).toEqual({ points: 10, isCorrect: true });
    });

    it("查询失败时记录日志并返回 0", async () => {
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockRejectedValue(new Error("DB error")) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await sumQuizPoints(strapi, 1, 10);
      expect(result.total).toBe(0);
      expect(strapi.log.warn).toHaveBeenCalled();
    });
  });

  describe("calculateLessonPoints", () => {
    it("课时未启用积分时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: false }, {});
      expect(result.points).toBe(0);
    });

    it("lesson_points 类型且未完成时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: true, pointsType: "lesson_points", points: 50 }, { isCompleted: false });
      expect(result.points).toBe(0);
    });

    it("lesson_points 类型且已完成时返回课时积分", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: true, pointsType: "lesson_points", points: 50 }, { isCompleted: true });
      expect(result.points).toBe(50);
    });

    it("quiz_points 类型且未答题时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: true, pointsType: "quiz_points" }, { isAnswered: false });
      expect(result.points).toBe(0);
    });

    it("quiz_points 类型且答题错误时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: true, pointsType: "quiz_points" }, { isAnswered: true, isCorrect: false });
      expect(result.points).toBe(0);
    });

    it("quiz_points 类型且答题正确时调用 sumQuizPoints", async () => {
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue([{ id: 1, quiz: { points: 25, documentId: "q1" } }]) }) },
        log: { warn: jest.fn() },
      } as any;
      const result = await calculateLessonPoints(strapi, { id: 10, enablePoints: true, pointsType: "quiz_points" }, { isAnswered: true, isCorrect: true, user: 1 });
      expect(result.points).toBe(25);
    });

    it("未知 pointsType 时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateLessonPoints(strapi, { enablePoints: true, pointsType: "unknown_type", points: 100 }, { isCompleted: true });
      expect(result.points).toBe(0);
    });
  });

  describe("calculateCoursePoints", () => {
    it("课程未启用积分时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateCoursePoints(strapi, { enablePoints: false }, 1, 1);
      expect(result.points).toBe(0);
    });

    it("course_points 类型时返回课程积分", async () => {
      const strapi = {} as any;
      const result = await calculateCoursePoints(strapi, { enablePoints: true, pointsType: "course_points", points: 200 }, 1, 1);
      expect(result.points).toBe(200);
    });

    it("lesson_points 类型时累加已领取的课时积分", async () => {
      const lessonProgresses = [
        { id: 1, pointsEarned: 30, lesson: { documentId: "l1", title: "课时1" } },
        { id: 2, pointsEarned: 50, lesson: { documentId: "l2", title: "课时2" } },
      ];
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue(lessonProgresses) }) },
      } as any;
      const result = await calculateCoursePoints(strapi, { enablePoints: true, pointsType: "lesson_points" }, 1, 1);
      expect(result.points).toBe(80);
      expect(result.detail["l1"]).toEqual({ title: "课时1", pointsEarned: 30 });
    });

    it("lesson_points 类型时积分为 0 的记录不加入 detail", async () => {
      const lessonProgresses = [
        { id: 1, pointsEarned: 0, lesson: { documentId: "l1", title: "课时1" } },
        { id: 2, pointsEarned: 40, lesson: { documentId: "l2", title: "课时2" } },
      ];
      const strapi = {
        db: { query: jest.fn().mockReturnValue({ findMany: jest.fn().mockResolvedValue(lessonProgresses) }) },
      } as any;
      const result = await calculateCoursePoints(strapi, { enablePoints: true, pointsType: "lesson_points" }, 1, 1);
      expect(result.points).toBe(40);
      expect(result.detail["l1"]).toBeUndefined();
    });

    it("未知 pointsType 时返回 0", async () => {
      const strapi = {} as any;
      const result = await calculateCoursePoints(strapi, { enablePoints: true, pointsType: "unknown", points: 999 }, 1, 1);
      expect(result.points).toBe(0);
    });
  });
});
