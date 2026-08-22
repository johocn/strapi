# 活动资源/讲师排期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让活动预约排期时讲师与场地不冲突——独立讲师/场地资源主档，活动内嵌排期，冲突检测拒绝并提供替代建议，运营端看档期与冲突对照。

**Architecture:** zhao-point 插件新增 `lecturer`、`venue` 两个内容类型与 `resource-schedule` service。冲突检测/替代建议收敛在 `resource-schedule`，由活动 admin 保存入口（activity controller）调用并接入 `adminCreate`/`adminUpdate`；新增 `resource` controller 暴露资源 CRUD 与档期视图。忙闲窗 = 活动 `startTime~endTime` ± 资源 `defaultBufferMin`，并发安全沿用既有 knex 原子写模式。

**Tech Stack:** Strapi v5、PostgreSQL、knex（`strapi.db.connection`）、uni-app H5 运营端（web 仓库）。

---

## 文件结构

- **新内容类型**
  - `plugins/zhao-point/server/src/content-types/lecturer/schema.json`（新建）
  - `plugins/zhao-point/server/src/content-types/venue/schema.json`（新建）
- **修改内容类型**
  - `plugins/zhao-point/server/src/content-types/activity/schema.json`（新增 `lecturer`、`venue` 关联）
  - `plugins/zhao-point/server/src/content-types/index.ts`（注册 lecturer/venue）
- **新服务**
  - `plugins/zhao-point/server/src/services/resource-schedule.ts`（新建：关联激活检查、忙闲窗、检测、替代建议）
- **修改服务注册**
  - `plugins/zhao-point/server/src/services/index.ts`（注册 resource-schedule）
- **新控制器**
  - `plugins/zhao-point/server/src/controllers/resource.ts`（新建：lecturer/venue CRUD + 档期视图 + 冲突预检）
- **修改控制器**
  - `plugins/zhao-point/server/src/controllers/activity.ts`（`adminCreate`/`adminUpdate` 接入排期校验）
  - `plugins/zhao-point/server/src/controllers/index.ts`（注册 resource）
- **路由**
  - `plugins/zhao-point/server/src/routes/content-api.ts`（新增资源 admin 路由）
- **权限**
  - `plugins/zhao-point/server/src/permissions.ts`（新增 lecturer/venue/resource-schedule 权限）
- **验收脚本**
  - `scripts/accept-activity-resource.cjs`（新建）

---

### Task 1: 新增讲师/场地内容类型并注册

**Files:**
- Create: `plugins/zhao-point/server/src/content-types/lecturer/schema.json`
- Create: `plugins/zhao-point/server/src/content-types/venue/schema.json`
- Modify: `plugins/zhao-point/server/src/content-types/index.ts`

- [ ] **Step 1: 写讲师 schema**

```json
{
  "kind": "collectionType",
  "collectionName": "lecturers",
  "info": { "singularName": "lecturer", "pluralName": "lecturers", "displayName": "Lecturer", "description": "讲师资源主档" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "name": { "type": "string", "required": true },
    "desc": { "type": "text" },
    "defaultBufferMin": { "type": "integer", "default": 30 },
    "disabled": { "type": "boolean", "default": false },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "lecturer" }
  }
}
```

- [ ] **Step 2: 写场地 schema**

```json
{
  "kind": "collectionType",
  "collectionName": "venues",
  "info": { "singularName": "venue", "pluralName": "venues", "displayName": "Venue", "description": "场地资源主档" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "name": { "type": "string", "required": true },
    "desc": { "type": "text" },
    "defaultBufferMin": { "type": "integer", "default": 15 },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "disabled": { "type": "boolean", "default": false },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "venue" }
  }
}
```

- [ ] **Step 3: 注册内容类型**

修改 `plugins/zhao-point/server/src/content-types/index.ts`：在 import 区追加
```typescript
import lecturer from "./lecturer/schema.json";
import venue from "./venue/schema.json";
```
并在 export default 对象追加：
```typescript
  lecturer: { schema: lecturer },
  venue: { schema: venue },
```

- [ ] **Step 4: 修改活动 schema 新增关联**

