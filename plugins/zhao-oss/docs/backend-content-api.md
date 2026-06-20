# zhao-oss Content-API 手册

基础 URL: `http://localhost:1337/api/zhao-oss`

## 路由层级

| 层级 | URL 模式 | 认证 | 说明 |
|------|---------|------|------|
| 注册用户 | `/...` | zhao-auth JWT (is-authenticated + has-oss-permission) | 文件上传/管理/同步 |

## 认证方式

请求头 `Authorization: Bearer <token>`，通过 zhao-auth 中间件认证 + 授权。

## 通用查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码（默认 1） |
| pageSize | integer | 每页条数（默认 20） |

---

## 一、文件上传

### 1.1 上传文件

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/upload` | oss.file.upload | 上传文件到 OSS |

**Content-Type**: `multipart/form-data`

#### POST /upload 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | **是** | 上传的文件 |
| folder | string | 否 | 目标文件夹路径（默认 `/general`） |
| name | string | 否 | 自定义文件名 |

#### POST /upload 响应

```json
{
  "id": 1,
  "documentId": "abc123",
  "name": "example.png",
  "url": "/general/abc123.png",
  "hash": "d41d8cd98f00b204e9800998ecf8427e",
  "ext": ".png",
  "mime": "image/png",
  "size": 12345,
  "provider": "aliyun",
  "folderPath": "/general",
  "provider_metadata": {
    "ossUrl": "https://oss.example.com/general/abc123.png",
    "localUrl": "/general/abc123.png",
    "ossStatus": "success"
  }
}
```

---

## 二、媒体管理

### 2.1 媒体列表

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/media/list` | oss.file.read | 查询媒体文件列表 |

#### GET /media/list 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 |
| pageSize | integer | 每页条数 |
| folderPath | string | 按文件夹路径过滤 |
| mime | string | 按 MIME 类型过滤 |
| search | string | 按文件名搜索 |
| sort | string | 排序（格式 `field:dir`，默认 `createdAt:desc`） |

### 2.2 删除媒体

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| DELETE | `/media/:fileId` | oss.file.delete | 删除媒体文件（本地+远程） |

删除权限：admin、channel-admin 或文件所有者。

---

## 三、文件夹管理

### 3.1 获取文件夹树

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/media/folders` | oss.folder.read | 获取文件夹树形结构 |

### 3.2 创建文件夹

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/media/folders` | oss.folder.create | 创建文件夹 |

#### POST /media/folders 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | **是** | 文件夹名称 |
| parentPath | string | 否 | 父文件夹路径（默认 `/`） |

---

## 四、同步状态

### 4.1 查询文件同步状态

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/sync/status/:fileId` | oss.sync.read | 查询指定文件的 OSS 同步状态 |

#### GET /sync/status/:fileId 响应

```json
{
  "synced": true,
  "provider": "aliyun",
  "remoteUrl": "https://oss.example.com/general/abc123.png"
}
```

---

## 五、角色权限矩阵

| 权限动作 | admin | channel-admin | course-manager | instructor | user |
|---------|-------|--------------|----------------|------------|------|
| oss.file.upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| oss.file.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| oss.file.delete | ✅ | ✅ | - | - | - |
| oss.folder.create | ✅ | ✅ | ✅ | - | - |
| oss.folder.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| oss.settings.read | ✅ | - | - | - | - |
| oss.settings.update | ✅ | - | - | - | - |
| oss.sync.read | ✅ | ✅ | - | - | - |
| oss.sync.create | ✅ | ✅ | - | - | - |
| oss.sync.delete | ✅ | - | - | - | - |

---

## 六、Strapi Admin 后台路由

基础 URL: `http://localhost:1337/admin/plugins/zhao-oss`

认证方式: Strapi admin session（Cookie 自动），`policies: []`

### 同步管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sync/dashboard` | 同步仪表盘 |
| GET | `/sync/records` | 同步记录列表 |
| POST | `/sync/trigger` | 手动触发指定文件同步 |
| POST | `/sync/batch` | 批量同步所有未同步文件 |
| DELETE | `/sync/remote/:recordId` | 删除云端备份 |
| GET | `/sync/health` | 检查提供者健康状态 |

### 设置管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/settings` | 获取当前配置 |
| PUT | `/settings` | 更新配置 |
| POST | `/settings/test-provider` | 测试提供者连接 |

#### POST /sync/trigger 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileId | integer | **是** | 文件 ID |

#### PUT /settings 请求体

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用插件 |
| providers | array | 提供者配置列表 |
| fallbackToLocal | boolean | 是否回退到本地存储 |
| enableUrlRewrite | boolean | 是否启用 URL 重写 |

#### POST /settings/test-provider 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| provider.name | string | **是** | 提供者名称 |
| provider.options | object | **是** | 提供者配置选项 |
