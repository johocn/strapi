# 插件功能更新 — Brand Voice + Sync-Event + 前端统一适配 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 Brand Voice（zhao-website）和 Sync-Event（zhao-studio）的后端+前端实现，统一适配两个插件的前端 API 路径对齐后端实际路由，补充跨租户知识库全局管理 UI，并通过 Brand Voice 的 llms.txt/JSON-LD 注入和 Sync-Event 的内容同步机制增强 GEO 提及率与准确率。

**Architecture:** Brand Voice CT 采用 site=null 全局层设计（与跨租户知识库一致），查询自动合并全局+租户结果（$or merge），findOne 使用两步查询（租户优先，全局 fallback）。Sync-Event CT 通过 webhook 接收 zhao-website 发布事件，人工处理转为 article-draft。前端 admin/src 统一走 /api/{plugin}/v1/admin/ 前缀。

**Tech Stack:** Strapi 5 插件架构（zhao-website、zhao-studio、zhao-auth），TypeScript + Jest（后端 TDD），React + antd 5 + react-router-dom（前端），多租户隔离（site relation to plugin::zhao-common.site-config）

**Spec:** `docs/superpowers/specs/2026-07-12-plugin-update-brand-voice-sync-event-design.md`

---

## 文件结构

### 新建文件

| 路径 | 责任 |
|------|------|
| `plugins/zhao-website/server/src/content-types/brand-voice/schema.json` | Brand Voice CT schema |
| `plugins/zhao-website/server/src/content-types/brand-voice/index.ts` | CT 导出 |
| `plugins/zhao-website/server/src/services/brand-voice.ts` | Brand Voice service（含 $or 合并查询、全局层 CRUD） |
| `plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts` | Brand Voice controller（含 admin + public + global 方法） |
| `plugins/zhao-website/server/src/services/utils/sync-event-trigger.ts` | Webhook 触发工具 |
| `plugins/zhao-website/tests/services/brand-voice.test.ts` | Brand Voice service 测试 |
| `plugins/zhao-studio/server/src/content-types/sync-event/schema.json` | Sync-Event CT schema |
| `plugins/zhao-studio/server/src/content-types/sync-event/index.ts` | CT 导出 |
| `plugins/zhao-studio/server/src/services/sync-event.ts` | Sync-Event service |
| `plugins/zhao-studio/server/src/controllers/sync-event-api.ts` | Sync-Event controller（含 createFromWebhook） |
| `plugins/zhao-studio/tests/services/sync-event.test.ts` | Sync-Event service 测试 |
| `plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx` | 品牌话术管理页面 |
| `plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx` | 同步事件管理页面 |
| `plugins/zhao-studio/admin/src/utils/syncEventApi.ts` | Sync-Event API 封装 |

### 修改文件

| 路径 | 修改内容 |
|------|---------|
| `plugins/zhao-website/server/src/content-types/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/services/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/controllers/admin-api/generic.ts` | 新增 `"brand-voice": createGenericController("brand-voice")` |
| `plugins/zhao-website/server/src/controllers/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/routes/admin-api.ts` | 新增 10 条 brand-voice admin 路由 |
| `plugins/zhao-website/server/src/routes/content-api.ts` | 新增 2 条 brand-voice 公开路由 |
| `plugins/zhao-website/server/src/content-types/article/schema.json` | 新增 `brandVoiceRef` relation 字段 |
| `plugins/zhao-website/server/src/content-types/article/lifecycles.ts` | 新增 triggerSyncEvent 调用 |
| `plugins/zhao-website/server/src/services/llms-txt.ts` | 新增 Brand Voice 段落 |
| `plugins/zhao-website/server/src/services/schema-builder.ts` | buildArticle 新增 brand 注入 |
| `plugins/zhao-studio/server/src/content-types/index.ts` | 新增 sync-event 导入 |
| `plugins/zhao-studio/server/src/services/index.ts` | 新增 sync-event 导入 |
| `plugins/zhao-studio/server/src/controllers/index.ts` | 新增 sync-event-api 导入 |
| `plugins/zhao-studio/server/src/routes/content-api.ts` | 新增 3 条 sync-event admin 路由 + 1 条 webhook 公开路由 |
| `plugins/zhao-auth/server/src/permissions.ts` | 新增 brand-voice（含 global） + sync-event 权限节点和角色分配 |
| `plugins/zhao-website/admin/src/utils/api.ts` | ADMIN_BASE 修正 + 全部路径改为 RESTful + 新增 brand-voice/global 常量 |
| `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx` | 全局实体管理 UI |
| `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx` | 全局真值管理 UI |
| `plugins/zhao-website/admin/src/pages/App.tsx` | 新增 brand-voice 路由 |
| `plugins/zhao-website/admin/src/components/PluginLayout.tsx` | 新增菜单项 |
| `plugins/zhao-studio/admin/src/pages/App.tsx` | 新增 sync-events 路由 |
| `plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx` | 新增菜单项 |
| `plugins/zhao-studio/admin/src/utils/collectApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/publishApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/aiApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/analyticsApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/hooks/useCollectSources.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useCollectTasks.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAdSlots.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useStats.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAIConfig.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAIActions.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishActions.ts` | response.data → response |

---

## Task 1: Brand Voice CT Schema（zhao-website）

**Files:**
- Create: `plugins/zhao-website/server/src/content-types/brand-voice/schema.json`
- Create: `plugins/zhao-website/server/src/content-types/brand-voice/index.ts`
- Modify: `plugins/zhao-website/server/src/content-types/index.ts`

- [ ] **Step 1: 创建 brand-voice/schema.json**

创建 `plugins/zhao-website/server/src/content-types/brand-voice/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_brand_voices",
  "info": {
    "singularName": "brand-voice",
    "pluralName": "brand-voices",
    "displayName": "品牌话术"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": false,
      "inversedBy": "website_brand_voices"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "category": {
      "type": "enumeration",
      "enum": ["tone", "style", "phrase", "disclaimer", "cta"],
      "required": true
    },
    "content": {
      "type": "richtext",
      "required": true
    },
    "variables": {
      "type": "json"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "tags": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 2: 创建 brand-voice/index.ts**

创建 `plugins/zhao-website/server/src/content-types/brand-voice/index.ts`:

```ts
import schema from "./schema.json";

export default {
  schema,
};
```

- [ ] **Step 3: 注册 brand-voice CT**

在 `plugins/zhao-website/server/src/content-types/index.ts` 中:

在 `import firstTruthPolicy from "./first-truth-policy/schema.json";` 后添加:
```ts
import brandVoice from "./brand-voice/schema.json";
```

在导出对象的 `"first-truth-policy": { schema: firstTruthPolicy },` 后添加:
```ts
  "brand-voice": { schema: brandVoice },
```

- [ ] **Step 4: 运行 content-types 测试**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/content-types.test.ts --no-coverage --config tests/jest.config.ts
```

预期：测试通过（如果测试检查 CT 数量，需同步更新预期数量）

