import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockEarnPoints = jest.fn();
const mockStrapi: any = {
  db: { query: mockQuery },
  plugin: (name: string) => ({
    service: () => ({
      earnPoints: mockEarnPoints,
    }),
  }),
  log: { info: jest.fn(), error: jest.fn() },
};

describe("referral-engine", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEarnPoints.mockReset();
  });

  it("generateCode 应生成 REF 前缀的 11 位码", async () => {
    const factory = require("../server/src/services/referral-engine");
    const svc = factory({ strapi: mockStrapi });
    const code = await svc.generateCode(1, { name: "test", contact: "123" });
    expect(code).toMatch(/^REF\d{8}$/);
  });

  it("validateCode 推荐码不存在返回 invalid", async () => {
    const factory = require("../server/src/services/referral-engine");
    const svc = factory({ strapi: mockStrapi });
    mockQuery.mockReturnValue({ findOne: async () => null });
    const result = await svc.validateCode(1, "INVALID");
    expect(result.valid).toBe(false);
  });

  it("markConverted 推荐记录不存在时抛错", async () => {
    const factory = require("../server/src/services/referral-engine");
    const svc = factory({ strapi: mockStrapi });
    mockQuery.mockReturnValue({ findOne: async () => null, update: async () => ({}) });
    await expect(svc.markConverted(1, "nope", "ord1", 100)).rejects.toThrow("推荐记录不存在");
  });

  it("markConverted 成功且推荐人为注册用户时调 earnPoints", async () => {
    const factory = require("../server/src/services/referral-engine");
    const svc = factory({ strapi: mockStrapi });
    const referral = { documentId: "r1", rewardType: "points", referrerCustomerId: "42", rewardAmount: 50 };
    mockQuery.mockReturnValue({
      findOne: async () => referral,
      update: async () => ({}),
    });
    mockEarnPoints.mockResolvedValue({});
    await svc.markConverted(1, "r1", "ord1", 1000);
    expect(mockEarnPoints).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, action: "referral_convert" }));
  });
});
