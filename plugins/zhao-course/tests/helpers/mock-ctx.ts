/**
 * 测试工具 - 创建 mock Koa 上下文
 */
export function createMockCtx(overrides: Record<string, any> = {}): any {
  const ctx: any = {
    params: {},
    query: {},
    request: {
      body: {},
    },
    body: undefined,
    status: 200,
    state: {
      user: null,
    },
    notFound: jest.fn((msg: string): any => {
      ctx.status = 404;
      ctx.body = { error: msg };
      return ctx;
    }),
    throw: jest.fn((status: number, msg: string) => {
      const err: any = new Error(typeof msg === "string" ? msg : String(msg));
      err.status = status;
      throw err;
    }),
    ...overrides,
  };

  return ctx;
}

/**
 * 创建带 strapi.plugin() mock 的 strapi 实例（Controller 专用）
 * serviceMethodMap: { "service-name": { method: jest.fn() } }
 */
export function createControllerStrapi(serviceMethodMap: Record<string, Record<string, jest.Mock>>): any {
  const services: Record<string, any> = {};
  for (const [svcName, methods] of Object.entries(serviceMethodMap)) {
    services[svcName] = methods;
  }

  return {
    plugin: jest.fn().mockReturnValue({
      service: jest.fn().mockImplementation((name: string) => services[name] || {}),
    }),
  };
}
