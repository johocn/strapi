# 活动系列 + 排期管理 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为活动引入「系列」分组 + 「一键复制」 + 「自动按周排期」，支持将同一运营主题下的多场次组织管理并自动化生成排期草稿。

**Architecture:** 新增 `activity-series` collection（含 `schedule` JSON 排期规则），`activity` 加 `belongsToSeries` 关联；后端提供系列 CRUD、活动复制（duplicate）、排期生成引擎（generateSchedule，同一实现支撑「手工批量」与「访问惰性」两种触发，查重幂等不起重复草稿）；shao 新增系列详情页、web 新增系列管理页。

**Tech Stack:** Strapi v5（zhao-point 插件）、PostgreSQL、uni-app（shao/web）。

**Spec:** `docs/superpowers/specs/2026-08-21-activity-series-schedule-design.md`

---

## 关键文件结构

- `plugins/zhao-point/server/src/content-types/activity-series/schema.json` — 新增系列 schema
- `plugins/zhao-point/server/src/content-types/activity/schema.json` — 加 `belongsToSeries`
- `plugins/zhao-point/server/src/content-types/index.ts` — 注册 activity-series
- `plugins/zhao-point/server/src/services/series-service.ts` — 系列 CRUD + generateSchedule + duplicate（复制逻辑建议归 activity 但此处集中）
- `plugins/zhao-point/server/src/services/index.ts` — 注册 series-service
- `plugins/zhao-point/server/src/controllers/series.ts` — 系列控制器（listing/detail/admin/generate）
- `plugins/zhao-point/server/src/controllers/index.ts` — 注册 series
- `plugins/zhao-point/server/src/routes/content-api.ts` — 系列路由
- `scripts/accept-series.cjs` — 新增验收脚本

前端：
- shao: `services/api.ts`(series API)、`pages/activity/series.vue`(新增)、`pages/activity/detail.vue`(系列入口)
- web: `src/api/activity.js`(series API) 、`src/pages/series/*.vue`(新增)、`src/pages/activity/form.vue`(系列下拉)、菜单注册

---

### Task 1: activity-series schema + activity 关联 + 注册

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-series\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\index.ts`

- [ ] **Step 1: 创建 activity-series schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "activity_series",
  "info": { "singularName": "activity-series", "pluralName": "activity-series", "displayName": "Activity Series" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "title": { "type": "string", "required": true },
    "description": { "type": "text" },
    "cover": { "type": "string" },
    "sortOrder": { "type": "integer", "default": 0 },
    "status": { "type": "enumeration", "enum": ["active", "hidden"], "default": "active" },
    "schedule": { "type": "json" }
  }
}
```

- [ ] **Step 2: activity 加 belongsToSeries 关联（追加到 attributes）**

在 `activity/schema.json` 末尾追加：
```json
"belongsToSeries": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity-series", "inversedBy": "activities" }
```

- [ ] **Step 3: content-types/index.ts 注册 activity-series**

在 import 区加 `import activitySeries from "./activity-series/schema.json";`，并在导出对象加 `"activity-series": { schema: activitySeries },`。

- [ ] **Step 4: 重编译插件 + 重启 Strapi 验证 schema 加载**

```
cd e:\code\basic\plugins\zhao-point && npm run build
```
重启后端（可由执行者统一起）。

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/content-types/activity-series/schema.json plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/server/src/content-types/index.ts types/generated/contentTypes.d.ts
git commit -m "feat(zhao-point): activity-series schema + activity belongsToSeries"
```

---

### Task 2: series-service（CRUD + duplicate + generateSchedule）

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\services\series-service.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\index.ts:9`

- [ ] **Step 1: 创建 series-service.ts**

