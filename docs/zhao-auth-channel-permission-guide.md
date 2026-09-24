# zhao-auth 渠道权限体系 — 开发文档与使用手册

> 版本：1.0.0 | 更新日期：2026-06-05

---

## 一、架构概览

### 1.1 分层架构

```
请求 → is-authenticated → has-permission(action) → has-channel-scope
         认证检查          功能权限检查              渠道范围注入
         ↓                 ↓                        ↓
       ctx.state.user    pass/forbidden          ctx.state.channelScope
```

- **路由层**：认证 + 功能权限（Strapi 原生 `config.policies`）
- **控制器层**：读取 `ctx.state.channelScope`，传给服务层
- **服务层**：各插件根据 `channelScope` 过滤查询

### 1.2 核心设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 策略机制 | Strapi 原生 `config.policies` | 合规、可维护 |
| JWT 方案 | 自定义 JWT + `auth: false` | 多角色数组 Strapi 原生不支持 |
| 数据隔离 | 混合模式 | 核心资源绑渠道，辅助资源全局共享 |
| 渠道绑定 | channelScope(all/specific) + channelIds | 支持全渠道和指定渠道 |
| 分销范围 | 全链路下级（path 前缀） | 支持多级分销统计 |

---

## 二、策略体系

### 2.1 统一策略清单

| 策略名 | 职责 | 参数 | 阻断性 | Strapi 引用 |
|--------|------|------|--------|-------------|
| `is-authenticated` | 认证检查（提取JWT+验证+注入user） | 无 | 是 | `plugin::zhao-auth.is-authenticated` |
| `has-permission` | 功能权限检查 | `action: string` | 是 | `plugin::zhao-auth.has-permission` |
| `has-channel-access` | 特定渠道访问权 | channelId（从请求提取） | 是 | `plugin::zhao-auth.has-channel-access` |
| `has-channel-scope` | 渠道范围注入 | 无 | 否 | `plugin::zhao-auth.has-channel-scope` |

### 2.2 已废弃策略

| 旧策略 | 替代方案 |
|--------|---------|
| `has-channel-access-advanced` | `has-permission` + `has-channel-scope` |
| `is-channel-admin` | `has-permission(action: "channel.update")` |
| `is-channel-owner` | `has-permission(action: "channel.delete")` |
| `has-auth-permission` | `has-permission` |
| `has-course-permission` | `has-permission(action: "xxx")` |
| `has-point-permission` | `has-permission(action: "xxx")` |
| `has-quiz-permission` | `has-permission(action: "xxx")` |
| `has-channel-permission` | `has-permission(action: "xxx")` |
| `has-oss-permission` | `has-permission(action: "oss.xxx")` |
| `has-role` | `has-permission`（通过权限树角色映射） |

### 2.3 已删除中间件

| 中间件 | 替代方案 |
|--------|---------|
| `channel-auth`（zhao-channel） | Strapi 原生 `config.policies` |
| `authorize`（zhao-auth） | Strapi 原生 `config.policies` |
| `authenticate`（zhao-auth） | `is-authenticated` 策略 |

---

## 三、路由配置规范

### 3.1 路由类型

```typescript
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// 公开路由（无需认证）
const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

// 用户路由（需认证）
const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

// 管理端路由（认证 + 功能权限）
const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

// 渠道范围路由（认证 + 功能权限 + 渠道范围注入）
const channelScopeRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
    ],
  },
});

// 渠道访问路由（认证 + 功能权限 + 特定渠道访问权）
const channelAccessRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-access",
    ],
  },
});
```

### 3.2 路由类型选择指南

| 场景 | 路由类型 | 说明 |
|------|---------|------|
| 登录/注册/公开数据 | `publicRoute` | 无需认证 |
| 用户个人数据 | `userRoute` | 仅需认证 |
| 管理端全局资源（功能开关等） | `adminRoute` | 认证 + 功能权限 |
| 管理端渠道资源（课程/题库等） | `channelScopeRoute` | 认证 + 功能权限 + 渠道范围 |
| 特定渠道操作（进入渠道详情） | `channelAccessRoute` | 认证 + 功能权限 + 渠道访问权 |

---

## 四、ChannelScope 接口

### 4.1 数据结构

```typescript
interface ChannelScope {
  all: boolean;        // true=全渠道可见（admin）
  channelIds: number[]; // 具体可见渠道ID集合
}
```

### 4.2 解析逻辑

