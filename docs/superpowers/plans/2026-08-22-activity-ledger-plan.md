# 经营复盘·对账归档（活动台账）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `activity-ledger`（活动台账/快照）content-type，活动结束时自动生成不可变归档快照，固化应收报名/签到发放/裂变奖励/净收支四项及明细，管理端新增「经营对账」页核对账实并支持手动重归档。

**Architecture:** 独立集合 `activity-ledger`（每活动多快照，snapshotNo 自增，不侵入现有集合）。`activityLedger` service 负责 generate（计算四项 + 落库）/ list / regenerate；自动触发挂在既有 `activity.closeActivity()`（status→ended 的专属入口）末尾——因项目无 cron、end 唯一入口即 closeActivity，故自动生成判定「该活动无 auto 快照才生成」保证幂等。管理端走既有 `channelScopeRoute` admin 鉴权。web 新增「经营对账」页。

**Tech Stack:** Strapi v5 (`strapi.db` 聚合、`strapi.documents` 更新状态)、uni-app admin (web)。

**文件结构：**
- 新建 `basic/plugins/zhao-point/server/src/content-types/activity-ledger/schema.json`
- 新建 `basic/plugins/zhao-point/server/src/services/activity-ledger.ts`
- 修改 `basic/plugins/zhao-point/server/src/services/activity.ts`（closeActivity 末尾调 generate）
- 新建 `basic/plugins/zhao-point/server/src/controllers/ledger.ts`
- 修改 `basic/plugins/zhao-point/server/src/controllers/index.ts`（注册 ledger 控制器）
- 修改 `basic/plugins/zhao-point/server/src/services/index.ts`（注册 activity-ledger 服务）
- 修改 `basic/plugins/zhao-point/server/src/routes/content-api.ts`（注册 ledger 路由）
- 新建 `web/src/pages/activity/ledger.vue`
- 修改 `web/...`（路由/菜单入口）
- 新建 `basic/scripts/accept-activity-ledger.cjs`

---

### Task 1: 新增 activity-ledger content-type + 重建插件

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-ledger\schema.json`

- [ ] **Step 1: 新建 schema**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-ledger\` 下新建 `schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "activity_ledgers",
  "info": { "singularName": "activity-ledger", "pluralName": "activity-ledgers", "displayName": "Activity Ledger", "description": "活动经营台账/归档快照" },
  "options": { "draftAndPublish": false, "comment": "活动结束时生成的不可变对账快照，snapshotNo 自增" },
  "attributes": {
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity" },
    "activityDocumentId": { "type": "string" },
    "activityTitle": { "type": "string" },
    "snapshotNo": { "type": "integer", "default": 1 },
    "source": { "type": "enumeration", "enum": ["auto", "manual"], "default": "auto" },
    "generatedAt": { "type": "datetime" },
    "generatedBy": { "type": "relation", "relation": "manyToOne", "target": "admin::user" },
    "revenuePoints": { "type": "integer", "default": 0 },
    "signinCostPoints": { "type": "integer", "default": 0 },
    "referralCostPoints": { "type": "integer", "default": 0 },
    "netPoints": { "type": "integer", "default": 0 },
    "summary": { "type": "json" },
    "detail": { "type": "json" }
  }
}
```

> 说明：`snapshotNo` 同一活动多快照自增；`activityDocumentId`/`activityTitle` 冗余防 activity 删除后失联。`activity` 关系非 required（生成时已核验存在，冗余字段承载展示）。

- [ ] **Step 2: 注册 content-type**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\index.ts` 中：在 import 区加 `import activityLedger from "./activity-ledger/schema.json";`，在导出对象加 `"activity-ledger": { schema: activityLedger },`（与其他 content-type 一致的 key 形式）。

- [ ] **Step 3: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功（types dts 报错若属既有存量可忽略）。

