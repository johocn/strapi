# Strapi 5 插件后台管理开发经验

> 基于 zhao-channel / zhao-point / zhao-oss / zhao-course / zhao-sso 五个插件的实战踩坑总结，结合 Strapi 5 官方文档验证。

---

## 一、架构总览

Strapi 插件的后台管理功能涉及 **前后端两条线**：

```
前端 (admin/src)                    后端 (server/src)
┌─────────────────┐                ┌─────────────────┐
│ index.ts        │──register──→   │ routes/admin.ts  │
│  addMenuLink()  │                │  type: "admin"   │
│  registerPlugin│                │  policies: []    │
├─────────────────┤                ├─────────────────┤
│ pages/App.tsx   │──HTTP──→       │ controllers/     │
│  useFetchClient │  /admin/       │  admin-xxx.ts    │
│  API_PREFIX     │  plugins/      │                  │
└─────────────────┘                └─────────────────┘
```

**核心原则**：admin 路由和 content-api 路由是两套完全独立的认证体系，互不干扰。

---

## 二、后端路由：admin vs content-api

### 2.1 路由类型对比

| 维度 | admin 路由 | content-api 路由 |
|------|-----------|-----------------|
| `type` | `"admin"` | `"content-api"` |
| URL 前缀 | `/admin/plugins/{plugin-name}/...` | `/api/{plugin-name}/...` |
| 认证方式 | Strapi admin session（自动） | API Token / Bearer JWT |
| 访问者 | 后台管理员 | 前端/移动端用户 |
| 是否需要 policies | 不需要（admin 自带认证） | 需要（authenticate + authorize） |

### 2.2 admin 路由标准写法

```typescript
// server/src/routes/admin.ts
export default {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/dashboard",
      handler: "admin-controller.dashboard",
      config: { policies: [] },
    },
  ],
};
```

### 2.3 路由注册（routes/index.ts）

```typescript
// server/src/routes/index.ts
import admin from "./admin";
import contentApi from "./content-api";

export default {
  admin,
  "content-api": contentApi,
};
```

**踩坑**：zhao-oss 曾用 `admin: adminRoutes.admin`（多一层嵌套），导致路由注册失败。正确写法是直接 `admin: adminRoutes`。

---

## 三、认证机制：最容易踩坑的地方

### 3.1 admin 路由不需要自定义认证中间件

**错误写法**（会导致 Policy Failed / 403）：

```typescript
// ❌ admin 路由不要用这些
config: {
  middlewares: ["plugin::zhao-auth.authenticate"],           // JWT 认证
  policies: [{ name: "plugin::zhao-auth.is-authenticated" }], // JWT policy
  auth: false,                                                // 禁用 admin 自带认证
}
```

**原因**：
- `plugin::zhao-auth.authenticate` 是 content-api 的 JWT 认证中间件，要求请求带 `Authorization: Bearer <token>`
- admin 页面的请求由 `useFetchClient()` 发出，带的是 Strapi admin session cookie，不是 Bearer token
- `auth: false` 会禁用 Strapi admin 自带的 session 认证，反而让请求完全无认证

**正确写法**：

```typescript
// ✅ admin 路由只需空 policies
config: { policies: [] }
```

Strapi admin 路由自带 session 认证，只有已登录的管理员才能访问，无需额外 policies。

### 3.2 content-api 路由才需要认证中间件

```typescript
// ✅ content-api 路由使用 zhao-auth 中间件
config: {
  middlewares: [
    "plugin::zhao-auth.authenticate",
    { name: "plugin::zhao-auth.authorize", config: { policies: [...] } },
  ],
}
```

### 3.3 认证体系对照表

| 认证方式 | 适用路由 | 请求头 | 验证逻辑 |
|---------|---------|-------|---------|
| Strapi admin session | admin | Cookie (自动) | Strapi 内置 |
| `plugin::zhao-auth.authenticate` | content-api | `Authorization: Bearer <jwt>` | zhao-auth 中间件 |
| `plugin::zhao-channel.channel-auth` | content-api | `Authorization: Bearer <jwt>` | channel-auth 中间件 |
| `auth: false` | content-api | 无 | 完全公开 |

---

## 四、前端 API 前缀

### 4.1 正确的前缀

admin 页面的 HTTP 请求必须使用 `/admin/plugins/{plugin-name}/` 前缀：

