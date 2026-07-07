# zhao-website 插件遗留问题修复设计

> 日期：2026-07-07
> 范围：zhao-website 插件 Task 1-27 完成后的 4 个遗留问题中，本次覆盖 3 个（问题 1+2+4），跳过问题 3（studio 一键发布按钮，仓库无 studio 前端页面，单独立项）。

## 1. 背景与目标

zhao-website 插件已完成 27 个 Task 的实施，但存在以下遗留问题：

| # | 问题 | 影响 | 本次处理 |
|---|---|---|---|
| 1 | `article.find` 解构了 `tag`、`q` 但未使用 | controller `related` 调用失效，相关文章功能不可用 | ✅ |
| 2 | `interaction.toggle` 签名与 controller `track` 不对齐 | 互动追踪功能失效（缺 targetType/visitorId） | ✅ |
| 3 | studio 一键发布按钮无处接入 | 仓库无 article-draft 详情页 | ❌ 跳过 |
| 4 | 测试为 mock 占位 | 关键代码路径未被验证 | ✅ |

### 设计原则
- **可靠第一**：避开已知的 Strapi v5 manyToMany filter 不稳定坑点
- **不能有遗漏数据**：不用内存过滤（分页后过滤会跨页遗漏）
- **性能第二**：在满足前两者前提下尽量优化
- **YAGNI**：只修复遗留问题，不添加新功能

## 2. 问题 1：article.find 支持 tag + exclude 过滤

### 2.1 现状

`plugins/zhao-website/server/src/services/article.ts` find 方法解构了 `tag`、`q`、`exclude` 但查询条件中未使用。controller `related` 调用时传 `tag: tagIds.join(",")` + `exclude: article.documentId` 但被忽略。

### 2.2 设计

修改 `article.ts` find 方法，新增 tag/exclude 处理逻辑：

```ts
async find(siteId: number, query: any = {}) {
  const { page = 1, pageSize = 20, category, tag, exclude, status, isFeatured, q } = query;
  const filters: any = { site: siteId, deletedAt: null };
  if (status) filters.status = status;
  else filters.status = "published";
  if (category) filters.category = category;
  if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;

  // tag 过滤：knex 查 join 表拿 article_id 列表（OR 语义）
  if (tag) {
    const tagIds = String(tag).split(",").map(s => s.trim()).filter(Boolean);
    if (tagIds.length > 0) {
      try {
        const db = strapi.db.connection;
        const rows = await db
          .select("article_id")
          .from("zhao_website_articles_tags_lnk")
          .whereIn("tag_id", tagIds);
        const articleIds = [...new Set(rows.map((r: any) => r.article_id))];
        if (articleIds.length === 0) return [];  // 短路，避免 IN () 报错
        filters.id = { $in: articleIds };
      } catch (err) {
        strapi.log.warn("[zhao-website] tag filter knex failed, fallback to no-tag:", (err as Error).message);
      }
    }
  }

  // exclude 过滤：排除指定 documentId 对应的 article
  if (exclude) {
    const excludeIds = String(exclude).split(",").map(s => s.trim()).filter(Boolean);
    if (excludeIds.length > 0) {
      const excludeRows = await strapi.db.query(UID).findMany({
        where: { documentId: { $in: excludeIds } },
        select: ["id"],
      });
      const excludeNumericIds = excludeRows.map((r: any) => r.id);
      if (excludeNumericIds.length > 0) {
        filters.id = { ...(filters.id || {}), $notIn: excludeNumericIds };
      }
    }
  }

  return strapi.db.query(UID).findMany({
    where: filters,
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    orderBy: { publishedAt: "DESC" },
    populate: ["coverImage", "category", "tags", "mainEntity"],
  });
}
```

### 2.3 关键决策

1. **join 表名 `zhao_website_articles_tags_lnk`**：按 project_memory 规则推导（owner_table=`zhao_website_articles` + inverse_attribute=`tags` + `_lnk`），列名 `article_id` / `tag_id`。实现时需用 `\d zhao_website_articles_tags_lnk` 或查 schema 验证，如不一致则调整。
2. **OR 语义**：`whereIn` 任一 tag 匹配即返回 article_id。
3. **短路返回**：tag 有值但 knex 查到空列表 → 直接返回 `[]`，不再查主表，避免 SQL `IN ()` 错误。
4. **exclude 用 documentId 输入**：与 controller 调用一致（传 `article.documentId`），内部转 numeric id 后用 `$notIn`。
5. **filters.id 合并**：tag 和 exclude 同时存在时，`$in` 和 `$notIn` 共存于 filters.id 对象（Strapi db.query 支持）。
6. **降级策略**：knex 查询失败时 catch → log warn → 降级为不带 tag 过滤（保证可用性）。

