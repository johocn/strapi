# zhao-oss 双写双读 + 媒体库选择器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改造 zhao-oss 为双写双读媒体管理方案，前端提供 MediaPicker 组件，集成 zhao-auth 权限体系。

**Architecture:** 后端 upload 接口同时写入 OSS + 本地 + upload.file 表 + sync-record 表；前端 MediaPicker 组件支持媒体库浏览/搜索/上传/选择；getMediaUrl 支持 OSS 优先 + 本地回退。

**Tech Stack:** Strapi 5, Vue 3 (UniApp), zhao-auth, 阿里云 OSS

---

## 文件结构

```
后端 (zhao-oss):
├── server/src/controllers/api-controller.ts   # 修改：双写 upload + 新增 mediaList/folders/createFolder
├── server/src/routes/api.ts                    # 修改：新增路由 + 权限配置
├── server/src/services/sync-service.ts         # 修改：适配双写

后端 (zhao-auth):
├── server/src/policies/has-oss-permission.ts   # 新增：OSS 权限策略
├── server/src/policies/index.ts                # 修改：注册新策略

前端 (web):
├── src/components/MediaPicker.vue              # 新增：媒体库选择器
├── src/api/media.js                            # 修改：更新 uploadToOss + 新增文件夹 API
├── src/utils/format.js                         # 修改：改造 getMediaUrl
├── pages/course/form.vue                       # 修改：使用 MediaPicker
```

---

### Task 1: 新增 zhao-auth OSS 权限策略

**Files:**
- Create: `e:\code\plugins\zhao-auth\server\src\policies\has-oss-permission.ts`
- Modify: `e:\code\plugins\zhao-auth\server\src\policies\index.ts`

- [ ] **Step 1: 创建 has-oss-permission 策略**

```typescript
import type { Core } from "@strapi/strapi";
import type { PolicyHandler, PolicyResult } from "../utils/types";

const createHasOssPermission = (strapi: Core.Strapi): PolicyHandler => {
  return (context, config): PolicyResult => {
    if (!context.user || !context.user.id) {
      return {
        passed: false,
        code: "UNAUTHENTICATED",
        message: "未认证，请先登录",
      };
    }

    const requiredPermission = config?.permission as string | undefined;

    if (!requiredPermission) {
      return {
        passed: false,
        code: "CONFIG_ERROR",
        message: "策略 has-oss-permission 配置错误：必须提供 permission",
      };
    }

    let userRoles: string[] = [];
    if (Array.isArray(context.user.roles)) {
      userRoles = context.user.roles.map((r: any) => {
        if (typeof r === "string") return r;
        if (r?.type) return r.type;
        if (r?.name) return r.name;
        return null;
      }).filter((r: string | null): r is string => r !== null && r.trim() !== "");
    } else if (typeof context.user.roles === "string" && context.user.roles.trim()) {
      userRoles = [context.user.roles];
    }

    const permissionMapping: Record<string, string[]> = {
      "oss.file.upload": ["admin", "channel-admin", "course-manager", "instructor", "user"],
      "oss.file.read": ["admin", "channel-admin", "course-manager", "instructor", "user"],
      "oss.file.delete": ["admin", "channel-admin"],
      "oss.folder.create": ["admin", "channel-admin", "course-manager"],
      "oss.folder.read": ["admin", "channel-admin", "course-manager", "instructor", "user"],
      "oss.settings.read": ["admin"],
      "oss.settings.update": ["admin"],
      "oss.sync.read": ["admin", "channel-admin"],
      "oss.sync.create": ["admin", "channel-admin"],
      "oss.sync.delete": ["admin"],
    };

    const allowedRoles = permissionMapping[requiredPermission];
    if (!allowedRoles) {
      return {
        passed: false,
        code: "PERMISSION_NOT_FOUND",
        message: `权限 "${requiredPermission}" 不存在`,
      };
    }

    const hasPermission = allowedRoles.some((role: string) => userRoles.includes(role));
    if (!hasPermission) {
      return {
        passed: false,
        code: "FORBIDDEN_PERMISSION",
        message: `需要角色 [${allowedRoles.join(", ")}] 才能执行此操作`,
      };
    }

    return { passed: true };
  };
};

export default createHasOssPermission;
```

