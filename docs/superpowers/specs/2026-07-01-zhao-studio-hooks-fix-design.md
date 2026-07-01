# zhao-studio hooks 接口修复设计

- **日期**: 2026-07-01
- **类型**: hooks 数据层 + 后端接口适配
- **状态**: 设计已确认，待实现
- **范围**: 修复 zhao-studio admin 重写后 8 个 hooks 与组件的接口不匹配问题

## 1. 背景与目标

### 1.1 背景

zhao-studio admin Ant Design 重写已完成（commit `b580785` 及之前 18 个 commit），27 个 .tsx 文件从 `@strapi/design-system` 迁移至 antd v5。但 Task 4-10 subagent 报告发现 **8 个 hooks 与重写后组件期望接口严重不匹配**，运行时会报 `undefined is not a function` 错误。

### 1.2 已知不匹配清单

| Hook | 组件期望 | 实际接口 |
|---|---|---|
| `usePublishRecords` | `({platformId, accountId})` 对象 | `(articleId?: string)` 字符串 |
| `usePublishPlatforms` | 字段 `id` | 字段 `documentId` |
| `usePublishAccounts` | `()` 无参 + `fetchAccounts(id)` | `(platformId?)` 参数传入 |
| `usePublishActions` | `publish({articleIds, platformId, accountId})` | `publishArticle(articleId, accountIds)` 单文章 |
| `useAdSlots` | `slots/createSlot/...` + `adCode` | `adSlots/createAdSlot/...` + `code`，枚举值不同 |
| `useStats` | `({type})` + 返回 `stats/chartData` | `(type)` + 返回 `overview/articleStats/...` |
| `useAIConfig` | `configs` 数组 + CRUD | `config` 单对象，缺 createConfig/deleteConfig/testConfig |
| `useAIActions` | `chat(content)` | 缺 chat，有 generateSummary/optimizeTitle/... |

### 1.3 后端支持情况核查

| 期望接口 | 后端路由 | 状态 |
|---|---|---|
| `usePublishRecords` 过滤 | `GET /records`（无过滤参数） | ⚠️ 后端缺过滤参数 |
| `usePublishPlatforms/Accounts` CRUD | `/platforms` + `/accounts` 完整 CRUD | ✅ 后端支持 |
| `usePublishActions.publish` 批量 | `POST /articles/:articleId/publish`（单文章） | ⚠️ 后端是单文章 |
| `useAdSlots` CRUD | `/ad-slots` 完整 CRUD | ✅ 后端支持 |
| `useStats` 聚合 | 6 个独立接口（overview/articles/...） | ⚠️ 需 hooks 聚合 |
| `useAIConfig` 多配置 CRUD | 仅 `GET /ai/config` + `POST /ai/config` + `POST /ai/test` | ❌ 后端单条配置 |
| `useAIActions.chat` | 仅 4 个具体 AI 操作 | ❌ 后端缺 chat |

### 1.4 目标

采用**改 hooks 适配组件**方案（用户决策）：
- 8 个 hooks 改造签名/返回值/字段映射，使其符合重写后组件期望
- 后端新增 `POST /v1/admin/ai/chat` 接口支持 useAIActions.chat
- AIConfigPage 从"列表+CRUD Modal"改为"单条配置表单页"（适配后端单条配置）
- 其他 27 个组件文件**不动**

### 1.5 范围内

- 新增 1 个工具函数文件 `fieldNormalizer.ts`
- 后端新增 1 个路由 + controller 方法 + service 方法（ai chat）
- 8 个 hooks 改造
- 1 个组件改造（AIConfigPage）

### 1.6 范围外（YAGNI）

- 不改后端 `/records` 接口支持过滤（前端兜底）
- 不改后端 AI 配置为多条（保持单条）
- 不做流式 chat（一次性返回）
- 不重构 hooks 内部实现（只改签名/返回值/映射）
- 不改其他 7 个模块的组件代码
- 不写单元测试（启动验证为主）
- 不做 i18n（本次范围外）

## 2. 后端 AI chat 接口设计

### 2.1 路由新增

在 `server/src/routes/content-api.ts` 第 80 行后新增：

```typescript
adminRoute('POST', '/ai/chat', 'ai.chat', 'zhao-studio.read'),
```

权限用 `zhao-studio.read`（对话是查询性质，非写操作）。

### 2.2 Controller 方法

在 `server/src/controllers/ai.ts` 新增：

