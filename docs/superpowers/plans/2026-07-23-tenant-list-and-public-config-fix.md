# 租户列表页 + C 端 public/config 修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复租户列表页字段缺失 + C 端 public/config 接口 site 返回空 + moduleGrantedForCurrentTenant 全 false 三个关联 bug

**Architecture:** 3 个 bug 同源于 siteId 类型错位（数字主键被当作 documentId 字符串使用）。修复消费方（controllers/config.ts）读 siteDocumentId 而非 siteId，并在 site-resolver 中间件加 domain 回退到默认站点。B1 独立修 tenant.service.ts 的 select/populate 补全字段。

**Tech Stack:** Strapi v5、TypeScript、Jest、uni-app + Vue 3

**Spec:** `docs/superpowers/specs/2026-07-23-tenant-list-and-public-config-fix-design.md`

---

## 文件结构

### 修改的源文件（5 个）
1. `plugins/zhao-auth/server/src/services/tenant.service.ts` — 补 select/populate + 字段映射（B1）
2. `plugins/zhao-common/server/src/controllers/config.ts:846-858` — getPublic 读 siteDocumentId（B2）
3. `plugins/zhao-common/server/src/services/config.ts:246,255,500,514` — getPublicConfig 参数语义 + 4 处衍生修复（B2/B3）
4. `plugins/zhao-common/server/src/middlewares/site-resolver.ts:44-65` — domain 回退逻辑（B2）
5. `strapi-backend/pages/tenant/list.vue:37,45` — 2 处字段适配（B1）

### 新增测试文件（4 个）
1. `plugins/zhao-auth/tests/services/tenant.service.test.ts` — B1
2. `plugins/zhao-common/tests/middlewares/site-resolver.test.ts` — B2
3. `plugins/zhao-common/tests/controllers/config-public.test.ts` — B2/B3
4. `plugins/zhao-common/tests/services/config-grants.test.ts` — B3

---

## Task 1: B1 tenant.service.ts 补全字段

**Files:**
- Modify: `plugins/zhao-auth/server/src/services/tenant.service.ts`
- Test: `plugins/zhao-auth/tests/services/tenant.service.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `plugins/zhao-auth/tests/services/tenant.service.test.ts`：

```typescript
const { createStrapiMock } = require("../helpers/strapi-mock");

