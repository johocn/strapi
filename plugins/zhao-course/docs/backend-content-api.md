# zhao-course Content-API 手册

基础 URL: `http://localhost:1337/api/zhao-course`

## 路由层级

| 层级 | URL 模式 | 认证 | 说明 |
|------|---------|------|------|
| 公开 | `/v1/...` | 无 | 浏览类接口，无需登录 |
| 注册用户 | `/v1/my/...` | zhao-auth JWT (is-authenticated) | 已登录用户个人操作 |
| 管理员 | `/v1/admin/...` | zhao-auth JWT + has-course-permission | 管理操作，需特定角色 |

## 认证方式

- 公开路由：无需认证
- 注册用户/管理员路由：请求头 `Authorization: Bearer <token>`

## 通用查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| pagination[page] | integer | 页码（默认 1） |
| pagination[pageSize] | integer | 每页条数（默认 25） |
| pagination[withCount] | boolean | 是否返回总数 |
| sort | string | 排序（如 `createdAt:desc`） |
| filters[<field>][$eq] | - | 等于过滤 |
| filters[<field>][$contains] | - | 包含过滤 |
| populate | string/object | 填充关联字段 |
| fields | string[] | 选择返回字段 |
| publicationState | string | 发布状态（默认 `live`） |

---

## 一、公开路由

### 1.1 课程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/courses` | 课程列表（仅已发布） |
| GET | `/v1/courses/:documentId` | 课程详情（仅已发布） |

### 1.2 课程分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/course-categories` | 分类列表 |
| GET | `/v1/course-categories/:documentId` | 分类详情 |

### 1.3 课程标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/course-tags` | 标签列表 |
| GET | `/v1/course-tags/:documentId` | 标签详情 |

### 1.4 知识点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/knowledge-points` | 知识点列表 |
| GET | `/v1/knowledge-points/:documentId` | 知识点详情 |

### 1.5 课时

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/course-lessons` | 课时列表 |
| GET | `/v1/course-lessons/:documentId` | 课时详情 |

---

## 二、注册用户路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated`

### 2.1 我的课程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/my/courses` | 我的授权课程列表 |

### 2.2 我的进度

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/my/course-progresses` | 我的课程进度 |
| POST | `/v1/my/lesson-progress` | 上报课时学习进度 |
| POST | `/v1/my/lesson-answer/:documentId` | 提交课时答题 |
| POST | `/v1/my/claim-lesson-points/:documentId` | 领取课时积分 |
| POST | `/v1/my/claim-course-points/:documentId` | 领取课程积分 |
| GET | `/v1/my/course-auth/:courseDocumentId` | 查询课程授权状态 |

#### POST /v1/my/lesson-progress 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lessonId | integer | **是** | 课时 ID |
| progress | decimal | 否 | 进度百分比 |
| playPosition | integer | 否 | 播放位置（秒） |
| duration | integer | 否 | 总时长（秒） |

#### POST /v1/my/lesson-answer/:documentId 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isCorrect | boolean | **是** | 答题是否正确 |

#### GET /v1/my/course-auth/:courseDocumentId 响应

```json
{
  "data": {
    "authorized": true,
    "authType": "paid",
    "expiresAt": "2026-12-31T23:59:59Z"
  }
}
```

---

## 三、管理员路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated` + `has-course-permission`

### 3.1 课程管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/courses` | course.read | 课程列表 |
| GET | `/v1/admin/courses/:documentId` | course.read | 课程详情 |
| POST | `/v1/admin/courses` | course.create | 创建课程 |
| PUT | `/v1/admin/courses/:documentId` | course.update | 更新课程 |
| DELETE | `/v1/admin/courses/:documentId` | course.delete | 删除课程 |
| POST | `/v1/admin/courses/:documentId/publish` | course.publish | 发布课程 |

### 3.2 课程分类管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/course-categories` | course-category.read | 分类列表 |
| GET | `/v1/admin/course-categories/:documentId` | course-category.read | 分类详情 |
| POST | `/v1/admin/course-categories` | course-category.create | 创建分类 |
| PUT | `/v1/admin/course-categories/:documentId` | course-category.update | 更新分类 |
| DELETE | `/v1/admin/course-categories/:documentId` | course-category.delete | 删除分类 |

