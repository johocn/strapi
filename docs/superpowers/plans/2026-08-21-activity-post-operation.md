# 活动后运营（三合一闭环）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 活动结束（admin 关闭）时触发三合一触达（到场回执+次日复购、未到场次日挽回），并打通 C 端评价提交 + 运营端评价看板。

**Architecture:** 在 zhao-point 插件内，把 `activity.closeActivity` 从"仅置 ended + 未到场立即回访"扩展为按到场/未到场分队列、用 `sso-sop.trigger(...schedules[])` 建立多档期 msg-job；评价直接写在 `activity-signup` 上（一报名一评价天然一对一）；新增 3 个 controller 方法经 `sso-sop`/`sso-msg` 落库与聚合。web 管理端加评价看板页，shao 客户端活动详情页加评价弹层。

**Tech Stack:** Strapi 5 插件（zhao-point）、zhao-sso（sso-sop 事件/sso-msg 消息）、PostgreSQL、Vue3 + uni-app（web/shao）。

---

### 验收运行前提
- 本地启动 dev：`cd e:\code\basic && npm run dev`（port 1337）。
- 插件 TS/JSON 改动后需重建产物：`cd e:\code\basic\plugins\zhao-point && npm run build`，再重启 dev。
- 三仓库：`e:\code\basic`（后端）、`e:\code\web`（web 管理端）、`e:\code\shao`（C 端）。

---

### Task 1: 数据模型（activity-signup 追加评价字段）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-signup\schema.json`

- [ ] **Step 1: schema 追加字段**

在 `activity-signup/schema.json` 的 `attributes` 末尾（`attendedAt` 后）追加：

```json
    "rating": { "type": "integer", "min": 1, "max": 5 },
    "nps": { "type": "integer", "min": 0, "max": 10 },
    "review": { "type": "text" },
    "reviewedAt": { "type": "datetime" }
```

- [ ] **Step 2: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: esbuild 完成，`dist/server/index.js` 更新，无类型错误。

- [ ] **Step 3: 重启 dev 并确认 schema 加载**

停掉 `npm run dev` 进程后重启；打开 `<admin>/content-type-builder` 或 `activities_signups` 表确认新列已生成。

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-point && git commit -m "feat(point): add activity signup review fields (rating/nps/review/reviewedAt)"
```

---

### Task 2: closeActivity 扩展为三合一触发

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts:216-247`

- [ ] **Step 1: 改写 `closeActivity`**

替换现有 `closeActivity` 方法体（含 `// 未签到...tsigns` 到 `return { ok:true, closed:true, revisitTriggered }` 整个区块），改为：

```ts
  async closeActivity(activityId: string) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    await strapi.documents("plugin::zhao-point.activity").update({ documentId: activityId, data: { status: "ended" } });
    const name = act.title;
    const startTime = act.startTime;
    // 全部有效报名按到场分队列：到场 → 回执(立即)+复购(次日)；未到场 → 挽回(次日)
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active" },
      populate: ["user"],
    });
    let reviewTriggered = 0;
    let revisitTriggered = 0;
    let repurchaseTriggered = 0;
    for (const s of signs) {
      const upUserId = s.user?.id ?? s.user;
      if (!upUserId) continue;
      try {
        const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
        if (!sop) continue;
        const sso = await sop.resolveSsoUserForUpUser(upUserId);
        if (!sso) continue;
        const attended = !!s.attendedAt;
        const schedules: any[] = attended
          ? [
              { templateCode: "act_receipt", scene: "activity.receipt" },
              { templateCode: "act_repurchase", scene: "activity.repurchase", delayMinutes: 1440 },
            ]
          : [{ templateCode: "act_revisit", scene: "activity.closed", delayMinutes: 1440 }];
        await sop.trigger("activity.closed", {
          user: sso.id,
          payload: { activity: { name, startTime } },
          schedules,
        });
        if (attended) { reviewTriggered++; repurchaseTriggered++; }
        else revisitTriggered++;
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] closeActivity embed failed (user=${upUserId}): ${e.message}`);
      }
    }
    return { ok: true, closed: true, reviewTriggered, revisitTriggered, repurchaseTriggered };
  },
