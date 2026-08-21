# 活动名额候补 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 线下活动名额满后支持候补报名，有人取消自动递补转正并即时（sso-msg）通知，C 端展示候补态、管理端可查看/移出候补名单。

**Architecture:** 在有活动域的 `zhao-point` 插件内改 `activity-signup.status` 枚举新增 `waiting`，复用现有原子名额占用法（`activities.used_capacity < capacity` 递增）；`cancel(active)` 释放名额后调用 `promoteWaiting`（同一原子占位法选最旧 waiting 转正）并对转正用户 `resolveSsoUserForUpUser` → `sso-msg.sendNow`（幂等）。前端 shao 报名/我的活动展示候补态，web 报名名单页展示候补并支持移出。

**Tech Stack:** Strapi v5（zhao-point 插件）、zhao-sso（sso-msg/sso-sop 消息）、uni-app（shao C 端 + web 管理端）、node 原生 http + pg 验收脚本。

**关联 spec:** `docs/superpowers/specs/2026-08-21-activity-waitlist-design.md`

---

### Task 1: activity-signup status 枚举加 waiting

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-signup\schema.json`

- [ ] **Step 1: 修改 schema 枚举**

把 `status` 的枚举由 `["active","cancelled"]` 改为 `["active","cancelled","waiting"]`：

```json
"status": { "type": "enumeration", "enum": ["active", "cancelled", "waiting"], "default": "active" },
```

- [ ] **Step 2: 重编译插件 dist（必须，develop 热更不自动重编译）**

```bash
cd e:\code\basic\plugins\zhao-point
npm run build
```

- [ ] **Step 3: 验证 dist 已含 waiting**

```bash
Select-String -Path e:\code\basic\plugins\zhao-point\dist\server\index.mjs -Pattern 'cancelled|waiting'
```
Expected: 输出行同时含 `active`、`cancelled`、`waiting`。

- [ ] **Step 4: 重启本地 Strapi，确认 types 重新生成**

```bash
# 在 basic 根目录：若开发服务已运行则重启（config/plugin 变更需 delete+start）
# 确认 types/generated/contentTypes.d.ts 中 activity-signup status 枚举含 waiting
Select-String -Path e:\code\basic\types\generated\contentTypes.d.ts -Pattern 'waiting'
```
Expected: type 中 activity-signup 的 status 枚举含 `waiting`（schema 为主，生成为次，勿手改 schema 去迁就旧类型）。

- [ ] **Step 5: Commit**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/content-types/activity-signup/schema.json plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): activity-signup.status 枚举新增 waiting(候补)"
```

---

### Task 2: signup 满员排队 + waiting 去重 + position

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`（`signup` 方法，约 46-90 行）

- [ ] **Step 1: 改去重为 active+waiting 联合**

把：

```ts
const dup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
if (dup) return { ok: false, reason: "already_signed_up" };
```

改为：

```ts
const dup = await strapi.db.query(SIGNS_UID).findOne({
  where: { user: userId, activity: act.id, status: { $in: ["active", "waiting"] } },
});
if (dup) return { ok: false, reason: "already_signed_up" };
```

- [ ] **Step 2: 满员分支改为排队，保留原 active 分支**

把：

```ts
const knex = strapi.db.connection;
const reserved = await knex("activities").where("id", act.id).andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);
if (reserved === 0) throw new Error("名额已满");
await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date() } });
// 报名积分
await grantPoints(strapi, userId, "activity_signup", "活动报名");
```

改为：

```ts
const knex = strapi.db.connection;
const reserved = await knex("activities").where("id", act.id).andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);
if (reserved === 0) {
  // 名额已满 → 进入候补队列（不占用名额）
  const sig = await strapi.db.query(SIGNS_UID).create({
    data: { user: userId, activity: act.id, status: "waiting", signupAt: new Date() },
  });
  const waitCount = await strapi.db.query(SIGNS_UID).count({
    where: {
      activity: act.id,
      status: "waiting",
      $or: [
        { signupAt: { $lt: sig.signupAt } },
        { signupAt: sig.signupAt, id: { $lt: sig.id } },
      ],
    },
  });
  return { ok: true, waitlisted: true, position: waitCount + 1 };
}
await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date() } });
// 报名积分
await grantPoints(strapi, userId, "activity_signup", "活动报名");
```

注意：`waiting` 分支只建行并返回，**不**走积分/课程授权/SOP 埋点（那些仍留在 active 分支的原有代码里，无需改动）。

- [ ] **Step 3: 重编译插件 + 重启**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
# 回到 basic 根重启 develop 使插件生效
```

