# zhao-studio 发布增强 P1：平台 API 真对接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 微信公众号从"只建草稿"升级为"自动发布 + 轮询状态"；抖音新增 H5 schema URL 降级方案（普通企业主体无法申请 `video.create.bind` 服务端 API）；channel-adapter 在 publish 前统一调用 ensureValidToken。

**Architecture:** channel-adapter.ts publish() 方法前置 oauth-manager.ensureValidToken 做 token 准备（OAuth 平台用 access_token，internal/custom/toutiao/xiaohongshu 用 config.apiKey）；publishToWechat 在已有 sso-wx-article.create() 建草稿后，补调 freepublish/submit 提交发布，再轮询 freepublish/get 拿 publish_status；新增 douyin case 生成 `snssdk1128://openplatform/share` schema URL 返回给前端；toutiao + xiaohongshu 标记暂不支持服务端发布（无开放 API）。

**Tech Stack:** Strapi 5 plugin services, axios, zhao-sso (已有 sso-oauth-config + sso-wx-article), oauth-manager (P0 新建), 抖音 H5 发布 schema 协议

**Spec:** `docs/superpowers/specs/2026-10-03-zhao-studio-publish-enhancement-design.md` Section 五

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `server/src/services/channel-adapter.ts` | publish() 前置 ensureValidToken；publishToWechat 补 freepublish 链路；新增 douyin case；toutiao/xiaohongshu 标记不支持 |
| Modify | `server/src/services/publish.ts` | 适配 wechat 返回结构（不再 createdDraft=true）；处理 douyin schema URL 类型的返回 |
| Create | `server/src/services/platforms/wechat-publish.ts` | freepublish/submit + freepublish/get 独立模块（从 channel-adapter 拆出 keep focused） |
| Modify | `server/src/services/index.ts` | 注册 wechat-publish service（如果抽成独立 service） |