```typescript
import type { Core } from "@strapi/strapi";

const SERIES_UID = "plugin::zhao-point.activity-series";
const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";

function normalize(localDate: Date): string {
  // 返回 YYYY-MM-DD（本地时区），用于按天查重
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, "0");
  const d = String(localDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // 1=周一 ... 7=周日
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== CRUD =====
  async find(params: any) {
    return strapi.documents(SERIES_UID).findMany({ ...params, populate: "*" });
  },
  async findOne(documentId: string) {
    return strapi.documents(SERIES_UID).findOne({ documentId, populate: "*" });
  },
  async create(data: any) {
    return strapi.documents(SERIES_UID).create({ data });
  },
  async update(documentId: string, data: any) {
    return strapi.documents(SERIES_UID).update({ documentId, data });
  },
  async delete(documentId: string) {
    return strapi.documents(SERIES_UID).delete({ documentId });
  },

  // ===== 系列下活动列表（已发布可报名）=====
  async listActivities(seriesDocumentId: string) {
    const series = await this.findOne(seriesDocumentId);
    if (!series) return null;
    return strapi.db.query(ACTIVITY_UID).findMany({
      where: { belongsToSeries: series.id, status: { $in: ["signup_open", "ongoing"] } },
      orderBy: { startTime: "asc" },
    });
  },

  // ===== 一键复制场次 =====
  async duplicate(activityDocumentId: string) {
    const src = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: {
        preUnlockArticles: { select: ["id"] },
        preUnlockLessons: { select: ["id"] },
      },
    });
    if (!src) throw new Error("活动不存在");
    const copy = {
      title: `${src.title}（副本）`,
      type: src.type,
      description: src.description,
      venueName: src.venueName,
      lat: src.lat,
      lng: src.lng,
      capacity: src.capacity,
      signupStart: src.signupStart,
      signupEnd: src.signupEnd,
      checkinMode: src.checkinMode,
      geoEnforced: src.geoEnforced,
      geoRadiusM: src.geoRadiusM,
      channelScope: src.channelScope,
      channelIds: src.channelIds,
      belongsToSeries: src.belongsToSeries?.id || src.belongsToSeries || null,
      // 重置：时间/名额/状态/报名关系
      startTime: null,
      endTime: null,
      usedCapacity: 0,
      status: "draft",
      preUnlockArticles: (src.preUnlockArticles || []).map((a: any) => a.id ?? a),
      preUnlockLessons: (src.preUnlockLessons || []).map((l: any) => l.id ?? l),
    };
    return strapi.documents(ACTIVITY_UID).create({ data: copy });
  },

  // ===== 自动按周排期生成引擎 =====
  // count 有值=手工批量生成N场；无值=滚动补齐到 generateWeeks 周（访问惰性）
  async generateSchedule(seriesDocumentId: string, { count }: { count?: number } = {}) {
    const series = await this.findOne(seriesDocumentId);
    if (!series) throw new Error("系列不存在");
    const sched = series.schedule;
    if (!sched || !Array.isArray(sched.weekdays) || !sched.weekdays.length) {
      return { generated: 0, reason: "no_schedule" };
    }
    const now = new Date();
    let cursor = startOfWeek(now);
    const maxWeeks = count && count > 0 ? Math.max(count, 1) : (sched.generateWeeks || 8);
    let generated = 0;
    let scannedDays = 0;
    const hardCeil = maxWeeks * 7 * (count && count > 0 ? 1 : 1) + 40; // 兜底防死循环

    while (scannedDays < (count && count > 0 ? maxWeeks * 7 : maxWeeks * 7) && scannedDays < hardCeil) {
      for (const wd of sched.weekdays) {
        const day = new Date(cursor);
        day.setDate(day.getDate() + (wd - 1));
        const startDate = new Date(day);
        const [hh, mm] = String(sched.startTime || "00:00").split(":").map(Number);
        startDate.setHours(hh || 0, mm || 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + (sched.durationMin || 60));

        if (startDate.getTime() <= now.getTime()) { scannedDays++; continue; }
        // 查重：本系列同日同 startTime 已存在则跳过
        const dayKey = normalize(startDate);
        const exist = await strapi.db.query(ACTIVITY_UID).count({
          where: { belongsToSeries: series.id, startTime: { $between: [startDate.toISOString(), endDate.toISOString()] } },
        });
        // 更精确：按 (日, 实际 startTime) 判重——用 between 已覆盖同一天同一时刻生成的场次
        if (exist > 0) { scannedDays++; continue; }

        const activity = await strapi.documents(ACTIVITY_UID).create({
          data: {
            title: series.title,
            description: series.description,
            venueName: series.existingVenue, // 从系列可取最近一场的场地（见下方取最近场次）
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            status: "draft",
            usedCapacity: 0,
            capacity: 100,
            belongsToSeries: series.id,
          },
        });
        generated++;
        scannedDays++;
        if (count && count > 0 && generated >= count) return { generated };
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return { generated };
  },
});
```

