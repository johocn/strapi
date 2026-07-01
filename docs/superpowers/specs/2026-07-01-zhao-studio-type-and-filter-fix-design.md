# zhao-studio 类型治理与后端过滤修复设计

- **日期**: 2026-07-01
- **类型**: 类型修复 + 后端接口增强
- **状态**: 设计已确认，待实现
- **范围**: 修复 hooks 接口修复后遗留的类型告警 + 后端 /records 过滤补全

## 1. 背景与目标

### 1.1 背景

zhao-studio hooks 接口修复（commit `05a15c6` 及之前 9 个 commit）已完成，8 个 hooks 改造适配组件，Strapi 可启动。但 Task 8 验收报告显示 dts 阶段存在类型告警，且后端 `/records` 接口不支持 platformId/accountId 过滤（当前前端兜底）。

### 1.2 遗留问题清单

| 问题 | 位置 | 影响 |
|---|---|---|
| **fieldNormalizer 类型放宽** | `admin/src/utils/fieldNormalizer.ts` | `T & { id: string | undefined }` 不可赋值给 `T & { id: string }`；`if (!record) return record` 返回类型不匹配 |
| **usePublishAccounts 类型不匹配** | `admin/src/hooks/usePublishAccounts.ts:32,33,36` | `normalizeList(json.data)` 的 T 推断为 any，属性访问在 union 类型上不明确 |
| **usePublishPlatforms 类型不匹配** | `admin/src/hooks/usePublishPlatforms.ts` | 同上，泛型未显式标注 |
| **后端 /records 过滤缺失** | `server/src/controllers/publish.ts:73` + `server/src/services/publish.ts:183` | controller 仅接收 articleId，service 仅按 article 过滤；前端 hooks 兜底过滤性能差 |

### 1.3 目标

1. **类型治理**：收紧 fieldNormalizer 泛型，hooks 显式标注泛型参数，消除 dts 阶段类型告警
2. **后端过滤补全**：扩展 `/records` 接口支持 platformId/accountId 过滤，移除前端兜底
3. **保持兼容**：保留 articleId 过滤（向后兼容），不改接口路径

### 1.4 范围内

- 修复 1 个工具文件（fieldNormalizer.ts）
- 修复 3 个 hooks 文件（usePublishRecords/usePublishPlatforms/usePublishAccounts）显式泛型
- 改造 2 个后端文件（publish controller + service）
- 启动验证

### 1.5 范围外（YAGNI）

- 不实现 knex 兜底（验证失败再加）
- 不改 retry/syncStatus 接口
- 不改 publish-record schema
- 不加分页
- 不引入运行时校验库（如 zod）
- 不写单元测试（启动验证为主）
- 不做功能验证（用户手动执行）
- 不改组件代码（仅改 hooks/utils/后端）

## 2. 类型治理方案

### 2.1 fieldNormalizer.ts 收紧泛型

**问题根因**：
- 泛型约束 `{ documentId?: string; id?: string }` 允许两者都 undefined
- 返回 `T & { id: string }` 但 `record.documentId || record.id` 可能是 undefined
- `if (!record) return record;` 返回 T 而非 `T & { id: string }`

**修复**：

```typescript
// 将 Strapi v5 documentId 标准化为 id（供组件使用）
// 保留所有原始字段，仅补充 id 字段
export const normalizeRecord = <T extends { documentId?: string; id?: string }>(
  record: T
): T & { id: string } => {
  if (!record) {
    // 空值兜底：返回带空 id 的对象，避免 undefined 导致组件崩溃
    return { ...record, id: '' };
  }
  return { ...record, id: record.documentId || record.id || '' };
};

export const normalizeList = <T extends { documentId?: string; id?: string }>(
  list: T[] = []
): (T & { id: string })[] => list.map(normalizeRecord);
```

**关键变化**：
- `if (!record)` 分支返回 `{ ...record, id: '' }`（统一返回类型）
- `record.documentId || record.id || ''` 兜底空字符串

### 2.2 hooks 显式泛型标注

**问题根因**：
- `normalizeList(json.data || [])` 的 T 被推断为 `any`（json.data 是 any）
- 返回 `(any & { id: string })[]` 赋值给具体类型数组时类型不明确