- [ ] **Step 2: 注册策略到 index.ts**

在 `e:\code\plugins\zhao-auth\server\src\policies\index.ts` 中添加：

```typescript
import createHasOssPermission from "./has-oss-permission";

const policies: Record<string, PolicyFactory> = {
  "is-authenticated": createIsAuthenticated,
  "has-role": createHasRole,
  "has-channel-access": createHasChannelAccess,
  "has-channel-access-advanced": createHasChannelAccess,
  "has-course-permission": createHasCoursePermission,
  "has-oss-permission": createHasOssPermission,
  "is-channel-admin": createPassthrough,
  "is-channel-owner": createPassthrough,
};
```

- [ ] **Step 3: 构建 zhao-auth**

```bash
cd e:\code\plugins\zhao-auth
npm run build
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\plugins\zhao-auth
git add server/src/policies/has-oss-permission.ts server/src/policies/index.ts
git commit -m "feat(zhao-auth): add has-oss-permission policy"
```

---

### Task 2: 改造 zhao-oss upload 接口（双写）

**Files:**
- Modify: `e:\code\plugins\zhao-oss\server\src\controllers\api-controller.ts`

- [ ] **Step 1: 替换 upload 方法**

将 `api-controller.ts` 中的 `upload` 方法替换为：

```typescript
async upload(ctx: any) {
  try {
    const { files } = ctx.request;
    if (!files || Object.keys(files).length === 0) {
      ctx.status = 400;
      ctx.body = { error: "No files provided" };
      return;
    }

    const file = Object.values(files)[0] as any;
    const folderPath = ctx.request.body?.folder || "/general";
    const customName = ctx.request.body?.name || null;

    const fs = require("fs/promises");
    const path = require("path");
    const crypto = require("crypto");
    const fileBuffer = await fs.readFile(file.path);
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const ext = file.name ? `.${file.name.split(".").pop()}` : "";
    const fileName = customName || file.name || `file_${Date.now()}`;
    const mimeType = file.type || "application/octet-stream";
    const fileSize = file.size || fileBuffer.length;

    const uploadDir = strapi.dirs.static.public;
    const targetDir = path.join(uploadDir, folderPath);
    await fs.mkdir(targetDir, { recursive: true });
    const localFileName = `${fileHash}${ext}`;
    const localFilePath = path.join(targetDir, localFileName);
    await fs.writeFile(localFilePath, fileBuffer);
    const localUrl = `${folderPath}/${localFileName}`;

    let ossUrl: string | null = null;
    let ossStatus: "success" | "pending" = "pending";
    let providerName = "zhao-oss-local";

    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = registry.getPrimaryProvider();
      if (provider) {
        const result = await provider.upload({
          buffer: fileBuffer,
          filename: `${folderPath}/${localFileName}`,
          mimeType,
          fileSize,
        });
        ossUrl = result.url;
        ossStatus = "success";
        providerName = result.provider || "aliyun";
      }
    } catch (ossErr) {
      strapi.log.warn(`[zhao-oss] OSS upload failed, falling back to local: ${(ossErr as Error).message}`);
    }

    let folderRecord: any = null;
    if (folderPath && folderPath !== "/") {
      folderRecord = await strapi.db.query("plugin::upload.folder").findOne({
        where: { path: folderPath },
      });
    }

    const uploadFile = await strapi.db.query("plugin::upload.file").create({
      data: {
        name: fileName,
        alternativeText: null,
        caption: null,
        width: null,
        height: null,
        formats: {},
        hash: fileHash,
        ext,
        mime: mimeType,
        size: fileSize,
        url: ossUrl || localUrl,
        previewUrl: null,
        provider: providerName,
        provider_metadata: {
          ossUrl: ossUrl,
          localUrl,
          ossStatus,
        },
        folder: folderRecord?.id || null,
        folderPath,
      },
    });

    await strapi.db.query("plugin::zhao-oss.sync-record").create({
      data: {
        fileId: uploadFile.id,
        fileHash,
        status: ossStatus,
        provider: providerName,
        remoteUrl: ossUrl,
        remoteEtag: null,
        errorMessage: ossStatus === "pending" ? "OSS upload failed, pending sync" : null,
        lastSyncedAt: ossStatus === "success" ? new Date() : null,
        retryCount: 0,
      },
    });

    ctx.body = {
      id: uploadFile.id,
      documentId: uploadFile.documentId,
      name: uploadFile.name,
      url: ossUrl || localUrl,
      hash: fileHash,
      ext,
      mime: mimeType,
      size: fileSize,
      provider: providerName,
      folderPath,
      provider_metadata: {
        ossUrl,
        localUrl,
        ossStatus,
      },
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: (err as Error).message };
  }
},
```