在 `plugins/zhao-point/server/src/content-types/activity/schema.json` 的 `attributes` 末尾追加：
```json
    "lecturer": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.lecturer", "inversedBy": "activities" },
    "venue": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.venue", "inversedBy": "activities" }
```

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-point/server/src/content-types
git commit -m "feat(zhao-point): 新增讲师/场地资源主档内容类型并挂到活动"
```

---

### Task 2: resource-schedule 服务（忙闲窗 + 冲突检测 + 替代建议）

**Files:**
- Create: `plugins/zhao-point/server/src/services/resource-schedule.ts`
- Modify: `plugins/zhao-point/server/src/services/index.ts`

- [ ] **Step 1: 写服务实现**

创建 `plugins/zhao-point/server/src/services/resource-schedule.ts`：

```typescript
import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const LECTURER_UID = "plugin::zhao-point.lecturer";
const VENUE_UID = "plugin::zhao-point.venue";

type ResType = "lecturer" | "venue";
const UID: Record<ResType, string> = { lecturer: LECTURER_UID, venue: VENUE_UID };

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /** 解析资源 defaultBufferMin；不存在返回 null */
  async function bufferOf(type: ResType, id: number): Promise<number | null> {
    const row = await strapi.db.query(UID[type]).findOne({ where: { id } });
    if (!row) return null;
    return Number(row.defaultBufferMin ?? (type === "lecturer" ? 30 : 15));
  }

  /** 活动实际 id（可能是 numeric id 或 documentId） */
  function actIdOf(a: any): number {
    return typeof a === "number" ? a : a?.id;
  }

  /**
   * 检测资源在 [start, end] 时段（含缓冲）是否与其他活动冲突。
   * excludeActivityId 排除自身（改期场景）。
   * 返回冲突活动数组对象（未 populate 完整，仅取 id/title/startTime/endTime）。
   */
  async function detect(
    type: ResType,
    resourceId: number,
    start: Date,
    end: Date,
    excludeActivityId?: number
  ) {
    const buffer = await bufferOf(type, resourceId);
    if (buffer === null) throw Object.assign(new Error("资源不存在"), { status: 400, code: "RESOURCE_NOT_FOUND" });
    const winStart = new Date(start.getTime() - buffer * 60000);
    const winEnd = new Date(end.getTime() + buffer * 60000);
    const where: any = {
      [type]: resourceId,
      startTime: { $notNull: true },
      endTime: { $notNull: true },
      status: { $notIn: ["draft"] },
    };
    if (excludeActivityId) where.id = { $ne: excludeActivityId };
    const rows = await strapi.db.query(ACTIVITY_UID).findMany({
      where,
      select: ["id", "title", "startTime", "endTime"],
    });
    return rows.filter((r: any) => {
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      return rStart < winEnd && rEnd > winStart;
    });
  }

  return {
    LECTURER_UID,
    VENUE_UID,

    /**
     * 校验一组资源是否可用。
     * @param opts { start, end, excludeActivityId?, lecturerId?, venueId? }
     * @returns { ok: true } 或 { ok:false, conflicts: [...] }
     */
    async check(opts: {
      start: Date | string; end: Date | string;
      excludeActivityId?: number;
      lecturerId?: number; venueId?: number;
    }) {
      const start = new Date(opts.start);
      const end = new Date(opts.end);
      const conflicts: any[] = [];
      for (const type of ["lecturer", "venue"] as ResType[]) {
        const rid = opts[`${type}Id`];
        if (!rid) continue;
        const hits = await detect(type, rid, start, end, opts.excludeActivityId);
        for (const h of hits) {
          conflicts.push({
            resourceType: type,
            resourceId: rid,
            resourceName: "resource" /* controller 层回填 */,
            resourceBufferMin: null,
            conflictStart: h.startTime,
            conflictEnd: h.endTime,
            conflictActivityId: actIdOf(h),
            conflictActivityTitle: h.title,
            usedWindow: {
              start: new Date(start.getTime() - (await bufferOf(type, rid)!) * 60000),
              end: new Date(end.getTime() + (await bufferOf(type, rid)!) * 60000),
            },
          });
        }
      }
      return conflicts.length ? { ok: false, conflicts } : { ok: true };
    },

    /**
     * 为冲突资源返回接下来 N 个空闲建议时段（不含缓冲重叠；以目标时长 end-start 为基准）。
     * @returns Array<{ resourceId, resourceName, suggestStart, suggestEnd }>
     */
    async suggest(opts: {
      type: ResType; resourceId: number;
      start: Date | string; end: Date | string;
      n?: number; excludeActivityId?: number;
    }) {
      const n = opts.n ?? 3;
      const start = new Date(opts.start);
      const end = new Date(opts.end);
      const durMs = end.getTime() - start.getTime();
      const buffer = await bufferOf(opts.type, opts.resourceId);
      if (buffer === null) throw Object.assign(new Error("资源不存在"), { status: 400, code: "RESOURCE_NOT_FOUND" });
      const rows = await strapi.db.query(ACTIVITY_UID).findMany({
        where: {
          [opts.type]: opts.resourceId,
          startTime: { $notNull: true },
          endTime: { $notNull: true },
          status: { $notIn: ["draft"] },
          ...(opts.excludeActivityId ? { id: { $ne: opts.excludeActivityId } } : {}),
        },
        select: ["id", "title", "startTime", "endTime"],
        orderBy: { startTime: "asc" },
      });
      const busy = rows.map((r: any) => ({
        start: new Date(r.startTime).getTime() - buffer * 60000,
        end: new Date(r.endTime).getTime() + buffer * 60000,
      }));
      // 从原申请时段向后找空闲缝隙
      const results: any[] = [];
      let cursor = start.getTime();
      for (const b of busy) {
        if (b.end <= cursor) continue;
        const gapStart = Math.max(cursor, b.start);
        const windowStart = gapStart;
        const ok = b.end <= windowStart + durMs ? windowStart + durMs : -1;
        if (b.start >= windowStart + durMs) {
          // 前面已有足够空隙
          results.push({
            resourceId: opts.resourceId,
            suggestStart: new Date(windowStart).toISOString(),
            suggestEnd: new Date(windowStart + durMs).toISOString(),
          });
          cursor = windowStart + durMs;
          if (results.length >= n) break;
        }
        cursor = Math.max(cursor, b.end);
      }
      // 兜底：窗口之后紧排
      while (results.length < n) {
        results.push({
          resourceId: opts.resourceId,
          suggestStart: new Date(cursor).toISOString(),
          suggestEnd: new Date(cursor + durMs).toISOString(),
        });
        cursor += durMs;
      }
      return results;
    },
  };
};
```

> 说明：`check.suggest` 的缝隙逻辑以朴素顺序扫描为主，满足运营端「给出后几个空闲时段」的最小需求；`resourceName` 由 controller 回填（见 Task 3）。

- [ ] **Step 2: 注册服务**

修改 `plugins/zhao-point/server/src/services/index.ts`：import 追加
```typescript
import resourceSchedule from "./resource-schedule";
```
export default 追加
```typescript
  "resource-schedule": resourceSchedule,