**修复**：3 个 hooks 显式传入泛型参数：

| Hook | 修改 |
|---|---|
| `usePublishRecords.ts` | `normalizeList<PublishRecord>(json.data || [])` |
| `usePublishPlatforms.ts` | `normalizeList<PublishPlatform>(json.data || [])` |
| `usePublishAccounts.ts` | `normalizeList<PublishAccount>(json.data || [])` |

**关键变化**：显式泛型让 TS 正确推断返回类型，消除 union 类型属性访问错误。

### 2.3 不做的事项

- 不改 hooks 的接口签名（上一轮已定）
- 不引入运行时校验库
- 不改组件代码

## 3. 后端 /records 过滤方案

### 3.1 现状

**Controller**（`server/src/controllers/publish.ts:73-78`）：
```typescript
async listRecords(ctx: any) {
  const { articleId } = ctx.query;
  const publishService = strapi.plugin('zhao-studio').service('publish');
  const records = await publishService.listRecords(articleId);
  ctx.body = { data: records };
}
```
仅接收 `articleId`。

**Service**（`server/src/services/publish.ts:183-197`）：
```typescript
async listRecords(articleId?: string) {
  const filters: any = {};
  if (articleId) {
    filters.article = articleId;
  }
  const records = await strapi
    .documents('plugin::zhao-studio.publish-record')
    .findMany({ filters, sort: 'publishedAt:desc' });
  return records;
}
```
仅按 `article` 关联过滤。

### 3.2 后端改造

**Controller 改造**（接收 3 个 query 参数）：

```typescript
async listRecords(ctx: any) {
  const { articleId, platformId, accountId } = ctx.query;
  const publishService = strapi.plugin('zhao-studio').service('publish');
  const records = await publishService.listRecords({ articleId, platformId, accountId });
  ctx.body = { data: records };
}
```

**Service 改造**（接收对象参数 + 多条件过滤）：

```typescript
interface ListRecordsFilters {
  articleId?: string;
  platformId?: string;
  accountId?: string;
}

async listRecords(filters: ListRecordsFilters = {}) {
  const { articleId, platformId, accountId } = filters;
  const queryFilters: any = {};
  if (articleId) {
    queryFilters.article = articleId;
  }
  if (platformId) {
    queryFilters.platform = platformId;
  }
  if (accountId) {
    queryFilters.account = accountId;
  }

  const records = await strapi
    .documents('plugin::zhao-studio.publish-record')
    .findMany({
      filters: queryFilters,
      sort: 'publishedAt:desc',
    });

  return records;
}
```

**关键决策**：
- 保留原 `articleId` 过滤（向后兼容）
- 新增 `platform`/`account` 关联过滤
- service 签名从 `(articleId?: string)` 改为 `(filters: ListRecordsFilters)`，是破坏性变更，但仅 controller 一处调用，同步改即可

### 3.3 Strapi v5 关联过滤风险缓解

项目记忆提示：Strapi v5 db.query manyToMany relation filter 不稳定，但此处是 Document Service `findMany` + manyToOne 过滤（`article`/`platform`/`account` 是 publish-record 的 manyToOne 关联）。

**风险评估**：
- manyToOne 过滤比 manyToMany 稳定（项目记忆中不稳定的是 manyToMany）
- 若 `filters.platform = platformId` 失败，fallback 到 knex 直查

**兜底方案**（仅在验证失败时启用，本次不预先实现）：

```typescript
// Fallback: 若 Document Service 关联过滤失败，用 knex 直查
async listRecords(filters: ListRecordsFilters = {}) {
  let records = await strapi.documents('plugin::zhao-studio.publish-record').findMany({...});
  
  if (filters.platformId && records.length > 0) {
    const knex = strapi.db.connection;
    const validIds = await knex('zhao_publish_records')
      .where('platform_id', filters.platformId)
      .select('document_id');
    const idSet = new Set(validIds.map(r => r.document_id));
    records = records.filter(r => idSet.has(r.documentId));
  }
  
  return records;
}
```

**决策**：先实现基础版（Document Service 过滤），启动验证时确认过滤生效。若不生效，再加 knex 兜底。YAGNI 原则下不预先实现兜底。

