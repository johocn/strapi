# SOP 复购触达 + 转化归因 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通活动 SOP 触达消息模板（回执/复购/挽回等真实可发），并新增复购转化归因报表（触达后固定窗口返回转销，纯查询不落库）。

**Architecture:** 在 zhao-sso bootstrap 幂等 seed 5 个 `msg-template` + 各自 `active` 版本（link 指向既有 C 端落地页）；新增 `sso-stats.getRepurchaseStats`（纯查询：送达复购 job → 桥接 upUser → 窗口内再报名判定转化）+ admin 路由 `GET /msg/repurchase-stats`；web 运营端新增 `repurchase.vue` 报表页。转化窗口 7 天存于 `sop-rule.conversionWindowDays`（scene=activity.repurchase）。

**Tech Stack:** Strapi 5 插件（zhao-sso / zhao-point）、PostgreSQL、`strapi.db.query`、web(uniapp/HBuilder) 运营端。

---

### 验收运行前提
- 后端：`cd e:\code\basic && npm run dev`（1337）。插件改动后 `cd e:\code\basic\plugins\zhao-sso && npm run build` 并重启 dev（bootstrap 只在冷启动跑，`pm2`/重启才 seed）。
- 前端：`cd e:\code\web`（HBuilder uniapp 运营端）。
- 两仓库改动，分别推送：后端 basic、前端 web。

---

### Task 1: 打通活动 SOP 触达消息模板 seed

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\bootstrap.ts`

目标：让 `closeActivity` 建的 `act_receipt` / `act_repurchase` / `act_noshow_revisit` 及报名链路的 `act_confirm` / `act_before` 模板存在（带 active 版本），触达真实可发。且 bootstrap 不再因 `SSO_DEFAULT_APP_SECRET` 未配置而提前 return——模板/规则 seed 必须独立于密钥执行。

- [ ] **Step 1: 把模板 seed 插到 bootstrap 顶部（密钥 return 之前）**

在 `e:\code\basic\plugins\zhao-sso\server\src\bootstrap.ts` 中，当前 `strapi.log.info` 之后、`const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;` 之前，插入模板+版本 seed：

```ts
  // Seed 活动 SOP 消息模板 + active 版本（幂等按 code；link 指向既有 C 端落地页，payload 可覆盖）
  const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
  const VERSION_UID = "plugin::zhao-sso.msg-template-version";
  // msg-template schema 无 link 列；落地页链接由 sop-rule.link 或触发 payload 提供，模板只存 code/name/desc
  const DEFAULT_SOP_TEMPLATES = [
    { code: "act_confirm", name: "活动报名成功确认", desc: "报名成功立即发送" },
    { code: "act_before", name: "活动开始前提醒", desc: "活动开始前 24h 提醒" },
    { code: "act_receipt", name: "活动结束回执（感谢+评价邀请）", desc: "活动结束到场用户回执" },
    { code: "act_repurchase", name: "复购/转介邀请", desc: "活动结束到场用户次日复购/转介触达" },
    { code: "act_noshow_revisit", name: "未到场挽回", desc: "活动结束未到场用户次日挽回" },
  ];
  for (const t of DEFAULT_SOP_TEMPLATES) {
    let tpl = await strapi.db.query(TEMPLATE_UID).findOne({ where: { code: t.code } });
    if (!tpl) {
      tpl = await strapi.db.query(TEMPLATE_UID).create({
        data: { code: t.code, name: t.name, provider: "wechat", content: "（shenglin SOP 模板）", isEnabled: true, description: t.desc },
      });
      strapi.log.info(`[zhao-sso] SOP template seeded: ${t.code}`);
    }
    const existingVer = await strapi.db.query(VERSION_UID).findOne({ where: { code: `${t.code}_v1` } });
    if (!existingVer) {
      await strapi.db.query(VERSION_UID).create({
        data: { template: tpl.id, code: `${t.code}_v1`, name: `${t.name} v1`, status: "active", weight: 1, clickCount: 0, sentCount: 0, successCount: 0 },
      });
      strapi.log.info(`[zhao-sso] SOP template version seeded: ${t.code}_v1`);
    }
  }