- [ ] **Step 2: 替换 deleteMedia 方法**

将 `deleteMedia` 方法替换为带拥有者检查的版本：

```typescript
async deleteMedia(ctx: any) {
  try {
    const { fileId } = ctx.params;
    if (!fileId) {
      ctx.status = 400;
      ctx.body = { error: "fileId is required" };
      return;
    }

    const parsedId = parseInt(fileId, 10);
    if (isNaN(parsedId)) {
      ctx.status = 400;
      ctx.body = { error: "Invalid fileId" };
      return;
    }

    const file = await strapi.db.query("plugin::upload.file").findOne({
      where: { id: parsedId },
    });

    if (!file) {
      ctx.status = 404;
      ctx.body = { error: "File not found" };
      return;
    }

    const userRoles = (ctx.user?.roles || []).map((r: any) => {
      if (typeof r === "string") return r;
      if (r?.type) return r.type;
      if (r?.name) return r.name;
      return null;
    }).filter(Boolean);

    const isAdmin = userRoles.includes("admin");
    const isChannelAdmin = userRoles.includes("channel-admin");
    const isOwner = file.createdBy === ctx.user?.id || file.created_by === ctx.user?.id;

    if (!isAdmin && !isChannelAdmin && !isOwner) {
      ctx.status = 403;
      ctx.body = { error: "无权删除此媒体文件" };
      return;
    }

    const syncService = strapi.plugin("zhao-oss").service("sync-service");
    const result = await syncService.deleteFileCompletely(parsedId);

    ctx.body = {
      success: true,
      fileId: parsedId,
      details: result,
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: (err as Error).message };
  }
},
```

- [ ] **Step 3: 新增 mediaList / folders / createFolder 方法**

在 `api-controller.ts` 的导出对象中，`deleteMedia` 方法后添加：

```typescript
async mediaList(ctx: any) {
  const { page = 1, pageSize = 20, folderPath, mime, search, sort = "createdAt:desc" } = ctx.query;

  const where: Record<string, unknown> = { provider: { $in: ["zhao-oss", "zhao-oss-local", "aliyun"] } };
  if (folderPath) where.folderPath = folderPath;
  if (mime) where.mime = { $contains: mime };
  if (search) where.name = { $containsi: search };

  const [sortField, sortDir] = (sort as string).split(":");
  const orderBy: Record<string, string> = {};
  orderBy[sortField || "createdAt"] = sortDir === "asc" ? "asc" : "desc";

  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const [files, total] = await Promise.all([
    strapi.db.query("plugin::upload.file").findMany({
      where,
      limit: parseInt(pageSize),
      offset,
      orderBy,
    }),
    strapi.db.query("plugin::upload.file").count({ where }),
  ]);

  ctx.body = {
    list: files.map((f: any) => ({
      id: f.id,
      documentId: f.documentId,
      name: f.name,
      url: f.url,
      hash: f.hash,
      ext: f.ext,
      mime: f.mime,
      size: f.size,
      provider: f.provider,
      folderPath: f.folderPath,
      provider_metadata: f.provider_metadata,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      pageCount: Math.ceil(total / parseInt(pageSize)),
    },
  };
},

async getFolders(ctx: any) {
  const folders = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { path: "asc" },
  });

  const buildTree = (items: any[], parentPath: string = "") => {
    return items
      .filter((item: any) => {
        const parent = item.path.substring(0, item.path.lastIndexOf("/")) || "/";
        return parent === parentPath;
      })
      .map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        name: item.name,
        path: item.path,
        children: buildTree(items, item.path),
      }));
  };

  ctx.body = { folders: buildTree(folders) };
},

async createFolder(ctx: any) {
  const { name, parentPath = "/" } = ctx.request.body;

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: "Folder name is required" };
    return;
  }

  const folderPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;

  const existing = await strapi.db.query("plugin::upload.folder").findOne({
    where: { path: folderPath },
  });

  if (existing) {
    ctx.body = {
      id: existing.id,
      documentId: existing.documentId,
      name: existing.name,
      path: existing.path,
    };
    return;
  }

  const maxPathId = await strapi.db.query("plugin::upload.folder").findMany({
    select: ["pathId"],
    orderBy: { pathId: "desc" },
    limit: 1,
  });
  const pathId = (maxPathId[0]?.pathId || 0) + 1;

  let parentFolder: any = null;
  if (parentPath && parentPath !== "/") {
    parentFolder = await strapi.db.query("plugin::upload.folder").findOne({
      where: { path: parentPath },
    });
  }

  const folder = await strapi.db.query("plugin::upload.folder").create({
    data: {
      name,
      pathId,
      path: folderPath,
      parent: parentFolder?.id || null,
    },
  });

  ctx.body = {
    id: folder.id,
    documentId: folder.documentId,
    name: folder.name,
    path: folder.path,
  };
},
```

