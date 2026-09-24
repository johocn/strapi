# 课程表单媒体上传改用 zhao-oss 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将课程表单的媒体上传从 Strapi 原生 upload 改为 zhao-oss 上传，文件直接存到阿里云 OSS，同时写入 Strapi upload.file 表以保持 documentId 关联。

**Architecture:** 改造 zhao-oss upload 接口，上传到 OSS 后同时写入 Strapi `plugin::upload.file` 表和 `plugin::zhao-oss.sync-record` 表，返回包含 documentId 的完整文件信息。前端 `form.vue` 将 `uploadMedia` 调用替换为 `uploadToOss`，并适配返回数据格式。

**Tech Stack:** Vue 3 (UniApp), Strapi 5, zhao-oss 插件, 阿里云 OSS

---

## 文件结构

```
修改文件:
├── e:\code\plugins\zhao-oss\server\src\controllers\api-controller.ts  # 改造 upload 方法
├── e:\code\web\src\api\media.js                                        # 修改 uploadToOss 返回格式
├── e:\code\web\pages\course\form.vue                                   # 替换上传调用
```

---

### Task 1: 改造 zhao-oss upload 接口

**Files:**
- Modify: `e:\code\plugins\zhao-oss\server\src\controllers\api-controller.ts`

当前 upload 方法只上传到 OSS 并返回 URL，不写入 Strapi upload.file 表。需要改造为：上传到 OSS → 写入 upload.file 表 → 写入 sync-record 表 → 返回 documentId。

- [ ] **Step 1: 修改 upload 方法**

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
    const registry = strapi.plugin("zhao-oss").service("provider-registry");
    const provider = registry.getPrimaryProvider();

    if (!provider) {
      ctx.status = 500;
      ctx.body = { error: "No OSS provider configured" };
      return;
    }

    const fs = require("fs/promises");
    const crypto = require("crypto");
    const fileBuffer = await fs.readFile(file.path);
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

    const result = await provider.upload({
      buffer: fileBuffer,
      filename: file.name || `file_${Date.now()}`,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size || fileBuffer.length,
    });

    const uploadFile = await strapi.db.query("plugin::upload.file").create({
      data: {
        name: file.name || `file_${Date.now()}`,
        alternativeText: null,
        caption: null,
        width: null,
        height: null,
        formats: {},
        hash: fileHash,
        ext: file.name ? `.${file.name.split(".").pop()}` : "",
        mime: file.type || "application/octet-stream",
        size: file.size || fileBuffer.length,
        url: result.url,
        previewUrl: null,
        provider: result.provider,
        provider_metadata: { remoteUrl: result.url, ossProvider: result.provider },
        folder: null,
        folderPath: "/",
      },
    });

    await strapi.db.query("plugin::zhao-oss.sync-record").create({
      data: {
        fileId: uploadFile.id,
        fileHash,
        status: "success",
        provider: result.provider,
        remoteUrl: result.url,
        remoteEtag: null,
        errorMessage: null,
        lastSyncedAt: new Date(),
        retryCount: 0,
      },
    });

    ctx.body = {
      id: uploadFile.id,
      documentId: uploadFile.documentId,
      name: uploadFile.name,
      url: result.url,
      hash: fileHash,
      mime: uploadFile.mime,
      size: uploadFile.size,
      provider: result.provider,
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: (err as Error).message };
  }
},
```

- [ ] **Step 2: 构建验证**

```bash
cd e:\code\plugins\zhao-oss
npm run build
```

预期：构建成功

- [ ] **Step 3: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add server/src/controllers/api-controller.ts
git commit -m "feat(zhao-oss): upload writes to Strapi upload.file table and returns documentId"
```

---

### Task 2: 修改前端 uploadToOss 函数

**Files:**
- Modify: `e:\code\web\src\api\media.js`

当前 `uploadToOss` 函数已存在但返回格式与 `uploadMedia` 不同。需要统一返回格式，使其返回包含 documentId 的结构。

- [ ] **Step 1: 修改 uploadToOss 函数**

将 `media.js` 中的 `uploadToOss` 函数替换为：

```javascript
export function uploadToOss(filePath) {
  return new Promise((resolve, reject) => {
    const uploadUrl = `${ADMIN_BASE_URL}/api/zhao-oss/upload`

    uni.uploadFile({
      url: uploadUrl,
      filePath,
      name: 'file',
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
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\web
git add src/api/media.js
git commit -m "feat(web): update uploadToOss to use ADMIN_BASE_URL and return documentId"
```

---

### Task 3: 修改课程表单使用 zhao-oss 上传

**Files:**
- Modify: `e:\code\web\pages\course\form.vue`

将 `uploadCover` 和 `uploadThumbnail` 中的 `uploadMedia` 调用替换为 `uploadToOss`，适配新的返回格式。

- [ ] **Step 1: 修改 import 语句**

将 `form.vue` 第 339 行：

```javascript
import { uploadMedia } from '../../src/api/media.js'
```

替换为：

```javascript
import { uploadToOss } from '../../src/api/media.js'
```

- [ ] **Step 2: 修改 uploadCover 函数**

将 `uploadCover` 函数（第 472-500 行）替换为：

