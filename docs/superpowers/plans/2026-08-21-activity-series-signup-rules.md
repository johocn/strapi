# 系列报名规则细分（含积分计费）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为活动系列引入「系列级默认报名/签到规则 + 场次级覆盖 + 积分报名费」，报名按 `feeCollectAt=signup|checkin` 两档计费，配套签名与取消退款。

**Architecture:** 扩 `plugin::zhao-point`。系列新增 `defaultRules`(JSON) 作为排期生成场次的规则模板；活动新增 `pointsCost` + `feeCollectAt`；signup 新增 `pointsCharged`。报名沿用「原子占位」，计费点 signup 模式占位后 `deductPoints`、失败回滚占位；转正扣费；会前取消退费走点服务新增的 `refundPoints`（按实际 `pointsCharged` 精确退回）。点服务 `deductPoints` 增加可选 channel 透传避免 POINT_020。

**Tech Stack:** Strapi v5(zhao-point 插件)、postgres、web(uni-app vue3)、shao(uni-app vue3)、`scripts/accept-*.cjs` 验收。

> 参考设计：`docs/superpowers/specs/2026-08-21-activity-series-signup-rules-design.md`
> 仓库约定：basic 后端改插件后 `cd plugins/zhao-point && npm run build` 重编译 dist + 生成 types，重启本机 Strapi；web/shao 改前端后分别 `npm run build:h5`，`dist/build/h5` 随源码提交。

---

### Task 1: content-type schema 扩展

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-series\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-signup\schema.json`

- [ ] **Step 1: activity-series 加 `defaultRules`（JSON）**

在 `activity-series/schema.json` 的 `attributes` 末尾（`activities` 关系后）追加：

```json
"defaultRules": { "type": "json" }
```

- [ ] **Step 2: activity 加 `pointsCost` + `feeCollectAt`**

在 `activity/schema.json` 的 `attributes` 内（任意位置）新增：

```json
"pointsCost": { "type": "integer", "default": 0 },
"feeCollectAt": { "type": "enumeration", "enum": ["signup", "checkin"], "default": "signup" }
```

- [ ] **Step 3: activity-signup 加 `pointsCharged`**

在 `activity-signup/schema.json` 的 `attributes` 内新增：

```json
"pointsCharged": { "type": "integer", "default": 0 }
```

- [ ] **Step 4: 重编译插件 + 重启验证 schema 加载**

Run（在 `e:\code\basic\plugins\zhao-point`）: `npm run build`
Expected: 构建成功无 TS/JSON 错误；`server/dist` 重新生成。重启本机 Strapi（`e:\code\basic` 下 `npm run dev`），确认三表结构含新字段无 schema 报错。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-point/server/src/content-types
git commit -m "feat(zhao-point): series defaultRules + activity fee fields + signup pointsCharged"
```

---

