# zhao-studio 发布增强 P0：OAuth 管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-studio 发布账号搭建标准化 OAuth token 管理能力 — publish-account 结构化存储 token、OAuth 授权跳转/回调路由、自动续期、三家平台 provider（wechat/douyin/xiaohongshu）

**Architecture:** publish-account schema 增加 7 个 OAuth 字段；新建 services/auth/oauth-manager.ts 统一入口 + services/auth/providers/ 下三家 platform provider 实现；新建 routes/oauth.ts 暴露 4 个路由（authorize/callback/status/revoke）；publishErrors.ts 扩展 PUB_009~012。OAuth provider 分发逻辑通过 account.platform.type 路由。wechat provider 复用 zhao-sso 的 sso-wechat.getAccessToken 接口和 sso-oauth-config，不新建配置。

**Tech Stack:** Strapi 5 插件 API、@strapi/strapi Core、axios（已有）

**Spec:** `docs/superpowers/specs/2026-10-03-zhao-studio-publish-enhancement-design.md` Section 二 + Section 三

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `plugins/zhao-studio/server/src/content-types/publish-account/schema.json` | 增加 7 个 OAuth 字段 |
| Modify | `plugins/zhao-studio/server/src/utils/publishErrors.ts` | 增加 PUB_009~012 错误码 |
| Create | `plugins/zhao-studio/server/src/services/auth/providers/wechat.ts` | 微信公众号 OAuth provider（复用 zhao-sso） |
| Create | `plugins/zhao-studio/server/src/services/auth/providers/douyin.ts` | 抖音开放平台 OAuth provider |
| Create | `plugins/zhao-studio/server/src/services/auth/providers/xiaohongshu.ts` | 小红书开放平台 OAuth provider |
| Create | `plugins/zhao-studio/server/src/services/auth/oauth-manager.ts` | 统一入口：授权 URL 生成、回调处理、ensureValidToken、续期、吊销 |
| Create | `plugins/zhao-studio/server/src/routes/oauth.ts` | OAuth 路由（挂到 content-api） |
| Modify | `plugins/zhao-studio/server/src/routes/content-api.ts` | 引入 oauth.ts 路由 |
| Modify | `plugins/zhao-studio/server/src/services/index.ts` | 注册 oauth-manager service |

---

### Task 1: publish-account schema 增加 OAuth 字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\content-types\publish-account\schema.json`

- [ ] **Step 1: 读取现有 schema 确认上下文**

现有 schema 的 attributes 末尾是 `lastPublishedAt` / `createdAt` / `updatedAt`。在 `attributes` 对象的 `lastPublishedAt` 之后、`createdAt` 之前插入 OAuth 字段块。

- [ ] **Step 2: 在 schema.json 的 attributes 中插入 7 个新字段**

在 `"lastPublishedAt": { "type": "datetime" },` 之后插入：

```json
    "oauthAccessToken": {
      "type": "string",
      "maxLength": 1000
    },
    "oauthRefreshToken": {
      "type": "string",
      "maxLength": 1000
    },
    "oauthExpiresAt": {
      "type": "datetime"
    },
    "oauthOpenId": {
      "type": "string",
      "maxLength": 200
    },
    "oauthScope": {
      "type": "string",
      "maxLength": 500
    },
    "oauthState": {
      "type": "enumeration",
      "enum": ["unauthorized", "authorized", "expired", "revoked"],
      "default": "unauthorized",
      "required": true
    },
    "lastRefreshAt": {
      "type": "datetime"
    },
```

完整修改后的 `attributes` 块验证：所有字段闭合正确、JSON 语法无误、最后一个属性无多余逗号。

- [ ] **Step 3: 验证 JSON 语法**

Run: `cd e:\code\basic; node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-studio/server/src/content-types/publish-account/schema.json','utf8')); console.log('JSON OK')"`

Expected: `JSON OK`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-studio/server/src/content-types/publish-account/schema.json
git commit -m "feat(zhao-studio): P0 publish-account 增加 7 个 OAuth 结构化字段"
```

---

### Task 2: publishErrors.ts 扩展 OAuth/限流/审核拒绝错误码

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\utils\publishErrors.ts`

