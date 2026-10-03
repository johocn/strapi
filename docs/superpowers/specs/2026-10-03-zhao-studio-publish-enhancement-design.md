# zhao-studio 多媒体发布功能完善 — 设计文档

**日期**：2026-10-03
**关联项目**：`basic/plugins/zhao-studio`（Strapi 5 插件）
**设计目标**：在现有发布基座上，补齐 OAuth 授权、真实平台 API 对接、Bull 全链路队列、定时发布四大缺口
**交付节奏**：P0 → P1 → P2 → P3 四阶段渐进式，每阶段独立可验证

---

## 零、现有基座盘点（已验证源码）

### 0.1 已有 content-types（发布相关）

| 模型 | schema.json | 关键字段 |
|---|---|---|
| publish-platform | `zhao_publish_platforms` | `type` 枚举：toutiao/xiaohongshu/wechat/**douyin**/**bilibili**/taobao/pdd/douyin-ecom/jd/custom/internal |
| publish-account | `zhao_publish_accounts` | 关联 platform，`config` 裸 JSON，无 OAuth 结构化字段 |
| publish-record | `zhao_publish_records` | `status`: pending/success/failed，有 retryCount |
| channel-platform-config | `zhao_channel_platform_configs` | promo-channel × publish-platform 推广位（**不动**） |
| article-draft | `zhao_article_drafts` | `status`: draft/processing/ready/published，有 AI 处理字段 |

### 0.2 已有服务层

| 文件 | 用途 | 已知缺口 |
|---|---|---|
| `services/publish.ts` | 发布入口，一篇文章→多账号循环发布 | **同步 for 循环，阻塞请求** |
| `services/channel-adapter.ts` | 平台适配器 | switch-case 只有 toutiao/xiaohongshu/wechat/internal/custom，**douyin/bilibili enum 里有但 switch 没有 case** |
| `utils/platformAdapters.ts` | 平台元数据（标题/内容长度限制） | 完整 |
| `utils/publishErrors.ts` | 错误码分类 | 缺 OAuth/限流/审核拒绝错误码 |

### 0.3 已有基础设施

- **Bull 队列**：`plugins/zhao-channel` 已在用 Bull v4.16.4 + ioredis v5.4.2，通过 `REDIS_URL` 环境变量连接
- **宿主项目**：basic，zhao-studio 插件运行在 Strapi 5 上
- **前端页面**：`web/src/pages/studio/{publish-platform,publish-account,publish-record,publish-center}/` 已存在列表/编辑/详情页

### 0.4 明确不改动的模块

promo-channel / promo-campaign / ad-zone / ad-slot / ad-content / stat-summary / ab-experiment / ab-variant / collect-task / collect-source / poster-template / poster-element / browser-log / sync-event / knowledge-point-index / channel-platform-config — 采集/广告/分析/推广渠道等模块保持原样。

---

## 一、整体架构与四阶段依赖链

### 1.1 新增模块位置

全部在 `basic/plugins/zhao-studio/server/src/` 下，与现有 services/content-types/utils/routes 同目录同风格。

```
新增目录/文件:
services/auth/
  ├── oauth-manager.ts            ← 统一入口：授权/续期/分发
  └── providers/
      ├── wechat.ts               ← 微信公众号 OAuth
      ├── douyin.ts               ← 抖音开放平台 OAuth
      └── xiaohongshu.ts          ← 小红书开放平台 OAuth
services/publish-queue.ts         ← Bull Flow 各阶段 handler + 入队入口
services/scheduler.ts             ← 定时发布扫描 + OAuth 批量续期
utils/queue.ts                    ← 两个 Bull Queue 实例 + Flow 定义
routes/oauth.ts                   ← OAuth 授权/回调路由
content-types/publish-schedule/   ← 定时发布任务表（新建）
```

### 1.2 四阶段交付链

```
P0 OAuth 管理（公众号优先） ──→ P1 平台 API 真对接 ──→ P2 队列+定时 ──→ P3 基础补齐
```

