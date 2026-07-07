import articleServiceFactory from "../../server/src/services/article";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Article Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = articleServiceFactory({ strapi: mockStrapi });
  });

  test("find 默认只查 published", async () => {
    const queryMock = mockStrapi.db.query();
    await service.find(1, {});
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });

  test("find 带 tag 参数 → 调用 knex whereIn", async () => {
    mockStrapi.db.connection.whereIn.mockResolvedValue([
      { article_id: 10 },
      { article_id: 20 },
    ]);
    const queryMock = mockStrapi.db.query();

    await service.find(1, { tag: "tag-1,tag-2" });

    expect(mockStrapi.db.connection.select).toHaveBeenCalledWith("article_id");
    expect(mockStrapi.db.connection.from).toHaveBeenCalledWith("zhao_website_articles_tags_lnk");
    expect(mockStrapi.db.connection.whereIn).toHaveBeenCalledWith("tag_id", ["tag-1", "tag-2"]);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { $in: [10, 20] },
        }),
      })
    );
  });

  test("find tag 无匹配 → 短路返回 []，不查主表", async () => {
    mockStrapi.db.connection.whereIn.mockResolvedValue([]);
    const queryMock = mockStrapi.db.query();

    const result = await service.find(1, { tag: "nonexistent" });

    expect(result).toEqual([]);
    expect(queryMock.findMany).not.toHaveBeenCalled();
  });

  test("find 带 exclude 参数 → 主查询使用 $notIn", async () => {
    const queryMock = mockStrapi.db.query();
    // 第一次调用 findMany 是 exclude 的 documentId → id 查询
    queryMock.findMany.mockResolvedValueOnce([{ id: 99 }]);

    await service.find(1, { exclude: "doc-exclude-1" });

    const lastCall = queryMock.findMany.mock.calls[queryMock.findMany.mock.calls.length - 1][0];
    expect(lastCall.where.id).toEqual(expect.objectContaining({ $notIn: [99] }));
  });

  test("findOne 只返回 published", async () => {
    const queryMock = mockStrapi.db.query();
    await service.findOne(1, "test-slug");
    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });

  test("create 调用写入 status: draft（默认）", async () => {
    const queryMock = mockStrapi.db.query();
    // findOne 返回 null（slug 不冲突 + firstTruthValidate 查空）
    queryMock.findOne.mockResolvedValue(null);

    await service.create(1, { title: "Test", content: "Hello" });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft", site: 1 }),
      })
    );
  });

  test("publish 调用 update 并设 status: published + publishedAt", async () => {
    const queryMock = mockStrapi.db.query();
    // findOneAdmin 返回已存在文章
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5", slug: "test" });

    await service.publish(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ status: "published" }),
      })
    );
    const updateCall = queryMock.update.mock.calls[0][0];
    expect(updateCall.data.publishedAt).toBeDefined();
  });

  test("softDelete 设置 deletedAt", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ id: 5, documentId: "doc-5" });

    await service.softDelete(1, "doc-5");

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ deletedAt: expect.any(String) }),
      })
    );
  });
});