- [ ] **Step 5: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/content-types/brand-voice plugins/zhao-website/server/src/content-types/index.ts && git commit -m "feat(zhao-website): add brand-voice CT schema with global layer support"
```

---

## Task 2: Brand Voice Service — TDD（zhao-website）

**Files:**
- Create: `plugins/zhao-website/tests/services/brand-voice.test.ts`
- Create: `plugins/zhao-website/server/src/services/brand-voice.ts`
- Modify: `plugins/zhao-website/server/src/services/index.ts`

- [ ] **Step 1: 写测试**

创建 `plugins/zhao-website/tests/services/brand-voice.test.ts`:

```ts
import bvServiceFactory from "../../server/src/services/brand-voice";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Brand Voice Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = bvServiceFactory({ strapi: mockStrapi });
  });

  describe("findAdmin", () => {
    test("uses $or to merge global and tenant brand voices", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Slogan", site: null, category: "tone" },
        { id: 2, name: "Tenant CTA", site: 1, category: "cta" },
      ]);

      const result = await service.findAdmin(1, { page: 1, pageSize: 20 });

      expect(result).toHaveLength(2);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null }),
              expect.objectContaining({ site: null, deletedAt: null }),
            ],
          }),
        })
      );
    });

    test("filters by category", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.findAdmin(1, { category: "tone" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null, category: "tone" }),
              expect.objectContaining({ site: null, deletedAt: null, category: "tone" }),
            ],
          }),
        })
      );
    });

    test("filters by status", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.findAdmin(1, { status: true });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, deletedAt: null, status: true }),
              expect.objectContaining({ site: null, deletedAt: null, status: true }),
            ],
          }),
        })
      );
    });

    test("supports null siteId for global-only query", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Slogan", site: null },
      ]);

      const result = await service.findAdmin(null, {});

      expect(result).toHaveLength(1);
    });
  });

  describe("findOneAdmin", () => {
    test("returns tenant first, global as fallback", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, name: "Global", site: null, documentId: "doc-1" });

      const result = await service.findOneAdmin(1, "doc-1");

      expect(result.name).toBe("Global");
      expect(queryMock.findOne).toHaveBeenCalledTimes(2);
      expect(queryMock.findOne).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, documentId: "doc-1", deletedAt: null }),
        })
      );
      expect(queryMock.findOne).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: expect.objectContaining({ site: null, documentId: "doc-1", deletedAt: null }),
        })
      );
    });

    test("returns tenant when both exist", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 2, name: "Tenant", site: 1, documentId: "doc-1" });

      const result = await service.findOneAdmin(1, "doc-1");

      expect(result.name).toBe("Tenant");
      expect(queryMock.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("create", () => {
    test("creates tenant brand voice with siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Slogan", site: 1 });

      const result = await service.create(1, { name: "Slogan", category: "tone", content: "Hello" });

      expect(result.site).toBe(1);
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Slogan", site: 1 }),
        })
      );
    });

    test("creates global brand voice with null siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Global Slogan", site: null });

      const result = await service.create(null, { name: "Global Slogan", category: "tone", content: "Hello" });

      expect(result.site).toBeNull();
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Global Slogan", site: null }),
        })
      );
    });
  });

  describe("update", () => {
    test("updates existing tenant brand voice", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: 1, content: "Old" });

      await service.update(1, "doc-5", { content: "New" });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ content: "New" }),
        })
      );
    });

    test("throws 404 if not found in tenant, tries global", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null, content: "Old" });

      await service.update(1, "doc-5", { content: "New" });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ content: "New" }),
        })
      );
    });

    test("throws if not found in tenant or global", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.update(1, "nonexistent", { content: "New" })).rejects.toThrow("Brand voice not found");
    });
  });

  describe("softDelete", () => {
    test("soft deletes tenant brand voice", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: 1 });

      await service.softDelete(1, "doc-5");

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    test("soft deletes global brand voice with null siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

      await service.softDelete(null, "doc-5");

      expect(queryMock.update).toHaveBeenCalled();
    });
  });

  describe("listByCategory", () => {
    test("merges global and tenant by category with status=true", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Global Tone", site: null, category: "tone", status: true },
        { id: 2, name: "Tenant Tone", site: 1, category: "tone", status: true },
      ]);

      const result = await service.listByCategory(1, "tone");

      expect(result).toHaveLength(2);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [
              expect.objectContaining({ site: 1, category: "tone", status: true, deletedAt: null }),
              expect.objectContaining({ site: null, category: "tone", status: true, deletedAt: null }),
            ],
          }),
        })
      );
    });
  });

  describe("resolveVariables", () => {
    test("replaces {{variable}} placeholders", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{name}}, welcome to {{company}}!",
        variables: [{ name: "name", defaultValue: "User" }, { name: "company", defaultValue: "Acme" }],
      });

      const result = await service.resolveVariables(1, "doc-1", { name: "Alice" });

      expect(result).toBe("Hello Alice, welcome to Acme!");
    });

    test("uses default values when variable not provided", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{name}}!",
        variables: [{ name: "name", defaultValue: "Guest" }],
      });

      const result = await service.resolveVariables(1, "doc-1", {});

      expect(result).toBe("Hello Guest!");
    });

    test("leaves unknown placeholders as-is", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", content: "Hello {{unknown}}!",
        variables: [],
      });

      const result = await service.resolveVariables(1, "doc-1", {});

      expect(result).toBe("Hello {{unknown}}!");
    });
  });

  describe("getRefContent", () => {
    test("returns all enabled voices in category as reference text", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, name: "Tone 1", content: "Be professional.", category: "tone", site: null },
        { id: 2, name: "Tone 2", content: "Be friendly.", category: "tone", site: 1 },
      ]);

      const result = await service.getRefContent(1, "tone");

      expect(result).toContain("Be professional.");
      expect(result).toContain("Be friendly.");
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/brand-voice.test.ts --no-coverage --config tests/jest.config.ts
```

预期：FAIL — service 文件不存在

- [ ] **Step 3: 实现 brand-voice service**

创建 `plugins/zhao-website/server/src/services/brand-voice.ts`:

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.brand-voice";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== 查询 =====
  async findAdmin(siteId: number | null, query: any = {}) {
    const { category, status, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [
        { site: siteId, deletedAt: null },
        { site: null, deletedAt: null },
      ],
    };
    if (category) {
      filters.$or[0].category = category;
      filters.$or[1].category = category;
    }
    if (status !== undefined) {
      filters.$or[0].status = status;
      filters.$or[1].status = status;
    }
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
    });
  },

  async findOneAdmin(siteId: number | null, documentId: string) {
    // 两步查询：租户优先，全局 fallback
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, documentId, deletedAt: null },
    });
  },

  // ===== 写入 =====
  async create(siteId: number | null, data: any) {
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId },
    });
  },

  async update(siteId: number | null, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw new Error("Brand voice not found");
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async softDelete(siteId: number | null, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw new Error("Brand voice not found");
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  },

  // ===== 类目查询 =====
  async listByCategory(siteId: number | null, category: string) {
    return strapi.db.query(UID).findMany({
      where: {
        $or: [
          { site: siteId, category, status: true, deletedAt: null },
          { site: null, category, status: true, deletedAt: null },
        ],
      },
      orderBy: { name: "ASC" },
    });
  },

  // ===== 变量替换 =====
  async resolveVariables(siteId: number | null, documentId: string, variables: Record<string, string>) {
    const voice = await this.findOneAdmin(siteId, documentId);
    if (!voice) throw new Error("Brand voice not found");

    let content = voice.content || "";
    const varDefs: Array<{ name: string; defaultValue?: string }> = voice.variables || [];

    for (const v of varDefs) {
      const value = variables[v.name] ?? v.defaultValue ?? `{{${v.name}}}`;
      content = content.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, "g"), value);
    }

    return content;
  },

  // ===== 参考内容 =====
  async getRefContent(siteId: number | null, category: string) {
    const voices = await strapi.db.query(UID).findMany({
      where: {
        $or: [
          { site: siteId, category, status: true, deletedAt: null },
          { site: null, category, status: true, deletedAt: null },
        ],
      },
      orderBy: { name: "ASC" },
    });
    return voices.map((v: any) => `- ${v.name}: ${v.content}`).join("\n");
  },
});
```

- [ ] **Step 4: 注册 service**

在 `plugins/zhao-website/server/src/services/index.ts` 中:

在 `import studioBridge from "./studio-bridge";` 后添加:
```ts
import brandVoice from "./brand-voice";
```

在导出对象的 `"studio-bridge": studioBridge,` 后添加:
```ts
  "brand-voice": brandVoice,
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/brand-voice.test.ts --no-coverage --config tests/jest.config.ts
```

预期：PASS（所有测试通过）

- [ ] **Step 6: 运行全量测试确认无回归**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有预存测试仍然通过

- [ ] **Step 7: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/services/brand-voice.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/tests/services/brand-voice.test.ts && git commit -m "feat(zhao-website): add brand-voice service with \$or query merge and variable resolution"
```

---

## Task 3: Brand Voice Controller + Routes（zhao-website）

**Files:**
- Create: `plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/generic.ts`
- Modify: `plugins/zhao-website/server/src/controllers/index.ts`
- Modify: `plugins/zhao-website/server/src/routes/admin-api.ts`
- Modify: `plugins/zhao-website/server/src/routes/content-api.ts`

- [ ] **Step 1: 注册到 generic controller**

在 `plugins/zhao-website/server/src/controllers/admin-api/generic.ts` 的导出对象中，在 `"search-log": createGenericController("search-log"),` 后添加:
```ts
  "brand-voice": createGenericController("brand-voice"),
```

- [ ] **Step 2: 创建 brand-voice controller（特殊操作）**

创建 `plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts`:

```ts
export default {
  // ===== 特殊操作 =====
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").resolveVariables(
      ctx.state.siteId, ctx.params.documentId, ctx.request.body.variables || {}
    );
  },
  async listByCategory(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(
      ctx.state.siteId, ctx.params.category
    );
  },

  // ===== 全局话术 =====
  async createGlobal(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").create(null, ctx.request.body);
  },
  async updateGlobal(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").update(null, ctx.params.documentId, ctx.request.body);
  },
  async deleteGlobal(ctx: any) {
    await strapi.plugin("zhao-website").service("brand-voice").softDelete(null, ctx.params.documentId);
    ctx.body = { success: true };
  },

  // ===== 公开方法（GEO AI 读取） =====
  async publicList(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(
      ctx.state.siteId, ctx.query.category
    );
  },
  async publicByCategory(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").getRefContent(
      ctx.state.siteId, ctx.params.category
    );
  },
};
```

- [ ] **Step 3: 注册 controller**

在 `plugins/zhao-website/server/src/controllers/index.ts` 中:

在 `import stats from "./admin-api/stats";` 后添加:
```ts
import brandVoice from "./admin-api/brand-voice";
```

在导出对象的 `stats,` 后添加:
```ts
  "brand-voice": brandVoice,
```

- [ ] **Step 4: 添加 admin 路由**

在 `plugins/zhao-website/server/src/routes/admin-api.ts` 的 routes 数组中，在 `channelScopeRoute("GET", "/first-truths/export", "first-truth.exportFacts", "first-truth.read"),` 后（全局真值路由之后）添加:

```ts
    // 品牌话术
    channelScopeRoute("GET", "/brand-voices", "brand-voice-admin.find", "brand-voice.read"),
    channelScopeRoute("GET", "/brand-voices/:documentId", "brand-voice-admin.findOne", "brand-voice.read"),
    channelScopeRoute("POST", "/brand-voices", "brand-voice-admin.create", "brand-voice.create"),
    channelScopeRoute("PUT", "/brand-voices/:documentId", "brand-voice-admin.update", "brand-voice.update"),
    channelScopeRoute("DELETE", "/brand-voices/:documentId", "brand-voice-admin.delete", "brand-voice.delete"),
    channelScopeRoute("POST", "/brand-voices/:documentId/resolve", "brand-voice.resolve", "brand-voice.read"),
    channelScopeRoute("GET", "/brand-voices/by-category/:category", "brand-voice.listByCategory", "brand-voice.read"),
    // 全局品牌话术
    channelScopeRoute("POST", "/brand-voices/global", "brand-voice.createGlobal", "brand-voice.create-global"),
    channelScopeRoute("PUT", "/brand-voices/global/:documentId", "brand-voice.updateGlobal", "brand-voice.update-global"),
    channelScopeRoute("DELETE", "/brand-voices/global/:documentId", "brand-voice.deleteGlobal", "brand-voice.delete-global"),
```

- [ ] **Step 5: 添加公开路由**

在 `plugins/zhao-website/server/src/routes/content-api.ts` 的 routes 数组中，在 `publicRoute("GET", "/site-info", "site-info.info"),` 后添加:

```ts
    // 品牌话术公开路由（GEO AI 读取）
    publicRoute("GET", "/brand-voices", "brand-voice.publicList"),
    publicRoute("GET", "/brand-voices/by-category/:category", "brand-voice.publicByCategory"),
