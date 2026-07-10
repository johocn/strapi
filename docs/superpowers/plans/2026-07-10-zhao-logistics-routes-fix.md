# zhao-logistics 路由鉴权修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-logistics 全部路由 403，参照 zhao-studio 为路由注入四件套鉴权策略并映射到 zhao-auth 已有权限键。

**Architecture:** 重写 `admin-api.ts`，保留 `createCrudRoutes` 工厂并新增 `permPrefix`/`actionMap` 参数恢复细粒度权限映射；新增 `adminRoute` 辅助函数统一生成鉴权 config；15 个自定义动作用 `adminRoute` 显式声明权限；顺带修复 `funnel/stats`→`funnels/stats` 路径。不改控制器、不改 zhao-auth、不改前端。

**Tech Stack:** Strapi v5 插件路由、TypeScript、zhao-auth 策略（is-authenticated/has-permission/has-channel-scope/has-tenant-access）

**Spec:** [docs/superpowers/specs/2026-07-10-zhao-logistics-routes-fix-design.md](file:///e:/code/basic/docs/superpowers/specs/2026-07-10-zhao-logistics-routes-fix-design.md)

---

## 文件结构

| 文件 | 操作 | 责任 |
|---|---|---|
| `plugins/zhao-logistics/server/src/routes/admin-api.ts` | 重写 | 路由定义 + 鉴权 config + 权限映射 |
| `plugins/zhao-logistics/dist/server/src/routes/admin-api.js` | 构建产物 | 由 `npx strapi-plugin build` 生成 |

其余文件均不改动：
- `routes/index.ts`（content-api 类型，符合 Strapi 约束）
- `controllers/admin-api/generic.ts`（逻辑正确）
- `web/src/api/logistics.js`（路径已一致）
- `plugins/zhao-auth/server/src/permissions.ts`（零新增权限键）

---

## Task 1: 重写 admin-api.ts

**Files:**
- Modify: `plugins/zhao-logistics/server/src/routes/admin-api.ts`（全文重写）

- [ ] **Step 1: 用以下完整内容覆盖 admin-api.ts**

```ts
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * 管理后台路由辅助函数
 * 参照 zhao-studio 规范：auth:false + 四件套策略
 * 1. is-authenticated  校验登录态
 * 2. has-permission    校验细粒度权限
 * 3. has-channel-scope 渠道范围校验
 * 4. has-tenant-access 租户隔离校验
 */
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

type CrudAction = "find" | "findOne" | "create" | "update" | "delete";

/**
 * CRUD 路由工厂
 * @param ctName      控制器名（如 "quote-request"）
 * @param pluralName  路由复数名（如 "quote-requests"）
 * @param permPrefix  权限键前缀（如 "logistics.quote-request"）
 * @param actionMap   覆盖默认动作→权限后缀映射（用于缺键 CT 复用已有键）
 */
const createCrudRoutes = (
  ctName: string,
  pluralName: string,
  permPrefix: string,
  actionMap: Partial<Record<CrudAction, string>> = {}
) => {
  // 默认：find/findOne→read, create→create, update→update, delete→delete
  const permFor = (action: CrudAction): string => {
    const suffix = actionMap[action];
    if (suffix) return suffix.startsWith("logistics.") ? suffix : `${permPrefix}.${suffix}`;
    const defaultSuffix = action === "find" || action === "findOne" ? "read" : action;
    return `${permPrefix}.${defaultSuffix}`;
  };

  return [
    adminRoute("GET", `/${pluralName}`, `${ctName}-admin.find`, permFor("find")),
    adminRoute("GET", `/${pluralName}/:documentId`, `${ctName}-admin.findOne`, permFor("findOne")),
    adminRoute("POST", `/${pluralName}`, `${ctName}-admin.create`, permFor("create")),
    adminRoute("PUT", `/${pluralName}/:documentId`, `${ctName}-admin.update`, permFor("update")),
    adminRoute("DELETE", `/${pluralName}/:documentId`, `${ctName}-admin.delete`, permFor("delete")),
  ];
};

const routes = [
  // ===== 16 个 CT CRUD =====
  ...createCrudRoutes("quote-request", "quote-requests", "logistics.quote-request"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules", "logistics.quote-field-rule"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules", "logistics.quote-price-rule"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas", "logistics.quote-price-formula"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments", "logistics.tracking-shipment"),
  ...createCrudRoutes("tracking-node", "tracking-nodes", "logistics.tracking-node"),
  ...createCrudRoutes("tracking-provider", "tracking-providers", "logistics.tracking-provider"),
  ...createCrudRoutes("contact-matrix", "contact-matrices", "logistics.contact-matrix"),
  ...createCrudRoutes("review", "reviews", "logistics.review"),
  // subscription.create 缺，复用 .update
  ...createCrudRoutes("subscription", "subscriptions", "logistics.subscription", { create: "update" }),
  ...createCrudRoutes("landing-page", "landing-pages", "logistics.landing-page"),
  ...createCrudRoutes("conversion-funnel", "conversion-funnels", "logistics.conversion-funnel"),
  // conversion-event 仅 read，create/update/delete 复用 .read
  ...createCrudRoutes("conversion-event", "conversion-events", "logistics.conversion-event", {
    create: "read",
    update: "read",
    delete: "read",
  }),
  ...createCrudRoutes("intent-order", "intent-orders", "logistics.intent-order"),
  ...createCrudRoutes("referral", "referrals", "logistics.referral"),
  // customer-profile.create 缺，复用 .update
  ...createCrudRoutes("customer-profile", "customer-profiles", "logistics.customer-profile", { create: "update" }),

  // ===== 15 个自定义动作 =====
  // 报价引擎（属询价管理域，复用 quote-request.update）
  adminRoute("POST", "/quote-engine/calculate", "quote-engine-admin.calculate", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/calculate-multi", "quote-engine-admin.calculateMulti", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/save-quote", "quote-engine-admin.saveQuote", "logistics.quote-request.update"),

  // 运单聚合（属运单域，查询复用 tracking-shipment.read，同步属写操作复用 .update）
  adminRoute("GET", "/tracking-aggregator/:trackingNo", "tracking-aggregator-admin.getTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/batch", "tracking-aggregator-admin.batchTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/:trackingNo/sync", "tracking-aggregator-admin.syncFromProvider", "logistics.tracking-shipment.update"),

  // 评价审核（approve/reject/reply 统一归 review.approve）
  adminRoute("POST", "/reviews/:documentId/approve", "review-action-admin.approve", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reject", "review-action-admin.reject", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reply", "review-action-admin.reply", "logistics.review.approve"),

  // 意向订单转化
  adminRoute("POST", "/intent-orders/:documentId/convert", "intent-order-action-admin.convert", "logistics.intent-order.convert"),

  // 客户档案合并
  adminRoute("POST", "/customer-profiles/merge", "customer-profile-action-admin.merge", "logistics.customer-profile.merge"),

  // 统计（注意：funnels 复数，与前端 logistics.js 对齐）
  adminRoute("GET", "/funnels/stats", "funnel-stats-admin.stats", "logistics.funnel-stats.read"),
  adminRoute("GET", "/referrals/stats", "referral-stats-admin.stats", "logistics.referral-stats.read"),

  // 动态表单（属询价域，复用 quote-request.read）
  adminRoute("GET", "/dynamic-form/fields", "dynamic-form-admin.loadFields", "logistics.quote-request.read"),
  adminRoute("POST", "/dynamic-form/validate", "dynamic-form-admin.validate", "logistics.quote-request.read"),
];

export default routes;
```

- [ ] **Step 2: 核对改动要点**

逐项确认：
1. `import type { Core } from "@strapi/strapi";` 已移除（不再需要 `Core.Route[]` 类型标注，routes 数组由 adminRoute 推导）
2. `adminRoute` 辅助函数的四件套策略与 [zhao-studio content-api.ts](file:///e:/code/basic/plugins/zhao-studio/server/src/routes/content-api.ts#L10-L23) 完全一致
3. 16 个 CT 调用中，subscription/conversion-event/customer-profile 三者传了 `actionMap` 覆盖缺键
4. 15 个自定义动作的权限键全部是 zhao-auth 已有键（参见 spec 4.2 节映射表）
5. `funnel/stats` 已改为 `funnels/stats`（复数，与前端对齐）
6. `export default routes;` 保持不变（routes/index.ts 无需改）

- [ ] **Step 3: 提交源码改动**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/routes/admin-api.ts
git commit -m "fix(zhao-logistics): 路由注入四件套鉴权策略，映射到 zhao-auth 权限键，修复 403"
```

---

## Task 2: 构建 dist 并提交

**Files:**
- Build: `plugins/zhao-logistics/dist/`（构建产物）

- [ ] **Step 1: 构建 zhao-logistics dist**

```bash
cd e:\code\basic\plugins\zhao-logistics
npx strapi-plugin build
```

预期输出：`[+] Plugin built successfully` 或类似成功提示，无错误。

> 若报内存不足（OOM），主项目 build 会 OOM 但单插件 build 通常不会。如仍 OOM，关闭其他占用内存的进程后重试。

- [ ] **Step 2: 确认 dist 已更新**

```bash
cd e:\code\basic
git status plugins/zhao-logistics/dist/
```

预期：`plugins/zhao-logistics/dist/server/src/routes/admin-api.js` 等文件显示为 modified（dist 本地存在但被 .gitignore 忽略则不显示，属正常；若 dist 已被 tracked 则会显示 modified）。

> 若 dist 被 .gitignore 忽略，无需 git add，构建产物仅本地用于 Strapi 加载。跳过 Step 3 的提交。

- [ ] **Step 3: 若 dist 未被忽略则提交**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/dist/
git commit -m "build(zhao-logistics): 编译 dist 同步路由鉴权修复"
```

> 根据 project_memory，插件 dist 可能被 .gitignore 忽略。先执行 `git check-ignore plugins/zhao-logistics/dist/server/src/routes/admin-api.js` 确认：若输出该路径表示被忽略，跳过本步；若无输出表示未忽略，执行提交。

---

## Task 3: 验证

**Files:** 无（验证步骤）

- [ ] **Step 1: 重启 Strapi**

```bash
cd e:\code\basic
# develop 模式会自动检测插件 dist 变化并重启；若未自动重启，手动重启
# 开发环境：在 Strapi develop 终端按 Ctrl+C 后重新 npm run develop
# 生产环境：pm2 restart strapi
```

预期：Strapi 启动日志无路由注册错误，出现 `Server listening on http://127.0.0.1:1337`。

- [ ] **Step 2: 用 logistics-manager 角色账号验证 16 个 CT list**

登录 web 后台（`http://localhost:1337` 或 `http://h.joho.cn`），用拥有 `logistics-manager` 角色的账号访问物流中心各菜单。

浏览器 DevTools Network 面板确认以下请求全部返回 200：

| 菜单 | 请求 URL | 预期状态 |
|---|---|---|
| 询价单 | `GET /api/zhao-logistics/v1/admin/quote-requests?pagination[page]=1&pagination[pageSize]=10` | 200 |
| 字段规则 | `GET /api/zhao-logistics/v1/admin/quote-field-rules?...` | 200 |
| 报价规则 | `GET /api/zhao-logistics/v1/admin/quote-price-rules?...` | 200 |
| 报价公式 | `GET /api/zhao-logistics/v1/admin/quote-price-formulas?...` | 200 |
| 运单 | `GET /api/zhao-logistics/v1/admin/tracking-shipments?...` | 200 |
| 追踪节点 | `GET /api/zhao-logistics/v1/admin/tracking-nodes?...` | 200 |
| 追踪配置 | `GET /api/zhao-logistics/v1/admin/tracking-providers?...` | 200 |
| 渠道矩阵 | `GET /api/zhao-logistics/v1/admin/contact-matrices?...` | 200 |
| 评价 | `GET /api/zhao-logistics/v1/admin/reviews?...` | 200 |
| 订阅 | `GET /api/zhao-logistics/v1/admin/subscriptions?...` | 200 |
| 落地页 | `GET /api/zhao-logistics/v1/admin/landing-pages?...` | 200 |
| 转化漏斗 | `GET /api/zhao-logistics/v1/admin/conversion-funnels?...` | 200 |
| 转化事件 | `GET /api/zhao-logistics/v1/admin/conversion-events?...` | 200 |
| 意向订单 | `GET /api/zhao-logistics/v1/admin/intent-orders?...` | 200 |
| 推荐 | `GET /api/zhao-logistics/v1/admin/referrals?...` | 200 |
| 客户档案 | `GET /api/zhao-logistics/v1/admin/customer-profiles?...` | 200 |

- [ ] **Step 3: 验证统计端点（路径修复）**

DevTools 确认：
- `GET /api/zhao-logistics/v1/admin/funnels/stats` → 200（非 404）
- `GET /api/zhao-logistics/v1/admin/referrals/stats` → 200

> 这两个请求由物流中心 dashboard 页或统计页触发，进入对应页面即可。

- [ ] **Step 4: 验证权限拦截（负向测试）**

用一个**无任何 logistics 权限**的角色账号（如纯 C 端用户角色）登录 web 后台，尝试访问物流中心菜单。

预期：
- `GET /api/zhao-logistics/v1/admin/quote-requests?...` → 403（权限拦截生效，证明策略已挂载）
- 若返回 200 则说明策略未生效，需排查

- [ ] **Step 5: 验证自定义动作（可选，按业务路径触发）**

按业务流程触发以下动作，确认非 403：
- 评价审核：在评价列表点「通过」→ `POST /api/zhao-logistics/v1/admin/reviews/:documentId/approve` → 200
- 订单转化：在意向订单点「标记转化」→ `POST /api/zhao-logistics/v1/admin/intent-orders/:documentId/convert` → 200

> 若当前环境无对应业务数据，可跳过本步，Step 2-4 通过即视为修复完成。

---

## 验收标准

- [ ] Task 1 Step 1-3：admin-api.ts 重写并提交
- [ ] Task 2 Step 1：dist 构建成功
- [ ] Task 3 Step 2：16 个 CT list 请求全部 200
- [ ] Task 3 Step 3：funnels/stats 与 referrals/stats 返回 200
- [ ] Task 3 Step 4：无权限账号返回 403（权限策略生效）
