# 官网中心 Admin 路由契约修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 seo-config/brand-info/article-category/lead 四个 CT 的 admin 路由 500 错误，消除 service 与 controller 契约不匹配问题。

**Architecture:** 单例 CT（seo-config/brand-info）新建专用 controller，路由精简为 GET+PUT；多例 CT（article-category/lead）补齐缺失的 service 方法，继续用 generic controller。

**Tech Stack:** Strapi v5 / TypeScript / Knex

---

## File Structure

### 新建文件
- `basic/plugins/zhao-website/server/src/controllers/admin-api/seo-config.ts` — 单例 controller（find+update）
- `basic/plugins/zhao-website/server/src/controllers/admin-api/brand-info.ts` — 单例 controller（find+update）

### 修改文件
- `basic/plugins/zhao-website/server/src/controllers/admin-api/generic.ts` — 删除 seo-config/brand-info 导出
- `basic/plugins/zhao-website/server/src/controllers/index.ts` — 注册专用 controller
- `basic/plugins/zhao-website/server/src/routes/admin-api.ts` — seo-config/brand-info 路由精简
- `basic/plugins/zhao-website/server/src/services/article-category.ts` — 补 findOneAdmin
- `basic/plugins/zhao-website/server/src/services/lead.ts` — 补 findOneAdmin + 3参 update

---

## Task 1: 新建单例 CT 专用 controller

**Files:**
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/seo-config.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/brand-info.ts`

- [ ] **Step 1: 创建 seo-config 专用 controller**

`basic/plugins/zhao-website/server/src/controllers/admin-api/seo-config.ts`：

```ts
export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").update(ctx.state.siteId, ctx.request.body);
  },
};
```

- [ ] **Step 2: 创建 brand-info 专用 controller**

`basic/plugins/zhao-website/server/src/controllers/admin-api/brand-info.ts`：

```ts
export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").update(ctx.state.siteId, ctx.request.body);
  },
};
```

- [ ] **Step 3: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/controllers/admin-api/seo-config.ts \
        plugins/zhao-website/server/src/controllers/admin-api/brand-info.ts
git commit -m "feat(zhao-website): 新建 seo-config/brand-info 单例专用 controller"
```

---

## Task 2: 修改 generic.ts 与 controllers/index.ts

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/controllers/admin-api/generic.ts`
- Modify: `basic/plugins/zhao-website/server/src/controllers/index.ts`

- [ ] **Step 1: generic.ts 删除 seo-config 和 brand-info 导出**

修改 `basic/plugins/zhao-website/server/src/controllers/admin-api/generic.ts`，将 export default 对象中的以下两行删除：

```ts
"seo-config": createGenericController("seo-config"),
"brand-info": createGenericController("brand-info"),
```

删除后 export default 应从 `"article-category"` 开始。

- [ ] **Step 2: controllers/index.ts 注册专用 controller**

修改 `basic/plugins/zhao-website/server/src/controllers/index.ts`：

1. 在 import 区块（`import adminArticle from "./admin-api/article";` 之后）增加：

```ts
import adminSeoConfig from "./admin-api/seo-config";
import adminBrandInfo from "./admin-api/brand-info";
```

2. 在 export default 对象中，`"article-admin": adminArticle,` 之后增加：

```ts
"seo-config-admin": adminSeoConfig,
"brand-info-admin": adminBrandInfo,
```

注意：由于 `...adminGeneric` 展开后不再包含 seo-config/brand-info（Task 2 Step 1 已删除），不会发生 key 冲突。

- [ ] **Step 3: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/controllers/admin-api/generic.ts \
        plugins/zhao-website/server/src/controllers/index.ts
git commit -m "feat(zhao-website): 注册单例专用 controller，从 generic 移除 seo-config/brand-info"
```

---

## Task 3: 修改路由精简单例 CT

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/routes/admin-api.ts`

- [ ] **Step 1: seo-config 路由精简为 GET + PUT**

修改 `basic/plugins/zhao-website/server/src/routes/admin-api.ts`，将 seo-config 的 5 条路由替换为 2 条：

删除（第 34-38 行）：
```ts
channelScopeRoute("GET", "/seo-config", "seo-config-admin.find", "seo-config.read"),
channelScopeRoute("GET", "/seo-config/:documentId", "seo-config-admin.findOne", "seo-config.read"),
channelScopeRoute("POST", "/seo-config", "seo-config-admin.create", "seo-config.update"),
channelScopeRoute("PUT", "/seo-config/:documentId", "seo-config-admin.update", "seo-config.update"),
channelScopeRoute("DELETE", "/seo-config/:documentId", "seo-config-admin.delete", "seo-config.update"),
```

替换为：
```ts
channelScopeRoute("GET", "/seo-config", "seo-config-admin.find", "seo-config.read"),
channelScopeRoute("PUT", "/seo-config", "seo-config-admin.update", "seo-config.update"),
```

- [ ] **Step 2: brand-info 路由精简为 GET + PUT**

同样将 brand-info 的 5 条路由替换为 2 条：

删除（第 39-43 行）：
```ts
channelScopeRoute("GET", "/brand-info", "brand-info-admin.find", "brand-info.read"),
channelScopeRoute("GET", "/brand-info/:documentId", "brand-info-admin.findOne", "brand-info.read"),
channelScopeRoute("POST", "/brand-info", "brand-info-admin.create", "brand-info.update"),
channelScopeRoute("PUT", "/brand-info/:documentId", "brand-info-admin.update", "brand-info.update"),
channelScopeRoute("DELETE", "/brand-info/:documentId", "brand-info-admin.delete", "brand-info.update"),
```

替换为：
```ts
channelScopeRoute("GET", "/brand-info", "brand-info-admin.find", "brand-info.read"),
channelScopeRoute("PUT", "/brand-info", "brand-info-admin.update", "brand-info.update"),
```

- [ ] **Step 3: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/routes/admin-api.ts
git commit -m "feat(zhao-website): seo-config/brand-info 路由精简为 GET+PUT（单例）"
```

