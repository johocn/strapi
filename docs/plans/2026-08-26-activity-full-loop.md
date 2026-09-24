# 活动全链路补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐活动"发布→报名/签到→评价→复购→引导学习→归档"全链路：状态自动流转（懒加载）、C 端评价展示、学习内容入口、复购推荐、归档标识。

**Architecture:**
- 后端 zhao-point 插件新增懒加载状态流转 `ensureTransitions/drainDueActivities`，挂在现有读路径（detail/promoDetail/mySignups/adminList/stats/bootstrap），零新增依赖、不引入 cron。
- 评价继续复用 `activity_signups` 记录（新增 `reviewHidden` 布尔字段），新增 C 端公开评价查询 + 学习内容查询接口。
- C 端（shao/）detail.vue 新增评价/学习/复购/归档四区块；my.vue 新增学习入口；运营端（web/）评价看板新增隐藏/恢复。

**Tech Stack:** Strapi v5.47（zhao-point 插件，CommonJS）、uni-app（shao C 端 / web 运营端）。

**Spec:** [2026-08-26-activity-full-loop-design.md](file:///e:/code/docs/specs/2026-08-26-activity-full-loop-design.md)

**Deploy Note（重要）:** 后端零新增依赖，无需重装。dev 验证时重启 `strapi develop`（插件 exports `source` 指向 `server/src`，重启自动迁移 schema）；**生产部署需重建 zhao-point 插件 dist**（在 `e:\code\basic\plugins\zhao-point` 执行 `npm run build`），再重启 basic 服务。

---

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json` | 新增 `reviewHidden` |
| `basic/plugins/zhao-point/server/src/services/activity.ts` | `ensureTransitions`/`drainDueActivities`/`listPublicReviews`/`getLearningContent` + `closeActivity` 幂等 |
| `basic/plugins/zhao-point/server/src/controllers/activity.ts` | detail 增强、新接口、管理端过滤/隐藏 |
| `basic/plugins/zhao-point/server/src/routes/content-api.ts` | 注册 3 个新路由 |
| `basic/plugins/zhao-point/server/src/bootstrap.ts` | 启动 drain |
| `shao/services/api.ts` | C 端 2 个新 API |
| `shao/pages/activity/detail.vue` | 评价/学习/复购/归档 4 区块 |
| `shao/pages/activity/my.vue` | 已解锁学习内容入口 |
| `web/src/api/activity.js` | 运营端隐藏/恢复 API |
| `web/src/pages/activity/review.vue` | 运营端隐藏/恢复按钮 |

---

## Phase 1 — 后端 zhao-point

### Task 1: activity-signup schema 新增 reviewHidden

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json`

- [ ] **Step 1: 在 attributes 中新增字段**

在 `"reviewedAt"` 行后追加（保持 JSON 合法，注意逗号）：

```json
"reviewedAt": { "type": "datetime" },
"reviewHidden": { "type": "boolean", "default": false }
```

- [ ] **Step 2: 校验 JSON 合法**

Run: 在 `e:\code\basic` 执行 `node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-point/server/src/content-types/activity-signup/schema.json','utf8')); console.log('ok')"`
Expected: 输出 `ok`

- [ ] **Step 3: Commit**

```bash
git add basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json
git commit -m "feat(activity): signup 增加 reviewHidden 字段"
```

---

### Task 2: 状态自动流转（ensureTransitions / drainDueActivities）+ closeActivity 幂等

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: closeActivity 加幂等前置守卫**

在 `closeActivity` 方法开头（`if (!act) throw ...` 之后）插入：

```ts
if (act.status === "ended" || act.status === "archived") {
  return { ok: true, closed: false, already: true, reviewTriggered: 0, revisitTriggered: 0, repurchaseTriggered: 0 };
}
```

- [ ] **Step 2: 新增 ensureTransitions / drainDueActivities 方法**

在 `closeActivity` 方法之后、`adminArchive` 之前，插入两个方法（同一 service 返回对象内，用 `this.closeActivity` 复用现有收尾逻辑）：

```ts
/**
 * 懒加载状态流转：读活动时按时间推进状态
 *  - signup_open && now>=startTime → ongoing
 *  - ongoing && now>=endTime → ended（走 closeActivity 收尾：评价引导/复购/回访/快照）
 * 返回是否发生流转；不引入 cron。
 */
async ensureTransitions(activityDocumentId: string) {
  const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
  if (!act) return false;
  const now = Date.now();
  if (act.status === "signup_open" && act.startTime && now >= new Date(act.startTime).getTime()) {
    await strapi.documents(ACTIVITY_UID).update({ documentId: activityDocumentId, data: { status: "ongoing" } });
    return true;
  }
  if (act.status === "ongoing" && act.endTime && now >= new Date(act.endTime).getTime()) {
    await this.closeActivity(activityDocumentId);
    return true;
  }
  return false;
}

/** 批量兜底：扫描到期的 signup_open/ongoing 活动统一推进（管理端聚合/启动时调用） */
async drainDueActivities() {
  const now = new Date().toISOString();
  const rows = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      status: { $in: ["signup_open", "ongoing"] },
      $or: [
        { startTime: { $notNull: true, $lte: now } },
        { endTime: { $notNull: true, $lte: now } },
      ],
    },
    select: ["documentId", "status", "startTime", "endTime"],
  });
  let moved = 0;
  for (const r of rows) {
    try {
      if (await this.ensureTransitions(r.documentId)) moved++;
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] drain ${r.documentId} failed: ${e.message}`);
    }
  }
  return { scanned: rows.length, moved };
}
```

- [ ] **Step 3: 类型自检**

Run: 在 `e:\code\basic` 执行 `npx tsc --noEmit -p plugins/zhao-point/server/tsconfig.json`（如该 tsconfig 存在；不存在则跳过并确认无 TS 报错）
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(activity): 懒加载状态自动流转 ensureTransitions/drainDueActivities + closeActivity 幂等"
```

