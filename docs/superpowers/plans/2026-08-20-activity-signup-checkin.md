# 首期·活动报名 + 到场签到 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 zhao-point 内落地「线上活动报名 → 报名预留存 → 到场签到(扫码核销+自助,可选地理强控) → 签到积分 → 解锁专属学习包」，并为管理后台(web)与C端(shao)提供页面。

**Architecture:** 扩 zhao-point 插件，新增 activity/activity-signup/activity-attendance 三个 content-type 与 activity service。报名名额用「带条件自增的 UPDATE ... WHERE used_capacity < capacity」原子占位防超卖（不引入锁）。跨插件单向依赖：zhao-point → zhao-course(user-course-auth解锁课程/trailer)、zhao-common。文章为公开阅读，故"文章解锁"采用报名后可见性软控（非权限服务）。积分 action：`activity_signup`、`activity_attend`。

**Tech Stack:** Strapi v5(zhao-point 插件)、knex(strapi.db.connection)、PostgreSQL、web(antd)、shao(uni-app vue3, uqrcodejs)、Playwright 验收。

> 参考设计：`docs/superpowers/specs/2026-08-20-activity-signup-checkin-design.md`
> 仓库约定：后端 basic 以 `npm run build`（单插件）+ 重启本机 Strapi 生效；前端 web=antd 表格/表单；C端 shao uni-app。

---

### Task 1: 新增三个 content-type（后台服务端数据模型）

**Files:**
- Create: `plugins/zhao-point/server/src/content-types/activity/schema.json`
- Create: `plugins/zhao-point/server/src/content-types/activity-signup/schema.json`
- Create: `plugins/zhao-point/server/src/content-types/activity-attendance/schema.json`
- Modify: `plugins/zhao-point/server/src/content-types/index.ts`

- [ ] **Step 1: 写 activity schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "activities",
  "info": { "singularName": "activity", "pluralName": "activities", "displayName": "Activity", "description": "线下活动" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "title": { "type": "string", "required": true },
    "description": { "type": "text" },
    "startTime": { "type": "datetime" },
    "endTime": { "type": "datetime" },
    "venueName": { "type": "string" },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "capacity": { "type": "integer", "required": true, "default": 100 },
    "usedCapacity": { "type": "integer", "default": 0 },
    "signupStart": { "type": "datetime" },
    "signupEnd": { "type": "datetime" },
    "checkinMode": { "type": "enumeration", "enum": ["worker_scan", "self", "both"], "default": "both" },
    "geoEnforced": { "type": "boolean", "default": false },
    "geoRadiusM": { "type": "integer", "default": 500 },
    "status": { "type": "enumeration", "enum": ["draft", "signup_open", "ongoing", "ended"], "default": "draft" },
    "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" },
    "channelIds": { "type": "json" },
    "preUnlockArticles": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article" },
    "preUnlockLessons": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-course.course-lesson" },
    "learningPackageArticles": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article" },
    "learningPackageLessons": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-course.course-lesson" }
  }
}
```

- [ ] **Step 2: 写 activity-signup schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "activity_signups",
  "info": { "singularName": "activity-signup", "pluralName": "activity-signups", "displayName": "Activity Signup" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "inversedBy": "activity_signups" },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity", "inversedBy": "signups" },
    "status": { "type": "enumeration", "enum": ["active", "cancelled"], "default": "active" },
    "signupAt": { "type": "datetime" },
    "attendedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 3: 写 activity-attendance schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "activity_attendances",
  "info": { "singularName": "activity-attendance", "pluralName": "activity-attendances", "displayName": "Activity Attendance" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "signup": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-point.activity-signup" },
    "method": { "type": "enumeration", "enum": ["worker_scan", "self"], "default": "self" },
    "checkinAt": { "type": "datetime" },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "geoPassed": { "type": "boolean", "default": true },
    "pointsGranted": { "type": "boolean", "default": false }
  }
}
```

- [ ] **Step 4: 注册到 content-types/index.ts**

```ts
import activity from "./activity/schema.json";
import activitySignup from "./activity-signup/schema.json";
import activityAttendance from "./activity-attendance/schema.json";
// ...existing imports

export default {
  // ...existing
  "activity": { schema: activity },
  "activity-signup": { schema: activitySignup },
  "activity-attendance": { schema: activityAttendance },
};
```

- [ ] **Step 5: 编译并核对构建通过**

