# 活动报名态提醒 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在活动报名各状态点（报名成功/候补/转正/开场前/取消）即时触达用户，触达方式为站内短信息（inapp 通道）+ 微信模板双通道，并新增 C 端消息中心页。

**Architecture:** 复用 zhao-sso 既有触达引擎。站内信新增 `sso-msg.sendInApp()`（直接落 provider=inapp、status=sent 的 msg-job，即时可见）；各报名触点通过 activity service 新增的 `notifyActivityState()` 统一编排站内信+微信。C 端通过 zhao-sso 新增 `notice-controller` 读站内信/标记已读。

**Tech Stack:** Strapi v5、zhao-point 插件（报名动作）、zhao-sso 插件（触达/站内信）、uni-app H5（shao 消息中心）。

---

### Task 1: zhao-sso msg-job schema 新增 readAt 字段 + 重建 zhao-sso dist

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-job\schema.json`
- Test: schema 加载 + 字段存在

- [ ] **Step 1: 在 msg-job schema 增加 readAt 字段**

在 `schema.json` 的 attributes 末尾（`dedupeKey` 后）追加 `readAt`：

```json
    "dedupeKey": { "type": "string", "unique": true },
    "readAt": { "type": "datetime" }
```

- [ ] **Step 2: 重建 zhao-sso 插件 dist**

```bash
cd e:\code\basic\plugins\zhao-sso && npm run build
```
Expected: build 成功，`dist` 产物更新。若报 dts 类型错误（不影响运行时产物）可忽略继续。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-sso/server/src/content-types/msg-job/schema.json plugins/zhao-sso/dist
git commit -m "feat(zhao-sso): msg-job 新增 readAt 字段支持站内信已读"
```

---

### Task 2: sso-msg 新增 sendInApp 方法

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-msg.ts`（在 sendNow 前插入方法）

- [ ] **Step 1: 新增 sendInApp 方法**

在 `sso-msg` return 对象内、`sendNow` 方法之前插入：

```typescript
    /**
     * 站内信：直接落一条 provider=inapp、status=sent、sentAt=now 的 msg-job，
     * 即时可见、幂等（同 dedupeKey 已存在则跳过），不经过 cron 待发队列。
     * @param opts { user, scene, params, link?, dedupeKey? }
     */
    async sendInApp(opts: {
      user: number;
      scene: string;
      params?: Record<string, any>;
      link?: string;
      dedupeKey?: string;
    }) {
      const { user, scene, params = {}, link, dedupeKey } = opts;
      const key = dedupeKey || `inapp:${scene}:${user}`;
      const existing = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { dedupeKey: key },
      });
      if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
        return { job: existing, skipped: true };
      }
      const job = await strapi.db.query(MSG_JOB_UID).create({
        data: {
          user,
          scene,
          provider: "inapp",
          params,
          link: link || null,
          status: "sent",
          sentAt: new Date(),
          dedupeKey: key,
        },
      });
      return { job, skipped: false };
    },
```

- [ ] **Step 2: 重建 zhao-sso dist**

```bash
cd e:\code\basic\plugins\zhao-sso && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-sso/server/src/services/sso-msg.ts plugins/zhao-sso/dist
git commit -m "feat(zhao-sso): sso-msg.sendInApp 站内信通道直接落库"
```

---

### Task 3: zhao-sso 新增 notice-controller + 路由（C端读站内信/已读）

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\controllers\notice-controller.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts`（注册）
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\api.ts`（新增 my/notices 路由）

- [ ] **Step 1: 创建 notice-controller.ts**

```typescript
import type { Core } from "@strapi/strapi";