describe("tenant.service getMyTenants", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createStrapiMock();
    service = require("../../server/src/services/tenant.service").default({ strapi });
  });

  test("admin 分支返回完整字段 (siteName/featureFlags/updatedAt/channelsCount/templateName)", async () => {
    const fakeSite = {
      id: 1,
      documentId: "doc-abc",
      siteName: "圣麟教育",
      domain: "localhost",
      featureFlags: { channel: true, sso: true, points: false },
      updatedAt: "2026-07-23T10:00:00.000Z",
      channels: [{ id: 10 }, { id: 11 }],
      template: { name: "教育模板" },
    };
    strapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([fakeSite]),
    });

    const result = await service.getMyTenants(1, ["admin"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      documentId: "doc-abc",
      siteName: "圣麟教育",
      domain: "localhost",
      featureFlags: { channel: true, sso: true, points: false },
      channelsCount: 2,
      templateName: "教育模板",
      updatedAt: "2026-07-23T10:00:00.000Z",
    });
  });

  test("非 admin 分支按 channelIds 过滤并返回完整字段", async () => {
    const fakeSite = {
      id: 5,
      documentId: "doc-xyz",
      siteName: "测试租户",
      domain: "test.com",
      featureFlags: { channel: false },
      updatedAt: "2026-07-22T08:00:00.000Z",
      channels: [{ id: 20 }],
      template: null,
    };
    // mock channel-permission
    strapi.plugin.mockReturnValue({
      service: jest.fn().mockReturnValue({
        getUserAllChannels: jest.fn().mockResolvedValue([20]),
      }),
    });
    // mock db.connection (关联表查询)
    strapi.db.connection = jest.fn().mockReturnValue({
      whereIn: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([{ site_config_id: 5 }]),
      }),
    });
    strapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([fakeSite]),
    });

    const result = await service.getMyTenants(99, ["channel-admin"]);

    expect(result).toHaveLength(1);
    expect(result[0].siteName).toBe("测试租户");
    expect(result[0].channelsCount).toBe(1);
    expect(result[0].templateName).toBeNull();
    expect(result[0].updatedAt).toBe("2026-07-22T08:00:00.000Z");
  });

  test("featureFlags 为空时降级为 {}", async () => {
    const fakeSite = {
      id: 1, documentId: "d", siteName: "n", domain: "x",
      featureFlags: null, updatedAt: null,
      channels: [], template: null,
    };
    strapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([fakeSite]),
    });

    const result = await service.getMyTenants(1, ["admin"]);

    expect(result[0].featureFlags).toEqual({});
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd plugins/zhao-auth && npx jest tests/services/tenant.service.test.ts`
Expected: FAIL — 返回字段是 `name` 而非 `siteName`，缺少 `featureFlags/channelsCount/templateName/updatedAt`

- [ ] **Step 3: 修改 admin 分支（第 8-19 行）**

替换 `plugins/zhao-auth/server/src/services/tenant.service.ts` 第 8-19 行：

```typescript
    // admin 返回全部租户
    if (roles.includes("admin")) {
      const all = await strapi.db.query(SITE_CONFIG_UID).findMany({
        select: ["id", "documentId", "siteName", "domain", "featureFlags", "updatedAt"],
        populate: {
          channels: { select: ["id"] },
          template: { select: ["name"] },
        },
        limit: 1000,
      });
      return all.map((s: any) => ({
        id: s.id,
        documentId: s.documentId,
        siteName: s.siteName,
        domain: s.domain,
        featureFlags: s.featureFlags ?? {},
        channelsCount: (s.channels ?? []).length,
        templateName: s.template?.name ?? null,
        updatedAt: s.updatedAt,
      }));
    }
```

- [ ] **Step 4: 修改非 admin 分支（第 50-62 行）**

替换第 50-62 行：

```typescript
    // 查 site-config 表获取租户详情
    const sites = await strapi.db.query(SITE_CONFIG_UID).findMany({
      where: { id: { $in: siteIds } },
      select: ["id", "documentId", "siteName", "domain", "featureFlags", "updatedAt"],
      populate: {
        channels: { select: ["id"] },
        template: { select: ["name"] },
      },
    });

    return sites.map((s: any) => ({
      id: s.id,
      documentId: s.documentId,
      siteName: s.siteName,
      domain: s.domain,
      featureFlags: s.featureFlags ?? {},
      channelsCount: (s.channels ?? []).length,
      templateName: s.template?.name ?? null,
      updatedAt: s.updatedAt,
    }));
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd plugins/zhao-auth && npx jest tests/services/tenant.service.test.ts`
Expected: PASS — 3 个测试全过

- [ ] **Step 6: 提交**

```bash
cd d:\zhao\strapi
git add plugins/zhao-auth/server/src/services/tenant.service.ts plugins/zhao-auth/tests/services/tenant.service.test.ts
git commit -m "fix(zhao-auth): tenant.service 补全 siteName/featureFlags/updatedAt/channelsCount/templateName 字段"
```

---

## Task 2: B1 前端 list.vue 字段适配

**Files:**
- Modify: `strapi-backend/pages/tenant/list.vue:37,45`

- [ ] **Step 1: 修改第 37 行 channels 字段引用**

在 `d:\zhao\strapi-backend\pages\tenant\list.vue` 第 37 行：

将 `{{ tenant.channels?.length ?? 0 }}` 改为 `{{ tenant.channelsCount ?? 0 }}`

- [ ] **Step 2: 修改第 45 行 template 字段引用**

第 45 行：

将 `{{ tenant.template?.name || '无' }}` 改为 `{{ tenant.templateName || '无' }}`

- [ ] **Step 3: 提交**

```bash
cd d:\zhao\strapi-backend
git add pages/tenant/list.vue
git commit -m "fix(tenant-list): 适配后端 channelsCount/templateName 字段名"
```

> 注意：strapi-backend 若不在同一 git 仓库，则在 strapi 仓库提交时跳过此 task 的 git 步骤，仅改文件。

---

## Task 3: B2 site-resolver 加 domain 回退

**Files:**
- Modify: `plugins/zhao-common/server/src/middlewares/site-resolver.ts:44-65`
- Test: `plugins/zhao-common/tests/middlewares/site-resolver.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `plugins/zhao-common/tests/middlewares/site-resolver.test.ts`：

