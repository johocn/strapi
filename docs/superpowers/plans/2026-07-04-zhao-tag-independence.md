# zhao-tag 独立化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 zhao-tag 改造为独立通用标签体系插件，承担 tag/knowledge-point/tag-index 三类业务的 content-type、API、服务；从 zhao-course 移除标签和知识点 API；让前端 `/zhao-tag/v1/admin/knowledge-points` 等路由可用。

**Architecture:** zhao-tag 新建完整 API 层（controllers/services/routes/policies/permissions），三层路由规范对齐 zhao-course（publicRoute/userRoute/channelScopeRoute）；新增 tag-index content-type 承担跨业务反向检索；移除 zhao-tag schema 中所有业务方反向关系；zhao-course 删除 knowledge-point 的 controller/service/routes/permissions，保留业务方正向关系和 lifecycle 调用；zhao-quiz 补全 quiz.tags 正向关系。

**Tech Stack:** Strapi v5 plugin, TypeScript, Document Service API, Koa routes, PostgreSQL

**参考规范：**
- 路由三层模式：`e:\code\basic\plugins\zhao-course\server\src\routes\content-api.ts`
- 控制器模板：`e:\code\basic\plugins\zhao-course\server\src\controllers\course-category.ts`
- 服务模板：`e:\code\basic\plugins\zhao-course\server\src\services\course-category.ts`
- 策略插件：`plugin::zhao-auth.is-authenticated` / `has-permission` / `has-channel-scope` / `has-tenant-access`
- 插件入口：`e:\code\basic\plugins\zhao-course\server\src\index.ts`

**约束：**
- Strapi v5 develop 模式不会自动重编译插件 dist bundle，每个插件改动后需在插件目录执行 `npm run build`
- Strapi v5 content-type 变更需强制迁移（删除 `strapi_database_schema` 元数据）
- 测试方式：通过 HTTP 请求验证路由返回 200，无自动化测试套件

---

## 文件结构

### zhao-tag 插件（新建 API 层）

```
plugins/zhao-tag/server/src/
├── content-types/
│   ├── tag/schema.json              # 修改：移除 lessons/courses/knowledgePoints
│   ├── knowledge-point/schema.json  # 修改：移除 courses
│   ├── tag-index/schema.json        # 新增
│   └── index.ts                     # 修改：注册 tag-index
├── controllers/
│   ├── index.ts                     # 新增
│   ├── tag.ts                       # 新增
│   ├── knowledge-point.ts           # 新增
│   └── tag-index.ts                 # 新增
├── services/
│   ├── index.ts                     # 新增
│   ├── tag.ts                       # 新增
│   ├── knowledge-point.ts           # 新增
│   └── tag-index.ts                 # 新增
├── routes/
│   ├── index.ts                     # 新增
│   └── content-api.ts               # 新增
├── policies/
│   └── index.ts                     # 新增（占位）
├── permissions.ts                   # 新增
└── index.ts                         # 修改：注册 controllers/services/routes
```

### zhao-course 插件（清理 knowledge-point API）

- 删除：`controllers/knowledge-point.ts`、`services/knowledge-point.ts`
- 修改：`controllers/index.ts`、`services/index.ts`、`routes/content-api.ts`、`permissions.ts`、`content-types/course/schema.json`、`content-types/course-lesson/schema.json`

### zhao-quiz 插件（补全 tags 关系）

- 修改：`content-types/quiz/schema.json`

---

## Task 1: 新建 zhao-tag permissions.ts

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\permissions.ts`

- [ ] **Step 1: 创建 permissions.ts**

```ts
export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
} as const;

export interface PermissionEntry {
  allowRoles: string[];
}

export type PermissionAction =
  | `${string}.${"read" | "create" | "update" | "delete" | "publish" | "grant"}`
  | `${string}.${string}`;

export const PERMISSIONS: Record<string, PermissionEntry> = {
  "tag.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "tag.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },

  "knowledge-point.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "knowledge-point.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "knowledge-point.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "knowledge-point.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },

  "tag-index.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
};