```typescript
async chat(ctx) {
  const { messages } = ctx.request.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return ctx.badRequest('messages is required');
  }
  const result = await strapi.service('plugin::zhao-studio.ai').chat(messages);
  ctx.body = { data: result };
}
```

**请求体**：`{ messages: [{ role: 'user'|'assistant'|'system', content: string }] }`
**响应**：`{ data: { content: string, role: 'assistant' } }`

### 2.3 Service 方法

在 `server/src/services/ai.ts` 新增 `chat` 方法，复用现有 AI provider 调用逻辑：

```typescript
async chat(messages: Array<{ role: string; content: string }>) {
  const config = await strapi.service('plugin::zhao-studio.ai').getConfig();
  if (!config) {
    throw new Error('AI 配置不存在');
  }
  const response = await this.callProvider(config, {
    messages,
    temperature: 0.7,
    maxTokens: 1000,
  });
  return {
    content: response.content,
    role: 'assistant',
  };
}
```

**关键决策**：复用现有 `callProvider`，仅新增 messages 参数传递。

### 2.4 不做的事项

- 不做流式响应（SSE）
- 不做对话历史持久化（前端 state 管理）
- 不做 token 计费/限流

## 3. Hooks 改造详情

### 3.1 字段标准化工具函数

新增 `admin/src/utils/fieldNormalizer.ts`：

```typescript
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

**决策**：用展开运算符保留所有字段，仅补 `id`。组件继续用 `record.id`。

### 3.2 usePublishRecords 改造

**文件**：`admin/src/hooks/usePublishRecords.ts`

```typescript
interface UsePublishRecordsParams {
  platformId?: string;
  accountId?: string;
}

