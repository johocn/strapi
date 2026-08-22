# 讲师/场地费用结算 + 现金报名费 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现金报名费、讲师费、场地费纳入活动台账，形成"积分 + 现金"双向经营台账与可标记的结算记录。

**Architecture:** 复用既有 `activity-ledger` 快照机制，不新增集合。讲师/场地主档加 `cashMode/cashFee`；活动加 `cashPrice/settleLecturer/settleVenue`；ledger 加现金三字段 + settle 状态。`generate()` 扩展计算现金三维（讲师/场地费支持回退：活动登记优先，否则主档 cashFee 当 cashMode=flat），新增 `settle()` 登记付款。web 经营对账页加现金列 + 结算按钮。

**Tech Stack:** Strapi v5（zhao-point 插件）、PostgreSQL、uni-app (web)。

**Spec:** `docs/superpowers/specs/2026-08-22-activity-cash-settlement-design.md`

---

## 关键文件结构

- `plugins/zhao-point/server/src/content-types/lecturer/schema.json` — lecturer 加 `cashMode/cashFee`
- `plugins/zhao-point/server/src/content-types/venue/schema.json` — venue 加 `cashMode/cashFee`
- `plugins/zhao-point/server/src/content-types/activity/schema.json` — activity 加 `cashPrice/settleLecturer/settleVenue`
- `plugins/zhao-point/server/src/content-types/activity-ledger/schema.json` — ledger 加现金 3 字段 + settle 状态
- `plugins/zhao-point/server/src/services/activity-ledger.ts` — generate 扩展现金口径；新增 settle
- `plugins/zhao-point/server/src/controllers/ledger.ts` — 新增 settle 方法
- `plugins/zhao-point/server/src/routes/content-api.ts` — 新增 `PUT /adm/ledgers/:documentId/settle`
- `web/src/pages/activity/ledger.vue` — 加现金列 + 结算按钮
- `web/src/api/activity.js` — 加 settleLedger API

---

### Task 1: 数据模型 —— 主档 + 活动 + 台账加现金字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\lecturer\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\venue\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-ledger\schema.json`

- [ ] **Step 1: lecturer 加结算字段**

在 `lecturer/schema.json` 的 attributes 末尾（`activities` 关系之后）追加：

```json
    ,
    "cashMode": { "type": "enumeration", "enum": ["none", "flat"], "default": "none" },
    "cashFee": { "type": "decimal", "default": 0 }
```

即第 12 行 `"activities": {...}` 后补逗号 + 两字段。

- [ ] **Step 2: venue 加结算字段**

同样在 `venue/schema.json` attributes 末尾追加：

```json
    ,
    "cashMode": { "type": "enumeration", "enum": ["none", "flat"], "default": "none" },
    "cashFee": { "type": "decimal", "default": 0 }
```

- [ ] **Step 3: activity 加现金报名费 + 结算登记**

在 `activity/schema.json` attributes 中追加（`venuesto` 关系 L43 之后补逗号）：

```json
    ,
    "cashPrice": { "type": "decimal", "default": 0 },
    "settleLecturer": { "type": "decimal", "default": 0 },
    "settleVenue": { "type": "decimal", "default": 0 }
```

- [ ] **Step 4: activity-ledger 加现金 + 结算字段**

在 `activity-ledger/schema.json` 的 `netPoints` 之后、`summary` 之前追加：

```json
    ,
    "cashRevenue": { "type": "decimal", "default": 0 },
    "cashExpense": { "type": "decimal", "default": 0 },
    "cashNet": { "type": "decimal", "default": 0 },
    "settleStatus": { "type": "enumeration", "enum": ["pending", "settled"], "default": "pending" },
    "settledAt": { "type": "datetime" }
```

- [ ] **Step 5: 重建插件 dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 6: 重启 dev 验证 schema 迁移**

`dev.ps1 status` 确认 1337 在跑才需重启；否则 `powershell -NoProfile -File e:\code\basic\scripts\dev.ps1 start` 后等待。用 psql 确认列存在：`powershell -NoProfile -File e:\code\basic\scripts\dev.ps1 psql "select column_name from information_schema.columns where table_name in ('lecturers','venues','activities','activity_ledgers') order by table_name"`。Expected: 每表含新增列。

- [ ] **Step 7: Commit（basic）**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/content-types/lecturer/schema.json plugins/zhao-point/server/src/content-types/venue/schema.json plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/server/src/content-types/activity-ledger/schema.json plugins/zhao-point/dist types/generated/contentTypes.d.ts
git -C e:\code\basic commit -m "feat(zhao-point): 讲师/场地现金结算与活动现金报名费字段"
```

---

### Task 2: activity-ledger 服务 —— generate 扩展现金口径 + settle 方法

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity-ledger.ts`

- [ ] **Step 1: 在 generate 中取活动资源与现金报名费**

在 `generate()` 中 `const act = ...findOne({ documentId: activityId })`（L20-21）之后追加资源关联值取数——把 `findOne` 改为带 populate：