```

- [ ] **Step 6: 运行全量测试**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过

- [ ] **Step 7: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts plugins/zhao-website/server/src/controllers/admin-api/generic.ts plugins/zhao-website/server/src/controllers/index.ts plugins/zhao-website/server/src/routes/admin-api.ts plugins/zhao-website/server/src/routes/content-api.ts && git commit -m "feat(zhao-website): add brand-voice controllers, admin routes, and public routes"
```

---

## Task 4: Sync-Event CT Schema（zhao-studio）

**Files:**
- Create: `plugins/zhao-studio/server/src/content-types/sync-event/schema.json`
- Create: `plugins/zhao-studio/server/src/content-types/sync-event/index.ts`
- Modify: `plugins/zhao-studio/server/src/content-types/index.ts`

- [ ] **Step 1: 创建 sync-event/schema.json**

创建 `plugins/zhao-studio/server/src/content-types/sync-event/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_studio_sync_events",
  "info": {
    "singularName": "sync-event",
    "pluralName": "sync-events",
    "displayName": "同步事件"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "studio_sync_events"
    },
    "sourceType": {
      "type": "enumeration",
      "enum": ["website"],
      "required": true
    },
    "sourceContentType": {
      "type": "string",
      "required": true
    },
    "sourceDocumentId": {
      "type": "string"
    },
    "sourceUrl": {
      "type": "string"
    },
    "sourceTitle": {
      "type": "string"
    },
    "targetDraftId": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft",
      "inversedBy": "syncEvents"
    },
    "eventStatus": {
      "type": "enumeration",
      "enum": ["pending", "resolved", "ignored"],
      "default": "pending"
    },
    "eventPayload": {
      "type": "json"
    },
    "resolvedAt": {
      "type": "datetime"
    },
    "resolvedBy": {
      "type": "string"
    }
  }
}
```

- [ ] **Step 2: 创建 sync-event/index.ts**

创建 `plugins/zhao-studio/server/src/content-types/sync-event/index.ts`:

```ts
import schema from "./schema.json";

export default {
  schema,
};
```

- [ ] **Step 3: 注册 sync-event CT**

在 `plugins/zhao-studio/server/src/content-types/index.ts` 中:

在 `import statSummary from './stat-summary';` 后添加:
```ts
import syncEvent from './sync-event';
```

在导出对象的 `'stat-summary': statSummary,` 后添加:
```ts
  'sync-event': syncEvent,
```

