# tag-group 修复与 tag.tagGroup 关系改造设计

## 目标

修复前端 `/zhao-tag/v1/admin/tag-groups?pageSize=200` 路由 404 问题。新建 tag-group content-type + API 层，并将 tag.group 从 string 类型改为 manyToOne 关系字段（重命名为 tagGroup），支持层级分组结构。

## 背景

### 现状矛盾

1. **tag-group 路由完全缺失**：前端 `web/src/api/tag.js` 调用 `/zhao-tag/v1/admin/tag-groups` 等 CRUD 路由，但 zhao-tag 插件没有 tag-group content-type/controller/service/route
2. **tag.group 类型不匹配**：tag schema 中 `group` 是 string 类型，但前端 `TagPicker.vue` 使用 `tag.group?.name`、`filters[group][documentId][$eq]`、`data.group = { documentId: xxx }`，期望它是关系类型
3. **字段名冲突风险**：`group` 在 SQL/Strapi 中是保留字，作为关系字段名可能引发歧义

### 业务目标

- 标签分组支持层级结构（parent/children）
- tag 与 tag-group 为多对一关系（一个 tag 属于一个分组）
- 自动迁移已有 tag.group 字符串数据到 tag-group 记录

## 架构

### 数据模型

**新建 tag-group content-type**（表 `zhao_tag_groups`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string required | 分组名称 |
| slug | uid (targetField: name) | 别名 |
| description | text | 描述 |
| color | string | 颜色标识 |
| icon | media | 图标 |
| sort | integer default 0 | 排序 |
| parent | manyToOne → plugin::zhao-tag.tag-group | 父分组（层级） |
| children | oneToMany ← tag-group (mappedBy: "parent") | 子分组 |
| tags | oneToMany → plugin::zhao-tag.tag (mappedBy: "tagGroup") | 分组下的标签（反向关系） |
| deletedAt | datetime default null | 软删除 |

**修改 tag schema：**
- 删除 `group` (string)
- 新增 `tagGroup` (manyToOne → plugin::zhao-tag.tag-group, inversedBy: "tags")

### API 层

| 文件 | 职责 |
|------|------|
| `content-types/tag-group/schema.json` | tag-group content-type 定义 |
| `content-types/index.ts` | 注册 tag-group |
| `services/tag-group.ts` | CRUD service（find/findOne/create/update/delete） |
| `controllers/tag-group.ts` | CRUD controller |
| `routes/content-api.ts` | 新增 7 条路由（公开 2 + 管理 5） |
| `permissions.ts` | 新增 4 条权限（read/create/update/delete） |

### 路由清单

**公开路由：**
- `GET /v1/tag-groups` — 列表
- `GET /v1/tag-groups/:documentId` — 详情

**管理路由：**
- `GET /v1/admin/tag-groups` — 列表（权限：tag-group.read）
- `GET /v1/admin/tag-groups/:documentId` — 详情（权限：tag-group.read）
- `POST /v1/admin/tag-groups` — 创建（权限：tag-group.create）
- `PUT /v1/admin/tag-groups/:documentId` — 更新（权限：tag-group.update）
- `DELETE /v1/admin/tag-groups/:documentId` — 删除（权限：tag-group.delete）

### 权限定义

```ts
"tag-group.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
"tag-group.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
"tag-group.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
"tag-group.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
```

## 数据迁移

### 迁移策略

**关键约束**：Strapi schema 重建会自动删除已移除的 `group` 列，因此迁移必须在 Strapi 启动前执行（独立脚本），否则数据会丢失。

**执行流程**：
1. **停止 Strapi**
2. **运行独立迁移脚本**（`scripts/migrate-tag-group.js`）：
   - 检测 tag 表是否存在 `group` 列，不存在则跳过（幂等）
   - 读取所有 `group` 字段非空的 tag 记录
   - 去重 group 字符串值，为每个唯一名称创建 tag-group 记录（在 `zhao_tag_groups` 表中，若表不存在则先创建）
   - 更新 tag 记录，写入 tag-group 关联（通过 join 表 `zhao_tags_tag_group_lnk`）
   - 删除 tag 表的 `group` 列
3. **启动 Strapi**：Strapi 检测到 schema 变更，重建元数据，自动创建 tag-group 表完整结构、tagGroup 关系 join 表

### 迁移脚本位置

`e:\code\basic\scripts\migrate-tag-group.js`（独立脚本，一次性执行）

### 迁移幂等性

通过检测 tag 表是否存在 `group` 列判断是否需要迁移。迁移完成后该列被删除，下次运行脚本时检测不到列即跳过。

### bootstrap 不做迁移

zhao-tag 的 `bootstrap()` 不执行迁移逻辑（避免与 Strapi schema 重建顺序冲突），仅做插件初始化。

## 改动清单

### zhao-tag 插件

#### 新增
- `content-types/tag-group/schema.json`
- `services/tag-group.ts`
- `controllers/tag-group.ts`

#### 修改
- `content-types/index.ts` — 注册 tag-group
- `content-types/tag/schema.json` — 删除 group，新增 tagGroup manyToOne
- `services/index.ts` — 注册 tag-group service
- `controllers/index.ts` — 注册 tag-group controller
- `routes/content-api.ts` — 新增 tag-group 路由
- `permissions.ts` — 新增 tag-group 权限

### 数据库迁移脚本

- `e:\code\basic\scripts\migrate-tag-group.js`（独立脚本，一次性执行）

### 前端

#### 修改 `web/src/components/TagPicker.vue`
- `tag.group?.name` → `tag.tagGroup?.name`
- `filters[group][documentId][$eq]` → `filters[tagGroup][documentId][$eq]`
- `data.group = { documentId: xxx }` → `data.tagGroup = { documentId: xxx }`

#### 前端 api/tag.js 无需改动
URL 路径 `/zhao-tag/v1/admin/tag-groups` 已正确，本次后端补全路由即可生效。

## 风险与约束

1. **Strapi v5 schema 强制迁移**：tag schema 变更（删除 group 列、新增 tagGroup 关系）需删除 `strapi_database_schema` 元数据强制重建
2. **数据迁移顺序**：bootstrap 必须在 Strapi schema 重建之前执行迁移，否则 group 列已被删除无法读取数据
3. **迁移幂等性**：通过检测 group 列存在性保证只执行一次
4. **前端兼容**：TagPicker.vue 必须同步修改字段名，否则 tagGroup 关系数据无法正确显示

## 验收标准

1. 前端访问 `/zhao-tag/v1/admin/tag-groups?pageSize=200` 返回 200 + tag-group 列表
2. tag-group 支持层级结构（parent/children populate 正常）
3. tag.tagGroup 关系正常工作（创建 tag 时可关联 tag-group）
4. 已有 tag.group 字符串数据已迁移为 tag-group 记录
5. TagPicker.vue 显示分组列表、按分组过滤标签、创建 tag 时关联分组均正常
