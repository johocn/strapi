# 活动效果总览看板 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 zhao-point 提供「活动效果总览看板」聚合接口，运营端新增一页：报名→到场→评价漏斗 + 积分成本/收益 + 裂变转化，活动/系列双分组 + 两级/展开下钻。

**Architecture:** 纯查询不落库。`activity-stats` service 用 strapi db.query 拉 activities（populate belongsToSeries）+ signups + referral rewards，内存聚合出 summary/rows；controller 透传 status 过滤；新增 1 条管理端 channelScopeRoute。前端 web 新增 overview.vue 消费该接口。

**Tech Stack:** Strapi v5（zhao-point 插件）、uni-app（HBuilder）、PostgreSQL（验收脚本直连）。

**前提（spec）：** `docs/superpowers/specs/2026-08-22-activity-overview-dashboard-design.md`
**契约核心（前端以后端返回为准）：**
- `GET /api/zhao-point/v1/admin/adm/activity-overview?status=all|draft|signup_open|ongoing|ended` → `{ data: { summary, rows }, meta }`
- summary: `activityCount/signupCount/attendedCount/attendanceRate/reviewCount/avgRating/avgNps/pointsChargedSum/referralPoints/referralCount/attendPointsGlobal`
- rows[]: `{ type:'series'|'activity', documentId,title,status,startTime, signupCount,attendedCount,attendanceRate,waitingCount,cancelledCount,reviewCount,avgRating,avgNps,pointsChargedSum,referralPoints,referralCount, seriesId, detail }`
  - type=series：detail 为场次级数组 `[{documentId,title,startTime,signupCount,attendedCount,reviewCount,avgRating,avgNps,referralCount}]`；status=null
  - type=activity：detail 为 `{ reviews:[{userName,rating,nps,review,reviewedAt}], referrers:[{userName,inviteeCount,points}], signups:[{userName,status,attendedAt}], signupTotal }`

**验收脚本命名：** `scripts/accept-activity-overview.cjs`

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `plugins/zhao-point/server/src/services/activity-stats.ts` | 聚合核心 `getOverview` | Create |
| `plugins/zhao-point/server/src/controllers/activity-stats.ts` | `overview(ctx)` | Create |
| `plugins/zhao-point/server/src/controllers/index.ts` | 注册 controller（**显式 Step**） | Modify |
| `plugins/zhao-point/server/src/services/index.ts` | 注册 service | Modify |
| `plugins/zhao-point/server/src/routes/content-api.ts` | 新增 channelScopeRoute | Modify |
| `plugins/zhao-point/dist/**` | 插件编译产物（有效产物，需提交） | Build |
| `scripts/accept-activity-overview.cjs` | 端到端验收 | Create |
| `web/src/api/activity.js` | 增 `getActivityOverview` | Modify |
| `web/src/pages/activity/overview.vue` | 看板页 | Create |
| `web/src/pages.json` | 注册页面 | Modify |
| `web/src/pages/dashboard/index.vue` | 挂「活动效果」入口 | Modify |
| `web/dist/**` | HBuilder 构建产物（随源码提交） | Build |

---

### Task 1: 后端 service `activity-stats.ts`

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\services\activity-stats.ts`

- [ ] **Step 1: 创建 service 文件**

写入完整实现（纯查询聚合，复用 db.query；不新增依赖）：

```typescript
import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const REWARD_UID = "plugin::zhao-point.activity-referral-reward";
const POINT_RECORD_UID = "plugin::zhao-point.point-record";

const STATUS_LIST = ["draft", "signup_open", "ongoing", "ended"];

const round2 = (n: number) => Math.round(n * 100) / 100;

