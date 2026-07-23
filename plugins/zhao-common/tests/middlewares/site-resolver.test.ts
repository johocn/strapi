/**
 * site-resolver 中间件单元测试
 *
 * 测试策略：
 * - 使用内联 createMockStrapi() 模拟 strapi.documents(uid).findMany
 * - findMany 支持多次调用返回不同结果（mockResolvedValueOnce）
 * - 验证 domain 精确匹配 / 未匹配回退 / 表空 / 无 domain / 上游已设置 siteId 五种场景
 */
import siteResolver from "../../server/src/middlewares/site-resolver";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

// ========== Mock 工具 ==========
function createMockStrapi() {
  const findMany = jest.fn();
  return {
    documents: jest.fn().mockReturnValue({ findMany }),
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
}

interface MockCtxOptions {
  domain?: string;
  siteId?: number;
  host?: string;
}

function createMockCtx(opts: MockCtxOptions = {}): any {
  const state: Record<string, unknown> = {};
  if (opts.siteId !== undefined) {
    state.siteId = opts.siteId;
  }
  const header: Record<string, unknown> = {};
  if (opts.host !== undefined) {
    header.host = opts.host;
  }
  return {
    query: opts.domain !== undefined ? { domain: opts.domain } : {},
    request: {
      header,
    },
    state,
  };
}

// ========== 套件 ==========
describe("site-resolver middleware", () => {
  let strapi: ReturnType<typeof createMockStrapi>;
  let findMany: jest.Mock;

  beforeEach(() => {
    strapi = createMockStrapi();
    findMany = strapi.documents(SITE_CONFIG_UID).findMany;
  });

  it("1. domain 精确匹配 → 设置 siteId 和 siteDocumentId，不进入回退", async () => {
    findMany.mockResolvedValueOnce([
      { id: 7, documentId: "doc-7", domain: "localhost" },
    ]);

    const middleware = siteResolver({}, { strapi: strapi as any }) as (ctx: any, next: any) => Promise<void>;
    const ctx = createMockCtx({ domain: "localhost" });
    const next = jest.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(7);
    expect(ctx.state.siteDocumentId).toBe("doc-7");
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("2. domain 不匹配 → 回退到 id asc 第一条 + 打 warn 日志", async () => {
    // 第一次调用：domain 精确匹配返回空
    findMany.mockResolvedValueOnce([]);
    // 第二次调用：回退查询返回 id 最小的一条
    findMany.mockResolvedValueOnce([
      { id: 1, documentId: "doc-1", domain: "" },
    ]);

    const middleware = siteResolver({}, { strapi: strapi as any }) as (ctx: any, next: any) => Promise<void>;
    const ctx = createMockCtx({ domain: "localhost" });
    const next = jest.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(1);
    expect(ctx.state.siteDocumentId).toBe("doc-1");
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    // 验证回退查询使用了 sort: { id: "asc" } 和 limit: 1
    const fallbackCall = findMany.mock.calls[1][0];
    expect(fallbackCall).toEqual({
      sort: { id: "asc" },
      limit: 1,
      populate: ["channels", "template"],
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("3. 表完全空 → 不设置 state（不崩溃）", async () => {
    findMany.mockResolvedValueOnce([]); // domain 精确匹配为空
    findMany.mockResolvedValueOnce([]); // 回退查询也为空

    const middleware = siteResolver({}, { strapi: strapi as any }) as (ctx: any, next: any) => Promise<void>;
    const ctx = createMockCtx({ domain: "localhost" });
    const next = jest.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBeUndefined();
    expect(ctx.state.siteDocumentId).toBeUndefined();
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.error).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("4. 无 domain 参数 → 走回退逻辑", async () => {
    // 只预期一次回退查询调用
    findMany.mockResolvedValueOnce([
      { id: 1, documentId: "doc-1", domain: "" },
    ]);

    const middleware = siteResolver({}, { strapi: strapi as any }) as (ctx: any, next: any) => Promise<void>;
    const ctx = createMockCtx({ domain: undefined });
    const next = jest.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(1);
    expect(ctx.state.siteDocumentId).toBe("doc-1");
    expect(findMany).toHaveBeenCalledTimes(1);
    // 无 domain 不打 warn 日志（warn 仅在 domain 存在但未匹配时打）
    expect(strapi.log.warn).not.toHaveBeenCalled();
    // 验证是回退查询（sort id asc, limit 1）
    const fallbackCall = findMany.mock.calls[0][0];
    expect(fallbackCall).toEqual({
      sort: { id: "asc" },
      limit: 1,
      populate: ["channels", "template"],
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("5. 上游已设置 siteId → 跳过域名识别", async () => {
    const middleware = siteResolver({}, { strapi: strapi as any }) as (ctx: any, next: any) => Promise<void>;
    const ctx = createMockCtx({ domain: "localhost", siteId: 99 });
    const next = jest.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(99);
    expect(findMany).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