```

> 说明：sso-sop.trigger 对每个 job 内部 try/catch，模板缺失（buildJob 抛 SSO_MSG_TEMPLATE_404）被吞掉仅 warn，绝不阻断关闭流程。

- [ ] **Step 2: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: BUILD 成功。

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-point && git commit -m "feat(point): extend closeActivity into 3-way post-activity SOP triggers"
```

---

### Task 3: Controller 新增 review / adminClose / adminReviews

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts:288`（`fissionLeaderboard` 前加三个方法）
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`
- Verify: `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts`（方法加在既有 `activity` 对象内，无需新增控制器，故 index.ts 不改）

- [ ] **Step 1: controller 加 `review`（C 端提交评价）**

在 `fissionLeaderboard` 方法前插入：

```ts
  // POST /activities/:documentId/review （注册用户评价：评分1-5/NPS 0-10/文字）
  async review(ctx: any) {
    const userId = getUserId(ctx);
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
    if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: act.id, status: "active" },
    });
    if (!signup) { ctx.status = 403; ctx.body = { error: "尚未报名，无法评价" }; return; }
    const { rating, nps, review } = ctx.request.body || {};
    if (rating != null && (Number(rating) < 1 || Number(rating) > 5)) {
      ctx.status = 400; ctx.body = { error: "评分须在1-5之间" }; return;
    }
    if (nps != null && (Number(nps) < 0 || Number(nps) > 10)) {
      ctx.status = 400; ctx.body = { error: "NPS须在0-10之间" }; return;
    }
    await strapi.db.query(SIGNS_UID).update({
      where: { id: signup.id },
      data: {
        rating: rating != null ? Number(rating) : signup.rating,
        nps: nps != null ? Number(nps) : signup.nps,
        review: review != null ? String(review) : signup.review,
        reviewedAt: new Date(),
      },
    });
    ctx.body = wrap({ ok: true });
  },

  // POST /adm/activities/:documentId/close （管理员关闭活动并触发活动后 SOP）
  async adminClose(ctx: any) {
    try {
      const result = await activitySvc().closeActivity(ctx.params.documentId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activity-reviews （评价看板：列表 + 汇总；?activityDId= 可过滤）
  async adminReviews(ctx: any) {
    try {
      const { page = "1", pageSize = "20", activityDId } = ctx.query;
      const filter: any = {
        $or: [{ rating: { $notNull: true } }, { review: { $notNull: true } }],
      };
      if (activityDId) {
        const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDId });
        if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
        filter.activity = act.id;
      }
      const result = await strapi.db.query(SIGNS_UID).findMany({
        where: filter,
        populate: { user: true, activity: true },
        orderBy: { reviewedAt: "desc" },
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize) },
      });
      const rows = result?.results ?? [];
      // 汇总
      const all = await strapi.db.query(SIGNS_UID).findMany({ where: filter });
      const count = all.length;
      const withRating = all.filter((r: any) => r.rating != null);
      const withNps = all.filter((r: any) => r.nps != null);
      const avgRating = withRating.length ? withRating.reduce((a: number, r: any) => a + r.rating, 0) / withRating.length : 0;
      const avgNps = withNps.length ? withNps.reduce((a: number, r: any) => a + r.nps, 0) / withNps.length : 0;
      const ratingDist = [0, 0, 0, 0, 0, 0];
      for (const r of withRating) ratingDist[Math.max(0, Math.min(5, r.rating))]++;
      const detractor = withNps.filter((r: any) => r.nps <= 6).length;
      const passive = withNps.filter((r: any) => r.nps >= 7 && r.nps <= 8).length;
      const promoter = withNps.filter((r: any) => r.nps >= 9).length;
      const npsScore = withNps.length ? Math.round(((promoter - detractor) / withNps.length) * 100) : 0;
      ctx.body = {
        rows: rows.map((r: any) => ({
          id: r.id,
          user: r.user ? { id: r.user.id, username: r.user.username } : null,
          rating: r.rating ?? null,
          nps: r.nps ?? null,
          review: r.review ?? null,
          reviewedAt: r.reviewedAt,
          activity: r.activity ? { id: r.activity.id, title: r.activity.title } : null,
        })),
        summary: { count, avgRating: Number(avgRating.toFixed(2)), avgNps: Number(avgNps.toFixed(2)), npsScore, ratingDist, detractor, passive, promoter },
        pagination: result?.pagination ?? {},
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 2: 路由注册**

在 `routes/content-api.ts` 内新增 3 条（放在"报名/到场签到"管理段落的 `fissionLeaderboard` 行前后均可）：

```ts
    userRoute("POST", "/activities/:documentId/review", "activity.review"),
    channelScopeRoute("POST", "/adm/activities/:documentId/close", "activity.adminClose", "activity.update"),
    channelScopeRoute("GET", "/adm/activity-reviews", "activity.adminReviews", "activity.read"),
