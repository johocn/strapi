# 线下活动报名时间联动 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将活动「报名截止」建模为相对活动开始时间的提前量 n（整数小时），实现报名开始/结束/活动开始三时间双向联动与校验。

**Architecture:** 新增 `signupAdvanceHours`（integer，允许 ≤0）字段，仅 `n>0` 时联动 `signupEnd = startTime - n`，`n≤0` 时 signupEnd 完全手动不调整。前端（web 运营端 form.vue）负责联动计算与回填；后端仅补轻量时间关系校验防绕过；C 端零改动（`signupEnd` 仍为唯一权威）。

**Tech Stack:** Strapi 5（zhao-point 插件）、uni-app（web 运营端）、PostgreSQL

---

## 文件结构

- 修改 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`：新增 `signupAdvanceHours` 字段
- 修改 `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`：adminCreate/adminUpdate 时间关系校验
- 修改 `e:\code\web\src\pages\activity\form.vue`：报名设置区 UI 与联动逻辑
- 新增 `e:\code\basic\scripts\accept-activity-signup-time.cjs`：验收脚本

---

### Task 1: 后端 schema 新增字段 + admin 时间关系校验

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json:21-22`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts:246-302`

- [ ] **Step 1: schema 新增 signupAdvanceHours 字段**

在 `activity/schema.json` 的 `"signupEnd": { "type": "datetime" },` 之后插入：

```json
    "signupAdvanceHours": { "type": "integer", "default": 0 },
```

- [ ] **Step 2: adminCreate 加时间关系校验**

在 `activity.ts` 的 `adminCreate` 中，排期冲突校验块（`if (body.startTime && body.endTime ...)`）之后、`strapi.documents(ACTIVITY_UID).create` 之前插入：

```ts
      // 时间关系校验（报名结束晚于报名开始、活动结束晚于活动开始）
      if (body.signupStart && body.signupEnd && new Date(body.signupEnd) <= new Date(body.signupStart)) {
        ctx.status = 400; ctx.body = { error: "报名结束时间必须晚于报名开始时间" }; return;
      }
      if (body.startTime && body.endTime && new Date(body.endTime) <= new Date(body.startTime)) {
        ctx.status = 400; ctx.body = { error: "活动结束时间必须晚于活动开始时间" }; return;
      }
```

- [ ] **Step 3: adminUpdate 加时间关系校验（含 existing 兜底）**

在 `adminUpdate` 中，`const venueId = ...` 之后、排期冲突校验块之前插入：

```ts
      const signupStart = body.signupStart ?? existing.signupStart;
      const signupEnd = body.signupEnd ?? existing.signupEnd;
      if (signupStart && signupEnd && new Date(signupEnd) <= new Date(signupStart)) {
        ctx.status = 400; ctx.body = { error: "报名结束时间必须晚于报名开始时间" }; return;
      }
      if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        ctx.status = 400; ctx.body = { error: "活动结束时间必须晚于活动开始时间" }; return;
      }
```

- [ ] **Step 4: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功（TS 类型告警不影响产物）；`types/generated/contentTypes.d.ts` 重新生成含 `signupAdvanceHours`

- [ ] **Step 5: 冒烟验证（需 dev 服务已重启加载新 dist）**

Run:
```
curl.exe -s -X POST http://127.0.0.1:1337/api/zhao-point/v1/admin/adm/activities -H "Content-Type: application/json" -H "Authorization: Bearer <ADMIN_JWT>" -d "{\"data\":{\"title\":\"t\",\"capacity\":10,\"signupStart\":\"2026-08-25T10:00\",\"signupEnd\":\"2026-08-25T09:00\"}}"
```
Expected: HTTP 400，body 含 `报名结束时间必须晚于报名开始时间`

---

### Task 2: web form.vue 逻辑（data / 联动函数 / 回填 / 提交校验）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`

- [ ] **Step 1: data 新增 signupAdvanceHours**

在 `form` reactive 对象中 `signupEnd: ''` 之后加：

```js
  signupEnd: '',
  signupAdvanceHours: 0,
```

- [ ] **Step 2: onDatetime 改造 + 新增联动/工具函数**

将现有 `onDatetime`（L835-840）替换为：

```js
function onDatetime(key, part, value) {
  const cur = form[key] || ''
  const date = part === 'date' ? value : datePart(cur)
  const time = part === 'time' ? value : timePart(cur)
  form[key] = `${date}T${time}`
  if (key === 'startTime') applySignupAdvance()   // 改活动开始 → 按 n 无条件联动报名截止
  if (key === 'signupEnd') backfillAdvance()      // 改报名结束 → 反推 n 并对齐
}
```

在 `toLocalDT`（L841-843）之后新增：

