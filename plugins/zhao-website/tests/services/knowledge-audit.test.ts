import auditServiceFactory, { auditSafe } from "../../server/src/services/knowledge-audit";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Audit Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = auditServiceFactory({ strapi: mockStrapi });
  });

  test("append 写入流水：actor 快照进 actorId/actorLabel", async () => {
    const queryMock = mockStrapi.db.query();

    await service.append({
      siteId: 1,
      targetType: "entity",
      targetId: "doc-1",
      action: "update",
      actor: { id: 7, label: "alice" },
      changedFields: { name: { before: "A", after: "B" } },
      version: 2,
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          site: 1,
          targetType: "entity",
          targetId: "doc-1",
          action: "update",
          actorId: "7",
          actorLabel: "alice",
          version: 2,
        }),
      })
    );
  });

  test("append 系统动作：无 actor → actorId/actorLabel 为 null，可用 actorLabel 覆盖", async () => {
    const queryMock = mockStrapi.db.query();

    await service.append({
      siteId: 1, targetType: "relation", targetId: "rel-1", action: "recheck", actorLabel: "system",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actorId: null, actorLabel: "system" }) })
    );
  });

  test("append strict=false 写失败不阻塞，返回 null 并 warn", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockRejectedValueOnce(new Error("db down"));

    const res = await service.append({ siteId: 1, targetType: "entity", targetId: "d", action: "create" });

    expect(res).toBeNull();
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });

  test("append strict=true 写失败抛 500 AUDIT_WRITE_FAILED", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockRejectedValueOnce(new Error("db down"));

    await expect(
      service.append({ siteId: 1, targetType: "entity", targetId: "d", action: "approve", strict: true })
    ).rejects.toMatchObject({ status: 500, code: "AUDIT_WRITE_FAILED" });
  });

  test("findByTarget 租户+全局命中，倒序分页", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([{ id: 1 }]);
    queryMock.count.mockResolvedValueOnce(1);

    const res = await service.findByTarget(1, "entity", "doc-1", { page: 2, pageSize: 5 });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          targetType: "entity",
          targetId: "doc-1",
          deletedAt: null,
          $or: [{ site: 1 }, { site: null }],
        }),
        orderBy: { createdAt: "DESC" },
        limit: 5,
        offset: 5,
      })
    );
    expect(res.pagination).toEqual({ page: 2, pageSize: 5, total: 1 });
  });

  test("auditSafe 吞掉异常只 warn", async () => {
    const svc = { append: jest.fn().mockRejectedValue(new Error("boom")) };
    mockStrapi.plugin = jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(svc) });

    await expect(
      auditSafe(mockStrapi, { siteId: 1, targetType: "entity", targetId: "d", action: "update" })
    ).resolves.toBeUndefined();
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });
});