```

> 说明：已核对 [msg-template/schema.json](file:///e:/code/basic/plugins/zhao-sso/server/src/content-types/msg-template/schema.json) **无 `link` 属性**，落地页链接由 `sop-rule.link` 或触发 payload 提供。模板 data 仅用 schema 存在的属性（code/name/provider/content/isEnabled/description）。

- [ ] **Step 2: 确认模板创建用 schema 存在属性**

`msg-template` schema 存在的属性为 `code/name/provider/wxTemplateId/wxTemplateFields/content/isEnabled/description/dailyCap/cooldownMinutes`。上面 Step 1 代码已用 code/name/provider/content/isEnabled/description，无误。

- [ ] **Step 3: sop-rule schema 增加 conversionWindowDays 字段**

在 `e:\code\basic\plugins\zhao-sso\server\src\content-types\sop-rule\schema.json` 的 attributes 内追加（供转化报表配置窗口，默认 7 天，可空）：

```json
    "conversionWindowDays": { "type": "integer" },
```

- [ ] **Step 4: 确认 SOP 规则 seed 的 templateCode 与模板 code 对应**

bootstrap 现有 `DEFAULT_SOP_RULES` 中 `act_confirm`/`act_before`/`act_noshow_revisit` 的 `templateCode` 与 Step1 模板 code 一致（`act_confirm`/`act_before`/`act_noshow_revisit`）；`act_receipt`/`act_repurchase` 由 `closeActivity` 以 schedules 直接建 job，不依赖规则表。核对无冲突即可。

- [ ] **Step 5: 构建**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功，无类型错误。

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): seed activity SOP msg templates + active versions"
```

---

### Task 2: 复购转化归因 service

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`

在既有 `getSopStats` 内新增 `getRepurchaseStats(opts: { from?: string; to?: string });`。纯查询，不落库。

- [ ] **Step 1: 读现有 sso-stats.ts 确认常量与结构**

读 `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`（当前含 getSopStats）。在 `objects` 中追加 `getRepurchaseStats` 方法（与 getSopStats 同层级）。

- [ ] **Step 2: 追加 getRepurchaseStats 方法**

在该 service 返回对象内、`getSopStats` 之后追加：

```ts
  /** 复购转化归因：送达的 activity.repurchase 触达 → 固定窗口内该用户再报名即记转化（纯查询不落库） */
  async getRepurchaseStats(opts: { from?: string; to?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    // 区间内送达的复购触达 job
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "activity.repurchase", status: "sent", sentAt: { $gte: from, $lte: to } },
      select: ["id", "sentAt", "user"],
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const userSeen = new Set<number>();
    const userSelSent = new Map<number, number>(); // upUserId -> 最接近最后次报名的触达 sentAt
    let conversions = 0;

    for (const j of jobs) {
      const up = await ssoSvc.resolveUpUserForSsoUser(j.user);
      if (!up) continue; // 桥接不到，跳过
      const userId = up.id;
      userSeen.add(userId);
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(SIGNS_UID).count({
        where: { user: userId, status: "active", signupAt: { $gt: from2, $lte: to2 } },
      });
      if (cnt > 0) {
        conversions += cnt;
        if (!userSelSent.has(userId) || from2.getTime() < userSelSent.get(userId)!) {
          userSelSent.set(userId, from2.getTime());
        }
      }
    }
    const sent = jobs.length;
    const convertedUsers = userSelSent.size;
    const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },
```

> 说明：`MSG_JOB_UID`/`SOP_RULE_UID`/`DATE_MS` 已在 sso-stats.ts 顶部定义，直接复用；需新增 `const SIGNS_UID = "plugin::zhao-point.activity-signup";`（放在文件顶部常量区）。`sentAt` 为 datetime 列。

- [ ] **Step 3: 顶部常量区新增 SIGNS_UID**

在该文件顶部常量区（`MSG_VERSION_UID` 之后）追加：

```ts
const SIGNS_UID = "plugin::zhao-point.activity-signup";
```

- [ ] **Step 4: 构建**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功。

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): repurchase conversion attribution service"
```