| 阶段 | 核心交付 | 前置 | 验收标志 |
|---|---|---|---|
| **P0 OAuth 管理** | publish-account 加 OAuth 结构化字段 + OAuth 授权路由/回调 + 自动续期 + 公众号优先 | 无 | 账号可跳转平台授权、token 自动续期、publish-record 用真实 token 而非裸 apiKey |
| **P1 API 真对接** | 公众号补 freepublish/submit + 抖音开放平台 + 小红书开放平台，替换 channel-adapter 占位 endpoint | P0 | 三家平台真实发布成功、publish-record.externalId 有真实值 |
| **P2 队列+定时** | Bull 全链路 + publish-schedule 定时发布 + 失败退避重试 + OAuth token 批量续期定时任务 | P1 | 发布不阻塞请求（publish.ts 立即返回）、定时到点自动发、失败记录可 retry |
| **P3 基础补齐** | douyin/bilibili switch 补 case + media-asset 资产管理 + 发布预览 + 校验增强 | P1（P2 并行） | publish-platform enum 全部平台都有 adapter 实现 |

### 1.3 依赖链详解

```
P0:
  修改 publish-account schema（加 OAuth 字段）
  → 新建 services/auth/*（OAuth manager + 3 个 provider 实现）
  → 新建 routes/oauth.ts（授权跳转 + 回调处理 + 状态查询 + 吊销）
  → 修改 utils/publishErrors.ts（加 PUB_009~012）
  → 验收：账号可完成 OAuth 授权、token 可自动续期

P1:
  P0 完成后，修改 channel-adapter.ts（重构为每平台独立 adapter + 分发器）
  → 新增 douyin / xiaohongshu 真实 API 实现
  → 修改 wechat 补 freepublish/submit（自动发布草稿）
  → 修改 routes/content-api.ts（加 P0 预留的定时发布路由）
  → 修改 config/index.ts（加 publish 配置读取）
  → 验收：三家平台真实发布成功

P2:
  P1 完成后，新建 content-types/publish-schedule
  → 新建 utils/queue.ts（Bull Flow 定义）
  → 新建 services/publish-queue.ts（Flow 各阶段 handler）
  → 新建 services/scheduler.ts（定时扫描 + OAuth 批量续期）
  → 修改 publish.ts（publishArticle 改为同步入队 + 定时入口）
  → 修改 bootstrap.ts（注册 Flow 处理器 + scheduler）
  → 修改 destroy.ts（closeQueue）
  → 修改 publish-record schema（扩展 status 枚举 + 新增 jobId/queueStage/scheduledAt 等字段）
  → 验收：publish.ts 立即返回（不等发布完成）、定时到点自动发、失败记录可 retry

P3:
  P1 完成后可并行。补齐 douyin / bilibili / 其它 enum 里平台的 switch case
  → media-asset content-type 新建（关联 article-draft 的素材）
  → 发布预览功能（前端）
  → 验收：publish-platform.type 全部枚举值都有 adapter 实现
```

---

## 二、数据模型改动

### 2.1 publish-account（已有 → 增强）

**不删字段，只增加**。所有新增字段在 content-manager 中应配置为 **admin only** 或 **脱敏显示**（特别是 oauthAccessToken / oauthRefreshToken）。

| 新增字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| oauthAccessToken | string | maxLength: 1000 | OAuth access_token（脱敏显示） |
| oauthRefreshToken | string | maxLength: 1000 | OAuth refresh_token |
| oauthExpiresAt | datetime | 可空 | access_token 过期时间 |
| oauthOpenId | string | maxLength: 200 | 平台侧用户唯一标识 |
| oauthScope | string | maxLength: 500 | 授权 scope 列表（空格分隔） |
| oauthState | enumeration | enum: [unauthorized, authorized, expired, revoked], default: unauthorized | 当前授权状态 |
| lastRefreshAt | datetime | 可空 | 最近一次 token 续期时间 |

**OAuth 提供商派生规则**：**没有** oauthProvider 字段。OAuth 实现从 `account.platform.type` 自动分发到对应 provider（'wechat' → wechat provider, 'douyin' → douyin provider, ...）。internal/custom 等非 OAuth 平台跳过 OAuth 检查。

### 2.2 publish-record（已有 → 扩展）

**status 枚举扩展**（兼容现有 pending/success/failed，新增）：