```

- [ ] **Step 3: 校验 controllers/index.ts**

确认 `controllers/index.ts` 无新增需要（方法在既有 `activity` 对象内，index.ts 保持不变）。若后续有新增 controller 文件则必须在 index.ts 注册，此处无。

- [ ] **Step 4: 重建插件产物**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: BUILD 成功。

- [ ] **Step 5: 重启 dev 确认插件启动不报错**

Run: 重启 `npm run dev`，观察日志无 `zhao-point` 启动崩溃。

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic && git add plugins/zhao-point && git commit -m "feat(point): add activity review/close/reviews controllers + routes"
```

---

### Task 4: web 管理端评价看板

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Create: `e:\code\web\src\pages\activity\review.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\pages\dashboard\index.vue`

- [ ] **Step 1: api 加 `getActivityReviews`**

在 `e:\code\web\src\api\activity.js` 末尾追加：

```js
// 评价看板（返回 { rows, summary, pagination }；?activityDId= 可筛活动；start/end 过滤未实现）
export function getActivityReviews(params = {}) {
  return get(`${ADMIN}/activity-reviews`, params)
}
```

- [ ] **Step 2: 新建 `review.vue`**

创建 `e:\code\web\src\pages\activity\review.vue`。UI 结构（参照 `fission.vue` 的风格与配色）：
- 顶部筛选：活动下拉（来自 `listActivities({ pageSize: 1000 })` 的 `{ id, documentId, title }`）+ 查询按钮。
- 汇总统计卡：评价数 `summary.count`、平均分 `summary.avgRating`、平均NPS `summary.avgNps`、NPS得分 `summary.npsScore`、贬损/中立/推荐数 `summary.detractor/passive/promoter`。
- 评分分布条：用 `summary.ratingDist`（索引0-5）渲染各分值人数（横向条+数字）。
- 列表：`rows` 每条显示 `user.username`、`rating`（★）、`nps`、`review`、`reviewedAt`（格式化到秒）、`activity.title`；无评论文本显示"（无文字）"。分页用 `pagination.page/pageCount` 与既有分页组件一致。
- 数据获取：`onMounted(() => load())`；`load()` 调 `getActivityReviews({ page, pageSize, activityDId })`，兼容 `res.data ?? res`。

后端字段契约（前端照此读取，勿自造字段名）：
```
rows: [{ id, user:{id,username}|null, rating, nps, review, reviewedAt, activity:{id,title}|null }]
summary: { count, avgRating, avgNps, npsScore, ratingDist:[6], detractor, passive, promoter }
pagination: { page, pageSize, pageCount }
```

- [ ] **Step 3: pages.json 注册路由**

在 `e:\code\web\src\pages.json` 的活动段（`pages/activity/fission` 行附近）加入：

```json
  { "path": "pages/activity/review", "style": { "navigationBarTitleText": "活动评价" } },
```

- [ ] **Step 4: dashboard 加入口**