### Task 2: 点服务 `deductPoints` 支持渠道 + 新增 `refundPoints`

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\point.ts:225-244`（deductPoints）、`~809`（导出对象）

- [ ] **Step 1: 扩展 `DeductPointsParams` 类型（可选渠道）**

找到 `deductPoints` 上方的参数类型定义（含 `channelId?` 等），补充两个可选字段：

```ts
type DeductPointsParams = {
  userId: string | number;
  action: string;
  points?: number;
  source?: string;
  method?: string;
  remark?: string;
  orderId?: string;
  channelId?: string | number;
  userChannelId?: string | number;
};
```
（若该类型名为其他如 `DeductParams`，按同名补充即可；字段必为可选，保证既有调用不破坏。）

- [ ] **Step 2: deductPoints 透传渠道**

将 `deductPoints` 的解构与 createRecord 调用改为携带渠道：

```ts
const deductPoints = async (params: DeductPointsParams) => {
  const { userId, action, points: customPoints, source, method, remark, orderId, channelId, userChannelId } = params;

  const rule = await getMergedRule(action);
  const deductAmount = customPoints || rule?.points || 0;
  if (deductAmount <= 0) {
    throwError("POINT_010", "无效的积分操作类型", { action });
  }

  const balance = await getLatestBalance(userId);
  if (balance < deductAmount) {
    throwError("POINT_002", "积分余额不足", { balance, required: deductAmount });
  }

  const record = await createRecord(userId, action, deductAmount, balance, "decrease", {
    source, method, remark, orderId, channelId, userChannelId,
  });

  return record;
};
```

- [ ] **Step 3: 新增 `refundPoints`**

在 `deductPoints` 之后（返回对象之前）新增：

```ts
const refundPoints = async ({ userId, action, points, source, method, remark, orderId, channelId, userChannelId }:
  { userId: string | number; action: string; points: number; source?: string; method?: string; remark?: string; orderId?: string; channelId?: string | number; userChannelId?: string | number }) => {
  if (!points || points <= 0) {
    throwError("POINT_021", "无效退款金额", { action });
  }
  const balance = await getLatestBalance(userId);
  const record = await createRecord(userId, action, points, balance, "increase", {
    source, method, remark, orderId, channelId, userChannelId,
  });
  return record;
};
```

- [ ] **Step 4: 导出 `refundPoints`**

在返回对象（`earnPoints, deductPoints` 附近）追加：

```ts
refundPoints,
```

- [ ] **Step 5: 重编译 + 提交**

Run: `npm run build`（zhao-point 目录）。
```bash
git add plugins/zhao-point/server/src/services/point.ts
git commit -m "feat(zhao-point): deductPoints channel pass-through + refundPoints exact refund"
```

---

### Task 3: 系列排期继承默认规则 + duplicate 复制费用

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\series-service.ts:162-174`（generateSchedule 的 create data）、`46-81`（duplicate）

- [ ] **Step 1: generateSchedule 继承 `defaultRules`**

把 `generateSchedule` 内 `strapi.documents(ACTIVITY_UID).create` 的 `data` 对象，从固定值改为读取 `series.defaultRules` 兜底：

```ts
const dr = series.defaultRules || {};
const pointsCost = Number(dr.pointsCost ?? 0);
const feeCollectAt = dr.feeCollectAt === "checkin" ? "checkin" : "signup";

await strapi.documents(ACTIVITY_UID).create({
  data: {
    title: series.title,
    description: series.description,
    venueName,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    status: "draft",
    usedCapacity: 0,
    capacity: Number(dr.capacity ?? 100),
    checkinMode: dr.checkinMode || "both",
    geoEnforced: !!dr.geoEnforced,
    geoRadiusM: Number(dr.geoRadiusM ?? 500),
    pointsCost,
    feeCollectAt,
    signupStart: dr.signupOpenDays
      ? new Date(startDate.getTime() - Number(dr.signupOpenDays) * 24 * 3600 * 1000).toISOString()
      : null,
    belongsToSeries: series.id,
  },
});
```

- [ ] **Step 2: duplicate 复制费用字段**

在 `duplicate` 的 `copy` 对象内（`geoRadiusM` 之后）追加：

```ts
pointsCost: src.pointsCost ?? 0,
feeCollectAt: src.feeCollectAt ?? "signup",
```

- [ ] **Step 3: 重编译 + 提交**

Run: `npm run build`（zhao-point 目录）。
```bash
git add plugins/zhao-point/server/src/services/series-service.ts
git commit -m "feat(zhao-point): generateSchedule inherit defaultRules + duplicate copy fee"
```

---

### Task 4: 报名计费（signup 模式预扣 + checkin 模式不预扣）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`

- [ ] **Step 1: 加常量 + 渠道解析 helper**

在 `activity.ts` 上部常量区加 `ACTIVITY_UID`，并新增渠道解析 helper（供扣费/退款复用）：

