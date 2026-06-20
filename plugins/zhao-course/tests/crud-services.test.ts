/**
 * 基础 CRUD Service 单元测试
 * 验证 course-category / course-tag / course / knowledge-point / course-lesson
 * 的基本 CRUD 操作正确调用 strapi API
 */
import courseCategoryFactory from "../server/src/services/course-category";
import courseTagFactory from "../server/src/services/course-tag";
import courseFactory from "../server/src/services/course";
import knowledgePointFactory from "../server/src/services/knowledge-point";
import courseLessonFactory from "../server/src/services/course-lesson";
import { createMockStrapi } from "./helpers/mock-strapi";

function testCrudService(name: string, factory: Function, uid: string) {
  describe(`${name} service CRUD`, () => {
    let strapi: any;
    let service: any;

    beforeEach(() => {
      strapi = createMockStrapi();
      service = factory({ strapi });
    });

    it("find 应调用 documents().findMany", async () => {
      const mockResult = [{ id: 1 }];
      const mockFindMany = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });

      const result = await service.find();

      expect(strapi.documents).toHaveBeenCalledWith(uid);
      expect(result).toEqual(mockResult);
    });

    it("findOne 应调用 documents().findOne", async () => {
      const mockResult = { id: 1, title: "测试" };
      const mockFindOne = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ findOne: mockFindOne });

      const result = await service.findOne("doc-1");

      expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1" }));
    });

    it("create 应调用 documents().create", async () => {
      const data = { title: "新记录" };
      const mockResult = { id: 1, ...data };
      const mockCreate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ create: mockCreate });

      const result = await service.create(data);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    it("update 应调用 documents().update", async () => {
      const data = { title: "更新" };
      const mockResult = { id: 1, title: "更新" };
      const mockUpdate = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ update: mockUpdate });

      const result = await service.update("doc-1", data);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1", data }));
    });

    it("delete 应调用 documents().delete", async () => {
      const mockResult = { id: 1 };
      const mockDelete = jest.fn().mockResolvedValue(mockResult);
      strapi.documents = jest.fn().mockReturnValue({ delete: mockDelete });

      const result = await service.delete("doc-1");

      expect(mockDelete).toHaveBeenCalledWith({ documentId: "doc-1" });
    });
  });
}

testCrudService("course-category", courseCategoryFactory, "plugin::zhao-course.course-category");
testCrudService("course-tag", courseTagFactory, "plugin::zhao-course.course-tag");
testCrudService("course", courseFactory, "plugin::zhao-course.course");
testCrudService("knowledge-point", knowledgePointFactory, "plugin::zhao-course.knowledge-point");
testCrudService("course-lesson", courseLessonFactory, "plugin::zhao-course.course-lesson");