- [ ] **Step 4: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-studio/server/src/content-types/sync-event plugins/zhao-studio/server/src/content-types/index.ts && git commit -m "feat(zhao-studio): add sync-event CT schema"
```

---

## Task 5: Sync-Event Service — TDD（zhao-studio）

**Files:**
- Create: `plugins/zhao-studio/tests/services/sync-event.test.ts`
- Create: `plugins/zhao-studio/server/src/services/sync-event.ts`
- Modify: `plugins/zhao-studio/server/src/services/index.ts`

- [ ] **Step 1: 写测试**

创建 `plugins/zhao-studio/tests/services/sync-event.test.ts`:

```ts
import syncEventServiceFactory from "../../server/src/services/sync-event";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Sync Event Service", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = syncEventServiceFactory({ strapi: mockStrapi });
  });

  describe("list", () => {
    test("filters by siteId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([
        { id: 1, sourceTitle: "Article 1", eventStatus: "pending", site: 1 },
      ]);

      const result = await service.list(1, {});

      expect(result).toHaveLength(1);
      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1 }),
        })
      );
    });

    test("filters by eventStatus", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { eventStatus: "pending" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, eventStatus: "pending" }),
        })
      );
    });

    test("filters by sourceContentType", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { sourceContentType: "article" });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, sourceContentType: "article" }),
        })
      );
    });

    test("supports pagination", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findMany.mockResolvedValueOnce([]);

      await service.list(1, { page: 2, pageSize: 10 });

      expect(queryMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10,
        })
      );
    });
  });

  describe("findOne", () => {
    test("returns single event with populate targetDraftId", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", sourceTitle: "Test",
        eventStatus: "pending", targetDraftId: null,
      });

      const result = await service.findOne(1, "doc-1");

      expect(result.sourceTitle).toBe("Test");
      expect(queryMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: 1, documentId: "doc-1" }),
          populate: ["targetDraftId"],
        })
      );
    });
  });

  describe("resolve", () => {
    test("action=create creates new draft and links it", async () => {
      const queryMock = mockStrapi.db.query();
      // findOne sync-event
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
        eventPayload: { content: "Test content", title: "Test" },
      });
      // create article-draft
      queryMock.create.mockResolvedValueOnce({ id: 10, documentId: "draft-1" });
      // update sync-event
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "resolved" });

      const result = await service.resolve(1, "doc-1", { action: "create", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("resolved");
      expect(result.resolvedBy).toBe("admin");
      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            eventStatus: "resolved",
            resolvedAt: expect.any(Date),
            resolvedBy: "admin",
            targetDraftId: "draft-1",
          }),
        })
      );
    });

    test("action=update updates existing draft", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
        eventPayload: { content: "Updated content" },
      });
      // findOne draft
      queryMock.findOne.mockResolvedValueOnce({ id: 10, documentId: "draft-1", title: "Old" });
      // update draft
      queryMock.update.mockResolvedValueOnce({ id: 10 });
      // update sync-event
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "resolved" });

      const result = await service.resolve(1, "doc-1", { action: "update", draftId: "draft-1", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("resolved");
    });

    test("action=ignore marks as ignored", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", site: 1, eventStatus: "pending",
      });
      queryMock.update.mockResolvedValueOnce({ id: 1, eventStatus: "ignored" });

      const result = await service.resolve(1, "doc-1", { action: "ignore", resolvedBy: "admin" });

      expect(result.eventStatus).toBe("ignored");
      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventStatus: "ignored",
            resolvedBy: "admin",
          }),
        })
      );
    });

    test("throws if sync event not found", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.findOne.mockResolvedValueOnce(null);

      await expect(service.resolve(1, "nonexistent", { action: "ignore" })).rejects.toThrow("Sync event not found");
    });
  });

  describe("createFromWebhook", () => {
    test("creates pending sync event from webhook payload", async () => {
      const queryMock = mockStrapi.db.query();
      queryMock.create.mockResolvedValueOnce({
        id: 1, documentId: "doc-1", eventStatus: "pending",
        sourceContentType: "article", sourceTitle: "Test Article",
      });

      const result = await service.createFromWebhook({
        sourceContentType: "article",
        sourceDocumentId: "art-1",
        sourceUrl: "/articles/test",
        sourceTitle: "Test Article",
        siteId: 1,
        content: "Test content",
      });

      expect(result.eventStatus).toBe("pending");
      expect(result.sourceTitle).toBe("Test Article");
      expect(queryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: "website",
            sourceContentType: "article",
            sourceDocumentId: "art-1",
            sourceTitle: "Test Article",
            site: 1,
            eventStatus: "pending",
            eventPayload: expect.objectContaining({
              sourceContentType: "article",
              sourceTitle: "Test Article",
            }),
          }),
        })
      );
    });

    test("throws if siteId is missing", async () => {
      await expect(service.createFromWebhook({
        sourceContentType: "article",
        sourceTitle: "Test",
      })).rejects.toThrow("siteId is required");
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd E:\code\basic\plugins\zhao-studio && npx jest tests/services/sync-event.test.ts --no-coverage --config tests/jest.config.ts
```

预期：FAIL — service 文件不存在

- [ ] **Step 3: 实现 sync-event service**

创建 `plugins/zhao-studio/server/src/services/sync-event.ts`:

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-studio.sync-event";
const DRAFT_UID = "plugin::zhao-studio.article-draft";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== 查询 =====
  async list(siteId: number, query: any = {}) {
    const { eventStatus, sourceContentType, page = 1, pageSize = 20 } = query;
    const filters: any = { site: siteId };
    if (eventStatus) filters.eventStatus = eventStatus;
    if (sourceContentType) filters.sourceContentType = sourceContentType;

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
      populate: ["targetDraftId"],
    });
  },

  async findOne(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId },
      populate: ["targetDraftId"],
    });
  },

  // ===== 处理 =====
  async resolve(siteId: number, documentId: string, body: any) {
    const event = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId },
    });
    if (!event) throw new Error("Sync event not found");

    const { action, draftId, resolvedBy } = body;
    const now = new Date();

    if (action === "create") {
      // 从 payload 创建新草稿
      const payload = event.eventPayload || {};
      const draft = await strapi.db.query(DRAFT_UID).create({
        data: {
          site: siteId,
          title: payload.title || event.sourceTitle || "Untitled",
          content: payload.content || "",
          sourceType: "website",
          sourceContentType: event.sourceContentType,
          sourceDocumentId: event.sourceDocumentId,
        },
      });
      await strapi.db.query(UID).update({
        where: { id: event.id },
        data: {
          eventStatus: "resolved",
          resolvedAt: now,
          resolvedBy: resolvedBy || "system",
          targetDraftId: draft.documentId,
        },
      });
    } else if (action === "update") {
      if (!draftId) throw new Error("draftId is required for update action");
      const payload = event.eventPayload || {};
      const existingDraft = await strapi.db.query(DRAFT_UID).findOne({
        where: { site: siteId, documentId: draftId },
      });
      if (!existingDraft) throw new Error("Draft not found");
      await strapi.db.query(DRAFT_UID).update({
        where: { id: existingDraft.id },
        data: {
          title: payload.title || event.sourceTitle || existingDraft.title,
          content: payload.content || existingDraft.content,
        },
      });
      await strapi.db.query(UID).update({
        where: { id: event.id },
        data: {
          eventStatus: "resolved",
          resolvedAt: now,
          resolvedBy: resolvedBy || "system",
          targetDraftId: draftId,
        },
      });
    } else if (action === "ignore") {
      await strapi.db.query(UID).update({
        where: { id: event.id },
        data: {
          eventStatus: "ignored",
          resolvedAt: now,
          resolvedBy: resolvedBy || "system",
        },
      });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return strapi.db.query(UID).findOne({ where: { id: event.id } });
  },

  // ===== Webhook 创建 =====
  async createFromWebhook(payload: any) {
    const { siteId, sourceContentType, sourceDocumentId, sourceUrl, sourceTitle, content } = payload;
    if (!siteId) throw new Error("siteId is required");

    return strapi.db.query(UID).create({
      data: {
        site: siteId,
        sourceType: "website",
        sourceContentType,
        sourceDocumentId,
        sourceUrl,
        sourceTitle,
        eventStatus: "pending",
        eventPayload: {
          sourceContentType,
          sourceDocumentId,
          sourceUrl,
          sourceTitle,
          content,
        },
      },
    });
  },
});
```

- [ ] **Step 4: 注册 service**

在 `plugins/zhao-studio/server/src/services/index.ts` 中:

在 `import aggregation from './aggregation';` 后添加:
```ts
import syncEvent from './sync-event';
```

在导出对象的 `aggregation,` 后添加:
```ts
  'sync-event': syncEvent,
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd E:\code\basic\plugins\zhao-studio && npx jest tests/services/sync-event.test.ts --no-coverage --config tests/jest.config.ts
```

预期：PASS（所有测试通过）

- [ ] **Step 6: 运行全量测试确认无回归**

```bash
cd E:\code\basic\plugins\zhao-studio && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有预存测试仍然通过

- [ ] **Step 7: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-studio/server/src/services/sync-event.ts plugins/zhao-studio/server/src/services/index.ts plugins/zhao-studio/tests/services/sync-event.test.ts && git commit -m "feat(zhao-studio): add sync-event service with resolve and webhook support"
```

---

## Task 6: Sync-Event Controller + Routes（zhao-studio）

**Files:**
- Create: `plugins/zhao-studio/server/src/controllers/sync-event-api.ts`
- Modify: `plugins/zhao-studio/server/src/controllers/index.ts`
- Modify: `plugins/zhao-studio/server/src/routes/content-api.ts`

- [ ] **Step 1: 创建 sync-event-api controller**

创建 `plugins/zhao-studio/server/src/controllers/sync-event-api.ts`:

```ts
export default {
  async list(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").list(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").findOne(ctx.state.siteId, ctx.params.documentId);
  },
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").resolve(
      ctx.state.siteId, ctx.params.documentId, ctx.request.body
    );
  },
  async createFromWebhook(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").createFromWebhook(ctx.request.body);
  },
};
```

- [ ] **Step 2: 注册 controller**

在 `plugins/zhao-studio/server/src/controllers/index.ts` 中:

在 `import statSummary from './stat-summary';` 后添加:
```ts
import syncEventApi from './sync-event-api';
```

在导出对象的 `'stat-summary': statSummary,` 后添加:
```ts
  'sync-event-api': syncEventApi,
```

- [ ] **Step 3: 添加 admin 路由 + webhook 公开路由**

在 `plugins/zhao-studio/server/src/routes/content-api.ts` 的 routes 数组末尾（`adminRoute('GET', '/accounts/:id', 'publish.findOneAccount', 'zhao-studio.read'),` 后）添加:

```ts
    // 同步事件 admin 路由
    adminRoute('GET', '/sync-events', 'sync-event-api.list', 'zhao-studio.read'),
    adminRoute('GET', '/sync-events/:documentId', 'sync-event-api.findOne', 'zhao-studio.read'),
    adminRoute('POST', '/sync-events/:documentId/resolve', 'sync-event-api.resolve', 'zhao-studio.update'),

    // webhook 公开路由（zhao-website → zhao-studio）
    publicRoute('POST', '/webhooks/sync-event', 'sync-event-api.createFromWebhook'),
```

- [ ] **Step 4: 运行全量测试**

```bash
cd E:\code\basic\plugins\zhao-studio && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过

- [ ] **Step 5: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-studio/server/src/controllers/sync-event-api.ts plugins/zhao-studio/server/src/controllers/index.ts plugins/zhao-studio/server/src/routes/content-api.ts && git commit -m "feat(zhao-studio): add sync-event controller, admin routes, and webhook route"
```

---

## Task 7: Permissions（zhao-auth）

**Files:**
- Modify: `plugins/zhao-auth/server/src/permissions.ts`

- [ ] **Step 1: 添加 Brand Voice 权限树节点**

在 `plugins/zhao-auth/server/src/permissions.ts` 的 `PERMISSION_TREE["menu.website-center"].children` 中，在 `"menu.website-first-truth"` 节点之后添加:

```ts
      "menu.website-brand-voice": {
        label: "品牌话术",
        type: "menu",
        children: {
          "brand-voice.read": { label: "查看话术", type: "button" },
          "brand-voice.create": { label: "新增话术", type: "button" },
          "brand-voice.update": { label: "编辑话术", type: "button" },
          "brand-voice.delete": { label: "删除话术", type: "button" },
          "brand-voice.create-global": { label: "新增全局话术", type: "button" },
          "brand-voice.update-global": { label: "编辑全局话术", type: "button" },
          "brand-voice.delete-global": { label: "删除全局话术", type: "button" },
        },
      },
```

- [ ] **Step 2: 添加 Sync-Event 权限树节点**

在 `PERMISSION_TREE["menu.studio-center"].children` 中，在 `"menu.studio-ad"` 节点之后添加:

```ts
      "menu.studio-sync-event": {
        label: "同步事件",
        type: "menu",
        children: {
          "sync-event.read": { label: "查看同步事件", type: "button" },
          "sync-event.update": { label: "处理同步事件", type: "button" },
          "sync-event.manage": { label: "同步事件管理", type: "button" },
        },
      },
```

- [ ] **Step 3: CHANNEL_ADMIN 角色追加 Brand Voice 权限**

在 `DEFAULT_ROLE_PERMISSIONS[ROLES.CHANNEL_ADMIN]` 数组中，在 `"first-truth.create-global", "first-truth.update-global", "first-truth.delete-global",` 后添加:

```ts
    "menu.website-brand-voice", "brand-voice.read", "brand-voice.create", "brand-voice.update", "brand-voice.delete",
    "brand-voice.create-global", "brand-voice.update-global", "brand-voice.delete-global",
```

- [ ] **Step 4: CHANNEL_ADMIN 角色追加 Sync-Event 权限**

CHANNEL_ADMIN 的权限通过 `flattenPermissions(PERMISSION_TREE)` 自动包含 `menu.studio-center` 下的所有节点（因为 `flattenPermissions` 排除的是 `menu.system-center`，不排除 `menu.studio-center`），所以新增的 `menu.studio-sync-event` 及其子权限会自动包含。

验证：在 CHANNEL_ADMIN 数组中确认 `...flattenPermissions(PERMISSION_TREE).filter((k) => !k.startsWith("menu.system-center"))` 已覆盖 studio-center。

- [ ] **Step 5: PLUGIN_MANAGER 角色追加 Brand Voice 权限**

在 `DEFAULT_ROLE_PERMISSIONS[ROLES.PLUGIN_MANAGER]` 数组中，在 `"menu.website-first-truth", "first-truth.read",` 后添加:

```ts
    "menu.website-brand-voice", "brand-voice.read", "brand-voice.create", "brand-voice.update", "brand-voice.delete",
```

- [ ] **Step 6: PLUGIN_MANAGER 角色追加 Sync-Event 权限**

PLUGIN_MANAGER 的 `flattenPermissions` 包含 `menu.studio-center`，所以新增的 `menu.studio-sync-event` 及其子权限会自动包含。

验证：确认 PLUGIN_MANAGER 的 `flattenPermissions` 调用中包含 `"menu.studio-center"`。

- [ ] **Step 7: 确认 WEBSITE_MANAGER / WEBSITE_EDITOR 自动继承**

`WEBSITE_MANAGER` 使用 `centerPermissions("menu.website-center").filter((k: string) => !k.endsWith("-global"))`，新增的 `menu.website-brand-voice` 节点会自动包含，且 `-global` 权限会被 filter 排除。

`WEBSITE_EDITOR` 使用 `centerEditorPermissions("menu.website-center").filter((k: string) => !k.endsWith("-global"))`，同理自动继承并排除全局权限和 delete/manage。

- [ ] **Step 8: 确认 STUDIO_MANAGER / STUDIO_EDITOR 自动继承**

`STUDIO_MANAGER` 使用 `centerPermissions("menu.studio-center")`，新增的 `menu.studio-sync-event` 节点会自动包含。

`STUDIO_EDITOR` 使用 `centerEditorPermissions("menu.studio-center")`，会排除 `sync-event.manage`，保留 `sync-event.read` 和 `sync-event.update`。

- [ ] **Step 9: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-auth/server/src/permissions.ts && git commit -m "feat(zhao-auth): add brand-voice and sync-event permission nodes with role assignments"
```

---

## Task 8: Webhook Trigger + Lifecycle Integration（zhao-website）

**Files:**
- Create: `plugins/zhao-website/server/src/services/utils/sync-event-trigger.ts`
- Modify: `plugins/zhao-website/server/src/content-types/article/lifecycles.ts`

- [ ] **Step 1: 创建 sync-event-trigger 工具**

创建 `plugins/zhao-website/server/src/services/utils/sync-event-trigger.ts`:

```ts
export async function triggerSyncEvent(contentType: string, content: any): Promise<void> {
  const strapi = (global as any).strapi;
  if (!strapi) return;
  if (!content || !content.documentId) return;
  const studioUrl = strapi.plugin("zhao-website")?.config("studioUrl") || "http://localhost:1337/api/zhao-studio";
  const internalKey = strapi.plugin("zhao-website")?.config("internalKey") || "";
  try {
    await fetch(`${studioUrl}/v1/webhooks/sync-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
      body: JSON.stringify({
        sourceContentType: contentType,
        sourceDocumentId: content.documentId,
        sourceUrl: content.slug ? `/articles/${content.slug}` : "",
        sourceTitle: content.title || content.name || "",
        siteId: content.site,
        content: content.content || content.description || "",
      }),
    });
  } catch (err) {
    strapi.log.warn(`[sync-event-trigger] Failed to trigger sync event: ${err}`);
  }
}
```

- [ ] **Step 2: 修改 article lifecycles 集成 webhook 触发**

在 `plugins/zhao-website/server/src/content-types/article/lifecycles.ts` 中:

将:
```ts
import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-article";

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
  },
};
```

替换为:
```ts
import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";
import { triggerSyncEvent } from "../../services/utils/sync-event-trigger";

const TARGET_TYPE = "website-article";

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await triggerSyncEvent("article", event.result).catch(() => {});
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await triggerSyncEvent("article", event.result).catch(() => {});
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
  },
};
```

- [ ] **Step 3: 运行全量测试**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过（triggerSyncEvent 用 .catch(() => {}) 包裹，不影响现有测试）

- [ ] **Step 4: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/services/utils/sync-event-trigger.ts plugins/zhao-website/server/src/content-types/article/lifecycles.ts && git commit -m "feat(zhao-website): add sync-event webhook trigger and integrate into article lifecycle"
```

---

## Task 9: GEO 增强 — brandVoiceRef + Schema Builder + llms.txt（zhao-website）

**Files:**
- Modify: `plugins/zhao-website/server/src/content-types/article/schema.json`
- Modify: `plugins/zhao-website/server/src/services/schema-builder.ts`
- Modify: `plugins/zhao-website/server/src/services/llms-txt.ts`

- [ ] **Step 1: article schema 新增 brandVoiceRef 字段**

在 `plugins/zhao-website/server/src/content-types/article/schema.json` 的 `attributes` 中，在 `"mentionedEntities"` 关系之后、`"structuredData"` 之前添加:

```json
    "brandVoiceRef": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.brand-voice",
      "inversedBy": "articles"
    },
```

- [ ] **Step 2: schema-builder buildArticle 注入 brand**

在 `plugins/zhao-website/server/src/services/schema-builder.ts` 的 `buildArticle` 方法中，在 `return schema;` 之前添加:

```ts
    if (article.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: article.brandVoiceRef.name,
        description: article.brandVoiceRef.content,
      };
    }
```

完整的 `buildArticle` 方法修改后:
```ts
  buildArticle(article: any, brandInfo: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": article.schemaType || "Article",
      headline: article.seoTitle || article.title,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: {
        "@type": "Person",
        name: article.author || brandInfo?.companyName || "",
      },
    };
    if (article.seoDescription) schema.description = article.seoDescription;
    if (article.coverImage) schema.image = article.coverImage.url;
    if (article.canonicalUrl) schema.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": article.canonicalUrl,
    };
    if (brandInfo?.companyName) schema.publisher = {
      "@type": "Organization",
      name: brandInfo.companyName,
    };
    if (article.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: article.brandVoiceRef.name,
        description: article.brandVoiceRef.content,
      };
    }
    return schema;
  },
