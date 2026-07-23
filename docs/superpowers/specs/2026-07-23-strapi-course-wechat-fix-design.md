# strapi-course 微信功能卡点修复设计

- **日期**: 2026-07-23
- **范围**: `plugins/zhao-third`（后端）、`strapi-course`（C 端 uni-app）
- **状态**: 已批准，待生成实现计划

## 1. 问题边界

C 端项目 `d:\zhao\strapi-course` 已有完整的微信功能实现（H5 登录、小程序登录、JSSDK 分享、海报组件），但存在 5 个卡点导致功能不可用或有缺陷。

### 1.1 卡点清单

| # | 严重度 | 现象 | 根因 |
|---|---|---|---|
| C1 | 阻断 | 所有微信功能（H5 登录、小程序登录、JSSDK 签名）全断 | `zhao-third` 5 个控制器读 `ctx.state?.siteId`（数字主键）传给 service，但 `third-party-config.ts:42` 用 `.where("document_id", siteId)` 查询（document_id 是字符串）→ 永远查不到三方配置 |
| C2 | 阻断 | 微信开发工具登录直接失败 | `strapi-course/manifest.json:53` 的 `mp-weixin.appid` 为空字符串 |
| C3 | 功能 Bug | H5 海报生成后抛 TypeError | `share-poster.vue:267` H5 分支用标准 Canvas 2D Context，但调用了 `ctx.draw()`（uni-app CanvasContext 方法，标准 Canvas 没有） |
| C4 | 功能 Bug | 微信授权回调后无法跳回来源页，总是回到首页 | `third-party-auth.ts:35` `getAuthUrl` 用随机值覆盖前端传的 `state`（来源页路径） |
| C5 | 潜在 | JSSDK 签名依赖 site-resolver 回退，回退失败时拿不到配置 | 前端请求带 `?domain=xxx`，但后端控制器不处理 query 中的 domain，依赖中间件回退 |

### 1.2 关键事实

- `third-party-config.ts:42` 用 `.where("document_id", siteId)` 查询，本就是按 documentId 查，是上游控制器传错了类型（数字 id vs documentId 字符串）
- `third-party-auth.ts:479` 的 `wechatRedirectCallback` 内部正确用了 `site.documentId`，证明项目已约定 documentId 查询
- C5 随 C1 修复自动解决：site-resolver 中间件已在上一轮修复中加 domain 回退，C1 修复后控制器正确读取 `siteDocumentId`
- 前端 `utils/wx-jssdk.ts`/`wx-login.ts`/`wx-h5-login.ts` 实现正确，问题在后端

## 2. 修复原则

1. **C1 与之前 config.ts 修复模式一致**：控制器改读 `ctx.state?.siteDocumentId` 而非 `ctx.state?.siteId`，service 层不动
2. **C2 用占位符而非真实 appid**：微信 appid 是敏感配置，不应硬编码；占位符 `wx0000000000000000` 是合法格式但无效，微信开发工具会提示但不会崩溃
3. **C3 只删 H5 分支的 `ctx.draw()`**：非 H5 分支（uni-app CanvasContext）的 `ctx.draw(true, () => {...})` 保留不动
4. **C4 优先用前端传的 state，随机值兜底**：alipay 分支不加 state（支付宝 OAuth 无 state 参数）
5. **C5 不单独修**：随 C1 自动解决

## 3. C1 后端 siteId 类型错位修复

### 3.1 当前问题

`d:\zhao\strapi\plugins\zhao-third\server\src\controllers\third-party-auth.ts` 的 5 个控制器方法都读 `ctx.state?.siteId`（数字主键）传给 service，但 service 层 `third-party-config.ts:42` 用 `.where("document_id", siteId)` 查询（document_id 是字符串）→ 永远查不到三方配置 → 所有微信功能全断。

### 3.2 修复方案

**文件**：`d:\zhao\strapi\plugins\zhao-third\server\src\controllers\third-party-auth.ts`

5 个控制器方法统一改 `ctx.state?.siteId` → `ctx.state?.siteDocumentId`，变量名 `siteId` → `siteDocId`：

