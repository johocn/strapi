# zhao-logistics 路由鉴权修复设计

> 日期：2026-07-10
> 范围：zhao-logistics 插件路由层鉴权配置缺失导致 403 的统一修复

## 一、背景与根因

### 1.1 现象

web 后台访问物流中心任意菜单，前端请求如：

```
GET http://localhost:1337/api/zhao-logistics/v1/admin/quote-requests?pagination[page]=1&pagination[pageSize]=10
```

返回 `403 Forbidden`。全部 16 个 CT 的 CRUD 与 15 个自定义动作路由均不可访问。

### 1.2 根因

zhao-logistics 的 [admin-api.ts](file:///e:/code/basic/plugins/zhao-logistics/server/src/routes/admin-api.ts) 中所有路由的 `config` 字段为空对象 `{}`，既未设置 `auth: false`，也未挂载任何鉴权策略。

对比同项目正常工作的插件：

| 插件 | 路由 config | 状态 |
|---|---|---|
| zhao-studio | `auth: false` + `is-authenticated` + `has-permission` + `has-channel-scope` + `has-tenant-access` | 正常 |
| zhao-sso | `auth: false` + `is-authenticated` + `has-permission`（有 zhao-auth）/ `fallback-*`（无 zhao-auth） | 正常 |
| zhao-logistics | `config: {}`（空） | 403 |

Strapi 对 `content-api` 类型路由默认启用鉴权，但 zhao-logistics 的自定义路由未注册进 Strapi 标准权限体系，空 config 导致被默认鉴权拦截 → 403。

### 1.3 附带问题

后端路由 `/v1/admin/funnel/stats`（单数 funnel）与前端 [logistics.js](file:///e:/code/web/src/api/logistics.js) 调用的 `/v1/admin/funnels/stats`（复数）不一致，会导致 404。

## 二、设计决策

### 2.1 鉴权模式：参照 zhao-studio

zhao-logistics 是核心平台插件，强依赖 zhao-common 的 site-resolver 中间件（设置 `ctx.state.siteId`）与 zhao-auth 的权限体系，不独立安装。因此采用 zhao-studio 的四件套策略，不走 zhao-sso 的 fallback 路径。

四件套策略：
1. `plugin::zhao-auth.is-authenticated` — 校验登录态
2. `plugin::zhao-auth.has-permission`（带 `action` config）— 校验细粒度权限
3. `plugin::zhao-auth.has-channel-scope` — 渠道范围校验
4. `plugin::zhao-auth.has-tenant-access` — 租户隔离校验

### 2.2 权限缺键策略：复用已有键，不动 zhao-auth

zhao-auth 的 [permissions.ts](file:///e:/code/basic/plugins/zhao-auth/server/src/permissions.ts) 已定义 logistics 全量权限键，但部分 CT 的 CRUD 键不全，部分自定义动作无对应键。

决策：**不新增 zhao-auth 权限键**，所有缺失键复用同级已有键。

复用规则：
- CRUD 缺键：写操作归 `.update`，只读 CT 全归 `.read`
- 自定义动作：复用归属 CT 域内语义最接近的已有键

### 2.3 实现方案：保留工厂 + 权限参数（方案 A）

保留 `createCrudRoutes` 工厂的 DRY 优势，新增 `permPrefix` 与 `actionMap` 参数恢复细粒度权限映射；12 个自定义动作用 `adminRoute` 辅助函数显式声明权限。

不采用方案 B（全部手写 80 条路由，过度冗余）与方案 C（工厂内统一权限，丢失粒度）。

## 三、路由结构与鉴权配置

### 3.1 文件

重写 [plugins/zhao-logistics/server/src/routes/admin-api.ts](file:///e:/code/basic/plugins/zhao-logistics/server/src/routes/admin-api.ts)。

[routes/index.ts](file:///e:/code/basic/plugins/zhao-logistics/server/src/routes/index.ts) 不变，仍为 `content-api` 类型合并 contentApi + adminApi（符合 Strapi 插件路由仅支持 content-api / admin 两类的约束）。

### 3.2 adminRoute 辅助函数

```ts
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});
```

### 3.3 createCrudRoutes 工厂改造

新增 `permPrefix` 与可选 `actionMap` 参数：

- `permPrefix`：权限键前缀，如 `"logistics.quote-request"`
- `actionMap`：覆盖默认动作→权限后缀映射，用于缺键 CT 复用

默认映射：
- find / findOne → `.read`
- create → `.create`
- update → `.update`
- delete → `.delete`

## 四、权限映射表

### 4.1 16 个 CT CRUD 权限映射

| CT | permPrefix | find/findOne | create | update | delete | 缺口处理 |
|---|---|---|---|---|---|---|
| quote-request | logistics.quote-request | .read | .create | .update | .delete | 全有 |
| quote-field-rule | logistics.quote-field-rule | .read | .create | .update | .delete | 全有 |
| quote-price-rule | logistics.quote-price-rule | .read | .create | .update | .delete | 全有 |
| quote-price-formula | logistics.quote-price-formula | .read | .create | .update | .delete | 全有 |
| tracking-shipment | logistics.tracking-shipment | .read | .create | .update | .delete | 全有 |
| tracking-node | logistics.tracking-node | .read | .create | .update | .delete | 全有 |
| tracking-provider | logistics.tracking-provider | .read | .create | .update | .delete | 全有 |
| contact-matrix | logistics.contact-matrix | .read | .create | .update | .delete | 全有 |
| review | logistics.review | .read | .create | .update | .delete | 全有 |
| subscription | logistics.subscription | .read | 复用 .update | .update | .delete | create 缺 |
| landing-page | logistics.landing-page | .read | .create | .update | .delete | 全有 |
| conversion-funnel | logistics.conversion-funnel | .read | .create | .update | .delete | 全有 |
| conversion-event | logistics.conversion-event | .read | 复用 .read | 复用 .read | 复用 .read | 仅 read 有 |
| intent-order | logistics.intent-order | .read | .create | .update | .delete | 全有 |
| referral | logistics.referral | .read | .create | .update | .delete | 全有 |
| customer-profile | logistics.customer-profile | .read | 复用 .update | .update | .delete | create 缺 |

### 4.2 15 个自定义动作权限映射

| 路由 | handler | 权限键 | 复用依据 |
|---|---|---|---|
| POST /quote-engine/calculate | quote-engine-admin.calculate | logistics.quote-request.update | 报价引擎属询价管理域 |
| POST /quote-engine/calculate-multi | quote-engine-admin.calculateMulti | logistics.quote-request.update | 同上 |
| POST /quote-engine/save-quote | quote-engine-admin.saveQuote | logistics.quote-request.update | 同上 |
| GET /tracking-aggregator/:trackingNo | tracking-aggregator-admin.getTracking | logistics.tracking-shipment.read | 运单聚合查询 |
| POST /tracking-aggregator/batch | tracking-aggregator-admin.batchTracking | logistics.tracking-shipment.read | 批量查询 |
| POST /tracking-aggregator/:trackingNo/sync | tracking-aggregator-admin.syncFromProvider | logistics.tracking-shipment.update | 同步属写操作 |
| POST /reviews/:documentId/approve | review-action-admin.approve | logistics.review.approve | 直接对应 |
| POST /reviews/:documentId/reject | review-action-admin.reject | logistics.review.approve | 审核动作归一 |
| POST /reviews/:documentId/reply | review-action-admin.reply | logistics.review.approve | 审核动作归一 |
| POST /intent-orders/:documentId/convert | intent-order-action-admin.convert | logistics.intent-order.convert | 直接对应 |
| POST /customer-profiles/merge | customer-profile-action-admin.merge | logistics.customer-profile.merge | 直接对应 |
| GET /funnels/stats | funnel-stats-admin.stats | logistics.funnel-stats.read | 直接对应 |
| GET /referrals/stats | referral-stats-admin.stats | logistics.referral-stats.read | 直接对应 |
| GET /dynamic-form/fields | dynamic-form-admin.loadFields | logistics.quote-request.read | 动态表单属询价域 |
| POST /dynamic-form/validate | dynamic-form-admin.validate | logistics.quote-request.read | 同上 |

## 五、路径修复

| 位置 | 原值 | 修正值 |
|---|---|---|
| 后端 admin-api.ts funnel-stats 路由 | `/v1/admin/funnel/stats` | `/v1/admin/funnels/stats` |

前端 [logistics.js](file:///e:/code/web/src/api/logistics.js) 已用复数 `/funnels/stats`，无需改动。referrals/stats 两端本就一致。

## 六、前端无需改动

[logistics.js](file:///e:/code/web/src/api/logistics.js) 全部 16 个 CT 资源路径与 7 个自定义动作路径，经核对与修正后的后端路由完全一致。

前端请求头已由 [request.js](file:///e:/code/web/src/utils/request.js) 注入 `Authorization: Bearer <token>` 与 `x-site-id`，多租户上下文完备。

## 七、构建与验证

### 7.1 构建 dist

zhao-logistics 的 `dist` 被 `.gitignore` 忽略，改完 `server/src/*.ts` 后必须构建 dist 才能让 Strapi 加载新路由：

```bash
cd plugins/zhao-logistics
npx strapi-plugin build
```

主项目无需 `npm run build`（develop 模式自动编译主项目，仅插件 dist 需手动构建）。

### 7.2 验证步骤

1. 构建 zhao-logistics dist
2. 重启 Strapi（develop 模式自动重启，或 pm2 restart）
3. 登录 web 后台，用 logistics-manager 角色账号访问物流中心各菜单
4. 浏览器 DevTools 确认：
   - `GET /api/zhao-logistics/v1/admin/quote-requests?...` 返回 200
   - 其他 15 个 CT list 请求返回 200
   - `GET /api/zhao-logistics/v1/admin/funnels/stats` 返回 200（非 404）
5. 用无 logistics 权限的账号访问 → 应返回 403（权限拦截生效，证明策略已挂载）

## 八、不做的事（YAGNI）

- 不改 zhao-auth permissions.ts（零新增权限键）
- 不改 zhao-logistics 控制器（generic.ts 逻辑正确，仅路由层缺鉴权）
- 不改 routes/index.ts（content-api 类型符合 Strapi 约束）
- 不改前端 logistics.js（路径已一致）
- 不加 fallback 策略（zhao-logistics 依赖 site-resolver，不独立安装）
