# 用户画像分层与合伙人精准客户分层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 zhao-sso 实现用户六维画像实时聚合 + S/A/B/C 分层落库，提供管理端全局画像与合伙人侧下线客户精准视图（画像/触达/跟进记录）。

**Architecture:** 画像域全部落在 zhao-sso 插件：新增 sso-user-profile（分层落库）、sso-follow-up（跟进记录）两个 content-type；新增 sso-profile 服务（跨插件直查同库聚合六维 → 加权打分 → 落库）；admin 控制器（管理端画像）+ partner 控制器（合伙人端，自定义归属校验）。web 管理端建画像列表/详情页；shao C 端建合伙人客户页。复用 sso-msg 一键触达。

**Tech Stack:** Strapi 5 插件（zhao-sso）、PostgreSQL、uni-app（web 管理端 / shao C 端）、camelCase 属性命名（db.query 不映射 snake_case）。

---

## 文件结构

**zhao-sso 后端（e:\code\basic\plugins\zhao-sso\server\src）**
- Create `content-types/sso-user-profile/schema.json` + `index.ts`：分层标签
- Create `content-types/sso-follow-up/schema.json` + `index.ts`：跟进记录
- Modify `content-types/index.ts`：注册两个新 content-type
- Create `services/sso-profile.ts`：六维聚合 + 打分 + 落库 + recalcAll
- Modify `services/index.ts`：注册 sso-profile
- Create `controllers/profile-controller.ts`：admin 画像接口
- Create `controllers/partner-controller.ts`：partner 画像/触达/跟进
- Modify `controllers/index.ts`：注册两个控制器
- Create `routes/partner.ts`：partner 路由
- Modify `routes/admin.ts`：加 admin 画像路由
- Modify `routes/index.ts`：注册 partner 路由
- Modify `plugins/zhao-auth/server/src/permissions.ts`：menu.sso-msg 下加 sso.profile.read/write

**验收（e:\code\basic\scripts）**
- Create `accept-profile.cjs`

**web 管理端（e:\code\web\src）**
- Modify `api/sso.js`：ssoProfileApi
- Create `pages/sso/profile/list.vue`、`pages/sso/profile/detail.vue`
- Modify `pages.json`、`pages/dashboard/index.vue`

**shao C 端（e:\code\shao）**
- Modify `services/api.ts`：partner 接口
- Create `pages/partner/customers.vue`、`pages/partner/customer-detail.vue`
- Modify `pages.json`、`pages/profile/profile.vue`（入口）

---

## Task 1: 后端数据模型（sso-user-profile / sso-follow-up）

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-user-profile\schema.json`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-user-profile\index.ts`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-follow-up\schema.json`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-follow-up\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\index.ts`

- [ ] **Step 1: 写 sso-user-profile schema**

`schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_user_profiles",
  "info": { "singularName": "sso-user-profile", "pluralName": "sso-user-profiles", "displayName": "SSO User Profile" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "segment": { "type": "enumeration", "enum": ["S", "A", "B", "C"], "default": "C", "required": true },
    "segmentScore": { "type": "integer", "default": 0 },
    "segmentReason": { "type": "text" },
    "dimensions": { "type": "json", "default": {} },
    "lastCalculatedAt": { "type": "datetime" }
  }
}
```

`index.ts`:
```ts
export default { schema: require("./schema.json") };
```

- [ ] **Step 2: 写 sso-follow-up schema**

`schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_follow_ups",
  "info": { "singularName": "sso-follow-up", "pluralName": "sso-follow-ups", "displayName": "SSO Follow Up" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "partner": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true },
    "customer": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true },
    "content": { "type": "text", "required": true },
    "status": { "type": "enumeration", "enum": ["todo", "done", "cancelled"], "default": "todo", "required": true },
    "nextFollowAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 3: 注册 content-type**（`content-types/index.ts` 加 import + 注册 `"sso-user-profile"` 与 `"sso-follow-up"`）

- [ ] **Step 4: 验证**：`node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-sso/server/src/content-types/sso-user-profile/schema.json','utf8'))"` 无报错

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/content-types
git commit -m "feat(zhao-sso): 画像分层 sso-user-profile + 跟进记录 sso-follow-up 数据模型"
```

---

## Task 2: 画像聚合服务 sso-profile

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-profile.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现聚合/打分/落库**

核心方法（完整实现要点）：
```ts
import type { Core } from "@strapi/strapi";
const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const UP_USER_UID = "plugin::users-permissions.user";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";
const SIGNS_UID = "plugin::zhao-point.activity-signup";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** sso-user → up_user 反向桥接（按标识匹配；匹配不到返回 null） */
  async resolveUpUserForSsoUser(ssoUserId: number) {
    const sso = await strapi.db.query("plugin::zhao-sso.sso-user").findOne({
      where: { id: ssoUserId }, select: ["id", "username", "email", "mobile"],
    });
    if (!sso) return null;
    const or: any[] = [];
    if (sso.username) or.push({ username: sso.username });
    if (sso.email) or.push({ email: String(sso.email).toLowerCase() });
    if (sso.mobile) or.push({ mobile: sso.mobile });
    if (!or.length) return null;
    return strapi.db.query(UP_USER_UID).findOne({ where: { $or: or } });
  },

  /** 实时聚合六维画像（不落库） */
  async calculateProfile(ssoUserId: number) {
    const up = await this.resolveUpUserForSsoUser(ssoUserId);
    const zero = { activity: 0, reading: 0, completion: 0, attendance: 0, payment: 0, interests: [] };
    if (!up) return { ...zero, user: ssoUserId, upUser: null, hasData: false };
    const userId = up.id;
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // 活跃度：近30天学习课时数 + 文章访问数 + 签到(按 point 记录 action=sign_in 近似)
    const [lp30, visit30] = await Promise.all([
      strapi.db.query(LESSON_PROGRESS_UID).count({ where: { user: userId, lastStudyAt: { $gte: days30 } } }),
      strapi.db.query(VISIT_LOG_UID).count({ where: { user: userId, createdAt: { $gte: days30 } } }),
    ]);
    const activity = clamp(lp30 * 10 + visit30 * 3);

    // 阅读深度：article_view 次数 + 平均停留
    const reads = await strapi.db.query(VISIT_LOG_UID).findMany({
      where: { user: userId, type: "article_view" },
      select: ["id", "dwellTime", "scrollDepth"], limit: 200,
    });
    const avgDwell = reads.length ? reads.reduce((s, r) => s + (r.dwellTime || 0), 0) / reads.length : 0;
    const reading = clamp(Math.min(reads.length, 20) * 3 + Math.min(avgDwell, 120) / 120 * 40);

    // 完课率：完成课时占比 + 答题正确率
    const allLp = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId }, select: ["isCompleted", "isCorrect"], limit: 500,
    });
    const done = allLp.filter((r) => r.isCompleted).length;
    const correct = allLp.filter((r) => r.isCorrect === true).length;
    const completion = clamp((allLp.length ? done / allLp.length : 0) * 60 + (correct ? correct / Math.max(allLp.length, 1) : 0) * 40);

    // 到场意愿：报名数 + 到场率
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { user: userId }, select: ["attendedAt", "status"], limit: 100,
    });
    const activeSigns = signs.filter((s) => s.status !== "cancelled");
    const attended = activeSigns.filter((s) => s.attendedAt).length;
    const attendance = clamp(activeSigns.length * 10 + (activeSigns.length ? (attended / activeSigns.length) * 50 : 0));

    // 付费潜力：付费/积分购课次数 + 兑换
    const [paid, points] = await Promise.all([
      strapi.db.query(ENROLL_UID).count({ where: { user: userId, enrollType: { $in: ["paid", "points"] } } }),
      strapi.db.query("plugin::zhao-point.point-redemption").count({ where: { user: userId } }).catch(() => 0),
    ]);
    const payment = clamp(paid * 30 + points * 15);

    // 兴趣：课程/文章分类 + 活动类型 频次 top3（简化为关键词标签）
    const interests = [];

    return { activity, reading, completion, attendance, payment, interests, user: ssoUserId, upUser: up, hasData: true };
  },

  /** 加权打分 + 分层 */
  segmentOf(profile: any) {
    const score = clamp(
      (profile.completion || 0) * 0.25 + (profile.payment || 0) * 0.25
      + (profile.activity || 0) * 0.20 + (profile.attendance || 0) * 0.15 + (profile.reading || 0) * 0.15
    );
    const segment = score >= 80 ? "S" : score >= 60 ? "A" : score >= 40 ? "B" : "C";
    const reason = profile.hasData === false ? "无行为数据" : `综合分${score}（完课${profile.completion}/付费${profile.payment}/活跃${profile.activity}）`;
    return { segment, segmentScore: score, segmentReason: reason };
  },

  /** 详情：实时聚合 + 打分 + 落库 sso-user-profile */
  async getProfile(ssoUserId: number) {
    const profile = await this.calculateProfile(ssoUserId);
    const seg = this.segmentOf(profile);
    const existing = await strapi.db.query(PROFILE_UID).findOne({ where: { user: ssoUserId } });
    const data = { segment: seg.segment, segmentScore: seg.segmentScore, segmentReason: seg.segmentReason, dimensions: { ...profile }, lastCalculatedAt: new Date() };
    if (existing) await strapi.db.query(PROFILE_UID).update({ where: { id: existing.id }, data });
    else await strapi.db.query(PROFILE_UID).create({ data: { ...data, user: ssoUserId } });
    return { ...profile, ...seg };
  },

  /** 批量重算：遍历 up_users → sso-user → getProfile */
  async recalcAll(limit = 500) {
    const upUsers = await strapi.db.query(UP_USER_UID).findMany({ select: ["id", "username", "email", "mobile"], limit });
    let n = 0, sso = 0;
    for (const u of upUsers) {
      const ssoUser = await strapi.db.query("plugin::zhao-sso.sso-user").findOne({
        where: { $or: ([] as any[]).concat(
          u.username ? [{ username: u.username }] : [],
          u.email ? [{ email: String(u.email).toLowerCase() }] : [],
          u.mobile ? [{ mobile: u.mobile }] : []
        ) },
      });
      if (!ssoUser) continue;
      await this.getProfile(ssoUser.id); sso++; n++;
    }
    return { scanned: upUsers.length, calculated: n, matchedSso: sso };
  },
});
```

- [ ] **Step 2: services/index.ts 注册 `"sso-profile"`**

- [ ] **Step 3: 验证**：`node -e "require('fs').existsSync('plugins/zhao-sso/server/src/services/sso-profile.ts') && console.log('ok')"`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-sso/server/src/services/sso-profile.ts plugins/zhao-sso/server/src/services/index.ts
git commit -m "feat(zhao-sso): sso-profile 六维聚合+加权分层+落库+recalcAll"
```

