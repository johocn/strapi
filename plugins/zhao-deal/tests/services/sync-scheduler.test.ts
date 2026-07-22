import schedulerFactory from "../../server/src/services/sync-scheduler";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("SyncScheduler", () => {
  it("shouldRunNow 对未来 cron 返回 false", async () => {
    const get = jest.fn().mockResolvedValue(new Date().toISOString());
    const set = jest.fn();
    const mockStrapi = createMockStrapi({
      store: jest.fn().mockReturnValue({ get, set }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.shouldRunNow("taobao", "0 0 1 1 2099");
    expect(result).toBe(false);
  });

  it("shouldRunNow 对无效 cron 返回 false", async () => {
    const mockStrapi = createMockStrapi({
      store: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.shouldRunNow("taobao", "invalid-cron");
    expect(result).toBe(false);
  });

  it("shouldRunNow 空 syncCron 返回 false", async () => {
    const mockStrapi = createMockStrapi();
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.shouldRunNow("taobao", "");
    expect(result).toBe(false);
  });
});
