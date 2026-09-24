# 标签过滤修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 TagPicker 分组过滤失效（Strapi v5 manyToOne 过滤不稳定）+ 清理前端残留 knowledge-points API 调用 + 补全 tag service populate tagGroup。

**Architecture:** tag service find 方法检测 tagGroup 过滤条件时改用 knex 查 join 表获取 tag id 列表，再用 `filters.id.$in` 过滤；前端清理 course.js/quiz.js 中残留的 knowledge-points API 函数；tag service 4 个方法 populate 默认包含 tagGroup。

**Tech Stack:** Strapi v5 plugin, TypeScript, Knex, PostgreSQL, Vue 3

**参考规范：**
- 设计文档：`e:\code\docs\superpowers\specs\2026-07-04-tag-filter-fix-design.md`
- 项目 memory：Strapi v5 manyToOne relation filter 不稳定，需用 knex fallback

**约束：**
- git 仓库在 e:\code\basic（后端）和 e:\code（前端）
- Strapi v5 develop 模式不会自动重编译插件 dist bundle，需 `npm run build`
- 测试方式：HTTP 请求验证过滤生效

---

## 文件结构

### 后端

- `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts`（修改：find 方法 knex fallback + 4 个方法 populate tagGroup）

### 前端

- `e:\code\web\src\api\course.js`（修改：删除 knowledge-point API 函数 + knowledgePoints 字段处理）
- `e:\code\web\src\api\quiz.js`（修改：删除 knowledge-point API 函数）
- `e:\code\web\pages\course\detail.vue`（修改：移除 knowledgePoints 显示）
- `e:\code\web\pages\quiz\form.vue`（修改：移除 knowledgePoints UI 引用）

---

## Task 1: tag service find 方法 knex fallback 改造

**Files:**
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts`

- [ ] **Step 1: 修改 find 方法**

将 `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts` 的 `find` 方法（L6-34）完整替换为：

```ts
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    // 提取 tagGroup 过滤条件，改用 knex 查 join 表（Strapi v5 manyToOne filter 不稳定）
    const tagGroupFilter = filters?.tagGroup;
    let effectiveFilters = { ...filters };
    let tagIdScope: number[] | null = null;

    if (tagGroupFilter) {
      delete effectiveFilters.tagGroup;
      const knex = strapi.db.connection;
      let tagGroupId: number | null = null;

      if (tagGroupFilter.documentId) {
        const group = await knex('zhao_tag_groups').where('document_id', tagGroupFilter.documentId).first();
        tagGroupId = group?.id;
      } else if (tagGroupFilter.id) {
        tagGroupId = Number(tagGroupFilter.id);
      } else if (tagGroupFilter.slug && tagGroupFilter.slug.$eq) {
        const group = await knex('zhao_tag_groups').where('slug', tagGroupFilter.slug.$eq).first();
        tagGroupId = group?.id;
      }

      if (tagGroupId) {
        const rows = await knex('zhao_tags_tag_group_lnk')
          .where('tag_group_id', tagGroupId)
          .select('tag_id');
        tagIdScope = rows.map((r: any) => r.tag_id);
        if (tagIdScope.length === 0) {
          return { list: [], pagination: { page, pageSize, total: 0, pageCount: 0 } };
        }
        effectiveFilters.id = { $in: tagIdScope };
      }
    }

    const docParams: any = {
      filters: effectiveFilters,
      populate: {
        parent: true,
        children: true,
        icon: true,
        tagGroup: true,
        ...(populate || {}),
      },
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
      strapi.documents(UID).count({ filters: effectiveFilters }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },
```

- [ ] **Step 2: 修改 findOne 方法 populate**

将 `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts` 的 `findOne` 方法（L36-41）替换为：

```ts
  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { parent: true, children: true, icon: true, tagGroup: true },
    });
  },
```

- [ ] **Step 3: 修改 create 方法 populate**

将 `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts` 的 `create` 方法（L43-48）替换为：

```ts
  async create(data: any) {
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true },
    });
  },
```

- [ ] **Step 4: 修改 update 方法 populate**

将 `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts` 的 `update` 方法（L50-56）替换为：

```ts
  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true },
    });
  },
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-tag/server/src/services/tag.ts
git commit -m "fix(zhao-tag): tag service find 支持 tagGroup 过滤 + populate 补全 tagGroup"
```

---

## Task 2: 构建 zhao-tag 插件

**Files:** 无（仅构建）

- [ ] **Step 1: 构建 zhao-tag**

```bash
cd e:\code\basic\plugins\zhao-tag
npm run build
```

预期：dist/server/index.js 重新生成，无 TypeScript 错误。

- [ ] **Step 2: 重启 Strapi**

如果 Strapi 正在运行，先停止（端口 1337），然后重新启动 develop 模式：

```bash
# PowerShell - 停止旧实例
Get-NetTCPConnection -LocalPort 1337 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# 启动新实例
cd e:\code\basic
npm run develop
```

使用 RunCommand non-blocking 模式，等待 40 秒后检查启动成功。

- [ ] **Step 3: 不提交（dist 被 .gitignore 排除）**

---

## Task 3: 验证后端过滤生效

**Files:** 无（仅验证）

- [ ] **Step 1: 验证按 tagGroup slug 过滤**

```bash
# PowerShell - 查询知识点分组下的标签
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tags?pagination[pageSize]=50&filters[tagGroup][slug][\$eq]=knowledge-point" -Method GET
Write-Output "知识点分组标签数: $($response.meta.pagination.total)"
$response.data | Select-Object name | Format-Table
```

预期：返回 1 条记录（JavaScript基础）

- [ ] **Step 2: 验证按 tagGroup documentId 过滤**

```bash
# PowerShell - 先获取 IT技术 分组的 documentId
$groups = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tag-groups?pagination[pageSize]=20" -Method GET
$techGroup = $groups.data | Where-Object { $_.slug -eq 'tech' }
$techDocId = $techGroup.documentId
Write-Output "IT技术分组 documentId: $techDocId"