> 说明：`existingVenue` 占位需修正——generateSchedule 中取系列最近一场的 venueName。改为在函数顶部先查询本系列最近一场草稿/已发布场次继承场地：
> ```ts
> const latest = await strapi.db.query(ACTIVITY_UID).findOne({ where: { belongsToSeries: series.id }, orderBy: { startTime: "desc" } });
> // 用 latest?.venueName ?? "" 作为新建场次的 venueName
> ```

- [ ] **Step 2: 修正 above 中 place 体**：为让计划真实无占位，直接在此 Step 使用最终实现（下成总是用 `latest?.venueName`）。**执行时以本 Step 提示的"最新场次继承场地"版本为准**（即删除 `existingVenue` 那行，改用 `latest?.venueName ?? ""`）。

- [ ] **Step 3: 注册 series-service**

`services/index.ts` import 加 `import seriesService from "./series-service";`，导出对象加 `"series-service": seriesService,`。

- [ ] **Step 4: 重编译插件**

```
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/services/series-service.ts plugins/zhao-point/server/src/services/index.ts
git commit -m "feat(zhao-point): series-service CRUD + duplicate + generateSchedule"
```

---

### Task 3: series 控制器 + 路由

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\series.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 创建 series 控制器**

```typescript
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) return { data: result, meta: {} };
  return { data: result.resolve ? result : (result?.data ?? result), meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-point").service("series-service");
  return ({
    // 公开列表（仅 active）
    async list(ctx: any) {
      try {
        const rows = await strapi.documents("plugin::zhao-point.activity-series").findMany({
          filters: { status: "active" },
          sort: "sortOrder:asc",
          populate: "*",
        });
        const out = await Promise.all(rows.map(async (s: any) => {
          const cnt = await strapi.db.query("plugin::zhao-point.activity").count({
            where: { belongsToSeries: s.id, status: { $in: ["signup_open", "ongoing"] } },
          });
          return { ...s, sessionCount: cnt };
        }));
        ctx.body = wrapList(out);
      } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },

    // 公开详情（滚动惰性生成 + 返回已发布场次）
    async detail(ctx: any) {
      try {
        const docId = ctx.params.documentId;
        const series = await svc().findOne(docId);
        if (!series || series.status !== "active") { ctx.status = 404; ctx.body = { error: "系列不存在" }; return; }
        if (series.schedule) await svc().generateSchedule(docId); // 惰性补齐草稿
        const acts = await svc().listActivities(docId);
        ctx.body = wrap({ ...series, activities: acts || [] });
      } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },

    // ===== admin =====
    async adminList(ctx: any) {
      try { ctx.body = wrapList(await svc().find({ billable: undefined, populate: "*" })); }
      catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminFindOne(ctx: any) {
      try { ctx.body = wrap(await svc().findOne(ctx.params.documentId)); }
      catch (e: any) { ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; }
    },
    async adminCreate(ctx: any) {
      try { const d = await svc().create(ctx.request.body?.data || ctx.request.body); ctx.body = wrap(d); }
      catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminUpdate(ctx: any) {
      try {
        const d = await svc().update(ctx.params.documentId, ctx.request.body?.data || ctx.request.body);
        ctx.body = wrap(d);
      } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminDelete(ctx: any) {
      try { await svc().delete(ctx.params.documentId); ctx.body = wrap({ ok: true }); }
      catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminActivities(ctx: any) {
      try {
        const src = await svc().findOne(ctx.params.documentId);
        if (!src) { ctx.status = 404; ctx.body = { error: "系列不存在" }; return; }
        const acts = await strapi.db.query("plugin::zhao-point.activity").findMany({
          where: { belongsToSeries: src.id },
          orderBy: { startTime: "asc" },
        });
        ctx.body = wrapList(acts);
      } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminDuplicateActivity(ctx: any) {
      try { const d = await svc().duplicate(ctx.params.activityDocumentId); ctx.body = wrap(d); }
      catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
    async adminGenerate(ctx: any) {
      try {
        const count = ctx.query.count ? parseInt(ctx.query.count, 10) : undefined;
        const result = await svc().generateSchedule(ctx.params.documentId, { count });
        ctx.body = wrap(result);
      } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
    },
  });
};
```