const JOB_UID = "plugin::zhao-sso.msg-job";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    /**
     * 我的站内信：读 provider=inapp && status=sent 的消息（按 sso-user 归属）
     * ?page&pageSize&unreadOnly  => { data: { list, unreadCount }, meta }
     */
    async myNotices(ctx: any) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const { page = "1", pageSize = "20", unreadOnly } = ctx.query;
        const pageNum = parseInt(page, 10);
        const pageSizeNum = parseInt(pageSize, 10);
        const where: any = {
          provider: "inapp",
          status: "sent",
          user: ssoUserId,
        };
        if (unreadOnly === "true" || unreadOnly === "1") where.readAt = { $null: true };
        const [total, unreadCount] = await Promise.all([
          strapi.db.query(JOB_UID).count({ where }),
          strapi.db.query(JOB_UID).count({ where: { ...where, readAt: { $null: true } } }),
        ]);
        const rows = await strapi.db.query(JOB_UID).findMany({
          where,
          orderBy: { sentAt: "desc" },
          offset: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
        });
        ctx.body = {
          data: {
            list: rows,
            unreadCount,
          },
          meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
        };
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    /** 标记站内信已读（幂等，仅属主可操作） */
    async read(ctx: any) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const jobId = parseInt(ctx.params.id, 10);
        const job = await strapi.db.query(JOB_UID).findOne({ where: { id: jobId } });
        if (!job) { ctx.status = 404; ctx.body = { error: "消息不存在" }; return; }
        if ((job.user?.id ?? job.user) !== ssoUserId) { ctx.status = 403; ctx.body = { error: "无权操作" }; return; }
        if (!job.readAt) {
          await strapi.db.query(JOB_UID).update({ where: { id: jobId }, data: { readAt: new Date() } });
        }
        ctx.body = { data: { ok: true } };
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  };
};
```

- [ ] **Step 2: 注册控制器**

在 `controllers/index.ts` 顶部添加 `import noticeController from "./notice-controller";`，并在导出对象中加入 `"notice-controller": noticeController,`（对齐既有 `message-controller` 的注册方式）。

- [ ] **Step 3: 注册路由**

在 `routes/api.ts` 的 `type: "content-api"` 数组内、SSO 认证路由段末尾（`/v1/recommend` 之后）追加：

```typescript
    {
      method: "GET",
      path: "/v1/my/notices",
      handler: "notice-controller.myNotices",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/v1/my/notices/:id/read",
      handler: "notice-controller.read",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
```

- [ ] **Step 4: 重建 dist**

```bash
cd e:\code\basic\plugins\zhao-sso && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/controllers plugins/zhao-sso/server/src/routes plugins/zhao-sso/dist
git commit -m "feat(zhao-sso): 新增 C端我的站内信/已读接口 (notice-controller)"
```

---

### Task 4: activity 新增 remindLeadMinutes 字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`

- [ ] **Step 1: 新增 remindLeadMinutes 字段**

在 activity schema 的 attributes 中追加（对齐现有活动时间类字段）：

```json
    "remindLeadMinutes": { "type": "integer", "default": 1440, "min": -1 }
```

- [ ] **Step 2: 重建 zhao-point dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/dist
git commit -m "feat(zhao-point): activity 新增 remindLeadMinutes 开场提醒提前量"
```

---

### Task 5: activity service 新增 notifyActivityState 助手 + 各触点接入（报名/候补/取消/转正/开场）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`

- [ ] **Step 1: 新增统一站内信助手 notifyInApp**

在 activity service 内、`notifyPromoted` 之后新增通用站内信发送助手（不入 wx，纯站内）：

```typescript
  /** 站内信发送助手：resolve sso-user → sso-msg.sendInApp；无 sso/失败降级不断链 */
  async notifyInApp(upUserId: number, activityId: number, scene: string, params: Record<string, any>, dedupeKey: string) {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
      if (!sop || !msg) return;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso) return;
      await msg.sendInApp({ user: sso.id, scene, params, dedupeKey });
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] sendInApp failed (${scene}, user=${upUserId}): ${e.message}`);
    }
  },
```

- [ ] **Step 2: signup 成功分支发站内信确认**

在 `signup` 的 active 成功路径（`grantShareReward` 调用之后、SOP 微信内嵌之前）加入站内信：

```typescript
    // 站内信：报名成功确认（双通道之站内部分）
    await this.notifyInApp(userId, act.id, "activity.confirm", { name: act.title, startTime: act.startTime }, `activity:confirm:${userId}:${act.id}`);
