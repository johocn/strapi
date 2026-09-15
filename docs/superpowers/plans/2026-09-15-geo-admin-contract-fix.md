# GEO 知识图谱管理端契约修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 h.joho.cn 管理端 GEO 知识图谱四页面（知识实体/知识关系/第一真值/AI 摘要）与后端 zhao-website 的契约错配，并建立统一查询参数解析工具，顺带恢复其他内容模块列表分页/筛选。

**Architecture:** 后端新增 `parseListQuery`/`wrapList` 统一查询工具（解析 `pagination[page]`/`filters[...]` 嵌套参数，兼容裸参数，输出 `{data, meta:{pagination}}` 结构）；四个目标模块的 service/controller/路由逐项修正契约；generic 12 个 service 的 `findAdmin` 按统一模板接入工具；前端 6 页面 + api 层做字段对齐。多租户约束：所有列表 where 保持 `$or: [{site: tenant, deletedAt: null}, {site: null, deletedAt: null}]` 双匹配。

**Tech Stack:** TypeScript, Strapi 5 (plugin zhao-website), Koa (qs 嵌套参数), Jest (tests/helpers/mock-strapi), uni-app H5 (web 仓库)

**前置约定：**
- 测试跑法：`cd plugins/zhao-website && npm test -- --testPathPatterns="tests/services/query|tests/services/knowledge-graph|tests/services/first-truth|tests/services/ai-content-summary"`（jest 配置在 `tests/jest.config.ts`）
- mock 模式：`createMockStrapi()` 生成 strapi mock，`mockStrapi.db.query()` 取 query mock（见 `tests/helpers/mock-strapi.ts`）
- 每个任务完成后 git commit + push 到 basic 或 web 仓库（见各任务）
- 禁止在 joho（2G 内存）执行任何 `npm run build`

---

### Task 1: 统一查询工具 parseListQuery/wrapList（TDD）

**Files:**
- Create: `e:\code\basic\plugins\zhao-website\server\src\services\utils\query.ts`
- Test: `e:\code\basic\plugins\zhao-website\tests\services\query.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/services/query.test.ts`：

```ts
import { parseListQuery, wrapList } from "../../server/src/services/utils/query";

describe("parseListQuery", () => {
  test("解析 pagination[page]/pagination[pageSize] 嵌套参数", () => {
    const result = parseListQuery({ pagination: { page: 2, pageSize: 5 } }, { siteId: 1 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
  });

  test("兼容裸 page/pageSize 参数", () => {
    const result = parseListQuery({ page: 3, pageSize: 10 }, { siteId: 1 });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });

  test("缺省 pageSize 用 defaultPageSize", () => {
    const result = parseListQuery({}, { siteId: 1, defaultPageSize: 50 });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  test("非法分页值回退为 1/defaultPageSize", () => {
    const result = parseListQuery({ page: -1, pageSize: 0 }, { siteId: 1, defaultPageSize: 20 });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  test("filters 嵌套展开为 where，空值剔除", () => {
    const result = parseListQuery(
      { filters: { name: { $contains: "abc" }, entityType: "Organization", status: "" } },
      { siteId: 1 }
    );
    expect(result.where).toEqual({ name: { $contains: "abc" }, entityType: "Organization" });
    expect(result.filters.entityType).toBe("Organization");
  });

  test("ignoreKeys 中的 key 不进 where", () => {
    const result = parseListQuery(
      { filters: { category: "cat-a", status: "draft" } },
      { siteId: 1, ignoreKeys: ["category"] }
    );
    expect(result.where).toEqual({ status: "draft" });
  });

  test("裸筛选参数兼容（不含分页/filters 自身）", () => {
    const result = parseListQuery({ status: "draft", page: 1 }, { siteId: 1 });
    expect(result.where.status).toBe("draft");
  });
});

describe("wrapList", () => {
  test("输出 { data, meta.pagination } 结构且 pageCount 正确", () => {
    const result = wrapList([{ id: 1 }], 2, 10, 25);
    expect(result.data).toHaveLength(1);
    expect(result.meta.pagination).toEqual({ page: 2, pageSize: 10, total: 25, pageCount: 3 });
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/query"`
Expected: FAIL（`Cannot find module` 或测试全部红）

- [ ] **Step 3: 实现 query.ts**

创建 `server/src/services/utils/query.ts`：

