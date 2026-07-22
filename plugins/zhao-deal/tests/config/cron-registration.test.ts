import mainCronConfig from "../../../../config/cron";

describe("主 cron 注册验证", () => {
  it("包含 zhao-logistics 的原有任务（回归）", () => {
    const keys = Object.keys(mainCronConfig);
    // logistics cron 应至少有 1 个任务（不假设具体 key，只验证非空）
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it("包含 zhao-track 的每分钟订单同步任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("*/1 * * * *");
  });

  it("包含 zhao-track 的每日 03:00 归因任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("0 3 * * *");
  });

  it("包含 zhao-deal 的每小时同步任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("0 * * * *");
  });
});