- [ ] **Step 4: 构建 zhao-oss**

```bash
cd e:\code\plugins\zhao-oss
npm run build
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\plugins\zhao-oss
git add server/src/controllers/api-controller.ts
git commit -m "feat(zhao-oss): dual-write upload with local+OSS, media list, folders, owner-based delete"
```

---

### Task 3: 更新 zhao-oss API 路由

**Files:**
- Modify: `e:\code\plugins\zhao-oss\server\src\routes\api.ts`

- [ ] **Step 1: 替换路由配置**

将 `api.ts` 全部内容替换为：

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

- [ ] **Step 2: 构建**

```bash
cd e:\code\plugins\zhao-oss
npm run build
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\plugins\zhao-oss
git add server/src/routes/api.ts
git commit -m "feat(zhao-oss): update API routes with has-oss-permission policy"
```

---

### Task 4: 改造前端 getMediaUrl

**Files:**
- Modify: `e:\code\web\src\utils\format.js`

- [ ] **Step 1: 替换 getMediaUrl 函数**

将 `format.js` 中的 `getMediaUrl` 函数替换为：

```javascript
export function getMediaUrl(file, preferOss = true) {
  if (!file) return ''
  
  const meta = file.provider_metadata
  
  if (preferOss && meta?.ossUrl && meta.ossStatus === 'success') {
    return meta.ossUrl
  }
  
  if (meta?.localUrl) {
    if (meta.localUrl.startsWith('http')) return meta.localUrl
    const { BASE_API } = require('../config/env.js')
    return `${BASE_API}${meta.localUrl}`
  }
  
  if (file.url) {
    if (file.url.startsWith('http')) return file.url
    const { BASE_API } = require('../config/env.js')
    return `${BASE_API}${file.url}`
  }
  
  if (typeof file === 'string') {
    if (file.startsWith('http')) return file
    const { BASE_API } = require('../config/env.js')
    return `${BASE_API}${file}`
  }
  
  return ''
}
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add src/utils/format.js
git commit -m "feat(web): getMediaUrl supports OSS-first with local fallback"
```

---

### Task 5: 更新前端 media API

**Files:**
- Modify: `e:\code\web\src\api\media.js`

- [ ] **Step 1: 替换 media.js 全部内容**