```ts
export interface ParsedListQuery {
  where: Record<string, any>;
  page: number;
  pageSize: number;
  filters: Record<string, any>;
}

/**
 * 统一管理端列表查询参数解析：
 * - 分页：pagination[page]/pagination[pageSize]（Koa/qs 嵌套对象）与裸 page/pageSize 均兼容
 * - 筛选：filters[...] 嵌套对象展开为 where（空值剔除）；ignoreKeys 指定的 key 保留在 filters 供业务特殊处理（如关联筛选）
 * - 裸筛选参数（如 status）兼容
 * 多租户 $or 双匹配由调用方自行注入（本工具不注入 site 条件）
 */
export function parseListQuery(
  query: any = {},
  opts: { siteId?: number | null; defaultPageSize?: number; ignoreKeys?: string[] } = {}
): ParsedListQuery {
  const defaultPageSize = opts.defaultPageSize ?? 20;
  const rawPage = Number(query?.pagination?.page ?? query?.page ?? 1);
  const rawPageSize = Number(query?.pagination?.pageSize ?? query?.pageSize ?? defaultPageSize);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : defaultPageSize;

  const filters: Record<string, any> = { ...(query?.filters || {}) };
  const ignore = new Set(opts.ignoreKeys || []);
  const where: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (ignore.has(key)) continue;
    if (value !== undefined && value !== null && value !== "") where[key] = value;
  }

  const reserved = new Set(["pagination", "filters", "page", "pageSize"]);
  for (const [key, value] of Object.entries(query || {})) {
    if (reserved.has(key)) continue;
    if (value !== undefined && value !== null && value !== "" && !where[key]) where[key] = value;
  }

  return { where, page, pageSize, filters };
}

export function wrapList(items: any[], page: number, pageSize: number, total: number) {
  const p = Number(page) || 1;
  const s = Number(pageSize) || 20;
  return {
    data: items,
    meta: {
      pagination: {
        page: p,
        pageSize: s,
        total: Number(total) || 0,
        pageCount: Math.ceil(Number(total) / s) || 1,
      },
    },
  };
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/query"`
Expected: PASS（9 个测试全绿）

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/utils/query.ts plugins/zhao-website/tests/services/query.test.ts
git commit -m "feat(zhao-website): 新增统一查询参数解析工具 parseListQuery/wrapList"
git push
```

---

### Task 2: knowledge-graph 后端契约修复（TDD）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\knowledge-graph.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\admin-api\knowledge-graph.ts`
- Test: `e:\code\basic\plugins\zhao-website\tests\services\knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试（追加到 knowledge-graph.test.ts）**

在 `describe("Knowledge Graph Service")` 内追加：

```ts
test("findEntities 解析分页与 name 搜索，返回 { data, meta.pagination }", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findMany.mockResolvedValue([{ documentId: "doc-a", name: "A" }]);
  queryMock.count.mockResolvedValue(25);

  const result = await service.findEntities(1, {
    pagination: { page: 2, pageSize: 5 },
    filters: { name: { $contains: "abc" } },
  });

  expect(queryMock.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        $or: [
          expect.objectContaining({ site: 1, name: { $contains: "abc" } }),
          expect.objectContaining({ site: null, name: { $contains: "abc" } }),
        ],
      },
      limit: 5,
      offset: 5,
    })
  );
  expect(queryMock.count).toHaveBeenCalled();
  expect(result).toEqual(
    expect.objectContaining({
      data: [{ documentId: "doc-a", name: "A" }],
      meta: { pagination: expect.objectContaining({ page: 2, pageSize: 5, total: 25, pageCount: 5 }) },
    })
  );
});

test("findEntities 裸 entityType 参数兼容", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findMany.mockResolvedValue([]);
  queryMock.count.mockResolvedValue(0);

  await service.findEntities(1, { entityType: "Organization" });

  const where = queryMock.findMany.mock.calls[0][0].where;
  expect(where.$or[0].entityType).toBe("Organization");
  expect(where.$or[1].entityType).toBe("Organization");
});

test("findOneEntity tenant 优先，回退 global", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findOne
    .mockResolvedValueOnce(null) // tenant 未命中
    .mockResolvedValueOnce({ documentId: "doc-a", name: "A" }); // global 命中

  const result = await service.findOneEntity(1, "doc-a");

  expect(queryMock.findOne).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ where: expect.objectContaining({ site: 1, documentId: "doc-a" }) })
  );
  expect(queryMock.findOne).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ where: expect.objectContaining({ site: null, documentId: "doc-a" }) })
  );
  expect(result).toEqual(expect.objectContaining({ name: "A" }));
});

test("findRelations 支持 filters[documentId] 与分页", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findMany.mockResolvedValue([{ documentId: "rel-1", predicate: "parent" }]);
  queryMock.count.mockResolvedValue(1);

  const result = await service.findRelations(1, {
    pagination: { page: 1, pageSize: 10 },
    filters: { documentId: "rel-1" },
  });

  const where = queryMock.findMany.mock.calls[0][0].where;
  expect(where.$or[0].documentId).toBe("rel-1");
  expect(result.meta.pagination.total).toBe(1);
});

test("addRelation 支持 sourceUrl/sourceType 透传", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findOne.mockResolvedValue({ documentId: "doc-a", entityType: "Organization" }); // 幂等 upsert 前查询 subjectEntity
  queryMock.findMany.mockResolvedValue([]); // 幂等 upsert 前 findOne 用 findOne，无碍

  await service.addRelation({
    siteId: 1,
    subjectEntityId: "doc-a",
    predicate: "parent",
    objectEntityId: "doc-b",
    sourceUrl: "https://example.com",
    sourceType: "official",
  });

  expect(queryMock.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ sourceUrl: "https://example.com", sourceType: "official" }),
    })
  );
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/knowledge-graph"`
Expected: FAIL（findEntities 仍返回数组、findOneEntity/addRelation sourceUrl 不存在）

- [ ] **Step 3: 实现 knowledge-graph.ts 修改**

文件头加 import：

```ts
import { parseListQuery, wrapList } from "./utils/query";
```

替换 `findEntities`（原 L9-25）：

```ts
async findEntities(siteId: number, query: any = {}) {
  const { where, page, pageSize } = parseListQuery(query, { siteId, defaultPageSize: 20 });
  const filters: any = {
    $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
  };
  for (const key of ["name", "entityType", "verificationStatus"]) {
    if (where[key]) {
      filters.$or[0][key] = where[key];
      filters.$or[1][key] = where[key];
    }
  }
  const [items, total] = await Promise.all([
    strapi.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: { updatedAt: "DESC" },
      populate: ["image"],
    }),
    strapi.db.query(ENTITY_UID).count({ where: filters }),
  ]);
  return wrapList(items, page, pageSize, total);
}

async findOneEntity(siteId: number, documentId: string) {
  const tenant = await strapi.db.query(ENTITY_UID).findOne({
    where: { site: siteId, documentId, deletedAt: null },
    populate: ["image"],
  });
  if (tenant) return tenant;
  return strapi.db.query(ENTITY_UID).findOne({
    where: { site: null, documentId, deletedAt: null },
    populate: ["image"],
  });
}
```

替换 `findRelations`（原 L107-130）：

