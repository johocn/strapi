# GEO 文章后台发布接口补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 zhao-website 插件三处后台 admin 接口缺口（geo-article CRUD、author CRUD、knowledge-relation PUT），使《GEO文章发布全流程手册》主链路可经后台 API 完成（脱离 SQL 直插）。

**Architecture:** 沿用手册发布链路依赖关系——分类（article-category-admin）、标签（zhao-tag）、审核账号（Strapi admin）、知识实体（knowledge-graph entities CRUD）、真值（first-truths CRUD）已有现成接口，仅需补三处缺口。geo-article 管理端 service 仿 `services/article.ts` 模式，author 复用 `createGenericController` 免建 controller 文件，关系入参统一做数字 id 宽容解析（防 PG integer 500），发布门禁补 `beforeCreate` 钩子封堵「创建即发布」旁路。

**Tech Stack:** Strapi v5（`strapi.db.query` 实体服务）、zhao-auth 权限策略（channelScopeRoute）、TypeScript、PowerShell（构建/验证）、PostgreSQL（lnk 关联表由 Strapi 自动写入）。

**Spec:** `docs/superpowers/specs/2026-09-07-geo-article-admin-api-design.md`（已审阅，无遗漏、无卡点）

**实现前置说明（相对 spec 的落地点修正）：**

1. author 路由 handler 使用 `author-admin.*`（走 generic 注册映射为 `author-admin` 键），**不是** spec 3.2 表格中的 `author.find`——与现有 `article-category-admin.*` 模式一致。
2. geo-article 路由顺序仿 article 模块：find → findOne → create → update → softDelete → publish → archive → batch。
3. zhao-auth `permissions.ts` 改动同样需要重建 zhao-auth 的 dist（插件加载的是 dist）。

***

## File Structure

| 文件                                                                           | 动作 | 职责                                                                                                |
| ---------------------------------------------------------------------------- | -- | ------------------------------------------------------------------------------------------------- |
| `plugins/zhao-website/server/src/services/geo-article.ts`                    | 修改 | 新增 findAdmin/findOneAdmin/create/update/softDelete/publish/archive/batch + 关系 id 宽容解析 + locale 注入 |
| `plugins/zhao-website/server/src/controllers/admin-api/geo-article-admin.ts` | 新建 | 薄控制器，转发到 geo-article service                                                                      |
| `plugins/zhao-website/server/src/routes/admin-api.ts`                        | 修改 | 新增 geo-article 9 条 + author 5 条 + relation PUT 1 条路由                                              |
| `plugins/zhao-website/server/src/controllers/index.ts`                       | 修改 | 注册 `geoArticleAdmin`（author 由 generic 自动映射，无需单独注册）                                                |
| `plugins/zhao-website/server/src/services/author.ts`                         | 新建 | findAdmin/findOneAdmin/create/update/softDelete（site 绑定）                                          |
| `plugins/zhao-website/server/src/controllers/admin-api/generic.ts`           | 修改 | 追加 `author: createGenericController("author")`                                                    |
| `plugins/zhao-website/server/src/services/knowledge-graph.ts`                | 修改 | 新增 updateRelation（按 documentId 更新，校验 site 归属）                                                     |
| `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`   | 修改 | 追加 updateRelation handler                                                                         |
| `plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts`    | 修改 | 抽取 assertAuditPass + 新增 beforeCreate 门禁                                                           |
| `plugins/zhao-auth/server/src/permissions.ts`                                | 修改 | 注册 `menu.website-author` + author.\* 四权限 + 默认授权列表                                                 |

> 代码仓根目录为 `e:\code\basic`；所有 git 命令在其中执行。已存在内容类型/参考实现：`content-types/author/schema.json`（name/slug/position/bio/avatar/experienceYears/sameAs/status/deletedAt，site 必填）、`content-types/knowledge-relation/schema.json`（predicate/objectEntity/objectValue/objectText/sourceType/confidence/verificationStatus/status/deletedAt）、`services/article.ts`（管理端模式参照）、`services/utils/geo-article-audit.ts`（auditGeoArticle 纯函数，truthBasis/mentionedEntities 只判非空数组、author 只判 truthy）。