| 原枚举 | 新增值 | 说明 |
|---|---|---|
| pending | — | 手动创建但未入队（如同步重试前的中间态） |
| success | — | 全平台成功 |
| failed | — | 最终失败（重试耗尽） |
| — | queued | 已入队等待执行 |
| — | validating | 内容校验中（validateContent + ensureOAuthToken） |
| — | uploading_media | 媒体上传中 |
| — | publishing | 正在调用平台 API |
| — | checking_status | 发布后状态回查 |
| — | partial_success | 多账号场景部分成功（P3 补） |

**新增字段**：

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| scheduledAt | datetime | 可空 | 定时发布的预约时间 |
| startedAt | datetime | 可空 | 实际开始执行时间 |
| finishedAt | datetime | 可空 | 执行完成时间 |
| jobId | string | maxLength: 100 | Bull job ID |
| queueStage | string | maxLength: 100 | 当前 Bull 链路阶段名（排障用） |

### 2.3 新增 publish-schedule

用途：定时发布任务表。一条 schedule 可触发多个账号发布，每个账号对应一条 publish-record。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| name | string | required, maxLength: 100 | 预约任务名 |
| article | relation (manyToOne → article-draft) | required | 要发布的文章 |
| accounts | relation[] (manyToMany → publish-account) | required | 目标账号列表 |
| scheduledAt | datetime | required | 触发时间 |
| status | enumeration | enum: [scheduled, triggered, cancelled, expired], default: scheduled | 当前状态 |
| publishRecords | relation[] (oneToMany → publish-record) | — | 触发后生成的发布记录 |
| createdBy | relation (manyToOne → user) | 可空 | 创建人 |
| triggeredAt | datetime | 可空 | 实际触发时间（可能因队列阻塞延迟） |

### 2.4 Strapi schema 变更说明

Strapi 5 content-type schema 变更后，Strapi 会在下次启动时通过 **schema sync** 自动执行数据库迁移（ALTER TABLE ADD COLUMN）。不需要手动写 SQL 迁移脚本。但需注意：
- 新增枚举值时数据库已有记录的旧值仍然有效
- 字段删除 Strapi 默认不会自动 DROP COLUMN（避免误删数据），如需清理手动执行

---

## 三、OAuth 授权架构与流程

### 3.1 OAuth Provider 接口契约

每个平台实现 `IOAuthProvider` 接口：

```typescript
interface IOAuthProvider {
  readonly platformType: string;        // 'wechat' | 'douyin' | 'xiaohongshu'
  readonly displayName: string;

  buildAuthorizeUrl(state: string): string;
  exchangeToken(code: string): Promise<{
    accessToken: string; refreshToken: string; expiresAt: Date;
    openId: string; scope: string; rawResponse: any;
  }>;
  refreshToken(refreshToken: string): Promise<{
    accessToken: string; refreshToken?: string; expiresAt: Date; rawResponse: any;
  }>;
  verifyToken?(accessToken: string): Promise<boolean>;
  revokeToken?(accessToken: string): Promise<void>;
}
```

OAuth manager 统一入口：

```typescript
// services/auth/oauth-manager.ts
{
  getAuthorizeUrl(accountId: string): Promise<string>;     // 返回授权 URL，前端 302
  handleCallback(platformType: string, code: string, state: string): Promise<{ accountId: string; oauthState: 'authorized' }>;
  ensureValidToken(accountId: string): Promise<string>;    // 检查+续期，返回有效 access_token
  batchRefreshExpiringTokens(): Promise<void>;             // 定时批量续期
  revokeAuthorization(accountId: string): Promise<void>;
}
```

### 3.2 OAuth 回调路由

新增 `routes/oauth.ts`，所有路由复用 content-api.ts 的 `adminRoute` / `publicRoute` 辅助函数：

| 路由 | 方法 | 鉴权 | 说明 |
|---|---|---|---|
| `/v1/admin/oauth/authorize/:accountId` | GET | admin | 生成授权 URL 返回给前端，前端 302 跳转 |
| `/v1/oauth/callback/:platformType` | GET | **公开** | 平台授权回调，带 `code` + `state`，内部调 oauth-manager.handleCallback |
| `/v1/admin/oauth/status/:accountId` | GET | admin | 查询账号 oauthState + expiresAt |
| `/v1/admin/oauth/revoke/:accountId` | POST | admin | 吊销授权 |

**state 参数设计**：`state = `${accountId}:${randomNonce}``，回调时解析出 accountId 并校验 nonce 防 CSRF。回调路由为公开路由，因为平台回调不带 Strapi JWT。