```ts
async findRelations(siteId: number, query: any = {}) {
  const { where, page, pageSize } = parseListQuery(query, { siteId, defaultPageSize: 20 });
  // 兼容裸参数：subjectEntityId/predicate/objectEntityId/documentId
  const docId = where.documentId ?? query.documentId;
  const subjectEntityId = where.subjectEntityId ?? query.subjectEntityId;
  const predicate = where.predicate ?? query.predicate;
  const objectEntityId = where.objectEntityId ?? query.objectEntityId;
  const filters: any = {
    $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
  };
  if (docId) { filters.$or[0].documentId = docId; filters.$or[1].documentId = docId; }
  if (subjectEntityId) {
    const sid = await this._resolveEntityId(subjectEntityId);
    if (sid) { filters.$or[0].subjectEntity = sid; filters.$or[1].subjectEntity = sid; }
  }
  if (predicate) { filters.$or[0].predicate = predicate; filters.$or[1].predicate = predicate; }
  if (objectEntityId) {
    const oid = await this._resolveEntityId(objectEntityId);
    if (oid) { filters.$or[0].objectEntity = oid; filters.$or[1].objectEntity = oid; }
  }
  const [items, total] = await Promise.all([
    strapi.db.query(RELATION_UID).findMany({
      where: filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: { updatedAt: "DESC" },
      populate: ["subjectEntity", "objectEntity"],
    }),
    strapi.db.query(RELATION_UID).count({ where: filters }),
  ]);
  return wrapList(items, page, pageSize, total);
}
```

修改 `addRelation` 参数（原 L140-148）与 create data（原 L204-214）：

```ts
async addRelation(params: {
  siteId: number;
  subjectEntityId: string;
  predicate: string;
  objectEntityId?: string;
  objectValue?: any;
  objectText?: string;
  sourceType?: string;
  sourceUrl?: string;
}) {
  // ...原校验逻辑不变...
  return strapi.db.query(RELATION_UID).create({
    data: {
      site: params.siteId,
      subjectEntity: params.subjectEntityId,
      predicate: params.predicate,
      objectEntity: params.objectEntityId || null,
      objectValue: params.objectValue || null,
      objectText: params.objectText || null,
      sourceType: params.sourceType || "manual",
      sourceUrl: params.sourceUrl || null,
    },
  });
}
```

`updateRelation` 的 payload 追加（原 L270-271 附近，`verificationStatus` 之后）：

```ts
if (data.sourceUrl !== undefined) payload.sourceUrl = data.sourceUrl;
if (data.sourceType !== undefined) payload.sourceType = data.sourceType;
```

- [ ] **Step 4: 修改 controller 解包与 findEntity**

`controllers/admin-api/knowledge-graph.ts`：

```ts
async createEntity(ctx: any) {
  const body = ctx.request.body?.data ?? ctx.request.body;
  ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, body);
},
async updateEntity(ctx: any) {
  const body = ctx.request.body?.data ?? ctx.request.body;
  ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, body);
},
async findEntity(ctx: any) {
  const item = await strapi.plugin("zhao-website").service("knowledge-graph").findOneEntity(ctx.state.siteId, ctx.params.documentId);
  if (!item) return ctx.notFound();
  ctx.body = item;
},
```

- [ ] **Step 5: 跑测试验证通过**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/knowledge-graph"`
Expected: PASS（旧测试 + 新 5 个测试全绿）

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git commit -m "fix(zhao-website): knowledge-graph 契约修复（分页/搜索/解包/findEntity/sourceUrl）"
git push
```

---

### Task 3: first-truth 后端契约修复（TDD）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\first-truth.ts`
- Test: `e:\code\basic\plugins\zhao-website\tests\services\first-truth.test.ts`

- [ ] **Step 1: 写失败测试（追加）**

```ts
test("find 解析分页与 verificationStatus/claim 筛选，返回 { data, meta.pagination }", async () => {
  const queryMock = mockStrapi.db.query();
  queryMock.findMany.mockResolvedValue([{ documentId: "ft-1", claim: "X" }]);
  queryMock.count.mockResolvedValue(3);

  const result = await service.find(1, {
    pagination: { page: 1, pageSize: 10 },
    filters: { verificationStatus: "pending", claim: { $contains: "质量" } },
  });

  const where = queryMock.findMany.mock.calls[0][0].where;
  expect(where.$or[0].verificationStatus).toBe("pending");
  expect(where.$or[0].claim).toEqual({ $contains: "质量" });
  expect(result.meta.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 10, total: 3, pageCount: 1 }));
});
```

（如 `tests/services/first-truth.test.ts` 不存在该 describe 结构，先读文件确认 `service` 变量命名再追加）

- [ ] **Step 2: 跑测试验证失败**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/first-truth"`
Expected: FAIL（find 返回数组无 meta）

- [ ] **Step 3: 实现 first-truth.ts 修改**

文件头加 import：

```ts
import { parseListQuery, wrapList } from "./utils/query";
```

替换 `find`（原 L6-18）：

```ts
async find(siteId: number | null, query: any = {}) {
  const { where, page, pageSize } = parseListQuery(query, { siteId, defaultPageSize: 20 });
  const filters: any = {
    $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
  };
  for (const key of ["claimCategory", "verificationStatus", "claim"]) {
    if (where[key]) {
      filters.$or[0][key] = where[key];
      filters.$or[1][key] = where[key];
    }
  }
  const [items, total] = await Promise.all([
    strapi.db.query(UID).findMany({
      where: filters,
      orderBy: { priority: "DESC", updatedAt: "DESC" },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      populate: ["canonicalEntity"],
    }),
    strapi.db.query(UID).count({ where: filters }),
  ]);
  return wrapList(items, page, pageSize, total);
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/first-truth"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/first-truth.ts plugins/zhao-website/tests/services/first-truth.test.ts
git commit -m "fix(zhao-website): first-truth find 接入统一解析与分页"
git push
```

---

### Task 4: ai-content-summary 后端契约修复（TDD）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\ai-content-summary.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\admin-api\ai-content-summary.ts`
- Test: `e:\code\basic\plugins\zhao-website\tests\services\ai-content-summary.test.ts`

- [ ] **Step 1: 写失败测试（新建文件）**

