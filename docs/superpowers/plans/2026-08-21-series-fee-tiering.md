# 系列报名费用分档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在活动积分计费基础上引入 `flat|tier|factor` 三模式互斥的费用分档，按时间/限量/用户类型组合定价。

**Architecture:** 新增 `fee-service.ts` 单一职责解析现行费用（tier 取首个满足时间窗∧限量∧用户类型的档，factor 在 base 上叠加因子，均回退 flat），将 `activity.ts` 中报名/转正/签到直读 `pointsCost` 处统一替换为 `resolveFee`；限量用 signup.feeTierId 计数非退化校验。系列 `defaultRules` 继承三字段。

**Tech Stack:** Strapi v5 plugin（zhao-point/zhao-sso/zhao-channel）、uni-app vue3（web 管理端 / shao C端）、knex、PostgreSQL。

**依赖前置**：阶段十四已提供 `activity.pointsCost/feeCollectAt`、`signup.pointsCharged`、点服务 `deductPoints/refundPoints`、`resolveUserChannelId`；本计划在其上增量扩展。

---

### Task 1: Schema 扩展（活动费用分档字段）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-signup\schema.json`

- [ ] **Step 1: activity schema 追加字段**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json` 的 `attributes` 内 `pointsCost` 附近追加：

```json
  "pricingMode": { "type": "enumeration", "enum": ["flat", "tier", "factor"], "default": "flat" },
  "feeTiers": { "type": "json" },
  "feeFactors": { "type": "json" },
```

- [ ] **Step 2: signup schema 追加 feeTierId**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-signup\schema.json` 的 `attributes` 内 `pointsCharged` 附近追加：

```json
  "feeTierId": { "type": "string" },
```

- [ ] **Step 3: 构建**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build`，预期 exit 0（重生成 server/dist + 顶层 generated types）。schema 无报错（既有 `activity.ts status` dts 提示与本次无关）。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/content-types plugins/zhao-point/types types/generated 2>/dev/null; git add plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): activity pricingMode/feeTiers/feeFactors + signup feeTierId"
```

---

### Task 2: fee-service.ts（费用定价单一职责）

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\services\fee-service.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\index.ts:1-21`

- [ ] **Step 1: 新建 fee-service.ts**

创建 `e:\code\basic\plugins\zhao-point\server\src\services\fee-service.ts`，内容如下（SIGNS_UID 同 activity.ts；profile 取存储的 `sso-user-profile.segment`、合伙人判定取 `sso-referral-relation` 存在 inviter 记录）：

```ts
import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const SSO_PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const REF_UID = "plugin::zhao-sso.sso-referral-relation";

function inRange(nowTs: number, win: any): boolean {
  if (!win) return true;
  if (win.start && nowTs < new Date(win.start).getTime()) return false;
  if (win.end && nowTs > new Date(win.end).getTime()) return false;
  return true;
}

