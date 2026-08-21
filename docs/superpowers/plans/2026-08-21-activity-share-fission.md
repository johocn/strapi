# 活动分享裂变归因 + 报名奖励 + 运营裂变榜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 用邀请码分享活动 → 下线 B 新报名该活动 → 系统给 A 发 `activity_share_reward` 积分（值=活动 `shareRewardPoints`??全局默认），落 `activity-referral-reward` 幂等去重，web 管理端出裂变榜。

**Architecture:** zhao-point 增量：`activity` 加 `shareRewardPoints`、`point-config` 加 `defaultShareRewardPoints`、新 CT `activity-referral-reward`；`activity.ts` 新增 `grantShareReward`（signup 建 active 后调用，勾 sso-user→upUser 桥接，幂等，失败仅日志不阻断）；`series-service` 继承字段；admin 聚合接口 + web 裂变榜页。shao 无改动（海报/邀请码已有）。

**Tech Stack:** Strapi v5 plugin（zhao-point/zhao-sso）、PostgreSQL（knex）、uni-app vue3（web 管理端）。

**依赖前置**：阶段九/十二已具备 C端海报二维码含 `inviteCode`、`sso_users.invite_code_used`、`sso-invite-code.creator`、`resolveSsoUserForUpUser`/`resolveUpUserForSsoUser` 双桥接、`earnPoints`、`resolveUserChannelId`、`config-service`。

---

### Task 1: Schema 扩展（活动奖励字段 + 全局默认 + 奖励记录表）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\point-config\schema.json`
- Create: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-referral-reward\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\index.ts`

- [ ] **Step 1: activity schema 追加 shareRewardPoints**

在 `activity/schema.json` 的 `attributes` 内 `feeCollectAt`（L30）后追加：

```json
    "shareRewardPoints": { "type": "integer" },
```

- [ ] **Step 2: point-config 追加 defaultShareRewardPoints**

在 `point-config/schema.json` 的 `attributes` 内 `tencentMapKey` 后追加：

```json
    "defaultShareRewardPoints": {
      "type": "integer",
      "default": 0
    }
```

- [ ] **Step 3: 新建 activity-referral-reward schema**

创建 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-referral-reward\schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "activity_referral_rewards",
  "info": {
    "singularName": "activity-referral-reward",
    "pluralName": "activity-referral-rewards",
    "displayName": "Activity Referral Reward"
  },
  "options": { "draftAndPublish": false, "comment": "分享裂变奖励发放记录（幂等）" },
  "attributes": {
    "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "invitee": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity" },
    "points": { "type": "integer", "default": 0 },
    "sourceInviteCode": { "type": "string" },
    "issuedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 4: 注册到 content-types/index.ts**

编辑 `content-types/index.ts`：顶部加 `import activityReferralReward from "./activity-referral-reward/schema.json";`，默认导出对象在 `"activity-series": { schema: activitySeries },` 后加：

```ts
  "activity-referral-reward": { schema: activityReferralReward },
```

- [ ] **Step 5: 构建**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build`，预期 exit 0（重生成 server/dist + 顶层 generated types）。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-point/server/src/content-types plugins/zhao-point/types types/generated
git add plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): activity shareRewardPoints + config default + referral reward CT"
```

---

### Task 2: 后端 grantShareReward 逻辑接入 signup

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`

- [ ] **Step 1: 新增模块级 helper grantShareReward**

在 `resolveUserChannelId`（L46-59）之后追加：