```

（此步保留既有微信 act_confirm 内嵌，仅补站内信。return { ok: true } 前的微信 SOP try 块不变。）

- [ ] **Step 3: signup 候补分支发站内信 + 微信（新增 act_waitlisted）**

在候补分支（`reserved === 0`，`position` 计算后、`return { ok:true, waitlisted:true, position }` 前）插入双通道：

```typescript
      // 候补提醒：站内信 + 微信
      try {
        await this.notifyInApp(userId, act.id, "activity.waitlisted", { name: act.title, startTime: act.startTime, position: waitCount + 1 }, `activity:waitlisted:${userId}:${act.id}`);
        const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
        if (sop) {
          const sso = await sop.resolveSsoUserForUpUser(userId);
          if (sso) {
            await sop.trigger("activity.waitlisted", {
              user: sso.id,
              payload: { activity: { name: act.title, startTime: act.startTime }, position: waitCount + 1 },
              schedules: [{ templateCode: "act_waitlisted", scene: "activity.waitlisted", dedupeKey: `activity:waitlisted:${userId}:${act.id}` }],
            });
          }
        }
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] waitlisted notify failed (user=${userId}): ${e.message}`);
      }
```

- [ ] **Step 4: cancel 成功发站内信 + 微信（新增 act_cancelled）**

在 `cancel` 方法状态改为 cancelled 后、`if (signup.status === "active")` 块之前追加双通道：

```typescript
    // 取消确认：站内信 + 微信
    try {
      const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
      const params = { name: act?.title ?? "", startTime: act?.startTime ?? null };
      await this.notifyInApp(userId, activityId, "activity.cancelled", params, `activity:cancelled:${userId}:${activityId}`);
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(userId);
        if (sso) {
          await sop.trigger("activity.cancelled", {
            user: sso.id,
            payload: { activity: params },
            schedules: [{ templateCode: "act_cancelled", scene: "activity.cancelled", dedupeKey: `activity:cancelled:${userId}:${activityId}` }],
          });
        }
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] cancel notify failed (user=${userId}): ${e.message}`);
    }
```

- [ ] **Step 5: notifyPromoted 并入站内信**

在 `notifyPromoted` 内、微信 sendNow 之后追加站内信：

```typescript
      await this.notifyInApp(upUserId, activityId, "activity.promoted",
        { name: act.title, startTime: act.startTime },
        `activity:promoted:${upUserId}:${activityId}`);
```

（保留既有微信 act_promoted sendNow，dedupeKey `activity:promote:...` 不变。）

- [ ] **Step 6: signup 微信开场前提醒提前量改用 remindLeadMinutes**

在 signup 内嵌微信 SOP try 块中，将开场前 `schedules.push` 的 24h 常量改为读 `act.remindLeadMinutes`（默认 1440，-1 关闭）：

```typescript
        const leadMin = Number(act.remindLeadMinutes);
        if (startTime && leadMin >= 0) {
          const beforeAt = new Date(new Date(startTime).getTime() - Math.max(leadMin, 0) * 60000).toISOString();
          if (new Date(beforeAt).getTime() > Date.now()) {
            schedules.push({ templateCode: "act_before", scene: "activity.before", scheduledAt: beforeAt });
          }
        }
```

（替换原固定 `- 24 * 3600 * 1000` 的 3 行；保留 act_confirm 即时条。）

- [ ] **Step 7: 开场前也落一条站内信（已预约提醒）**

在 signup 成功分支、act_before 有效时补一条站内信（紧邻 Step 2 之后）：

```typescript
    // 开场前提醒站内信（即时示“已预约提醒”，实际提醒由微信定时触发）
    if (act.startTime && (Number(act.remindLeadMinutes ?? 1440) >= 0)) {
      await this.notifyInApp(userId, act.id, "activity.before", { name: act.title, startTime: act.startTime }, `activity:before:${userId}:${act.id}`);
    }
```

- [ ] **Step 8: 重建 zhao-point dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git commit -m "feat(zhao-point): 活动报名态双通道提醒 (站内信+微信)，补齐候补/取消场景"
```

---

### Task 6: 验收脚本 accept-activity-notify.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-notify.cjs`