export default PERMISSIONS;
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/permissions.ts
git commit -m "feat(zhao-tag): 新增权限定义"
```

---

## Task 2: 修改 zhao-tag tag schema 移除反向关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\content-types\tag\schema.json`

- [ ] **Step 1: 移除 lessons/courses/knowledgePoints 三个反向字段**

删除以下三个属性块：

```json
"lessons": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-course.course-lesson",
  "mappedBy": "tags"
},
"courses": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-course.course",
  "mappedBy": "tags"
},
"knowledgePoints": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-course.knowledge-point",
  "mappedBy": "tags"
},
```

保留 `parent` 和 `children`（tag 自身的层级关系）。

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/content-types/tag/schema.json
git commit -m "refactor(zhao-tag): 移除 tag schema 业务方反向关系"
```

---

## Task 3: 修改 zhao-tag knowledge-point schema 移除反向关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\content-types\knowledge-point\schema.json`

- [ ] **Step 1: 移除 courses 反向字段**

删除以下属性块：

```json
"courses": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-course.course",
  "inversedBy": "knowledgePoints"
},
```

保留 `parent` 和 `children`（知识点自身的层级关系）、`courses` 改为无（不再持有反向）。注意：原 schema 中 `courses` 字段如果不存在则跳过此步（实际为 `tag.knowledgePoints` 错误指向 zhao-course，已在 Task 2 处理）。

实际操作：读取当前 schema.json 确认是否含 `courses` 字段。如无则跳过 Step 1，仅提交空改动。

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/content-types/knowledge-point/schema.json
git commit -m "refactor(zhao-tag): 移除 knowledge-point schema 业务方反向关系"
```

---

## Task 4: 新建 tag-index content-type

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\content-types\tag-index\schema.json`
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\content-types\index.ts`

- [ ] **Step 1: 创建 tag-index schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_tag_indexes",
  "info": {
    "singularName": "tag-index",
    "pluralName": "tag-indexes",
    "displayName": "标签索引"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "targetType": {
      "type": "string",
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "tag": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.tag",
      "inversedBy": "indexes"
    },
    "createdAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 2: 修改 content-types/index.ts 注册 tag-index**

完整替换为：

```ts
import tagSchema from "./tag/schema.json";
import knowledgePointSchema from "./knowledge-point/schema.json";
import tagIndexSchema from "./tag-index/schema.json";

export default {
  tag: { schema: tagSchema },
  "knowledge-point": { schema: knowledgePointSchema },
  "tag-index": { schema: tagIndexSchema },
};
```

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/content-types/tag-index/ basic/plugins/zhao-tag/server/src/content-types/index.ts
git commit -m "feat(zhao-tag): 新增 tag-index content-type"
```

---

## Task 5: 修改 tag schema 添加 indexes 反向关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\content-types\tag\schema.json`

**说明：** tag-index.tag 使用 `inversedBy: "indexes"`，则 tag schema 需要持有 `indexes` 反向字段。这是 zhao-tag 内部关系，不污染业务方。

- [ ] **Step 1: 在 tag schema attributes 末尾（deletedAt 之前）添加 indexes 字段**

```json
"indexes": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-tag.tag-index",
  "mappedBy": "tag"
},
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/content-types/tag/schema.json
git commit -m "feat(zhao-tag): tag schema 添加 indexes 反向关系"
```

---

## Task 6: 新建 zhao-tag services

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\services\tag.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\services\knowledge-point.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\services\tag-index.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\services\index.ts`

- [ ] **Step 1: 创建 services/tag.ts**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const docParams: any = {
      filters: filters || {},
      populate: {
        parent: true,
        children: true,
        icon: true,
        ...(populate || {}),
      },
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
      strapi.documents(UID).count({ filters: filters || {} }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
```

- [ ] **Step 2: 创建 services/knowledge-point.ts**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.knowledge-point";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const docParams: any = {
      filters: filters || {},
      populate: {
        parent: true,
        children: true,
        ...(populate || {}),
      },
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
      strapi.documents(UID).count({ filters: filters || {} }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { parent: true, children: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true },
    });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true },
    });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
