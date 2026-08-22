# 活动闭环收尾 · 归档生命周期 + 活动一键克隆 设计文档

**日期：** 2026-08-22
**范围：** ops-gaps 阶段 C（归档生命周期）+ 阶段 D（活动一键克隆）。两项为内容开发收尾，互不依赖，单文档统一定义，按序推进。
**前情：** `series-service.duplicate` 已存在（挂 `POST /adm/activities/:activityDocumentId/duplicate`，复制基础字段 + preUnlock* 关系，缺 formConfig/资源/cash 等）。无归档能力。

---

## 阶段 C：归档生命周期

**目标：** 已结束活动可软归档下架，管理端可归档/恢复/筛选，C 端不展示归档活动。

### 数据模型
`activity.schema.json` `status` 枚举由 `["draft","signup_open","ongoing","ended"]` 扩展为 `["draft","signup_open","ongoing","ended","archived"]`（追加，不破坏既有值）。

### 服务（activity service 新增 2 方法）
- `adminArchive(activityDocumentId)`：幂等；仅 `ended` → `archived`；`draft/signup_open/ongoing` 直接抛 400（不归档进行中）；已是 `archived` 返回现状。
- `adminUnarchive(activityDocumentId)`：幂等；`archived` → `ended`；非 archived 抛 400。

### 公开 list 过滤（已就绪，无需改）
已复核：`activity.list` 与 `activity.categories` 已是 `status: { $notIn: ["draft", "archived"] }`（controllers/activity.ts L47/L69）。schema 加 `archived` 值后自动于 C 端下架归档活动，无代码改动。

### 管理端列表筛选
已复核：`activity.adminList`（controllers/activity.ts L176）用 `filters.status = status`（精确匹配，未传则不过滤），`?status=archived` 直接可用，无代码改动。

### 控制器/路由（channelScope，管理端）
- `POST /adm/activities/:documentId/archive` → `activity.adminArchive`（permission: activity.update）
- `POST /adm/activities/:documentId/unarchive` → `activity.adminUnarchive`（permission: activity.update）

### web 前端 `pages/activity/list.vue`
- 顶部状态筛选追加「已归档」选项（`status=archived`）。
- 行操作追加「归档」按钮（status===ended 时）/「恢复」按钮（status===archived 时），点击二次确认。

---

## 阶段 D：活动一键克隆

**目标：** 完整复刻模板性配置（表单/分类标签/资源/费用），一键生成草稿副本。

### 服务增强（`series-service.duplicate`）
在现有 copy 基础上补以下字段（仅模板性配置，不复制报名/签到/评价等业务数据，不复制时间槽、不清空除 copy 已有之外的）：
```typescript
copy.formConfig = src.formConfig ?? null;   // 动态报名表单配置
copy.category = src.category ?? "";         // 分类(阶段A已加)
copy.tags = src.tags ?? [];                 // 标签
copy.assets = src.assets ?? null;           // 资料/回放 (阶段B已加)
copy.cashPrice = src.cashPrice ?? 0;        // 现金报名费(阶段:现金结算已加)
copy.settleLecturer = src.settleLecturer ?? 0;
copy.settleVenue = src.settleVenue ?? 0;
copy.remindLeadMinutes = src.remindLeadMinutes ?? 1440;
copy.channelIds = src.channelIds ?? null;
```
资源关系：findOne populate 增加 `lecturer`/`venue`，写入 copy：
```typescript
// findOne populate 增加: lecturer: true, venue: true
if (src.lecturer) copy.lecturer = { connect: [{ id: src.lecturer?.id ?? src.lecturer }] };
if (src.venue) copy.venue = { connect: [{ id: src.venue?.id ?? src.venue }] };
```
保留既有 behavior：startTime/endTime=null、usedCapacity=0、status=draft、title 加「（副本）」。preUnlock* 关系复制逻辑保持。

### web 前端 `pages/activity/list.vue`
- 行操作追加「一键克隆」→ 调 duplicate 接口 → 成功 toast + 刷新列表（最小集不自动跳转副本编辑）。

---

## 不做（保持既有边界）
- 成本-收益对账卡、优秀学员排行、报名名单导出、置顶推荐（roadmap 已列留待/不做）。
- 归档不改 `closeActivity`（结束仍置 ended；归档是结束之后的运营手动动作）。

## 验收（两阶段端到端）
`scripts/accept-activity-archive-clone.cjs`，PREFIX=`aac_`，覆盖：
1. **C**：建活动 A(ended) → `POST archive` → status=archived；重复 archive 幂等；`GET /activities`(C 端) 不含 A；adminList?status=archived 含 A；`POST unarchive` → 回 ended；对 `signup_open` 活动 archive 返回 400。
2. **D**：建活动 A(ended，含 category/tags/assets/cashPrice/settle*/lecturer/venue/formConfig) → `POST duplicate` → 副本 title 含「（副本）」、status=draft、startTime/endTime null、formConfig/category/tags/assets/cashPrice/lecturer/venue 一致、preUnlock 复制、副本不继承 signup。
3. 清理：删副本 + 活动 + 讲师/场地(acs 用 aac_ 前缀) + ledgers/signups 参照既有模板；断言零残留。
> 注：duplicate 需要讲师/场地存在才能断言关系复制；formConfig 直接以 json 字段随 activity create 写入断言。

## 收口约定
- 新增 controller 方法同步 `controllers/index.ts`（activity 控制器已注册，补 2 方法即用；series.adminDuplicateActivity 已有）。
- 改 TS/JSON 后重建插件 dist：`cd plugins/zhao-point && npm run build`；插件 dist 提交；根 app dist 用 `git restore dist/`。
- schema 加字段/枚举 dev 生成 `types/generated/contentTypes.d.ts` 随功能提交。
- 前端 web/shao 改后 `npm run build:h5` 再提交 dist。
- 收口前停 dev、`git restore dist/`、清理临时脚本，三仓库干净并 push。