```

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-point/server/src/services/resource-schedule.ts plugins/zhao-point/server/src/services/index.ts
git commit -m "feat(zhao-point): resource-schedule 忙闲窗冲突检测与替代建议"
```

---

### Task 3: resource 控制器（资源 CRUD + 档期视图 + 冲突预检）

**Files:**
- Create: `plugins/zhao-point/server/src/controllers/resource.ts`
- Modify: `plugins/zhao-point/server/src/controllers/index.ts`

- [ ] **Step 1: 写控制器**

创建 `plugins/zhao-point/server/src/controllers/resource.ts`：

```typescript
import type { Core } from "@strapi/strapi";

const LECTURER_UID = "plugin::zhao-point.lecturer";
const VENUE_UID = "plugin::zhao-point.venue";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const resService = () => strapi.plugin("zhao-point").service("resource-schedule");
  const labelMap: Record<string, string> = {
    lecturer: "讲师", venue: "场地",
  };

  const uidOf = (type: string) => (type === "lecturer" ? LECTURER_UID : VENUE_UID);

  async function resolveNames(conflicts: any[]) {
    for (const c of conflicts) {
      const row = await strapi.db.query(uidOf(c.resourceType)).findOne({ where: { id: c.resourceId }, select: ["name", "defaultBufferMin"] });
      c.resourceName = row?.name ?? c.resourceName;
      c.resourceNameLabel = labelMap[c.resourceType] ?? c.resourceType;
      c.resourceBufferMin = row ? Number(row.defaultBufferMin) : c.resourceBufferMin;
    }
  }

  async function listType(type: string, ctx: any) {
    try {
      const { page = "1", pageSize = "50", includeDisabled } = ctx.query;
      const where: any = {};
      if (includeDisabled !== "true" && includeDisabled !== "1") where.disabled = false;
      const result = await strapi.db.query(uidOf(type)).findPage({
        where,
        orderBy: { disabled: "asc", name: "asc" },
        page: parseInt(page), pageSize: parseInt(pageSize),
      });
      ctx.body = { rows: result?.results ?? [], pagination: result?.pagination ?? {} };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  }

  function crudHandlers(type: string) {
    return {
      // 统一入口：list/create/findOne/update/delete
      async list(ctx: any) { return listType(type, ctx); },
      async create(ctx: any) {
        try {
          const body = ctx.request.body?.data || ctx.request.body;
          const row = await strapi.documents(uidOf(type)).create({ data: body });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async findOne(ctx: any) {
        try {
          const row = await strapi.documents(uidOf(type)).findOne({ documentId: ctx.params.documentId });
          if (!row) { ctx.status = 404; ctx.body = { error: `${labelMap[type]}不存在` }; return; }
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async update(ctx: any) {
        try {
          const body = ctx.request.body?.data || ctx.request.body;
          const row = await strapi.documents(uidOf(type)).update({ documentId: ctx.params.documentId, data: body });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async del(ctx: any) {
        try {
          // 软删除：仅置 disabled=true，保留历史活动关联
          const row = await strapi.documents(uidOf(type)).update({ documentId: ctx.params.documentId, data: { disabled: true } });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
    };
  }

  return {
    lecturers: {
      list: crudHandlers("lecturer").list,
      create: crudHandlers("lecturer").create,
      findOne: crudHandlers("lecturer").findOne,
      update: crudHandlers("lecturer").update,
      del: crudHandlers("lecturer").del,
    },
    venues: {
      list: crudHandlers("venue").list,
      create: crudHandlers("venue").create,
      findOne: crudHandlers("venue").findOne,
      update: crudHandlers("venue").update,
      del: crudHandlers("venue").del,
    },
    // GET /adm/schedules?type=lecturer|venue&resourceId=&from=&to=
    async schedules(ctx: any) {
      try {
        const { type, resourceId, from, to } = ctx.query;
        if (!type || !resourceId) { ctx.status = 400; ctx.body = { error: "缺少 type/resourceId" }; return; }
        const uid = uidOf(type);
        const where: any = {
          [type]: parseInt(resourceId, 10),
          startTime: { $notNull: true },
          status: { $notIn: ["draft"] },
          ...(from ? { startTime: { $gte: new Date(from).toISOString(), ...(to ? { $lte: new Date(to).toISOString() } : {}) } } : {}),
        };
        if (from && to) where.startTime = { $gte: new Date(from).toISOString(), $lte: new Date(to).toISOString() };
        else if (to) where.startTime = { $lte: new Date(to).toISOString() };
        const rows = await strapi.db.query(ACTIVITY_UID).findMany({
          where,
          orderBy: { startTime: "desc" },
          select: ["id", "title", "startTime", "endTime", "status"],
        });
        const resource = await strapi.db.query(uid).findOne({ where: { id: parseInt(resourceId, 10) }, select: ["id", "name", "defaultBufferMin", "disabled"] });
        ctx.body = { resource, rows };
      } catch (e: any) {
        ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
      }
    },
    // POST /adm/schedules/check  —— 新建/改期前的冲突预检，返回 conflicts + suggestions
    async check(ctx: any) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const svc = resService();
        const result = await svc.check({
          start: body.startTime,
          end: body.endTime,
          excludeActivityId: body.excludeActivityId ? parseInt(body.excludeActivityId, 10) : undefined,
          lecturerId: body.lecturerId ? parseInt(body.lecturerId, 10) : undefined,
          venueId: body.venueId ? parseInt(body.venueId, 10) : undefined,
        });
        if (result.ok) { ctx.body = { ok: true, conflicts: [] }; return; }
        await resolveNames(result.conflicts);
        const suggestions: any[] = [];
        for (const c of result.conflicts) {
          const sugg = await svc.suggest({
            type: c.resourceType,
            resourceId: c.resourceId,
            start: body.startTime,
            end: body.endTime,
            excludeActivityId: body.excludeActivityId ? parseInt(body.excludeActivityId, 10) : undefined,
          });
          suggestions.push({ resourceType: c.resourceType, resourceId: c.resourceId, candidates: sugg });
        }
        ctx.body = { ok: false, conflicts: result.conflicts, suggestions };
      } catch (e: any) {
        ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
      }
    },
  };
};
```