```ts
/**
 * 分享裂变奖励：下线 B(userId, upUser) 成功报名活动 act → 给其邀请人 A 发积分。
 * 幂等键：(invitee, activity)；虚拟分享者/无码/奖励<=0/桥接不到 A 均跳过；失败仅日志，绝不阻断报名主流程。
 */
async function grantShareReward(strapi, userId: number, act: any) {
  try {
    if (!act?.id) return;
    const configSvc = strapi.plugin("zhao-point").service("config-service");
    const config = configSvc ? await configSvc.getConfig() : null;
    const reward = Number(act.shareRewardPoints ?? config?.defaultShareRewardPoints ?? 0) || 0;
    if (reward <= 0) return;

    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const profileSvc = strapi.plugin("zhao-sso")?.service("sso-profile");
    if (!sop || !profileSvc) return;

    // 被邀者 B 的 sso-user 及其用过的邀请码
    const inviteeSso = await sop.resolveSsoUserForUpUser(userId);
    const inviteCodeStr = inviteeSso?.invite_code_used;
    if (!inviteCodeStr) return;

    // 邀请码 -> 分享者 creator
    const code = await strapi.db.query("plugin::zhao-sso.sso-invite-code").findOne({
      where: { code: inviteCodeStr, is_active: true },
      populate: ["creator"],
    });
    const inviter = code?.creator;
    if (!inviter || inviter.status === "virtual") return;

    // 分享者 A：sso-user -> upUser（拿不到则不发放）
    const inviterUp = await profileSvc.resolveUpUserForSsoUser(inviter.id);
    if (!inviterUp?.id) return;

    // 幂等：(invitee, activity) 已发放过则跳过
    const REWARD_UID = "plugin::zhao-point.activity-referral-reward";
    const exists = await strapi.db.query(REWARD_UID).findOne({
      where: { invitee: userId, activity: act.id },
    });
    if (exists) return;

    const userChannelId = await resolveUserChannelId(strapi, inviterUp.id);
    await strapi.plugin("zhao-point").service("point").earnPoints({
      userId: inviterUp.id,
      action: "activity_share_reward",
      source: "activity",
      method: "activity_share_reward",
      remark: `分享活动:${act.title}`,
      userChannelId,
    });
    await strapi.db.query(REWARD_UID).create({
      data: {
        inviter: inviterUp.id,
        invitee: userId,
        activity: act.id,
        points: reward,
        sourceInviteCode: inviteCodeStr,
        issuedAt: new Date(),
      },
    });
  } catch (e: any) {
    strapi.log.warn(`[zhao-point:activity] grantShareReward failed: ${e.message}`);
  }
}
```

> 说明：`resolveUpUserForSsoUser` 位于 `sso-profile` 服务（非 `sso-sop`）。若构建/运行时报无此 key，把服务名改为 `sso-sop` 下对应的反向桥接方法名核对一次。

- [ ] **Step 2: signup 注入调用**

在 `signup` 内「报名积分」`await grantPoints(strapi, userId, "activity_signup", "活动报名");`（L115）之后插入：

```ts
    // 分享裂变奖励：下线报名成功 → 给邀请人发积分（失败不阻断）
    await grantShareReward(strapi, userId, act);
```

> 位置为 active 报名创建、non-waitlist 路径，天然只对「新 active 报名」触发。

- [ ] **Step 3: 构建**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build`，预期 exit 0。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): grant share-reward on signup with idempotency"
```

---

### Task 3: 系列排期/复制继承 shareRewardPoints

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\series-service.ts`

- [ ] **Step 1: generateSchedule 承接 defaultRules**

在 `generateSchedule` 的 create data 对象内、`feeFactors: dr.feeFactors ?? null,`（L188）后追加：

```ts
            shareRewardPoints: dr.shareRewardPoints ?? null,
```

- [ ] **Step 2: duplicate 复制**

在 `duplicate` 的 `copy` 对象内、`feeFactors: src.feeFactors ?? null,`（L70）后追加：

```ts
      shareRewardPoints: src.shareRewardPoints ?? null,
```

- [ ] **Step 3: 构建 + Commit**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build` exit 0 后：

```bash
git add plugins/zhao-point/server/src/services/series-service.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): generateSchedule/duplicate inherit shareRewardPoints"
```

---

### Task 4: 裂变榜 admin 聚合接口

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

先读 `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts` 确认默认导出 `({ strapi }) => ({ ... })` 结构，把下述方法加进返回对象。

