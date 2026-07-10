# zhao-sso 插件功能补全设计

## 目标

补全 zhao-sso 插件的 5 个问题：权限实现脱节、API 双路径冲突、三方 OAuth 配置缺失、SMS provider 未实现、插件独立安装性。

## 范围

**改动目录**：
- `e:\code\basic\plugins\zhao-sso`（后端补全）
- `e:\code\web`（前端补全）

---

## 1. 后端补全

### 1.1 需补全的 9 个 CT admin controller

| CT | controller 文件 | 路由 | 操作 | 权限 key 前缀 |
|---|---|---|---|---|
| sso-token | `token-controller.ts` | GET /tokens, GET /tokens/:id, DELETE /tokens/:id | 只读+删除 | sso.token |
| sso-auth-code | `auth-code-controller.ts` | GET /auth-codes, GET /auth-codes/:id, DELETE /auth-codes/:id | 只读+删除 | sso.auth-code |
| sso-third-party-binding | `binding-controller.ts` | GET/POST/PUT/DELETE /bindings | CRUD | sso.third-party-binding |
| sso-oauth-config | `oauth-config-controller.ts` | GET/POST/PUT/DELETE /oauth-configs | CRUD | sso.oauth-config |
| sso-user-app-role | `role-controller.ts` | GET/POST/PUT/DELETE /user-app-roles | CRUD | sso.user-app-role |
| sso-invite-code | `invite-code-controller.ts` | GET/POST/DELETE /invite-codes + POST /invite-codes/:id/validate | CRUD+验证 | sso.invite-code |
| sso-invite-usage | `invite-usage-controller.ts` | GET/DELETE /invite-usages | 只读+删除 | sso.invite-usage |
| sso-referral-relation | `referral-controller.ts` | GET/DELETE /referral-relations | 只读+删除 | sso.referral-relation |
| sso-sms-code | `sms-code-controller.ts` | GET/DELETE /sms-codes | 只读+删除 | sso.sms-code |

sso-invite-stats 是 sso-invite-code 的 1:1 关联，合并到 invite-code controller 的 list 返回中（populate inviteStats），不单独建 controller。

### 1.2 controller 实现规范

每个 controller 遵循现有 admin-controller.ts 模式：
- 使用 `strapi.documents('plugin::zhao-sso.<ct-name>')` 操作 CT
- list 支持 ctx.query 分页和筛选
- findOne 按 documentId 查询
- create/update 从 ctx.request.body 取数据
- delete 按 documentId 删除
- 返回格式 `{ data, meta: { pagination } }`

### 1.3 路由注册

在 `routes/admin.ts` 中追加路由，使用 `adminRoute` 工厂函数，对齐 permissions.ts 中已定义的权限 key：