---

### Task 3: 新增 C 端公开评价 + 学习内容 service 方法

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: 新增 listPublicReviews**

在 `adminReplyMessage` 之后插入（同一 service 返回对象内）：

```ts
/** C 端公开评价列表 + 聚合（仅展示已公开：rating!=null && reviewHidden!=true） */
async listPublicReviews({ activityDocumentId, page = 1, pageSize = 20 }: {
  activityDocumentId: string; page?: number; pageSize?: number;
}) {
  const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
  if (!act) throw new Error("活动不存在");
  const visible: any = {
    activity: act.id,
    status: "active",
    rating: { $notNull: true },
    reviewHidden: { $ne: true },
  };
  const result = await strapi.db.query(SIGNS_UID).findPage({
    where: visible,
    populate: { user: true },
    orderBy: { reviewedAt: "desc" },
    page, pageSize,
  });
  const rows = (result?.results ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    nps: r.nps,
    review: r.review,
    reviewedAt: r.reviewedAt,
    user: r.user ? {
      id: r.user.id, username: r.user.username,
      nickname: r.user.nickname, avatar: r.user.avatar,
    } : null,
  }));
  const all = await strapi.db.query(SIGNS_UID).findMany({
    where: visible, select: ["rating", "nps", "review"],
  });
  const withRating = all.filter((r: any) => r.rating != null);
  const withNps = all.filter((r: any) => r.nps != null);
  const withText = all.filter((r: any) => r.review && String(r.review).trim());
  const avgRating = withRating.length ? withRating.reduce((a: number, r: any) => a + r.rating, 0) / withRating.length : 0;
  const avgNps = withNps.length ? withNps.reduce((a: number, r: any) => a + r.nps, 0) / withNps.length : 0;
  return {
    rows,
    summary: {
      count: all.length,
      avgRating: Number(avgRating.toFixed(2)),
      avgNps: Number(avgNps.toFixed(2)),
      reviewCount: withText.length,
    },
    pagination: result?.pagination ?? { page, pageSize, pageCount: 1, total: rows.length },
  };
}

/** 本活动本人已解锁学习内容：报名解锁(preUnlock*) + 签到解锁(learningPackage*) */
async getLearningContent({ userId, activityDocumentId }: {
  userId: number; activityDocumentId: string;
}) {
  const act = await strapi.documents(ACTIVITY_UID).findOne({
    documentId: activityDocumentId,
    populate: {
      preUnlockArticles: true,
      preUnlockLessons: { populate: { course: true } },
      learningPackageArticles: true,
      learningPackageLessons: { populate: { course: true } },
    },
  });
  if (!act) throw new Error("活动不存在");
  const signup = await strapi.db.query(SIGNS_UID).findOne({
    where: { activity: act.id, user: userId },
  });
  const checkedIn = !!signup?.attendedAt;
  const dedupeByDocId = (arr: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const x of arr) {
      if (!x) continue;
      const k = x.documentId || String(x.id);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };
  const articles = dedupeByDocId(
    checkedIn
      ? [...(act.learningPackageArticles || []), ...(act.preUnlockArticles || [])]
      : [...(act.preUnlockArticles || [])]
  ).map((a: any) => ({ documentId: a.documentId, title: a.title, url: a.url || null }));
  const lessons = dedupeByDocId(
    checkedIn
      ? [...(act.learningPackageLessons || []), ...(act.preUnlockLessons || [])]
      : [...(act.preUnlockLessons || [])]
  ).map((l: any) => ({
    documentId: l.documentId, title: l.title,
    course: l.course ? { documentId: l.course.documentId, title: l.course.title } : null,
  }));
  const courses = dedupeByDocId(lessons.map((l: any) => l.course).filter(Boolean));
  return { checkedIn, articles, lessons, courses };
}
```

