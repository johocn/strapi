# D 阶段：知识图谱可追溯与合规 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为知识实体/关系/第一真值补齐版本号、字段级变更流水与 submit/approve/reject 审核链，使「某条事实在 X 时点由 Y 核准、来源为 Z」可查证。

**Architecture:** 新增 append-only 流水表 `knowledge-audit-log` 承载字段级 diff；三张主表加 `version` 与 `rejected` 态；所有写操作在 service 层埋点并透传 `ctx.state.user`；审核动作走独立 util `applyReview`（先改状态、再写流水，审核动作 strict）；公开出口只加 `version` + `dateModified`，不露操作人与理由。

**Tech Stack:** Strapi 5.47 插件（`plugins/zhao-website`）、TypeScript、Jest、React + antd（插件 admin）、Next.js（strapi-site）。

**权威依据:** [2026-09-29-knowledge-traceability-compliance-design.md](file:///e:/code/basic/docs/superpowers/specs/2026-09-29-knowledge-traceability-compliance-design.md)

**执行约束（用户规则）:**
- 中文注释；只给可运行代码 + 关键说明。
- 只 add 本任务涉及的具体文件，**绝不** `git add -A`（工作区有 zhao-auth/zhao-oss 的无关未提交改动）。
- 插件内 `npm run build` 会同时产出 `dist/server/*` 与 `dist/admin/*`，**必须一起提交**（admin UI 改动需重新 build 才生效）。
- 不跑 `npm run test:ts:back`（`knowledge-graph.ts:594` 有既存 TS2345，非本次引入）。
- 服务器禁止构建，`dist` 本地构建后提交。

---

## 文件结构（改动地图）

| 文件 | 责任 |
|---|---|
| `plugins/zhao-website/server/src/content-types/knowledge-audit-log/schema.json` | 新增流水表 CT（append-only） |
| `plugins/zhao-website/server/src/content-types/index.ts` | 注册流水表 |
| `plugins/zhao-website/server/src/content-types/{knowledge-entity,knowledge-relation,first-truth-policy}/schema.json` | 各加 `version` + `rejected` 枚举 |
| `plugins/zhao-website/server/src/services/utils/stable-json.ts` | `stableJson` + `diffFields`（从 knowledge-graph 抽出） |
| `plugins/zhao-website/server/src/services/knowledge-audit.ts` | 流水服务：`append` / `findByTarget` + `auditSafe` |
| `plugins/zhao-website/server/src/services/utils/review-actions.ts` | `applyReview`：三表共用的审核动作 |
| `plugins/zhao-website/server/src/services/knowledge-graph.ts` | 埋点、actor 透传、审核动作、公开出口 version/dateModified、rejected 过滤 |
| `plugins/zhao-website/server/src/services/first-truth.ts` | 埋点、actor 透传、审核动作 |
| `plugins/zhao-website/server/src/controllers/admin-api/{knowledge-graph,first-truth}.ts` | 取 `ctx.state.user`、新增动作 handler |
| `plugins/zhao-website/server/src/routes/admin-api.ts` | 新增 9 条动作路由 + 1 条流水查询路由 |
| `plugins/zhao-website/admin/src/utils/api.ts` | 前端 API 常量 |
| `plugins/zhao-website/admin/src/pages/{KnowledgeGraphPage,FirstTruthPage}.tsx` | 「历史」弹窗 + 审核按钮 |
| `plugins/zhao-website/tests/**` | 单测 |
| `e:\code\strapi-site\lib\knowledge-entity.ts` | 类型加 `version` / `dateModified` |
| `e:\code\strapi-site\components\views\KnowledgeEntityView.tsx` | JSON-LD 输出 `version` / `dateModified` |

---

## Task 1: 数据模型与 stable-json 抽取

**Files:**
- Create: `plugins/zhao-website/server/src/content-types/knowledge-audit-log/schema.json`
- Create: `plugins/zhao-website/server/src/services/utils/stable-json.ts`
- Modify: `plugins/zhao-website/server/src/content-types/index.ts`
- Modify: `plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/knowledge-relation/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`
- Modify: `plugins/zhao-website/server/src/services/knowledge-graph.ts`（删除本地 `stableJson`，改为 import）
- Modify: `plugins/zhao-website/tests/content-types.test.ts`
- Test: `plugins/zhao-website/tests/services/stable-json.test.ts`

- [ ] **Step 1: 写失败测试 `tests/services/stable-json.test.ts`**

```ts
import { stableJson, diffFields } from "../../server/src/services/utils/stable-json";

describe("stable-json", () => {
  test("键序不同 → 序列化结果一致", () => {
    expect(stableJson({ a: 1, b: 2 })).toBe(stableJson({ b: 2, a: 1 }));
  });

  test("嵌套数组/对象稳定序列化", () => {
    expect(stableJson({ x: [{ p: 1, q: 2 }] })).toBe('{"x":[{"p":1,"q":2}]}');
  });

  test("diffFields 只返回真正变化的字段", () => {
    const diff = diffFields({ name: "A", status: true }, { name: "B", status: true });
    expect(diff).toEqual({ name: { before: "A", after: "B" } });
  });

  test("diffFields 键序不同不产生 diff", () => {
    expect(diffFields({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual({});
  });

  test("diffFields 忽略主键与时间戳噪音字段", () => {
    expect(diffFields({ id: 1, updatedAt: "t1" }, { id: 2, updatedAt: "t2" })).toEqual({});
  });

  test("diffFields before 为空对象 → 全量记录为 after", () => {
    expect(diffFields({}, { name: "A" })).toEqual({ name: { before: null, after: "A" } });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- stable-json`（cwd: `plugins/zhao-website`）
Expected: FAIL，`Cannot find module '../../server/src/services/utils/stable-json'`

- [ ] **Step 3: 建 `server/src/services/utils/stable-json.ts`**

```ts
/** JSON 稳定序列化：对象键排序，保证键序不同不误判为差异 */
export function stableJson(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
    .join(",")}}`;
}

/** diff 忽略的字段：主键/时间戳/派生字段，无审计价值 */
const IGNORED_DIFF_KEYS = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "lastVerifiedAt",
  "version",
]);

