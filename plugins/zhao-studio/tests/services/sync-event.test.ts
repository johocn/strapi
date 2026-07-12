import syncEventServiceFactory from "../../server/src/services/sync-event";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Sync Event Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = syncEventServiceFactory({ strapi: mockStrapi });
  });

  describe("list", () => {
    test("filters by siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, sourceTitle: "Article 1", eventStatus: "pending", site: 1 },
      ]);

      const result = await service.list(1, {});

      expect(result).toHaveLength(1);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1 }),
        })
      );
    });

    test("filters by eventStatus", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { eventStatus: "pending" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, eventStatus: "pending" }),
        })
      );
    });

    test("filters by sourceContentType", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { sourceContentType: "article" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, sourceContentType: "article" }),
        })
      );
    });

    test("supports pagination", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { page: 2, pageSize: 10 });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10,
        })
      );
    });
  });

  describe("findOne", () => {
    test("returns single event with populate targetDraftId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", sourceTitle: "Test",
        eventStatus: "pending", targetDraftId: null,
      });

      const result = await service.findOne(1, "doc-1");

      expect(result.sourceTitle).toBe("Test");
      expect(queryMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, documentId: "doc-1" }),
          populate: ["targetDraftId"],
        })
      );
    });
  });

  describe("resolve", () => {
    test("action=create creates new draft and links it", async () => {
      const queryMock = mockStrapi.db.query();
      // findOne sync-event
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
        eventPayload: { content: "Test content", title: "Test" },
      });
      // create article-draft
      queryMock.create.mockResolvedValueOnce({ id: 10, documentId: "draft-1" });
      // update sync-event
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "resolved" });

      const result = await service.resolve(1, "doc-1", { action: "create", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("resolved");
      expect(result.resolvedBy).toBe("admin");
      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            eventStatus: "resolved",
            resolvedAt: expect.any(Date),
            resolvedBy: "admin",
            targetDraftId: "draft-1",
          }),
        })
      );
    });

    test("action=update updates existing draft", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
        eventPayload: { content: "Updated content" },
      });
      // findOne draft
      queryMock.findOne.mockResolvedValueOnce({ id: 10, documentId: "draft-1", title: "Old" });
      // update draft
      queryMock.update.mockResolvedValueOnce({ id: 10 });
      // update sync-event
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "resolved" });

      const result = await service.resolve(1, "doc-1", { action: "update", draftId: "draft-1", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("resolved");
    });

    test("action=ignore marks as ignored", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
      });
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "ignored" });

      const result = await service.resolve(1, "doc-1", { action: "ignore", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("ignored");
      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventStatus: "ignored",
            resolvedBy: "admin",
          }),
        })
      );
    });

    test("throws if sync event not found", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce(null);

      await expect(service.resolve(1, "nonexistent", { action: "ignore" })).rejects.toThrow("Sync event not found");
    });
  });

  describe("createFromWebhook", () => {
    test("creates pending sync event from webhook payload", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", eventStatus: "pending",
        sourceContentType: "article", sourceTitle: "Test Article",
      });

      const result = await service.createFromWebhook({
        sourceContentType: "article",
        sourceDocumentId: "art-1",
        sourceUrl: "/articles/test",
        sourceTitle: "Test Article",
        siteId: 1,
        content: "Test content",
      });

      expect(result.eventStatus).toBe("pending");
      expect(result.sourceTitle).toBe("Test Article");
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: "website",
            sourceContentType: "article",
            sourceDocumentId: "art-1",
            sourceTitle: "Test Article",
            site: 1,
            eventStatus: "pending",
            eventPayload: expect.objectContaining({
              sourceContentType: "article",
              sourceTitle: "Test Article",
            }),
          }),
        })
      );
    });

    test("throws if siteId is missing", async () => {
      await expect(service.createFromWebhook({
        sourceContentType: "article",
        sourceTitle: "Test",
      })).rejects.toThrow("siteId is required");
    });
  });
});