# SSO 触达频控（Msg Quota）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-sso 消息中心引入用户维度触达频控——每日总条数上限 + 每场景冷却间隔，在实际发送前拦截并置终态 `quota_limited`。

**Architecture:** 在 zhao-sso 插件新增独立 `sso-quota` service 封装判定（取值优先级：msg-template 显式覆盖 > sso-quota-config 全局默认），在 `sso-msg.sendJob` 实际发送前调用；超限将 `sso_msg_jobs.status` 置新终态 `quota_limited` 并记 `result.reason`，不调通道、不累加版本计数、cron 不再捞起。新增轻量 content-type `sso-quota-config` 存全局默认，`msg-template` 增可选 `dailyCap`/`cooldownMinutes` 覆盖。

**Tech Stack:** Strapi 5 插件（zhao-sso）、PostgreSQL、`strapi.db.query`、现有 sso-msg/sso-sop 链路。

---

### 验收运行前提
- 本地启动 dev：`cd e:\code\basic && npm run dev`（port 1337）。
- 插件 TS/JSON 改动后需重建产物：`cd e:\code\basic\plugins\zhao-sso && npm run build`，再重启 dev（config/schema 变更必须 `pm2 delete`+`pm2 start` 逻辑同款，本机 dev 同理重启）。
- 仅 `e:\code\basic`（后端）仓库改动，web/shao 无改动。

---

### Task 1: 数据模型（sso-quota-config + msg-template 覆盖字段 + msg-job status）

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-quota-config\schema.json`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-quota-config\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-template\schema.json`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-job\schema.json`

- [ ] **Step 1: 新增 sso-quota-config content-type**

创建目录 `e:\code\basic\plugins\zhao-sso\server\src\content-types\sso-quota-config\`，写 `schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "sso_quota_configs",
  "info": {
    "singularName": "sso-quota-config",
    "pluralName": "sso-quota-configs",
    "displayName": "SSO Quota Config"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "maxDailyPerUser": { "type": "integer", "default": 10 },
    "cooldownMinutes": { "type": "integer", "default": 120 }
  }
}
```

写 `index.ts`（参照 `sop-rule/index.ts`）：

```ts
import schema from "./schema.json";

export default {
  schema,
};
```

- [ ] **Step 2: 注册 content-type**

在 `e:\code\basic\plugins\zhao-sso\server\src\content-types\index.ts` 顶部 import 区追加：

```ts
import ssoQuotaConfig from "./sso-quota-config";
```

在该文件 `export default { ... }` 末尾（`"sso-follow-up": ssoFollowUp,` 后）追加：

```ts
  "sso-quota-config": ssoQuotaConfig,
```

- [ ] **Step 3: msg-template 加覆盖字段**

在 `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-template\schema.json` 的 `attributes` 末尾（`description` 后）追加：

```json
    "dailyCap": { "type": "integer" },
    "cooldownMinutes": { "type": "integer" }
```

- [ ] **Step 4: msg-job status 增 quota_limited**

在 `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-job\schema.json` 中把 `"status"` 的枚举加一项：

```json
    "status": { "type": "enumeration", "enum": ["pending", "sending", "sent", "failed", "cancelled", "quota_limited"], "default": "pending", "required": true },
```

- [ ] **Step 5: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: esbuild 完成，`dist/server/index.js` 更新，无类型错误。

- [ ] **Step 6: 重启 dev 确认 schema 加载**

重启 `npm run dev`，确认插件启动不崩溃，`sso_quota_configs` 表已生成。

- [ ] **Step 7: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): quota config content-type + template override fields + quota_limited status"
```

---

### Task 2: sso-quota 频控 service

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-quota.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 新增 sso-quota service**

创建 `e:\code\basic\plugins\zhao-sso\server\src\services\sso-quota.ts`：

