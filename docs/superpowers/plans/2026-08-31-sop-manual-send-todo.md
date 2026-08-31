# 省开销手动 SOP（待办列表 + 管理员微信提醒）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「活动前提醒 / 活动结束回放、未到场回访、复购」这些 SOP 从「自动发送给 C 用户」改为「事件驱动生成待办 + 微信提醒管理员手动发送」，报名成功确认保持自动，从而砍掉自动定时发送、降低服务器开销。

**Architecture:** 在 zhao-sso 现有 `sso-msg`/`sso-sop` 之上增加「手动 SOP 待办」表与「管理员提醒」；zhao-point 的报名/关闭埋点不再自动排期发 C 端，改为 `enqueueManualSop` 生成待办；管理员在 web 运营端待办列表点「发送」时，`dispatchManualTodo` 按 `audience` 实时查名单并逐条 `sso-msg.buildJob` 真正发送。全链路复用 `sso-msg`，不新增轮询/队列/依赖。

**Tech Stack:** Strapi zhao-sso（`sso-sop`/`sso-msg`/cron/content-type+admin route）；zhao-point activity service；uni-app web 运营端 h.joho.cn（Vue3 + Vant，禁改 vue/新增依赖）。

**Spec:** `docs/superpowers/specs/2026-08-31-sop-manual-send-todo-design.md`（R1=微信模板推管理员，R2=不兜底）

---

## 文件结构

- **zhao-sso 后端**
  - Create: `plugins/zhao-sso/server/src/content-types/manual-sop-todo/schema.json`
  - Create: `plugins/zhao-sso/server/src/content-types/manual-sop-todo/index.ts`
  - Modify: `plugins/zhao-sso/server/src/content-types/index.ts`（注册新 content-type）
  - Modify: `plugins/zhao-sso/server/src/services/sso-sop.ts`（新增 `enqueueManualSop`/`dispatchManualTodo`/`notifyAdmins`）
  - Create: `plugins/zhao-sso/server/src/controllers/sop-manual.ts`（list/dispatch/skip）
  - Modify: `plugins/zhao-sso/server/src/controllers/index.ts`
  - Modify: `plugins/zhao-sso/server/src/routes/admin.ts`（挂 `/sop-manual-todos` 路由）
  - Modify: `plugins/zhao-sso/server/src/bootstrap.ts`（seed 管理员通知模板 `admin_notify`）
  - Modify: `plugins/zhao-sso/server/src/config/index.ts` 或 config 插件配置（管理员 sso-user 名单，可后台配置）
  - **重建 dist**：`plugins/zhao-sso` 下 `npm run build`（铁律：只提交源码不重建 dist 会 404）

- **zhao-point 后端（埋点改造）**
  - Modify: `plugins/zhao-point/server/src/services/activity.ts`
    - L687-711 报名埋点：保留 `act_confirm` 自动；去掉 `act_before` 自动排期 → 改 `enqueueManualSop("activity.before", …)` 生成待办
    - L1200-1250 `closeActivity`：不再逐人自动 `act_receipt/act_repurchase/act_revisit` → 改生成 2 条待办（到场回放/复购、未到场回访）给管理员
  - **重建 dist**：`plugins/zhao-point` 下 `npm run build`

- **web 运营端**
  - Create: `e:\code\web\src\pages\sso\sop-manual-todo\list.vue`
  - Modify: `e:\code\web\src\pages.json`（注册路由）
  - Modify: `e:\code\web\src\api\…`（新增待办接口封装，参照既有 `sso/sop-rule` 封装风格）

---

### Task 1: 新增 `manual-sop-todo` 内容类型（zhao-sso）

**Files:**
- Create: `plugins/zhao-sso/server/src/content-types/manual-sop-todo/schema.json`
- Create: `plugins/zhao-sso/server/src/content-types/manual-sop-todo/index.ts`
- Modify: `plugins/zhao-sso/server/src/content-types/index.ts`

