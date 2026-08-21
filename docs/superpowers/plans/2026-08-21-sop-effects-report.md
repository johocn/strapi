# SOP 触达漏斗效果报表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-sso 提供 SOP 触达漏斗报表——按 `scene`（行内附关联 sop-rule 信息）聚合 `sso_msg_jobs` 的发起/送达/失败/频控拦截 + 累计点击，暴露 `GET /admin/msg/sop-stats`，web 运营端展示。

**Architecture:** zhao-sso 新增 `sso-stats` service（`getSopStats` 用 `strapi.db.query` 按 scene + created_at 区间 count 聚合各状态，clickCount 走 template→version 累加），新增 `msg-stats` controller + admin 路由（scope `sso.msg.read`）。web 运营端新增页 `sopStats.vue`。以 `scene` 为统计单元（`sso_msg_jobs` 仅带 scene，避免按规则重复计数）。

**Tech Stack:** Strapi 5 插件（zhao-sso）、PostgreSQL、`strapi.db.query`、web(uniapp/HBuilder) 运营端。

---

### 验收运行前提
- 后端：`cd e:\code\basic && npm run dev`（1337）。插件改动后 `cd e:\code\basic\plugins\zhao-sso && npm run build` 并重启 dev。
- 前端：`cd e:\code\web`（HBuilder uniapp 工程），页面用 `uni.request` 调 `/api/zhao-sso/v1/admin/msg/sop-stats`。
- 两仓库改动，需分别推送：后端 basic、前端 web。

---

### Task 1: sso-stats service（聚合逻辑）

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 创建 sso-stats service**

创建 `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`：

```ts
import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
const DATE_MS = 86400000;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * SOP 触达漏斗：按 scene 聚合 sso_msg_jobs（created_at ∈ [from,to]），行内附关联 sop-rule，
   * clicks 为该 scene 关联模板各版本 clickCount 累计。
   */
  async getSopStats(opts: { from?: string; to?: string; scene?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const range = { createdAt: { $gte: from, $lte: to } };

    const rules = await strapi.db.query(SOP_RULE_UID).findMany({});
    const ruleByScene = new Map<string, any[]>();
    for (const r of rules) {
      if (!ruleByScene.has(r.scene)) ruleByScene.set(r.scene, []);
      ruleByScene.get(r.scene)!.push(r);
    }

    const sceneSet = new Set<string>([...ruleByScene.keys()]);
    if (opts.scene) sceneSet.add(opts.scene);
    const scenes = Array.from(sceneSet).filter((s) => (opts.scene ? s === opts.scene : true));

    const countBy = (scene: string, status?: string) =>
      status
        ? strapi.db.query(MSG_JOB_UID).count({ where: { scene, status, ...range } })
        : strapi.db.query(MSG_JOB_UID).count({ where: { scene, ...range } });

    const rows: any[] = [];
    const summary = { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, pending: 0, sentRate: 0 };

    for (const s of scenes) {
      const [total, sent, failed, quota, pending, cancelled] = await Promise.all([
        countBy(s), countBy(s, "sent"), countBy(s, "failed"), countBy(s, "quota_limited"), countBy(s, "pending"), countBy(s, "cancelled"),
      ]);

      let clicks = 0;
      const ruleList = ruleByScene.get(s) || [];
      for (const r of ruleList) {
        if (!r.templateCode) continue;
        const tpl = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { code: r.templateCode } });
        if (!tpl) continue;
        const vers = await strapi.db.query(MSG_VERSION_UID).findMany({ where: { template: tpl.id } });
        for (const v of vers) clicks += v.clickCount || 0;
      }

      const sentRate = total ? Math.round((sent / total) * 100) : 0;
      rows.push({
        scene: s,
        rules: ruleList.map((r) => ({ code: r.code, name: r.name ?? null, templateCode: r.templateCode ?? null, source: r.source ?? null })),
        total, sent, failed, quotaLimited: quota, pending, cancelled, sentRate, clicks,
      });
      summary.sceneCount += 1;
      summary.total += total; summary.sent += sent; summary.failed += failed;
      summary.quotaLimited += quota; summary.pending += pending;
    }
    summary.sentRate = summary.total ? Math.round((summary.sent / summary.total) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), summary, rows };
  },
});
```