```typescript
    const act = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityId,
      populate: { lecturer: true, venue: true },
    });
    if (!act) throw new Error("活动不存在");
    const lecturer = act.lecturer;
    const venue = act.venue;
    const cashPrice = Number(act.cashPrice) || 0;
```

- [ ] **Step 2: 计算现金三维**

在 `const netPoints = ...`（L51）之后追加：

```typescript
    // 现金应收报名 = active 报名数 × cashPrice
    const cashRevenue = (activeSigns || []).length * cashPrice;
    // 讲师费：activity.settleLecturer >0 用之，否则回退主档 cashFee(cashMode=flat)
    const lecturerCost = Number(act.settleLecturer) > 0
      ? Number(act.settleLecturer)
      : (lecturer?.cashMode === "flat" ? (Number(lecturer.cashFee) || 0) : 0);
    const venueCost = Number(act.settleVenue) > 0
      ? Number(act.settleVenue)
      : (venue?.cashMode === "flat" ? (Number(venue.cashFee) || 0) : 0);
    const cashExpense = lecturerCost + venueCost;
    const cashNet = cashRevenue - cashExpense;
```

- [ ] **Step 3: 扩展 ledger 写入数据**

在 `create({ data: {...} })` 中加现金字段（`netPoints` 后追加）：

```typescript
        netPoints,
        cashRevenue,
        cashExpense,
        cashNet,
```

- [ ] **Step 4: 扩展 detail.cash**

把 `detail` 对象中 `referrals` 项之后追加 `cash`：

```typescript
      cash: {
        revenuePer: { cashPrice, activeCount: (activeSigns || []).length },
        lecturer: { cost: lecturerCost, source: Number(act.settleLecturer) > 0 ? "activity" : lecturer?.cashMode === "flat" ? "lecturer" : "none" },
        venue: { cost: venueCost, source: Number(act.settleVenue) > 0 ? "activity" : venue?.cashMode === "flat" ? "venue" : "none" },
      },
```

- [ ] **Step 5: 新增 settle 方法**

在文件末尾（`generateAutoIfAbsent` 之后）新增：

```typescript
  /** 管理端标记某快照已结算（登记付款完成，幂等） */
  async settle(ledgerDocumentId: string, body: { settleStatus?: string }) {
    const target = body?.settleStatus === "settled" ? "settled" : "pending";
    if (target === "pending") {
      // 回退到未结
      const upd = await strapi.documents(LEDGER_UID).update({
        documentId: ledgerDocumentId,
        data: { settleStatus: "pending", settledAt: null },
      });
      return upd;
    }
    const upd = await strapi.documents(LEDGER_UID).update({
      documentId: ledgerDocumentId,
      data: { settleStatus: "settled", settledAt: new Date() },
    });
    return upd;
  },
```

> 注：`strapi.documents.update` 支持以 documentId 更新；若该 ledger 用 db.query 创建导致 documentId 字段可写，需用 `strapi.documents` 正确解析。为稳妥，settle 可改为先 `findOne({documentId})` 再 `db.query.update({where:{id},data:{...}})`,依赖 schema 字段。此处采用 `strapi.documents.update`（Strapi v5 精确文档 id 更新），因 ledger schema 属 collectionType 有 documentId。