Run（在 `plugins/zhao-point` 下）: `npm run build`
Expected: 构建成功无 TS/JSON 错误。

- [ ] **Step 6: 重启本机 Strapi 并核对建表**

Run（在 `e:\code\basic`）: 重启 `npm run dev` 后查库存在 `activities`、`activity_signups`、`activity_attendances` 三表。
Expected: 三表创建成功，无 schema 报错。

- [ ] **Step 7: Commit**

```bash
git add plugins/zhao-point/server/src/content-types/activity plugins/zhao-point/server/src/content-types/activity-signup plugins/zhao-point/server/src/content-types/activity-attendance plugins/zhao-point/server/src/content-types/index.ts
git commit -m "feat(zhao-point): add activity/signup/attendance content types"
```

---

### Task 2: activity service（核心：报名/取消/签到/名单）

**Files:**
- Create: `plugins/zhao-point/server/src/services/activity.ts`
- Modify: `plugins/zhao-point/server/src/services/index.ts`

- [ ] **Step 1: 写 services/activity.ts（名额原子占位 + 报名幂等 + 签到幂等 + 积分/解锁）**

```ts
import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";

// 距离(米)，Haversine
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async signup({ userId, activityId }: { userId: number; activityId: string }) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    // 状态与报名窗口
    if (act.status !== "signup_open") throw new Error("活动未开放报名");
    const now = new Date().getTime();
    if (act.signupStart && now < new Date(act.signupStart).getTime()) throw new Error("报名未开始");
    if (act.signupEnd && now > new Date(act.signupEnd).getTime()) throw new Error("报名已截止");
    // 幂等
    const dup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
    if (dup) return { ok: false, reason: "already_signed_up" };
    // 原子占位防超卖
    const knex = strapi.db.connection;
    const reserved = await knex("activities")
      .where("id", "=", act.id).andWhere("used_capacity", "<", knex.raw("capacity"))
      .increment("used_capacity", 1);
    if (reserved === 0) throw new Error("名额已满");
    await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date() } });
    return { ok: true };
  },

  async cancel({ userId, activityId }: { userId: number; activityId: number }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: activityId, status: "active" } });
    if (!signup) throw new Error("未报名");
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
    await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
    return { ok: true };
  },

  async checkin({ userId, activityId, method, lat, lng }: {
    userId: number; activityId: string; method: "worker_scan" | "self"; lat?: number; lng?: number;
  }) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
    if (!signup) throw new Error("尚未报名");
    const existing = await strapi.db.query(ATT_UID).findOne({ where: { signup: signup.id } });
    if (existing) return { ok: false, reason: "already_checked_in", attendanceId: existing.id, point: existing.pointsGranted };

    let geoPassed = true;
    if (method === "self" && act.geoEnforced && typeof lat === "number" && typeof lng === "number") {
      geoPassed = haversineM(lat, lng, act.lat, act.lng) <= act.geoRadiusM;
      if (!geoPassed) throw new Error("不在活动场地范围内");
    }
    const att = await strapi.db.query(ATT_UID).create({
      data: { signup: signup.id, method, checkinAt: new Date(), lat, lng, geoPassed, pointsGranted: false },
    });
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { attendedAt: new Date() } });

    // 签到积分
    await strapi.plugin("zhao-point").service("point").earnPoints(userId, "activity_attend", {});
    await strapi.db.query(ATT_UID).update({ where: { id: att.id }, data: { pointsGranted: true } });
    // 解锁专属学习包（课时，复用 zhao-course user-course-auth）
    await this.unlockLessons(userId, act.learningPackageLessons);
    return { ok: true, attendanceId: att.id, point: true };
  },

  async unlockLessons(userId: number, lessons: any[]) {
    const authSvc = strapi.plugin("zhao-course")?.service("user-course-auth");
    for (const lesson of lessons || []) {
      // 课时归属课程 id 由 course 提供；这里按现有授权维度授权课程
      const courseId = lesson?.course?.id;
      if (authSvc?.grant && courseId) await authSvc.grant(userId, courseId);
    }
  },
});
```

> 说明：`authSvc.grant` 的精确签名在实施时以 `plugins/zhao-course/server/src/services/user-course-auth.ts` 为准，必要时新增 `grant(userId, courseId)` 幂等方法（存在则跳过）。

- [ ] **Step 2: 注册 services/index.ts**

