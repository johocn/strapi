import contentApiRoutes from "../server/src/routes/content-api/index";
import adminRoutes from "../server/src/routes/admin/index";

const contentApi = contentApiRoutes();
const admin = adminRoutes();

type Route = { method: string; path: string; handler: string; config: any };

const routes = contentApi.routes as Route[];

const getRoute = (method: string, path: string) =>
  routes.find((r) => r.method === method && r.path === path);

const getMiddleware = (route: Route) => route.config?.middlewares?.[0];

const getPolicies = (route: Route) => {
  const mw = getMiddleware(route);
  return mw?.config?.policies ?? [];
};

const hasPolicy = (route: Route, name: string) =>
  getPolicies(route).some((p: any) => p.name === name);

describe("三层路由 — 基础结构", () => {
  test("content-api 路由类型应为 content-api", () => {
    expect(contentApi.type).toBe("content-api");
  });

  test("admin 路由类型应为 admin", () => {
    expect(admin.type).toBe("admin");
  });

  test("content-api 应包含 19 条路由", () => {
    expect(routes.length).toBe(19);
  });

  test("所有路由应包含 method / path / handler / config", () => {
    routes.forEach((r) => {
      expect(r.method).toBeDefined();
      expect(r.path).toBeDefined();
      expect(r.handler).toBeDefined();
      expect(r.config).toBeDefined();
    });
  });

  test("所有路由 path 应以 /v1 开头", () => {
    routes.forEach((r) => {
      expect(r.path).toMatch(/^\/v1/);
    });
  });

  test("所有路由 auth 应为 false", () => {
    routes.forEach((r) => {
      expect(r.config.auth).toBe(false);
    });
  });
});

describe("三层路由 — 公开层 (/v1，无认证)", () => {
  const publicPaths = [
    { method: "GET", path: "/v1/channel/public/:id", handler: "channel.getPublic" },
    { method: "POST", path: "/v1/channel/validate/public", handler: "channel.validatePublic" },
    { method: "POST", path: "/v1/channel/register/public", handler: "channel.registerPublic" },
  ];

  publicPaths.forEach(({ method, path, handler }) => {
    test(`${method} ${path} 应存在且无中间件`, () => {
      const route = getRoute(method, path);
      expect(route).toBeDefined();
      expect(route!.handler).toBe(handler);
      expect(route!.config.middlewares).toBeUndefined();
    });
  });
});

describe("三层路由 — 用户层 (/v1/my，需认证)", () => {
  const userPaths = [
    { method: "GET", path: "/v1/my/channels", handler: "channel.find" },
    { method: "POST", path: "/v1/my/channel/register", handler: "channel.register" },
    { method: "POST", path: "/v1/my/channel/validate", handler: "channel.validate" },
    { method: "GET", path: "/v1/my/channels/accessible", handler: "channel-permission.getUserChannels" },
    { method: "GET", path: "/v1/my/invite/chain", handler: "user-invite.getMyChain" },
    { method: "GET", path: "/v1/my/invite/downstream", handler: "user-invite.getMyDownstream" },
    { method: "GET", path: "/v1/my/invite/stats", handler: "user-invite.getMyStats" },
  ];

  userPaths.forEach(({ method, path, handler }) => {
    test(`${method} ${path} 应存在且仅含 is-authenticated 策略`, () => {
      const route = getRoute(method, path);
      expect(route).toBeDefined();
      expect(route!.handler).toBe(handler);
      expect(hasPolicy(route!, "is-authenticated")).toBe(true);
      expect(hasPolicy(route!, "has-channel-access-advanced")).toBe(false);
    });
  });

  test("用户层路由应使用 channel-auth 中间件", () => {
    userPaths.forEach(({ method, path }) => {
      const route = getRoute(method, path)!;
      const mw = getMiddleware(route);
      expect(mw?.name).toBe("plugin::zhao-channel.channel-auth");
    });
  });
});

describe("三层路由 — 渠道成员层 (/v1 + 渠道访问权限)", () => {
  const memberPaths = [
    { method: "GET", path: "/v1/channel/:id", handler: "channel.findOne" },
    { method: "GET", path: "/v1/channel/:id/network", handler: "channel.getNetwork" },
    { method: "GET", path: "/v1/channel/:id/stats", handler: "channel.getStats" },
    { method: "GET", path: "/v1/channel-members", handler: "channel-member.find" },
  ];

  memberPaths.forEach(({ method, path, handler }) => {
    test(`${method} ${path} 应含 is-authenticated + has-channel-access-advanced`, () => {
      const route = getRoute(method, path);
      expect(route).toBeDefined();
      expect(route!.handler).toBe(handler);
      expect(hasPolicy(route!, "is-authenticated")).toBe(true);
      expect(hasPolicy(route!, "has-channel-access-advanced")).toBe(true);
      expect(hasPolicy(route!, "is-channel-admin")).toBe(false);
    });
  });
});

