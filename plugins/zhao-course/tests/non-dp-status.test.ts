/**
 * 非 D&P content-type 查询测试
 *
 * 问题：course-lesson 和 knowledge-point 的 draftAndPublish 为 false，
 * 但服务层 find 方法设置了 status: "draft"/"published"，
 * 导致 Document Service API 返回空结果。
 *
 * 修复：非 D&P 类型不应设置 status 参数。
 */
import courseLessonFactory from "../server/src/services/course-lesson";
import knowledgePointFactory from "../server/src/services/knowledge-point";
import courseCategoryFactory from "../server/src/services/course-category";
import courseFactory from "../server/src/services/course";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("非 D&P content-type 查询不应设置 status 参数", () => {
  let strapi: any;
  let mockFindMany: jest.Mock;

  beforeEach(() => {
    strapi = createMockStrapi();
    mockFindMany = jest.fn().mockResolvedValue([{ id: 1, title: "测试" }]);
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });
  });

  describe("course-lesson (draftAndPublish: false)", () => {
    let service: any;

    beforeEach(() => {
      service = courseLessonFactory({ strapi });
    });

    it("admin 查询时不应设置 status 参数", async () => {
      await service.find({}, false);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("status");
    });

    it("public 查询时不应设置 status 参数（非 D&P 类型无发布状态）", async () => {
      await service.find({}, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("status");
    });
  });

  describe("knowledge-point (draftAndPublish: false)", () => {
    let service: any;

    beforeEach(() => {
      service = knowledgePointFactory({ strapi });
    });

    it("admin 查询时不应设置 status 参数", async () => {
      await service.find({}, false);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("status");
    });

    it("public 查询时不应设置 status 参数（非 D&P 类型无发布状态）", async () => {
      await service.find({}, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("status");
    });
  });

  describe("course-category (draftAndPublish: false) - 正确参考", () => {
    let service: any;

    beforeEach(() => {
      service = courseCategoryFactory({ strapi });
    });

    it("不应设置 status 参数", async () => {
      await service.find({});

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("status");
    });
  });

  describe("course (draftAndPublish: true) - D&P 类型应正确设置 status", () => {
    let service: any;

    beforeEach(() => {
      service = courseFactory({ strapi });
    });

    it("admin 查询应设置 status: 'draft'", async () => {
      await service.find({}, false);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).toHaveProperty("status", "draft");
    });

    it("public 查询应设置 status: 'published'", async () => {
      await service.find({}, true);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs).toHaveProperty("status", "published");
    });
  });
});