- [ ] **Step 2: 确认 `SIGNS_UID` / `ACTIVITY_UID` 常量已在文件顶部定义**

Run: 在 `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts` 用 Grep 搜索 `SIGNS_UID`、`ACTIVITY_UID`
Expected: 二者均有 `const ... = "plugin::..."` 定义（已在 L4/L7 存在）

- [ ] **Step 3: Commit**

```bash
git add basic/plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(activity): 新增 C 端公开评价查询与已解锁学习内容 service"
```

---

### Task 4: 控制器挂载流转 + 新接口 + 管理端增强

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/controllers/activity.ts`

- [ ] **Step 1: detail 增强（惰性流转 + ratingSummary + archived 标识）**

将 `async detail(ctx)` 开头改为先执行流转；在 `ctx.body = wrap(activity)` 前注入聚合。修改后 detail 方法体：

```ts
async detail(ctx: any) {
  try {
    await activitySvc().ensureTransitions(ctx.params.documentId);
    const activity = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: ctx.params.documentId,
      populate: "*",
    });
    if (!activity) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
    // 强角色门控：租户开启 roleGate 且活动配置了 visibleToRoles 时，未授权角色不可见
    const roleGateEnabled = await isRoleGateEnabled(strapi, ctx.state?.siteDocumentId);
    if (roleGateEnabled) {
      const userRoles = await resolveUserRoles(strapi, ctx.state.user?.id);
      if (!mayAccessVisibleToRoles(userRoles, activity.visibleToRoles)) {
        ctx.status = 403; ctx.body = { error: "无权查看该活动" }; return;
      }
    }
    // 口碑聚合（仅公开评价）
    const reviews = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: activity.id, status: "active", rating: { $notNull: true }, reviewHidden: { $ne: true } },
      select: ["rating", "review"],
    });
    const withText = reviews.filter((r: any) => r.review && String(r.review).trim());
    activity.ratingSummary = {
      count: reviews.length,
      avgRating: reviews.length ? Number((reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length).toFixed(2)) : 0,
      reviewCount: withText.length,
    };
    activity.archived = activity.status === "archived";
    ctx.body = wrap(activity);
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},
```

- [ ] **Step 2: promoDetail 惰性流转**

在 `activitySvc().promoDetail` 调用前插入：

```ts
await activitySvc().ensureTransitions(ctx.params.documentId);
```

- [ ] **Step 3: mySignups 批量兜底**

在 `async mySignups(ctx)` 的 `try {` 之后、`const userId = getUserId(ctx);` 之前插入：

```ts
await activitySvc().drainDueActivities();
```

- [ ] **Step 4: adminList 批量兜底**

在 `async adminList(ctx)` 的 `try {` 之后插入：

```ts
await activitySvc().drainDueActivities();
```

- [ ] **Step 5: 新增公开评价 / 学习内容 / 管理端隐藏 3 个方法**

在 `adminReviews` 方法之前插入：

```ts
// GET /activities/:documentId/reviews  C 端公开评价列表+聚合
async listReviews(ctx: any) {
  try {
    const result = await activitySvc().listPublicReviews({
      activityDocumentId: ctx.params.documentId,
      page: parseInt(ctx.query.page || "1"),
      pageSize: parseInt(ctx.query.pageSize || "20"),
    });
    ctx.body = wrap(result);
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},

// GET /my/activity/:documentId/learning  已解锁学习内容
async learningContent(ctx: any) {
  try {
    const userId = getUserId(ctx);
    const result = await activitySvc().getLearningContent({
      userId,
      activityDocumentId: ctx.params.documentId,
    });
    ctx.body = wrap(result);
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},

// PUT /adm/activity-reviews/:signupId/hidden  body:{hidden:boolean}  评价隐藏/恢复
async adminToggleReviewHidden(ctx: any) {
  try {
    const { signupId } = ctx.params;
    const { hidden } = ctx.request.body || {};
    await strapi.db.query(SIGNS_UID).update({
      where: { id: Number(signupId) },
      data: { reviewHidden: !!hidden },
    });
    ctx.body = wrap({ ok: true, hidden: !!hidden });
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},
```

- [ ] **Step 6: adminReviews 过滤隐藏 + rows 返回 reviewHidden 字段**

在 `adminReviews` 的 filter 定义处（`$or` 行后）追加隐藏过滤，并在 rows 映射中返回 `reviewHidden`。修改后关键片段：

```ts
const filter: any = {
  $or: [{ rating: { $notNull: true } }, { review: { $notNull: true } }],
  reviewHidden: { $ne: true },
};
```

rows 映射（`r: any) => ({` 对象内）追加一行：

```ts
reviewHidden: r.reviewHidden ?? false,
```

- [ ] **Step 7: Commit**

```bash
git add basic/plugins/zhao-point/server/src/controllers/activity.ts
git commit -m "feat(activity): 控制器挂懒加载流转、新增公开评价/学习/隐藏接口"
```

---

### Task 5: 注册路由 + bootstrap 启动 drain

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/routes/content-api.ts`
- Modify: `basic/plugins/zhao-point/server/src/bootstrap.ts`

- [ ] **Step 1: content-api.ts 注册 3 个路由**

在 `userRoute("POST", "/activities/:documentId/review", "activity.review"),` 行后插入：

```ts
publicRoute("GET", "/activities/:documentId/reviews", "activity.listReviews"),
userRoute("GET", "/my/activity/:documentId/learning", "activity.learningContent"),
```

在 `channelScopeRoute("GET", "/adm/activity-reviews", "activity.adminReviews", "activity.read"),` 行后插入：

```ts
channelScopeRoute("PUT", "/adm/activity-reviews/:signupId/hidden", "activity.adminToggleReviewHidden", "activity.update"),
```

- [ ] **Step 2: bootstrap.ts 启动 drain**

在 bootstrap 函数末尾（`}` 闭合 try/catch 之后、`};` 之前）插入：

```ts
// 启动兜底：推进已到期但未流转的活动（懒加载流转的历史积压）
try {
  const actSvc = strapi.plugin("zhao-point").service("activity");
  if (actSvc?.drainDueActivities) await actSvc.drainDueActivities();
} catch (err: any) {
  strapi.log.warn(`[zhao-point] 启动 drain 失败: ${err.message}`);
}
```

- [ ] **Step 3: 确认 bootstrap 为 async 函数**

Run: Grep `const bootstrap = async` 于 `basic/plugins/zhao-point/server/src/bootstrap.ts`
Expected: 存在（L5 已为 `async`）

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-point/server/src/routes/content-api.ts basic/plugins/zhao-point/server/src/bootstrap.ts
git commit -m "feat(activity): 注册公开评价/学习/隐藏路由 + 启动 drain"
```

---

### Task 6: 后端构建与接口验证

**Files:**
- 无新增

- [ ] **Step 1: 重启 dev 服务使 schema 迁移生效**

在 `e:\code\basic` 停止旧 dev 进程（内存中有多实例历史问题，先清理），再启动：

```bash
npx strapi develop
```

Expected: 启动日志无 schema 报错；`activity_signups` 表自动新增 `review_hidden` 列

- [ ] **Step 2: 验证状态懒加载流转**

用 curl 访问一个已到 startTime 但仍 `signup_open` 的活动：

```bash
curl -s http://localhost:1337/zhao-point/v1/activities/{documentId}
```

Expected: 返回体 `status` 变为 `ongoing` 或 `ended`（若已到 endTime，且 `reviewTriggered/repurchaseTriggered` 通知按 sso 绑定触发）

- [ ] **Step 3: 验证公开评价接口**

```bash
curl -s http://localhost:1337/zhao-point/v1/activities/{documentId}/reviews
```

Expected: 返回 `{ data: { rows, summary: { count, avgRating, reviewCount }, pagination } }`；无评价时 count=0

- [ ] **Step 4: 验证学习内容接口（带登录态）**

```bash
curl -s -H "Authorization: Bearer {token}" http://localhost:1337/zhao-point/v1/my/activity/{documentId}/learning
```

Expected: 返回 `{ data: { checkedIn, articles, lessons, courses } }`；未签到仅含 preUnlock* 内容

- [ ] **Step 5: 验证管理端隐藏接口**

```bash
curl -s -X PUT -H "Authorization: Bearer {adminToken}" -H "Content-Type: application/json" -d '{"hidden":true}' http://localhost:1337/zhao-point/v1/admin/adm/activity-reviews/{signupId}/hidden
curl -s http://localhost:1337/zhao-point/v1/activities/{documentId}/reviews
```

Expected: 第一条返回 `{ ok: true, hidden: true }`；第二条该条评价不再出现在公开列表

- [ ] **Step 6: 记录验证结果并清理**

将验证中发现的问题修复后回退验证数据（隐藏标记恢复为 false），保留代码改动。

---

## Phase 2 — C 端（shao/）

### Task 7: api.ts 新增 2 个接口

**Files:**
- Modify: `shao/services/api.ts`

- [ ] **Step 1: 在 `myActivities` 之后追加**

```ts
/**
 * 活动公开评价列表 + 聚合（公开，无需登录）
 * @returns { rows, summary: { count, avgRating, reviewCount }, pagination }
 */
export async function getActivityReviews(documentId: string, params: { page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams(params as any).toString()
  const res = await request(`/zhao-point/v1/activities/${documentId}/reviews${query ? '?' + query : ''}`)
  return res?.data ?? res
}

/**
 * 本人已解锁学习内容（需登录）
 * @returns { checkedIn, articles, lessons, courses }
 */
export async function getMyActivityLearning(activityId: string) {
  const res = await request(`/zhao-point/v1/my/activity/${activityId}/learning`)
  return res?.data ?? res
}
```

- [ ] **Step 2: 语法检查**

Run: 在 `e:\code\shao` 执行 `npx vue-tsc --noEmit -p tsconfig.json`（若项目用 vue-tsc；否则 `npx eslint services/api.ts`）
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add shao/services/api.ts
git commit -m "feat(activity): C端新增公开评价/学习内容 API"
```

---

### Task 8: detail.vue 新增学员评价区块

**Files:**
- Modify: `shao/pages/activity/detail.vue`

- [ ] **Step 1: 模板——在"回放与资料"card 之后插入评价区块**

在模板中 `<!-- 分享海报入口 -->` 注释行之前插入：

```html
<!-- 学员评价（公开聚合 + 列表，有评价才展示） -->
<view v-if="reviewSummary.count > 0" class="card reviews-card">
  <view class="reviews-head">
    <text class="reviews-title">学员评价</text>
    <view class="reviews-score">
      <text class="reviews-score-num">{{ reviewSummary.avgRating }}</text>
      <text class="reviews-score-sub">/5 · {{ reviewSummary.count }} 条</text>
    </view>
  </view>
  <view v-for="r in reviews" :key="r.id" class="review-item">
    <view class="review-item-top">
      <text class="review-stars">{{ starText(r.rating) }}</text>
      <text class="review-user">{{ r.user?.nickname || r.user?.username || '学员' }}</text>
      <text class="review-time">{{ shortDate(r.reviewedAt) }}</text>
    </view>
    <text v-if="r.review" class="review-text">{{ r.review }}</text>
  </view>
</view>
```

- [ ] **Step 2: script——新增 refs 与加载函数**

在 `const reviewed = ref(false)` 行后追加：

```ts
const reviews = ref<any[]>([])
const reviewSummary = ref<{ count: number; avgRating: number; reviewCount: number }>({ count: 0, avgRating: 0, reviewCount: 0 })
```

在 `submitReview` 函数之后、`onMounted` 之前追加：

```ts
async function loadReviews() {
  if (!id) return
  try {
    const payload = await getActivityReviews(id)
    if (Array.isArray(payload?.rows)) {
      reviews.value = payload.rows
      reviewSummary.value = payload.summary ?? { count: 0, avgRating: 0, reviewCount: 0 }
    } else if (Array.isArray(payload)) {
      reviews.value = payload
    }
  } catch (e) {
    console.warn('加载评价失败', e)
  }
}

function starText(rating: number): string {
  const n = Math.max(0, Math.min(5, Number(rating) || 0))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function shortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getMonth() + 1}-${d.getDate()}`
}
```

- [ ] **Step 3: script——loadActivity 中调用**

将 `loadActivity` 内 `loadFee()` / `restoreSignupState()` 调用改为顺序等待并追加：

```ts
  loadFee()
  await restoreSignupState()
  loadReviews()
```

（`restoreSignupState` 改为 `await restoreSignupState()`）

- [ ] **Step 4: import getActivityReviews**

将 `import { ... } from '../../services/api'` 中加入 `getActivityReviews`

- [ ] **Step 5: 样式——追加 reviews 样式**

在 `<style lang="scss" scoped>` 末尾追加：

```scss
.reviews-card { margin-top: 20rpx; }
.reviews-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.reviews-title { font-size: 32rpx; font-weight: 600; color: #333; }
.reviews-score { display: flex; align-items: baseline; }
.reviews-score-num { font-size: 44rpx; font-weight: bold; color: #fa8c16; }
.reviews-score-sub { font-size: 22rpx; color: #999; margin-left: 8rpx; }
.review-item { padding: 20rpx 0; border-top: 1rpx solid #f5f5f5; }
.review-item-top { display: flex; align-items: center; gap: 16rpx; }
.review-stars { color: #fa8c16; font-size: 24rpx; }
.review-user { font-size: 24rpx; color: #666; flex: 1; }
.review-time { font-size: 22rpx; color: #bbb; }
.review-text { display: block; font-size: 26rpx; color: #333; margin-top: 10rpx; line-height: 1.6; }
```

- [ ] **Step 6: Commit**

```bash
git add shao/pages/activity/detail.vue
git commit -m "feat(activity): C端详情页新增学员评价区块"
```

---

### Task 9: detail.vue 新增学习资料包区块 + 已归档角标

**Files:**
- Modify: `shao/pages/activity/detail.vue`

- [ ] **Step 1: 模板——归档角标**

将状态标签 `<view v-if="activity.status" :class="['status-tag', ...]">` 改为并列追加（在其后插入）：

```html
<view v-if="activity.archived" class="archived-tag">已归档</view>
```

- [ ] **Step 2: 模板——学习资料包区块（在"学员评价"card 之后插入）**

```html
<!-- 学习资料包（已解锁内容，签到后含学习包） -->
<view v-if="learningContent && (learningContent.articles.length || learningContent.lessons.length)" class="card learn-card">
  <text class="learn-title">学习资料包</text>
  <view v-for="a in learningContent.articles" :key="'a' + a.documentId" class="learn-item" @click="openLearnArticle(a)">
    <text class="learn-icon">📄</text>
    <text class="learn-name">{{ a.title }}</text>
    <text class="learn-arrow">›</text>
  </view>
  <view v-for="l in learningContent.lessons" :key="'l' + l.documentId" class="learn-item" @click="openLearnLesson(l)">
    <text class="learn-icon">▶</text>
    <text class="learn-name">{{ l.title }}</text>
    <text class="learn-arrow">›</text>
  </view>
  <view v-for="c in learningContent.courses" :key="'c' + c.documentId" class="learn-item" @click="goCourse(c)">
    <text class="learn-icon">🎓</text>
    <text class="learn-name">{{ c.title }}</text>
    <text class="learn-arrow">›</text>
  </view>
</view>
```

- [ ] **Step 3: script——新增 refs 与加载/跳转函数**

在 `const reviewSummary = ...` 行后追加：

```ts
const learningContent = ref<{ checkedIn: boolean; articles: any[]; lessons: any[]; courses: any[] } | null>(null)
```

在 `shortDate` 函数之后追加：

```ts
async function loadLearning() {
  if (!id || !getToken()) return
  try {
    const payload = await getMyActivityLearning(id)
    learningContent.value = payload ?? null
  } catch (e) {
    console.warn('加载学习内容失败', e)
  }
}

function goCourse(c: any) {
  if (c?.documentId) uni.navigateTo({ url: `/pages/course-detail/course-detail?courseId=${c.documentId}` })
}

function openLearnLesson(l: any) {
  if (l?.course?.documentId) goCourse(l.course)
  else if (l?.documentId) uni.showToast({ title: '请在课程详情中学习', icon: 'none' })
}

function openLearnArticle(a: any) {
  if (a?.url) openUrl(a.url)
  else uni.showToast({ title: '文章：' + (a?.title || ''), icon: 'none' })
}
```

- [ ] **Step 4: script——loadActivity 中调用**

在 `loadActivity` 的 `loadReviews()` 之后追加：

```ts
  if (activity.value?.status === 'ended' || signedUp.value) loadLearning()
```

- [ ] **Step 5: import getMyActivityLearning**

将 api import 中加入 `getMyActivityLearning`

- [ ] **Step 6: 样式——追加 learn/archived 样式**

```scss
.archived-tag { flex-shrink: 0; font-size: 22rpx; color: #999; background: #f5f5f5; padding: 4rpx 12rpx; border-radius: 8rpx; }
.learn-card { margin-top: 20rpx; }
.learn-title { font-size: 32rpx; font-weight: 600; color: #333; display: block; margin-bottom: 8rpx; }
.learn-item { display: flex; align-items: center; padding: 18rpx 0; border-top: 1rpx solid #f5f5f5; }
.learn-icon { font-size: 28rpx; margin-right: 14rpx; }
.learn-name { flex: 1; font-size: 26rpx; color: #333; }
.learn-arrow { color: #ccc; font-size: 28rpx; }
```

- [ ] **Step 7: Commit**

```bash
git add shao/pages/activity/detail.vue
git commit -m "feat(activity): C端详情页新增学习资料包与归档角标"
```

---

### Task 10: detail.vue 新增复购推荐卡片（ended）

**Files:**
- Modify: `shao/pages/activity/detail.vue`

- [ ] **Step 1: 模板——在"学习资料包"card 之后插入推荐卡片**

```html
<!-- 下次活动推荐（已结束：同系列/同类可报名场次） -->
<view v-if="relatedActivities.length" class="card related-card">
  <text class="related-title">下次活动推荐</text>
  <view v-for="ra in relatedActivities" :key="ra.documentId" class="related-item" @click="goDetail(ra)">
    <view class="related-main">
      <text class="related-name">{{ ra.title }}</text>
      <text class="related-time">{{ formatTime(ra.startTime) }}</text>
    </view>
    <view class="related-cta"><text>{{ ra.status === 'signup_open' ? '报名' : '查看' }}</text></view>
  </view>
</view>
```

- [ ] **Step 2: script——新增 refs 与加载函数**

在 `const learningContent = ...` 行后追加：

```ts
const relatedActivities = ref<any[]>([])
```

在 `openLearnArticle` 函数之后追加：

```ts
async function loadRelated() {
  if (!id) return
  try {
    let list: any[] = []
    const seriesId = activity.value?.belongsToSeries?.documentId
    if (seriesId) {
      const s = await getSeries(seriesId)
      list = Array.isArray(s?.activities) ? s.activities : []
    } else if (activity.value?.category) {
      const res = await listActivities({ category: activity.value.category, page: 1, pageSize: 8 } as any)
      const arr = (res as any)?.data ?? res
      list = Array.isArray(arr) ? arr : []
    }
    relatedActivities.value = list
      .filter((a: any) => a.documentId !== id && a.status === 'signup_open')
      .slice(0, 3)
  } catch (e) {
    console.warn('加载相关活动失败', e)
  }
}

function goDetail(ra: any) {
  uni.navigateTo({ url: `/pages/activity/detail?id=${ra.documentId}` })
}
```

- [ ] **Step 3: script——loadActivity 中调用**

在 `loadActivity` 的 `loadReviews()` 之后追加：

```ts
  if (activity.value?.status === 'ended') loadRelated()
```

- [ ] **Step 4: import getSeries / listActivities**

将 api import 中加入 `getSeries`、`listActivities`（确认 `listActivities` 已在 import 中则仅加 `getSeries`）

- [ ] **Step 5: 样式——追加 related 样式**

```scss
.related-card { margin-top: 20rpx; }
.related-title { font-size: 32rpx; font-weight: 600; color: #333; display: block; margin-bottom: 8rpx; }
.related-item { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid #f5f5f5; }
.related-main { flex: 1; }
.related-name { display: block; font-size: 28rpx; color: #333; }
.related-time { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.related-cta { flex-shrink: 0; font-size: 24rpx; color: #667eea; border: 1rpx solid #667eea; padding: 6rpx 20rpx; border-radius: 24rpx; }
```

- [ ] **Step 6: Commit**

```bash
git add shao/pages/activity/detail.vue
git commit -m "feat(activity): C端已结束活动新增下次活动推荐"
```

---

### Task 11: my.vue 新增已解锁学习内容入口

**Files:**
- Modify: `shao/pages/activity/my.vue`

- [ ] **Step 1: script——loadRecords 追加学习内容加载**

在 `loadRecords` 的 `records.value = ...` 之后追加（复用同一批 activities 过滤已报名/已结束项）：

```ts
  await loadLearningSummary(list)
```

并新增函数（放在 `loadRecords` 之后）：

```ts
/** 汇总已报名活动的已解锁学习内容（仅已签到/已结束的报名记录） */
const learningSummary = ref<any[]>([])

async function loadLearningSummary(list: any[]) {
  try {
    const eligible = (Array.isArray(list) ? list : []).filter(
      (r: any) => r?.attendance?.checkedIn || r?.activity?.status === 'ended'
    )
    const items: any[] = []
    for (const r of eligible.slice(0, 5)) {
      const actId = r.activity?.documentId || r.activity?.id
      if (!actId) continue
      const payload = await getMyActivityLearning(actId)
      if (!payload) continue
      const total = (payload.articles?.length || 0) + (payload.lessons?.length || 0) + (payload.courses?.length || 0)
      if (total > 0) {
        items.push({ activityId: actId, title: r.activity?.title, count: total })
      }
    }
    learningSummary.value = items
  } catch (e) {
    console.warn('加载学习内容汇总失败', e)
  }
}
```

- [ ] **Step 2: 模板——在记录列表前插入学习入口**

```html
<view v-if="learningSummary.length" class="learn-summary">
  <text class="learn-summary-title">已解锁学习内容</text>
  <view v-for="ls in learningSummary" :key="ls.activityId" class="learn-summary-item" @click="goLearn(ls)">
    <text class="learn-summary-name">{{ ls.title }}</text>
    <text class="learn-summary-count">{{ ls.count }} 项</text>
    <text class="learn-summary-arrow">›</text>
  </view>
</view>
```

并新增跳转函数：

```ts
function goLearn(ls: any) {
  uni.navigateTo({ url: `/pages/activity/detail?id=${ls.activityId}` })
}
```

- [ ] **Step 3: import getMyActivityLearning**

将 api import 中加入 `getMyActivityLearning`

- [ ] **Step 4: 样式——追加 learn-summary 样式**

```scss
.learn-summary { background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05); }
.learn-summary-title { display: block; font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 12rpx; }
.learn-summary-item { display: flex; align-items: center; padding: 16rpx 0; border-top: 1rpx solid #f5f5f5; }
.learn-summary-name { flex: 1; font-size: 26rpx; color: #333; }
.learn-summary-count { font-size: 24rpx; color: #667eea; margin-right: 10rpx; }
.learn-summary-arrow { color: #ccc; font-size: 26rpx; }
```

- [ ] **Step 5: Commit**

```bash
git add shao/pages/activity/my.vue
git commit -m "feat(activity): C端我的活动新增已解锁学习内容入口"
```

---

## Phase 3 — 运营端（web/）

### Task 12: 评价看板支持隐藏/恢复

**Files:**
- Modify: `web/src/api/activity.js`
- Modify: `web/src/pages/activity/review.vue`

- [ ] **Step 1: api.js 新增隐藏/恢复**

在 `getActivityReviews` 之后追加：

```js
// 评价隐藏/恢复（body:{hidden:boolean}；隐藏后 C 端公开列表不再展示）
export function setActivityReviewHidden(signupId, hidden) {
  return put(`${ADMIN}/activity-reviews/${signupId}/hidden`, { hidden })
}
```

- [ ] **Step 2: review.vue 列表项新增操作按钮**

在 `review-card` 内（评价文本之后）追加操作按钮：

```html
<view class="review-ops" v-if="row.id">
  <view class="review-op" @click.stop="toggleHidden(row)">{{ row.reviewHidden ? '恢复显示' : '隐藏' }}</view>
</view>
```

在 script 中新增处理函数（`load` 之后）：

```js
async function toggleHidden(row) {
  try {
    const next = !row.reviewHidden
    await setActivityReviewHidden(row.id, next)
    row.reviewHidden = next
    uni.showToast({ title: next ? '已隐藏' : '已恢复', icon: 'none' })
    load()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
```

在 import 行加入 `setActivityReviewHidden`。

- [ ] **Step 3: 样式——追加 review-ops**

```scss
.review-ops { margin-top: 12rpx; display: flex; justify-content: flex-end; }
.review-op { font-size: 24rpx; color: #667eea; border: 1rpx solid #667eea; padding: 4rpx 16rpx; border-radius: 20rpx; }
```

- [ ] **Step 4: Commit**

```bash
git add web/src/api/activity.js web/src/pages/activity/review.vue
git commit -m "feat(activity): 运营端评价看板支持隐藏/恢复"
```

---

### Task 13: 端到端验证（C 端页面）

**Files:**
- 无新增

- [ ] **Step 1: 启动 C 端 H5 并验证 detail 页**

在 `e:\code\shao` 启动 H5 dev；Playwright 打开一个 `ended` 活动详情页，断言：
- 有"学员评价"区块（若有评价）
- 有"学习资料包"区块（已签到本人可见）
- 有"下次活动推荐"区块
- 无 console 报错

- [ ] **Step 2: 验证 my.vue 学习入口**

打开"我的活动"页，断言已解锁学习内容汇总项可点击跳转详情。

- [ ] **Step 3: 验证运营端评价看板**

在 `e:\code\web` 启动 H5 dev；打开评价看板页，断言隐藏按钮生效、隐藏后 C 端公开列表不再显示。

- [ ] **Step 4: 收口清理（项目约定强制）**

停 dev、`git restore dist/`、清理临时诊断脚本。

---

## Self-Review

**Spec 覆盖：**
- A（状态自动流转）→ Task 2/4/5/6 ✓
- B（C 端评价展示）→ Task 3/4/5/7/8/12 ✓
- C（引导学习入口）→ Task 3/4/5/7/9/11 ✓
- D（复购推荐）→ Task 10 ✓
- E（归档收尾）→ Task 4（archived 标识）/9（角标）✓

**一致性：**
- `ensureTransitions`/`drainDueActivities`/`listPublicReviews`/`getLearningContent` 在 Task 2/3 定义，Task 4-6 使用，签名一致。
- 控制器方法 `listReviews`/`learningContent`/`adminToggleReviewHidden` 与路由 handler 字符串（`activity.listReviews` 等）一致。
- C 端 API 名 `getActivityReviews`/`getMyActivityLearning`/`getSeries`/`listActivities` 与 Task 7 及既有 api.ts 一致。
- `reviewHidden` 字段在 Task 1 定义，Task 3/4/12 使用一致。

**注意点（已在计划内体现）：**
- `restoreSignupState` 改为 `await` 后再加载学习内容，避免时序问题。
- 公开 `list` 不挂 drain，避免高流量读路径写放大；drain 仅在 adminList/stats/mySignups/bootstrap 触发。