// 按关联字段（可能为对象或 id）索引
function indexBy(rows: any[], key: string): Map<number, any[]> {
  const m = new Map<number, any[]>();
  for (const r of rows) {
    const k = r[key] && typeof r[key] === "object" ? r[key].id : r[key];
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 活动效果总览：报名-到场-评价漏斗 + 积分成本/收益 + 裂变转化。
   * 纯查询不落库；活动/系列双分组；status 过滤（all|draft|signup_open|ongoing|ended）。
   */
  async getOverview({ status }: { status?: string } = {}) {
    const statusFilter =
      status && status !== "all" && STATUS_LIST.includes(status) ? status : undefined;

    const acts = await strapi.db.query(ACTIVITY_UID).findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      populate: { belongsToSeries: true },
    });
    if (!acts.length) {
      return {
        summary: {
          activityCount: 0, signupCount: 0, attendedCount: 0, attendanceRate: 0,
          reviewCount: 0, avgRating: 0, avgNps: 0,
          pointsChargedSum: 0, referralPoints: 0, referralCount: 0, attendPointsGlobal: 0,
        },
        rows: [],
      };
    }

    const actIds = acts.map((a: any) => a.id);
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: { $in: actIds } },
      populate: { user: true },
    });
    const rewards = await strapi.db.query(REWARD_UID).findMany({
      where: { activity: { $in: actIds } },
      populate: { inviter: true },
    });
    const signByAct = indexBy(signs, "activity");
    const rewardByAct = indexBy(rewards, "activity");

    const computeStats = (signList: any[], rewardList: any[]) => {
      const active = signList.filter((s) => s.status === "active");
      const attended = active.filter((s) => !!s.attendedAt);
      const reviewed = signList.filter((s) => !!s.reviewedAt);
      const rated = reviewed.filter((s) => s.rating != null);
      const npsd = reviewed.filter((s) => s.nps != null);
      return {
        signupCount: active.length,
        attendedCount: attended.length,
        attendanceRate: active.length ? round2((attended.length / active.length) * 100) : 0,
        waitingCount: signList.filter((s) => s.status === "waiting").length,
        cancelledCount: signList.filter((s) => s.status === "cancelled").length,
        reviewCount: reviewed.length,
        avgRating: rated.length ? round2(rated.reduce((a, s) => a + s.rating, 0) / rated.length) : 0,
        avgNps: npsd.length ? round2(npsd.reduce((a, s) => a + s.nps, 0) / npsd.length) : 0,
        pointsChargedSum: active.reduce((a, s) => a + (s.pointsCharged || 0), 0),
        referralPoints: rewardList.reduce((a, r) => a + (r.points || 0), 0),
        referralCount: rewardList.length,
      };
    };

    // 活动/系列归组：有 belongsToSeries 的并入系列行；无系列独立成行
    const seriesMap = new Map<number, { series: any; items: any[] }>();
    const standalone: any[] = [];
    for (const a of acts) {
      const sid = a.belongsToSeries?.id;
      if (sid != null) {
        if (!seriesMap.has(sid)) seriesMap.set(sid, { series: a.belongsToSeries, items: [] });
        seriesMap.get(sid)!.items.push(a);
      } else {
        standalone.push(a);
      }
    }

    const sortByTimeDesc = (x: any, y: any) =>
      (new Date(y.startTime).getTime() || 0) - (new Date(x.startTime).getTime() || 0);

    const seriesRows: any[] = [];
    for (const { series, items } of seriesMap.values()) {
      const itemIds = new Set(items.map((i) => i.id));
      const signsList = signs.filter((s) => itemIds.has(s.activity));
      const rewardList = rewards.filter((r) => itemIds.has(r.activity));
      seriesRows.push({
        type: "series",
        documentId: series.documentId,
        title: series.title,
        status: null,
        startTime: items.map((i) => i.startTime).filter(Boolean).sort().pop() ?? null,
        ...computeStats(signsList, rewardList),
        detail: items.map((i) => {
          const st = computeStats(signByAct.get(i.id) || [], rewardByAct.get(i.id) || []);
          return {
            documentId: i.documentId,
            title: i.title,
            startTime: i.startTime,
            signupCount: st.signupCount,
            attendedCount: st.attendedCount,
            reviewCount: st.reviewCount,
            avgRating: st.avgRating,
            avgNps: st.avgNps,
            referralCount: st.referralCount,
          };
        }),
      });
    }
    seriesRows.sort(sortByTimeDesc);

    const actRows = standalone.map((a) => {
      const signList = signByAct.get(a.id) || [];
      const rewardList = rewardByAct.get(a.id) || [];
      const reviewed = signList.filter((s) => !!s.reviewedAt);
      // 裂变推荐按 inviter 聚合
      const referrerMap = new Map<number, any>();
      for (const r of rewardList) {
        const uid = r.inviter?.id ?? r.inviter;
        if (uid == null) continue;
        if (!referrerMap.has(uid)) {
          referrerMap.set(uid, { userName: r.inviter?.username ?? `#${uid}`, inviteeCount: 0, points: 0 });
        }
        const g = referrerMap.get(uid)!;
        g.inviteeCount++;
        g.points += r.points || 0;
      }
      const activeSigns = signList.filter((s) => s.status === "active");
      return {
        type: "activity",
        documentId: a.documentId,
        title: a.title,
        status: a.status,
        startTime: a.startTime,
        seriesId: null,
        ...computeStats(signList, rewardList),
        detail: {
          reviews: reviewed.map((s) => ({
            userName: s.user?.username ?? `#${s.user?.id ?? s.user}`,
            rating: s.rating ?? null,
            nps: s.nps ?? null,
            review: s.review ?? null,
            reviewedAt: s.reviewedAt,
          })),
          referrers: Array.from(referrerMap.values()).sort((x, y) => y.inviteeCount - x.inviteeCount),
          signups: activeSigns.slice(0, 50).map((s) => ({
            userName: s.user?.username ?? `#${s.user?.id ?? s.user}`,
            status: s.status,
            attendedAt: s.attendedAt,
          })),
          signupTotal: activeSigns.length,
        },
      };
    });
    actRows.sort(sortByTimeDesc);

    const allStats = computeStats(signs, rewards);
    const attendRecords = await strapi.db.query(POINT_RECORD_UID).findMany({
      where: { source: "activity", method: "activity_attend" },
    });

    return {
      summary: {
        activityCount: acts.length,
        signupCount: allStats.signupCount,
        attendedCount: allStats.attendedCount,
        attendanceRate: allStats.attendanceRate,
        reviewCount: allStats.reviewCount,
        avgRating: allStats.avgRating,
        avgNps: allStats.avgNps,
        pointsChargedSum: allStats.pointsChargedSum,
        referralPoints: allStats.referralPoints,
        referralCount: allStats.referralCount,
        attendPointsGlobal: attendRecords.reduce((a, r) => a + (r.points || 0), 0),
      },
      rows: [...seriesRows, ...actRows],
    };
  },
});
```

- [ ] **Step 2: 自检**（无编译步骤；类型错误忽略不影响运行时，后续构建确认）

---

### Task 2: 后端 controller + 注册（含显式注册 Step）

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity-stats.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\index.ts`