在 `e:\code\web\src\pages\dashboard\index.vue` 活动模块区域（参照现有 fission 入口 `navigateTo('/pages/activity/fission')`）追加一个 module-item：

```html
<view class="module-item" @click="navigateTo('/pages/activity/review')">
  <!-- 图标与文案：活动评价 -->
</view>
```

- [ ] **Step 5: 校验 web 构建**

Run: `cd e:\code\web && npm run build:h5`（若 build:h5 不存在则用 `npm run build`）
Expected: 无编译错误，仅 Sass 弃用警告属正常。

- [ ] **Step 6: Commit**

```bash
cd e:\code\web && git add src && git commit -m "feat(web): activity review dashboard page"
```

---

### Task 5: shao C 端评价入口

**Files:**
- Modify: `e:\code\shao\services\api.ts`
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: api 加 `submitActivityReview`**

在 `e:\code\shao\services\api.ts` 中参照既有 `signupActivity` 等方法，追加：

```ts
// 提交活动评价（仅已报名且 active 可评；rating 1-5 / nps 0-10可空；返回 {ok:true}）
export function submitActivityReview(activityDocumentId: string, data: { rating?: number; nps?: number; review?: string }) {
  return request(`/zhao-point/v1/activities/${activityDocumentId}/review`, {
    method: 'POST',
    data,
  })
}
```
（`request` 入参头/鉴权封装与既有活动方法一致；若既有方法用 `post(...)` 别名则改为对应写法。）

- [ ] **Step 2: detail.vue 加评价弹层**

修改 `e:\code\shao\pages\activity\detail.vue`：
- `ref`：`showReview = ref(false)`、`reviewRating = ref(0)`、`reviewNps = ref(null)`、`reviewText = ref('')`、`reviewed = ref(false)`。
- 在 `<view class="action-bar">` 区块（`signedUp` 分支）内，当 `activity.status === 'ended'` 时显示"去评价"主按钮，点击 `openReview()`。
- 模板末尾（`share-poster` 下方或独立 view）增加评价弹层：标题、1-5 星评分选择（点击 star 设 `reviewRating`，超出 0 星联动）、0-10 NPS 数字选择（0-10 数字横排可点选）、文本域 `reviewText`（placeholder "说说本次活动的体验..."）、确认/取消按钮。
- `openReview()`：若 `reviewed` 已提交则 toast"已评价过"并 return。
- `submitReview()`：校验 `reviewRating >= 1`，调 `submitActivityReview(id, { rating: reviewRating, nps: reviewNps, review: reviewText })`；成功置 `reviewed=true`、关闭弹层、toast"评价成功"；失败 toast（403 显示"尚未报名，无法评价"）。
- 在 `import`（`../../services/api`）中引入 `submitActivityReview`。
- 在 `loadActivity()`/`restoreSignupState()` 后若 `getToken()` 存在，调 `myActivities()` 找到本活动记录，若 `r.reviewedAt` 非空则 `reviewed=true`。

- [ ] **Step 3: 校验 shao 构建**

Run: `cd e:\code\shao && npm run build:h5`
Expected: 构建无错误；`dist/build/h5` 被 git 跟踪需一并提交。

- [ ] **Step 4: Commit**

```bash
cd e:\code\shao && git add -A dist pages services && git commit -m "feat(shao): activity review entry on detail page"
```

---

### Task 6: 验收脚本 + 收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-post-op.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-activity-post-op.cjs`。（服务器未跑时本机 dev 1337 承载 API。）**参照既有 `scripts/accept-fee-tiers.cjs` 的 DB 直连、数据构造、清理零残留模式**（多用户用 DB 直插 `up_users` + `sso-users` + `sso_user_profile` + 积分，验证完成后清理所有插入行）。