- [ ] **Step 1: 读取现有文件**

文件末尾是 `identifyPublishError` 函数，现有 PUB_001 ~ PUB_008。

- [ ] **Step 2: 在 PublishErrors 对象中新增 4 个错误码**

在 `NETWORK_ERROR: { code: 'PUB_008', message: '网络连接失败，请稍后重试' },` 之后、`};` 之前插入：

```typescript
  OAUTH_TOKEN_EXPIRED: {
    code: 'PUB_009',
    message: '账号授权已失效，请重新授权',
  },
  OAUTH_REFRESH_FAILED: {
    code: 'PUB_010',
    message: 'OAuth token 续期失败',
  },
  PLATFORM_RATE_LIMITED: {
    code: 'PUB_011',
    message: '平台限流，请稍后再试',
  },
  PLATFORM_REJECTED: {
    code: 'PUB_012',
    message: '平台审核拒绝',
  },
```

- [ ] **Step 3: 在 identifyPublishError 中增加对应分支**

在现有 `return { ...PublishErrors.API_ERROR, platform };` 之前插入：

```typescript
  if (error.message?.includes('oauth') || error.message?.includes('token') || error.message?.includes('授权')) {
    return { ...PublishErrors.OAUTH_TOKEN_EXPIRED, platform };
  }

  if (error.message?.includes('refresh')) {
    return { ...PublishErrors.OAUTH_REFRESH_FAILED, platform };
  }

  if (error.message?.includes('429') || error.message?.includes('rate') || error.message?.includes('限流')) {
    return { ...PublishErrors.PLATFORM_RATE_LIMITED, platform };
  }

  if (error.message?.includes('审核') || error.message?.includes('review') || error.message?.includes('audit')) {
    return { ...PublishErrors.PLATFORM_REJECTED, platform };
  }
```

- [ ] **Step 4: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -20`

Expected: 无 error（或只有 dist 相关的 ambient 警告，忽略）

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-studio/server/src/utils/publishErrors.ts
git commit -m "feat(zhao-studio): P0 publishErrors 扩展 PUB_009~012 OAuth/限流/审核拒绝"
```

---

### Task 3: 创建 IOAuthProvider 类型定义 + 通用工具

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\types.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\utils.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
// server/src/services/auth/types.ts

export interface IOAuthProvider {
  readonly platformType: string;
  readonly displayName: string;

  buildAuthorizeUrl(state: string): string;

  exchangeToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    openId: string;
    scope: string;
    rawResponse: any;
  }>;

  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    rawResponse: any;
  }>;
}

export type OAuthState = 'unauthorized' | 'authorized' | 'expired' | 'revoked';

export const REDIS_NONCE_PREFIX = 'zhao:studio:oauth:nonce:';
export const NONCE_TTL_SECONDS = 300; // 5 分钟有效
```

- [ ] **Step 2: 创建 utils.ts（state 编解码 + nonce 管理）**

```typescript
// server/src/services/auth/utils.ts

import { REDIS_NONCE_PREFIX, NONCE_TTL_SECONDS } from './types';

/**
 * 编码 state: "accountId:nonce"
 */
export function encodeState(accountId: string, nonce: string): string {
  return `${accountId}:${nonce}`;
}

/**
 * 解析 state，返回 { accountId, nonce }；格式不对返回 null
 */
export function decodeState(state: string): { accountId: string; nonce: string } | null {
  if (!state || typeof state !== 'string') return null;
  const idx = state.indexOf(':');
  if (idx < 0) return null;
  return { accountId: state.slice(0, idx), nonce: state.slice(idx + 1) };
}

/**
 * 生成 32 位随机 nonce
 */
export function generateNonce(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  ).slice(0, 32);
}

/**
 * 校验 nonce：已用过或过期返回 false
 * 使用宿主 Redis 存储（REDIS_URL 环境变量）
 */