```typescript
const { createStrapiMock } = require("../helpers/strapi-mock");

describe("site-resolver middleware", () => {
  let strapi: any;
  let middleware: any;

  beforeEach(() => {
    strapi = createStrapiMock();
    strapi.log = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };
    middleware = require("../../server/src/middlewares/site-resolver").default({}, { strapi });
  });

  test("domain 精确匹配 → 设置 siteId 和 siteDocumentId", async () => {
    const fakeSite = { id: 1, documentId: "doc-abc" };
    strapi.documents.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([fakeSite]),
    });

    const ctx: any = {
      state: {},
      query: { domain: "example.com" },
      request: { header: {} },
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(1);
    expect(ctx.state.siteDocumentId).toBe("doc-abc");
    expect(next).toHaveBeenCalled();
  });

  test("domain 不匹配 → 回退到 id asc 第一条 + 打 warn", async () => {
    // 第一次查询返回空（domain 不匹配）
    const findManyMock = jest.fn()
      .mockResolvedValueOnce([])  // domain 查询
      .mockResolvedValueOnce([{ id: 1, documentId: "default-doc" }]); // 回退查询
    strapi.documents.mockReturnValue({ findMany: findManyMock });

    const ctx: any = {
      state: {},
      query: { domain: "localhost" },
      request: { header: {} },
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(1);
    expect(ctx.state.siteDocumentId).toBe("default-doc");
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('domain "localhost" 未匹配')
    );
    expect(next).toHaveBeenCalled();
    // 验证回退查询用了 sort: { id: "asc" }
    const fallbackCall = findManyMock.mock.calls[1][0];
    expect(fallbackCall.sort).toEqual({ id: "asc" });
    expect(fallbackCall.limit).toBe(1);
  });

  test("表完全空 → 不设置 state（不崩溃）", async () => {
    const findManyMock = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    strapi.documents.mockReturnValue({ findMany: findManyMock });

    const ctx: any = {
      state: {},
      query: { domain: "localhost" },
      request: { header: {} },
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBeUndefined();
    expect(ctx.state.siteDocumentId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test("无 domain 参数 → 走回退逻辑", async () => {
    const findManyMock = jest.fn()
      .mockResolvedValueOnce([{ id: 2, documentId: "fallback-doc" }]);
    strapi.documents.mockReturnValue({ findMany: findManyMock });

    const ctx: any = {
      state: {},
      query: {},
      request: { header: { host: "" } },
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(2);
    expect(ctx.state.siteDocumentId).toBe("fallback-doc");
  });

  test("上游已设置 siteId → 跳过域名识别", async () => {
    const ctx: any = {
      state: { siteId: 99, siteDocumentId: "existing" },
      query: { domain: "should-be-ignored.com" },
      request: { header: {} },
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.state.siteId).toBe(99);
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd plugins/zhao-common && npx jest tests/middlewares/site-resolver.test.ts`
Expected: FAIL — 当前无回退逻辑，domain 不匹配时 siteId 不被设置

- [ ] **Step 3: 修改 site-resolver.ts（第 44-65 行）**

替换 `plugins/zhao-common/server/src/middlewares/site-resolver.ts` 第 44-65 行：

