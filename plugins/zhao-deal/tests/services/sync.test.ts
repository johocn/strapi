import { resolveTimeRange } from "../../server/src/services/sync";

describe("resolveTimeRange", () => {
  it("last_24h 返回 24 小时前到现在", () => {
    const r = resolveTimeRange("last_24h");
    expect(r.endTime).toBeInstanceOf(Date);
    expect(r.startTime!.getTime()).toBeLessThan(r.endTime!.getTime());
    const diff = r.endTime!.getTime() - r.startTime!.getTime();
    expect(diff).toBeGreaterThanOrEqual(24 * 3600 * 1000 - 1000);
    expect(diff).toBeLessThanOrEqual(24 * 3600 * 1000 + 1000);
  });

  it("custom 用传入时间", () => {
    const r = resolveTimeRange("custom", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z");
    expect(r.startTime!.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(r.endTime!.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("未知 timeRange 返回 undefined", () => {
    const r = resolveTimeRange("unknown");
    expect(r.startTime).toBeUndefined();
    expect(r.endTime).toBeUndefined();
  });
});