```ts
import summaryFactory from "../../server/src/services/ai-content-summary";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("AI Content Summary Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = summaryFactory({ strapi: mockStrapi });
  });

  test("findAdmin 展开 filters 并分页", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValue([{ documentId: "s-1", targetType: "article" }]);
    queryMock.count.mockResolvedValue(12);

    const result = await service.findAdmin(1, {
      pagination: { page: 1, pageSize: 10 },
      filters: { targetType: "article", targetId: "abc" },
    });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, targetType: "article", targetId: "abc" }),
        limit: 10,
        offset: 0,
      })
    );
    expect(result.meta.pagination.total).toBe(12);
  });

  test("findAdmin 不把 filters 对象整体当字段", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValue([]);
    queryMock.count.mockResolvedValue(0);

    await service.findAdmin(1, { filters: { targetType: "article" } });

    const where = queryMock.findMany.mock.calls[0][0].where;
    expect(where.filters).toBeUndefined();
    expect(where.targetType).toBe("article");
  });

  test("findOne 按 documentId 查询", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValue({ documentId: "s-1", contentText: "text" });

    const result = await service.findOne(1, "s-1");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ site: 1, documentId: "s-1" }) })
    );
    expect(result.contentText).toBe("text");
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/ai-content-summary"`
Expected: FAIL（findAdmin 未展开、findOne 不存在）

- [ ] **Step 3: 实现 service 修改**

`services/ai-content-summary.ts` 头部加 import：

```ts
import { parseListQuery, wrapList } from "./utils/query";
```

替换 `findAdmin`（原 L17-24）：

```ts
async findAdmin(siteId: number, query: any = {}) {
  const { where, page, pageSize } = parseListQuery(query, { siteId, defaultPageSize: 20 });
  const filters: any = { site: siteId, deletedAt: null, ...where };
  const [items, total] = await Promise.all([
    strapi.db.query(UID).findMany({
      where: filters,
      orderBy: { updatedAt: "DESC" },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    strapi.db.query(UID).count({ where: filters }),
  ]);
  return wrapList(items, page, pageSize, total);
}

async findOne(siteId: number, documentId: string) {
  return strapi.db.query(UID).findOne({
    where: { site: siteId, documentId, deletedAt: null },
  });
}
```

（注意：ai-summary 的 site 为 required，不查 global 回退，与 `findAdmin` 原行为一致）

- [ ] **Step 4: 修改 controller 新增 findOne**

`controllers/admin-api/ai-content-summary.ts` 追加：

```ts
async findOne(ctx: any) {
  const item = await strapi.plugin("zhao-website").service("ai-content-summary").findOne(ctx.state.siteId, ctx.params.documentId);
  if (!item) return ctx.notFound();
  ctx.body = item;
},
```

- [ ] **Step 5: 跑测试验证通过**

Run: `cd e:\code\basic\plugins\zhao-website && npm test -- --testPathPatterns="tests/services/ai-content-summary"`
Expected: PASS（3 个测试全绿）

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/ai-content-summary.ts plugins/zhao-website/server/src/controllers/admin-api/ai-content-summary.ts plugins/zhao-website/tests/services/ai-content-summary.test.ts
git commit -m "fix(zhao-website): ai-content-summary findAdmin 修正与 findOne 新增"
git push
```

---

### Task 5: 路由修正（detail 路由 + 静态段前置）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\admin-api.ts`

**背景：** Strapi 5 content-api 路由按注册顺序匹配，`GET /first-truths/:documentId`（L100）在 `GET /first-truths/conflicts`（L105）、`GET /first-truths/export`（L106）之前注册，静态段会被通配参数抢先匹配 → 冲突 tab 与导出失效。`GET /brand-voices/:documentId`（L114）同样先于 `GET /brand-voices/by-category/:category`（L119）。另需新增两个 detail 路由。

- [ ] **Step 1: 新增 detail 路由**

在 L88（`DELETE /knowledge-graph/entities/:documentId`）之后插入：

```ts
channelScopeRoute("GET", "/knowledge-graph/entities/:documentId", "knowledge-graph.findEntity", "knowledge-entity.read"),
```

在 L124（`GET /ai-summaries`）之后插入：

```ts
channelScopeRoute("GET", "/ai-summaries/:documentId", "ai-content-summary.findOne", "ai-summary.read"),
```

- [ ] **Step 2: first-truths 静态段前置**

把 L105-106 两行：

```ts
channelScopeRoute("GET", "/first-truths/conflicts", "first-truth.conflicts", "first-truth.read"),
channelScopeRoute("GET", "/first-truths/export", "first-truth.exportFacts", "first-truth.read"),
```

移到 L100（`GET /first-truths/:documentId`）**之前**（即 L99 `GET /first-truths` 之后、L100 之前）。

- [ ] **Step 3: brand-voices 静态段前置**

把 L119：

```ts
channelScopeRoute("GET", "/brand-voices/by-category/:category", "brand-voice.listByCategory", "brand-voice.read"),
```

移到 L114（`GET /brand-voices/:documentId`）**之前**（即 L113 `GET /brand-voices` 之后、L114 之前）。

- [ ] **Step 4: 类型检查**

Run: `cd e:\code\basic && npx tsc -p plugins/zhao-website/tsconfig.server.json --noEmit`
Expected: 无错误（或仅既有错误，不新增）

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/routes/admin-api.ts
git commit -m "fix(zhao-website): 路由修正（entities/ai-summaries detail + conflicts/export/by-category 静态段前置）"
git push
```

---

### Task 6: knowledge-entity schema 新增 aliases

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\knowledge-entity\schema.json`

- [ ] **Step 1: 加 aliases 字段**

在 `"properties"`（L75-77，`{"type": "json"}`）之后、`"refTargetType"`（L78）之前插入：

```json
"aliases": {
  "type": "json",
  "default": []
},
```

- [ ] **Step 2: 验证 JSON 合法**

Run: `cd e:\code\basic && node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json
git commit -m "feat(zhao-website): knowledge-entity 新增 aliases 字段"
git push
```

---

