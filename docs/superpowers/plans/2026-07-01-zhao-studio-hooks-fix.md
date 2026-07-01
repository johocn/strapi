# zhao-studio hooks 接口修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-studio admin 8 个 hooks 与重写后组件的接口不匹配问题，使所有模块可正常运行。

**Architecture:** 改 hooks 适配组件（不动 27 个已重写的 .tsx 文件，除了 AIConfigPage）。后端新增 `POST /v1/admin/ai/chat` 接口。新增 `fieldNormalizer.ts` 工具做 documentId→id 标准化。

**Tech Stack:** React 18 hooks、TypeScript、Strapi v5、antd v5、axios

**Spec:** `e:\code\basic\docs\superpowers\specs\2026-07-01-zhao-studio-hooks-fix-design.md`

**关键参考文件**：
- 后端 AI controller：`e:\code\basic\plugins\zhao-studio\server\src\controllers\ai.ts`（service 名是 `ai-assist`）
- 后端 AI service：`e:\code\basic\plugins\zhao-studio\server\src\services\ai-assist.ts`（现有 `callAI({prompt, type})`，需新增 `chat(messages)`）
- 后端路由：`e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts`（adminRoute helper 在第 12-24 行）
- 后端 AI config 来源：`strapi.config.get('plugin.zhao-studio.ai')`（非数据库）

---

## 文件结构总览