/** 字段级 diff：只返回真正发生变化的字段 { 字段: { before, after } } */
export function diffFields(before: any, after: any): Record<string, { before: any; after: any }> {
  const a = before && typeof before === "object" ? before : {};
  const b = after && typeof after === "object" ? after : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, { before: any; after: any }> = {};
  for (const k of keys) {
    if (IGNORED_DIFF_KEYS.has(k)) continue;
    const av = a[k] ?? null;
    const bv = b[k] ?? null;
    if (stableJson(av) === stableJson(bv)) continue;
    out[k] = { before: av, after: bv };
  }
  return out;
}
```

- [ ] **Step 4: 新建流水表 schema**

Create `plugins/zhao-website/server/src/content-types/knowledge-audit-log/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_knowledge_audit_logs",
  "info": {
    "singularName": "knowledge-audit-log",
    "pluralName": "knowledge-audit-logs",
    "displayName": "知识审计流水"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": false
    },
    "targetType": {
      "type": "enumeration",
      "enum": ["entity", "relation", "first-truth"],
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "action": {
      "type": "enumeration",
      "enum": ["create", "update", "delete", "submit", "approve", "reject", "recheck"],
      "required": true
    },
    "actorId": {
      "type": "string"
    },
    "actorLabel": {
      "type": "string"
    },
    "changedFields": {
      "type": "json"
    },
    "reason": {
      "type": "text"
    },
    "version": {
      "type": "integer"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

> `site` 刻意**单向无 inversedBy**，避免改动 zhao-common 的 site-config schema。

- [ ] **Step 5: 注册 CT**

Modify `plugins/zhao-website/server/src/content-types/index.ts`：加 import 与条目。

```ts
import knowledgeAuditLog from "./knowledge-audit-log/schema.json";
```

```ts
  "knowledge-audit-log": { schema: knowledgeAuditLog },
```

（放在 `"knowledge-relation"` 之后即可。）

- [ ] **Step 6: 三张主表加 `version` 与 `rejected` 枚举**

三份 schema 均把 `verificationStatus.enum` 改为：

```json
["verified", "pending", "outdated", "conflict", "rejected"]
```

并在各自 `verificationStatus` 之后插入：

```json
"version": {
  "type": "integer",
  "default": 1
},
```

（`knowledge-entity`、`knowledge-relation`、`first-truth-policy` 三份都改。）

- [ ] **Step 7: knowledge-graph.ts 改用抽出的 stableJson**

Modify `plugins/zhao-website/server/src/services/knowledge-graph.ts`：删除第 18-26 行的本地 `stableJson` 函数，在文件顶部 import 区加：

```ts
import { stableJson } from "./utils/stable-json";
```

（`valuesMatch` 中的 `stableJson` 调用保持不变。注意：`diffFields` 在本 Task 暂不使用，Task 3 才引用。）

- [ ] **Step 8: 更新 CT 数量断言**

Modify `plugins/zhao-website/tests/content-types.test.ts`：

```ts
  test('zhao-website has 24 content types', () => {
    expect(entries.length).toBe(24);
  });
```

- [ ] **Step 9: 跑测试确认通过**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全部 PASS（含新 stable-json 6 条 + CT 24）。总数应 ≥126。

- [ ] **Step 10: Commit**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/content-types/knowledge-audit-log/schema.json plugins/zhao-website/server/src/content-types/index.ts plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json plugins/zhao-website/server/src/content-types/knowledge-relation/schema.json plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json plugins/zhao-website/server/src/services/utils/stable-json.ts plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/content-types.test.ts plugins/zhao-website/tests/services/stable-json.test.ts
git -C e:/code/basic commit -m "feat(zhao-website): 知识流水表 CT + version/rejected 枚举 + stable-json 抽取"
```

---

## Task 2: knowledge-audit service

**Files:**
- Create: `plugins/zhao-website/server/src/services/knowledge-audit.ts`
- Modify: `plugins/zhao-website/server/src/services/index.ts`
- Modify: `plugins/zhao-website/tests/helpers/mock-strapi.ts`
- Test: `plugins/zhao-website/tests/services/knowledge-audit.test.ts`

- [ ] **Step 1: 先让 mock 支持 knowledge-audit 服务**

Modify `plugins/zhao-website/tests/helpers/mock-strapi.ts`：在 `createMockStrapi` 与 `createMockStrapiWithQuery` 中，两处 `plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({}) })` 替换为：

```ts
    plugin: jest.fn().mockReturnValue({
      service: jest.fn((name: string) =>
        name === "knowledge-audit"
          ? {
              append: jest.fn().mockResolvedValue(null),
              findByTarget: jest
                .fn()
                .mockResolvedValue({ results: [], pagination: { page: 1, pageSize: 20, total: 0 } }),
            }
          : {}
      ),
    }),
```

- [ ] **Step 2: 写失败测试 `tests/services/knowledge-audit.test.ts`**

```ts
import auditServiceFactory, { auditSafe } from "../../server/src/services/knowledge-audit";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Audit Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = auditServiceFactory({ strapi: mockStrapi });
  });

  test("append 写入流水：actor 快照进 actorId/actorLabel", async () => {
    const queryMock = mockStrapi.db.query();

    await service.append({
      siteId: 1,
      targetType: "entity",
      targetId: "doc-1",
      action: "update",
      actor: { id: 7, label: "alice" },
      changedFields: { name: { before: "A", after: "B" } },
      version: 2,
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          site: 1,
          targetType: "entity",
          targetId: "doc-1",
          action: "update",
          actorId: "7",
          actorLabel: "alice",
          version: 2,
        }),
      })
    );
  });

  test("append 系统动作：无 actor → actorId/actorLabel 为 null，可用 actorLabel 覆盖", async () => {
    const queryMock = mockStrapi.db.query();

    await service.append({
      siteId: 1, targetType: "relation", targetId: "rel-1", action: "recheck", actorLabel: "system",
    });

    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actorId: null, actorLabel: "system" }) })
    );
  });

  test("append strict=false 写失败不阻塞，返回 null 并 warn", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockRejectedValueOnce(new Error("db down"));

    const res = await service.append({ siteId: 1, targetType: "entity", targetId: "d", action: "create" });

    expect(res).toBeNull();
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });

  test("append strict=true 写失败抛 500 AUDIT_WRITE_FAILED", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockRejectedValueOnce(new Error("db down"));

    await expect(
      service.append({ siteId: 1, targetType: "entity", targetId: "d", action: "approve", strict: true })
    ).rejects.toMatchObject({ status: 500, code: "AUDIT_WRITE_FAILED" });
  });

  test("findByTarget 租户+全局命中，倒序分页", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([{ id: 1 }]);
    queryMock.count.mockResolvedValueOnce(1);

    const res = await service.findByTarget(1, "entity", "doc-1", { page: 2, pageSize: 5 });

    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          targetType: "entity",
          targetId: "doc-1",
          deletedAt: null,
          $or: [{ site: 1 }, { site: null }],
        }),
        orderBy: { createdAt: "DESC" },
        limit: 5,
        offset: 5,
      })
    );
    expect(res.pagination).toEqual({ page: 2, pageSize: 5, total: 1 });
  });

  test("auditSafe 吞掉异常只 warn", async () => {
    const svc = { append: jest.fn().mockRejectedValue(new Error("boom")) };
    mockStrapi.plugin = jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue(svc) });

    await expect(
      auditSafe(mockStrapi, { siteId: 1, targetType: "entity", targetId: "d", action: "update" })
    ).resolves.toBeUndefined();
    expect(mockStrapi.log.warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- knowledge-audit`（cwd: `plugins/zhao-website`）
Expected: FAIL，`Cannot find module '../../server/src/services/knowledge-audit'`

- [ ] **Step 4: 建 `server/src/services/knowledge-audit.ts`**

```ts
import type { Core } from "@strapi/strapi";

const AUDIT_UID = "plugin::zhao-website.knowledge-audit-log";

/** 审计写入参数：strict=true 时写失败直接抛错（审核动作用），否则只 warn */
type AuditParams = {
  siteId?: number | null;
  targetType: "entity" | "relation" | "first-truth";
  targetId: string;
  action: "create" | "update" | "delete" | "submit" | "approve" | "reject" | "recheck";
  actor?: { id?: number | string; label?: string } | null;
  actorLabel?: string | null;
  changedFields?: any;
  reason?: string | null;
  version?: number | null;
  strict?: boolean;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 追加一条流水；append-only，不提供任何修改/删除 */
  async append(params: AuditParams) {
    const { actor } = params;
    const data = {
      site: params.siteId ?? null,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      actorId: actor?.id != null ? String(actor.id) : null,
      // actorLabel 是快照：用户改名/删除后历史仍可举证
      actorLabel: params.actorLabel ?? actor?.label ?? null,
      changedFields: params.changedFields ?? null,
      reason: params.reason ?? null,
      version: params.version ?? null,
    };
    try {
      return await strapi.db.query(AUDIT_UID).create({ data });
    } catch (err: any) {
      const msg = `[kg-audit] 写入流水失败: ${err?.message}`;
      if (params.strict) {
        const e: any = new Error(msg);
        e.status = 500;
        e.code = "AUDIT_WRITE_FAILED";
        throw e;
      }
      strapi.log.warn(msg);
      return null;
    }
  },

  /** 按被操作对象查流水：租户流水 + 全局流水，按时间倒序 */
  async findByTarget(
    siteId: number | null,
    targetType: string,
    targetId: string,
    { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}
  ) {
    const where: any = {
      targetType,
      targetId,
      deletedAt: null,
      $or: [{ site: siteId }, { site: null }],
    };
    const [results, total] = await Promise.all([
      strapi.db.query(AUDIT_UID).findMany({
        where,
        orderBy: { createdAt: "DESC" },
        limit: Number(pageSize),
        offset: (Number(page) - 1) * Number(pageSize),
      }),
      strapi.db.query(AUDIT_UID).count({ where }),
    ]);
    return { results, pagination: { page: Number(page), pageSize: Number(pageSize), total } };
  },
});