### 3.3 Token 续期触发时机

```
触发点 1（即时）: publish 执行前
  → oauth-manager.ensureValidToken(accountId)
  → oauthExpiresAt < now + 5min ? refresh : 直接用
  → refresh 失败 → throw，publish-record 标记 failed，error 写"OAuth token 续期失败（PUB_010）"

触发点 2（定时）: Bull scheduler 队列（P2）
  → 每分钟扫描 publish-account.oauthExpiresAt < now + 10min
  → 批量触发续期，失败的标记 oauthState = 'expired'

触发点 3（手动）: 前端账号管理页
  → 显示 oauthState 和过期时间
  → 允许点击"重新授权"按钮
```

### 3.4 三家平台 OAuth 对接要点

| 平台 | OAuth 类型 | 关键接口 | appId/appSecret 来源 |
|---|---|---|---|
| **微信公众号** | OAuth2.0（网页授权） | `sns/oauth2/access_token`（code→token）、`cgi-bin/token`（access_token 续期） | **复用已有 zhao-sso 插件**的 appId/appSecret 配置 |
| **抖音开放平台** | OAuth2.0 | `oauth/authorize`（授权页）、`oauth/access_token`（code→token）、`oauth/refresh_token`（续期） | 宿主项目 config/plugins.js 的 zhao-studio config 块 |
| **小红书开放平台** | OAuth2.0 | `oauth/authorize`、`oauth/access_token`、`oauth/refresh_token` | 宿主项目 config/plugins.js 的 zhao-studio config 块 |

appId/appSecret **不存数据库**，全部从宿主 config 读取。

### 3.5 OAuth 错误处理

| 场景 | oauthState | 错误码 | 处理 |
|---|---|---|---|
| 用户拒绝授权 | unauthorized | — | 回调时 code 为空或带 error 参数，返回错误提示 |
| code 已过期/已用 | unauthorized | — | 引导重新走授权流程 |
| refresh_token 失效 | revoked | PUB_010 | 标记 revoked，前端提示重新授权 |
| access_token 续期失败 | expired | PUB_010 | 重试 3 次后标记 expired |
| 平台不可用 | expired | PUB_011 | 重试 3 次后标记 expired |

---

## 四、Bull 全链路队列编排

### 4.1 队列总览

zhao-studio 新增 **2 个 Bull Queue**，与 zhao-channel 共用同一 Redis（REDIS_URL 环境变量），队列名不同隔离。

| 队列 | 用途 | 并发 | 重试 | Redis 隔离 |
|---|---|---|---|---|
| `studio-publish` | 发布全链路 | 5（并行多账号） | 各阶段策略不同 | 队列名隔离 |
| `studio-scheduler` | 定时发布触发 + OAuth 批量续期 | 1（串行） | 3 次指数退避 | 队列名隔离 |

### 4.2 发布全链路（studio-publish）

**技术选型**：使用 **Bull Flows**（Bull v4.16.4 原生支持的链式 job 编排，不需要额外包）。每个"文章→账号"组合产生一个 Flow。

链路阶段（6 个）：

```
阶段 1: validateContent         ← validateContentForPlatform + 平台特定规则
    │
    ▼
阶段 2: ensureOAuthToken        ← oauth-manager.ensureValidToken
    │
    ▼
阶段 3: uploadMedia             ← 上传图/视频到平台（没有媒体时跳过）
    │
    ▼
阶段 4: adaptContent            ← channel-adapter.adaptContent
    │
    ▼
阶段 5: publish                 ← channel-adapter.publish 真实 API
    │
    ▼
阶段 6: checkStatus             ← channel-adapter.checkStatus 状态回查
```

每个阶段 handler 的职责：
- 进入阶段前更新 publish-record.status = 对应阶段枚举值
- 执行阶段逻辑，产出写入 `job.data.context` 供下游阶段使用
- 成功 → 流转到下一阶段；失败 → 按阶段重试策略决定

#### 各阶段重试策略

