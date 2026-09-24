# zhao-auth 权限系统深度开发设计

## 概述

为 zhao-auth 插件添加菜单/按钮级别的细粒度权限控制，采用**树形权限项 + 角色映射表**方案。权限项由代码定义（`permissions.ts`），角色-权限映射存数据库，前端登录时拉取缓存。

## 一、后端开发

### 1.1 改造 permissions.ts

从扁平 map 升级为树形结构，定义所有菜单和按钮权限项：

```typescript
export interface PermissionItem {
  label: string;
  type: "menu" | "button";
  children?: Record<string, PermissionItem>;
}

export const PERMISSION_TREE: Record<string, PermissionItem> = {
  "menu.course-center": { label: "课程中心", type: "menu", children: {
    "menu.course":   { label: "课程管理", type: "menu", children: {
      "course.create":  { label: "新增课程", type: "button" },
      "course.update":  { label: "编辑课程", type: "button" },
      "course.publish": { label: "发布课程", type: "button" },
      "course.delete":  { label: "删除课程", type: "button" },
    }},
    "menu.lesson":   { label: "课时管理", type: "menu", children: {
      "lesson.create": { label: "新增课时", type: "button" },
      "lesson.delete": { label: "删除课时", type: "button" },
    }},
    "menu.category": { label: "课程分类", type: "menu" },
    "menu.tag":      { label: "课程标签", type: "menu" },
    "menu.auth":     { label: "用户授权", type: "menu" },
  }},
  "menu.study-center": { label: "学习数据", type: "menu", children: {
    "menu.progress":        { label: "课程进度", type: "menu" },
    "menu.lesson-progress": { label: "课时进度", type: "menu" },
  }},
  "menu.quiz-center": { label: "题库系统", type: "menu", children: {
    "menu.quiz":     { label: "题库管理", type: "menu", children: {
      "quiz.create": { label: "新增题目", type: "button" },
      "quiz.delete": { label: "删除题目", type: "button" },
    }},
    "menu.knowledge":  { label: "知识点", type: "menu" },
    "menu.exam":       { label: "考试管理", type: "menu", children: {
      "exam.create": { label: "新增考试", type: "button" },
      "exam.delete": { label: "删除考试", type: "button" },
    }},
    "menu.quiz-record": { label: "答题记录", type: "menu" },
  }},
  "menu.point-center": { label: "积分体系", type: "menu", children: {
    "menu.point-type":   { label: "积分类型", type: "menu" },
    "menu.point-rule":   { label: "积分规则", type: "menu" },
    "menu.point-record": { label: "积分记录", type: "menu" },
    "menu.product":      { label: "积分产品", type: "menu" },
    "menu.exchange":     { label: "兑换记录", type: "menu" },
    "menu.point-stat":   { label: "积分统计", type: "menu" },
    "menu.point-config": { label: "积分配置", type: "menu" },
  }},
  "menu.marketing-center": { label: "营销运营", type: "menu", children: {
    "menu.channel":          { label: "渠道管理", type: "menu" },
    "menu.network":          { label: "渠道网络", type: "menu" },
    "menu.members":          { label: "成员管理", type: "menu" },
    "menu.invite":           { label: "分销邀请", type: "menu" },
    "menu.redemption-code":  { label: "兑换码", type: "menu" },
    "menu.redemption-record": { label: "兑换记录", type: "menu" },
  }},
  "menu.system-center": { label: "系统工具", type: "menu", children: {
    "menu.media":         { label: "媒体资源", type: "menu" },
    "menu.feature-flag":  { label: "功能开关", type: "menu" },
    "menu.verification":  { label: "验证记录", type: "menu" },
    "menu.user-roles":    { label: "用户角色", type: "menu" },
    "menu.role-logs":     { label: "操作日志", type: "menu" },
  }},
};
```

新增工具函数：
```typescript
// 递归展开权限树为扁平数组
export function flattenPermissions(tree: Record<string, PermissionItem>): string[] { ... }

// 获取权限 key 的所有子权限（含自身）
export function expandPermissionKeys(keys: string[], tree: Record<string, PermissionItem>): string[] { ... }
```

### 1.2 新增 permission content-type

`server/src/content-types/permission/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "zhao_permissions",
  "info": { "singularName": "permission", "pluralName": "permissions", "displayName": "角色权限" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "role": { "type": "string", "required": true, "unique": true },
    "permissions": { "type": "json", "required": true }
  }
}
```

### 1.3 新增 permission 服务