- [ ] **Step 1: 创建 controller**

```typescript
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /adm/activity-overview?status=all|draft|signup_open|ongoing|ended
  async overview(ctx: any) {
    try {
      const { status = "all" } = ctx.query;
      const result = await strapi
        .plugin("zhao-point")
        .service("activity-stats")
        .getOverview({ status: String(status) });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 注册 controller 到 controllers/index.ts（显式 Step）**

在 `import calendar from "./calendar";` 后追加 import，并在 default 对象加键：

```typescript
import activityStats from "./activity-stats";
```

```typescript
  calendar,
  "activity-stats": activityStats,
```

- [ ] **Step 3: 注册 service 到 services/index.ts**

在 `import feeService from "./fee-service";` 后追加 import，并在 default 对象加键：

```typescript
import activityStats from "./activity-stats";
```

```typescript
  "fee-service": feeService,
  "activity-stats": activityStats,
```

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity-stats.ts plugins/zhao-point/server/src/controllers/activity-stats.ts plugins/zhao-point/server/src/controllers/index.ts plugins/zhao-point/server/src/services/index.ts
git commit -m "feat(zhao-point): activity overview stats service/controller"
```

---

### Task 3: 路由

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 新增路由**

在活动管理员路由段（`channelScopeRoute("GET", "/adm/activity-reviews", ...)` 之后）追加一行：

```typescript
    channelScopeRoute("GET", "/adm/activity-overview", "activity-stats.overview", "activity.read"),
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-point/server/src/routes/content-api.ts
git commit -m "feat(zhao-point): add activity-overview admin route"
```

---

### Task 4: 重建插件 dist

**Files:**
- Build: `e:\code\basic\plugins\zhao-point`（产物 `plugins/zhao-point/dist/**`）

- [ ] **Step 1: 构建插件**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

Expected: 构建成功（若出现 dts 类型告警可忽略，运行时产物正常，历史同例）。

- [ ] **Step 2: 提交插件产物**

```bash
git add plugins/zhao-point/dist
git commit -m "build(zhao-point): rebuild dist for activity overview"
```

---