```

- [ ] **Step 3: llms.txt 新增 Brand Voice 段落**

在 `plugins/zhao-website/server/src/services/llms-txt.ts` 的 `generate` 方法中，在 Facts 段落之后（`return lines.join("\n");` 之前）添加:

```ts
    // 品牌话术
    lines.push("## Brand Voice");
    const voices = await strapi.db.query("plugin::zhao-website.brand-voice").findMany({
      where: { $or: [{ site: siteId, status: true, deletedAt: null }, { site: null, status: true, deletedAt: null }] },
      orderBy: { category: "ASC" },
    });
    for (const v of voices) {
      lines.push(`- [${v.category}] ${v.name}: ${v.content.substring(0, 200)}`);
    }
    lines.push("");
```

- [ ] **Step 4: 运行全量测试**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过

- [ ] **Step 5: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/content-types/article/schema.json plugins/zhao-website/server/src/services/schema-builder.ts plugins/zhao-website/server/src/services/llms-txt.ts && git commit -m "feat(zhao-website): add brandVoiceRef to article, inject brand into JSON-LD and llms.txt"
```

---

## Task 10: zhao-website 前端 API 适配

**Files:**
- Modify: `plugins/zhao-website/admin/src/utils/api.ts`

- [ ] **Step 1: 修正 ADMIN_BASE 和全部路径**

将 `plugins/zhao-website/admin/src/utils/api.ts` 的完整内容替换为:

```ts
const ADMIN_BASE = '/api/zhao-website/v1/admin';
const PUBLIC_BASE = '/api/zhao-website/v1';

export const API = {
  statsOverview: `${ADMIN_BASE}/stats/overview`,
  statsLead: (days = 30) => `${ADMIN_BASE}/stats/leads?days=${days}`,
  statsSearch: (days = 30) => `${ADMIN_BASE}/stats/search?days=${days}`,
  studioBridgePublish: `${ADMIN_BASE}/studio-bridge/publish`,
  // 知识图谱
  kgFindEntities: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/entities?${new URLSearchParams(params).toString()}`,
  kgCreateEntity: `${ADMIN_BASE}/knowledge-graph/entities`,
  kgUpdateEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/${id}`,
  kgDeleteEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/${id}`,
  kgFindRelations: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/relations?${new URLSearchParams(params).toString()}`,
  kgAddRelation: `${ADMIN_BASE}/knowledge-graph/relations`,
  kgDeleteRelation: (id: string) => `${ADMIN_BASE}/knowledge-graph/relations/${id}`,
  kgDisambiguate: `${ADMIN_BASE}/knowledge-graph/disambiguate`,
  kgExportGraph: `${ADMIN_BASE}/knowledge-graph/export`,
  // 全局实体
  kgCreateGlobalEntity: `${ADMIN_BASE}/knowledge-graph/entities/global`,
  kgUpdateGlobalEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/global/${id}`,
  kgDeleteGlobalEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/entities/global/${id}`,
  // 第一真值
  ftFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/first-truths?${new URLSearchParams(params).toString()}`,
  ftFindOne: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftCreate: `${ADMIN_BASE}/first-truths`,
  ftUpdate: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftDelete: (id: string) => `${ADMIN_BASE}/first-truths/${id}`,
  ftVerify: (id: string) => `${ADMIN_BASE}/first-truths/${id}/verify`,
  ftConflicts: `${ADMIN_BASE}/first-truths/conflicts`,
  ftExportFacts: `${ADMIN_BASE}/first-truths/export`,
  // 全局真值
  ftCreateGlobal: `${ADMIN_BASE}/first-truths/global`,
  ftUpdateGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}`,
  ftDeleteGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}`,
  ftVerifyGlobal: (id: string) => `${ADMIN_BASE}/first-truths/global/${id}/verify`,
  // 品牌话术
  bvFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/brand-voices?${new URLSearchParams(params).toString()}`,
  bvFindOne: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvCreate: `${ADMIN_BASE}/brand-voices`,
  bvUpdate: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvDelete: (id: string) => `${ADMIN_BASE}/brand-voices/${id}`,
  bvResolve: (id: string) => `${ADMIN_BASE}/brand-voices/${id}/resolve`,
  bvListByCategory: (category: string) => `${ADMIN_BASE}/brand-voices/by-category/${category}`,
  // 全局品牌话术
  bvCreateGlobal: `${ADMIN_BASE}/brand-voices/global`,
  bvUpdateGlobal: (id: string) => `${ADMIN_BASE}/brand-voices/global/${id}`,
  bvDeleteGlobal: (id: string) => `${ADMIN_BASE}/brand-voices/global/${id}`,
  // AI 摘要
  aiFindByTarget: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/ai-summaries?${new URLSearchParams(params).toString()}`,
  aiCreate: `${ADMIN_BASE}/ai-summaries`,
  aiUpdate: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}`,
  aiDelete: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}`,
  aiRegenerate: (id: string) => `${ADMIN_BASE}/ai-summaries/${id}/regenerate`,
  // SEO 公开路由
  seoSitemap: `${PUBLIC_BASE}/sitemap.xml`,
  seoRobots: `${PUBLIC_BASE}/robots.txt`,
  seoLlmsTxt: `${PUBLIC_BASE}/llms.txt`,
};
```

- [ ] **Step 2: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0（无类型错误）

- [ ] **Step 3: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/admin/src/utils/api.ts && git commit -m "fix(zhao-website): align admin API paths to RESTful /v1/admin routes, add brand-voice and global constants"
```

---

## Task 11: zhao-studio 前端 API 适配 + Hooks 修复

**Files:**
- Modify: `plugins/zhao-studio/admin/src/utils/collectApi.ts`
- Modify: `plugins/zhao-studio/admin/src/utils/publishApi.ts`
- Modify: `plugins/zhao-studio/admin/src/utils/aiApi.ts`
- Modify: `plugins/zhao-studio/admin/src/utils/analyticsApi.ts`
- Create: `plugins/zhao-studio/admin/src/utils/syncEventApi.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useCollectSources.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useCollectTasks.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useAdSlots.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useStats.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useAIConfig.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/useAIActions.ts`
- Modify: `plugins/zhao-studio/admin/src/hooks/usePublishActions.ts`

- [ ] **Step 1: 修正 collectApi.ts baseUrl**

在 `plugins/zhao-studio/admin/src/utils/collectApi.ts` 中，将:
```ts
import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}`;
```
替换为:
```ts
const baseUrl = '/api/zhao-studio/v1/admin';
```

同时移除文件中所有 `import pluginId from '../pluginId';` 行（如果 collectApi.ts 不再使用 pluginId）。

- [ ] **Step 2: 修正 publishApi.ts baseUrl**

在 `plugins/zhao-studio/admin/src/utils/publishApi.ts` 中，将:
```ts
import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}`;
```
替换为:
```ts
const baseUrl = '/api/zhao-studio/v1/admin';
```

- [ ] **Step 3: 修正 aiApi.ts baseUrl**