# 按 documentId 过滤
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tags?pagination[pageSize]=50&filters[tagGroup][documentId][\$eq]=$techDocId" -Method GET
Write-Output "IT技术分组标签数: $($response.meta.pagination.total)"
$response.data | Select-Object -First 5 name | Format-Table
```

预期：返回 20 条记录（IT技术 分组下的标签）

- [ ] **Step 3: 验证不过滤时返回全部标签（含 tagGroup）**

```bash
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-tag/v1/tags?pagination[pageSize]=200" -Method GET
Write-Output "总标签数: $($response.meta.pagination.total)"
$withGroup = $response.data | Where-Object { $_.tagGroup }
Write-Output "含 tagGroup 的标签数: $($withGroup.Count)"
```

预期：返回 100 条标签，其中 98 条含 tagGroup 数据（97 归类 + 1 知识点迁移）

- [ ] **Step 4: 不提交（验证步骤无 git 改动）**

---

## Task 4: 清理前端 course.js 残留 knowledge-point API

**Files:**
- Modify: `e:\code\web\src\api\course.js`

- [ ] **Step 1: 先用 Read 工具读取文件**

读取 `e:\code\web\src\api\course.js`，找到 knowledge-point 相关函数和 knowledgePoints 字段处理。

- [ ] **Step 2: 删除 knowledge-point API 函数**

删除以下函数（约 L160-180 附近）：

```js
export function getKnowledgePointList(params = {}) {
  return get('/zhao-tag/v1/admin/knowledge-points', params).then(extractList)
}
export function getKnowledgePointDetail(documentId) {
  return get(`/zhao-tag/v1/admin/knowledge-points/${documentId}`).then(extractItem)
}
export function createKnowledgePoint(data) {
  return post('/zhao-tag/v1/admin/knowledge-points', { data }).then(extractItem)
}
export function updateKnowledgePoint(documentId, data) {
  return put(`/zhao-tag/v1/admin/knowledge-points/${documentId}`, { data }).then(extractItem)
}
export function deleteKnowledgePoint(documentId) {
  return del(`/zhao-tag/v1/admin/knowledge-points/${documentId}`).then(extractItem)
}
```

如函数名略有不同（如 `getKnowledgePoints` 而非 `getKnowledgePointList`），以实际文件内容为准，删除所有调用 `/zhao-tag/v1/admin/knowledge-points` 的函数。

- [ ] **Step 3: 删除 knowledgePoints 字段处理逻辑**

删除以下代码（约 L31-32, L77-78, L97-98 附近）：

```js
      if (item.knowledgePoints) {
        item.knowledgePoints = extractList({ data: item.knowledgePoints }).list
      }
```

三处都需删除（course 列表、lesson 列表、course 详情中的 knowledgePoints 处理）。

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add src/api/course.js
git commit -m "refactor(web): 清理 course.js 残留 knowledge-point API"
```

---

## Task 5: 清理前端 quiz.js 残留 knowledge-point API

**Files:**
- Modify: `e:\code\web\src\api\quiz.js`

- [ ] **Step 1: 先用 Read 工具读取文件**

读取 `e:\code\web\src\api\quiz.js`，找到 knowledge-point 相关函数。

- [ ] **Step 2: 删除 knowledge-point API 函数**

删除以下函数（约 L120-142 附近）：

```js
export function getKnowledgePointList(params = {}) {
  return get('/zhao-tag/v1/admin/knowledge-points', params).then(extractList)
}
export function getKnowledgePointDetail(documentId) {
  return get(`/zhao-tag/v1/admin/knowledge-points/${documentId}`).then(extractItem)
}
export function createKnowledgePoint(data) {
  return post('/zhao-tag/v1/admin/knowledge-points', { data }).then(extractItem)
}
export function updateKnowledgePoint(documentId, data) {
  return put(`/zhao-tag/v1/admin/knowledge-points/${documentId}`, { data }).then(extractItem)
}
export function deleteKnowledgePoint(documentId) {
  return del(`/zhao-tag/v1/admin/knowledge-points/${documentId}`).then(extractItem)
}
```