```ts
// Token 管理
adminRoute('GET', '/tokens', 'token.list', 'sso.token.read'),
adminRoute('GET', '/tokens/:id', 'token.findOne', 'sso.token.read'),
adminRoute('DELETE', '/tokens/:id', 'token.delete', 'sso.token.delete'),

// 授权码管理
adminRoute('GET', '/auth-codes', 'auth-code.list', 'sso.auth-code.read'),
adminRoute('GET', '/auth-codes/:id', 'auth-code.findOne', 'sso.auth-code.read'),
adminRoute('DELETE', '/auth-codes/:id', 'auth-code.delete', 'sso.auth-code.delete'),

// 三方绑定
adminRoute('GET', '/bindings', 'binding.list', 'sso.third-party-binding.read'),
adminRoute('GET', '/bindings/:id', 'binding.findOne', 'sso.third-party-binding.read'),
adminRoute('POST', '/bindings', 'binding.create', 'sso.third-party-binding.create'),
adminRoute('PUT', '/bindings/:id', 'binding.update', 'sso.third-party-binding.update'),
adminRoute('DELETE', '/bindings/:id', 'binding.delete', 'sso.third-party-binding.delete'),

// OAuth 配置
adminRoute('GET', '/oauth-configs', 'oauth-config.list', 'sso.oauth-config.read'),
adminRoute('GET', '/oauth-configs/:id', 'oauth-config.findOne', 'sso.oauth-config.read'),
adminRoute('POST', '/oauth-configs', 'oauth-config.create', 'sso.oauth-config.create'),
adminRoute('PUT', '/oauth-configs/:id', 'oauth-config.update', 'sso.oauth-config.update'),
adminRoute('DELETE', '/oauth-configs/:id', 'oauth-config.delete', 'sso.oauth-config.delete'),

// 用户应用角色
adminRoute('GET', '/user-app-roles', 'role.list', 'sso.user-app-role.read'),
adminRoute('GET', '/user-app-roles/:id', 'role.findOne', 'sso.user-app-role.read'),
adminRoute('POST', '/user-app-roles', 'role.create', 'sso.user-app-role.create'),
adminRoute('PUT', '/user-app-roles/:id', 'role.update', 'sso.user-app-role.update'),
adminRoute('DELETE', '/user-app-roles/:id', 'role.delete', 'sso.user-app-role.delete'),

// 邀请码
adminRoute('GET', '/invite-codes', 'invite-code.list', 'sso.invite-code.read'),
adminRoute('POST', '/invite-codes', 'invite-code.create', 'sso.invite-code.create'),
adminRoute('DELETE', '/invite-codes/:id', 'invite-code.delete', 'sso.invite-code.delete'),
adminRoute('POST', '/invite-codes/:id/validate', 'invite-code.validate', 'sso.invite-code.validate'),

// 邀请记录
adminRoute('GET', '/invite-usages', 'invite-usage.list', 'sso.invite-usage.read'),
adminRoute('DELETE', '/invite-usages/:id', 'invite-usage.delete', 'sso.invite-usage.delete'),

// 推荐关系
adminRoute('GET', '/referral-relations', 'referral.list', 'sso.referral-relation.read'),
adminRoute('DELETE', '/referral-relations/:id', 'referral.delete', 'sso.referral-relation.delete'),

// 短信验证码
adminRoute('GET', '/sms-codes', 'sms-code.list', 'sso.sms-code.read'),
adminRoute('DELETE', '/sms-codes/:id', 'sms-code.delete', 'sso.sms-code.delete'),
```

controllers/index.ts 追加 9 个新 controller 导出。

### 1.4 SMS provider 实现

在 `services/sso-sms.ts` 中实现 `sendViaAliyun` 和 `sendViaTencent`：

**阿里云短信**：
- API：`dysmsapi.aliyuncs.com`
- 签名：HMAC-SHA1（AccessKeySecret 签名）
- 配置来源：环境变量 `SMS_ALIYUN_ACCESS_KEY_ID`、`SMS_ALIYUN_ACCESS_KEY_SECRET`、`SMS_ALIYUN_SIGN_NAME`、`SMS_ALIYUN_TEMPLATE_CODE`
- 用 axios 发送 POST 请求

**腾讯云短信**：
- API：`sms.tencentcloudapi.com`
- 签名：TC3-HMAC-SHA256
- 配置来源：环境变量 `SMS_TENCENT_SECRET_ID`、`SMS_TENCENT_SECRET_KEY`、`SMS_TENCENT_SDK_APP_ID`、`SMS_TENCENT_SIGN_NAME`、`SMS_TENCENT_TEMPLATE_ID`
- 用 axios 发送 POST 请求

provider 选择：环境变量 `SMS_PROVIDER`（mock/aliyun/tencent），默认 mock。

### 1.5 内置回退 policy

**新建文件**：
- `policies/fallback-authenticated.ts`：检查 `ctx.state.user`（Strapi 原生 admin 认证），存在则放行，否则 401
- `policies/fallback-has-permission.ts`：超管（role: super_admin）放行；其他用户检查 `ctx.state.user.roles` 是否包含所需权限。独立安装时无 zhao-auth 的权限体系，简化为超管放行、其他拒绝

**修改 `routes/admin.ts`**：

将 `adminRoute` 工厂函数改为动态检测 zhao-auth：

