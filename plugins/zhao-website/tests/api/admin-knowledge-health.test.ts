import { createMockStrapi } from "../helpers/mock-strapi";

function createMockCtx(overrides: Record<string, any> = {}): any {
  return { state: { siteId: 1 }, request: { body: {}, query: {} }, query: {}, params: {}, body: null, status: 200, ...overrides };
}

describe("Admin API - knowledge-health", () => {
  let mockStrapi: any;
  let healthService: any;
  let controller: any;

  beforeEach(() => {
    healthService = {
      completeness: jest.fn().mockResolvedValue({ entities: {}, facts: {}, relations: {} }),
      violations: jest.fn().mockResolvedValue([]),
    };
    mockStrapi = createMockStrapi({
      plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(healthService) }),
    });
    controller = require("../../server/src/controllers/admin-api/knowledge-health").default;
  });

  test("completeness 透传 siteId", async () => {
    const ctx = createMockCtx();
    await controller.completeness(ctx);
    expect(healthService.completeness).toHaveBeenCalledWith(1);
    expect(ctx.body).toEqual({ entities: {}, facts: {}, relations: {} });
  });

  test("violations 透传 siteId", async () => {
    const ctx = createMockCtx();
    await controller.violations(ctx);
    expect(healthService.violations).toHaveBeenCalledWith(1);
    expect(ctx.body).toEqual([]);
  });
});