| 角色 | 结果 | 说明 |
|------|------|------|
| admin | `{ all: true, channelIds: [] }` | 全渠道可见 |
| channel-admin | `{ all: false, channelIds: [用户渠道+下级] }` | 含全链路下级 |
| 其他 | `{ all: false, channelIds: [用户渠道] }` | 仅自己渠道 |

### 4.3 服务层使用

```typescript
// 在控制器中获取渠道范围
const channelScope = ctx.state.channelScope;

// 混合模式过滤（课程、题库等可跨渠道共享的资源）
if (!channelScope.all) {
  filters.$or = [
    { channelScope: 'all' },
    { channelIds: { $containsAny: channelScope.channelIds } },
  ];
}

// 单渠道过滤（积分记录等归属单一渠道的资源）
if (!channelScope.all) {
  filters.channel = { id: { $in: channelScope.channelIds } };
}
```

---

## 五、API 端点

### 5.1 认证相关

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/zhao-auth/v1/login` | 登录 | 否 |
| POST | `/api/zhao-auth/v1/register` | 注册 | 否 |
| POST | `/api/zhao-auth/v1/reset-password` | 重置密码 | 否 |

### 5.2 用户信息

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/zhao-auth/v1/my/roles` | 获取我的角色 | 是 |
| GET | `/api/zhao-auth/v1/my/permissions` | 获取我的权限 | 是 |
| GET | `/api/zhao-auth/v1/my/permission-keys` | 获取权限键列表 | 是 |
| GET | `/api/zhao-auth/v1/my/channel-scope` | 获取我的渠道范围 | 是 |

### 5.3 权限管理（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/zhao-auth/v1/admin/permissions/tree` | 权限树 | role.read |
| GET | `/api/zhao-auth/v1/admin/permissions/role/:role` | 角色权限 | role.read |
| PUT | `/api/zhao-auth/v1/admin/permissions/role/:role` | 更新角色权限 | role.assign |
| POST | `/api/zhao-auth/v1/admin/permissions/init` | 初始化权限 | role.assign |

---

## 六、权限树

### 6.1 模块结构

```
课程中心 (menu.course-center)
├── 课程管理 (menu.course)
│   ├── course.create / course.read / course.update / course.publish / course.delete
├── 分类管理 (menu.course-category)
│   ├── course-category.create / .read / .update / .delete
├── 标签管理 (menu.course-tag)
│   ├── course-tag.create / .read / .update / .delete
└── 课程授权 (menu.course-auth)
    ├── course-auth.read / .create / .delete

学习数据 (menu.learning-data)
├── 学习进度 (menu.learning-progress)
└── 课程统计 (menu.course-stats)

题库系统 (menu.quiz-system)
├── 题库管理 (menu.quiz)
│   ├── quiz.create / .read / .update / .delete
├── 知识点 (menu.knowledge)
│   ├── knowledge.create / .read / .update / .delete
├── 考试管理 (menu.exam)
│   ├── exam.create / .read / .update / .delete
└── 答题记录 (menu.quiz-record)
    ├── quiz-record.read

积分体系 (menu.point-system)
├── 积分类型 / 规则 / 模板 / 记录 / 兑换 / 商品 / 配置 / 核销
└── point-dashboard.read

营销运营 (menu.marketing-center)
├── 渠道管理 (menu.channel)
│   ├── channel.create / .read / .update / .delete
├── 成员管理 (menu.members)
│   ├── channel-member.add / .remove / .read
├── 分销邀请 (menu.invite)
│   ├── user-invite.send / .validate
└── 渠道网络 (menu.network)

系统工具 (menu.system-tools)
├── 用户角色 (menu.user-roles)
│   ├── role.read / .assign / .revoke / .read-logs
├── 权限管理 (menu.permissions)
│   ├── role.read / role.assign
├── 功能开关 (menu.feature-flag)
│   ├── feature-flag.create / .read / .update / .delete
└── 媒体库 (menu.media)
    ├── oss.upload / .read / .delete
```

### 6.2 默认角色权限

| 角色 | 权限范围 |
|------|---------|
| admin | 全部权限 |
| channel-admin | 除系统工具外的所有权限 |
| plugin-manager | 课程+题库+积分 |
| instructor | 只读+学习数据 |

---

## 七、Content-Type 渠道字段规划

### 7.1 混合模式（可跨渠道共享）

```json
{
  "channelScope": {
    "type": "enumeration",
    "enum": ["all", "specific"],
    "default": "all"
  },
  "channelIds": {
    "type": "json",
    "default": "[]"
  }
}
```

适用：course, course-category, quiz, quiz-exam

### 7.2 单渠道模式（归属单一渠道）