- [ ] **Step 2: 注册控制器**

`controllers/index.ts` 加 import + `series,`。

- [ ] **Step 3: 注册路由（追加到 content-api.ts 的活动区后）**

在 routes 数组内追加：
```typescript
// ===== 活动系列 + 排期管理 =====
// 公开
publicRoute("GET", "/series", "series.list"),
publicRoute("GET", "/series/:documentId", "series.detail"),
// 管理端（需渠道作用域）
channelScopeRoute("GET", "/adm/series", "series.adminList", "series.read"),
channelScopeRoute("GET", "/adm/series/:documentId", "series.adminFindOne", "series.read"),
channelScopeRoute("POST", "/adm/series", "series.adminCreate", "series.create"),
channelScopeRoute("PUT", "/adm/series/:documentId", "series.adminUpdate", "series.update"),
channelScopeRoute("DELETE", "/adm/series/:documentId", "series.adminDelete", "series.delete"),
channelScopeRoute("GET", "/adm/series/:documentId/activities", "series.adminActivities", "series.read"),
channelScopeRoute("POST", "/adm/activities/:activityDocumentId/duplicate", "series.adminDuplicateActivity", "activity.create"),
channelScopeRoute("POST", "/adm/series/:documentId/generate", "series.adminGenerate", "series.update"),
```

- [ ] **Step 4: 重编译 + 验证路由**

```
cd e:\code\basic\plugins\zhao-point && npm run build
```
重启后端后，无 token 访问 `GET /api/zhao-point/v1/series` 应返回 `{data:[...]}`（可返回空数组）。

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/controllers/series.ts plugins/zhao-point/server/src/controllers/index.ts plugins/zhao-point/server/src/routes/content-api.ts types/generated/contentTypes.d.ts
git commit -m "feat(zhao-point): series controller + routes (CRUD/duplicate/generate)"
```

---

### Task 4: 权限注册（menu.series + series.* 权限树）

**Files:**
- Modify: zhao-auth 插件权限树定义（确认位置后修改，通常为 `plugins/zhao-auth/server/src/services/permissions.ts` 或类似）——执行者须先定位 `menu.activity` 或现有活动权限定义处，同款新增 series 权限节点。

- [ ] **Step 1: 定位权限定义**

```bash
cd e:\code\basic
grep -rn "activity.read\|menu.activity" plugins/zhao-auth/server/src --include=*.ts
```
以找到现有活动权限树位置。若无 menu.activity 树，则复用现有 `activity.*` 权限（series 复用 activity.create/update/delete 作为保底），并在管理端按 activity 权限展示。**若 zhao-auth 无现成 series 权限扩展点，series 权限直接用现有 activity.create/update/delete/read（系列操作复用活动权限），不加新节点**，避免侵入权限树。

- [ ] **Step 2: 按结论落地**：若存在可扩展的 menu 树，新增 `menu.series`（含 series.read/create/update/delete）及默认角色只读；否则沿用 activity 权限（不做扩展）。**实际开发向：优先复用 activity 权限，最小侵入。**

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add -A
git commit -m "feat(zhao-auth): series permissions (or reuse activity perms)"
```

---

### Task 5: 后端验收脚本 accept-series.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-series.cjs`