> 注意：schedules/check 引用 `ACTIVITY_UID` 常量，需在该文件顶部补充 `const ACTIVITY_UID = "plugin::zhao-point.activity";`。请在写完时确认已含此常量。

- [ ] **Step 2: 确保 ACTIVITY_UID 定义**

确认 `plugins/zhao-point/server/src/controllers/resource.ts` 顶部含：
```typescript
const ACTIVITY_UID = "plugin::zhao-point.activity";
```

- [ ] **Step 3: 注册控制器**

修改 `plugins/zhao-point/server/src/controllers/index.ts`：import 追加
```typescript
import resource from "./resource";
```
export default 追加
```typescript
  resource,
```

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-point/server/src/controllers/resource.ts plugins/zhao-point/server/src/controllers/index.ts
git commit -m "feat(zhao-point): 资源控制器(讲师/场地 CRUD+档期+冲突预检)"
```

---

### Task 4: 活动 admin 创建/更新接入排期校验

**Files:**
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts`

- [ ] **Step 1: 在 adminCreate 接入校验**

修改 `plugins/zhao-point/server/src/controllers/activity.ts` 的 `adminCreate`（现有 L163-172）为：

```typescript
  // POST /adm/activities
  async adminCreate(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      // 排期冲突校验（仅当给定时间与资源时）
      if (body.startTime && body.endTime && (body.lecturer || body.venue)) {
        const chk = await strapi.plugin("zhao-point").service("resource-schedule").check({
          start: body.startTime, end: body.endTime,
          lecturerId: body.lecturer ? parseInt(body.lecturer, 10) : undefined,
          venueId: body.venue ? parseInt(body.venue, 10) : undefined,
        });
        if (!chk.ok) {
          const c = chk.conflicts[0];
          ctx.status = 400;
          ctx.body = { error: `排期冲突：${c.resourceType === "lecturer" ? "讲师" : "场地"} ${c.resourceId} 与活动「${c.conflictActivityTitle ?? c.conflictActivityId}」时间重叠`, conflicts: chk.conflicts };
          return;
        }
      }
      const activity = await strapi.documents(ACTIVITY_UID).create({ data: body });
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

> 注意：adminCreate 中 `body.lecturer` 可能是已解析的对象或 id。Strapi 关系写入支持传 id 数字；若前端传 `{ connect: [id] }` 结构，则此处应按 Strapi v5 关系写入契约处理。默认可接受传 `{ connect: [N] }` 或裸 number。若前端传对象，需取 `body.lecturer.id ?? body.lecturer.documentId`。计划按「controller 内归一」处理，见 Step 2 说明。

- [ ] **Step 2: 归一化关联 id 并校验**

将 adminCreate / adminUpdate 中的校验与写入统一用本地 helper，先归一 `lecturer`/`venue` 为 id：

```typescript
  // 关系归一：{connect:[N]}|N|{id:N}+documentId → number | undefined
  function relId(v: any): number | undefined {
    if (!v) return undefined;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return relId(v[0]);
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
    if (typeof v === "object") {
      if (Array.isArray(v.connect) && v.connect.length) return relId(v.connect[0]);
      if (v.id != null) return Number(v.id);
      if (v.documentId) return relId(v.documentId);
    }
    return undefined;
  }
