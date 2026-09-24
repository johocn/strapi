# 修复 zhao-oss 上传 500 错误 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复前端 POST /api/zhao-oss/upload 返回 500 Internal Server Error

**Architecture:** 将 zhao-oss 路由从 Strapi 原生 policies 格式改为 zhao-auth 中间件模式（authenticate + authorize），与 zhao-course/zhao-channel 保持一致。authenticate 中间件解析 JWT 注入 ctx.user，authorize 中间件执行策略链检查权限。

**Tech Stack:** Strapi 5, TypeScript, zhao-auth 中间件体系

---

## 根因分析

当前 `api.ts` 路由配置：
```typescript
config: {
  auth: false,
  policies: ["has-permission::permission=oss.file.upload"],
}
```

问题链：
1. `auth: false` → Strapi 不注入 `ctx.state.user` / `ctx.user`
2. `has-permission` policy 检查 `ctx.user` → 为 null → 返回 UNAUTHENTICATED
3. Strapi policy 返回非布尔值对象 → 500 Internal Server Error

正确模式（zhao-course/zhao-channel 已验证可用）：
```typescript
config: {
  auth: false,
  middlewares: [
    "plugin::zhao-auth.authenticate",        // JWT → ctx.state.user + ctx.user
    {
      name: "plugin::zhao-auth.authorize",   // 策略链检查
      config: {
        policies: [
          { name: "is-authenticated" },
          { name: "has-oss-permission", permission: "oss.file.upload" },
        ],
      },
    },
  ],
}
```

---

### Task 1: 重写 api.ts 路由配置

**Files:**
- Modify: `e:\code\plugins\zhao-oss\server\src\routes\api.ts`

- [ ] **Step 1: 重写路由文件，将 policies 改为 middlewares 模式**

将整个文件替换为：

```typescript
export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/upload",
      handler: "api-controller.upload",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.file.upload" },
              ],
            },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/media/list",
      handler: "api-controller.mediaList",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.file.read" },
              ],
            },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/media/folders",
      handler: "api-controller.getFolders",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.folder.read" },
              ],
            },
          },
        ],
      },
    },
    {
      method: "POST",
      path: "/media/folders",
      handler: "api-controller.createFolder",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.folder.create" },
              ],
            },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/sync/status/:fileId",
      handler: "api-controller.getSyncStatus",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.sync.read" },
              ],
            },
          },
        ],
      },
    },
    {
      method: "DELETE",
      path: "/media/:fileId",
      handler: "api-controller.deleteMedia",
      config: {
        auth: false,
        middlewares: [
          "plugin::zhao-auth.authenticate",
          {
            name: "plugin::zhao-auth.authorize",
            config: {
              policies: [
                { name: "is-authenticated" },
                { name: "has-oss-permission", permission: "oss.file.delete" },
              ],
            },
          },
        ],
      },
    },
  ],
};
```

---

### Task 2: 修复 api-controller.ts 中 ctx.user 访问方式

**Files:**
- Modify: `e:\code\plugins\zhao-oss\server\src\controllers\api-controller.ts:293-298`

- [ ] **Step 1: 修复 deleteMedia 中 ctx.user 的访问方式**

authenticate 中间件将用户信息注入 `ctx.state.user` 和 `ctx.user`，但 authorize 中间件构建 AuthContext 时使用的是 `authService.getUser(ctx)` 返回的对象。controller 中应优先从 `ctx.state.user` 获取。

将 `deleteMedia` 方法中的用户角色获取代码从：

```typescript
      const userRoles = (ctx.user?.roles || []).map((r: any) => {
        if (typeof r === "string") return r;
        if (r?.type) return r.type;
        if (r?.name) return r.name;
        return null;
      }).filter(Boolean);

      const isAdmin = userRoles.includes("admin");
      const isChannelAdmin = userRoles.includes("channel-admin");
      const isOwner = file.createdBy === ctx.user?.id || file.created_by === ctx.user?.id;
```

改为：

```typescript
      const user = ctx.state?.user || ctx.user;
      const userRoles = (user?.roles || []).map((r: any) => {
        if (typeof r === "string") return r;
        if (r?.type) return r.type;
        if (r?.name) return r.name;
        return null;
      }).filter(Boolean);

      const isAdmin = userRoles.includes("admin");
      const isChannelAdmin = userRoles.includes("channel-admin");
      const isOwner = file.createdBy === user?.id || file.created_by === user?.id;
```

---

### Task 3: 清理不再需要的本地 policy 文件

**Files:**
- Delete: `e:\code\plugins\zhao-oss\server\src\policies\has-permission.ts`
- Modify: `e:\code\plugins\zhao-oss\server\src\policies\index.ts`

- [ ] **Step 1: 更新 policies/index.ts，移除 has-permission 导出**

将 `e:\code\plugins\zhao-oss\server\src\policies\index.ts` 内容改为：

```typescript
export default {};
```

- [ ] **Step 2: 删除 has-permission.ts**

删除 `e:\code\plugins\zhao-oss\server\src\policies\has-permission.ts`，因为权限检查已由 zhao-auth 的 `has-oss-permission` 策略统一处理。

---

### Task 4: 构建并验证

**Files:** 无文件修改

- [ ] **Step 1: 构建 zhao-oss 插件**

Run: `cd e:\code\plugins\zhao-oss && npm run build`
Expected: 构建成功，无 TS 错误

- [ ] **Step 2: 重启 Strapi 并测试上传接口**

Run: `cd e:\code && npm run develop`

使用 curl 测试（需替换有效 JWT token）：
```bash
curl -X POST http://localhost:1337/api/zhao-oss/upload \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@test-image.png" \
  -F "folder=/general"
```

Expected: 返回 200/201 + 上传文件信息，不再返回 500

---

### Task 5: 验证前端上传功能

**Files:** 无文件修改

- [ ] **Step 1: 在前端课程表单中测试上传**

打开 `http://localhost:5173/#/pages/course/form`，选择封面/缩略图上传，确认：
1. 上传不再报 500 错误
2. 媒体列表正常加载
3. 文件夹树正常显示