在 `plugins/zhao-studio/admin/src/utils/aiApi.ts` 中，将:
```ts
import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}`;
```
替换为:
```ts
const baseUrl = '/api/zhao-studio/v1/admin';
```

- [ ] **Step 4: 修正 analyticsApi.ts baseUrl**

在 `plugins/zhao-studio/admin/src/utils/analyticsApi.ts` 中，将:
```ts
import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}`;
```
替换为:
```ts
const baseUrl = '/api/zhao-studio/v1/admin';
```

- [ ] **Step 5: 创建 syncEventApi.ts**

创建 `plugins/zhao-studio/admin/src/utils/syncEventApi.ts`:

```ts
const baseUrl = '/api/zhao-studio/v1/admin';

export const syncEventApi = {
  async list(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/sync-events${query ? '?' + query : ''}`);
    return response.json();
  },

  async findOne(documentId: string) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}`);
    return response.json();
  },

  async resolve(documentId: string, body: any) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  },
};
```

- [ ] **Step 6: 修正所有 hooks 中 response.data → response**

对以下每个 hooks 文件，将 `response.data || []` 改为直接使用 `response`，将 `response.data` 改为 `response`。

涉及文件列表（每个文件的操作相同）:
- `useCollectSources.ts` — `setSources(response.data || [])` → `setSources(response || [])`；`return response.data` → `return response`
- `useCollectTasks.ts` — 同上模式
- `usePublishAccounts.ts` — 同上模式
- `usePublishPlatforms.ts` — 同上模式
- `usePublishRecords.ts` — 同上模式
- `useAdSlots.ts` — 同上模式
- `useStats.ts` — 同上模式
- `useAIConfig.ts` — 同上模式
- `useAIActions.ts` — 同上模式
- `usePublishActions.ts` — 同上模式

对每个文件，执行以下替换:
- `response.data || []` → `response || []`
- `response.data` → `response`

以 `useCollectSources.ts` 为例，将:
```ts
    const response = await collectApi.getSources();
    setSources(response.data || []);
```
替换为:
```ts
    const response = await collectApi.getSources();
    setSources(response || []);
```

以及将:
```ts
      const response = await collectApi.createSource(data);
      await fetchSources();
      return response.data;
```
替换为:
```ts
      const response = await collectApi.createSource(data);
      await fetchSources();
      return response;
```

对其余 9 个 hooks 文件重复相同的模式替换。

- [ ] **Step 7: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-studio && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 8: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-studio/admin/src/utils/ plugins/zhao-studio/admin/src/hooks/ && git commit -m "fix(zhao-studio): align API baseUrl to /v1/admin, fix hooks response unwrapping, add syncEventApi"
```

---

## Task 12: BrandVoicePage 前端页面（zhao-website）

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx`

- [ ] **Step 1: 创建 BrandVoicePage.tsx**

创建 `plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message } from 'antd';
import { PlusOutlined, GlobalOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { API } from '../utils/api';

const { Option } = Select;
const { TextArea } = Input;

const CATEGORIES = ['tone', 'style', 'phrase', 'disclaimer', 'cta'];
const CATEGORY_LABELS: Record<string, string> = {
  tone: '语气', style: '风格', phrase: '话术', disclaimer: '免责声明', cta: '行动号召',
};

export default function BrandVoicePage() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<boolean>();
  const [form] = Form.useForm();

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus !== undefined) params.status = filterStatus;
      const response = await fetch(API.bvFind(params));
      const data = await response.json();
      setVoices(data || []);
    } catch (err) {
      message.error('加载品牌话术失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVoices(); }, []);

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setModalOpen(true);
  };

  const handleCreateGlobal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setGlobalModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(record.site === null ? false : true);
    setGlobalModalOpen(record.site === null ? true : false);
  };

  const handleDelete = async (record: any) => {
    const url = record.site === null ? API.bvDeleteGlobal(record.documentId) : API.bvDelete(record.documentId);
    await fetch(url, { method: 'DELETE' });
    message.success('删除成功');
    fetchVoices();
  };

  const handleSave = async (isGlobal: boolean) => {
    const values = await form.validateFields();
    const isEdit = !!editing;
    let url: string;
    let method: string;
    if (isGlobal) {
      if (isEdit) { url = API.bvUpdateGlobal(editing.documentId); method = 'PUT'; }
      else { url = API.bvCreateGlobal; method = 'POST'; }
    } else {
      if (isEdit) { url = API.bvUpdate(editing.documentId); method = 'PUT'; }
      else { url = API.bvCreate; method = 'POST'; }
    }
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    message.success('保存成功');
    setModalOpen(false);
    setGlobalModalOpen(false);
    fetchVoices();
  };

  const handlePreview = async (record: any) => {
    const response = await fetch(API.bvResolve(record.documentId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: {} }),
    });
    const text = await response.json();
    setPreviewText(text);
    setPreviewOpen(true);
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类目', dataIndex: 'category', key: 'category',
      render: (cat: string) => <Tag>{CATEGORY_LABELS[cat] || cat}</Tag>,
    },
    {
      title: '层级', dataIndex: 'site', key: 'site',
      render: (site: any) => site === null ? <Tag color="blue">全局</Tag> : <Tag>租户</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: boolean) => <Switch checked={status} disabled />,
    },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (tags: any) => Array.isArray(tags) ? tags.join(', ') : '' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  const formContent = (
    <>
      <Form.Item name="name" label="名称" rules={[{ required: true }]}>
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="category" label="类目" rules={[{ required: true }]}>
        <Select>
          {CATEGORIES.map(c => <Option key={c} value={c}>{CATEGORY_LABELS[c]}</Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="content" label="内容模板" rules={[{ required: true }]}
        extra="支持 {{variable}} 占位符">
        <TextArea rows={6} />
      </Form.Item>
      <Form.Item name="variables" label="变量定义"
        extra='JSON 格式: [{"name":"var","description":"desc","defaultValue":"val"}]'>
        <TextArea rows={3} />
      </Form.Item>
      <Form.Item name="tags" label="标签"
        extra='JSON 数组格式: ["tag1","tag2"]'>
        <Input />
      </Form.Item>
      <Form.Item name="status" label="启用" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );

  return (
    <Card title="品牌话术管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选类目"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => { setFilterCategory(v); }}
        >
          {CATEGORIES.map(c => <Option key={c} value={c}>{CATEGORY_LABELS[c]}</Option>)}
        </Select>
        <Switch
          checkedChildren="启用" unCheckedChildren="全部"
          onChange={(v) => { setFilterStatus(v); }}
        />
        <Button onClick={fetchVoices}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建话术</Button>
        <Button icon={<GlobalOutlined />} onClick={handleCreateGlobal}>新建全局话术</Button>
      </Space>
      <Table columns={columns} dataSource={voices} rowKey="documentId" loading={loading} />
      <Modal title={editing ? '编辑话术' : '新建话术'} open={modalOpen}
        onOk={() => handleSave(false)} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">{formContent}</Form>
      </Modal>
      <Modal title={editing ? '编辑全局话术' : '新建全局话术'} open={globalModalOpen}
        onOk={() => handleSave(true)} onCancel={() => setGlobalModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">{formContent}</Form>
      </Modal>
      <Modal title="变量预览" open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{previewText}</pre>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 3: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx && git commit -m "feat(zhao-website): add BrandVoicePage with CRUD, global management, and variable preview"
```

---

## Task 13: KnowledgeGraphPage 全局实体管理 UI（zhao-website）

**Files:**
- Modify: `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx`

- [ ] **Step 0: 适配现有 fetch 调用为函数式 API**

由于 Task 10 将 `api.ts` 中多个常量从字符串改为函数形式（如 `kgFindEntities` 从字符串变为 `(params) => string`），需要更新 KnowledgeGraphPage 中所有现有 fetch 调用。

对以下调用逐一修改（将字符串常量改为函数调用）：

```ts
// fetchEntities 中：
// 旧：const res = await fetch(API.kgFindEntities);
// 新：const res = await fetch(API.kgFindEntities({ page: currentPage, pageSize: 20 }));

// fetchRelations 中：
// 旧：const res = await fetch(API.kgFindRelations);
// 新：const res = await fetch(API.kgFindRelations({ page: 1, pageSize: 50 }));

// handleCreateEntity 中：
// 旧：await fetch(API.kgCreateEntity, { method: 'POST', ... });
// 新：await fetch(API.kgCreateEntity, { method: 'POST', ... });
// （kgCreateEntity 仍是字符串，不需要改）

// handleDeleteEntity 中：
// 旧：await fetch(API.kgDeleteEntity(id), { method: 'DELETE' });
// 新：await fetch(API.kgDeleteEntity(id), { method: 'DELETE' });
// （kgDeleteEntity 仍是函数，不需要改）

// handleAddRelation 中：
// 旧：await fetch(API.kgAddRelation, { method: 'POST', ... });
// 新：await fetch(API.kgAddRelation, { method: 'POST', ... });
// （kgAddRelation 仍是字符串，不需要改）

// handleExport 中：
// 旧：await fetch(API.kgExportGraph);
// 新：await fetch(API.kgExportGraph);
// （kgExportGraph 仍是字符串，不需要改）

// handleDisambiguate 中：
// 旧：await fetch(API.kgDisambiguate, { method: 'POST', ... });
// 新：await fetch(API.kgDisambiguate, { method: 'POST', ... });
// （kgDisambiguate 仍是字符串，不需要改）
```

> 注意：Task 10 中 `kgFindEntities` 和 `kgFindRelations` 从字符串改为函数，其他常量保持字符串形式。只需修改这两个函数化常量的调用方式。确保 `fetchEntities` 和 `fetchRelations` 中的调用从 `fetch(API.kgFindEntities)` 改为 `fetch(API.kgFindEntities({ page: 1, pageSize: 20 }))` 和 `fetch(API.kgFindRelations({ page: 1, pageSize: 50 }))`。

- [ ] **Step 1: 新增「层级」列**

在 KnowledgeGraphPage.tsx 的实体 Table columns 中，在 `name` 列之后添加:

```tsx
{
  title: '层级', dataIndex: 'site', key: 'site',
  render: (site: any) => site === null ? <Tag color="blue">全局</Tag> : <Tag>租户</Tag>,
},
```