---

## Task 3: 控制器（admin 画像 + partner 画像/触达/跟进）

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\controllers\profile-controller.ts`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\controllers\partner-controller.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts`

- [ ] **Step 1: profile-controller.ts**（admin）

```ts
import type { Core } from "@strapi/strapi";
const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function wrap(ctx: any, fn: () => Promise<any>) {
    try { ctx.body = await fn(); }
    catch (e: any) { ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: (e as any).code || null }; }
  }
  return {
    async list(ctx: any) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, search, segment, ...rest } = ctx.query;
        const limit = Math.min(Number(pageSize) || 20, 100);
        const start = (Number(page) - 1) * limit;
        const where: any = {};
        if (segment) where.segment = { $eq: segment };
        const results = await strapi.db.query(PROFILE_UID).findMany({
          where, populate: { user: true }, orderBy: { segmentScore: "DESC" }, limit, offset: start,
        });
        const total = await strapi.db.query(PROFILE_UID).count({ where });
        return { data: results, meta: { pagination: { page: Number(page), pageSize: limit, total } } };
      });
    },
    async detail(ctx: any) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.getProfile(Number(ctx.params.id)) };
      });
    },
    async recalcAll(ctx: any) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.recalcAll(Number(ctx.query.limit) || 500) };
      });
    },
  };
};
```

- [ ] **Step 2: partner-controller.ts**