如函数名略有不同，以实际文件内容为准，删除所有调用 `/zhao-tag/v1/admin/knowledge-points` 的函数。

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add src/api/quiz.js
git commit -m "refactor(web): 清理 quiz.js 残留 knowledge-point API"
```

---

## Task 6: 清理前端 course/detail.vue 残留 knowledgePoints 显示

**Files:**
- Modify: `e:\code\web\pages\course\detail.vue`

- [ ] **Step 1: 先用 Read 工具读取文件**

读取 `e:\code\web\pages\course\detail.vue`，找到 L114-120 附近的 knowledgePoints 显示代码。

- [ ] **Step 2: 修改 knowledgePoints 显示为从 tags 过滤**

找到以下代码（约 L114-120）：

```vue
      <view v-if="course.knowledgePoints?.length" class="info-section">
        ...
        <view v-for="kp in course.knowledgePoints" :key="kp.documentId" class="tag-item kp">
```

改为从 tags 中过滤知识点（tagGroup.slug === 'knowledge-point'）：

```vue
      <view v-if="knowledgePointTags.length" class="info-section">
        ...
        <view v-for="kp in knowledgePointTags" :key="kp.documentId" class="tag-item kp">
```

注意：需保留原 UI 样式和结构，只改数据源。`kp.name` 等字段保持不变（tag 也有 name 字段）。

- [ ] **Step 3: 新增 knowledgePointTags 计算属性**

在 `<script setup>` 中找到 `course` 相关的响应式定义，新增计算属性：

```js
import { computed } from 'vue'

const knowledgePointTags = computed(() => {
  if (!course.value?.tags) return []
  return course.value.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
})
```

如已导入 computed 则不重复导入。

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add pages/course/detail.vue
git commit -m "refactor(web): course 详情页知识点显示改用 tags 过滤"
```

---

## Task 7: 验证前端 TagPicker 分组过滤功能

**Files:** 无（仅验证）

- [ ] **Step 1: 验证 TagPicker 分组过滤**

打开浏览器访问 `http://localhost:5175/#/pages/course/form?id=e3nkbz8dvn1dkmfezfyna7xi`，确认：

1. 点击"标签"选择器，弹出 TagPicker
2. 左侧显示 9 个普通分组（无"知识点"分组，因为 mode="tag" 或默认）
3. 点击左侧"IT技术"分组，右侧只显示 IT技术 分组下的 20 个标签
4. 点击左侧"金融理财"分组，右侧只显示金融理财分组下的 15 个标签
5. 点击左侧"全部"（如有），右侧显示所有标签

- [ ] **Step 2: 验证 TagPicker 知识点模式**

1. 点击"知识点"选择器，弹出 TagPicker（mode="knowledge-point"）
2. 左侧只显示"知识点"分组
3. 右侧显示"JavaScript基础"标签
4. 可选中并保存

- [ ] **Step 3: 验证新建分组功能**

1. 在 TagPicker 中点击"+ 新建分组"按钮
2. 输入分组名称（如"测试分组"）
3. 确认后分组出现在左侧列表
4. 刷新页面后分组仍存在

- [ ] **Step 4: 验证课程保存功能**

1. 选择若干标签和知识点
2. 保存课程
3. 重新打开课程详情，确认标签和知识点都正确回显

- [ ] **Step 5: 不提交（验证步骤无 git 改动）**

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|-----------|
| tag service find 方法 knex fallback | Task 1 |
| tag service 4 方法 populate tagGroup | Task 1 |
| 构建 + 重启 Strapi | Task 2 |
| 后端过滤验证 | Task 3 |
| 清理 course.js 残留 | Task 4 |
| 清理 quiz.js 残留 | Task 5 |
| 清理 course/detail.vue 残留 | Task 6 |
| 前端分组过滤验证 | Task 7 |

### 2. 占位符扫描

- Task 4/5/6 Step 1 "先用 Read 工具读取文件" — 这是必要的前置步骤，子代理需读取后才能精确编辑，非占位符
- Task 6 Step 2 "..." 表示保留原 UI 结构 — 实际执行时子代理会读取文件并保留样式，可接受

### 3. 类型一致性

- `filters[tagGroup][slug][$eq]` 和 `filters[tagGroup][documentId][$eq]` 在 Task 1 后端 + Task 3 验证 + 前端调用一致
- `tagGroup: true` populate 在 Task 1 的 4 个方法中一致
- `t.tagGroup?.slug === 'knowledge-point'` 在前端过滤逻辑中一致

### 4. 风险点

- Task 1 中 `filters.id.$in` 在 Strapi v5 中也有不稳定记录（memory）。如果失效，需 fallback 到全 knex 查询。但 `$in` 相比 `$eq` 更稳定，且 memory 中的失败案例是 `$eq` 单值查询，`$in` 数组查询通常可用
- Task 6 course/detail.vue 修改需保留原样式，子代理需仔细处理
- 前端 dev server 需在 5175 端口运行，验证前确认