```javascript
async function uploadCover() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: async (res) => {
      if (!res.tempFilePaths || res.tempFilePaths.length === 0) return
      
      try {
        uni.showLoading({ title: '上传中...' })
        const tempPath = res.tempFilePaths[0]
        const uploadResult = await uploadToOss(tempPath)
        
        if (uploadResult.documentId) {
          form.cover = uploadResult.documentId
          form.coverUrl = uploadResult.url
          uni.showToast({ title: '上传成功', icon: 'success' })
        } else {
          throw new Error('上传失败')
        }
      } catch (e) {
        console.error('封面上传失败:', e)
        uni.showToast({ title: '封面上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}
```

- [ ] **Step 3: 修改 uploadThumbnail 函数**

将 `uploadThumbnail` 函数（第 502-530 行）替换为：

```javascript
async function uploadThumbnail() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: async (res) => {
      if (!res.tempFilePaths || res.tempFilePaths.length === 0) return
      
      try {
        uni.showLoading({ title: '上传中...' })
        const tempPath = res.tempFilePaths[0]
        const uploadResult = await uploadToOss(tempPath)
        
        if (uploadResult.documentId) {
          form.thumbnail = uploadResult.documentId
          form.thumbnailUrl = uploadResult.url
          uni.showToast({ title: '上传成功', icon: 'success' })
        } else {
          throw new Error('上传失败')
        }
      } catch (e) {
        console.error('缩略图上传失败:', e)
        uni.showToast({ title: '缩略图上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}
```

- [ ] **Step 4: 修改 handleSubmit 中 cover/thumbnail 的提交格式**

当前 `handleSubmit` 中 `cover` 和 `thumbnail` 直接传 documentId 字符串。Strapi 关联关系需要传 `{ documentId }` 格式。

将 `handleSubmit` 中第 566-567 行：

```javascript
cover: form.cover || null,
thumbnail: form.thumbnail || null,
```

替换为：

```javascript
cover: form.cover ? { documentId: form.cover } : null,
thumbnail: form.thumbnail ? { documentId: form.thumbnail } : null,
```

- [ ] **Step 5: 提交代码**

```bash
cd e:\code\web
git add pages/course/form.vue
git commit -m "feat(web): course form uses zhao-oss for media upload"
```

---

### Task 4: 修改 getMediaUrl 支持 OSS URL

**Files:**
- Modify: `e:\code\web\src\utils\format.js`

当前 `getMediaUrl` 函数已支持 `remoteUrl` 优先。zhao-oss 上传后 upload.file 表的 `url` 字段直接存储 OSS 远程 URL（以 http 开头），`getMediaUrl` 已能正确处理。无需修改，此 Task 仅做验证。

- [ ] **Step 1: 验证 getMediaUrl 逻辑**

确认 `format.js` 中 `getMediaUrl` 函数：

```javascript
export function getMediaUrl(file, preferOss = true) {
  if (!file) return ''
  if (preferOss && file.remoteUrl) return file.remoteUrl
  if (file.url) {
    if (file.url.startsWith('http')) return file.url  // ← OSS URL 直接返回
    return `${BASE_API}${file.url}`
  }
  ...
}
```

zhao-oss 写入 upload.file 时 `url` 字段为 `https://xxx.oss-cn-beijing.aliyuncs.com/...`，以 http 开头，`getMediaUrl` 会直接返回。✅ 无需修改。

- [ ] **Step 2: 验证 getCourseDetail 中 coverUrl 赋值**

确认 `course.js` 中 `getCourseDetail`：

```javascript
if (item.cover) item.coverUrl = getMediaUrl(item.cover)
```

zhao-oss 写入的 upload.file 记录的 `url` 是 OSS URL，`getMediaUrl(item.cover)` 会返回 OSS URL。✅ 无需修改。

---

### Task 5: 端到端验证

**Files:**
- 无新增文件

- [ ] **Step 1: 启动 Strapi 后端**

```bash
cd e:\code\basic
npm run dev
```

预期：Strapi 启动成功，zhao-oss 插件加载

- [ ] **Step 2: 启动前端开发服务器**

```bash
cd e:\code\web
npm run dev:h5
```

预期：前端启动成功

- [ ] **Step 3: 测试新建课程上传封面**

1. 访问 `http://localhost:5173/#/pages/course/form`
2. 点击"封面图"上传区域
3. 选择一张图片
4. 验证上传成功，显示 OSS URL 图片
5. 填写课程名称，点击保存
6. 验证课程创建成功，封面图关联正确

- [ ] **Step 4: 测试编辑课程上传缩略图**

1. 访问已有课程编辑页
2. 点击"缩略图"上传区域
3. 选择一张图片
4. 验证上传成功
5. 保存课程
6. 验证缩略图关联正确

- [ ] **Step 5: 提交所有更改**

```bash
cd e:\code
git add plugins/zhao-oss web/
git commit -m "feat: course form media upload uses zhao-oss with Strapi upload.file integration"
```

---

## 数据流对比

### 改造前
```
选择图片 → uploadMedia() → /api/media-extended/upload → Strapi 本地存储
→ 返回 documentId → form.cover = documentId → 提交课程
```

### 改造后
```
选择图片 → uploadToOss() → /api/zhao-oss/upload → 阿里云 OSS + Strapi upload.file 表
→ 返回 { documentId, url, ... } → form.cover = documentId, form.coverUrl = url → 提交课程
```