```ts
const hasZhaoAuth = () => {
  try { return !!strapi.plugin('zhao-auth'); } catch { return false; }
};

const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: hasZhaoAuth()
      ? ['plugin::zhao-auth.is-authenticated', { name: 'plugin::zhao-auth.has-permission', config: { action: permission } }, 'plugin::zhao-auth.has-channel-scope', 'plugin::zhao-auth.has-tenant-access']
      : ['plugin::zhao-sso.fallback-authenticated', 'plugin::zhao-sso.fallback-has-permission'],
  },
});
```

policies/index.ts 追加 2 个新 policy 导出。

### 1.6 后端改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `server/src/controllers/token-controller.ts` | 新建 | token list/findOne/delete |
| `server/src/controllers/auth-code-controller.ts` | 新建 | auth-code list/findOne/delete |
| `server/src/controllers/binding-controller.ts` | 新建 | binding CRUD |
| `server/src/controllers/oauth-config-controller.ts` | 新建 | oauth-config CRUD |
| `server/src/controllers/role-controller.ts` | 新建 | user-app-role CRUD |
| `server/src/controllers/invite-code-controller.ts` | 新建 | invite-code CRUD + validate |
| `server/src/controllers/invite-usage-controller.ts` | 新建 | invite-usage list/delete |
| `server/src/controllers/referral-controller.ts` | 新建 | referral list/delete |
| `server/src/controllers/sms-code-controller.ts` | 新建 | sms-code list/delete |
| `server/src/controllers/index.ts` | 修改 | 追加 9 个导出 |
| `server/src/routes/admin.ts` | 修改 | 追加 ~30 条路由 + 动态 policy |
| `server/src/services/sso-sms.ts` | 修改 | 实现 aliyun/tencent provider |
| `server/src/policies/fallback-authenticated.ts` | 新建 | 回退认证 policy |
| `server/src/policies/fallback-has-permission.ts` | 新建 | 回退权限 policy |
| `server/src/policies/index.ts` | 修改 | 追加 2 个导出 |

共新建 11 文件，修改 4 文件。

---

## 2. 前端补全

### 2.1 API 路径修复

- `src/api/config.js`：删除 SSO 相关函数（getSsoApps/createSsoApp/updateSsoApp/deleteSsoApp）
- `pages/system/tools.vue`：改为从 `sso.js` 导入 SSO 应用 API
- `src/api/sso.js`：追加 9 个新 CT 的 API 封装

### 2.2 新增管理页面

| 页面 | 路径 | CT | 模式 |
|---|---|---|---|
| Token 管理 | pages/sso/token/list.vue | sso-token | 只读列表 + 撤销 |
| 授权码管理 | pages/sso/auth-code/list.vue | sso-auth-code | 只读列表 + 删除 |
| 三方绑定 | pages/sso/binding/list.vue | sso-third-party-binding | 列表 + 解绑(delete) |
| OAuth 配置 | pages/sso/oauth-config/list.vue + edit.vue | sso-oauth-config | CRUD |
| 用户应用角色 | pages/sso/user-role/list.vue + edit.vue | sso-user-app-role | CRUD |
| 邀请码管理 | pages/sso/invite-code/list.vue + edit.vue | sso-invite-code | CRUD + 验证按钮 |
| 邀请记录 | pages/sso/invite-usage/list.vue | sso-invite-usage | 只读 + 删除 |
| 推荐关系 | pages/sso/referral/list.vue | sso-referral-relation | 只读 + 删除 |
| 短信验证码 | pages/sso/sms-code/list.vue | sso-sms-code | 只读 + 删除 |

共 13 个页面文件（4 CRUD × 2 + 5 只读 × 1）。

### 2.3 dashboard 菜单

在系统设置 section 之前追加 SSO 中心 section（13 菜单项）：