- [ ] **Step 4: 提交（schema + 注册 + 插件 dist + 生成 dts）**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/content-types/activity-ledger plugins/zhao-point/server/src/content-types/index.ts plugins/zhao-point/dist types/generated/contentTypes.d.ts
git -C e:\code\basic commit -m "feat(zhao-point): 新增 activity-ledger 活动台账快照 content-type"
```

---

### Task 2: activity-ledger service（generate/list/regenerate）

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\services\activity-ledger.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\index.ts`

- [ ] **Step 1: 注册服务**

在 `e:\code\basic\plugins\zhao-point\server\src\services\index.ts` 增加 `import activityLedger from "./activity-ledger";` 并在导出对象加 `"activity-ledger": activityLedger,`（遵循现有 kebab-case key 约定）。

- [ ] **Step 2: 编写 service**

创建 `e:\code\basic\plugins\zhao-point\server\src\services\activity-ledger.ts`：

```typescript
import type { Core } from "@strapi/strapi";

const LEDGER_UID = "plugin::zhao-point.activity-ledger";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";
const REF_UID = "plugin::zhao-point.activity-referral-reward";
const ACTIVITY_UID = "plugin::zhao-point.activity";

function userName(u: any): string {
  return u?.username || u?.phone || u?.email || String(u?.id ?? "");
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 计算一场活动的四项对账数值 + 明细。自动触发与手动触发共用。
   * @param activityId activity 的 documentId
   * @param source 'auto' | 'manual'
   */
  async generate(activityId: string, source: "auto" | "manual" = "manual") {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");

    // 四项口径
    // 1) 应收报名积分：active 报名 pointsCharged 求和
    const activeSigns = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active" },
      populate: { user: true },
    });
    const revenuePoints = (activeSigns || []).reduce((s, x) => s + (Number(x.pointsCharged) || 0), 0);

    // 3) 裂变奖励积分：activity_referral_rewards 本活动 points 求和
    const refs = await strapi.db.query(REF_UID).findMany({
      where: { activity: act.id },
      populate: { inviter: true, invitee: true },
    });
    const referralCostPoints = (refs || []).reduce((s, x) => s + (Number(x.points) || 0), 0);

    // 2) 签到发放积分：activity_attend 规则当前分值 × 到场 pointsGranted=true 人数
    const atts = await strapi.db.query(ATT_UID).findMany({
      where: { signup: { activity: act.id }, pointsGranted: true },
      populate: { signup: { populate: { user: true } } },
    });
    const attendeePoints = await (async () => {
      const pointSvc = strapi.plugin("zhao-point").service("point");
      const rule = pointSvc ? await pointSvc.getMergedRule("activity_attend") : null;
      return Number(rule?.points) || 0;
    })();
    // 若无规则，按到场数×0；detail 仍记录到场用户
    const signinCostPoints = (atts || []).length * attendeePoints;

    const netPoints = revenuePoints - signinCostPoints - referralCostPoints;

    // summary 快照冗余
    const canceledCount = await strapi.db.query(SIGNS_UID).count({ where: { activity: act.id, status: "cancelled" } });
    const waitingCount = await strapi.db.query(SIGNS_UID).count({ where: { activity: act.id, status: "waiting" } });

    const detail = {
      signups: (activeSigns || []).map((s: any) => ({
        userId: s.user?.id ?? s.user,
        userName: userName(s.user),
        pointsCharged: Number(s.pointsCharged) || 0,
      })),
      attendees: (atts || []).map((a: any) => {
        const u = a.signup?.user;
        return { userId: u?.id ?? a.signup?.user, userName: userName(u), points: attendeePoints };
      }),
      referrals: (refs || []).map((r: any) => ({
        inviterId: r.inviter?.id ?? r.inviter,
        inviteeId: r.invitee?.id ?? r.invitee,
        points: Number(r.points) || 0,
      })),
    };

    const summary = {
      signupCount: (activeSigns || []).length,
      attendedCount: (atts || []).length,
      cancelledCount: canceledCount,
      waitingCount: waitingCount,
    };

    // snapshotNo = 该活动已有快照数 + 1
    const prev = await strapi.db.query(LEDGER_UID).count({ where: { activity: act.id } });

    const ledger = await strapi.db.query(LEDGER_UID).create({
      data: {
        activity: act.id,
        activityDocumentId: act.documentId,
        activityTitle: act.title,
        snapshotNo: prev + 1,
        source,
        generatedAt: new Date(),
        revenuePoints,
        signinCostPoints,
        referralCostPoints,
        netPoints,
        summary,
        detail,
      },
    });
    return ledger;
  },

  /** 管理端列表：按活动列示全部快照（generatedAt desc）；可传 activityDocumentId 过滤状态（ended） */
  async list(params: { activityDocumentId?: string; page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 20, activityDocumentId } = params;
    const where: any = {};
    if (activityDocumentId) where.activityDocumentId = { $eq: activityDocumentId };
    const result = await strapi.db.query(LEDGER_UID).findPage({
      where,
      orderBy: { generatedAt: "desc" },
      page: Number(page),
      pageSize: Number(pageSize),
    });
    return { list: result.results, pagination: result.pagination };
  },

  /** 手动重归档：总是新增一张来源=manual 的快照 */
  async regenerate(activityId: string) {
    return this.generate(activityId, "manual");
  },

  /** 自动生成：活动无 auto 快照才生成（幂等），供 closeActivity 调用 */
  async generateAutoIfAbsent(activityId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId });
    if (!act) return null;
    const hasAuto = await strapi.db.query(LEDGER_UID).count({ where: { activity: act.id, source: "auto" } });
    if (hasAuto > 0) return null;
    return this.generate(activityId, "auto");
  },
});
```