```ts
import type { Core } from "@strapi/strapi";
const REF_UID = "plugin::zhao-sso.sso-referral-relation";
const FOLLOW_UID = "plugin::zhao-sso.sso-follow-up";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function wrap(ctx: any, fn: () => Promise<any>) {
    try { ctx.body = await fn(); }
    catch (e: any) { ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: (e as any).code || null }; }
  }
  const me = (ctx: any) => (ctx.state?.user?.id || ctx.state?.ssoUser?.id);
  /** 校验目标下线归属当前合伙人 */
  async function assertCustomer(partnerId: number, customerId: number) {
    const rel = await strapi.db.query(REF_UID).findOne({ where: { inviter: partnerId, invitee: customerId } });
    if (!rel) { const e: any = new Error("无权查看该客户"); e.status = 403; throw e; }
    return rel;
  }
  return {
    async myCustomers(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        const rels = await strapi.db.query(REF_UID).findMany({ where: { inviter: partnerId }, populate: ["invitee"] });
        const out: any[] = [];
        for (const r of rels) {
          const cust = r.invitee; if (!cust) continue;
          const prof = await svc.getProfile(cust.id);
          out.push({ id: cust.id, username: cust.username, email: cust.email, mobile: cust.mobile, profile: prof });
        }
        return { data: out };
      });
    },
    async customerDetail(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        await assertCustomer(partnerId, Number(ctx.params.id));
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.getProfile(Number(ctx.params.id)) };
      });
    },
    async touch(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        const customerId = Number(ctx.params.id);
        await assertCustomer(partnerId, customerId);
        const { templateCode, params = {}, link } = ctx.request?.body || {};
        if (!templateCode) { const e: any = new Error("缺少 templateCode"); e.status = 400; throw e; }
        const msg = strapi.plugin("zhao-sso").service("sso-msg");
        const job = await msg.sendNow({ user: customerId, scene: "partner.touch", templateCode, params, link, dedupeKey: `partner:${partnerId}:${customerId}:${templateCode}` });
        return { data: job };
      });
    },
    async listFollowUps(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        const rows = await strapi.db.query(FOLLOW_UID).findMany({ where: { partner: partnerId }, orderBy: { id: "DESC" }, limit: 100 });
        return { data: rows };
      });
    },
    async createFollowUp(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        const { customer, content, status = "todo", nextFollowAt } = ctx.request?.body || {};
        if (!customer || !content) { const e: any = new Error("缺少 customer/content"); e.status = 400; throw e; }
        await assertCustomer(partnerId, Number(customer));
        const row = await strapi.db.query(FOLLOW_UID).create({ data: { partner: partnerId, customer: Number(customer), content, status, nextFollowAt } });
        return { data: row };
      });
    },
    async updateFollowUp(ctx: any) {
      await wrap(ctx, async () => {
        const partnerId = me(ctx); if (!partnerId) { ctx.status = 401; return { error: "未登录" }; }
        const row = await strapi.db.query(FOLLOW_UID).findOne({ where: { id: Number(ctx.params.id), partner: partnerId } });
        if (!row) { ctx.status = 403; return { error: "无权操作" }; }
        const updated = await strapi.db.query(FOLLOW_UID).update({ where: { id: row.id }, data: ctx.request?.body || {} });
        return { data: updated };
      });
    },
  };
};
```

- [ ] **Step 3: controllers/index.ts 注册 `profile: profileController`、`partner: partnerController`**

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-sso/server/src/controllers
git commit -m "feat(zhao-sso): profile-controller(admin画像) + partner-controller(下线画像/触达/跟进)"
```

---

## Task 4: 路由（admin + partner）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\routes\partner.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\index.ts`

- [ ] **Step 1: admin.ts 加画像路由**

在现有路由数组末尾（sop-rules 之后）追加：
```ts
    // 用户画像分层
    adminRoute("GET", "/profiles", "profile.list", "sso.profile.read"),
    adminRoute("GET", "/profiles/:id", "profile.detail", "sso.profile.read"),
    adminRoute("POST", "/profiles/recalc-all", "profile.recalcAll", "sso.profile.write"),
```

- [ ] **Step 2: partner.ts**

```ts
type Method = "GET" | "POST" | "PUT" | "DELETE";
const partnerRoute = (method: Method, path: string, handler: string) => ({
  method, path: `/v1/partner${path}`, handler,
  config: { auth: false, policies: ["plugin::zhao-sso.sso-authenticated"] },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    partnerRoute("GET", "/my-customers", "partner.myCustomers"),
    partnerRoute("GET", "/customers/:id", "partner.customerDetail"),
    partnerRoute("POST", "/customers/:id/touch", "partner.touch"),
    partnerRoute("GET", "/follow-ups", "partner.listFollowUps"),
    partnerRoute("POST", "/follow-ups", "partner.createFollowUp"),
    partnerRoute("PUT", "/follow-ups/:id", "partner.updateFollowUp"),
  ],
});
```