### Task 7: generic service 接入统一解析（A 组：product/case/compliance/faq/tutorial/download）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\product.ts`（findAdmin，原 L74-107）
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\case.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\compliance.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\faq.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\tutorial.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\download.ts`

**统一改造模板**（每个 service 的 findAdmin 按此模式，保留原 populate/orderBy/业务特殊筛选）：

```ts
async findAdmin(siteId: number, query: any = {}) {
  // —— 按各 service 实际筛选参数配置 ignoreKeys（关联/特殊处理字段不进 where）——
  const { where, page, pageSize, filters } = parseListQuery(query, { siteId, defaultPageSize: 20, ignoreKeys: ["category", "tagGroup"] });
  const f: any = { site: siteId, deletedAt: null, ...where };
  // —— 业务特殊筛选保留原逻辑（示例）——
  const category = filters.category ?? query.category;
  if (category) f.category = await resolveCategoryFilter(strapi, siteId, category);
  // tagGroup knex 逻辑原样保留（用 filters.tagGroup ?? query.tagGroup 取值）...
  const [items, total] = await Promise.all([
    strapi.db.query(UID).findMany({ where: f, limit: pageSize, offset: (page - 1) * pageSize, orderBy: { updatedAt: "DESC" }, populate: /* 原样保留 */ }),
    strapi.db.query(UID).count({ where: f }),
  ]);
  return wrapList(items, page, pageSize, total);
}
```

- [ ] **Step 1: 改造 product.findAdmin**

product.ts 头部加 `import { parseListQuery, wrapList } from "./utils/query";`。按模板改 `findAdmin`：
- ignoreKeys: `["category", "tagGroup"]`
- `filters.category ?? query.category`、`filters.tagGroup ?? query.tagGroup` 分别喂给原 resolveCategoryFilter / tagGroup knex 逻辑
- 保留原 populate `{ coverImage: true, category: true, tags: { populate: { tagGroup: true } } }`
- 返回值改为 `wrapList(items, page, pageSize, total)`

- [ ] **Step 2: 逐个改造 case/compliance/faq/tutorial/download**

对每个 service：
1. 读该文件 `findAdmin`，确认筛选参数名（status/category/isFeatured 等）与特殊逻辑
2. 头部加 import；按模板改：裸参数 `status` 等自动被 `parseListQuery` 兼容进入 where（保留原 `filters` 写法亦可）；`category` 等关联字段加进 ignoreKeys 并保留原 resolveCategoryFilter 逻辑
3. 返回值改 `wrapList`

**差异提示**（各 service 实现时以实际文件为准）：
- case/compliance/tutorial：与 product 同构，均有 `category`（关联）与 `status`
- faq：可能有 `tagGroup`/`category`；populate 含 `mainEntity`/`mentionedEntities`（以实际文件为准）
- download：结构最简单，可能仅 status/name 筛选，无关联字段（ignoreKeys 可空）

- [ ] **Step 3: 类型检查**

Run: `cd e:\code\basic && npx tsc -p plugins/zhao-website/tsconfig.server.json --noEmit`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/product.ts plugins/zhao-website/server/src/services/case.ts plugins/zhao-website/server/src/services/compliance.ts plugins/zhao-website/server/src/services/faq.ts plugins/zhao-website/server/src/services/tutorial.ts plugins/zhao-website/server/src/services/download.ts
git commit -m "fix(zhao-website): 内容型 generic service 接入统一分页/筛选解析"
git push
```

---

### Task 8: generic service 接入统一解析（B 组：article-category/author/lead/visit-log/interaction/search-log/brand-voice）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\article-category.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\author.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\lead.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\visit-log.ts`（findAdmin，原 L27-39）
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\interaction.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\search-log.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\brand-voice.ts`

- [ ] **Step 1: 改造 visit-log.findAdmin（参照样例）**

```ts
async findAdmin(siteId: number, query: any = {}) {
  const { where, page, pageSize } = parseListQuery(query, { siteId, defaultPageSize: 20 });
  const filters: any = { site: siteId, deletedAt: null, ...where };
  const [items, total] = await Promise.all([
    strapi.db.query(UID).findMany({ where: filters, limit: pageSize, offset: (page - 1) * pageSize, orderBy: { createdAt: "DESC" } }),
    strapi.db.query(UID).count({ where: filters }),
  ]);
  return wrapList(items, page, pageSize, total);
}
```
（`type`/`targetType`/`targetId` 裸参数由 parseListQuery 自动兼容）

- [ ] **Step 2: 逐个改造其余 6 个**

对每个 service：读 `findAdmin` → 按模板改（纯裸参数型直接套 visit-log 模式；article-category/author 可能有 name 搜索与关联；lead 有 status；interaction/search-log 同 visit-log 日志型；brand-voice 有 category/status，category 加 ignoreKeys 保留原逻辑）→ 头部加 import → 返回改 wrapList。

- [ ] **Step 3: 类型检查**

Run: `cd e:\code\basic && npx tsc -p plugins/zhao-website/tsconfig.server.json --noEmit`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/services/article-category.ts plugins/zhao-website/server/src/services/author.ts plugins/zhao-website/server/src/services/lead.ts plugins/zhao-website/server/src/services/visit-log.ts plugins/zhao-website/server/src/services/interaction.ts plugins/zhao-website/server/src/services/search-log.ts plugins/zhao-website/server/src/services/brand-voice.ts
git commit -m "fix(zhao-website): 结构/日志型 generic service 接入统一分页/筛选解析"
git push
```

---

### Task 9: 前端 api 层 + knowledge-entity 两页

**Files:**
- Modify: `e:\code\web\src\api\website.js`（knowledgeGraphApi，L72-82）
- Modify: `e:\code\web\src\pages\website\knowledge-entity\edit.vue`
- Modify: `e:\code\web\src\pages\website\knowledge-entity\list.vue`

- [ ] **Step 1: api 补 detail 方法**

`knowledgeGraphApi` 内（listEntities 后）加：

```js
detail: (documentId) => get(`${ADMIN_BASE}/knowledge-graph/entities/${documentId}`).then(extractItem),
```

- [ ] **Step 2: edit.vue 字段对齐**

1. `typeOptions`（L59）替换为 18 种 schema.org：