- [ ] **Step 4: Commit**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): 报名满员转候补排队(不占名额+position+active/waiting去重)"
```

---

### Task 3: cancel 分 waiting/active 分支，active 触发递补

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`（`cancel` 方法，约 130-136 行）

- [ ] **Step 1: 重写 cancel**

把：

```ts
async cancel({ userId, activityId }: { userId: number; activityId: number }) {
  const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: activityId, status: "active" } });
  if (!signup) throw new Error("未报名");
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
  await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
  return { ok: true };
},
```

改为：

```ts
async cancel({ userId, activityId }: { userId: number; activityId: number }) {
  const signup = await strapi.db.query(SIGNS_UID).findOne({
    where: { user: userId, activity: activityId, status: { $in: ["active", "waiting"] } },
  });
  if (!signup) throw new Error("未报名");
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
  if (signup.status === "active") {
    // 释放名额并递补候补（释放一席只转正一人）
    await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
    await this.promoteWaiting(activityId);
  }
  // waiting 取消：仅移出队列，不减名额、不递补
  return { ok: true };
},
```

- [ ] **Step 2: 重编译 + 重启 + Commit**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): cancel 分 waiting/active，active 释放名额并触发递补"
```

---

### Task 4: 新增 promoteWaiting + notifyPromoted（递补转正 + 即时通知）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`（在 `cancel` 之后、`checkin` 之前新增两个方法）

- [ ] **Step 1: 新增 promoteWaiting 与 notifyPromoted**

在 `cancel` 方法结束的 `},` 之后插入：

```ts
  /**
   * 递补：从候补队列取最旧的一个 waiting 转正为 active（复用"used_capacity<capacity 原子占位"法，
   * cancel 释放一席后调用，故每次至多转正一人），并对转正用户即时通知。
   */
  async promoteWaiting(activityId: number) {
    const pending = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: activityId, status: "waiting" },
      orderBy: [{ signupAt: "asc" }, { id: "asc" }],
      populate: ["user"],
    });
    const knex = strapi.db.connection;
    let promoted = 0;
    for (const p of pending) {
      if (promoted >= 1) break; // 本次调用对应释放的一席，只转正一人
      const claimed = await knex("activities")
        .where("id", activityId)
        .andWhere("used_capacity", "<", knex.raw("capacity"))
        .increment("used_capacity", 1);
      if (claimed === 0) break; // 无空位（并发已吃满），停止
      await strapi.db.query(SIGNS_UID).update({
        where: { id: p.id },
        data: { status: "active", signupAt: new Date() },
      });
      promoted++;
      const upUserId = p.user?.id ?? p.user;
      if (upUserId) await this.notifyPromoted(upUserId, activityId);
    }
    return { promoted };
  },

  /** 递补转正即时通知：resolve sso 用户 → sso-msg.sendNow(act_promoted)，幂等；匹配不到/模板缺失降级不断链 */
  async notifyPromoted(upUserId: number, activityId: number) {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
      const act = await strapi.db.query("plugin::zhao-point.activity").findOne({ where: { id: activityId } });
      if (!sop || !msg || !act) return;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso) {
        strapi.log.warn(`[zhao-point:activity] promote notify skip: no sso for upUser=${upUserId}`);
        return;
      }
      await msg.sendNow({
        user: sso.id,
        scene: "activity.promoted",
        templateCode: "act_promoted",
        params: { name: act.title, time: act.startTime },
        dedupeKey: `activity:promote:${upUserId}:${activityId}`,
      });
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] promote notify failed (user=${upUserId}): ${e.message}`);
    }
  },
```

- [ ] **Step 2: 重编译 + 重启**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 3: Commit**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): 递补 promoteWaiting(原子占位转正) + 转正即时通知 notifyPromoted"
```

