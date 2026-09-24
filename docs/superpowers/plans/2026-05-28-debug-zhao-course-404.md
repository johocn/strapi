# 调试 zhao-course 404 Not Found 问题计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 找出并修复 `/zhao-course/admin/courses` 路由返回 404 的问题

**Architecture:** 分步骤验证：插件编译 → 路由注册 → 服务启动 → 请求测试

**Tech Stack:** Strapi 5, TypeScript, Node.js

---

## 问题现象

```
Request URL: http://localhost:1337/zhao-course/admin/courses
Request Method: GET
Status Code: 404 Not Found
```

---

## Task 1: 验证插件编译状态

**Files:**
- Check: `e:\code\plugins\zhao-course\dist\server\index.js`
- Check: `e:\code\plugins\zhao-course\strapi-server.js`

- [ ] **Step 1: 检查 dist 目录是否存在**

```powershell
Test-Path e:\code\plugins\zhao-course\dist\server\index.js
```

Expected: `True` (如果 False，说明插件未编译)

- [ ] **Step 2: 检查 strapi-server.js 内容**

```powershell
Get-Content e:\code\plugins\zhao-course\strapi-server.js
```

Expected:
```javascript
"use strict";
module.exports = require("./dist/server/index.js");
```

- [ ] **Step 3: 如果 dist 不存在，编译插件**

```powershell
cd e:\code\plugins\zhao-course
npm run build
```

Expected: 编译成功，无错误

---

## Task 2: 验证路由配置

**Files:**
- Check: `e:\code\plugins\zhao-course\server\src\routes\index.ts`
- Check: `e:\code\plugins\zhao-course\server\src\routes\courses-admin.ts`

- [ ] **Step 1: 检查路由 index.ts 是否导出 courses-admin**

```typescript
// e:\code\plugins\zhao-course\server\src\routes\index.ts
import coursesAdmin from "./courses-admin";

export default {
  // ...
  "courses-admin": coursesAdmin,
};
```

- [ ] **Step 2: 检查 courses-admin.ts 路由配置**

```typescript
// e:\code\plugins\zhao-course\server\src\routes\courses-admin.ts
export default () => ({
  type: "content-api" as const,
  routes: [
    {
      method: "GET" as const,
      path: "/admin/courses",
      handler: "course.find",
      // ...
    },
  ],
});
```

Expected: `type: "content-api"`, `path: "/admin/courses"`

---

## Task 3: 验证控制器存在

**Files:**
- Check: `e:\code\plugins\zhao-course\server\src\controllers\index.ts`
- Check: `e:\code\plugins\zhao-course\server\src\controllers\course.ts`

- [ ] **Step 1: 检查控制器导出**

```typescript
// e:\code\plugins\zhao-course\server\src\controllers\index.ts
export default {
  course: require("./course"),
  // ...
};
```

- [ ] **Step 2: 检查 course 控制器 find 方法**

```typescript
// e:\code\plugins\zhao-course\server\src\controllers\course.ts
module.exports = {
  find: async (ctx) => { /* ... */ },
  // ...
};
```

---

## Task 4: 清理缓存并重启

- [ ] **Step 1: 清理所有缓存**

```powershell
Remove-Item -Recurse -Force e:\code\basic\.tmp -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force e:\code\basic\.strapi -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force e:\code\plugins\zhao-course\dist -ErrorAction SilentlyContinue
```

- [ ] **Step 2: 重新编译插件**

```powershell
cd e:\code\plugins\zhao-course
npm run build
```

Expected: 编译成功

- [ ] **Step 3: 启动服务并观察日志**

```powershell
cd e:\code\basic
npm run dev
```

Expected: 无错误，显示 `zhao-course: has-course-permission 策略已注册`

---

## Task 5: 测试路由

- [ ] **Step 1: 测试路由是否存在**

使用 curl 或 Postman:
```
GET http://localhost:1337/zhao-course/admin/courses
Header: Authorization: Bearer <token>
```

Expected: 200 OK 或 403 Forbidden (权限问题) 而非 404

- [ ] **Step 2: 如果仍返回 404，添加调试日志**

在 `e:\code\plugins\zhao-course\server\src\bootstrap.ts` 中添加:
```typescript
const pluginRoutes = require("./routes").default;
strapi.log.info("zhao-course routes:", Object.keys(pluginRoutes));
```

重启服务，查看日志输出的路由列表。

---

## 常见问题检查清单

1. **插件未编译**: `dist` 目录不存在 → 运行 `npm run build`
2. **strapi-server.js 错误**: 内容不是导出语句 → 修复为 `module.exports = require("./dist/server/index.js")`
3. **路由未注册**: `index.ts` 未导出路由文件 → 添加导出
4. **控制器不存在**: handler 指向不存在的控制器 → 检查控制器文件
5. **缓存问题**: 旧编译结果残留 → 清理所有缓存
6. **插件加载顺序**: 元数据错误 → 检查 plugins.ts 中的顺序