- [ ] **Step 1: 建 schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "sso_sop_manual_todos",
  "info": { "singularName": "manual-sop-todo", "pluralName": "manual-sop-todos", "displayName": "SSO Manual SOP Todo" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "code": { "type": "string", "required": true },
    "title": { "type": "string", "required": true },
    "scene": { "type": "string", "required": true },
    "templateCode": { "type": "string" },
    "link": { "type": "text" },
    "audience": { "type": "json" },
    "paramsTemplate": { "type": "json" },
    "status": { "type": "enumeration", "enum": ["open", "done", "skipped"], "default": "open", "required": true },
    "doneAt": { "type": "datetime" },
    "sentCount": { "type": "integer", "default": 0 },
    "description": { "type": "text" }
  }
}
```

- [ ] **Step 2: 建 index.ts**

```ts
"use strict";
export default {
  schema: require("./schema.json"),
};
```

- [ ] **Step 3: 注册到 content-types/index.ts**

```ts
// 在 export default 的集合里追加（参照既有 sop-rule 注册行）：
"manual-sop-todo": require("./manual-sop-todo"),
```

- [ ] **Step 4: 重建 dist 并验证**

Run: `cd plugins/zhao-sso && npm run build`
Expected: 构建成功无报错；`Grep dist 含 manual-sop-todo` 有命中。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/content-types
git commit -m "feat(sso): add manual-sop-todo content type"
```

---

### Task 2: `sso-sop` 新增手动待办编排（enqueue / dispatch / notifyAdmins）

**Files:**
- Modify: `plugins/zhao-sso/server/src/services/sso-sop.ts`

- [ ] **Step 1: 新增常量与三个方法**

在 `sso-sop.ts` 顶部常量区追加：

```ts
const MANUAL_TODO_UID = "plugin::zhao-sso.manual-sop-todo";
```

在 export default 对象中、`runDueJobs` 之后新增：

```ts
  /** 管理员接收手动 SOP 待办提醒的 sso-user 列表（来自插件配置，未配则跳过推送，保留后台待办列表）。 */
  adminNotifyUsers(): number[] {
    try {
      const cfg = (strapi.config.get("plugin::zhao-sso") as any)?.manualSop || {};
      const v = cfg.adminNotifyUsers;
      return Array.isArray(v) ? v.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  },

  /**
   * 事件埋点：为「手动 SOP」环节生成一条待办 + 微信提醒管理员。
   * 不在此刻发送任何 C 端消息；真正的发送在 dispatchManualTodo（管理员点发）时发生。
   */
  async enqueueManualSop(entry: {
    code: string;
    title: string;
    scene: string;
    templateCode?: string;
    link?: string;
    audience: Record<string, any>;
    paramsTemplate?: Record<string, any>;
    description?: string;
  }) {
    const doc = await strapi.db.query(MANUAL_TODO_UID).create({
      data: {
        code: entry.code,
        title: entry.title,
        scene: entry.scene,
        templateCode: entry.templateCode || null,
        link: entry.link || null,
        audience: entry.audience || {},
        paramsTemplate: entry.paramsTemplate || {},
        status: "open",
        description: entry.description || null,
      },
    });
    const notified = await this.notifyAdmins({ todoId: doc.id, scene: entry.scene, title: entry.title });
    return { todo: doc, notified };
  },

  /** 微信模板推送给管理员（sso-user），未配置名单则跳过（仅留后台待办列表）。 */
  async notifyAdmins({ todoId, scene, title }: { todoId: number; scene: string; title: string }) {
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const admins = this.adminNotifyUsers();
    let notified = 0;
    for (const adminSsoUserId of admins) {
      try {
        await msg.buildJob({
          user: adminSsoUserId,
          scene: "admin.sop",
          templateCode: "admin_notify",
          params: { todoTitle: title, todoId },
          link: `/admin/sso/sop-manual-todo/list`,
          dedupeKey: `sopManualNotify:${todoId}:${adminSsoUserId}`,
        });
        notified++;
      } catch (e: any) {
        strapi.log.warn(`[sso-sop] notifyAdmins failed (admin=${adminSsoUserId}): ${e.message}`);
      }
    }
    return notified;
  },

  /**
   * 管理员点发：按待办 audience 实时查目标 up_user 名单，逐条建 job。
   * audience 形态由调用方(zhao-point)按需约定；此处以通用「query object」委托给回调解释。
   */
  async dispatchManualTodo(todoId: number, resolveTargetUsers: (audience: any) => Promise<number[]>) {
    const todo = await strapi.db.query(MANUAL_TODO_UID).findOne({ where: { id: Number(todoId) } });
    if (!todo) throw new Error("待办不存在");
    if (todo.status !== "open") return { sent: 0, skipped: 1, reason: `status=${todo.status}` };
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const upUserIds = await resolveTargetUsers(todo.audience || {});
    let sent = 0;
    let skipped = 0;
    for (const upUserId of upUserIds) {
      const sso = await this.resolveSsoUserForUpUser(upUserId);
      if (!sso) { skipped++; continue; }
      try {
        await msg.buildJob({
          user: sso.id,
          scene: todo.scene,
          templateCode: todo.templateCode,
          params: (todo.paramsTemplate || {}),
          link: todo.link || undefined,
          dedupeKey: `sopManual:${todo.id}:${sso.id}`,
        });
        sent++;
      } catch (e: any) {
        skipped++;
        strapi.log.warn(`[sso-sop] dispatchManualTodo buildJob failed (user=${upUserId}): ${e.message}`);
      }
    }
    await strapi.db.query(MANUAL_TODO_UID).update({
      where: { id: todo.id },
      data: { status: "done", doneAt: new Date().toISOString(), sentCount: sent },
    });
    return { sent, skipped };
  },
```