- [ ] **Step 2: 新增「新建全局实体」按钮**

在页面顶部按钮区，在「新建实体」按钮之后添加:

```tsx
<Button icon={<GlobalOutlined />} onClick={handleCreateGlobalEntity}>新建全局实体</Button>
```

- [ ] **Step 3: 全局实体操作列**

在操作列中，对 `site === null` 的实体，使用全局 API:
- 编辑：调用 `API.kgUpdateGlobalEntity(id)`
- 删除：调用 `API.kgDeleteGlobalEntity(id)`

在 handleCreate、handleEdit、handleDelete 方法中添加全局/租户的分支逻辑:

```tsx
const handleCreateGlobalEntity = () => {
  setEditing(null);
  setGlobalMode(true);
  form.resetFields();
  setModalOpen(true);
};

const handleEdit = (record: any) => {
  setEditing(record);
  setGlobalMode(record.site === null);
  form.setFieldsValue(record);
  setModalOpen(true);
};

const handleDelete = async (record: any) => {
  const url = record.site === null
    ? API.kgDeleteGlobalEntity(record.documentId)
    : API.kgDeleteEntity(record.documentId);
  await fetch(url, { method: 'DELETE' });
  message.success('删除成功');
  fetchEntities();
};

const handleSave = async () => {
  const values = await form.validateFields();
  const isEdit = !!editing;
  let url: string;
  let method: string;
  if (globalMode) {
    if (isEdit) { url = API.kgUpdateGlobalEntity(editing.documentId); method = 'PUT'; }
    else { url = API.kgCreateGlobalEntity; method = 'POST'; }
  } else {
    if (isEdit) { url = API.kgUpdateEntity(editing.documentId); method = 'PUT'; }
    else { url = API.kgCreateEntity; method = 'POST'; }
  }
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  message.success('保存成功');
  setModalOpen(false);
  fetchEntities();
};
```

> 注意：需要添加 `const [globalMode, setGlobalMode] = useState(false);` 状态声明，并确保 `GlobalOutlined` 已导入。

- [ ] **Step 4: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 5: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx && git commit -m "feat(zhao-website): add global entity management UI to KnowledgeGraphPage"
```

---

## Task 14: FirstTruthPage 全局真值管理 UI（zhao-website）

**Files:**
- Modify: `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx`

- [ ] **Step 0: 适配现有 fetch 调用为函数式 API**

由于 Task 10 将 `api.ts` 中 `ftFind` 从字符串改为函数形式，需要更新 FirstTruthPage 中的 fetch 调用：

```ts
// fetchTruths 中：
// 旧：const res = await fetch(API.ftFind);
// 新：const res = await fetch(API.ftFind({ page: 1, pageSize: 20 }));
```

> 注意：Task 10 中只有 `ftFind` 改为函数，其他 ft 常量（ftCreate、ftUpdate 等）保持字符串形式。只需修改 `fetchTruths` 中的 `ftFind` 调用。

- [ ] **Step 1: 真值列表新增「层级」列**

在 FirstTruthPage.tsx 的真值 Table columns 中，在 `claim` 列之后添加:

```tsx
{
  title: '层级', dataIndex: 'site', key: 'site',
  render: (site: any) => site === null ? <Tag color="blue">全局</Tag> : <Tag>租户</Tag>,
},
```

- [ ] **Step 2: 新增「新建全局真值」按钮**

在页面顶部按钮区，在「新建真值」按钮之后添加:

```tsx
<Button icon={<GlobalOutlined />} onClick={handleCreateGlobal}>新建全局真值</Button>
```

- [ ] **Step 3: 全局真值操作列**

在操作列中，对 `site === null` 的真值，使用全局 API:
- 编辑：调用 `API.ftUpdateGlobal(id)`
- 删除：调用 `API.ftDeleteGlobal(id)`
- verify：调用 `API.ftVerifyGlobal(id)`

在 handleCreate、handleEdit、handleDelete、handleVerify 方法中添加全局/租户的分支逻辑:

```tsx
const handleCreateGlobal = () => {
  setEditing(null);
  setGlobalMode(true);
  form.resetFields();
  setModalOpen(true);
};

const handleEdit = (record: any) => {
  setEditing(record);
  setGlobalMode(record.site === null);
  form.setFieldsValue(record);
  setModalOpen(true);
};

const handleDelete = async (record: any) => {
  const url = record.site === null
    ? API.ftDeleteGlobal(record.documentId)
    : API.ftDelete(record.documentId);
  await fetch(url, { method: 'DELETE' });
  message.success('删除成功');
  fetchTruths();
};

const handleVerify = async (record: any) => {
  const url = record.site === null
    ? API.ftVerifyGlobal(record.documentId)
    : API.ftVerify(record.documentId);
  await fetch(url, { method: 'POST' });
  message.success('验证成功');
  fetchTruths();
};

const handleSave = async () => {
  const values = await form.validateFields();
  const isEdit = !!editing;
  let url: string;
  let method: string;
  if (globalMode) {
    if (isEdit) { url = API.ftUpdateGlobal(editing.documentId); method = 'PUT'; }
    else { url = API.ftCreateGlobal; method = 'POST'; }
  } else {
    if (isEdit) { url = API.ftUpdate(editing.documentId); method = 'PUT'; }
    else { url = API.ftCreate; method = 'POST'; }
  }
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  message.success('保存成功');
  setModalOpen(false);
  fetchTruths();
};
```

> 注意：需要添加 `const [globalMode, setGlobalMode] = useState(false);` 状态声明，并确保 `GlobalOutlined` 已导入。

- [ ] **Step 4: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 5: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx && git commit -m "feat(zhao-website): add global truth management UI to FirstTruthPage"
```

---

## Task 15: SyncEventPage 前端页面（zhao-studio）

**Files:**
- Create: `plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx`

- [ ] **Step 1: 创建 SyncEventPage.tsx**

创建 `plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Tag, Space, Select, Radio, message, Descriptions } from 'antd';
import { CheckOutlined, EyeOutlined } from '@ant-design/icons';
import { syncEventApi } from '../utils/syncEventApi';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  resolved: 'green',
  ignored: 'default',
};
const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  resolved: '已处理',
  ignored: '已忽略',
};

export default function SyncEventPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [action, setAction] = useState<'create' | 'update' | 'ignore'>('create');
  const [draftId, setDraftId] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<string>();
  const [filterContentType, setFilterContentType] = useState<string>();
  const [drafts, setDrafts] = useState<any[]>([]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterStatus) params.eventStatus = filterStatus;
      if (filterContentType) params.sourceContentType = filterContentType;
      const data = await syncEventApi.list(params);
      setEvents(data || []);
    } catch (err) {
      message.error('加载同步事件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleResolve = async (record: any) => {
    setCurrentEvent(record);
    setAction('create');
    setDraftId(undefined);
    // 获取草稿列表
    try {
      const res = await fetch('/api/zhao-studio/v1/admin/article-drafts?status=draft');
      const data = await res.json();
      setDrafts(data || []);
    } catch (err) {
      setDrafts([]);
    }
    setResolveModalOpen(true);
  };

  const handleView = (record: any) => {
    setCurrentEvent(record);
    setDetailModalOpen(true);
  };

  const handleConfirmResolve = async () => {
    const body: any = { action, resolvedBy: 'admin' };
    if (action === 'update' && draftId) body.draftId = draftId;
    await syncEventApi.resolve(currentEvent.documentId, body);
    message.success('处理成功');
    setResolveModalOpen(false);
    fetchEvents();
  };

  const columns = [
    { title: '来源标题', dataIndex: 'sourceTitle', key: 'sourceTitle', ellipsis: true },
    { title: '内容类型', dataIndex: 'sourceContentType', key: 'sourceContentType' },
    {
      title: '状态', dataIndex: 'eventStatus', key: 'eventStatus',
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Tag>,
    },
    {
      title: '关联草稿', dataIndex: 'targetDraftId', key: 'targetDraftId',
      render: (draft: any) => draft ? draft.title || draft.documentId : '-',
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.eventStatus === 'pending' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleResolve(record)}>处理</Button>
          )}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="同步事件管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选状态"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => { setFilterStatus(v); }}
        >
          <Option value="pending">待处理</Option>
          <Option value="resolved">已处理</Option>
          <Option value="ignored">已忽略</Option>
        </Select>
        <Select
          placeholder="筛选内容类型"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => { setFilterContentType(v); }}
        >
          <Option value="article">文章</Option>
          <Option value="product">产品</Option>
          <Option value="case">案例</Option>
          <Option value="faq">FAQ</Option>
        </Select>
        <Button onClick={fetchEvents}>查询</Button>
      </Space>
      <Table columns={columns} dataSource={events} rowKey="documentId" loading={loading} />
      <Modal title="处理同步事件" open={resolveModalOpen}
        onOk={handleConfirmResolve} onCancel={() => setResolveModalOpen(false)}>
        {currentEvent && (
          <div>
            <p><strong>来源标题：</strong>{currentEvent.sourceTitle}</p>
            <p><strong>内容类型：</strong>{currentEvent.sourceContentType}</p>
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)} style={{ marginTop: 16 }}>
              <Space direction="vertical">
                <Radio value="create">新建草稿</Radio>
                <Radio value="update">更新已有草稿</Radio>
                <Radio value="ignore">忽略</Radio>
              </Space>
            </Radio.Group>
            {action === 'update' && (
              <Select
                placeholder="选择草稿"
                style={{ width: '100%', marginTop: 8 }}
                onChange={(v) => setDraftId(v)}
              >
                {drafts.map((d: any) => (
                  <Option key={d.documentId} value={d.documentId}>{d.title}</Option>
                ))}
              </Select>
            )}
          </div>
        )}
      </Modal>
      <Modal title="同步事件详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null}>
        {currentEvent && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="来源标题">{currentEvent.sourceTitle}</Descriptions.Item>
            <Descriptions.Item label="内容类型">{currentEvent.sourceContentType}</Descriptions.Item>
            <Descriptions.Item label="来源 URL">{currentEvent.sourceUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{STATUS_LABELS[currentEvent.eventStatus] || currentEvent.eventStatus}</Descriptions.Item>
            <Descriptions.Item label="处理人">{currentEvent.resolvedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="处理时间">{currentEvent.resolvedAt || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联草稿">{currentEvent.targetDraftId?.title || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-studio && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 3: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx && git commit -m "feat(zhao-studio): add SyncEventPage with list, resolve, and detail view"
```