```typescript
    try {
      if (domain) {
        const records = await strapi.documents(SITE_CONFIG_UID).findMany({
          filters: { domain },
          populate: ["channels", "template"],
          limit: 1,
        });

        if (Array.isArray(records) && records.length > 0) {
          const site = records[0];
          // siteId 为数字 id（用于 db.query manyToOne 关系过滤）；siteDocumentId 为 documentId（用于 documentService）
          ctx.state.siteId = site.id;
          ctx.state.siteDocumentId = site.documentId;
          // siteChannelIds 数组由 resolve-channel-scope 策略统一注入
          return await next();
        }
        // domain 未匹配 → 回退到默认站点
        strapi.log.warn(`[site-resolver] domain "${domain}" 未匹配，回退到默认站点`);
      }

      // 回退：取 id 最小的站点作为默认（bootstrap 种子记录 id=1）
      const fallback = await strapi.documents(SITE_CONFIG_UID).findMany({
        sort: { id: "asc" },
        limit: 1,
        populate: ["channels", "template"],
      });
      if (Array.isArray(fallback) && fallback.length > 0) {
        const site = fallback[0];
        ctx.state.siteId = site.id;
        ctx.state.siteDocumentId = site.documentId;
      }
    } catch (error) {
      strapi.log.error("[site-resolver] Failed to resolve site:", error);
    }

    await next();
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd plugins/zhao-common && npx jest tests/middlewares/site-resolver.test.ts`
Expected: PASS — 5 个测试全过

- [ ] **Step 5: 提交**

```bash
cd d:\zhao\strapi
git add plugins/zhao-common/server/src/middlewares/site-resolver.ts plugins/zhao-common/tests/middlewares/site-resolver.test.ts
git commit -m "fix(zhao-common): site-resolver domain 未匹配时回退到默认站点"
```

---

## Task 4: B2/B3 config.ts 控制器 + 服务层类型错位修复

**Files:**
- Modify: `plugins/zhao-common/server/src/controllers/config.ts:846-858`
- Modify: `plugins/zhao-common/server/src/services/config.ts:246,255,500,514`
- Test: `plugins/zhao-common/tests/controllers/config-public.test.ts`
- Test: `plugins/zhao-common/tests/services/config-grants.test.ts`

- [ ] **Step 1: 写控制器失败测试**

创建 `plugins/zhao-common/tests/controllers/config-public.test.ts`：

```typescript
const { createStrapiMock } = require("../helpers/strapi-mock");

describe("config controller getPublic", () => {
  let strapi: any;
  let controller: any;

  beforeEach(() => {
    strapi = createStrapiMock();
    const configService = {
      getPublicConfig: jest.fn().mockResolvedValue({ site: { siteName: "圣麟教育" } }),
    };
    strapi.plugin.mockReturnValue({ service: jest.fn().mockReturnValue(configService) });
    controller = require("../../server/src/controllers/config").default({ strapi });
  });

  test("读取 ctx.state.siteDocumentId（非 siteId）传给 service", async () => {
    const ctx: any = {
      state: {
        siteId: 1,                      // 数字 id
        siteDocumentId: "doc-abc",      // 字符串 documentId
      },
      query: {},
    };

    await controller.getPublic(ctx);

    const configService = strapi.plugin().service();
    expect(configService.getPublicConfig).toHaveBeenCalledWith("doc-abc", undefined);
    expect(ctx.body).toEqual({ data: { site: { siteName: "圣麟教育" } } });
  });

  test("siteDocumentId 为 undefined 时传 undefined 给 service", async () => {
    const ctx: any = {
      state: { siteId: 1 },  // 只有数字 id，无 documentId
      query: {},
    };

    await controller.getPublic(ctx);

    const configService = strapi.plugin().service();
    expect(configService.getPublicConfig).toHaveBeenCalledWith(undefined, undefined);
  });
});
```

- [ ] **Step 2: 写 grants 失败测试**

创建 `plugins/zhao-common/tests/services/config-grants.test.ts`：

