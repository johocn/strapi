# Cross-Tenant Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global knowledge layer (site=null) to knowledge-entity and first-truth-policy, enabling cross-tenant sharing for GEO content.

**Architecture:** Reuse existing CTs with site field changed to nullable. Queries auto-merge global+tenant results via $or. Global write operations use separate routes with -global permission actions. Route paths renamed from /kg/ to /knowledge-graph/.

**Tech Stack:** Strapi 5, TypeScript, Jest

---

## File Structure

### Modified Files
| Path | Change |
|------|--------|
| `plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json` | site.required: true → false |
| `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json` | site.required: true → false |
| `plugins/zhao-website/server/src/services/knowledge-graph.ts` | Query methods use $or merge or two-step; signatures number → number|null |
| `plugins/zhao-website/server/src/services/first-truth.ts` | Query methods use $or merge or two-step; signatures number → number|null |
| `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts` | Add 3 global controller methods |
| `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts` | Add 4 global controller methods |
| `plugins/zhao-website/server/src/routes/admin-api.ts` | /kg/ → /knowledge-graph/; add 7 global routes |
| `plugins/zhao-auth/server/src/permissions.ts` | Add 6 global permission actions; CHANNEL_ADMIN hardcoded; WEBSITE_MANAGER/EDITOR filter |

### New Files
| Path | Responsibility |
|------|----------------|
| `plugins/zhao-website/tests/services/knowledge-graph-global.test.ts` | Global entity service tests |
| `plugins/zhao-website/tests/services/first-truth-global.test.ts` | Global truth service tests |

---

### Task 1: Schema Modification — site field nullable

**Files:**
- Modify: `plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`

- [ ] **Step 1: Modify knowledge-entity schema**

Read `plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json`. Find the `site` field and change `"required": true` to `"required": false`. If `required` is not present, no change needed (field is already optional).

The site field looks like:
```json
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "required": true,
  "inversedBy": "website_knowledge_entities"
}
```

Change to:
```json
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "required": false,
  "inversedBy": "website_knowledge_entities"
}
```

- [ ] **Step 2: Modify first-truth-policy schema**

Read `plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`. Find the `site` field and change `"required": true` to `"required": false`.

- [ ] **Step 3: Run content-types tests**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/content-types.test.ts --no-coverage --config tests/jest.config.ts
```
Expected: All tests pass (the test checks CT count and site/deletedAt presence, not required flag)

- [ ] **Step 4: Commit**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json && git commit -m "feat(knowledge-base): make site field nullable for global layer"
```

---

### Task 2: knowledge-graph Service — Query Merge + Signature Changes

**Files:**
- Modify: `plugins/zhao-website/server/src/services/knowledge-graph.ts`
- Create: `plugins/zhao-website/tests/services/knowledge-graph-global.test.ts`

- [ ] **Step 1: Write failing tests for global query merge**

Create `plugins/zhao-website/tests/services/knowledge-graph-global.test.ts`:

