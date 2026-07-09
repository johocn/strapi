import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockStrapi: any = {
  db: { query: mockQuery },
};

describe("customer-aggregator", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("upsert 已有档案时按 phone 匹配并更新空字段", async () => {
    const factory = require("../server/src/services/customer-aggregator");
    const svc = factory({ strapi: mockStrapi });
    const existing = { documentId: "p1", name: "旧名", contactPhone: "13800000000", contactEmail: null, customerType: "individual" };
    mockQuery.mockReturnValue({
      findOne: async () => existing,
      update: async (opts: any) => ({ ...existing, ...opts.data }),
    });
    const result = await svc.upsert(1, { name: "新名", contactPhone: "13800000000", contactEmail: "new@test.com" });
    expect(result.contactEmail).toBe("new@test.com");
  });

  it("upsert 无匹配时创建新档案", async () => {
    const factory = require("../server/src/services/customer-aggregator");
    const svc = factory({ strapi: mockStrapi });
    mockQuery.mockReturnValue({
      findOne: async () => null,
      create: async (opts: any) => ({ documentId: "new", ...opts.data }),
    });
    const result = await svc.upsert(1, { name: "新客户", contactPhone: "13900000000" });
    expect(result.name).toBe("新客户");
    expect(result.lifecycleStage).toBe("lead");
  });

  it("_computeStage 5 单以上为 vip", () => {
    const factory = require("../server/src/services/customer-aggregator");
    const svc = factory({ strapi: mockStrapi });
    expect(svc._computeStage(10, 5)).toBe("vip");
    expect(svc._computeStage(10, 2)).toBe("repeat");
    expect(svc._computeStage(5, 1)).toBe("active");
    expect(svc._computeStage(0, 0)).toBe("lead");
  });
});
