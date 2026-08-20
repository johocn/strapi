# 消息中心 AB 测试 / 模板版本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在消息中心实现模板版本管理与 AB 测试：独立版本表、buildJob 加权随机分配并固化 job.version、版本统计（sent/success）、link 带 utm 经 visit-log 点击归因、管理端版本管理与 AB 对比。

**Architecture:** zhao-sso 新增 `sso_msg_template_versions` content-type；改造 `sso-msg` 的 buildJob（选版本加权随机、link 加 utm）与 sendJob（用版本内容发送、成功计数）；新增版本控制器 + admin 路由（版本 CRUD/activate/ab-stats）。web 管理端模板编辑页内嵌版本管理区 + AB 对比查看。

**Tech Stack:** Strapi 5 插件（zhao-sso）、PostgreSQL、uni-app（web 管理端）、camelCase 属性命名（db.query 不映射 snake_case）。

---

## 文件结构

**zhao-sso 后端（e:\code\basic\plugins\zhao-sso\server\src）**
- Create `content-types/msg-template-version/schema.json` + `index.ts`
- Modify `content-types/msg-job/schema.json`：加 version relation
- Modify `content-types/index.ts`：注册 msg-template-version
- Modify `services/sso-msg.ts`：buildJob 版本选择 + sendJob 版本发送/计数 + link utm
- Create `controllers/msg-version-controller.ts`
- Modify `controllers/index.ts`：注册 msg-version
- Modify `routes/admin.ts`：版本 CRUD/activate/ab-stats 路由

**验收（e:\code\basic\scripts）**
- Create `accept-ab-test.cjs`

**web 管理端（e:\code\web\src）**
- Modify `api/sso.js`：ssoMsgTemplateVersionApi + abStats
- Modify `pages/sso/msg-template/edit.vue`：内嵌版本管理区
- Modify `pages/sso/msg-template/list.vue`：AB 对比查看入口

---

## Task 1: 版本数据模型

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-template-version\schema.json`
- Create: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-template-version\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\msg-job\schema.json`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\content-types\index.ts`

- [ ] **Step 1: 写 msg-template-version schema**

```json
{
  "kind": "collectionType",
  "collectionName": "sso_msg_template_versions",
  "info": { "singularName": "msg-template-version", "pluralName": "msg-template-versions", "displayName": "SSO Msg Template Version" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "template": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template", "required": true },
    "code": { "type": "string", "required": true },
    "name": { "type": "string" },
    "wxTemplateId": { "type": "string" },
    "wxTemplateFields": { "type": "json" },
    "content": { "type": "text" },
    "link": { "type": "string" },
    "weight": { "type": "integer", "default": 1 },
    "status": { "type": "enumeration", "enum": ["draft", "active"], "default": "draft", "required": true },
    "sentCount": { "type": "integer", "default": 0 },
    "successCount": { "type": "integer", "default": 0 },
    "clickCount": { "type": "integer", "default": 0 },
    "lastUsedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: msg-job schema 加 version relation**（`attributes` 内追加）

```json
"version": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template-version" },
```

- [ ] **Step 3: content-types/index.ts 注册 `"msg-template-version"`**

- [ ] **Step 4: 验证**：`node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-sso/server/src/content-types/msg-template-version/schema.json','utf8'))"` 无报错

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/content-types
git commit -m "feat(zhao-sso): 模板版本 sso_msg_template_versions + msg-job 关联 version"
```

---

## Task 2: sso-msg AB 分配/发送/计数/归因

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-msg.ts`

- [ ] **Step 1: 顶部加常量与辅助函数**

```ts
const VERSION_UID = "plugin::zhao-sso.msg-template-version";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";

/** 按权重加权随机选版本；weight<=0 剔除 */
function pickVersion(versions: any[]): any | null {
  const pool = (versions || []).filter((v: any) => (v.weight || 0) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((s: number, v: any) => s + (v.weight || 0), 0);
  let r = Math.random() * total;
  for (const v of pool) {
    r -= v.weight || 0;
    if (r <= 0) return v;
  }
  return pool[pool.length - 1];
}

/** link 追加 utm 归因参数（utm_source=msg&utm_campaign=code&utm_content=jobId） */
function appendUtm(link: string | null, code: string, jobId: any): string | null {
  if (!link) return link;
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}utm_source=msg&utm_campaign=${encodeURIComponent(code)}&utm_content=${jobId}`;
}
```

- [ ] **Step 2: buildJob 版本选择**（`const template = ...` 之后、`const provider` 之前插入；`key` 计算后、create 前设置 jobData.version 与 link）

在 buildJob 中，模板查到且幂等通过后：
```ts
      // AB 版本选择：有 active 版本按权重随机选并固化；无则回退模板本体
      const versions = await strapi.db.query(VERSION_UID).findMany({
        where: { template: template.id, status: "active" },
      });
      const picked = pickVersion(versions);
      let useWxTemplateId = template.wxTemplateId;
      let useWxTemplateFields = template.wxTemplateFields;
      let useLink = template.link;
      if (picked) {
        useWxTemplateId = picked.wxTemplateId || template.wxTemplateId;
        useWxTemplateFields = picked.wxTemplateFields || template.wxTemplateFields;
        useLink = picked.link || template.link;
      }
```
在 `const jobData: any = { ... }` 内追加：
```ts
        version: picked ? picked.id : null,
        link: null, // link 占位，创建后用 job.id 追加 utm 再更新
```
并在 create 之后（拿到 job.id）追加：
```ts
      if (useLink && job?.id) {
        const finalLink = appendUtm(useLink, picked ? picked.code : template.code, job.id);
        await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { link: finalLink } });
        job.link = finalLink;
      }