---

### Task 3: 复购转化报表 controller + admin 路由

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts`
- Verify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`

- [ ] **Step 1: controller 增加 repurchaseStats 方法**

在 `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts` 的 `sopStats` 方法后追加：

```ts
export default ({ strapi }: any) => ({
  async sopStats(ctx: any) { /* 既有实现原样保留 */ },
  async repurchaseStats(ctx: any) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseStats({ from, to });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 确认 controller 已注册**

`msg-stats` 已在 `controllers/index.ts` 注册（Key `"msg-stats"`）。读取 `controllers/index.ts` 确认无遗漏；若有遗漏则补 import + 注册。

- [ ] **Step 3: admin 路由追加**

在 `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts` 的 `routes[]` 内、`/msg/sop-stats` 之后追加：

```ts
    adminRoute("GET", "/msg/repurchase-stats", "msg-stats.repurchaseStats", "sso.msg.read"),
```

- [ ] **Step 4: 构建**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功。

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): expose GET /admin/msg/repurchase-stats (controller + route)"
```

---

### Task 4: dev 启动 + 模板 seed 烟测

- [ ] **Step 1: 重造插件并重启 dev**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build && cd e:\code\basic && npm run dev`（1337）。注意 bootstrap 只在冷启动跑 seed；若 dev 已在跑需先 stop 再启。

- [ ] **Step 2: 确认 5 个模板 + active 版本已 seed**

admin 登录 `POST /api/zhao-auth/v1/admin/auth/local`（identifier=admin, password=Admin@12345）取 token，再 `GET /api/zhao-sso/v1/admin/msg-templates`。

Expected: 返回列表含 `act_confirm/act_before/act_receipt/act_repurchase/act_noshow_revisit` 5 个模板，且每个有 `{code}_v1` 的 active 版本（经 `GET /msg-templates/:id/versions` 确认）。

- [ ] **Step 3: 冒烟调用复购报表接口**

`GET /api/zhao-sso/v1/admin/msg/repurchase-stats`。

Expected: `200 {"data":{from,to,windowDays,summary:{sent:0,convertedUsers:0,conversions:0,conversionRate:0}}}`，不报 404/500。无权限则 403。

- [ ] **Step 4: 确认无启动报错**

dev 日志无 zhao-sso 启动崩溃。

- [ ] **Step 5: Commit（如烟测修正代码）**

有修正按 Task1/2/3 命名重提；无修正跳过。

---

### Task 5: web 运营端复购转化报表页

**Files:**
- Create: `e:\code\web\src\pages\msg\repurchase.vue`
- Modify: `e:\code\web\src\pages.json`

- [ ] **Step 1: 参照 sopStats.vue 新建 repurchase.vue**

读 `e:\code\web\src\pages\msg\sopStats.vue` 复用其 API 基址、token 头、日期 picker 与卡片/表格样式。落成 `e:\code\web\src\pages\msg\repurchase.vue`：日期范围筛选 + 汇总卡片（送达 / 转化用户 / 转化条数 / 转化率）+ 说明“默认 7 天转化窗口”。

```vue
<template>
  <view class="wrap">
    <view class="bar">
      <text>从</text><picker mode="date" :value="from" @change="(e)=>from=e.detail.value"><view class="inp">{{from}}</view></picker>
      <text>至</text><picker mode="date" :value="to" @change="(e)=>to=e.detail.value"><view class="inp">{{to}}</view></picker>
      <button size="mini" @click="load">查询</button>
    </view>
    <view class="tip">复购转化：送达的复购触达后 <text>{{s.windowDays || 7}}</text> 天内用户再次报名计为转化</view>

    <view class="cards">
      <view class="card"><text>{{s.sent}}</text><text>送达</text></view>
      <view class="card"><text>{{s.convertedUsers}}</text><text>转化用户</text></view>
      <view class="card"><text>{{s.conversions}}</text><text>转化条数</text></view>
      <view class="card"><text>{{s.conversionRate}}%</text><text>转化率</text></view>
    </view>
  </view>