- [ ] **Step 6: 重建插件 dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 7: Commit（basic）**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/services/activity-ledger.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): activity-ledger generate 扩展现金口径 + settle 结算登记"
```

---

### Task 3: ledger 控制器 settle + 路由注册

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\ledger.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: ledger.ts 新增 settle 方法**

在 `regenerate` 方法之后追加：

```typescript
  // PUT /adm/ledgers/:documentId/settle    标记快照已结算/回退未结
  async settle(ctx: any) {
    try {
      const upd = await ledSvc(strapi).settle(ctx.params.documentId, ctx.request.body || {});
      ctx.body = wrap(upd);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 2: 注册路由**

在 `content-api.ts` 的 ledger 路由区（L175 `ledger.regenerate` 后）追加：

```typescript
    channelScopeRoute("PUT", "/adm/ledgers/:documentId/settle", "ledger.settle", "activity.update"),
```

- [ ] **Step 3: 确认控制器注册**

`controllers/index.ts` 已注册 `ledger`（既有 `regenerate` 在用），settle 是其方法，无需改 index.ts。仅确认文件确实已注册 ledger：

```bash
cd e:\code\basic && grep -n ledger plugins/zhao-point/server/src/controllers/index.ts
```

Expected: 输出含 `ledger` 键。若缺失则补上 `"ledger": (a) => import("./ledger").then((m) => m.default(a)),`。

- [ ] **Step 4: 重建 dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```

- [ ] **Step 5: Commit（basic）**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/controllers/ledger.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): ledger settle 控制器 + 路由注册"
```

---

### Task 4: web 经营对账页现金列 + 结算登记

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Modify: `e:\code\web\src\pages\activity\ledger.vue`

- [ ] **Step 1: api 新增 settleLedger**

在 `e:\code\web\src\api\activity.js` 的 LEDGER_ADMIN 附近追加：

```javascript
// 标记台账快照已结算/回退未结（body: { settleStatus: 'settled'|'pending' }）
export function settleLedger(documentId, settleStatus) {
  return put(`${LEDGER_ADMIN}/ledgers/${documentId}/settle`, { settleStatus })
}
```

> 需要一个 `put` helper。检查文件是否已有 `put`；若无则在文件顶部从请求封装导出一个（沿用现有 `get/post` 同模式）。

- [ ] **Step 2: ledger.vue 表列加现金字段**

在表格中 `netPoints` 列之后加三列现金 + 结算状态，参考现有表结构：

```html
<uni-table-column prop="cashRevenue" label="现金应收" />
<uni-table-column prop="cashExpense" label="讲师/场地费" />
<uni-table-column prop="cashNet" label="现金净额" />
<uni-table-column prop="settleStatus" label="结算状态" />
```

- [ ] **Step 3: 加"标记已结算"操作**

在行的操作列（regenerateLedger 按钮旁）追加：

```vue
<button v-if="row.settleStatus !== 'settled'" @click="markSettle(row, 'settled')">标记已结算</button>
<button v-else @click="markSettle(row, 'pending')">回退未结</button>
```

并在 script 中加方法：

```javascript
const markSettle = async (row, st) => {
  await settleLedger(row.documentId, st)
  loadLedgers()
}
```

- [ ] **Step 4: 构建前端**

```bash
cd e:\code\web && npm run build:h5
```

- [ ] **Step 5: Commit（web）**

```bash
git -C e:\code\web add src/api/activity.js src/pages/activity/ledger.vue dist
git -C e:\code\web commit -m "feat(web): 经营对账页现金列 + 结算登记"
```

---

### Task 5: 端到端验收脚本 + 三仓库收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-settlement.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `scripts/accept-activity-settlement.cjs`（PREFIX='acs_'），直连 pg 造数 + 调后端接口，断言：
1. 造讲师(cashMode=flat, cashFee=200)、场地(flat, cashFee=100)、活动(cashPrice=50, 关联讲师/场地)、3 名 active 报名（pointsCharged=50 each，走直接 DOM 造 signups）。
2. 调手动重归档接口（`POST /adm/activities/:documentId/ledger`，带 admin token）→ 断言 ledger：
   - `cashRevenue=150`、`cashExpense=300`、`cashNet=-150`
   - `detail.cash.lecturer.source='lecturer'`、`venue.source='venue'`
3. 活动 UPDATE 设 `settleLecturer=250` → 再重归档 → 断言 `cashExpense=350`、`detail.cash.lecturer.source='activity'`
4. 调 `PUT /adm/ledgers/:documentId/settle` body `{settleStatus:'settled'}` → 断言 ledger `settleStatus='settled'`、`settledAt` 非空；重复调幂等（仍 settled，无重复副作用）
5. 清理：DELETE 三处 signups、ledgers、activity、lecturer、venue（按 PREFIX）；断言零残留。

> 参考既有 `accept-activity-ledger.cjs` 的骨架（pg Client 直连、api helper、admin token 获取、PREFIX 规约）。

- [ ] **Step 2: 启动 dev**

确认 1337 在跑（`dev.ps1 status`），不在则 `dev.ps1 start` 等待就绪。

- [ ] **Step 3: 运行验收**

```bash
cd e:\code\basic && node scripts/accept-activity-settlement.cjs
```

Expected: 全部断言 PASS、清理零残留、非零退出码 0。

- [ ] **Step 4: 根 app dist 还原**

停 dev 后 `git -C e:\code\basic restore dist/`（pathspec `dist/` 不碰 plugins/*/dist）。

- [ ] **Step 5: 收口（三仓库 push）**

```bash
git -C e:\code\basic add scripts/accept-activity-settlement.cjs plugins/zhao-point/dist types/generated/contentTypes.d.ts
git -C e:\code\basic commit -m "test(zhao-point): 现金结算端到端验收"
git -C e:\code\basic push origin main
git -C e:\code\web status --short && git -C e:\code\web push origin main
git -C e:\code\shao status --short
```

Expected: 三仓库工作区干净（无未提交改动）、push 成功、零残留脚本。

---

## Self-Review

**Spec 覆盖：**
- ✓ lecturer/venue `cashMode/cashFee` → Task1 Step1/2
- ✓ activity `cashPrice/settleLecturer/settleVenue` → Task1 Step3
- ✓ ledger 现金 3 字段 + settle 状态 → Task1 Step4
- ✓ generate 现金口径 + 回退逻辑 → Task2 Step1-4
- ✓ settle 方法 → Task2 Step5
- ✓ 控制器 settle + 路由 → Task3
- ✓ web 现金列 + 结算按钮 + api → Task4
- ✓ 验收脚本 + 收口 → Task5

**Placeholder 扫描：** 无 TBD/TODO，每步含具体代码或验证命令。

**类型一致性：** `settle(documentId, {settleStatus})` 服务、控制器 `ledger.settle`、路由 `ledger.settle`、api `settleLedger(documentId, settleStatus)`、vue `settleLedger(row.documentId, st)` 命名贯穿一致；现金字段 `cashRevenue/cashExpense/cashNet/settleStatus/settledAt` 在 schema/spec/service/detail 保持一致。