# zhao-oss API 使用手册

## 概述

`zhao-oss` 是一个 Strapi 插件，提供阿里云 OSS 云存储集成能力，支持文件自动同步、备份和管理。

## 目录

1. [安装与配置](#1-安装与配置)
2. [API 接口](#2-api-接口)
   - [2.1 仪表盘](#21-仪表盘)
   - [2.2 同步记录](#22-同步记录)
   - [2.3 同步操作](#23-同步操作)
   - [2.4 配置管理](#24-配置管理)
3. [前端管理界面](#3-前端管理界面)
4. [权限配置](#4-权限配置)
5. [使用示例](#5-使用示例)

---

## 1. 安装与配置

### 1.1 插件配置

在 `config/plugins.ts` 中配置：

```typescript
"zhao-oss": {
  enabled: true,
  resolve: "E:/code/plugins/zhao-oss",
  config: {
    providers: [
      {
        name: "aliyun",
        enabled: true,
        primary: true,
        options: {
          accessKeyId: env("ALIYUN_OSS_ACCESS_KEY_ID"),
          accessKeySecret: env("ALIYUN_OSS_ACCESS_KEY_SECRET"),
          bucket: env("ALIYUN_OSS_BUCKET"),
          region: env("ALIYUN_OSS_REGION"),
        },
      },
    ],
    maxRetries: 3,
    uploadTimeoutMs: 30000,
  },
},
```

### 1.2 环境变量

在 `.env` 文件中配置：

```env
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret_key
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_REGION=oss-cn-beijing
```

---

## 2. API 接口

所有接口基础路径：`/admin/plugins/zhao-oss`

### 2.1 仪表盘

#### 获取仪表盘数据

```
GET /sync/dashboard
```

**权限**: `plugin::zhao-oss.oss.sync.read`

**响应示例**:

```json
{
  "stats": {
    "total": 100,
    "synced": 85,
    "failed": 5,
    "pending": 10
  },
  "health": {
    "healthy": true,
    "provider": "aliyun",
    "lastCheck": "2024-01-15T10:30:00Z"
  },
  "recentRecords": [
    {
      "id": 1,
      "fileId": 123,
      "status": "success",
      "provider": "aliyun",
      "lastSyncedAt": "2024-01-15T10:25:00Z"
    }
  ]
}
```

### 2.2 同步记录

#### 获取同步记录列表

```
GET /sync/records?page=1&pageSize=20&status=success
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码，默认 1 |
| `pageSize` | number | 每页数量，默认 20 |
| `status` | string | 筛选状态：`success`/`failed`/`pending`/`syncing` |
| `provider` | string | 提供者名称 |

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "fileId": 123,
      "fileHash": "abc123",
      "status": "success",
      "provider": "aliyun",
      "remoteUrl": "https://bucket.oss-cn-beijing.aliyuncs.com/path/file.jpg",
      "lastSyncedAt": "2024-01-15T10:25:00Z",
      "errorMessage": null
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

#### 删除远程文件记录

```
DELETE /sync/remote/{recordId}
```

**权限**: `plugin::zhao-oss.oss.sync.delete`

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `recordId` | number | 同步记录 ID |

**响应示例**:

```json
{
  "success": true,
  "message": "Remote file deleted"
}
```

### 2.3 同步操作

#### 触发单个文件同步

```
POST /sync/trigger
```

**权限**: `plugin::zhao-oss.oss.sync.create`

**请求体**:

```json
{
  "fileId": 123
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "Sync triggered"
}
```

#### 批量同步

```
POST /sync/batch
```

**权限**: `plugin::zhao-oss.oss.sync.create`

**请求体**:

```json
{
  "limit": 50,
  "offset": 0
}
```

**响应示例**:

```json
{
  "success": 45,
  "failed": 5,
  "total": 50
}
```

#### 健康检查

```
GET /sync/health
```

**响应示例**:

```json
{
  "healthy": true,
  "provider": "aliyun",
  "latency": 125
}
```

### 2.4 配置管理

#### 获取配置

```
GET /settings
```

**权限**: `plugin::zhao-oss.oss.settings.read`

**响应示例**:

```json
{
  "provider": "aliyun",
  "accessKeyId": "******",
  "bucket": "my-bucket",
  "region": "oss-cn-beijing",
  "maxRetries": 3,
  "uploadTimeoutMs": 30000
}
```

#### 更新配置

```
PUT /settings
```

**权限**: `plugin::zhao-oss.oss.settings.update`

**请求体**:

```json
{
  "provider": "aliyun",
  "accessKeyId": "new-access-key",
  "accessKeySecret": "new-secret",
  "bucket": "my-bucket",
  "region": "oss-cn-beijing",
  "maxRetries": 3,
  "uploadTimeoutMs": 30000
}
```

#### 测试连接

```
POST /settings/test-provider
```

**请求体**:

```json
{
  "provider": "aliyun",
  "accessKeyId": "your-key",
  "accessKeySecret": "your-secret",
  "bucket": "my-bucket",
  "region": "oss-cn-beijing"
}
```

**响应示例**:

```json
{
  "success": true,
  "latency": 125
}
```

---

## 3. 前端管理界面

访问地址：`/admin/plugins/zhao-oss`

### 功能模块

| 模块 | 功能 |
|------|------|
| **仪表盘** | 统计卡片、健康状态、最近记录 |
| **同步记录** | 列表展示、筛选、批量操作 |
| **配置管理** | OSS 配置编辑、测试连接 |
| **操作中心** | 单个/批量同步触发 |

---

## 4. 权限配置

插件定义了以下权限：

| 权限键 | 说明 |
|--------|------|
| `plugin::zhao-oss.oss.sync.read` | 查看同步记录和仪表盘 |
| `plugin::zhao-oss.oss.sync.create` | 触发同步操作 |
| `plugin::zhao-oss.oss.sync.delete` | 删除远程文件 |
| `plugin::zhao-oss.oss.settings.read` | 查看配置 |
| `plugin::zhao-oss.oss.settings.update` | 修改配置 |

---

## 5. 使用示例

### 5.1 使用 API 触发同步

```javascript
// 触发单个文件同步
const response = await fetch('/admin/plugins/zhao-oss/sync/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ fileId: 123 })
});

const result = await response.json();
console.log(result);
```

### 5.2 获取同步记录

```javascript
const response = await fetch(
  '/admin/plugins/zhao-oss/sync/records?page=1&pageSize=20',
  {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }
);

const result = await response.json();
console.log(result.data);
```

### 5.3 测试连接

```javascript
const response = await fetch('/admin/plugins/zhao-oss/settings/test-provider', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    provider: 'aliyun',
    accessKeyId: 'test-key',
    accessKeySecret: 'test-secret',
    bucket: 'test-bucket',
    region: 'oss-cn-beijing'
  })
});

const result = await response.json();
console.log('连接状态:', result.success ? '成功' : '失败');
```

---

## 附录

### 状态码说明

| 状态 | 说明 |
|------|------|
| `success` | 同步成功 |
| `failed` | 同步失败 |
| `pending` | 待同步 |
| `syncing` | 同步中 |
| `deleted` | 已删除 |

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