### 3.3 课程标签管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/course-tags` | course-tag.read | 标签列表 |
| GET | `/v1/admin/course-tags/:documentId` | course-tag.read | 标签详情 |
| POST | `/v1/admin/course-tags` | course-tag.create | 创建标签 |
| PUT | `/v1/admin/course-tags/:documentId` | course-tag.update | 更新标签 |
| DELETE | `/v1/admin/course-tags/:documentId` | course-tag.delete | 删除标签 |

### 3.4 知识点管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/knowledge-points` | knowledge-point.read | 知识点列表 |
| GET | `/v1/admin/knowledge-points/:documentId` | knowledge-point.read | 知识点详情 |
| POST | `/v1/admin/knowledge-points` | knowledge-point.create | 创建知识点 |
| PUT | `/v1/admin/knowledge-points/:documentId` | knowledge-point.update | 更新知识点 |
| DELETE | `/v1/admin/knowledge-points/:documentId` | knowledge-point.delete | 删除知识点 |

### 3.5 课时管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/course-lessons` | lesson.read | 课时列表 |
| GET | `/v1/admin/course-lessons/:documentId` | lesson.read | 课时详情 |
| POST | `/v1/admin/course-lessons` | lesson.create | 创建课时 |
| PUT | `/v1/admin/course-lessons/:documentId` | lesson.update | 更新课时 |
| DELETE | `/v1/admin/course-lessons/:documentId` | lesson.delete | 删除课时 |

### 3.6 用户课程授权管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/user-courses` | user-course.read | 授权列表 |
| GET | `/v1/admin/user-courses/:documentId` | user-course.read | 授权详情 |
| POST | `/v1/admin/user-courses` | user-course.grant | 授权课程 |
| DELETE | `/v1/admin/user-courses/:documentId` | user-course.grant | 撤销授权 |

### 3.7 课程进度管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/course-progresses` | course-progress.read | 进度列表 |
| GET | `/v1/admin/course-progresses/:documentId` | course-progress.read | 进度详情 |
| PUT | `/v1/admin/course-progresses/:documentId` | course-progress.update | 更新进度 |

### 3.8 课时进度管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/admin/lesson-progresses` | lesson-progress.read | 进度列表 |
| GET | `/v1/admin/lesson-progresses/:documentId` | lesson-progress.read | 进度详情 |
| PUT | `/v1/admin/lesson-progresses/:documentId` | lesson-progress.update | 更新进度 |

---

## 四、角色权限矩阵

| 权限动作 | admin | channel-admin | plugin-manager | instructor | user |
|---------|-------|--------------|----------------|------------|------|
| course-category.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| course-category.create/update | ✅ | ✅ | ✅ | - | - |
| course-category.delete | ✅ | ✅ | - | - | - |
| course-tag.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| course-tag.create/update | ✅ | ✅ | ✅ | - | - |
| course-tag.delete | ✅ | ✅ | - | - | - |
| course.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| course.create/update | ✅ | ✅ | ✅ | ✅ | - |
| course.delete | ✅ | ✅ | ✅ | - | - |
| course.publish | ✅ | ✅ | - | - | - |
| knowledge-point.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| knowledge-point.create/update | ✅ | ✅ | ✅ | ✅ | - |
| knowledge-point.delete | ✅ | ✅ | ✅ | - | - |
| lesson.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| lesson.create/update | ✅ | ✅ | ✅ | ✅ | - |
| lesson.delete | ✅ | ✅ | ✅ | - | - |
| user-course.read | ✅ | ✅ | ✅ | ✅ | - |
| user-course.grant | ✅ | ✅ | - | - | - |
| course-progress.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| course-progress.update | ✅ | ✅ | ✅ | ✅ | ✅ |
| lesson-progress.read | ✅ | ✅ | ✅ | ✅ | ✅ |
| lesson-progress.update | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 五、Strapi Admin 后台路由

基础 URL: `http://localhost:1337/admin/plugins/zhao-course`

认证方式: Strapi admin session（Cookie 自动），`policies: []`

| 路径 | 说明 |
|------|------|
| `/courses` | 课程 CRUD |
| `/course-categories` | 分类 CRUD |
| `/course-tags` | 标签 CRUD |
| `/knowledge-points` | 知识点 CRUD |
| `/lessons` | 课时 CRUD |
| `/user-courses` | 授权管理 |
| `/course-progresses` | 课程进度 |
| `/lesson-progresses` | 课时进度 |
