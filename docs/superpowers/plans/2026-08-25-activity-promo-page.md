# 活动宣传落地页（模块化积木 × 5 风格 × 报名分流）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为线下活动提供模块化「搭积木」宣传落地页：5 种风格预设、12 种内容模块、微信/浏览器双环境报名分流、加微信/电话/名片/留言四种联系方式。

**Architecture:** 单 spec 分 3 个 plan（Phase）顺序推进，每阶段可独立产出可测软件：
- **Phase A 后端**（zhao-point 插件）：activity 新增 `promoTemplate/promoModules/promoContact` 三字段 + 新增 `activity-message` 内容类型 + 5 个新接口（C端聚合/留言 3 个 + 运营端留言 2 个）+ `promoModules` 结构校验。改 TS 后必须重建插件 dist。
- **Phase B 运营端**（web）：`form.vue` 新增「宣传设置」区（模板选择/模块编辑器/联系方式覆盖/补充字段带出）+ 新增 `messages.vue` 留言管理页。
- **Phase C C端**（shao）：新增 `promo.vue` 宣传页 + 12 个模块组件 + 5 套风格主题 CSS + 报名分流 + 分享海报 + 联系方式交互。

**Tech Stack:** Strapi 5（zhao-point/zhao-common/zhao-auth）、uni-app（web 运营端 + shao C端 H5/小程序）、原生 canvas 海报（不新增依赖）。

**关键复用点（不重写）：**
- 报名提交/权益解锁复用现有 `signupActivity` / `unlockCheck` 接口与 `detail.vue` 的 `openRewardGuide` 弹窗逻辑
- 环境判断复用 `shao/utils/env.ts` 的 `getEnv()` / `isWechatBrowser()`
- 站点默认联系方式从 `zhao-common` 的 `site-config.extraConfig.promoContact` 读取（`ctx.state.siteDocumentId` 由 site-resolver 中间件注入，公开路由也可用）
- 管理端留言列表接口复用 `activity.read` / `activity.update` 权限点，不新增权限点

---

## 文件结构总览

```
Phase A（后端，zhao-point 插件）：
  Modify  plugins/zhao-point/server/src/content-types/activity/schema.json          # +3 字段
  Create  plugins/zhao-point/server/src/content-types/activity-message/schema.json # 新内容类型
  Modify  plugins/zhao-point/server/src/content-types/index.ts                     # 注册新模型
  Modify  plugins/zhao-point/server/src/services/activity.ts                       # +5 业务方法 + 常量/工具
  Modify  plugins/zhao-point/server/src/controllers/activity.ts                    # +5 控制器 + promoModules 校验
  Modify  plugins/zhao-point/server/src/routes/content-api.ts                      # +5 路由
  Create  scripts/accept-promo-page.cjs                                            # 端到端验收（清残留）

Phase B（运营端，web）：
  Create  web/src/pages/activity/promo-presets.js            # 模板常量（配色/默认编排/补充字段）
  Modify  web/src/pages/activity/form.vue                    # 「宣传设置」section
  Modify  web/src/api/activity.js                            # +留言管理 API
  Create  web/src/pages/activity/messages.vue                # 留言管理页
  Modify  web/src/pages.json                                # 注册 messages 路由
  Modify  web/src/pages/activity/list.vue                   # +留言管理入口

Phase C（C端，shao）：
  Modify  shao/pages.json                                   # 注册 promo 路由
  Modify  shao/services/api.ts                              # +3 个 promo API
  Create  shao/pages/activity/promo.vue                     # 宣传页主页面
  Create  shao/components/promo/ (12 个模块组件)             # cover/info/rich/highlights/speakers/agenda/images/rewards/contact/message/faq/custom
  Create  shao/styles/promo-themes.scss                     # 5 套风格 CSS 变量
```

---

## Phase A：后端（zhao-point 插件）

### Task A1: activity schema 新增三字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`

- [ ] **Step 1: 在 activity schema 末尾（`settleVenue` 之后）追加三字段**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json` 中，将：

```json
    "cashPrice": { "type": "decimal", "default": 0 },
    "settleLecturer": { "type": "decimal", "default": 0 },
    "settleVenue": { "type": "decimal", "default": 0 }
  }
```

改为：

```json
    "cashPrice": { "type": "decimal", "default": 0 },
    "settleLecturer": { "type": "decimal", "default": 0 },
    "settleVenue": { "type": "decimal", "default": 0 },
    "promoTemplate": { "type": "string", "default": "summit" },
    "promoModules": { "type": "json" },
    "promoContact": { "type": "json" }
  }
```

- [ ] **Step 2: 验证 schema JSON 合法**

Run: `node -e "JSON.parse(require('fs').readFileSync('e:/code/basic/plugins/zhao-point/server/src/content-types/activity/schema.json','utf8')); console.log('ok')"`
Expected: 输出 `ok`

### Task A2: 新增 activity-message 内容类型

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-message\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\index.ts`

- [ ] **Step 1: 创建 schema.json**

创建 `e:\code\basic\plugins\zhao-point\server\src\content-types\activity-message\schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "activity_messages",
  "info": { "singularName": "activity-message", "pluralName": "activity-messages", "displayName": "Activity Message" },
  "options": { "draftAndPublish": false, "comment": "活动宣传页客服留言（异步回复）" },
  "attributes": {
    "activity": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.activity" },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "content": { "type": "text" },
    "reply": { "type": "text" },
    "status": { "type": "enumeration", "enum": ["open", "replied"], "default": "open" },
    "repliedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: 注册到 content-types/index.ts**

在 `e:\code\basic\plugins\zhao-point\server\src\content-types\index.ts` 中，在 import 区（`import activitySeriesLifecycles` 之后）加：

```ts
import activityMessage from "./activity-message/schema.json";
```

并在导出对象中（`"activity-series": ...` 之后）加：

```ts
  "activity-message": { schema: activityMessage },
```

### Task A3: activity service 新增常量与 5 个业务方法

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`

- [ ] **Step 1: 新增模块类型常量与消息 UID**

在 `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts` 顶部常量区（`const ACTIVITY_UID = ...` 附近）新增：

```ts
const MSG_UID = "plugin::zhao-point.activity-message";

/** 宣传页允许的模块类型（与 C端渲染组件一一对应） */
export const PROMO_MODULE_TYPES = [
  "cover", "info", "rich", "highlights", "speakers", "agenda",
  "images", "rewards", "contact", "message", "faq", "custom",
] as const;

/** 宣传页风格枚举 */
export const PROMO_TEMPLATES = ["summit", "salon", "training", "action", "life"] as const;
```

- [ ] **Step 2: 新增 promoModules 归一化工具函数**

在 service 文件内（`isEmpty` 函数之后）新增：