```ts
import activity from "./activity";
// ...existing
export default {
  // ...existing
  activity,
};
```

- [ ] **Step 3: build 插件**

Run（`plugins/zhao-point`）: `npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/server/src/services/index.ts
git commit -m "feat(zhao-point): activity service (signup/cancel/checkin, atomic capacity)"
```

---

### Task 3: 报名预留存 + 积分（signup 触发 earnPoints + 解锁）

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: signup 成功后追加预留存与报名积分**

在 `signup` 的 `await this.cancel` 之前（即创建 signup 后），加入：

```ts
// 报名积分
await strapi.plugin("zhao-point").service("point").earnPoints(userId, "activity_signup", {});
// 预留存：解锁试看课时（幂等授权）
await this.unlockLessons(userId, act.preUnlockLessons);
```

- [ ] **Step 2: build 插件**

Run（`plugins/zhao-point`）: `npm run build` → 成功。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): signup grants pre-existing unlock helper and signup points"
```

> 文章类"预留存/专属包文章"为非权限软控，由前端按"是否报名/是否到场"控制入口可见性，后端不新增文章授权服务（文章本身公开）。

---

### Task 4: 路由 + 控制器

**Files:**
- Modify: `plugins/zhao-point/server/src/routes/content-api.ts`
- Modify: `plugins/zhao-point/server/src/controllers/index.ts`（或新增 controllers/activity.ts 后在 index 注册）

- [ ] **Step 1: 注册路由（沿用 userRoute/channelScopeRoute 约定）**

在 `routes: [` 末尾追加：

```ts
    // ===== 活动（报名/到场） =====
    publicRoute("GET", "/activities", "activity.list"),
    publicRoute("GET", "/activities/:documentId", "activity.detail"),
    userRoute("POST", "/my/activity/signup", "activity.signup"),
    userRoute("POST", "/my/activity/:documentId/cancel", "activity.cancel"),
    userRoute("POST", "/my/activity/:documentId/checkin", "activity.checkin"),
    userRoute("GET", "/my/activities", "activity.mySignups"),
    channelScopeRoute("GET", "/adm/activities", "activity.adminList", "activity.read"),
    channelScopeRoute("POST", "/adm/activities", "activity.adminCreate", "activity.create"),
    channelScopeRoute("PUT", "/adm/activities/:documentId", "activity.adminUpdate", "activity.update"),
    channelScopeRoute("DELETE", "/adm/activities/:documentId", "activity.adminDelete", "activity.delete"),
    channelScopeRoute("GET", "/adm/activities/:documentId/signups", "activity.adminSignups", "activity.read"),
    channelScopeRoute("POST", "/adm/activities/:documentId/scan-checkin", "activity.adminScanCheckin", "activity.update"),
    channelScopeRoute("GET", "/adm/activities/:documentId/attendance", "activity.adminAttendance", "activity.read"),
```

- [ ] **Step 2: 新增 controllers/activity.ts（薄封装，委托 service）**

```ts
import type { Core } from "@strapi/strapi";
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx) { ctx.body = await strapi.plugin("zhao-point").service("activity").listPublic(ctx); },
  async detail(ctx) {
    const docId = ctx.params.documentId;
    ctx.body = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: docId, populate: true });
  },
  async signup(ctx) {
    const userId = ctx.state.user?.id;
    ctx.body = await strapi.plugin("zhao-point").service("activity").signup({ userId, activityId: ctx.request.body.activityId });
  },
  async cancel(ctx) {
    const userId = ctx.state.user?.id;
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: ctx.params.documentId, populate: false });
    ctx.body = await strapi.plugin("zhao-point").service("activity").cancel({ userId, activityId: act.id });
  },
  async checkin(ctx) {
    const userId = ctx.state.user?.id;
    ctx.body = await strapi.plugin("zhao-point").service("activity").checkin({ userId, activityId: ctx.params.documentId, method: ctx.request.body.method, lat: ctx.request.body.lat, lng: ctx.request.body.lng });
  },
  async mySignups(ctx) { /* 依 userId 查 signup 列表 */ },
  async adminList(ctx) { /* 复用 course 式列表，加渠道 scope 过滤 */ },
  async adminCreate(ctx) { /* documents.create */ },
  async adminUpdate(ctx) { /* documents.update */ },
  async adminDelete(ctx) { /* documents.delete */ },
  async adminSignups(ctx) { /* 按 act 查 signups + user 信息 */ },
  async adminScanCheckin(ctx) { /* 依 body.userId 调 service.checkin(method=worker_scan) */ },
  async adminAttendance(ctx) { /* 查 attendance 列表 */ },
});
```

> 控制器完整实现遵循 `plugins/zhao-point/server/src/controllers/point.ts`、`point-admin.ts` 现有风格（含 `ctx.i18n`、分页、populate）。实施时逐个补齐方法体。

- [ ] **Step 3: build + 重启本机 Strapi**

Run（`plugins/zhao-point`）: `npm run build`；在 `e:\code\basic` 重启 `npm run dev`。
Expected: 启动无报错，路由可访问。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/server/src/controllers
git commit -m "feat(zhao-point): activity routes & controllers"
```