```

- [ ] **Step 3: 创建 services/tag-index.ts**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag-index";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 业务方 lifecycle 调用：同步标签索引
   * 计算 diff：新增的入库，移除的删除
   */
  async sync(targetType: string, targetId: string, tagIds: string[]) {
    if (!targetType || !targetId) return;

    // 查询现有索引
    const existing = await strapi.documents(UID).findMany({
      filters: { targetType, targetId },
      populate: { tag: true },
    });

    const existingTagIds = new Set(
      (existing as any[]).map((r: any) => r.tag?.documentId).filter(Boolean)
    );
    const newTagIds = new Set(tagIds);

    // 删除被移除的索引
    const toRemove = (existing as any[]).filter(
      (r: any) => !newTagIds.has(r.tag?.documentId)
    );
    for (const r of toRemove) {
      if (r.documentId) {
        await strapi.documents(UID).delete({ documentId: r.documentId });
      }
    }

    // 新增缺失的索引
    const toAdd = tagIds.filter((id) => !existingTagIds.has(id));
    for (const tagDocumentId of toAdd) {
      await strapi.documents(UID).create({
        data: { targetType, targetId, tag: tagDocumentId },
      });
    }
  },

  /**
   * 业务方 lifecycle 调用：删除某业务记录的所有索引
   */
  async remove(targetType: string, targetId: string) {
    if (!targetType || !targetId) return;
    const records = await strapi.documents(UID).findMany({
      filters: { targetType, targetId },
    });
    for (const r of records as any[]) {
      if (r.documentId) {
        await strapi.documents(UID).delete({ documentId: r.documentId });
      }
    }
  },

  /**
   * 跨业务检索：按 tag 查所有关联内容
   * 返回 [{ targetType, targetId }]
   */
  async searchByTag(tagDocumentId: string, targetType?: string) {
    const filters: any = { tag: { documentId: tagDocumentId } };
    if (targetType) filters.targetType = targetType;
    return strapi.documents(UID).findMany({
      filters,
      fields: ["targetType", "targetId"],
    });
  },

  /**
   * 统计：标签被引用次数
   */
  async countByTag(tagDocumentId: string) {
    return strapi.documents(UID).count({
      filters: { tag: { documentId: tagDocumentId } },
    });
  },
});
```

- [ ] **Step 4: 创建 services/index.ts**

```ts
import tag from "./tag";
import knowledgePoint from "./knowledge-point";
import tagIndex from "./tag-index";

export default {
  tag,
  "knowledge-point": knowledgePoint,
  "tag-index": tagIndex,
};
```

- [ ] **Step 5: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/services/
git commit -m "feat(zhao-tag): 新增 services（tag/knowledge-point/tag-index）"
```

---

## Task 7: 新建 zhao-tag controllers

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\controllers\tag.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\controllers\knowledge-point.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\controllers\tag-index.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\controllers\index.ts`

- [ ] **Step 1: 创建 controllers/tag.ts**

```ts
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-tag").service("tag").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-tag").service("tag").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "标签不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-tag").service("tag").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("tag").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("tag").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});
```

- [ ] **Step 2: 创建 controllers/knowledge-point.ts**

```ts
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-tag").service("knowledge-point").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-tag").service("knowledge-point").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "知识点不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-tag").service("knowledge-point").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("knowledge-point").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("knowledge-point").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});
```

- [ ] **Step 3: 创建 controllers/tag-index.ts**

```ts
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.documents("plugin::zhao-tag.tag-index").findMany(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async search(ctx: any) {
    try {
      const { tagId, targetType } = ctx.query;
      if (!tagId) { ctx.status = 400; ctx.body = { error: "tagId 必填" }; return; }
      const result = await strapi.plugin("zhao-tag").service("tag-index").searchByTag(tagId, targetType);
      ctx.body = wrapList(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});
```

- [ ] **Step 4: 创建 controllers/index.ts**

