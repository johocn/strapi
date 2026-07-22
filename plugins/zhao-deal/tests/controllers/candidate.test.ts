import candidateControllerFactory from "../../server/src/controllers/candidate";

describe("Candidate Controller", () => {
  it("approve 成功返回 wrap", async () => {
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          approveCouponCandidate: jest.fn().mockResolvedValue({ documentId: "c1" }),
        }),
      }),
    };
    const ctx: any = { params: { documentId: "d1" } };
    const ctrl = candidateControllerFactory({ strapi: mockStrapi as any });
    await ctrl.approve(ctx);
    expect(ctx.body.data.documentId).toBe("c1");
  });

  it("approve 候选不存在返回 404", async () => {
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          approveCouponCandidate: jest.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "DEAL_CANDIDATE_NOT_FOUND" })),
        }),
      }),
    };
    const ctx: any = { params: { documentId: "d1" } };
    const ctrl = candidateControllerFactory({ strapi: mockStrapi as any });
    await ctrl.approve(ctx);
    expect(ctx.status).toBe(404);
  });

  it("batchApprove 处理多个候选（含失败）", async () => {
    const approveCouponCandidate = jest.fn()
      .mockResolvedValueOnce({ documentId: "c1" })
      .mockRejectedValueOnce(Object.assign(new Error("已导入"), { code: "DEAL_CANDIDATE_ALREADY_IMPORTED" }));
    const mockStrapi = {
      plugin: () => ({
        service: () => ({
          approveCouponCandidate,
        }),
      }),
    };
    const ctx: any = { request: { body: { documentIds: ["d1", "d2"] } } };
    const ctrl = candidateControllerFactory({ strapi: mockStrapi as any });
    await ctrl.batchApprove(ctx);
    expect(ctx.body.data).toHaveLength(2);
    expect(ctx.body.data[1]).toHaveProperty("error");
  });
});
