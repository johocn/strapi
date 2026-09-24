# zhao-oss 测试文档

## 1. 测试环境

| 项目 | 说明 |
|------|------|
| 测试框架 | Jest + ts-jest |
| 配置文件 | `tests/jest.config.ts` |
| 运行命令 | `npm test` |
| 覆盖率要求 | 70% (branches/functions/lines/statements) |

## 2. 测试文件结构

```
tests/
├── jest.config.ts
├── tsconfig.json
├── permissions.test.ts          # 权限定义测试
├── api-controller.test.ts       # API 控制器测试
├── has-oss-permission.test.ts   # OSS 权限策略测试
└── media-lifecycle.test.ts      # 媒体生命周期测试
```

## 3. 测试用例清单

### 3.1 权限定义测试 (permissions.test.ts)

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | PERMISSIONS 对象包含所有必需权限 | 验证 10 个权限键均存在 |
| 2 | oss.file.upload 允许所有注册用户 | admin, channel-admin, course-manager, instructor, user |
| 3 | oss.file.read 允许所有注册用户 | admin, channel-admin, course-manager, instructor, user |
| 4 | oss.file.delete 仅允许管理员 | admin, channel-admin |
| 5 | oss.folder.create 允许管理类角色 | admin, channel-admin, course-manager |
| 6 | oss.folder.read 允许所有注册用户 | admin, channel-admin, course-manager, instructor, user |
| 7 | oss.settings.read 仅允许 admin | admin |
| 8 | oss.settings.update 仅允许 admin | admin |
| 9 | oss.sync.read 允许管理员 | admin, channel-admin |
| 10 | oss.sync.create 允许管理员 | admin, channel-admin |
| 11 | oss.sync.delete 仅允许 admin | admin |
| 12 | admin 角色拥有所有权限 | 遍历所有权限键 |
| 13 | user 角色仅有上传和读取权限 | oss.file.upload + oss.file.read + oss.folder.read |
| 14 | instructor 角色有上传+读取+文件夹读取 | 无删除/设置/同步权限 |
| 15 | course-manager 角色有文件夹管理权限 | oss.folder.create + oss.folder.read |

### 3.2 OSS 权限策略测试 (has-oss-permission.test.ts)

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 未认证用户返回 UNAUTHENTICATED | context.user 为空 |
| 2 | 缺少 permission 配置返回 CONFIG_ERROR | config.permission 未提供 |
| 3 | 不存在的权限键返回 PERMISSION_NOT_FOUND | 权限键不在映射中 |
| 4 | admin 角色通过所有权限检查 | 遍历所有权限 |
| 5 | channel-admin 通过文件删除权限 | oss.file.delete |
| 6 | user 角色通过上传权限 | oss.file.upload |
| 7 | user 角色被拒绝删除权限 | oss.file.delete → FORBIDDEN_PERMISSION |
| 8 | instructor 角色被拒绝设置权限 | oss.settings.read → FORBIDDEN_PERMISSION |
| 9 | course-manager 角色通过文件夹创建权限 | oss.folder.create |
| 10 | roles 为字符串时正确解析 | context.user.roles = "admin" |
| 11 | roles 为对象数组时正确解析 | context.user.roles = [{ type: "admin" }] |

### 3.3 API 控制器测试 (api-controller.test.ts)

#### 3.3.1 upload 接口

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 无文件时返回 400 | files 为空 |
| 2 | 上传成功写入本地文件 | 验证 fs.writeFile 调用 |
| 3 | OSS 上传成功时 url 为 OSS URL | provider_metadata.ossStatus = "success" |
| 4 | OSS 上传失败时 url 为本地路径 | provider_metadata.ossStatus = "pending" |
| 5 | OSS 失败时写入 upload.file 表 | provider = "zhao-oss-local" |
| 6 | OSS 成功时写入 sync-record 表 | status = "success" |
| 7 | OSS 失败时写入 sync-record 表 | status = "pending" |
| 8 | folder 参数正确设置 folderPath | folderPath = "/course/covers" |
| 9 | 自定义 name 参数生效 | name = "custom-name.jpg" |
| 10 | 返回 documentId | response.documentId 存在 |
| 11 | 默认 folderPath 为 /general | 未传 folder 参数时 |