> 说明：`ATT_UID` 中 `signup: { activity: ... }` 为多级关系过滤（findMany 支持关系 where）；`populate: { signup: { populate: { user: true } } }` 拉取报名其用户。`generatedBy` 由控制器在手动场景补写，或在此 detail 阶段留空（auto）。

- [ ] **Step 3: 提交**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity-ledger.ts plugins/zhao-point/server/src/services/index.ts
git -C e:\code\basic commit -m "feat(zhao-point): activity-ledger 服务 generate/list/regenerate"
```

---

### Task 3: closeActivity 自动生成挂接

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts:248-251`

- [ ] **Step 1: closeActivity 末尾触发自动归档**

在当前 `closeActivity` 方法内、`await strapi.documents(...).update({ data: { status: "ended" } })` 之后追加（放在方法体同层，紧随状态更新，后续未到场回访逻辑之前或之后均可，建议放回访之后避免阻塞触达——放方法末尾 return 前）：

在 `closeActivity` 内文末（现有 return 前）插入：

```typescript
    // 自动归档：活动结束即生成首张 auto 快照（幂等，仅当无 auto 快照）
    try {
      await strapi.plugin("zhao-point").service("activity-ledger").generateAutoIfAbsent(activityId);
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] ledger auto-generate failed: ${e.message}`);
    }
```

> 放置点：`closeActivity` 是 status→ended 的唯一专属入口（项目无 cron），因此自动触发收敛于此。adminUpdate 直接改 status:ended 是通用更新非专属关闭，不触发自动（需手动归档），符合「专属结束语义才自动」的约束。

- [ ] **Step 2: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): 活动结束自动生成 activity-ledger auto 快照"
```

---

### Task 4: ledger 控制器 + 路由 + 控制器注册

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\ledger.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 新建控制器**

创建 `e:\code\basic\plugins\zhao-point\server\src\controllers\ledger.ts`：