- [ ] **Step 1: 新增 fissionLeaderboard 控制器方法**

在 `controllers/activity.ts` 返回对象内追加：

```ts
  /** 裂变榜：按 inviter 聚合奖励记录，可筛时间；返回带来报名数/发放积分/明细 */
  async fissionLeaderboard(ctx: any) {
    const { start, end } = ctx.query;
    const where: any = {};
    if (start) where.issuedAt = { $gte: new Date(start).toISOString() };
    if (end) where.issuedAt = where.issuedAt || {};
    if (end) where.issuedAt.$lte = new Date(end).toISOString();

    const rows = await strapi.db.query("plugin::zhao-point.activity-referral-reward").findMany({
      where,
      populate: { inviter: true, activity: true },
    });

    const map = new Map<number, any>();
    for (const r of rows) {
      const uid = r.inviter?.id ?? r.inviter;
      if (!map.has(uid)) {
        map.set(uid, { inviterId: uid, username: r.inviter?.username ?? `#${uid}`, inviteeCount: 0, totalPoints: 0, details: [] });
      }
      const agg = map.get(uid);
      agg.inviteeCount++;
      agg.totalPoints += r.points || 0;
      agg.details.push({ activity: r.activity?.title ?? `#${r.activity}`, points: r.points || 0, issuedAt: r.issuedAt });
    }

    ctx.body = {
      rows: Array.from(map.values()).sort((a, b) => b.inviteeCount - a.inviteeCount),
      total: rows.length,
    };
  },
```

- [ ] **Step 2: 注册 admin 路由**

在 `content-api.ts` 活动区、`channelScopeRoute("GET", "/adm/activities/:documentId/attendance", "activity.adminAttendance", "activity.read"),` 之后追加：

```ts
    channelScopeRoute("GET", "/adm/activity-share/leaderboard", "activity.fissionLeaderboard", "activity.read"),
```

- [ ] **Step 3: 构建 + Commit**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build` exit 0 后：

```bash
git add plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): fission leaderboard admin endpoint"
```

---

### Task 5: web 管理端 — 奖励字段 + 裂变榜页

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`
- Modify: `e:\code\web\src\pages\series\form.vue`
- Create/Modify: `e:\code\web\src\pages\activity` 下裂变榜页面
- Modify: `e:\code\web\src\pages.json`（或 src/pages.json，按仓库实际生效位置）

先读 `e:\code\web\src\pages\activity\form.vue` 与 `e:\code\web\src\pages\series\form.vue`，沿用其表单组件风格与既有 `dr`/`defaultRules` 提交回填结构。

- [ ] **Step 1: 活动表单加 shareRewardPoints**

`form.vue` 报名设置区，在费用分档控件附近加数字输入「分享奖励积分（下线报名给分享者）」；`form` 对象加 `shareRewardPoints: 0`（或 null）；`loadDetail` 回填 `form.shareRewardPoints = data.shareRewardPoints ?? 0`；`submitData` 透传 `shareRewardPoints: form.shareRewardPoints || 0`。

- [ ] **Step 2: 系列表单 defaultRules 加 shareRewardPoints**

`series/form.vue` 的 `dr` 对象加 `shareRewardPoints: 0`，同构编辑器（数字输入）；提交 `defaultRules={...dr}` 自动带上；回填 `Object.assign(dr, data.defaultRules||{})` 已可覆盖。

- [ ] **Step 3: 裂变榜页面**

新增 `e:\code\web\src\pages\activity\fission.vue`：调用 `GET /zhao-point/v1/admin/activity-share/leaderboard`（沿用该仓库 admin 请求封装与鉴权 header），渲染表格（分享者 / 带来报名数 / 发放积分），顶部时间范围筛选（start/end）；成功后 `setData`/响应式更新。参考 `activity/list.vue` 的表格与 loading 写法。在 `pages.json` 注册页面并在一级菜单（活动管理）加「裂变榜」入口路由。

- [ ] **Step 4: 构建 + Commit**

在 `e:\code\web` 跑 `npm run build:h5` 通过后：

```bash
git add src/pages/activity/form.vue src/pages/series/form.vue src/pages/activity/fission.vue src/pages.json dist/build/h5
git commit -m "feat(web): share reward field + fission leaderboard page"
```

> 若 `dist/build/h5` 未跟踪或负责人此前只提交 dist：参考记忆——`dist/build/h5` 被 git 跟踪需随源码一并提交。

---

### Task 6: 验收脚本 accept-share-fission.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-share-fission.cjs`