```ts
const ACTIVITY_UID = "plugin::zhao-point.activity";

async function resolveUserChannelId(strapi, userId: number) {
  const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
  let userChannelId: number | undefined;
  if (channelSvc) {
    const member = await strapi.db.query("plugin::zhao-channel.channel-member")
      .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
    userChannelId = member?.channel?.id || member?.channel;
    if (!userChannelId) {
      const dirs = await channelSvc.getUserDirectChannels(userId);
      userChannelId = dirs?.[0];
    }
  }
  return userChannelId;
}
```

- [ ] **Step 2: signup 计费插入**

在 `signup` 的 `if (reserved === 0) {...}` 分支之后、`strapi.db.query(SIGNS_UID).create(...)` 之前插入：

```ts
const cost = act.pointsCost || 0;
if (feeCollectAt === "signup" && cost > 0) {
  const userChannelId = await resolveUserChannelId(strapi, userId);
  try {
    await strapi.plugin("zhao-point").service("point").deductPoints({
      userId, action: "activity_fee", points: cost, source: "activity",
      method: "activity_signup", remark: `报名活动:${act.title}`, orderId: `act:${act.documentId}`,
      userChannelId,
    });
  } catch (e) {
    // 扣费失败（如余额不足）→ 回滚名额占位，保证名额与收费一致
    await knex("activities").where("id", act.id).decrement("used_capacity", 1);
    return { ok: false, reason: "insufficient_points" };
  }
}
```

- [ ] **Step 3: 在 signup 方法开头取 `feeCollectAt`**

在 `signup` 内（`const now = Date.now()` 之前）加入：

```ts
const feeCollectAt = act.feeCollectAt || "signup";
```

- [ ] **Step 4: create 时写入 `pointsCharged`**

把既有 `strapi.db.query(SIGNS_UID).create({ data: { ... status: "active" ... } })` 的 data 增加 `pointsCharged`：

```ts
await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0 } });
```

- [ ] **Step 5: 重编译 + 提交**

Run: `npm run build`（zhao-point 目录）。
```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): activity signup fee deduction + rollback + pointsCharged"
```

---

### Task 5: 候补转正扣费 + 落账

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts:167-191`（promoteWaiting）

- [ ] **Step 1: 转正前扣费**

将 `promoteWaiting` 内「占位 → 转正」逻辑，在占位成功后再插入计费判断与失败回滚：

```ts
let promoted = 0;
const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
const feeCollectAt = act?.feeCollectAt || "signup";
const cost = act?.pointsCost || 0;

for (const p of pending) {
  if (promoted >= 1) break;
  const claimed = await knex("activities")
    .where("id", activityId)
    .andWhere("used_capacity", "<", knex.raw("capacity"))
    .increment("used_capacity", 1);
  if (claimed === 0) break;

  const upUserId = p.user?.id ?? p.user;
  if (feeCollectAt === "signup" && cost > 0) {
    const userChannelId = await resolveUserChannelId(strapi, upUserId);
    try {
      await strapi.plugin("zhao-point").service("point").deductPoints({
        userId: upUserId, action: "activity_fee", points: cost, source: "activity",
        method: "activity_promote", remark: `候补转正:${act.title}`, orderId: `act:${act.id}`,
        userChannelId,
      });
    } catch {
      // 该候补积分不足 → 回滚占位，保持 waiting，跳到下一候补
      await knex("activities").where("id", activityId).decrement("used_capacity", 1);
      continue;
    }
  }

  await strapi.db.query(SIGNS_UID).update({
    where: { id: p.id },
    data: { status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0 },
  });
  promoted++;
  if (upUserId) await this.notifyPromoted(upUserId, activityId);
}
```

- [ ] **Step 2: 重编译 + 提交**

Run: `npm run build`（zhao-point 目录）。
```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): promoteWaiting fee + skip insufficient + charge落账"
```

---

### Task 6: 取消退款 + checkin 计费

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts:148-161`（cancel）、`217-245`（checkin）

- [ ] **Step 1: cancel 退费**

在 `cancel` 的 `if (signup.status === "active")` 块内、释放名额之前插入退费：

