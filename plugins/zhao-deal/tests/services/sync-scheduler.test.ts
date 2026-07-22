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

  // ========== run() 方法测试 ==========

  it("run() 无平台时返回 processed=0", async () => {
    const mockStrapi = createMockStrapi();
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 0 });
  });

  it("run() shouldRunNow 返回 false 时返回 processed=0", async () => {
    // shouldRunNow 因 syncCron 为空返回 false
    const findMany = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation(() => ({ findMany }));
    const mockStrapi = createMockStrapi({ documents });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 0 });
  });

  it("run() shouldRunNow 返回 true 时调用 syncPlatformData 两次并返回 processed=1", async () => {
    // 构造 shouldRunNow 返回 true：lastRun 为 epoch 0，syncCron 设为每分钟
    const now = new Date();
    const epoch = new Date(0);
    const get = jest.fn().mockResolvedValue(epoch.toISOString());
    const set = jest.fn();
    const syncPlatformData = jest.fn()
      .mockResolvedValueOnce({ fetched: 5, created: 3, updated: 2 })
      .mockResolvedValueOnce({ fetched: 10, created: 6, updated: 4 });
    const findManyPlatforms = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation((uid: string) => ({
      findMany: uid === "plugin::zhao-deal.platform" ? findManyPlatforms : jest.fn().mockResolvedValue([]),
    }));
    const mockStrapi = createMockStrapi({
      documents,
      store: jest.fn().mockReturnValue({ get, set }),
      plugin: jest.fn().mockReturnValue({
        service: (name: string) => name === "sync" ? { syncPlatformData } : null,
      }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 1 });
    expect(syncPlatformData).toHaveBeenCalledTimes(2);
    expect(syncPlatformData).toHaveBeenNthCalledWith(1, { platformCode: "taobao", type: "coupons" });
    expect(syncPlatformData).toHaveBeenNthCalledWith(2, { platformCode: "taobao", type: "products" });
  });

  it("run() 单平台失败不影响其他平台（错误隔离）", async () => {
    const epoch = new Date(0);
    const get = jest.fn().mockResolvedValue(epoch.toISOString());
    const set = jest.fn();
    const syncPlatformData = jest.fn()
      // 第一个平台 coupons 同步抛错
      .mockRejectedValueOnce(new Error("network error"))
      // 第一个平台 products 同步抛错
      .mockRejectedValueOnce(new Error("network error"))
      // 第二个平台 coupons 同步成功
      .mockResolvedValueOnce({ fetched: 1, created: 1, updated: 0 })
      // 第二个平台 products 同步成功
      .mockResolvedValueOnce({ fetched: 2, created: 2, updated: 0 });
    const findManyPlatforms = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
      { code: "pdd", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation((uid: string) => ({
      findMany: uid === "plugin::zhao-deal.platform" ? findManyPlatforms : jest.fn().mockResolvedValue([]),
    }));
    const mockStrapi = createMockStrapi({
      documents,
      store: jest.fn().mockReturnValue({ get, set }),
      plugin: jest.fn().mockReturnValue({
        service: (name: string) => name === "sync" ? { syncPlatformData } : null,
      }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 1 });
    expect(syncPlatformData).toHaveBeenCalledTimes(4);
  });
});