```ts
import tag from "./tag";
import knowledgePoint from "./knowledge-point";
import tagIndex from "./tag-index";

export default {
  tag,
  "knowledge-point": knowledgePoint,
  "tag-index": tagIndex,
};
```

- [ ] **Step 5: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/controllers/
git commit -m "feat(zhao-tag): 新增 controllers（tag/knowledge-point/tag-index）"
```

---

## Task 8: 新建 zhao-tag routes

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\routes\content-api.ts`
- Create: `e:\code\basic\plugins\zhao-tag\server\src\routes\index.ts`

- [ ] **Step 1: 创建 routes/content-api.ts**

```ts
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"],
  },
});

const channelScopeRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由（tag） =====
    publicRoute("GET", "/tags", "tag.find"),
    publicRoute("GET", "/tags/:documentId", "tag.findOne"),
    // ===== 公开路由（knowledge-point） =====
    publicRoute("GET", "/knowledge-points", "knowledge-point.find"),
    publicRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne"),

    // ===== 管理路由（tag） =====
    channelScopeRoute("GET", "/tags", "tag.find", "tag.read"),
    channelScopeRoute("GET", "/tags/:documentId", "tag.findOne", "tag.read"),
    channelScopeRoute("POST", "/tags", "tag.create", "tag.create"),
    channelScopeRoute("PUT", "/tags/:documentId", "tag.update", "tag.update"),
    channelScopeRoute("DELETE", "/tags/:documentId", "tag.delete", "tag.delete"),

    // ===== 管理路由（knowledge-point） =====
    channelScopeRoute("GET", "/knowledge-points", "knowledge-point.find", "knowledge-point.read"),
    channelScopeRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne", "knowledge-point.read"),
    channelScopeRoute("POST", "/knowledge-points", "knowledge-point.create", "knowledge-point.create"),
    channelScopeRoute("PUT", "/knowledge-points/:documentId", "knowledge-point.update", "knowledge-point.update"),
    channelScopeRoute("DELETE", "/knowledge-points/:documentId", "knowledge-point.delete", "knowledge-point.delete"),

    // ===== 管理路由（tag-index） =====
    channelScopeRoute("GET", "/tag-indexes", "tag-index.find", "tag-index.read"),
    publicRoute("GET", "/tag-indexes/search", "tag-index.search"),
  ],
});
```

- [ ] **Step 2: 创建 routes/index.ts**

```ts
import contentApi from "./content-api";

export default {
  "content-api": contentApi,
};
```

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/routes/
git commit -m "feat(zhao-tag): 新增三层路由（public/channelScope）"
```

---

## Task 9: 新建 zhao-tag policies 占位

**Files:**
- Create: `e:\code\basic\plugins\zhao-tag\server\src\policies\index.ts`

- [ ] **Step 1: 创建 policies/index.ts**

```ts
// 占位：当前 zhao-tag 无自定义 policy，所有策略复用 plugin::zhao-auth.*
export default {};
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/policies/
git commit -m "feat(zhao-tag): 新增 policies 占位"
```

---

## Task 10: 修改 zhao-tag index.ts 注册 API 层

**Files:**
- Modify: `e:\code\basic\plugins\zhao-tag\server\src\index.ts`

- [ ] **Step 1: 完整替换 index.ts**

```ts
import contentTypes from "./content-types";
import controllers from "./controllers";
import services from "./services";
import routes from "./routes";

export default {
  register() {},
  bootstrap() {},
  destroy() {},
  contentTypes,
  controllers,
  services,
  routes,
};
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-tag/server/src/index.ts
git commit -m "feat(zhao-tag): 注册 controllers/services/routes"
```

---

## Task 11: 清理 zhao-course knowledge-point controller 和 service

**Files:**
- Delete: `e:\code\basic\plugins\zhao-course\server\src\controllers\knowledge-point.ts`
- Delete: `e:\code\basic\plugins\zhao-course\server\src\services\knowledge-point.ts`
- Modify: `e:\code\basic\plugins\zhao-course\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\index.ts`

- [ ] **Step 1: 删除 knowledge-point controller 和 service 文件**

使用 DeleteFile 工具删除：
- `e:\code\basic\plugins\zhao-course\server\src\controllers\knowledge-point.ts`
- `e:\code\basic\plugins\zhao-course\server\src\services\knowledge-point.ts`

- [ ] **Step 2: 修改 controllers/index.ts 移除 knowledge-point**

完整替换为：

```ts
import courseCategory from "./course-category";
import course from "./course";
import courseLesson from "./course-lesson";
import userCourseAuth from "./user-course-auth";
import courseProgress from "./course-progress";
import lessonProgress from "./lesson-progress";