```typescript
// ✅ 正确
const ADMIN_API = `/admin/plugins/${PLUGIN_ID}`;
const { data } = await get(`${ADMIN_API}/channels`);
// 实际请求: GET /admin/plugins/zhao-channel/channels
```

### 4.2 错误的前缀

```typescript
// ❌ 错误 - 会命中 content-api 路由，触发 403 PolicyError
const { data } = await get(`/${PLUGIN_ID}/channels`);
// 实际请求: GET /zhao-channel/channels → 命中 content-api 路由
```

**原因**：Strapi 路由匹配按前缀区分：
- `/admin/plugins/zhao-channel/...` → 匹配 admin 路由
- `/zhao-channel/...` → 匹配 content-api 路由（需要 JWT）

### 4.3 导航路径 vs API 路径

```typescript
// 导航路径 - 用 /plugins/ 前缀（Strapi admin 前端路由）
navigate(`/plugins/${PLUGIN_ID}/products`);

// API 请求路径 - 用 /admin/plugins/ 前缀（后端 HTTP 接口）
const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products`);
```

两者不要混淆。导航是前端 React Router 路径，API 是后端 HTTP 接口路径。

---

## 五、前端注册：addMenuLink 标准模式

### 5.1 完整标准写法（zhao-channel 模式）

```typescript
// admin/src/index.ts
import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: PLUGIN_ID,
      },
      Component: async () => {
        const { App } = await import("./pages/App");
        return App;
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
```

### 5.2 三个关键陷阱

#### 陷阱 1：icon 必须是 React 函数组件

```typescript
// ❌ 错误 - PuzzlePiece 是对象，不是组件
import { PuzzlePiece } from "@strapi/icons";
app.addMenuLink({ icon: PuzzlePiece, ... });

// ✅ 正确 - 包装为函数组件
import { PuzzlePiece } from "@strapi/icons";
const PluginIcon = () => <PuzzlePiece />;
export { PluginIcon };
app.addMenuLink({ icon: PluginIcon, ... });
```

**报错**：`Element type is invalid: expected a string or a class/function but got: object`

#### 陷阱 2：Component 必须返回组件本身，不是 Promise

```typescript
// ❌ 错误 - import() 返回 Promise 对象
Component: () => import("./pages/App")

// ✅ 正确 - await 解包后返回组件
Component: async () => {
  const { App } = await import("./pages/App");
  return App;
}
```

**报错**：`Element type is invalid: expected a string or a class/function but got: object`

#### 陷阱 3：to 路径不要加前导斜杠

```typescript
// ❌ 错误
to: `/plugins/${PLUGIN_ID}`

// ✅ 正确
to: `plugins/${PLUGIN_ID}`
```

根据官方文档，`addMenuLink` 的 `to` 是相对于 admin panel root 的路径，最终 URL 为 `http://localhost:1337/admin/plugins/{plugin-name}`。

---

## 六、TypeScript 配置

### 6.1 分离 admin 和 server 的 tsconfig

admin 和 server 需要不同的 TypeScript 配置。不同插件的配置可能略有差异，以下为两种实际模式：

**模式 A：分离式（zhao-point）**

```json
// admin/tsconfig.json
{
  "extends": "@strapi/typescript-utils/tsconfigs/admin",
  "include": ["src/**/*.ts", "src/**/*.tsx", "./custom.d.ts"],
  "compilerOptions": {
    "outDir": "../dist/admin",
    "rootDir": "./src"
  },
  "exclude": ["node_modules"]
}
```

```json
// server/tsconfig.json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "include": ["src/**/*.ts"],
  "compilerOptions": {
    "outDir": "../dist/server",
    "rootDir": "./src"
  },
  "exclude": ["node_modules"]
}
```

**模式 B：统一式（zhao-course，无 server/tsconfig.json）**

```json
// admin/tsconfig.json
{
  "extends": "@strapi/typescript-utils/tsconfigs/admin",
  "include": ["./src", "./custom.d.ts"],
  "compilerOptions": {
    "rootDir": "../",
    "baseUrl": "."
  }
}
```

```json
// 根 tsconfig.json（同时覆盖 server 和 admin）
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./server/src/*"] }
  },
  "include": ["server/src/**/*.ts", "admin/src/**/*.ts", "admin/src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### 6.2 admin/custom.d.ts 解决类型不兼容

```typescript
// admin/custom.d.ts
declare module "@strapi/design-system/*";
declare module "@strapi/design-system";
```

Strapi Design System v2 的类型导出与 TypeScript 严格模式不兼容，需要通过 `custom.d.ts` 声明为 any 模块。

### 6.3 常见 TS 报错

| 报错 | 原因 | 修复 |
|------|------|------|
| `TS17004: Cannot use JSX unless '--jsx' flag is provided` | admin/tsconfig.json 缺少或未继承 jsx 配置 | 继承 `@strapi/typescript-utils/tsconfigs/admin` |
| `TS2604: 'Field' is not a module` | `@strapi/design-system` 类型不兼容 | 添加 `custom.d.ts` |
| `TS2786: 'Tabs' cannot be used as a namespace` | 同上 | 同上 |

---

## 七、Strapi Design System v2 组件映射

### 7.1 组件名变更

| v1 (旧) | v2 (新) | 说明 |
|---------|---------|------|
| `Select` / `Option` | `SingleSelect` / `SingleSelectOption` | 单选下拉 |
| `Field.Label` | `Typography variant="pi" fontWeight="bold"` | 字段标签 |
| `Field.Input` | 直接使用 `TextInput` | 字段输入 |
| `Tabs.Root/List/Trigger/Content` | Button 组 + 条件渲染 | 选项卡 |
| `Modal` `onClose` | `Modal.Root` `onOpenChange` | 弹窗 |
| `Status` | `Status` | 状态标签 |

### 7.2 Tabs 替代方案

`@strapi/design-system` 的 `Tabs` 不支持子组件拆分，用 Button 组替代：

```tsx
const [activeTab, setActiveTab] = useState("dashboard");

<Flex gap={2} marginBottom={4}>
  <Button variant={activeTab === "dashboard" ? "default" : "tertiary"} onClick={() => setActiveTab("dashboard")}>仪表盘</Button>
  <Button variant={activeTab === "users" ? "default" : "tertiary"} onClick={() => setActiveTab("users")}>用户</Button>
</Flex>

{activeTab === "dashboard" && <DashboardTab />}
{activeTab === "users" && <UsersTab />}
```

### 7.3 HTTP 请求使用 useFetchClient

```typescript
import { useFetchClient } from "@strapi/strapi/admin";

const { get, post, put, del } = useFetchClient();
```

`useFetchClient` 自动携带 admin session 认证信息，不需要手动设置请求头。

---

## 八、标准目录结构

```
plugin-name/
├── admin/
│   ├── custom.d.ts              # 类型声明
│   ├── tsconfig.json             # 继承 admin config
│   └── src/
│       ├── index.ts              # register + registerTrads
│       ├── pluginId.ts           # export const PLUGIN_ID = "plugin-name"
│       ├── components/
│       │   ├── PluginIcon.tsx    # () => <PuzzlePiece />
│       │   └── Initializer.tsx   # setPlugin 回调
│       ├── pages/
│       │   ├── App.tsx           # 主页面（Tab 容器）
│       │   └── *.tsx             # 各功能 Tab 页面
│       ├── utils/
│       │   ├── api.ts            # ADMIN_API_PREFIX + useFetchClient hooks
│       │   └── getTranslation.ts # i18n helper
│       └── translations/
│           └── en.json
├── server/
│   ├── tsconfig.json             # 继承 server config
│   └── src/
│       ├── index.ts              # 插件入口
│       ├── routes/
│       │   ├── index.ts          # { admin, "content-api" }
│       │   ├── admin.ts          # type: "admin", policies: []
│       │   └── content-api.ts    # type: "content-api", 带认证中间件
│       ├── controllers/
│       │   ├── course.ts           # content-api 控制器
│       │   ├── course-category.ts  # 分类控制器
│       │   └── ...                 # 其他控制器
│       ├── services/
│       └── content-types/
├── tsconfig.json                 # 仅 server（extends server config）
└── package.json                  # strapi-server + strapi-admin 双端导出
```

---

## 九、排错清单

当插件后台管理页面出现问题时，按以下顺序排查：

### 9.1 页面白屏 / Element type invalid

- [ ] `icon` 是否是 React 函数组件（不是直接从 `@strapi/icons` 导入的对象）
- [ ] `Component` 是否是 `async () => { const { App } = await import(...); return App; }` 格式
- [ ] `PluginIcon` 组件是否正确导出

### 9.2 Policy Failed / 403 PolicyError

- [ ] admin 路由是否使用了 content-api 认证中间件（zhao-auth / channel-auth）→ 移除
- [ ] admin 路由是否设置了 `auth: false` → 移除
- [ ] 前端 API 前缀是否为 `/admin/plugins/${PLUGIN_ID}/...` → 修正
- [ ] admin 路由 `config` 是否为 `{ policies: [] }`

### 9.3 构建报错 TS17004 / TS2604

- [ ] `admin/tsconfig.json` 是否继承 `@strapi/typescript-utils/tsconfigs/admin`
- [ ] `admin/custom.d.ts` 是否存在且包含 `declare module "@strapi/design-system/*"` 和 `declare module "@strapi/design-system"`
- [ ] `admin/tsconfig.json` 的 `include` 是否包含 `"./custom.d.ts"`

### 9.4 路由注册失败

- [ ] `routes/index.ts` 导出格式是否为 `{ admin, "content-api" }`
- [ ] admin 路由文件是否直接导出 `{ type: "admin", routes: [...] }`（不要嵌套 `admin:` 包装）
- [ ] `routes/index.ts` 引用是否为 `admin: adminRoutes`（不是 `admin: adminRoutes.admin`）

---

## 十、Content-API 三层路由规则

### 10.1 路由分层架构

Content-API 路由按访问权限分为三层，通过 URL 路径和认证中间件区分：

```
/api/{plugin}/v1/...              → 公开路由（无需认证）
/api/{plugin}/v1/my/...           → 注册用户路由（JWT + is-authenticated）
/api/{plugin}/v1/admin/...        → 管理员路由（JWT + is-authenticated + has-permission）
```

### 10.2 路由定义模板

```typescript
// server/src/routes/content-api.ts
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      "plugin::zhao-auth.authenticate",
      {
        name: "plugin::zhao-auth.authorize",
        config: { policies: [{ name: "is-authenticated" }] },
      },
    ],
  },
});