```

在 adminCreate 内把校验改为：
```typescript
      const lecturerId = relId(body.lecturer);
      const venueId = relId(body.venue);
      if (body.startTime && body.endTime && (lecturerId || venueId)) {
        const chk = await strapi.plugin("zhao-point").service("resource-schedule").check({
          start: body.startTime, end: body.endTime, lecturerId, venueId,
        });
        if (!chk.ok) {
          const c = chk.conflicts[0];
          ctx.status = 400;
          ctx.body = { error: `排期冲突：与活动「${c.conflictActivityTitle ?? c.conflictActivityId}」时间重叠`, conflicts: chk.conflicts };
          return;
        }
      }
```

- [ ] **Step 3: 修改 adminUpdate 接入校验**

将 `adminUpdate`（现有 L175-187）改为：

```typescript
  // PUT /adm/activities/:documentId
  async adminUpdate(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const existing = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!existing) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const startTime = body.startTime ?? existing.startTime;
      const endTime = body.endTime ?? existing.endTime;
      const lecturerId = relId(body.lecturer) ?? relId(existing.lecturer);
      const venueId = relId(body.venue) ?? relId(existing.venue);
      if (startTime && endTime && (lecturerId || venueId)) {
        const chk = await strapi.plugin("zhao-point").service("resource-schedule").check({
          start: startTime, end: endTime, excludeActivityId: existing.id, lecturerId, venueId,
        });
        if (!chk.ok) {
          const c = chk.conflicts[0];
          ctx.status = 400;
          ctx.body = { error: `排期冲突：与活动「${c.conflictActivityTitle ?? c.conflictActivityId}」时间重叠`, conflicts: chk.conflicts };
          return;
        }
      }
      const activity = await strapi.documents(ACTIVITY_UID).update({
        documentId: ctx.params.documentId, data: body,
      });
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 4: 在文件顶部定义 relId helper**