覆盖清单（每项断言 PASS，最终清理并输出汇总）：
1. **预置依赖**：DB 直插足够测试的 `up_users`（arid=用户A/B、NPS用户）、对应 `sso_users`（供 resolve 桥接）；预插 `msg-templates` 为 `act_receipt/act_repurchase/act_revisit` 三个 enabled 模板（`provider=wechat`）；插 1 个 `activities`（`status=signup_open`）。
2. **T3 路由**：调 `POST /zhao-point/v1/activities/{docId}/review` 由**未报名**随机用户 → 断言 `403`（或 403/错误）且不落评价。
3. **报名 + 到场**：A 经 `POST /v1/my/activity/signup` 报名；调 `POST /v1/my/activity/{docId}/checkin`（`method:'self'`）置 `attendedAt`。
4. **报名 + 未到场**：B 报名（不签到）。
5. **T3 adminClose**：调 `POST /v1/admin/activities/{docId}/close` → 断言返回 `{closed:true, reviewTriggered>=1, revisitTriggered>=1, repurchaseTriggered>=1}`，且活动 `status=ended`（DB 校验）。
6. **T2 触达队列**：DB 查 `msg-jobs`（UID `plugin::zhao-sso.msg-job`）：
   - 到场用户 A 存在 `scene='activity.receipt'`（scheduledAt 为空=立即可发）+ `scene='activity.repurchase'`（scheduledAt ≈ now+1440min）；
   - 未到场用户 B 存在 `scene='activity.closed'` 且 scheduledAt ≈ now+1440min；
   - 断言各自 `status='pending'`、模板 code 正确。
7. **T1 评价落库**：A 调 `POST /v1/activities/{docId}/review` `{rating:5,nps:10,review:'很棒'}` → DB `activity_signups` 该行 `rating=5,nps=10,review='很棒',reviewedAt` 非空；再改 `{rating:4}` 上送 → 断言 rating 变 4、review 保持'很棒'（部分更新 upsert 语义）。
8. **T3 看板**：调 `GET /v1/admin/activity-reviews` 传递该活动 docId → 断言 `summary.count>=1`、`summary.avgRating` 正确、`summary.promoter`/`detractor` 因子 NPS 分布正确、`rows[].user.username` 非空。
9. **清理**：删除所插 `activities`、`activity_signups`、`msg-jobs`、`up_users`、`sso_users`、`msg-templates`，输出"零残留"断言。

- [ ] **Step 2: 运行验收**

Run: `cd e:\code\basic && node scripts/accept-activity-post-op.cjs`（dev 1337 运行中）
Expected: 打印 `ALL PASS (N/N)` 且无残留。

- [ ] **Step 3: 摊位收口**

停本机 dev → 用 `git restore dist/` 还原 app 顶层 `dist/`（编译产物）：`cd e:\code\basic && git restore dist/`
Run: `cd e:\code\basic && git add -A && git commit -m "chore: activity post-op acceptance"`（视仓库并不包含脚本则仅留脚本未跟踪；若脚本需保留则 add scripts/）

- [ ] 若当前 dev 进程仍改写 dist，推送前先停止 `npm run dev`。

- [ ] **Step 4: 三仓库推送**

```bash
cd e:\code\basic && git push origin main
cd e:\code\web && git push origin main
cd e:\code\shao && git push origin main
```

---

## Self-Review

- **Spec 覆盖**：①closeActivity 端点到场/未到场分队列（T2+T3 adminClose）✓ ②评价 field（T1）+ C 端提交（T3 review）+ 看板（T3 adminReviews + T4 web）✓ ③shao 评价入口（T5）✓ ④验收脚本（T6）✓。全部 spec 段落有对应任务。
- **类型一致**：controller 返回 `{rows,summary,pagination}` 与 web `review.vue` 读取字段一致；`sso-sop.trigger` 的 `schedules[{templateCode,scene,delayMinutes}]` 签名贯穿 T2/既有代码一致；评价 upsert 字段名 `rating/nps/review/reviewedAt` 在 T1/T3/T5/T6 一致。
- **无占位符**：所有代码步骤给出完整实现；前端参照文件（fission.vue / signupActivity / accept-fee-tiers.cjs）均给出精确路径。