***

### Task 1: geo-article service 管理端方法

**Files:**

- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\geo-article.ts`（文件顶部 import 区 + 文件底部追加方法）

- [ ] **Step 1: 修改文件头，引入 slug 工具并追加常量与辅助函数**

在 `import type { Core } from "@strapi/strapi";` 之后追加：

```ts
import { generateUniqueSlug } from "./utils/slug";

const UID = "plugin::zhao-website.geo-article";
const MANY_TO_ONE = ["author", "editor", "reviewer", "category"];
const MANY_TO_MANY = ["tags", "truthBasis", "mentionedEntities"];
const ADMIN_POPULATE = ["author", "editor", "reviewer", "category", "tags", "truthBasis", "mentionedEntities", "coverImage"];

function badRequest(msg: string) {
  const e: any = new Error(msg);
  e.status = 400;
  return e;
}

function notFound(msg = "GeoArticle not found") {
  const e: any = new Error(msg);
  e.status = 404;
  return e;
}

/** 关系入参宽容解析：manyToOne 收数字/数字字符串标量，manyToMany 收数字 id 数组；非法值 400 而非 500 */
function coerceRelationIds(data: any): any {
  const out = { ...data };
  for (const f of MANY_TO_ONE) {
    if (out[f] === undefined || out[f] === null || out[f] === "") continue;
    const n = Number(out[f]);
    if (!Number.isInteger(n)) throw badRequest(`关系字段 ${f} 必须为数字 id`);
    out[f] = n;
  }
  for (const f of MANY_TO_MANY) {
    if (out[f] === undefined || out[f] === null) continue;
    const arr = Array.isArray(out[f]) ? out[f] : [out[f]];
    out[f] = arr.map((v: any) => {
      const n = Number(v);
      if (!Number.isInteger(n)) throw badRequest(`关系字段 ${f} 必须为数字 id 数组`);
      return n;
    });
  }
  return out;
}
```

注意：文件底部现有 `findFeatured` 方法后没有 export 结束符问题——该文件是 `export default ({ strapi }) => ({...})` 对象字面量，在 `findFeatured` 的 `},` 之后追加新方法。

- [ ] **Step 2: 在** **`findFeatured`** **方法后追加管理端方法**

```ts
  // ===== 管理端 =====
  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, type, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (q) filters.title = { $containsi: q };
    const items = await strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ADMIN_POPULATE,
    });
    const total = await strapi.db.query(UID).count({ where: filters });
    return {
      results: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) } },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ADMIN_POPULATE,
    });
  },

  async create(siteId: number, data: any) {
    // slug 未传时按标题生成唯一 slug；locale 未传时注入 zh-CN（防 locale=NULL 前端页不生成）
    const slug = data.slug || (await generateUniqueSlug(strapi, UID, siteId, data.title || "untitled"));
    // 双层防护第 1 层：创建阶段强制非 published（published 只能经 publish 端点触发门禁）
    const status = data.status && data.status !== "published" ? data.status : "draft";
    const payload = coerceRelationIds({ ...data, site: siteId, slug, status, locale: data.locale || "zh-CN" });
    return strapi.db.query(UID).create({ data: payload });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw notFound();
    // status 变更（转 published）由 lifecycle beforeUpdate 门禁拦截
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: coerceRelationIds(data),
    });
  },

  async publish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: "published" });
  },

  async archive(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: "archived" });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  async batch(siteId: number, body: any = {}) {
    const { action, documentIds } = body;
    if (!["publish", "archive", "delete"].includes(action) || !Array.isArray(documentIds)) {
      const e: any = new Error("batch 参数错误：action ∈ publish/archive/delete，documentIds 为数组");
      e.status = 400;
      throw e;
    }
    const results: any[] = [];
    for (const documentId of documentIds) {
      try {
        if (action === "publish") await this.publish(siteId, documentId);
        else if (action === "archive") await this.archive(siteId, documentId);
        else await this.softDelete(siteId, documentId);
        results.push({ documentId, ok: true });
      } catch (err: any) {
        results.push({ documentId, ok: false, error: err.message });
      }
    }
    return { results };
  },