在 `adminCreate` 方法之前（controller 工厂函数 `return ({` 内部）插入：

```typescript
  // 关系归一：{connect:[N]}|N|{id:N}+documentId → number | undefined
  function relId(v: any): number | undefined {
    if (!v) return undefined;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return relId(v[0]);
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
    if (typeof v === "object") {
      if (Array.isArray(v.connect) && v.connect.length) return relId(v.connect[0]);
      if (v.id != null) return Number(v.id);
      if (v.documentId) return relId(v.documentId);
    }
    return undefined;
  }
```

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-point/server/src/controllers/activity.ts
git commit -m "feat(zhao-point): 活动创建/更新接入讲师场地排期冲突校验"
```

---

### Task 5: 路由与权限注册

**Files:**
- Modify: `plugins/zhao-point/server/src/routes/content-api.ts`
- Modify: `plugins/zhao-point/server/src/permissions.ts`

- [ ] **Step 1: 新增 admin 路由**

修改 `plugins/zhao-point/server/src/routes/content-api.ts`，在活动系列段前追加资源路由：

```typescript
    // ===== 讲师/场地资源排期 =====
    channelScopeRoute("GET", "/adm/lecturers", "resource.lecturers.list", "resource.read"),
    channelScopeRoute("GET", "/adm/lecturers/:documentId", "resource.lecturers.findOne", "resource.read"),
    channelScopeRoute("POST", "/adm/lecturers", "resource.lecturers.create", "resource.write"),
    channelScopeRoute("PUT", "/adm/lecturers/:documentId", "resource.lecturers.update", "resource.write"),
    channelScopeRoute("DELETE", "/adm/lecturers/:documentId", "resource.lecturers.del", "resource.write"),
    channelScopeRoute("GET", "/adm/venues", "resource.venues.list", "resource.read"),
    channelScopeRoute("GET", "/adm/venues/:documentId", "resource.venues.findOne", "resource.read"),
    channelScopeRoute("POST", "/adm/venues", "resource.venues.create", "resource.write"),
    channelScopeRoute("PUT", "/adm/venues/:documentId", "resource.venues.update", "resource.write"),
    channelScopeRoute("DELETE", "/adm/venues/:documentId", "resource.venues.del", "resource.write"),
    channelScopeRoute("GET", "/adm/schedules", "resource.schedules", "resource.read"),
    channelScopeRoute("POST", "/adm/schedules/check", "resource.check", "resource.read"),
