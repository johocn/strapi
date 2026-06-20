# zhao-oss 前端 API 手册

## 通用说明

### 接口分类

| 类型 | 说明 | URL 前缀 | 认证方式 |
|------|------|---------|---------|
| C 端用户接口 | 文件上传/管理/同步 | `/api/zhao-oss/` | zhao-auth JWT |
| Admin 接口 | Strapi 后台管理 | `/admin/plugins/zhao-oss/` | Strapi admin session |

### Admin 接口

Admin 接口属于 Strapi 后台路由，详细接口见 [backend-content-api.md](./backend-content-api.md)。

### C 端接口调用

通过 request.js 拦截器自动携带 Token，URL 前缀为 `BASE_API` = `http://localhost:1337/api`。

### 数据转换函数

- `extractList(res)`: 从 Strapi 列表响应提取 `{ list: [...], pagination: { page, pageSize, total } }`
- `extractItem(res)`: 从 Strapi 单项响应提取数据对象

---

## 一、文件上传

基础路径: `/api/zhao-oss`

**认证**: `Authorization: Bearer <token>`

### 1.1 上传文件

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传文件到 OSS |

**Content-Type**: `multipart/form-data`

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | **是** | 上传的文件 |
| folder | string | 否 | 目标文件夹路径（默认 `/general`） |
| name | string | 否 | 自定义文件名 |

---

## 二、媒体管理

基础路径: `/api/zhao-oss`

### 2.1 媒体列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/media/list` | 查询媒体文件列表 |

#### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 |
| pageSize | integer | 每页条数 |
| folderPath | string | 按文件夹路径过滤 |
| mime | string | 按 MIME 类型过滤 |
| search | string | 按文件名搜索 |
| sort | string | 排序（格式 `field:dir`，默认 `createdAt:desc`） |

### 2.2 删除媒体

| 方法 | 路径 | 说明 |
|------|------|------|
| DELETE | `/media/:fileId` | 删除媒体文件 |

---

## 三、文件夹管理

基础路径: `/api/zhao-oss`

### 3.1 获取文件夹树

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/media/folders` | 获取文件夹树形结构 |

### 3.2 创建文件夹

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/media/folders` | 创建文件夹 |

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | **是** | 文件夹名称 |
| parentPath | string | 否 | 父文件夹路径（默认 `/`） |

---

## 四、同步状态

基础路径: `/api/zhao-oss`

### 4.1 查询文件同步状态

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sync/status/:fileId` | 查询指定文件的 OSS 同步状态 |