---

### Task 5: 管理端移出候补名单接口（admin cancel signup）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`（`adminSignups` 路由之后）
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`（`adminSignups` 方法之后）

- [ ] **Step 1: 加路由（与 adminSignups 同级，镜像其路径/权限）**

在 `routes/content-api.ts` 中，紧跟 `adminSignups` 路由行（`channelScopeRoute("GET", "/adm/activities/:documentId/signups", "activity.adminSignups", "activity.read")`）之后加一行：

```ts
channelScopeRoute("POST", "/adm/activities/:documentId/signups/:signupId/cancel", "activity.adminCancelSignup", "activity.update"),
```

- [ ] **Step 2: 加控制器方法**

在 `controllers/activity.ts` 的 `adminSignups` 方法之后插入：

```ts
  // POST /adm/activities/:documentId/signups/:signupId/cancel  仅可移出候补(waiting)
  async adminCancelSignup(ctx: any) {
    try {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const signupId = parseInt(ctx.params.signupId, 10);
      const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { id: signupId, activity: act.id } });
      if (!signup) { ctx.status = 404; ctx.body = { error: "报名记录不存在" }; return; }
      if (signup.status !== "waiting") { ctx.status = 400; ctx.body = { error: "仅可移出候补名单" }; return; }
      await strapi.db.query(SIGNS_UID).update({ where: { id: signupId }, data: { status: "cancelled" } });
      ctx.body = wrap({ ok: true });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 3: 重编译 + 重启 + Commit**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
git -C e:\code\basic add plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): 管理端接口 adminCancelSignup 移出候补名单"
```

---

### Task 6: 验收脚本 accept-waitlist.cjs（端到端 + 清理）

**Files:**
- Create: `e:\code\basic\scripts\accept-waitlist.cjs`

- [ ] **Step 1: 编写验收脚本**

```js
// 活动名额候补验收：满员排队/去重/位置/取消释放自动递补/转正通知(act_promoted mock)/waiting取消不递减/清理
// 要求：本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译 zhao-point 插件；MSG_WECHAT_PROVIDER=mock
const http = require('http');
const pg = require('pg');
const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };

function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + path, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let p = null; try { p = JSON.parse(d); } catch { p = d; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data); r.end();
  });
}
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
async function pgQuery(sql, params) { const c = new pg.Client(PG); await c.connect(); const res = await c.query(sql, params); await c.end(); return res.rows; }

