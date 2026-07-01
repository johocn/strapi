# zhao-studio 类型治理与后端过滤修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-studio hooks 修复后遗留的类型告警 + 后端 /records 接口过滤补全。

**Architecture:** 类型治理收紧 fieldNormalizer 泛型 + 3 个 hooks 显式标注泛型；后端 listRecords controller/service 扩展接收 platformId/accountId 参数；前端 usePublishRecords 移除前端兜底过滤。

**Tech Stack:** TypeScript、React 18 hooks、Strapi v5 Document Service

**Spec:** `e:\code\basic\docs\superpowers\specs\2026-07-01-zhao-studio-type-and-filter-fix-design.md`

---

## 文件结构总览

| Task | 文件 | 操作 |
|---|---|---|
| 1 | `plugins/zhao-studio/admin/src/utils/fieldNormalizer.ts` | 修改（收紧泛型） |
| 2 | `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts` | 修改（显式泛型，仅 normalizeList 调用处） |
| 2 | `plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts` | 修改（显式泛型，仅 normalizeList 调用处） |
| 2 | `plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts` | 修改（显式泛型，仅 normalizeList 调用处） |
| 3 | `plugins/zhao-studio/server/src/controllers/publish.ts` | 修改（listRecords 方法，73-78 行） |
| 3 | `plugins/zhao-studio/server/src/services/publish.ts` | 修改（listRecords 方法，183-197 行） |
| 4 | `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts` | 修改（移除前端兜底过滤） |

**不修改文件**：
- 其他 hooks（useAdSlots/useStats/useAIConfig/useAIActions/usePublishActions）
- 组件代码
- schema 文件
- 路由文件（/records 路由已存在）

---

## Task 1: fieldNormalizer 类型收紧

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts`

- [ ] **Step 1: 读取现有 fieldNormalizer.ts**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts`，确认现有内容：

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

- [ ] **Step 2: 用 Write 工具覆盖 fieldNormalizer.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\utils\fieldNormalizer.ts`，内容：

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
- `if (!record)` 分支返回 `{ ...record, id: '' }`（统一返回类型，而非 `return record`）
- `record.documentId || record.id || ''` 兜底空字符串（避免 undefined 赋给 `id: string`）

- [ ] **Step 3: 验证文件内容**

使用 Read 工具读取修改后的文件，确认 12 行内容正确。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/utils/fieldNormalizer.ts
git commit -m "fix(zhao-studio): fieldNormalizer 收紧泛型+空值兜底"
```

使用 RunCommand 工具执行上述命令。验证 `git log -1 --oneline` 显示新 commit。

---

## Task 2: hooks 显式泛型标注

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`（第 35 行 normalizeRecord 调用）
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishPlatforms.ts`（第 27 行 normalizeList 调用）
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishAccounts.ts`（第 28 行 normalizeList 调用）

**注意**：本 Task 仅改 normalizeList/normalizeRecord 的泛型标注，不改其他逻辑。usePublishRecords 的前端兜底过滤移除在 Task 4 执行。

- [ ] **Step 1: 修改 usePublishPlatforms.ts 显式标注泛型**

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishPlatforms.ts`：

old_string:
```typescript
      setPlatforms(normalizeList(json.data || []));
```

new_string:
```typescript
      setPlatforms(normalizeList<PublishPlatform>(json.data || []));
```

- [ ] **Step 2: 修改 usePublishAccounts.ts 显式标注泛型**

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishAccounts.ts`：

old_string:
```typescript
      let list = normalizeList(json.data || []);
```

new_string:
```typescript
      let list = normalizeList<PublishAccount>(json.data || []);
```

- [ ] **Step 3: 修改 usePublishRecords.ts 显式标注泛型**

usePublishRecords 当前用 `normalizeRecord`（单条），不是 `normalizeList`。需在 map 回调中显式标注泛型。

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`：

old_string:
```typescript
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
```

new_string:
```typescript
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord<PublishRecord>(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
```

- [ ] **Step 4: 验证 3 个文件修改正确**