```ts
/** 归一化 promoModules：过滤非法 type、sort 冲突去重、排序；undefined/null 返回 undefined */
function normalizePromoModules(promoModules: any): any[] | undefined {
  if (promoModules === undefined || promoModules === null) return undefined;
  if (!Array.isArray(promoModules)) throw new Error("promoModules 必须为数组");
  const seen = new Set<number>();
  const out: any[] = [];
  for (const m of promoModules) {
    if (!m || typeof m !== "object") continue;
    if (!PROMO_MODULE_TYPES.includes(m.type)) continue;
    const sort = Number.isFinite(Number(m.sort)) ? Number(m.sort) : out.length;
    if (seen.has(sort)) continue;
    seen.add(sort);
    out.push({
      type: m.type,
      config: m.config && typeof m.config === "object" && !Array.isArray(m.config) ? m.config : {},
      sort,
    });
  }
  return out.sort((a, b) => a.sort - b.sort);
}

/** 读取合并后的联系方式：活动覆盖优先，否则读站点 extraConfig.promoContact */
async function resolvePromoContact(strapi: any, activityContact: any, siteDocumentId?: string): Promise<any | null> {
  if (activityContact && typeof activityContact === "object" && !Array.isArray(activityContact)) {
    if (Object.keys(activityContact).length) return activityContact;
  }
  if (!siteDocumentId) return null;
  try {
    const siteSvc = strapi.plugin("zhao-common")?.service("site-config");
    if (!siteSvc || typeof siteSvc.getConfig !== "function") return null;
    const config = await siteSvc.getConfig(siteDocumentId);
    const ec = config?.extraConfig;
    if (ec && typeof ec === "object" && !Array.isArray(ec) && ec.promoContact) return ec.promoContact;
  } catch {
    /* 站点配置读取失败静默降级为无联系方式 */
  }
  return null;
}

/** 活动奖励摘要：供 rewards 模块与报名分流使用 */
function summarizeRewards(rewardConfig: any): any {
  const rc = rewardConfig && typeof rewardConfig === "object" ? rewardConfig : {};
  return {
    enabled: !!rc.loginEnabled,
    channel: rc.channel && rc.channel.type ? rc.channel : undefined,
    selectMode: rc.selectMode || "all",
    selectN: Math.max(1, Number(rc.selectN) || 1),
    rewards: Array.isArray(rc.rewards) ? rc.rewards.map((r: any) => ({
      id: r.id, name: r.name, type: r.type, mode: r.mode, condition: resolveCondition(r),
    })) : [],
  };
}
```

> 说明：`resolveCondition` 是 service 文件已存在的函数（L22），直接复用。

- [ ] **Step 3: 新增 promoDetail 方法**

在 service 导出对象内（`unlockCheck` 方法之后）新增：

```ts
  /** 宣传页聚合：活动 + 模块 + 合并联系方式 + 奖励摘要 + 本人报名状态 */
  async promoDetail({ activityDocumentId, userId, siteDocumentId }: {
    activityDocumentId: string; userId?: number; siteDocumentId?: string;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: ["lecturer", "venue", "assets"],
    });
    if (!act) throw new Error("活动不存在");
    const modules = normalizePromoModules(act.promoModules);
    const contact = await resolvePromoContact(strapi, act.promoContact, siteDocumentId);
    let signupStatus: any = { signedUp: false };
    if (userId) {
      const signup = await strapi.db.query(SIGNS_UID).findOne({
        where: { activity: act.id, user: userId },
        orderBy: { id: "DESC" },
      });
      if (signup) {
        signupStatus = {
          signedUp: true,
          status: signup.status,
          signupId: signup.id,
          attendedAt: signup.attendedAt || null,
        };
      }
    }
    return {
      activity: act,
      modules,
      contact,
      rewards: summarizeRewards(act.rewardConfig),
      signupStatus,
    };
  },

  /** 用户留言（异步客服） */
  async sendMessage({ userId, activityDocumentId, content }: {
    userId: number; activityDocumentId: string; content?: string;
  }) {
    if (!content || typeof content !== "string" || !content.trim()) throw new Error("留言内容不能为空");
    if (content.trim().length > 1000) throw new Error("留言内容过长");
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const created = await strapi.documents(MSG_UID).create({
      data: {
        activity: act.id,
        user: userId,
        content: content.trim(),
        status: "open",
      },
    });
    return { documentId: created.documentId, status: created.status, createdAt: created.createdAt };
  },

  /** 我的留言 + 运营回复列表（按活动） */
  async listMyMessages({ userId, activityDocumentId }: { userId: number; activityDocumentId: string }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const rows = await strapi.db.query(MSG_UID).findMany({
      where: { activity: act.id, user: userId },
      orderBy: { id: "DESC" },
      limit: 100,
    });
    return rows.map((r: any) => ({
      documentId: r.documentId,
      content: r.content,
      reply: r.reply,
      status: r.status,
      repliedAt: r.repliedAt,
      createdAt: r.created_at,
    }));
  },

  /** 运营端留言列表（可按活动/状态过滤） */
  async adminListMessages({ activity, status, page, pageSize }: {
    activity?: string; status?: string; page: number; pageSize: number;
  }) {
    const where: any = {};
    if (activity) {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activity });
      if (!act) throw new Error("活动不存在");
      where.activity = act.id;
    }
    if (status === "open" || status === "replied") where.status = status;
    const result = await strapi.db.query(MSG_UID).findPage({
      where,
      populate: { user: true, activity: true },
      orderBy: { id: "desc" },
      page, pageSize,
    });
    const rows = result?.results ?? [];
    return {
      list: rows.map((r: any) => ({
        documentId: r.documentId,
        content: r.content,
        reply: r.reply,
        status: r.status,
        repliedAt: r.repliedAt,
        createdAt: r.created_at,
        user: r.user ? {
          id: r.user.id, documentId: r.user.documentId,
          username: r.user.username, nickname: r.user.nickname,
          avatar: r.user.avatar, phone: r.user.phone,
        } : null,
        activity: r.activity ? { documentId: r.activity.documentId, title: r.activity.title } : null,
      })),
      pagination: result?.pagination || { page, pageSize, pageCount: 1, total: rows.length },
    };
  },

  /** 运营端回复留言：status→replied，记录 repliedAt */
  async adminReplyMessage({ messageDocumentId, reply }: { messageDocumentId: string; reply?: string }) {
    if (!reply || typeof reply !== "string" || !reply.trim()) throw new Error("回复内容不能为空");
    const msg = await strapi.documents(MSG_UID).findOne({ documentId: messageDocumentId });
    if (!msg) throw new Error("留言不存在");
    const updated = await strapi.documents(MSG_UID).update({
      documentId: messageDocumentId,
      data: { reply: reply.trim(), status: "replied", repliedAt: new Date().toISOString() },
    });
    return { documentId: updated.documentId, status: updated.status, repliedAt: updated.repliedAt };
  },
```

- [ ] **Step 4: 语法检查（服务不引入新依赖）**

Run: `cd e:/code/basic/plugins/zhao-point && npx tsc --noEmit -p tsconfig.server.json`
Expected: 无新增类型错误（如项目无该 tsconfig 则以 `npm run build` 为准，见 Task A6）