```js
// startTime 减去 n 小时后返回本地 "YYYY-MM-DDTHH:mm"
function minusHours(iso, n) {
  if (!iso || !Number.isFinite(n)) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  d.setHours(d.getHours() - Math.floor(n))
  return `${datePart(d)}T${timePart(d)}`
}
function nowLocalDT() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
// 提前量输入：n>0 时 signupEnd = startTime - n；n<=0 不调整
function onAdvanceInput(e) {
  const v = parseInt((e && e.detail && e.detail.value), 10)
  form.signupAdvanceHours = Number.isFinite(v) ? v : 0
  applySignupAdvance()
}
// 联动（改 startTime 或提前量触发）：
//  n>0：signupEnd = startTime - n（跟随）
//  n<=0 且 signupEnd 已设置：不调整（手动管理）
//  n<=0 且 signupEnd 尚未设置（新建默认）：signupEnd = startTime（活动开始即截止）
function applySignupAdvance() {
  if (!form.startTime) return
  if (form.signupAdvanceHours > 0) {
    form.signupEnd = minusHours(form.startTime, form.signupAdvanceHours)
  } else if (!form.signupEnd) {
    form.signupEnd = form.startTime
  }
}
// 改报名结束时间时反推 n=floor(d)（允许负/0）；n>0 覆盖对齐到整数小时，n<=0 保留手设绝对时间
function backfillAdvance() {
  if (!form.startTime || !form.signupEnd) return
  const d = (new Date(form.startTime) - new Date(form.signupEnd)) / 3600000
  const n = Math.floor(d)
  form.signupAdvanceHours = n
  if (n > 0) form.signupEnd = minusHours(form.startTime, n)
}
// 报名设置区提示文本（n<=0 且报名截止晚于活动开始时提示）
function advanceTip() {
  if (form.signupAdvanceHours > 0 || !form.startTime || !form.signupEnd) return ''
  return new Date(form.signupEnd) >= new Date(form.startTime)
    ? '报名截止晚于活动开始时间，提前量不生效（活动开始后仍可报名）'
    : ''
}
```

- [ ] **Step 3: 新建初始化 signupStart 默认当前时间**

在 `onMounted`（L1364-1369）中 `loadDetail()` 之前加：

```js
  if (!isEdit.value) form.signupStart = nowLocalDT()
```

- [ ] **Step 4: 编辑回填反推 n**

在 `loadDetail` 的 `Object.assign(form, data, {...})` 中，`signupEnd: toLocalDT(data.signupEnd),` 之后加：

```js
      signupEnd: toLocalDT(data.signupEnd),
      signupAdvanceHours: data.startTime && data.signupEnd
        ? (() => {
            const n = Math.floor((new Date(data.startTime) - new Date(data.signupEnd)) / 3600000)
            return n
          })()
        : 0,
```

- [ ] **Step 5: 提交携带 + 保存前校验**

在 `submitData` 对象中 `signupEnd: form.signupEnd,` 之后加：

```js
    signupEnd: form.signupEnd,
    signupAdvanceHours: form.signupAdvanceHours,
```

在保存函数（L1230 `if (!form.capacity ...)` 之后）插入：

```js
  if (form.signupStart && form.signupEnd && new Date(form.signupEnd) <= new Date(form.signupStart)) {
    return uni.showToast({ title: '报名结束时间必须晚于报名开始时间', icon: 'none' })
  }
  if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
    return uni.showToast({ title: '活动结束时间必须晚于活动开始时间', icon: 'none' })
  }
  if (!isEdit.value && form.signupStart && new Date(form.signupStart) < new Date()) {
    return uni.showToast({ title: '报名开始时间不能早于当前时间', icon: 'none' })
  }
```

- [ ] **Step 6: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 编译成功，无 JS 错误

---

### Task 3: web form.vue 模板（报名设置区 UI）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue:257-288`

- [ ] **Step 1: 替换报名设置区「报名开始/报名结束」为带提前量的新结构**

将 L257-288 的 `form-row`（报名开始/报名结束两个 half）整体替换为：

```html
        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">报名开始</text>
            <picker mode="date" :value="datePart(form.signupStart)" @change="onDatetime('signupStart', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.signupStart) }">{{ datePart(form.signupStart) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.signupStart)" @change="onDatetime('signupStart', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.signupStart) }">{{ timePart(form.signupStart) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <text v-if="!form.signupStart" class="form-tip">默认当前时间，立即开始</text>
          </view>
          <view class="form-item half">
            <text class="form-label">报名结束</text>
            <picker mode="date" :value="datePart(form.signupEnd)" @change="onDatetime('signupEnd', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.signupEnd) }">{{ datePart(form.signupEnd) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.signupEnd)" @change="onDatetime('signupEnd', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.signupEnd) }">{{ timePart(form.signupEnd) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">提前截止（小时）</text>
          <input type="number" :value="form.signupAdvanceHours" @input="onAdvanceInput" placeholder="0=活动开始时截止" class="form-input" />
          <text v-if="advanceTip()" class="form-tip">{{ advanceTip() }}</text>
        </view>
```

- [ ] **Step 2: 构建验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 编译成功，无模板/JS 错误

---

### Task 4: 验收脚本 + 整体回归 + 收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-signup-time.cjs`
- Modify: 无

- [ ] **Step 1: 写验收脚本**

创建 `e:\code\basic\scripts\accept-activity-signup-time.cjs`：