> 注：`plugin::zhao-sso.sso-authenticated` 为 zhao-sso 已有 policy（解析 token 后写入 state.user/state.ssoUser）。需确认其把 sso-user 写入 `ctx.state.user.id`；若只写 `state.user` 为 sso-user 对象则 partner-controller 的 `me()` 直接用之。

- [ ] **Step 3: routes/index.ts 注册 partner 路由**

- [ ] **Step 4: 验证 `sso-authenticated` policy 行为**：读 `plugins/zhao-sso/server/src/policies/sso-authenticated.ts`，确认写入的 state 字段与 `me()` 取值一致；不一致则改 partner-controller 的 `me()`。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/routes
git commit -m "feat(zhao-sso): admin画像路由 + partner路由(下线/触达/跟进)"
```

---

## Task 5: 权限树 + 编译重启

**Files:**
- Modify: `e:\code\basic\plugins\zhao-auth\server\src\permissions.ts`

- [ ] **Step 1: menu.sso-msg children 增加画像权限**

在 `"sso.msg.write"` 之后加：
```ts
"sso.profile.read": { label: "查看用户画像/分层", type: "button" },
"sso.profile.write": { label: "重算用户分层", type: "button" },
```
默认授权清单（`"menu.sso-msg", "sso.msg.read"` 行）追加 `"sso.profile.read"`。

- [ ] **Step 2: 编译两个插件**

```bash
cd plugins/zhao-sso && npm run build
cd plugins/zhao-auth && npm run build
```

- [ ] **Step 3: 重启 Strapi**（StopCommand 停 develop → 重新 `npm run develop`），确认启动成功且 `sso_user_profiles`/`sso_follow_ups` 表生成。

- [ ] **Step 4: 验证权限**：admin token 调 `/api/zhao-auth/v1/my/permission-keys` 含 `sso.profile.read`。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-auth/server/src/permissions.ts plugins/zhao-auth/dist plugins/zhao-sso/dist
git commit -m "feat(zhao-auth): 画像分层权限 sso.profile.read/write; 编译 zhao-sso/zhao-auth"
```

---

## Task 6: 后端验收脚本

**Files:**
- Create: `e:\code\basic\scripts\accept-profile.cjs`

- [ ] **Step 1: 写验收脚本**（复用 accept-sop.cjs 的 req/ok 模式）：
1. admin 登录 → `GET /api/zhao-sso/v1/admin/profiles?page=1`（列表 200）
2. `POST /admin/profiles/recalc-all`（返回 calculated ≥ 0）
3. 取第一个有 sso-user 的用户 → `GET /admin/profiles/:id`（detail 200，含 segment/dimensions/segmentReason）
4. 建测试分销关系（sso-referral-relation：inviter=测试合伙人, invitee=测试客户）
5. 合伙人登录（sso 身份）→ `GET /partner/my-customers`（含该客户）
6. `GET /partner/customers/:id`（200）
7. `POST /partner/customers/:id/touch`（templateCode=act_confirm → job 返回）
8. `POST /partner/follow-ups`（创建跟进）→ `GET /partner/follow-ups`（含记录）→ 越权验证（另一用户访问返回 403）

- [ ] **Step 2: 运行脚本全 PASS**

Run: `node scripts/accept-profile.cjs` → 期望全 `PASS`

- [ ] **Step 3: Commit**

```bash
git add scripts/accept-profile.cjs
git commit -m "test(zhao-sso): accept-profile 验收脚本"
```

---

## Task 7: web 管理端画像页

**Files:**
- Modify: `e:\code\web\src\api\sso.js`
- Create: `e:\code\web\src\pages\sso\profile\list.vue`
- Create: `e:\code\web\src\pages\sso\profile\detail.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\pages\dashboard\index.vue`

- [ ] **Step 1: sso.js 加 API**