| 阶段 | publish-record status | 重试 | 退避 | 失败处理 |
|---|---|---|---|---|
| validateContent | validating | **不重试** | — | 内容问题不会变好，直接 failed，error 写校验详情 |
| ensureOAuthToken | validating | 3 次 | 2s 指数 | 全部失败标记 oauthState=expired，publish-record failed 提示重新授权 |
| uploadMedia | uploading_media | 3 次 | 5s 指数 | 平台限流可重试；格式不合法直接 failed |
| adaptContent | validating | **不重试** | — | 逻辑问题，直接 failed |
| publish | publishing | 3 次 | 10s 指数 | 限流/网络可重试；鉴权失败（401）回到阶段 2 重试（先续期 token） |
| checkStatus | checking_status | 2 次 | 30s 线性 | 有些平台发布有延迟，等 30s 再查一次；仍 unknown 时 publish-record 标记 success 但 error 写 checkStatus 未确认 |

### 4.3 定时发布（studio-scheduler）

职责：
1. 每分钟扫描 publish-schedule 表中 `scheduledAt <= now AND status='scheduled'` 的记录
2. 触发后为 schedule.accounts 中每个 account 创建 publish-record + 入 studio-publish 队列
3. schedule.status → triggered，记录 triggeredAt
4. OAuth token 批量续期：每分钟扫描 oauthExpiresAt < now + 10min 的账号，批量续期

失败处理：
- scheduler 并发 1，单个 schedule 失败不阻塞整体
- 单个 schedule 触发失败 → 保持 scheduled，下次扫描会再次触发（天然兜底）
- OAuth 续期失败 → 标记 publish-account.oauthState = 'expired'，**不抛异常**

### 4.4 Bull Flow Job 数据结构

```typescript
interface PublishFlowJobData {
  articleId: string;
  accountId: string;
  triggerSource: 'manual' | 'schedule' | 'retry';
  publishRecordId?: string;

  context: {
    platformType: string;
    adaptedContent?: any;
    uploadedMedia?: any[];
    accessToken?: string;
    publishResult?: {
      success: boolean;
      externalId?: string;
      error?: string;
      rawResponse?: any;
    };
    statusCheckResult?: {
      status: 'published' | 'deleted' | 'unknown';
      checkedAt: Date;
    };
  };
}
```

### 4.5 与现有 publish.ts 的衔接

**publish.ts 的 publishArticle 改造**（P2）：从同步 for 循环改为同步入队后立即返回。

```typescript
async publishArticle(articleId, accountIds, opts?: { scheduledAt?: Date }) {
  const article = await documents('plugin::zhao-studio.article-draft')
    .findOne({ documentId: articleId });
  const accounts = await documents('plugin::zhao-studio.publish-account')
    .findMany({ filters: { documentId: { $in: accountIds } } });

  if (opts?.scheduledAt) {
    const schedule = await documents('plugin::zhao-studio.publish-schedule')
      .create({ data: { article, accounts, scheduledAt: opts.scheduledAt } });
    return { trigger: 'scheduled', scheduleId: schedule.documentId, accountCount: accounts.length };
  }

  // 立即发布
  const results = [];
  for (const account of accounts) {
    const record = await documents('plugin::zhao-studio.publish-record').create({
      data: { article, account, status: 'queued', startedAt: new Date() },
    });
    await publishQueue.addFlowJob({
      articleId, accountId: account.documentId,
      publishRecordId: record.documentId, triggerSource: 'manual',
    });
    results.push({ recordId: record.documentId, status: 'queued' });
  }
  return results;
}
```

**前端体验变化**：点"发布"→ 0.5 秒返回（不再等待）→ publish-record 列表页实时刷新状态。点"预约"→ 选时间 → 创建 publish-schedule。

### 4.6 死信处理

**简化方案**：不引入独立 Bull Dead Letter Queue。
- Bull 3 次重试耗尽后 job 进入 Bull 内置 failed 集合
- publish-record.status = failed，error 写完整错误栈，jobId + queueStage 记录排障线索
- 前端 publish-center 页面对 failed 记录显示"重试"按钮 → 调 `POST /v1/admin/publish/records/:id/retry` → publish.ts 的 retryPublish → 重新入队

---

## 五、平台 Adapter 接口契约与真实 API 对接

### 5.1 IPlatformAdapter 统一接口

channel-adapter.ts **重构**：从 switch-case 拆成每平台独立 adapter 类，实现统一接口。channel-adapter.ts 变成**分发器**。

