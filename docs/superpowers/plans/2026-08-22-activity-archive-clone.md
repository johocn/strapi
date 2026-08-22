# 活动闭环收尾 · 归档生命周期 + 活动一键克隆 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 已结束活动可软归档下架/恢复/筛选（阶段 C），并支持一键克隆完整模板配置生成草稿副本（阶段 D）。

**Architecture:** 阶段 C：activity schema `status` 加 `archived` 枚举 + activity service 新增 `adminArchive/adminUnarchive`（幂等，只 ended↔archived）+ 2 条管理端路由 + web 列表归档/恢复/筛选。C 端 list/categories 已是 `$notIn:["draft","archived"]`，加值后自动下架。阶段 D：增强 `series-service.duplicate` 补齐 formConfig/category/tags/assets/cashPrice/settle*/remindLeadMinutes/channelIds + lecturer/venue 关系；web 列表「一键克隆」。

**Tech Stack:** Strapi v5（zhao-point 插件）、PostgreSQL、uni-app (web)。

**Spec:** `docs/superpowers/specs/2026-08-22-activity-archive-clone-design.md`

---

## 关键文件结构
- `plugins/zhao-point/server/src/content-types/activity/schema.json` — status 加 archived
- `plugins/zhao-point/server/src/services/activity.ts` — 新增 adminArchive/adminUnarchive
- `plugins/zhao-point/server/src/controllers/activity.ts` — 新增 adminArchive/adminUnarchive 方法（调用 service）
- `plugins/zhao-point/server/src/routes/content-api.ts` — 加 2 条 archive/unarchive 路由
- `plugins/zhao-point/server/src/services/series-service.ts` — duplicate 补齐字段
- `web/src/pages/activity/list.vue` — 归档/恢复按钮 + 一键克隆按钮 + 归档筛选
- `web/src/api/activity.js` — 加 archiveActivity/unarchiveActivity/duplicateActivity API

---

### Task 1: 阶段 C —— schema + service + controller + route 后端四层

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: activity schema status 加 archived**

`activity/schema.json` L26 `"status": { "type": "enumeration", "enum": ["draft","signup_open","ongoing","ended"], "default": "draft" }` 的 enum 追加 "archived"：
```json
    "status": { "type": "enumeration", "enum": ["draft", "signup_open", "ongoing", "ended", "archived"], "default": "draft" },
```

- [ ] **Step 2: activity service 新增 adminArchive/adminUnarchive**

`services/activity.ts` 中 `closeActivity`（L248 起点）之后、方法对象内追加两个方法（读文件定位 closeActivity 结尾 `},` 后插入）：
```typescript
  /** 管理端归档: 仅 ended -> archived; 幂等(已是 archived 直接返回) */
  async adminArchive(activityDocumentId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    if (act.status === "archived") return act;
    if (act.status !== "ended") throw new Error("仅已结束活动可归档");
    return strapi.documents(ACTIVITY_UID).update({
      documentId: activityDocumentId,
      data: { status: "archived" },
    });
  },

  /** 管理端恢复: archived -> ended; 幂等(非 archived 抛错) */
  async adminUnarchive(activityDocumentId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "archived") throw new Error("仅已归档活动可恢复");
    return strapi.documents(ACTIVITY_UID).update({
      documentId: activityDocumentId,
      data: { status: "ended" },
    });
  },
```
> 需确认 ACTIVITY_UID 常量已在此文件定义（grep 确认；若无则用字符串 "plugin::zhao-point.activity"）。

- [ ] **Step 3: activity controller 新增 2 方法**

`controllers/activity.ts` 末尾（adminList 之后）追加（参考现有 try/catch 模式，且需确认文件顶部有 `svc()` helper 或 `strapi.plugin("zhao-point").service("activity")` 的取用方式，读文件顶部确认）：
```typescript
  // POST /adm/activities/:documentId/archive      归档 ended 活动(幂等)
  async adminArchive(ctx: any) {
    try {
      const updated = await strapi.plugin("zhao-point").service("activity").adminArchive(ctx.params.documentId);
      ctx.body = wrap(updated);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
  // POST /adm/activities/:documentId/unarchive    恢复 archived 活动(幂等)
  async adminUnarchive(ctx: any) {
    try {
      const updated = await strapi.plugin("zhao-point").service("activity").adminUnarchive(ctx.params.documentId);
      ctx.body = wrap(updated);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```
> 注意：读取 `controllers/activity.ts` 顶部确认 helper 名（`wrap`/`svc`）与 activity service 引用方式，保持一致；若用 `actSvc(strapi)` 风格则改为该风格。

- [ ] **Step 4: 注册路由**