</template>

<script>
import { getToken } from '@/utils/auth'
export default {
  data() {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return { from: iso(past), to: iso(now), summary: { sent: 0, convertedUsers: 0, conversions: 0, conversionRate: 0, windowDays: 7 } };
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
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await new Promise((resolve) => {
        uni.request({
          url: '/api/zhao-sso/v1/admin/msg/repurchase-stats' + qs,
          method: 'GET',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (r) => resolve(r),
          fail: () => resolve({ statusCode: 0, data: {} }),
        });
      });
      const d = res.data && res.data.data;
      if (d) this.summary = d.summary;
    },
  },
};
</script>
```

> 需按 web 实际 token 工具微调（`getToken` 若不存在改用现有存储键），但**必须保留请求路径 `/api/zhao-sso/v1/admin/msg/repurchase-stats` 与字段契约**。补简约 SCSS（.wrap/.bar/.inp/.tip/.cards/.card）参照 sopStats.vue。

- [ ] **Step 2: 注册页面路由**

读 `e:\code\web\src\pages.json`，按 `sopStats` 同法登记 `pages/msg/repurchase`（`navigationBarTitleText: "复购转化报表"`）。

- [ ] **Step 3: 构建校验**

Run: `cd e:\code\web && npm run build:h5`
Expected: 生成 `dist/build/h5`，仅 Sass 弃用告警属正常。

- [ ] **Step 4: Commit**

```bash
cd e:\code\web && git add -A && git commit -m "feat: repurchase conversion report page (msg/repurchase)"
```

---

### Task 6: 验收脚本 + 运行

**Files:**
- Create: `e:\code\basic\scripts\accept-repurchase.cjs`

复用既有 `accept-sop-stats.cjs` 的 pg 直连、join 表处理、cleanup、admin 登录、请求 helper 风格。

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-repurchase.cjs`：