### Task 5: 验收脚本

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-overview.cjs`

- [ ] **Step 1: 创建验收脚本**

写入完整端到端脚本（造 1 系列(2 场) + 2 无系列活动 + 1 草稿 + 报名/评价/积分/裂变数据 → 断言 summary/rows/detail/status 过滤 → 零残留清理）：

```javascript
/* 活动效果总览看板 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-overview.cjs
 * 覆盖:
 *  1. 汇总卡片: activityCount/signupCount/attendedCount/attendanceRate/reviewCount/avgRating/avgNps/
 *     pointsChargedSum/referralPoints/referralCount/attendPointsGlobal
 *  2. series 行聚合其场次(报名/到场/评价/裂变), detail 场次级
 *  3. 无系列活动独立成行, detail 含 reviews/referrers/signups(+signupTotal)
 *  4. status 过滤: draft 仅在 all 时出现, signup_open 过滤掉 ended/draft
 *  5. attendanceRate 计算正确, 评分/NPS 仅计已评价(reviewedAt 非空)
 *  6. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前先 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'aov_'; // 测试用户名前缀

let PASS = 0, FAIL = 0;
const out = [];
const check = (name, cond, detail = '') => {
  if (cond) PASS++; else FAIL++;
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 25; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;

async function register(username) {
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username, email: `${username}@audit.local`, password: 'a123456', confirmPassword: 'a123456' },
  });
  const j = res.json || {};
  const user = j.user || j.data?.user || j.data || j;
  return { id: user?.id || user?.documentId, token: tokenOf(j), raw: j };
}
const q = async (sql, params) => (await client.query(sql, params)).rows;

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 清场(开头): 验收活动/系列/报名/奖励/点记录/测试用户 ----
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) {
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    const rrs = await q(`SELECT activity_referral_reward_id::int AS id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const r of rrs) {
      await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  // 测试用户 + 其积分记录/渠道成员
  const upRows = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    const members = await q(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = $1`, [u.id]);
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      const chIds = await q(`SELECT DISTINCT channel_id AS id FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members WHERE id = ANY($1)`, [memberIds]);
      for (const ch of chIds.rows) await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND (name LIKE '${PF}%的个人渠道')`, [ch.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  const createdActs = [];
  const addAct = (a) => { createdActs.push(a); return a; };

  // ---- 测试用户 ----
  const users = {};
  for (const k of ['u1', 'u2', 'u3', 'u4']) {
    const u = await register(nm(k));
    users[k] = { id: u.id };
    check(`注册测试用户 ${k}`, !!u.id, `id=${u.id}`);
  }

  // ---- 构造活动 ----
  // 1 系列(2 场: 已结束 sf1 + 报名中 sf2)
  const seriesRes = await api('POST', '/zhao-point/v1/admin/adm/series', {
    token: adminToken,
    body: { title: '验收-看板系列', description: '系列' },
  });
  const series = seriesRes.json && seriesRes.json.data;
  const seriesDocId = series && series.documentId;
  check('建系列成功', seriesRes.status === 200 && !!seriesDocId, JSON.stringify(series));

  const mkAct = (title, status, startOffsetDays, belongsToSeries) => api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title, description: title, capacity: 100, status,
      startTime: new Date(Date.now() + startOffsetDays * 86400e3).toISOString(),
      endTime: new Date(Date.now() + (startOffsetDays + 1) * 86400e3).toISOString(),
      ...(belongsToSeries ? { belongsToSeries: belongsToSeries } : {}),
    },
  });

  const sf1 = addAct((await mkAct('验收-看板场次1', 'ended', -2, seriesDocId)).json?.data);
  const sf2 = addAct((await mkAct('验收-看板场次2', 'signup_open', 2, seriesDocId)).json?.data);
  const a1 = addAct((await mkAct('验收-看板活动A', 'ended', -3)).json?.data);
  const a2 = addAct((await mkAct('验收-看板活动B', 'signup_open', 5)).json?.data);
  const d1 = addAct((await mkAct('验收-看板草稿', 'draft', 10)).json?.data);
  const actIds = createdActs.map((a) => a.id);
  check('建 5 个活动(含系列2场+2独立+1草稿)', actIds.length === 5 && actIds.every(Boolean), `ids=${actIds.length}`);

  // ---- 直插报名 ----
  const insSignup = async (actId, uid, { status = 'active', attended = false, rating = null, nps = null, review = null, reviewedAt = false, points = 0 }) => {
    const sig = await client.query(
      `INSERT INTO activity_signups (document_id,status,points_charged,signup_at,attended_at,rating,nps,review,reviewed_at,created_at,updated_at)
       VALUES ($1,$2,$3,now(),$4,$5,$6,$7,$8,now(),now()) RETURNING id`,
      [crypto.randomUUID(), status, points, attended ? new Date().toISOString() : null, rating, nps, review, reviewedAt ? new Date().toISOString() : null]);
    await client.query(`INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)`, [sig.rows[0].id, actId]);
    await client.query(`INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)`, [sig.rows[0].id, uid]);
    return sig.rows[0].id;
  };
  // sf1(ended): u1 active 到场+评价100分; u2 waiting; u3 cancelled
  await insSignup(sf1.id, users.u1.id, { attended: true, rating: 5, nps: 9, review: '好', reviewedAt: true, points: 100 });
  await insSignup(sf1.id, users.u2.id, { status: 'waiting' });
  await insSignup(sf1.id, users.u3.id, { status: 'cancelled' });
  // sf2(signup_open): u4 active 到场; u1 active 未到场
  await insSignup(sf2.id, users.u4.id, { attended: true });
  await insSignup(sf2.id, users.u1.id, {});
  // a1(ended): u1 active 到场+评价50分; u2 active 未到场50分; u3 waiting
  await insSignup(a1.id, users.u1.id, { attended: true, rating: 4, nps: 8, review: '不错', reviewedAt: true, points: 50 });
  await insSignup(a1.id, users.u2.id, { points: 50 });
  await insSignup(a1.id, users.u3.id, { status: 'waiting' });
  // a2(signup_open): u3 active 未到场
  await insSignup(a2.id, users.u3.id, {});
  // d1(draft): u4 active 未到场
  await insSignup(d1.id, users.u4.id, {});

  // ---- 直插裂变奖励 ----
  const insReward = async (actId, inviterUid, inviteeUid, points) => {
    const rw = await client.query(
      `INSERT INTO activity_referral_rewards (document_id,points,source_invite_code,issued_at,created_at,updated_at)
       VALUES ($1,$2,'aov-code',now(),now(),now()) RETURNING id`,
      [crypto.randomUUID(), points]);
    await client.query(`INSERT INTO activity_referral_rewards_activity_lnk (activity_referral_reward_id,activity_id) VALUES ($1,$2)`, [rw.rows[0].id, actId]);
    await client.query(`INSERT INTO activity_referral_rewards_inviter_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, inviterUid]);
    await client.query(`INSERT INTO activity_referral_rewards_invitee_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, inviteeUid]);
    return rw.rows[0].id;
  };
  // sf1: 1 条 50(A 带); a1: A 带 2 条 30+30, B 带 1 条 20
  await insReward(sf1.id, users.u1.id, users.u2.id, 50);
  await insReward(a1.id, users.u1.id, users.u3.id, 30);
  await insReward(a1.id, users.u1.id, users.u4.id, 30);
  await insReward(a1.id, users.u2.id, users.u3.id, 20);

  // ---- 直插签到发放积分(全局) ----
  const pr = await client.query(
    `INSERT INTO zhao_point_records (document_id,action,type,points,balance,source,method,remark,created_at,updated_at)
     VALUES ($1,'activity_attend','increase',25,25,'activity','activity_attend','验收',now(),now()) RETURNING id`,
    [crypto.randomUUID()]);
  await client.query(`INSERT INTO zhao_point_records_user_lnk (point_record_id,user_id) VALUES ($1,$2)`, [pr.rows[0].id, users.u1.id]);

  // ---- 断言: status=all ----
  const ov = await api('GET', '/zhao-point/v1/admin/adm/activity-overview?status=all', { token: adminToken });
  const d = ov.json && ov.json.data;
  check('overview 端点 200 且返回 data.summary/rows', ov.status === 200 && d && d.summary && Array.isArray(d.rows), `${ov.status} ${JSON.stringify(ov.json).slice(0, 100)}`);
  if (!d) { console.error('overview 无数据，终止'); process.exit(1); }
  const s = d.summary;
  // 汇总(精确): activityCount=5, signup=7(1+2+2+1+1), attended=3(1+1+1), rate=3/7=42.86,
  //   review=2, avgRating=(5+4)/2=4.5, avgNps=(9+8)/2=8.5, points=200(100+0+100+0+0),
  //   referralCount=3(1+2), referralPoints=100(50+30+30+20 中 a1 系 50? 错, 见下方), attend=25
  //   referralPoints 精确: sf1=50 + a1=80 = 130
  check('summary.activityCount=5', s.activityCount === 5, `v=${s.activityCount}`);
  check('summary.signupCount=7', s.signupCount === 7, `v=${s.signupCount}`);
  check('summary.attendedCount=3', s.attendedCount === 3, `v=${s.attendedCount}`);
  check('summary.attendanceRate=42.86', s.attendanceRate === 42.86, `v=${s.attendanceRate}`);
  check('summary.reviewCount=2', s.reviewCount === 2, `v=${s.reviewCount}`);
  check('summary.avgRating=4.5', s.avgRating === 4.5, `v=${s.avgRating}`);
  check('summary.avgNps=8.5', s.avgNps === 8.5, `v=${s.avgNps}`);
  check('summary.pointsChargedSum=200', s.pointsChargedSum === 200, `v=${s.pointsChargedSum}`);
  check('summary.referralCount=3', s.referralCount === 3, `v=${s.referralCount}`);
  check('summary.referralPoints=130', s.referralPoints === 130, `v=${s.referralPoints}`);
  check('summary.attendPointsGlobal=25', s.attendPointsGlobal === 25, `v=${s.attendPointsGlobal}`);

  // ---- 断言: rows 结构 ----
  const rows = d.rows;
  const seriesRow = rows.find((r) => r.type === 'series');
  const a1Row = rows.find((r) => r.type === 'activity' && r.documentId === a1.documentId);
  const a2Row = rows.find((r) => r.type === 'activity' && r.documentId === a2.documentId);
  const d1Row = rows.find((r) => r.type === 'activity' && r.documentId === d1.documentId);
  check('rows 含 1 系列 + 3 活动(草稿含)', seriesRow && a1Row && a2Row && d1Row && rows.length === 4, `len=${rows.length}`);
  // series 行聚合两场: signup=3(1+2), attended=2(1+1), rate=66.67, waiting=1, cancelled=1, review=1, avgRating=5, avgNps=9, points=100, referralCount=1, referralPoints=50
  check('series 行 signupCount=3', seriesRow.signupCount === 3, `v=${seriesRow.signupCount}`);
  check('series 行 attendedCount=2', seriesRow.attendedCount === 2, `v=${seriesRow.attendedCount}`);
  check('series 行 attendanceRate=66.67', seriesRow.attendanceRate === 66.67, `v=${seriesRow.attendanceRate}`);
  check('series 行 waitingCount=1 cancelledCount=1', seriesRow.waitingCount === 1 && seriesRow.cancelledCount === 1, `w=${seriesRow.waitingCount} c=${seriesRow.cancelledCount}`);
  check('series 行 reviewCount=1 avgRating=5 avgNps=9', seriesRow.reviewCount === 1 && seriesRow.avgRating === 5 && seriesRow.avgNps === 9, JSON.stringify(seriesRow));
  check('series 行 pointsChargedSum=100', seriesRow.pointsChargedSum === 100, `v=${seriesRow.pointsChargedSum}`);
  check('series 行 referralCount=1 referralPoints=50', seriesRow.referralCount === 1 && seriesRow.referralPoints === 50, `c=${seriesRow.referralCount} p=${seriesRow.referralPoints}`);
  check('series 行 detail 场次级=2', Array.isArray(seriesRow.detail) && seriesRow.detail.length === 2, `len=${seriesRow.detail && seriesRow.detail.length}`);
  const sd0 = seriesRow.detail.find((x) => x.documentId === sf1.documentId);
  const sd1 = seriesRow.detail.find((x) => x.documentId === sf2.documentId);
  check('series detail 场次1: signup=1 attended=1 review=1 rating=5', sd0 && sd0.signupCount === 1 && sd0.attendedCount === 1 && sd0.reviewCount === 1 && sd0.avgRating === 5, JSON.stringify(sd0));
  check('series detail 场次2: signup=2 attended=1 review=0', sd1 && sd1.signupCount === 2 && sd1.attendedCount === 1 && sd1.reviewCount === 0, JSON.stringify(sd1));
  // a1 行: signup=2, attended=1, rate=50, waiting=1, review=1, rating=4 nps=8, points=100, referralCount=2 referralPoints=80
  check('a1 行 signupCount=2 attendedCount=1 rate=50', a1Row.signupCount === 2 && a1Row.attendedCount === 1 && a1Row.attendanceRate === 50, JSON.stringify(a1Row));
  check('a1 行 reviewCount=1 avgRating=4 avgNps=8', a1Row.reviewCount === 1 && a1Row.avgRating === 4 && a1Row.avgNps === 8, JSON.stringify(a1Row));
  check('a1 行 pointsChargedSum=100', a1Row.pointsChargedSum === 100, `v=${a1Row.pointsChargedSum}`);
  check('a1 行 referralCount=2 referralPoints=80', a1Row.referralCount === 2 && a1Row.referralPoints === 80, `c=${a1Row.referralCount} p=${a1Row.referralPoints}`);
  // a1 detail
  check('a1 detail.reviews 长度=1 且含 userName/rating/nps/review/reviewedAt',
    a1Row.detail.reviews.length === 1 && !!a1Row.detail.reviews[0].userName && a1Row.detail.reviews[0].rating === 4 && a1Row.detail.reviews[0].nps === 8 && a1Row.detail.reviews[0].review === '不错' && !!a1Row.detail.reviews[0].reviewedAt, JSON.stringify(a1Row.detail.reviews));
  check('a1 detail.referrers 按 inviter 聚合=2 且 inviteeCount/points 正确',
    a1Row.detail.referrers.length === 2 && a1Row.detail.referrers.some((x) => x.inviteeCount === 2 && x.points === 60) && a1Row.detail.referrers.some((x) => x.inviteeCount === 1 && x.points === 20), JSON.stringify(a1Row.detail.referrers));
  check('a1 detail.signups 长度=2 且含 status/attendedAt', a1Row.detail.signups.length === 2 && a1Row.detail.signupTotal === 2 && a1Row.detail.signups.every((x) => !!x.userName && x.status === 'active'), JSON.stringify(a1Row.detail.signups));
  check('a2 行 signupCount=1 attendedCount=0 rate=0', a2Row.signupCount === 1 && a2Row.attendedCount === 0 && a2Row.attendanceRate === 0, JSON.stringify(a2Row));
  check('d1 行(草稿)存在且 signupCount=1', d1Row.signupCount === 1, JSON.stringify(d1Row));

  // ---- 断言: status=signup_open 过滤 ----
  const ov2 = await api('GET', '/zhao-point/v1/admin/adm/activity-overview?status=signup_open', { token: adminToken });
  const d2 = ov2.json && ov2.json.data;
  const rows2 = d2 ? d2.rows : [];
  check('signup_open: 仅 sf2+a2(2 活动), 无草稿/ended', d2 && d2.summary.activityCount === 2 && rows2.length === 2 && !rows2.some((r) => r.status === 'draft'), `count=${d2 && d2.summary.activityCount} len=${rows2.length}`);
  const srow2 = rows2.find((r) => r.type === 'series');
  check('signup_open: series 行仅聚合 sf2(signup=2 attended=1)', srow2 && srow2.signupCount === 2 && srow2.attendedCount === 1 && srow2.detail.length === 1, JSON.stringify(srow2));
  check('signup_open: summary.signupCount=3', d2 && d2.summary.signupCount === 3, `v=${d2 && d2.summary.signupCount}`);

  // ---- 清理(零残留) ----
  for (const a of createdActs) {
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    const rrs = await q(`SELECT activity_referral_reward_id::int AS id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const r of rrs) {
      await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  // 测试用户(含其点记录/渠道)
  const upIds = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upIds) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    const members = await q(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = $1`, [u.id]);
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      const chIds = await q(`SELECT DISTINCT channel_id AS id FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members WHERE id = ANY($1)`, [memberIds]);
      for (const ch of chIds.rows) await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND (name LIKE '${PF}%的个人渠道')`, [ch.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) rr,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 系列=${res.s} 报名孤儿=${res.su} 奖励孤儿=${res.rr} 测试用户=${res.u} 点记录=${res.pl})`,
    res.a === 0 && res.s === 0 && res.su === 0 && res.rr === 0 && res.u === 0 && res.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
```

- [ ] **Step 2: 启动 dev 并运行验收**

先确保 zhao-point 已重建（Task 4），启动本地 Strapi dev（如未运行：`cd e:\code\basic && npm run develop`），等 `/api/zhao-auth/v1/login` 可达后：

```bash
cd e:\code\basic && node scripts/accept-activity-overview.cjs
```

Expected: `PASS=NN FAIL=0`（约 30+ 项断言全 PASS）。

- [ ] **Step 3: 收口（验收子代理固定收尾）**

停 dev 进程；`git restore dist/`（pathspec 仅还原根 app dist，不影响 `plugins/*/dist` 有效产物）；删除临时诊断脚本；提交脚本：

```bash
git add scripts/accept-activity-overview.cjs
git commit -m "test(zhao-point): accept-activity-overview e2e"
```

---

### Task 6: 前端 API + 页面 + 注册

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Create: `e:\code\web\src\pages\activity\overview.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\pages\dashboard\index.vue`

- [ ] **Step 1: 新增 API 函数**

在 `e:\code\web\src\api\activity.js` 末尾追加（与 `getShareLeaderboard` 同模式，返回原始体 `{ data:{summary,rows}, meta }`）：

```javascript
// 活动效果总览（返回 { data: { summary, rows }, meta }；?status=all|draft|signup_open|ongoing|ended）
export function getActivityOverview(params = {}) {
  return get(`${ADMIN}/activity-overview`, params)
}
```

- [ ] **Step 2: 创建 overview.vue 页面**

写入完整页面（顶部汇总卡片 + 状态筛选 + 系列/活动双分组列表 + 展开下钻；前端字段严格按后端契约）：

```vue
<template>
  <view class="page-container">
    <PageHeader title="活动效果">
      <view class="header-right">
        <button class="btn-query" @click="loadData">刷新</button>
      </view>
    </PageHeader>

    <view class="cards">
      <view class="card" v-for="c in cards" :key="c.label">
        <text class="card-num">{{ c.value }}</text>
        <text class="card-label">{{ c.label }}</text>
      </view>
      <view class="tip">*签到发放积分为全站加总（积分流水无活动维度）</view>
    </view>

    <view class="filter-row">
      <view v-for="opt in statusOptions" :key="opt.value" class="chip"
        :class="{ active: status === opt.value }" @click="setStatus(opt.value)">
        {{ opt.label }}
      </view>
    </view>

    <view class="board-list" v-if="!loading && rows.length > 0">
      <view v-for="(row, idx) in rows" :key="keyOf(row, idx)" class="board-card">
        <view class="board-row" @click="toggleDetail(row, idx)">
          <view class="badge" :class="row.type">{{ row.type === 'series' ? '系列' : '活动' }}</view>
          <view class="board-info">
            <text class="board-name">{{ row.title || '-' }}</text>
            <view class="board-stats">
              <text class="stat-item">报名 {{ row.signupCount ?? '-' }}</text>
              <text class="stat-item">到场 {{ row.attendedCount ?? '-' }} ({{ row.attendanceRate ?? '-' }}%)</text>
              <text class="stat-item">均分 {{ fmtNum(row.avgRating) }}</text>
              <text class="stat-item">实收 {{ row.pointsChargedSum ?? '-' }}</text>
            </view>
          </view>
          <text class="board-toggle">{{ expandedKey === keyOf(row, idx) ? '收起' : '展开' }}</text>
        </view>

        <view v-if="expandedKey === keyOf(row, idx)" class="board-detail">
          <!-- series: 场次级 -->
          <template v-if="row.type === 'series'">
            <view class="detail-item" v-for="(d, di) in row.detail" :key="di">
              <text class="detail-main">{{ d.title || '-' }}</text>
              <text class="detail-sub">
                报名 {{ d.signupCount ?? '-' }} · 到场 {{ d.attendedCount ?? '-' }} ·
                均分 {{ fmtNum(d.avgRating) }} · NPS {{ fmtNum(d.avgNps) }} ·
                裂变 {{ d.referralCount ?? '-' }} · {{ fmtTime(d.startTime) }}
              </text>
            </view>
          </template>
          <!-- activity: reviews / referrers / signups -->
          <template v-else>
            <view class="detail-sec">评价 ({{ (row.detail.reviews || []).length }})</view>
            <view class="detail-item" v-for="(rv, ri) in row.detail.reviews" :key="'r' + ri">
              <text class="detail-main">{{ rv.userName || '-' }} · 评分 {{ rv.rating ?? '-' }} · NPS {{ rv.nps ?? '-' }}</text>
              <text class="detail-sub">{{ rv.review || '(无文字)' }} · {{ fmtTime(rv.reviewedAt) }}</text>
            </view>
            <view class="detail-sec">裂变推荐</view>
            <view class="detail-item" v-for="(rf, fi) in row.detail.referrers" :key="'f' + fi">
              <text class="detail-main">{{ rf.userName || '-' }} · 带来 {{ rf.inviteeCount ?? 0 }} 人 · {{ rf.points ?? 0 }} 积分</text>
            </view>
            <view class="detail-sec">报名名单 ({{ row.detail.signupTotal ?? (row.detail.signups || []).length }})</view>
            <view class="detail-item" v-for="(su, si) in row.detail.signups" :key="'s' + si">
              <text class="detail-main">{{ su.userName || '-' }} · {{ su.status }}</text>
              <text class="detail-sub">{{ su.attendedAt ? '已到场 ' + fmtTime(su.attendedAt) : '未到场' }}</text>
            </view>
            <view v-if="!row.detail.reviews.length && !row.detail.referrers.length && !row.detail.signups.length" class="detail-empty">暂无明细</view>
          </template>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-text">暂无活动数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getActivityOverview } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '报名中', value: 'signup_open' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
]