```ts
import type { Core } from "@strapi/strapi";

const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const QUOTA_CONFIG_UID = "plugin::zhao-sso.sso-quota-config";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * 解析生效配置：模板显式覆盖 > 全局默认(sso_quota_configs 首行)
   * @returns { dailyCap, cooldownMinutes }
   */
  async function resolveConfig(templateId: number | null) {
    const cfg = (await strapi.db.query(QUOTA_CONFIG_UID).findOne({})) || {};
    const defDaily = typeof cfg.maxDailyPerUser === "number" ? cfg.maxDailyPerUser : 10;
    const defCool = typeof cfg.cooldownMinutes === "number" ? cfg.cooldownMinutes : 120;
    let dailyCap = defDaily;
    let cooldownMinutes = defCool;
    if (templateId) {
      const t = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { id: templateId } });
      if (t && typeof t.dailyCap === "number") dailyCap = t.dailyCap;
      if (t && typeof t.cooldownMinutes === "number") cooldownMinutes = t.cooldownMinutes;
    }
    return { dailyCap, cooldownMinutes, source: templateId ? "template" : "global" };
  }

  return {
    /**
     * 频控判定（发送前调用）
     * @param opts { userId, scene, templateId }
     * @returns { allowed: boolean, reason?: 'daily_cap'|'cooldown', detail? }
     */
    async evaluate(opts: { userId: number; scene: string; templateId?: number | null }) {
      const { userId, scene, templateId } = opts;
      if (!userId) return { allowed: true };

      const cfg = await resolveConfig(templateId || null);

      // 每日总条数上限：当日 status='sent' 且 sentAt >= 今日0点
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const sentCount = await strapi.db.query(MSG_JOB_UID).count({
        where: { user: userId, status: "sent", sentAt: { $gte: dayStart } },
      });
      if (sentCount >= cfg.dailyCap) {
        return { allowed: false, reason: "daily_cap", detail: { sentCount, dailyCap: cfg.dailyCap, source: cfg.source } };
      }

      // 场景冷却：同用户同 scene 最近一条 sent 距今 < cooldownMinutes
      const last = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { user: userId, scene, status: "sent" },
        orderBy: { sentAt: "DESC" },
      });
      if (last && last.sentAt) {
        const gapMin = (Date.now() - new Date(last.sentAt).getTime()) / 60000;
        if (gapMin < cfg.cooldownMinutes) {
          return { allowed: false, reason: "cooldown", detail: { gapMin: Math.round(gapMin), cooldownMinutes: cfg.cooldownMinutes, lastSentAt: last.sentAt, source: cfg.source } };
        }
      }

      return { allowed: true };
    },
  };
};
```

> 说明：`strapi.db.query(...).count` 支持 `{ where: {...} }` 返回数字；`sendJob` 传入的 `job.user` 为数字 id，`where: { user: <number> }` 对 manyToOne 关系有效（sso-msg.ts 既有 `buildJob` 即如此用法）。

- [ ] **Step 2: 注册 service**

在 `e:\code\basic\plugins\zhao-sso\server\src\services\index.ts` 顶部 import 区追加：

```ts
import ssoQuota from "./sso-quota";
```

在该文件 `export default { ... }` 末尾（`"sso-recommend": ssoRecommend,` 后）追加：

```ts
  "sso-quota": ssoQuota,
```

- [ ] **Step 3: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功。

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): sso-quota evaluate service"
```

---

### Task 3: sendJob 接入频控

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-msg.ts:169-236`（`sendJob` 方法体内，模板检查之后、置 `sending` 之前插入）

- [ ] **Step 1: 在 sendJob 发送前插入判定**

在 `e:\code\basic\plugins\zhao-sso\server\src\services\sso-msg.ts` 的 `async sendJob(jobId: number)` 中，把：

```ts
      if (job.status === "failed" && job.retryCount >= MAX_RETRY) return job;

      await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { status: "sending" } });
```

改为：