```ts
import kgServiceFactory from "../../server/src/services/knowledge-graph";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("Knowledge Graph Global Layer", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = kgServiceFactory({ strapi: mockStrapi });
  });

  test("findEntities uses $or to merge global and tenant entities", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, name: "Global AI", site: null },
      { id: 2, name: "Tenant AI", site: 1 },
    ]);

    const result = await service.findEntities(1, {});

    expect(result).toHaveLength(2);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null },
            { site: null, deletedAt: null },
          ],
        }),
      })
    );
  });

  test("findEntityBySlug returns tenant entity first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    // First call (tenant) returns null, second call (global) returns entity
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, name: "Global AI", slug: "ai", site: null });

    const result = await service.findEntityBySlug(1, "ai");

    expect(result).toEqual({ id: 1, name: "Global AI", slug: "ai", site: null });
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
    // First call: tenant
    expect(queryMock.findOne).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        where: expect.objectContaining({ site: 1, slug: "ai" }),
      })
    );
    // Second call: global
    expect(queryMock.findOne).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        where: expect.objectContaining({ site: null, slug: "ai" }),
      })
    );
  });

  test("findEntityBySlug returns tenant entity when both exist", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 2, name: "Tenant AI", slug: "ai", site: 1 });

    const result = await service.findEntityBySlug(1, "ai");

    expect(result.name).toBe("Tenant AI");
    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
  });

  test("createEntity with null siteId creates global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", name: "Global", site: null });

    const result = await service.createEntity(null, { name: "Global", entityType: "Organization" });

    expect(result.site).toBeNull();
    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Global", site: null }),
      })
    );
  });

  test("updateEntity with null siteId updates global entity only", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.updateEntity(null, "doc-5", { name: "Updated" });

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("updateEntity with siteId does not match global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce(null);

    await expect(service.updateEntity(1, "global-doc", { name: "X" })).rejects.toThrow("Entity not found");
  });

  test("deleteEntity with null siteId deletes global entity", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.deleteEntity(null, "doc-5");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("disambiguate merges global and tenant candidates", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, name: "AI Global", site: null },
      { id: 2, name: "AI Tenant", site: 1 },
    ]);

    const result = await service.disambiguate(1, { name: "AI" });

    expect(result).toBeTruthy();
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null, name: { $containsi: "AI" } },
            { site: null, deletedAt: null, name: { $containsi: "AI" } },
          ],
        }),
      })
    );
  });

  test("exportGraph merges global and tenant entities", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany
      .mockResolvedValueOnce([{ id: 1, name: "Global", site: null, entityType: "Organization", slug: "global", status: true }])
      .mockResolvedValueOnce([]); // relations

    const result = await service.exportGraph(1);

    expect(result["@graph"]).toHaveLength(1);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null, status: true },
            { site: null, deletedAt: null, status: true },
          ],
        }),
      })
    );
  });

  test("exportFacts merges global and tenant truths", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1 },
    ]);

    const result = await service.exportFacts(1);

    expect(result).toHaveLength(2);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null, status: true },
            { site: null, deletedAt: null, status: true },
          ],
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/knowledge-graph-global.test.ts --no-coverage --config tests/jest.config.ts
```
Expected: FAIL — current service uses `where: { site: siteId }` not `$or`

- [ ] **Step 3: Modify knowledge-graph.ts service — query merge + signatures**

Read `plugins/zhao-website/server/src/services/knowledge-graph.ts` (336 lines). Apply these modifications using SearchReplace:

**3a: findEntities — $or merge (line 9-20)**

Replace:
```ts
  async findEntities(siteId: number, query: any = {}) {
    const { entityType, page = 1, pageSize = 20 } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (entityType) filters.entityType = entityType;
    return strapi.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["image"],
    });
  },
```
With:
```ts
  async findEntities(siteId: number, query: any = {}) {
    const { entityType, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (entityType) {
      filters.$or[0].entityType = entityType;
      filters.$or[1].entityType = entityType;
    }
    return strapi.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["image"],
    });
  },
```

**3b: findEntityBySlug — two-step query (line 22-27)**

Replace:
```ts
  async findEntityBySlug(siteId: number, slug: string) {
    return strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
  },
```
With:
```ts
  async findEntityBySlug(siteId: number, slug: string) {
    // Two-step: tenant first, global fallback
    const tenant = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
    if (tenant) return tenant;
    return strapi.db.query(ENTITY_UID).findOne({
      where: { site: null, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
  },
```

**3c: createEntity — signature (line 64-68)**

Replace:
```ts
  async createEntity(siteId: number, data: any) {
```
With:
```ts
  async createEntity(siteId: number | null, data: any) {
```

**3d: updateEntity — signature + where (line 70-83)**

Replace:
```ts
  async updateEntity(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
```
With:
```ts
  async updateEntity(siteId: number | null, documentId: string, data: any) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
```

**3e: deleteEntity — signature (line 85)**

Replace:
```ts
  async deleteEntity(siteId: number, documentId: string) {
```
With:
```ts
  async deleteEntity(siteId: number | null, documentId: string) {
```

**3f: findRelations — $or merge (line 97-109)**

Replace:
```ts
  async findRelations(siteId: number, query: any = {}) {
    const { subjectEntityId, predicate, objectEntityId, page = 1, pageSize = 20 } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (subjectEntityId) filters.subjectEntity = subjectEntityId;
    if (predicate) filters.predicate = predicate;
    if (objectEntityId) filters.objectEntity = objectEntityId;
```
With:
```ts
  async findRelations(siteId: number, query: any = {}) {
    const { subjectEntityId, predicate, objectEntityId, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (subjectEntityId) { filters.$or[0].subjectEntity = subjectEntityId; filters.$or[1].subjectEntity = subjectEntityId; }
    if (predicate) { filters.$or[0].predicate = predicate; filters.$or[1].predicate = predicate; }
    if (objectEntityId) { filters.$or[0].objectEntity = objectEntityId; filters.$or[1].objectEntity = objectEntityId; }
```

**3g: disambiguate — $or merge (line 219-237)**