const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      "plugin::zhao-auth.authenticate",
      {
        name: "plugin::zhao-auth.authorize",
        config: {
          policies: [
            { name: "is-authenticated" },
            { name: "has-{plugin}-permission", action: permission },
          ],
        },
      },
    ],
  },
});
```

### 10.3 认证中间件链

```
请求 → authenticate（解码 JWT → ctx.state.user）
     → authorize（执行 policy 链）
         → is-authenticated（检查 user 存在）
         → has-{plugin}-permission（检查 user.roles 匹配权限矩阵）
```

### 10.4 三层路由对比

| 维度 | 公开路由 | 注册用户路由 | 管理员路由 |
|------|---------|------------|-----------|
| URL 模式 | `/v1/...` | `/v1/my/...` | `/v1/admin/...` |
| 认证 | 无 | JWT | JWT |
| 策略 | 无 | is-authenticated | is-authenticated + has-permission |
| 数据范围 | 仅已发布 | 用户个人数据 | 全部数据（含草稿） |
| status 参数 | 默认（published） | 默认（published） | `"preview"` |

---

## 十一、内容访问策略（draftAndPublish）

### 11.1 核心问题

Strapi 5 的 `draftAndPublish: true`（默认开启）导致 `strapi.documents(UID).findMany()` **只返回已发布内容**（`published_at IS NOT NULL`）。草稿数据虽然存在于数据库，但查询结果为空。

### 11.2 踩坑案例

```
POST /api/zhao-course/v1/admin/courses  → 201 创建成功，返回 documentId
GET  /api/zhao-course/v1/admin/courses  → 200 返回 []（空数组）
```

数据库中记录存在，但 `published_at = null`，`status = "draft"`，被 Strapi 文档层过滤。

### 11.3 Service 层修复

```typescript
// server/src/services/course.ts
async find(query: any = {}, publicOnly: boolean = false) {
  return strapi.documents(UID).findMany({
    ...query,
    filters,
    status: publicOnly ? undefined : "preview",  // 关键：管理员查全部
    populate: { ... },
  });
}