```
> 注意：原 jobData 中的 `link: link || null` 需改为 `link: null`（由上方 utm 逻辑回填）；模板本体/版本的 link 通过 useLink 走 utm。

- [ ] **Step 3: sendJob 用版本内容 + 计数**

`sendJob` 中 populate 增加版本：`populate: { template: true, version: true }`；`renderData` 与 `channel.send` 使用版本优先：
```ts
      const wxFields = job.version ? job.version.wxTemplateFields : job.template.wxTemplateFields;
      const wxTemplateId = job.version ? job.version.wxTemplateId : job.template.wxTemplateId;
      if (!wxTemplateId) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板ID");
      const data = renderData(job.params || {}, wxFields);
      const res = await channel.send({ openid: toTarget, templateId: wxTemplateId, url: job.link || undefined, data });
```
发送成功后（status: "sent" 更新之后）追加版本计数：
```ts
        if (job.version?.id) {
          await strapi.db.query(VERSION_UID).update({
            where: { id: job.version.id },
            data: { sentCount: (job.version.sentCount || 0) + 1, successCount: (job.version.successCount || 0) + 1, lastUsedAt: new Date() },
          });
        }
```

- [ ] **Step 4: 验证**：`npx tsc --noEmit -p server/tsconfig.json`（plugins/zhao-sso 目录）退出码 0

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/services/sso-msg.ts
git commit -m "feat(zhao-sso): sso-msg AB分配(加权随机固化version) + 版本发送/成功计数 + link utm归因"
```

---

## Task 3: 版本控制器与路由

**Files:**
- Create: `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-version-controller.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`

- [ ] **Step 1: msg-version-controller.ts**

