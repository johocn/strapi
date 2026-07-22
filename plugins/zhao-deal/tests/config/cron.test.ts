import cronConfig from "../../server/src/config/cron";

describe("zhao-deal cron config", () => {
  it("包含 1 个 cron 任务（每小时检查）", () => {
    const keys = Object.keys(cronConfig);
    expect(keys).toHaveLength(1);
    expect(keys).toContain("0 * * * *");
  });

  it("每小时任务调用 sync-scheduler.run", async () => {
    const run = jest.fn().mockResolvedValue({ processed: 0 });
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "sync-scheduler" ? { run } : null,
      }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await task({ strapi });
    expect(run).toHaveBeenCalled();
  });

  it("service 不可用时不抛错", async () => {
    const strapi: any = {
      plugin: () => ({ service: () => null }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await expect(task({ strapi })).resolves.not.toThrow();
  });

  it("run() 抛错时被捕获并 warn（不向上抛）", async () => {
    const run = jest.fn().mockRejectedValue(new Error("db connection lost"));
    const warn = jest.fn();
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "sync-scheduler" ? { run } : null,
      }),
      log: { warn, info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await expect(task({ strapi })).resolves.not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