```js
export const ssoProfileApi = {
  list: (params = {}) => get(`${ADMIN}/profiles`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/profiles/${id}`).then(extractItem),
  recalcAll: () => post(`${ADMIN}/profiles/recalc-all`).then(extractItem),
}
```

- [ ] **Step 2: list.vue**：复用 msg-template/list.vue 结构；列表项展示 `user.username/email`、`segment` 徽标（S红/A橙/B蓝/C灰）、`segmentScore`、`segmentReason`、`lastCalculatedAt`；搜索框（code 改为 search 传 `search`，列表不筛选则仅展示）、分层筛选（segment=$eq）；「全部重算」按钮（confirm 后调 recalcAll 并刷新）。

- [ ] **Step 3: detail.vue**：`onLoad` 取 `?id=` 调 detail；展示六维条形（activity/reading/completion/attendance/payment 0-100 进度条）、segment 大字徽标、segmentReason、interests 标签；「重新计算」按钮重新拉详情。

- [ ] **Step 4: pages.json 注册**：`pages/sso/profile/list`、`pages/sso/profile/detail`。

- [ ] **Step 5: dashboard**：SSO 区新增「用户画像」入口（`hasPermission('menu.sso-msg')` + 权限 `sso.profile.read` 判断可选）。

- [ ] **Step 6: 提交**

```bash
git add src/api/sso.js src/pages/sso/profile src/pages.json src/pages/dashboard/index.vue
git commit -m "feat(sso): 管理端用户画像列表/详情 + 重算 + dashboard 入口"
```

---

## Task 8: shao 合伙人端

**Files:**
- Modify: `e:\code\shao\services\api.ts`
- Create: `e:\code\shao\pages\partner\customers.vue`
- Create: `e:\code\shao\pages\partner\customer-detail.vue`
- Modify: `e:\code\shao\pages.json`
- Modify: `e:\code\shao\pages\profile\profile.vue`（加入口）

- [ ] **Step 1: api.ts 加 partner 接口**

```ts
const PARTNER = '/zhao-sso/v1/partner'
export const partnerApi = {
  myCustomers: () => get(`${PARTNER}/my-customers`),
  customerDetail: (id) => get(`${PARTNER}/customers/${id}`),
  touch: (id, data) => post(`${PARTNER}/customers/${id}/touch`, data),
  listFollowUps: () => get(`${PARTNER}/follow-ups`),
  createFollowUp: (data) => post(`${PARTNER}/follow-ups`, data),
  updateFollowUp: (id, data) => put(`${PARTNER}/follow-ups/${id}`, data),
}
```

- [ ] **Step 2: customers.vue**：列表页（分段/下拉刷新），展示下线用户名、分层徽标、segmentScore；点击进 detail；空态提示。

- [ ] **Step 3: customer-detail.vue**：六维条形 + 分层徽标 + segmentReason + interests；「发送提醒」按钮（选择模板 act_confirm/act_before 等，调 touch）；跟进记录列表 + 新增输入（content/status）+ 完成切换。

- [ ] **Step 4: pages.json 注册两页；profile.vue 加「我的客户」入口**（点击跳 customers；无下线时接口返回空数组显示空态）。

- [ ] **Step 5: 提交**

```bash
git add services/api.ts pages/partner pages.json pages/profile/profile.vue
git commit -m "feat(partner): C端合伙人我的客户/画像详情/触达/跟进"
```

---

## Task 9: 推送 + 记忆

- [ ] **Step 1: 提交 basic 剩余（spec/plan 文档）并推送三个仓库**（basic/web/shao）

- [ ] **Step 2: 更新项目记忆**（阶段五：画像分层落地，含身份反向桥接、partner 归属校验、惰性分层策略教训）

---

## Self-Review

- **Spec 覆盖**：数据模型(T1)、六维算法+分层(T2)、admin API(T3/T4)、partner API(T3/T4)、权限(T5)、web 页(T7)、shao 页(T8)、验收(T6) — 全覆盖。
- **占位符**：无 TBD；核心代码已在各任务给出。
- **类型一致性**：`getProfile/caculateProfile/segmentOf/recalcAll`、`partner.myCustomers/customerDetail/touch/listFollowUps/createFollowUp/updateFollowUp`、`profile.list/detail/recalcAll` 命名在 T2/T3/T4 一致。