/** 非审核路径的审计写入：失败只 warn，绝不阻塞业务 */
export async function auditSafe(strapi: Core.Strapi, params: AuditParams): Promise<void> {
  try {
    const svc: any = strapi.plugin("zhao-website").service("knowledge-audit");
    await svc.append({ ...params, strict: false });
  } catch (err: any) {
    strapi.log.warn(`[kg-audit] 写入流水失败: ${err?.message}`);
  }
}
```

- [ ] **Step 5: 注册 service**

Modify `plugins/zhao-website/server/src/services/index.ts`：加 import 与条目。

```ts
import knowledgeAudit from "./knowledge-audit";
```

```ts
  "knowledge-audit": knowledgeAudit,
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿（新增 6 条）。

- [ ] **Step 7: Commit**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/services/knowledge-audit.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/tests/helpers/mock-strapi.ts plugins/zhao-website/tests/services/knowledge-audit.test.ts
git -C e:/code/basic commit -m "feat(zhao-website): knowledge-audit 流水服务（append/findByTarget/auditSafe）"
```

---

## Task 3: 写入面埋点与操作人透传

**Files:**
- Modify: `plugins/zhao-website/server/src/services/knowledge-graph.ts`
- Modify: `plugins/zhao-website/server/src/services/first-truth.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`
- Test: `plugins/zhao-website/tests/services/knowledge-graph.test.ts`

- [ ] **Step 1: 写失败测试（追加到 `tests/services/knowledge-graph.test.ts` 末尾的 describe 内）**

```ts
  test("createEntity 写 create 流水并带操作人", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "A", version: 1 });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.createEntity(1, { name: "A", entityType: "Organization" }, { id: 7, label: "alice" });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "entity", targetId: "doc-1", action: "create", strict: false,
        actor: { id: 7, label: "alice" },
      })
    );
  });

  test("updateEntity version 递增且 diff 只含变更字段", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", name: "A", version: 2 });
    queryMock.update.mockResolvedValueOnce({ id: 3, version: 3 });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.updateEntity(1, "doc-3", { name: "B" }, { id: 7, label: "alice" });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ name: "B", version: 3 }) })
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update", version: 3,
        changedFields: { name: { before: "A", after: "B" } },
      })
    );
  });

  test("deleteEntity 写 delete 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3" });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.deleteEntity(1, "doc-3", { id: 7, label: "alice" });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "entity", targetId: "doc-3", action: "delete" })
    );
  });

  test("compareRelationWithTruth 状态变化才写 recheck 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5, claimKey: "k", canonicalValue: "200", canonicalValueType: "text",
    });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.compareRelationWithTruth({
      id: 9, documentId: "rel-9", site: 1, truthPolicy: 5, objectText: "180", verificationStatus: "verified",
    });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "relation", targetId: "rel-9", action: "recheck", actorLabel: "system" })
    );
    expect(audit.append.mock.calls[0][0].actor).toBeNull();
  });

  test("compareRelationWithTruth 状态未变 → 不写流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({
      id: 5, claimKey: "k", canonicalValue: "200", canonicalValueType: "text",
    });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await service.compareRelationWithTruth({
      id: 9, documentId: "rel-9", site: 1, truthPolicy: 5, objectText: "200", verificationStatus: "verified",
    });

    expect(audit.append).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- knowledge-graph`（cwd: `plugins/zhao-website`）
Expected: FAIL（update 未带 version / audit 未被调用；「状态变化才写」用例因 `verificationStatus` 未变仍会通过，属预期）。

- [ ] **Step 3: knowledge-graph.ts 埋点**

Modify `plugins/zhao-website/server/src/services/knowledge-graph.ts`：

(a) 顶部 import 追加 `diffFields` 与 `auditSafe`：

```ts
import { stableJson, diffFields } from "./utils/stable-json";
import { auditSafe } from "./knowledge-audit";
```

(b) `createEntity`：

```ts
  async createEntity(siteId: number | null, data: any, actor?: any) {
    const created: any = await strapi.db.query(ENTITY_UID).create({
      data: { ...data, site: siteId },
    });
    await auditSafe(strapi, {
      siteId,
      targetType: "entity",
      targetId: created.documentId,
      action: "create",
      actor,
      changedFields: diffFields({}, created),
      version: created.version ?? 1,
    });
    return created;
  },
```

(c) `updateEntity`：

```ts
  async updateEntity(siteId: number | null, documentId: string, data: any, actor?: any) {
    const existing: any = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Entity not found");
      e.status = 404;
      throw e;
    }
    const version = (Number(existing.version) || 1) + 1;
    const payload = { ...data, version };
    const updated = await strapi.db.query(ENTITY_UID).update({ where: { id: existing.id }, data: payload });
    await auditSafe(strapi, {
      siteId,
      targetType: "entity",
      targetId: documentId,
      action: "update",
      actor,
      changedFields: diffFields(existing, { ...existing, ...payload }),
      version,
    });
    return updated;
  },
