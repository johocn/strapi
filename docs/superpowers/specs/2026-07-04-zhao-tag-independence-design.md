# zhao-tag 独立化设计

## 目标

将 zhao-tag 改造为通用标签体系插件，独立承担 tag / knowledge-point / tag-index 三类业务的 content-type、API、服务。从 zhao-course 中移除标签和知识点的 controller/service/routes，让 zhao-tag 通过自身路由对外提供 API。zhao-tag 不感知业务方，反向查询统一由 tag-index 服务承担。

## 背景

### 现状矛盾

1. **content-type 归属 vs API 归属不一致**：tag / knowledge-point 的 schema 在 zhao-tag，但 knowledge-point 的 controller/service/routes 在 zhao-course 下（且 service UID 错写为 `plugin::zhao-course.knowledge-point`，运行时会报 content-type 不存在）
2. **zhao-tag 缺少 API 层**：插件只有 content-types，没有 controllers/services/routes，前端调用 `/zhao-tag/v1/admin/knowledge-points` 直接 404
3. **tag-index service 不存在**：zhao-course 的 course / course-lesson lifecycle 调用 `strapi.plugin("zhao-tag").service("tag-index").sync/remove`，但 zhao-tag 中根本没有该 service
4. **反向关系污染通用化**：tag schema 持有 `lessons`/`courses`/`knowledgePoints` 反向字段，knowledge-point schema 持有 `courses` 反向字段，且 `tag.knowledgePoints` 的 target 错误指向 `plugin::zhao-course.knowledge-point`
5. **quiz 缺失 tags 关系**：题库需要按标签过滤，但 quiz schema 只有 knowledgePoints，没有 tags

### 业务目标

支持通过以下维度过滤课程、课时、题库：
- 渠道（channel）
- 分类（category）
- 模糊标题（name $contains）
- 标签（tag）
- 知识点（knowledge-point）

以上均为**正向查询**（从业务方 schema 按关系过滤），不依赖 zhao-tag 持有反向关系。

## 架构

### 插件定位

zhao-tag 是通用标签体系插件，为所有业务（course/lesson/quiz/未来其他内容）提供：
- **tag**（标签）：扁平 + 层级树，可被任何业务内容多对多引用
- **knowledge-point**（知识点）：层级知识树，可被任何业务内容多对多引用
- **tag-index**（标签索引）：跨业务反向检索服务，由各业务方在 lifecycle 中调用同步

### 关系策略

**zhao-tag schema 不持有任何业务方反向关系**，纯通用化：
- 移除 `tag.lessons`、`tag.courses`、`tag.knowledgePoints`
- 移除 `knowledge-point.courses`

**业务方 schema 持有正向关系**，移除 `inversedBy` 声明（关系仍可用，仅不再被 zhao-tag 反向持有）：
- `course.tags`（manyToMany → zhao-tag.tag）
- `course.knowledgePoints`（manyToMany → zhao-tag.knowledge-point）
- `course-lesson.tags`（manyToMany → zhao-tag.tag）
- `quiz.knowledgePoints`（manyToMany → zhao-tag.knowledge-point）
- `quiz.tags`（manyToMany → zhao-tag.tag）— 新增

**反向查询场景由 tag-index 服务承担**：
- 标签管理页"被引用次数"统计
- 跨业务全文检索（按 tag 聚合课程/课时/题库混合内容）

### 文件结构（zhao-tag 新建 API 层）

```
plugins/zhao-tag/server/src/
├── content-types/
│   ├── tag/
│   │   └── schema.json          # 修改：移除 lessons/courses/knowledgePoints
│   ├── knowledge-point/
│   │   └── schema.json          # 修改：移除 courses
│   ├── tag-index/
│   │   └── schema.json          # 新增：标签索引 content-type
│   └── index.ts                 # 修改：注册 tag-index
├── controllers/
│   ├── index.ts                 # 新增
│   ├── tag.ts                   # 新增
│   ├── knowledge-point.ts       # 新增
│   └── tag-index.ts             # 新增（可选：管理端查看索引）
├── services/
│   ├── index.ts                 # 新增
│   ├── tag.ts                   # 新增
│   ├── knowledge-point.ts       # 新增
│   └── tag-index.ts             # 新增：sync/remove/searchByTag
├── routes/
│   ├── index.ts                 # 新增
│   └── content-api.ts           # 新增：遵循 zhao-course 三层路由规范
├── policies/
│   └── index.ts                 # 新增（占位，目前无自定义 policy）
├── permissions.ts               # 新增：tag.* / knowledge-point.* / tag-index.* 权限
└── index.ts                     # 修改：注册 controllers/services/routes
```