```typescript
const { createStrapiMock } = require("../helpers/strapi-mock");

describe("config service moduleGrantedForCurrentTenant + resolveModuleVisibility", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createStrapiMock();
    strapi.log = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };

    // mock site-config service
    const siteConfigService = {
      getConfig: jest.fn().mockResolvedValue({
        siteName: "圣麟教育",
        extraConfig: {},
        moduleVisibility: {},
        featureFlags: { channel: true },
        themeConfig: {},
      }),
    };
    // mock global-config service
    const globalConfigService = {
      getGlobalConfig: jest.fn().mockResolvedValue({
        moduleEnabled: { points: true },               // points 全局开启
        moduleTenantGrants: { sso: ["doc-abc"] },      // sso 仅授权给 doc-abc 租户
        moduleVisibility: {},
      }),
    };
    // mock permission service (resolveModuleVisibility)
    const permissionService = {
      resolveModuleVisibility: jest.fn().mockResolvedValue({ sso: ["admin"] }),
    };

    strapi.plugin.mockImplementation((name: string) => ({
      service: jest.fn().mockImplementation((svcName: string) => {
        if (name === "zhao-common" && svcName === "site-config") return siteConfigService;
        if (name === "zhao-common" && svcName === "global-config") return globalConfigService;
        if (name === "zhao-common" && svcName === "site-template") return { getTemplate: jest.fn() };
        if (name === "zhao-auth" && svcName === "permission") return permissionService;
        return {};
      }),
    }));

    service = require("../../server/src/services/config").default({ strapi });
  });

  test("documentId 在 moduleTenantGrants 数组中 → granted=true", async () => {
    const result = await service.getPublicConfig("doc-abc");

    expect(result.moduleGrantedForCurrentTenant.sso).toBe(true);
    // sso 全局未开启 (undefined→false), 但 doc-abc 在授权列表中 → true
  });

  test("documentId 不在 moduleTenantGrants 数组中 → granted=false", async () => {
    const result = await service.getPublicConfig("doc-other");

    expect(result.moduleGrantedForCurrentTenant.sso).toBe(false);
  });

  test("globalEnabled=true 时即便未授权也 true", async () => {
    const result = await service.getPublicConfig("doc-other");

    // points 全局开启=true, doc-other 不在 points 授权列表（列表不存在）→ true
    expect(result.moduleGrantedForCurrentTenant.points).toBe(true);
  });

  test("resolveModuleVisibility 收到 documentId 字符串（非数字 id）", async () => {
    await service.getPublicConfig("doc-abc");

    const permissionService = strapi.plugin("zhao-auth").service("permission");
    expect(permissionService.resolveModuleVisibility).toHaveBeenCalledWith("doc-abc");
    expect(permissionService.resolveModuleVisibility).not.toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd plugins/zhao-common && npx jest tests/controllers/config-public.test.ts tests/services/config-grants.test.ts`
Expected: FAIL — 控制器传的是 `siteId`（数字 1）而非 `siteDocumentId`；service 内部 `resolveModuleVisibility` 也收到数字 1

- [ ] **Step 4: 修改控制器 config.ts（第 846-858 行）**

替换 `plugins/zhao-common/server/src/controllers/config.ts` 第 846-858 行：

```typescript
  // ========== 公开配置 ==========
  async getPublic(ctx: any) {
    try {
      const siteDocId = ctx.state?.siteDocumentId;
      const channelId = ctx.query.channel || ctx.state?.channelId;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getPublicConfig(siteDocId, channelId);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
```

- [ ] **Step 5: 修改服务层 config.ts 第 246 行**

将 `async getPublicConfig(siteId?: string, channelId?: string | number) {` 改为：

```typescript
  async getPublicConfig(siteDocId?: string, channelId?: string | number) {
```

- [ ] **Step 6: 修改服务层 config.ts 第 255 行**

将 `const fullConfig: any = await siteConfigService.getConfig(siteId);` 改为：

```typescript
      const fullConfig: any = await siteConfigService.getConfig(siteDocId);
```

- [ ] **Step 7: 修改服务层 config.ts 第 500 行**

将 `const currentTenantDocId = siteId ?? "";` 改为：

```typescript
      const currentTenantDocId = siteDocId ?? "";
```

- [ ] **Step 8: 修改服务层 config.ts 第 514 行**

将 `result.moduleVisibility = await (permissionService as any).resolveModuleVisibility(siteId);` 改为：

```typescript
          result.moduleVisibility = await (permissionService as any).resolveModuleVisibility(siteDocId);
```

- [ ] **Step 9: 运行测试确认通过**

Run: `cd plugins/zhao-common && npx jest tests/controllers/config-public.test.ts tests/services/config-grants.test.ts`
Expected: PASS — 6 个测试全过