Replace:
```ts
  async disambiguate(siteId: number, params: { name: string; entityType?: string }): Promise<any | null> {
    const candidates = await strapi.db.query(ENTITY_UID).findMany({
      where: {
        site: siteId,
        name: { $containsi: params.name },
        deletedAt: null,
        ...(params.entityType ? { entityType: params.entityType } : {}),
      },
    });
```
With:
```ts
  async disambiguate(siteId: number, params: { name: string; entityType?: string }): Promise<any | null> {
    const baseFilter = {
      name: { $containsi: params.name },
      deletedAt: null,
      ...(params.entityType ? { entityType: params.entityType } : {}),
    };
    const candidates = await strapi.db.query(ENTITY_UID).findMany({
      where: {
        $or: [
          { ...baseFilter, site: siteId },
          { ...baseFilter, site: null },
        ],
      },
    });
```

**3h: verifyAll — $or merge (line 246-267)**

Replace:
```ts
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null },
    });
```
With:
```ts
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }] },
    });
```

And in the same method, replace:
```ts
      const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { site: siteId, canonicalEntity: entity.documentId, verificationStatus: "conflict" },
      });
```
With:
```ts
      const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { $or: [{ site: siteId, canonicalEntity: entity.documentId, verificationStatus: "conflict" }, { site: null, canonicalEntity: entity.documentId, verificationStatus: "conflict" }] },
      });
```

**3i: exportGraph — $or merge (line 270-281)**

Replace:
```ts
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["image"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["subjectEntity", "objectEntity"],
    });
```
With:
```ts
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
      populate: ["image"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
      populate: ["subjectEntity", "objectEntity"],
    });
```

**3j: exportEntity — $or merge for relations (line 283-295)**

Replace:
```ts
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, subjectEntity: entity.documentId, deletedAt: null },
      populate: ["objectEntity"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, objectEntity: entity.documentId, deletedAt: null },
      populate: ["subjectEntity"],
    });
```
With:
```ts
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, subjectEntity: entity.documentId, deletedAt: null }, { site: null, subjectEntity: entity.documentId, deletedAt: null }] },
      populate: ["objectEntity"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, objectEntity: entity.documentId, deletedAt: null }, { site: null, objectEntity: entity.documentId, deletedAt: null }] },
      populate: ["subjectEntity"],
    });
```

**3k: exportFacts — $or merge (line 319-322)**

Replace:
```ts
    const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
      where: { site: siteId, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } },
    });
```
With:
```ts
    const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
      where: {
        $or: [
          { site: siteId, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } },
          { site: null, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } },
        ],
      },
    });
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/knowledge-graph-global.test.ts --no-coverage --config tests/jest.config.ts
```
Expected: PASS (all 10 tests pass)

- [ ] **Step 5: Run full test suite for regressions**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```
Expected: All previously passing tests still pass

- [ ] **Step 6: Commit**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/services/knowledge-graph.ts plugins/zhao-website/tests/services/knowledge-graph-global.test.ts && git commit -m "feat(knowledge-base): add $or query merge and null siteId support to knowledge-graph service"
```

---

### Task 3: first-truth Service — Query Merge + Signature Changes

**Files:**
- Modify: `plugins/zhao-website/server/src/services/first-truth.ts`
- Create: `plugins/zhao-website/tests/services/first-truth-global.test.ts`

- [ ] **Step 1: Write failing tests**

Create `plugins/zhao-website/tests/services/first-truth-global.test.ts`:

```ts
import ftServiceFactory from "../../server/src/services/first-truth";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("First Truth Global Layer", () => {
  let mockStrapi: any;
  let service: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    service = ftServiceFactory({ strapi: mockStrapi });
  });

  test("find merges global and tenant truths", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1 },
    ]);

    const result = await service.find(1, {});

    expect(result).toHaveLength(2);
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null },
            { site: null, deletedAt: null },
          ],
        }),
      })
    );
  });

  test("findOne returns tenant first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, documentId: "doc-1", site: null });

    const result = await service.findOne(1, "doc-1");

    expect(result.site).toBeNull();
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
  });

  test("findOne returns tenant when both exist", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 2, documentId: "doc-1", site: 1 });

    const result = await service.findOne(1, "doc-1");

    expect(result.site).toBe(1);
    expect(queryMock.findOne).toHaveBeenCalledTimes(1);
  });

  test("findByClaimKey returns tenant first, global as fallback", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, claimKey: "founding_year", site: null });

    const result = await service.findByClaimKey(1, "founding_year");

    expect(result.site).toBeNull();
    expect(queryMock.findOne).toHaveBeenCalledTimes(2);
  });

  test("create with null siteId creates global truth", async () => {
    const queryMock = mockStrapi.db.query();
    // findByClaimKey returns null (no conflict)
    queryMock.findOne.mockResolvedValueOnce(null);
    queryMock.create.mockResolvedValueOnce({ id: 1, documentId: "doc-1", site: null });

    const result = await service.create(null, { claimKey: "founding_year", claim: "Founding Year", canonicalValue: "2010" });

    expect(result.site).toBeNull();
    expect(queryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ site: null, claimKey: "founding_year" }),
      })
    );
  });

  test("update with null siteId updates global truth only", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null, canonicalValue: "2010" });

    await service.update(null, "doc-5", { canonicalValue: "2011" });

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });

  test("detectConflicts merges global and tenant truths for cross-layer detection", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findMany.mockResolvedValueOnce([
      { id: 1, claimKey: "founding_year", canonicalValue: "2010", site: null, status: true },
      { id: 2, claimKey: "founding_year", canonicalValue: "2015", site: 1, status: true },
    ]);

    const result = await service.detectConflicts(1);

    expect(result).toHaveLength(1);
    expect(result[0].claimKey).toBe("founding_year");
    expect(queryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          $or: [
            { site: 1, deletedAt: null, status: true },
            { site: null, deletedAt: null, status: true },
          ],
        }),
      })
    );
  });

  test("verify with null siteId verifies global truth", async () => {
    const queryMock = mockStrapi.db.query();
    queryMock.findOne.mockResolvedValueOnce({ id: 5, documentId: "doc-5", site: null });

    await service.verify(null, "doc-5");

    expect(queryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ site: null, documentId: "doc-5" }),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/first-truth-global.test.ts --no-coverage --config tests/jest.config.ts
```
Expected: FAIL — current service uses `where: { site: siteId }` not `$or`

- [ ] **Step 3: Modify first-truth.ts service**

Read `plugins/zhao-website/server/src/services/first-truth.ts` (136 lines). Apply these modifications:

**3a: find — $or merge + signature (line 6-16)**

Replace:
```ts
  async find(siteId: number, query: any = {}) {
    const { claimCategory, verificationStatus } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (claimCategory) filters.claimCategory = claimCategory;
    if (verificationStatus) filters.verificationStatus = verificationStatus;
```
With:
```ts
  async find(siteId: number | null, query: any = {}) {
    const { claimCategory, verificationStatus } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (claimCategory) { filters.$or[0].claimCategory = claimCategory; filters.$or[1].claimCategory = claimCategory; }
    if (verificationStatus) { filters.$or[0].verificationStatus = verificationStatus; filters.$or[1].verificationStatus = verificationStatus; }
```

**3b: findOne — two-step query + signature (line 18-23)**

Replace:
```ts
  async findOne(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
  },
```
With:
```ts
  async findOne(siteId: number | null, documentId: string) {
    // Two-step: tenant first, global fallback
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
  },
```

**3c: findByClaimKey — two-step query + signature (line 25-29)**

Replace:
```ts
  async findByClaimKey(siteId: number, claimKey: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, claimKey, deletedAt: null },
    });
  },
```
With:
```ts
  async findByClaimKey(siteId: number | null, claimKey: string) {
    // Two-step: tenant first, global fallback
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, claimKey, deletedAt: null },
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, claimKey, deletedAt: null },
    });
  },
```

**3d: create — signature (line 31)**

Replace:
```ts
  async create(siteId: number, data: any) {
```
With:
```ts
  async create(siteId: number | null, data: any) {
```

**3e: update — signature (line 49)**

Replace:
```ts
  async update(siteId: number, documentId: string, data: any) {
```
With:
```ts
  async update(siteId: number | null, documentId: string, data: any) {
```

**3f: _markRelatedEntitiesPending — signature (line 70)**

Replace:
```ts
  async _markRelatedEntitiesPending(siteId: number, canonicalEntity: any) {
```
With:
```ts
  async _markRelatedEntitiesPending(siteId: number | null, canonicalEntity: any) {
```

**3g: verify — signature (line 84)**

Replace:
```ts
  async verify(siteId: number, documentId: string) {
```
With:
```ts
  async verify(siteId: number | null, documentId: string) {
```

**3h: softDelete — signature (line 97)**

Replace:
```ts
  async softDelete(siteId: number, documentId: string) {
```
With:
```ts
  async softDelete(siteId: number | null, documentId: string) {
```