#### 3.3.2 mediaList 接口

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 返回分页结构 | list + pagination |
| 2 | folderPath 筛选生效 | where.folderPath = "/course/covers" |
| 3 | mime 筛选生效 | where.mime = { $contains: "image" } |
| 4 | search 搜索生效 | where.name = { $containsi: "keyword" } |
| 5 | 分页参数正确 | page=2, pageSize=10 |
| 6 | 仅返回 zhao-oss 管理的文件 | provider $in ["zhao-oss", "zhao-oss-local", "aliyun"] |

#### 3.3.3 getFolders 接口

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 返回树形结构 | folders 数组含 children |
| 2 | 空文件夹返回空数组 | 无文件夹记录时 |
| 3 | 嵌套文件夹正确构建树 | /course 和 /course/covers 父子关系 |

#### 3.3.4 createFolder 接口

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 缺少 name 返回 400 | name 为空 |
| 2 | 创建顶级文件夹 | parentPath = "/" → path = "/covers" |
| 3 | 创建子文件夹 | parentPath = "/course" → path = "/course/covers" |
| 4 | 重复文件夹返回已有记录 | 不创建重复 |
| 5 | pathId 自动递增 | maxPathId + 1 |

#### 3.3.5 deleteMedia 接口

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 缺少 fileId 返回 400 | fileId 为空 |
| 2 | 无效 fileId 返回 400 | fileId = "abc" |
| 3 | 文件不存在返回 404 | upload.file 查询为空 |
| 4 | admin 可删除任何文件 | userRoles 包含 "admin" |
| 5 | channel-admin 可删除任何文件 | userRoles 包含 "channel-admin" |
| 6 | 拥有者可删除自己的文件 | file.createdBy === user.id |
| 7 | 非拥有者非管理员返回 403 | 无权删除 |
| 8 | 删除成功调用 syncService.deleteFileCompletely | 验证调用参数 |

### 3.4 媒体生命周期测试 (media-lifecycle.test.ts)

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 完整上传→选择→关联流程 | upload → mediaList → select → course.cover |
| 2 | OSS 失败回退本地流程 | upload(OSS fail) → getMediaUrl → localUrl |
| 3 | OSS 成功优先读取流程 | upload(OSS ok) → getMediaUrl → ossUrl |
| 4 | 文件夹创建→上传→列表筛选 | createFolder → upload → mediaList(folderPath) |
| 5 | 删除媒体完整流程 | deleteMedia → mediaList 不再包含 |

## 4. Mock 策略

### 4.1 Strapi 核心 Mock

```typescript
const mockStrapi = {
  dirs: {
    static: { public: '/tmp/test-uploads' }
  },
  db: {
    query: jest.fn().mockReturnValue({
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    }),
  },
  plugin: jest.fn().mockReturnValue({
    service: jest.fn().mockReturnValue({
      getPrimaryProvider: jest.fn(),
      deleteFileCompletely: jest.fn(),
      checkSyncStatus: jest.fn(),
    }),
  }),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
};
```

### 4.2 OSS Provider Mock

```typescript
const mockProvider = {
  upload: jest.fn().mockResolvedValue({
    url: 'https://test.oss-cn-beijing.aliyuncs.com/test/file.jpg',
    provider: 'aliyun',
  }),
};
```

### 4.3 文件系统 Mock

```typescript
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));
```

## 5. 运行测试

```bash
# 运行所有测试
cd e:\code\plugins\zhao-oss
npm test

# 运行单个测试文件
npx jest tests/permissions.test.ts

# 查看覆盖率
npx jest --coverage

# 监听模式
npx jest --watch
```

## 6. 测试与权限映射一致性

`permissions.ts` 和 `has-oss-permission.ts` 必须保持一致。测试验证两者映射相同：

| 权限键 | permissions.ts | has-oss-permission.ts |
|--------|---------------|----------------------|
| oss.file.upload | ✅ | ✅ |
| oss.file.read | ✅ | ✅ |
| oss.file.delete | ✅ | ✅ |
| oss.folder.create | ✅ | ✅ |
| oss.folder.read | ✅ | ✅ |
| oss.settings.read | ✅ | ✅ |
| oss.settings.update | ✅ | ✅ |
| oss.sync.read | ✅ | ✅ |
| oss.sync.create | ✅ | ✅ |
| oss.sync.delete | ✅ | ✅ |