> 注：`dispatchManualTodo` 刻意把「按 audience 解析名单」以 `resolveTargetUsers` 回调传入，由 zhao-point 注入活动报名/未到场/复购的具体查询。原因：zhao-sso 不反向依赖 zhao-point，保持单向依赖（记忆铁律）。

- [ ] **Step 2: 校验类型一致**

确认 `MANUAL_TODO_UID`、`todoId/sentCount/doneAt`、`resolveSsoUserForUpUser` 名称与本服务既有定义一致。

- [ ] **Step 3: 重建 dist**

Run: `cd plugins/zhao-sso && npm run build`、Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-sso/server/src/services/sso-sop.ts
git commit -m "feat(sso): manual SOP todo enqueue/dispatch + admin notify"
```

---

### Task 3: SOP 待办管理 API（controller + routes）

**Files:**
- Create: `plugins/zhao-sso/server/src/controllers/sop-manual.ts`
- Modify: `plugins/zhao-sso/server/src/controllers/index.ts`
- Modify: `plugins/zhao-sso/server/src/routes/admin.ts`

- [ ] **Step 1: 建控制器**

```ts
"use strict";
const TODO_UID = "plugin::zhao-sso.manual-sop-todo";
export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    try {
      const { status } = ctx.query;
      const where: any = {};
      if (status) where.status = status;
      const rows = await strapi.db.query(TODO_UID).findMany({ where, orderBy: { createdAt: "DESC" } });
      ctx.body = { data: rows };
    } catch (e: any) {
      ctx.status = 400; ctx.body = { error: e.message };
    }
  },
  async dispatch(ctx: any) {
    try {
      const sop = strapi.plugin("zhao-sso").service("sso-sop");
      const any: any = strapi.plugin("zhao-point");
      // 名单解析委托给 zhao-point（注入回调），避免 zhao-sso 反向依赖
      const resolveTargetUsers = (audience: any) =>
        any.service("activity-sop-audience").resolveAudience(audience);
      const res = await sop.dispatchManualTodo(ctx.params.id, resolveTargetUsers);
      ctx.body = res;
    } catch (e: any) {
      ctx.status = 400; ctx.body = { error: e.message };
    }
  },
  async skip(ctx: any) {
    try {
      await strapi.db.query(TODO_UID).update({
        where: { id: Number(ctx.params.id) },
        data: { status: "skipped", doneAt: new Date().toISOString() },
      });
      ctx.body = { ok: true };
    } catch (e: any) {
      ctx.status = 400; ctx.body = { error: e.message };
    }
  },
});
```

> 注：需在 zhao-point 提供 `activity-sop-audience` service 的 `resolveAudience`（见 Task 4.2）。若 zhao-sso controller 无法引用 zhao-point（插件加载顺序），则在 controller 内部用 `strapi.plugin("zhao-point")` 并做空判，缺失时报错勿崩溃。

- [ ] **Step 2: 注册控制器**

在 `controllers/index.ts` 追加 `"sop-manual": require("./sop-manual")`。

- [ ] **Step 3: 挂路由**

在 `routes/admin.ts` 的 routes 数组中、现有 `/msg/sop-stats` 附近追加：

```ts
adminRoute("GET", "/sop-manual-todos", "sop-manual.list", "sso.msg.read"),
adminRoute("POST", "/sop-manual-todos/:id/dispatch", "sop-manual.dispatch", "sso.msg.write"),
adminRoute("POST", "/sop-manual-todos/:id/skip", "sop-manual.skip", "sso.msg.write"),
```

- [ ] **Step 4: 重建 dist**

Run: `cd plugins/zhao-sso && npm run build`、Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/controllers plugins/zhao-sso/server/src/routes/admin.ts
git commit -m "feat(sso): SOP manual todo admin API"
```