```

(d) `deleteEntity`：

```ts
  async deleteEntity(siteId: number | null, documentId: string, actor?: any) {
    const existing: any = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    const deletedAt = new Date().toISOString();
    const updated = await strapi.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data: { deletedAt },
    });
    await auditSafe(strapi, {
      siteId,
      targetType: "entity",
      targetId: documentId,
      action: "delete",
      actor,
      changedFields: diffFields(existing, { ...existing, deletedAt }),
    });
    return updated;
  },
```

(e) `addRelation`：在 params 类型中加 `actor?: any`；函数体在 `const created = ...` 之后、`await this._safeCompareWithTruth(...)` 之前插入埋点（幂等命中分支不写流水）：

```ts
    await auditSafe(strapi, {
      siteId: params.siteId,
      targetType: "relation",
      targetId: created.documentId,
      action: "create",
      actor: params.actor,
      changedFields: diffFields({}, created),
      version: created.version ?? 1,
    });
```

(f) `updateRelation(siteId, documentId, data, actor?)`：在 `const payload: any = {}` 定义处之后保留原逻辑，改为在 `update` 前计算 `version` 并写入 payload、update 后埋点：

在 `const updated: any = await strapi.db.query(RELATION_UID).update(...)` 之前插入：

```ts
    const relVersion = (Number(existing.version) || 1) + 1;
    payload.version = relVersion;
```

在 `const updated` 之后（`valueTouched` 逻辑之前）插入：

```ts
    await auditSafe(strapi, {
      siteId,
      targetType: "relation",
      targetId: documentId,
      action: "update",
      actor,
      changedFields: diffFields(existing, { ...existing, ...payload }),
      version: relVersion,
    });
```

并在函数签名补 `actor?: any`。

(g) `deleteRelation(siteId, documentId, actor?)`：

```ts
  async deleteRelation(siteId: number, documentId: string, actor?: any) {
    const existing: any = await strapi.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    const deletedAt = new Date().toISOString();
    const updated = await strapi.db.query(RELATION_UID).update({
      where: { id: existing.id },
      data: { deletedAt },
    });
    await auditSafe(strapi, {
      siteId,
      targetType: "relation",
      targetId: documentId,
      action: "delete",
      actor,
      changedFields: diffFields(existing, { ...existing, deletedAt }),
    });
    return updated;
  },
```

(h) `compareRelationWithTruth`：把原有 update 改为「仅在状态变化时写 recheck 流水」：

```ts
    const status = matched ? "verified" : "conflict";
    const statusChanged = relation.verificationStatus !== status;
    await strapi.db.query(RELATION_UID).update({
      where: { id: relation.id },
      data: { verificationStatus: status, lastVerifiedAt: new Date().toISOString() },
    });
    if (statusChanged) {
      await auditSafe(strapi, {
        siteId: relation.site ?? null,
        targetType: "relation",
        targetId: relation.documentId,
        action: "recheck",
        actor: null,
        actorLabel: "system",
        changedFields: {
          verificationStatus: { before: relation.verificationStatus ?? null, after: status },
        },
      });
    }
```

- [ ] **Step 4: first-truth.ts 埋点**

Modify `plugins/zhao-website/server/src/services/first-truth.ts`：顶部 import：

```ts
import { diffFields } from "./utils/stable-json";
import { auditSafe } from "./knowledge-audit";
```

(a) `create(siteId, data, actor?)`：

```ts
  async create(siteId: number | null, data: any, actor?: any) {
    const existing = await this.findByClaimKey(siteId, data.claimKey);
    if (existing) {
      const e: any = new Error(`claimKey "${data.claimKey}" 已存在`);
      e.status = 409;
      e.code = "CLAIM_KEY_EXISTS";
      throw e;
    }
    const created: any = await strapi.db.query(UID).create({
      data: {
        ...data,
        site: siteId,
        lastVerifiedAt: new Date().toISOString(),
        verificationStatus: data.verificationStatus || "verified",
      },
    });
    await auditSafe(strapi, {
      siteId,
      targetType: "first-truth",
      targetId: created.documentId,
      action: "create",
      actor,
      changedFields: diffFields({}, created),
      version: created.version ?? 1,
    });
    return created;
  },
```

(b) `update(siteId, documentId, data, actor?)`：加 version 递增 + 埋点：

```ts
    const version = (Number(existing.version) || 1) + 1;
    const payload = {
      ...data,
      version,
      lastVerifiedAt: new Date().toISOString(),
      verificationStatus: data.verificationStatus || "verified",
    };
    const updated = await strapi.db.query(UID).update({ where: { id: existing.id }, data: payload });
    await auditSafe(strapi, {
      siteId,
      targetType: "first-truth",
      targetId: documentId,
      action: "update",
      actor,
      changedFields: diffFields(existing, { ...existing, ...payload }),
      version,
    });
```

(c) `_markRelatedEntitiesPending`：状态实际变化时才写 recheck（替换原 `if (entity)` 块）：

```ts
    if (entity && entity.verificationStatus !== "pending") {
      const before = entity.verificationStatus ?? null;
      await strapi.db.query(ENTITY_UID).update({
        where: { id: entity.id },
        data: { verificationStatus: "pending", version: (Number(entity.version) || 1) + 1 },
      });
      await auditSafe(strapi, {
        siteId,
        targetType: "entity",
        targetId: entity.documentId,
        action: "recheck",
        actor: null,
        actorLabel: "system",
        changedFields: { verificationStatus: { before, after: "pending" } },
      });
    }
```

(d) `softDelete(siteId, documentId, actor?)`：

```ts
  async softDelete(siteId: number | null, documentId: string, actor?: any) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) return null;
    const deletedAt = new Date().toISOString();
    const updated = await strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt },
    });
    await auditSafe(strapi, {
      siteId,
      targetType: "first-truth",
      targetId: documentId,
      action: "delete",
      actor,
      changedFields: diffFields(existing, { ...existing, deletedAt }),
    });
    return updated;
  },