- [ ] **Step 1: 编写脚本并跑通**

先读 `e:\code\basic\scripts\accept-fee-tiers.cjs` 复用其 PG 连接/`api()`/登录/建活动/DB 直插用户+积分/清理/断言写法。覆盖（全具体值，禁占位）：

1. **基础奖励**：活动配 `shareRewardPoints=30`，免费报名；DB 构造 A 用户（sso_user + upUser 同 username 桥接）+ 邀请码（creator=A, is_active）+ 让 B 用此码注册/绑定（写 `sso_users.invite_code_used` + `sso_invite_usages`）；B 报名 → 断言 A 收到 `activity_share_reward` +30（核 `zhao_point_records` running balance + 渠道 `_user_lnk`），`activity_referral_rewards` 落 1 条。
2. **幂等**：同一 B 再次对同活动报名（已报名拦截路径返回 already_signed_up）不重复发；直接再插同 (invitee,activity) 前先断言已有记录。
3. **跳过分支**：无 invite_code 的 B → 不发放；虚拟分享者（creator.status=virtual）→ 不发放；`shareRewardPoints<=0` 且默认=0 → 不发放。
4. **全局默认回退**：活动不配（null），把 `point-config.defaultShareRewardPoints` 置 50 → 发 50；测后还原 0。
5. **候补转正不触发**：满员场景 B 转 waiting 不触发（新 active 报名才发，脚本验证转正时 reward 记录新增数不变）。
6. **裂变榜聚合**：多活动/多分享者造数据，调 admin `GET /adm/activity-share/leaderboard` 断言 inviteeCount/totalPoints 聚合正确。
7. **零残留**：清理活动/报名/奖励记录/扣补积分/测试用户，断言计数归零。

多用户用 DB 直插 `up_users`（username 同证书）+ `sso_users`(`invite_code_used`)+`sso_invite_codes`(`creator`)+`sso_referral_relations`；积分核验用既有 `_user_lnk` 关联手法。本机 Strapi 若未运行先 `npm run dev` 起 1337，readiness 后跑脚本至全 PASS exit 0。

- [ ] **Step 2: Commit**

```bash
git add scripts/accept-share-fission.cjs
git commit -m "test(zhao-point): accept-share-fission acceptance script"
```

---

### Task 7: 三仓库收口

- [ ] **Step 1: 类型一致性自检**

Grep 确认 `shareRewardPoints` / `defaultShareRewardPoints` / `activity-referral-reward` / `activity_share_reward` 拼写一致；`grantShareReward` 唯一；leaderboard 路由在 activity detail 动态路由前且控制器已注册 `activity.fissionLeaderboard`。

- [ ] **Step 2: basic 收口**

```bash
git -C e:\code\basic add -A; git -C e:\code\basic commit -m "chore: share fission 收口" 2>/dev/null; git -C e:\code\basic restore dist/; git -C e:\code\basic push
```

（先停本机 Strapi dev 进程再 restore app 顶层 dist，防止持续改写；插件 dist 已在各 Task 提交。）

- [ ] **Step 3: web 收口**

```bash
git -C e:\code\web add -A; git -C e:\code\web commit -m "chore: share fission 收口" 2>/dev/null; git -C e:\code\web push
```

- [ ] **Step 4: 更新项目记忆**

在 `project_memory.md` 追加「阶段十六 活动分享裂变奖励」小节（归因/奖励规则/幂等/看板/验收 commit + 复盘 1 问题+1 改进）。