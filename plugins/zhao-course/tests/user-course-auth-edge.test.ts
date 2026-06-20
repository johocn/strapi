import userCourseAuthFactory from "../server/src/services/user-course-auth";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("user-course-auth service - checkAuth edge cases", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  it("收费课程授权记录无 expiresAt 时应视为未过期", async () => {
    const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
    const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, isExpired: false });

    strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
    strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

    const service = userCourseAuthFactory({ strapi });
    const result = await service.checkAuth(1, "course-doc-1");

    expect(result.authorized).toBe(true);
  });

  it("收费课程授权记录 expiresAt 为 null 时应视为未过期", async () => {
    const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
    const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, expiresAt: null, isExpired: false });

    strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
    strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

    const service = userCourseAuthFactory({ strapi });
    const result = await service.checkAuth(1, "course-doc-1");

    expect(result.authorized).toBe(true);
  });

  it("收费课程授权刚过期时应标记 isExpired=true", async () => {
    const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: true });
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, expiresAt: pastDate, isExpired: false });
    const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1, isExpired: true });

    strapi.documents = jest.fn().mockReturnValue({ findOne: mockCourseFindOne });
    strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne, update: mockDbUpdate });

    const service = userCourseAuthFactory({ strapi });
    const result = await service.checkAuth(1, "course-doc-1");

    expect(result.authorized).toBe(false);
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isExpired: true }),
      })
    );
  });

  it("免费课程首次访问应创建授权记录", async () => {
    const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: false });
    const mockDbFindOne = jest.fn().mockResolvedValue(null);
    const mockDocCreate = jest.fn().mockResolvedValue({ id: 1, authType: "free" });

    strapi.documents = jest.fn().mockReturnValue({
      findOne: mockCourseFindOne,
      create: mockDocCreate,
    });
    strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

    const service = userCourseAuthFactory({ strapi });
    const result = await service.checkAuth(1, "course-doc-1");

    expect(result.authorized).toBe(true);
    expect(mockDocCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: 1,
        course: 10,
        authType: "free",
        isExpired: false,
      }),
    });
  });

  it("免费课程已有授权记录时不应重复创建", async () => {
    const mockCourseFindOne = jest.fn().mockResolvedValue({ id: 10, isPaid: false });
    const mockDbFindOne = jest.fn().mockResolvedValue({ id: 1, authType: "free" });
    const mockDocCreate = jest.fn();

    strapi.documents = jest.fn().mockReturnValue({
      findOne: mockCourseFindOne,
      create: mockDocCreate,
    });
    strapi.db.query = jest.fn().mockReturnValue({ findOne: mockDbFindOne });

    const service = userCourseAuthFactory({ strapi });
    const result = await service.checkAuth(1, "course-doc-1");

    expect(result.authorized).toBe(true);
    expect(mockDocCreate).not.toHaveBeenCalled();
  });
});