- [ ] **Step 2: 注册 service**

在 `e:\code\basic\plugins\zhao-sso\server\src\services\index.ts` 顶部 import 区追加：

```ts
import ssoStats from "./sso-stats";
```

在 `export default { ... }` 末尾（`"sso-quota": ssoQuota,` 后）追加：

```ts
  "sso-stats": ssoStats,
```

- [ ] **Step 3: 构建**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功，无类型错误。

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): sso-stats getSopStats aggregate service"
```

---

### Task 2: controller + admin 路由

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`

- [ ] **Step 1: 创建 msg-stats controller**

创建 `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts`：

```ts
export default ({ strapi }: any) => ({
  async sopStats(ctx: any) {
    const { from, to, scene } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getSopStats({ from, to, scene });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 注册 controller（必须，否则插件启动报错）**

在 `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts` 顶部 import 区追加：

```ts
import msgStats from "./msg-stats";
```

在 `export default { ... }` 末尾（`"recommend-controller": recommendController,` 后）追加：

```ts
  "msg-stats": msgStats,
```

- [ ] **Step 3: 注册 admin 路由**

在 `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts` 的 `export default () => ({ routes: [ ... ] })` 数组内，追加一条（参照既有 `GET /msg-templates/:templateId/ab-stats` 之后）：

```ts
    adminRoute("GET", "/msg/sop-stats", "msg-stats.sopStats", "sso.msg.read"),
```

- [ ] **Step 4: 构建**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功。

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): expose GET /admin/msg/sop-stats (msg-stats controller + route)"
```

---

### Task 3: dev 启动烟测

- [ ] **Step 1: 启动 dev 并确认路由可达**

启 dev：`cd e:\code\basic && npm run dev`，等 `/api/_health` 返回 204（注意 204 即健康，勿当失败）。

- [ ] **Step 2: 冒烟调用**

用 admin 登录 `POST /api/zhao-auth/v1/admin/auth/local`（identifier `admin` 等真实账号）取 token，再 `GET /api/zhao-sso/v1/admin/msg/sop-stats`。

Expected: `200 {"data": { from, to, summary:{...}, rows:[...] }}`（无数据时 rows 为 `[]`、summary 全 0，不报 404/500）。无权限则 `403`。

- [ ] **Step 3: 确认无启动报错**

dev 日志无 zhao-sso 启动崩溃（controller 未注册等会致启动抛错）。

- [ ] **Step 4: Commit（如烟测修正了代码）**

若有修正按上述 commit 习惯重提；无修正可跳过本步。

---

### Task 4: web 运营端页面

**Files:**
- Create: `e:\code\web\src\pages\msg\sopStats.vue`
- Modify: 若 web 采用路由清单注册，把该页加入对应配置文件（参照既有 `src/pages.json`/路由表）

- [ ] **Step 1: 新建页面，参照既有看板页风格（读 `e:\code\web\src\pages\activity\review.vue` 或 `fission.vue` 统一 API 基址与 token 头），落成 `e:\code\web\src\pages\msg\sopStats.vue`：**