async findOne(documentId: string, publicOnly: boolean = false) {
  const params: any = { documentId, populate: { ... } };
  if (publicOnly) {
    params.status = "published";  // 公开只查已发布
  }
  return strapi.documents(UID).findOne(params);
}
```

**status 参数说明**：

| 值 | 含义 | 适用场景 |
|----|------|---------|
| 不传 / `"published"` | 仅已发布 | 公开路由 |
| `"preview"` | 全部（含草稿） | 管理员路由 |
| `"draft"` | 仅草稿 | 特殊管理场景 |

### 11.4 Controller 层 publicOnly 判断

**错误写法**（admin 路由也会命中）：

```typescript
// ❌ admin 路由 /api/zhao-course/v1/admin/courses 也以 /api/ 开头
const publicOnly = ctx._matchedRoute?.startsWith("/api/") ?? false;
```

**正确写法**：

```typescript
// ✅ admin 路由排除
const isAdmin = ctx._matchedRoute?.includes("/admin/") ?? false;
const publicOnly = !isAdmin && (ctx._matchedRoute?.startsWith("/api/") ?? false);
```

### 11.5 访问策略总结

| 路由类型 | publicOnly | status | 数据范围 |
|---------|-----------|--------|---------|
| 公开 `/v1/...` | true | undefined（默认 published） | 仅已发布 |
| 注册用户 `/v1/my/...` | true | undefined | 仅已发布 |
| 管理员 `/v1/admin/...` | false | `"preview"` | 全部（含草稿） |
| Admin 后台 `/admin/plugins/...` | N/A | N/A | Strapi admin 自带管理 |

### 11.6 所有 Service 必须统一处理

开启 `draftAndPublish` 的 content-type，其 service 的 `find`/`findOne` 都必须按上述模式处理 status 参数，否则管理员路由查不到草稿数据。

---

## 十二、角色权限矩阵设计

### 12.1 角色层级

```
admin > channel-admin > plugin-manager > instructor > user
```

### 12.2 权限定义（permissions.ts）

```typescript
export const PERMISSIONS: Record<string, PermissionEntry> = {
  "course.read":   { allowRoles: ["admin", "channel-admin", "plugin-manager", "instructor", "user"] },
  "course.create": { allowRoles: ["admin", "channel-admin", "plugin-manager", "instructor"] },
  "course.update": { allowRoles: ["admin", "channel-admin", "plugin-manager", "instructor"] },
  "course.delete": { allowRoles: ["admin", "channel-admin", "plugin-manager"] },
  "course.publish":{ allowRoles: ["admin", "channel-admin"] },
};
```

### 12.3 权限检查流程

```
1. authenticate 中间件解码 JWT → ctx.state.user（同时设 ctx.user）
2. authorize 中间件从 ctx.state.user 构建 AuthContext: { user, params, body, query, ... }
3. has-permission policy 从 context.user（或 context.state.user）获取 user.roles
4. 根据 action 查 PERMISSIONS 获取 allowRoles
5. user.roles ∩ allowRoles 非空 → 通过
6. 空集 → 回退到 zhao-auth 角色继承检查
7. 仍不通过 → 403 FORBIDDEN_PERMISSION
```

**注意**：authorize 中间件构建的 `AuthContext` 是 `{ user }` 顶层结构（不是 `{ state: { user } }`），但 has-permission policy 兼容两种写法：`context?.state?.user || context?.user`。

### 12.4 新插件接入清单

1. 定义 `permissions.ts`，声明所有权限动作和允许角色
2. 实现 `policies/has-permission.ts`，注册到 zhao-auth
3. 路由文件使用 `adminRoute()` 工厂函数，传入 permission 参数
4. Service 层 `find`/`findOne` 处理 `status: "preview"` / `"published"`
5. Controller 层通过 `ctx._matchedRoute.includes("/admin/")` 区分 publicOnly

---

## 十三、官方文档参考

| 主题 | URL |
|------|-----|
| Routes | https://docs.strapi.io/cms/backend-customization/routes |
| Policies | https://docs.strapi.io/cms/backend-customization/policies |
| Admin Panel API | https://docs.strapi.io/cms/plugins-development/admin-panel-api |
| Navigation & Settings | https://docs.strapi.io/cms/plugins-development/admin-navigation-settings |
| Fetch Client | https://docs.strapi.io/cms/plugins-development/admin-fetch-client |
| Admin Permissions | https://docs.strapi.io/cms/plugins-development/guides/admin-permissions-for-plugins |
