# 分享海报领取：好友点击判定 + 活动/任务维度核算 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正分享领分规则：以「好友点击」为成功判定、冷却从首次点击起算（后续点击不重置）、按活动/任务维度分开核算每日与冷却，前端活动页与任务列表页对齐。

**Architecture:** 分享成功与维度核算统一以 `zhao_point_share_visits` 为唯一事实源。后端把 `targetType` 枚举扩展 `task`，冷却基准确认从链路读取；`getShareStatus`/`earnShare` 改为按 `(userId, dimType, dimId)` 过滤 visit 与每日计数；前端 `useShareClaim` 增加 waitClick 状态并透传维度参数。

**Tech Stack:** Strapi 插件 (`plugins/zhao-point`)，uni-app H5 + Vue3。

---

## 背景与规则收敛（实现必须满足）

- **成功判定 = 好友点击**：share 领分需先存在 `zhao_point_share_visits` 记录（inviter=当前用户 且 targetType/targetId 匹配维度）。无点击 → `canClaim=false`，前端置灰并提示「等待好友点击」。
- **冷却基数 = 首次点击时间**：取该维度下当前用户**最早一条** visit 的 `createdAt` 作为 30 分钟起点；后续新点击**不重置**倒计时。
- **可领条件**：`hasClick && 距首击≥interval 分钟 && 当日该维度未达上限`。
- **每日上限**：按维度核算，`limitPerDay`（默认 4）不变。
- **活动/任务分开核算**：维度 id 为 `(dimType=activity|task, dimId)`。活动页 `dimType=activity` + 活动 id；任务列表页 `dimType=task` + 任务 id。
- **visit 埋点去掉 attemptId 去重**：每次点击各记一条（当前 `reportShareVisitFromLaunch` 本地缓存 + 后端 attemptId 唯一都去掉）。

### 维度标签落库（point_record.source）
每日上限按维度统计，需让 `point_record`（活动活动分享领分）能被维度过滤。复用现有 `source` 字段，格式 `share:activity:{id}` / `share:task:{id}`，`earnShare` 领取时写入。`countTodayAction` 增加按维度标签过滤的变体。

---

## 文件结构

后端（basic，路径 `e:\code\basic\plugins\zhao-point`）：
- `server/src/content-types/activity-share-visit/schema.json` —— 枚举加 `task`
- `server/src/controllers/point.ts` —— `reportShareVisit`（去掉去重）、`shareStatus`、`earnShare` 维度参数
- `server/src/services/point.ts` —— 冷却/维度核算核心

前端（shao，路径 `e:\code\shao`）：
- `services/api.ts` —— `getShareClaimStatus`/`claimActivityShare`/`reportShareVisit` 签名
- `utils/invite.ts` —— 去掉 attemptId 本地去重；`reportShareVisitFromLaunch` 解析并上报 `taskId`
- `utils/use-share-claim.ts` —— waitClick 状态 + dimType/dimId
- `pages/activity/detail.vue` —— 活动页 `useShareClaim(id,'activity')`
- `pages/tasks/tasks.vue` —— 任务列表页分享入口
- `components/share-guide/share-guide.vue` —— 分享引导弹窗（完整定制维度的主战场）
- `components/promo/*` —— 完全定制悬浮留言（本计划不涉及，已另行部署）

**路由事实（已核对 basic routes/content-api.ts）**：
- 领取：`userRoute("POST", "/my/point/earn/share", "point.earnShare")`
- 状态：`userRoute("GET", "/my/point/share/status", "point.shareStatus")`
- 埋点：`publicRoute("POST", "/my/point/share/visit", "point.reportShareVisit")`
- 前端 api.ts 的 claim 方法名是 `claimActivityShare`，链路走 `/my/point/earn/share`。

---

## 任务分解

