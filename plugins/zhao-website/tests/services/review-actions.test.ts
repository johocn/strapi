import { applyReview } from "../../server/src/services/utils/review-actions";
import { createMockStrapi } from "../helpers/mock-strapi";

const UID = "plugin::zhao-website.knowledge-entity";

describe("review-actions", () => {
  let mockStrapi: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
  });

  test("approve → verified + version+1 + strict 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 2, verificationStatus: "pending" });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3",
      action: "approve", actor: { id: 7, label: "alice" },
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ verificationStatus: "verified", version: 3 }) })
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approve", version: 3, strict: true, targetId: "doc-3" })
    );
  });

  test("reject 缺理由 → 400 REASON_REQUIRED 且不写库", async () => {
    const queryMock = mockStrapi.db.query();

    await expect(
      applyReview(mockStrapi, {
        uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3", action: "reject", actor: { id: 7 } ,
      })
    ).rejects.toMatchObject({ status: 400, code: "REASON_REQUIRED" });
    expect(queryMock.update).not.toHaveBeenCalled();
  });

  test("submit → pending", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 1 });

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3", action: "submit",
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "pending", version: 2 }) })
    );
  });

  test("记录不存在 → 404", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      applyReview(mockStrapi, { uid: UID, targetType: "entity", siteId: 1, documentId: "missing", action: "approve" })
    ).rejects.toMatchObject({ status: 404 });
  });

  test("extraData 透传（verifiedBy）", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 1 });

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3",
      action: "approve", extraData: { verifiedBy: 7 },
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verifiedBy: 7 }) })
    );
  });
});