```js
const typeOptions = ['Organization', 'Person', 'Product', 'Service', 'Place', 'Event', 'CreativeWork', 'Article', 'CaseStudy', 'Offer', 'Review', 'FAQ', 'HowTo', 'BreadcrumbList', 'Brand', 'ContactPoint', 'QuantitativeValue', 'DefinedTerm']
```

2. 表单字段 `type` → `entityType`（L13 picker 绑定、L63 form 定义、L103-106 loadDetail 赋值、L113 payload 展开处），保持 aliases 提交为数组：

```js
const form = ref({ name: '', entityType: '', aliases: [], description: '', sameAs: '', properties: '' })
```

3. `loadDetail`（L96-109）改用 detail 接口：

```js
async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await knowledgeGraphApi.detail(documentId.value)
    if (item) {
      const toString = (v) => typeof v === 'string' ? v : JSON.stringify(v || '', null, 2)
      form.value = {
        name: item.name || '', entityType: item.entityType || '', aliases: item.aliases || [], description: item.description || '',
        sameAs: toString(item.sameAs), properties: toString(item.properties),
      }
      aliasesInput.value = Array.isArray(item.aliases) ? item.aliases.join(',') : (item.aliases || '')
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}
```

4. 模板 L13 picker 绑定改 `form.entityType`；L14 显示改 `form.entityType`。

- [ ] **Step 3: list.vue 展示对齐**

模板 L19：`<text class="meta-item">🏷️ {{ item.type || '-' }}</text>` → `{{ item.entityType || '-' }}`

- [ ] **Step 4: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功，无语法错误（web 目录铁律：禁止升级 vue、禁止新增依赖，本次纯代码修改）

- [ ] **Step 5: Commit（web 仓库）**

```bash
cd e:\code\web
git add src/api/website.js src/pages/website/knowledge-entity/edit.vue src/pages/website/knowledge-entity/list.vue
git commit -m "fix(web): 知识实体页契约对齐（entityType/aliases/detail 接口）"
git push
```

---

### Task 10: 前端 knowledge-relation 两页

**Files:**
- Modify: `e:\code\web\src\pages\website\knowledge-relation\list.vue`
- Modify: `e:\code\web\src\pages\website\knowledge-relation\edit.vue`

- [ ] **Step 1: list.vue 主客体名称 + 置信度/状态展示**

模板 L10 替换：

```html
<view class="item-title">{{ subjectLabel(item) }} → {{ item.predicate }} → {{ objectLabel(item) }}</view>
```

script 加辅助函数：

```js
function subjectLabel(item) {
  return item.subjectEntity?.name || item.subject_id || item.subjectEntityId || '(未命名)'
}
function objectLabel(item) {
  return item.objectEntity?.name || item.objectValue ?? item.objectText || item.object_id || item.objectEntityId || '(未指定)'
}
```

模板 L11 item-footer 后加（状态徽标与置信度，插入在 L11-12 之间）：

```html
<view class="item-meta">
  <text class="meta-item" v-if="item.confidence != null">置信度: {{ (Number(item.confidence) * 100).toFixed(0) }}%</text>
  <text class="meta-item" v-if="item.verificationStatus">{{ getStatusText(item.verificationStatus) }}</text>
</view>
```

script 加：

```js
const statusMap = { verified: '已验证', pending: '待验证', outdated: '已过时', conflict: '冲突' }
function getStatusText(s) { return statusMap[s] || s }
```

（沿用该页已有 `.item-meta`/`.meta-item` 样式）

- [ ] **Step 2: edit.vue 补可选字段**

读当前 edit.vue（提交字段为 `subjectEntityId/predicate/objectEntityId`），在表单区追加可选字段：`sourceUrl`（input）、`sourceType`（picker：official/derived/manual/inferred）、`confidence`（digit 0-1）、`verificationStatus`（picker：verified/pending/outdated/conflict）。loadDetail 用 `knowledgeGraphApi.listRelations({ 'filters[documentId]': documentId }).then(res => res.list?.[0])`（后端 findRelations 已支持）；提交 payload 在 `{...form}` 基础上补 `confidence: form.confidence ? Number(form.confidence) : undefined`（`confidence` 为空时置 undefined 不提交）。

- [ ] **Step 3: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功

- [ ] **Step 4: Commit（web 仓库）**

```bash
cd e:\code\web
git add src/pages/website/knowledge-relation/list.vue src/pages/website/knowledge-relation/edit.vue
git commit -m "fix(web): 知识关系页展示对齐与可选字段补充"
git push
```

---

### Task 11: 前端 first-truth 两页

**Files:**
- Modify: `e:\code\web\src\pages\website\first-truth\list.vue`
- Modify: `e:\code\web\src\pages\website\first-truth\edit.vue`

- [ ] **Step 1: list.vue 字段对齐**

模板 L19-21 替换：

```html
<text class="meta-item">💎 {{ item.canonicalValue }}</text>
<text class="meta-item" v-if="item.priority != null">优先级: {{ item.priority }}</text>
<text class="meta-item" v-if="item.canonicalSourceUrl">来源: {{ item.canonicalSourceUrl }}</text>
```

状态徽标与验证按钮（L24、L29）改用 `verificationStatus`：

```html
<view class="item-status" :class="item.verificationStatus">{{ getStatusText(item.verificationStatus) }}</view>
```

```html
<view v-if="item.verificationStatus !== 'verified' && hasPermission('first-truth.update')" class="action-btn verify" @click.stop="handleVerify(item)">验证</view>
```

statusMap 补 `outdated`：

```js
const statusMap = { verified: '已验证', pending: '待验证', outdated: '已过时', conflict: '冲突' }
```

conflicts tab 数据渲染：`firstTruthApi.conflicts()` 返回 `[{ claimKey, severity, values: [{value, sourceUrl, sourceType}] }]`（数组），当前 `itemList.value = list` 直接渲染——列表模板字段对不上（conflicts 无 claim/documentId）。在 `loadData` 的 conflicts 分支把结构映射为列表行：