```

- [ ] **Step 3: 语法自检**

Run: `npx tsc --noEmit --skipLibCheck plugins/zhao-website/server/src/services/geo-article.ts`（在 `e:\code\basic` 下）
Expected: 无 geo-article.ts 相关报错（项目整体若有存量类型告警可忽略非本文件报错）

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/geo-article.ts
git commit -m "feat(zhao-website): add geo-article admin service methods"
```

***

### Task 2: geo-article-admin 控制器 + 路由 + controllers 注册

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\controllers\admin-api\geo-article-admin.ts`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\admin-api.ts`（在 `POST /geo-articles/:documentId/audit-check` 之前插入 9 条）

- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\index.ts`

- [ ] **Step 1: 新建控制器文件**

```ts
export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").findAdmin(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx: any) {
    const item = await strapi.plugin("zhao-website").service("geo-article").findOneAdmin(ctx.state.siteId, ctx.params.documentId);
    if (!item) return ctx.notFound();
    ctx.body = item;
  },
  async create(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").create(ctx.state.siteId, ctx.request.body);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async softDelete(ctx: any) {
    await strapi.plugin("zhao-website").service("geo-article").softDelete(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  async publish(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").publish(ctx.state.siteId, ctx.params.documentId);
  },
  async archive(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").archive(ctx.state.siteId, ctx.params.documentId);
  },
  async batch(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").batch(ctx.state.siteId, ctx.request.body);
  },
};
```

- [ ] **Step 2: 在** **`routes/admin-api.ts`** **的 audit-check 行之前插入 geo-article 路由**

在 `channelScopeRoute("POST", "/geo-articles/:documentId/audit-check", "geo-article-audit.check", "article.read"),` 之前插入：

```ts
    channelScopeRoute("GET", "/geo-articles", "geoArticleAdmin.find", "article.read"),
    channelScopeRoute("GET", "/geo-articles/:documentId", "geoArticleAdmin.findOne", "article.read"),
    channelScopeRoute("POST", "/geo-articles", "geoArticleAdmin.create", "article.create"),
    channelScopeRoute("PUT", "/geo-articles/:documentId", "geoArticleAdmin.update", "article.update"),
    channelScopeRoute("DELETE", "/geo-articles/:documentId", "geoArticleAdmin.softDelete", "article.update"),
    channelScopeRoute("POST", "/geo-articles/:documentId/publish", "geoArticleAdmin.publish", "article.publish"),
    channelScopeRoute("POST", "/geo-articles/:documentId/archive", "geoArticleAdmin.archive", "article.publish"),
    channelScopeRoute("POST", "/geo-articles/batch", "geoArticleAdmin.batch", "article.publish"),
```

- [ ] **Step 3: 在** **`controllers/index.ts`** **注册（铁律：漏注册 = Strapi 启动循环崩溃）**

在 import 区追加 `import geoArticleAdmin from "./admin-api/geo-article-admin";`，并在 export default 中追加键 `"geoArticleAdmin": geoArticleAdmin`（放在 `"geo-article-audit": geoArticleAudit` 附近即可）。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/controllers/admin-api/geo-article-admin.ts plugins/zhao-website/server/src/routes/admin-api.ts plugins/zhao-website/server/src/controllers/index.ts
git commit -m "feat(zhao-website): add geo-article admin controller and routes"
```

***

### Task 3: author service + generic 注册 + author 路由

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\services\author.ts`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\admin-api\generic.ts`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\admin-api.ts`（追加 5 条 author 路由）

- [ ] **Step 1: 新建 author service（site 绑定 + 软删，模式同 article-category）**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.author";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { id: "DESC" },
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
  },

  async create(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Author not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({ where: { id: existing.id }, data });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});
```

- [ ] **Step 2: 在** **`generic.ts`** **export default 中追加一行**（放在 `"article-category": createGenericController("article-category"),` 之后）

```ts
  author: createGenericController("author"),
```

- [ ] **Step 3: 在** **`routes/admin-api.ts`** **追加 5 条 author 路由**（放在 `GET /article-categories` 组之后，任意位置均可）

```ts
    channelScopeRoute("GET", "/authors", "author-admin.find", "author.read"),
    channelScopeRoute("GET", "/authors/:documentId", "author-admin.findOne", "author.read"),
    channelScopeRoute("POST", "/authors", "author-admin.create", "author.create"),
    channelScopeRoute("PUT", "/authors/:documentId", "author-admin.update", "author.update"),
    channelScopeRoute("DELETE", "/authors/:documentId", "author-admin.softDelete", "author.delete"),
```

说明：`controllers/index.ts` 的 `adminGeneric` 会把 generic 的 `author` 键自动映射为 `author-admin`，无需再改 index.ts。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/author.ts plugins/zhao-website/server/src/controllers/admin-api/generic.ts plugins/zhao-website/server/src/routes/admin-api.ts
git commit -m "feat(zhao-website): add author admin CRUD"
```

***

### Task 4: zhao-auth 注册 author 权限

**Files:**

- Modify: `e:\code\basic\plugins\zhao-auth\server\src\permissions.ts`（两处：菜单定义 + 默认授权列表）

- [ ] **Step 1: 在** **`menu.website-article-category`** **菜单块（约 797-806 行）之后插入 author 菜单**

```ts
      "menu.website-author": {
        label: "文章作者",
        type: "menu",
        children: {
          "author.read": { label: "查看作者", type: "button" },
          "author.create": { label: "新增作者", type: "button" },
          "author.update": { label: "编辑作者", type: "button" },
          "author.delete": { label: "删除作者", type: "button" },
        },
      },
```

- [ ] **Step 2: 在默认授权列表（约 1499 行** **`"menu.website-article-category", ...`** **行后）追加**

```ts
    "menu.website-author", "author.read", "author.create", "author.update",
```

说明：每个权限键在 permissions.ts 中出现两处（菜单定义 + 授权列表），pattern 已通过 `menu.website-article-category` / `menu.website-knowledge-relation` 验证（各恰好 2 处）。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): register author permissions"
```

***

### Task 5: knowledge-relation PUT 更新

**Files:**

- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\knowledge-graph.ts`（在 `deleteRelation` 方法后追加）

- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\admin-api\knowledge-graph.ts`（追加 handler）

- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\admin-api.ts`（追加 PUT 路由）

- [ ] **Step 1: service 追加 updateRelation**

在 `deleteRelation` 方法（约 234-243 行）之后追加：

```ts
  async updateRelation(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Relation not found");
      e.status = 404;
      throw e;
    }
    const payload: any = {};
    if (data.predicate !== undefined) payload.predicate = data.predicate;
    if (data.objectText !== undefined) payload.objectText = data.objectText;
    if (data.objectValue !== undefined) payload.objectValue = data.objectValue;
    if (data.confidence !== undefined) payload.confidence = Number(data.confidence);
    if (data.verificationStatus !== undefined) payload.verificationStatus = data.verificationStatus;
    if (data.status !== undefined) payload.status = data.status === true || data.status === "true";
    // 可选：更新指向实体的客体（数字 id / 数字字符串 / documentId 均可，经 _resolveEntityId 解析）
    if (data.objectEntityId !== undefined && data.objectEntityId !== null && data.objectEntityId !== "") {
      const objectEntity = await this._resolveEntityId(data.objectEntityId);
      if (!objectEntity) {
        const e: any = new Error("objectEntityId 无效");
        e.status = 400;
        throw e;
      }
      payload.objectEntity = objectEntity;
    }
    return strapi.db.query(RELATION_UID).update({ where: { id: existing.id }, data: payload });
  },