```ts
import type { Core } from "@strapi/strapi";
const VERSION_UID = "plugin::zhao-sso.msg-template-version";
const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const JOB_UID = "plugin::zhao-sso.msg-job";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function wrap(ctx: any, fn: () => Promise<any>) {
    try { ctx.body = await fn(); }
    catch (e: any) { ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: (e as any).code || null }; }
  }
  /** 解析模板（documentId 或数字 id → 数字 id） */
  async function resolveTemplate(templateId: string): Promise<number> {
    const num = Number(templateId);
    if (Number.isInteger(num) && num > 0) {
      const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: num } });
      if (t) return t.id;
    }
    const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { documentId: templateId } });
    if (!t) { const e: any = new Error("模板不存在"); e.status = 404; throw e; }
    return t.id;
  }
  return {
    async list(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID).findMany({ where: { template: templateId }, orderBy: { id: "DESC" } });
        // 点击数实时聚合（utm_source=msg, utm_campaign=code）
        const clicks: Record<string, number> = {};
        for (const r of rows) {
          if (!r.code) continue;
          const c = await strapi.db.query(VISIT_LOG_UID).count({ where: { utmSource: "msg", utmCampaign: r.code } }).catch(() => 0);
          clicks[r.code] = c;
        }
        return { data: rows.map((r: any) => ({ ...r, clickCountLive: clicks[r.code] || 0 })) };
      });
    },
    async create(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(VERSION_UID).create({ data: { ...data, template: templateId, sentCount: 0, successCount: 0, clickCount: 0 } });
        return { data: row };
      });
    },
    async update(ctx: any) {
      await wrap(ctx, async () => {
        const row = await strapi.db.query(VERSION_UID).update({ where: { id: Number(ctx.params.id) }, data: ctx.request?.body || {} });
        return { data: row };
      });
    },
    async delete(ctx: any) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const used = await strapi.db.query(JOB_UID).count({ where: { version: id } });
        if (used > 0) { const e: any = new Error(`该版本已被 ${used} 个消息任务引用，无法删除`); e.status = 400; throw e; }
        await strapi.db.query(VERSION_UID).delete({ where: { id } });
        return { data: { id } };
      });
    },
    async activate(ctx: any) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const row = await strapi.db.query(VERSION_UID).findOne({ where: { id } });
        if (!row) { const e: any = new Error("版本不存在"); e.status = 404; throw e; }
        await strapi.db.query(VERSION_UID).updateMany({ where: { template: row.template }, data: { status: "draft" } });
        await strapi.db.query(VERSION_UID).update({ where: { id }, data: { status: "active" } });
        return { data: await strapi.db.query(VERSION_UID).findOne({ where: { id } }) };
      });
    },
    async abStats(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID).findMany({ where: { template: templateId }, orderBy: { id: "ASC" } });
        const out = [];
        for (const r of rows) {
          const click = await strapi.db.query(VISIT_LOG_UID).count({ where: { utmSource: "msg", utmCampaign: r.code } }).catch(() => 0);
          const sent = r.sentCount || 0;
          out.push({ ...r, clickCountLive: click, clickRate: sent ? Math.round((click / sent) * 1000) / 10 : 0, successRate: sent ? Math.round(((r.successCount || 0) / sent) * 1000) / 10 : 0 });
        }
        return { data: out };
      });
    },
  };
};
```

- [ ] **Step 2: controllers/index.ts 注册 `"msg-version"`**

- [ ] **Step 3: routes/admin.ts 追加**（msg-jobs 路由段之后）

```ts
    // 模板版本 / AB 测试
    adminRoute("GET", "/msg-templates/:templateId/versions", "msg-version.list", "sso.msg.read"),
    adminRoute("POST", "/msg-templates/:templateId/versions", "msg-version.create", "sso.msg.write"),
    adminRoute("PUT", "/msg-templates/:templateId/versions/:id", "msg-version.update", "sso.msg.write"),
    adminRoute("DELETE", "/msg-templates/:templateId/versions/:id", "msg-version.delete", "sso.msg.write"),
    adminRoute("POST", "/msg-templates/:templateId/versions/:id/activate", "msg-version.activate", "sso.msg.write"),
    adminRoute("GET", "/msg-templates/:templateId/ab-stats", "msg-version.abStats", "sso.msg.read"),
```