export default {
  "course-category": courseCategory,
  course,
  "course-lesson": courseLesson,
  "user-course-auth": userCourseAuth,
  "course-progress": courseProgress,
  "lesson-progress": lessonProgress,
};
```

- [ ] **Step 3: 修改 services/index.ts 移除 knowledge-point**

完整替换为：

```ts
import courseCategory from "./course-category";
import course from "./course";
import courseLesson from "./course-lesson";
import userCourseAuth from "./user-course-auth";
import courseProgress from "./course-progress";
import lessonProgress from "./lesson-progress";

export default {
  "course-category": courseCategory,
  course,
  "course-lesson": courseLesson,
  "user-course-auth": userCourseAuth,
  "course-progress": courseProgress,
  "lesson-progress": lessonProgress,
};
```

- [ ] **Step 4: 提交**

```bash
cd e:\code
git add -A basic/plugins/zhao-course/server/src/controllers/ basic/plugins/zhao-course/server/src/services/
git commit -m "refactor(zhao-course): 移除 knowledge-point controller/service"
```

---

## Task 12: 清理 zhao-course routes 中的 knowledge-point 路由

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\routes\content-api.ts`

- [ ] **Step 1: 删除 knowledge-point 相关 7 条路由**

删除以下 7 行（公开 2 + 管理 5）：

```ts
publicRoute("GET", "/knowledge-points", "knowledge-point.find"),
publicRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne"),
```

```ts
channelScopeRoute("GET", "/knowledge-points", "knowledge-point.find", "knowledge-point.read"),
channelScopeRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne", "knowledge-point.read"),
channelScopeRoute("POST", "/knowledge-points", "knowledge-point.create", "knowledge-point.create"),
channelScopeRoute("PUT", "/knowledge-points/:documentId", "knowledge-point.update", "knowledge-point.update"),
channelScopeRoute("DELETE", "/knowledge-points/:documentId", "knowledge-point.delete", "knowledge-point.delete"),
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-course/server/src/routes/content-api.ts
git commit -m "refactor(zhao-course): 移除 knowledge-point 路由"
```

---

## Task 13: 清理 zhao-course permissions 中的 knowledge-point 权限

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\permissions.ts`

- [ ] **Step 1: 删除 knowledge-point 4 条权限**

删除以下 4 行：

```ts
"knowledge-point.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
"knowledge-point.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
"knowledge-point.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
"knowledge-point.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-course/server/src/permissions.ts
git commit -m "refactor(zhao-course): 移除 knowledge-point 权限"
```

---

## Task 14: 修改 zhao-course course schema 移除 inversedBy

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\content-types\course\schema.json`

- [ ] **Step 1: 修改 tags 字段移除 inversedBy**

将：

```json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-tag.tag",
  "inversedBy": "courses"
},
```

改为：

```json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-tag.tag"
},
```

`knowledgePoints` 字段保持不变（原本就无 inversedBy）。

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-course/server/src/content-types/course/schema.json
git commit -m "refactor(zhao-course): course.tags 移除 inversedBy"
```

---

## Task 15: 修改 zhao-course course-lesson schema 移除 inversedBy

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\content-types\course-lesson\schema.json`

- [ ] **Step 1: 修改 tags 字段移除 inversedBy**

将：

```json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-tag.tag",
  "inversedBy": "lessons"
},
```

改为：