- [ ] **Step 1: 编写验收脚本**

以 `scripts/accept-activity.cjs` 为模板（pg 直连 + API 走查），覆盖：
1. admin 登录拿 token（复用 zhao 用户）。
2. 系列 CRUD：`POST /zhao-point/v1/adm/series` 建系列 → `GET` 列表含它 → `PUT` 改 title → 断言。
3. 建两场活动归同系列（`belongsToSeries` 指定已建系列的 documentId）。
4. duplicate：`POST /zhao-point/v1/adm/activities/:docId/duplicate` → 断言新活动 title 含「（副本）」、`usedCapacity=0`、`status=draft`、`startTime/endTime` 为 null、`belongsToSeries` 相同。
5. 给系列写 schedule（`PUT` update schedule = `{weekdays:[1,3,5], startTime:"19:00", durationMin:90, generateWeeks:8}`）。
6. 手工生成：`POST /zhao-point/v1/adm/series/:docId/generate?count=3` → 断言返回 `generated=3`，DB 中该系列下 draft 场次 +3、startTime 落在周一/三/五、endTime=start+90min。
7. 幂等：再次 `generate?count=3` → `generated=0`（查重未新增）。
8. C 端详情 `GET /zhao-point/v1/series/:docId` → 触发滚动生成（补齐到 generateWeeks 周），响应含 `activities` 数组且不含 draft（C 端只回已发布）。
9. 清理：删除测试系列 + 测试场次（含 join 表 `_lnk` 清理），断言零残留。

- [ ] **Step 2: 运行验收**