```

> `verify` 本 Task 保持不变，Task 4 改为转发 `approve`。

- [ ] **Step 5: controller 透传操作人**

Modify `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`：文件顶部加：

```ts
/** 从 ctx.state.user（is-authenticated 策略注入）取操作人快照 */
const actorOf = (ctx: any) => {
  const u = ctx.state.user;
  return u ? { id: u.id, label: u.username || u.email || String(u.id) } : null;
};
```

然后各写路径补传 actor：

```ts
  async createEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, ctx.request.body, actorOf(ctx));
  },
  async updateEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, ctx.request.body, actorOf(ctx));
  },
  async deleteEntity(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
  async addRelation(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").addRelation({ siteId: ctx.state.siteId, ...body, actor: actorOf(ctx) });
  },
  async deleteRelation(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
  async updateRelation(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateRelation(ctx.state.siteId, ctx.params.documentId, body, actorOf(ctx));
  },
  async createGlobalEntity(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(null, body, actorOf(ctx));
  },
  async updateGlobalEntity(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(null, ctx.params.documentId, body, actorOf(ctx));
  },
  async deleteGlobalEntity(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(null, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
```

Modify `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`：加同样的 `actorOf` helper，并补传：

```ts
  async create(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, body, actorOf(ctx)); },
  async update(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, body, actorOf(ctx)); },
  async delete(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
  async createGlobal(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, body, actorOf(ctx)); },
  async updateGlobal(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, body, actorOf(ctx)); },
  async deleteGlobal(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿。若 `first-truth.test.ts` 的 `create 不存在 → 调用 db.query.create` 用例因 `created.documentId` 为 `doc-1`（mock 默认）而仍通过。

- [ ] **Step 7: Commit**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/server/src/services/first-truth.ts plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git -C e:/code/basic commit -m "feat(zhao-website): 知识写路径审计埋点 + 操作人透传"
```

---

## Task 4: 审核动作 applyReview + 路由 + 流水查询

**Files:**
- Create: `plugins/zhao-website/server/src/services/utils/review-actions.ts`
- Modify: `plugins/zhao-website/server/src/services/knowledge-graph.ts`
- Modify: `plugins/zhao-website/server/src/services/first-truth.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`
- Modify: `plugins/zhao-website/server/src/routes/admin-api.ts`
- Create: `plugins/zhao-website/tests/services/review-actions.test.ts`

> **风险控制（对设计文档 §3.3 的收敛）**：`knowledge-entity.verifiedBy` 指向 `admin::user`，而本项目登录身份来自 `users-permissions.user`（zhao-auth/SSO），id 不保证存在于 `admin_users`。直接写入会触发 FK 失败导致 approve 500。故 approve 时**仅当 `admin::user` 中确实存在该 id 才写 verifiedBy**，否则跳过——责任链以流水为准，符合设计「流水串联」的定位。

- [ ] **Step 1: 写失败测试 `tests/services/review-actions.test.ts`**

```ts
import { applyReview } from "../../server/src/services/utils/review-actions";
import { createMockStrapi } from "../helpers/mock-strapi";

const UID = "plugin::zhao-website.knowledge-entity";

describe("review-actions", () => {
  let mockStrapi: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
  });

  test("approve → verified + version+1 + strict 流水", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 2, verificationStatus: "pending" });
    const audit = mockStrapi.plugin("zhao-website").service("knowledge-audit");

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3",
      action: "approve", actor: { id: 7, label: "alice" },
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ verificationStatus: "verified", version: 3 }) })
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approve", version: 3, strict: true, targetId: "doc-3" })
    );
  });

  test("reject 缺理由 → 400 REASON_REQUIRED 且不写库", async () => {
    const queryMock = mockStrapi.db.query();

    await expect(
      applyReview(mockStrapi, {
        uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3", action: "reject", actor: { id: 7 } ,
      })
    ).rejects.toMatchObject({ status: 400, code: "REASON_REQUIRED" });
    expect(queryMock.update).not.toHaveBeenCalled();
  });

  test("submit → pending", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 1 });

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3", action: "submit",
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "pending", version: 2 }) })
    );
  });

  test("记录不存在 → 404", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      applyReview(mockStrapi, { uid: UID, targetType: "entity", siteId: 1, documentId: "missing", action: "approve" })
    ).rejects.toMatchObject({ status: 404 });
  });

  test("extraData 透传（verifiedBy）", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 3, documentId: "doc-3", version: 1 });

    await applyReview(mockStrapi, {
      uid: UID, targetType: "entity", siteId: 1, documentId: "doc-3",
      action: "approve", extraData: { verifiedBy: 7 },
    });

    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verifiedBy: 7 }) })
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- review-actions`（cwd: `plugins/zhao-website`）
Expected: FAIL，`Cannot find module '../../server/src/services/utils/review-actions'`

- [ ] **Step 3: 建 `server/src/services/utils/review-actions.ts`**

```ts
import type { Core } from "@strapi/strapi";
import { diffFields } from "./stable-json";

/** 审核动作 → 目标状态 */
const STATUS_BY_ACTION: Record<string, string> = {
  submit: "pending",
  approve: "verified",
  reject: "rejected",
};

type ReviewParams = {
  uid: string;
  targetType: "entity" | "relation" | "first-truth";
  siteId: number | null;
  documentId: string;
  action: "submit" | "approve" | "reject";
  actor?: { id?: number | string; label?: string } | null;
  reason?: string | null;
  extraData?: Record<string, any>;
};

/**
 * 三表共用的审核动作：先更新状态（事实），再写严格流水（证据）。
 * 非原子（未封装事务），流水失败直接 500 让人核查，避免静默无记录。
 */
export async function applyReview(strapi: Core.Strapi, params: ReviewParams) {
  const { uid, targetType, siteId, documentId, action, actor, reason, extraData } = params;

  if (action === "reject" && !String(reason ?? "").trim()) {
    const e: any = new Error("驳回必须填写理由");
    e.status = 400;
    e.code = "REASON_REQUIRED";
    throw e;
  }

  const existing: any = await strapi.db.query(uid).findOne({
    where: { site: siteId, documentId, deletedAt: null },
  });
  if (!existing) {
    const e: any = new Error("Record not found");
    e.status = 404;
    e.code = "NOT_FOUND";
    throw e;
  }

  const status = STATUS_BY_ACTION[action];
  const version = (Number(existing.version) || 1) + 1;
  const data: any = { verificationStatus: status, version, ...(extraData || {}) };
  if (action === "approve") data.lastVerifiedAt = new Date().toISOString();

  const updated = await strapi.db.query(uid).update({ where: { id: existing.id }, data });

  const audit: any = strapi.plugin("zhao-website").service("knowledge-audit");
  await audit.append({
    siteId,
    targetType,
    targetId: documentId,
    action,
    actor,
    reason: reason ?? null,
    version,
    strict: true,
    changedFields: diffFields(
      { verificationStatus: existing.verificationStatus },
      { verificationStatus: status }
    ),
  });

  return updated;
}
```

- [ ] **Step 4: knowledge-graph.ts 加 6 个审核方法**

Modify `plugins/zhao-website/server/src/services/knowledge-graph.ts`：顶部 import：

```ts
import { applyReview } from "./utils/review-actions";
```

在 `deleteEntity` 之后插入：

```ts
  // ===== 审核动作（entity）=====
  async submitEntity(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: ENTITY_UID, targetType: "entity", siteId, documentId, action: "submit", actor, reason });
  },

  async approveEntity(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    // verifiedBy 指向 admin::user：仅当该 id 真实存在才写入，避免 FK 失败导致审核 500
    let verifiedBy: number | null = null;
    if (actor?.id != null) {
      const adminUser = await strapi.db.query("admin::user").findOne({
        where: { id: actor.id },
        select: ["id"],
      });
      if (adminUser) verifiedBy = adminUser.id;
    }
    return applyReview(strapi, {
      uid: ENTITY_UID,
      targetType: "entity",
      siteId,
      documentId,
      action: "approve",
      actor,
      reason,
      extraData: verifiedBy ? { verifiedBy } : {},
    });
  },

  async rejectEntity(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: ENTITY_UID, targetType: "entity", siteId, documentId, action: "reject", actor, reason });
  },