- [ ] **Step 10: 提交**

```bash
cd d:\zhao\strapi
git add plugins/zhao-common/server/src/controllers/config.ts plugins/zhao-common/server/src/services/config.ts plugins/zhao-common/tests/controllers/config-public.test.ts plugins/zhao-common/tests/services/config-grants.test.ts
git commit -m "fix(zhao-common): getPublic/getPublicConfig 用 siteDocumentId 替换 siteId 类型错位 (4 处)"
```

---

## Task 5: 回归验证 + 重建 dist

**Files:**
- 无新文件，仅运行命令

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd d:\zhao\strapi && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: 运行 zhao-auth 全套测试**

Run: `cd d:\zhao\strapi\plugins\zhao-auth && npx jest`
Expected: 所有测试通过（含 Task 1 新增 3 个）

- [ ] **Step 3: 运行 zhao-common 全套测试**

Run: `cd d:\zhao\strapi\plugins\zhao-common && npx jest`
Expected: 所有测试通过（含 Task 3+4 新增 11 个）

- [ ] **Step 4: 重建受影响插件 dist**

Run:
```powershell
cd d:\zhao\strapi\plugins\zhao-auth; npx -y @strapi/sdk-plugin build
cd d:\zhao\strapi\plugins\zhao-common; npx -y @strapi/sdk-plugin build
```
Expected: 两个插件构建成功

- [ ] **Step 5: 启动 Strapi 验证无新报错**

Run: `cd d:\zhao\strapi && npm run dev`
Expected: Strapi 启动成功，无新错误日志

- [ ] **Step 6: 手动验证 public/config 接口**

Run: `curl "http://localhost:1337/api/zhao-common/v1/public/config?domain=localhost"`
Expected: `data.site.siteName` = "圣麟教育"（非空字符串）

- [ ] **Step 7: 提交 dist 重建产物**

```bash
cd d:\zhao\strapi
git add plugins/zhao-auth/dist plugins/zhao-common/dist
git commit -m "build: rebuild zhao-auth + zhao-common dist after tenant/config fixes"
```

---

## Self-Review

**Spec coverage:**
- B1 (tenant.service 字段不全) → Task 1 (后端) + Task 2 (前端) ✓
- B2 (siteId 类型错位 + domain 回退) → Task 3 (中间件回退) + Task 4 (控制器+服务层) ✓
- B3 (moduleGrantedForCurrentTenant 全 false + resolveModuleVisibility) → Task 4 Step 7-8 + config-grants 测试 ✓
- domain 回退规则 → Task 3 ✓
- 测试策略 4 个测试文件 → Task 1/3/4 全覆盖 ✓
- 回归验证 → Task 5 ✓

**Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码 ✓

**Type consistency:**
- `siteDocId` 参数名在 Task 4 Step 4-8 一致 ✓
- `siteDocumentId` 字段名在 Task 3/4 一致 ✓
- `channelsCount`/`templateName` 在 Task 1/2 一致 ✓
- `strapi.db.query` 的 `populate: { channels: { select: ["id"] } }` 语法在 Task 1 两分支一致 ✓

**Strapi 规范检查:**
- `strapi.db.query` 用 `select` + `populate` 对象语法 ✓
- `strapi.documents().findMany` 用 `filters`/`sort`/`limit` ✓
- 中间件 factory 签名 `(config, { strapi }) => async (ctx, next) => {}` ✓
- 未动 schema、未引入新 content-type ✓
- domain 回退用 `strapi.documents` 而非 db.query（与原代码一致，documentService 适合按 documentId 查询）✓

**潜在卡点:**
1. ~~`helpers/strapi-mock` 是否存在？~~ 已确认不存在，现有测试用内联 `createMockStrapi()` 函数（见 `auth-service.test.ts:21`）。执行时需将 plan 中测试代码的 `require("../helpers/strapi-mock")` 改为内联 mock 函数，参考 `auth-service.test.ts` 的模式
2. `strapi-backend` 是否独立 git 仓库？Task 2 提交时需确认仓库路径
3. `npm run dev` 端口 1337 可能被上次会话实例占用，需先停掉