```js
/* SOP 复购转化归因验收
 * 用法: cd e:\code\basic && node scripts/accept-repurchase.cjs
 * 依赖: 本地 dev 1337 运行中
 */
const http = require("http");
const crypto = require("crypto");
const pg = require("pg");
const path = require("path");
const bcrypt = require(path.join(__dirname, "..", "node_modules", "bcryptjs"));

const BASE = "http://127.0.0.1:1337";
const PG = { host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" };
const PREFIX = "qr_";
const PWD = "Repur123";
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
async function q(sql, p) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, p); await c.end(); return r.rows; }
function subIds(ids) { return ids.length ? "(" + ids.join(",") + ")" : "(NULL)"; }

async function cleanup() {
  const jobs = await q("SELECT id FROM sso_msg_jobs WHERE scene = 'activity.repurchase' AND dedupe_key LIKE $1", [PREFIX + "%"]);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    for (const lnk of ["sso_msg_jobs_user_lnk", "sso_msg_jobs_template_lnk", "sso_msg_jobs_version_lnk"]) {
      try { await q(`DELETE FROM ${lnk} WHERE msg_job_id IN ${S}`); } catch {}
    }
    await q("DELETE FROM sso_msg_jobs WHERE id IN " + S);
  }
  const us = await q("SELECT id FROM sso_users WHERE username LIKE 'qr_%'");
  if (us.length) await q("DELETE FROM sso_users WHERE id IN " + subIds(us.map((r) => r.id)));
  const up = await q("SELECT id FROM up_activities WHERE title LIKE 'qr_%'");
  if (up.length) await q("DELETE FROM up_activities WHERE id IN " + subIds(up.map((r) => r.id)));
  await q("DELETE FROM activity_signups WHERE dedupe_key LIKE 'qr_%'");
  await q("DELETE FROM sso_msg_templates WHERE code LIKE 'qr_%'");
}

(async () => {
  await cleanup();
  const ts = Date.now();
  const r = await req("POST", "/api/zhao-auth/v1/admin/auth/local", { identifier: "admin", password: "Admin@12345" });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok("admin 登录", !!token, "status=" + r.status); if (!token) { console.error("终止"); process.exit(1); }

  // 模板 + 版本（scene=repurchase 触达用的 act_repurchase）
  const tpl = await q("INSERT INTO sso_msg_templates (document_id, code, name, provider, is_enabled, created_at, updated_at) VALUES ($1,$2,$3,'wechat',true,now(),now()) RETURNING id",
    [crypto.randomUUID(), PREFIX + "tpl_" + ts, "QR模板"]);
  const tplId = tpl[0].id;
  const ver = await q("INSERT INTO sso_msg_template_versions (document_id, template_id, code, name, status, weight, created_at, updated_at) VALUES ($1,$2,$3,$4,'active',1,now(),now()) RETURNING id",
    [crypto.randomUUID(), tplId, PREFIX + "ver_" + ts, "QR版本"]);
  const verId = ver[0].id;
  ok("建模板+active版本", !!verId);

  // 用户 A: 有复购触达且窗口内再报名 → 转化
  const hashA = bcrypt.hashSync(PWD, 10);
  const ua = await q("INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'accept',0,now(),now()) RETURNING id",
    [crypto.randomUUID(), crypto.randomUUID(), PREFIX + "a_" + ts, PREFIX + "a_" + ts + "@shenglin.vip", hashA, "active"]);
  const uidA = ua[0].id;
  const upA = await q("INSERT INTO up_users (document_id,username,email,password,created_at,updated_at) VALUES ($1,$2,$3,NULL,now(),now()) RETURNING id",
    [crypto.randomUUID(), PREFIX + "a_" + ts, PREFIX + "a_" + ts + "@shenglin.vip"]);
  const upAId = upA[0].id;
  ok("建用户 A(带 up_users 桥接)", !!uidA && !!upAId);

  // 复购触达 job：sent 于 1 天前
  const sentJob = await q("INSERT INTO sso_msg_jobs (document_id, scene, provider, status, retry_count, dedupe_key, sent_at, created_at, updated_at) VALUES ($1,'activity.repurchase','wechat','sent',0,$2, now() - interval '1 day', now(), now()) RETURNING id",
    [crypto.randomUUID(), PREFIX + "jobA_" + ts]);
  await q("INSERT INTO sso_msg_jobs_user_lnk (msg_job_id, sso_user_id) VALUES ($1,$2)", [sentJob[0].id, uidA]);
  await q("INSERT INTO sso_msg_jobs_template_lnk (msg_job_id, msg_template_id) VALUES ($1,$2)", [sentJob[0].id, tplId]);
  await q("INSERT INTO sso_msg_jobs_version_lnk (msg_job_id, msg_template_version_id) VALUES ($1,$2)", [sentJob[0].id, verId]);

  // 活动 + 窗口内报名（active, 今天）
  const act = await q("INSERT INTO up_activities (document_id,title,status,created_at,updated_at) VALUES ($1,$2,'signup_open',now(),now()) RETURNING id",
    [crypto.randomUUID(), PREFIX + "act_" + ts]);
  await q("INSERT INTO activity_signups (document_id, user, activity, status, signup_at, dedupe_key, created_at, updated_at) VALUES ($1,$2,$3,'active',now(),$4,now(),now())",
    [crypto.randomUUID(), upAId, act[0].id, PREFIX + "signup_" + ts]);
  ok("造复购触达+窗口内再报名数据", true);

  // 查询
  let g = await req("GET", "/api/zhao-sso/v1/admin/msg/repurchase-stats", null, token);
  let d = g.data && g.data.data;
  ok("默认查询 200 且有 data", g.status === 200 && !!d, "status=" + g.status);
  ok("windowDays=7(默认)", d && d.windowDays === 7, "window=" + (d && d.windowDays));
  ok("summary.sent=1", d && d.summary.sent === 1, "sent=" + (d && d.summary.sent));
  ok("summary.convertedUsers=1", d && d.summary.convertedUsers === 1, "cu=" + (d && d.summary.convertedUsers));
  ok("summary.conversions=1", d && d.summary.conversions === 1, "conv=" + (d && d.summary.conversions));
  ok("summary.conversionRate=100", d && d.summary.conversionRate === 100, "rate=" + (d && d.summary.conversionRate));

  // from>to → 400
  g = await req("GET", "/api/zhao-sso/v1/admin/msg/repurchase-stats?from=" + encodeURIComponent("2026-09-01") + "&to=" + encodeURIComponent("2026-01-01"), null, token);
  ok("from>to 返回 400", g.status === 400, "status=" + g.status);

  await cleanup();
  const res = await q(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE scene='activity.repurchase' AND dedupe_key LIKE 'qr_%') j,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE 'qr_%') t,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE 'qr_%') u,
      (SELECT count(*)::int FROM activity_signups WHERE dedupe_key LIKE 'qr_%') s`);
  ok("清理零残留", res[0].j === 0 && res[0].t === 0 && res[0].u === 0 && res[0].s === 0,
    `j=${res[0].j} t=${res[0].t} u=${res[0].u} s=${res[0].s}`);
  console.log(`\n=== 复购转化验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("脚本异常:", e && e.message); process.exit(1); });
```

- [ ] **Step 2: 核对真实表结构后运行**

运行前先实查 `activity_signups` 表名与列（是否 `user`/`activity`/`signup_at`/`dedupe_key` 存在，`activity_signups` 是否对上 Strapi collectionName；若 collectionName 不同以实际为准）。`up_users` 是 Strapi users-permissions 表名。`condition: sso_msg_jobs` 的 `dedupe_key` 为真实列（非 join）。以真实 schema 修正后运行：

Run: `cd e:\code\basic && node scripts/accept-repurchase.cjs`
Expected: 所有断言 PASS、FAIL=0、退出码 0、清理零残留。

- [ ] **Step 3: 迭代至全 PASS**（定位并修正脚本或必要的正确性修复；生产逻辑改动需先汇报）

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso scripts/accept-repurchase.cjs && git commit -m "test(zhao-sso): repurchase conversion acceptance"
```

---

### Task 7: 收口与推送

- [ ] **Step 1: 停 dev + 还原 app 顶层 dist**

停 `npm run dev`，再 `cd e:\code\basic && git restore dist/`。

- [ ] **Step 2: 校验无调试残留**

`git status --short` 复核无 `_diag-*`/调试日志；grep `sso-stats.ts`/`bootstrap.ts` 无 `DEBUG/console.log` 残留。

- [ ] **Step 3: Commit 收口（basic）**

```bash
cd e:\code\basic && git add -A && git commit -m "chore(zhao-sso): repurchase conversion report cleanup" && git push origin main
```

- [ ] **Step 4: Commit 收口（web）**

```bash
cd e:\code\web && git add -A && git commit -m "feat: repurchase conversion report page" && git push origin main
```

---

## Self-Review

- **Spec 覆盖**：①模板 seed 打通链路 T1 ✓ ②转化归因判定（纯查询+窗口）T2 ✓ ③windowDays 存 rule T2 ✓ ④接口契约 T3/T5 一致 ✓ ⑤前端 repurchase 页 T5 ✓ ⑥from>to 400 T2/T6 ✓ ⑦多触达去重 T2（convertUsers 用 Set）✓
- **类型一致**：`resolveUpUserForSsoUser`（sso-profile）返 upUser，T2 用其 `.id`；`getRepurchaseStats` 返回 `{from,to,windowDays,summary:{sent,convertedUsers,conversions,conversionRate}}` 在 T2 定义、T4 冒烟、T5 前端读取字段名一致。controller `repurchaseStats` 调 service `getRepurchaseStats`；路由 handler `msg-stats.repurchaseStats` 与 controller key `"msg-stats"` 一致。SOP_RULE_UID/MSG_JOB_UID/DATE_MS 已在 sso-stats 复用；SIGNS_UID 新增定义。`sent_at` ↔ `sentAt`（DB 列↔Strapi 属性）一致。
- **无占位符**：全部步骤含完整代码/精确路径/断言；T6 Step2 给"列名可能随真实 schema 需修正"的实查指引，非占位符。