```typescript
interface IPlatformAdapter {
  readonly platformType: string;
  readonly displayName: string;
  readonly oauthRequired: boolean;

  // Bull Flow 6 阶段
  validateContent(content: AdaptedContent): string[] | null;       // null=通过, string[]=不通过原因
  async getAccessToken(account: PublishAccount): Promise<string>;  // 从 oauth-manager 取或从 config 取（internal/custom）
  async uploadMedia(account: PublishAccount, media: MediaAsset[]): Promise<PlatformMedia[]>;
  adaptContent(article: ArticleDraft): AdaptedContent;
  async publish(account: PublishAccount, content: AdaptedContent, media?: PlatformMedia[]): Promise<PublishResult>;
  async checkStatus(account: PublishAccount, externalId: string): Promise<StatusCheckResult>;
}
```

返回类型约定：

```typescript
interface AdaptedContent {
  title: string;
  content: string;           // 平台接受的格式（HTML / Markdown / 纯文本）
  coverImage?: string;        // URL 或 media_id
  images?: string[];          // media_id 列表
  video?: string;              // media_id
  platformExtra?: Record<string, any>;  // wechat: { digest, author, thumb_media_id, content_source_url }
}

interface PlatformMedia { type: 'image'|'video'; platformMediaId: string; url?: string; }
interface MediaAsset { type: 'image'|'video'; url: string; fileSize?: number; mimeType?: string; }
interface PublishResult {
  success: boolean; externalId?: string; url?: string;
  createdDraft?: boolean; draftId?: string; error?: string; rawResponse?: any;
}
interface StatusCheckResult { status: 'published'|'deleted'|'pending_review'|'unknown'; checkedAt: Date; reason?: string; }
```

### 5.2 三家平台真实 API 对接要点

#### 微信公众号（P1，补 freepublish/submit）

**基座已有**：publishToWechat 委托 zhao-sso 的 sso-wx-article.create() 建草稿（draft/add）。
**新增**：

| 接口 | 用途 | 鉴权 |
|---|---|---|
| cgi-bin/media/upload | 上传封面图 → thumb_media_id | access_token |
| cgi-bin/draft/add | 建草稿（已有） | access_token |
| cgi-bin/freepublish/submit | **新增**：发布草稿 | access_token |
| cgi-bin/freepublish/get | **新增**：查询发布进度（异步，返回 publish_id，需轮询） | access_token |

**流程变化**：
```
旧：建草稿 → publish-record.status=success + createdDraft=true（等待人工发）
新：建草稿 → freepublish/submit → 轮询 get → 发布成功 → publish-record.success
                                     审核拒 → publish-record.failed, error=拒审原因(PUB_012)
```

#### 抖音开放平台（P1，全新对接）

| 接口 | 用途 | 鉴权 |
|---|---|---|
| oauth/access_token | code→token | client_key + client_secret |
| oauth/refresh_token | 续期 | client_key + client_secret |
| video/upload | 视频上传 | access_token |
| video/create | 发布视频 aweme | access_token |
| aweme/text/create | 图文发布 | access_token |
| aweme/detail | 发布状态查询 | access_token |

#### 小红书开放平台（P1，全新对接）

| 接口 | 用途 | 鉴权 |
|---|---|---|
| oauth/access_token | code→token | client_id + client_secret |
| oauth/refresh_token | 续期 | client_id + client_secret |
| media/upload_image | 图片上传 | access_token |
| note/create | 发布笔记 | access_token |
| note/detail | 笔记状态查询 | access_token |

### 5.3 publishErrors.ts 扩展

新增错误码，与现有 PUB_001~008 兼容：

| 新增 | 场景 | publish-record.error 写入 |
|---|---|---|
| PUB_009 | OAuth token 已过期（ensureValidToken 返回 expired） | "账号授权已失效，请重新授权" |
| PUB_010 | OAuth token 续期失败（3 次重试耗尽） | "OAuth token 续期失败" |
| PUB_011 | 平台限流（HTTP 429） | "平台限流，请稍后再试（限流窗口：X秒）" |
| PUB_012 | 平台审核拒绝（公众号 freepublish audit_status=2 等） | "平台审核拒绝：{拒审详情}" |

### 5.4 新增路由汇总