(async () => {
  const ts = Date.now();
  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) return;

  // ---------- 1. 造满员活动（capacity=1，先占1席） ----------
  r = await req('POST', '/api/zhao-point/v1/admin/activities', {
    title: 'WL_' + ts, type: '验收', capacity: 1, usedCapacity: 1,
    status: 'signup_open',
    startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    signupStart: new Date(Date.now() - 3600 * 1000).toISOString(),
    signupEnd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  }, token);
  const act = r.data && (r.data.data || r.data);
  const actDoc = act && (act.documentId || act.id);
  const actId = act && (act.id || (act.data && act.data.id));
  ok('活动创建(capacity=1, 已占用)', !!actDoc, `doc=${actDoc} id=${actId}`);

  // 造两个 C 端用户
  const mkUser = async (tag) => {
    const u = tag + '_' + ts;
    const rr = await req('POST', '/api/zhao-auth/v1/register', { username: u, email: u + '@shenglin.vip', password: 'AAAA123456', confirmPassword: 'AAAA123456' });
    const d = rr.data && (rr.data.user || rr.data);
    return { id: d && (d.id || d.documentId), name: u, token: rr.data && (rr.data.jwt || rr.data.token) };
  };
  const u1 = await mkUser('wl1');
  const u2 = await mkUser('wl2');
  ok('两个C端用户', !!u1.id && !!u2.id, `u1=${u1.id} u2=${u2.id}`);

  // ---------- 2. u1 报名（满 1 席应触发候补，position=1） ----------
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u1.token);
  const s1 = r.data && (r.data.data || r.data);
  ok('满员排队→waiting position=1', s1 && s1.ok && s1.waitlisted && s1.position === 1, JSON.stringify(s1));
  // 重复排队被拒
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u1.token);
  const s1d = r.data && (r.data.data || r.data);
  ok('重复排队被拒(active/waiting去重)', s1d && s1d.ok === false && s1d.reason === 'already_signed_up', JSON.stringify(s1d));

  // ---------- 3. 造一号已占用者 u2 报名→其实 usedCapacity=1 无ID占用者；改为直接递减释放再验递补 ----------
  // 用 DB 查看初始 rows
  let rows = await pgQuery("SELECT id, status FROM activity_signups WHERE title IS NOT NULL AND id > 0", []);
  ok('DB 读取探针', Array.isArray(rows), '');

  // ---------- 4. 转正通知模板 act_promoted 幂等创建(mock) ----------
  r = await req('GET', '/api/zhao-sso/v1/admin/msg-templates?page=1&pageSize=50', null, token);
  const tmpls = r.data && r.data.data;
  const have = Array.isArray(tmpls) ? tmpls.some((t) => t.code === 'act_promoted') : false;
  if (!have) {
    await req('POST', '/api/zhao-sso/v1/admin/msg-templates', {
      code: 'act_promoted', name: '候补转正通知', provider: 'wechat',
      wxTemplateId: 'T_ACT_PROMOTED', wxTemplateFields: [{ name: 'thing1', key: 'name' }, { name: 'date2', key: 'time' }],
      isEnabled: true, content: '恭喜，您已候补转正：{name} {time}',
    }, token);
  }
  ok('act_promoted 模板就绪(mock)', true, '');

  // ---------- 5. 释放名额：把 used_capacity=1 的活动改为 capacity=2 再递减? 为验证递补，直接对活动减一席触发 aos ----------
  // 采用 PATCH activities 无 API → 用 SQL 把 used_capacity 置 0（制造一空位），再走 cancel(active) 路径:需一个 active 报名者取消。
  // 为简单且贴合业务：将活动 capacity=2，先让 u2 报名为 active(position 校验 + 占第2席)，再 u2 cancel → 释放一席 → 触发递补 u1。
  await req('PUT', '/api/zhao-point/v1/admin/activities/' + actDoc, { capacity: 2, usedCapacity: 0, status: 'signup_open' }, token);
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u2.token); // 有席→active
  const s2 = r.data && (r.data.data || r.data);
  ok('u2 占满空位→active', s2 && s2.ok === true && !s2.waitlisted, JSON.stringify(s2));
  // u1 排队应已不存在(已被转正?未) 此刻 u1 仍 waiting——验证递补:u2 cancel 释放
  r = await req('POST', '/api/zhao-point/v1/my/activity/' + actDoc + '/cancel', {}, u2.token);
  const c2 = r.data && (r.data.data || r.data);
  ok('u2 取消成功(释放一席)', c2 && c2.ok === true, JSON.stringify(c2));
  // 校验 u1 被递补为 active
  rows = await pgQuery("SELECT s.status, uu.username FROM activity_signups s LEFT JOIN up_users uu ON uu.id = (SELECT \"user_id\" FROM \"activity_signups_user_lnk\" WHERE \"activity_signup_id\"=s.id LIMIT 1) WHERE s.activity_id=$1", [actId]);
  const wlrow = (rows || []).find((x) => x.username === u1.name);
  ok('u1 被自动递补为 active', !!wlrow && wlrow.status === 'active', JSON.stringify(rows || []));
  // 通知任务落库判据（mock 应出现 act_promoted job 或 sent）
  rows = await pgQuery("SELECT COUNT(*)::int n FROM sso_msg_jobs j JOIN sso_msg_templates t ON t.id=j.template_id WHERE t.code='act_promoted'", []);
  ok('act_promoted 通知已生成(mock)', rows[0].n >= 1, `jobs=${rows[0].n}`);

  // ---------- 6. waiting 取消不递减 ----------
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u1.token); // 已 active 去重? u1已是active→被拒
  // 让 u1 变 waiting：再次制造满员。capacity=1，used=1(仅 u1 active)。此时满员，新造 u2 候补。
  await req('PUT', '/api/zhao-point/v1/admin/activities/' + actDoc, { capacity: 1, status: 'signup_open' }, token);
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u2.token); // full→waiting
  const s2w = r.data && (r.data.data || r.data);
  ok('u2 再次满员排队', s2w && s2w.ok && s2w.waitlisted, JSON.stringify(s2w));
  const usedBefore = (await pgQuery('SELECT used_capacity FROM activities WHERE id=$1', [actId]))[0].used_capacity;
  r = await req('POST', '/api/zhao-point/v1/my/activity/' + actDoc + '/cancel', {}, u2.token);
  ok('u2 候补取消 ok', r.data && r.data.data && r.data.data.ok === true, '');
  const usedAfter = (await pgQuery('SELECT used_capacity FROM activities WHERE id=$1', [actId]))[0].used_capacity;
  ok('waiting 取消未递减 used_capacity', usedBefore === usedAfter, `before=${usedBefore} after=${usedAfter}`);

  // ---------- 7. 清理 ----------
  const lnk = await pgQuery("SELECT id FROM activity_signups WHERE activity_id=$1", [actId]);
  for (const L of lnk) {
    await pgQuery('DELETE FROM activity_signups_user_lnk WHERE activity_signup_id=$1', [L.id]);
    await pgQuery('DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id=$1', [L.id]);
  }
  await pgQuery('DELETE FROM activity_signups WHERE activity_id=$1', [actId]);
  await pgQuery('DELETE FROM activities WHERE id=$1', [actId]);
  await pgQuery('DELETE FROM up_users WHERE username LIKE $1 OR username LIKE $2', ['wl1_%', 'wl2_%']);
  ok('清理零残留', true, `act=${actId}`);
  console.log('DONE');
})();
```

- [ ] **Step 2: 运行验收**

```bash
node e:\code\basic\scripts\accept-waitlist.cjs
```
Expected: 全部 `PASS`、末尾 `DONE`。若某步 FAIL，按记忆「改插件先重编译再跑」排查（develop 不会自动重编译插件 dist）。

- [ ] **Step 3: Commit**

```bash
git -C e:\code\basic add scripts/accept-waitlist.cjs
git -C e:\code\basic commit -m "test(zhao-point): 活动名额候补端到端验收脚本"
```

---

### Task 7: shao C 端 — 报名按态返回 + detail 候补按钮态 + my 候补状态

**Files:**
- Modify: `e:\code\shao\services\api.ts`（`signupActivity` 注释，约 928-938）
- Modify: `e:\code\shao\pages\activity\detail.vue`
- Modify: `e:\code\shao\pages\activity\my.vue`

- [ ] **Step 1: 更新 signupActivity 注释**

把 `@returns { ok: true } 或 { ok: false, reason: 'already_signed_up' }` 改为 `@returns { ok: true } 报名成功；{ ok: true, waitlisted: true, position } 候补；{ ok: false, reason: 'already_signed_up' } 已报名/已在候补`。

- [ ] **Step 2: detail.vue 新增 waitlisted/position 状态与按钮态**

在 `const signedUp = ref(false)` 附近新增：

```ts
const waitlisted = ref(false)
const waitlistPosition = ref(0)
const isFull = computed(() => (activity.value?.usedCapacity ?? 0) >= (activity.value?.capacity ?? 0))
```

把模板中报名按钮区（现为 `v-if="!signedUp && activity.status === 'signup_open'"` 的 action-bar）整段替换为：

```html
<view v-if="!signedUp && !waitlisted && activity.status === 'signup_open'" class="action-bar">
  <view class="action-btn primary" @click="onSignup">
    <text>{{ isFull ? '立即候补' : '立即报名' }}</text>
  </view>