```javascript
import { ADMIN_BASE_URL } from '../config/env.js'

export function uploadToOss(filePath, folder = '/general') {
  return new Promise((resolve, reject) => {
    const uploadUrl = `${ADMIN_BASE_URL}/api/zhao-oss/upload`

    uni.uploadFile({
      url: uploadUrl,
      filePath,
      name: 'file',
      formData: { folder },
      header: {
        'Authorization': `Bearer ${uni.getStorageSync('tadmin_token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const data = JSON.parse(res.data)
            resolve(data)
          } catch (e) {
            resolve(res.data)
          }
        } else {
          try {
            const errData = JSON.parse(res.data)
            reject(new Error(errData.error?.message || `上传失败: ${res.statusCode}`))
          } catch (e) {
            reject(new Error(`上传失败: ${res.statusCode}`))
          }
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getOssMediaList(params = {}) {
  const token = uni.getStorageSync('tadmin_token') || localStorage.getItem('tadmin_token')
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.pageSize) query.set('pageSize', params.pageSize)
  if (params.folderPath) query.set('folderPath', params.folderPath)
  if (params.mime) query.set('mime', params.mime)
  if (params.search) query.set('search', params.search)
  if (params.sort) query.set('sort', params.sort)

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL}/api/zhao-oss/media/list?${query.toString()}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error?.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getOssFolders() {
  const token = uni.getStorageSync('tadmin_token') || localStorage.getItem('tadmin_token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL}/api/zhao-oss/media/folders`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error?.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function createOssFolder(name, parentPath = '/') {
  const token = uni.getStorageSync('tadmin_token') || localStorage.getItem('tadmin_token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL}/api/zhao-oss/media/folders`,
      method: 'POST',
      data: { name, parentPath },
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error?.message || '创建失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function deleteOssMedia(fileId) {
  const token = uni.getStorageSync('tadmin_token') || localStorage.getItem('tadmin_token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL}/api/zhao-oss/media/${fileId}`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error?.message || '删除失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getOssSyncStatus(fileId) {
  const token = uni.getStorageSync('tadmin_token') || localStorage.getItem('tadmin_token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL}/api/zhao-oss/sync/status/${fileId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error?.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add src/api/media.js
git commit -m "feat(web): update media API with OSS upload, folders, list, delete"
```

---

### Task 6: 创建 MediaPicker 组件

**Files:**
- Create: `e:\code\web\src\components\MediaPicker.vue`

- [ ] **Step 1: 创建 MediaPicker 组件**

```vue
<template>
  <view v-if="visible" class="media-picker-overlay" @click="handleClose">
    <view class="media-picker" @click.stop>
      <view class="picker-header">
        <text class="picker-title">媒体库</text>
        <view class="picker-actions">
          <button class="btn-upload" @click="handleUpload">上传</button>
          <text class="btn-close" @click="handleClose">×</text>
        </view>
      </view>

      <view class="picker-body">
        <view class="folder-sidebar">
          <view 
            class="folder-item" 
            :class="{ active: currentFolder === '/' }"
            @click="selectFolder('/')"
          >
            <text>全部</text>
          </view>
          <view 
            v-for="f in flatFolders" 
            :key="f.path"
            class="folder-item"
            :class="{ active: currentFolder === f.path }"
            @click="selectFolder(f.path)"
          >
            <text>{{ indent(f.path) }}{{ f.name }}</text>
          </view>
        </view>

        <view class="file-area">
          <view class="search-bar">
            <input 
              v-model="searchKeyword" 
              class="search-input" 
              placeholder="搜索文件名"
              @confirm="loadMedia"
            />
          </view>

          <scroll-view scroll-y class="file-grid" @scrolltolower="loadMore">
            <view class="grid">
              <view 
                v-for="item in mediaList" 
                :key="item.id"
                class="file-card"
                :class="{ selected: isSelected(item) }"
                @click="handleSelect(item)"
              >
                <image 
                  v-if="isImage(item.mime)" 
                  :src="getFileUrl(item)" 
                  mode="aspectFill"
                  class="file-thumb"
                />
                <view v-else class="file-icon">
                  <text>{{ iconForMime(item.mime) }}</text>
                </view>
                <text class="file-name">{{ item.name }}</text>
              </view>
            </view>
            <view v-if="loading" class="loading-text">
              <text>加载中...</text>
            </view>
            <view v-if="!loading && mediaList.length === 0" class="empty-text">
              <text>暂无文件</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getOssMediaList, getOssFolders, uploadToOss } from '../api/media.js'
import { BASE_API } from '../config/env.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  folder: { type: String, default: '/general' },
  accept: { type: String, default: '*' },
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'update:visible'])

const mediaList = ref([])
const folders = ref([])
const flatFolders = ref([])
const currentFolder = ref('/')
const searchKeyword = ref('')
const loading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, total: 0, pageCount: 0 })
const selectedItems = ref([])

watch(() => props.visible, (val) => {
  if (val) {
    currentFolder.value = props.folder
    loadFolders()
    loadMedia()
  }
})

function indent(path) {
  const depth = path.split('/').length - 2
  return '  '.repeat(Math.max(0, depth))
}

function isImage(mime) {
  return mime?.startsWith('image/')
}

function iconForMime(mime) {
  if (mime?.startsWith('video/')) return '🎬'
  if (mime?.startsWith('audio/')) return '🎵'
  return '📄'
}

function getFileUrl(item) {
  const meta = item.provider_metadata
  if (meta?.ossUrl && meta.ossStatus === 'success') return meta.ossUrl
  if (meta?.localUrl) {
    if (meta.localUrl.startsWith('http')) return meta.localUrl
    return `${BASE_API}${meta.localUrl}`
  }
  if (item.url?.startsWith('http')) return item.url
  return `${BASE_API}${item.url}`
}

function isSelected(item) {
  return selectedItems.value.some(i => i.documentId === item.documentId)
}

function selectFolder(path) {
  currentFolder.value = path
  pagination.value.page = 1
  loadMedia()
}

async function loadFolders() {
  try {
    const result = await getOssFolders()
    folders.value = result.folders || []
    flatFolders.value = flattenFolders(folders.value)
  } catch (e) {
    console.error('加载文件夹失败', e)
  }
}

function flattenFolders(tree, result = []) {
  for (const f of tree) {
    result.push({ id: f.id, name: f.name, path: f.path })
    if (f.children?.length) {
      flattenFolders(f.children, result)
    }
  }
  return result
}

async function loadMedia() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (currentFolder.value !== '/') {
      params.folderPath = currentFolder.value
    }
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    const result = await getOssMediaList(params)
    mediaList.value = result.list || []
    pagination.value = result.pagination || {}
  } catch (e) {
    console.error('加载媒体列表失败', e)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (pagination.value.page < pagination.value.pageCount) {
    pagination.value.page++
    loadMedia()
  }
}