```

- [ ] **Step 2: 新增权限**

修改 `plugins/zhao-point/server/src/permissions.ts` 的 `PERMISSIONS` 追加：

```typescript
  "resource.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "resource.write": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
```

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/server/src/permissions.ts
git commit -m "feat(zhao-point): 资源 admin 路由与权限"
```

---

### Task 6: 构建插件 dist

**Files:**
- Modify: 无（构建产物）

- [ ] **Step 1: 构建 zhao-point 插件**

```bash
cd plugins/zhao-point && npm run build
```

预期：构建成功（若出现既有 zhao-course 类型 dts 冲突类警告、不影响产物，可忽略）。执行后插件加载 `plugins/zhao-point/dist` 更新产物。

- [ ] **Step 2: 提交 dist 产物**

```bash
cd e:\code\basic && git add plugins/zhao-point/dist
git commit -m "chore(zhao-point): 重建 dist 产物(资源排期)"
```

---

### Task 7: 端到端验收脚本

**Files:**
- Create: `scripts/accept-activity-resource.cjs`

- [ ] **Step 1: 写验收脚本**

参考既有 `scripts/accept-activity-notify.cjs` 的 helper 模式（`q`、`api`、`check`、`purge`、admin 登录、dev/_health 等待），创建 `scripts/accept-activity-resource.cjs`，覆盖以下断言（用 `PF` 前缀隔离数据、`purge` 清讲师/场地/活动）：

关键流程与断言（脚本内落实）：
1. admin 登录拿 token；注册平台用户 uA（仅用于归属，实际冲突检测基于活动记录，不依赖用户）。
2. 创建讲师甲（buffer 30）、场地乙（buffer 15）——用 `POST /api/zhao-point/v1/admin/adm/lecturers|venues`。
3. 活动 A：`POST /admin/adm/activities`，body 含 `{ title:'验收-资源A', startTime, endTime, lecturer: [甲id], venue: [乙id], capacity:10, status:'signup_open' }`，endTime=start+2h。断言成功、返回含有 lecturer/venue。
4. 用 `POST /admin/adm/schedules/check` 提交一个与 A 冲突的新活动 B（同甲，跨 A 时间窗），断言 `ok===false`、`conflicts[0].resourceType==='lecturer'`、`conflictActivityId` 对应 A、`suggestions` 非空。
5. 用 `POST /admin/adm/activities` 直接创建与 A 冲突的 B 发到 adminCreate，断言返回 400 且 body.error 含「排期冲突」。
6. 创建不冲突的 B（时段避开 A 的 ±buffer），断言成功。
7. `PUT /admin/adm/activities/:B/documentId` 把 B 改期到与 A 冲突时段，断言 400；改到空闲时段，断言成功。
8. 场地维度：`check` 提交一个与 A 同场地乙、时段冲突的请求，断言 `conflicts[0].resourceType==='venue'`。
9. 档期：`GET /admin/adm/schedules?type=lecturer&resourceId=甲id` 断言 rows 含 A。
10. 停用讲师甲：`DELETE /admin/adm/lecturers/甲`（软删 disabled=true）；再 `GET .../lecturers?includeDisabled=true` 断言甲 `disabled===true`；`GET .../lecturers`（默认）断言不含甲；档期仍含 A。
11. 清理：`purge(PF, [])` 删除本脚本创建的讲师/场地/活动（按前缀 PRF_ 活动标题删除，删除关联 activities 前先删 activity-signup/attendance 引用，并删除讲师/场地本身），断言残留为 0。

