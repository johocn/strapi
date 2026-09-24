# zhao-oss 双写双读 + 媒体库选择器 设计文档

## 1. 目标

将 zhao-oss 改造为完整的媒体管理方案：
- 上传文件同时写入阿里云 OSS 和 Strapi 本地存储（双写）
- 读取时 OSS 优先，不可达时回退本地（双读）
- 上传后自动写入 Strapi `upload.file` 表，出现在媒体库中
- 前端提供 `MediaPicker` 组件，支持从媒体库选择或重新上传
- 遵循 Strapi 文件夹规范，支持分类路径
- 使用 zhao-auth 权限体系控制访问

## 2. 架构

### 2.1 上传流程

```
文件上传请求
  │
  ├─ ① 解析 multipart/form-data，获取文件和 folder 参数
  │
  ├─ ② 保存到 Strapi 本地文件系统（遵循 folderPath 规范）
  │     路径: /uploads/{folderPath}/{hash}{ext}
  │
  ├─ ③ 上传到阿里云 OSS
  │     成功 → remoteUrl = OSS URL
  │     失败 → remoteUrl = null, 标记待同步
  │
  ├─ ④ 写入 upload.file 表
  │     url = OSS URL（成功）或本地相对路径（失败）
  │     provider = "zhao-oss"
  │     provider_metadata = { ossUrl, localUrl, ossStatus }
  │     folder / folderPath = 按参数设置
  │
  ├─ ⑤ 写入 sync-record 表
  │     status = "success"（OSS 成功）或 "pending"（OSS 失败，待同步）
  │
  └─ ⑥ 返回 { id, documentId, name, url, hash, mime, size, provider }
```

### 2.2 读取流程

```
前端请求媒体 URL
  │
  ├─ 读取 upload.file 记录
  │
  ├─ 检查 provider_metadata.ossStatus
  │     "success" → 尝试 OSS URL
  │     "pending" → 使用本地 URL
  │
  └─ 前端 getMediaUrl() 逻辑:
        ossUrl 存在且 ossStatus=success → 返回 ossUrl
        否则 → 返回 localUrl（拼接 BASE_API 前缀）
```

### 2.3 删除流程

```
删除请求 → 权限检查（拥有者或渠道管理员以上）
  │
  ├─ ① 删除 OSS 远程文件（如存在）
  ├─ ② 删除本地文件
  ├─ ③ 删除 sync-record 记录
  └─ ④ 删除 upload.file 记录
```

## 3. 后端改造

### 3.1 upload 接口改造

**路径**: `POST /api/zhao-oss/upload`

**请求参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| file | File | 上传文件（multipart） |
| folder | string | 目标文件夹路径，如 `/course/covers` |
| name | string | 可选，自定义文件名 |

**响应**:
```json
{
  "id": 1,
  "documentId": "abc123",
  "name": "cover.jpg",
  "url": "https://joho.oss-cn-beijing.aliyuncs.com/course/covers/abc123.jpg",
  "hash": "d41d8cd98f00b204e9800998ecf8427e",
  "ext": ".jpg",
  "mime": "image/jpeg",
  "size": 102400,
  "provider": "zhao-oss",
  "folderPath": "/course/covers",
  "provider_metadata": {
    "ossUrl": "https://joho.oss-cn-beijing.aliyuncs.com/course/covers/abc123.jpg",
    "localUrl": "/course/covers/d41d8cd98f00b204e9800998ecf8427e.jpg",
    "ossStatus": "success"
  }
}
```

**upload.file 表写入字段**:
| 字段 | 值 |
|------|-----|
| name | 原始文件名 |
| hash | MD5 哈希 |
| ext | 扩展名 |
| mime | MIME 类型 |
| size | 文件大小 |
| url | OSS URL（成功）或本地相对路径（失败） |
| provider | `"zhao-oss"` |
| provider_metadata | `{ ossUrl, localUrl, ossStatus }` |
| folder | 关联的 folder 记录 ID |
| folderPath | 文件夹路径 |