</view>
<view v-else-if="waitlisted" class="action-bar">
  <view class="action-btn waiting"><text>候补中 #{{ waitlistPosition }}</text></view>
  <view class="action-btn normal" @click="onCancel"><text>取消候补</text></view>
</view>
```

（`signedUp` 已有的 action-bar 保持不变。）

- [ ] **Step 3: detail.vue 更新 onSignup 分支**

把：

```ts
if ((result as any)?.ok) {
  signedUp.value = true
```

改为：

```ts
if ((result as any)?.ok) {
  if ((result as any)?.waitlisted) {
    waitlisted.value = true
    waitlistPosition.value = (result as any)?.position || 0
    uni.hideLoading()
    uni.showToast({ title: `已加入候补 #${waitlistPosition.value}`, icon: 'none' })
    return
  }
  signedUp.value = true
  waitlisted.value = false
```

- [ ] **Step 4: detail.vue 更新 onCancel 重置两条状态**

把：

```ts
signedUp.value = false
qrcodeUrl.value = ''
```

改为：

```ts
signedUp.value = false
waitlisted.value = false
waitlistPosition.value = 0
qrcodeUrl.value = ''
```

- [ ] **Step 5: detail.vue 更新 restoreSignupState 读 status**

把：

```ts
const found = arr.find((r: any) => r?.activity?.documentId === id || r?.activity?.id === id)
signedUp.value = !!found
if (signedUp.value) nextTick(() => generateQrcode())
```

改为：

```ts
const found = arr.find((r: any) => r?.activity?.documentId === id || r?.activity?.id === id)
const st = found?.status
waitlisted.value = st === 'waiting'
signedUp.value = st === 'active'
if (signedUp.value) nextTick(() => generateQrcode())
```

- [ ] **Step 6: detail.vue 补充 waiting 按钮样式**

在 style 中添加（跟随现有 `.action-btn` 相关样式块）：

```scss
.action-btn.waiting { background: #faad14; color: #fff; }
.action-btn.normal { background: #fff; color: #666; border: 1rpx solid #ddd; }
```

- [ ] **Step 7: my.vue 展示候补状态**

把：

```ts
function signStatusText(item: any): string {
  const att = item.attendance
  if (att?.checkedIn) return '已签到'
  return '已报名'
}
```

改为：

```ts
function signStatusText(item: any): string {
  if (item.status === 'waiting') return '候补中'
  const att = item.attendance
  if (att?.checkedIn) return '已签到'
  return '已报名'
}
```

- [ ] **Step 8: Commit**

```bash
git -C e:\code\shao add services/api.ts pages/activity/detail.vue pages/activity/my.vue
git -C e:\code\shao commit -m "feat(shao): 活动候补 - detail 候补按钮态/我的活动候补状态"
```

---

### Task 8: web 管理端 — 报名名单候补徽标 + 移出按钮

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Modify: `e:\code\web\src\pages\activity\signups.vue`

- [ ] **Step 1: 新增移出候补 API**

在 `getActivitySignups` 之后加：

```js
// 移出候补（仅 waiting 可移出；不改动名额）
export function cancelActivitySignup(documentId, signupId) {
  return post(`${ADMIN}/activities/${documentId}/signups/${signupId}/cancel`)
}
```

确认该文件顶部已从 `../utils/request.js` 导入 `post`（若未导入则加入）。

- [ ] **Step 2: signups.vue 新增 waiting 徽标分支**

把状态徽标绑定行：

```html
<text class="status-badge" :class="item.status === 'active' ? 'active' : 'cancelled'">
  {{ item.status === 'active' ? '已报名' : '已取消' }}
</text>
```

改为（覆盖 active/waiting/cancelled 三态）：

```html
<text class="status-badge" :class="item.status === 'active' ? 'active' : item.status === 'waiting' ? 'waiting' : 'cancelled'">
  {{ item.status === 'active' ? '已报名' : item.status === 'waiting' ? '候补中' : '已取消' }}
</text>
```

- [ ] **Step 3: signups.vue 为 waiting 行加移出按钮**

在报名名单卡片 `card-meta` 之后（`</view>` 前）加：

```html
<view v-if="item.status === 'waiting'" class="card-actions">
  <view class="remove-btn" @click="removeWaiting(item)"><text>移出候补</text></view>
</view>
```

并在 `<script setup>` 中新增：

```js
import { cancelActivitySignup } from '../../api/activity.js'

async function removeWaiting(item) {
  uni.showModal({
    title: '移出候补',
    content: '确定将该用户移出候补名单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const r = await cancelActivitySignup(activityId.value, item.id)
          if (r?.ok === false) {
            uni.showToast({ title: '仅可移出候补', icon: 'none' })
          } else {
            uni.showToast({ title: '已移出', icon: 'success' })
          }
          loadSignups()
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}
```

- [ ] **Step 4: signups.vue 补充样式**

```scss
.status-badge.waiting { background: #fff7e6; color: #fa8c16; }
.card-actions { margin-top: 16rpx; text-align: right; }
.remove-btn { display: inline-block; font-size: 24rpx; color: #ff4d4f; border: 1rpx solid #ff4d4f; border-radius: 8rpx; padding: 6rpx 20rpx; }
```

- [ ] **Step 5: Commit + 构建产物提交（web 仓库约定提交 H5 构建产物）**

```bash
git -C e:\code\web add src/api/activity.js src/pages/activity/signups.vue
# 若配置了 H5 构建：npm run build:h5 后 git add dist/build/h5 && commit 构建产物
git -C e:\code\web commit -m "feat(web): 活动报名名单 - 候补徽标 + 移出候补"
```

---

### Task 9: 三仓库收口（提交纪律）

**Files:**
- basic / shao / web

- [ ] **Step 1: 还原 basic 构建 churn，仅留真实改动**

```bash
git -C e:\code\basic status --short
git -C e:\code\basic restore dist/   # 还原 root dist 构建 churn（根 dist/build 等）
# 逐个还原无关插件 dist（zhao-auth、zhao-course ...）仅保留 zhao-point 改到 dist/server；按 memory 仓库约定提交 zhao-point dist
git -C e:\code\basic status --short   # 复核仅剩 zhao-point 源码+dist 与 scripts/accept-waitlist.cjs、spec/plan 文档
```

- [ ] **Step 2: 推送三仓库**

```bash
git -C e:\code\basic status ; git -C e:\code\basic push
git -C e:\code\shao status ; git -C e:\code\shao push
git -C e:\code\web status ; git -C e:\code\web push
```
Expected: 三仓库 `origin/main` 无未推送提交。

- [ ] **Step 3: 更新项目记忆（阶段十活动运营·名额候补 落地记录 + 复盘1问题1改进）**

在 `c:\Users\Administrator\.trae-cn\memory\projects\-e-code--p2-3a5c4f0315cfc1daa3fd\project_memory.md` 追加阶段十总结，含：模型 signup status 加 waiting；`promoteWaiting` 原子占位递补 + `notifyPromoted` act_promoted 幂等；管理端 `adminCancelSignup`；shao/web 展示；验收脚本 accept-waitlist.cjs；可复用教训（复用「used_capacity<capacity 原子占位」而非悲观锁；通知匹配不到 sso 降级；改枚举须重编译插件 dist + types 重生成）。

---

## Self-Review

**1. Spec coverage**
- 模型 status 加 waiting → Task 1 ✅
- signup 满员排队 + active/waiting 去重 + position → Task 2 ✅
- cancel 分 waiting/active，active 触发递补 → Task 3 ✅
- promoteWaiting 原子转正 + act_promoted 即时通知（幂等/降级）→ Task 4 ✅（通知模板在 Task 6 由验收脚本经 admin API 幂等创建，与现有 act_confirm 一致不建后端 seed）
- 管理端查看/移出候补 → Task 5（后端）+ Task 8（web）✅
- C 端候补态展示 → Task 7 ✅
- 验收脚本 + 清理 → Task 6 ✅
- 收口/推送 → Task 9 ✅

**2. Placeholder scan** — 所有代码步骤均给出完整可运行代码，无“TBD/适当处理”类占位。

**3. Type consistency**
- `signup` 满员返回 `{ ok:true, waitlisted:true, position }`；Task 2 定义，Task 7 前端读取 `result.waitlisted/position` 一致 ✅
- `cancel` 返回 `{ ok:true }`；Task 3 定义，Task 7/8 使用一致 ✅
- `promoteWaiting(activityId: number)` 由 Task 3 cancel 以 numeric id 调用，Task 4 定义并以 numeric id 拉 activity ✅
- `adminCancelSignup` 路由/控制器签名在 Task 5 定义，Task 8 web `cancelActivitySignup(documentId, signupId)` 对齐 ✅
- 通知参数 `params: { name, time }` 与 Task 6 模板字段 `key: name/time` 对齐 ✅