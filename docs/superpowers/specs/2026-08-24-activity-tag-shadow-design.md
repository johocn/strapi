# 活动影子标签联动设计（2026-08-24）

## 背景与目标

活动系统现状：
- 活动直接以**关系字段**关联讲师（`lecturer`）、场地（`venue`）、系列（`belongsToSeries`），以 `category`(string)、`tags`(json) 存自由文本。
- `zhao-tag` 提供统一标签管理与跨内容检索（tag-index），课程已通过标签检索课程。

**核心目标**：把讲师/场地/活动系列/活动分类纳入 `zhao-tag` 统一标签管理，实现"通过讲师、场地等标签检索到活动"，与课程标签检索体验一致。

**平衡约束**（用户确认的方案 A/M1）：
- 讲师、场地、系列、分类**保留业务资源主档**（含结算字段），资源侧权威，标签侧只读不反向写。
- 不复制业务数据到 zhao-tag，通过 tag-index 索引建立"活动 → 影子标签"的可检索关系。
- 切割时可删除影子标签，资源主档独立无损。

## 核心机制（数据模型 + 索引方向）

关键反转：**影子标签不是挂在讲师/场地/系列资源上，而是作为「活动」的索引标签**。

```
讲师·张三 ──(shadow tag, 活动讲师分组)
                ↓ tag-index("activity", activityDocId, [张三tag, 场地tag, 系列tag, 分类tag])
活动 ────────────┘
```

反向检索 = 点"讲师·张三"标签 →
`GET zhao-tag/v1/tag-indexes/search?tagId=张三tag&targetType=activity`
→ 返回活动 documentId 列表 → 拼进活动列表接口 `documentIds` 过滤。

`tag-index` 语义为「内容 → 标签」：课程实现 `sync("course", courseDocId, tagIds)`，`searchByTag(tagId, targetType?)` 返回 `[{targetType, targetId}]`，其中 `targetId` 是 **documentId**（字符串，非数字 id）。本设计完全复用该服务（`zhao-tag.service["tag-index"]`）。

## 标签分组

zhao-tag 中新增 4 个 tag-group，供影子标签归属（用 `slug` 定位保证 findOrCreate 稳定）：

| slug | name | 归属标签来源 |
|------|------|------------|
| `activity-category` | 活动分类 | 活动 `category`(string) |
| `activity-venue` | 活动场地 | 场地资源（`venue.tag`） |
| `activity-lecturer` | 活动讲师 | 讲师资源（`lecturer.tag`） |
| `activity-series` | 活动系列 | 活动系列资源（`activity-series.tag`） |

## 数据模型变更

### zhao-tag 插件

1. `tag` service 新增 `findOrCreate(groupSlug, name, siteId?)`：按「分组 + name」查，命中返回；未命中则创建并归属对应分组。当前 service 无此方法，需自行实现（查用 knex join 表 `zhao_tags_tag_group_lnk` 或先查分组再查 tag，方案见实现计划）。
2. `tag-group` 四个分组为种子数据：可在 `bootstrap` 或首次 findOrCreate 时自动兜底创建（推荐 findOrCreate 内惰性保证 + 手工 seed 脚本）。

### zhao-point 插件

3. `lecturer` schema 新增 `tag`（manyToOne→`plugin::zhao-tag.tag`，inversedBy 空即可，仅存引用）。
4. `venue` schema 新增 `tag`（同上）。
5. `activity-series` schema 新增 `tag`（同上）。
6. `activity` schema 不变（不改 `category`/`tags`，不新增关系镜像）。

## 同步链路

### 资源影子标签（讲师/场地/系列）

挂资源 lifecycle `afterCreate` / `afterUpdate`（新建 content-types 目录下 `lifecycles.ts`）：
1. 按「分组 slug + name」`findOrCreate` 影子标签。
2. 回写资源 `tag` 字段（多对一）。
3. 改名：同步更新影子标签 `name`。
4. **软删不联动**：讲师/场地删除为软删除（`disabled=true`），影子标签保留供历史活动索引。系列为硬删（见风险点）。

讲师/场地入口：`resource.ts` controller（documents.create/update，软删走 update `disabled=true`）；系列入口：`series-service.ts`（create/update/delete）。

### 活动标签索引

activity 新增 lifecycle（新建 `content-types/activity/lifecycles.ts`）：
1. `afterCreate` / `afterUpdate`：
   - populate 读取 `lecturer/venue/belongsToSeries`，取其 `*.tag`（**须 populate 后才能取关系深层字段，否则读到空**）。
   - `category`(string) → `findOrCreate("activity-category", category)` 得影子标签。
   - 收集 `[课程讲师tag, 场地tag, 系列tag, 分类tag]`，去重，调 `zhao-tag.service["tag-index"].sync("activity", activityDocId, tags)`。
2. `afterDelete`：`zhao-tag.service["tag-index"].remove("activity", activityDocId)`。

### 前端检索入口

点讲师/场地/系列/分类标签 → 活动列表：
1. `GET zhao-tag/v1/tag-indexes/search?tagId=...&targetType=activity` → 得 documentId 列表。
2. `GET /activities?documentIds=d1,d2,...&page=&pageSize=` → 活动列表（走公开 list，沿用 `status $notIn draft/archived` 过滤 + 角色门控）。

## 接口契约（供前端照用）

`GET /activities?documentIds=d1,d2,d3&page=1&pageSize=20`

- 返回 `rows[]`（活动完整字段，`populate:"*"`）+ `pagination`。
- `documentIds` 支持逗号分隔字符串或 JSON 数组两个查询参数，读入后并入 `filters.documentId = { $in: [...] }`。
- Strapi 5 的 `documents().findMany` 对 documentId 文本字段支持 `{ $in }` 过滤，无需关系表。

## 风险点与对策

1. **活动 lifecycle 取不到关系**：`event.result` 默认不含 `lecturer/venue/series` 关系，必须先 `populate` 再取 `*.tag`，否则索引漏写。对策：lifecycle 内显式 `findOne(documentId, { populate: { lecturer: { populate: ["tag"] }, venue: {...}, belongsToSeries: {...} } })`。
2. **系列硬删索引悬空**：系列硬删会使既有活动索引指向失效标签，但标签本体仍在 zhao-tag（无硬删钩子联动）。对策（最简）：接受标签悬空；后续如需要再加"系列硬删前扫活动移除索引"。
3. **findOrCreate 并发重复**：同分组同名并发可能建两条。对策：查时若多条取第一条，接受极低概率重复；不引入唯一约束。
4. **软删不刷索引**：讲师/场地 `disabled=true` 时旧活动索引保留，点标签仍能检索到已禁用讲师的历史活动。符合"保留历史"语义；若需隐藏，可后续在 list 过滤讲师 disabled 状态（本期不做）。

## 不做的事（YAGNI）

- 不在活动新增 m2m tags 关系（避免双索引镜像，M1 已确认）。
- 不反向写标签到资源（资源权威）。
- 不处理系列硬删扫索引（本期接受悬空）。
- 不加 Redis/唯一约束。

## 验收要点

- 讲师改名 → 影子标签 name 同步更新；改名前后的活动索引仍能检索到该讲师活动。
- 新建活动指定讲师/场地/系列/分类 → 点对应标签能检索到该活动。
- 活动改讲师 → 旧讲师索引移除、新讲师索引新增。
- 活动删除 → 该活动索引全部清除。
- 软删讲师 → 历史活动仍可按其标签检索。