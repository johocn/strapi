import bvServiceFactory from "../../server/src/services/brand-voice";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Brand Voice Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = bvServiceFactory({ strapi: mockStrapi });
  });

  describe("findAdmin", () => {
    test("uses $or to merge global and tenant brand voices", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Slogan", site: null, category: "tone" },
        { id: 2, name: "Tenant CTA", site: 1, category: "cta" },
      ]);

      const result = await service.findAdmin(1, { page: 1, pageSize: 20 });

      expect(result).toHaveLength(2);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null }),
              expect.objectContaining({ site: null, deletedAt: null }),
            ],
          }),
        })
      );
    });

    test("filters by category", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.findAdmin(1, { category: "tone" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null, category: "tone" }),
              expect.objectContaining({ site: null, deletedAt: null, category: "tone" }),
            ],
          }),
        })
      );
    });

    test("filters by status", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.findAdmin(1, { status: true });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null, status: true }),
              expect.objectContaining({ site: null, deletedAt: null, status: true }),
            ],
          }),
        })
      );
    });

    test("supports null siteId for global-only query", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Slogan", site: null },
      ]);

      const result = await service.findAdmin(null, {});

      expect(result).toHaveLength(1);
    });
  });

  describe("findOneAdmin", () => {
    test("returns tenant first, global as fallback", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, name: "Global", site: null, documentId: "doc-1" });

      const result = await service.findOneAdmin(1, "doc-1");

      expect(result.name).toBe("Global");
      expect(queryMock.findOne).toHaveBeenCalledTimes(2);
      expect(queryMock.findOne).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, documentId: "doc-1", deletedAt: null }),
        })
      );
      expect(queryMock.findOne).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: expect.objectContaining({ site: null, documentId: "doc-1", deletedAt: null }),
        })
      );
    });

    test("returns tenant when both exist", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 2, name: "Tenant", site: 1, documentId: "doc-1" });

      const result = await service.findOneAdmin(1, "doc-1");

      expect(result.name).toBe("Tenant");
      expect(queryMock.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("create", () => {
    test("creates tenant brand voice with siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Slogan", site: 1 });

      const result = await service.create(1, { name: "Slogan", category: "tone", content: "Hello" });

      expect(result.site).toBe(1);
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Slogan", site: 1 }),
        })
      );
    });

    test("creates global brand voice with null siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Global Slogan", site: null });

      const result = await service.create(null, { name: "Global Slogan", category: "tone", content: "Hello" });

      expect(result.site).toBeNull();
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Global Slogan", site: null }),
        })
      );
    });
  });

  describe("update", () => {
    test("updates existing tenant brand voice", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: 1, content: "Old" });

      await service.update(1, "doc-5", { content: "New" });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ content: "New" }),
        })
      );
    });

    test("throws 404 if not found in tenant, tries global", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null, content: "Old" });

      await service.update(1, "doc-5", { content: "New" });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ content: "New" }),
        })
      );
    });

    test("throws if not found in tenant or global", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.update(1, "nonexistent", { content: "New" })).rejects.toThrow("Brand voice not found");
    });
  });

  describe("softDelete", () => {
    test("soft deletes tenant brand voice", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: 1 });

      await service.softDelete(1, "doc-5");

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    test("soft deletes global brand voice with null siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

      await service.softDelete(null, "doc-5");

      expect(queryMock.update).toHaveBeenCalled();
    });
  });

  describe("listByCategory", () => {
    test("merges global and tenant by category with status=true", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Tone", site: null, category: "tone", status: true },
        { id: 2, name: "Tenant Tone", site: 1, category: "tone", status: true },
      ]);

      const result = await service.listByCategory(1, "tone");

      expect(result).toHaveLength(2);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, category: "tone", status: true, deletedAt: null }),
              expect.objectContaining({ site: null, category: "tone", status: true, deletedAt: null }),
            ],
          }),
        })
      );
    });
  });

  describe("resolveVariables", () => {
    test("replaces {{variable}} placeholders", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{name}}, welcome to {{company}}!",
        variables: [{ name: "name", defaultValue: "User" }, { name: "company", defaultValue: "Acme" }],
      });

      const result = await service.resolveVariables(1, "doc-1", { name: "Alice" });

      expect(result).toBe("Hello Alice, welcome to Acme!");
    });

    test("uses default values when variable not provided", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{name}}!",
        variables: [{ name: "name", defaultValue: "Guest" }],
      });

      const result = await service.resolveVariables(1, "doc-1", {});

      expect(result).toBe("Hello Guest!");
    });

    test("leaves unknown placeholders as-is", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{unknown}}!",
        variables: [],
      });

      const result = await service.resolveVariables(1, "doc-1", {});

      expect(result).toBe("Hello {{unknown}}!");
    });
  });

  describe("getRefContent", () => {
    test("returns all enabled voices in category as reference text", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Tone 1", content: "Be professional.", category: "tone", site: null },
        { id: 2, name: "Tone 2", content: "Be friendly.", category: "tone", site: 1 },
      ]);

      const result = await service.getRefContent(1, "tone");

      expect(result).toContain("Be professional.");
      expect(result).toContain("Be friendly.");
    });
  });
});