所有新增路由挂到 `server/src/routes/content-api.ts`，复用 `adminRoute` / `publicRoute` 辅助函数。

**P0 OAuth 路由**：

| 路由 | 方法 | 鉴权 | Controller |
|---|---|---|---|
| /v1/admin/oauth/authorize/:accountId | GET | admin | oauth.getAuthorizeUrl |
| /v1/oauth/callback/:platformType | GET | 公开 | oauth.handleCallback |
| /v1/admin/oauth/status/:accountId | GET | admin | oauth.getStatus |
| /v1/admin/oauth/revoke/:accountId | POST | admin | oauth.revoke |

**P2 定时发布路由**：

| 路由 | 方法 | 鉴权 | Controller |
|---|---|---|---|
| /v1/admin/schedules | POST | admin | publish.createSchedule |
| /v1/admin/schedules | GET | admin | publish.listSchedules |
| /v1/admin/schedules/:id | GET | admin | publish.getSchedule |
| /v1/admin/schedules/:id | PUT | admin | publish.updateSchedule |
| /v1/admin/schedules/:id/cancel | POST | admin | publish.cancelSchedule |

### 5.5 环境变量与配置

宿主项目 `config/plugins.js`：

```javascript
module.exports = {
  'zhao-studio': {
    config: {
      publish: {
        queue: {
          redisUrl: process.env.REDIS_URL,  // 默认与 zhao-channel 共用
          publishConcurrency: 5,
          schedulerConcurrency: 1,
        },
        platforms: {
          douyin: {
            clientKey: process.env.DOUYIN_CLIENT_KEY,
            clientSecret: process.env.DOUYIN_CLIENT_SECRET,
            redirectUri: process.env.DOUYIN_REDIRECT_URI,
          },
          xiaohongshu: {
            clientId: process.env.XHS_CLIENT_ID,
            clientSecret: process.env.XHS_CLIENT_SECRET,
            redirectUri: process.env.XHS_REDIRECT_URI,
          },
          wechat: {
            // 已有 zhao-sso 配置，通过 strapi.plugin('zhao-sso').config() 读取
          },
        },
      },
    },
  },
};
```

### 5.6 新增/修改文件清单（按阶段）

| 阶段 | 文件 | 动作 | 类型 |
|---|---|---|---|
| **P0** | content-types/publish-account/schema.json | 修改（增加 OAuth 字段） | schema |
| | server/src/routes/oauth.ts | **新建**（OAuth 授权/回调路由） | 路由 |
| | server/src/services/auth/oauth-manager.ts | **新建**（统一入口） | 服务 |
| | server/src/services/auth/providers/wechat.ts | **新建**（微信 OAuth） | 服务 |
| | server/src/services/auth/providers/douyin.ts | **新建**（抖音 OAuth） | 服务 |
| | server/src/services/auth/providers/xiaohongshu.ts | **新建**（小红书 OAuth） | 服务 |
| | server/src/utils/publishErrors.ts | 修改（加 PUB_009~012） | 工具 |
| **P1** | server/src/services/channel-adapter.ts | **重构**（switch-case → 平台 adapter + 新增 douyin/xiaohongshu + wechat 补 freepublish） | 服务 |
| | server/src/routes/content-api.ts | 修改（加 P0 预留的 OAuth + P2 定时路由占位） | 路由 |
| | server/src/config/index.ts | 修改（加 publish config 读取） | 配置 |
| **P2** | content-types/publish-record/schema.json | 修改（扩展 status 枚举 + 新增字段） | schema |
| | content-types/publish-schedule/schema.json | **新建** | schema |
| | server/src/utils/queue.ts | **新建**（两个 Bull Queue + Flow 定义） | 工具 |
| | server/src/services/publish-queue.ts | **新建**（Bull Flow 各阶段 handler） | 服务 |
| | server/src/services/scheduler.ts | **新建**（定时扫描 + OAuth 批量续期） | 服务 |
| | server/src/services/publish.ts | **修改**（publishArticle 入队改造 + 定时入口） | 服务 |
| | server/src/bootstrap.ts | 修改（注册 Flow 处理器 + scheduler） | 生命周期 |
| | server/src/destroy.ts | 修改（closeQueue） | 生命周期 |
| **P3** | server/src/services/channel-adapter.ts | 修改（补 bilibili case + 媒体资产管理） | 服务 |
| | content-types/media-asset/schema.json | **新建** | schema |