```

在 `deleteRelation` 之后插入：

```ts
  // ===== 审核动作（relation）=====
  async submitRelation(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: RELATION_UID, targetType: "relation", siteId, documentId, action: "submit", actor, reason });
  },

  async approveRelation(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: RELATION_UID, targetType: "relation", siteId, documentId, action: "approve", actor, reason });
  },

  async rejectRelation(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: RELATION_UID, targetType: "relation", siteId, documentId, action: "reject", actor, reason });
  },
```

- [ ] **Step 5: first-truth.ts 加 3 个审核方法 + verify 转 approve**

Modify `plugins/zhao-website/server/src/services/first-truth.ts`：顶部 import：

```ts
import { applyReview } from "./utils/review-actions";
```

替换 `verify`：

```ts
  /** 兼容旧契约：verify = approve 的别名 */
  async verify(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return this.approve(siteId, documentId, actor, reason);
  },

  async submit(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "submit", actor, reason });
  },

  async approve(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "approve", actor, reason });
  },

  async reject(siteId: number | null, documentId: string, actor?: any, reason?: string) {
    return applyReview(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "reject", actor, reason });
  },
```

> `first-truth.test.ts` 既有 `verify 设置 verificationStatus: verified` 用例仍应通过：applyReview 的 findOne 返回 mock 的 `{ id: 5, documentId: "doc-5" }`，update 收到 `where: { id: 5 }` + `verificationStatus: "verified"`。

- [ ] **Step 6: controller 增加 handler**

Modify `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`：在 `deleteGlobalEntity` 之后追加：

```ts
  // ===== 审核动作 =====
  async submitEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").submitEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approveEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").approveEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async rejectEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").rejectEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async submitRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").submitRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approveRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").approveRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async rejectRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").rejectRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  // ===== 流水查询 =====
  async findAuditLogs(ctx: any) {
    const { targetType, targetId, page, pageSize } = ctx.query;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-audit").findByTarget(
      ctx.state.siteId, targetType, targetId, { page, pageSize }
    );
  },
```

Modify `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`：追加：

```ts
  async submit(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").submit(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approve(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").approve(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async reject(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").reject(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
```

并把 `verify` / `verifyGlobal` 改为传 actor（内部转 approve）：

```ts
  async verify(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); },
  async verifyGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId, actorOf(ctx)); },
```

- [ ] **Step 7: routes 注册**

Modify `plugins/zhao-website/server/src/routes/admin-api.ts`：

在 `channelScopeRoute("POST", "/knowledge-graph/disambiguate", ...)` 之后插入：

```ts
    channelScopeRoute("POST", "/knowledge-graph/entities/:documentId/submit", "knowledge-graph.submitEntity", "knowledge-entity.update"),
    channelScopeRoute("POST", "/knowledge-graph/entities/:documentId/approve", "knowledge-graph.approveEntity", "knowledge-entity.update"),
    channelScopeRoute("POST", "/knowledge-graph/entities/:documentId/reject", "knowledge-graph.rejectEntity", "knowledge-entity.update"),
    channelScopeRoute("POST", "/knowledge-graph/relations/:documentId/submit", "knowledge-graph.submitRelation", "knowledge-relation.update"),
    channelScopeRoute("POST", "/knowledge-graph/relations/:documentId/approve", "knowledge-graph.approveRelation", "knowledge-relation.update"),
    channelScopeRoute("POST", "/knowledge-graph/relations/:documentId/reject", "knowledge-graph.rejectRelation", "knowledge-relation.update"),
    channelScopeRoute("GET", "/knowledge-audit-logs", "knowledge-graph.findAuditLogs", "knowledge-entity.read"),
```

在 `channelScopeRoute("POST", "/first-truths/:documentId/verify", ...)` 之后插入：

```ts
    channelScopeRoute("POST", "/first-truths/:documentId/submit", "first-truth.submit", "first-truth.update"),
    channelScopeRoute("POST", "/first-truths/:documentId/approve", "first-truth.approve", "first-truth.update"),
    channelScopeRoute("POST", "/first-truths/:documentId/reject", "first-truth.reject", "first-truth.update"),