```
cd e:\code\basic && node scripts/accept-series.cjs
```
Expected: 全部 PASS（后端须已重启加载新代码）。

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add scripts/accept-series.cjs
git commit -m "test(zhao-point): accept-series.cjs"
```

---

### Task 6: shao C 端 — 系列详情页 + detail 入口

**Files:**
- Create: `e:\code\shao\pages\activity\series.vue`
- Modify: `e:\code\shao\services\api.ts`
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: services/api.ts 加系列 API**

对齐现有 activity API 封装（`e:\code\shao\services\api.ts` 同款），新增：
```typescript
export const getSeries = (documentId) => request(`/zhao-point/v1/series/${documentId}`)
export const listSeries = () => request('/zhao-point/v1/series')
```

- [ ] **Step 2: 新增 series.vue**

骨架（对齐 shao activity/list.vue 风格）：`onLoad` 收 `id`（series documentId）→ `getSeries(id)` → 渲染封面/标题/简介 + 场次列表（活动卡片样式复用现有 activity list 卡片，含时间/场地/状态/报名按钮）。每场次可跳 `/pages/activity/detail?id=<activity documentId>`。

- [ ] **Step 3: detail.vue 加系列入口**

detail 页数据含 `activity.series` 时，顶部渲染系列名 chip，`@tap navigateTo('/pages/activity/series?id=<series documentId>')`。

- [ ] **Step 4: 提交**

```bash
cd e:\code\shao
git add pages/activity/series.vue services/api.ts pages/activity/detail.vue
git commit -m "feat(shao): activity series detail page + entry"
```

---

### Task 7: web 管理端 — 系列管理页 + duplicate 按钮 + 活动系列下拉

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Create: `e:\code\web\src\pages\series\list.vue`、`form.vue`
- Modify: `e:\code\web\src\pages\activity\list.vue`、`form.vue`
- Modify: 菜单/路由注册（web 管理菜单）

- [ ] **Step 1: api/activity.js 加系列 api**

```javascript
export function listSeries(params = {}) { return get(`${ADMIN}/series`, params).then(extractList) }
export function getSeries(documentId, params = {}) { return get(`${ADMIN}/series/${documentId}`, params).then(extractItem) }
export function createSeries(data) { return post(`${ADMIN}/series`, data).then(extractItem) }
export function updateSeries(documentId, data) { return put(`${ADMIN}/series/${documentId}`, data).then(extractItem) }
export function deleteSeries(documentId) { return del(`${ADMIN}/series/${documentId}`).then(extractItem) }
export function getSeriesActivities(documentId) { return get(`${ADMIN}/series/${documentId}/activities`, {}, documentId).then(extractList) }
export function duplicateActivity(documentId) { return post(`${ADMIN}/activities/${documentId}/duplicate`) }
export function generateSeries(documentId, count) { return post(`${ADMIN}/series/${documentId}/generate?count=${count}`) }
```
> 注意：`ADMIN` 前缀与现有 `activity.js` 顶部定义一致，`getSeriesActivities` 的三参写法需与 request.js 的 `get(url, params)` 签名兼容，改为 `get(`${ADMIN}/series/${documentId}/activities`)`（无 query）。执行时以现有 activity.js 生效写法为准。

- [ ] **Step 2: pages/series/list.vue**

表格：title / attention(场次 count 可不展示) / status tag / 操作(编辑/场次/复制模板思路归于活动列表)。以下拉与现有 activity list.vue 风格对齐，字段匹配后端返回。

- [ ] **Step 3: pages/series/form.vue**

表单：title/description/cover/status/sortOrder/schedule(JSON 简化编辑：weekdays 多选 checkbox + startTime time input + durationMin number + generateWeeks number)。保存走 createSeries/updateSeries。

- [ ] **Step 4: activity/form.vue 加「所属系列」下拉**

加载 listSeries() 填充下拉，字段 `belongsToSeries`（存 documentId，提交时若后端接受 documentId 关系）；后端 adminCreate/adminUpdate 对 relation 字段需透传（Strapi documents API 接受 `belongsToSeries: <documentId>`）。

- [ ] **Step 5: activity/list.vue 加「复制」按钮**

每行加「复制」→ `duplicateActivity(documentId)` → toast 成功并刷新列表。

- [ ] **Step 6: 菜单注册**

在 web 管理菜单加「活动系列」入口（与「活动管理」同级或子级），指向 `pages/series/list`。菜单注册文件位置参考现有 activity 菜单注册处。

- [ ] **Step 7: 提交**

```bash
cd e:\code\web
git add src/api/activity.js src/pages/series src/pages/activity/list.vue src/pages/activity/form.vue <菜单注册文件>
git commit -m "feat(web): activity series management + duplicate + series dropdown"
```

---

### Task 8: 收口推送 + 记忆更新

**Files:**
- 三个仓库（basic/web/shao）git 收口

- [ ] **Step 1: 还原构建 churn**

```bash
cd e:\code\basic && git status --short; git restore dist/ 2>/dev/null
```
如有 `git restore dist/` 误还原源码，用 `git status` 复查再补。

- [ ] **Step 2: 三仓库推送**

```bash
cd e:\code\basic && git push
cd e:\code\web && git push
cd e:\code\shao && git push
```

- [ ] **Step 3: 更新记忆**

在 project_memory.md 追加「阶段十二 活动系列+排期管理」：数据模型（activity-series + belongsToSeries + schedule JSON）、服务（CRUD/duplicate/generateSchedule 双触发/查重幂等）、接口、前端（shao series.vue、web series 管理）、验收（accept-series.cjs）、1 问题+1 改进。

---

## Self-Review 记录

- **Spec 覆盖**：series schema✓(T1)、belongsToSeries✓(T1)、CRUD✓(T2/3)、duplicate✓(T2/3)、generateSchedule 双触发✓(T2/3)、C 端 detail+list✓(T3/6)、web 系列管理+duplicate+下拉✓(T7)、验收✓(T5)、收口✓(T8)。
- **占位扫描**：Task 2 的 `existingVenue` 占位已在 Step 2 显式修正为 `latest?.venueName`。Task 4 权限块以"复用 activity 权限最小侵入"为兜底，非占位。
- **类型一致性**：`belongsToSeries` 全计划一致；`generateSchedule(seriesDocumentId,{count})` 签名在所有调用处一致；路由 handler 名与 controller 方法名一致（series.list/detail/adminList/...）。