export const usePublishRecords = (params?: UsePublishRecordsParams) => {
  const [records, setRecords] = React.useState([]);
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
      let list = json.data || [];
      // 前端过滤兜底（后端不支持时的兜底）
      if (params?.platformId) list = list.filter(r => r.platformId === params.platformId);
      if (params?.accountId) list = list.filter(r => r.accountId === params.accountId);
      setRecords(normalizeList(list));
    } finally {
      setLoading(false);
    }
  }, [params?.platformId, params?.accountId]);

  React.useEffect(() => { fetchRecords(); }, [fetchRecords]);
  return { records, loading, refetch: fetchRecords };
};
```

**关键点**：兜底前端过滤，避免后端不支持过滤参数时返回错误数据。

### 3.3 usePublishPlatforms 改造

**文件**：`admin/src/hooks/usePublishPlatforms.ts`

```typescript
export const usePublishPlatforms = () => {
  // 现有 fetch 逻辑保持
  // 返回前做字段标准化
  return {
    platforms: normalizeList(rawPlatforms),
    loading,
    createPlatform,
    updatePlatform: (id, data) => updatePlatform(id, data),
    deletePlatform: (id) => deletePlatform(id),
  };
};
```

**关键点**：`updatePlatform/deletePlatform` 的参数 `id` 即 `documentId`（Strapi v5 路由 `:id` 实际接收 documentId）。

### 3.4 usePublishAccounts 改造

**文件**：`admin/src/hooks/usePublishAccounts.ts`

```typescript
export const usePublishAccounts = () => {
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAccounts = React.useCallback(async (platformId?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/zhao-studio/v1/admin/accounts');
      const json = await res.json();
      let list = normalizeList(json.data || []);
      if (platformId) {
        list = list.filter(a => a.platformId === platformId || a.platform?.documentId === platformId);
      }
      setAccounts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAccounts(); }, []);
  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
};
```

**关键点**：`fetchAccounts(platformId)` 方法保留，组件 `useEffect` 依赖它。

### 3.5 usePublishActions 改造

**文件**：`admin/src/hooks/usePublishActions.ts`

```typescript
export const usePublishActions = () => {
  const [loading, setLoading] = React.useState(false);

  // 新增：批量发布
  const publish = async ({ articleIds, platformId, accountId }: {
    articleIds: string[];
    platformId: string;
    accountId: string;
  }) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        articleIds.map(articleId =>
          fetch(`/api/zhao-studio/v1/admin/articles/${articleId}/publish`, {
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

  return { publish, publishArticle, loading };
};
```

**关键点**：`Promise.all` 并行调用，任一失败抛错。

### 3.6 useAdSlots 改造

**文件**：`admin/src/hooks/useAdSlots.ts`

```typescript
// 枚举值映射（组件 → 后端）
const POSITION_MAP = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
  inarticle: 'article-content',
};

const TYPE_MAP = {
  image: 'banner',
  text: 'native',
  video: 'popup',
};

// 后端数据 → 组件数据
const normalizeSlot = (slot) => ({
  ...slot,
  id: slot.documentId || slot.id,
  adCode: slot.code,
  position: Object.entries(POSITION_MAP).find(([_, v]) => v === slot.position)?.[0] || slot.position,
  type: Object.entries(TYPE_MAP).find(([_, v]) => v === slot.type)?.[0] || slot.type,
});

// 组件数据 → 后端数据
const mapToBackend = (data) => ({
  ...data,
  code: data.adCode,
  position: POSITION_MAP[data.position] || data.position,
  type: TYPE_MAP[data.type] || data.type,
});

export const useAdSlots = () => {
  // 内部调用保持 adSlots/createAdSlot/...
  // 返回时重命名 + 字段映射
  return {
    slots: rawAdSlots.map(normalizeSlot),
    loading,
    createSlot: (data) => createAdSlot(mapToBackend(data)),
    updateSlot: (id, data) => updateAdSlot(id, mapToBackend(data)),
    deleteSlot: (id) => deleteAdSlot(id),
  };
};
```

**关键点**：双向映射。组件用 `adCode/inarticle/image`，后端用 `code/article-content/banner`。

### 3.7 useStats 改造

**文件**：`admin/src/hooks/useStats.ts`

```typescript
type StatsType = 'basic' | 'advanced' | 'pro';

interface UseStatsParams {
  type: StatsType;
}

const STAT_NAMES = {
  totalArticles: '总文章数',
  totalViews: '总浏览量',
  totalPublishes: '总发布数',
  totalRevenue: '总收入',
  // ...
};

export const useStats = ({ type }: UseStatsParams) => {
  const [stats, setStats] = React.useState([]);
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const endpoints = type === 'basic'
          ? ['/stats/overview']
          : type === 'advanced'
          ? ['/stats/overview', '/stats/articles']
          : ['/stats/overview', '/stats/articles', '/stats/ad-slots', '/stats/devices'];

        const responses = await Promise.all(
          endpoints.map(e => fetch(`/api/zhao-studio/v1/admin${e}`).then(r => r.json()))
        );

        const allStats = [];
        responses.forEach((json, i) => {
          const data = json.data || {};
          if (i === 0) {
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'number' || typeof value === 'string') {
                allStats.push({ key, name: STAT_NAMES[key] || key, value: Number(value) || 0 });
              }
            });
          } else if (Array.isArray(data)) {
            data.forEach(item => allStats.push({
              key: item.id || item.name,
              name: item.name || item.title,
              value: item.value || item.count || 0
            }));
          }
        });
        setStats(allStats);

        const overview = responses[0]?.data || {};
        const chart = overview.timeSeries || overview.daily || [];
        setChartData(chart.map(d => ({
          date: d.date || d.time,
          value: d.value || d.count
        })));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [type]);

  return { stats, chartData, loading };
};
```

**关键点**：
- 签名改为 `({type})` 对象
- 内部根据 type 聚合多个后端接口
- 返回统一的 `{stats, chartData, loading}`

### 3.8 useAIConfig 改造（单对象模式）

**文件**：`admin/src/hooks/useAIConfig.ts`

```typescript
export const useAIConfig = () => {
  const [config, setConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/zhao-studio/v1/admin/ai/config');
      const json = await res.json();
      setConfig(json.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = async (data: any) => {
    const res = await fetch('/api/zhao-studio/v1/admin/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('保存失败');
    await fetchConfig();
  };

  const testConfig = async (data: any) => {
    const res = await fetch('/api/zhao-studio/v1/admin/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('测试失败');
    return res.json();
  };

  React.useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, loading, updateConfig, testConfig };
};
```

**关键点**：返回单对象 `config`（非数组），匹配后端单条配置接口。

### 3.9 useAIActions 改造

**文件**：`admin/src/hooks/useAIActions.ts`

```typescript
export const useAIActions = () => {
  const [loading, setLoading] = React.useState(false);

  const chat = async (content: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/zhao-studio/v1/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
        }),
      });
      if (!res.ok) throw new Error('对话失败');
      const json = await res.json();
      return json.data;
    } finally {
      setLoading(false);
    }
  };

  // 保留现有 generateSummary/optimizeTitle/rewriteContent/convertLanguage
  return { chat, generateSummary, optimizeTitle, rewriteContent, convertLanguage, loading };
};
```

**关键点**：新增 `chat(content)` 方法，调用第 2 节新增的后端接口。

## 4. AIConfigPage 组件改造

### 4.1 AIConfigPage 改造

**文件**：`admin/src/pages/AIConfigPage.tsx`

从"列表+CRUD Modal"改为"单条配置表单页"：

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

**关键变化**：
- 移除 Table/Modal/Popconfirm/新增按钮
- 改为直接渲染 `AIConfigForm`（单表单）
- `config` 是单对象，传入 form 回显

### 4.2 AIConfigForm 调整

**文件**：`admin/src/components/AIConfigForm.tsx`

当前 AIConfigForm 已是表单结构，**无需大改**：
- 现有 `useEffect` 已支持单对象 config 回显
- 现有 `onSave`/`testConfig` 调用兼容
- 仅微调：`onCancel` 语义改为空操作或提示

## 5. Task 分解与执行顺序

### 5.1 Task 列表（8 个 Task）

| Task | 内容 | 涉及文件 | 依赖 |
|---|---|---|---|
| **1. 字段标准化工具** | 新增 `fieldNormalizer.ts` | 1 文件 | 无 |
| **2. 后端 AI chat 接口** | 路由 + controller + service | 3 文件 | 无 |
| **3. usePublishRecords 改造** | 签名+字段标准化 | 1 文件 | Task 1 |
| **4. usePublishPlatforms/Accounts/Actions 改造** | 字段标准化+新增 publish | 3 文件 | Task 1 |
| **5. useAdSlots 改造** | 重命名+字段映射+枚举映射 | 1 文件 | Task 1 |
| **6. useStats 改造** | 签名+聚合多接口 | 1 文件 | Task 1 |
| **7. useAIConfig + useAIActions 改造** | 单对象模式+新增 chat | 2 文件 | Task 2 |
| **8. AIConfigPage 改造 + 启动验证** | 组件改单表单+全量验证 | 1 文件 + 验证 | Task 7 |

### 5.2 Task 间验证点

- **Task 1 后**：工具函数可导入
- **Task 2 后**：后端路由注册（启动 Strapi 无错误）
- **Task 3-6 后**：各 hook 独立验证（TypeScript 编译通过）
- **Task 7 后**：useAIConfig 返回单对象，useAIActions 有 chat 方法
- **Task 8 后**：
  1. `npm run build` 成功（admin bundle 无错误）
  2. Strapi 启动无错误
  3. `/admin/plugins/zhao-studio` 全页面可加载无白屏
  4. AIConfigPage 显示单表单（非列表）
  5. 各模块 CRUD 操作可触发（无 `undefined is not a function` 错误）

### 5.3 执行策略

- **Subagent-Driven 模式**：每 Task 派 fresh subagent
- **Task 1+2 可并行**（无依赖）
- **Task 3-6 可并行**（都只依赖 Task 1）
- **Task 7 依赖 Task 2**（useAIActions.chat 调用新接口）
- **Task 8 依赖 Task 7**（AIConfigPage 用新 useAIConfig）
- **每 Task 单独 commit**

## 6. 风险点与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| **后端 `/records` 不支持过滤参数** | usePublishRecords 过滤失败 | hook 层前端兜底过滤（第 3.2 节） |
| **后端 AI provider 调用逻辑不明** | Task 2 实现困难 | 先 Read `ai-service.ts` 确认 callProvider 签名 |
| **useStats 聚合逻辑复杂** | Task 6 可能超预期 | 简化：basic 只取 overview，advanced/pro 追加 articles/ad-slots |
| **字段标准化遗漏** | 部分组件字段仍报 undefined | Task 8 启动验证时逐页面测试 |
| **AdSlot 枚举映射不全** | 部分广告位类型显示异常 | 第 3.6 节已定义映射表，未覆盖的用 fallback |

## 7. 验收口径

- **Task 2 完成后**：后端路由注册成功
- **Task 7 完成后**：所有 hooks TypeScript 编译通过
- **Task 8 完成后**：
  1. `npm run build` exit 0
  2. Strapi 启动成功
  3. 10 个页面可加载无白屏
  4. AIConfigPage 是单表单（非列表）
  5. 各模块无 `undefined is not a function` 运行时错误

## 8. 后续阶段（不在本次范围）

- **后端 `/records` 支持过滤参数**：本次前端兜底，后续可优化后端
- **流式 chat**：本次一次性返回，后续可升级 SSE
- **多 AI 配置**：本次保持单条，后续如需多服务商切换可扩展后端
- **token 计费/限流**：本次不做，后续按需补充