```typescript
import { Core } from "@strapi/strapi";

function wrap(data: any) { return { data }; }
const ledSvc = (s: any) => s.plugin("zhao-point").service("activity-ledger");

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /adm/ledgers                    全部快照（?activityDocumentId= 过滤；?page=&pageSize=）
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", activityDocumentId } = ctx.query;
      const result = await ledSvc(strapi).list({
        page: Number(page),
        pageSize: Number(pageSize),
        activityDocumentId,
      });
      ctx.body = { data: result.list, meta: { pagination: result.pagination } };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities/:documentId/ledger    手动重归档（新增 source=manual 快照）
  async regenerate(ctx: any) {
    try {
      const upd = await ledSvc(strapi).regenerate(ctx.params.documentId);
      ctx.body = wrap(upd);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 注册控制器**

在 `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts` 增加 `import ledger from "./ledger";` 并在导出对象加 `ledger,`（与 `fee`、`calendar` 同级顶层 key，非嵌套 uid——控制器 `ledger.list` / `ledger.regenerate` 可被路由直接解析）。

> 记忆：新增 controller 必须同步更新 `controllers/index.ts`，否则路由 404。

- [ ] **Step 3: 注册路由**

在 `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts` 中，现有 `activity-stats.overview` 等 admin 路由附近追加（沿用 `channelScopeRoute` 鉴权，权限沿用既有 `activity.read`/`activity.update`）：

```typescript
    channelScopeRoute("GET", "/adm/ledgers", "ledger.list", "activity.read"),
    channelScopeRoute("POST", "/adm/activities/:documentId/ledger", "ledger.regenerate", "activity.update"),
```

- [ ] **Step 4: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/controllers/ledger.ts plugins/zhao-point/server/src/controllers/index.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): ledger 控制器+路由(列表/手动重归档)+控制器注册"
```

---

### Task 5: web 经营对账页

**Files:**
- Create: `e:\code\web\src\pages\activity\ledger.vue`
- Modify: `e:\code\web\src\pages.json`（或等价路由/菜单文件，按项目现有 activity 页注册方式）

- [ ] **Step 1: 新增页面**

创建 `e:\code\web\src\pages\activity\ledger.vue`（参考既有 `fission.vue`/`overview.vue` 的分页请求封装与 admin API 前缀）。核心：列表请求 `/api/zhao-point/v1/adm/ledgers`，每行展示四项 + summary 数，展开 detail，重归档按钮调 `POST /adm/activities/:documentId/ledger`。要点：
- 顶部可输入活动 documentId 过滤（可选）。
- 默认分页拉取，展示 `activityTitle`、`snapshotNo`、`source`(auto/manual)、`generatedAt`、四项标量。
- 展开行显示 `signups`/`attendees`/`referrals` 明细。
- 「手动重归档」按钮：需关联活动 documentId = 该行 `activityDocumentId`，POST 后刷新。

（具体 uni-app 模板/脚本由执行者按项目既有 activity 管理页风格落地，页面脚本遵循既有 `pages/activity/fission.vue` 的 api 调用与状态管理写法。）

- [ ] **Step 2: 注册路由/菜单**

在 web 项目活动相关路由/pages.json 及菜单入口追加「经营对账」页（确保持久化请求与鉴权 token 走既有 admin 通道）。

- [ ] **Step 3: 构建 h5**