**3i: detectConflicts — $or merge + signature (line 107-110)**

Replace:
```ts
  async detectConflicts(siteId: number) {
    const truths = await strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
    });
```
With:
```ts
  async detectConflicts(siteId: number | null) {
    const truths = await strapi.db.query(UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
    });
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest tests/services/first-truth-global.test.ts --no-coverage --config tests/jest.config.ts
```
Expected: PASS (all 8 tests pass)

- [ ] **Step 5: Run full test suite for regressions**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```
Expected: All previously passing tests still pass

- [ ] **Step 6: Commit**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/services/first-truth.ts plugins/zhao-website/tests/services/first-truth-global.test.ts && git commit -m "feat(knowledge-base): add $or query merge and null siteId support to first-truth service"
```

---

### Task 4: Controllers + Routes + Permissions

**Files:**
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`
- Modify: `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`
- Modify: `plugins/zhao-website/server/src/routes/admin-api.ts`
- Modify: `plugins/zhao-auth/server/src/permissions.ts`

- [ ] **Step 1: Add global controller methods to knowledge-graph controller**

Read `plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`. After the `exportGraph` method (the last method before the closing `};`), add:

```ts
  // ===== 全局实体 =====
  async createGlobalEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(null, ctx.request.body);
  },
  async updateGlobalEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(null, ctx.params.documentId, ctx.request.body);
  },
  async deleteGlobalEntity(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(null, ctx.params.documentId);
    ctx.body = { success: true };
  },
```

- [ ] **Step 2: Add global controller methods to first-truth controller**

Read `plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`. After the `exportFacts` method (the last method before the closing `};`), add:

```ts
  // ===== 全局真值 =====
  async createGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, ctx.request.body); },
  async updateGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, ctx.request.body); },
  async deleteGlobal(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId); ctx.body = { success: true }; },
  async verifyGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId); },
```

- [ ] **Step 3: Rename /kg/ routes to /knowledge-graph/ and add global routes**

Read `plugins/zhao-website/server/src/routes/admin-api.ts`. Find all `/kg/` routes (lines 80-88) and replace them:

Replace:
```ts
    channelScopeRoute("GET", "/kg/entities", "knowledge-graph.findEntities", "knowledge-entity.read"),
    channelScopeRoute("POST", "/kg/entities", "knowledge-graph.createEntity", "knowledge-entity.create"),
    channelScopeRoute("PUT", "/kg/entities/:documentId", "knowledge-graph.updateEntity", "knowledge-entity.update"),
    channelScopeRoute("DELETE", "/kg/entities/:documentId", "knowledge-graph.deleteEntity", "knowledge-entity.delete"),
    channelScopeRoute("GET", "/kg/relations", "knowledge-graph.findRelations", "knowledge-relation.read"),
    channelScopeRoute("POST", "/kg/relations", "knowledge-graph.addRelation", "knowledge-relation.create"),
    channelScopeRoute("DELETE", "/kg/relations/:documentId", "knowledge-graph.deleteRelation", "knowledge-relation.delete"),
    channelScopeRoute("POST", "/kg/disambiguate", "knowledge-graph.disambiguate", "knowledge-entity.read"),
    channelScopeRoute("GET", "/kg/export", "knowledge-graph.exportGraph", "knowledge-entity.read"),
