# zhao-studio 发布增强 P3：基础补齐 Implementation Plan

**Goal:** 后端补 douyin H5 schema 获取路由（前端用来生成二维码跳转）+ 发布预览接口（adaptContent 提前让用户看平台适配后的内容）。

**Architecture:** 都是轻量 service 方法 + content-api 路由，不碰 schema、不碰 Bull、不碰 channel-adapter 核心逻辑。

**Tech Stack:** Strapi 5 content-api route handler 模式（纯 service 方法 + adminRoute 路由）

---

## P3 范围（2 个交付物）

| # | 交付 | 说明 |
|---|---|---|
| 1 | **douyin-schema 路由** | `GET /v1/admin/oauth/douyin-schema/:recordId` — 取 publish-record（需要 status=queued + publish_mode=h5_share），返回 `{ schema, recordId }`，前端用 schema 生成二维码 |
| 2 | **发布预览接口** | `POST /v1/admin/publish/preview` — Body `{ articleId, accountIds[] }`，每个 account 调 `channel-adapter.adaptContent` 返回 `{ accountId, accountName, platform, adaptedTitle, adaptedContentPreview }`（content 截断前 500 字符） |

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `server/src/services/publish.ts` | 加 `getDouyinSchema(recordId)` + `previewPublish(articleId, accountIds)` |
| Modify | `server/src/routes/content-api.ts` | 加 2 条 adminRoute |

**不改动：** schema、channel-adapter、publish-queue、scheduler、bootstrap、destroy

---

### Task 1: publish.ts 加 2 个方法

**Files:** Modify `e:\code\basic\plugins\zhao-studio\server\src\services\publish.ts`

在文件末尾（`});` 之前）插入：

```typescript
  /**
   * douyin H5 schema 获取 — 前端生成二维码用
   */
  async getDouyinSchema(recordId: string) {
    const record = await strapi.documents('plugin::zhao-studio.publish-record').findOne({ documentId: recordId });
    if (!record) throw new Error('发布记录不存在');

    // schema 存在 publish-record.error JSON 里（P2 publish-queue 写的）
    let schema: string | null = null;
    const err = (record as any).error;
    if (err && typeof err === 'string') {
      try {
        const parsed = JSON.parse(err);
        if (parsed.platform === 'douyin' && parsed.schema) schema = parsed.schema;
      } catch { /* ignore */ }
    }

    if (!schema) {
      throw new Error('该发布记录不是 douyin h5_share 模式或已过期');
    }
    return { recordId, schema };
  },

  /**
   * 发布预览 — 返回平台适配后的内容
   */
  async previewPublish(articleId: string, accountIds: string[]) {
    const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
    if (!article) throw new Error('文章不存在');

    const accounts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
      filters: { documentId: { $in: accountIds }, isActive: true },
    });
    if (accounts.length === 0) throw new Error('未找到有效账号');

    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
    const results = [];

    for (const account of accounts) {
      const platformType = (account as any).platform?.type || 'custom';
      try {
        const adapted = await channelAdapter.adaptContent(article, platformType);
        results.push({
          accountId: (account as any).documentId,
          accountName: (account as any).name,
          platform: platformType,
          adaptedTitle: adapted.title,
          adaptedContentPreview: String(adapted.content || '').substring(0, 500),
          contentLength: String(adapted.content || '').length,
          validation: await channelAdapter.publish(adapted, account).then(() => 'ok').catch((e: any) => `blocked: ${e.message}`),
        });
      } catch (err: any) {
        results.push({
          accountId: (account as any).documentId,
          accountName: (account as any).name,
          platform: platformType,
          error: err.message,
        });
      }
    }

    return { articleId, articleTitle: (article as any).title, results };
  },
```

**注意：** 方法签名保持 sync 风格（adminRoute handler 直接绑定，不需要 wrap 成 controller 闭包）。

---

### Task 2: content-api.ts 加 2 条路由

**Files:** Modify `e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts`

在 publish-schedule 路由后面加：

```typescript
    // ============ P3 基础补齐 ============
    adminRoute('GET', '/oauth/douyin-schema/:recordId', 'publish.getDouyinSchema', 'zhao-studio.publish-record.manage'),
    adminRoute('POST', '/publish/preview', 'publish.previewPublish', 'zhao-studio.publish.publish'),
```

---

### Task 3: 验证 + commit + push

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 5

cd e:\code\basic
git add plugins/zhao-studio
git commit -m "feat(zhao-studio): P3 基础补齐 - douyin-schema 路由 + 发布预览接口"
git push origin main
```

---

## P3 验收 Checklist

| # | 验收项 | 方式 |
|---|---|---|
| 1 | tsc 零 error | `tsc --noEmit` |
| 2 | Build 成功 | `npm run build` |
| 3 | publish.ts 有 getDouyinSchema + previewPublish | grep |
| 4 | content-api.ts 有 douyin-schema + preview 路由 | grep |
| 5 | article-draft publishRecords 反向 relation 存在（P0 已有，只确认） | 读 schema.json |