### 3.4 前端 hooks 同步调整

**usePublishRecords.ts 改造**：移除前端兜底过滤（后端已支持）：

```typescript
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
      // 后端已支持过滤，无需前端兜底
      const list = normalizeList<PublishRecord>(json.data || []);
      // 字段展平（保留）
      const normalized = list.map(r => ({
        ...r,
        platformName: r.platformName || r.platform?.name || '-',
        errorMessage: r.errorMessage || r.error || '',
      }));
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
```

**关键变化**：
- 移除 `list.filter(r => r.platform?.documentId === ...)` 前端过滤
- 显式泛型 `normalizeList<PublishRecord>`
- 保留字段展平（platformName/errorMessage）

### 3.5 不做的事项

- 不实现 knex 兜底（YAGNI，验证失败再加）
- 不改 `/records/:recordId/retry` 接口
- 不改 publish-record schema
- 不加分页

## 4. Task 分解与执行顺序

### 4.1 Task 列表（4 个 Task）

| Task | 内容 | 涉及文件 | 依赖 |
|---|---|---|---|
| **1. fieldNormalizer 类型收紧** | 修复 `normalizeRecord` 空值返回 + id 兜底 | 1 文件 | 无 |
| **2. hooks 显式泛型标注** | usePublishRecords/usePublishPlatforms/usePublishAccounts 显式 `<T>` | 3 文件 | Task 1 |
| **3. 后端 /records 过滤扩展** | controller + service 接收 platformId/accountId | 2 文件 | 无 |
| **4. usePublishRecords 移除前端兜底 + 验证** | 移除前端过滤 + 启动验证 | 1 文件 + 验证 | Task 1, 3 |

### 4.2 Task 间验证点

- **Task 1 后**：`npm run build` 类型告警减少（fieldNormalizer 相关告警消失）
- **Task 2 后**：`npm run build` usePublishAccounts/usePublishPlatforms 类型告警消失
- **Task 3 后**：后端编译通过，路由可接收 platformId/accountId 参数
- **Task 4 后**：
  1. `npm run build` 成功（无新增类型错误）
  2. Strapi 启动成功
  3. `GET /api/zhao-studio/v1/admin/records?platformId=xxx` 返回过滤后数据
  4. 前端 usePublishRecords 不再做前端过滤

### 4.3 执行策略

- **Subagent-Driven 模式**：每 Task 派 fresh subagent
- **Task 1 + Task 3 可并行**（无依赖）
- **Task 2 依赖 Task 1**（需先收紧 fieldNormalizer 泛型）
- **Task 4 依赖 Task 1 + Task 3**（需类型修复 + 后端过滤就绪）
- **每 Task 单独 commit**

### 4.4 风险点与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| **Strapi v5 manyToOne 关联过滤不稳定** | `filters.platform = platformId` 无效 | 启动验证时检查过滤是否生效；若失败，Task 4 后追加 knex 兜底 |
| **显式泛型标注暴露更多类型错误** | Task 2 可能连锁报错 | 逐个 hook 标注，确认错误是否为预先存在 |
| **service 签名破坏性变更** | 其他调用方受影响 | 已确认仅 controller 一处调用 listRecords |
| **normalizeRecord 空值返回 `{...record, id: ''}`** | 空对象传入可能行为异常 | 组件已有 `if (!record)` 防御，空 id 不会导致崩溃 |

### 4.5 验收口径

- **Task 4 完成后**：
  1. `npm run build` exit 0，dts 阶段无 fieldNormalizer/usePublishAccounts/usePublishPlatforms 相关错误
  2. Strapi 启动成功
  3. `GET /records?platformId=xxx` 后端日志显示过滤参数被接收
  4. usePublishRecords 源码无 `list.filter` 前端过滤代码

## 5. 后续阶段（不在本次范围）

- **knex 兜底**：若 Task 4 验证发现 Document Service 关联过滤失败，追加 knex 兜底实现
- **分页**：本次不做，后续按需补充
- **功能验证**：用户手动触发各模块 CRUD 操作确认运行时无错误
- **其他预先存在的类型错误**：schema.json 模块解析、controllers 的 ctx 隐式 any 等，不在本次范围