function userTypeMatches(userType: string | undefined, profile: { segment: string; isPartner: boolean }): boolean {
  if (!userType || userType === "all") return true;
  if (userType === "partner") return !!profile.isPartner;
  if (typeof userType === "string" && userType.startsWith("segment:")) {
    const want = userType.split(":")[1];
    return !!want && profile.segment === want;
  }
  return false;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 解析 upUser 的身份（segment + 是否合伙人）；查不到按 C 档/非合伙人，不抛错 */
  async resolveUserProfile(upUserId: number): Promise<{ segment: string; isPartner: boolean }> {
    let segment = "C";
    let isPartner = false;
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(upUserId);
        if (sso) {
          const profile = await strapi.db.query(SSO_PROFILE_UID).findOne({ where: { user: sso.id } });
          if (profile?.segment) segment = profile.segment;
          const rel = await strapi.db.query(REF_UID).findOne({ where: { inviter: sso.id } });
          isPartner = !!rel;
        }
      }
    } catch { /* 身份解析失败按最低档兜底 */ }
    return { segment, isPartner };
  },

  /** tier 档已占用数 = 该活动该档 active 报名数（waiting 不占档率） */
  async tierUsage(activityId: number, tierId: string): Promise<number> {
    if (!tierId) return 0;
    return strapi.db.query(SIGNS_UID).count({ where: { activity: activityId, feeTierId: tierId, status: "active" } });
  },

  /**
   * 解析活动当前应计费用。
   * @param activity 含 pricingMode/feeTiers/feeFactors/pointsCost/feeCollectAt/id 的对象
   * @param upUserId  upUser（课程侧用户）id，用于解析用户身份
   * @param opts     { now?, excludeTierId? }
   * @returns { mode, cost, feeCollectAt, tierId, tier }
   */
  async resolveFee(activity: any, upUserId: number, opts: { now?: string; excludeTierId?: string } = {}) {
    const nowTs = opts.now ? new Date(opts.now).getTime() : Date.now();
    const mode = activity.pricingMode || "flat";

    if (mode === "tier") {
      const tiers = Array.isArray(activity.feeTiers) ? activity.feeTiers : [];
      const sorted = [...tiers].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      const profile = await this.resolveUserProfile(upUserId);
      for (const t of sorted) {
        if (opts.excludeTierId && t.id === opts.excludeTierId) continue;
        if (!inRange(nowTs, t.window)) continue;
        if (!userTypeMatches(t.userType, profile)) continue;
        const quota = Number(t.quota ?? 0);
        if (quota > 0) {
          const usage = await this.tierUsage(activity.id, t.id);
          if (usage >= quota) continue;
        }
        return {
          mode: "tier",
          cost: Number(t.pointsCost || 0),
          feeCollectAt: t.feeCollectAt || activity.feeCollectAt || "signup",
          tierId: t.id,
          tier: t,
        };
      }
      // 无匹配档 → flat 兜底
      return {
        mode: "tier",
        cost: Number(activity.pointsCost || 0),
        feeCollectAt: activity.feeCollectAt || "signup",
        tierId: null,
        tier: null,
      };
    }

    if (mode === "factor") {
      const cfg = activity.feeFactors && typeof activity.feeFactors === "object" ? activity.feeFactors : {};
      let cost = Number(cfg.base ?? activity.pointsCost ?? 0);
      const profile = await this.resolveUserProfile(upUserId);
      for (const f of Array.isArray(cfg.factors) ? cfg.factors : []) {
        if (f.type === "window_discount" && f.until && nowTs < new Date(f.until).getTime()) {
          cost -= Number(f.amount || 0);
        } else if (f.type === "window_upcharge" && f.from && nowTs >= new Date(f.from).getTime()) {
          cost += Number(f.amount || 0);
        } else if (f.type === "segment_discount_percent" && f.minSegment && profile.segment === f.minSegment) {
          cost = cost * (100 - Number(f.percent || 0)) / 100;
        } else if (f.type === "flat_discount_amount") {
          cost -= Number(f.amount || 0);
        }
      }
      cost = Math.max(1, Math.round(cost));
      return { mode: "factor", cost, feeCollectAt: activity.feeCollectAt || "signup", tierId: null, tier: null, base: cfg.base };
    }

    return { mode: "flat", cost: Number(activity.pointsCost || 0), feeCollectAt: activity.feeCollectAt || "signup", tierId: null, tier: null };
  },
});
```

- [ ] **Step 2: 注册到服务索引**

编辑 `e:\code\basic\plugins\zhao-point\server\src\services\index.ts`：顶部加 `import feeService from "./fee-service";`；默认导出对象在 `"calendar-service": calendarService,` 后加 `"fee-service": feeService,`。

- [ ] **Step 3: 构建**

在 `e:\code\basic\plugins\zhao-point` 运行 `npm run build`，预期 exit 0。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/services/fee-service.ts plugins/zhao-point/server/src/services/index.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): fee-service resolveFee + user profile resolution"
```

---

### Task 3: 系列排期继承费用分档字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\series-service.ts`（generateSchedule 的 data 对象、duplicate 的 copy 对象）

- [ ] **Step 1: generateSchedule 承接 defaultRules**

定位 `generateSchedule` 里 `strapi.documents("plugin::zhao-point.activity").create({ data: {...} })` 的 data 对象（已有 `const dr = series.defaultRules || {};`）。在 `pointsCost`/`feeCollectAt` 赋值处追加继承三字段（改如）：

```ts
      pointsCost,
      feeCollectAt,
      pricingMode: dr.pricingMode || "flat",
      feeTiers: dr.feeTiers ?? null,
      feeFactors: dr.feeFactors ?? null,
```