```

- [ ] **Step 2: 控制器追加 handler**（放在 `deleteRelation` handler 之后）

```ts
  async updateRelation(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateRelation(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
```

- [ ] **Step 3: 路由追加**（放在 `DELETE /knowledge-graph/relations/:documentId` 之后）

```ts
    channelScopeRoute("PUT", "/knowledge-graph/relations/:documentId", "knowledge-graph.updateRelation", "knowledge-relation.update"),
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts plugins/zhao-website/server/src/routes/admin-api.ts
git commit -m "feat(zhao-website): add knowledge-relation update endpoint"
```

***

### Task 6: lifecycle beforeCreate 发布门禁

**Files:**

- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\geo-article\lifecycles.ts`

- [ ] **Step 1: 抽取审计失败抛错逻辑为公共函数**（在 `export default` 前追加）

```ts
function assertAuditPass(audit: { pass: boolean; missing: { passed: boolean }[] }) {
  if (!audit.pass) {
    throw new ApplicationError("发布未达标：请补齐以下缺漏项", {
      code: "GEO_AUDIT_FAIL",
      missing: audit.missing.filter((m) => !m.passed),
    });
  }
}
```

- [ ] **Step 2: 将 beforeUpdate 内的** **`if (!audit.pass) { throw ... }`** **块替换为** **`assertAuditPass(audit);`**

（原 45-51 行的 ApplicationError 抛出块整体替换，行为不变。）

- [ ] **Step 3: 在 beforeUpdate 后追加 beforeCreate 钩子**

```ts
  async beforeCreate(event: any) {
    const { data } = event.params;
    // 仅在"创建即发布"时校验（服务层已强制非 published，此为内容管理器 UI 旁路的第二道防线）
    if (!data || data.status !== "published") return;
    // auditGeoArticle 只判 truthBasis/mentionedEntities 非空数组、author truthy，id 数组可直接通过
    assertAuditPass(
      auditGeoArticle({
        type: data.type,
        title: data.title,
        content: data.content,
        faqQuestion: data.faqQuestion,
        comparisonData: data.comparisonData,
        listItems: data.listItems,
        summaryPoints: data.summaryPoints,
        localTips: data.localTips,
        infoBoundary: data.infoBoundary,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        truthBasis: Array.isArray(data.truthBasis) ? data.truthBasis : data.truthBasis ? [data.truthBasis] : [],
        mentionedEntities: Array.isArray(data.mentionedEntities) ? data.mentionedEntities : data.mentionedEntities ? [data.mentionedEntities] : [],
        author: data.author,
        authorName: data.authorName,
        jsonLdType: data.jsonLdType,
        businessData: data.businessData,
        ctaType: data.ctaType,
        leadFormEnabled: data.leadFormEnabled,
        riskType: data.riskType,
        reviewChecks: data.reviewChecks,
        reviewerName: data.reviewerName,
        reviewedAt: data.reviewedAt,
      })
    );
  },
```

- [ ] **Step 4: 语法自检**

Run: `npx tsc --noEmit --skipLibCheck plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts`（在 `e:\code\basic` 下）
Expected: 无 lifecycles.ts 相关报错

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/geo-article/lifecycles.ts
git commit -m "feat(zhao-website): add geo-article beforeCreate audit gate"
```

***

### Task 7: 重建 dist + grep 自检

**Files:**

- Build: `e:\code\basic\plugins\zhao-website` 和 `e:\code\basic\plugins\zhao-auth`

- [ ] **Step 1: 重建 zhao-website dist**

```powershell
cd e:\code\basic\plugins\zhao-website
npm run build
```

Expected: 构建成功，退出码 0

- [ ] **Step 2: 重建 zhao-auth dist**（permissions.ts 有改动，必须同步重建）

```powershell
cd e:\code\basic\plugins\zhao-auth
npm run build
```

Expected: 构建成功，退出码 0

- [ ] **Step 3: grep 自检（部署前强制检查）**

```powershell
Select-String -Path e:\code\basic\plugins\zhao-website\dist\server -Pattern "geoArticleAdmin|updateRelation" -List
Select-String -Path e:\code\basic\plugins\zhao-auth\dist\server -Pattern "website-author" -List
```

Expected: 两组均有命中；无命中 = dist 未重建成功，回到 Step 1/2

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/dist plugins/zhao-auth/dist
git commit -m "chore: rebuild zhao-website & zhao-auth dist"
```

***

### Task 8: 本机接口全链路验证

**前置：** 本地 Strapi 实例已启动（localhost:1337），并已重建 dist（Task 7）。以下命令在 PowerShell 执行。

- [ ] **Step 1: 获取 admin token**

```powershell
$body  = '{"email":"lantai@joho.cn","password":"<实际密码>"}'
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:1337/admin/login" -ContentType "application/json" -Body $body).data.token
$h = @{ Authorization = "Bearer $token" }
```

Expected: `$token` 非空

- [ ] **Step 2: 未登录访问新接口 = 401（404 = dist 未重建）**

```powershell
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/admin/geo-articles"
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/admin/authors"
```

Expected: 均 401

- [ ] **Step 3: author CRUD + site 绑定**

```powershell
$author = Invoke-RestMethod -Method Post -Uri "http://localhost:1337/api/zhao-website/v1/admin/authors" -Headers $h -ContentType "application/json" -Body '{"name":"验证作者","slug":"verify-author-tmp","position":"测试","bio":"验证用"}'
$author | ConvertTo-Json -Depth 3
```

Expected: 创建成功，`$author.site.id` = 1（site 自动绑定）

- [ ] **Step 4: geo-article create（含关系字符串 id 宽容 + status 强制 draft）**

```powershell
$doc = Invoke-RestMethod -Method Post -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles" -Headers $h -ContentType "application/json" -Body '{"title":"吉林市测试文章","content":"<p>测试正文</p>","type":"geo-article","author":"1","category":"1","tags":["1"],"status":"published"}'
$doc | Select-Object documentId, status, locale | Format-List
```

Expected: `status = draft`（create 强制非 published）、`locale = zh-CN`、author/category 正常绑定（documentId 字符串会解析为数字 id）

- [ ] **Step 5: 关系传 documentId 字符串 = 4xx 而非 500**

```powershell
try { Invoke-RestMethod -Method Post -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles" -Headers $h -ContentType "application/json" -Body '{"title":"吉林市测试2","content":"<p>x</p>","truthBasis":["abc"]}' } catch { $_.Exception.Response.StatusCode.value__ }
```

Expected: 400（非 500）

- [ ] **Step 6: publish 门禁——不达标被拦 / 达标通过**

```powershell
# 不达标：仅加 status=published，缺 summaryPoints/localTips 等 → 400 GEO_AUDIT_FAIL
try { Invoke-RestMethod -Method Put -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/$($doc.documentId)" -Headers $h -ContentType "application/json" -Body '{"status":"published"}' } catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }

# 达标：补齐全部审核字段 → 200 且 status=published
$full = '{"title":"吉林市长期学习规划测试","content":"<p>正文</p>","type":"geo-article","summaryPoints":"<p>结论</p>","localTips":"<p>本地建议</p>","infoBoundary":"<p>边界</p>","sourceName":"中华人民共和国教育部","sourceUrl":"https://www.moe.gov.cn","riskType":"other","jsonLdType":"Article","reviewChecks":{"eaat":true,"tech":true,"compliance":true,"business":true},"reviewerName":"兰台","reviewedAt":"2026-09-07T00:00:00.000Z","truthBasis":[1],"mentionedEntities":[1],"status":"published"}'
$published = Invoke-RestMethod -Method Put -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/$($doc.documentId)" -Headers $h -ContentType "application/json" -Body $full
$published.status
```

Expected: 第一段 400 + GEO\_AUDIT\_FAIL；第二段 `published`

- [ ] **Step 7: relations PUT 更新生效**

```powershell
$rel = Invoke-RestMethod -Method Put -Uri "http://localhost:1337/api/zhao-website/v1/admin/knowledge-graph/relations/kgr-slogan-000000001" -Headers $h -ContentType "application/json" -Body '{"objectText":"让学习更有价值（验证更新）","confidence":0.95,"verificationStatus":"pending"}'
$rel | Select-Object documentId, objectText, confidence, verificationStatus | Format-List
```

Expected: objectText/confidence/verificationStatus 更新生效（若本地无该 documentId，先用 POST `/knowledge-graph/relations` 建一条测试关系再 PUT）

- [ ] **Step 8: batch 发布/归档/删除**

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/batch" -Headers $h -ContentType "application/json" -Body '{"action":"archive","documentIds":["<刚才的documentId>"]}' | ConvertTo-Json -Depth 3
Invoke-RestMethod -Method Post -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/batch" -Headers $h -ContentType "application/json" -Body '{"action":"delete","documentIds":["<刚才的documentId>"]}' | ConvertTo-Json -Depth 3
```

Expected: results 数组每项 ok=true；delete 后 findOne 返回 404

- [ ] **Step 9: 旧接口不回退（audit-check）**

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check" -Headers $h | ConvertTo-Json -Depth 3
```

Expected: 200（若本地无该记录则为 404 属预期，重点是接口路由未破坏；用任意已存在 documentId 复测）

- [ ] **Step 10: 清理验证产生的临时数据**

```powershell
# 删除 Step 3 的临时作者
Invoke-RestMethod -Method Delete -Uri "http://localhost:1337/api/zhao-website/v1/admin/authors/$($author.documentId)" -Headers $h
```

***

### Task 9: 提交 + 服务器部署 + 线上验证

- [ ] **Step 1: 本地提交全部改动并推送**

```bash
git add plugins/zhao-website plugins/zhao-auth
git commit -m "feat(zhao-website): geo-article admin publish chain (CRUD/author/relation PUT)"
git push origin main
```

- [ ] **Step 2: 服务器执行部署脚本（禁止裸手 SSH）**

```powershell
ssh joho "export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$env:PATH; export PM2_HOME=/home/admin/.pm2; cd /www/apps/strapi && bash docs/deployment/deploy.sh"
```

Expected: pm2 restart strapi 成功；等待重启后接口生效

- [ ] **Step 3: 线上验证**

```powershell
# 新接口未登录 = 401（404 = 线上 dist 未重建，回 Task 7 重查提交）
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/api/zhao-website/v1/admin/geo-articles"
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/api/zhao-website/v1/admin/authors"

# 旧接口不回退（audit-check 401 而非 404）
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check"

# 公开内容接口正常
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/api/zhao-website/v1/geo-articles?locale=zh-CN&pageSize=5"
```

Expected: 前两个 401、audit-check 401、公开接口 200

- [ ] **Step 4: 验收清单对照 spec §8 逐项打勾**

覆盖：401 鉴权、CRUD 全链路、create 直发 published 拦截、author site 绑定、relations PUT 生效、字符串 id 宽容、旧接口不回退。

***

## Self-Review（执行前自查）

1. **Spec 覆盖**：§3.1 九条 geo-article 路由 → Task 2 ✓；§3.2 author 五条 → Task 3+4 ✓；§3.3 relation PUT → Task 5 ✓；§4.1 service → Task 1 ✓；§4.2 author service → Task 3 ✓；§4.3 updateRelation → Task 5 ✓；§5 beforeCreate 门禁 → Task 6 ✓；§6 controllers 注册 → Task 2/3/5 ✓；§7 风险项（dist 重建 → Task 7、locale → Task 1、双层防 published → Task 1+6、多站点隔离 → 各 service 均注入 siteId）✓；§8 验收 → Task 8/9 ✓
2. **占位符扫描**：无 TBD/TODO；每条代码完整可直接粘贴；密码类占位 `<实际密码>` 仅存在于验证命令参数（非代码逻辑）
3. **类型一致性**：方法名 `findAdmin/findOneAdmin/create/update/softDelete/publish/archive/batch/updateRelation/assertAuditPass/coerceRelationIds` 在定义与调用处完全一致；路由 handler 前缀 `geoArticleAdmin`/`author-admin`/`knowledge-graph` 与 controllers/index.ts 导出键一致
4. **已知边界**：`POST /geo-articles/batch` 与 `POST /geo-articles/:documentId/publish` 段数不同（2 段 vs 3 段），与 article 模块生产模式一致，无路由冲突；`articleNo` 为可选唯一字段，API 通道由运营人工编号（手册 4.1 亦为人工编号），不做自动生成，避免过度设计