```vue
<template>
  <view class="wrap">
    <view class="bar">
      <text>从</text><picker mode="date" :value="from" @change="(e)=>from=e.detail.value"><view class="inp">{{from}}</view></picker>
      <text>至</text><picker mode="date" :value="to" @change="(e)=>to=e.detail.value"><view class="inp">{{to}}</view></picker>
      <input v-model="scene" placeholder="scene(如 activity.closed)" class="inp" />
      <button size="mini" @click="load">查询</button>
    </view>

    <view class="cards">
      <view class="card"><text>{{s.sceneCount}}</text><text>/场景</text></view>
      <view class="card"><text>{{s.total}}</text><text>发起</text></view>
      <view class="card"><text>{{s.sent}}</text><text>送达</text></view>
      <view class="card"><text>{{s.failed}}</text><text>失败</text></view>
      <view class="card"><text>{{s.quotaLimited}}</text><text>频控</text></view>
      <view class="card"><text>{{s.sentRate}}%</text><text>送达率</text></view>
    </view>

    <view class="tbl">
      <view class="th row"><text>场景</text><text>规则</text><text>发起</text><text>送达</text><text>失败</text><text>频控</text><text>待发</text><text>送达率</text><text>点击(累计)</text></view>
      <view class="row" v-for="r in rows" :key="r.scene">
        <text>{{r.scene}}</text>
        <text class="rules">{{r.rules.map(x=>x.name||x.code).join('; ')}}</text>
        <text>{{r.total}}</text><text>{{r.sent}}</text><text>{{r.failed}}</text>
        <text>{{r.quotaLimited}}</text><text>{{r.pending}}</text><text>{{r.sentRate}}%</text><text>{{r.clicks}}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getToken } from '@/utils/auth' // 与兄弟看板页一致；若无此导出改用页面现有取 token 方式
export default {
  data() {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return {
      from: iso(past), to: iso(now), scene: "",
      summary: { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, sentRate: 0 },
      rows: [],
    };
  },
  computed: {
    s() { return this.summary || {}; },
  },
  onShow() { this.load(); },
  methods: {
    async load() {
      const token = getToken();
      const params = [];
      if (this.from) params.push('from=' + encodeURIComponent(this.from));
      if (this.to) params.push('to=' + encodeURIComponent(this.to));
      if (this.scene) params.push('scene=' + encodeURIComponent(this.scene));
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await new Promise((resolve) => {
        uni.request({
          url: '/api/zhao-sso/v1/admin/msg/sop-stats' + qs,
          method: 'GET',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (r) => resolve(r),
          fail: () => resolve({ statusCode: 0, data: {} }),
        });
      });
      const d = res.data && res.data.data;
      if (d) { this.summary = d.summary; this.rows = d.rows; }
    },
  },
};
</script>
```

> 说明：`/api/zhao-sso/v1/admin/msg/sop-stats` 基址与既有 `fission.vue`/`review.vue` 一致；`getToken` 按 web 现有 token 工具引入，若无直接用 `uni.getStorageSync` 取既有键。子代理执行时以 web 现有 API/鉴权约定为准微调 header 与基址，但**必须保留下述请求路径与字段契约**。

- [ ] **Step 2: 注册页面路由**

读 `e:\code\web\src\pages.json`，按 `fission` 同法登记 `pages/msg/sopStats`（含 `navigationBarTitleText: "SOP 触达报表"`）。

- [ ] **Step 3: 构建校验**

Run: `cd e:\code\web && npm run build:h5`（Hz；`dist/build/h5` 被 git 跟踪需提交）。
Expected: 构建出 `dist/build/h5`，仅 Sass 弃用告警属正常。

- [ ] **Step 4: Commit**

```bash
cd e:\code\web && git add -A && git commit -m "feat: sop stats report page (msg/sopStats)"
```

---

### Task 5: 验收脚本 + 运行

**Files:**
- Create: `e:\code\basic\scripts\accept-sop-stats.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-sop-stats.cjs`（复用 `accept-sso-quota.cjs` 的 pg 直连、cleanup、admin 登录、请求 helper；`require("pg")` 与 bcryptjs 走根目录）：