### Task 1: schema 枚举加 task

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-share-visit\schema.json`

- [ ] **Step 1: 修改 targetType 枚举加 `task`，并更新 comment**

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_point_share_visits",
  "info": {
    "singularName": "activity-share-visit",
    "pluralName": "activity-share-visits",
    "displayName": "Activity Share Visit"
  },
  "options": { "draftAndPublish": false, "comment": "分享裂变好友点击访问埋点（每次点击各记一条，无需去重；用于分享冷却判定）" },
  "attributes": {
    "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "targetType": { "type": "enumeration", "enum": ["article", "course", "activity", "task"] },
    "targetId": { "type": "string" },
    "createdAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: 移除 attemptId 属性**（保持上面 JSON 无 `attemptId`）

> 说明：移除 `attemptId` 字段是可选清理。若担心存量关联，可在步骤 3 回退为"保留字段但不写"。默认按上 JSON 移除。

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/content-types/activity-share-visit/schema.json
git commit -m "fix(zhao-point): share visit targetType 枚举加 task，去 attemptId 去重字段"
```

---

### Task 2: reportShareVisit 去掉去重、支持 task

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\point.ts:492-537`

- [ ] **Step 1: 改写 reportShareVisit，去掉 attemptId 去重分支，每次点击各 insert 一条**

```typescript
  // 分享裂变好友点击埋点（公开，无需登录）；每次点击各记一条（不做去重，冷却随首次点击计时）
  async reportShareVisit(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { inviterId, inviteCode, targetType, targetId } = body;

      let inviter: number | null = null;
      if (inviterId !== undefined && inviterId !== null && inviterId !== "") {
        const uid = Number(inviterId);
        if (!isNaN(uid) && uid > 0) inviter = uid;
      } else if (inviteCode) {
        inviter = await resolveInviterByCode(String(inviteCode));
      }

      const VISIT_UID = "plugin::zhao-point.activity-share-visit";
      await strapi.db.query(VISIT_UID).create({
        data: {
          inviter: inviter ?? undefined,
          targetType: targetType || undefined,
          targetId: targetId || undefined,
        },
      });

      ctx.body = wrap({ ok: true, recorded: true });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/controllers/point.ts
git commit -m "fix(zhao-point): share visit 去掉 attemptId 去重，每次点击各记一条"
```

---

### Task 3: point.ts service 增加维度化 share 状态与冷却逻辑

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\point.ts`（getShareStatus 区 + 新增 helper）

- [ ] **Step 1: 新增 visit 维度查询与维度每日计数 helper（在 getShareStatus 前）**

```typescript
  const VISIT_UID = "plugin::zhao-point.activity-share-visit";

  // 维度化好友点击：返回该分享者、该维度最早的（即冷却基准）与是否有点击
  const getShareVisitState = async (params: {
    userId: number | string;
    dimType: string;
    dimId?: string | number | null;
  }): Promise<{ hasClick: boolean; firstClickAt: number | null }> => {
    const where: Record<string, any> = { inviter: params.userId, targetType: params.dimType };
    if (params.dimId != null && params.dimId !== "") where.targetId = String(params.dimId);
    const first = await strapi.db.query(VISIT_UID).findOne({
      where,
      orderBy: { createdAt: "asc" },
      select: ["createdAt"],
    });
    return { hasClick: !!first?.createdAt, firstClickAt: first?.createdAt ? new Date(first.createdAt).getTime() : null };
  };

  // 维度化每日领分计数：按 point_record.source 标签（share:{dimType}:{dimId}）统计当日
  const countTodayShareByDim = async (
    userId: number | string,
    dimType: string,
    dimId: string | number | null
  ): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tag = `share:${dimType}:${dimId ?? ""}`;
    const count = await strapi.db.query(RECORD_UID).count({
      where: {
        user: userId,
        action: "activity_share",
        source: tag,
        createdAt: { $gte: today.toISOString() },
      },
    });
    return count;
  };
```

- [ ] **Step 2: 重写 getShareStatus，接收 dimType/dimId，冷却随首次点击**

```typescript
  const getShareStatus = async (params: {
    userId: number | string;
    dimType?: string;
    dimId?: string | number | null;
    activityId?: string | number | null;   // 兼容旧调用，映射到 dimType=activity
  }) => {
    const dimType = (["activity", "task"].includes(params.dimType || "")) ? params.dimType! : "activity";
    const dimId = params.dimType ? params.dimId : (params.activityId ?? null);

    const rule = await getMergedRule("activity_share");
    const interval = Number(rule?.extraConfig?.intervalMinutes) || 30;
    const limitPerDay = Number(rule?.limitPerDay) || 0;

    let points = Number(rule?.points) || 5;
    if (dimType === "activity" && dimId != null) {
      try {
        const idNum = Number(dimId);
        const act = await strapi.db.query(ACTIVITY_UID).findOne({
          where: Number.isNaN(idNum) ? { documentId: String(dimId) } : { id: idNum },
          select: ["shareRewardPoints"],
        });
        if (act?.shareRewardPoints) points = Number(act.shareRewardPoints);
      } catch { /* 回退默认分 */ }
    }

    const { hasClick, firstClickAt } = await getShareVisitState({ userId, dimType, dimId });
    const dailyCount = await countTodayShareByDim(userId, dimType, dimId);

    let remainingMs = 0;
    if (hasClick && firstClickAt != null) {
      const elapsed = Date.now() - firstClickAt;
      remainingMs = Math.max(0, interval * 60 * 1000 - elapsed);
    }

    let canClaim = hasClick && remainingMs === 0;
    if (limitPerDay > 0 && dailyCount >= limitPerDay) canClaim = false;

    return {
      action: "activity_share",
      dimType,
      dimId: dimId != null ? String(dimId) : undefined,
      canClaim,
      hasClick,
      waitClick: !hasClick,
      points,
      remainingMs,
      dailyCount,
      dailyLimit: limitPerDay,
      intervalMinutes: interval,
    };
  };
```

> 说明：冷却使用 `getShareVisitState` 的 `firstClickAt` 即该维度首次点击时间，符合"首次点击计时、再点不更新"。若 `hasClick=false`，`remainingMs=0` 且 `canClaim=false`（waitClick=true）。

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/services/point.ts
git commit -m "feat(zhao-point): share 冷却改为好友点击判定，支持 activity/task 维度核算"
```

---

### Task 4: earnShare controller 支持维度 + 前置于灰 + 维度 source 标签

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\point.ts:61-122`

- [ ] **Step 1: earnShare 接收 dimType/dimId，前置好友点击校验，写入维度 source 标签**

```typescript
  async earnShare(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { action } = body;
      if (action !== "activity_share") {
        ctx.status = 400;
        ctx.body = { error: "不允许领取该类型积分", code: "POINT_021" };
        return;
      }
      const dimType = (["activity", "task"].includes(body.dimType || "")) ? body.dimType : "activity";
      const dimId = body.dimId != null ? body.dimId : body.activityId;

      const pointSvc = strapi.plugin("zhao-point").service("point");
      // 前置好友点击校验：无点击直接拒绝（与 getShareStatus 同一判定源）
      const { hasClick, firstClickAt } = await pointSvc.getShareVisitState ? 
        await pointSvc.getShareVisitState({ userId, dimType, dimId }) :
        { hasClick: false, firstClickAt: null };
      if (!hasClick) {
        ctx.status = 400;
        ctx.body = { error: "分享出去等待好友点击", code: "POINT_024" };
        return;
      }
      const interval = 30; // 与规则一致；由 pointSvc 内部再做精确校验
      const elapsed = Date.now() - (firstClickAt ?? 0);
      if (firstClickAt != null && elapsed < interval * 60 * 1000) {
        const min = Math.ceil((interval * 60 * 1000 - elapsed) / 60000);
        ctx.status = 400;
        ctx.body = { error: `请${Math.max(1, min)}分钟后重试`, code: "POINT_020" };
        return;
      }

      // 定价：活动类按 shareRewardPoints；任务类用规则默认分
      let points: number | undefined;
      let remark = "分享活动";
      if (dimType === "activity" && dimId != null) {
        const idNum = Number(dimId);
        const act = await strapi.db.query(ACTIVITY_UID).findOne({
          where: Number.isNaN(idNum) ? { documentId: String(dimId) } : { id: idNum },
          select: ["documentId", "title", "shareRewardPoints"],
        });
        if (act?.shareRewardPoints) { points = Number(act.shareRewardPoints); remark = `分享活动:${act.title}`; }
      }
      // 解析用户归属渠道（与现状一致，省略）
      // ...
      const record = await pointSvc.earnPoints({
        userId, action, source: `share:${dimType}:${dimId ?? ""}`, method: "用户分享领取",
        remark, points, userChannelId: resolvedChannel,
      });
      ctx.body = wrap(record);
    } catch (e: any) {
      const status = ["POINT_001","POINT_004","POINT_011","POINT_019","POINT_020","POINT_024"].includes(e.code) ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },
```

> `interval` 在 controller 内硬编码 30 仅为预校验提示；**精确裁决必须交给 `pointSvc.earnPoints` 内部的维度化冷却（见 Task 5）**，避免与规则配置漂移。

- [ ] **Step 2: getShareStatus 由 point.ts 提供 dimType/dimId，controller 透传**（修改 shareStatus 区 L480-490）

```typescript
  async shareStatus(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { dimType, dimId, activityId } = ctx.query || {};
      const result = await strapi.plugin("zhao-point").service("point").getShareStatus({ userId, dimType, dimId, activityId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 500;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 3: 导出 getShareVisitState 供 earnShare controller 复用（在 return 对象加一行）**

```typescript
  return {
    earnPoints,
    ...
    getShareStatus,
    getShareVisitState,
  };
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/controllers/point.ts plugins/zhao-point/server/src/services/point.ts
git commit -m "feat(zhao-point): earnShare 前置好友点击校验 + 维度 source 标签与状态透传"
```

---

### Task 5: earnPoints 的 activity_share 冷却改为维度化（精确裁决）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\point.ts:236-260`

- [ ] **Step 1: 重写 activity_share 冷却分支，改为按传入维度 + 首击计时，并校验维度上限**

```typescript
      // 冷却校验：分享领分以「好友点击」为成功判定，冷却从该维度首次点击起算，后续点击不更新
      const interval = Number((rule.extraConfig as any)?.intervalMinutes) || 0;
      if (interval > 0) {
        if (action === "activity_share") {
          const dimType = ["activity", "task"].includes(params.dimType || "") ? params.dimType! : "activity";
          const dimId = params.dimType ? params.dimId : params.activityId;
          // 维度每日上限（同一事务内复核，防并发绕过）
          if (rule.limitPerDay > 0) {
            const dimCount = await countTodayShareByDim(userId, dimType, dimId);
            if (dimCount >= rule.limitPerDay) {
              throwError("POINT_004", `已达当日分享次数上限 (action=${action})`, { action, limit: rule.limitPerDay });
            }
          }
          const { hasClick, firstClickAt } = await getShareVisitState({ userId, dimType, dimId });
          if (!hasClick || firstClickAt == null) {
            throwError("POINT_024", "分享出去等待好友点击", { action, dimType, dimId });
          }
          const elapsed = Date.now() - firstClickAt!;
          if (elapsed < interval * 60 * 1000) {
            const min = Math.ceil((interval * 60 * 1000 - elapsed) / 60000);
            throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
          }
        } else {
          const remainMs = await cooldownRemainingMs(userId, action, interval);
          if (remainMs > 0) {
            const min = Math.ceil(remainMs / 60000);
            throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
          }
        }
      }
```

> 注意：`cooldownRemainingMs` 原用于其它 action，保留。`params` 需要 `EarnPointsParams` 扩展 `dimType?`/`dimId?`/`activityId?` 字段。见 Step 2。`getShareVisitState`/`countTodayShareByDim` 需在 `earnPoints` 作用域内可访问（Task 3 定义于同 service 顶层，OK）。

- [ ] **Step 2: 扩展 EarnPointsParams 类型增加维度字段**（文件顶部类型定义处）

```typescript
  interface EarnPointsParams {
    userId: number | string;
    action: string;
    source?: string;
    method?: string;
    remark?: string;
    orderId?: string;
    channelId?: number | string;
    userChannelId?: number | string;
    points?: number;
    dimType?: string;
    dimId?: string | number | null;
    activityId?: string | number | null;
  }
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-point/server/src/services/point.ts
git commit -m "feat(zhao-point): earnPoints 内 activity_share 冷却改为首击维度化 + 维度上限精确裁决"
```

---

### Task 6: 重建 zhao-point dist 并部署（本工程部署铁律）

> 依据项目记忆：zhao-point 插件线上加载 `plugins/zhao-point/dist`，`server/src` 改动必须 `npm run build` 重建 dist 并一并提交推送，再走部署。

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\dist\**`（构建产物）

- [ ] **Step 1: 在插件目录构建 dist**

```bash
cd e:\code\basic\plugins\zhao-point
npm run build
```

- [ ] **Step 2: 部署自检：确认 dist 含新逻辑（activity_share 点击判定 / task 维度）**

```bash
# 在 dist 产物中 grep 新接口/关键字
grep -r "share:.*dimType\|POINT_024\|share:activity" e:\code\basic\plugins\zhao-point\dist\server
```

> 期望：至少命中 `POINT_024` 与 `share:${dimType}` 拼接串。无命中 = 未重建，回 Step 1。

- [ ] **Step 3: 提交 dist**

```bash
cd e:\code\basic
git add plugins/zhao-point/dist
git commit -m "build(zhao-point): rebuild dist for share click-based cooldown"
```

- [ ] **Step 4: 走部署脚本**（按项目既有 deploy.sh 流程，含根/插件 dist 与数据库脚本注意项）

```bash
cd e:\code\basic
git push
# 服务器端按部署文档执行 deploy.sh（joho 主机 /www/apps/strapi）
```

---

### Task 7: 前端 api.ts 改造维度参数

**Files:**
- Modify: `e:\code\shao\services\api.ts:693-726`

- [ ] **Step 1: getShareClaimStatus 支持 dimType/dimId（兼容 activityId）**

```typescript
// 查询分享领分状态（canClaim/points/remainingMs/每日次数），供任务中心/活动页按钮点亮与置灰
export async function getShareClaimStatus(opts?: { dimType?: string; dimId?: string | number; activityId?: string }) {
  const p: Record<string, string> = {}
  const o = opts || {}
  const dimType = o.dimType || (o.activityId ? 'activity' : undefined)
  const dimId = o.dimId != null ? String(o.dimId) : (o.activityId ?? undefined)
  if (dimType) p.dimType = dimType
  if (dimId != null) p.dimId = dimId
  const q = Object.keys(p).length ? '?' + new URLSearchParams(p).toString() : ''
  const res = await request(`/zhao-point/v1/my/point/share/status${q}`, { method: 'GET' })
  return res?.data ?? res
}
```

- [ ] **Step 2: claimActivityShare 支持维度，reportShareVisit 去 attemptId + 加 dimType/taskId**

```typescript
export async function claimActivityShare(payload?: { dimType?: string; dimId?: string | number; activityId?: string }) {
  const p = payload || {}
  const data: Record<string, any> = {}
  const dimType = p.dimType || (p.activityId ? 'activity' : undefined)
  const dimId = p.dimId != null ? p.dimId : (p.activityId ?? undefined)
  if (dimType) data.dimType = dimType
  if (dimId != null) data.dimId = dimId
  const res = await request('/zhao-point/v1/my/point/earn/share', { method: 'POST', data })
  return res?.data ?? res
}
```

```typescript
// reportShareVisit：去掉 attemptId，补充 dimType/taskId 语义（targetType 即维度）
export async function reportShareVisit(payload: {
  inviterId?: string | number
  inviteCode?: string
  targetType?: string   // activity | task | course | article
  targetId?: string | number
}) {
  const data: Record<string, any> = {}
  if (payload.inviterId != null) data.inviterId = payload.inviterId
  if (payload.inviteCode) data.inviteCode = payload.inviteCode
  if (payload.targetType) data.targetType = payload.targetType
  if (payload.targetId != null) data.targetId = payload.targetId
  return request('/v1/my/point/share/visit', { method: 'POST', data })
}
```

> 需确认后端 `/v1/my/point/share/claim` 路由是否存在。若现行领取路由是其它路径，Step 3 对应调整 controller 路由名。

- [ ] **Step 3: 核对 share/claim 路由注册**（找 routes 文件）

```bash
grep -rn "share" e:\code\basic\plugins\zhao-point\server\src\routes\
```

> 把 Step 2 的 claim/status 路径改为实际注册值。

- [ ] **Step 4: 提交**

```bash
cd e:\code\shao
git add services/api.ts
git commit -m "feat(shao): api 支持分享维度 dimType/dimId + 去 attemptId"
```

---

### Task 8: invite.ts 去 attemptId 本地去重 + taskId 上报解析

**Files:**
- Modify: `e:\code\shao\utils\invite.ts:236-320`

- [ ] **Step 1: 去掉 attemptId 本地去重（markReportedAttempt/getReportedAttempts 相关），reportShareVisitFromLaunch 每次启动直接上报**

```typescript
function reportShareVisitFromLaunch(): void {
  // #ifndef H5
  return
  // #endif
  // #ifdef H5
  if (typeof window === 'undefined') return

  const urlParams = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.split('?')[1] ?? ''
  const hashParams = new URLSearchParams(hashQuery)

  const pick = (camel: string, lower: string, snake: string): string =>
    urlParams.get(camel) || urlParams.get(lower) || urlParams.get(snake) ||
    hashParams.get(camel) || hashParams.get(lower) || hashParams.get(snake) || ''

  const inviterId = pick('inviterId', 'inviterid', 'inviter_id')
  const inviteCode = pick('inviteCode', 'invitecode', 'invite_code')
  if (!inviterId && !inviteCode) return

  const path = window.location.hash.replace(/^#/, '').split('?')[0]
  const resolved = resolveShareTargetFromPath(path, hashParams)
  if (!resolved) return

  // 落地 URL: targetId 默认取落地页 id；任务分享链接额外带 taskId → targetType 归为 task
  const taskId = pick('taskId', 'taskid', 'task_id')
  const targetId = taskId || resolved.targetId || urlParams.get('courseId') || urlParams.get('id') || undefined
  const targetType = taskId ? 'task' : resolved.targetType

  reportShareVisit({
    inviterId: inviterId || undefined,
    inviteCode: inviteCode || undefined,
    targetType,
    targetId,
  }).catch((e) => {
    console.warn('[share-visit] 归因上报失败', e)
  })
}
```

> 说明：`taskId` 存在时 `targetType='task'`、`targetId=taskId`；无 `taskId` 则按落地页 `resolved.targetType`（activity 等），保证活动页/任务页分享链各自归位。移除 `getReportedAttempts`/`markReportedAttempt` 导入与定义（若无其它引用）。

- [ ] **Step 2: 提交**

```bash
cd e:\code\shao
git add utils/invite.ts
git commit -m "fix(shao): 去分享点击 attemptId 本地去重 + 解析 taskId 上报 task 维度"
```

---

### Task 9: use-share-claim.ts 增加 waitClick 与维度

**Files:**
- Modify: `e:\code\shao\utils\use-share-claim.ts`

- [ ] **Step 1: 状态域加 hasClick/waitClick，函数接收 dim 参数**

```typescript
export interface ShareClaimState {
  canClaim: boolean
  points: number
  remainingMs: number
  dailyCount: number
  dailyLimit: number
  intervalMinutes: number
  hasClick: boolean
  waitClick: boolean
}

export const DEFAULT_SHARE_STATE: ShareClaimState = {
  canClaim: false,
  points: 5,
  remainingMs: 0,
  dailyCount: 0,
  dailyLimit: 0,
  intervalMinutes: 30,
  hasClick: false,
  waitClick: false,
}

// dim: 维度信息（活动页传 { dimType:'activity', dimId }；任务列表页传 { dimType:'task', dimId }）
export function useShareClaim(dim?: () => { dimType: string; dimId: string | number | undefined }) {
  ...
}
```

- [ ] **Step 2: refresh 传维度、读新字段**

```typescript
  async function refresh() {
    clearTimer()
    if (!isLoggedIn()) {
      state.value = { ...DEFAULT_SHARE_STATE, canClaim: false, waitClick: true }
      return
    }
    loading.value = true
    try {
      const dpt = dim?.()
      const d: any = await getShareClaimStatus(dpt)
      state.value = {
        canClaim: !!d?.canClaim,
        points: typeof d?.points === 'number' ? d.points : DEFAULT_SHARE_STATE.points,
        remainingMs: Number(d?.remainingMs) || 0,
        dailyCount: Number(d?.dailyCount) || 0,
        dailyLimit: Number(d?.dailyLimit) || 0,
        intervalMinutes: Number(d?.intervalMinutes) || DEFAULT_SHARE_STATE.intervalMinutes,
        hasClick: d?.hasClick !== undefined ? !!d.hasClick : (d?.waitClick !== undefined ? !d.waitClick : false),
        waitClick: !!d?.waitClick,
      }
      if (!state.value.canClaim && state.value.remainingMs > 0) {
        timer = setInterval(() => {
          state.value.remainingMs = Math.max(0, state.value.remainingMs - 1000)
          if (state.value.remainingMs <= 0) { clearTimer(); refresh() }
        }, 1000)
      } else if (state.value.waitClick) {
        // 等待好友点击：定期轮询（如 30s）刷新，好友点击后自动点亮倒计时
        timer = setInterval(() => { refresh() }, 30000)
      }
    } catch {
      state.value = { ...DEFAULT_SHARE_STATE, canClaim: isLoggedIn(), waitClick: !isLoggedIn() }
    } finally {
      loading.value = false
    }
  }
```

> 说明：`getShareClaimStatus(dpt)` 传对象，与 Task 7 新签名对齐。waitClick 轮询 30s 让前端感知好友点击后进入倒计时。

- [ ] **Step 3: claim 传维度**

```typescript
  async function claim() {
    if (claiming.value) return { ok: false, message: '请稍候' }
    if (!isLoggedIn()) { redirectToLogin(); return { ok: false, message: '请先登录' } }
    claiming.value = true
    try {
      const dpt = dim?.()
      const rec: any = await claimActivityShare(dpt)
      const pts = typeof rec?.points === 'number' ? rec.points : state.value.points
      await refresh()
      return { ok: true, points: pts }
    } catch (e: any) {
      const msg = (e as any)?.error || (e as any)?.message || '领取失败'
      return { ok: false, message: msg }
    } finally {
      claiming.value = false
    }
  }
```

- [ ] **Step 4: shareReasonText 分类文案**

```typescript
export function shareReasonText(s: ShareClaimState) {
  if (s.canClaim) return ''
  if (s.dailyLimit > 0 && s.dailyCount >= s.dailyLimit) return '今日分享积分次数已达上限'
  if (s.waitClick) return '分享出去等待好友点击'
  const min = Math.ceil(s.remainingMs / 60000)
  if (min > 0) return `距下次可领取约 ${min} 分钟`
  return '登录后可领取'
}
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\shao
git add utils/use-share-claim.ts
git commit -m "feat(shao): use-share-claim 支持 waitClick 状态与活动/任务维度"
```

---

### Task 10: detail.vue 活动页接入维度

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: 活动页 useShareClaim 传维度 activity**

```typescript
const { state: shareClaim, loading: shareLoading, claiming: shareClaiming, refresh: refreshShareClaim, claim: claimShare } =
  useShareClaim(() => ({ dimType: 'activity', dimId: activity.documentId || activity.id }))
```

> 将现有 `useShareClaim(() => id)` 改成维度回调。相关按钮置灰判定用 `!shareClaim.canClaim`，文案用 `shareReasonText(shareClaim.value)`，已有点亮/倒计时逻辑保留。

- [ ] **Step 2: 提交**

```bash
cd e:\code\shao
git add pages/activity/detail.vue
git commit -m "feat(shao): 活动页分享领分接入 activity 维度"
```

---

### Task 11: tasks.vue + share-guide.vue 任务维度接入 + 任务链接带 taskId

**Files:**
- Modify: `e:\code\shao\pages\tasks\tasks.vue`
- Modify: `e:\code\shao\components\share-guide\share-guide.vue`

按方向 A：任务分享落地仍进内容页，但分享链接追加 `&taskId`，`reportShareVisit` 据此归 task 维度。关键：**移除「复制即领分」自动触发**，领分由好友点击+冷却满足驱动的后端裁决。

- [ ] **Step 1: tasks.vue 把 taskId 传给 share-guide**

> tasks.vue 已 `const { state: shareClaim, refresh: refreshShare } = useShareClaim()`（无维度，L65），由 share-guide 统一持有维度。改动模板传参与下拉分享状态：
>
> 1）模板 `ShareGuide` 增加 `:task-id="currentShareTask?.id"`（分享类任务 `action==='activity_share'` 的唯一 id；后端 `getTasks` 返回字段待核对，优先 `id`，其次 `documentId`）。

```vue
<ShareGuide
  v-model:visible="showShareGuide"
  :link-type="currentShareTask?.linkType"
  :link-target-id="currentShareTask?.linkTargetId"
  :link-title="currentShareTask?.title"
  :task-id="currentShareTask?.id"
  @goto="onShareGoto"
  @claimed="onShareClaimed"
/>
```

- [ ] **Step 2: share-guide.vue 接收 taskId，useShareClaim 传任务维度，复制链接不再自动领分**

```typescript
const props = defineProps<{
  visible: boolean
  linkType?: string
  linkTargetId?: string
  linkTitle?: string
  taskId?: string | number
}>()

const { state: claim, refresh: refreshClaim, claim: claimShare } =
  useShareClaim(() => props.taskId != null
    ? { dimType: 'task', dimId: props.taskId }
    : undefined)
```

`copyLink` 中删除 `doClaim()` 调用（保留复制成功 toast），`doClaim` 由"领取积分"按钮触发。

- [ ] **Step 3: share-guide `copyLink` 拼接 taskId**

```typescript
function copyLink() {
  let link = buildShareLink(props.linkType, props.linkTargetId)
  if (!link) { uni.showToast({ title: '该任务暂无可复制的分享链接', icon: 'none' }); return }
  if (props.taskId != null) {
    link += (link.includes('?') ? '&' : '?') + `taskId=${props.taskId}`
  }
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '分享链接已复制', icon: 'none' }),
  })
}
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\shao
git add pages/tasks/tasks.vue components/share-guide/share-guide.vue
git commit -m "feat(shao): 任务分享领分接入 task 维度 + 复制链接带 taskId + 移除复制即领分"
```

---

### Task 12: 前端部署到 v.joho.cn

**Files:**
- Execute: `e:\code\shao\deploy-h5.ps1`

- [ ] **Step 1: 构建并部署**

```bash
cd e:\code\shao
npm run build:h5
powershell -ExecutionPolicy Bypass -File E:\code\shao\deploy-h5.ps1
```

- [ ] **Step 2: 硬刷新验证**
  - 活动页：无好友点击 → 按钮置灰「等待好友点击」；挂个测试号点分享链接 → 刷新进入倒计时 → 30 分钟后可领。
  - 任务列表页：分享任务按钮同规则，维度按 taskId 独立计数。

### Task 13: 复盘记录（遵循项目复盘规则）

**Files:**
- Modify: 项目记忆文件（可选，人工）

- [ ] **Step 1: 记录 1 条核心改进**
  - 问题：分享领分冷却原按"上次领取"、无点击门槛，与"好友点击成功判定"事实不符。
  - 改进：冷却与维度核算统一以 `zhao_point_share_visits` 首击为基准，活动/任务维度独立核算。

**档版结束。**

---

## 自检

**1. 规格覆盖：**
- 成功判定=点击：Task 3/4/5 均有 `hasClick`/`POINT_024` 校验 √
- 首次点击计时、再点不更新：`getShareVisitState` 取最早一条 visit `createdAt` √
- 每日上限维度化：`countTodayShareByDim` + source 标签 `share:{dimType}:{dimId}` √
- 活动/任务分开核算：dimType=activity|task，targetType 枚举加 task，前端两页分别传维度 √
- 去掉 attemptId 去重：Task 1/2（后端）+ Task 7/8（前端）√
- 任务链接带 taskId：Task 8 解析 taskId → task 维度；Task 11 拼接 taskId √

**2. 占位符扫描：** Task 4/11 标注"省略/待读实际代码"处需实现者真实读取合并，无 TBD 假代码；`interval=30` 注释已说明以 earnPoints 内部精确裁决为准。

**3. 类型一致性：** `getShareVisitState`/`countTodayShareByDim` 在 Task 3 定义、Task 4/5 使用，签名一致；`dimType|dimId|activityId` 在服务端与前端命名统一；`getShareClaimStatus(opts)` 新签名与 `useShareClaim(dim)` 回调对象兼容。