---

### Task 4: zhao-point 埋点改造 + 名单解析 service

**Files:**
- Create: `plugins/zhao-point/server/src/services/activity-sop-audience.ts`
- Modify: `plugins/zhao-point/server/src/services/index.ts`
- Modify: `plugins/zhao-point/server/src/services/activity.ts`（报名埋点 L687、closeActivity L1200）

- [ ] **Step 1: 建名单解析 service**

`activity-sop-audience.ts`（按 `audience` 条件解析 up_user 名单，返回 up_user.id 数组）：

```ts
"use strict";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
export default ({ strapi }: { strapi: any }) => ({
  /**
   * 按手动 SOP 待办的 audience 条件解析目标 up_user 名单。
   * audience: { activityDocumentId, filter: "registered"|"noshow"|"recap"|"repurchase" }
   */
  async resolveAudience(audience: any) {
    const { activityDocumentId, filter } = audience || {};
    if (!activityDocumentId) return [];
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityDocumentId });
    if (!act) return [];
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active" },
      populate: ["user"],
    });
    return signs
      .filter((s: any) => {
        const attended = !!s.attendedAt;
        if (filter === "noshow") return !attended;
        if (filter === "recap" || filter === "registered") return true; // 回放/全体报名者
        if (filter === "repurchase") return attended; // 复购面向到场者
        return true;
      })
      .map((s: any) => s.user?.id ?? s.user)
      .filter((id: number | undefined) => Number.isFinite(id));
  },
});
```

- [ ] **Step 2: 注册该 service**

在 `services/index.ts` 追加 `"activity-sop-audience": require("./activity-sop-audience")`。

- [ ] **Step 3: 改造报名埋点（activity.ts L687-711）**

把自动 `act_before` 排期改为生成「活动前提醒」待办（预留名单=全体报名者）；同时保留 `act_confirm` 自动确认：

```ts
    // SOP 埋点：报名确认自动 + 活动前提醒改为生成待办（管理员手动发，省轮询开销）
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(userId);
        const actDocId = act.documentId;
        // 生成活动前提醒待办（幂等：同一活动同场景仅一条 open 待办，见下方去重）
        const leadMin = Number(act.remindLeadMinutes ?? 1440);
        const todoKey = `act_before:${actDocId}`;
        const existingTodo = leadMin >= 0
          ? await strapi.db.query("plugin::zhao-sso.manual-sop-todo").findOne({ where: { code: todoKey, status: "open" } })
          : null;
        if (!existingTodo) {
          await sop.enqueueManualSop({
            code: todoKey,
            title: `活动前提醒待办：${act.title}`,
            scene: "activity.before",
            templateCode: "act_before",
            audience: { activityDocumentId: actDocId, filter: "registered" },
            paramsTemplate: { activityName: "payload.activity.name" },
            link: null,
          });
        }
        // 报名确认仍自动发
        if (sso) {
          await sop.trigger("activity.signup", {
            user: sso.id,
            payload: { activity: { name: act.title, startTime: act.startTime } },
            schedules: [{ templateCode: "act_confirm", scene: "activity.confirm" }],
          });
        }
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] sop activity.signup embed failed: ${e.message}`);
    }