### 2.4 不做的事
- 不实现 `q` 全文搜索（q 当前已解构但未实现，不在本 spec 范围）
- 不改 controller related（已在 Task 26 对齐，调用 `find(siteId, { tag, exclude })` 正确）

## 3. 问题 2：interaction track 接口对齐

### 3.1 现状

- service `toggle(siteId, { type, targetType, targetId, visitorId, userId?, ctx? })` 要求 `targetType`、`visitorId`（schema 中都是 required: true）
- controller `track` 传 `{ type, targetId, action }`，缺 `targetType`、`visitorId`，多了无用的 `action`

### 3.2 设计

修改 `plugins/zhao-website/server/src/controllers/content-api/lead.ts` track 方法：

```ts
async track(ctx: any) {
  const siteId = ctx.state.siteId;
  const { type, targetType, targetId, visitorId, userId } = ctx.request.body;

  // 必填校验
  if (!type || !targetType || !targetId || !visitorId) {
    return ctx.badRequest("Missing required fields: type, targetType, targetId, visitorId");
  }

  try {
    const result = await strapi.plugin("zhao-website").service("interaction").toggle(siteId, {
      type,
      targetType,
      targetId,
      visitorId,
      userId,
      ctx,  // service 内部用 ctx.request.ip / userAgent
    });
    ctx.body = { success: true, action: result.action };
  } catch (err) {
    ctx.status = (err as any).status || 500;
    ctx.body = { error: (err as Error).message };
  }
}
```

### 3.3 关键决策

1. **visitorId 由前端生成**：前端用 localStorage 持久化一个 UUID 作为访客标识（同一访客切换 like/unlike 才能正确去重）。这部分属于前端配合，spec 中记录约定但不强制前端立即实现——未传 visitorId 时返回 400。
2. **targetType 由前端显式传**：如 `"article"` / `"product"` / `"case"`，service 不再硬编码。
3. **移除 action 参数**：service 是 toggle 语义（已存在则取消，不存在则创建），前端不需要传 action。
4. **userId 可选**：登录用户传 userId，未登录传 undefined。

### 3.4 前端配合约定

POST /api/zhao-website/v1/interactions/track body：
```json
{ "type": "like", "targetType": "article", "targetId": "abc123", "visitorId": "uuid-xxx", "userId": 5 }
```

前端需在 web 端生成并持久化 visitorId（localStorage key: `website_visitor_id`）。本次仅改后端 + 记录约定，前端配合作为独立小任务（不阻塞本 spec）。

### 3.5 不做的事
- 不改 interaction.toggle 的内部 toggle 逻辑（仅对齐接口）
- 不引入参数校验库（如 joi/zod），保持与现有 controllers 风格一致

## 4. 问题 4：Mock 补全测试

### 4.1 现状

现有 5 个测试文件（content-types/article/knowledge-graph/first-truth/api）中除 content-types.test.ts 启动真实 Strapi 外，其余 4 个全部 `expect(true).toBe(true)` 占位。

### 4.2 设计原则

- 遵循 zhao-studio 惯例：service/api 测试不依赖 DB，用 mock 验证调用流程
- 测试覆盖**关键代码路径**（条件分支、错误抛出、参数传递），不追求覆盖率数字
- mock strapi 对象，断言 service 是否调用了正确的 db.query 方法 + 正确参数
- 不引入 jest-mock-extended 等新依赖，手写 mock 工厂

### 4.3 测试方案（按文件）

#### 4.3.1 tests/services/article.test.ts

覆盖 7 个关键路径：
- `find` 默认只查 published（断言 where.status === "published"）
- `find` 带 tag 参数 → 断言调用了 knex whereIn（验证 §2 实现）
- `find` tag 无匹配 → 短路返回 `[]`，不再查主表
- `findOne` 只返回 published（断言 where 含 status: "published"）
- `create` 调用 generateUniqueSlug + 写入 status: "draft"
- `publish` 调用 update 并设 status 为 "published" + publishedAt
- `softDelete` 设置 deletedAt

#### 4.3.2 tests/services/knowledge-graph.test.ts