| 菜单项 | 权限 key | navigateTo |
|---|---|---|
| 用户管理 | menu.sso | /pages/system/tools（已有，SSO 用户管理 tab） |
| 应用管理 | menu.sso | /pages/system/tools（已有，SSO 应用管理 tab） |
| 渠道管理 | menu.sso | /pages/system/tools（已有，SSO 渠道管理 tab） |
| 登录日志 | menu.sso | /pages/system/tools（已有，SSO 日志 tab） |
| Token 管理 | menu.sso-token | /pages/sso/token/list |
| 授权码 | menu.sso-token | /pages/sso/auth-code/list |
| 三方绑定 | menu.sso-binding | /pages/sso/binding/list |
| OAuth 配置 | menu.sso-binding | /pages/sso/oauth-config/list |
| 用户角色 | menu.sso-user-role | /pages/sso/user-role/list |
| 邀请码 | menu.sso-invite | /pages/sso/invite-code/list |
| 邀请记录 | menu.sso-invite | /pages/sso/invite-usage/list |
| 推荐关系 | menu.sso-invite | /pages/sso/referral/list |
| 短信验证码 | menu.sso-sms | /pages/sso/sms-code/list |

注意：前 4 项复用已有 tools.vue 页面（含 tab 切换），后 9 项跳转新页面。

### 2.4 路由注册

pages.json 追加 13 条路由。

### 2.5 featureFlags

config-helper.js featureFlags 追加 `sso: true`。

### 2.6 前端改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| src/api/sso.js | 修改 | 追加 9 CT API 封装 |
| src/api/config.js | 修改 | 删除 SSO 相关函数 |
| pages/system/tools.vue | 修改 | 改用 sso.js 导入 |
| pages/sso/token/list.vue | 新建 | 只读+撤销 |
| pages/sso/auth-code/list.vue | 新建 | 只读+删除 |
| pages/sso/binding/list.vue | 新建 | 列表+解绑 |
| pages/sso/oauth-config/list.vue | 新建 | CRUD |
| pages/sso/oauth-config/edit.vue | 新建 | CRUD |
| pages/sso/user-role/list.vue | 新建 | CRUD |
| pages/sso/user-role/edit.vue | 新建 | CRUD |
| pages/sso/invite-code/list.vue | 新建 | CRUD+验证 |
| pages/sso/invite-code/edit.vue | 新建 | CRUD+验证 |
| pages/sso/invite-usage/list.vue | 新建 | 只读+删除 |
| pages/sso/referral/list.vue | 新建 | 只读+删除 |
| pages/sso/sms-code/list.vue | 新建 | 只读+删除 |
| pages/dashboard/index.vue | 修改 | SSO section 13 菜单项 |
| pages.json | 修改 | 13 条路由 |
| src/utils/config-helper.js | 修改 | featureFlags sso: true |

共新建 13 文件，修改 5 文件。

---

## 3. 完整改动文件清单汇总

| 阶段 | 新建 | 修改 | 总计 |
|---|---|---|---|
| 后端 | 11 | 4 | 15 |
| 前端 | 13 | 5 | 18 |
| 合计 | 24 | 9 | 33 |

---

## Self-Review

### 1. Placeholder 扫描
- 无 TBD/TODO，所有 controller 和页面有明确字段和操作定义

### 2. 内部一致性
- 后端 9 个新 controller 对齐 permissions.ts 已有的权限 key
- 后端 30 条新路由覆盖全部 9 个缺失 CT
- 前端 13 个页面与后端 9 个新 CT 一一对应
- 前端 13 个菜单项复用后端 5 个子菜单权限 key
- API 路径统一为 `/zhao-sso/v1/admin`，消除双路径
- SMS provider 实现两个服务商，通过环境变量选择

### 3. 范围检查
- 后端 11 新建 + 4 修改，前端 13 新建 + 5 修改，分阶段执行可控
- 先后端后前端，前端依赖后端 API

### 4. 歧义检查
- 内置回退 policy 在 zhao-auth 不存在时简化为超管放行，独立安装场景下足够
- tools.vue 已有 SSO 用户/应用/渠道/日志 4 个 tab，保持不变，仅修改 API 导入来源
- invite-stats 不单独建 controller，通过 populate 在 invite-code list 中返回
