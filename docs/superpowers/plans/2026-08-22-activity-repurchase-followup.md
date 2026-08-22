# 复购线索跟进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 阶段 B「评价/复购运营侧深化」中「评价管理」已落地，本计划补全剩余缺口「复购线索跟进」。设计决策已通过与用户启发式问答确认。

**Goal:** 为运营端提供「复购线索跟进」视图：查询 `activity.repurchase` 触达名单（全部触达，含 pending/失败），每条附窗内再报名次数辅助判定，运营可标记跟进状态（未跟进/已跟进/已成交）。

**Architecture:**
- 数据源：`sso_msg_jobs`（scene=`activity.repurchase`），用户关系经 sso-user 桥接 up-user，再按窗内查询 `activity-signup` 计算再报名次数（复用 `getRepurchaseStats` 既有口径）。
- 跟进状态持久化：直接在 `msg-job` 加枚举字段 `followStatus`（`none`/`followed`/`deal`）+ `followRemark`（text），最小改动、与触达记录一一对应。
- 前端：web 运营端新增 `repurchase-leads.vue` 页，含筛选（状态/日期）＋列表＋行内状态标记。

**Tech Stack:** Strapi v5、PostgreSQL、zhao-sso plugin、web 运营端 uni-app H5。

**Decision (已确认):**
- 名单口径：全部复购触发（含 pending/失败）。
- 存储：msg-job 加字段。
- 辅助判定：每条线索附触达后 window 天内再报名次数。

---

## Step 1: msg-job schema 加跟进字段 + 重建 types

- [ ] 修改 `plugins/zhao-sso/server/src/content-types/msg-job/schema.json`：
  - `followStatus`：enumeration，enum `["none","followed","deal"]`，default `"none"`。
  - `followRemark`：text。
- [ ] `cd plugins/zhao-sso && npm run build` 重建插件 dist；确认 `types/generated/...` 或本插件 dts 更新随功能提交。
- **卡点：** schema 加字段后，插件 TS 引用的内容类型类型定义可能不同步——构建失败时确认是类型冲突（可忽略）还是运行时字段（必须）。

## Step 2: sso-stats 服务新增复购线索名单 + 更新状态

- [ ] 在 `plugins/zhao-sso/server/src/services/sso-stats.ts` 新增：
  - `getRepurchaseLeads(opts: { from?; to?; page?; pageSize?; status?})`：
    - where `scene: "activity.repurchase"`，日期过滤语义为触达时间（`sentAt`/`scheduledAt` 择一，用 `sentAt $gte/$lte`，缺失不筛）。
    - `populate: { user: true }`，`findPage` 分页。
    - 每条归一 `ssoUserId`（拆 user 对象），桥接 up-user，查询窗内再报名 `REPURCHASE_SIGNS_UID`（signupAt 在触达后 ~ window 天区间且 status=active），返回 `reorderedCount`。
    - summary：`total`、`followed`、`deal` 计数。
  - `updateRepurchaseFollow({ jobId, status, remark })`：校验枚举，更新 msg-job 的 `followStatus`/`followRemark`，返回更新后记录。
- **卡点（记忆教训）：** user 为 manyToOne，job 必须 populate user 否则拿不到 id；桥接 up-user 用 `sso-profile.resolveUpUserForSsoUser`；窗内再报名查询复用 `getRepurchaseStats` 的 `conversionWindowDays`（rule 缺省 7）口径。

## Step 3: 控制器 + 路由

- [ ] `plugins/zhao-sso/server/src/controllers/msg-stats.ts` 新增：
  - `repurchaseLeads(ctx)`：透传 query 调 `getRepurchaseLeads`，答 `{ data }`。
  - `updateRepurchaseFollow(ctx)`：读 params.id + body{status,remark}，答更新后记录。
- [ ] `plugins/zhao-sso/server/src/routes/admin.ts` 注册：
  - `adminRoute("GET", "/msg/repurchase-leads", "msg-stats.repurchaseLeads", "sso.msg.read")`
  - `adminRoute("POST", "/msg/repurchase-leads/:id/follow", "msg-stats.updateRepurchaseFollow", "sso.msg.write")`
- [ ] `cd plugins/zhao-sso && npm run build` 重建插件 dist。
- **卡点：** `sso.msg.read/write` 权限为既有；新路由控制器名 `msg-stats` 已注册在 `controllers/index.ts`，无需新增。

## Step 4: 前端 API 封装

- [ ] `web/src/api/sso.js` 新增：
  - `repurchaseLeadApi = { list: (params) => get(`${ADMIN}/msg/repurchase-leads`, params), markFollow: (id, data) => post(`${ADMIN}/msg/repurchase-leads/${id}/follow`, data) }`
- 注：既有 `sso.js` 用 `ADMIN = '/zhao-sso/v1/admin'`；列表接口返回 `{ data }`，解包取 `data.data`。

## Step 5: 前端复购线索跟进页面

- [ ] 新建 `web/src/pages/msg/repurchase-leads.vue`：
  - 筛选：状态分区（picker：全部/未跟进/已跟进/已成交）＋日期（from/to）。
  - 汇总卡：线索总数/已跟进/已成交。
  - 列表：每行显示用户（username/mobile/email 取其一）、触达时间、窗内再报名次数、状态；行内 `picker`/按钮切换状态（未跟进→已跟进→已成交）＋备注输入。
  - 分页。
- [ ] `web/src/pages.json` 注册路由：`{ "path": "pages/msg/repurchase-leads", "style": { "navigationBarTitleText": "复购线索" } }`
- [ ] `web/src/pages/dashboard/index.vue` 活动模块区（在「活动评价」附近）新增入口 `navigateTo('/pages/msg/repurchase-leads')`，图标 🔁、名称「复购线索」。
- **卡点：** 复用 `review.vue`/`msg/repurchase.vue` 的 uni-app 范式（picker、uni-pagination 或自写分页）。

## Step 6: 验收 + 收口

- [ ] 写 `scripts/accept-repurchase-followup.cjs`：
  - 造测试数据：插入 2-3 条 `activity.repurchase` msg-job（含 1 条转化前再报名），调用列表接口断言返回与 `reorderedCount`，再调用标记接口断言语义变化，最后清理零残留。
  - 后端插件 dist 重建后，重启 dev 验证接口可达。
- [ ] 收口固定步骤（记忆约定）：停 dev → `git restore dist/`（根 app）→ 清理临时脚本 → 三仓库按记忆映射提交/推送（basic 提交源码+插件 dist；web 提交前端源码 + `npm run build:h5` 后提交 dist）。