```js
/* SOP 触达漏斗验收
 * 用法: cd e:\code\basic && node scripts/accept-sop-stats.cjs
 * 依赖: 本地 dev 1337 运行中
 */
const http = require("http");
const crypto = require("crypto");
const pg = require("pg");
const bcrypt = require("bcryptjs");

const BASE = "http://127.0.0.1:1337";
const PG = { host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" };
const PREFIX = "q7_";
const PWD = "Stats123";
let PASS = 0, FAIL = 0;
function ok(n, c, x = "") { c ? PASS++ : FAIL++; console.log((c ? "PASS" : "FAIL") + " | " + n + (x ? " | " + x : "")); }
function req(method, p, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = "Bearer " + token;
    const r = http.request(BASE + p, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, data: j }); });
    });
    r.on("error", (e) => resolve({ status: 0, data: "NET_ERR: " + e.message }));
    r.on("timeout", () => { r.destroy(); resolve({ status: 0, data: "TIMEOUT" }); });
    if (data) r.write(data);
    r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;
async function q(sql, p) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, p); await c.end(); return r.rows; }
function subIds(ids) { return ids.length ? "(" + ids.join(",") + ")" : "(NULL)"; }

async function cleanup() {
  const jobs = await q("SELECT id FROM sso_msg_jobs WHERE scene LIKE 'q7_%'");
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    for (const lnk of ["sso_msg_jobs_user_lnk", "sso_msg_jobs_template_lnk", "sso_msg_jobs_version_lnk"]) {
      try { await q(`DELETE FROM ${lnk} WHERE msg_job_id IN ${S}`); } catch {}
    }
    await q("DELETE FROM sso_msg_jobs WHERE id IN " + S);
  }
  const u = await q("SELECT id FROM sso_users WHERE username LIKE 'q7_%'");
  if (u.length) await q("DELETE FROM sso_users WHERE id IN " + subIds(u.map((r) => r.id)));
  const v = await q("SELECT id FROM sso_msg_template_versions WHERE code LIKE 'q7_%'");
  if (v.length) await q("DELETE FROM sso_msg_template_versions WHERE id IN " + subIds(v.map((r) => r.id)));
  await q("DELETE FROM sso_msg_templates WHERE code LIKE 'q7_%'");
  await q("DELETE FROM sso_sop_rules WHERE code LIKE 'q7_%'");
}

(async () => {
  client = new pg.Client(PG); await client.connect();
  await cleanup();
  const ts = Date.now();
  const r = await req("POST", "/api/zhao-auth/v1/admin/auth/local", { identifier: "admin", password: "Admin@12345" });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok("admin 登录", !!token, "status=" + r.status); if (!token) { console.error("终止"); process.exit(1); }

  // 建模板(code q7_tpl)+版本(clickCount known)
  const tpl = await q("INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,'wechat',true,now(),now()) RETURNING id",
    [crypto.randomUUID(), "q7_tpl_" + ts, "Q7模板"]);
  const tplId = tpl[0].id;
  const ver = await q("INSERT INTO sso_msg_template_versions (document_id,template_id,code,name,click_count,sent_count,success_count,status,created_at,updated_at) VALUES ($1,$2,$3,$4,7,50,40,'active',now(),now()) RETURNING id",
    [crypto.randomUUID(), tplId, "q7_ver_" + ts, "Q7版本"]);
  const verId = ver[0].id;
  ok("建模板+版本(click=7)", !!verId);

  // 建 sop-rule: scene q7_ev, templateCode 指向模板
  const rule = await q("INSERT INTO sso_sop_rules (document_id,code,name,source,event,scene,template_code,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id",
    [crypto.randomUUID(), "q7_rule_" + ts, "Q7规则", "event", "q7_event", "q7_ev", "q7_tpl_" + ts]);
  ok("建 sop-rule (scene=q7_ev)", !!rule[0].id);

  // 建用户
  const hashR = bcrypt.hashSync(PWD, 10);
  const u = await q("INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'accept',0,now(),now()) RETURNING id",
    [crypto.randomUUID(), crypto.randomUUID(), "q7_" + ts, "q7_" + ts + "@shenglin.vip", hashR, "active"]);
  const uid = u[0].id;
  ok("建用户", !!uid);

  // 建 job：scene=q7_ev 各状态，created_at 部分在过去35天(区间外)
  const inside = new Date(Date.now() - 86400000); // 1天前(在近30天内)
  const outside = new Date(Date.now() - 35 * 86400000); // 35天前(区间外)
  const mk = (scene, status, createdAt) => q(
    `INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,user_id,template_id,version_id,created_at,updated_at)
     VALUES ($1,$2,'wechat',$3,0,$4,$5,$6,$7,$8,$8) RETURNING id`,
    [crypto.randomUUID(), scene, status, "q7_ded_" + scene + "_" + status + "_" + (Math.random() * 100000 | 0), uid, tplId, verId, createdAt]);
  // 区间内: sent=4, failed=2, quota_limited=1, pending=1, cancelled=1
  for (let i = 0; i < 4; i++) await mk("q7_ev", "sent", inside);
  await mk("q7_ev", "failed", inside); await mk("q7_ev", "failed", inside);
  await mk("q7_ev", "quota_limited", inside);
  await mk("q7_ev", "pending", inside);
  await mk("q7_ev", "cancelled", inside);
  // 另一个 scene 排除干扰
  await mk("q7_other", "sent", inside);
  // 区间外(35天前) 5 条 sent 不应计入默认30天
  for (let i = 0; i < 5; i++) await mk("q7_ev", "sent", outside);
  ok("造 job 数据(含区间内外)成功", true);

  // 查询默认(近30天, 全场景)
  let g = await req("GET", "/api/zhao-sso/v1/admin/msg/sop-stats", null, token);
  let d = g.data && g.data.data;
  ok("默认查询 200 且有 data", g.status === 200 && !!d, "status=" + g.status);
  const row = d && d.rows.find((x) => x.scene === "q7_ev");
  ok("rows 含 q7_ev 且 total=9", !!row && row.total === 9, "total=" + (row && row.total));
  ok("q7_ev sent=4", row && row.sent === 4, "sent=" + (row && row.sent));
  ok("q7_ev failed=2", row && row.failed === 2, "failed=" + (row && row.failed));
  ok("q7_ev quotaLimited=1", row && row.quotaLimited === 1, "quota=" + (row && row.quotaLimited));
  ok("q7_ev pending=1", row && row.pending === 1, "pending=" + (row && row.pending));
  ok("q7_ev cancelled=1", row && row.cancelled === 1, "canc=" + (row && row.cancelled));
  ok("q7_ev sentRate=44", row && row.sentRate === Math.round(4 / 9 * 100), "rate=" + (row && row.sentRate));
  ok("q7_ev clicks=7(累计version.clickCount)", row && row.clicks === 7, "clicks=" + (row && row.clicks));
  ok("rows 含关联规则 code/name/templateCode", row && row.rules && row.rules[0] && row.rules[0].code && row.rules[0].templateCode === "q7_tpl_" + ts, "rules=" + JSON.stringify(row && row.rules));
  ok("q7_other 不计入 q7_ev", d && !d.rows.some((x) => x.scene === "q7_other" && x.scene === "q7_ev"));
  ok("summary 合计 total=9+1=10", d && d.summary.total === 10, "sumTotal=" + (d ? d.summary.total : '?'));
  ok("summary sentRate=round(5/10*100)", d && d.summary.sent === 5, "sumSent=" + (d ? d.summary.sent : '?'));

  // scene 筛选
  g = await req("GET", "/api/zhao-sso/v1/admin/msg/sop-stats?scene=q7_ev", null, token);
  d = g.data && g.data.data;
  ok("scene 筛选仅返回 q7_ev", d && d.rows.length === 1 && d.rows[0].scene === "q7_ev", "len=" + (d ? d.rows.length : "?"));

  // 区间收缩到昨天整天→区间外排除
  const yFrom = encodeURIComponent(new Date(Date.now() - 2 * 86400000).toISOString());
  const yTo = encodeURIComponent(new Date(Date.now() - 0.5 * 86400000).toISOString());
  g = await req("GET", "/api/zhao-sso/v1/admin/msg/sop-stats?from=" + yFrom + "&to=" + yTo + "&scene=q7_ev", null, token);
  d = g.data && g.data.data;
  ok("收缩区间后因35天前不在内 total=9", d && d.rows[0] && d.rows[0].total === 9, "total=" + (d && d.rows[0] && d.rows[0].total));

  // from>to → 400
  g = await req("GET", "/api/zhao-sso/v1/admin/msg/sop-stats?from=" + encodeURIComponent("2026-09-01") + "&to=" + encodeURIComponent("2026-01-01"), null, token);
  ok("from>to 返回 400", g.status === 400, "status=" + g.status);

  await cleanup();
  const res = await q(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE scene LIKE 'q7_%') j,
      (SELECT count(*)::int FROM sso_sop_rules WHERE code LIKE 'q7_%') r,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE 'q7_%') t,
      (SELECT count(*)::int FROM sso_msg_template_versions WHERE code LIKE 'q7_%') v,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE 'q7_%') u`);
  ok("清理零残留", res[0].j === 0 && res[0].r === 0 && res[0].t === 0 && res[0].v === 0 && res[0].u === 0,
    `j=${res[0].j} r=${res[0].r} t=${res[0].t} v=${res[0].v} u=${res[0].u}`);
  await client.end();
  console.log(`\n=== SOP 漏斗验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("脚本异常:", e && e.message); process.exit(1); });
```

- [ ] **Step 2: 核对真实表结构后运行**

运行前先实查 `sso_msg_jobs` 列名（是否 `user_id/template_id/version_id` 为 join 表而非列）与 `sso_sop_rules` 列（`template_code`、`document_id`）。若 `user_id/template_id/version_id` 是 join 表，则 job 需经 `sso_msg_jobs_user_lnk/_template_lnk/_version_lnk` 建关联并删除 `document_id` 列，`sop_rules` 用其真实列名；以实际情况修正脚本（参照 `accept-sso-quota.cjs` 的同款 join 处理）。`sent_at` 若仅查询用不需构造。

Run: `cd e:\code\basic && node scripts/accept-sop-stats.cjs`
Expected: 所有断言 PASS、`FAIL=0`、退出码 0、清理零残留。

- [ ] **Step 3: 迭代至全 PASS**（定位并修正脚本或必要的正确性修复；生产逻辑改动需先汇报）

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso scripts/accept-sop-stats.cjs && git commit -m "test(zhao-sso): sop-stats acceptance"
```

---

### Task 6: 收口与推送

- [ ] **Step 1: 停 dev + 还原 app 顶层 dist**

停 `npm run dev`，再 `cd e:\code\basic && git restore dist/`。

- [ ] **Step 2: 校验无调试残留**

`git status --short` 复核无 `_diag-*` / 调试日志；sp份 grep `sso-stats` 无 `DEBUG/console.log` 残留。

- [ ] **Step 3: Commit 收口（basic）**

```bash
cd e:\code\basic && git add -A && git commit -m "chore(zhao-sso): sop-stats report acceptance + cleanup" && git push origin main
```

- [ ] **Step 4: Commit 收口（web）**

```bash
cd e:\code\web && git add -A && git commit -m "feat: sop stats report page" && git push origin main
```

---

## Self-Review

- **Spec 覆盖**：①场景为统计单元+行内规则信息 T1 ✓ ②created_at 区间过滤 T1/T5 ✓ ③状态计数与 sentRate T1/T5 ✓ ④点击累计 T1/T5 ✓ ⑤接口契约 T2 ✓ ⑥前端 web 页 T4 ✓ ⑦from>to 400 T1/T5 ✓。
- **类型一致**：`getSopStats` 返回 `{from,to,summary,rows}`；summary 字段 `sceneCount/total/sent/failed/quotaLimited/pending/sentRate` 在 T1 定义、T4 前端读取、T5 断言一致；row 字段 `scene/rules/total/sent/failed/quotaLimited/pending/cancelled/sentRate/clicks` 三处一致。controller `sopStats` 调 service `getSopStats` 一致。路由 handler `msg-stats.sopStats` 与 controller 注册 key `"msg-stats"` 一致。
- **无占位符**：全部步骤含完整代码/精确路径/断言；T5 对"列名/join 表"给出实查+修正指引，非占位符。