- [ ] **Step 2: duplicate 复制费用分档字段**

定位 `duplicate` 里 `copy` 对象 `pointsCost`/`feeCollectAt` 行后追加：

```ts
      pricingMode: src.pricingMode || "flat",
      feeTiers: src.feeTiers ?? null,
      feeFactors: src.feeFactors ?? null,
```

- [ ] **Step 3: 构建 + Commit**

`npm run build`（plugins/zhao-point）exit 0 后 commit：

```bash
git add plugins/zhao-point/server/src/services/series-service.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): generateSchedule/duplicate inherit fee pricing fields"
```

---

### Task 4: 接入 resolveFee 到报名/转正/签到/退款

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`

在文件作用域新增 helper（`resolveUserChannelId` 之后）：

```ts
const feeSvc = () => strapi.plugin("zhao-point").service("fee-service");
```

- [ ] **Step 1: signup 改用 resolveFee + tier 回滚换档**

将 signup 内「常量 `feeCollectAt` 之后的 `reserved===0` 候补分支之后到 `create active`」一段（现状 L93 起 `const cost = act.pointsCost || 0;` 至 L103 `create`）替换为：

```ts
    let resolved = await feeSvc().resolveFee(act, userId);
    // tier 模式：容量已原子占用后，若所报档因并发已满 → 回滚并换下一档（最多重试档数+1 次）
    if (resolved.mode === "tier" && resolved.tierId && Number(resolved.tier?.quota || 0) > 0) {
      let attempts = (Array.isArray(act.feeTiers) ? act.feeTiers.length : 0) + 1;
      while (attempts-- > 0 && resolved.tierId) {
        const usage = await feeSvc().tierUsage(act.id, resolved.tierId);
        if (usage < Number(resolved.tier?.quota || 0)) break;
        resolved = await feeSvc().resolveFee(act, userId, { excludeTierId: resolved.tierId });
      }
    }
    const feeCollectAt = resolved.feeCollectAt || "signup";
    const cost = resolved.cost || 0;
    if (feeCollectAt === "signup" && cost > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: cost, source: "activity", method: "activity_signup", remark: `报名活动:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        await strapi.db.connection("activities").where("id", act.id).decrement("used_capacity", 1);
        return { ok: false, reason: "insufficient_points" };
      }
    }
    await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null } });
```

> 说明：把外层 `const feeCollectAt = act.feeCollectAt || "signup";`（L67）移到本块内按 `resolved` 赋值并删除 L67 旧行，避免重复声明。

- [ ] **Step 2: promoteWaiting 每名候补单独 resolveFee**

将 promoteWaiting 内 `const feeCollectAt = act?.feeCollectAt || "signup"; const cost = act?.pointsCost || 0;`（L212-213）删除，循环内 `const upUserId = p.user?.id ?? p.user;` 之后插入：

```ts
      const resolved = await feeSvc().resolveFee(act ?? { id: activityId, pointsCost: 0, feeCollectAt: "signup", pricingMode: "flat" }, upUserId);
      const feeCollectAt = resolved.feeCollectAt || "signup";
      const cost = resolved.cost || 0;
```

并将扣费块 `method: "activity_promote"` 的 `points: cost` 保留使用变量 cost；`update` 的 data 追加 `feeTierId: resolved.tierId ?? null`。

- [ ] **Step 3: checkin 改用 resolveFee**

将 checkin 内 L283-290 的到场收费块替换为：

```ts
    const resolved = await feeSvc().resolveFee(act, userId);
    if (resolved.feeCollectAt === "checkin" && (resolved.cost || 0) > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: resolved.cost, source: "activity", method: "activity_checkin", remark: `到场收费:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        return { ok: false, reason: "insufficient_points" };
      }
    }
```

- [ ] **Step 4: cancel 退款以 pointsCharged 为准**

将 cancel 内退款条件 `(act?.feeCollectAt || "signup") === "signup" && signup.pointsCharged > 0` 改为 `signup.pointsCharged > 0`（feeTierId 为 checkin 档时 pointsCharged=0，天然跳过退款）。其余不变。

- [ ] **Step 5: 构建 + Commit**

`npm run build`（plugins/zhao-point）exit 0 后 commit：

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): signup/promote/checkin use resolveFee + tier rollback"
```