覆盖 6 个路径：
- `createEntity` 必填校验 + slug 生成
- `addRelation` 自引用 → reject "Self-relation"
- `addRelation` 层级关系循环 → reject "cycle"（mock _detectCycle 返回 true）
- `addRelation` objectEntityId + objectValue 同时存在 → reject "互斥"
- `disambiguate` 按 name+type 查询
- `exportGraph` 返回 { nodes, edges } 结构

#### 4.3.3 tests/services/first-truth.test.ts

覆盖 5 个路径：
- `create` claimKey 唯一性校验（mock findOne 返回已存在 → reject）
- `update` canonicalValue 变更触发 entity 同步（断言调用了 entity service update）
- `verify` 设置 verificationStatus = "verified"
- `detectConflicts` 扫描同 claimKey 不同 canonicalValue → 返回 severity: "error"
- `softDelete` 设置 deletedAt

#### 4.3.4 tests/api/content-api.test.ts

覆盖 9 个路径（验证 controller → service 调用链 + 参数透传）：
- GET /articles → service.find(siteId, query)
- GET /articles/:slug → service.findOne + incrementViewCount（异步）
- GET /articles/featured → service.findFeatured(limit)
- GET /articles/:slug/related → service.findOne + find(tag, exclude)
- POST /leads/submit → service.createPublic + honeypot 短路
- POST /leads/submit 带 honeypot → 不调用 createPublic，直接返回 success
- POST /interactions/track → service.toggle(type, targetType, targetId, visitorId)
- POST /interactions/track 缺参数 → 400
- GET /sitemap.xml → service.sitemap.generate

### 4.4 Mock 工具

```ts
// 简单 mock 工厂，不引入新依赖
function createMockStrapi() {
  const queryMock = jest.fn().mockReturnValue({
    findMany: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, documentId: "doc-1" }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    count: jest.fn().mockResolvedValue(0),
  });
  return {
    db: {
      query: queryMock,
      connection: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockResolvedValue([]),
      },
    },
    plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({}) }),
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
}
```

### 4.5 关键决策

1. **不引入 jest-mock-extended 等新依赖**，手写 mock 工厂
2. **content-types.test.ts 保持不变**（已用真实 Strapi）
3. **测试断言重点是"调用了什么"而非"返回了什么"**——mock 场景下返回值无意义，调用参数才有验证价值
4. **不测 utils/**（slug/status/async-writer 等纯函数可单测，但不在本 spec 范围，避免膨胀）

## 5. 错误处理与边界

### 5.1 错误处理

1. **article.find knex 查询失败** — catch 后 log warn + 降级为不带 tag 过滤（保证可用性，不阻断主查询）
2. **interaction.track 参数缺失** — 400 Bad Request + 明确错误消息
3. **toggle service 内部异常** — controller 层 try/catch 包装，500 兜底

### 5.2 边界

1. **tag 为空字符串或纯逗号** — `String(tag).split(",").filter(Boolean)` 过滤后 length=0，跳过 knex 查询
2. **exclude documentId 不存在** — `findMany` 返回空，`excludeNumericIds.length=0` 跳过 `$notIn`
3. **tag 匹配 0 篇** — 短路返回 `[]`
4. **tag + exclude 同时存在且结果为空** — 短路优先（tag 返回空就直接 `[]`，不查 exclude）
5. **visitorId 超长**（schema maxLength 100）— service 层不校验，依赖 Strapi 自动截断/报错（与现有 lead 等一致）

### 5.3 不做的事

- 不为 article.find 加 q 全文搜索实现
- 不改 interaction.toggle 的内部 toggle 逻辑
- 不引入参数校验库

## 6. 验收标准

1. `npx tsc --noEmit -p tsconfig.server.json` 退出码 0（在 plugins/zhao-website 目录）
2. `npx jest --config tests/jest.config.ts` 全部通过（在 plugins/zhao-website 目录）
3. article.find 带 tag 参数时，knex 查询被调用（测试断言）
4. article.find tag 无匹配时，短路返回 `[]` 不查主表（测试断言）
5. interaction.track 缺参数时返回 400（测试断言）
6. interaction.track 正常调用时透传 targetType/visitorId 给 service（测试断言）
7. 4 个测试文件不再有 `expect(true).toBe(true)` 占位（content-types.test.ts 除外）

## 7. 范围外

- 问题 3（studio 一键发布按钮）：仓库无 studio 前端页面，单独立项
- article.find 的 `q` 全文搜索：当前未实现，不在本 spec 范围
- 前端 visitorId 生成逻辑：仅记录约定，前端实现为独立任务
- utils/ 纯函数单测：避免膨胀，不在本 spec 范围
