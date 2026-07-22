import cronConfig from "../../server/src/config/cron";

describe("zhao-track cron config", () => {
  it("包含 2 个 cron 任务", () => {
    const keys = Object.keys(cronConfig);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("*/1 * * * *");
    expect(keys).toContain("0 3 * * *");
  });

  it("每分钟任务调用 order-sync-scheduler.run", async () => {
    const run = jest.fn().mockResolvedValue({ processed: 0 });
    const strapi: any = {
      plugin: () => ({ service: (name: string) => name === "order-sync-scheduler" ? { run } : null }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["*/1 * * * *"];
    await task({ strapi });
    expect(run).toHaveBeenCalled();
  });

  it("每日 03:00 任务调用 attribution.run", async () => {
    const run = jest.fn().mockResolvedValue({ total: 0, matched: 0, unmatched: 0 });
    const strapi: any = {
      plugin: () => ({ service: (name: string) => name === "attribution" ? { run } : null }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["0 3 * * *"];
    await task({ strapi });
    expect(run).toHaveBeenCalled();
  });

  it("service 不可用时不抛错", async () => {
    const strapi: any = {
      plugin: () => ({ service: () => null }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["*/1 * * * *"];
    await expect(task({ strapi })).resolves.not.toThrow();
  });
});