---

### Task 5: 费用预览接口

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\fee.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 新建控制器 fee.ts**

创建 `e:\code\basic\plugins\zhao-point\server\src\controllers\fee.ts`：

```ts
import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(ctx: any) {
    const documentId = ctx.params.documentId as string;
    const userId = ctx.state?.user?.id;
    if (!userId) throw new errors.UnauthorizedError();
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId });
    if (!act) throw new errors.NotFoundError("活动不存在");
    const fee = await strapi.plugin("zhao-point").service("fee-service").resolveFee(act, userId);
    const detail = fee.mode === "tier" && fee.tier
      ? { tierId: fee.tierId, name: fee.tier.name }
      : (fee.mode === "factor" ? { base: fee.base } : {});
    ctx.body = { mode: fee.mode, cost: fee.cost, feeCollectAt: fee.feeCollectAt, ...detail };
  },
});
```

- [ ] **Step 2: 注册路由（在 `/activities/:documentId` 前）**

在 `content-api.ts` 活动区，`publicRoute("GET", "/activities/calendar", "calendar.month"),` 之后、`publicRoute("GET", "/activities/:documentId", "activity.detail"),` 之前插入：

```ts
    userRoute("GET", "/activities/:documentId/fee", "fee.preview"),
```

- [ ] **Step 3: 构建 + Commit**

`npm run build` 后：

```bash
git add plugins/zhao-point/server/src/controllers/fee.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/dist/server
git commit -m "feat(zhao-point): activity fee preview endpoint"
```

---

### Task 6: web 管理端费用编辑器

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`
- Modify: `e:\code\web\src\pages\series\form.vue`

- [ ] **Step 1: 活动表单定价模式切换**

在 `e:\code\web\src\pages\activity\form.vue` 报名设置区块：新增 `pricingMode` picker（`['flat','tier','factor']`，labels `单一价/档位列表/因子叠加`）；`flat` 显示原 `pointsCost` 数字输入；`tier` 显示一个可增删的档列表编辑器（每行：name/order 数字/时间窗起止 datetime/`quota` 数字/`userType` 文本(如 all|partner|segment:S)/`pointsCost` 数字/`feeCollectAt` picker）；`factor` 显示 `base` 数字 + 因子行（每项：`type` picker + 按类型声明的 `until|from|amount|minSegment|percent` 数字/文本）。

- `form` 对象加 `pricingMode:'flat'`、`feeTiers:[]`、`feeFactors:{ base:0, factors:[] }`；`loadDetail` 回填三字段；`submitData` 透传 `pricingMode/form.feeTiers/form.feeFactors`（feeFactors 保留为对象、feeTiers 保留数组）。
- 沿用既有 `form-item/form-label/form-input/swiper-picker/switch` 类。

- [ ] **Step 2: 系列默认规则表单扩展**

在 `e:\code\web\src\pages\series\form.vue` 的 `dr` 对象加 `pricingMode:'flat'`、`feeTiers:[]`、`feeFactors:{base:0,factors:[]}` 三字段，加与 Step1 同构的编辑器；`submitData.defaultRules={...dr}` 自动带上；回填 `Object.assign(dr, data.defaultRules||{})`。

- [ ] **Step 3: 构建 + Commit**

在 `e:\code\web` 跑 `npm run build:h5` 通过后：

```bash
git add src/pages/activity/form.vue src/pages/series/form.vue dist/build/h5
git commit -m "feat(web): activity/series fee tiering editor"
```

---

### Task 7: shao C端费用展示

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`
- Modify: `e:\code\shao\services\api.ts`

- [ ] **Step 1: api 新增费用预览**

在 `e:\code\shao\services\api.ts` 增：

```ts
export function getActivityFee(documentId: string) {
  return Promise.resolve(uni.request({ url: apiBase + `/zhao-point/v1/activities/${documentId}/fee`, method: 'GET' }))
}
```

（按该文件现有请求封装风格改写，若无 `apiBase` 用既有请求助手。）

- [ ] **Step 2: detail 展示现价**

