import contentApi from "../../server/src/routes/content-api";
import adminApi from "../../server/src/routes/admin-api";

describe("zhao-track routes", () => {
  it("content-api 包含 6 条路由，2 公开 4 登录", () => {
    const result = contentApi();
    expect(result.type).toBe("content-api");
    expect(result.routes).toHaveLength(6);
    const publicRoutes = result.routes.filter((r: any) => r.config.policies === undefined);
    expect(publicRoutes).toHaveLength(2);
    const userRoutes = result.routes.filter((r: any) => r.config.policies?.includes("plugin::zhao-auth.is-authenticated"));
    expect(userRoutes).toHaveLength(4);
  });

  it("content-api /click 与 /source/identify 为公开", () => {
    const result = contentApi();
    const paths = result.routes.filter((r: any) => r.config.policies === undefined).map((r: any) => r.path);
    expect(paths).toContain("/v1/zhao-track/click");
    expect(paths).toContain("/v1/zhao-track/source/identify");
  });

  it("admin-api 包含 2 条 admin 路由", () => {
    const result = adminApi();
    expect(result.type).toBe("admin");
    expect(result.routes).toHaveLength(2);
    const paths = result.routes.map((r: any) => r.path);
    expect(paths).toContain("/v1/admin/zhao-track/sync/trigger");
    expect(paths).toContain("/v1/admin/zhao-track/attribution/run");
  });
});