### 3.2 新增 API

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/zhao-oss/media/list` | GET | 媒体库列表 | `oss.file.read` |
| `/api/zhao-oss/media/folders` | GET | 获取文件夹树 | `oss.folder.read` |
| `/api/zhao-oss/media/folders` | POST | 创建文件夹 | `oss.folder.create` |
| `/api/zhao-oss/media/:fileId` | DELETE | 删除媒体 | `oss.file.delete` |
| `/api/zhao-oss/sync/status/:fileId` | GET | 同步状态 | `oss.sync.read` |

**GET /api/zhao-oss/media/list 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |
| folderPath | string | 按文件夹筛选 |
| mime | string | 按 MIME 类型筛选（如 `image`、`video`、`audio`） |
| sort | string | 排序字段 |
| search | string | 搜索文件名 |

**GET /api/zhao-oss/media/folders 响应**:
```json
{
  "folders": [
    { "id": 1, "documentId": "f1", "name": "course", "path": "/course", "children": [...] },
    { "id": 2, "documentId": "f2", "name": "general", "path": "/general", "children": [] }
  ]
}
```

**POST /api/zhao-oss/media/folders 请求**:
```json
{
  "name": "covers",
  "parentPath": "/course"
}
```

### 3.3 删除权限额外检查

删除媒体时，除了角色权限外，还需在 controller 层验证：

```typescript
async deleteMedia(ctx: any) {
  const fileId = parseInt(ctx.params.fileId);
  const file = await strapi.db.query("plugin::upload.file").findOne({ where: { id: fileId } });
  
  if (!file) { ctx.status = 404; return; }
  
  const userRoles = ctx.user.roles || [];
  const isAdmin = userRoles.some(r => r === 'admin' || r.type === 'admin');
  const isChannelAdmin = userRoles.some(r => r === 'channel-admin' || r.type === 'channel-admin');
  const isOwner = file.createdBy === ctx.user.id;
  
  if (!isAdmin && !isChannelAdmin && !isOwner) {
    ctx.status = 403;
    ctx.body = { error: "无权删除此媒体文件" };
    return;
  }
  
  // 执行删除...
}
```

## 4. 前端改造

### 4.1 MediaPicker 组件

**文件**: `e:\code\web\src\components\MediaPicker.vue`

**Props**:
| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 显示/隐藏 |
| folder | String | '/general' | 默认打开的文件夹 |
| accept | String | '*' | 允许的文件类型 |
| multiple | Boolean | false | 是否多选 |

**Events**:
| Event | 参数 | 说明 |
|-------|------|------|
| select | `{ documentId, url, name, mime, size }` | 选中媒体 |
| close | - | 关闭选择器 |

**布局**:
```
┌─────────────────────────────────────────┐
│  媒体库                    [上传] [关闭] │
├──────────┬──────────────────────────────┤
│ 文件夹树  │  搜索栏                       │
│          │  ┌────┐ ┌────┐ ┌────┐       │
│ /course  │  │ 📷 │ │ 📷 │ │ 📷 │       │
│  /covers │  │file1│ │file2│ │file3│       │
│  /thumbs │  └────┘ └────┘ └────┘       │
│ /general │  ┌────┐ ┌────┐ ┌────┐       │
│          │  │ 📷 │ │ 📷 │ │ 📷 │       │
│          │  │file4│ │file5│ │file6│       │
│          │  └────┘ └────┘ └────┘       │
│          │  < 1 2 3 >                   │
└──────────┴──────────────────────────────┘
```

**上传弹窗**:
- 点击"上传"按钮 → 选择文件 → 选择目标文件夹 → 上传
- 上传成功后自动刷新列表并选中新文件

### 4.2 课程表单改造

**文件**: `e:\code\web\pages\course\form.vue`

**改造点**:
1. 封面图/缩略图点击 → 打开 `MediaPicker` 而非直接 `chooseImage`
2. `MediaPicker` 的 `select` 事件 → 设置 `form.cover = documentId`, `form.coverUrl = url`
3. 提交时 cover/thumbnail 格式改为 `{ documentId }` 关联

```vue
<MediaPicker 
  v-model:visible="showCoverPicker" 
  :folder="'/course/covers'" 
  :accept="'image/*'"
  @select="onCoverSelect" 
/>
```

```javascript
function onCoverSelect(media) {
  form.cover = media.documentId
  form.coverUrl = media.url
}
```

### 4.3 getMediaUrl 改造

**文件**: `e:\code\web\src\utils\format.js`

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

## 5. 权限体系

### 5.1 新增策略

**文件**: `e:\code\plugins\zhao-auth\server\src\policies\has-oss-permission.ts`

遵循 `has-course-permission` 模式，使用 `permissionMapping` 映射权限到角色。

### 5.2 权限映射

| 权限键 | 允许角色 | 说明 |
|--------|---------|------|
| `oss.file.upload` | admin, channel-admin, course-manager, instructor, user | 所有注册用户可上传 |
| `oss.file.read` | admin, channel-admin, course-manager, instructor, user | 所有注册用户可读取 |
| `oss.file.delete` | admin, channel-admin | 渠道管理员以上可删除（controller 层额外检查拥有者） |
| `oss.folder.create` | admin, channel-admin, course-manager | 管理类角色可创建文件夹 |
| `oss.folder.read` | admin, channel-admin, course-manager, instructor, user | 所有注册用户可浏览 |
| `oss.settings.read` | admin | 仅管理员 |
| `oss.settings.update` | admin | 仅管理员 |
| `oss.sync.read` | admin, channel-admin | 查看同步状态 |
| `oss.sync.create` | admin, channel-admin | 触发同步 |
| `oss.sync.delete` | admin | 删除远程文件 |

### 5.3 注册到 zhao-auth

在 `e:\code\plugins\zhao-auth\server\src\policies\index.ts` 中注册：

```typescript
import createHasOssPermission from "./has-oss-permission";

const policies = {
  // ...existing
  "has-oss-permission": createHasOssPermission,
};
```

## 6. 文件夹分类规范

| 路径 | 用途 |
|------|------|
| `/course/covers` | 课程封面图 |
| `/course/thumbnails` | 课程缩略图 |
| `/course/lessons/videos` | 课时视频 |
| `/course/lessons/audios` | 课时音频 |
| `/course/lessons/thumbnails` | 课时缩略图 |
| `/general` | 通用文件 |

首次启动时自动创建默认文件夹。

## 7. 文件变更清单

### 后端（zhao-oss）

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/controllers/api-controller.ts` | 修改 | 改造 upload 为双写，新增 mediaList/folders/createFolder |
| `server/src/routes/api.ts` | 修改 | 新增路由，配置权限 |
| `server/src/services/sync-service.ts` | 修改 | 适配双写逻辑 |

### 后端（zhao-auth）

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/policies/has-oss-permission.ts` | 新增 | OSS 权限策略 |
| `server/src/policies/index.ts` | 修改 | 注册新策略 |

### 前端（web）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/MediaPicker.vue` | 新增 | 媒体库选择器组件 |
| `src/api/media.js` | 修改 | 更新 uploadToOss，新增文件夹 API |
| `src/utils/format.js` | 修改 | 改造 getMediaUrl 支持双读 |
| `pages/course/form.vue` | 修改 | 使用 MediaPicker 替换直接上传 |