```

> 注意：`/knowledge-audit-logs` 与 `/knowledge-graph/*` 均为静态前缀，无参数路由抢占问题。

- [ ] **Step 8: 跑测试确认通过**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿（新增 review-actions 5 条 + first-truth verify 别名仍绿）。

- [ ] **Step 9: Commit**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/services/utils/review-actions.ts plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/server/src/services/first-truth.ts plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts plugins/zhao-website/server/src/routes/admin-api.ts plugins/zhao-website/tests/services/review-actions.test.ts
git -C e:/code/basic commit -m "feat(zhao-website): submit/approve/reject 审核链 + 流水查询路由"
```

---

## Task 5: 公开出口与补漏

**Files:**
- Modify: `plugins/zhao-website/server/src/services/knowledge-graph.ts`
- Modify: `plugins/zhao-website/tests/services/knowledge-graph.test.ts`
- Modify: `e:\code\strapi-site\lib\knowledge-entity.ts`
- Modify: `e:\code\strapi-site\components\views\KnowledgeEntityView.tsx`

- [ ] **Step 1: 写失败测试（追加到 `tests/services/knowledge-graph.test.ts`）**

```ts
  test("findEntityBySlug 排除 rejected 实体", async () => {
    const queryMock = mockStrapi.db.query();

    await service.findEntityBySlug(1, "career-plan");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verificationStatus: { $ne: "rejected" } }),
      })
    );
  });

  test("exportFacts 每条带 version", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { claimKey: "k", claim: "c", canonicalValue: "v", canonicalValueType: "text", verificationStatus: "verified", version: 4 },
    ]);

    const facts = await service.exportFacts(1);

    expect(facts[0].version).toBe(4);
  });

  test("_entityToJsonLd 输出 version 与 dateModified", () => {
    const jsonLd = service._entityToJsonLd({
      documentId: "doc-a", name: "A", entityType: "Organization", slug: "a",
      version: 3, updatedAt: "2026-09-29T00:00:00.000Z",
    });

    expect(jsonLd.version).toBe(3);
    expect(jsonLd.dateModified).toBe("2026-09-29T00:00:00.000Z");
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- knowledge-graph`（cwd: `plugins/zhao-website`）
Expected: FAIL 3 条（rejected 过滤缺失 / version 缺失 / dateModified 缺失）。

- [ ] **Step 3: knowledge-graph.ts 改动**

(a) `findEntityBySlug` 的 `where`：

```ts
    const where = {
      slug,
      deletedAt: null,
      status: true,
      sourceType: { $ne: "derived" },
      verificationStatus: { $ne: "rejected" },
    };
```

(b) `_entityToJsonLd`：在 `"name": entity.name,` 之后插入：

```ts
    // 公开出口的合规字段：版本号 + 最后修改时间（不露操作人/理由）
    jsonLd.version = entity.version ?? 1;
    if (entity.updatedAt) jsonLd.dateModified = entity.updatedAt;
```

(c) `exportFacts` 的 map 里加 `version`：

```ts
      verificationStatus: t.verificationStatus,
      version: t.version,
    }));
```

- [ ] **Step 4: strapi-site 类型与 JSON-LD**

Modify `e:\code\strapi-site\lib\knowledge-entity.ts`：`KnowledgeEntity` 加：

```ts
  version?: number;
  dateModified?: string;
```

Modify `e:\code\strapi-site\components\views\KnowledgeEntityView.tsx`：在 `entityJsonLd` 对象的 `name: entity.name,` 之后插入：

```tsx
    ...(entity.version !== undefined ? { version: entity.version } : {}),
    ...(entity.dateModified ? { dateModified: entity.dateModified } : {}),
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿。

Run: `npx tsc --noEmit`（cwd: `e:\code\strapi-site`）
Expected: 无新增类型错误（`knowledge-entity.ts` 的 `[key: string]: unknown` 允许新字段）。

- [ ] **Step 6: Commit（两仓分开）**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph.test.ts
git -C e:/code/basic commit -m "feat(zhao-website): 公开出口新增 version/dateModified 并过滤 rejected 实体"
```

```bash
git -C e:/code/strapi-site add lib/knowledge-entity.ts components/views/KnowledgeEntityView.tsx
git -C e:/code/strapi-site commit -m "feat(entity): JSON-LD 输出 version 与 dateModified"
```

---

## Task 6: 后台 UI（历史弹窗 + 审核按钮）

**Files:**
- Modify: `plugins/zhao-website/admin/src/utils/api.ts`
- Modify: `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx`

- [ ] **Step 1: api.ts 加常量**

Modify `plugins/zhao-website/admin/src/utils/api.ts`：在 `kgExportGraph` 之后插入：

```ts
  kgAuditLogs: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-audit-logs?${new URLSearchParams(params).toString()}`,
  kgEntityReview: (id: string, action: string) => `${ADMIN_BASE}/knowledge-graph/entities/${id}/${action}`,
  kgRelationReview: (id: string, action: string) => `${ADMIN_BASE}/knowledge-graph/relations/${id}/${action}`,
```

在 `ftVerify` 之后插入：

```ts
  ftReview: (id: string, action: string) => `${ADMIN_BASE}/first-truths/${id}/${action}`,
```

- [ ] **Step 2: KnowledgeGraphPage 加历史弹窗与审核按钮**

Modify `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx`：

(a) import 加 `HistoryOutlined`：

```tsx
import { PlusOutlined, ExportOutlined, GlobalOutlined, HistoryOutlined } from '@ant-design/icons';
```

(b) 组件内新增 state 与处理函数（放在 `const [editingEntity, setEditingEntity] = useState<any>(null);` 之后）：

```tsx
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{ targetType: string; targetId: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const openAudit = async (targetType: string, targetId: string) => {
    setAuditTarget({ targetType, targetId });
    setAuditOpen(true);
    try {
      const res = await fetch(API.kgAuditLogs({ targetType, targetId, pageSize: 50 })).then((r) => r.json());
      setAuditLogs(res.results || []);
    } catch (err) {
      message.error(`流水加载失败: ${(err as Error).message}`);
    }
  };

  const doReview = async (action: string, reason?: string) => {
    if (!auditTarget) return;
    const url = auditTarget.targetType === 'relation'
      ? API.kgRelationReview(auditTarget.targetId, action)
      : API.kgEntityReview(auditTarget.targetId, action);
    try {
      await postJSON(url, reason ? { reason } : {});
      message.success('操作成功');
      setRejecting(null);
      setRejectReason('');
      await openAudit(auditTarget.targetType, auditTarget.targetId);
      refetchEntities();
      refetchRelations();
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    }
  };
```

(c) 实体表「操作」列加历史按钮：

```tsx
        <Space>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openAudit('entity', record.documentId)}>历史</Button>
          <Button type="link" size="small" onClick={() => handleEditEntity(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteEntity(record)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
```

(d) 关系表「操作」列加历史按钮：

```tsx
        <Space>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openAudit('relation', record.documentId)}>历史</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRelation(record.documentId)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
```

(e) 在最后的「JSON-LD 导出」Modal 之后追加流水 Modal：

```tsx
      <Modal
        title="变更与审核流水"
        open={auditOpen}
        onCancel={() => setAuditOpen(false)}
        footer={
          <Space>
            <Button onClick={() => doReview('submit')}>提交审核</Button>
            <Button type="primary" onClick={() => doReview('approve')}>通过</Button>
            <Button danger onClick={() => setRejecting({})}>驳回</Button>
          </Space>
        }
        width={800}
      >
        <Table
          rowKey="id"
          size="small"
          dataSource={auditLogs}
          pagination={false}
          columns={[
            { title: '时间', dataIndex: 'createdAt' },
            { title: '动作', dataIndex: 'action' },
            { title: '操作人', dataIndex: 'actorLabel', render: (v: any) => v || 'system' },
            { title: '版本', dataIndex: 'version' },
            { title: '理由', dataIndex: 'reason', render: (v: any) => v || '-' },
            { title: '变更字段', dataIndex: 'changedFields', render: (v: any) => (v ? Object.keys(v).join(', ') : '-') },
          ]}
        />
        {rejecting ? (
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
            <Input.TextArea placeholder="驳回理由（必填）" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <Button danger onClick={() => doReview('reject', rejectReason)}>确认驳回</Button>
          </Space>
        ) : null}
      </Modal>
```

- [ ] **Step 3: FirstTruthPage 同构**

Modify `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx`：

(a) import 加 `HistoryOutlined`。

(b) 新增与 KnowledgeGraphPage 同构的 state/函数（`auditTarget` 只用 `first-truth` 类型）：

```tsx
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTargetId, setAuditTargetId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const openAudit = async (targetId: string) => {
    setAuditTargetId(targetId);
    setAuditOpen(true);
    try {
      const res = await fetch(API.kgAuditLogs({ targetType: 'first-truth', targetId, pageSize: 50 })).then((r) => r.json());
      setAuditLogs(res.results || []);
    } catch (err) {
      message.error(`流水加载失败: ${(err as Error).message}`);
    }
  };

  const doReview = async (action: string, reason?: string) => {
    if (!auditTargetId) return;
    try {
      await postJSON(API.ftReview(auditTargetId, action), reason ? { reason } : {});
      message.success('操作成功');
      setRejecting(false);
      setRejectReason('');
      await openAudit(auditTargetId);
      refetchTruths();
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    }
  };
```

(c) 真值表「操作」列加历史按钮：

```tsx
        <Space>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openAudit(record.documentId)}>历史</Button>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>编辑</Button>
          {record.verificationStatus !== 'verified' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record)}>
              verify
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
```

(d) 在「Facts 导出」Modal 之后追加与 KnowledgeGraphPage 相同的流水 Modal（用 `rejecting` / `setRejecting` 布尔版）。

- [ ] **Step 4: 构建验证（TS + 打包）**

Run: `npm run build`（cwd: `plugins/zhao-website`）
Expected: 成功产出 `dist/server/index.js`、`dist/server/index.mjs`、`dist/admin/*`。

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git -C e:/code/basic add plugins/zhao-website/admin/src/utils/api.ts plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx
git -C e:/code/basic commit -m "feat(zhao-website): 知识图谱/真值后台历史与审核操作 UI"
```

---

## Task 7: 测试收口

**Files:**
- Modify: `plugins/zhao-website/tests/services/first-truth.test.ts`（若无变化可跳过）

- [ ] **Step 1: 确认既有 verify 用例仍通过**

Run: `npm test -- first-truth`（cwd: `plugins/zhao-website`）
Expected: PASS（`verify 设置 verificationStatus: verified` 走 approve 别名）。

若失败（mock 未提供 audit 或 `admin::user` 查询干扰），在用例内显式补 `queryMock.findOne` 序列即可，不改生产代码。

- [ ] **Step 2: 全量回归**

Run: `npm test`（cwd: `plugins/zhao-website`）
Expected: 全绿，无 skip、无 warn 泄漏到断言。

- [ ] **Step 3: 覆盖清单自检（人工核对）**

- [ ] `stable-json`：键序无关 / diff 只含变更字段 / 噪音字段忽略
- [ ] `knowledge-audit`：append 成功 / strict 抛 500 / 非 strict 只 warn / findByTarget 分页与租户+全局
- [ ] 写路径：create/update/delete 三类均有流水，update 带 version+1
- [ ] recheck：仅状态变化时写
- [ ] 审核：submit→pending、approve→verified+version+1、reject 缺理由 400、记录不存在 404
- [ ] 公开出口：facts 带 version；_entityToJsonLd 带 version/dateModified；rejected 不进 findEntityBySlug
- [ ] CT 数量 24

- [ ] **Step 4: 提交（如有测试改动）**

```bash
git -C e:/code/basic add plugins/zhao-website/tests
git -C e:/code/basic commit -m "test(zhao-website): 知识可追溯与审核链测试收口"
```

---

## Task 8: 构建、提交、部署与线上取证

- [ ] **Step 1: 构建插件（本地，服务器禁止构建）**

Run: `npm run build`（cwd: `plugins/zhao-website`）
Expected: `dist/server/index.js`、`dist/server/index.mjs`、`dist/admin/index.js`、`dist/admin/index.mjs` 均更新。

- [ ] **Step 2: 提交 dist（server + admin 一起，绝不 add 无关文件）**

```bash
git -C e:/code/basic status --short
git -C e:/code/basic add plugins/zhao-website/dist
git -C e:/code/basic commit -m "build(zhao-website): 知识可追溯与审核链 dist 产物"
git -C e:/code/basic push
```

> 若 `git status` 出现 `plugins/zhao-auth/server/src/services/auth.service.ts` 或 `test-output.txt`，**不要 add**。

- [ ] **Step 3: 部署 basic**

```powershell
ssh joho "cd /www/apps/strapi && git pull --ff-only && bash -lc 'cd /www/apps/strapi && pm2 startOrReload ecosystem.config.cjs --update-env'"
```

- [ ] **Step 4: 等待并探活**

等待 2–3 分钟后：

```powershell
ssh joho "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health"
```

Expected: `204`

- [ ] **Step 5: 线上取证（公开出口）**

```powershell
ssh joho "printf 'facts-version: '; curl -s http://127.0.0.1:1337/api/zhao-website/v1/facts.json | head -c 400; printf '\n---entity---\n'; curl -s http://127.0.0.1:1337/api/zhao-website/v1/knowledge-graph.json | head -c 600"
```

Expected:
- `facts.json` 每条含 `"version"`；
- 无 `rejected` 实体出现（`grep` 检查：`printf 'rejected-hits: '; curl -s ... | grep -c rejected`，期望 `0`）；
- `knowledge-graph.json` 的 `@graph` 项含 `"version"` 与 `"dateModified"`。

- [ ] **Step 6: 部署 strapi-site 并验证实体页 JSON-LD**

```powershell
npm run build
.\deploy-www.ps1
```

（cwd: `e:\code\strapi-site`，等待 SYNC_OK）

```powershell
ssh joho "curl -s https://www.joho.cn/knowledge/<任一已发布实体slug> | grep -o '\"version\":[0-9]*' | head -n 1"
```

Expected: 输出形如 `"version":3`；若实体页 slug 未知，先 `curl -s http://127.0.0.1:1337/api/zhao-website/v1/knowledge-graph.json` 取一个 `@id` 作为 slug。

- [ ] **Step 7: 复盘（用户规则：只记 1 个问题 + 1 个改进措施）**

在交付说明中给出：1 个本阶段暴露的问题 + 1 条改进措施，不写冗余总结。

---

## Self-Review 记录

**1. Spec 覆盖**
- §3.1 流水表 → T1；§3.2 version → T1+T3；§3.3 verifiedBy 激活 → T4（带 FK 风险收敛，见 T4 说明）；§3.4 rejected 枚举 → T1
- §4.1 service + stable-json → T1+T2；§4.2 埋点表 → T3；§4.3 操作人 → T3；§4.4 版本递增 → T3+T4；§4.5 失败策略 → T2(strict) + T3(auditSafe) + T4(strict:true)
- §5.1 路由 → T4；§5.2 UI → T6
- §6 公开出口 → T5（facts/entity/graph 的 version + dateModified；rejected 过滤；不新增历史端点、不露 actor/reason）
- §7 测试 → T7；交付顺序 → T8；跨仓 → T5+T8
- §8 风险 → T2/T3/T4 均有对应实现；「流水可被软删」由服务层不提供删除接口保证（T2 只暴露 append/findByTarget）

**2. 占位符扫描**：无 TBD/TODO；每个代码步骤均为完整代码。

**3. 类型一致性**
- `auditSafe(strapi, params)` 与 `append(params)` 参数名一致（`siteId/targetType/targetId/action/actor/actorLabel/changedFields/reason/version/strict`）。
- `applyReview(strapi, { uid, targetType, siteId, documentId, action, actor, reason, extraData })` 在 T4 三处调用一致。
- `diffFields(before, after)` 全程两参一致。
- `findByTarget(siteId, targetType, targetId, { page, pageSize })` 在 T2 定义、T4 controller 与 T6 UI 一致。
- recheck 流水的 `actorLabel: "system"` 依赖 T2 中 `actorLabel ?? actor?.label ?? null` 的取值顺序（T2 已实现）。