```
With:
```ts
    channelScopeRoute("GET", "/knowledge-graph/entities", "knowledge-graph.findEntities", "knowledge-entity.read"),
    channelScopeRoute("POST", "/knowledge-graph/entities", "knowledge-graph.createEntity", "knowledge-entity.create"),
    channelScopeRoute("PUT", "/knowledge-graph/entities/:documentId", "knowledge-graph.updateEntity", "knowledge-entity.update"),
    channelScopeRoute("DELETE", "/knowledge-graph/entities/:documentId", "knowledge-graph.deleteEntity", "knowledge-entity.delete"),
    channelScopeRoute("GET", "/knowledge-graph/relations", "knowledge-graph.findRelations", "knowledge-relation.read"),
    channelScopeRoute("POST", "/knowledge-graph/relations", "knowledge-graph.addRelation", "knowledge-relation.create"),
    channelScopeRoute("DELETE", "/knowledge-graph/relations/:documentId", "knowledge-graph.deleteRelation", "knowledge-relation.delete"),
    channelScopeRoute("POST", "/knowledge-graph/disambiguate", "knowledge-graph.disambiguate", "knowledge-entity.read"),
    channelScopeRoute("GET", "/knowledge-graph/export", "knowledge-graph.exportGraph", "knowledge-entity.read"),
    // 全局实体路由
    channelScopeRoute("POST", "/knowledge-graph/entities/global", "knowledge-graph.createGlobalEntity", "knowledge-entity.create-global"),
    channelScopeRoute("PUT", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.updateGlobalEntity", "knowledge-entity.update-global"),
    channelScopeRoute("DELETE", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.deleteGlobalEntity", "knowledge-entity.delete-global"),
```

Then find the first-truth routes (lines 89-96) and add global routes after the existing ones. After the line:
```ts
    channelScopeRoute("GET", "/first-truths/export", "first-truth.exportFacts", "first-truth.read"),
```
Add:
```ts
    // 全局真值路由
    channelScopeRoute("POST", "/first-truths/global", "first-truth.createGlobal", "first-truth.create-global"),
    channelScopeRoute("PUT", "/first-truths/global/:documentId", "first-truth.updateGlobal", "first-truth.update-global"),
    channelScopeRoute("DELETE", "/first-truths/global/:documentId", "first-truth.deleteGlobal", "first-truth.delete-global"),
    channelScopeRoute("POST", "/first-truths/global/:documentId/verify", "first-truth.verifyGlobal", "first-truth.update-global"),
```

- [ ] **Step 4: Add permission tree nodes to permissions.ts**

Read `plugins/zhao-auth/server/src/permissions.ts`. Find `menu.website-knowledge-entity` children. After the last `knowledge-entity.*` button entry, add:

```ts
          "knowledge-entity.create-global": { label: "新增全局实体", type: "button" },
          "knowledge-entity.update-global": { label: "编辑全局实体", type: "button" },
          "knowledge-entity.delete-global": { label: "删除全局实体", type: "button" },
```

Find `menu.website-first-truth` children. After the last `first-truth.*` button entry, add:

```ts
          "first-truth.create-global": { label: "新增全局真值", type: "button" },
          "first-truth.update-global": { label: "编辑全局真值", type: "button" },
          "first-truth.delete-global": { label: "删除全局真值", type: "button" },
```

- [ ] **Step 5: Add global permissions to CHANNEL_ADMIN hardcoded array**

In `permissions.ts`, find the CHANNEL_ADMIN role's permission array (search for the section that has `"knowledge-entity.read"`, `"knowledge-entity.create"`, etc. for CHANNEL_ADMIN). After the existing knowledge-entity entries, add:

```ts
    "knowledge-entity.create-global", "knowledge-entity.update-global", "knowledge-entity.delete-global",
```

After the existing first-truth entries, add:

```ts
    "first-truth.create-global", "first-truth.update-global", "first-truth.delete-global",
```

- [ ] **Step 6: Add filter to WEBSITE_MANAGER and WEBSITE_EDITOR**

In `permissions.ts`, find the WEBSITE_MANAGER role definition. It currently uses `centerPermissions("menu.website-center")`. Change it to:

```ts
[ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center").filter((k: string) => !k.endsWith("-global")),
```

Find the WEBSITE_EDITOR role definition. It currently uses `centerEditorPermissions("menu.website-center")`. Change it to:

```ts
[ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center").filter((k: string) => !k.endsWith("-global")),
```

- [ ] **Step 7: Run zhao-website full test suite**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```
Expected: All tests pass (including the new global layer tests)

- [ ] **Step 8: Commit**

```bash
cd E:\code\basic && git add plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts plugins/zhao-website/server/src/routes/admin-api.ts plugins/zhao-auth/server/src/permissions.ts && git commit -m "feat(knowledge-base): add global controllers, routes, and permissions for cross-tenant knowledge"
```

---

### Task 5: Build + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run zhao-website full test suite**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npx jest --no-coverage --config tests/jest.config.ts
```
Expected: All tests pass (including 10 knowledge-graph-global + 8 first-truth-global = 18 new tests)

- [ ] **Step 2: Build zhao-website**

Run:
```bash
cd E:\code\basic\plugins\zhao-website && npm run build
```
Expected: Build completes successfully (dist/ folder updated)

- [ ] **Step 3: Verify git status is clean**

Run:
```bash
cd E:\code\basic && git status
```
Expected: Working tree clean, all changes committed

- [ ] **Step 4: Commit dist if needed**

```bash
cd E:\code\basic && git add plugins/zhao-website/dist && git commit -m "build: rebuild dist for cross-tenant knowledge base" --allow-empty
```