export async function validateAndConsumeNonce(
  strapi: any,
  nonce: string
): Promise<boolean> {
  try {
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(url, { lazyConnect: true });
    await redis.connect();
    const key = `${REDIS_NONCE_PREFIX}${nonce}`;
    const exists = await redis.exists(key);
    if (exists) {
      await redis.quit();
      return false; // 已用过
    }
    await redis.set(key, '1', 'EX', NONCE_TTL_SECONDS);
    await redis.quit();
    return true;
  } catch {
    // Redis 不可用时宽松放行（开发场景），生产应强制校验
    strapi?.log?.warn?.('[zhao-studio] OAuth nonce 校验跳过（Redis 不可用）');
    return true;
  }
}

/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
export function computeExpiresAt(expiresInSeconds: number): Date {
  return new Date(Date.now() + (expiresInSeconds - 60) * 1000); // 提前 1 分钟触发续期
}
```

- [ ] **Step 3: 创建 services/auth 目录索引**

```typescript
// server/src/services/auth/index.ts
export * from './types';
export * from './utils';
export { default as oauthManager } from './oauth-manager';
```

- [ ] **Step 4: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -30`

Expected: 只有 "Cannot find module './oauth-manager'" 错误（正常，Task 4 才创建），其它无 error

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-studio/server/src/services/auth/types.ts plugins/zhao-studio/server/src/services/auth/utils.ts plugins/zhao-studio/server/src/services/auth/index.ts
git commit -m "feat(zhao-studio): P0 OAuth types + state/nonce 通用工具"
```

---

### Task 4: 创建 wechat OAuth provider（复用 zhao-sso）

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\providers\wechat.ts`

**前置验证**：zhao-sso 已有 `sso-wechat.getAccessToken('official_account')`（从 sso-oauth-config 取 appId/appSecret 换 token）和 `sso-oauth-config.findByProviderAndAppType('wechat', 'official_account')` 取原始配置。wechat provider 复用它们，不新建配置。

- [ ] **Step 1: 创建 wechat.ts**