> 提示：活动删除需先清清关联报名。若既有 purge 已含活动清理，可复用；否则脚本内自行 `DELETE FROM activity_signups WHERE activity_id IN (...)`、`activity_attendances WHERE activity_id IN (...)` 后删 `activities`，再删 `lecturers`/`venues`。具体列名以 dev 库 information_schema 为准（`activities` 主表 + 关联 lnk）。

- [ ] **Step 2: 启动 dev 并跑脚本**

```bash
cd e:\code\basic && npm run develop   # 后台启动（或在另终端）
node scripts/accept-activity-resource.cjs
```

预期：全部断言 PASS，结束时 `检查残留` 全 0。若为 0，`rm` 临时查询产物（本例无）。

- [ ] **Step 3: 提交**

```bash
git add scripts/accept-activity-resource.cjs
git commit -m "test(zhao-point): 活动资源排期端到端验收脚本"
```

---

### Task 8: 运营端（web 仓库）：资源管理 + 冲突对照 UI

**Files:**
- 新页面：`e:\code\web\src\pages\activity\resource\`（讲师管理、场地管理、冲突对照组件）——以 `web` 仓库现有活动管理页模式为准
- Modify: `e:\code\web\src\pages\activity\`（活动编辑表单接入讲师/场地选择 + 冲突提示）
- Modify: 路由/菜单注册

> 说明：web 是 HBuilder 构建物部署仓库。前后端联调以后端返回字段契约为准（见 spec §5）。前后端字段名需对齐：
> - 资源对象 `{ documentId, name, desc, defaultBufferMin, disabled, lat?, lng? }`
> - check 返回 `{ ok, conflicts:[{resourceType, resourceId, resourceName, conflictActivityTitle, conflictStart, conflictEnd}], suggestions:[{resourceType, resourceId, candidates:[{suggestStart, suggestEnd}]}] }`
> - 档期 `{ resource:{...}, rows:[{id,title,startTime,endTime,status}] }`
> 复选建议恢复字段口径：冲突对照组件展示 conflicts 的「讲师/场地 · 时段 · 冲突活动」+ 建议下拉。

- [ ] **Step 1: 讲师管理页**（列表+新建+编辑+停用，停用置灰）
- [ ] **Step 2: 场地管理页**（列表+新建+编辑+停用，含 lat/lng）
- [ ] **Step 3: 活动编辑表单**接入讲师/场地多选（停用资源回显、新卷入置灰）+ 冲突预检（保存前调 `/admin/adm/schedules/check`，冲突展示对照列表与替代建议）
- [ ] **Step 4: 构建 H5 产物并提交**

```bash
cd e:\code\web
# 前端源码编辑后依 web 仓库既有构建流程 build:h5 生成 dist，随源码一并提交
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 活动讲师/场地资源管理与冲突对照(运营端)"
```

---

## Self-Review

- **Spec 覆盖**：内容类型（T1）✓；忙闲窗+检测+建议服务（T2）✓；冲突拒绝+替代建议（T3 check/suggest、T4 adminCreate/adminUpdate 400）✓；档期视图（T3 schedules）✓；讲师/场地软删除停用、历史保留（T3 crud del、T1 disabled 字段）✓；运营端（T8）✓；验收（T7）✓。
- **占位符扫描**：无 TBD/TODO；T2 的 suggest 缝隙算法给出明确实现；T3/T4 代码完整给出。
- **类型/签名一致性**：`resource-schedule.check` 返回 `{ok,conflicts}`，T3 与 T4 一致消费 `conflicts[0].resourceType/resourceId/conflictActivityTitle`；suggest 返回 candidates 数组，T3 check 控制器包装为 suggestions。`relId` helper 名称在 T4 Step1/2/4 中一致。讲师/场地 UID 常量名在 T2/T3 一致（`LECTURER_UID`/`VENUE_UID`）。
- **跨仓库字段契约**：T8 明确列出 check/档期返回字段名，供前端照用，避免双方各定义一套。

潜在注意点（已在任务内标注）：adminCreate body.lecturer 关系写入格式（normalize via relId）；`ACTIVITY_UID` 常量在 controller 需显式定义。均在任务中处理。