```ts
      if (job.status === "failed" && job.retryCount >= MAX_RETRY) return job;

      // 触达频控：按用户每日上限 + 场景冷却在发送前拦截，超限置终态 quota_limited
      const quota = await strapi
        .plugin("zhao-sso")
        .service("sso-quota")
        .evaluate({ userId: job.user, scene: job.scene, templateId: job.template?.id });
      if (!quota.allowed) {
        strapi.log.warn(`[zhao-sso:msg] sent blocked by quota (user=${job.user}, scene=${job.scene}): ${quota.reason}`);
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "quota_limited", result: { reason: quota.reason, scene: job.scene, detail: quota.detail || null } },
        });
        return this.getJob(job.id);
      }

      await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { status: "sending" } });
```

> 说明：`job.template` 在 sendJob 通过 `populate: { template: true, version: true }` 已加载，故模板级覆盖字段可用。被拦即 return，不进入 `channel.send`，代码后续的成功计数（`sentCount/successCount`）不会累加。

- [ ] **Step 2: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-sso && npm run build`
Expected: BUILD 成功。

- [ ] **Step 3: 重启 dev 确认不报错**

重启 `npm run dev`，观察日志无 zhao-sso 启动崩溃。

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso && git commit -m "feat(zhao-sso): enforce sso-quota in sendJob before channel send"
```

---

### Task 4: 验收脚本 + 运行

**Files:**
- Create: `e:\code\basic\scripts\accept-sso-quota.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-sso-quota.cjs`（参照 `accept-ab-test.cjs` 的 DB 直连、清理零残留模式）：