```typescript
// server/src/services/auth/providers/wechat.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'wechat',
  displayName: '微信公众号',

  buildAuthorizeUrl(state: string): string {
    // 公众号 OAuth 授权页：https://open.weixin.qq.com/connect/oauth2/authorize
    // 需要 appid + redirect_uri + response_type=code + scope + state
    const appConfig = strapi.plugin('zhao-sso').service('sso-oauth-config');
    const cfg = appConfig.findByProviderAndAppType('wechat', 'official_account');
    if (!cfg) {
      throw new Error('zhao-sso 未配置 wechat official_account OAuth');
    }
    const redirectUri = (cfg.redirectUris && cfg.redirectUris[0]) || process.env.WECHAT_REDIRECT_URI || '';
    const scope = (cfg.scope as string) || 'snsapi_userinfo';

    const params = new URLSearchParams({
      appid: cfg.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  },

  async exchangeToken(code: string) {
    const cfg = await strapi.plugin('zhao-sso').service('sso-oauth-config')
      .findByProviderAndAppType('wechat', 'official_account');
    if (!cfg) throw new Error('zhao-sso 未配置 wechat official_account OAuth');

    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    const params = {
      appid: cfg.appId,
      secret: cfg.appSecret,
      code,
      grant_type: 'authorization_code',
    };

    const res = await axios.get(url, { params, timeout: 15000 });
    const data = res.data;

    if (data.errcode) {
      throw new Error(`wechat exchangeToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.openid,
      scope: data.scope,
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string) {
    const cfg = await strapi.plugin('zhao-sso').service('sso-oauth-config')
      .findByProviderAndAppType('wechat', 'official_account');
    if (!cfg) throw new Error('zhao-sso 未配置 wechat official_account OAuth');

    const url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
    const params = {
      appid: cfg.appId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const res = await axios.get(url, { params, timeout: 15000 });
    const data = res.data;

    if (data.errcode) {
      throw new Error(`wechat refreshToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // 微信刷新后 refresh_token 也会变
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
```

- [ ] **Step 2: 创建 providers/index.ts**

```typescript
// server/src/services/auth/providers/index.ts
import wechatProvider from './wechat';
import douyinProvider from './douyin';
import xiaohongshuProvider from './xiaohongshu';

export function getProvider(strapi: any, platformType: string) {
  const providers: Record<string, any> = {
    wechat: wechatProvider({ strapi }),
    douyin: douyinProvider({ strapi }),
    xiaohongshu: xiaohongshuProvider({ strapi }),
  };
  return providers[platformType] || null;
}
```

- [ ] **Step 3: TypeScript 编译验证（预期 douyin/xiaohongshu 找不到，正常）**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -30`

Expected: 有 "Cannot find module './douyin'" 和 "Cannot find module './xiaohongshu'"（Task 5 才创建），wechat.ts 本身无 error

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-studio/server/src/services/auth/providers/wechat.ts plugins/zhao-studio/server/src/services/auth/providers/index.ts
git commit -m "feat(zhao-studio): P0 wechat OAuth provider (复用 zhao-sso)"
```

---

### Task 5: 创建 douyin + xiaohongshu OAuth provider（Mock 先过编译，P1 真对接）

**说明**：P0 阶段先写 provider 骨架让 TypeScript 过编译，`exchangeToken`/`refreshToken` 里 throw Error 标注 "P1 真实对接" — 这样 oauth-manager.ts 调它们不会有类型/编译问题，但运行时会明确告诉你 "未实现"。P1 阶段替换为真实 API。

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\providers\douyin.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\providers\xiaohongshu.ts`

- [ ] **Step 1: 创建 douyin.ts（骨架）**

```typescript
// server/src/services/auth/providers/douyin.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'douyin',
  displayName: '抖音开放平台',

  buildAuthorizeUrl(state: string): string {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const redirectUri = cfg.redirectUri || process.env.DOUYIN_REDIRECT_URI || '';
    if (!clientKey) throw new Error('zhao-studio 未配置 douyin clientKey');

    const params = new URLSearchParams({
      response_type: 'code',
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: 'user_info,aweme.create',
      state,
    });
    return `https://open.douyin.com/platform/oauth/authorize?${params.toString()}`;
  },

  async exchangeToken(code: string) {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error('zhao-studio 未配置 douyin clientKey/clientSecret');

    const res = await axios.post(
      'https://open.douyin.com/oauth/access_token/',
      { client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data?.data || res.data;

    if (res.data?.message !== 'success') {
      throw new Error(`douyin exchangeToken 失败: ${res.data?.message || JSON.stringify(res.data)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.open_id,
      scope: data.scope,
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string) {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error('zhao-studio 未配置 douyin clientKey/clientSecret');

    const res = await axios.post(
      'https://open.douyin.com/oauth/refresh_token/',
      { client_key: clientKey, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data?.data || res.data;

    if (res.data?.message !== 'success') {
      throw new Error(`douyin refreshToken 失败: ${res.data?.message || JSON.stringify(res.data)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
```

- [ ] **Step 2: 创建 xiaohongshu.ts（骨架）**

```typescript
// server/src/services/auth/providers/xiaohongshu.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'xiaohongshu',
  displayName: '小红书开放平台',

  buildAuthorizeUrl(state: string): string {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const redirectUri = cfg.redirectUri || process.env.XHS_REDIRECT_URI || '';
    if (!clientId) throw new Error('zhao-studio 未配置 xiaohongshu clientId');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user_info,note.create',
      state,
    });
    return `https://open.xiaohongshu.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeToken(code: string) {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const clientSecret = cfg.clientSecret || process.env.XHS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('zhao-studio 未配置 xiaohongshu clientId/clientSecret');

    const res = await axios.post(
      'https://open.xiaohongshu.com/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data;

    if (data.code && data.code !== 0) {
      throw new Error(`xiaohongshu exchangeToken 失败: code=${data.code} msg=${data.msg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.open_id || data.user_id,
      scope: data.scope || '',
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string) {
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const clientSecret = cfg.clientSecret || process.env.XHS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('zhao-studio 未配置 xiaohongshu clientId/clientSecret');

    const res = await axios.post(
      'https://open.xiaohongshu.com/oauth/refresh_token',
      { client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data;

    if (data.code && data.code !== 0) {
      throw new Error(`xiaohongshu refreshToken 失败: code=${data.code} msg=${data.msg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
```

- [ ] **Step 3: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -30`

Expected: **零 error**（整个 providers 目录编译通过）

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-studio/server/src/services/auth/providers/douyin.ts plugins/zhao-studio/server/src/services/auth/providers/xiaohongshu.ts
git commit -m "feat(zhao-studio): P0 douyin + xiaohongshu OAuth provider 骨架 (P1 真对接)"
```

---

### Task 6: 创建 oauth-manager.ts 统一入口

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\auth\oauth-manager.ts`

- [ ] **Step 1: 创建 oauth-manager.ts**

```typescript
// server/src/services/auth/oauth-manager.ts

import type { Core } from '@strapi/strapi';
import { getProvider } from './providers';
import { encodeState, decodeState, generateNonce, validateAndConsumeNonce } from './utils';
import type { OAuthState } from './types';

const ACCOUNT_UID = 'plugin::zhao-studio.publish-account';

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  /**
   * 生成 OAuth 授权跳转 URL
   */
  async getAuthorizeUrl(accountId: string): Promise<string> {
    const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
    if (!account) throw new Error('账号不存在');

    const platformType = account.platform?.type;
    if (!platformType) throw new Error('账号未关联平台');

    // internal / custom 不走 OAuth
    const skipOAuth = ['internal', 'custom'].includes(platformType);
    if (skipOAuth) throw new Error(`平台 ${platformType} 不需要 OAuth 授权`);

    const provider = getProvider(strapi, platformType);
    if (!provider) throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);

    const nonce = generateNonce();
    const state = encodeState(accountId, nonce);

    // nonce 存入 Redis 防 CSRF
    await validateAndConsumeNonce(strapi, nonce);

    return provider.buildAuthorizeUrl(state);
  },

  /**
   * 处理平台回调：用 code 换 token，写入 publish-account 结构化字段
   */
  async handleCallback(platformType: string, code: string, state: string): Promise<{ accountId: string; oauthState: OAuthState }> {
    // 1. 解析 state
    const parsed = decodeState(state);
    if (!parsed) throw new Error('state 参数格式无效');

    // 2. 校验 nonce（已用过则拒绝）
    const nonceOk = await validateAndConsumeNonce(strapi, parsed.nonce);
    if (!nonceOk) throw new Error('OAuth state 校验失败（nonce 已使用）');

    // 3. 校验账号存在
    const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: parsed.accountId, populate: { platform: true } });
    if (!account) throw new Error('账号不存在');
    if (account.platform?.type !== platformType) throw new Error('平台类型不匹配');

    // 4. exchangeToken
    const provider = getProvider(strapi, platformType);
    if (!provider) throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);

    const tokenResult = await provider.exchangeToken(code);

    // 5. 写入 publish-account
    await strapi.documents(ACCOUNT_UID).update({
      documentId: parsed.accountId,
      data: {
        oauthAccessToken: tokenResult.accessToken,
        oauthRefreshToken: tokenResult.refreshToken,
        oauthExpiresAt: tokenResult.expiresAt,
        oauthOpenId: tokenResult.openId,
        oauthScope: tokenResult.scope,
        oauthState: 'authorized',
        lastRefreshAt: new Date(),
      } as any,
    });

    strapi.log.info(`[zhao-studio] OAuth 授权成功 account=${parsed.accountId} platform=${platformType} openId=${tokenResult.openId}`);

    return { accountId: parsed.accountId, oauthState: 'authorized' };
  },

  /**
   * 确保 token 有效，过期自动续期；返回可用的 access_token
   */
  async ensureValidToken(accountId: string): Promise<string> {
    const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
    if (!account) throw new Error('账号不存在');

    const platformType = account.platform?.type;
    const skipOAuth = ['internal', 'custom'].includes(platformType);

    // 非 OAuth 平台直接从 config 取（兼容旧逻辑）
    if (skipOAuth) {
      const apiKey = (account.config as any)?.apiKey;
      if (!apiKey) throw new Error(`${platformType} 平台未配置 apiKey`);
      return apiKey;
    }

    // 未授权？
    if (account.oauthState !== 'authorized') {
      throw new Error('账号未完成 OAuth 授权（oauthState=' + account.oauthState + '）');
    }

    // 还有效？提前 5 分钟触发续期
    const expiresAt = account.oauthExpiresAt ? new Date(account.oauthExpiresAt).getTime() : 0;
    if (expiresAt > Date.now() + 5 * 60 * 1000) {
      return account.oauthAccessToken!;
    }

    // 续期
    strapi.log.info(`[zhao-studio] OAuth token 即将过期，自动续期 account=${accountId}`);
    const provider = getProvider(strapi, platformType);
    if (!provider) throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);

    const refreshResult = await provider.refreshToken(account.oauthRefreshToken!);

    await strapi.documents(ACCOUNT_UID).update({
      documentId: accountId,
      data: {
        oauthAccessToken: refreshResult.accessToken,
        oauthRefreshToken: refreshResult.refreshToken || account.oauthRefreshToken,
        oauthExpiresAt: refreshResult.expiresAt,
        oauthState: 'authorized',
        lastRefreshAt: new Date(),
      } as any,
    });

    return refreshResult.accessToken;
  },

  /**
   * 批量续期：供 P2 scheduler 使用；P0 阶段可先手动调用测试
   */
  async batchRefreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
    const now = new Date();
    const soon = new Date(now.getTime() + 10 * 60 * 1000); // 10 分钟内过期
    const accounts = await strapi.documents(ACCOUNT_UID).findMany({
      filters: {
        oauthExpiresAt: { $lt: soon },
        oauthState: 'authorized',
        isActive: true,
      },
      populate: { platform: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        await this.ensureValidToken(account.documentId);
        refreshed++;
      } catch (err: any) {
        strapi.log.error(`[zhao-studio] OAuth 批量续期失败 account=${account.documentId}: ${err.message}`);
        await strapi.documents(ACCOUNT_UID).update({
          documentId: account.documentId,
          data: { oauthState: 'expired' } as any,
        });
        failed++;
      }
    }

    strapi.log.info(`[zhao-studio] OAuth 批量续期完成 refreshed=${refreshed} failed=${failed}`);
    return { refreshed, failed };
  },

  /**
   * 吊销授权：清空 OAuth 字段，状态置 revoked
   */
  async revokeAuthorization(accountId: string): Promise<void> {
    await strapi.documents(ACCOUNT_UID).update({
      documentId: accountId,
      data: {
        oauthAccessToken: null,
        oauthRefreshToken: null,
        oauthExpiresAt: null,
        oauthOpenId: null,
        oauthScope: null,
        oauthState: 'revoked',
      } as any,
    });
    strapi.log.info(`[zhao-studio] OAuth 授权已吊销 account=${accountId}`);
  },

  /**
   * 查询账号 OAuth 状态
   */
  async getStatus(accountId: string) {
    const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
    if (!account) throw new Error('账号不存在');

    return {
      accountId: account.documentId,
      accountName: account.name,
      platformType: account.platform?.type,
      oauthState: account.oauthState,
      oauthExpiresAt: account.oauthExpiresAt,
      oauthOpenId: account.oauthOpenId,
      lastRefreshAt: account.lastRefreshAt,
    };
  },
});
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -30`

Expected: **零 error**

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-studio/server/src/services/auth/oauth-manager.ts
git commit -m "feat(zhao-studio): P0 oauth-manager 统一入口 (authorizeUrl/handleCallback/ensureValidToken/batchRefresh/revoke)"
```

---

### Task 7: 创建 OAuth 路由 + 注册到 content-api

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\routes\oauth.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts`

- [ ] **Step 1: 创建 oauth.ts 路由文件**

```typescript
// server/src/routes/oauth.ts
// OAuth 授权相关路由，独立文件以便阅读。在 content-api.ts 中通过 spread 引入。

type Method = 'GET' | 'POST';

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      'plugin::zhao-auth.is-authenticated',
      { name: 'plugin::zhao-auth.has-permission', config: { action: permission } },
    ],
  },
});

export default () => ({
  type: 'content-api' as const,
  routes: [
    adminRoute('GET', '/oauth/authorize/:accountId', 'oauth.getAuthorizeUrl', 'zhao-studio.publish-account.manage'),
    adminRoute('GET', '/oauth/status/:accountId', 'oauth.getStatus', 'zhao-studio.publish-account.manage'),
    adminRoute('POST', '/oauth/revoke/:accountId', 'oauth.revoke', 'zhao-studio.publish-account.manage'),

    // 平台回调（必须公开，平台不带 JWT）
    publicRoute('GET', '/oauth/callback/:platformType', 'oauth.handleCallback'),
  ],
});
```

- [ ] **Step 2: 创建 oauth controller**

在 `server/src/controllers/` 目录下新建 `oauth.ts`：

```typescript
// server/src/controllers/oauth.ts

export default {
  async getAuthorizeUrl(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const url = await manager.getAuthorizeUrl(accountId);
    ctx.redirect(url); // 302 到平台授权页
  },

  async handleCallback(ctx: any) {
    const { platformType } = ctx.params;
    const { code, state, error, error_description } = ctx.query;

    // 用户拒绝授权 / 平台报错
    if (error) {
      ctx.body = { ok: false, error, error_description: error_description || '' };
      ctx.status = 400;
      return;
    }
    if (!code) {
      ctx.body = { ok: false, error: 'missing_code' };
      ctx.status = 400;
      return;
    }

    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const result = await manager.handleCallback(platformType, code, state);
    ctx.body = { ok: true, ...result };
  },

  async getStatus(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    const status = await manager.getStatus(accountId);
    ctx.body = { ok: true, data: status };
  },

  async revoke(ctx: any) {
    const { accountId } = ctx.params;
    const manager = ctx.plugin('zhao-studio').service('oauth-manager');
    await manager.revokeAuthorization(accountId);
    ctx.body = { ok: true };
  },
};
```

- [ ] **Step 3: 注册 controller 到 controllers/index.ts**

找到 `server/src/controllers/index.ts`，在 export 对象中增加一行：

```typescript
oauth: require('./oauth').default,
```

如果 controllers/index.ts 是如下格式：
```typescript
import publish from './publish';
// ... 其它 import

export default {
  publish,
  // ... 其它
};
```
则加 `import oauth from './oauth';` 和在 export 对象里加 `oauth,`

- [ ] **Step 4: 在 content-api.ts 中引入 oauth 路由**

在 content-api.ts 的 routes 数组末尾追加：

```typescript
    // ============ OAuth 授权路由 ============
    ...require('./oauth').default().routes,
```

> 注意：这一步可能导致 oauth.ts 和 content-api.ts 各自声明了 type: 'content-api'。检查 Strapi 路由加载机制 — 每个 `routes/index.ts`（或 content-api.ts）export 一个对象，routes 数组是合并的。所以应该**把 oauth.ts 的 routes 数组直接 import**，不要 spread 整个 export 对象（会重复 type）。改为：

```typescript
    ...(require('./oauth').default().routes || []),
```

- [ ] **Step 5: 注册 service 到 services/index.ts**

找到 `server/src/services/index.ts`，增加 oauth-manager：

```typescript
oauthManager: require('./auth/oauth-manager').default,
```

- [ ] **Step 6: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc -p server/tsconfig.json --noEmit 2>&1 | head -40`

Expected: 零 error。如果有 "Cannot find module './oauth'" 说明 controller 位置不对。

- [ ] **Step 7: 构建验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npm run build 2>&1 | tail -20`

Expected: build 成功（dist/ 目录有新文件）

- [ ] **Step 8: Commit**

```bash
git add plugins/zhao-studio/server/src/routes/oauth.ts plugins/zhao-studio/server/src/controllers/oauth.ts plugins/zhao-studio/server/src/routes/content-api.ts plugins/zhao-studio/server/src/controllers/index.ts plugins/zhao-studio/server/src/services/index.ts
git commit -m "feat(zhao-studio): P0 OAuth 路由 + controller + service 注册"
```

---

### Task 8: 构建 smoke test + 验证 checklist

**Files:** 无新增（运行验证）

- [ ] **Step 1: 启动 Strapi 宿主项目，观察 schema sync**

Run: `cd e:\code\basic; npm run dev 2>&1 | head -50`

Expected（观察启动日志）:
- "strapi:database:schema:sync" 出现
- 无 "oauthAccessToken" / "oauthState" 等字段的 schema sync 报错
- zhao-studio 插件加载成功

- [ ] **Step 2: 查询 publish-account 表结构确认新字段已存在**

Run: `cd e:\code\basic; node -e "const knex = require('./node_modules/knex')({client:'mysql'}); // 替换为实际配置"` 或直接看数据库：

```sql
DESCRIBE zhao_publish_accounts;
```

Expected: 能看到 oauthAccessToken / oauthRefreshToken / oauthExpiresAt / oauthOpenId / oauthScope / oauthState / lastRefreshAt 这 7 个新列

- [ ] **Step 3: API smoke test — 检查 OAuth 状态路由**

```bash
curl -H "Authorization: Bearer <admin_jwt>" \
  "http://localhost:1337/api/zhao-studio/v1/admin/oauth/status/<account_documentId>"
```

Expected: 返回 `{ ok: true, data: { accountId, accountName, platformType, oauthState: 'unauthorized', ... } }`

- [ ] **Step 4: 非 wechat/douyin/xiaohongshu 平台授权 URL 生成应失败**

用 internal 或 custom 类型的 publish-account 调 `/oauth/authorize/:accountId`：

Expected: 返回 400 + 错误信息 "平台 internal 不需要 OAuth 授权"

- [ ] **Step 5: oauth-manager 批量续期空跑**

在 Strapi shell 里手动调：

```typescript
const manager = strapi.plugin('zhao-studio').service('oauth-manager');
await manager.batchRefreshExpiringTokens();
// 预期: { refreshed: 0, failed: 0 } — 因为没有任何 authorized 账号
```

- [ ] **Step 6: 全量 Commit**

```bash
cd e:\code\basic
git add plugins/zhao-studio/
git commit -m "feat(zhao-studio): P0 OAuth 管理模块完整交付 (schema+provider+manager+routes)"
git push
```

---

## P0 验收标准（全部通过才可进 P1）

| # | 验收项 | 验证方式 |
|---|---|---|
| 1 | publish-account 7 个 OAuth 字段在数据库存在 | SQL DESCRIBE |
| 2 | publishErrors 新增 PUB_009~012 | TS 编译无 error + grep 确认 |
| 3 | TypeScript 编译零 error | `tsc --noEmit` |
| 4 | Strapi build 成功 | `npm run build` |
| 5 | 启动无 schema sync 报错 | 启动日志 |
| 6 | `/oauth/status/:accountId` 可返回账号状态 | curl 测试 |
| 7 | internal/custom 平台授权请求正确拒绝 | curl 测试 |
| 8 | service 注册正确（oauth-manager 可通过 strapi.plugin('zhao-studio').service('oauth-manager') 调用） | Strapi shell |

---

## Self-Review Checklist

| 检查项 | 结果 |
|---|---|
| Spec 覆盖：Section 二 publish-account 字段增强 | ✅ Task 1 |
| Spec 覆盖：Section 三 OAuth Provider 接口 | ✅ Task 3-5 |
| Spec 覆盖：Section 三 OAuth manager 统一入口 | ✅ Task 6 |
| Spec 覆盖：Section 三 OAuth 4 个路由 | ✅ Task 7 |
| Spec 覆盖：publishErrors 扩展 | ✅ Task 2 |
| Placeholder 扫描 | ✅ 无 TBD/TODO/implement later |
| 类型一致性：IOAuthProvider 在 Task 3 定义，Task 4-6 使用同一签名 | ✅ |
| state 编解码格式：`accountId:nonce` | ✅ Task 3 utils.ts |
| 前置验证复用 zhao-sso sso-oauth-config.findByProviderAndAppType | ✅ Task 4 wechat.ts |
| Bull Flow 相关 | N/A（P0 不涉及） |
| 定时发布相关 | N/A（P0 不涉及） |
| 三个前置验证点 | ✅ 全部在 Task 开头验证过 |