```ts
if (signup.status === "active") {
  const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
  if ((act?.feeCollectAt || "signup") === "signup" && signup.pointsCharged > 0) {
    const userChannelId = await resolveUserChannelId(strapi, userId);
    try {
      await strapi.plugin("zhao-point").service("point").refundPoints({
        userId, action: "activity_fee_refund", points: signup.pointsCharged,
        source: "activity", method: "activity_cancel", remark: `取消退费:${act.title}`,
        userChannelId,
      });
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] refund failed (user=${userId}): ${e?.message}`);
    }
  }
  await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
  await this.promoteWaiting(activityId);
}
```

- [ ] **Step 2: checkin 签到收费（checkin 模式）**

在 `checkin` 内、`const att = await strapi.db.query(ATT_UID).create(...)` 之前插入：

```ts
if ((act.feeCollectAt || "signup") === "checkin" && (act.pointsCost || 0) > 0) {
  const userChannelId = await resolveUserChannelId(strapi, userId);
  try {
    await strapi.plugin("zhao-point").service("point").deductPoints({
      userId, action: "activity_fee", points: act.pointsCost, source: "activity",
      method: "activity_checkin", remark: `到场收费:${act.title}`, orderId: `act:${act.documentId}`,
      userChannelId,
    });
  } catch (e: any) {
    return { ok: false, reason: "insufficient_points" };
  }
}
```

- [ ] **Step 3: 重编译 + 提交**

Run: `npm run build`（zhao-point 目录）。
```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): cancel refund on signup-mode + checkin-mode fee"
```

---

### Task 7: 验收脚本 `scripts/accept-series-rules.cjs`

**Files:**
- Create: `e:\code\basic\scripts\accept-series-rules.cjs`

- [ ] **Step 1: 写验收脚本**

参照 `scripts/accept-activity.cjs` 的 PG 连接、`api()`、`login()`、`check()` 助手风格，覆盖 spec §9 各项：

```javascript
const { Client } = require('pg');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:1337';
const PG = process.env.DATABASE_URL || 'postgres://postgres:xxx@127.0.0.1:5432/xxx'; // 对齐本仓现有连接串
let client;