### 路由规范（对齐 zhao-course）

| 类型 | 前缀 | 鉴权 | 策略链 |
|------|------|------|--------|
| publicRoute | `/v1/...` | 无 | `plugin::zhao-auth.has-channel-scope` |
| userRoute | `/v1/...` | 无 | `plugin::zhao-auth.is-authenticated` |
| channelScopeRoute | `/v1/admin/...` | 无 | is-authenticated + has-permission + has-channel-scope + has-tenant-access |

路由清单：
- 公开：`GET /v1/tags`, `GET /v1/tags/:documentId`, `GET /v1/knowledge-points`, `GET /v1/knowledge-points/:documentId`
- 管理 tag：`GET/POST /v1/admin/tags`, `GET/PUT/DELETE /v1/admin/tags/:documentId`
- 管理 knowledge-point：`GET/POST /v1/admin/knowledge-points`, `GET/PUT/DELETE /v1/admin/knowledge-points/:documentId`
- 管理 tag-index（可选）：`GET /v1/admin/tag-indexes`（查看索引列表）

## 数据模型

### tag-index content-type

表名：`zhao_tag_indexes`

| 字段 | 类型 | 说明 |
|------|------|------|
| targetType | string required | 业务类型，如 `course` / `lesson` / `quiz` |
| targetId | string required | 业务记录 documentId |
| tag | manyToOne → plugin::zhao-tag.tag required | 关联标签 |

唯一约束：`(targetType, targetId, tag)` 防止重复索引。

### 业务方过滤查询示例（Strapi 规范）

```js
// 按渠道+分类+模糊标题+标签+知识点 过滤课程
strapi.documents('plugin::zhao-course.course').findMany({
  filters: {
    $and: [
      { channel: { documentId: channelId } },
      { category: { documentId: categoryId } },
      { name: { $contains: keyword } },
      { tags: { documentId: { $in: tagIds } } },
      { knowledgePoints: { documentId: { $in: kpIds } } },
    ]
  },
  populate: { category: true, tags: true, knowledgePoints: true }
})
```

课时、题库过滤同理。

## 改动清单

### zhao-tag 插件

#### 修改

- `content-types/tag/schema.json`：移除 `lessons`、`courses`、`knowledgePoints` 三个反向字段
- `content-types/knowledge-point/schema.json`：移除 `courses` 反向字段
- `content-types/index.ts`：注册 `tag-index`
- `index.ts`：注册 controllers/services/routes

#### 新增

- `content-types/tag-index/schema.json`
- `controllers/index.ts`、`controllers/tag.ts`、`controllers/knowledge-point.ts`、`controllers/tag-index.ts`
- `services/index.ts`、`services/tag.ts`、`services/knowledge-point.ts`、`services/tag-index.ts`
- `routes/index.ts`、`routes/content-api.ts`
- `policies/index.ts`
- `permissions.ts`

### zhao-course 插件

#### 删除

- `controllers/knowledge-point.ts`
- `services/knowledge-point.ts`

#### 修改

- `controllers/index.ts`：移除 `knowledge-point` 导入和注册
- `services/index.ts`：移除 `knowledge-point` 导入和注册
- `routes/content-api.ts`：移除 knowledge-point 相关 7 条路由（公开 2 + 管理 5）
- `permissions.ts`：移除 `knowledge-point.*` 4 条权限
- `content-types/course/schema.json`：`tags` 移除 `inversedBy: "courses"`
- `content-types/course-lesson/schema.json`：`tags` 移除 `inversedBy: "lessons"`

#### 保留（业务方自身引用 zhao-tag，不属于"标签业务在 course 下"）