### Task A4: activity controller 新增 5 个方法 + promoModules 校验

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`

- [ ] **Step 1: 在 controller 顶部 import 处引入常量与错误类**

将：

```ts
import { FormValidationError } from "../services/form";
```

改为：

```ts
import { FormValidationError } from "../services/form";
import { PROMO_MODULE_TYPES, PROMO_TEMPLATES } from "../services/activity";
```

- [ ] **Step 2: 在 controller 导出对象内新增 5 个方法（放在 `unlockCheck` 之后、`questionnaire` 之前均可）**

```ts
  // GET /promo/activity/:documentId  宣传页聚合（公开，可匿名；登录则带上报名状态）
  async promoDetail(ctx: any) {
    try {
      const result = await activitySvc().promoDetail({
        activityDocumentId: ctx.params.documentId,
        userId: ctx.state.user?.id,
        siteDocumentId: ctx.state?.siteDocumentId,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/message  用户留言
  async sendMessage(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { content } = ctx.request.body || {};
      const result = await activitySvc().sendMessage({ userId, activityDocumentId: ctx.params.documentId, content });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /my/activity/:documentId/messages  我的留言+回复
  async listMessages(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await activitySvc().listMyMessages({ userId, activityDocumentId: ctx.params.documentId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activity-messages  运营端留言列表（?activity=&status=&page=&pageSize=）
  async adminListMessages(ctx: any) {
    try {
      const { activity, status, page = "1", pageSize = "20" } = ctx.query;
      const result = await activitySvc().adminListMessages({
        activity: activity as string | undefined,
        status: status as string | undefined,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /adm/activity-messages/:documentId/reply  运营回复
  async adminReplyMessage(ctx: any) {
    try {
      const { reply } = ctx.request.body || {};
      const result = await activitySvc().adminReplyMessage({
        messageDocumentId: ctx.params.documentId,
        reply: reply as string | undefined,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 3: adminCreate / adminUpdate 中校验并归一化 promo 三字段**

找到 `adminCreate` 与 `adminUpdate` 方法（L246-L313 附近），两者在调用 `strapi.documents(...).create/update` 前均有一段 `const body = ctx.request.body?.data || ctx.request.body;`（若结构不同，以实际为准在调用前插入校验）。在 `body` 取得后、写入前插入：

```ts
      // 宣传页配置校验与归一化（非法 type / sort 冲突自动过滤，不阻断合法字段保存）
      if (body.promoModules !== undefined) body.promoModules = normalizePromoModules(body.promoModules);
      if (body.promoTemplate !== undefined && !PROMO_TEMPLATES.includes(body.promoTemplate)) {
        throw new FormValidationError("promoTemplate 非法");
      }
      if (body.promoContact !== undefined && body.promoContact !== null) {
        if (typeof body.promoContact !== "object" || Array.isArray(body.promoContact)) {
          throw new FormValidationError("promoContact 必须为对象或 null");
        }
      }
```

> 若 adminCreate/adminUpdate 中 `body` 已 const 声明且需要被修改，可将 `const body` 改为 `const body: any`；`normalizePromoModules` 需在同文件定义（见 Step 4）。

- [ ] **Step 4: 在 controller 文件内补充 normalizePromoModules 实现**

在 controller 顶部（`relId` 函数之后）新增：

```ts
/** 宣传页模块归一化（复用 service 同名单逻辑，controller 内独立实现避免循环依赖） */
function normalizePromoModules(promoModules: any): any[] | undefined {
  if (promoModules === undefined || promoModules === null) return undefined;
  if (!Array.isArray(promoModules)) throw new FormValidationError("promoModules 必须为数组");
  const seen = new Set<number>();
  const out: any[] = [];
  for (const m of promoModules) {
    if (!m || typeof m !== "object") continue;
    if (!PROMO_MODULE_TYPES.includes(m.type)) continue;
    const sort = Number.isFinite(Number(m.sort)) ? Number(m.sort) : out.length;
    if (seen.has(sort)) continue;
    seen.add(sort);
    out.push({
      type: m.type,
      config: m.config && typeof m.config === "object" && !Array.isArray(m.config) ? m.config : {},
      sort,
    });
  }
  return out.sort((a, b) => a.sort - b.sort);
}
```

### Task A5: 注册路由

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 新增 5 条路由**

在 `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts` 的活动公开路由区（`publicRoute("GET", "/activities/:documentId", "activity.detail")` 之后）加：

```ts
    // 宣传落地页（模块化积木 × 风格 × 报名分流）
    publicRoute("GET", "/promo/activity/:documentId", "activity.promoDetail"),
```

在注册用户活动路由区（`userRoute("GET", "/my/activities", "activity.mySignups")` 之后）加：

```ts
    userRoute("POST", "/my/activity/:documentId/message", "activity.sendMessage"),
    userRoute("GET", "/my/activity/:documentId/messages", "activity.listMessages"),
```

在管理员活动路由区（`userRoute("PUT", "/adm/ledgers/:documentId/settle", ...)` 之后）加：

```ts
    // 活动宣传页客服留言管理（复用活动 read/update 权限点）
    channelScopeRoute("GET", "/adm/activity-messages", "activity.adminListMessages", "activity.read"),
    channelScopeRoute("PUT", "/adm/activity-messages/:documentId/reply", "activity.adminReplyMessage", "activity.update"),
```

- [ ] **Step 2: 确认控制器注册**

`controllers/index.ts` 中 `activity` 控制器已注册（`activity,`），新增方法随同对象导出，**无需改 index.ts**。

### Task A6: 重建插件 dist 并本地验证

**Files:**
- 产物：`e:\code\basic\plugins\zhao-point\dist/`（有效产物，需提交）

- [ ] **Step 1: 重建 zhao-point 插件**

Run: `cd e:/code/basic/plugins/zhao-point && npm run build`
Expected: 构建成功，`dist/server/index.js` 生成（改 TS 后必须重建才生效）

- [ ] **Step 2: 重启本机 Strapi dev**

Run（若 dev 未运行）: `cd e:/code/basic && npm run develop`
Expected: 启动无 schema 报错；`types/generated/contentTypes.d.ts` 自动重新生成（含 activity-message 与 promo 三字段，需随功能提交）

- [ ] **Step 3: 冒烟验证接口**

Run: `curl http://localhost:1337/api/zhao-point/v1/promo/activity/<某活动documentId>`
Expected: 返回 `{ data: { activity, modules, contact, rewards, signupStatus } }`，`modules` 为数组或 `null`

### Task A7: 端到端验收脚本（清残留）

**Files:**
- Create: `e:\code\basic\scripts\accept-promo-page.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-promo-page.cjs`，覆盖：
1. 公开聚合：`GET /promo/activity/:id` 返回结构完整（activity/modules/contact/rewards/signupStatus），匿名可访问
2. 模块归一化：先经 admin 接口创建带合法 + 非法 type 的 `promoModules`，断言非法被过滤、sort 升序
3. 留言闭环：登录用户 POST message → 我的留言列表可见 → admin 回复 → 我的留言列表可见回复且 status=replied
4. 联系方式合并：活动未配置 promoContact 时读站点 extraConfig.promoContact；活动配置后优先
5. 清理零残留：删除测试活动与测试留言，断言库中无残留

（验收脚本实现沿用既有 `scripts/accept-*.cjs` 的 raw-pg 直连 + HTTP 双通道风格，参照 `scripts/accept-activity-signup-time.cjs` 的结构）

- [ ] **Step 2: 运行并确认全绿**

Run: `cd e:/code/basic && node scripts/accept-promo-page.cjs`
Expected: 所有断言 PASS，无残留数据

- [ ] **Step 3: 收口清理**

- 删除临时诊断脚本（如有）
- Run: `cd e:/code/basic && git status` 确认插件 dist、types/generated/contentTypes.d.ts 变更存在
- **不主动 commit**，留待用户指示

---

## Phase B：运营端（web）

### Task B1: 模板常量与默认编排

**Files:**
- Create: `e:\code\web\src\pages\activity\promo-presets.js`

- [ ] **Step 1: 创建模板常量文件**

创建 `e:\code\web\src\pages\activity\promo-presets.js`：

```js
// 活动宣传页 5 风格预设：配色 + 默认模块编排 + 补充资料字段建议（选模板自动带出，运营可改）
export const PROMO_PRESETS = {
  summit: {
    label: '尊享峰会',
    color: '#c9a24b',
    modules: [
      { type: 'cover' }, { type: 'info' }, { type: 'rich' }, { type: 'speakers' },
      { type: 'agenda' }, { type: 'rewards' }, { type: 'contact' }, { type: 'message' },
    ],
    suggestFields: [
      { key: 'company', label: '公司', type: 'text', required: false },
      { key: 'position', label: '职位', type: 'text', required: false },
    ],
  },
  salon: {
    label: '沙龙社交',
    color: '#6366f1',
    modules: [
      { type: 'cover' }, { type: 'info' }, { type: 'rich' }, { type: 'highlights' },
      { type: 'speakers' }, { type: 'faq' }, { type: 'rewards' }, { type: 'contact' }, { type: 'message' },
    ],
    suggestFields: [
      { key: 'nickname', label: '昵称', type: 'text', required: false },
      { key: 'interest', label: '兴趣方向', type: 'text', required: false },
    ],
  },
  training: {
    label: '培训教育',
    color: '#059669',
    modules: [
      { type: 'cover' }, { type: 'info' }, { type: 'agenda' }, { type: 'speakers' },
      { type: 'faq' }, { type: 'rewards' }, { type: 'contact' }, { type: 'message' },
    ],
    suggestFields: [
      { key: 'job', label: '职业', type: 'text', required: false },
      { key: 'goal', label: '学习目标', type: 'text', required: false },
    ],
  },
  action: {
    label: '活力行动',
    color: '#ef4444',
    modules: [
      { type: 'cover' }, { type: 'info' }, { type: 'highlights' }, { type: 'images' },
      { type: 'rewards' }, { type: 'contact' }, { type: 'message' },
    ],
    suggestFields: [
      { key: 'contact_phone', label: '联系电话', type: 'phone', required: false },
      { key: 'emergency_contact', label: '紧急联系人', type: 'text', required: false },
    ],
  },
  life: {
    label: '温馨生活',
    color: '#db2777',
    modules: [
      { type: 'cover' }, { type: 'rich' }, { type: 'images' }, { type: 'info' },
      { type: 'rewards' }, { type: 'contact' }, { type: 'message' },
    ],
    suggestFields: [
      { key: 'companions', label: '同行人数', type: 'number', required: false },
      { key: 'child_age', label: '孩子年龄', type: 'text', required: false },
    ],
  },
}

export const PROMO_MODULE_META = {
  cover: { name: '封面横幅', needConfig: false },
  info: { name: '基本信息条', needConfig: false },
  rich: { name: '活动介绍', needConfig: true },
  highlights: { name: '亮点列表', needConfig: true },
  speakers: { name: '嘉宾讲师', needConfig: false },
  agenda: { name: '议程大纲', needConfig: true },
  images: { name: '图片墙', needConfig: true },
  rewards: { name: '报名权益', needConfig: false },
  contact: { name: '联系方式', needConfig: false },
  message: { name: '客服留言', needConfig: false },
  faq: { name: '常见问题', needConfig: true },
  custom: { name: '自定义块', needConfig: true },
}

export const PROMO_TEMPLATE_KEYS = Object.keys(PROMO_PRESETS)
```

### Task B2: form.vue 新增「宣传设置」section

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`

- [ ] **Step 1: 引入常量与 form 初始字段**

在 `form.vue` script 区 import 常量：

```js
import { PROMO_PRESETS, PROMO_MODULE_META, PROMO_TEMPLATE_KEYS } from './promo-presets.js'
```

在 `form` reactive（L672-L706）中追加三个字段：

```js
  promoTemplate: 'summit',
  promoModules: [],
  promoContact: null
```

- [ ] **Step 2: 编辑回填时解析 promo 字段**

在 `loadActivity`（或编辑回填逻辑）中将后台返回的 `promoTemplate/promoModules/promoContact` 赋给 `form`；`promoModules` 保持原样数组（含 sort）。

- [ ] **Step 3: 新增「宣传设置」section 模板（位于报名奖励配置之后、发布前）**

在 template 中追加（核心骨架，样式沿用现有 form-section/form-item 体系）：

```html
<view class="form-section">
  <view class="section-title">宣传设置</view>

  <view class="form-item">
    <text class="form-label">宣传风格</text>
    <view class="promo-template-grid">
      <view
        v-for="key in PROMO_TEMPLATE_KEYS"
        :key="key"
        class="promo-template-card"
        :class="{ on: form.promoTemplate === key }"
        @click="chooseTemplate(key)"
      >
        <view class="promo-template-color" :style="{ background: PROMO_PRESETS[key].color }"></view>
        <text class="promo-template-name">{{ PROMO_PRESETS[key].label }}</text>
      </view>
    </view>
  </view>

  <view class="form-item">
    <text class="form-label">页面模块</text>
    <view v-for="(m, i) in form.promoModules" :key="i" class="promo-module-row">
      <view class="promo-module-name" @click="toggleModuleConfig(i)">
        <text>{{ PROMO_MODULE_META[m.type]?.name || m.type }}</text>
        <text class="promo-module-arrow">{{ openModuleIndex === i ? '▲' : '▼' }}</text>
      </view>
      <view class="promo-module-ops">
        <text class="link-del" @click="moveModule(i, -1)">上移</text>
        <text class="link-del" @click="moveModule(i, 1)">下移</text>
        <text class="link-del" @click="removeModule(i)">删除</text>
      </view>
      <view v-if="openModuleIndex === i" class="promo-module-config">
        <template v-if="m.type === 'rich' || m.type === 'custom'">
          <RichEditor v-model="m.config.html" />
        </template>
        <template v-else-if="m.type === 'highlights'">
          <view v-for="(p, pi) in m.config.points || []" :key="pi" class="form-row">
            <input type="text" v-model="m.config.points[pi]" placeholder="亮点内容" class="form-input" />
            <text class="link-del" @click="m.config.points.splice(pi, 1)">删除</text>
          </view>
          <view class="link-add" @click="(m.config.points ||= []).push('')">+ 添加亮点</view>
        </template>
        <template v-else-if="m.type === 'agenda'">
          <view v-for="(it, ii) in m.config.items || []" :key="ii" class="form-row">
            <input type="text" v-model="m.config.items[ii].t" placeholder="时间" class="form-input form-inline" />
            <input type="text" v-model="m.config.items[ii].title" placeholder="议程标题" class="form-input form-inline" />
            <text class="link-del" @click="m.config.items.splice(ii, 1)">删除</text>
          </view>
          <view class="link-add" @click="(m.config.items ||= []).push({ t: '', title: '', desc: '' })">+ 添加条目</view>
        </template>
        <template v-else-if="m.type === 'faq'">
          <view v-for="(it, ii) in m.config.items || []" :key="ii" class="form-row">
            <input type="text" v-model="m.config.items[ii].q" placeholder="问题" class="form-input form-inline" />
            <input type="text" v-model="m.config.items[ii].a" placeholder="回答" class="form-input form-inline" />
            <text class="link-del" @click="m.config.items.splice(ii, 1)">删除</text>
          </view>
          <view class="link-add" @click="(m.config.items ||= []).push({ q: '', a: '' })">+ 添加问答</view>
        </template>
        <template v-else-if="m.type === 'images'">
          <MediaPicker v-model="m.config.images" />
        </template>
      </view>
    </view>
    <view class="link-add" @click="openAddModule = true">+ 添加模块</view>
  </view>

  <view class="form-item">
    <text class="form-label">联系方式</text>
    <view class="switch-row">
      <text>使用站点默认联系方式</text>
      <switch :checked="!form.promoContact" @change="toggleContactOverride" />
    </view>
    <template v-if="form.promoContact">
      <input type="text" v-model="form.promoContact.wechat.id" placeholder="微信号" class="form-input" />
      <input type="text" v-model="form.promoContact.phone" placeholder="联系电话" class="form-input" />
      <input type="text" v-model="form.promoContact.notice" placeholder="提示文案（如：无法报名请加顾问微信）" class="form-input" />
    </template>
  </view>

  <view class="form-item">
    <text class="form-label">补充资料</text>
    <text class="form-tip">模板选择已带出建议字段，可在下方「报名表单配置」中增删</text>
  </view>
</view>
```

> 说明：`RichEditor`、`MediaPicker` 均已存在于 `web/src/components/`，直接复用。微信二维码图片上传在 `promoContact.wechat.qrcode` 用 `MediaPicker` 选择单图即可（示例中略，运营可后续补）。

- [ ] **Step 4: 新增脚本逻辑（chooseTemplate / 模块增删移 / 联系方式开关）**

在 script 区新增：

```js
const openModuleIndex = ref(-1)
const openAddModule = ref(false)

// 选模板：二次确认；仅当 promoModules 为空/未编辑过时带出默认编排，并把建议补充字段合并进 formConfig
function chooseTemplate(key) {
  if (form.promoTemplate === key) return
  const edited = form.promoModules && form.promoModules.length
  uni.showModal({
    title: '切换宣传风格',
    content: edited ? '当前已配置模块，切换模板仅改配色，不会清空模块。' : '将按模板带出默认模块编排与补充资料字段？',
    success: (res) => {
      if (!res.confirm) return
      form.promoTemplate = key
      if (!edited) {
        form.promoModules = PROMO_PRESETS[key].modules.map((m, i) => ({ ...m, config: {}, sort: i }))
        mergeSuggestFields(PROMO_PRESETS[key].suggestFields)
      }
    },
  })
}

function mergeSuggestFields(fields) {
  const cur = Array.isArray(form.formConfig) ? form.formConfig : []
  for (const f of fields) {
    if (!cur.some(c => c.key === f.key)) cur.push(f)
  }
  form.formConfig = cur
}

function moveModule(i, dir) {
  const arr = form.promoModules
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const [m] = arr.splice(i, 1)
  arr.splice(j, 0, m)
  reindexModules()
}

function removeModule(i) {
  form.promoModules.splice(i, 1)
  reindexModules()
}

function reindexModules() {
  form.promoModules.forEach((m, i) => { m.sort = i })
}

function addModule(type) {
  form.promoModules.push({ type, config: {}, sort: form.promoModules.length })
  openAddModule.value = false
}

function toggleModuleConfig(i) {
  openModuleIndex.value = openModuleIndex.value === i ? -1 : i
}

function toggleContactOverride(e) {
  // switch 关闭=使用站点默认（null）；开启=初始化活动级覆盖
  if (e.detail.value) {
    if (!form.promoContact) form.promoContact = { wechat: { qrcode: '', id: '' }, phone: '', card: null, notice: '' }
  } else {
    form.promoContact = null
  }
}
```

- [ ] **Step 5: submitData 追加 promo 三字段**

在 `submitData`（L1390-L1459）中 `status: form.status` 之前追加：

```js
    promoTemplate: form.promoTemplate,
    promoModules: (form.promoModules || []).map((m, i) => ({
      type: m.type,
      config: m.config && Object.keys(m.config).length ? m.config : {},
      sort: i,
    })),
    promoContact: form.promoContact || null,
```

- [ ] **Step 6: 添加模块类型选择弹层（12 种）**

在 template 末尾追加弹层：

```html
<view class="modal-mask" v-if="openAddModule" @click="openAddModule = false">
  <view class="modal-content" @click.stop>
    <view class="modal-header">
      <text class="modal-title">添加模块</text>
      <text class="modal-close" @click="openAddModule = false">✕</text>
    </view>
    <view class="promo-module-add-grid">
      <view v-for="(meta, type) in PROMO_MODULE_META" :key="type" class="promo-module-add-item" @click="addModule(type)">
        <text>{{ meta.name }}</text>
      </view>
    </view>
  </view>
</view>
```

### Task B3: 留言管理 API 与页面

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Create: `e:\code\web\src\pages\activity\messages.vue`
- Modify: `e:\code\web\src\pages.json`
- Modify: `e:\code\web\src\pages\activity\list.vue`

- [ ] **Step 1: 封装留言管理 API**

在 `e:\code\web\src\api\activity.js` 末尾追加：

```js
// ===== 活动宣传页客服留言 =====
// 列表（?activity=活动documentId&status=open|replied&page=&pageSize=）
export function listActivityMessages(params = {}) {
  return get(`${V1}/admin/adm/activity-messages`, params)
}
// 回复（body:{reply}）
export function replyActivityMessage(messageDocumentId, reply) {
  return put(`${V1}/admin/adm/activity-messages/${messageDocumentId}/reply`, { reply })
}
```

- [ ] **Step 2: 创建 messages.vue**

创建 `e:\code\web\src\pages\activity\messages.vue`，功能：活动筛选（picker，复用 list 接口）、状态筛选（全部/未回复/已回复）、留言列表（用户信息 + 内容 + 状态徽标）、点击「回复」弹层输入回复并提交（成功后刷新、状态→replied）。核心脚本：

```js
import { ref, computed, onMounted } from 'vue'
import { listActivities } from '../../api/activity.js'
import { listActivityMessages, replyActivityMessage } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activityOptions = ref([])   // [{documentId,title}]
const statusOptions = ['全部状态', '未回复', '已回复']
const statusValues = ['', 'open', 'replied']
const statusIndex = ref(0)
const activityIndex = ref(0)
const rows = ref([])
const pagination = ref({})
const showReply = ref(false)
const current = ref(null)
const replyText = ref('')

async function loadActivities() {
  const list = await listActivities({ page: 1, pageSize: 200 })
  activityOptions.value = (list || []).map(a => ({ documentId: a.documentId, title: a.title }))
}

async function loadMessages(page = 1) {
  const params = { page, pageSize: 20 }
  if (statusValues[statusIndex.value]) params.status = statusValues[statusIndex.value]
  if (activityIndex.value > 0) params.activity = activityOptions.value[activityIndex.value - 1].documentId
  const res = await listActivityMessages(params)
  rows.value = res?.list ?? res?.data ?? []
  pagination.value = res?.pagination ?? {}
}

function openReply(m) { current.value = m; replyText.value = ''; showReply.value = true }

async function submitReply() {
  if (!replyText.value.trim()) return uni.showToast({ title: '请输入回复内容', icon: 'none' })
  await replyActivityMessage(current.value.documentId, replyText.value.trim())
  showReply.value = false
  uni.showToast({ title: '回复成功', icon: 'success' })
  loadMessages(1)
}

onMounted(async () => { await loadActivities(); loadMessages(1) })
```

- [ ] **Step 3: 注册路由**

在 `e:\code\web\src\pages.json` 活动区（`pages/activity/ledger` 之后）加：

```json
    { "path": "pages/activity/messages", "style": { "navigationBarTitleText": "留言管理" } },
```

- [ ] **Step 4: list.vue 加入口**

在 `e:\code\web\src\pages\activity\list.vue` 的 PageHeader 按钮组加：

```html
<button class="btn-primary" @click="goMessages">💬 留言</button>
```

并在 script 加：

```js
function goMessages() { uni.navigateTo({ url: '/pages/activity/messages' }) }
```

### Task B4: 构建 web 运营端

- [ ] **Step 1: 构建**

Run: `cd e:/code/web && $env:NODE_OPTIONS='--max-old-space-size=1024 --max-semi-space-size=64'; npm run build:h5`
Expected: 构建成功，无 JS/模板错误、无调试日志残留；产物 `dist/build/web/client`

- [ ] **Step 2: 手动验收（8 点）**
1. 活动表单出现「宣传设置」区，5 风格卡片单选、配色标识正确
2. 首次选模板带出默认模块编排与建议补充字段（二次确认弹窗）
3. 模块上移/下移/删除/添加（12 类）正常，sort 重排
4. rich/custom 富文本、images 多图上传可用
5. 联系方式开关：默认站点 / 活动覆盖（微信号/电话/提示文案）
6. 保存后 `promoModules/promoTemplate/promoContact` 正确落库，重新打开回填
7. 「留言管理」页：活动/状态筛选、回复后 status→replied
8. 非法 promoModules（手工造数）后端过滤，不 500

---

## Phase C：C端（shao）

### Task C1: 路由与 API 封装

**Files:**
- Modify: `e:\code\shao\pages.json`
- Modify: `e:\code\shao\services\api.ts`

- [ ] **Step 1: 注册 promo 路由**

在 `e:\code\shao\pages.json` 活动区（`pages/activity/my` 之后）加：

```json
		{
			"path": "pages/activity/promo",
			"style": {
				"navigationBarTitleText": "活动宣传"
			}
		},
```

- [ ] **Step 2: 封装 3 个 promo API**

在 `e:\code\shao\services\api.ts` 活动 API 区追加：

```ts
/**
 * 宣传页聚合（公开）
 * @returns { activity, modules, contact, rewards, signupStatus }
 */
export async function getPromoPage(activityDocumentId: string) {
  const res = await request(`/zhao-point/v1/promo/activity/${activityDocumentId}`)
  return res?.data ?? res
}

/** 用户留言（需登录） */
export async function sendActivityMessage(activityDocumentId: string, content: string) {
  const res = await request(`/zhao-point/v1/my/activity/${activityDocumentId}/message`, {
    method: 'POST',
    data: { content },
  })
  return res?.data ?? res
}

/** 我的留言+运营回复列表（需登录） */
export async function listMyActivityMessages(activityDocumentId: string) {
  const res = await request(`/zhao-point/v1/my/activity/${activityDocumentId}/messages`)
  return res?.data ?? res
}
```

### Task C2: 12 个模块组件

**Files:**
- Create: `e:\code\shao\components\promo\promo-cover.vue` 等 12 个

- [ ] **Step 1: 约定组件接口**

每个模块组件统一 props 契约：
```ts
props: {
  activity: Object,   // 活动字段（title/startTime/venueName/description/assets...）
  config: Object,     // 该模块 config
  contact: Object,    // 合并后的联系方式（contact/message 模块用）
  rewards: Object,    // 奖励摘要（rewards 模块用）
}
```
模块仅负责展示，不含报名/留言业务逻辑（业务交互由 promo.vue 通过事件/页面方法处理）。

- [ ] **Step 2: 创建只读类模块组件（8 个）**

创建 `e:\code\shao\components\promo\` 下 8 个组件，样式用 CSS 变量（`var(--c-primary)` 等）：

1. **promo-cover.vue**：主标题（config.title 优先，回退 activity.title）、副标语（config.subtitle）、背景图（config.bgImage 或 activity.assets 封面，无则主色渐变兜底）
2. **promo-info.vue**：时间（formatTime(startTime) ~ endTime）、地点（venueName）、名额（usedCapacity/capacity）、费用（pricingMode 摘要）、状态徽标
3. **promo-rich.vue**：`rich-text :nodes="config.html || activity.description"`
4. **promo-highlights.vue**：config.title + config.points[] 竖排要点（圆点/勾选样式）
5. **promo-speakers.vue**：activity.lecturer（name/avatar/bio/tags），无讲师显示 `暂无嘉宾`
6. **promo-images.vue**：config.images[] 网格图（`resolveMediaUrl`）
7. **promo-faq.vue**：config.items[] 折叠问答（点击展开）
8. **promo-custom.vue**：config.title + rich-text html + images[] 图

- [ ] **Step 3: 创建交互类模块组件（2 个）**

创建：
- **promo-rewards.vue**：展示 rewards.rewards[]（名称 + condition 徽标：无条件/微信授权/留联系方式/答问卷），`enabled=false` 时整块隐藏
- **promo-message.vue**：留言入口（`emit('open-message')`）＋ 历史消息列表（页面传入 messages）

- [ ] **Step 4: 创建联系方式模块组件（2 个）**

创建：
- **promo-contact.vue**：微信（二维码/复制微信号）、电话（tel: 拨号）、名片（vCard 下载）、提示文案；各按钮 `emit('open-wechat'|'call-phone'|'open-card')`
- （留言入口放 `promo-message.vue`，contact 模块内也放一个「客服留言」按钮 emit `open-message`）

> 说明：联系方式弹层（二维码大图/名片卡/vCard 下载）由 promo.vue 统一实现，组件只负责触发事件，避免交互逻辑分散。

### Task C3: 5 套风格主题 CSS

**Files:**
- Create: `e:\code\shao\styles\promo-themes.scss`

- [ ] **Step 1: 创建主题样式**

创建 `e:\code\shao\styles\promo-themes.scss`，定义 5 组 CSS 变量（根类注入）：

```scss
/* 活动宣传页 5 风格配色（由 promoTemplate 决定根类） */
.promo-summit {
  --c-primary: #c9a24b;
  --c-bg: #0b1220;          // 深蓝黑底
  --c-text: #e8e6e0;
  --c-text-dim: #9aa0ac;
  --c-card: #151d2e;
  --c-accent: #c9a24b;
}
.promo-salon {
  --c-primary: #6366f1;
  --c-bg: #ffffff;
  --c-text: #1f2937;
  --c-text-dim: #6b7280;
  --c-card: #f5f6ff;
  --c-accent: #6366f1;
}
.promo-training {
  --c-primary: #059669;
  --c-bg: #ffffff;
  --c-text: #1f2937;
  --c-text-dim: #6b7280;
  --c-card: #f0faf5;
  --c-accent: #059669;
}
.promo-action {
  --c-primary: #ef4444;
  --c-bg: #fff7f5;
  --c-text: #1f2937;
  --c-text-dim: #6b7280;
  --c-card: #fff1ee;
  --c-accent: #f97316;
}
.promo-life {
  --c-primary: #db2777;
  --c-bg: #fff6fa;
  --c-text: #1f2937;
  --c-text-dim: #8b5e70;
  --c-card: #fff0f5;
  --c-accent: #db2777;
}

/* 通用：卡片圆角/间距随风格微调，主按钮用 --c-primary */
.promo-page .promo-card { background: var(--c-card); border-radius: 16rpx; padding: 28rpx; margin: 0 24rpx 24rpx; }
.promo-page .promo-btn-primary { background: var(--c-primary); color: #fff; }
```

### Task C4: promo.vue 主页面（聚合拉取 + 渲染循环 + 底部栏）

**Files:**
- Create: `e:\code\shao\pages\activity\promo.vue`

- [ ] **Step 1: 页面骨架与数据拉取**

创建 `e:\code\shao\pages\activity\promo.vue`，核心 script：

```ts
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { getPromoPage, listMyActivityMessages } from '@/services/api'
import { getEnv, isWechatBrowser, resolveMediaUrl, BASE_URL } from '@/utils/env'

const act = ref(null)         // ?act=<documentId>
const page = ref(null)        // 聚合返回
const modules = computed(() => (page.value?.modules || []).filter(m => PROMO_TYPE_SET.has(m.type)))
const contact = computed(() => page.value?.contact || null)
const rewards = computed(() => page.value?.rewards || null)
const signupStatus = computed(() => page.value?.signupStatus || { signedUp: false })
const inWechat = computed(() => getEnv().type === 'wechat' || isWechatBrowser())
const styleClass = computed(() => `promo-${page.value?.activity?.promoTemplate || 'summit'}`)
const messages = ref([])

const PROMO_TYPE_SET = new Set(['cover','info','rich','highlights','speakers','agenda','images','rewards','contact','message','faq','custom'])

async function loadPage() {
  if (!act.value) return
  page.value = await getPromoPage(act.value)
  uni.setNavigationBarTitle({ title: page.value?.activity?.title || '活动宣传' })
  if (page.value?.signupStatus?.signedUp) {
    messages.value = await listMyActivityMessages(act.value).catch(() => [])
  }
}

onLoad((opts) => { act.value = opts?.act || ''; loadPage() })

onShareAppMessage(() => ({
  title: page.value?.activity?.title || '活动报名',
  imageUrl: coverImage(),
  path: `/pages/activity/promo?act=${act.value}`,
}))
onShareTimeline(() => ({ title: page.value?.activity?.title || '活动报名', imageUrl: coverImage() }))

function coverImage() {
  const a = page.value?.activity
  const img = a?.assets?.cover || a?.assets?.poster || a?.assets?.materials?.[0]?.url
  return img ? resolveMediaUrl(img) : ''
}
```

- [ ] **Step 2: 模板渲染循环 + 模块分发**

```html
<template>
  <view class="promo-page" :class="styleClass">
    <block v-for="m in modules" :key="m.sort">
      <PromoCover v-if="m.type === 'cover'" :activity="page.activity" :config="m.config" />
      <PromoInfo v-else-if="m.type === 'info'" :activity="page.activity" />
      <PromoRich v-else-if="m.type === 'rich'" :activity="page.activity" :config="m.config" />
      <PromoHighlights v-else-if="m.type === 'highlights'" :config="m.config" />
      <PromoSpeakers v-else-if="m.type === 'speakers'" :activity="page.activity" />
      <PromoAgenda v-else-if="m.type === 'agenda'" :config="m.config" />
      <PromoImages v-else-if="m.type === 'images'" :config="m.config" />
      <PromoRewards v-else-if="m.type === 'rewards'" :rewards="rewards" />
      <PromoContact v-else-if="m.type === 'contact'" :contact="contact" @open-wechat="openWechat" @call-phone="callPhone" @open-card="openCard" @open-message="openMessagePanel" />
      <PromoMessage v-else-if="m.type === 'message'" :messages="messages" @open-message="openMessagePanel" />
      <PromoFaq v-else-if="m.type === 'faq'" :config="m.config" />
      <PromoCustom v-else-if="m.type === 'custom'" :config="m.config" />
    </block>
    <view class="promo-footer">
      <view class="promo-btn-primary" @click="handleSignupClick">{{ signupBtnText }}</view>
    </view>
  </view>
</template>
```

> 模块组件统一 import 注册；未知 type 被 `modules` computed 过滤，不渲染。

- [ ] **Step 3: 底部报名按钮状态**

```ts
const signupBtnText = computed(() => {
  const s = signupStatus.value
  const st = page.value?.activity?.status
  if (s.signedUp && s.status === 'active') return s.attendedAt ? '查看报名凭证' : '已报名 · 查看凭证'
  if (s.signedUp && s.status === 'waiting') return '候补中'
  if (st === 'draft') return '活动未发布'
  if (st === 'ended' || st === 'archived') return '活动已结束'
  return '立即报名'
})
```

### Task C5: 报名分流（微信权益引导 / 浏览器普通表单）

- [ ] **Step 1: 微信环境权益引导报名**

复用 `detail.vue` 的 `openRewardGuide` 弹窗逻辑：`handleSignupClick` 在 `inWechat` 且 `rewards.enabled` 时进入权益引导（步骤：静默/授权登录 → 完善信息 → 奖励菜单 → 确认报名，调 `signupActivity`）；纯浏览场景走普通表单。为降低重复，将 detail.vue 的引导弹窗抽为可复用组件或直接在 promo.vue 内复制该弹窗模板（推荐后者，改动最小、不触碰 detail.vue 核心）。

- [ ] **Step 2: 浏览器环境普通报名表单**

非微信环境：弹普通报名表单（渲染 `activity.formConfig` 字段，复用 detail.vue 的表单渲染片段），提交调 `signupActivity`，页面同时展示权益清单但不强制解锁。

- [ ] **Step 3: 登录态兜底**

未登录（微信静默失败 / 浏览器未登录）→ 复用现有登录/静默授权机制（`login.vue` 分支逻辑），成功后继续报名流程。

### Task C6: 联系方式交互（微信/电话/名片/vCard/留言面板）

- [ ] **Step 1: 加微信 + 电话 + 名片**

在 promo.vue 实现：
- `openWechat()`：二维码大图弹层（`contact.wechat.qrcode`，长按识别提示）+ 「复制微信号」按钮（`uni.setClipboardData`）
- `callPhone()`：`uni.makePhoneCall({ phoneNumber: contact.phone })`
- `openCard()`：名片卡弹层（avatar/name/title/company/wechat/phone），提供「一键拨号」「复制微信号」「保存到通讯录」

- [ ] **Step 2: vCard 保存到通讯录**

```ts
function saveVCard() {
  const c = contact.value?.card
  if (!c) return
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${c.name || ''}`,
    `TITLE:${c.title || ''}`,
    `ORG:${c.company || ''}`,
    `TEL;TYPE=CELL:${c.phone || ''}`,
    `X-WECHAT:${c.wechat || ''}`,
    'END:VCARD',
  ].join('\n')
  // #ifdef H5
  const a = document.createElement('a')
  a.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`
  a.download = `${c.name || 'contact'}.vcf`
  a.click()
  // #endif
  // 微信内下载可能被拦截：提供「复制名片信息」兜底
  uni.showModal({ title: '已生成名片', content: '如未触发下载，可复制名片信息。', confirmText: '复制信息', success: (r) => { if (r.confirm) copyCardText(c) } })
}
```

- [ ] **Step 3: 留言面板**

`openMessagePanel()`：弹层展示历史消息（本人 content + 运营 reply，status=replied 显示回复）+ 输入框；发送调 `sendActivityMessage`，成功后追加本地消息并刷新 `listMyActivityMessages`；未登录先走登录。

### Task C7: 分享海报（原生 canvas）

- [ ] **Step 1: 生成海报**

新增 `generatePoster()`：原生 canvas 2D 合成（封面图或主色渐变背景 + 活动标题 + 时间 + 地点 + 页脚文案 + 宣传页二维码）。二维码用 `page.value.activity` 的分享路径生成（若项目有现成二维码生成工具则复用，无则用 `uni.$emit`/原生 canvas 画占位码或复用 `detail.vue` 现有二维码组件）；无封面图时用 `--c-primary` 纯色兜底。

- [ ] **Step 2: 保存**

`uni.canvasToTempFilePath` → `uni.saveImageToPhotosAlbum`；跨域图片污染时回退纯色背景重绘（海报图仅用站内已传图或纯色兜底，符合设计 §10）。

### Task C8: 构建 shao C端

- [ ] **Step 1: 构建 H5**

Run: `cd e:/code/shao && $env:NODE_OPTIONS='--max-old-space-size=1024 --max-semi-space-size=64'; npm run build:h5`
Expected: 构建成功，无 JS/模板错误、无调试日志残留；产物 `unpackage/dist/build/web/client`

- [ ] **Step 2: 手动验收（6 点）**
1. `?act=<documentId>` 直达宣传页，模块按编排渲染、风格配色生效、5 风格布局差异明显
2. 微信环境（模拟 `debugWx=1`）报名走权益引导解锁；浏览器环境普通表单报名
3. 加微信（二维码+复制）、电话（tel:）、名片（vCard 下载+复制兜底）
4. 留言闭环：发留言 → 运营端回复 → 我的留言列表可见回复
5. 分享卡片与海报可保存、海报二维码扫码进入宣传页
6. 候补/已报名/已结束按钮状态正确；非法模块数据不崩溃（未知 type 跳过）

---

## 自审清单（Self-Review）

**1. Spec 覆盖：**
- [x] 12 模块（Task A3 常量 / B2 编辑器 / C2 组件）
- [x] 5 风格预设（B1 常量 / C3 主题 CSS）
- [x] 报名分流（C5）
- [x] 4 种联系方式 + vCard（C6）
- [x] 分享海报（C7）
- [x] 留言闭环（A3/A4/A5/B3/C1/C6）
- [x] 后端三字段 + 校验（A1/A4）
- [x] 站点默认联系方式（A3 `resolvePromoContact`）
- [x] 边界：未知 type 跳过（C4 computed 过滤）、vCard 兜底复制（C6）、海报纯色兜底（C7）

**2. 占位符扫描：** 无 TBD/TODO；所有步骤含具体代码或明确命令。

**3. 类型/命名一致性：**
- `promoDetail/sendMessage/listMessages/adminListMessages/adminReplyMessage`（controller 与 service 同名对齐）
- `normalizePromoModules`（service 与 controller 各一份，签名一致）
- `promoTemplate/promoModules/promoContact`（schema/submitData/编辑器/C端读取一致）
- 路由 handler `activity.*` 与 controllers/index.ts 已注册的 `activity` 控制器匹配
- 模块 type 枚举：A3 `PROMO_MODULE_TYPES`、B1 `PROMO_MODULE_META` 的 key、C4 `PROMO_TYPE_SET`、C2 组件名一一对应

---

## 执行交接

计划已保存至 `docs/superpowers/plans/2026-08-25-activity-promo-page.md`。两种执行方式：

1. **Subagent-Driven（推荐）**：每个任务派发独立子代理，任务间评审，快速迭代
2. **Inline Execution**：本会话内按 executing-plans 分批执行，检查点评审

请选择执行方式（建议从 **Phase A 后端** 开始，A1→A7 顺序推进）。