---

## 六、全局一致性检查记录

设计文档内部自查结果（已修正）：

| 检查项 | 原始问题 | 修正方式 |
|---|---|---|
| oauthProvider 字段冗余 | publish-account 加 oauthProvider 与 platform.type 重复 | **删除** oauthProvider，OAuth 提供商从 account.platform.type 自动派生 |
| Bull Flow 依赖不明 | 未说明 bull-flow 是独立包还是 Bull 原生 | Bull v4.16.4 原生支持 Flow，**不需要额外包**。已在 4.2 节明确 |
| publish-record status 与 Flow 阶段映射 | 需确保 status 枚举与各阶段 handler 一致 | 2.2 节枚举与 4.2 节 retry 策略中的状态一一对应 |
| 公众号已委托 zhao-sso | wechat OAuth 和已有的 zhao-sso 配置如何配合 | OAuth 阶段复用 zhao-sso 的 appId/appSecret，**不需要新建** wechat OAuth provider（wechat provider 直接调用 zhao-sso 的 token 接口） |
| Strapi schema 迁移 | schema.json 改了之后数据库怎么同步 | 2.4 节说明：Strapi 启动时自动 schema sync，ALTER TABLE ADD COLUMN，**不需要手动 SQL** |
| 前端 publish-center 页面 | 后端改了 publish-record 状态枚举后前端要不要跟着改 | publish-center 的列表页过滤条件需适配新增 status 值，P2 实施时同步改前端（web 项目的 pages/studio/publish-record） |
| bull-flow vs 手动 Bull Chain | 需确认 Bull v4.16.4 是否原生支持 Flow | Bull v4.16.4 原生 `Queue.flow()` 和 `flow.process()`，已在 package.json 依赖版本确认 |
| publish.ts 改造前后行为变化 | 同步循环 → 异步入队，错误处理和重试语义变了 | 4.5 节伪代码明确改造后立即返回，publish-record 状态流转由 Bull Flow handler 负责；retryPublish 也走队列 |
| oauth-callback 公开路由安全 | 平台回调带 state 参数防 CSRF | 3.2 节 state = `${accountId}:${nonce}`，回调时解析校验 nonce |
| 公众号发布后审核拒绝怎么处理 | freepublish/submit 返回的审核状态 | 5.3 节 PUB_012 处理平台审核拒绝 |
| douyin adapter switch 缺失 | platform.type 枚举有 douyin 但 channel-adapter switch 没有 | P1 补，重构后每平台独立 adapter 不会再漏 |
| Redis 实例隔离 | zhao-studio 和 zhao-channel 共用 Redis | 队列名不同（studio-publish / studio-scheduler / channel-batch-grant）隔离，同一实例 OK |
| 不改动的模块边界 | promo-channel / ad-zone / stat-summary 等 | 0.4 节明确排除范围 |
| 文件清单覆盖 | 5.6 节的清单是否覆盖所有改动 | 已与各 section 内容交叉核对 |

---

## 七、风险与降级预案

| 风险 | 概率 | 影响 | 降级方案 |
|---|---|---|---|
| 抖音开放平台申请不过 | 中 | P1 验收失败 | 先落地上传视频接口打样，用抖音开放平台测试账号；如实在不行先跳过抖音，优先小红书+公众号 |
| Bull Flow 在 Strapi 插件内 handler 注册有坑 | 低 | P2 阻塞 | 退化为手动 Bull Chain（多个 job 通过 job.data 串联），无额外依赖，只是代码稍啰嗦 |
| OAuth callback 路由被恶意刷 | 中 | OAuth state 校验 | state 里带 nonce + Redis 存 5 分钟有效 nonce（复用宿主 Redis），过期后 callback 返回 400 |
| 定时发布的 schedule.status 卡住 scheduled | 低 | 定时任务不触发 | scheduler 每分钟扫描是天然兜底，就算上次执行崩了下次还会扫到；加过期时间判断（比如 scheduledAt 超过 7 天未触发标记 expired） |
| 多账号发布部分成功 | 中 | publish-record 全部标 failed | P3 补 partial_success 状态；当前 P2 阶段 publish-queue 每个 account 独立 Job，互不阻塞，天然隔离 |