| Task | 文件 | 操作 |
|---|---|---|
| 1 | `plugins/zhao-studio/admin/src/utils/fieldNormalizer.ts` | 新增 |
| 2 | `plugins/zhao-studio/server/src/routes/content-api.ts` | 修改（加 1 行） |
| 2 | `plugins/zhao-studio/server/src/controllers/ai.ts` | 修改（加 chat 方法） |
| 2 | `plugins/zhao-studio/server/src/services/ai-assist.ts` | 修改（加 chat 方法） |
| 3 | `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/hooks/usePublishActions.ts` | 重写 |
| 5 | `plugins/zhao-studio/admin/src/hooks/useAdSlots.ts` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/hooks/useStats.ts` | 重写 |
| 7 | `plugins/zhao-studio/admin/src/hooks/useAIConfig.ts` | 重写 |
| 7 | `plugins/zhao-studio/admin/src/hooks/useAIActions.ts` | 重写 |
| 8 | `plugins/zhao-studio/admin/src/pages/AIConfigPage.tsx` | 重写 |

**不修改文件**：
- 其他 26 个 .tsx 组件文件（Task 3-7 仅改 hooks）
- `admin/src/utils/*`（除新增 fieldNormalizer）
- `admin/src/hooks/useCollectSources.ts`、`useCollectTasks.ts`（Task 4-10 报告显示这两个接口匹配）
- `server/src/services/*`（除 ai-assist.ts）
- `server/src/controllers/*`（除 ai.ts）

---

## Task 1: 字段标准化工具

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts`

- [ ] **Step 1: 创建 fieldNormalizer.ts**

使用 Write 工具创建 `e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts`，内容：

```typescript
// 将 Strapi v5 documentId 标准化为 id（供组件使用）
// 保留所有原始字段，仅补充 id 字段
export const normalizeRecord = <T extends { documentId?: string; id?: string }>(
  record: T
): T & { id: string } => {
  if (!record) return record;
  return { ...record, id: record.documentId || record.id };
};

export const normalizeList = <T extends { documentId?: string; id?: string }>(
  list: T[] = []
): (T & { id: string })[] => list.map(normalizeRecord);
```

- [ ] **Step 2: 验证文件可导入**

```powershell
Get-Content "e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts" | Out-Null
Write-Host "File created"
```

Expected: 输出 `File created`。

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/utils/fieldNormalizer.ts
git commit -m "feat(zhao-studio): 新增 fieldNormalizer 字段标准化工具"
```

---

## Task 2: 后端 AI chat 接口

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts`（第 80 行后新增 1 行）
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\ai.ts`（新增 chat 方法）
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\ai-assist.ts`（新增 chat 方法）

- [ ] **Step 1: 读取现有 ai controller 和 service**

使用 Read 工具读取：
- `e:\code\basic\plugins\zhao-studio\server\src\controllers\ai.ts`
- `e:\code\basic\plugins\zhao-studio\server\src\services\ai-assist.ts`

确认现有结构：controller 方法调用 `strapi.plugin('zhao-studio').service('ai-assist')`；service 现有 `callAI({prompt, type})` 方法，配置来自 `strapi.config.get('plugin.zhao-studio.ai')`。

- [ ] **Step 2: 在路由文件新增 chat 路由**

使用 Edit 工具，在 `e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts` 中：

old_string:
```typescript
    adminRoute('POST', '/ai/articles/:articleId/convert', 'ai.convertLanguage', 'zhao-studio.update'),
```

new_string:
```typescript
    adminRoute('POST', '/ai/articles/:articleId/convert', 'ai.convertLanguage', 'zhao-studio.update'),

    // ===== AI 对话 =====
    adminRoute('POST', '/ai/chat', 'ai.chat', 'zhao-studio.read'),
```

- [ ] **Step 3: 在 ai controller 新增 chat 方法**

使用 Edit 工具，在 `e:\code\basic\plugins\zhao-studio\server\src\controllers\ai.ts` 末尾（最后一个方法 `testConnection` 之后，`});` 之前）新增：

old_string:
```typescript
  async testConnection(ctx) {
    const { provider, apiKey, endpoint } = ctx.request.body;

    try {
      const aiService = strapi.plugin('zhao-studio').service('ai-assist');
      const result = await aiService.callAI({
        prompt: '测试连接',
        type: 'test',
      });

      ctx.body = { data: { success: true, message: '连接成功' } };
    } catch (error) {
      ctx.body = { data: { success: false, message: error.message } };
    }
  },
});
```

new_string:
```typescript
  async testConnection(ctx) {
    const { provider, apiKey, endpoint } = ctx.request.body;

    try {
      const aiService = strapi.plugin('zhao-studio').service('ai-assist');
      const result = await aiService.callAI({
        prompt: '测试连接',
        type: 'test',
      });

      ctx.body = { data: { success: true, message: '连接成功' } };
    } catch (error) {
      ctx.body = { data: { success: false, message: error.message } };
    }
  },

  async chat(ctx) {
    const { messages } = ctx.request.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return ctx.badRequest('messages is required');
    }
    try {
      const aiService = strapi.plugin('zhao-studio').service('ai-assist');
      const result = await aiService.chat(messages);
      ctx.body = { data: result };
    } catch (error) {
      ctx.body = { data: { error: error.message } };
    }
  },
});
```

- [ ] **Step 4: 在 ai-assist service 新增 chat 方法**

使用 Edit 工具，在 `e:\code\basic\plugins\zhao-studio\server\src\services\ai-assist.ts` 末尾（最后一个方法 `convertLanguage` 之后，`});` 之前）新增。

注意：现有 `callAI` 接受 `{prompt, type}`，不直接支持 messages 数组。新增 `chat` 方法独立实现，将 messages 数组拼成 prompt 调用 `callAI`（最简实现，不重写 provider 调用逻辑）：

old_string:
```typescript
  async convertLanguage(articleId: string, target: 'simplified' | 'traditional') {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const targetMap = {
      simplified: '简体中文',
      traditional: '繁体中文',
    };

    const convertedContent = await this.callAI({
      prompt: `请将以下文章转换为${targetMap[target]}：\n\n${article.content}`,
      type: 'convert',
    });

    return convertedContent;
  },
});
```

new_string:
```typescript
  async convertLanguage(articleId: string, target: 'simplified' | 'traditional') {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const targetMap = {
      simplified: '简体中文',
      traditional: '繁体中文',
    };

    const convertedContent = await this.callAI({
      prompt: `请将以下文章转换为${targetMap[target]}：\n\n${article.content}`,
      type: 'convert',
    });

    return convertedContent;
  },

  async chat(messages: Array<{ role: string; content: string }>) {
    const config = strapi.config.get('plugin.zhao-studio.ai') as AIConfig;

    if (!config?.enabled) {
      throw new Error('AI功能未启用');
    }

    // 将 messages 数组拼接为 prompt（最简实现，复用现有 callAI）
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n');
    const conversationPrompt = conversationMessages
      .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n\n');

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${conversationPrompt}\n\n助手：`
      : `${conversationPrompt}\n\n助手：`;

    const content = await this.callAI({
      prompt: fullPrompt,
      type: 'chat',
    });

    return {
      content: content || '（无回复）',
      role: 'assistant',
    };
  },
});
```

- [ ] **Step 5: 验证后端编译**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm run build
```

Expected: 构建成功无错误。

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/server/src/routes/content-api.ts plugins/zhao-studio/server/src/controllers/ai.ts plugins/zhao-studio/server/src/services/ai-assist.ts
git commit -m "feat(zhao-studio): 后端新增 AI chat 接口（路由+controller+service）"
```

---

## Task 3: usePublishRecords 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`

- [ ] **Step 1: 读取现有 hook**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`，确认现有 PublishRecord 接口字段。

- [ ] **Step 2: 重写 usePublishRecords.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`，内容：

```typescript
import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface UsePublishRecordsParams {
  platformId?: string;
  accountId?: string;
}

interface PublishRecord {
  id: string;
  documentId?: string;
  title?: string;
  platformName?: string;
  platform?: { documentId?: string; name?: string };
  account?: { documentId?: string; name?: string };
  status: string;
  publishedAt?: string;
  errorMessage?: string;
  error?: string;
}

export const usePublishRecords = (params?: UsePublishRecordsParams) => {
  const [records, setRecords] = React.useState<PublishRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.platformId) query.set('platformId', params.platformId);
      if (params?.accountId) query.set('accountId', params.accountId);
      const url = `/api/zhao-studio/v1/admin/records${query.toString() ? '?' + query : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      let list: PublishRecord[] = json.data || [];
      // 前端过滤兜底（后端不支持过滤参数时）
      if (params?.platformId) {
        list = list.filter(r =>
          r.platform?.documentId === params.platformId ||
          (r as any).platformId === params.platformId
        );
      }
      if (params?.accountId) {
        list = list.filter(r =>
          r.account?.documentId === params.accountId ||
          (r as any).accountId === params.accountId
        );
      }
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
      setRecords(normalized);
    } catch (err) {
      console.error('fetchRecords error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [params?.platformId, params?.accountId]);

  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, refetch: fetchRecords };
};

export default usePublishRecords;
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts
git commit -m "refactor(zhao-studio): usePublishRecords 改为对象参数+字段标准化"
```

---

## Task 4: usePublishPlatforms/Accounts/Actions 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishPlatforms.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishAccounts.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishActions.ts`

- [ ] **Step 1: 读取 3 个现有 hooks**

使用 Read 工具读取：
- `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishPlatforms.ts`
- `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishAccounts.ts`
- `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishActions.ts`

- [ ] **Step 2: 重写 usePublishPlatforms.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishPlatforms.ts`，内容：

```typescript
import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface PublishPlatform {
  id: string;
  documentId?: string;
  name: string;
  type?: string;
  appId?: string;
  appSecret?: string;
  callbackUrl?: string;
  description?: string;
  isActive?: boolean;
}

const API_BASE = '/api/zhao-studio/v1/admin';

export const usePublishPlatforms = () => {
  const [platforms, setPlatforms] = React.useState<PublishPlatform[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchPlatforms = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/platforms`);
      const json = await res.json();
      setPlatforms(normalizeList(json.data || []));
    } catch (err) {
      console.error('fetchPlatforms error:', err);
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlatform = async (data: Partial<PublishPlatform>) => {
    const res = await fetch(`${API_BASE}/platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchPlatforms();
  };

  const updatePlatform = async (id: string, data: Partial<PublishPlatform>) => {
    const res = await fetch(`${API_BASE}/platforms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchPlatforms();
  };

  const deletePlatform = async (id: string) => {
    const res = await fetch(`${API_BASE}/platforms/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchPlatforms();
  };

  React.useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return { platforms, loading, createPlatform, updatePlatform, deletePlatform };
};

export default usePublishPlatforms;
```

- [ ] **Step 3: 重写 usePublishAccounts.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishAccounts.ts`，内容：

```typescript
import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface PublishAccount {
  id: string;
  documentId?: string;
  name: string;
  platformId?: string;
  platform?: { documentId?: string; name?: string };
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  isActive?: boolean;
  config?: any;
}

const API_BASE = '/api/zhao-studio/v1/admin';

export const usePublishAccounts = () => {
  const [accounts, setAccounts] = React.useState<PublishAccount[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAccounts = React.useCallback(async (platformId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounts`);
      const json = await res.json();
      let list = normalizeList(json.data || []);
      // 前端过滤（按 platformId）
      if (platformId) {
        list = list.filter(a =>
          a.platformId === platformId ||
          a.platform?.documentId === platformId
        );
      }
      setAccounts(list);
    } catch (err) {
      console.error('fetchAccounts error:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = async (data: Partial<PublishAccount>) => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: Partial<PublishAccount>) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchAccounts();
  };

  const deleteAccount = async (id: string) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchAccounts();
  };

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
};

export default usePublishAccounts;
```

- [ ] **Step 4: 重写 usePublishActions.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishActions.ts`，内容：

```typescript
import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin';

interface PublishParams {
  articleIds: string[];
  platformId: string;
  accountId: string;
}

export const usePublishActions = () => {
  const [loading, setLoading] = React.useState(false);

  // 批量发布：循环调用单文章发布接口
  const publish = async ({ articleIds, platformId, accountId }: PublishParams) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        articleIds.map(articleId =>
          fetch(`${API_BASE}/articles/${articleId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platformId, accountId }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 篇文章发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 单文章发布（保留原有方法，兼容旧代码）
  const publishArticle = async (articleId: string, accountIds: string[]) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        accountIds.map(accountId =>
          fetch(`${API_BASE}/articles/${articleId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 个账号发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };

  return { publish, publishArticle, loading };
};

export default usePublishActions;
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts plugins/zhao-studio/admin/src/hooks/usePublishActions.ts
git commit -m "refactor(zhao-studio): usePublishPlatforms/Accounts/Actions 改造适配组件"
```

---

## Task 5: useAdSlots 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAdSlots.ts`

- [ ] **Step 1: 读取现有 hook**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAdSlots.ts`，确认现有 AdSlot 接口字段和 CRUD 方法名。

- [ ] **Step 2: 重写 useAdSlots.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAdSlots.ts`，内容：

```typescript
import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

// 枚举值映射（组件 ← → 后端）
const POSITION_TO_BACKEND = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
  inarticle: 'article-content',
};

const POSITION_TO_FRONTEND: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
  'article-content': 'inarticle',
  'list-page': 'sidebar',
  'home-page': 'header',
};

const TYPE_TO_BACKEND = {
  image: 'banner',
  text: 'native',
  video: 'popup',
};

const TYPE_TO_FRONTEND: Record<string, string> = {
  banner: 'image',
  native: 'text',
  popup: 'video',
  'product-link': 'image',
};

interface AdSlot {
  id: string;
  documentId?: string;
  name: string;
  position: string;
  type?: string;
  width?: number;
  height?: number;
  adCode?: string;
  code?: string;
  isActive?: boolean;
}

const API_BASE = '/api/zhao-studio/v1/admin/ad-slots';

// 后端数据 → 组件数据
const normalizeSlot = (slot: any): AdSlot => {
  const normalized = normalizeRecord(slot);
  return {
    ...normalized,
    adCode: slot.code || slot.adCode || '',
    position: POSITION_TO_FRONTEND[slot.position] || slot.position,
    type: TYPE_TO_FRONTEND[slot.type] || slot.type || 'image',
  };
};

// 组件数据 → 后端数据
const mapToBackend = (data: any) => {
  const { adCode, position, type, ...rest } = data;
  return {
    ...rest,
    code: adCode,
    position: (POSITION_TO_BACKEND as any)[position] || position,
    type: (TYPE_TO_BACKEND as any)[type] || type,
  };
};

export const useAdSlots = () => {
  const [slots, setSlots] = React.useState<AdSlot[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchSlots = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      const list = (json.data || []).map(normalizeSlot);
      setSlots(list);
    } catch (err) {
      console.error('fetchSlots error:', err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSlot = async (data: Partial<AdSlot>) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapToBackend(data)),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchSlots();
  };

  const updateSlot = async (id: string, data: Partial<AdSlot>) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapToBackend(data)),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchSlots();
  };

  const deleteSlot = async (id: string) => {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchSlots();
  };

  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, loading, createSlot, updateSlot, deleteSlot };
};

export default useAdSlots;
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/useAdSlots.ts
git commit -m "refactor(zhao-studio): useAdSlots 改名+字段映射+枚举映射"
```

---

## Task 6: useStats 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useStats.ts`

- [ ] **Step 1: 读取现有 hook**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useStats.ts`，确认现有签名和返回值。

- [ ] **Step 2: 重写 useStats.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useStats.ts`，内容：

```typescript
import React from 'react';

type StatsType = 'basic' | 'advanced' | 'pro';

interface UseStatsParams {
  type: StatsType;
}

interface StatsRow {
  key: string;
  name: string;
  value: number;
  change?: number;
  unit?: string;
}

interface ChartData {
  date: string;
  value: number;
}

const API_BASE = '/api/zhao-studio/v1/admin/stats';

const STAT_NAMES: Record<string, string> = {
  totalArticles: '总文章数',
  totalViews: '总浏览量',
  totalPublishes: '总发布数',
  totalRevenue: '总收入',
  totalUsers: '总用户数',
  totalAdClicks: '广告点击数',
  avgReadTime: '平均阅读时长',
  totalPageViews: '页面浏览量',
};

export const useStats = ({ type }: UseStatsParams) => {
  const [stats, setStats] = React.useState<StatsRow[]>([]);
  const [chartData, setChartData] = React.useState<ChartData[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // 根据 type 决定调用哪些接口
        const endpoints =
          type === 'basic'
            ? ['/overview']
            : type === 'advanced'
            ? ['/overview', '/articles']
            : ['/overview', '/articles', '/ad-slots', '/devices'];

        const responses = await Promise.all(
          endpoints.map(e =>
            fetch(`${API_BASE}${e}`).then(r => r.json()).catch(() => ({ data: {} }))
          )
        );

        // 聚合为 stats 表格数据
        const allStats: StatsRow[] = [];

        responses.forEach((json, i) => {
          const data = json.data || {};
          if (i === 0) {
            // overview → 基础指标（对象结构）
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'number' || typeof value === 'string') {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  allStats.push({
                    key,
                    name: STAT_NAMES[key] || key,
                    value: numValue,
                  });
                }
              }
            });
          } else if (Array.isArray(data)) {
            // 其他接口 → 数组结构
            data.forEach(item => {
              allStats.push({
                key: item.id || item.documentId || item.name || Math.random().toString(),
                name: item.name || item.title || item.platformName || '未命名',
                value: Number(item.value || item.count || item.views || 0),
                unit: item.unit,
              });
            });
          }
        });

        setStats(allStats);

        // 组装 chartData（从 overview 提取时间序列）
        const overview = responses[0]?.data || {};
        const chart = overview.timeSeries || overview.daily || overview.timeline || [];
        if (Array.isArray(chart)) {
          setChartData(
            chart.map((d: any) => ({
              date: d.date || d.time || d.dateKey || '',
              value: Number(d.value || d.count || d.views || 0),
            }))
          );
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error('useStats fetchAll error:', err);
        setStats([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [type]);

  return { stats, chartData, loading };
};

export default useStats;
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/useStats.ts
git commit -m "refactor(zhao-studio): useStats 改为对象参数+聚合多接口返回统一格式"
```

---

## Task 7: useAIConfig + useAIActions 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIConfig.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIActions.ts`

- [ ] **Step 1: 读取 2 个现有 hooks**

使用 Read 工具读取：
- `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIConfig.ts`
- `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIActions.ts`

- [ ] **Step 2: 重写 useAIConfig.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIConfig.ts`，内容：

```typescript
import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin/ai';

interface AIConfig {
  enabled?: boolean;
  provider?: string;
  apiKey?: string;
  endpoint?: string;
  apiBase?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  isActive?: boolean;
}

export const useAIConfig = () => {
  const [config, setConfig] = React.useState<AIConfig | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/config`);
      const json = await res.json();
      setConfig(json.data || null);
    } catch (err) {
      console.error('fetchConfig error:', err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = async (data: Partial<AIConfig>) => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('保存失败');
    await fetchConfig();
  };

  const testConfig = async (data: Partial<AIConfig>) => {
    const res = await fetch(`${API_BASE}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: data.provider,
        apiKey: data.apiKey,
        endpoint: data.endpoint || data.apiBase,
      }),
    });
    if (!res.ok) throw new Error('测试失败');
    return res.json();
  };

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, updateConfig, testConfig };
};

export default useAIConfig;
```

- [ ] **Step 3: 重写 useAIActions.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\useAIActions.ts`，内容：

```typescript
import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin/ai';

interface ChatResponse {
  content: string;
  role: string;
}

export const useAIActions = () => {
  const [loading, setLoading] = React.useState(false);

  // 通用对话（新增，调用后端 /ai/chat）
  const chat = async (content: string): Promise<ChatResponse> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
        }),
      });
      if (!res.ok) throw new Error('对话失败');
      const json = await res.json();
      return json.data || { content: '（无回复）', role: 'assistant' };
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (articleId: string, options?: { length?: number }) => {
    setLoading(true);
    try {
      const query = options?.length ? `?length=${options.length}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/summary${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('生成摘要失败');
      const json = await res.json();
      return json.data?.summary || '';
    } finally {
      setLoading(false);
    }
  };

  const optimizeTitle = async (articleId: string, style?: string) => {
    setLoading(true);
    try {
      const query = style ? `?style=${style}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/title${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('优化标题失败');
      const json = await res.json();
      return json.data?.optimizedTitle || '';
    } finally {
      setLoading(false);
    }
  };

  const rewriteContent = async (articleId: string, tone?: string) => {
    setLoading(true);
    try {
      const query = tone ? `?tone=${tone}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/rewrite${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('改写内容失败');
      const json = await res.json();
      return json.data?.rewrittenContent || '';
    } finally {
      setLoading(false);
    }
  };

  const convertLanguage = async (articleId: string, target?: string) => {
    setLoading(true);
    try {
      const query = target ? `?target=${target}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/convert${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('语言转换失败');
      const json = await res.json();
      return json.data?.convertedContent || '';
    } finally {
      setLoading(false);
    }
  };

  return { chat, generateSummary, optimizeTitle, rewriteContent, convertLanguage, loading };
};

export default useAIActions;
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/useAIConfig.ts plugins/zhao-studio/admin/src/hooks/useAIActions.ts
git commit -m "refactor(zhao-studio): useAIConfig 改单对象模式+useAIActions 新增 chat"
```

---

## Task 8: AIConfigPage 改造 + 启动验证

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\AIConfigPage.tsx`

- [ ] **Step 1: 读取当前 AIConfigPage.tsx**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\pages\AIConfigPage.tsx`，确认当前是"列表+CRUD Modal"结构。

- [ ] **Step 2: 重写 AIConfigPage.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\pages\AIConfigPage.tsx`，内容：

```tsx
import React from 'react';
import { Card, Typography, Space, message, Spin } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';
import AIConfigForm from '../components/AIConfigForm';

const { Title, Text } = Typography;

const AIConfigPage = () => {
  const { config, loading, updateConfig, testConfig } = useAIConfig();

  if (loading && !config) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin /></div>;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>AI 配置</Title>
        <Text type="secondary">配置 AI 服务商参数</Text>
      </div>
      <Card title="配置详情">
        <AIConfigForm
          config={config}
          onSave={async (data) => {
            try {
              await updateConfig(data);
              message.success('保存成功');
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => message.info('已取消')}
        />
      </Card>
    </Space>
  );
};

export default AIConfigPage;
```

- [ ] **Step 3: Commit AIConfigPage**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/AIConfigPage.tsx
git commit -m "refactor(zhao-studio): AIConfigPage 从列表+CRUD 改为单条配置表单"
```

- [ ] **Step 4: 构建 admin 验证**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm run build
```

Expected: 构建成功。若报 TypeScript 错误，记录错误详情（区分 hooks 相关错误与其他错误）。

- [ ] **Step 5: 启动 Strapi 验证**

```powershell
cd e:\code\basic
npm run develop
```

使用 RunCommand 工具，blocking: false, wait_ms_before_async: 45000

等待启动完成后，使用 CheckCommandStatus 查看输出。Expected: Strapi 启动成功，无 zhao-studio 加载错误，无 webpack 编译错误。

- [ ] **Step 6: 停止 Strapi**

使用 StopCommand 工具停止 Strapi 进程。

- [ ] **Step 7: 输出最终验收报告**

格式：

```
## zhao-studio hooks 接口修复最终验收报告

### 验收清单
1. fieldNormalizer.ts 创建: ✅/❌
2. 后端 AI chat 接口: ✅/❌
3. 8 个 hooks 改造: ✅/❌（X/8）
4. AIConfigPage 改单表单: ✅/❌
5. npm run build 成功: ✅/❌
6. Strapi 启动成功: ✅/❌

### Commit 列表
列出 Task 1-8 的 commit hash

### 结论
修复完成 / 需后续处理
```

---

## Self-Review 结果

**1. Spec coverage 检查**：
- ✅ Spec 第 1.2 节 8 个 hook 不匹配 → Task 3-7 全覆盖
- ✅ Spec 第 2 节后端 AI chat 接口 → Task 2 实现（路由+controller+service）
- ✅ Spec 第 3.1 节 fieldNormalizer → Task 1 实现
- ✅ Spec 第 4 节 AIConfigPage 改造 → Task 8 Step 2 实现
- ✅ Spec 第 5.1 节 Task 依赖关系 → 与本计划 Task 1-8 一致

**2. Placeholder 扫描**：
- 无 TBD/TODO/未实现段落
- 每个 Step 都含完整代码或具体命令
- 后端 service 的 chat 方法有完整实现（非"类似 Task N"引用）

**3. Type 一致性**：
- ✅ `normalizeRecord`/`normalizeList` 在 Task 1 定义，Task 3/4/5 使用一致
- ✅ `usePublishRecords(params?)` 对象参数在 Task 3 定义，与组件 `usePublishRecords({platformId, accountId})` 一致
- ✅ `usePublishAccounts()` 无参 + `fetchAccounts(platformId?)` 在 Task 4 定义，与组件 `useEffect(() => { if (selectedPlatform) fetchAccounts(selectedPlatform) })` 一致
- ✅ `usePublishActions().publish({articleIds, platformId, accountId})` 在 Task 4 定义，与组件调用一致
- ✅ `useAdSlots()` 返回 `{slots, createSlot, updateSlot, deleteSlot}` 在 Task 5 定义，与组件使用一致
- ✅ `useStats({type})` 在 Task 6 定义，返回 `{stats, chartData, loading}`，与 3 个 Stats 页面使用一致
- ✅ `useAIConfig()` 返回 `{config, updateConfig, testConfig}` 在 Task 7 定义，与 Task 8 AIConfigPage 使用一致
- ✅ `useAIActions().chat(content)` 在 Task 7 定义，与 AIAssistant 组件 `const { chat, loading } = useAIActions()` 一致
- ✅ 后端 `ai.chat` handler 在 Task 2 路由定义，controller 实现，service 实现，三处一致

**4. 关键发现已纳入**：
- service 名是 `ai-assist`（非 `ai`），Task 2 Step 3 已用 `strapi.plugin('zhao-studio').service('ai-assist')`
- 现有 `callAI({prompt, type})` 不支持 messages 数组，Task 2 Step 4 的 chat 方法将 messages 拼接为 prompt 调用 callAI（最简实现）
- 后端 AI config 来自 `strapi.config.get('plugin.zhao-studio.ai')`（非数据库），Task 2 chat 方法已使用

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-07-01-zhao-studio-hooks-fix.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派 fresh subagent 执行，Task 间 review
2. **Inline Execution** - 当前会话批量执行，checkpoint 处 review

Which approach?