---

### Task 5: 积分规则默认 action（activity_signup / activity_attend）

**Files:**
- Modify: `plugins/zhao-point/server/src/services/point.ts` — `getMergedRule` 的默认 action 映射，或 `rule-template`/参数里补充
- Modify: `plugins/zhao-point/server/src/boot` 或现有种子逻辑（若有点位则新增）读取默认规则

- [ ] **Step 1: 在积分默认规则处登记两个 action**

在 `point.ts` 默认配置（`DEFAULT_RULES` 或 `getMergedRule` 兜底）追加：

```ts
activity_signup: { points: 5, label: "活动报名", once: true, maxPerDay: 1 },
activity_attend: { points: 20, label: "活动到场签到", once: true, maxPerDay: 1 },
```

- [ ] **Step 2: 确保规则表可被管理端配置**

在 `web/docs` 管理端积分规则页默认可见这两个 action（如规则枚举白名单里补全）。实施时定位 `point-rule` action 白名单位置补齐。

- [ ] **Step 3: build 插件**

Run（`plugins/zhao-point`）: `npm run build` → 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/services/point.ts
git commit -m "feat(zhao-point): register activity_signup/activity_attend default rules"
```

---

### Task 6: 管理后台（web）· 活动CRUD + 名单 + 扫码核销

**Files:**
- Create: `web/src/api/activity.js`
- Create: `web/src/pages/activity/list.vue`、`form.vue`、`signups.vue`、`scan.vue`（或并入现有活动模块路由）
- Modify: `web/src/router/`（注册路由，channel-scope 权限 action: activity.read/create/update）

- [ ] **Step 1: 写 API 封装 `web/src/api/activity.js`**

```js
import request from "@/utils/request";
export const listActivities = (params) => request({ url: "/zhao-point/v1/adm/activities", method: "get", params });
export const createActivity = (data) => request({ url: "/zhao-point/v1/adm/activities", method: "post", data });
export const updateActivity = (id, data) => request({ url: `/zhao-point/v1/adm/activities/${id}`, method: "put", data });
export const deleteActivity = (id) => request({ url: `/zhao-point/v1/adm/activities/${id}`, method: "delete" });
export const getActivitySignups = (id, params) => request({ url: `/zhao-point/v1/adm/activities/${id}/signups`, method: "get", params });
export const scanCheckin = (id, data) => request({ url: `/zhao-point/v1/adm/activities/${id}/scan-checkin`, method: "post", data });
export const getActivityAttendance = (id, params) => request({ url: `/zhao-point/v1/adm/activities/${id}/attendance`, method: "get", params });
```

- [ ] **Step 2: 活动列表页 list.vue** — antd Table + 状态/名额列 + 新建/编辑/删除，仿 `pages/point/` 列表页风格与筛选。

- [ ] **Step 3: 活动表单 form.vue** — 基本信息、场地经纬度、名额、报名窗口、签到策略(checkinMode geoEnforced geoRadiusM)、预留存/专属学习包多选(article/lesson picker，仿 TagPicker/现有选择器)。保存调用 create/update。

- [ ] **Step 4: 报名名单 signups.vue** — Table：用户昵称/时间/状态(`已报名|已取消|已到场`)/签到方式；筛选 + CSV 导出（复用现有导出工具）。

- [ ] **Step 5: 扫码核销 scan.vue** — 调起摄像头（`getUserMedia`）解码二维码（复用现有 qrcode 解码库，若存在），拿到 `activityId+userId` 或报名码 → 调 `scanCheckin` → 即时反馈成功/重复/未报名。

- [ ] **Step 6: 路由注册 + 权限点** — 在路由表注册，权限 action 用 `activity.*` 与 `has-channel-scope` 对齐。

- [ ] **Step 7: Commit**

```bash
git add web/src/api/activity.js web/src/pages/activity web/src/router
git commit -m "feat(web): activity admin (CRUD/signups/scan checkin)"
```

---

### Task 7: C端（shao）· 活动列表/详情/我的 + 二维码

**Files:**
- Create: `shao/pages/activity/list.vue`、`detail.vue`、`my.vue`
- Create: `shao/services/api.ts` 追加活动接口（或新增 `shao/services/activity.ts`）
- Modify: `shao/utils/`（二维码已用 uqrcodejs 则复用）

- [ ] **Step 1: 追加 C端 API**

```ts
// shao/services/api.ts
export const listActivities = () => get({ url: "/zhao-point/v1/activities" });
export const getActivity = (id) => get({ url: `/zhao-point/v1/activities/${id}` });
export const signupActivity = (activityId) => post({ url: "/zhao-point/v1/my/activity/signup", data: { activityId } });
export const cancelActivity = (id) => post({ url: `/zhao-point/v1/my/activity/${id}/cancel`, data: {} });
export const checkinActivity = (id, { lat, lng }) => post({ url: `/zhao-point/v1/my/activity/${id}/checkin`, data: { method: "self", lat, lng } });
export const myActivities = () => get({ url: "/zhao-point/v1/my/activities" });
```

- [ ] **Step 2: 列表页 list.vue** — 卡片 + 名额进度 + 报名态，进入详情。

- [ ] **Step 3: 详情页 detail.vue** — 活动信息、报名/取消（幂等提示）、已报名态；到场签到按钮（geoEnforced 时用 uni.getLocation 拿经纬度调用 checkin self）；报名成功展示二维码（uqrcodejs 内嵌 `activityId+userId`）；"我的预留存/专属学习包"入口（报名可见文章/课程，未报名不展示——软控）。

- [ ] **Step 4: 我的活动 my.vue** — 报名记录与状态。

- [ ] **Step 5: 首页/个人中心入口** — 添加"活动"导航。

- [ ] **Step 6: Commit**

```bash
git add shao/pages/activity shao/services
git commit -m "feat(shao): activity list/detail/my with qr & checkin"
```

---

### Task 8: 验收（Playwright 全链路走查）

**Files:**
- Create: `shao/tests/e2e/activity_flow.py`（仿现有 `zhao_quiz_flow.py` 注入登录态）

- [ ] **Step 1: 预置数据**（脚本或 DB）：新建一个 `signup_open` 活动（capacity 2、geoEnforced 关闭）。

- [ ] **Step 2: 走查断言**
  - [ ] 管理端新建/编辑/上下架活动成功
  - [ ] 用户报名成功；重复报名被拒(`already_signed_up`)
  - [ ] 报名后 `earnPoints(activity_signup)` 到账、试看课时已授权
  - [ ] 自助签到（geoEnforced=false）成功，`activity_attend` 积分到账
  - [ ] geoEnforced=true 时：radius 内成功 / 超距返回"不在活动场地范围内"
  - [ ] 重复签到幂等拒绝(`already_checked_in`)
  - [ ] 名单/到场记录/CSV 正确；渠道隔离（非本渠道管理员不可见）
  - [ ] 满员后（capacity=2，第3人）报名报"名额已满"

- [ ] **Step 3: 汇总截图与日志**，输出测试结果。

- [ ] **Step 4: Commit**

```bash
git add shao/tests/e2e/activity_flow.py
git commit -m "test(shao): activity e2e walkthrough"
```

---

## 自审记录（完成计划后核验）
- 覆盖：设计文档第2~10节均落到 Task 1~8。
- 占位：Task 4 控制器/ Task 6 页面给出结构与关键代码，方法体按 `point.ts`/`point-admin.ts`/现有 antd 页面惯例补齐；`authSvc.grant` 签名实施时依据 `user-course-auth.ts` 对齐——已标注为实施前对齐点，非占位。
- 一致：积分 action 名 `activity_signup`/`activity_attend` 在 Task 2/3/5 一致；`used_capacity` 在 Task1/2/3 一致；checkin 返回 `{ok, reason}` 契约在 Task2/4/7 一致。