Run: `cd e:\code\web && npm run build:h5`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git -C e:\code\web add src/pages/activity/ledger.vue <路由/菜单文件> dist/build/h5
git -C e:\code\web commit -m "feat(web): 经营对账页(活动台账列示/明细/手动重归档)"
```

---

### Task 6: 端到端验收脚本 + 三仓库收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-ledger.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-activity-ledger.cjs`，复用既有 accept 脚本的 pg/ok/qa 封装，`PREFIX='al_'`。覆盖：
1. 直插 1 个活动 A（status='signup_open'，title 含 PREFIX）；直插 signups：active×1(`pointsCharged=50`)、cancelled×1、waiting×1；直插 attendances×2（关联 active 报名且 `points_granted=true`）、×1（`points_granted=false`）；直插 1 条 referral-reward（points=30）。
2. 通过 admin API 或直调：`POST /zhao-point/v1/adm/activities/:docId/ledger`（手动）→ 断言返回 `snapshotNo=1`、`revenuePoints=50`、`referralCostPoints=30`、`netPoints=50-signin-30`、`source='manual'`；`signinCostPoints` 依当前 `activity_attend` 规则分值×2（脚本读取该规则分值或断言 ≥0）。detail.signups 长度 1、attendees 长度 2、referrals 长度 1。
3. 再手动生成一次 → `snapshotNo=2`，且不覆盖旧快照（count=2）。
4. 自动幂等：可置 status 由 `ongoing→ended`（用 adminUpdate PUT status:ended 或直插后调 closeActivity）——为可控，验收改为：直接调 service 不可从脚本触达，改为走 `POST /adm/activities/:docId/close`（若已存在 auto 快照则不新增，断言 auto 快照数量恰 1；若该活动此前无 auto，断言生成 1 张 auto）。清理前后对比 `activity_ledgers` 中该活动 auto 快照 ≤1 验证幂等不爆量。
5. 清理：`DELETE activity_ledgers WHERE activity_title LIKE 'al_%'`、`DELETE activities/activity_signups/activity_attendances/activity_referral_rewards WHERE title LIKE 'al_%'`（注意列名 snake_case），断言残留 0。

> 注：脚本为端到端走 HTTP，服务须先重建插件 dist 且 dev 重启。若 `activity_attend` 规则在 point-rule 表存在则读取其 points；否则默认 0（断言 signinCostPoints = 2×当前规则值，脚本动态读取避免硬编码）。清理时依赖表列名：`activity_ledgers.activity_title`、`activity_signups`、`activity_attendances`、`activity_referral_rewards`。

- [ ] **Step 2: 运行验收脚本**

启动本地 dev（若 1337 未启动先按项目记忆启动；PostgreSQL 白名单/端口无法启动则停下来报告，不盲目重试多次），等待 `/zhao-point/v1/activities` 200。

Run: `cd e:\code\basic && node scripts/accept-activity-ledger.cjs`
Expected: 全部 PASS，退出码 0，清理零残留。

- [ ] **Step 3: 三仓库收口**

- basic：完成剩余 commit（如验收脚本），`git restore dist/`（根 app），`git push origin`。
- web：已提交 src + `dist/build/h5`，`git push origin`。
- shao：本阶段无改动（不改 C 端），`git status --short` 应为干净；如有意外改动还原。
- 收口前停 dev、`git restore dist/`（basic 根 app）、清理临时诊断脚本。三仓库最终 `git status --short` 干净。

---

## Self-Review

**Spec 覆盖：**
- 独立 activity-ledger content-type：Task 1 ✓
- 四项口径（应收/签到/裂变/净收）：Task 2 ✓
- summary/detail 结构：Task 2 ✓
- 自动触发（closeActivity，幂等 auto）：Task 3 ✓
- 手动重归档（snapshotNo 递增，不覆盖）：Task 2 `regenerate` + Task 4 路由 ✓
- 管理端对账页：Task 5 ✓
- 验收 + 三仓库收口：Task 6 ✓

**占位扫描：** 无 TBD/TODO；Task 5 前端具体模板标注「按既有风格落地」，因 uni-app 页面需对齐既有复用组件，非空占位（执行者照 fission.vue 模式）。其余代码步骤均含完整代码。

**类型一致性：** `activity-ledger` UID、service key `"activity-ledger"`、controller uid `ledger`（`ledger.list`/`ledger.regenerate`）、路由 handler `"ledger.list"`/`"ledger.regenerate"` 全链路一致；字段 `revenuePoints/signinCostPoints/referralCostPoints/netPoints`、`summary`(signupCount/attendedCount/cancelledCount/waitingCount)、`detail`(signups/attendees/referrals) 与 spec 一致。service 方法 `generate/generateAutoIfAbsent/list/regenerate` 引用一致。