使用 Read 工具读取 3 个文件，确认 normalizeList/normalizeRecord 调用都带显式泛型参数。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts
git commit -m "fix(zhao-studio): 3 个 hooks 显式标注 normalizeList 泛型参数"
```

使用 RunCommand 工具执行上述命令。

---

## Task 3: 后端 /records 过滤扩展

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\publish.ts`（第 73-78 行 listRecords 方法）
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\services\publish.ts`（第 183-197 行 listRecords 方法）

- [ ] **Step 1: 读取现有 controller 和 service 代码**

使用 Read 工具读取：
- `e:\code\basic\plugins\zhao-studio\server\src\controllers\publish.ts`（70-80 行）
- `e:\code\basic\plugins\zhao-studio\server\src\services\publish.ts`（180-200 行）

确认现有代码：

controller（73-78 行）:
```typescript
  async listRecords(ctx: any) {
    const { articleId } = ctx.query;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const records = await publishService.listRecords(articleId);
    ctx.body = { data: records };
  },
```

service（183-197 行）:
```typescript
  async listRecords(articleId?: string) {
    const filters: any = {};
    if (articleId) {
      filters.article = articleId;
    }

    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters,
        sort: 'publishedAt:desc',
      });

    return records;
  },
```

- [ ] **Step 2: 修改 controller listRecords 方法**

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\server\src\controllers\publish.ts`：

old_string:
```typescript
  async listRecords(ctx: any) {
    const { articleId } = ctx.query;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const records = await publishService.listRecords(articleId);
    ctx.body = { data: records };
  },
```

new_string:
```typescript
  async listRecords(ctx: any) {
    const { articleId, platformId, accountId } = ctx.query;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const records = await publishService.listRecords({ articleId, platformId, accountId });
    ctx.body = { data: records };
  },
```

- [ ] **Step 3: 修改 service listRecords 方法**

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\server\src\services\publish.ts`：

old_string:
```typescript
  async listRecords(articleId?: string) {
    const filters: any = {};
    if (articleId) {
      filters.article = articleId;
    }

    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters,
        sort: 'publishedAt:desc',
      });

    return records;
  },
```

new_string:
```typescript
  async listRecords(filters: { articleId?: string; platformId?: string; accountId?: string } = {}) {
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
  },
```

**关键变化**：
- service 签名从 `(articleId?: string)` 改为 `(filters: { articleId?, platformId?, accountId? })`
- 新增 platform/account 关联过滤
- 保留 articleId 过滤（向后兼容）

- [ ] **Step 4: 验证后端编译**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm run build
```

使用 RunCommand 工具，blocking: true。
Expected: 构建成功。若报 TypeScript 错误，记录错误详情。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/server/src/controllers/publish.ts plugins/zhao-studio/server/src/services/publish.ts
git commit -m "feat(zhao-studio): 后端 /records 接口扩展 platformId/accountId 过滤"
```

使用 RunCommand 工具执行上述命令。

---

## Task 4: usePublishRecords 移除前端兜底 + 启动验证

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`（移除 36-48 行前端过滤）

