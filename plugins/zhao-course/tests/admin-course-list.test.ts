/**
 * Bug 复现：admin 用户只能看到部分课程
 *
 * 根因：Strapi v5 D&P 机制下，每门课程都有 draft 版本（无论是否发布）。
 * admin 接口 status 未设置时默认返回 draft，但之前代码用 undefined 导致行为不一致。
 *
 * 规范（zhao-course-使用手册.md 14.11）：
 * - findMany({ status: 'draft' }) → 返回草稿版本（每门课程都有）
 * - findMany({ status: 'published' }) → 返回已发布版本（仅已发布课程有）
 *
 * 修复：admin 查询显式设置 status: 'draft'，public 查询设置 status: 'published'。
 */
import courseFactory from "../server/src/services/course";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("admin 课程列表 status 参数修复", () => {
  let strapi: any;
  let mockFindMany: jest.Mock;

  beforeEach(() => {
    strapi = createMockStrapi();
    mockFindMany = jest.fn();
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });
  });

  it("admin 查询应显式设置 status: 'draft'", async () => {
    const service = courseFactory({ strapi });
    mockFindMany.mockResolvedValue([]);

    await service.find({}, false, { all: true, channelIds: [] });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany.mock.calls[0][0].status).toBe("draft");
  });

  it("public 查询应设置 status: 'published'", async () => {
    const service = courseFactory({ strapi });
    mockFindMany.mockResolvedValue([]);

    await service.find({}, true, { all: true, channelIds: [], isGuest: true });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany.mock.calls[0][0].status).toBe("published");
  });
});