`routes/content-api.ts` L165 之后（adminClose 附近）追加：
```typescript
    channelScopeRoute("POST", "/adm/activities/:documentId/archive", "activity.adminArchive", "activity.update"),
    channelScopeRoute("POST", "/adm/activities/:documentId/unarchive", "activity.adminUnarchive", "activity.update"),
```

- [ ] **Step 5: 重建 dist + 提交 basic**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
git add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/dist types/generated/contentTypes.d.ts
git commit -m "feat(zhao-point): 活动归档生命周期 adminArchive/adminUnarchive"
```
> types/generated/contentTypes.d.ts 仅当其有新改动才 add。

---

### Task 2: 阶段 D —— duplicate 补齐模板字段 + 资源关系

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\series-service.ts`

- [ ] **Step 1: duplicate findOne populate 加 lecturer/venue**

`series-service.ts` L47-50：
```typescript
    const src = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: { preUnlockArticles: true, preUnlockLessons: true, lecturer: true, venue: true },
    } as any);
```

- [ ] **Step 2: copy 对象补模板字段**

`duplicate` 内 copy（L53-79）中 `belongsToSeries` 行之后补：
```typescript
      formConfig: src.formConfig ?? null,
      category: src.category ?? "",
      tags: src.tags ?? [],
      assets: src.assets ?? null,
      cashPrice: src.cashPrice ?? 0,
      settleLecturer: src.settleLecturer ?? 0,
      settleVenue: src.settleVenue ?? 0,
      remindLeadMinutes: src.remindLeadMinutes ?? 1440,
      channelIds: src.channelIds ?? null,
```

- [ ] **Step 3: 资源关系复制**

`duplicate` 内 preUnlockLessons 复制块（L84-85）之后追加：
```typescript
    if (src.lecturer) copy.lecturer = { connect: [{ id: src.lecturer?.id ?? src.lecturer }] };
    if (src.venue) copy.venue = { connect: [{ id: src.venue?.id ?? src.venue }] };
```

- [ ] **Step 4: 检查 preUnlock* 复制兼容性**

现有 L80-85 用 `a.id ?? a` 处理关系 id，保留。确认新增的 lecturer/venue 用 connect 数组（与 adminCreate 的 relId 归一不冲突——duplicate 直接 strapi.documents.create, connect 正确）。

