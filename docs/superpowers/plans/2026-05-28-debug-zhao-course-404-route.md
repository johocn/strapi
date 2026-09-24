# 修复 zhao-course 404 路由问题调试计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `/zhao-course/admin/courses` 路由 404 Not Found 问题

**Architecture:** 
- Strapi 5 插件路由机制：`router.type ?? 'admin'` + `router.prefix ?? '/${pluginName}'`
- `type: "content-api"` + prefix `/zhao-course` + path `/admin/courses` = 最终路由 `/zhao-course/admin/courses`
- 路由配置正确，需要排查其他原因

**Tech Stack:** Strapi 5, TypeScript, Node.js

---

## 问题分析

### 已确认正确的配置

1. **路由配置** (`courses-admin.ts`):
   - `type: "content-api"` ✅
   - `path: "/admin/courses"` ✅
   - `handler: "course.find"` ✅

2. **路由导出** (`routes/index.ts`):
   - `"courses-admin": coursesAdmin` ✅

3. **编译产物** (`dist/server/index.js`):
   - 路由已正确编译 ✅

4. **控制器** (`controllers/course.ts`):
   - `find` 方法存在 ✅

### 可能的问题原因

1. **插件未正确加载** - strapi-server.js 入口问题
2. **缓存问题** - .cache 或 .strapi 缓存未清理
3. **路由注册顺序** - 其他路由覆盖
4. **中间件问题** - auth-middleware 配置错误导致路由未注册

---

## 调试任务

### Task 1: 验证插件入口文件

**Files:**
- Check: `e:\code\plugins\zhao-course\strapi-server.js`

- [ ] **Step 1: 检查 strapi-server.js 内容**

```javascript
// 正确的内容应该是：
"use strict";
module.exports = require("./dist/server/index.js");
```

- [ ] **Step 2: 如果内容错误，修复它**

```javascript
"use strict";
module.exports = require("./dist/server/index.js");
```

---

### Task 2: 清理缓存并重新编译

**Files:**
- Delete: `e:\code\plugins\zhao-course\.cache`
- Delete: `e:\code\plugins\zhao-course\.strapi`
- Delete: `e:\code\basic\.cache`
- Delete: `e:\code\basic\.strapi`

- [ ] **Step 1: 清理插件缓存**

```bash
rm -rf e:/code/plugins/zhao-course/.cache e:/code/plugins/zhao-course/.strapi
```

- [ ] **Step 2: 清理主项目缓存**

```bash
rm -rf e:/code/basic/.cache e:/code/basic/.strapi
```

- [ ] **Step 3: 重新编译插件**

```bash
cd e:/code/plugins/zhao-course && npm run build
```

---

### Task 3: 添加路由调试日志

**Files:**
- Modify: `e:\code\plugins\zhao-course\server\src\register.ts`

- [ ] **Step 1: 在 register 函数中添加路由调试日志**

```typescript
import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const zhaoCommon = strapi.plugin("zhao-common");
    if (!zhaoCommon) {
      strapi.log.warn("zhao-course: zhao-common 插件未启用，i18n 未注册");
      return;
    }
    const i18n = zhaoCommon.service("i18n");
    if (!i18n || typeof i18n.setMessages !== "function") {
      strapi.log.warn("zhao-course: zhao-common i18n 服务不可用");
      return;
    }
    i18n.setMessages({
      COURSE_001: "课程不存在 (id={courseId})",
      COURSE_002: "课程未启用积分",
      COURSE_003: "课程积分已领取",
      COURSE_004: "课程未完成，无法领取积分",
      COURSE_005: "无权访问该课程",
      COURSE_006: "课程授权已过期",
      COURSE_007: "课程为收费课程，请先购买",
      COURSE_008: "无可领取课程积分",
      LESSON_001: "课时不存在 (id={lessonId})",
      LESSON_002: "课时未启用积分",
      LESSON_003: "课时积分已领取",
      LESSON_004: "课时未完成，无法领取积分",
      LESSON_005: "课时需答题才能获得积分",
      LESSON_006: "答题错误，无法获得积分",
      LESSON_007: "无可领取课时积分",
      PROGRESS_001: "学习进度记录不存在",
      PROGRESS_002: "非法进度上报"
    });
  } catch (err) {
    strapi.log.warn("zhao-course: i18n 注册失败", err);
  }
  
  // 添加路由调试日志
  strapi.log.info("zhao-course: 插件已加载，正在注册路由...");
};

export default register;
```

---

### Task 4: 验证路由注册

**Files:**
- Check: Strapi 启动日志

- [ ] **Step 1: 启动 Strapi 并检查路由注册日志**

```bash
cd e:/code/basic && npm run develop
```

- [ ] **Step 2: 查看启动日志中的路由注册信息**

期望看到类似：
```
[INFO] zhao-course: 插件已加载，正在注册路由...
```

---

### Task 5: 测试路由

- [ ] **Step 1: 测试路由是否返回正确响应**

```bash
curl -X GET "http://localhost:1337/zhao-course/admin/courses" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

期望结果：返回课程列表或权限错误（不是 404）

---

## 执行顺序

1. Task 1: 验证插件入口文件
2. Task 2: 清理缓存并重新编译
3. Task 3: 添加路由调试日志
4. Task 4: 验证路由注册
5. Task 5: 测试路由

---

## 回滚方案

如果修改后问题更严重，执行：

```bash
cd e:/code/plugins/zhao-course
git checkout -- server/src/register.ts
npm run build
```