const status = ref('all')
const summary = ref({})
const rows = ref([])
const loading = ref(false)
const expandedKey = ref('')

const cards = computed(() => {
  const s = summary.value || {}
  return [
    { label: '活动数', value: s.activityCount ?? 0 },
    { label: '总报名', value: s.signupCount ?? 0 },
    { label: '总到场', value: s.attendedCount ?? 0 },
    { label: '到场率', value: (s.attendanceRate ?? 0) + '%' },
    { label: '评价数', value: s.reviewCount ?? 0 },
    { label: '均分', value: fmtNum(s.avgRating) },
    { label: 'NPS', value: fmtNum(s.avgNps) },
    { label: '实收积分', value: s.pointsChargedSum ?? 0 },
    { label: '裂变奖励', value: s.referralPoints ?? 0 },
    { label: '签到发放*', value: s.attendPointsGlobal ?? 0 },
  ]
})

function fmtNum(v) {
  return (v === undefined || v === null || v === '') ? '-' : v
}
function fmtTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function keyOf(row, idx) {
  return row.documentId || `${row.type}_${idx}`
}
function toggleDetail(row, idx) {
  const k = keyOf(row, idx)
  expandedKey.value = expandedKey.value === k ? '' : k
}
function setStatus(v) {
  status.value = v
  loadData()
}
async function loadData() {
  loading.value = true
  try {
    const res = await getActivityOverview({ status: status.value })
    const d = res && (res.data || res)
    summary.value = (d && d.summary) || {}
    rows.value = Array.isArray(d && d.rows) ? d.rows : []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
onMounted(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.header-right { display: flex; align-items: center; }
.btn-query {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; padding: 16rpx 40rpx; font-size: 30rpx;
  border-radius: 40rpx; border: none; line-height: 1.2;
}
.cards {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx;
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
}
.card { text-align: center; display: flex; flex-direction: column; gap: 8rpx; }
.card-num { font-size: 40rpx; font-weight: bold; color: #333; }
.card-label { font-size: 22rpx; color: #999; }
.tip { grid-column: 1 / -1; font-size: 20rpx; color: #bbb; }
.filter-row { display: flex; gap: 16rpx; flex-wrap: wrap; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.chip {
  padding: 12rpx 28rpx; border-radius: 32rpx; font-size: 26rpx; color: #666;
  background: #f5f5f5;
}
.chip.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.board-list { display: flex; flex-direction: column; gap: 16rpx; }
.board-card { background: #fff; border-radius: 12rpx; overflow: hidden; }
.board-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; }
.badge {
  width: 72rpx; height: 40rpx; border-radius: 8rpx; display: flex; align-items: center;
  justify-content: center; font-size: 22rpx; color: #fff; flex-shrink: 0;
}
.badge.series { background: #764ba2; }
.badge.activity { background: #667eea; }
.board-info { flex: 1; min-width: 0; }
.board-name { font-size: 30rpx; font-weight: bold; color: #333; display: block; }
.board-stats { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 8rpx; }
.stat-item { font-size: 24rpx; color: #999; }
.board-toggle { font-size: 24rpx; color: #667eea; flex-shrink: 0; }
.board-detail { border-top: 1rpx solid #f0f0f0; padding: 20rpx 24rpx; background: #fafbfe; }
.detail-sec { font-size: 24rpx; color: #667eea; font-weight: bold; margin: 16rpx 0 8rpx; }
.detail-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.detail-item:last-child { border-bottom: none; }
.detail-main { display: block; font-size: 26rpx; color: #333; }
.detail-sub { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.detail-empty { font-size: 24rpx; color: #999; text-align: center; padding: 12rpx 0; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
```

- [ ] **Step 3: 注册页面到 pages.json**

在活动相关页面段（`"pages/activity/review"` 之后）新增：

```json
    { "path": "pages/activity/overview", "style": { "navigationBarTitleText": "活动效果" } },
```

- [ ] **Step 4: dashboard 挂入口**

在 `e:\code\web\src\pages\dashboard\index.vue` 活动管理模块（`activity/review` 之后）新增：

```html
        <view class="module-item" @click="navigateTo('/pages/activity/overview')">
          <view class="module-icon">📊</view>
          <view class="module-name">活动效果</view>
        </view>
```

- [ ] **Step 5: 提交**

```bash
git add src/api/activity.js src/pages/activity/overview.vue src/pages.json src/pages/dashboard/index.vue
git commit -m "feat(web): activity overview dashboard page"
```

---

### Task 7: 前端构建 + 三仓库收口

**Files:**
- Build: `e:\code\web`（产物 `web/dist/**`）
- Push: basic、web 两仓库；shao 不动

- [ ] **Step 1: HBuilder 构建 web**

```bash
cd e:\code\web && npm run build:h5
```

Expected: 构建成功，`dist/build/h5` 更新。

- [ ] **Step 2: 提交并推送**

```bash
git add dist
git commit -m "build(web): rebuild h5 with activity overview"
git push origin <当前分支>
```

（basic 仓库在 Task 5 已完成本地提交，同样 `git push origin <当前分支>`；shao 本轮不动。）

- [ ] **Step 3: 最终自检**

- 后端：`plugins/zhao-point/dist` 已提交（插件产物有效）；根 app `dist/` 已 `git restore` 还原
- 前端：`web/dist` 与源码同批提交
- 验收：`accept-activity-overview.cjs` 已全 PASS 且无残留
- 无调试残留：grep 自查 `DEBUG|console.log|log.info` 未在新增业务文件中遗留自造标记（service/controller 保持与现有文件一致的日志风格）

---

## 自检（Self-Review）

**Spec 覆盖：**
- §2 数据口径：signup/attended/候补/取消/评价/均分/NPS/实收/裂变（Task 1 computeStats）+ 签到发放全局（Task 1 attendRecords）✅
- §3 接口契约：路由（Task 3）+ summary/rows/detail 结构（Task 1）✅
- §4 实现组件：service/controller/注册（Task 1/2）+ 路由（Task 3）✅
- §5 前端：api + overview.vue + pages.json + dashboard 入口（Task 6）✅
- §7 验收：accept 脚本（Task 5）✅

**无占位符：** 所有步骤均含完整代码与命令。✅

**类型一致性：** `getOverview({status})` → summary/rows 字段名在全计划（service/controller/api/vue/accept 脚本）一致：`activityCount/signupCount/attendedCount/attendanceRate/reviewCount/avgRating/avgNps/pointsChargedSum/referralPoints/referralCount/attendPointsGlobal`；rows 指标字段与 detail 结构一致。✅

**风险提示（记录于 spec §6，不另做改动）：** point-record 无活动维度 → 签到发放积分仅全局卡片；评分/NPS 仅计已评价；列表 0 值前端显示 '-'。
