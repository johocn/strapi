/**
 * 测试工具 - 创建 mock strapi 实例
 */
export function createMockStrapi(overrides: Record<string, any> = {}): any {
  const mockDocuments = jest.fn();
  const mockDbQuery = jest.fn();

  const strapi = {
    documents: mockDocuments,
    db: {
      query: mockDbQuery,
    },
    plugin: jest.fn(),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    ...overrides,
  };

  // 默认 plugin() 返回带 service 的对象
  strapi.plugin.mockImplementation((name: string) => {
    if (name === "zhao-common") {
      return {
        service: jest.fn().mockImplementation((svc: string) => {
          if (svc === "i18n") {
            return {
              t: jest.fn((code: string, params?: any) => code),
              setMessages: jest.fn(),
            };
          }
          if (svc === "error-handler") {
            return {
              createError: jest.fn((code: string, ctx?: any, msg?: string) => {
                const err: any = new Error(msg || code);
                err.code = code;
                err.context = ctx;
                err.status = 400;
                return err;
              }),
              wrapError: jest.fn((err: any) => err),
              formatError: jest.fn((err: any) => ({
                code: err?.code || "UNKNOWN_ERROR",
                message: err?.message || "Unknown error",
              })),
            };
          }
          if (svc === "logger") {
            return {
              info: jest.fn(),
              warn: jest.fn(),
              error: jest.fn(),
              debug: jest.fn(),
            };
          }
          return {};
        }),
      };
    }
    if (name === "zhao-course") {
      return {
        service: jest.fn().mockImplementation((svc: string) => ({})),
      };
    }
    return { service: jest.fn() };
  });

  return strapi;
}