**不改动：** services/auth/*（P0 已完成）、content-types/*（P1 不改 schema）、controllers/*、routes/*

---

## 前置（从 P0 继承）

- oauth-manager 已注册为 `strapi.plugin('zhao-studio').service('oauth-manager')`，有 ensureValidToken(accountId) 方法返回有效 access_token
- wechat OAuth provider 复用 zhao-sso 的 sso-oauth-config.findByProviderAndAppType('wechat', 'official_account')
- publish-account 有 OAuth 结构化字段（oauthAccessToken / oauthRefreshToken / oauthState 等）
- 宿主 zhao-sso 的 sso-wx-article.create() 已可用（建草稿返回 draft_id）
- TypeScript 验证命令：`cd plugins/zhao-studio && npx tsc --noEmit`
- Build 命令：`cd plugins/zhao-studio && npm run build`

---

### Task 1: channel-adapter publish() 前置 ensureValidToken

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\channel-adapter.ts`

- [ ] **Step 1: Read 当前 channel-adapter.ts 确认 publish() 方法结构**

当前 publish() 方法：
```typescript
async publish(article: any, account: any) {
  const platformType = account.platform?.type || 'custom';

  // 1. 验证内容适配性
  const validation = validateContentForPlatform(article.content, article.title, platformType);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  // 2. 根据平台类型调用对应发布方法
  try {
    switch (platformType) {
      case 'toutiao': return await this.publishToToutiao(article, account);
      case 'xiaohongshu': return await this.publishToXiaohongshu(article, account);
      case 'wechat': return await this.publishToWechat(article, account);
      case 'internal': return await this.publishToInternal(article, account);
      case 'custom': return await this.publishToCustom(article, account);
      default: throw new Error('未知的渠道类型');
    }
  } catch (error: any) {
    const publishError = identifyPublishError(error, platformType);
    throw new Error(publishError.message);
  }
}
```

- [ ] **Step 2: 在 switch 之前插入 token 准备逻辑**

在 `try {` 之前插入：

```typescript
    // 2. 准备发布凭证：OAuth 平台走 oauth-manager.ensureValidToken
    //    internal/custom/toutiao/xiaohongshu 用 account.config.apiKey（兼容旧逻辑）
    let accessToken: string | null = null;
    const oauthPlatforms = ['wechat', 'douyin'];
    if (oauthPlatforms.includes(platformType)) {
      try {
        const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
        accessToken = await oauthManager.ensureValidToken(account.documentId || account.id);
      } catch (err: any) {
        // OAuth 平台但账号未授权 → 抛明确错误（PUB_009）
        throw new Error(`平台 ${platformType} 需要 OAuth 授权，请在账号管理页完成授权后重试（${err.message}）`);
      }
    }
```

- [ ] **Step 3: switch 各方法签名改为接收 accessToken 参数**

switch 里所有调用改为传 accessToken：
```typescript
case 'toutiao': return await this.publishToToutiao(article, account, accessToken);
case 'xiaohongshu': return await this.publishToXiaohongshu(article, account, accessToken);
case 'wechat': return await this.publishToWechat(article, account, accessToken);
case 'douyin': return await this.publishToDouyin(article, account, accessToken);  // 新增
case 'internal': return await this.publishToInternal(article, account);
case 'custom': return await this.publishToCustom(article, account, accessToken);
default: throw new Error(`暂不支持的平台类型: ${platformType}`);
```

- [ ] **Step 4: 更新所有已有 publishToXxx 方法签名**

在每个现有方法的参数列表中加 `accessToken?: string`。不改变其内部实现（内部还是用 `account.config?.apiKey`），先让签名一致。

- [ ] **Step 5: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1 | head -30`

预期：零 error。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-studio/server/src/services/channel-adapter.ts
git commit -m "feat(zhao-studio): P1 Task1 channel-adapter publish 前置 ensureValidToken + 签名统一"
```

---

### Task 2: wechat publishToWechat 补 freepublish 自动发布 + 轮询

**前置：** Task 1 完成后 publishToWechat 签名已变为 `(article, account, accessToken?)`

**微信 freepublish 接口（已验证）：**
- 建草稿（已有）：委托 `sso-wx-article.create()` 返回 `{ draft_id }`（即草稿的 media_id）
- **POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=ACCESS_TOKEN**，Body `{ media_id: DRAFT_MEDIA_ID }`，返回 `{ errcode, errmsg, publish_id, msg_data_id }`
- **POST https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=ACCESS_TOKEN**，Body `{ publish_id }`，返回 `{ publish_status, article_id, article_detail: { count, item: [{ article_url, idx }] } }`
- publish_status: 0=成功、1=审核中、2=审核拒绝

**关键：** freepublish/submit 用的是公众号的 access_token（不是 OAuth access_token），从 zhao-sso 的 sso-wechat.getAccessToken() 取，参数是 accessToken 类型的公众号凭证。当前 wechat OAuth provider 的 accessToken 是网页授权（snsapi_userinfo）拿的 openid 级别——**公众号 API 调用需要的是账号级 access_token**，从 zhao-sso 的 `sso-wechat.getAccessToken('official_account')` 获取，**不走 OAuth**。

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\channel-adapter.ts`

- [ ] **Step 1: Read 当前 publishToWechat 确认逻辑**

当前只调 sso-wx-article.create() 建草稿，返回 `{ success: true, createdDraft: true, draftId }`。

- [ ] **Step 2: 替换 publishToWechat 为完整的建草稿 → 提交发布 → 轮询状态 链路**

```typescript
  async publishToWechat(article: any, account: any, _accessToken?: string) {
    const ssoArticle = strapi.plugin('zhao-sso')?.service('sso-wx-article') as any;
    const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat') as any;
    if (!ssoArticle?.create || !ssoWx?.getAccessToken) {
      throw new Error('公众号协议执行器不可用：请确认已启用 zhao-sso 插件');
    }

    // Step A: 建草稿（已有）
    const draft = await ssoArticle.create({
      title: article.title,
      author: article.author || article.sourceAuthor || '',
      digest: article.aiSummary || String(article.content || '').substring(0, 100),
      content: article.content || '',
      thumb_media_id: account.config?.mediaId || '',
      content_source_url: article.sourceUrl || '',
    });

    const draftMediaId = draft.draft_id;
    if (!draftMediaId) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但无法自动发布（需人工确认 media_id）' };
    }

    // Step B: 获取公众号级 access_token（zhao-sso 的 sso-wechat.getAccessToken）
    const wxToken = await ssoWx.getAccessToken('official_account');
    if (!wxToken) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但 access_token 不可用，无法自动发布' };
    }

    // Step C: freepublish/submit 提交发布
    let submitRes: any;
    try {
      const resp = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${wxToken}`,
        { media_id: draftMediaId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      submitRes = resp.data;
    } catch (err: any) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `草稿已建立但提交发布失败: ${err.message}` };
    }

    if (submitRes.errcode !== 0) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `freepublish/submit 失败 errcode=${submitRes.errcode} errmsg=${submitRes.errmsg}` };
    }

    const publishId = submitRes.publish_id;

    // Step D: 轮询 freepublish/get（最多 10 次，每次间隔 5 秒）
    const MAX_POLL = 10;
    const POLL_INTERVAL_MS = 5000;
    let finalResult: any = null;

    for (let i = 0; i < MAX_POLL; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      try {
        const getResp = await axios.post(
          `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${wxToken}`,
          { publish_id: publishId },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        const data = getResp.data;

        if (data.publish_status === 0) {
          // 成功：返回 article_id + article_url
          const articleUrl = data.article_detail?.item?.[0]?.article_url;
          const articleId = data.article_id;
          return {
            success: true,
            externalId: articleId,
            url: articleUrl,
            publishId,
          };
        } else if (data.publish_status === 2) {
          // 审核拒绝
          return {
            success: false,
            error: `平台审核拒绝（freepublish_status=2）: ${JSON.stringify(data)}`,
            publishId,
          };
        }
        // publish_status === 1：审核中，继续轮询
        finalResult = data;
      } catch (err: any) {
        // 轮询请求本身出错，继续下一次
        continue;
      }
    }

    // 轮询超时：publish_id 已提交但最终状态未知
    return {
      success: true,
      externalId: publishId,
      error: '发布已提交但轮询超时，需后续确认',
      publishId,
      finalPollStatus: finalResult?.publish_status,
    };
  },
```

- [ ] **Step 3: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1 | head -30`

预期：零 error。

- [ ] **Step 4: Build 验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npm run build 2>&1 | tail -15`

预期：`✓ built`

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-studio/server/src/services/channel-adapter.ts
git commit -m "feat(zhao-studio): P1 Task2 wechat freepublish submit+get 自动发布链路"
```

---

### Task 3: 新增 douyin H5 schema 降级方案

**前置：** Task 1 已加 douyin case 占位

**抖音 H5 发布 schema 协议（已验证）：**
- 格式：`snssdk1128://openplatform/share?share_type=h5&client_key=xxx&nonce_str=xxx&timestamp=xxx&signature=xxx&video_path=xxx&title=xxx&...`
- 需要先拿 client_token（client_key + client_secret → `POST https://open.douyin.com/oauth/client_token/`）
- 再拿 open_ticket（`GET https://open.douyin.com/open/getticket/`，header 带 access-token: client_token）
- 然后 MD5 签名：`MD5(nonce_str=xxx&ticket=xxx&timestamp=xxx)`
- **我们的方案**：只生成 schema URL 返回给前端，用户点了跳转页面 → 显示二维码 → 用户用抖音 App 扫码 → App 内完成发布。后端不调任何抖音发布 API。

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\channel-adapter.ts`

- [ ] **Step 1: 在 channel-adapter.ts 顶部加 crypto import（MD5）**

```typescript
import * as crypto from 'crypto';
```

- [ ] **Step 2: 添加 generateDouyinShareSchema 辅助方法**

在 channel-adapter 对象里、publish 方法之前插入：

```typescript
  generateDouyinShareSchema({
    clientKey,
    ticket,
    videoPath,
    title,
    customCoverImageUrl,
  }: {
    clientKey: string;
    ticket: string;
    videoPath?: string;
    title: string;
    customCoverImageUrl?: string;
  }): string {
    const nonceStr = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 参数按 ASCII 码序拼接
    const kv: Record<string, string> = {
      ticket,
      timestamp,
      nonce_str: nonceStr,
    };
    const sortedKeys = Object.keys(kv).sort();
    const queryStr = sortedKeys.map(k => `${k}=${kv[k]}`).join('&');
    const signature = crypto.createHash('md5').update(queryStr).digest('hex');

    const params = new URLSearchParams({
      share_type: 'h5',
      client_key: clientKey,
      nonce_str: nonceStr,
      timestamp,
      signature,
      title,
    });
    if (videoPath) params.set('video_path', videoPath);
    if (customCoverImageUrl) params.set('custom_cover_image_url', customCoverImageUrl);

    return `snssdk1128://openplatform/share?${params.toString()}`;
  },
```

- [ ] **Step 3: 添加 getDouyinTicket 方法（client_token → ticket）**

```typescript
  async getDouyinTicket(clientKey: string, clientSecret: string): Promise<string> {
    // Step 1: client_token
    const tokenResp = await axios.post(
      'https://open.douyin.com/oauth/client_token/',
      { client_key: clientKey, client_secret: clientSecret, grant_type: 'client_credential' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    const clientToken = tokenResp.data?.data?.access_token;
    if (!clientToken) throw new Error(`douyin client_token 获取失败: ${JSON.stringify(tokenResp.data)}`);

    // Step 2: open_ticket
    const ticketResp = await axios.get('https://open.douyin.com/open/getticket/', {
      headers: { 'access-token': clientToken },
      timeout: 10000,
    });
    const ticket = ticketResp.data?.data?.ticket;
    if (!ticket) throw new Error(`douyin open_ticket 获取失败: ${JSON.stringify(ticketResp.data)}`);
    return ticket;
  },
```

- [ ] **Step 4: 新增 publishToDouyin 方法（H5 schema 降级）**

```typescript
  async publishToDouyin(article: any, account: any, _accessToken?: string) {
    // 抖音服务端 API (video.create.bind) 仅对党政/事业单位开放
    // 普通企业主体降级方案：生成 H5 分享 schema URL，由用户在前端扫码唤起抖音 App 发布
    const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error('未配置抖音 clientKey/clientSecret，无法生成分享 schema');
    }

    const ticket = await this.getDouyinTicket(clientKey, clientSecret);
    const videoPath = article.videoPath || article.videoUrl || article.coverImage;
    const schema = this.generateDouyinShareSchema({
      clientKey,
      ticket,
      videoPath,
      title: article.title || '',
      customCoverImageUrl: article.coverImage,
    });

    return {
      success: true,
      publish_mode: 'h5_share',
      schema,
      // publish.ts 前端会用这个 schema 生成二维码 + 跳转按钮
    };
  },
```

- [ ] **Step 5: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1 | head -30`

预期：零 error（crypto 是 Node.js 内置，不需要额外依赖）。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-studio/server/src/services/channel-adapter.ts
git commit -m "feat(zhao-studio): P1 Task3 douyin H5 schema 降级方案 (getDouyinTicket + generateDouyinShareSchema)"
```

---

### Task 4: toutiao + xiaohongshu + bilibili 标记暂不支持

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\channel-adapter.ts`

- [ ] **Step 1: 替换 publishToToutiao 为明确不支持**

```typescript
  async publishToToutiao(article: any, account: any, _accessToken?: string) {
    // 头条内容发布 API 属于巨量引擎开放平台 (open.oceanengine.com) 的广告投放域，
    // 不是内容开放平台；头条的内容侧发布能力暂未向第三方开放。
    throw new Error('头条发布 API 暂未对外开放，需等待巨量引擎内容侧开放或采用 RPA 方案');
  },
```

- [ ] **Step 2: 替换 publishToXiaohongshu 为明确不支持**

```typescript
  async publishToXiaohongshu(article: any, account: any, _accessToken?: string) {
    // 小红书开放平台 (open.xiaohongshu.com) 目前只开放电商/商品/订单接口，
    // 发布笔记 API 未开放，后续需采用 RPA (Appium 云手机) 方案。
    throw new Error('小红书发布笔记 API 暂未对外开放，后续需 RPA 方案');
  },
```

- [ ] **Step 3: switch 中加 bilibili case（publish-platform enum 有但 switch 没有）**

在 switch 里加：
```typescript
case 'bilibili':
  throw new Error('bilibili 服务端发布 API 暂未接入，需调研 bilibili 开放平台能力');
```

- [ ] **Step 4: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1 | head -30`

预期：零 error。

- [ ] **Step 5: Build 验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npm run build 2>&1 | tail -10`

预期：`✓ built`

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-studio/server/src/services/channel-adapter.ts
git commit -m "feat(zhao-studio): P1 Task4 toutiao/xiaohongshu/bilibili 标记暂不支持服务端发布"
```

---

### Task 5: publish.ts 适配 wechat 新返回结构 + douyin schema URL

**前置：** Task 2 之后，wechat 不再返回 `createdDraft: true`，改为返回 `success: true + externalId + url`（真正发布成功）或 `publishId`（轮询超时）或 `error`（审核拒绝）。

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\publish.ts`

- [ ] **Step 1: Read 当前 publish.ts 的 publishArticle 方法**

关键区域在 36-112 行：for 循环里调 `channelAdapter.publish(adaptedContent, account)`，然后根据 `result.createdDraft` 决定文章状态。

- [ ] **Step 2: 修改 publish-record 创建逻辑适配新返回结构**

publishArticle 方法中，**在 for 循环的 try 块内**，把 publish-record 的 data 创建改为：

找到当前 publish-record create 的 data 块，把 error 字段从：
```typescript
error: result.createdDraft
  ? JSON.stringify({ platform: 'wechat', phase: 'draft', draftId: result.draftId })
  : result.error,
```

改为：
```typescript
// wechat 新逻辑：freepublish 自动发布，不再 createdDraft 中间态
// douyin h5_share：成功生成 schema，前端处理后续
const isSchemaOnly = result.publish_mode === 'h5_share';
error: isSchemaOnly
  ? JSON.stringify({ platform: 'douyin', phase: 'h5_share', schema: result.schema })
  : result.error,
```

同时把 `success` 字段逻辑改为：
```typescript
status: isSchemaOnly ? 'queued' : (result.success ? 'success' : 'failed'),
```
（schema URL 生成成功，但真正发布在用户端完成，所以状态是 queued 等前端扫码后再更新）

- [ ] **Step 3: 修改 results.push 数据**

results.push 的 data 块里，新增：
```typescript
h5ShareSchema: result.schema,    // douyin 降级方案
h5Share: isSchemaOnly,
url: result.url,                   // wechat freepublish 成功返回的 article_url
publishId: result.publishId,       // wechat 轮询返回
```

- [ ] **Step 4: 修改文章状态更新逻辑（底部 successCount 判断）**

当前：
```typescript
const successCount = results.filter((r) => r.success && !r.createdDraft).length;
```

改为：
```typescript
const successCount = results.filter((r) => r.success && !r.h5Share).length;
```
（h5_share 是前端待处理的，不算已发布）

- [ ] **Step 5: TypeScript 编译验证**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1 | head -30`

预期：零 error。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-studio/server/src/services/publish.ts
git commit -m "feat(zhao-studio): P1 Task5 publish.ts 适配 wechat freepublish 返回 + douyin h5_share"
```

---

### Task 6: 构建 + smoke test

**Files:** 无新增（运行验证）

- [ ] **Step 1: 全量 TypeScript 编译**

Run: `cd e:\code\basic\plugins\zhao-studio; npx tsc --noEmit 2>&1`

预期：零输出（零 error）。

- [ ] **Step 2: Build**

Run: `cd e:\code\basic\plugins\zhao-studio; npm run build 2>&1 | tail -20`

预期：`✓ built in Ns` + `admin bundle ✓ built`

- [ ] **Step 3: 启动 Strapi 验证插件注册**

Run: `cd e:\code\basic; npm run dev 2>&1 | head -60`

观察日志：
- schema sync 无报错
- zhao-studio 插件注册成功
- 无 channel-adapter / publish 相关 import error

- [ ] **Step 4: 手动 API 测试（需要 Strapi 运行中）**

在第二个终端：
```bash
# 用 Strapi shell 验证 channel-adapter 能被调起
cd e:\code\basic; npx strapi shell
```

Shell 内：
```javascript
const adapter = strapi.plugin('zhao-studio').service('channel-adapter');
// 验证 wechat case 存在
Object.keys(adapter).filter(k => k.startsWith('publish'))
// 预期：['publish', 'publishToToutiao', 'publishToXiaohongshu', 'publishToWechat', 'publishToInternal', 'publishToCustom', 'publishToDouyin', 'generateDouyinShareSchema', 'getDouyinTicket', 'adaptContent', 'checkExternalStatus']
```

- [ ] **Step 5: 停止 Strapi + Commit + Push**

```bash
# Ctrl+C 停止 Strapi
cd e:\code\basic
git add plugins/zhao-studio/
git commit -m "feat(zhao-studio): P1 平台 API 对接完整交付 (wechat freepublish + douyin H5 schema + toutiao/xiaohongshu 不支持标记)"
git push
```

---

## P1 验收 Checklist

| # | 验收项 | 验证方式 |
|---|---|---|
| 1 | TypeScript 零 error | `tsc --noEmit` |
| 2 | Build 成功 | `npm run build` |
| 3 | Strapi 启动无 schema/import 报错 | 启动日志 |
| 4 | channel-adapter 方法签名含 accessToken 参数 | tsc 已过 + shell Object.keys |
| 5 | 有 publishToDouyin 方法 | shell 验证 |
| 6 | wechat freepublish/submit 代码存在 | grep `freepublish/submit` |
| 7 | wechat 轮询 freepublish/get 存在 + publish_status 判断 | grep `publish_status` |
| 8 | douyin H5 schema 生成代码存在 | grep `snssdk1128` + `generateDouyinShareSchema` |
| 9 | toutiao/xiaohongshu 抛明确错误信息 | grep "暂不支持" |
| 10 | publish.ts 不再依赖 `createdDraft` 字段 | grep `createdDraft` 确认 publish.ts 里没有（channel-adapter 里 wechat 返回结构已变） |

---

## Self-Review Checklist

| 检查项 | 结果 |
|---|---|
| Spec 覆盖：Section 五 wechat freepublish | ✅ Task 2 完整覆盖 submit + get 轮询 |
| Spec 覆盖：Section 五 douyin | ✅ Task 3 降级为 H5 schema（普通企业主体无服务端 API） |
| Spec 覆盖：publish.ts 适配新返回 | ✅ Task 5 |
| Spec 覆盖：channel-adapter 重构 | ✅ Task 1 统一签名 + Task 4 toutiao/xiaohongshu/bilibili |
| Placeholder 扫描 | ✅ 无 TBD/TODO |
| 类型一致性：ensureValidToken 签名 `ensureValidToken(accountId: string): Promise<string>` | ✅ P0 oauth-manager 定义，Task 1 调用一致 |
| wechat access_token 来源 | ✅ Task 2 明确调 `ssoWx.getAccessToken('official_account')`，不走 OAuth accessToken 参数（微信公众号 API 与 openid OAuth 是两个 token 体系） |
| douyin client_token 接口 | ✅ Task 3 `POST https://open.douyin.com/oauth/client_token/` + `open/getticket/` |
| toutiao/xiaohongshu/bilibili 不支持 | ✅ Task 4 |
| internal/custom 不受影响 | ✅ Task 1 switch 里 internal 没加 accessToken（它走 config.channelCode，不需要 token），custom 加了但不改变内部实现 |
| publish-record status 新值 | ✅ Task 5 douyin h5_share 时 status='queued'（P0 未扩 publish-record status 枚举，P2 再扩） |
| oauth-manager 调用时机 | ✅ publish() 前置，只对 wechat/douyin 走 OAuth（但 wechat 的 freepublish 实际用的是 sso-wechat 公众号 token，不是 OAuth openid token — 这个设计正确，公众号 API 和网页 OAuth 是两个 token） |

---

## P1 vs Spec 差异记录（主动记录，诚实面对）

| Spec 说 | P1 实际 | 原因 |
|---|---|---|
| douyin 服务端 create_video API | 降级为 H5 schema URL | 主体是普通企业，video.create.bind 能力仅对党政/事业单位开放（抖音官方 2023-12-11 公告） |
| xiaohongshu note.create 真实 API | 标记暂不支持，后续 RPA | 小红书开放平台无发布笔记 API，只有电商/商品/订单接口 |
| toutiao 对接 | 标记暂不支持 | 头条内容发布 API 归巨量引擎，但巨量引擎开放的是广告投放域 |
| bilibili switch 补 case | ✅ 已补（标记不支持） | publish-platform enum 有但原来 switch 没有 |