- [ ] **Step 1: 读取当前 usePublishRecords.ts**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`，确认当前含前端兜底过滤代码（36-48 行）。

- [ ] **Step 2: 移除前端兜底过滤**

使用 Edit 工具修改 `e:\code\basic\plugins\zhao-studio\admin\src\hooks\usePublishRecords.ts`：

old_string:
```typescript
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
        const normalized = normalizeRecord<PublishRecord>(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
      setRecords(normalized);
```

new_string:
```typescript
      const res = await fetch(url);
      const json = await res.json();
      // 后端已支持 platformId/accountId 过滤，无需前端兜底
      const list: PublishRecord[] = json.data || [];
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord<PublishRecord>(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
      setRecords(normalized);
```

**关键变化**：
- 移除 `list.filter(r => r.platform?.documentId === ...)` 前端过滤代码
- `let list` 改为 `const list`（不再被 filter 重新赋值）
- 保留 normalizeRecord 显式泛型（Task 2 已加）

- [ ] **Step 3: 构建 admin 验证**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm run build
```

使用 RunCommand 工具，blocking: true。
Expected: 构建成功。记录 dts 阶段告警，确认 fieldNormalizer/usePublishAccounts/usePublishPlatforms 相关告警已消失。

- [ ] **Step 4: 启动 Strapi 验证**

```powershell
cd e:\code\basic
npm run develop
```

使用 RunCommand 工具，blocking: false, wait_ms_before_async: 45000

等待启动完成后，使用 CheckCommandStatus 查看输出。
Expected: Strapi 启动成功，无 zhao-studio 加载错误，无 webpack 编译错误。

- [ ] **Step 5: 停止 Strapi**

使用 StopCommand 工具停止 Strapi 进程。

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts
git commit -m "refactor(zhao-studio): usePublishRecords 移除前端兜底过滤（后端已支持）"
```

使用 RunCommand 工具执行上述命令。

- [ ] **Step 7: 输出最终验收报告**

格式如下（必须完整输出）：

```
## zhao-studio 类型治理与后端过滤修复最终验收报告

### 验收清单
1. fieldNormalizer 类型收紧: ✅/❌
2. 3 个 hooks 显式泛型标注: ✅/❌（X/3）
3. 后端 /records 过滤扩展: ✅/❌
4. usePublishRecords 移除前端兜底: ✅/❌
5. npm run build 成功: ✅/❌
6. Strapi 启动成功: ✅/❌

### Commit 列表
- Task 1: <hash> - fix(zhao-studio): fieldNormalizer 收紧泛型+空值兜底
- Task 2: <hash> - fix(zhao-studio): 3 个 hooks 显式标注 normalizeList 泛型参数
- Task 3: <hash> - feat(zhao-studio): 后端 /records 接口扩展 platformId/accountId 过滤
- Task 4: <hash> - refactor(zhao-studio): usePublishRecords 移除前端兜底过滤

### 构建告警对比（dts 阶段）
修复前：
- fieldNormalizer.ts:7 - T & { id: string | undefined } 不可赋值
- usePublishAccounts.ts:32,33,36 - 属性在 union 类型上不存在
- usePublishPlatforms.ts - 同上

修复后：
（列出剩余告警，确认上述 3 项已消失）

### 结论
修复完成 / 需后续处理（如 knex 兜底）
```

---

## Self-Review 结果

**1. Spec coverage 检查**：
- ✅ Spec 第 1.2 节 fieldNormalizer 类型放宽 → Task 1 实现
- ✅ Spec 第 1.2 节 usePublishAccounts/usePublishPlatforms 类型不匹配 → Task 2 实现
- ✅ Spec 第 1.2 节 后端 /records 过滤缺失 → Task 3 实现
- ✅ Spec 第 3.4 节 usePublishRecords 移除前端兜底 → Task 4 实现
- ✅ Spec 第 4.1 节 Task 依赖关系 → 与本计划 Task 1-4 一致

**2. Placeholder 扫描**：
- 无 TBD/TODO/未实现段落
- 每个 Step 都含完整代码或具体命令
- Task 4 Step 7 验收报告格式完整

**3. Type 一致性**：
- ✅ `normalizeRecord<T>` 在 Task 1 定义，Task 2 Step 3 使用 `normalizeRecord<PublishRecord>` 一致
- ✅ `normalizeList<T>` 在 Task 1 定义，Task 2 Step 1/2 使用 `normalizeList<PublishPlatform>`/`normalizeList<PublishAccount>` 一致
- ✅ service `listRecords(filters: { articleId?, platformId?, accountId? })` 在 Task 3 Step 3 定义，Task 3 Step 2 controller 调用 `publishService.listRecords({ articleId, platformId, accountId })` 一致
- ✅ Task 4 Step 2 的 old_string 包含 `normalizeRecord<PublishRecord>`（Task 2 已加），new_string 保留该泛型标注

**4. 关键细节确认**：
- ✅ Task 2 Step 3 usePublishRecords 的 old_string 使用 `normalizeRecord<PublishRecord>`（含 Task 2 加的泛型），确保 Task 2 在 Task 4 之前执行
- ✅ Task 4 依赖 Task 1（fieldNormalizer）+ Task 3（后端过滤），与 Spec 第 4.1 节一致
- ✅ Task 1 + Task 3 可并行（无依赖），Task 2 依赖 Task 1，Task 4 依赖 Task 1+3

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-07-01-zhao-studio-type-and-filter-fix.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派 fresh subagent 执行，Task 间 review
2. **Inline Execution** - 当前会话批量执行，checkpoint 处 review

Which approach?