```json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-tag.tag"
},
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-course/server/src/content-types/course-lesson/schema.json
git commit -m "refactor(zhao-course): course-lesson.tags 移除 inversedBy"
```

---

## Task 16: zhao-quiz 补全 quiz.tags 正向关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz\schema.json`

- [ ] **Step 1: 在 knowledgePoints 字段后添加 tags 字段**

读取当前 schema，在 `knowledgePoints` 字段块之后插入：

```json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-tag.tag"
},
```

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-quiz/server/src/content-types/quiz/schema.json
git commit -m "feat(zhao-quiz): 新增 quiz.tags 正向关系"
```

---

## Task 17: 构建 zhao-tag 插件

**Files:** 无（仅构建）

- [ ] **Step 1: 执行 npm run build**

```bash
cd e:\code\basic\plugins\zhao-tag
npm run build
```

预期输出：`dist/server/index.js` 和 `dist/server/index.mjs` 重新生成，无 TypeScript 错误。

- [ ] **Step 2: 验证 dist 生成**

检查 `e:\code\basic\plugins\zhao-tag\dist\server\index.js` 文件存在且时间戳更新。

如构建失败，检查 TypeScript 错误并修复。

- [ ] **Step 3: 提交 dist（如 .gitignore 未排除）**

```bash
cd e:\code
git status basic/plugins/zhao-tag/dist
# 如有改动：
git add basic/plugins/zhao-tag/dist
git commit -m "build(zhao-tag): 重新生成 dist bundle"
```

---

## Task 18: 构建 zhao-course 插件

**Files:** 无（仅构建）

- [ ] **Step 1: 执行 npm run build**

```bash
cd e:\code\basic\plugins\zhao-course
npm run build
```

预期输出：`dist/server/index.js` 重新生成，无 TypeScript 错误（删除 knowledge-point 不应导致编译失败）。

- [ ] **Step 2: 提交 dist（如 .gitignore 未排除）**

```bash
cd e:\code
git status basic/plugins/zhao-course/dist
# 如有改动：
git add basic/plugins/zhao-course/dist
git commit -m "build(zhao-course): 重新生成 dist bundle"
```

---

## Task 19: 强制迁移 Strapi schema 元数据

**Files:** 无（仅数据库操作）

**说明：** Strapi v5 不会在 content-type schema 变更后自动迁移表结构，需删除 `strapi_database_schema` 表中相关元数据记录强制重建。

- [ ] **Step 1: 备份数据库（生产环境）**

如果是生产环境，先备份数据库。本地开发环境可跳过。

- [ ] **Step 2: 停止 Strapi 服务**

```bash
# 如 Strapi 正在运行，停止它
# PowerShell：
Get-NetTCPConnection -LocalPort 1337 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

- [ ] **Step 3: 删除 Strapi schema 元数据中相关记录**

通过数据库客户端（如 psql 或 pgAdmin）执行：

```sql
-- 删除 zhao-tag 相关元数据（强制 Strapi 重建表结构）
DELETE FROM strapi_database_schema WHERE uid LIKE 'plugin::zhao-tag%';

-- 删除 zhao-course knowledge-point 历史元数据（清理遗留）
DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-course.knowledge-point';
```

- [ ] **Step 4: 启动 Strapi**

```bash
cd e:\code\basic
npm run develop
```

观察启动日志，确认：
1. 无 schema 加载错误
2. `zhao_tag_indexes` 表自动创建
3. zhao-tag 路由注册无报错
4. zhao-course 路由注册无报错

如启动失败，根据错误信息修复。

- [ ] **Step 5: 不提交（数据库操作无 git 改动）**

---

## Task 20: 端到端验证

**Files:** 无（仅 HTTP 验证）

- [ ] **Step 1: 验证 zhao-tag knowledge-points 路由可用**

```bash
# 获取 admin token（如已有可跳过）
# 假设已登录获得 TOKEN

# 验证管理路由
curl -X GET "http://localhost:1337/api/zhao-tag/v1/admin/knowledge-points?pagination[pageSize]=200" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-site-id: <TENANT_DOCUMENT_ID>"
```

