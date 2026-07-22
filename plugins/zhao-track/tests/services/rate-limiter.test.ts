import rateLimiterFactory from "../../server/src/services/rate-limiter";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("RateLimiter", () => {
  it("内存模式：60 秒内同设备+同券第二次拒绝", async () => {
    const mockStrapi = createMockStrapi();
    const svc = rateLimiterFactory({ strapi: mockStrapi as any });
    (svc as any)._resetMemory();
    const r1 = await svc.checkAndRecord("fp1", "c1");
    const r2 = await svc.checkAndRecord("fp1", "c1");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(false);
  });

  it("内存模式：不同设备或不同券允许", async () => {
    const mockStrapi = createMockStrapi();
    const svc = rateLimiterFactory({ strapi: mockStrapi as any });
    (svc as any)._resetMemory();
    await svc.checkAndRecord("fp1", "c1");
    const r2 = await svc.checkAndRecord("fp2", "c1");
    const r3 = await svc.checkAndRecord("fp1", "c2");
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("Redis 模式：get 命中则拒绝", async () => {
    const redis = { get: jest.fn().mockResolvedValue("1"), set: jest.fn() };
    const mockStrapi = createMockStrapi({ redis });
    const svc = rateLimiterFactory({ strapi: mockStrapi as any });
    const r = await svc.checkAndRecord("fp1", "c1");
    expect(r.allowed).toBe(false);
    expect(redis.get).toHaveBeenCalledWith("click_rate:fp1:c1");
  });

  it("Redis 模式：get 返回 null 则允许并 set TTL", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const mockStrapi = createMockStrapi({ redis });
    const svc = rateLimiterFactory({ strapi: mockStrapi as any });
    const r = await svc.checkAndRecord("fp1", "c1");
    expect(r.allowed).toBe(true);
    expect(redis.set).toHaveBeenCalledWith("click_rate:fp1:c1", "1", "EX", 60);
  });
});