function handleSelect(item) {
  if (props.multiple) {
    const idx = selectedItems.value.findIndex(i => i.documentId === item.documentId)
    if (idx > -1) {
      selectedItems.value.splice(idx, 1)
    } else {
      selectedItems.value.push(item)
    }
  } else {
    selectedItems.value = [item]
    emit('select', {
      documentId: item.documentId,
      url: getFileUrl(item),
      name: item.name,
      mime: item.mime,
      size: item.size,
    })
    handleClose()
  }
}

function handleUpload() {
  const chooseFn = props.accept.startsWith('video') ? 'chooseVideo' : 'chooseImage'
  
  if (chooseFn === 'chooseVideo') {
    uni.chooseVideo({
      sourceType: ['album', 'camera'],
      success: async (res) => {
        await doUpload(res.tempFilePath)
      }
    })
  } else {
    uni.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (res.tempFilePaths?.length > 0) {
          await doUpload(res.tempFilePaths[0])
        }
      }
    })
  }
}

async function doUpload(filePath) {
  try {
    uni.showLoading({ title: '上传中...' })
    const result = await uploadToOss(filePath, currentFolder.value)
    uni.hideLoading()
    uni.showToast({ title: '上传成功', icon: 'success' })
    loadMedia()
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '上传失败', icon: 'none' })
    console.error('上传失败', e)
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<style scoped>
.media-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-picker {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #eee;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.btn-upload {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 10rpx 24rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
}

.btn-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.picker-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.folder-sidebar {
  width: 200rpx;
  border-right: 1rpx solid #eee;
  padding: 20rpx;
  overflow-y: auto;
}