describe("三层路由 — 渠道管理员层 (/v1/admin + 渠道admin角色)", () => {
  const adminPaths = [
    { method: "POST", path: "/v1/admin/channel", handler: "channel.create" },
    { method: "PUT", path: "/v1/admin/channel/:id", handler: "channel.update" },
    { method: "POST", path: "/v1/admin/channel-members", handler: "channel-member.create" },
    { method: "POST", path: "/v1/admin/permissions/batch-grant", handler: "channel-permission.batchGrant" },
  ];

  adminPaths.forEach(({ method, path, handler }) => {
    test(`${method} ${path} 应含 is-authenticated + has-channel-access-advanced + is-channel-admin`, () => {
      const route = getRoute(method, path);
      expect(route).toBeDefined();
      expect(route!.handler).toBe(handler);
      expect(hasPolicy(route!, "is-authenticated")).toBe(true);
      expect(hasPolicy(route!, "has-channel-access-advanced")).toBe(true);
      expect(hasPolicy(route!, "is-channel-admin")).toBe(true);
      expect(hasPolicy(route!, "is-channel-owner")).toBe(false);
    });
  });

  test("管理员层路由 path 应以 /v1/admin 开头", () => {
    adminPaths.forEach(({ method, path }) => {
      const route = getRoute(method, path)!;
      expect(route.path).toMatch(/^\/v1\/admin/);
    });
  });
});

describe("三层路由 — 渠道所有者层 (/v1/admin + 渠道owner角色)", () => {
  test("DELETE /v1/admin/channel/:id 应含 is-authenticated + has-channel-access-advanced + is-channel-owner", () => {
    const route = getRoute("DELETE", "/v1/admin/channel/:id");
    expect(route).toBeDefined();
    expect(route!.handler).toBe("channel.delete");
    expect(hasPolicy(route!, "is-authenticated")).toBe(true);
    expect(hasPolicy(route!, "has-channel-access-advanced")).toBe(true);
    expect(hasPolicy(route!, "is-channel-owner")).toBe(true);
  });
});

describe("三层路由 — 路径冲突检测", () => {
  test("静态路径 /v1/channel/:id/network 不应被 /v1/channel/:id 吞掉", () => {
    const findOne = getRoute("GET", "/v1/channel/:id");
    const network = getRoute("GET", "/v1/channel/:id/network");
    expect(findOne).toBeDefined();
    expect(network).toBeDefined();
    expect(findOne!.handler).toBe("channel.findOne");
    expect(network!.handler).toBe("channel.getNetwork");
  });

  test("静态路径 /v1/channel/:id/stats 不应被 /v1/channel/:id 吞掉", () => {
    const findOne = getRoute("GET", "/v1/channel/:id");
    const stats = getRoute("GET", "/v1/channel/:id/stats");
    expect(findOne).toBeDefined();
    expect(stats).toBeDefined();
    expect(stats!.handler).toBe("channel.getStats");
  });

  test("POST /v1/admin/channel 和 GET /v1/my/channels 应为不同路由", () => {
    const create = getRoute("POST", "/v1/admin/channel");
    const list = getRoute("GET", "/v1/my/channels");
    expect(create).toBeDefined();
    expect(list).toBeDefined();
    expect(create!.handler).toBe("channel.create");
    expect(list!.handler).toBe("channel.find");
  });
});

describe("三层路由 — Admin 路由不受影响", () => {
  test("admin 路由应包含 routes 数组", () => {
    expect(admin.routes).toBeDefined();
    expect(Array.isArray(admin.routes)).toBe(true);
  });

  test("admin 路由所有策略应包含认证和权限策略", () => {
    (admin.routes as Route[]).forEach((r) => {
      const policies = r.config?.policies ?? [];
      expect(policies.length).toBeGreaterThanOrEqual(2);
      const hasAuth = policies.some((p: any) =>
        p === "plugin::zhao-auth.is-authenticated" || p?.name === "plugin::zhao-auth.is-authenticated"
      );
      expect(hasAuth).toBe(true);
      const hasPerm = policies.some((p: any) =>
        p?.name === "plugin::zhao-channel.has-permission"
      );
      expect(hasPerm).toBe(true);
    });
  });

  test("admin 路由应包含渠道 CRUD", () => {
    const adminRouteList = (admin.routes as Route[]).map(
      (r) => `${r.method} ${r.path}`
    );
    expect(adminRouteList).toContain("GET /channels");
    expect(adminRouteList).toContain("POST /channels");
    expect(adminRouteList).toContain("GET /channels/:id");
    expect(adminRouteList).toContain("PUT /channels/:id");
    expect(adminRouteList).toContain("DELETE /channels/:id");
  });
});