- [ ] **Step 1: 编写端到端验收脚本**

覆盖：① 造 sso-user + up_user 绑定；② 造活动（capacity=1，remindLeadMinutes 默认）满员→进候补触发 waitlisted → 取消释放 → 转正触发 promoted；③ 报名成功触发 confirm/before 站内信；④ 取消触发 cancelled；⑤ 查询 `/my/notices` 列表 + unreadCount + `/read` 已读。断言各场景已产生 provider=inapp 的 msg-job，且幂等（重复动作不新增）。零残留清理。

```javascript
const { Client } = require("pg");
const axios = require("axios");
// ...(按既有 accept-*.cjs 模式：admin 登录→构造 sso-user+up_user→建活动→调 C端报名/取消→查 msg-job 断言→清理)
```

- [ ] **Step 2: 启动 dev 并运行脚本**

```bash
cd e:\code\basic && npm run develop
```
待 `/api/admin/_health` 返回 204 后，另一终端：
```bash
cd e:\code\basic && node scripts/accept-activity-notify.cjs
```
Expected: 全 PASS，零残留。若候补/转正断言失败，检查 remindLeadMinutes 字段与 sendInApp 落库。

- [ ] **Step 3: 停 dev + 还原根 dist + 清理**

```bash
# 停 dev 进程；还原根 app dist（不误伤 plugins 有效产物）
cd e:\code\basic && git restore dist/
```

- [ ] **Step 4: Commit**

```bash
git add scripts/accept-activity-notify.cjs
git commit -m "test(zhao-point): 活动报名态提醒端到端验收脚本"
```

---

### Task 7: shao 前端 - 消息中心页

**Files:**
- Create: `e:\code\shao\pages\notice\index.vue`
- Modify: `e:\code\shao\pages.json`
- Modify: `e:\code\shao\pages\mine\index.vue`（或对应"我的"页，加入口）
- Modify: `e:\code\shao\api\notices.js`（若 api 目录按模块拆分，否则并入既有 request）

- [ ] **Step 1: 新增 api 方法（消息中心）**

在 shao 对应 api 模块新增：

```javascript
// 我的站内信列表
export function getNotices(params = {}) {
  return request.get('/zhao-sso/v1/my/notices', { params })
}
// 标记已读
export function readNotice(id) {
  return request.post(`/zhao-sso/v1/my/notices/${id}/read`)
}
```

- [ ] **Step 2: 创建 pages/notice/index.vue**

消息中心页：加载 `getNotices({ page, pageSize })`，展示列表（scene 中文映射 + params 摘要 + sentAt），未读 item 高亮 + 未读角标，点击调 `readNotice(id)` 后刷新。分页 + 下拉刷新。

- [ ] **Step 3: 注册路由**

在 `pages.json` 增加消息中心路由，并设置 navigationBarTitleText。

- [ ] **Step 4: 加入口**

在 shao "我的"页加入「消息中心」入口（带未读角标）。

- [ ] **Step 5: 重建 shao h5 dist**

```bash
cd e:\code\shao && npm run build:h5
```

- [ ] **Step 6: Commit**

```bash
git add pages/notice pages.json api pages/mine
git commit -m "feat(web): C端消息中心页（站内信列表/已读）"
```

---

### Task 8: 后端评审 + 双仓库收口（basic/web，shao 已含）

**Files:**
- 评审：activity.ts 各触点、notice-controller、sendInApp、schema 迁移

- [ ] **Step 1: 后端实现评审**

核对：五场景是否都发站内信；幂等 dedupeKey 是否唯一；无 sso 绑定是否降级；readAt 权限校验；remindLeadMinutes -1 是否关闭开场。

- [ ] **Step 2: 验收结果评审 + basic/web 收口**

- basic：确认 dev 已停、根 dist 已还原、插件 dist 已提交，push所有提交。
- web：本功能未涉及 web 后端运营端改动，仅需确认无 dist churn（若本功能改到 zhao-sso/web 前端则重建；本功能 C 端在 shao，web 不动）。
- shao：已含 Task 7 提交。

```bash
cd e:\code\basic && git push
cd e:\code\shao && git push
```