- [ ] **Step 4: 验证**：`npx tsc --noEmit -p server/tsconfig.json`（plugins/zhao-sso 目录）退出码 0

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-sso/server/src/controllers plugins/zhao-sso/server/src/routes/admin.ts
git commit -m "feat(zhao-sso): 模板版本 CRUD/activate/ab-stats 控制器与路由"
```

---

## Task 4: 编译 + 重启 + 冒烟

**Files:** 无（构建产物）

- [ ] **Step 1: 编译**：`cd e:\code\basic\plugins\zhao-sso && npm run build`（成功 exit 0）

- [ ] **Step 2: 重启 Strapi**：StopCommand 停当前 develop → `cd e:\code\basic && npm run develop` 后台启动，等待 `Strapi started successfully`

- [ ] **Step 3: 冒烟**：admin 登录 → `GET /api/zhao-sso/v1/admin/msg-templates` 取一个模板 id → `GET /msg-templates/:id/versions` 返回 200（空列表）

- [ ] **Step 4: Commit（dist）**

```bash
git add plugins/zhao-sso/dist/server
git commit -m "build(zhao-sso): 编译 AB 测试版本功能"
```

---

## Task 5: 后端验收脚本

**Files:**
- Create: `e:\code\basic\scripts\accept-ab-test.cjs`

- [ ] **Step 1: 写脚本**（复用 accept-sop.cjs 的 req/ok 模式）：
1. admin 登录 → 幂等建模板（code `ab_test_<ts>`）+ 建 2 个版本 v1(weight 9)/v2(weight 1)，activate v1 与 v2
2. 连续 20 次 `POST /admin/msg-jobs/anonymous`（templateCode=该模板）→ 统计 job.version 分布（应 v1 明显多于 v2，且每次返回 job 带 version 字段与 link 含 utm_campaign）
3. 校验同 dedupeKey 重试不变：同 body 再发一次 → 返回 skipped 或同一 job（version 相同）
4. 发送成功（mock/真实）后 → `GET /admin/msg-templates/:id/versions` 中 v1.sentCount/successCount 增加
5. 构造 visit-log（utmSource=msg, utmCampaign=v1 的 code）→ `GET /admin/msg-templates/:id/ab-stats` 中 v1.clickCountLive ≥ 1
6. 删除 v2：若已被 job 引用应 400（若 v2 无引用则删除 200）
7. activate 校验：activate v1 后 v2 变 draft
8. 无版本模板兼容：用无版本的模板（如 act_confirm）发送 → job.version 为 null 且发送正常
9. 清理测试模板/版本/job/visit-log

- [ ] **Step 2: 运行直至全 PASS**：`node scripts/accept-ab-test.cjs`

- [ ] **Step 3: Commit**

```bash
git add scripts/accept-ab-test.cjs
git commit -m "test(zhao-sso): accept-ab-test 验收脚本"
```

---

## Task 6: web 管理端版本管理 + AB 对比

**Files:**
- Modify: `e:\code\web\src\api\sso.js`
- Modify: `e:\code\web\src\pages\sso\msg-template\edit.vue`
- Modify: `e:\code\web\src\pages\sso\msg-template\list.vue`

- [ ] **Step 1: sso.js 加 API**

```js
export const ssoMsgTemplateVersionApi = {
  list: (templateId) => get(`${ADMIN}/msg-templates/${templateId}/versions`).then(extractList),
  create: (templateId, data) => post(`${ADMIN}/msg-templates/${templateId}/versions`, data).then(extractItem),
  update: (templateId, id, data) => put(`${ADMIN}/msg-templates/${templateId}/versions/${id}`, data).then(extractItem),
  delete: (templateId, id) => del(`${ADMIN}/msg-templates/${templateId}/versions/${id}`).then(extractItem),
  activate: (templateId, id) => post(`${ADMIN}/msg-templates/${templateId}/versions/${id}/activate`).then(extractItem),
  abStats: (templateId) => get(`${ADMIN}/msg-templates/${templateId}/ab-stats`).then(extractList),
}
```

- [ ] **Step 2: edit.vue 内嵌「版本管理」区**（表单卡片下方新增）：模板保存后（有 documentId）加载 `list(documentId)`；展示版本行（code/name/weight/status 徽标/sent-success/clickCountLive）；操作：新增（弹层或行内表单：code/wxTemplateId/wxTemplateFields 简化 JSON 文本/content/link/weight）、编辑、启用（activate）、删除；「AB 对比」按钮弹层展示 abStats（各版本 sent/successRate/click/clickRate 条形）。

- [ ] **Step 3: list.vue 操作列加「AB 对比」**：点击进入 edit 页并带 `?ab=1` 自动展开版本区，或弹层直查 abStats。

- [ ] **Step 4: 提交**

```bash
git add src/api/sso.js src/pages/sso/msg-template
git commit -m "feat(sso): 模板版本管理 + AB 对比（web 管理端）"
```

---

## Task 7: 推送 + 记忆

- [ ] **Step 1: 推送 basic/web 仓库**

- [ ] **Step 2: 更新项目记忆**（阶段六：AB 测试/模板版本落地，含加权随机分配、utm 归因、计数策略教训）

---

## Self-Review

- **Spec 覆盖**：数据模型(T1)、分配/发送/计数/归因(T2)、接口(T3)、兼容性(T2 回退+T5#8)、前端(T6)、验收(T5) — 全覆盖。
- **占位符**：无 TBD；关键代码已给出。
- **类型一致性**：`pickVersion/appendUtm`、`msg-version.list/create/update/delete/activate/abStats`、`ssoMsgTemplateVersionApi` 命名在 T2/T3/T6 一致；jobData.link 改为 null + utm 回填逻辑 T2 明确。