```

> 注意：上本人用于 `trigger` 的 `user` 是 sso 解析；`enqueueManualSop` 不依赖 user（待办是给管理员的）。去重条件 `code=act_before:{actDocId} && status=open` 替代代码行前的自动排期。

- [ ] **Step 4: 改造 closeActivity（activity.ts L1200-1250）**

不再逐人自动下发，改为生成「到场复购/回访」等待办（复用 `enqueueManualSop`）：

```ts
  async closeActivity(activityId: string) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    if (act.status === "ended" || act.status === "archived") {
      return { ok: true, closed: false, already: true, todosGenerated: 0 };
    }
    await strapi.documents("plugin::zhao-point.activity").update({ documentId: activityId, data: { status: "ended" } });
    const actDocId = act.documentId;
    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    let todosGenerated = 0;
    if (sop) {
      // 到场者：活动回放触达 + 复购跟进（各一条待办，管理员手动发）
      for (const [code, scene, template, title, filter] of [
        ["act_recap", "activity.recap", "act_receipt", `活动回放触达待办：${act.title}`, "recap"],
        ["act_repurchase", "activity.repurchase", "act_repurchase", `复购跟进待办：${act.title}`, "repurchase"],
        ["act_noshow", "activity.noshow", "act_revisit", `未到场回访待办：${act.title}`, "noshow"],
      ] as [string, string, string, string, string][]) {
        const key = `${code}:${actDocId}`;
        const existing = await strapi.db
          .query("plugin::zhao-sso.manual-sop-todo")
          .findOne({ where: { code: key, status: "open" } });
        if (existing) continue;
        await sop.enqueueManualSop({
          code: key,
          title,
          scene,
          templateCode: template,
          audience: { activityDocumentId: actDocId, filter },
          paramsTemplate: { activityName: "payload.activity.name" },
          link: null,
        });
        todosGenerated++;
      }
    }
    // 台账自动快照照旧
    try {
      await strapi.plugin("zhao-point").service("activity-ledger").generateAutoIfAbsent(activityId);
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] ledger auto-generate failed: ${e.message}`);
    }
    return { ok: true, closed: true, todosGenerated };
  },
```

> 说明：原 `act_receipt` 立即发给到场者、`act_repurchase` 次日、`act_revisit` 次日，改为由管理员点发；泄漏到场的实名单由 `resolveAudience` 在点发时实时计算（filter 区分 recap/repurchase/noshow）。

- [ ] **Step 5: 重建 dist 并自检**

Run: `cd plugins/zhao-point && npm run build`
Expected: 成功；`Grep dist 含 activity-sop-audience`、`enqueueManualSop` 有命中。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-point/server/src
git commit -m "feat(point): manual SOP todos from activity signup/close, audience resolver"
```

---

### Task 5: web 运营端待办列表页

**Files:**
- Create: `e:\code\web\src\pages\sso\sop-manual-todo\list.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\api\…\…`（待办接口封装，参照既有样式）

- [ ] **Step 1: 写 list.vue（列表 + 发送/跳过）**

```vue
<template>
  <view class="page">
    <view class="filters">
      <view v-for="s in STATUS" :key="s.value" class="seg" :class="{active: status===s.value}" @click="status=s.value; load()">{{ s.label }}</view>
    </view>
    <view class="card" v-for="t in list" :key="t.id">
      <view class="card-title">{{ t.title }}</view>
      <view class="card-meta">状态: {{ t.status }} · 已发: {{ t.sentCount ?? 0 }} · {{ t.createdAt?.slice(0,16) }}</view>
      <view class="actions" v-if="t.status==='open'">
        <button class="btn primary" @click="dispatch(t.id)">发送</button>
        <button class="btn" @click="skip(t.id)">跳过</button>
      </view>
    </view>
    <view class="empty" v-if="!list.length">暂无待办</view>
  </view>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { listSopManualTodos, dispatchSopManualTodo, skipSopManualTodo } from '@/api/sopManualTodo'
