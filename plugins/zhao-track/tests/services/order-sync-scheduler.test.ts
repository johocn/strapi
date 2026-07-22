import schedulerFactory from "../../server/src/services/order-sync-scheduler";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("OrderSyncScheduler", () => {
  it("shouldRunNow: 首次运行返回 true 并写入 lastRun", async () => {
    const storeGet = jest.fn().mockResolvedValue(null);
    const storeSet = jest.fn();
    const mockStrapi = createMockStrapi();
    mockStrapi.store.mockReturnValue({ get: storeGet, set: storeSet });
    mockStrapi.documents.mockReturnValue({ findMany: jest.fn().mockResolvedValue([]) });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const should = await svc.shouldRunNow("taobao", "0 */2 * * *");
    expect(should).toBe(true);
    expect(storeSet).toHaveBeenCalledWith(expect.objectContaining({ key: "sync_last_run::taobao" }));
  });

  it("run: 遍历启用平台，shouldRunNow=false 的跳过", async () => {
    const mockStrapi = createMockStrapi();
    mockStrapi.store.mockReturnValue({ get: jest.fn().mockResolvedValue(new Date().toISOString()), set: jest.fn() });
    mockStrapi.documents.mockImplementation((uid: string) => {
      if (uid === "plugin::zhao-deal.platform") return {
        findMany: jest.fn().mockResolvedValue([{ code: "taobao", syncEnabled: true, syncCron: "0 */2 * * *" }]),
      };
      return { findMany: jest.fn().mockResolvedValue([]) };
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result.processed).toBe(0);
  });

  it("run: 平台加载失败不抛错，返回 processed=0", async () => {
    const mockStrapi = createMockStrapi();
    mockStrapi.store.mockReturnValue({ get: jest.fn(), set: jest.fn() });
    mockStrapi.documents.mockImplementation(() => { throw new Error("db down"); });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result.processed).toBe(0);
  });
});
