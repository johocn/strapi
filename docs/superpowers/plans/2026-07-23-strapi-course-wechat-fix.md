# strapi-course 微信功能卡点修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 strapi-course 微信功能 5 个卡点（2 阻断 + 3 功能 Bug），使 H5 登录、小程序登录、JSSDK 分享、海报生成可用

**Architecture:** C1 是根因——zhao-third 5 个控制器误用 `ctx.state.siteId`（数字主键）当 documentId，与之前 config.ts 修复模式一致。C2-C4 是独立的小修复。C5 随 C1 自动解决。

**Tech Stack:** Strapi v5、TypeScript、Jest、uni-app + Vue 3

**Spec:** `docs/superpowers/specs/2026-07-23-strapi-course-wechat-fix-design.md`

---

## 文件结构

### 修改的源文件（4 个）
1. `plugins/zhao-third/server/src/controllers/third-party-auth.ts` — 5 处 siteId → siteDocId + authUrl 接收 state（C1+C4）
2. `plugins/zhao-third/server/src/services/third-party-auth.ts` — getAuthUrl 加 state 参数（C4）
3. `strapi-course/manifest.json:53` — mp-weixin.appid 填占位符（C2）
4. `strapi-course/components/share-poster/share-poster.vue:267` — 删除 H5 分支 ctx.draw()（C3）

### 新增文件（3 个）
1. `plugins/zhao-third/tests/jest.config.js` — Jest 配置（参考 zhao-auth）
2. `plugins/zhao-third/tests/controllers/third-party-auth.test.ts` — C1 测试
3. `plugins/zhao-third/tests/services/third-party-auth-state.test.ts` — C4 测试

---

## Task 1: C1 后端控制器 siteId 类型错位修复

**Files:**
- Modify: `plugins/zhao-third/server/src/controllers/third-party-auth.ts`
- Create: `plugins/zhao-third/tests/jest.config.js`
- Create: `plugins/zhao-third/tests/controllers/third-party-auth.test.ts`

- [ ] **Step 1: 创建 Jest 配置**

参考 `d:\zhao\strapi\plugins\zhao-auth\tests\jest.config.js` 的内容，创建 `d:\zhao\strapi\plugins\zhao-third\tests\jest.config.js`。

先读取参考文件：
```bash
# 读取 zhao-auth 的 jest 配置作为模板
```