`server/src/services/permission.service.ts`:
- `getPermissionTree()` — 返回权限树定义
- `getRolePermissions(role)` — 获取某角色的权限列表
- `updateRolePermissions(role, keys[])` — 更新某角色的权限列表
- `getMyPermissions(userId)` — 获取用户所有权限（展开继承后）
- `initDefaultPermissions()` — 初始化默认权限
- `expandKeys(keys[])` — 递归展开权限 key（含子权限）

### 1.4 新增 permission 控制器

`server/src/controllers/permission.ts`:
- `getTree(ctx)` — GET /permissions/tree
- `getRolePermissions(ctx)` — GET /permissions/role/:role
- `updateRolePermissions(ctx)` — PUT /permissions/role/:role
- `getMyPermissions(ctx)` — GET /permissions/my
- `initPermissions(ctx)` — POST /permissions/init

### 1.5 新增路由

`server/src/routes/admin.ts` 新增:
```
GET  /permissions/tree          → permission.getTree
GET  /permissions/role/:role    → permission.getRolePermissions
PUT  /permissions/role/:role    → permission.updateRolePermissions
POST /permissions/init          → permission.initPermissions
```

`server/src/routes/content-api/index.ts` 新增:
```
GET  /permissions/my            → permission.getMyPermissions (用户端)
```

### 1.6 增强 has-auth-permission 策略

改造现有策略，优先查数据库 permission 记录，fallback 到 PERMISSIONS 常量。

### 1.7 默认权限初始化

| 角色 | 默认权限 |
|------|---------|
| admin | 全部权限（`flattenPermissions(PERMISSION_TREE)`） |
| channel-admin | 除系统工具外的所有权限 |
| plugin-manager | 课程中心+题库系统+积分体系 |
| instructor | menu.course-center(含 menu.course 只读)、menu.study-center |
| user | 无管理端权限 |

## 二、前端开发

### 2.1 API 层

`src/api/auth.js` 新增:
```javascript
export function getPermissionTree() { ... }
export function getRolePermissions(role) { ... }
export function updateRolePermissions(role, permissions) { ... }
export function getMyPermissions() { ... }
export function initPermissions() { ... }
```

### 2.2 Store 层

`src/store/user.js` 新增:
```javascript
const permissions = ref([])

async function fetchPermissions() {
  const res = await getMyPermissions()
  permissions.value = res.permissions  // 展开后的扁平数组
}

function hasPermission(key) {
  return permissions.value.includes(key)
}
```

登录流程增加 `fetchPermissions()` 调用。

### 2.3 Dashboard 菜单控制

将所有 module-item 加上 `v-if="hasPermission('menu.xxx')"`:
```vue
<view v-if="hasPermission('menu.course')" class="module-item" ...>
  课程管理
</view>
```

### 2.4 列表页按钮控制

各列表页的操作按钮加上 `v-if="hasPermission('xxx.create/delete/publish')"`:
```vue
<button v-if="hasPermission('course.create')" @click="goAdd">+ 新增</button>
<button v-if="hasPermission('course.delete')" @click="handleDelete(item)">删除</button>
<button v-if="hasPermission('course.publish')" @click="handlePublish(item)">发布</button>
```

涉及页面：
- course/list.vue — 新增、删除、发布
- course/detail.vue — 发布、下架、编辑
- course/lesson/list.vue — 新增、删除
- quiz/list.vue — 新增、删除
- quiz/exam/list.vue — 新增、删除
- points/types.vue — 新增、编辑、删除
- points/rules.vue — 新增、编辑、删除
- points/products.vue — 新增、编辑、删除
- channel/list.vue — 新增、删除
- channel/members.vue — 新增、删除

### 2.5 权限管理页面

新增 `pages/system/permissions.vue`:
- 左侧角色列表（5 个角色）
- 右侧权限树 checkbox（树形勾选，父→子自动继承）
- 保存时提交角色→权限映射
- 在 pages.json 注册路由
- 在 Dashboard 系统工具中添加入口

### 2.6 替换现有权限检查

- `userStore.hasRoleManagementPermission` → `hasPermission('menu.user-roles')`
- `checkRoleAuth()` → `hasPermission('menu.xxx')`（各页面按需替换）

## 三、开发顺序

1. 后端：permissions.ts 改造 + 工具函数
2. 后端：permission content-type + 注册
3. 后端：permission 服务 + 控制器 + 路由
4. 后端：has-auth-permission 策略增强
5. 后端：npm run build
6. 前端：API 层 + Store 层
7. 前端：Dashboard 菜单权限控制
8. 前端：列表页按钮权限控制
9. 前端：权限管理页面
10. 前端：替换旧权限检查方式