---

## Task 16: 路由注册 + 侧边栏菜单

**Files:**
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`
- Modify: `plugins/zhao-website/admin/src/components/PluginLayout.tsx`
- Modify: `plugins/zhao-studio/admin/src/pages/App.tsx`
- Modify: `plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx`

- [ ] **Step 1: zhao-website App.tsx 新增路由**

在 `plugins/zhao-website/admin/src/pages/App.tsx` 中:

在 `import SEOOutputPage from './SEOOutputPage';` 后添加:
```tsx
import BrandVoicePage from './BrandVoicePage';
```

在 `<Route path="/seo-output" element={<SEOOutputPage />} />` 后添加:
```tsx
        <Route path="/brand-voice" element={<BrandVoicePage />} />
```

- [ ] **Step 2: zhao-website PluginLayout.tsx 新增菜单项**

在 `plugins/zhao-website/admin/src/components/PluginLayout.tsx` 中:

在 import 的 icons 中添加 `MessageOutlined`:
```tsx
import {
  DashboardOutlined,
  RocketOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
  MessageOutlined,
} from '@ant-design/icons';
```

在 menuItems 数组中，在 `{ key: 'seo-output', ... }` 之前添加:
```tsx
  { key: 'brand-voice', icon: <MessageOutlined />, label: '品牌话术' },
```

- [ ] **Step 3: zhao-studio App.tsx 新增路由**

在 `plugins/zhao-studio/admin/src/pages/App.tsx` 中:

在 `import StatsProPage from './StatsProPage';` 后添加:
```tsx
import SyncEventPage from './SyncEventPage';
```

在 `<Route path="/stats/pro" element={<StatsProPage />} />` 后添加:
```tsx
        <Route path="/sync-events" element={<SyncEventPage />} />
```

- [ ] **Step 4: zhao-studio PluginLayout.tsx 新增菜单项**

在 `plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx` 中:

在 import 的 icons 中添加 `SyncOutlined`:
```tsx
import {
  HomeOutlined,
  CloudDownloadOutlined,
  SendOutlined,
  SettingOutlined,
  BarChartOutlined,
  RobotOutlined,
  SyncOutlined,
} from '@ant-design/icons';
```

在 menuItems 数组中，在 `{ key: 'ai-config', ... }` 之前添加:
```tsx
  { key: 'sync-events', icon: <SyncOutlined />, label: '同步事件' },
```

- [ ] **Step 5: TypeScript 类型检查**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
cd E:\code\basic\plugins\zhao-studio && npx tsc --noEmit -p admin/tsconfig.json
```

预期：两个插件退出码均为 0

- [ ] **Step 6: 提交**

```bash
cd E:\code\basic && git add plugins/zhao-website/admin/src/pages/App.tsx plugins/zhao-website/admin/src/components/PluginLayout.tsx plugins/zhao-studio/admin/src/pages/App.tsx plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx && git commit -m "feat: add brand-voice and sync-events routes and sidebar menu items"
```

---

## Task 17: 构建 + 最终验证

**Files:** None（验证 only）

- [ ] **Step 1: zhao-website 全量测试通过**

```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过（包括 brand-voice 测试）

- [ ] **Step 2: zhao-studio 全量测试通过**

```bash
cd E:\code\basic\plugins\zhao-studio && npx jest --no-coverage --config tests/jest.config.ts
```

预期：所有测试通过（包括 sync-event 测试）

- [ ] **Step 3: 两个插件 TypeScript 检查通过**

```bash
cd E:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json
cd E:\code\basic\plugins\zhao-studio && npx tsc --noEmit -p admin/tsconfig.json
```

预期：退出码 0

- [ ] **Step 4: 两个插件构建通过**

```bash
cd E:\code\basic\plugins\zhao-website && npm run build
cd E:\code\basic\plugins\zhao-studio && npm run build
```

预期：构建成功，dist/ 更新

- [ ] **Step 5: 提交 dist（如未被 .gitignore 忽略）**

```bash
cd E:\code\basic
git check-ignore plugins/zhao-website/dist/server/index.js
git check-ignore plugins/zhao-studio/dist/server/index.js
```

若未被忽略，则提交:
```bash
git add plugins/zhao-website/dist plugins/zhao-studio/dist
git commit -m "build: rebuild dist for brand-voice and sync-event"
```

- [ ] **Step 6: 验证 git 状态干净**

```bash
cd E:\code\basic && git status
```

预期：Working tree clean

---

## 验收清单

构建完成后，重启 Strapi，按以下清单验证：

### A. Brand Voice 后端
- [ ] `brand-voice` CT schema 正确注册，`site` 允许 null（全局层），关联 `plugin::zhao-common.site-config`
- [ ] Brand Voice 10 条 admin 路由可访问，权限校验生效
- [ ] Brand Voice 2 条公开路由可访问（`/api/zhao-website/v1/brand-voices`）
- [ ] `$or` 合并查询返回全局+租户话术
- [ ] `findOneAdmin` 两步查询：租户优先，全局 fallback
- [ ] `resolveVariables` 正确替换 `{{variable}}` 占位符
- [ ] 全局话术 CRUD（createGlobal/updateGlobal/deleteGlobal）正常

### B. Sync-Event 后端
- [ ] `sync-event` CT schema 正确注册，`targetDraftId` 关联 `plugin::zhao-studio.article-draft`
- [ ] Sync-Event 3 条 admin 路由可访问，权限校验生效
- [ ] webhook 路由可访问（`/api/zhao-studio/v1/webhooks/sync-event`）
- [ ] `resolve` 的 create/update/ignore 三种 action 正常
- [ ] `createFromWebhook` 正确创建 pending 事件

### C. Webhook 集成
- [ ] zhao-website article 创建后触发 webhook
- [ ] zhao-website article 更新后触发 webhook
- [ ] zhao-studio 接收到 webhook 后创建 pending sync-event

### D. GEO 增强
- [ ] `article` CT 新增 `brandVoiceRef` relation 字段
- [ ] `schema-builder.ts` buildArticle 注入 brand JSON-LD
- [ ] `llms.txt` 输出包含 Brand Voice 段落

### E. 权限
- [ ] CHANNEL_ADMIN 拥有 brand-voice 全部权限（含 global）
- [ ] CHANNEL_ADMIN 拥有 sync-event 全部权限
- [ ] PLUGIN_MANAGER 拥有 brand-voice 读写权限（不含 global）
- [ ] PLUGIN_MANAGER 拥有 sync-event 读写权限
- [ ] WEBSITE_MANAGER 自动继承 brand-voice 读写权限（排除 global）
- [ ] WEBSITE_EDITOR 自动继承 brand-voice 只读权限
- [ ] STUDIO_MANAGER 自动继承 sync-event 全部权限
- [ ] STUDIO_EDITOR 自动继承 sync-event 只读 + update

### F. 前端 API 适配
- [ ] `zhao-website` 前端 `api.ts` ADMIN_BASE 为 `/api/zhao-website/v1/admin`
- [ ] `zhao-website` 前端知识图谱路径对齐 RESTful（`/knowledge-graph/entities`）
- [ ] `zhao-website` 前端第一真值路径对齐 RESTful（`/first-truths`）
- [ ] `zhao-website` 前端新增 brand-voice 和 global 常量
- [ ] `zhao-studio` 前端所有 `*Api.ts` 的 baseUrl 为 `/api/zhao-studio/v1/admin`
- [ ] `zhao-studio` hooks 从 `response.data` 改为直接使用 `response`

### G. 前端页面
- [ ] BrandVoicePage 可渲染，话术 CRUD 正常
- [ ] BrandVoicePage 全局话术管理按钮可见（CHANNEL_ADMIN）
- [ ] BrandVoicePage 变量预览功能正常
- [ ] KnowledgeGraphPage 全局实体管理按钮可见（CHANNEL_ADMIN）
- [ ] KnowledgeGraphPage 实体 Table 显示「层级」列
- [ ] FirstTruthPage 全局真值管理按钮可见（CHANNEL_ADMIN）
- [ ] FirstTruthPage 真值列表显示「层级」列
- [ ] SyncEventPage 可渲染，事件列表加载正常
- [ ] SyncEventPage 处理流程正常（create/update/ignore）

### H. 路由 + 菜单
- [ ] zhao-website 侧边栏出现「品牌话术」
- [ ] zhao-studio 侧边栏出现「同步事件」
- [ ] 路由 `/plugins/zhao-website/brand-voice` 可访问
- [ ] 路由 `/plugins/zhao-studio/sync-events` 可访问

### I. 构建
- [ ] 两个插件 `npx tsc --noEmit -p admin/tsconfig.json` 退出码 0
- [ ] 两个插件 `npm test` 后端测试全通过
- [ ] 两个插件 `npm run build` dist 重新生成
- [ ] git 状态干净

---

## 不做的事

- 不为 Brand Voice / Sync-Event 做前端单元测试（无 Jest 配置）
- 不修改 zhao-studio 后端路由的 `type`（保持 `content-api` 类型）
- 不修改 zhao-website 后端路由的 `type`（保持 `content-api` 类型，admin 路由混入其中）
- 不做 C 端前端（dsite/shao）的 API 适配
- 不做 Brand Voice 的 AI 自动生成（仅模板管理 + 手动变量替换）
- 不做 Sync-Event 的自动处理（仅手动处理流程）
- 不为 product/case/faq 等其他 CT 添加 brandVoiceRef（仅 article，后续按需扩展）
- 不做 webhook 鉴权的完整实现（仅 x-internal-key header 传递，鉴权逻辑留给后续）