.folder-item {
  padding: 16rpx 12rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.folder-item.active {
  background: #667eea;
  color: #fff;
}

.file-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-bar {
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
}

.search-input {
  width: 100%;
  height: 64rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
}

.file-grid {
  flex: 1;
  padding: 20rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.file-card {
  width: calc(33.33% - 12rpx);
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  overflow: hidden;
  cursor: pointer;
}

.file-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 2rpx rgba(102, 126, 234, 0.3);
}

.file-thumb {
  width: 100%;
  height: 160rpx;
}

.file-icon {
  width: 100%;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  font-size: 48rpx;
}

.file-name {
  display: block;
  padding: 8rpx;
  font-size: 22rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-text, .empty-text {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add src/components/MediaPicker.vue
git commit -m "feat(web): add MediaPicker component with folder tree and upload"
```

---

### Task 7: 改造课程表单使用 MediaPicker

**Files:**
- Modify: `e:\code\web\pages\course\form.vue`

- [ ] **Step 1: 修改 import**

将第 339 行：
```javascript
import { uploadMedia } from '../../src/api/media.js'
```
替换为：
```javascript
import MediaPicker from '../../src/components/MediaPicker.vue'
```

- [ ] **Step 2: 添加 MediaPicker 状态变量**

在 `const thumbnailFile = ref(null)` 后添加：

```javascript
const showCoverPicker = ref(false)
const showThumbnailPicker = ref(false)
```

- [ ] **Step 3: 替换 uploadCover 函数**

将 `uploadCover` 函数替换为：

```javascript
function onCoverSelect(media) {
  form.cover = media.documentId
  form.coverUrl = media.url
}
```

- [ ] **Step 4: 替换 uploadThumbnail 函数**

将 `uploadThumbnail` 函数替换为：

```javascript
function onThumbnailSelect(media) {
  form.thumbnail = media.documentId
  form.thumbnailUrl = media.url
}
```

- [ ] **Step 5: 修改模板中封面图点击事件**

将模板中 `@click="uploadCover"` 替换为 `@click="showCoverPicker = true"`

- [ ] **Step 6: 修改模板中缩略图点击事件**

将模板中 `@click="uploadThumbnail"` 替换为 `@click="showThumbnailPicker = true"`

- [ ] **Step 7: 在模板底部 tag-picker-modal 后添加 MediaPicker**

```vue
<MediaPicker 
  v-model:visible="showCoverPicker" 
  :folder="'/course/covers'" 
  :accept="'image/*'"
  @select="onCoverSelect" 
/>
<MediaPicker 
  v-model:visible="showThumbnailPicker" 
  :folder="'/course/thumbnails'" 
  :accept="'image/*'"
  @select="onThumbnailSelect" 
/>
```

- [ ] **Step 8: 修改 handleSubmit 中 cover/thumbnail 提交格式**

将：
```javascript
cover: form.cover || null,
thumbnail: form.thumbnail || null,
```
替换为：
```javascript
cover: form.cover ? { documentId: form.cover } : null,
thumbnail: form.thumbnail ? { documentId: form.thumbnail } : null,
```

- [ ] **Step 9: 提交**

```bash
cd e:\code\web
git add pages/course/form.vue
git commit -m "feat(web): course form uses MediaPicker for cover and thumbnail selection"
```

---

### Task 8: 构建验证

**Files:**
- 无新增文件

- [ ] **Step 1: 构建 zhao-auth**

```bash
cd e:\code\plugins\zhao-auth
npm run build
```

- [ ] **Step 2: 构建 zhao-oss**

```bash
cd e:\code\plugins\zhao-oss
npm run build
```

- [ ] **Step 3: 启动 Strapi 验证**

```bash
cd e:\code\basic
npm run dev
```

预期：Strapi 启动成功，zhao-oss 和 zhao-auth 插件加载正常

- [ ] **Step 4: 启动前端验证**

```bash
cd e:\code\web
npm run dev:h5
```

预期：前端启动成功

- [ ] **Step 5: 端到端测试**

1. 访问 `http://localhost:5173/#/pages/course/form`
2. 点击"封面图" → MediaPicker 弹出
3. 点击"上传" → 选择图片 → 上传成功
4. 选中图片 → 封面图显示 OSS URL
5. 填写课程名称 → 保存 → 课程创建成功

- [ ] **Step 6: 最终提交**

```bash
cd e:\code
git add plugins/zhao-auth plugins/zhao-oss web/
git commit -m "feat: zhao-oss dual-write media management with MediaPicker and zhao-auth permissions"
```