---

## Task 4: 补齐 article-category service 的 findOneAdmin

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/services/article-category.ts`

- [ ] **Step 1: 在 article-category service 增加 findOneAdmin 方法**

在 `basic/plugins/zhao-website/server/src/services/article-category.ts` 的 `findAdmin` 方法之后、`create` 方法之前，增加：

```ts
  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["parent", "children"],
    });
  },
```

- [ ] **Step 2: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/services/article-category.ts
git commit -m "feat(zhao-website): article-category service 补 findOneAdmin"
```

---

## Task 5: 补齐 lead service 的 findOneAdmin + 3参 update

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/services/lead.ts`

- [ ] **Step 1: 在 lead service 增加 findOneAdmin 方法**

在 `basic/plugins/zhao-website/server/src/services/lead.ts` 的 `findAdmin` 方法之后、`assign` 方法之前，增加：

```ts
  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["assignedTo"],
    });
  },
```

- [ ] **Step 2: 在 lead service 增加 3参 update 方法**

在 `findOneAdmin` 方法之后、`assign` 方法之前，增加：

```ts
  async update(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },
```

- [ ] **Step 3: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/services/lead.ts
git commit -m "feat(zhao-website): lead service 补 findOneAdmin + 3参 update"
```

---

## Task 6: 重新编译插件并验证

**Files:**
- 无文件修改（仅编译）

- [ ] **Step 1: 重新编译 zhao-website 插件**

Run: `cd basic/plugins/zhao-website && npm run build`
Expected: 编译成功，dist/server/index.js 和 index.mjs 包含新 controller

- [ ] **Step 2: 验证 dist 包含新 controller**

Run: `find dist/server -name "*.js" | head -5 && grep -l "seo-config" dist/server/index.* 2>/dev/null`
Expected: dist 文件存在且包含 seo-config 相关代码

- [ ] **Step 3: 重启 Strapi 验证**

Run: `cd basic && npm run dev`
Expected: 启动无报错

- [ ] **Step 4: 接口验收**

逐个验证（需带认证 token）：

```bash
# seo-config 单例
curl http://localhost:1337/api/zhao-website/v1/admin/seo-config -H "Authorization: Bearer <token>"
# 期望 200 + 配置对象（非数组）

curl -X PUT http://localhost:1337/api/zhao-website/v1/admin/seo-config -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"defaultTitle":"测试"}'
# 期望 200 + 更新后对象

# brand-info 单例
curl http://localhost:1337/api/zhao-website/v1/admin/brand-info -H "Authorization: Bearer <token>"
# 期望 200 + 品牌信息对象

# article-category findOne
curl http://localhost:1337/api/zhao-website/v1/admin/article-categories/<documentId> -H "Authorization: Bearer <token>"
# 期望 200 + 单条分类

# lead findOne
curl http://localhost:1337/api/zhao-website/v1/admin/leads/<documentId> -H "Authorization: Bearer <token>"
# 期望 200 + 单条线索
```

- [ ] **Step 5: 若编译产物未提交，按需提交 dist**

如果 develop 模式自动编译可工作，则无需提交 dist。如果需要生产部署，执行：

```bash
cd basic
git add plugins/zhao-website/dist/
git commit -m "build(zhao-website): 重新编译 dist 包含单例 controller 修复"
```

---

## 验收对照（spec 第 5 章）

- [ ] `GET /admin/seo-config` 返回 200 + 配置对象（非数组）（Task 1+3+6）
- [ ] `PUT /admin/seo-config` 返回 200 + 更新后对象（Task 1+3+6）
- [ ] `GET /admin/brand-info` 返回 200 + 品牌信息对象（Task 1+3+6）
- [ ] `PUT /admin/brand-info` 返回 200 + 更新后对象（Task 1+3+6）
- [ ] `GET /admin/seo-config/:documentId` 返回 404（路由不存在）（Task 3）
- [ ] `GET /admin/article-categories/:documentId` 返回 200 + 单条分类（Task 4+6）
- [ ] `GET /admin/leads/:documentId` 返回 200 + 单条线索（Task 5+6）
- [ ] `PUT /admin/leads/:documentId` 返回 200 + 更新后线索（Task 5+6）
- [ ] 其他正常 CT 的 admin 路由不受影响（Task 6 验证）
- [ ] `npm run build` 成功，dist 包含新 controller（Task 6）
- [ ] Strapi 启动无报错（Task 6）
