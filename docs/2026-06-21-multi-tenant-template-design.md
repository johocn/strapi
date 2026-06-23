# 多租户模板配置方案设计文档

## 概述

在现有 zhao-common 站点配置体系上，新增模板（site-template）机制，支持：
1. **预设值**：租户创建时从模板初始化配置
2. **字段级约束**：模板定义配置项的可见性和可编辑性，租户只能在约束范围内调整

## 数据模型

### 新增 site-template content-type

文件：`plugins/zhao-common/server/src/content-types/site-template/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_site_templates",
  "info": {
    "singularName": "site-template",
    "pluralName": "site-templates",
    "displayName": "站点模板",
    "description": "租户配置模板，定义预设值和字段约束"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    "description": {
      "type": "text"
    },
    "presetConfig": {
      "type": "json",
      "required": true
    },
    "fieldConstraints": {
      "type": "json",
      "required": true
    },
    "enabled": {
      "type": "boolean",
      "default": true
    },
    "isDefault": {
      "type": "boolean",
      "default": false
    },
    "sites": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-common.site-config",
      "mappedBy": "template"
    }
  }
}
```

### fieldConstraints 结构

```json
{
  "<fieldName>": {
    "visible": true,    // 前端是否显示该配置项
    "editable": true    // 租户是否可修改该配置项
  }
}
```

- `visible: false` → 前端不显示（模板锁定）
- `editable: false` → 前端显示但只读
- 未定义的字段 → 默认 `visible: true, editable: true`

### 修改 site-config schema

新增关联字段：

```json
"template": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-template",
  "inversedBy": "sites"
}
```

## 后端逻辑

### 1. 配置读取（合并逻辑）

`config.ts` 的 `getSiteConfig` 方法：

1. 获取租户的 `extraConfig`
2. 获取关联模板的 `presetConfig`（若有模板）
3. 合并：模板预设值 ← 租户自定义值（租户值覆盖模板值）
4. 返回合并结果 + 模板的 `fieldConstraints`

返回格式：
```json
{
  "siteName": "...",
  "authMode": "third",
  "pointsEnabled": true,
  "_meta": {
    "templateId": "xxx",
    "templateName": "教育标准版",
    "fieldConstraints": {
      "authMode": { "visible": true, "editable": false },
      "pointsEnabled": { "visible": true, "editable": true }
    }
  }
}
```

### 2. 配置更新（约束校验）

`config.ts` 的 `updateSiteConfig` 方法：

1. 获取租户关联的模板 `fieldConstraints`
2. 遍历要更新的字段：
   - 未在 constraints 中定义 → 允许
   - `editable: true` → 允许
   - `editable: false` → 拒绝，返回 403 + 错误信息
3. 校验通过后，只保存到租户的 `extraConfig`

### 3. 租户创建（模板初始化）

创建新 site-config 时：
1. 传入 `templateId` 选择模板
2. 将模板的 `presetConfig` 复制到租户的 `extraConfig`
3. 关联模板到租户（设置 template 关联）

### 4. 模板切换

切换模板时：
1. 新模板的 `presetConfig` 覆盖租户的 `extraConfig`
2. 更新 template 关联
3. 注意：会丢失租户之前的自定义配置

### 5. 新增 API

在 `plugins/zhao-common/server/src/routes/content-api.ts` 中新增：

```
GET    /v1/admin/templates                    列出所有模板
POST   /v1/admin/templates                    创建模板
GET    /v1/admin/templates/:documentId         获取模板详情
PUT    /v1/admin/templates/:documentId         更新模板
DELETE /v1/admin/templates/:documentId         删除模板
```

权限：`template.read`、`template.create`、`template.update`、`template.delete`

### 6. 新增 service

`plugins/zhao-common/server/src/services/site-template.ts`：

- `listTemplates(filters)` - 列出模板
- `getTemplate(documentId)` - 获取模板
- `createTemplate(data)` - 创建模板
- `updateTemplate(documentId, data)` - 更新模板
- `deleteTemplate(documentId)` - 删除模板
- `getDefaultTemplate()` - 获取默认模板
- `applyTemplateToSite(templateDocumentId, siteDocumentId)` - 将模板应用到站点
- `getMergedConfig(siteId)` - 获取合并后的配置（模板预设 + 租户自定义）
- `validateUpdate(siteId, updateData)` - 校验更新是否在约束范围内

### 7. 新增 controller

`plugins/zhao-common/server/src/controllers/site-template.ts`：

标准 CRUD 控制器，代理调用 service。

## 前端改动

### 管理后台（web）

1. 新增模板管理页面：模板列表、创建/编辑模板
   - 编辑 presetConfig：与站点配置页面结构一致
   - 编辑 fieldConstraints：每个配置项旁有"可见"、"可编辑"开关
2. 站点配置页面改造：
   - 读取 `_meta.fieldConstraints`
   - `visible: false` 的配置项隐藏
   - `editable: false` 的配置项显示为只读
3. 创建租户时增加模板选择

### C 端（shao）

无需改动，C 端只读取配置值，不涉及模板逻辑。

## 涉及文件清单

### 后端（zhao-common 插件）

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/content-types/site-template/schema.json` | 新增 | 模板数据结构 |
| `server/src/content-types/site-template/index.ts` | 新增 | 模板 content-type 导出 |
| `server/src/content-types/index.ts` | 修改 | 导出新 content-type |
| `server/src/content-types/site-config/schema.json` | 修改 | 新增 template 关联 |
| `server/src/services/site-template.ts` | 新增 | 模板服务 |
| `server/src/services/index.ts` | 修改 | 导出新服务 |
| `server/src/controllers/site-template.ts` | 新增 | 模板控制器 |
| `server/src/controllers/index.ts` | 修改 | 导出新控制器 |
| `server/src/routes/content-api.ts` | 修改 | 新增模板路由 |
| `server/src/services/config.ts` | 修改 | 配置读取合并 + 更新校验 |
| `server/src/controllers/config.ts` | 修改 | getSite 返回 _meta |
| `server/src/bootstrap.ts` | 修改 | 初始化默认模板 |

### 前端（web 管理后台）

| 文件 | 操作 | 说明 |
|------|------|------|
| `pages/settings/site-template.vue` | 新增 | 模板管理页面 |
| `pages/settings/site-config.vue` | 修改 | 根据约束控制显示/只读 |
| `src/api/site-template.js` | 新增 | 模板 API |