- [ ] **Step 5: 重建 dist + 提交 basic**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
git add plugins/zhao-point/server/src/services/series-service.ts plugins/zhao-point/dist
git commit -m "feat(zhao-point): activity duplicate 补齐表单/标签/费用/资源复制"
```

---

### Task 3: web 前端 —— 列表归档/恢复/一键克隆 + 筛选

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Modify: `e:\code\web\src\pages\activity\list.vue`

- [ ] **Step 1: api 加 3 个函数**

`web/src/api/activity.js`（LEDGER_ADMIN 同文件）追加：
```javascript
export function archiveActivity(documentId) {
  return post(`${ACTIVITY_ADMIN}/activities/${documentId}/archive`)
}
export function unarchiveActivity(documentId) {
  return post(`${ACTIVITY_ADMIN}/activities/${documentId}/unarchive`)
}
export function duplicateActivity(documentId) {
  return post(`${ACTIVITY_ADMIN}/activities/${documentId}/duplicate`)
}
```
> 需确认 ACTIVITY_ADMIN 常量（管理端 activities 前缀）存在；若现用别的常量名，参照现有 `getActivity`/`createActivity` 的 base。

- [ ] **Step 2: 状态筛选加「已归档」**

`web/src/pages/activity/list.vue` 状态筛选 chips（若有）或下拉追加以 `archived` 选项映射「已归档」（value='archived'）。

- [ ] **Step 3: 行操作加归档/恢复 + 一键克隆按钮**

在行操作区（手动重归档或既有操作按钮旁）按当前 status 渲染：
```vue
<button v-if="row.status === 'ended'" @click="onArchive(row)">归档</button>
<button v-if="row.status === 'archived'" @click="onUnarchive(row)">恢复</button>
<button @click="onDuplicate(row)">一键克隆</button>
```
script 追加方法（含二次确认，参考现有 handleRegenerate 的 showModal 模式）：
```javascript
const onArchive = (row) => {
  uni.showModal({ title: '归档活动', content: `确定归档「${row.title || ''}」？归档后 C 端不再展示。`,
    success: (r) => { if (r.confirm) doArchive(row) } })
}
const doArchive = async (row) => {
  try { await archiveActivity(row.documentId); uni.showToast({ title: '已归档', icon: 'success' }); loadData(currentPage.value) }
  catch (e) { uni.showToast({ title: e.message || '归档失败', icon: 'none' }) }
}
const onUnarchive = (row) => {
  uni.showModal({ title: '恢复活动', content: `确定恢复「${row.title || ''}」？`.描述, ... })
}
const doUnarchive = async (row) => { ...调用 unarchiveActivity... }
const onDuplicate = (row) => {
  uni.showModal({ title: '一键克隆', content: `生成「${row.title || ''}」的副本草稿？`,
    success: (r) => { if (r.confirm) doDuplicate(row) } })
}
const doDuplicate = async (row) => { try { await duplicateActivity(row.documentId); uni.showToast({ title: '已创建副本', icon: 'success' }); loadData(currentPage.value) } catch (e) { ... } }
```
> 具体按钮标签/确认文案/样式按 list.vue 现有行操作风格。必须读文件后按现有模板一致实现，包括调用 reload 的现有函数名（可能是 loadData/fetchList，保持现有）。

- [ ] **Step 4: 构建 + 提交 web**

```bash
cd e:\code\web && npm run build:h5
git add src/api/activity.js src/pages/activity/list.vue && git status --short（检查 dist 是否整套变更；若是则 git add dist）
git commit -m "feat(web): 活动列表归档/恢复/一键克隆 + 归档筛选"
```

---

### Task 4: 端到端验收 + 三仓库收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-archive-clone.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `scripts/accept-activity-archive-clone.cjs`（PREFIX='aac_'），参考 `accept-activity-settlement.cjs` / `accept-activity-ledger.cjs` 骨架（pg Client、api helper、admin 1117/a123456、register、check/PASS/FAIL、清场+零残留）。断言：
- **C**：建活动 A(status=ended) → `POST /adm/activities/{id}/archive` → status='archived'；重复 archive 幂等（仍 archived 200）；`GET /activities`(公开 C 端) 列表不含 A（activity_title LIKE 'aac_%' 的活动无 archived）；`GET /adm/activities?status=archived` 含 A；`POST unarchive` → status='ended'；对 status='signup_open' 活动 archive → 400。
- **D**：建讲师+场地(flat)，建活动 A(ended，含 formConfig={fields:[...]}、category='讲座'、tags=['实操']、assets={recordingUrl:...}、cashPrice=50、settleLecturer=100、settleVenue=50、lecturer/venue connect) → `POST /adm/activities/{id}/duplicate` → 副本 title 含「（副本）」、status='draft'、startTime/endTime null、formConfig/category/tags/assets/cashPrice/settle*/remindLeadMinutes 与原值一致、lecturer.id/venue.id 与原一致、副本无 signup（故不复制）。
- 清理：删副本 + 活动 A + 讲师/场地 + signups/attendances/referrals/ledgers(参照模板) + up_users；断言零残留（残留 SQL 含 lecturers/venues 表 count 'aac_%'=0）。

- [ ] **Step 2: 启动 dev 并运行验收**

```bash
powershell -NoProfile -File e:\code\basic\scripts\dev.ps1 start   # 等 Strapi started
cd e:\code\basic && node scripts/accept-activity-archive-clone.cjs
```
Expected: 全部断言 PASS、FAIL=0、退出码 0。

- [ ] **Step 3: 收口三仓库 push**

```bash
git -C e:\code\basic add scripts/accept-activity-archive-clone.cjs && git commit -m "test(zhao-point): 归档/克隆端到端验收"
git -C e:\code\basic restore dist/   # 停 dev 后还原根 app dist
git -C e:\code\basic push origin main
git -C e:\code\web status --short（确认干净/或 push）&& git -C e:\code\web push origin main
git -C e:\code\shao status --short   # 确认干净(本阶段无改动)
```
Expected: 三仓库干净、push 成功、零残留脚本。

---

## Self-Review

**Spec 覆盖：**
- ✓ C: schema archived → Task1 Step1
- ✓ C: adminArchive/adminUnarchive service → Task1 Step2
- ✓ C: controller 2 方法 → Task1 Step3
- ✓ C: 2 路由 → Task1 Step4
- ✓ D: duplicate 补字段 + 关系 → Task2 Step1-3
- ✓ web 归档/恢复/克隆 + 筛选 → Task3
- ✓ 验收 + 收口 → Task4

**Placeholder 扫描：** 无 TBD；Task1 Step3 的 controller helper 名标注「读文件确认」，Task3 标注「按现有风格」——这些是需子代理读文件对齐的实情，非空占位。

**类型一致性：** 字段名 formConfig/category/tags/assets/cashPrice/settleLecturer/settleVenue/remindLeadMinutes/channelIds 贯穿 schema→duplicate→验收一致；方法名 adminArchive/adminUnarchive 在 service/controller/route 贯穿一致；api 函数 archiveActivity/unarchiveActivity/duplicateActivity 在 api/vue 贯穿一致。