- `course/schema.json` 的 `tags`、`knowledgePoints` 正向关系
- `course-lesson/schema.json` 的 `tags` 正向关系
- `services/course.ts` 的 tag/knowledgePoint 验证逻辑和 populate 配置
- `services/course-lesson.ts` 的 populate tags
- `content-types/course/lifecycles.ts`、`course-lesson/lifecycles.ts` 的 tag-index 同步调用（依赖 zhao-tag 的 tag-index service）

### zhao-quiz 插件

#### 修改

- `content-types/quiz/schema.json`：新增 `tags` 正向关系（manyToMany → plugin::zhao-tag.tag）

### 前端

无需改动。`web/src/api/tag.js` 调用的 `/zhao-tag/v1/admin/knowledge-points` 等 URL 将随本次后端改造自动生效。

## 数据迁移

### 数据库 schema 变更

1. **新建表** `zhao_tag_indexes`（由 Strapi content-type 自动创建）
2. **修改表** `zhao_tags`：删除 `lessons`、`courses`、`knowledgePoints` 关联（Strapi 会清理对应 join 表或外键）
3. **修改表** `zhao_knowledge_points`：删除 `courses` 关联
4. **修改表** `zhao_quizzes`：新增 `tags` 关联（自动创建 join 表）

### Strapi v5 schema 强制迁移

Strapi v5 不会在 schema 变更后自动迁移已有表结构，需要：
1. 删除 `strapi_database_schema` 表中相关元数据记录，强制重建
2. 或手动执行 SQL 调整表结构

具体迁移脚本在实施计划中细化。

## tag-index 服务设计

```ts
// services/tag-index.ts
export default ({ strapi }) => ({
  // 业务方 lifecycle 调用：同步标签索引
  async sync(targetType: string, targetId: string, tagIds: string[]) {
    // 1. 查询现有索引（targetType + targetId）
    // 2. 计算差集：新增的 tagIds 入库，移除的 tagIds 删除
    // 3. upsert 到 zhao_tag_indexes 表
  },

  // 业务方 lifecycle 调用：删除某业务记录的所有索引
  async remove(targetType: string, targetId: string) {
    // 删除 targetType + targetId 对应的所有索引记录
  },

  // 跨业务检索：按 tag 查所有关联内容
  async searchByTag(tagId: string, targetType?: string) {
    // 查询 zhao_tag_indexes，可选按 targetType 过滤
    // 返回 [{ targetType, targetId }]
  },

  // 统计：标签被引用次数
  async countByTag(tagId: string) {
    // count zhao_tag_indexes where tag = tagId
  },
});
```

业务方 lifecycle 调用示例（zhao-course 已有，无需改动）：

```ts
// course/lifecycles.ts
async afterCreate(event) {
  const { result } = event;
  const tagIds = (result.tags || []).map(t => t.documentId).filter(Boolean);
  await strapi.plugin("zhao-tag").service("tag-index").sync("course", result.documentId, tagIds);
}
```

## 风险与约束

1. **Strapi v5 schema 迁移**：content-type 变更后需强制重建表结构，可能丢失测试数据（生产环境需备份）
2. **join 表命名**：Strapi v5 manyToMany join 表命名规则为 `{table1}_{table2}_lnk`，移除反向关系后 join 表会重建
3. **tag-index 数据回填**：现有 course/lesson 已有 tag 关系，需要在 bootstrap 时回填一次 tag-index（可选，按需）
4. **zhao-tag 插件构建**：新增 API 层后需要执行 `npm run build` 重新生成 dist bundle

## 验收标准

1. 前端访问 `/zhao-tag/v1/admin/knowledge-points?pageSize=200` 返回 200 + 知识点列表
2. 前端访问 `/zhao-tag/v1/admin/tags` 返回 200 + 标签列表
3. zhao-course 的 `/zhao-course/v1/admin/knowledge-points` 路由不再存在（404）
4. course/lesson/quiz 的按 tag/kp 过滤查询正常工作
5. zhao-course 的 lifecycle 调用 tag-index sync/remove 不再报错
6. zhao-tag schema 中不再有任何 `plugin::zhao-course.*` 引用