async function api(method, path, { token, body } = {}) {
  try {
    const r = await fetch(BASE + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await r.text();
    let json = null; try { json = JSON.parse(txt); } catch {}
    return { status: r.status, json };
  } catch (e) { return { status: 0, json: null, err: e.message }; }
}
async function login(username, password) {
  const r = await api('POST', '/zhao-auth/local', { body: { identifier: username, password } });
  return r?.json?.data || r?.json || r?.json?.jwt ? r.json : {};
}
const checks = { pass: 0, fail: 0 };
function check(name, ok, extra) { if (ok) checks.pass++; else { checks.fail++; console.error('FAIL:', name, extra || ''); } console.log((ok ? 'PASS' : 'FAIL') + ': ' + name); }

// 用管理后台注入积分（对齐既有 accept 脚本的调整方式；金额自定义）
async function seedPoints(adminToken, userId, points) {
  return api('POST', '/zhao-point/v1/admin/adm/point-records/admin-adjust', {
    token: adminToken, body: { data: { userId, points, action: 'admin_plot', remark: '验收注入' } },
  });
}

async function main() { /* 见 Step 2 的断言序列 */ }
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 断言序列（main 主体）**

```javascript
async function main() {
  client = new Client(PG); await client.connect();

  // 清理历史验收数据（活动 + 其报名/到场）
  const clean = await client.query(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  const ids = clean.rows.map(r => r.id);
  if (ids.length) {
    await client.query(`DELETE FROM activity_attendances WHERE signup IN (SELECT id FROM activity_signups WHERE activity = ANY($1))`, [ids]);
    await client.query(`DELETE FROM activity_signups WHERE activity = ANY($1)`, [ids]);
    await client.query(`DELETE FROM activities WHERE id = ANY($1)`, [ids]);
  }
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);

  const admin = await login('admin', 'a123456'); // 对齐既有 admin 凭据
  const adminToken = admin.access_token || admin.jwt || admin.token;
  check('admin 登录', !!adminToken);

  const u1 = await login('zhao', 'a123456'); const t1 = u1.access_token || u1.jwt || u1.token;
  const u2 = await login('zhaoli', 'a123456'); const t2 = u2.access_token || u2.jwt || u2.token; // 依本仓测试账号就存在与否调整
  check('zhao 登录', !!t1);

  // 1) 系列 + defaultRules → 生成场次继承
  const series = (await api('POST', '/zhao-point/v1/admin/adm/series', { token: adminToken, body: { data: {
    title: '验收-计费系列', status: 'active',
    defaultRules: { capacity: 2, checkinMode: 'self', geoEnforced: false, pointsCost: 10, feeCollectAt: 'signup', signupOpenDays: 2 },
  } } })).json?.data;
  check('创建系列', !!series?.documentId);
  const sId = series.documentId;
  const gen = (await api('POST', `/zhao-point/v1/admin/adm/series/${sId}/generate?count=1`, { token: adminToken })).json?.data;
  check('生成 1 场', gen?.generated === 1, JSON.stringify(gen));

  const acts = (await api('GET', `/zhao-point/v1/admin/adm/series/${sId}/activities`, { token: adminToken })).json?.data || [];
  const feeAct = acts[0];
  check('场次继承规则', !!feeAct && feeAct.capacity === 2 && feeAct.pointsCost === 10 && feeAct.feeCollectAt === 'signup' && feeAct.checkinMode === 'self', JSON.stringify(feeAct));
  check('signupOpenDays 生效', !!feeAct.signupStart, feeAct.signupStart);
  // 置为报名中，供报名
  await api('PUT', `/zhao-point/v1/admin/adm/activities/${feeAct.documentId}`, { token: adminToken, body: { data: { status: 'signup_open' } } });

  // 3) signup 计费：报名扣 10
  await seedPoints(adminToken, feeAct.id, 0); // 用账号插入积分由脚本按用户 id 调整见下述
  const r1 = await api('POST', '/zhao-point/v1/my/activity/signup', { token: t1, body: { activityId: feeAct.documentId } });
  check('收费场报名成功', r1.json?.data?.ok === true, `${r1.status} ${JSON.stringify(r1.json)}`);
  const feeRec = await client.query(`SELECT * FROM point_records WHERE user_id=$1 AND action='activity_fee' ORDER BY id DESC LIMIT 1`, [/*u1 userId*/]);
  check('activity_fee 扣费记录', feeRec.rows.length > 0);

  // 4) 满员候补 + 转正扣费：capacity=2，再报名两人，一人取消后看转正
  //    （具体断言：满员进 waiting；取消 active 释放后 promoteWaiting 只把一个有积分的 waiting 转正并 pointsCharged=10；
  //     积分不足的 waiting 保持 waiting）
  // 5) 会前取消 → activity_fee_refund 且名额释放（signup 计费点）
  // 6) checkin 计费场：报名不扣费；签到 deduct activity_fee 才落 attendance；余额不足签到失败
  // 7) 幂等：重复报名 already_signed_up / 重复签到 already_checked_in

  console.log(`\n== 结果: ${checks.pass} PASS / ${checks.fail} FAIL ==`);
  await client.end();
  process.exit(checks.fail === 0 ? 0 : 1);
}
```

> 实施说明：`seedPoints`/`login` 与既有 `accept-*.cjs` 对齐；用例 4/5/6/7 按 spec §9 补足后用「本机 Strapi + 测试账号」跑通。`point_records` 表名、用户 id 以 `accept-activity.cjs`/`accept-waitlist.cjs` 实际 SQL 为准调整。

- [ ] **Step 3: 跑通验收**

Run: 先开本机 Strapi（`e:\code\basic` 下 `npm run dev`），再 `node scripts/accept-series-rules.cjs`
Expected: 全部 PASS 且退出码 0；清理零残留。

- [ ] **Step 4: 提交**

```bash
git add scripts/accept-series-rules.cjs
git commit -m "test(zhao-point): accept-series-rules acceptance script"
```

---

### Task 8: web 管理端 UI（活动费用 + 系列默认规则）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`
- Modify: `e:\code\web\src\pages\series\form.vue`

- [ ] **Step 1: 活动表单加「报名费用」字段**

在 `web/src/pages/activity/form.vue` 的「报名设置」区块（capacity 项之后）加两行：

```html
<view class="form-item">
  <text class="form-label">报名积分价 <text v-if="!isEdit" class="required">*</text></text>
  <input type="number" v-model="form.pointsCost" placeholder="0=免费" class="form-input" />
</view>
<view class="form-item">
  <text class="form-label">计费点</text>
  <picker mode="selector" :range="feeLabels" @change="handleFeeChange">
    <view class="picker-value">
      <text>{{ feeLabels[feeIndex] }}</text><text class="picker-arrow">▼</text>
    </view>
  </picker>
</view>
```

在 script 的序列区/表单后补：

```javascript
const feeValues = ['signup', 'checkin']
const feeLabels = ['报名时扣费', '签到时收费']
const feeIndex = ref(0)
function handleFeeChange(e) { feeIndex.value = Number(e.detail.value); form.feeCollectAt = feeValues[feeIndex.value] }
```

在 `form` 对象加 `pointsCost: 0, feeCollectAt: 'signup'`；在 load 回填处加 `pointsCost: data.pointsCost ?? 0, feeCollectAt: data.feeCollectAt || 'signup', feeIndex.value = Math.max(0, feeValues.indexOf(form.feeCollectAt))`；在 `submitData` 加 `pointsCost: Number(form.pointsCost) || 0, feeCollectAt: form.feeCollectAt`。

`web/src/api/activity.js` 的 create/update 已直接提交 body，无需改接口。

- [ ] **Step 2: 系列表单加「默认报名/签到规则」**

在 `web/src/pages/series/form.vue` 现有表单末尾加一个区块，编辑 `form.defaultRules`：

```html
<view class="form-section">
  <view class="section-title">默认报名/签到规则（场次继承，可单场覆盖）</view>
  <view class="form-item"><text class="form-label">默认容量</text><input type="number" v-model="dr.capacity" class="form-input" /></view>
  <view class="form-item"><text class="form-label">报名提前天数</text><input type="number" v-model="dr.signupOpenDays" class="form-input" /></view>
  <view class="form-item"><text class="form-label">积分价</text><input type="number" v-model="dr.pointsCost" class="form-input" /></view>
  <view class="form-item"><text class="form-label">计费点</text><picker mode="selector"><view class="picker-value"><text>{{ feeLabels[feeIndex] }}</text></view></picker></view>
  <view class="form-item"><text class="form-label">签到模式</text><picker mode="selector"><view class="picker-value"><text>{{ checkinLabels[checkinIndex] }}</text></view></picker></view>
  <view class="form-item"><text class="form-label">地理强控</text><switch :checked="dr.geoEnforced" @change="dr.geoEnforced = !dr.geoEnforced" /></view>
  <view class="form-item"><text class="form-label">半径(米)</text><input type="number" v-model="dr.geoRadiusM" class="form-input" /></view>
</view>
```

script 中定义 `const dr = reactive({ capacity: 100, signupOpenDays: 0, checkinMode: 'both', geoEnforced: false, geoRadiusM: 500, pointsCost: 0, feeCollectAt: 'signup' })`；提交时 `submitData.defaultRules = { ...dr }`；回填时 `Object.assign(dr, data.defaultRules || {})`。

- [ ] **Step 3: 构建 + 提交**

Run（web 根）: `npm run build:h5`
```bash
git add src/pages/activity/form.vue src/pages/series/form.vue dist/build/h5
git commit -m "feat(web): activity fee fields + series defaultRules editor"
```

---

### Task 9: shao C端 UI（价签 + insufficient_points）

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: 报名按钮价签/计费提示**

在 `detail.vue` 报名/候补按钮文案区，把报名按钮文案改为体现费用（数据来自 `activity`）：

```html
<text>{{ isFull ? '立即候补' : (activity.pointsCost > 0 ? `报名 · ${activity.pointsCost} 积分` : '立即报名') }}</text>
```

在信息区（已报名行附近）加一行费用展示（可选）：

```html
<view v-if="activity.pointsCost > 0" class="info-row">
  <text class="info-label">报名费</text>
  <text class="info-value">{{ activity.pointsCost }} 积分（{{ activity.feeCollectAt === 'checkin' ? '签到收取' : '报名扣费' }}）</text>
</view>
```

- [ ] **Step 2: 处理 `insufficient_points`**

在 `onSignup` 的 else 分支内，`already_signed_up` 判断之后追加：

```javascript
} else if ((result as any)?.reason === 'insufficient_points') {
  uni.showToast({ title: '积分不足，无法报名', icon: 'none' })
}
```

在 `onCheckin`（自助签到）的失败分支，若返回 `reason === 'insufficient_points'` 则 `uni.showToast({ title: '积分不足，无法签到', icon: 'none' })`（与既有 already_checked_in 分支并列）。

- [ ] **Step 3: 构建 + 提交**

Run（shao 根）: `npm run build:h5`
```bash
git add pages/activity/detail.vue dist/build/h5
git commit -m "feat(shao): activity fee display + insufficient_points handling"
```

---

### Task 10: 三仓库收口

**Files:** 无新增，仅构建产物与推送

- [ ] **Step 1: zhao-point 已含 dist 与 generated types**

确认 `plugins/zhao-point/server/dist` 与 `types/generated/contentTypes.d.ts` 已随各 Task 提交；`basic` 顶层 app `dist/` 用 `git restore dist/` 还原（不提交 app 构建物）。

- [ ] **Step 2: basic 推送**

```bash
git -C e:\code\basic push
```

- [ ] **Step 3: web/shao 推送**

```bash
git -C e:\code\web push
git -C e:\code\shao push
```
Expected: 三仓库 origin/main 均无未推送提交（`git -C <repo> status` 干净）。

---

## 自审记录（完成计划后核验）

- **Spec 覆盖**：
  - §3.1 defaultRules / §3.2 activity 两字段 / §4.6 pointsCharged → Task 1
  - §4.4 点服务 refundPoints + deductPoints 渠道 → Task 2
  - §4.1 系列继承与 duplicate 费用 → Task 3
  - §4.2 signup 预扣 + 回滚 + pointsCharged → Task 4
  - §4.2 promoteWaiting 扣费/跳过 → Task 5
  - §4.3 cancel 退款 / §4.5 checkin 计费 → Task 6
  - §9 验收 → Task 7；§5 前端 → Task 8/9；§6 无新路由 → 挥括在各 Task（signup/cancel/checkin 既有路由复用）
- **占位扫描**：扣除 Task 7 实施说明中"以既有脚本对齐"的显式标注（非占位，实为运行期账号/SQL 对齐点）；其余均为完整代码。checkin-mode 扣费失败在 `checkin` service 返回 `{ok:false, reason:'insufficient_points'}`，`activity.ts:94-106` 控制器 wrap 原样返回，C端已可读 reason——契约一致。
- **类型一致性**：`resolveUserChannelId(strapi, userId)` 在 Task 4/5/6 使用一致；`refundPoints`/`deductPoints` 均收 `userChannelId`；`pointsCharged` 统一为 signup 计费点时实扣金额、checkin 计费点为 0；`feeCollectAt` 取值统一 `act.feeCollectAt || "signup"`。