实际内容（与 zhao-auth 一致，paths 对应 zhao-third）：
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2021',
        module: 'commonjs',
        esModuleInterop: true,
        allowJs: true,
      }
    }]
  },
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/**/*.d.ts'
  ]
};
```

- [ ] **Step 2: 安装 jest 依赖**

```bash
cd d:\zhao\strapi\plugins\zhao-third
npm install --save-dev jest@30.4.2 ts-jest@29.4.11 ts-node@10.9.2 @types/jest@29.5.14
```

- [ ] **Step 3: 写失败测试**

创建 `d:\zhao\strapi\plugins\zhao-third\tests\controllers\third-party-auth.test.ts`：

```typescript
describe("third-party-auth controllers siteId type fix", () => {
  let strapi: any;
  let controller: any;

  beforeEach(() => {
    // 内联 mock strapi
    const authService = {
      getAuthUrl: jest.fn().mockResolvedValue({ authUrl: "http://test", state: "s", appId: "a" }),
      getQrconnectUrl: jest.fn().mockResolvedValue({ qrconnectUrl: "http://qr", authUrl: "http://test" }),
      handleCallback: jest.fn().mockResolvedValue({ token: "t", user: {}, isNewUser: false }),
      getPublicConfig: jest.fn().mockResolvedValue({ platform: "wechat", appId: "a" }),
      getJssdkSignature: jest.fn().mockResolvedValue({ appId: "a", timestamp: 1, nonceStr: "n", signature: "s" }),
    };
    strapi = {
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue(authService),
      }),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    };
    controller = require("../../server/src/controllers/third-party-auth").default({ strapi });
  });

  test("authUrl 读 siteDocumentId 而非 siteId 传给 service", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { platform: "wechat", appType: "official_account", redirectUrl: "http://r" } },
    };

    await controller.authUrl(ctx);

    expect(strapi.plugin().service().getAuthUrl).toHaveBeenCalledWith(
      "wechat", "official_account", "http://r", "doc-abc", undefined
    );
    expect(strapi.plugin().service().getAuthUrl).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), 1, expect.anything()
    );
  });

  test("qrconnectUrl 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { redirectUrl: "http://r" } },
    };

    await controller.qrconnectUrl(ctx);

    expect(strapi.plugin().service().getQrconnectUrl).toHaveBeenCalledWith("http://r", "doc-abc");
  });

  test("callback 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { platform: "wechat", appType: "official_account", code: "c" } },
    };

    await controller.callback(ctx);

    expect(strapi.plugin().service().handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "doc-abc" })
    );
  });

  test("publicConfig 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      params: { platform: "wechat", appType: "official_account" },
    };

    await controller.publicConfig(ctx);

    expect(strapi.plugin().service().getPublicConfig).toHaveBeenCalledWith("wechat", "official_account", "doc-abc");
  });

  test("jssdkSignature 读 siteDocumentId 而非 siteId", async () => {
    const ctx: any = {
      state: { siteId: 1, siteDocumentId: "doc-abc" },
      request: { body: { url: "http://test.com" } },
    };

    await controller.jssdkSignature(ctx);

    expect(strapi.plugin().service().getJssdkSignature).toHaveBeenCalledWith("http://test.com", "doc-abc");
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `cd d:\zhao\strapi\plugins\zhao-third && npx jest tests/controllers/third-party-auth.test.ts --config tests/jest.config.js`
Expected: FAIL — 控制器传 `1`（数字 siteId）而非 `"doc-abc"`（siteDocumentId）

- [ ] **Step 5: 修改控制器（5 处）**

修改 `d:\zhao\strapi\plugins\zhao-third\server\src\controllers\third-party-auth.ts`：

**第 6 行**（authUrl 解构 body）：
```typescript
    const { platform, appType, redirectUrl, state } = ctx.request.body;
```

**第 14 行**（authUrl）：
```typescript
    const siteDocId = ctx.state?.siteDocumentId;
    const authService = strapi.plugin("zhao-third").service("third-party-auth");
    const result = await authService.getAuthUrl(platform, appType, redirectUrl, siteDocId, state);
```

**第 36-38 行**（qrconnectUrl）：
```typescript
    const siteDocId = ctx.state?.siteDocumentId;
    const authService = strapi.plugin("zhao-third").service("third-party-auth");
    const result = await authService.getQrconnectUrl(redirectUrl, siteDocId);
```

**第 58 行**（callback）：
```typescript
    const siteDocId = ctx.state?.siteDocumentId;
```

**第 67 行**（callback 传参）：
```typescript
        siteId: siteDocId,
```

**第 81-84 行**（publicConfig）：
```typescript
    const siteDocId = ctx.state?.siteDocumentId;

    const authService = strapi.plugin("zhao-third").service("third-party-auth");
    const result = await authService.getPublicConfig(platform, appType, siteDocId);
```

**第 131-133 行**（jssdkSignature）：
```typescript
    const siteDocId = ctx.state?.siteDocumentId;
    const authService = strapi.plugin("zhao-third").service("third-party-auth");
    const result = await authService.getJssdkSignature(url, siteDocId);
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd d:\zhao\strapi\plugins\zhao-third && npx jest tests/controllers/third-party-auth.test.ts --config tests/jest.config.js`
Expected: PASS — 5 个测试全过

- [ ] **Step 7: 提交**

```bash
cd d:\zhao\strapi
git add plugins/zhao-third/server/src/controllers/third-party-auth.ts plugins/zhao-third/tests/ plugins/zhao-third/package.json plugins/zhao-third/package-lock.json
git commit -m "fix(zhao-third): 控制器用 siteDocumentId 替换 siteId 类型错位 (5 处) + authUrl 接收 state 参数"
```

---

## Task 2: C4 后端 service 层 getAuthUrl 透传 state

**Files:**
- Modify: `plugins/zhao-third/server/src/services/third-party-auth.ts:10,35,45`
- Create: `plugins/zhao-third/tests/services/third-party-auth-state.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `d:\zhao\strapi\plugins\zhao-third\tests\services\third-party-auth-state.test.ts`：

```typescript
describe("third-party-auth service getAuthUrl state 参数", () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    const fakeConfig = { appId: "wx123", appSecret: "secret" };
    const configService = {
      findByPlatformAndAppType: jest.fn().mockResolvedValue(fakeConfig),
    };
    strapi = {
      plugin: jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-third") {
          return {
            service: jest.fn().mockImplementation((svcName: string) => {
              if (svcName === "third-party-config") return configService;
              return {};
            }),
            config: jest.fn().mockReturnValue({
              wechat: {
                official_account: { authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize" },
                open_platform: { authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect" },
              },
              douyin: {
                official_account: { authorizeUrl: "https://open.douyin.com/platform/oauth/connect/" },
              },
            }),
          };
        }
        return {};
      }),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    };
    service = require("../../server/src/services/third-party-auth").default({ strapi });
  });

  test("前端传 state → 透传给微信 authorizeUrl", async () => {
    const result = await service.getAuthUrl("wechat", "official_account", "http://redirect", undefined, "my-source-path");

    expect(result.state).toBe("my-source-path");
    expect(result.authUrl).toContain("state=my-source-path");
  });

  test("前端不传 state → 用随机值兜底", async () => {
    const result = await service.getAuthUrl("wechat", "official_account", "http://redirect", undefined, undefined);

    expect(result.state).toBeTruthy();
    expect(result.state).not.toBe("my-source-path");
    expect(result.state.length).toBeGreaterThan(5);
    expect(result.authUrl).toContain(`state=${result.state}`);
  });

  test("douyin 平台也支持 state 透传", async () => {
    const result = await service.getAuthUrl("douyin", "official_account", "http://redirect", undefined, "douyin-state");

    expect(result.state).toBe("douyin-state");
    expect(result.authUrl).toContain("state=douyin-state");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd d:\zhao\strapi\plugins\zhao-third && npx jest tests/services/third-party-auth-state.test.ts --config tests/jest.config.js`
Expected: FAIL — service.getAuthUrl 只接受 4 个参数，第 5 个 state 被忽略，仍用随机值

- [ ] **Step 3: 修改 service 第 10 行（签名加 state 参数）**

修改 `d:\zhao\strapi\plugins\zhao-third\server\src\services\third-party-auth.ts` 第 10 行：

```typescript
  async getAuthUrl(platform: string, appType: string, redirectUrl: string, siteId?: string, state?: string) {
```

- [ ] **Step 4: 修改 service 第 35 行（wechat 优先用传入 state）**

```typescript
      params.state = state || Math.random().toString(36).substring(2, 10);
```

- [ ] **Step 5: 修改 service 第 45 行（douyin 优先用传入 state）**

```typescript
      params.state = state || Math.random().toString(36).substring(2, 10);
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd d:\zhao\strapi\plugins\zhao-third && npx jest tests/services/third-party-auth-state.test.ts --config tests/jest.config.js`
Expected: PASS — 3 个测试全过

- [ ] **Step 7: 提交**

```bash
cd d:\zhao\strapi
git add plugins/zhao-third/server/src/services/third-party-auth.ts plugins/zhao-third/tests/services/third-party-auth-state.test.ts
git commit -m "fix(zhao-third): getAuthUrl 透传前端 state 参数 (来源页路径), 随机值兜底"
```

---

## Task 3: C2 manifest.json mp-weixin.appid 填占位符

**Files:**
- Modify: `strapi-course/manifest.json:53`

- [ ] **Step 1: 修改 manifest.json 第 53 行**

将 `d:\zhao\strapi-course\manifest.json` 第 53 行：

```json
        "appid" : "",
```

改为：

```json
        "appid" : "wx0000000000000000",
```

- [ ] **Step 2: 提交**

strapi-course 是否独立 git 仓库需确认。若独立：
```bash
cd d:\zhao\strapi-course
git add manifest.json
git commit -m "fix(manifest): mp-weixin.appid 填占位符 (开发者需替换为真实 appid)"
```

若非独立仓库（属于 strapi 仓库）：
```bash
cd d:\zhao\strapi
git add strapi-course/manifest.json
git commit -m "fix(manifest): mp-weixin.appid 填占位符 (开发者需替换为真实 appid)"
```

执行时先 `git rev-parse --show-toplevel` 确认仓库根。

---

## Task 4: C3 海报组件删除 H5 分支 ctx.draw()

**Files:**
- Modify: `strapi-course/components/share-poster/share-poster.vue:267`

- [ ] **Step 1: 删除第 267 行**

在 `d:\zhao\strapi-course\components\share-poster\share-poster.vue` 第 267 行：

删除这行：
```typescript
  ctx.draw()
```

删除后第 266-269 行应为：
```typescript
  ctx.fillText('扫码立即体验', width / 2, y)
  
  generated.value = true
  // #endif
```

**注意**：只删 H5 分支的 `ctx.draw()`（第 267 行），非 H5 分支的 `ctx.draw(true, () => {...})`（第 337 行）保留不动。

- [ ] **Step 2: 提交**

仓库确认同 Task 3：
```bash
cd <strapi-course 仓库根>
git add components/share-poster/share-poster.vue
git commit -m "fix(poster): 删除 H5 分支 ctx.draw() (标准 Canvas 无此方法, 抛 TypeError)"
```

---

## Task 5: 回归验证 + 重建 dist

**Files:**
- 无新文件，仅运行命令

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd d:\zhao\strapi && npx tsc --noEmit -p plugins/zhao-third/tsconfig.json`
Expected: 0 errors（或仅预存错误，无新增）

- [ ] **Step 2: 运行 zhao-third 全套测试**

Run: `cd d:\zhao\strapi\plugins\zhao-third && npx jest --config tests/jest.config.js`
Expected: 所有测试通过（含 Task 1 的 5 个 + Task 2 的 3 个）

- [ ] **Step 3: 重建 zhao-third dist**

Run:
```bash
cd d:\zhao\strapi\plugins\zhao-third
npx -y @strapi/sdk-plugin build
```
Expected: 构建成功

- [ ] **Step 4: 启动 Strapi 验证无新报错**

Run: `cd d:\zhao\strapi && npm run dev`
Expected: Strapi 启动成功，无新错误日志

- [ ] **Step 5: 提交 dist 重建产物**

```bash
cd d:\zhao\strapi
git add plugins/zhao-third/dist
git commit -m "build: rebuild zhao-third dist after wechat fix"
```

---

## Self-Review

**Spec coverage:**
- C1 (控制器 siteId 类型错位) → Task 1 ✓
- C2 (mp-weixin.appid 为空) → Task 3 ✓
- C3 (海报 ctx.draw() TypeError) → Task 4 ✓
- C4 (getAuthUrl 覆盖 state) → Task 1 (控制器接收) + Task 2 (service 透传) ✓
- C5 (随 C1 自动解决) → 无需单独任务 ✓
- 测试策略 2 个测试文件 → Task 1 + Task 2 ✓
- 回归验证 → Task 5 ✓

**Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码 ✓

**Type consistency:**
- `siteDocId` 变量名在 Task 1 所有 5 处一致 ✓
- `state` 参数名在 Task 1 控制器 + Task 2 service 一致 ✓
- `getAuthUrl(platform, appType, redirectUrl, siteId, state)` 签名在 Task 1 调用 + Task 2 定义一致 ✓
- 测试 mock 中 `getAuthUrl` 被调用参数顺序与 service 签名一致 ✓

**Strapi 规范检查:**
- 控制器读 `ctx.state?.siteDocumentId` 与之前 config.ts 修复模式一致 ✓
- service 层参数名保持 `siteId?: string`（语义本就是 documentId），只加第 5 个 `state` 参数 ✓
- 未动 schema、未引入新 content-type ✓

**潜在卡点:**
1. zhao-third 插件原本无 tests 目录和 jest 依赖，Task 1 Step 2 需安装 jest/ts-jest/ts-node（对齐 zhao-auth 版本）
2. strapi-course 是否独立 git 仓库需在 Task 3/4 执行时确认
3. `npm run dev` 端口 1337 可能被占用，需先停掉旧实例
4. Task 1 测试用例的 mock 简化了 `strapi.plugin().service()` 链式调用，实际 mock 需确保每次调用返回同一实例（用 `jest.fn().mockReturnValue` 而非多次 `jest.fn()`）