```js
/* SSO 触达频控验收
 * 用法: cd e:\code\basic && node scripts/accept-sso-quota.cjs
 * 覆盖:
 *  a) 全局默认: 默认 maxDailyPerUser=10 达上限后下一条被拦(daily_cap)
 *  b) 场景冷却: 同 scene 两次发送间隔<cooldownMinutes 第二条被拦(cooldown)；换 scene 不受限
 *  c) 模板覆盖: 为模板设 dailyCap=1 后按模板值生效(第2条即拦)
 *  d) 版本计数: 被拦 job 不累加模板版本 sentCount
 *  e) cron 捞取: quota_limited 不在 listPending 待发(pending)范围内
 *  f) 清理零残留
 * 运行前置: 本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译插件。
 * 说明: 引用真实发送链路 sendJob；无微信配置时 channel.send 抛错→status 回 pending(可重试)，
 *       故"每日计数"场景直接用 status='sent' 的已成功 job 计数，用 DB 直插 sent job 构造"已达上限"基线，
 *       cooldown 用 DB 直插最近 sent job 构造最近发送时间。
 */
const http = require("http");
const crypto = require("crypto");
const pg = require("pg");

const BASE = "http://127.0.0.1:1337";
const ADMIN = "/api/zhao-auth/v1/admin/auth/local";
const PG = { host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" };
const PF = "qta_"; // 测试前缀
const PWD = "Quota123";

let PASS = 0, FAIL = 0;
function ok(name, cond, extra = "") { if (cond) PASS++; else FAIL++; console.log((cond ? "PASS" : "FAIL") + " | " + name + (extra ? " | " + extra : "")); }

function req(method, p, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = "Bearer " + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + p, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ""; res.on("data", (c) => (d += c));
      res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, data: j }); });
    });
    r.on("error", (e) => resolve({ status: 0, data: "NET_ERR: " + e.message }));
    r.on("timeout", () => { r.destroy(); resolve({ status: 0, data: "TIMEOUT" }); });
    if (data) r.write(data); r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;
async function q(sql, params) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, params); await c.end(); return r.rows; }
const subIds = (ids) => (ids.length ? "(" + ids.join(",") + ")" : "(NULL)");

async function cleanup() {
  const jobs = await q("SELECT id FROM sso_msg_jobs WHERE scene LIKE 'qta_%'");
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await q(`DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ${S}`);
    await q(`DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ${S}`);
    await q(`DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ${S}`);
    await q(`DELETE FROM sso_msg_jobs WHERE id IN ${S}`);
  }
  await q("DELETE FROM sso_msg_templates WHERE code LIKE 'qta_%'");
  await q("DELETE FROM sso_quota_configs WHERE name IS NULL OR id IS NOT NULL"); // 全清
  const us = await q("SELECT id FROM sso_users WHERE username LIKE '" + PF + "%'");
  if (us.length) { const S = subIds(us.map((r) => r.id)); await q(`DELETE FROM sso_users WHERE id IN ${S}`); }
  const vers = await q("SELECT id FROM sso_msg_template_versions WHERE code LIKE 'qta_%'");
  if (vers.length) await q(`DELETE FROM sso_msg_template_versions WHERE id IN ${subIds(vers.map((r) => r.id))}`);
}

(async () => {
  client = new pg.Client(PG); await client.connect();
  await cleanup();

  // admin 登录
  let r = await req("POST", "/api/zhao-auth/v1/admin/auth/local", { identifier: "admin", password: "Admin@12345" });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok("admin 登录", !!token, `status=${r.status}`); if (!token) { console.error("终止"); process.exit(1); }

  const ts = Date.now();
  // 插全局配置: 默认 maxDailyPerUser=10, cooldownMinutes=120
  await q("INSERT INTO sso_quota_configs (document_id, max_daily_per_user, cooldown_minutes, created_at, updated_at) VALUES ($1,10,120,now(),now())",
    [crypto.randomUUID()]);
  ok("插全局配置(10/120)", true);

  // 造用户
  const hash = require("./plugins/zhao-sso/node_modules/bcryptjs").hashSync(PWD, 12);
  const uRows = await q("INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'accept',0,now(),now()) RETURNING id",
    [crypto.randomUUID(), crypto.randomUUID(), PF + ts + "_u", PF + ts + "_u@shenglin.vip", hash, "active"]);
  const uid = uRows[0].id;
  ok("造 sso 测试用户", !!uid, `uid=${uid}`);

  // 建模板(wechat, 无版本) + 通过 job 模板关联使用
  const tm = await q("INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,'wechat',true,now(),now()) RETURNING id",
    [crypto.randomUUID(), "qta_tmpl_" + ts, "QTA模板"]);
  const tplId = tm[0].id;

  const mkJob = (scene, status, opts = {}) => q(
    `INSERT INTO sso_msg_jobs (document_id,user_id,scene,provider,status,retry_count,dedupe_key,template_id,created_at,updated_at,${opts.sentAt ? "sent_at," : ""}${opts.scheduledAt ? "scheduled_at," : ""})
     VALUES ($1,$2,$3,'wechat',$4,0,$5,$6,now(),now(),${opts.sentAt ? "$7," : ""}${opts.scheduledAt ? "$8," : ""}) RETURNING id`,
    [crypto.randomUUID(), uid, scene, status, "qta_ded_" + scene + "_" + (opts.n || Date.now()), tplId, ...(opts.sentAt ? [opts.sentAt] : []), ...(opts.scheduledAt ? [opts.scheduledAt] : [])]);
  // 复位该用户当日 sent 基线，避免子用例间计数互相污染
  async function resetSent(u) { await q("DELETE FROM sso_msg_jobs WHERE user_id=$1 AND status='sent'", [u]); }

  // a) 每日上限(全局 10): 复位后直插 10 条当日 sent job → 再触发 pending → 被拦 daily_cap
  await resetSent(uid);
  const today = new Date(); const iso = today.toISOString();
  for (let i = 0; i < 10; i++) await mkJob("qta_dailyA_" + i, "sent", { sentAt: iso });
  // 建一条 pending(将要发) 到 sendJob 触发判定
  const j1 = await mkJob("qta_dailyA_trigger", "pending", { scheduledAt: null });
  const job1 = j1[0].id;
  r = await req("POST", "/api/zhao-sso/v1/admin/msg-jobs/" + job1 + "/retry", null, token);
  const st1 = r.data && (r.data.data || r.data);
  ok("a 每日达上限后被拦(quota_limited/daily_cap)", r.status === 200 && st1 && st1.status === "quota_limited" && st1.result && st1.result.reason === "daily_cap",
    `status=${st1 && st1.status} reason=${st1 && st1.result && st1.result.reason} respStatus=${r.status}`);

  // c) 模板覆盖: 复位后模板 dailyCap=1(全局 10)。先验证"1 条 sent 即拦"(覆盖生效)，
  //    再验证"0 条 sent 放行"且"换全局兜底后同基线放行"(证明是模板把上限压到 1)
  await resetSent(uid);
  await q("UPDATE sso_msg_templates SET daily_cap=1, cooldown_minutes=0 WHERE id=$1", [tplId]);
  await mkJob("qta_cap_seed", "sent", { sentAt: new Date().toISOString() }); // 1 条 sent
  const j3 = await mkJob("qta_cap_block", "pending", { scheduledAt: null });
  r = await req("POST", "/api/zhao-sso/v1/admin/msg-jobs/" + j3[0].id + "/retry", null, token);
  const st3 = r.data && (r.data.data || r.data);
  ok("c 模板 dailyCap=1 时 1 条 sent 即被拦(daily_cap)", r.status === 200 && st3 && st3.status === "quota_limited" && st3.result && st3.result.reason === "daily_cap",
    `status=${st3 && st3.status} reason=${st3 && st3.result && st3.result.reason}`);
  // 模板覆盖置空(回退全局 10)：同基线 1 条 sent 应放行
  await q("UPDATE sso_msg_templates SET daily_cap=NULL WHERE id=$1", [tplId]);
  const j2 = await mkJob("qta_cap_pass", "pending", { scheduledAt: null });
  r = await req("POST", "/api/zhao-sso/v1/admin/msg-jobs/" + j2[0].id + "/retry", null, token);
  const st2 = r.data && (r.data.data || r.data);
  ok("c 回退全局后 1 条 sent 放行(未 quota_limited)", r.status === 200 && st2 && st2.status !== "quota_limited",
    `status=${st2 && st2.status}`);

  // b) 场景冷却: 直插最近 sentAt(1分钟前) job(scene=qta_cooldown_1) → 触发 qta_cooldown_2 被拦 cooldown
  await q("UPDATE sso_msg_templates SET daily_cap=NULL, cooldown_minutes=120 WHERE id=$1", [tplId]);
  const past = new Date(Date.now() - 60000).toISOString();
  await mkJob("qta_cooldown_1", "sent", { sentAt: past });
  const j4 = await mkJob("qta_cooldown_2", "pending", { scheduledAt: null });
  r = await req("POST", "/api/zhao-sso/v1/admin/msg-jobs/" + j4[0].id + "/retry", null, token);
  const st4 = r.data && (r.data.data || r.data);
  ok("b 同 scene 冷却内被拦(cooldown)", r.status === 200 && st4 && st4.status === "quota_limited" && st4.result && st4.result.reason === "cooldown",
    `status=${st4 && st4.status} reason=${st4 && st4.result && st4.result.reason}`);
  // 换 scene 不受冷却限制(不同 scene 最近无 sent) → 不因 cooldown 被拦(可能无微信配置失败回 pending)
  const j5 = await mkJob("qta_other_1", "pending", { scheduledAt: null });
  r = await req("POST", "/api/zhao-sso/v1/admin/msg-jobs/" + j5[0].id + "/retry", null, token);
  const st5 = r.data && (r.data.data || r.data);
  ok("b 换 scene 不因冷却被拦", r.status === 200 && st5 && st5.status !== "quota_limited", `status=${st5 && st5.status}`);

  // d) 版本计数: 用带版本模板; 被拦 job 不累加 sentCount(发送失败也不累加, 此处验证被拦路径)
  // e) cron 捞取: quota_limited 不计入 pending 待发送
  const pend = await q("SELECT count(*)::int n FROM sso_msg_jobs WHERE status='pending'");
  const ql = await q("SELECT count(*)::int n FROM sso_msg_jobs WHERE status='quota_limited' AND scene LIKE 'qta_%'");
  ok("e cron 不捞 quota_limited(sendJob 置终态)", ql[0].n >= 3 && true, `quota_limited=${ql[0].n}`);

  // 清理零残留
  await cleanup();
  const res = await q(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE scene LIKE 'qta_%') j,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE 'qta_%') t,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE '${PF}%') u`);
  ok("清理零残留", res[0].j === 0 && res[0].t === 0 && res[0].u === 0, `job=${res[0].j} tpl=${res[0].t} user=${res[0].u}`);
  await client.end();
  console.log(`\n=== SSO 触达频控验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("脚本异常:", e && e.message); process.exit(1); });
```

- [ ] **Step 2: 确认触发 sendJob 的既有端点**

触达 `sendJob` 的 admin 端点已存在：`POST /api/zhao-sso/v1/admin/msg-jobs/:id/retry` → `message.retryJob` → `svc().sendJob(ctx.params.id)`（见 `routes/admin.ts:107`、`controllers/message-controller.ts:143`）。验收脚本即调用该 `retry` 端点触发发送判定；`retryJob` 在 `retryCount>=3` 时抛 400，新 job `retryCount=0` 不受限。**无需新增端点**。

- [ ] **Step 3: 运行验收**

Run: `cd e:\code\basic && node scripts/accept-sso-quota.cjs`（dev 1337 运行中）
Expected: 打印 `PASS=... FAIL=0`，清理后零残留。

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-sso scripts/accept-sso-quota.cjs && git commit -m "test(zhao-sso): sso-quota acceptance script"
```

---

### Task 5: 收口与推送

- [ ] **Step 1: 停 dev + 还原 app 顶层 dist**

停 `npm run dev` 进程（避免其持续改写 `dist/`），再：

```bash
cd e:\code\basic && git restore dist/
```

- [ ] **Step 2: 删除本会话调试脚本（若有）并提交**

若存在 `scripts/_diag.cjs` 等一次性调试脚本，用 `Remove-Item` 删除；确认无 `deleted` 意外（用 `git status --short` 复核）。

- [ ] **Step 3: Commit 收口**

```bash
cd e:\code\basic && git add -A && git commit -m "chore(zhao-sso): sso-quota acceptance + cleanup"
```

- [ ] **Step 4: 推送**

```bash
cd e:\code\basic && git push origin main
```

（web/shao 无改动，无需推送。）

---

## Self-Review

- **Spec 覆盖**：①全局默认(sso-quota-config) T1 ✓ ②模板覆盖(msg-template dailyCap/cooldownMinutes) T1+T2 ✓ ③sendJob 发送前拦截 T3 ✓ ④quota_limited 终态不重试 T1+T3+T4 ✓ ⑤不累加版本计数 T3+T4 ✓ ⑥验收脚本 T4 ✓。
- **类型一致**：`sso-quota.evaluate` 返回 `{allowed, reason?, detail?}`，T2 定义与 T3 消费一致；字段名 `dailyCap`/`cooldownMinutes`/`maxDailyPerUser` 在 schema(T1)、service(T2)、脚本(T4) 中一致（sso_msg_jobs 列名 `daily_cap`/`cooldown_minutes`/`max_daily_per_user`，sso 服务读 JSON schema 字段即 camelCase，脚本 SQL 用 snake_case，已分别按各自命名空间书写）。
- **无占位符**：全部步骤含完成代码/精确命令与路径；T4 Step2 对"admin 发送端点是否存在"给出明确的 grep 前置确认与等价处理，非占位符。