```json
{
  "channel": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::zhao-channel.channel"
  }
}
```

适用：user-course-auth, point-record, point-redemption

### 7.3 全局共享（无渠道字段）

适用：course-tag, knowledge-point, point-rule, feature-flag

---

## 八、新增插件开发指南

### 8.1 添加新路由

1. 在插件的 `routes/content-api.ts` 中使用标准路由类型
2. 权限 action 命名规则：`{资源}.{操作}`（如 `course.read`）
3. 需要渠道隔离的资源使用 `channelScopeRoute`

### 8.2 添加新权限

1. 在 `zhao-auth/server/src/permissions.ts` 的权限树中添加
2. 在默认角色映射中配置
3. 调用 `POST /api/zhao-auth/v1/admin/permissions/init` 初始化

### 8.3 添加新 Content-Type

1. 根据数据隔离需求选择渠道字段类型（混合/单渠道/无）
2. 在控制器中读取 `ctx.state.channelScope`
3. 在服务层查询时根据 `channelScope` 过滤

---

## 九、Strapi v5 策略开发规范

### 9.1 策略签名

```typescript
// Strapi 原生策略签名（直接导出函数，非工厂）
const myPolicy = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  // policyContext = createPolicyContext('koa', ctx)，包含 Koa ctx 所有属性
  // config = 路由中策略的 config 对象
  // { strapi } = Strapi 实例

  // 返回 true 或 undefined → 通过
  // 返回 false → 抛出 PolicyError
  // 调用 policyContext.unauthorized(msg) → 401
  // 调用 policyContext.forbidden(msg) → 403
};

export default myPolicy;
```

### 9.2 策略注册

```typescript
// policies/index.ts
import myPolicy from "./my-policy";

export default {
  "my-policy": myPolicy,
};
```

```typescript
// register.ts — 直接注册到 Strapi 策略注册表
const policyRegistry = strapi.get("policies");
policyRegistry.add("plugin::zhao-auth", policies);
```

**重要**：不要手动实例化策略（`factory(strapi)`），直接将策略对象传给 `policyRegistry.add()`。

### 9.3 路由中引用策略

```typescript
// 字符串形式（无 config）
policies: ["plugin::zhao-auth.is-authenticated"]

// 对象形式（带 config）
policies: [{ name: "plugin::zhao-auth.has-permission", config: { action: "course.read" } }]
```

---

## 十、前端集成

### 10.1 获取渠道范围

```javascript
// 登录后获取渠道范围
const { data } = await request.get('/api/zhao-auth/v1/my/channel-scope');
// data = { all: true, channelIds: [] }  (admin)
// data = { all: false, channelIds: [1, 2, 3] }  (channel-admin)
```

### 10.2 渠道筛选器

管理端页面根据 `channelScope` 决定渠道选择器的可选项：
- `all: true` → 显示所有渠道
- `all: false` → 仅显示 `channelIds` 中的渠道

### 10.3 权限控制

```javascript
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const hasPermission = userStore.hasPermission;

// 菜单可见性
<menu-item v-if="hasPermission('menu.channel')">渠道管理</menu-item>

// 按钮操作权限
<button v-if="hasPermission('channel.create')">创建渠道</button>
```

---

## 十一、文件变更清单

### 11.1 新增文件

| 文件 | 说明 |
|------|------|
| `zhao-auth/server/src/policies/has-permission.ts` | 统一功能权限策略 |
| `zhao-auth/server/src/policies/has-channel-access.ts` | 渠道访问策略 |
| `zhao-auth/server/src/policies/has-channel-scope.ts` | 渠道范围注入策略 |
| `zhao-auth/server/src/services/channel-scope.service.ts` | 渠道范围服务 |

### 11.2 重写文件

| 文件 | 变更 |
|------|------|
| `zhao-auth/server/src/policies/is-authenticated.ts` | 改为 Strapi 原生签名 |
| `zhao-auth/server/src/policies/index.ts` | 清理，只导出4个策略 |
| `zhao-auth/server/src/register.ts` | 策略直接注册，不再手动实例化 |
| `zhao-auth/server/src/bootstrap.ts` | 简化，移除动态策略注册 |
| `zhao-auth/server/src/services/auth.service.ts` | 清理策略注册/授权方法 |
| `zhao-auth/server/src/services/index.ts` | 添加 channel-scope 服务 |
| `zhao-auth/server/src/index.ts` | 添加 policies 导出 |
| `zhao-auth/server/src/routes/content-api/index.ts` | 使用 config.policies |
| `zhao-auth/server/src/controllers/permission.ts` | 添加 getMyChannelScope |
| `zhao-channel/server/src/routes/content-api/index.ts` | 使用 config.policies |
| `zhao-channel/server/src/policies/index.ts` | 清空策略导出 |
| `zhao-course/server/src/routes/content-api.ts` | 使用 config.policies |
| `zhao-course/server/src/policies/index.ts` | 清空策略导出 |
| `zhao-point/server/src/routes/content-api.ts` | 使用 config.policies |
| `zhao-point/server/src/policies/index.ts` | 清空策略导出 |
| `zhao-quiz/server/src/routes/content-api.ts` | 使用 config.policies |
| `zhao-quiz/server/src/policies/index.ts` | 清空策略导出 |
| `zhao-common/server/src/routes/content-api.ts` | 使用 config.policies |