```js
if (tab.value === 'conflicts') {
  const res = await firstTruthApi.conflicts()
  const list = res.list || []
  itemList.value = list.map(c => ({
    documentId: c.claimKey,
    claim: `冲突声明: ${c.claimKey}`,
    canonicalValue: (c.values || []).map(v => v.value).join(' | '),
    verificationStatus: 'conflict',
    canonicalSourceUrl: (c.values || []).map(v => v.sourceUrl).filter(Boolean).join(' | '),
  }))
  pagination.value = { page: 1, pageSize: 10, total: itemList.value.length }
  currentPage.value = 1
}
```

- [ ] **Step 2: edit.vue 字段对齐**

1. 表单字段（L48）：

```js
const form = ref({ claim: '', claimKey: '', canonicalValue: '', canonicalSourceUrl: '', canonicalValueType: 'text', claimCategory: 'brand_claim', priority: 100, verificationStatus: 'pending' })
```

2. 模板字段：`truth_value` → `canonicalValue`（L11 与 L65 校验）、`source` → `canonicalSourceUrl`（L12）；移除 `confidence` 项（L13-16）；状态 picker 绑 `verificationStatus`（L19-21，options 补 `outdated`）。

3. 新增表单项（claimCategory picker：business_license/brand_claim/technical_spec/certification/financial/logistics_promise/other；priority digit 输入），追加在状态项之后：

```html
<view class="form-item">
  <text class="form-label">声明分类</text>
  <picker mode="selector" :range="categoryOptions" @change="(e) => form.claimCategory = categoryOptions[e.detail.value]">
    <view class="form-input picker-display">{{ form.claimCategory || '请选择' }}</view>
  </picker>
</view>
<view class="form-item"><text class="form-label">优先级</text><input type="number" v-model="form.priority" placeholder="默认 100" class="form-input" /></view>
```

script 加：

```js
const categoryOptions = ['business_license', 'brand_claim', 'technical_spec', 'certification', 'financial', 'logistics_promise', 'other']
const statusOptions = [
  { label: '待验证', value: 'pending' },
  { label: '已验证', value: 'verified' },
  { label: '已过时', value: 'outdated' },
  { label: '冲突', value: 'conflict' },
]
```

4. `loadDetail`（L50-62）字段对齐（canonicalValue/canonicalSourceUrl/verificationStatus/claimCategory/priority/claimKey）并回填表单。

5. `handleSubmit`（L64-73）：payload 展开后 `priority: Number(form.value.priority) || 100`；**移除 confidence**；claimKey 为空时后端 create 会因缺 claimKey 报错——提交前自动生成：

```js
const payload = { ...form.value, priority: Number(form.value.priority) || 100 }
if (!payload.claimKey) payload.claimKey = payload.claim.slice(0, 50)
```

- [ ] **Step 3: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功

- [ ] **Step 4: Commit（web 仓库）**

```bash
cd e:\code\web
git add src/pages/website/first-truth/list.vue src/pages/website/first-truth/edit.vue
git commit -m "fix(web): 第一真值页契约对齐（canonicalValue/verificationStatus/冲突渲染）"
git push
```

---

### Task 12: 前端 ai-summary 两页

**Files:**
- Modify: `e:\code\web\src\pages\website\ai-summary\list.vue`
- Modify: `e:\code\web\src\pages\website\ai-summary\edit.vue`

- [ ] **Step 1: list.vue 字段对齐**

模板 L17 替换：

```html
<view class="item-title">{{ item.contentText?.slice(0, 80) || (item.content ? JSON.stringify(item.content).slice(0, 80) : '') || '(无摘要)' }}{{ (item.contentText?.length || 0) > 80 ? '...' : '' }}</view>
```

模板 L21 替换：

```html
<text class="meta-item" v-if="item.verificationStatus">状态: {{ getStatusText(item.verificationStatus) }}</text>
```

script 加：

```js
const statusMap = { verified: '已验证', pending: '待验证', outdated: '已过时', conflict: '冲突' }
function getStatusText(s) { return statusMap[s] || s }
```

（targetType 筛选项 `['article','case','product','faq','tutorial','compliance']` 与后端 `targetType` 自由 string 字段一致，无需改）

- [ ] **Step 2: edit.vue 字段对齐**

模板 L13：`{{ form.status || '-' }}` → `{{ form.verificationStatus || '-' }}`
script L34：`form = ref({ targetType: '', targetId: '', summary: '', status: '' })` → `form = ref({ targetType: '', targetId: '', contentText: '', verificationStatus: '' })`
L41-44 loadDetail 赋值：

```js
form.value = {
  targetType: item.targetType || '', targetId: item.targetId || '',
  contentText: item.contentText || (item.content ? JSON.stringify(item.content) : ''), verificationStatus: item.verificationStatus || '',
}
```

模板 L17 显示 `form.summary` → `form.contentText`。

- [ ] **Step 3: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功

- [ ] **Step 4: Commit（web 仓库）**

```bash
cd e:\code\web
git add src/pages/website/ai-summary/list.vue src/pages/website/ai-summary/edit.vue
git commit -m "fix(web): AI 摘要页契约对齐（contentText/verificationStatus）"
git push
```

---

### Task 13: 后端构建与部署（basic → joho）

**Files:**
- 无（构建产物 `plugins/zhao-website/dist`）

