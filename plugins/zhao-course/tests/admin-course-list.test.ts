/**
 * Bug 复现：admin 用户只能看到部分课程
 *
 * 根因：Strapi v5 D&P 机制下，每门课程都有 draft 版本（无论是否发布）。
 * admin 接口若走 documents API，未设置 status 时默认返回 draft，但之前代码用 undefined 导致行为不一致。
 *
 * 规范（zhao-course-使用手册.md 14.11）：
 * - findMany({ status: 'draft' }) → 返回草稿版本（每门课程都有）
 * - findMany({ status: 'published' }) → 返回已发布版本（仅已发布课程有）
 *
 * 现行实现：
 * - admin（channelScope.all=true 且非游客）→ 走 db.query 绕过 D&P，查询 deletedAt=null 的全部行，
 *   再按 documentId 去重并优先保留草稿行（publishedAt=null）。
 * - 非 admin（含游客）→ 走 documents API，status = publicOnly ? 'published' : 'draft'。
 */
import courseFactory from "../server/src/services/course";
import { createMockStrapi } from "./helpers/mock-strapi";

describe("admin 课程列表 status 参数修复", () => {
  let strapi: any;
  let mockFindMany: jest.Mock;
  let mockDbFindMany: jest.Mock;

  beforeEach(() => {
    strapi = createMockStrapi();
    mockFindMany = jest.fn();
    mockDbFindMany = jest.fn();
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });
    strapi.db.query = jest.fn().mockReturnValue({ findMany: mockDbFindMany });
  });

  it("admin 查询应绕过 D&P，通过 db.query 取回全部版本并优先保留草稿", async () => {
    const service = courseFactory({ strapi });
    const publishedRow = { documentId: "d1", title: "课程A", publishedAt: "2024-01-01T00:00:00.000Z" };
    const draftRow = { documentId: "d1", title: "课程A", publishedAt: null };
    mockDbFindMany.mockResolvedValue([publishedRow, draftRow]);

    const result = await service.find({}, false, {
      channelScope: { all: true, channelIds: [] },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
    });

    // admin 不再走 documents API（D&P）
    expect(strapi.documents).not.toHaveBeenCalled();
    expect(mockDbFindMany).toHaveBeenCalledTimes(1);
    // 同一 documentId 的多行折叠为 1 门课程，且保留草稿行
    expect(result.list).toHaveLength(1);
    expect(result.list[0].publishedAt).toBeNull();
  });

  it("public 查询应设置 status: 'published'", async () => {
    const service = courseFactory({ strapi });
    mockFindMany.mockResolvedValue([]);

    await service.find({}, true, {
      channelScope: { all: true, channelIds: [], isGuest: true },
      mergedChannelIds: [],
      siteChannelIds: [],
      crossChannelEnabled: true,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany.mock.calls[0][0].status).toBe("published");
  });
});

describe("admin 课程列表不应被 siteChannelId 过滤", () => {
  let strapi: any;
  let mockFindMany: jest.Mock;
  let mockDbFindMany: jest.Mock;

  beforeEach(() => {
    strapi = createMockStrapi();
    mockFindMany = jest.fn();
    mockDbFindMany = jest.fn();
    strapi.documents = jest.fn().mockReturnValue({ findMany: mockFindMany });
    strapi.db.query = jest.fn().mockReturnValue({ findMany: mockDbFindMany });
  });

  it("admin (channelScope.all=true) + siteChannelId 设置时，应返回所有课程", async () => {
    const service = courseFactory({ strapi });
    const allCourse = { documentId: "d1", title: "全渠道课程", channelScope: "all", channelIds: [] };
    const specificCourseA = { documentId: "d2", title: "站点A课程", channelScope: "specific", channelIds: [1] };
    const specificCourseB = { documentId: "d3", title: "站点B课程", channelScope: "specific", channelIds: [2] };

    mockDbFindMany.mockResolvedValue([allCourse, specificCourseA, specificCourseB]);

    // admin 全渠道，但 siteChannelId=1（多租户场景）
    const result = await service.find({}, false, {
      channelScope: { all: true, channelIds: [] },
      mergedChannelIds: [],
      siteChannelIds: [1],
      crossChannelEnabled: true,
    });

    // admin 分支不受 siteChannelIds 影响，返回全部课程
    expect(result.list).toHaveLength(3);
  });

  it("非 admin 用户 + siteChannelId 设置时，仍应按 siteChannelId 过滤 specific 课程", async () => {
    const service = courseFactory({ strapi });
    const allCourse = { documentId: "d1", title: "全渠道课程", channelScope: "all", channelIds: [] };
    const specificCourseA = { documentId: "d2", title: "站点A课程", channelScope: "specific", channelIds: [1] };
    const specificCourseB = { documentId: "d3", title: "站点B课程", channelScope: "specific", channelIds: [2] };

    mockFindMany.mockResolvedValue([allCourse, specificCourseA, specificCourseB]);

    // 非 admin，渠道范围=[1]，siteChannelId=1
    const result = await service.find({}, false, {
      channelScope: { all: false, channelIds: [1] },
      mergedChannelIds: [1],
      siteChannelIds: [1],
      crossChannelEnabled: true,
    });

    // specific 课程中只有 channelIds 包含 1 的保留
    const titles = result.list.map((c: any) => c.title);
    expect(titles).toContain("全渠道课程");
    expect(titles).toContain("站点A课程");
    expect(titles).not.toContain("站点B课程");
  });
});