```js
/* 线下活动报名时间联动 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-signup-time.cjs
 * 覆盖(对齐实施计划):
 *  1. adminCreate 校验：signupEnd<=signupStart → 400；endTime<=startTime → 400
 *  2. adminCreate 正常：signupAdvanceHours 字段落库可读回
 *  3. adminUpdate 校验：signupEnd<=signupStart → 400（含 existing 兜底）
 *  4. adminUpdate 正常：改 signupAdvanceHours → 200 存库
 *  5. 零残留：创建的活动与测试用户全部清理
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'ast_'; // 测试用户名前缀

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
async function waitForAdmin() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;
const q = async (sql, params) => (await client.query(sql, params)).rows;

const day = (offsetMin) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function main() {
  client = new Client(PG);
  await client.connect();

  // 清理上次残留
  await client.query(`DELETE FROM up_users WHERE username LIKE $1`, [`${PF}%`]);
  await client.query(`DELETE FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);

  const admin = await waitForAdmin();
  const adminToken = tokenOf(admin);
  check('admin 登录', !!adminToken);

  // 1. adminCreate: signupEnd <= signupStart → 400
  let r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-报名时间-1', capacity: 10, signupStart: day(120), signupEnd: day(60), status: 'draft' },
  });
  check('create signupEnd<=signupStart 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 2. adminCreate: endTime <= startTime → 400
  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-报名时间-2', capacity: 10, startTime: day(120), endTime: day(60), status: 'draft' },
  });
  check('create endTime<=startTime 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 3. adminCreate: 正常 + signupAdvanceHours 落库
  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title: '验收-报名时间-3', capacity: 10,
      startTime: day(480), endTime: day(540),
      signupStart: day(-60), signupEnd: day(480 - 120), signupAdvanceHours: 120, status: 'draft',
    },
  });
  const act3 = r.json?.data || r.json;
  check('create 正常', r.status === 200, `status=${r.status} ${JSON.stringify(r.json)}`);
  const docId3 = act3?.documentId;
  check('create signupAdvanceHours 落库', act3?.signupAdvanceHours === 120, `got=${act3?.signupAdvanceHours}`);

  // 4. adminUpdate: signupEnd<=signupStart → 400（existing 兜底）
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupEnd: day(60), signupStart: day(120) },
  });
  check('update signupEnd<=signupStart 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 5. adminUpdate: 正常改 signupAdvanceHours → 存库
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupAdvanceHours: 96 },
  });
  const act5 = r.json?.data || r.json;
  check('update signupAdvanceHours 存库', r.status === 200 && act5?.signupAdvanceHours === 96, `got=${act5?.signupAdvanceHours}`);

  // 5b. adminUpdate: 负提前量（报名截止晚于活动开始）→ 允许存储
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupAdvanceHours: -2 },
  });
  const act5b = r.json?.data || r.json;
  check('update signupAdvanceHours 负值可存', r.status === 200 && act5b?.signupAdvanceHours === -2, `got=${act5b?.signupAdvanceHours}`);

  // 6. 零残留
  if (docId3) await api('DELETE', `/zhao-point/v1/admin/adm/activities/${docId3}`, { token: adminToken });
  await client.query(`DELETE FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);
  const left = await q(`SELECT count(*)::int AS c FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);
  check('活动零残留', left[0].c === 0, `left=${left[0].c}`);

  console.log(out.join('\n'));
  console.log(`\n结果: PASS ${PASS} / FAIL ${FAIL}`);
  await client.end();
  process.exit(FAIL ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行验收脚本**

Run: `cd e:\code\basic && node scripts/accept-activity-signup-time.cjs`
Expected: 全部 PASS，`结果: PASS 7 / FAIL 0`，退出码 0

- [ ] **Step 3: 整体回归**

Run: `cd e:\code\web && npm run build:h5`
Expected: 编译成功

- [ ] **Step 4: 收口清理**

1. 还原根 app dist：`cd e:\code\basic && git restore dist/`
2. 调试标记自查：`grep -rn "DEBUG\|\[DEBUG" e:\code\basic\plugins\zhao-point\server\src` → 无输出
3. 确认变更文件：插件源码 + `plugins/zhao-point/dist` + `types/generated/contentTypes.d.ts` + form.vue + 验收脚本 + 设计/计划文档

---

## 手动测试要点（前端联动，构建后人工验证）

1. 新建活动：报名开始默认当前时间；报名结束默认空；设活动开始时间 → 报名结束自动 = 活动开始
2. 提前量输入 2 → 报名结束 = 活动开始 − 2 小时
3. 手改报名结束为活动开始前 2.5 小时 → 提前量回填 2（floor），报名结束对齐为活动开始 − 2 小时
4. 手改报名结束晚于活动开始 → 提前量回填为负数/0，提示「报名截止晚于活动开始时间，提前量不生效」，报名结束保留原值
5. 改活动开始时间 → 仅 n>0 时报名结束跟随；n≤0 时不调整
6. 保存校验：报名结束 ≤ 报名开始 → 拦截；活动结束 ≤ 活动开始 → 拦截；新建时报名开始早于当前 → 拦截
7. 编辑已有活动：提前量按 `floor(startTime − signupEnd)` 回填（可为负/0）