### 11.3 已废弃文件（保留但不再使用）

| 文件 | 说明 |
|------|------|
| `zhao-auth/server/src/policies/has-role.ts` | 被 has-permission 替代 |
| `zhao-auth/server/src/policies/has-auth-permission.ts` | 被 has-permission 替代 |
| `zhao-auth/server/src/policies/has-oss-permission.ts` | 被 has-permission 替代 |
| `zhao-auth/server/src/middlewares/authenticate.ts` | 被 is-authenticated 策略替代 |
| `zhao-auth/server/src/middlewares/authorize.ts` | 被 config.policies 替代 |
| `zhao-auth/server/src/middlewares/auth-middleware.ts` | 被 config.policies 替代 |
| `zhao-channel/server/src/middlewares/channel-auth.ts` | 被 config.policies 替代 |

---

## 十二、v1.1 更新记录（2026-06-05）

### 12.1 修复项

| 问题 | 修复 | 文件 |
|------|------|------|
| point-record/point-redemption 重复渠道字段 | 删除冗余 `channelId`，保留 `channel` 关系 | `zhao-point/content-types/point-record/schema.json`, `point-redemption/schema.json` |
| point service 写入字段名错误 | `channelId` → `channel` | `zhao-point/services/point.ts`, `redemption.ts` |
| point-types 500 错误 | `populate: true` 在 Strapi v5 Document Service API 中无效，改为省略 | `zhao-point/controllers/point-admin.ts` |
| permission.service TS 警告 | `data: { permissions }` 添加 `as any` | `zhao-auth/services/permission.service.ts` |

### 12.2 新增功能

| 功能 | 说明 | 文件 |
|------|------|------|
| 服务层 channelScope 过滤 | course/quiz/category 的 find 方法支持按渠道范围过滤 | `zhao-course/services/course.ts`, `course-category.ts`, `zhao-quiz/services/quiz.ts` |
| 控制器传递 channelScope | 控制器从 `ctx.state.channelScope` 取值传给服务层 | `zhao-course/controllers/course.ts`, `course-category.ts`, `zhao-quiz/controllers/quiz.ts` |
| 权限树补全按钮权限 | 营销运营+系统工具模块添加按钮级权限 | `zhao-auth/permissions.ts` |

### 12.3 channelScope 过滤逻辑

```typescript
// 服务层 find 方法签名
async find(query, publicOnly?, channelScope?: { all: boolean; channelIds: number[] })

// 过滤逻辑
if (channelScope && !channelScope.all && channelScope.channelIds.length > 0) {
  filters.$or = [
    { channelScope: "all" },
    ...channelScope.channelIds.map(id => ({
      channelScope: "specific",
      channelIds: { $contains: id }
    }))
  ];
}
```

- `channelScope` 为 `undefined`（公开路由）→ 不过滤
- `channelScope.all` 为 `true`（admin）→ 不过滤
- `channelScope.all` 为 `false` → 只返回全渠道可见 + 指定渠道的记录

### 12.4 权限树新增按钮权限

```
营销运营 (menu.marketing-center)
├── 渠道管理 (menu.channel)
│   ├── channel.create / channel.update / channel.delete
├── 渠道网络 (menu.network)
│   ├── network.view
├── 成员管理 (menu.members)
│   ├── member.invite / member.remove / member.assign-role
├── 分销邀请 (menu.invite)
│   ├── invite.create / invite.revoke
├── 兑换码 (menu.redemption-code)
│   ├── redemption-code.create / redemption-code.delete
└── 兑换记录 (menu.redemption-record)
    └── redemption-record.review

系统工具 (menu.system-center)
├── 功能开关 (menu.feature-flag)
│   └── feature-flag.update
└── 用户角色 (menu.user-roles)
    ├── role.assign / role.revoke
```
