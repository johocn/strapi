# 官网中心 Admin 路由契约修复设计

## 1. 背景与目标

### 1.1 问题现象

`GET /api/zhao-website/v1/admin/seo-config` 返回 500 Internal Server Error。排查发现根因是 **service 与 controller 契约不匹配**：seo-config 的 service 是单例模板（只实现 `ensureDefault/find/update/findPublic`），但被挂到 `generic.ts` 通用 CRUD controller 上，后者期望 `findAdmin/findOneAdmin/create/update(siteId,docId,data)/softDelete` 全套方法。

### 1.2 影响范围

同一契约不匹配问题波及 4 个 CT：

| 严重程度 | 资源 | 缺失方法 | 影响端点 |
|---|---|---|---|
| 致命 | seo-config | 全部 5 个 admin 方法 | 全部 5 端点 500 |
| 致命 | brand-info | 全部 5 个 admin 方法 | 全部 5 端点 500 |
| 部分 | article-category | findOneAdmin | `GET /:documentId` 500 |
| 部分 | lead | findOneAdmin + 3参 update | `GET/PUT /:documentId` 500 |

正常工作的 CT（article/product/case/faq/tutorial/compliance/download）service 实现了完整方法集，不受影响。

### 1.3 修复目标

- 消除 4 个 CT 的 500 错误
- 单例 CT（seo-config/brand-info）采用专用 controller，路由精简为 GET + PUT，语义匹配单例本质
- 多例 CT（article-category/lead）补齐缺失方法，保持通用 controller 路由

## 2. 架构决策

### 2.1 单例 CT 用专用 controller（用户已确认）

seo-config 和 brand-info 是单例配置（site oneToOne required，一站点一记录），语义上只需 find/update，不应支持 create/delete/findOne(documentId)。

**决策：** 新建专用 controller，路由只保留 `GET` + `PUT`，移除 `GET /:documentId`、`POST`、`DELETE /:documentId`。

**理由：**
- 语义清晰：单例不需要 documentId 寻址
- service 无改动：现有 `find(siteId)` / `update(siteId, data)` 签名已匹配
- 前端无改动：edit 页本来就是 find + update 模式

### 2.2 多例 CT 补齐方法

article-category 和 lead 是多例 CT，应继续用 generic controller，只需补齐缺失的 service 方法。

## 3. 详细设计

### 3.1 新建专用 controller

#### 3.1.1 `controllers/admin-api/seo-config.ts`

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

#### 3.1.2 `controllers/admin-api/brand-info.ts`

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

### 3.2 修改 controllers/index.ts

注册专用 controller，并从 generic 中移除 seo-config/brand-info：

```ts
import adminSeoConfig from "./admin-api/seo-config";
import adminBrandInfo from "./admin-api/brand-info";

export default {
  // ... 其他不变
  "seo-config-admin": adminSeoConfig,
  "brand-info-admin": adminBrandInfo,
  // ...adminGeneric 不再包含 seo-config 和 brand-info
};
```

同时修改 `controllers/admin-api/generic.ts`，删除 `seo-config` 和 `brand-info` 两个导出项。

### 3.3 修改 routes/admin-api.ts

seo-config 路由精简为 2 条：

```ts
channelScopeRoute("GET", "/seo-config", "seo-config-admin.find", "seo-config.read"),
channelScopeRoute("PUT", "/seo-config", "seo-config-admin.update", "seo-config.update"),
```

移除以下 3 条：
- `GET /seo-config/:documentId`
- `POST /seo-config`
- `DELETE /seo-config/:documentId`

brand-info 同样精简为 2 条，移除 3 条。

### 3.4 补齐 article-category service

在 `services/article-category.ts` 增加 `findOneAdmin` 方法（参照 product/case 等实现）：

```ts
async findOneAdmin(siteId: number, documentId: string) {
  return strapi.db.query(UID).findOne({
    where: { site: siteId, documentId, deletedAt: null },
    populate: ["parent", "children"],
  });
},
```

### 3.5 补齐 lead service

在 `services/lead.ts` 增加：

```ts
async findOneAdmin(siteId: number, documentId: string) {
  return strapi.db.query(UID).findOne({
    where: { site: siteId, documentId, deletedAt: null },
    populate: ["assignedTo"],
  });
},

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

### 3.6 重新编译与验证

修改完成后执行 `cd e:\code\basic\plugins\zhao-website && npm run build` 重新编译插件。

## 4. 不在本次范围

- 不改动 schema
- 不改动前端（前端调用方式不变）
- 不改动正常工作的 CT（article/product/case/faq/tutorial/compliance/download）
- 不改动 visit-log/interaction/search-log（这些只有 find 路由，工作正常）
- 不改动 knowledge-graph/first-truth/ai-content-summary/studio-bridge/stats（这些有专用 controller，工作正常）

## 5. 验收标准

### 后端验收

- [ ] `GET /api/zhao-website/v1/admin/seo-config` 返回 200 + 配置对象（非数组）
- [ ] `PUT /api/zhao-website/v1/admin/seo-config` 返回 200 + 更新后对象
- [ ] `GET /api/zhao-website/v1/admin/brand-info` 返回 200 + 品牌信息对象
- [ ] `PUT /api/zhao-website/v1/admin/brand-info` 返回 200 + 更新后对象
- [ ] `GET /api/zhao-website/v1/admin/seo-config/:documentId` 返回 404（路由不存在）
- [ ] `GET /api/zhao-website/v1/admin/article-categories/:documentId` 返回 200 + 单条分类
- [ ] `GET /api/zhao-website/v1/admin/leads/:documentId` 返回 200 + 单条线索
- [ ] `PUT /api/zhao-website/v1/admin/leads/:documentId` 返回 200 + 更新后线索
- [ ] 其他正常 CT 的 admin 路由不受影响

### 编译验收

- [ ] `npm run build` 成功，dist 包含新 controller
- [ ] Strapi 启动无报错