- [ ] **Step 1: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-website && npm run build`
Expected: 构建成功

- [ ] **Step 2: 部署前自检（dist 含新契约关键字）**

```powershell
Select-String -Path e:\code\basic\plugins\zhao-website\dist\server\*.js -Pattern "parseListQuery|findOneEntity|ai-content-summary.findOne" -List | ForEach-Object { $_.Filename }
```
Expected: `query.js`、`knowledge-graph.js`、`ai-content-summary.js` 命中；无命中 = dist 未重建，回到 Step 1

- [ ] **Step 3: Commit dist**

```bash
cd e:\code\basic
git add plugins/zhao-website/dist
git commit -m "build(zhao-website): 重建 dist（契约修复）"
git push
```

- [ ] **Step 4: 部署 joho**

在 joho 上拉取并重启（本地执行远程命令，按既有 deploy 流程；node 路径 `/home/admin/.nvm/versions/node/v22.23.1/bin`，PM2 用户 admin）。若本仓库有 `deploy.sh` 走脚本，否则手动：

```bash
# 远程（joho, user admin）
cd /path/to/basic && git pull && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH && export PM2_HOME=/home/admin/.pm2 && pm2 restart strapi
```

- [ ] **Step 5: 确认 Strapi 启动成功、schema 同步（aliases 列自动创建）**

```bash
# 远程
pm2 logs strapi --lines 50 --nostream
```
Expected: 无 ERROR，启动完成；schema 同步无报错

---

### Task 14: 前端构建与部署（web → h.joho.cn）

**Files:**
- 无（构建产物）

- [ ] **Step 1: 构建**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功（产物 `dist/build/h5`）

- [ ] **Step 2: 部署到 h.joho.cn**

将 H5 构建产物上传至 `/www/sites/h.joho.cn/index/`（**实际部署域名 h.joho.cn；DEPLOYMENT.md 中 admin.joho.cn 已过时**）。上传方式沿用既有流程（scp/rsync 或 1Panel/OpenResty 目录）。

- [ ] **Step 3: 验证首页可访问**

WebFetch/浏览器访问 `https://h.joho.cn/`，确认管理端加载正常、无白屏。

---

### Task 15: 全链路验证

**Files:**
- 无

- [ ] **Step 1: 本地/生产 curl 验证后端接口**

带管理端认证 token 逐一验证（路径前缀 `/api/zhao-website/v1/admin`；未登录访问应 401/403 而非 404）：

```bash
# 实体：分页 + 搜索 + detail + 创建（aliases）
curl "<host>/api/zhao-website/v1/admin/knowledge-graph/entities?pagination[page]=2&pagination[pageSize]=5" -H "Authorization: Bearer <token>"
curl "<host>/api/zhao-website/v1/admin/knowledge-graph/entities?filters[name][\$contains]=测试" -H "Authorization: Bearer <token>"
curl "<host>/api/zhao-website/v1/admin/knowledge-graph/entities/<documentId>" -H "Authorization: Bearer <token>"
curl -X POST "<host>/api/zhao-website/v1/admin/knowledge-graph/entities" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"data":{"name":"测试实体","entityType":"Organization","aliases":["测试","别名"]}}'
# 真值：分页 + conflicts 路由（关键：必须返回数组而非 findOne('conflicts') 的 404/null）
curl "<host>/api/zhao-website/v1/admin/first-truths?pagination[page]=1&pagination[pageSize]=10" -H "Authorization: Bearer <token>"
curl "<host>/api/zhao-website/v1/admin/first-truths/conflicts" -H "Authorization: Bearer <token>"
# AI 摘要：筛选 + detail
curl "<host>/api/zhao-website/v1/admin/ai-summaries?filters[targetType]=article" -H "Authorization: Bearer <token>"
curl "<host>/api/zhao-website/v1/admin/ai-summaries/<documentId>" -H "Authorization: Bearer <token>"
```
Expected: 分页 meta 正确、搜索命中、detail 200、创建成功且 aliases 入库、conflicts 返回数组、筛选生效、detail 200

- [ ] **Step 2: 管理端四页面人工验证**

浏览器访问 h.joho.cn 管理端：
1. 知识实体：列表翻页（total>10 时出现分页控件）、名称搜索命中、新增实体（类型选 Organization、别名逗号分隔）保存成功、编辑回显别名
2. 知识关系：主客体显示名称、置信度/状态徽标、编辑保存
3. 第一真值：列表显示 canonicalValue/优先级/来源、状态徽标正确、验证按钮只在非 verified 显示、**冲突 tab 加载出数据**、新增/编辑保存成功
4. AI 摘要：摘要文本显示、状态徽标、筛选生效、详情页加载成功

- [ ] **Step 3: 顺带抽查通用模块**

管理端抽查 product/case 列表：分页控件出现、status 筛选生效（`filters[status]`）。

- [ ] **Step 4: 回归 C 端知识图谱**

C 端访问实体页/知识图谱展示（exportGraph/exportEntity/exportFacts 接口），确认 JSON-LD 与实体页不受影响。

- [ ] **Step 5: 清理验证用测试数据**

删除 Step 1 创建的名含「测试实体」的验证数据（软删除接口 DELETE）。

---

## Self-Review 记录

**Spec 覆盖：**
- 统一查询工具 → Task 1
- knowledge-graph 契约（分页/搜索/findEntity/解包/sourceUrl）→ Task 2
- first-truth find 分页 → Task 3
- ai-content-summary findAdmin 修正 + findOne → Task 4
- detail 路由 + 静态段前置（first-truths conflicts/export、brand-voices by-category）→ Task 5
- schema aliases → Task 6
- generic 12 service 接入 → Task 7（A 组 6 个）+ Task 8（B 组 7 个）
- 前端 api + 4 模块页面 → Task 9-12
- 部署（basic dist + joho；web + h.joho.cn）→ Task 13-14
- 验证清单（含 401/403、conflicts 路由、$or 双匹配、h.joho.cn 域名）→ Task 15
- 范围外项（C 端展示优化/AI 生成/brand-voices 行为变更/体验增强）→ 未建任务（有意排除）

**类型一致性：** `parseListQuery` 返回 `{ where, page, pageSize, filters }` 与 `wrapList(items, page, pageSize, total)` 签名在 Task 1 定义，Task 2-8 引用一致；`findOneEntity(siteId, documentId)`、`findOne(siteId, documentId)` 命名在 Task 2/4 定义，Task 5 路由 handler 引用一致；前端 `knowledgeGraphApi.detail` 在 Task 9 定义，Task 9 edit.vue 使用一致。

**占位符扫描：** 无 TBD/TODO；所有代码步骤含完整代码；Task 7/8 对 13 个同构 service 采用「统一模板 + 差异提示」，模板为完整可复制代码，差异点精确到参数名（各 service 文件内 findAdmin 结构以实际为准，步骤中明确「读文件确认」）。