在 `e:\code\shao\pages\activity\detail.vue` onLoad 里调 `getActivityFee` 并把结果写入 `fee = { mode, cost, feeCollectAt, name? }`（失败静默不阻断）；报名按钮文案由 `activity.pointsCost > 0` 改为读 `fee.cost > 0`：`fee.cost>0 ? 报名 · ${fee.cost} 积分 : '立即报名'`；信息区加一行现价与说明（tier 时 `当前档位：${fee.name}`，factor 时 `基础价 ${fee.base} 积分`）。

- **重要**：签名入口、SOP、报名成功回调不变；仅价格展示字段切换到 fee 结果。

- [ ] **Step 3: 构建 + Commit**

在 `e:\code\shao` 跑 `npm run build:h5` 通过后：

```bash
git add pages/activity/detail.vue services/api.ts dist/build/h5
git commit -m "feat(shao): activity fee preview display"
```

---

### Task 8: 验收脚本 accept-fee-tiers.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-fee-tiers.cjs`

- [ ] **Step 1: 编写脚本并跑通**

先读 `e:\code\basic\scripts\accept-series-rules.cjs` 复用其 PG 连接/`api()`/登录/建活动/注入积分/清理/断言的既有写法。覆盖（全部无占位，断言具体值）：

1. **flat 零回归**：flat 活动免费报名无扣费；收费报名 `activity_fee` 扣费、`feeTierId` 为空；取消 `activity_fee_refund` 退款。
2. **tier 时间窗**：建两档（order1 早鸟 window.end=未来、order2 标准全开），当前报名命中 order1 档价并按 `pointsCharged` 落账；手动改 order1 window.end 为过去后重报名新用户命中 order2 价。
3. **tier 限量满档**：等量档（quota=1）+ 更高档；A 报名占满 order1 → B 报名自动落 order2（feeTierId=order2）；order1 无超卖。
4. **tier 用户类型**：建 `userType:'segment:S'` 档优先 + `all` 兜底；低档 S 用户命中 S 档、C 用户命中 all 兜底。
5. **tier 无匹配回退**：全部档时间窗已过 → 落 flat 兜底价 `pointsCost`。
6. **factor 叠加**：base=20 + window_discount(until=未来,amount=5) → 现价 15；加 segment_discount_percent(minSegment:S,percent=10) S 用户 → round(15*0.9)=14；less 下限：base=1+常驻扣 2 → max(1,0)=1。
7. **幂等 + 退款凭 pointsCharged + 零残留**：重复报名/签到/取消断言既有 precedent；清理活动/报名/扣退费记录/测试用户归零。

需多用户时沿用 `accept-series-rules.cjs` 的 DB 直插 `sso_users`/`user_profiles`/`sso_user_profiles` 方法（含该脚本踩坑的 `zhao_point_records_user_lnk` 关联）。本机 Strapi 若未运行先在 `e:\code\basic` `npm run dev` 起 1337，readiness 后跑脚本直到全 PASS exit 0。

- [ ] **Step 2: Commit**

```bash
git add scripts/accept-fee-tiers.cjs
git commit -m "test(zhao-point): accept-fee-tiers acceptance script"
```

---

### Task 9: 三仓库收口

- [ ] **Step 1: 类型一致性自检**

Grep 全仓确认：无 `resolveFee(activity, userId)` 之外的重名签名、`pricingMode/feeTiers/feeFactors/feeTierId` 拼写一致；fee preview 路由在 `/activities/:documentId` 之前。

- [ ] **Step 2: basic 收口**

```bash
git -C e:\code\basic add -A; git -C e:\code\basic commit -m "chore: fee tiering 收口" 2>/dev/null; git -C e:\code\basic restore dist/; git -C e:\code\basic push
```

（`git restore dist/` 还原 app 顶层构建产物，插件 dist 已在各 Task 提交。）

- [ ] **Step 3: web/shao 收口**

```bash
git -C e:\code\web add -A; git -C e:\code\web commit -m "chore: fee tiering 收口" 2>/dev/null; git -C e:\code\web push
git -C e:\code\shao add -A; git -C e:\code\shao commit -m "chore: fee tiering 收口" 2>/dev/null; git -C e:\code\shao push
```

- [ ] **Step 4: 更新项目记忆**

在 `project_memory.md` 追加「阶段十五 系列报名费用分档」小节（数据模型/定价解析/接口/前端/验收/收口 commit）。