| 行号 | 方法 | 当前 | 修复后 |
|---|---|---|---|
| 14 | authUrl | `const siteId = ctx.state?.siteId;` | `const siteDocId = ctx.state?.siteDocumentId;` |
| 16 | authUrl | `getAuthUrl(platform, appType, redirectUrl, siteId)` | `getAuthUrl(platform, appType, redirectUrl, siteDocId)` |
| 36 | qrconnectUrl | `const siteId = ctx.state?.siteId;` | `const siteDocId = ctx.state?.siteDocumentId;` |
| 38 | qrconnectUrl | `getQrconnectUrl(redirectUrl, siteId)` | `getQrconnectUrl(redirectUrl, siteDocId)` |
| 58 | callback | `const siteId = ctx.state?.siteId;` | `const siteDocId = ctx.state?.siteDocumentId;` |
| 67 | callback | `siteId,` (传入参数) | `siteDocId,` |
| 81 | publicConfig | `const siteId = ctx.state?.siteId;` | `const siteDocId = ctx.state?.siteDocumentId;` |
| 84 | publicConfig | `getPublicConfig(platform, appType, siteId)` | `getPublicConfig(platform, appType, siteDocId)` |
| 131 | jssdkSignature | `const siteId = ctx.state?.siteId;` | `const siteDocId = ctx.state?.siteDocumentId;` |
| 133 | jssdkSignature | `getJssdkSignature(url, siteId)` | `getJssdkSignature(url, siteDocId)` |

### 3.3 不改的文件

- `services/third-party-auth.ts` — service 层参数名已是 `siteId?: string`，语义本就是 documentId，只是上游传错了类型，类型对了自然工作
- `services/third-party-config.ts` — `.where("document_id", siteId)` 本就是按 document_id 查，上游传对了自然工作
- `wechatRedirectCallback`（第 143 行）— 内部自己用 `site.documentId`，不走 ctx.state，无此 bug

## 4. C2 mp-weixin.appid 填占位符

### 4.1 修复方案

**文件**：`d:\zhao\strapi-course\manifest.json:53`

```json
"mp-weixin" : {
    "appid" : "wx0000000000000000",
    ...
}
```

用 `"wx0000000000000000"` 占位符（合法格式但无效），微信开发工具会提示"appid 无效"但不会崩溃。开发者替换为真实 appid 即可。

### 4.2 设计决策

- **不写真实 appid**：微信 appid 是敏感配置，不应硬编码在代码中
- **占位符 + 文档说明是正确做法**：manifest.json 不支持注释，所以不写注释，只在 plan 中记录
- **预期行为**：微信开发工具会提示"appid 无效"，开发者需替换为真实 appid

## 5. C3 海报组件 H5 分支删除 ctx.draw()

### 5.1 当前问题

`d:\zhao\strapi-course\components\share-poster\share-poster.vue:267` H5 分支用标准 Canvas 2D Context（第 182 行 `canvas.getContext('2d')`），但第 267 行调用了 `ctx.draw()`（这是 uni-app CanvasContext 的方法，标准 Canvas 没有）→ 抛 TypeError。

### 5.2 修复方案

**文件**：`d:\zhao\strapi-course\components\share-poster\share-poster.vue`

删除第 267 行 `ctx.draw()`。

H5 分支的所有绘制操作（fillRect/drawImage/fillText）已经即时渲染到 canvas，不需要 `draw()` 调用。

### 5.3 设计决策

- **只删 H5 分支（第 267 行）**：非 H5 分支（第 337 行 `ctx.draw(true, () => {...})`）是 uni-app CanvasContext 的正确用法，保留不动
- **不加 try-catch 兜底**：删除 bug 代码即可，不引入不必要复杂度

## 6. C4 后端 getAuthUrl 透传前端 state

### 6.1 当前问题

`d:\zhao\strapi\plugins\zhao-third\server\src\services\third-party-auth.ts:35` `getAuthUrl` 用 `params.state = Math.random()...` 覆盖，忽略了前端 `wx-h5-login.ts:47` 传的 `state`（来源页路径）→ 微信授权回调后无法跳回来源页，总是回到首页。

### 6.2 修复方案

**文件**：`d:\zhao\strapi\plugins\zhao-third\server\src\controllers\third-party-auth.ts:6`

控制器 `authUrl` 第 6 行解构 body 时加入 `state`：

```typescript
const { platform, appType, redirectUrl, state } = ctx.request.body;
```

第 16 行调用 service 时传入 `state`：

```typescript
const result = await authService.getAuthUrl(platform, appType, redirectUrl, siteDocId, state);
```

**文件**：`d:\zhao\strapi\plugins\zhao-third\server\src\services\third-party-auth.ts:10`