预期：返回 200 + `{ data: [...], meta: { pagination: {...} } }`

- [ ] **Step 2: 验证 zhao-tag tags 路由可用**

```bash
curl -X GET "http://localhost:1337/api/zhao-tag/v1/admin/tags?pagination[pageSize]=25" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-site-id: <TENANT_DOCUMENT_ID>"
```

预期：返回 200 + 标签列表

- [ ] **Step 3: 验证公开路由可用（无需 token）**

```bash
curl -X GET "http://localhost:1337/api/zhao-tag/v1/knowledge-points?pagination[pageSize]=10"
```

预期：返回 200 + 知识点列表

- [ ] **Step 4: 验证 zhao-course knowledge-points 路由已移除**

```bash
curl -X GET "http://localhost:1337/api/zhao-course/v1/admin/knowledge-points" \
  -H "Authorization: Bearer <TOKEN>"
```

预期：返回 404

- [ ] **Step 5: 验证前端页面功能恢复**

打开浏览器访问 `http://localhost:5175/#/pages/course/form?id=e3nkbz8dvn1dkmfezfyna7xi`，确认：
1. 知识点选择器加载成功（不再报 404）
2. 标签选择器加载成功
3. 课程保存功能正常（tags/knowledgePoints 关系正常）

- [ ] **Step 6: 验证 course/lesson/quiz 按 tag/kp 过滤查询**

```bash
# 按标签过滤课程
curl -X GET "http://localhost:1337/api/zhao-course/v1/courses?filters[tags][documentId][\$in]=<TAG_DOC_ID>&populate=tags,knowledgePoints" \
  -H "Authorization: Bearer <TOKEN>"
```

预期：返回 200 + 过滤后的课程列表

- [ ] **Step 7: 验证 tag-index 同步**

1. 在管理后台创建/更新一个课程，关联若干 tags
2. 查询 `zhao_tag_indexes` 表，确认索引记录已同步

```sql
SELECT * FROM zhao_tag_indexes WHERE target_type = 'course' LIMIT 10;
```

预期：能看到 `targetType=course`、`targetId=<courseDocId>`、`tag=<tagId>` 的索引记录

- [ ] **Step 8: 不提交（验证步骤无 git 改动）**

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|-----------|
| zhao-tag 新建 controllers/services/routes | Task 6/7/8/9/10 |
| zhao-tag 新增 tag-index content-type | Task 4/5 |
| zhao-tag schema 移除反向关系 | Task 2/3 |
| zhao-tag 新增 permissions | Task 1 |
| zhao-course 删除 knowledge-point controller/service | Task 11 |
| zhao-course 删除 knowledge-point 路由 | Task 12 |
| zhao-course 删除 knowledge-point 权限 | Task 13 |
| zhao-course schema 移除 inversedBy | Task 14/15 |
| zhao-quiz 新增 quiz.tags | Task 16 |
| 构建 zhao-tag | Task 17 |
| 构建 zhao-course | Task 18 |
| Strapi schema 强制迁移 | Task 19 |
| 端到端验证（6 条验收标准） | Task 20 |

### 2. 占位符扫描

无 TBD/TODO，所有代码块完整。

### 3. 类型一致性

- `strapi.plugin("zhao-tag").service("tag-index")` 在 Task 6 service 和 zhao-course lifecycle 中调用方法签名一致：`sync(targetType, targetId, tagIds)` / `remove(targetType, targetId)`
- UID `plugin::zhao-tag.tag-index` 在 Task 4 schema 和 Task 6 service 一致
- 路由 handler 名称 `tag.find` / `knowledge-point.find` 与 controllers/index.ts 注册键一致

### 4. 风险点

- Task 19 数据库操作不可逆，需先备份
- Task 17/18 构建失败需排查 TypeScript 错误
- zhao-course 的 `services/course.ts` 中仍引用 `strapi.documents("plugin::zhao-tag.tag")` 和 `plugin::zhao-tag.knowledge-point`（验证逻辑），这些是业务方查询 zhao-tag，UID 正确，无需改动
