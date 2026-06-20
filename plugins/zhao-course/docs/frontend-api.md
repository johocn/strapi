# zhao-course 前端 API 手册

## 通用说明

### 接口分类

| 类型 | 说明 | URL 前缀 | 认证方式 |
|------|------|---------|---------|
| C 端公开接口 | 课程浏览 | `/api/zhao-course/v1/` | 无 |
| C 端用户接口 | 个人操作 | `/api/zhao-course/v1/my/` | zhao-auth JWT |
| Admin 接口 | Strapi 后台管理 | `/admin/plugins/zhao-course/` | Strapi admin session |

### Admin 接口

Admin 接口属于 Strapi 后台路由，详细接口见 [backend-content-api.md](./backend-content-api.md)。

### C 端接口调用

通过 request.js 拦截器自动携带 Token，URL 前缀为 `BASE_API` = `http://localhost:1337/api`。

### 数据转换函数

- `extractList(res)`: 从 Strapi 列表响应提取 `{ list: [...], pagination: { page, pageSize, total } }`
- `extractItem(res)`: 从 Strapi 单项响应提取数据对象
- `getMediaUrl(media)`: 将媒体对象转换为完整 URL

---

## 一、C 端公开接口

基础路径: `/api/zhao-course/v1`

### 1.1 课程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/courses` | 课程列表（仅已发布） |
| GET | `/courses/:documentId` | 课程详情（仅已发布） |

### 1.2 课程分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/course-categories` | 分类列表 |
| GET | `/course-categories/:documentId` | 分类详情 |

### 1.3 课程标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/course-tags` | 标签列表 |
| GET | `/course-tags/:documentId` | 标签详情 |

### 1.4 知识点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/knowledge-points` | 知识点列表 |
| GET | `/knowledge-points/:documentId` | 知识点详情 |

### 1.5 课时

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/course-lessons` | 课时列表 |
| GET | `/course-lessons/:documentId` | 课时详情 |

---

## 二、C 端用户接口

基础路径: `/api/zhao-course/v1/my`

**认证**: `Authorization: Bearer <token>`

### 2.1 我的课程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/courses` | 我的授权课程列表 |

### 2.2 我的进度

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/course-progresses` | 我的课程进度 |
| POST | `/lesson-progress` | 上报课时学习进度 |
| POST | `/lesson-answer/:documentId` | 提交课时答题 |
| POST | `/claim-lesson-points/:documentId` | 领取课时积分 |
| POST | `/claim-course-points/:documentId` | 领取课程积分 |
| GET | `/course-auth/:courseDocumentId` | 查询课程授权状态 |