`getAuthUrl` 签名加 `state?: string` 参数，第 35 行改为优先用传入的 state：

```typescript
async getAuthUrl(platform: string, appType: string, redirectUrl: string, siteId?: string, state?: string) {
  ...
  if (platform === "wechat") {
    ...
    params.state = state || Math.random().toString(36).substring(2, 10);  // 优先用前端传的 state
  } else if (platform === "douyin") {
    ...
    params.state = state || Math.random().toString(36).substring(2, 10);
  }
  ...
}
```

### 6.3 设计决策

- **alipay 分支不加 state**：支付宝 OAuth 无 state 参数
- **wechat 和 douyin 保留随机值兜底**：前端未传 state 时用随机值，保持向后兼容
- **state 不做格式校验**：微信对 state 只要求原样返回，格式不限

## 7. C5 随 C1 自动解决

经复查，`site-resolver` 中间件已在上一轮修复中加 domain 回退逻辑。JSSDK 请求带 `?domain=xxx` 会触发 site-resolver → 设置 `ctx.state.siteDocumentId` → C1 修复后控制器正确读取。**C5 随 C1 修复自动解决**，无需额外改动。

## 8. 测试策略（TDD）

| 测试文件 | 覆盖 | 关键用例 |
|---|---|---|
| `plugins/zhao-common/tests/controllers/third-party-auth.test.ts`（新增） | C1 | 5 个控制器方法都读 `siteDocumentId`（非 `siteId`）传给 service |
| `plugins/zhao-common/tests/services/third-party-auth-state.test.ts`（新增） | C4 | 1. 前端传 state → 透传给微信 authorizeUrl<br>2. 前端不传 state → 用随机值兜底 |

**不写测试**：
- C2（manifest.json appid）— 配置文件，无逻辑可测
- C3（删除 ctx.draw()）— 前端 uni-app 组件，需 H5 运行时验证，单元测试成本高收益低
- C5 — 随 C1 自动解决，不单独测

## 9. 改动文件清单（共 4 源文件 + 2 测试文件）

### 后端源文件（2）

1. `plugins/zhao-third/server/src/controllers/third-party-auth.ts` — 5 处 siteId → siteDocId + authUrl 接收 state（C1+C4）
2. `plugins/zhao-third/server/src/services/third-party-auth.ts` — getAuthUrl 加 state 参数（C4）

### 前端源文件（2）

3. `strapi-course/manifest.json` — mp-weixin.appid 填占位符（C2）
4. `strapi-course/components/share-poster/share-poster.vue` — 删除 H5 分支 ctx.draw()（C3）

### 测试文件（2 新增）

5. `plugins/zhao-common/tests/controllers/third-party-auth.test.ts`
6. `plugins/zhao-common/tests/services/third-party-auth-state.test.ts`

### 不改的文件

- `services/third-party-config.ts` — 按 document_id 查询本就正确
- `utils/wx-jssdk.ts`/`wx-login.ts`/`wx-h5-login.ts` — 前端实现正确，问题在后端
- `wechatRedirectCallback` — 内部自取 documentId，无此 bug

## 10. 验证点

1. **后端测试**：`npx jest` zhao-third 相关测试全过
2. **TypeScript**：`npx tsc --noEmit -p plugins/zhao-third/tsconfig.json` 0 errors
3. **重建 dist**：`npx @strapi/sdk-plugin build` zhao-third
4. **启动 Strapi**：无新报错
5. **手动验证**（需微信环境）：
   - 微信浏览器内 H5 登录：能获取授权 URL 并跳转
   - 微信开发工具小程序登录：替换真实 appid 后能 `uni.login`
   - 分享好友/朋友圈：JSSDK 签名能获取，分享内容正确
   - 海报生成：H5 环境不报 TypeError，海报正常显示

## 11. 回归风险

| 风险 | 缓解 |
|---|---|
| 其他 zhao-third 控制器也误用 siteId | 全局检索确认只有这 5 个方法 + wechatRedirectCallback（后者无 bug） |
| getAuthUrl 加 state 参数破坏其他调用方 | 检索确认仅 `controllers/third-party-auth.ts:16` 一处调用 |
| 海报删除 ctx.draw() 影响非 H5 | 只删 H5 分支（第 267 行），非 H5 分支（第 337 行）保留 |
| manifest.json appid 占位符导致微信开发工具报错 | 预期行为，开发者需替换为真实 appid，已在设计中说明 |