const STATUS = [{ value: '', label: '全部' }, { value: 'open', label: '待处理' }, { value: 'done', label: '已发送' }]
const status = ref('')
const list = ref([])
async function load() {
  const res = await listSopManualTodos(status.value)
  list.value = (res?.data || []).map(r => r.attributes || r)
}
async function dispatch(id) {
  const res = await dispatchSopManualTodo(id)
  uni.showToast({ title: `已发送 ${res.sent} 条`, icon: 'none' })
  load()
}
async function skip(id) {
  await skipSopManualTodo(id)
  uni.showToast({ title: '已跳过', icon: 'none' })
  load()
}
onMounted(load)
</script>
<style scoped>
/* 参照 sso/sop-rule/list.vue 的卡片/分段样式，保证视觉一致 */
</style>
```

- [ ] **Step 2: 封装 API 文件** `e:\code\web\src\api\sopManualTodo.js`

```js
import request from '@/utils/request' // 或项目既有 request 封装（参照 api 目录其他文件）
const B = '/api/zhao-sso/v1/admin'
export const listSopManualTodos = (status) => request({ url: `${B}/sop-manual-todos`, method: 'GET', params: { status } })
export const dispatchSopManualTodo = (id) => request({ url: `${B}/sop-manual-todos/${id}/dispatch`, method: 'POST' })
export const skipSopManualTodo = (id) => request({ url: `${B}/sop-manual-todos/${id}/skip`, method: 'POST' })
```

> 注：`/api/zhao-sso/v1/admin` 前缀依据现有消息中心封装核对；B 前缀常量与项目既有用法保持一致（记忆：管理端双前缀 `/v1/admin`）。

- [ ] **Step 3: 注册路由**

`pages.json` 参照既有 `sso/sop-rule/list` 注册行追加：

```json
{ "path": "sso/sop-manual-todo/list", "style": { "navigationBarTitleText": "手动 SOP 待办" } }
```

- [ ] **Step 4: 构建**

Run: `cd e:\code\web && npm run build:h5`
Expected: 成功。产物含待办页 chunk。

- [ ] **Step 5: Commit**

```bash
cd /e/code/web && git add src/pages/sso/sop-manual-todo src/api/sopManualTodo.js src/pages.json
git commit -m "feat(web): manual SOP todo list page"
```

---

### Task 6: 部署与线上验证

**Files:**
- 依赖：Task 1-5 已 commit 且两个插件 dist 已重建。

- [ ] **Step 1: 推送**

```powershell
$env:GIT_SSH_COMMAND = "ssh -i C:\Users\Administrator\.ssh\id_ed25519 -o IdentitiesOnly=yes"
git push origin main   # 在 e:\code\basic 与 e:\code\web 各 push
```

- [ ] **Step 2: 服务器部署（basic）**

```bash
ssh joho "bash /www/apps/strapi/docs/deployment/deploy.sh"
```

> 注意：本次新增 content-type 与 service，Strapi 重启会建表；若部署脚本 `npm install` 无新增依赖则安全。

- [ ] **Step 3: 验证**

```bash
ssh joho "curl -s -o /dev/null -w '%{http_code}' http://localhost:1337/_health; echo health"
ssh joho "curl -s -o /dev/null -w '%{http_code}' http://localhost:1337/api/zhao-sso/v1/admin/sop-manual-todos; echo todos(需登录,应401/403 而非404)"
```

Expected: health 204；todos 未登录 401/403（说明路由注册成功、非 404）。

- [ ] **Step 4: 操作回归**

- 用已登录运营 token 调 `GET /sop-manual-todos` 应返回 list。
- 手工造一条 `open` 待办（临时在 activity/closeActivity 流程或 DB），点 `dispatch` 应返回 `{sent, skipped}` 并将待办置 `done`。

---

## Self-Review

**Spec 覆盖：**
- 报名确认自动（保留 `act_confirm`）→ Task 4.3 ✅
- 活动前/回放/未到场/复购改手动 → Task 4.3/4.4 生成待办 ✅
- 双通道：后台待办列表（Task 5）+ 微信提醒管理员（Task 2 `notifyAdmins` + seed 模板）→ 管理员名单未配则仅列表 ✅
- 名单实时查不预存 → Task 4.1 `resolveAudience` ✅
- 复用 `sso-msg`、不新增轮询/队列/依赖 → 各 Task 显式遵守 ✅
- R1(微信模板推管理员)、R2(不兜底) 已吸收 ✅
- admin API GET/POST dispatch/skip → Task 3 ✅

**占位扫描：** 无 TBD；`admin_notify` 模板 seed 需在 Task 2 的 bootstrap 中补 seed（若现有 bootstrap 已 seed 活动模板，追加一条 `admin_notify` 模板与版本，参照 activity 模板 seed 代码）。请执行时补：`bootstrap.ts` 的 DEFAULT_SOP_TEMPLATES 或同类数组增加 `{ code:'admin_notify', ... }`，并在 Task 2 commit 含该 seed。

**类型一致性：** `enqueueManualSop` 入参字段与 `manual-sop-todo/schema.json` attributes 一致（code/title/scene/templateCode/link/audience/paramsTemplate/description）；`dispatchManualTodo` 返回 `{sent, skipped}` 与 Task 3/5 消费一致；`resolveAudience` 返回 `number[]`（up_user.id）与 `dispatchManualTodo` 内 `resolveSsoUserForUpUser` 输入一致。

## Execution Handoff

两项执行方式供选：Subagent-Driven（每 Task 独立 subagent + 两阶段审查）或 Inline Execution（本会话批量执行）。