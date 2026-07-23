# 字段与逻辑修复 实现计划（B1+B2+B3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-deal schema 反向关系 + 服务注册 + 安全 hotfix（B1）、zhao-track 归因链路（B2）、zhao-track 代码迁移 + API 修复（B3），共 13 个致命问题。

**Architecture:** B1 补全 schema mappedBy 反向字段 + 将 adapterRegistry 改为工厂服务 + cron 服务名修正 + 公开接口字段白名单。B2 修复 source-resolver populate 根因 + 归因规则 3 改为 coupon+promoPid+时间窗 + sourceTagId 回填 + 跨实体映射。B3 清理 promoChannelId 残留 + Document Service API 参数修正 + commissionAmount 字段修正。

**Tech Stack:** Strapi v5, TypeScript, Jest + ts-jest

---

## File Structure

### 新增文件
- `strapi/plugins/zhao-deal/server/src/services/adapter-registry-service.ts` — adapterRegistry 工厂服务 + initRegistry
- `strapi/plugins/zhao-deal/tests/services/adapter-registry-service.test.ts` — 服务注册测试
- `strapi/plugins/zhao-deal/tests/content-types/schema-relations.test.ts` — schema 反向关系测试
- `strapi/plugins/zhao-deal/tests/services/query-security.test.ts` — 安全 hotfix 测试
- `strapi/plugins/zhao-track/tests/services/source-resolver-populate.test.ts` — populate 测试
- `strapi/plugins/zhao-track/tests/services/attribution-rule3.test.ts` — 规则 3 测试
- `strapi/plugins/zhao-track/tests/services/click-orchestrator-mapping.test.ts` — 跨实体映射测试
- `strapi/plugins/zhao-track/tests/controllers/source.test.ts` — source controller 测试
- `strapi/plugins/zhao-track/tests/controllers/query-api.test.ts` — query API 参数测试
- `strapi/plugins/zhao-track/tests/controllers/report-api.test.ts` — report API 字段测试

### 修改文件
- `strapi/plugins/zhao-deal/server/src/content-types/platform/schema.json` — 新增 coupons/products/categories 反向关系
- `strapi/plugins/zhao-deal/server/src/content-types/category/schema.json` — 新增 coupons/products 反向关系
- `strapi/plugins/zhao-deal/server/src/content-types/coupon/schema.json` — 新增 product/clickEvents 反向关系
- `strapi/plugins/zhao-track/server/src/content-types/source-tag/schema.json` — 新增 clickEvents 反向关系
- `strapi/plugins/zhao-deal/server/src/services/index.ts` — 新增 adapterRegistry key
- `strapi/plugins/zhao-deal/server/src/bootstrap.ts` — 改用 initRegistry
- `strapi/plugins/zhao-deal/server/src/config/cron.ts` — 服务名 sync-scheduler → syncScheduler
- `strapi/plugins/zhao-deal/tests/config/cron.test.ts` — 测试同步改服务名
- `strapi/plugins/zhao-deal/server/src/services/query.ts` — listPlatforms fields 白名单 + populate platform fields 限制
- `strapi/plugins/zhao-track/server/src/services/source-resolver.ts` — 4 处加 populate
- `strapi/plugins/zhao-track/server/src/services/attribution.ts` — 规则 3 重写 + sourceTagId 回填 + populate
- `strapi/plugins/zhao-track/tests/services/attribution.test.ts` — mock 更新 + 规则 3 测试重写
- `strapi/plugins/zhao-track/server/src/services/click-orchestrator.ts` — PLATFORM_TYPE_MAP 映射
- `strapi/plugins/zhao-track/server/src/services/order-sync.ts` — 删除 promoChannelId 行
- `strapi/plugins/zhao-track/server/src/controllers/source.ts` — promoChannelId → promoCampaignId
- `strapi/plugins/zhao-track/server/src/controllers/query.ts` — where→filters + orderBy→sort + offset→start + promoChannelId→promoCampaign + 删除 orderStatus
- `strapi/plugins/zhao-track/server/src/controllers/report.ts` — where→filters + commissionAmount→commission + promoChannelId→promoCampaign + populate

---

## Task 1: B1 Schema 反向关系补全

**Files:**
- Modify: `strapi/plugins/zhao-deal/server/src/content-types/platform/schema.json`
- Modify: `strapi/plugins/zhao-deal/server/src/content-types/category/schema.json`
- Modify: `strapi/plugins/zhao-deal/server/src/content-types/coupon/schema.json`
- Modify: `strapi/plugins/zhao-track/server/src/content-types/source-tag/schema.json`
- Test: `strapi/plugins/zhao-deal/tests/content-types/schema-relations.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-deal/tests/content-types/schema-relations.test.ts`：

```typescript
import platform from "../../server/src/content-types/platform/schema.json";
import category from "../../server/src/content-types/category/schema.json";
import coupon from "../../server/src/content-types/coupon/schema.json";
import sourceTag from "../../server/src/content-types/source-tag/schema.json";

describe("Schema 反向关系补全", () => {
  describe("Platform", () => {
    it("包含 coupons oneToMany mappedBy=platform", () => {
      const attr = platform.attributes.coupons as any;
      expect(attr).toBeDefined();
      expect(attr.type).toBe("relation");
      expect(attr.relation).toBe("oneToMany");
      expect(attr.target).toBe("plugin::zhao-deal.coupon");
      expect(attr.mappedBy).toBe("platform");
    });
    it("包含 products oneToMany mappedBy=platform", () => {
      const attr = platform.attributes.products as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.mappedBy).toBe("platform");
    });
    it("包含 categories oneToMany mappedBy=platform", () => {
      const attr = platform.attributes.categories as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.mappedBy).toBe("platform");
    });
  });

  describe("Category", () => {
    it("包含 coupons oneToMany mappedBy=category", () => {
      const attr = category.attributes.coupons as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.mappedBy).toBe("category");
    });
    it("包含 products oneToMany mappedBy=category", () => {
      const attr = category.attributes.products as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.mappedBy).toBe("category");
    });
  });

  describe("Coupon", () => {
    it("包含 product oneToOne mappedBy=coupon", () => {
      const attr = coupon.attributes.product as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToOne");
      expect(attr.mappedBy).toBe("coupon");
    });
    it("包含 clickEvents oneToMany mappedBy=coupon", () => {
      const attr = coupon.attributes.clickEvents as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.target).toBe("plugin::zhao-track.click-event");
      expect(attr.mappedBy).toBe("coupon");
    });
  });

  describe("SourceTag", () => {
    it("包含 clickEvents oneToMany mappedBy=sourceTag", () => {
      const attr = sourceTag.attributes.clickEvents as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe("oneToMany");
      expect(attr.target).toBe("plugin::zhao-track.click-event");
      expect(attr.mappedBy).toBe("sourceTag");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/content-types/schema-relations.test.ts --no-cache`
Expected: FAIL with "expect(attr).toBeDefined()"

- [ ] **Step 3: Modify platform/schema.json**

在 `strapi/plugins/zhao-deal/server/src/content-types/platform/schema.json` 的 `attributes` 中，在 `fetchConfig` 后面新增 3 个 relation：

```json
    "fetchConfig": { "type": "json" },
    "coupons": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.coupon",
      "mappedBy": "platform"
    },
    "products": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.product",
      "mappedBy": "platform"
    },
    "categories": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.category",
      "mappedBy": "platform"
    }
```

- [ ] **Step 4: Modify category/schema.json**

在 `strapi/plugins/zhao-deal/server/src/content-types/category/schema.json` 的 `attributes` 中，在 `icon` 后面新增 2 个 relation：

```json
    "icon": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "coupons": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.coupon",
      "mappedBy": "category"
    },
    "products": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-deal.product",
      "mappedBy": "category"
    }
```

- [ ] **Step 5: Modify coupon/schema.json**

在 `strapi/plugins/zhao-deal/server/src/content-types/coupon/schema.json` 的 `attributes` 中，在 `collection` 后面新增 2 个 relation：

```json
    "collection": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-deal.coupon-collection",
      "inversedBy": "coupons"
    },
    "product": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-deal.product",
      "mappedBy": "coupon"
    },
    "clickEvents": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-track.click-event",
      "mappedBy": "coupon"
    }
```

- [ ] **Step 6: Modify source-tag/schema.json**

在 `strapi/plugins/zhao-track/server/src/content-types/source-tag/schema.json` 的 `attributes` 中，在 `lastSeenAt` 后面新增 1 个 relation：

```json
    "lastSeenAt": { "type": "datetime" },
    "clickEvents": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-track.click-event",
      "mappedBy": "sourceTag"
    }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/content-types/schema-relations.test.ts --no-cache`
Expected: PASS (9 tests)

- [ ] **Step 8: Commit**

```bash
cd strapi/plugins/zhao-deal
git add server/src/content-types/platform/schema.json server/src/content-types/category/schema.json server/src/content-types/coupon/schema.json tests/content-types/schema-relations.test.ts
cd ../zhao-track
git add server/src/content-types/source-tag/schema.json
cd ../..
git add -A
git commit -m "fix: add missing mappedBy reverse relations to platform/category/coupon/source-tag schemas"
```

---

## Task 2: B1 adapterRegistry 服务注册

**Files:**
- Create: `strapi/plugins/zhao-deal/server/src/services/adapter-registry-service.ts`
- Modify: `strapi/plugins/zhao-deal/server/src/services/index.ts`
- Modify: `strapi/plugins/zhao-deal/server/src/bootstrap.ts`
- Test: `strapi/plugins/zhao-deal/tests/services/adapter-registry-service.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-deal/tests/services/adapter-registry-service.test.ts`：

```typescript
import adapterRegistryFactory, { initRegistry } from "../../server/src/services/adapter-registry-service";

describe("adapterRegistry service", () => {
  it("factory 返回 AdapterRegistry 实例（非 undefined）", () => {
    const registry = adapterRegistryFactory({ strapi: {} as any });
    expect(registry).toBeDefined();
    expect(registry.has).toBeDefined();
    expect(registry.get).toBeDefined();
  });

  it("initRegistry 注册启用的平台适配器", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { code: "taobao", syncEnabled: true, appKey: "k1", appSecret: "s1", apiEndpoint: "e1" },
      { code: "pdd", syncEnabled: false },
    ]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const strapi: any = {
      documents,
      config: { get: jest.fn().mockReturnValue("production") },
      log: { info: jest.fn(), warn: jest.fn() },
    };
    const registry = await initRegistry(strapi);
    expect(registry.has("taobao")).toBe(true);
    expect(registry.has("pdd")).toBe(false);
  });

  it("factory 在 initRegistry 之后返回同一实例", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const strapi: any = {
      documents,
      config: { get: jest.fn().mockReturnValue("production") },
      log: { info: jest.fn(), warn: jest.fn() },
    };
    await initRegistry(strapi);
    const registry = adapterRegistryFactory({ strapi });
    expect(registry.has("taobao")).toBe(false);
    // 是同一实例（initRegistry 注册了空平台列表）
    expect(registry.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/adapter-registry-service.test.ts --no-cache`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create adapter-registry-service.ts**

创建 `strapi/plugins/zhao-deal/server/src/services/adapter-registry-service.ts`：

```typescript
import type { Core } from "@strapi/strapi";
import { AdapterRegistry } from "./adapters/adapter-registry";
import { TaobaoAdapter } from "./adapters/taobao-adapter";
import { PddAdapter } from "./adapters/pdd-adapter";
import { DouyinAdapter } from "./adapters/douyin-adapter";
import { JdAdapter } from "./adapters/jd-adapter";
import { MockAdapter } from "./adapters/adapter-mock";

const PLATFORM_UID = "plugin::zhao-deal.platform";

let registryInstance: AdapterRegistry | null = null;

export async function initRegistry(strapi: Core.Strapi): Promise<AdapterRegistry> {
  const registry = new AdapterRegistry();
  const platforms: any[] = await strapi.documents(PLATFORM_UID).findMany({});
  for (const platform of platforms) {
    if (!platform.syncEnabled) continue;
    const cfg = {
      appKey: platform.appKey || "",
      appSecret: platform.appSecret || "",
      apiEndpoint: platform.apiEndpoint || "",
    };
    switch (platform.code) {
      case "taobao": registry.register(new TaobaoAdapter(cfg)); break;
      case "pdd":    registry.register(new PddAdapter(cfg)); break;
      case "douyin": registry.register(new DouyinAdapter(cfg)); break;
      case "jd":     registry.register(new JdAdapter(cfg)); break;
    }
  }
  if (strapi.config.get("environment") === "development") {
    registry.register(new MockAdapter());
  }
  registryInstance = registry;
  return registry;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  if (!registryInstance) {
    registryInstance = new AdapterRegistry();
  }
  return registryInstance;
};
```

- [ ] **Step 4: Modify services/index.ts**

替换 `strapi/plugins/zhao-deal/server/src/services/index.ts` 全部内容为：

```typescript
import query from "./query";
import preFilter from "./pre-filter";
import candidate from "./candidate";
import sync from "./sync";
import syncScheduler from "./sync-scheduler";
import adapterRegistry from "./adapter-registry-service";

export default {
  query,
  "pre-filter": preFilter,
  candidate,
  sync,
  syncScheduler,
  adapterRegistry,
};
```

- [ ] **Step 5: Modify bootstrap.ts**

替换 `strapi/plugins/zhao-deal/server/src/bootstrap.ts` 全部内容为：

```typescript
import type { Core } from "@strapi/strapi";
import { initRegistry } from "./services/adapter-registry-service";

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-deal] 插件已加载");
  try {
    await initRegistry(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-deal] 平台加载失败: ${err.message}`);
  }
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/adapter-registry-service.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
cd strapi/plugins/zhao-deal
git add server/src/services/adapter-registry-service.ts server/src/services/index.ts server/src/bootstrap.ts tests/services/adapter-registry-service.test.ts
git commit -m "fix: register adapterRegistry as proper Strapi service via factory + initRegistry"
```

---

## Task 3: B1 cron 服务名 + 安全 hotfix

**Files:**
- Modify: `strapi/plugins/zhao-deal/server/src/config/cron.ts`
- Modify: `strapi/plugins/zhao-deal/tests/config/cron.test.ts`
- Modify: `strapi/plugins/zhao-deal/server/src/services/query.ts`
- Test: `strapi/plugins/zhao-deal/tests/services/query-security.test.ts`

- [ ] **Step 1: Write the failing test for security hotfix**

创建 `strapi/plugins/zhao-deal/tests/services/query-security.test.ts`：

```typescript
import queryFactory from "../../server/src/services/query";

describe("query security hotfix", () => {
  it("listPlatforms 不返回 appKey/appSecret/apiEndpoint", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { name: "淘宝", code: "taobao", appKey: "secret_key", appSecret: "secret_secret", apiEndpoint: "http://secret" },
    ]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const mockStrapi: any = { documents };
    const svc = queryFactory({ strapi: mockStrapi });
    const result = await svc.listPlatforms();
    // findMany 应被调用时带 fields 白名单
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      fields: expect.arrayContaining(["name", "code"]),
    }));
    // 验证 fields 不包含敏感字段
    const callArgs = findMany.mock.calls[0][0];
    expect(callArgs.fields).not.toContain("appKey");
    expect(callArgs.fields).not.toContain("appSecret");
    expect(callArgs.fields).not.toContain("apiEndpoint");
  });

  it("listCoupons populate platform 时限制 fields", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const documents = jest.fn().mockReturnValue({ findMany });
    const mockStrapi: any = { documents };
    const svc = queryFactory({ strapi: mockStrapi });
    await svc.listCoupons({ page: 1, pageSize: 20 });
    const callArgs = findMany.mock.calls[0][0];
    expect(callArgs.populate.platform).toEqual(expect.objectContaining({
      fields: expect.arrayContaining(["name", "code"]),
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/query-security.test.ts --no-cache`
Expected: FAIL with "expect(callArgs.fields).not.toContain" 或 fields undefined

- [ ] **Step 3: Fix cron.ts service name**

在 `strapi/plugins/zhao-deal/server/src/config/cron.ts` 中，第 5 行和第 7 行的 `"sync-scheduler"` 改为 `"syncScheduler"`：

```typescript
export default {
  // 每小时检查是否到平台 syncCron 触发时间，命中则同步优惠券/产品候选
  "0 * * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-deal").service("syncScheduler").run();
    } catch (err: any) {
      strapi.log.warn(`[zhao-deal cron] syncScheduler failed: ${err.message}`);
    }
  },
};
```

- [ ] **Step 4: Fix cron.test.ts service name**

在 `strapi/plugins/zhao-deal/tests/config/cron.test.ts` 中，第 10、14、37 行的 `"sync-scheduler"` 改为 `"syncScheduler"`：

第 10 行：`it("每小时任务调用 syncScheduler.run", async () => {`
第 14 行：`service: (name: string) => name === "syncScheduler" ? { run } : null,`
第 37 行：`service: (name: string) => name === "syncScheduler" ? { run } : null,`

- [ ] **Step 5: Fix query.ts security hotfix**

在 `strapi/plugins/zhao-deal/server/src/services/query.ts` 中：

1. 第 104-105 行 `listPlatforms` 改为：
```typescript
    async listPlatforms() {
      return strapi.documents(PLATFORM_UID).findMany({
        fields: ["name", "code", "promoSite"],
      });
    },
```

2. 第 51 行 `listCoupons` 的 populate 改为：
```typescript
        populate: { platform: { fields: ["name", "code"] }, category: true, product: true },
```

3. 第 58 行 `getCoupon` 的 populate 改为：
```typescript
        populate: { platform: { fields: ["name", "code"] }, category: true, product: true },
```

4. 第 78 行 `listProducts` 的 populate 改为：
```typescript
        populate: { platform: { fields: ["name", "code"] }, category: true, coupon: true },
```

5. 第 100 行 `listCategories` 的 populate 改为：
```typescript
        populate: { platform: { fields: ["name", "code"] } },
```

6. 第 124 行 `getCollection` 的 populate 改为：
```typescript
        populate: { coupons: { populate: { platform: { fields: ["name", "code"] }, product: true } }, coverImage: true },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/query-security.test.ts tests/config/cron.test.ts --no-cache`
Expected: PASS (security 2 tests + cron 4 tests)

- [ ] **Step 7: Commit**

```bash
cd strapi/plugins/zhao-deal
git add server/src/config/cron.ts tests/config/cron.test.ts server/src/services/query.ts tests/services/query-security.test.ts
git commit -m "fix: cron service name mismatch + whitelist platform fields in public APIs"
```

---

## Task 4: B2 source-resolver populate 修复

**Files:**
- Modify: `strapi/plugins/zhao-track/server/src/services/source-resolver.ts`
- Test: `strapi/plugins/zhao-track/tests/services/source-resolver-populate.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-track/tests/services/source-resolver-populate.test.ts`：

```typescript
import sourceResolverFactory from "../../server/src/services/source-resolver";
import { createMockStrapi } from "../helpers/mock-strapi";

describe("SourceResolver populate promoCampaign", () => {
  it("sourceTagId 查询包含 populate promoCampaign.channel", async () => {
    const findMany = jest.fn().mockResolvedValue([{ documentId: "d1", tagId: "t1" }]);
    const update = jest.fn().mockResolvedValue({});
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, update, create: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    await svc.identify({ sourceTagId: "t1" });
    const callArgs = findMany.mock.calls[0][0];
    expect(callArgs.populate).toBeDefined();
    expect(callArgs.populate.promoCampaign).toBeDefined();
    expect(callArgs.populate.promoCampaign.populate).toBeDefined();
    expect(callArgs.populate.promoCampaign.populate.channel).toBe(true);
  });

  it("utm 组合查询包含 populate promoCampaign.channel", async () => {
    const findMany = jest.fn().mockResolvedValue([{ documentId: "d1", tagId: "t1" }]);
    const update = jest.fn().mockResolvedValue({});
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, update, create: jest.fn(), findOne: jest.fn() });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    await svc.identify({ utm: { utmSource: "wechat" } });
    // findMany 第一次是 utm_source 匹配 promo-campaign，第二次是 sourceTag 查询
    // 找到 sourceTag 查询的调用（filters 中有 utmSource）
    const tagCall = findMany.mock.calls.find((c: any[]) => c[0]?.filters?.utmSource);
    expect(tagCall).toBeDefined();
    expect(tagCall[0].populate.promoCampaign.populate.channel).toBe(true);
  });

  it("新建 SourceTag 后 findOne 带 populate", async () => {
    const create = jest.fn().mockResolvedValue({ documentId: "d2", tagId: "new1" });
    const findOne = jest.fn().mockResolvedValue({ documentId: "d2", tagId: "new1", promoCampaign: { documentId: "camp1", channel: { documentId: "ch1" } } });
    const findMany = jest.fn().mockResolvedValue([]);
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockReturnValue({ findMany, create, update: jest.fn(), findOne });
    const svc = sourceResolverFactory({ strapi: mockStrapi as any });
    const result = await svc.identify({ utm: { utmSource: "new_source" } });
    expect(result.isNew).toBe(true);
    expect(findOne).toHaveBeenCalled();
    const findOneArgs = findOne.mock.calls[0][0];
    expect(findOneArgs.populate.promoCampaign.populate.channel).toBe(true);
    // 返回的 tag.promoCampaign 应是对象（有 documentId）
    expect(result.tag.promoCampaign).toEqual(expect.objectContaining({ documentId: "camp1" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/source-resolver-populate.test.ts --no-cache`
Expected: FAIL with "expect(callArgs.populate).toBeDefined()"

- [ ] **Step 3: Modify source-resolver.ts**

在 `strapi/plugins/zhao-track/server/src/services/source-resolver.ts` 中，4 处修改：

1. 第 45-47 行（sourceTagId 查询）加 populate：
```typescript
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: { tagId: opts.sourceTagId },
          populate: { promoCampaign: { populate: { channel: true } } },
        });
```

2. 第 64 行（utm 组合查询）加 populate：
```typescript
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters,
          populate: { promoCampaign: { populate: { channel: true } } },
        });
```

3. 第 78-84 行（deviceFingerprint 查询）加 populate：
```typescript
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: {
            deviceFingerprint: opts.deviceFingerprint,
            lastSeenAt: { $gte: thirtyDaysAgo.toISOString() },
          },
          sort: { lastSeenAt: "desc" },
          populate: { promoCampaign: { populate: { channel: true } } },
        });
```

4. 第 103-118 行（新建 SourceTag）改为 create + findOne：
```typescript
      // 4. 创建新 SourceTag
      const tagId = `utm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      const newTag = await strapi.documents(SOURCE_TAG_UID).create({
        data: {
          tagId,
          promoCampaign: matchedCampaignId || null,
          sourceUrl: opts.fullUrl,
          utmSource: opts.utm?.utmSource,
          utmMedium: opts.utm?.utmMedium,
          utmCampaign: opts.utm?.utmCampaign,
          utmContent: opts.utm?.utmContent,
          utmTerm: opts.utm?.utmTerm,
          deviceFingerprint: opts.deviceFingerprint,
          firstSeenAt: now,
          lastSeenAt: now,
        } as any,
      });
      // create 不返回 populate 的 relation，需重新查询
      const populated = await strapi.documents(SOURCE_TAG_UID).findOne({
        documentId: newTag.documentId,
        populate: { promoCampaign: { populate: { channel: true } } },
      });
      return { tag: populated, isNew: true };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/source-resolver-populate.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Fix source-resolver-migration.test.ts mock (missing findOne)**

`source-resolver-migration.test.ts` 的 mock 不含 `findOne`，修改 source-resolver 后会崩溃。需在 2 处 mock 补加 `findOne`：

第 26 行：`return { findMany, update, create };` → `return { findMany, update, create, findOne: jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123', promoCampaign: null }) };`

第 41 行：`return { findMany, create, update };` → `return { findMany, create, update, findOne: jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123', promoCampaign: null }) };`

- [ ] **Step 6: Run existing source-resolver tests to verify no regression**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/source-resolver.test.ts tests/services/source-resolver-migration.test.ts --no-cache`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd strapi/plugins/zhao-track
git add server/src/services/source-resolver.ts tests/services/source-resolver-populate.test.ts tests/services/source-resolver-migration.test.ts
git commit -m "fix: populate promoCampaign.channel in source-resolver identify (root cause of attribution chain)"
```

---

## Task 5: B2 attribution 规则 3 + sourceTagId + populate

**Files:**
- Modify: `strapi/plugins/zhao-track/server/src/services/attribution.ts`
- Modify: `strapi/plugins/zhao-track/tests/services/attribution.test.ts`
- Test: `strapi/plugins/zhao-track/tests/services/attribution-rule3.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-track/tests/services/attribution-rule3.test.ts`：

```typescript
import attributionFactory from "../../server/src/services/attribution";
import { createMockStrapi } from "../helpers/mock-strapi";

const ORDER_UID = "plugin::zhao-track.order";
const CLICK_EVENT_UID = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";
const CAMPAIGN_UID = "plugin::zhao-studio.promo-campaign";

describe("Attribution 规则 3 (weak_match)", () => {
  it("规则 3 查询使用 promoPid 而非 promoCampaign.$in", async () => {
    const order = {
      documentId: "o3", orderId: "po3", promoPid: "promo_003",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const clickFindMany = jest.fn().mockImplementation((args: any) => {
      const filters = args.filters || {};
      // 规则 1: promoCampaign.$in
      if (filters.promoCampaign && filters.promoCampaign.$in) return Promise.resolve([]);
      // 规则 3: promoPid（不含 promoCampaign.$in）
      if (filters.promoPid) return Promise.resolve([{ documentId: "click3", sourceTag: { documentId: "st3" } }]);
      // 规则 4: 仅 coupon
      if (filters.coupon) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockImplementation((uid: string) => {
      if (uid === ORDER_UID) return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() };
      if (uid === CLICK_EVENT_UID) return { findMany: clickFindMany };
      if (uid === CHANNEL_CONFIG_UID) return { findMany: jest.fn().mockResolvedValue([]) };
      if (uid === CAMPAIGN_UID) return { findMany: jest.fn().mockResolvedValue([]) };
      return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), findOne: jest.fn() };
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result).not.toBeNull();
    expect(result?.quality).toBe("weak_match");
  });

  it("规则 3 返回 sourceTagId", async () => {
    const order = {
      documentId: "o3b", orderId: "po3b", promoPid: "promo_003b",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const clickFindMany = jest.fn().mockImplementation((args: any) => {
      const filters = args.filters || {};
      if (filters.promoCampaign && filters.promoCampaign.$in) return Promise.resolve([]);
      if (filters.promoPid) return Promise.resolve([{ documentId: "click3b", sourceTag: { documentId: "st3b" } }]);
      if (filters.coupon) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockImplementation((uid: string) => {
      if (uid === ORDER_UID) return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() };
      if (uid === CLICK_EVENT_UID) return { findMany: clickFindMany };
      if (uid === CHANNEL_CONFIG_UID) return { findMany: jest.fn().mockResolvedValue([]) };
      if (uid === CAMPAIGN_UID) return { findMany: jest.fn().mockResolvedValue([]) };
      return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), findOne: jest.fn() };
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result?.sourceTagId).toBe("st3b");
  });

  it("规则 1 命中后不执行规则 3", async () => {
    const order = {
      documentId: "o3c", orderId: "po3c", promoPid: "promo_003c",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const clickFindMany = jest.fn().mockImplementation((args: any) => {
      const filters = args.filters || {};
      // 规则 1 命中
      if (filters.promoCampaign && filters.promoCampaign.$in) return Promise.resolve([{ documentId: "click1", sourceTag: { documentId: "st1" } }]);
      if (filters.promoPid) return Promise.resolve([{ documentId: "click3" }]);
      if (filters.coupon) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const mockStrapi = createMockStrapi();
    mockStrapi.documents.mockImplementation((uid: string) => {
      if (uid === ORDER_UID) return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() };
      if (uid === CLICK_EVENT_UID) return { findMany: clickFindMany };
      if (uid === CHANNEL_CONFIG_UID) return { findMany: jest.fn().mockResolvedValue([{ documentId: "cfg", channel: { documentId: "ch1" } }]) };
      if (uid === CAMPAIGN_UID) return { findMany: jest.fn().mockResolvedValue([{ documentId: "camp1" }]) };
      return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), findOne: jest.fn() };
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result?.quality).toBe("pid_match");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/attribution-rule3.test.ts --no-cache`
Expected: FAIL（规则 3 仍是旧逻辑，不会按 promoPid 查询）

- [ ] **Step 3: Modify attribution.ts**

在 `strapi/plugins/zhao-track/server/src/services/attribution.ts` 中：

1. 规则 1（第 48-56 行）click 查询加 `populate: { sourceTag: true }`，return 加 `sourceTagId`：
```typescript
              const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
                filters: {
                  coupon: couponDocId,
                  promoCampaign: { $in: campaignIds },
                  clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
                },
                sort: { clickedAt: "desc" },
                limit: 1,
                populate: { sourceTag: true },
              });
              if (clicks && clicks.length > 0) {
                return { click: clicks[0], quality: "pid_match", sourceTagId: clicks[0].sourceTag?.documentId };
              }
```

2. 规则 2（第 71-79 行）click 查询加 `populate: { sourceTag: true }`，return 加 `sourceTagId`：
```typescript
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            coupon: couponDocId,
            deviceFingerprint: order.deviceFingerprint,
            clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
          },
          sort: { clickedAt: "desc" },
          limit: 1,
          populate: { sourceTag: true },
        });
        if (clicks && clicks.length > 0) {
          return { click: clicks[0], quality: "click_match", sourceTagId: clicks[0].sourceTag?.documentId };
        }
```

3. 规则 3（第 88-122 行）整段替换为：
```typescript
    // 规则 3: coupon + promoPid 弱匹配（不限制 promoCampaign）
    if (order.promoPid) {
      try {
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            coupon: couponDocId,
            promoPid: order.promoPid,
            clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
          },
          sort: { clickedAt: "desc" },
          limit: 1,
          populate: { sourceTag: true },
        });
        if (clicks && clicks.length > 0) {
          return { click: clicks[0], quality: "weak_match", sourceTagId: clicks[0].sourceTag?.documentId };
        }
      } catch (err: any) {
        strapi.log.warn(`[attribution] rule3 (weak_match) failed: ${err.message}`);
      }
    }
```

4. 规则 4（第 126-133 行）click 查询加 `populate: { sourceTag: true }`，return 加 `sourceTagId`：
```typescript
      const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
        filters: {
          coupon: couponDocId,
          clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
        },
        sort: { clickedAt: "desc" },
        limit: 1,
        populate: { sourceTag: true },
      });
      if (clicks && clicks.length > 0) {
        return { click: clicks[0], quality: "fallback_match", sourceTagId: clicks[0].sourceTag?.documentId };
      }
```

5. run() 第 155 行 populate 改为：
```typescript
        populate: { coupon: true, promoCampaign: true },
```

- [ ] **Step 4: Run new test to verify it passes**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/attribution-rule3.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Update existing attribution.test.ts mock**

在 `strapi/plugins/zhao-track/tests/services/attribution.test.ts` 中，更新 `buildMockStrapi` 的 `clickFindMany` mock：

第 18-22 行替换为：
```typescript
  const clickFindMany = jest.fn().mockImplementation((args: any) => {
    const filters = args.filters || {};
    if (filters.deviceFingerprint) return Promise.resolve(clicksByRule.rule2 || []);
    if (filters.promoCampaign && filters.promoCampaign.$in) return Promise.resolve(clicksByRule.rule1 || []);
    if (filters.promoPid) return Promise.resolve(clicksByRule.rule3 || []);
    if (filters.coupon) return Promise.resolve(clicksByRule.rule4 || []);
    return Promise.resolve([]);
  });
```

第 79-96 行的规则 3 测试替换为：
```typescript
  it("规则 3：coupon + promoPid 命中 → weak_match（规则 1 未命中时）", async () => {
    const order = {
      documentId: "o3", orderId: "po3", promoPid: "promo_003",
      transactedAt: "2026-07-20T10:00:00Z",
      coupon: { documentId: "c1" },
    };
    const { mockStrapi } = buildMockStrapi({
      channelConfigsByPid: { promo_003: [{ documentId: "cfg3", channel: { documentId: "ch3" } }] },
      campaignsByChannel: { ch3: [{ documentId: "camp3" }] },
      // 规则 1 无命中（promoCampaign.$in 查询返回空），规则 3 命中（promoPid 查询返回结果）
      clicksByRule: { rule3: [{ documentId: "click3", promoPid: "promo_003", sourceTag: { documentId: "st3" } }] },
    });
    const svc = attributionFactory({ strapi: mockStrapi as any });
    const result = await svc.findMatchingClick(order);
    expect(result).not.toBeNull();
    expect(result?.quality).toBe("weak_match");
    expect(result?.sourceTagId).toBe("st3");
  });
```

- [ ] **Step 6: Run existing attribution tests to verify no regression**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/attribution.test.ts --no-cache`
Expected: PASS (全部测试)

- [ ] **Step 7: Commit**

```bash
cd strapi/plugins/zhao-track
git add server/src/services/attribution.ts tests/services/attribution.test.ts tests/services/attribution-rule3.test.ts
git commit -m "fix: rewrite attribution rule 3 as coupon+promoPid match + add sourceTagId to all rules"
```

---

## Task 6: B2 click-orchestrator PLATFORM_TYPE_MAP

**Files:**
- Modify: `strapi/plugins/zhao-track/server/src/services/click-orchestrator.ts`
- Test: `strapi/plugins/zhao-track/tests/services/click-orchestrator-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-track/tests/services/click-orchestrator-mapping.test.ts`：

```typescript
import clickOrchestratorFactory from "../../server/src/services/click-orchestrator";

describe("click-orchestrator PLATFORM_TYPE_MAP", () => {
  it("douyin 映射为 douyin-ecom", async () => {
    // 验证 ChannelPlatformConfig 查询时 platform.type 使用 douyin-ecom
    const configFindMany = jest.fn().mockResolvedValue([{ promoPid: "pid_douyin" }]);
    const couponFindMany = jest.fn().mockResolvedValue([{
      documentId: "c1", couponId: "coupon1", promoLink: "http://link",
      platform: { code: "douyin", name: "抖音" },
      product: null,
    }]);
    const sourceResolverIdentify = jest.fn().mockResolvedValue({
      tag: { documentId: "st1", tagId: "t1", promoCampaign: { documentId: "camp1", channel: { documentId: "ch1" } } },
      isNew: false,
    });
    const rateLimiter = { checkAndRecord: jest.fn().mockResolvedValue({ allowed: true }) };
    const transformLink = jest.fn().mockResolvedValue({ resolvedLink: "http://resolved" });
    const mockStrapi: any = {
      documents: jest.fn().mockImplementation((uid: string) => {
        if (uid === "plugin::zhao-deal.coupon") return { findMany: couponFindMany };
        if (uid === "plugin::zhao-studio.channel-platform-config") return { findMany: configFindMany };
        if (uid === "plugin::zhao-track.click-event") return { create: jest.fn().mockResolvedValue({ documentId: "ce1" }) };
        return { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() };
      }),
      plugin: jest.fn().mockImplementation((name: string) => {
        if (name === "zhao-track") return { service: (s: string) => s === "source-resolver" ? { identify: sourceResolverIdentify } : s === "rate-limiter" ? rateLimiter : null };
        if (name === "zhao-studio") return { service: () => ({ pickVariant: jest.fn().mockResolvedValue(null) }) };
        if (name === "zhao-deal") return { service: () => ({ get: () => ({ transformLink }) }) };
        return { service: () => null };
      }),
      log: { info: jest.fn(), warn: jest.fn() },
    };
    const svc = clickOrchestratorFactory({ strapi: mockStrapi });
    await svc.orchestrate({ couponId: "coupon1", deviceFingerprint: "fp1", utm: { utmSource: "test" } });
    // 验证 configFindMany 被调用时 platform.type = "douyin-ecom"
    const configArgs = configFindMany.mock.calls[0][0];
    expect(configArgs.filters.platform.type).toBe("douyin-ecom");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/click-orchestrator-mapping.test.ts --no-cache`
Expected: FAIL with "expected 'douyin-ecom' to be 'douyin'"（当前直接用 coupon.platform.code）

- [ ] **Step 3: Modify click-orchestrator.ts**

在 `strapi/plugins/zhao-track/server/src/services/click-orchestrator.ts` 中：

1. 第 6 行后（常量区）新增映射表：
```typescript
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";

// zhao-deal platform code → zhao-studio publish-platform type 映射
const PLATFORM_TYPE_MAP: Record<string, string> = {
  taobao: "taobao",
  pdd: "pdd",
  douyin: "douyin-ecom",
  jd: "jd",
};
```

2. 第 83 行改为：
```typescript
          const configs = await strapi.documents(CHANNEL_CONFIG_UID).findMany({
            filters: { channel: channelId, platform: { type: PLATFORM_TYPE_MAP[coupon.platform?.code] || coupon.platform?.code } },
            limit: 1,
          });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/click-orchestrator-mapping.test.ts --no-cache`
Expected: PASS (1 test)

- [ ] **Step 5: Run existing click-orchestrator tests for regression**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/click-orchestrator.test.ts --no-cache`
Expected: PASS（如有失败，修复 mock）

- [ ] **Step 6: Commit**

```bash
cd strapi/plugins/zhao-track
git add server/src/services/click-orchestrator.ts tests/services/click-orchestrator-mapping.test.ts
git commit -m "fix: add PLATFORM_TYPE_MAP to map douyin→douyin-ecom for channel config lookup"
```

---

## Task 7: B3 order-sync + source.ts 修复

**Files:**
- Modify: `strapi/plugins/zhao-track/server/src/services/order-sync.ts`
- Modify: `strapi/plugins/zhao-track/server/src/controllers/source.ts`
- Test: `strapi/plugins/zhao-track/tests/controllers/source.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-track/tests/controllers/source.test.ts`：

```typescript
import sourceControllerFactory from "../../server/src/controllers/source";

describe("source controller", () => {
  it("identify 返回 promoCampaignId 而非 promoChannelId", async () => {
    const identify = jest.fn().mockResolvedValue({
      tag: { tagId: "t1", promoCampaign: { documentId: "camp1" }, scene: "wechat" },
      isNew: false,
    });
    const mockStrapi: any = {
      plugin: () => ({ service: (name: string) => name === "source-resolver" ? { identify } : null }),
    };
    const ctrl = sourceControllerFactory({ strapi: mockStrapi });
    const ctx: any = {
      request: { body: { data: { utm: { utmSource: "wechat" } } } },
      body: null,
    };
    await ctrl.identify(ctx);
    expect(ctx.body.data).toHaveProperty("promoCampaignId", "camp1");
    expect(ctx.body.data).not.toHaveProperty("promoChannelId");
  });

  it("promoCampaign 为 null 时返回 promoCampaignId=null", async () => {
    const identify = jest.fn().mockResolvedValue({
      tag: { tagId: "t2", promoCampaign: null, scene: null },
      isNew: true,
    });
    const mockStrapi: any = {
      plugin: () => ({ service: (name: string) => name === "source-resolver" ? { identify } : null }),
    };
    const ctrl = sourceControllerFactory({ strapi: mockStrapi });
    const ctx: any = {
      request: { body: { utm: { utmSource: "new" } } },
      body: null,
    };
    await ctrl.identify(ctx);
    expect(ctx.body.data.promoCampaignId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-track && npx jest tests/controllers/source.test.ts --no-cache`
Expected: FAIL with "expected property promoCampaignId"

- [ ] **Step 3: Modify source.ts**

在 `strapi/plugins/zhao-track/server/src/controllers/source.ts` 第 20 行：

```typescript
        promoChannelId: tag.promoChannelId,
```

改为：

```typescript
        promoCampaignId: tag.promoCampaign?.documentId || null,
```

- [ ] **Step 4: Modify order-sync.ts**

在 `strapi/plugins/zhao-track/server/src/services/order-sync.ts` 第 104 行，删除整行：

```typescript
                  promoChannelId: item.promoChannelId,
```

（删除后第 103 行 `coupon: couponDocId,` 和原第 105 行 `promoPid: item.promoPid,` 之间的逗号衔接正确）

- [ ] **Step 5: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-track && npx jest tests/controllers/source.test.ts --no-cache`
Expected: PASS (2 tests)

- [ ] **Step 6: Run existing order-sync tests for regression**

Run: `cd strapi/plugins/zhao-track && npx jest tests/services/order-sync.test.ts --no-cache`
Expected: PASS（如有失败，修复测试中对 promoChannelId 的引用）

- [ ] **Step 7: Commit**

```bash
cd strapi/plugins/zhao-track
git add server/src/controllers/source.ts server/src/services/order-sync.ts tests/controllers/source.test.ts
git commit -m "fix: replace promoChannelId with promoCampaignId in source controller + remove from order-sync"
```

---

## Task 8: B3 query.ts + report.ts API 修复

**Files:**
- Modify: `strapi/plugins/zhao-track/server/src/controllers/query.ts`
- Modify: `strapi/plugins/zhao-track/server/src/controllers/report.ts`
- Test: `strapi/plugins/zhao-track/tests/controllers/query-api.test.ts`
- Test: `strapi/plugins/zhao-track/tests/controllers/report-api.test.ts`

- [ ] **Step 1: Write the failing tests**

创建 `strapi/plugins/zhao-track/tests/controllers/query-api.test.ts`：

```typescript
import queryControllerFactory from "../../server/src/controllers/query";

describe("query controller API 参数", () => {
  it("clicks 使用 filters/sort/start 而非 where/orderBy/offset", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
      db: { query: jest.fn().mockReturnValue({ count }) },
    };
    const ctrl = queryControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: { page: 1, pageSize: 20 } };
    await ctrl.clicks(ctx);
    const args = findMany.mock.calls[0][0];
    expect(args).toHaveProperty("filters");
    expect(args).not.toHaveProperty("where");
    expect(args).toHaveProperty("sort");
    expect(args).not.toHaveProperty("orderBy");
    expect(args).toHaveProperty("start");
    expect(args).not.toHaveProperty("offset");
  });

  it("orders 的 allowed 过滤不含 orderStatus", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
      db: { query: jest.fn().mockReturnValue({ count }) },
    };
    const ctrl = queryControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: { promoCampaign: "camp1", orderStatus: "paid" } };
    await ctrl.orders(ctx);
    const args = findMany.mock.calls[0][0];
    // orderStatus 不应出现在 filters 中（schema 无此字段）
    expect(args.filters).not.toHaveProperty("orderStatus");
    // promoCampaign 应在 filters 中
    expect(args.filters).toHaveProperty("promoCampaign", "camp1");
  });

  it("sourceTags 使用 promoCampaign 而非 promoChannelId", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
      db: { query: jest.fn().mockReturnValue({ count }) },
    };
    const ctrl = queryControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: { promoCampaign: "camp1" } };
    await ctrl.sourceTags(ctx);
    const args = findMany.mock.calls[0][0];
    expect(args.filters).toHaveProperty("promoCampaign", "camp1");
  });
});
```

创建 `strapi/plugins/zhao-track/tests/controllers/report-api.test.ts`：

```typescript
import reportControllerFactory from "../../server/src/controllers/report";

describe("report controller 字段修复", () => {
  it("使用 filters 而非 where", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
    };
    const ctrl = reportControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: { startDate: "2026-01-01", endDate: "2026-12-31" } };
    await ctrl.attributionReport(ctx);
    const args = findMany.mock.calls[0][0];
    expect(args).toHaveProperty("filters");
    expect(args).not.toHaveProperty("where");
  });

  it("使用 commission 而非 commissionAmount", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { commission: 10.5, attributionQuality: "pid_match", transactedAt: "2026-07-20T10:00:00Z", coupon: { documentId: "c1" } },
      { commission: 20.0, attributionQuality: "unmatched", transactedAt: "2026-07-21T10:00:00Z", coupon: { documentId: "c2" } },
    ]);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
    };
    const ctrl = reportControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: {} };
    await ctrl.attributionReport(ctx);
    // totalCommission = 10.5 + 20.0 = 30.5（如果用 commissionAmount 会是 0）
    expect(ctx.body.data.totalCommission).toBe(30.5);
    // matchedCommission = 10.5（仅 pid_match）
    expect(ctx.body.data.matchedCommission).toBe(10.5);
  });

  it("使用 promoCampaign 而非 promoChannelId", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
    };
    const ctrl = reportControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: { promoCampaign: "camp1" } };
    await ctrl.attributionReport(ctx);
    const args = findMany.mock.calls[0][0];
    expect(args.filters).toHaveProperty("promoCampaign", "camp1");
    expect(args.filters).not.toHaveProperty("promoChannelId");
  });

  it("populate 包含 coupon 和 promoCampaign", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const mockStrapi: any = {
      documents: jest.fn().mockReturnValue({ findMany }),
    };
    const ctrl = reportControllerFactory({ strapi: mockStrapi });
    const ctx: any = { query: {} };
    await ctrl.attributionReport(ctx);
    const args = findMany.mock.calls[0][0];
    expect(args.populate).toHaveProperty("coupon", true);
    expect(args.populate).toHaveProperty("promoCampaign", true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd strapi/plugins/zhao-track && npx jest tests/controllers/query-api.test.ts tests/controllers/report-api.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Modify query.ts**

替换 `strapi/plugins/zhao-track/server/src/controllers/query.ts` 全部内容为：

```typescript
import type { Core } from "@strapi/strapi";

const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) return { data: result, meta: {} };
  return { data: result, meta: {} };
};

const CLICK_UID = "plugin::zhao-track.click-event";
const ORDER_UID = "plugin::zhao-track.order";
const SOURCE_TAG_UID = "plugin::zhao-track.source-tag";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getUserId = (ctx: any) => ctx.state.user?.id || ctx.state.user?.documentId;

  const buildFilters = (ctx: any, allowed: string[]) => {
    const filters: any = {};
    for (const key of allowed) {
      if (ctx.query[key] !== undefined) filters[key] = ctx.query[key];
    }
    if (ctx.query.startDate || ctx.query.endDate) {
      const field = ctx.query.dateField || "createdAt";
      filters[field] = {};
      if (ctx.query.startDate) filters[field].$gte = ctx.query.startDate;
      if (ctx.query.endDate) filters[field].$lte = ctx.query.endDate;
    }
    return filters;
  };

  return {
    async clicks(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const filters = buildFilters(ctx, ["coupon", "sourceTag", "promoCampaign", "deviceFingerprint"]);
        if (ctx.query.dateField === undefined) {
          if (filters.createdAt) { filters.clickedAt = filters.createdAt; delete filters.createdAt; }
        }
        const [results, total] = await Promise.all([
          strapi.documents(CLICK_UID).findMany({
            filters,
            sort: { clickedAt: "desc" },
            start: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, sourceTag: true },
          }),
          strapi.db.query(CLICK_UID).count({ where: filters }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },

    async orders(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const filters = buildFilters(ctx, ["promoCampaign", "commissionStatus"]);
        if (ctx.query.startDate || ctx.query.endDate) {
          filters.transactedAt = filters.createdAt || {};
          delete filters.createdAt;
        }
        const [results, total] = await Promise.all([
          strapi.documents(ORDER_UID).findMany({
            filters,
            sort: { transactedAt: "desc" },
            start: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, matchedClick: true, sourceTag: true },
          }),
          strapi.db.query(ORDER_UID).count({ where: filters }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },

    async sourceTags(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const filters = buildFilters(ctx, ["promoCampaign"]);
        const [results, total] = await Promise.all([
          strapi.documents(SOURCE_TAG_UID).findMany({
            filters,
            sort: { lastSeenAt: "desc" },
            start: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
          }),
          strapi.db.query(SOURCE_TAG_UID).count({ where: filters }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },
  };
};
```

- [ ] **Step 4: Modify report.ts**

替换 `strapi/plugins/zhao-track/server/src/controllers/report.ts` 全部内容为：

```typescript
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const ORDER_UID = "plugin::zhao-track.order";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async attributionReport(ctx: any) {
    try {
      const { promoCampaign, startDate, endDate, groupBy = "day" } = ctx.query;
      const filters: any = {};
      if (promoCampaign) filters.promoCampaign = promoCampaign;
      if (startDate || endDate) {
        filters.transactedAt = {};
        if (startDate) filters.transactedAt.$gte = startDate;
        if (endDate) filters.transactedAt.$lte = endDate;
      }

      const orders = await strapi.documents(ORDER_UID).findMany({
        filters,
        limit: 5000,
        populate: { coupon: true, promoCampaign: true },
      });

      const stats = {
        totalOrders: orders.length,
        matchedOrders: 0,
        unmatchedOrders: 0,
        totalCommission: 0,
        matchedCommission: 0,
        byQuality: { pid_match: 0, click_match: 0, weak_match: 0, fallback_match: 0, unmatched: 0 },
        groups: {} as Record<string, { orders: number; commission: number }>,
      };

      for (const o of orders) {
        stats.totalCommission += Number(o.commission) || 0;
        const q = o.attributionQuality || "unmatched";
        stats.byQuality[q as keyof typeof stats.byQuality] = (stats.byQuality[q as keyof typeof stats.byQuality] || 0) + 1;
        if (q === "unmatched") {
          stats.unmatchedOrders++;
        } else {
          stats.matchedOrders++;
          stats.matchedCommission += Number(o.commission) || 0;
        }

        let groupKey = "all";
        if (groupBy === "day") {
          groupKey = new Date(o.transactedAt).toISOString().slice(0, 10);
        } else if (groupBy === "channel") {
          groupKey = o.promoCampaign?.documentId || "unknown";
        } else if (groupBy === "coupon") {
          groupKey = o.coupon?.documentId || "unknown";
        }
        if (!stats.groups[groupKey]) stats.groups[groupKey] = { orders: 0, commission: 0 };
        stats.groups[groupKey].orders++;
        stats.groups[groupKey].commission += Number(o.commission) || 0;
      }

      ctx.body = wrap(stats);
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd strapi/plugins/zhao-track && npx jest tests/controllers/query-api.test.ts tests/controllers/report-api.test.ts --no-cache`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
cd strapi/plugins/zhao-track
git add server/src/controllers/query.ts server/src/controllers/report.ts tests/controllers/query-api.test.ts tests/controllers/report-api.test.ts
git commit -m "fix: use Document Service API params (filters/sort/start) + fix commission field + promoCampaign filter"
```

---

## Task 9: 全量回归验证

**Files:** 无（仅运行验证命令）

- [ ] **Step 1: 运行 zhao-deal 全量测试**

Run: `cd strapi/plugins/zhao-deal && npx jest --no-cache --no-coverage`
Expected: 所有测试通过

- [ ] **Step 2: 运行 zhao-track 全量测试**

Run: `cd strapi/plugins/zhao-track && npx jest --no-cache --no-coverage`
Expected: 所有测试通过

- [ ] **Step 3: 运行 4 插件 build 验证**

Run（4 个命令分别执行）：
```
cd strapi/plugins/zhao-deal && npm run build
cd strapi/plugins/zhao-track && npm run build
cd strapi/plugins/zhao-studio && npm run build
cd strapi/plugins/zhao-auth && npm run build
```
Expected: 4 个 build 全部成功

- [ ] **Step 4: 如有失败，修复后重新提交**

如果上述任一验证失败，根据错误信息修复，重新运行验证，验证通过后提交：

```bash
cd strapi
git add -A
git commit -m "fix: regression issues from B1+B2+B3 fixes"
```

如果全部通过，无需额外提交。

---

## Self-Review

**1. Spec coverage:**

- §2.1 Schema 反向关系（platform 3 + category 2 + coupon 2 + source-tag 1 = 8 个 relation）→ Task 1 ✅
- §2.2 adapterRegistry 服务注册（新建 + index.ts + bootstrap.ts）→ Task 2 ✅
- §2.2 cron 服务名修复（sync-scheduler → syncScheduler）→ Task 3 ✅
- §2.3 安全 hotfix（listPlatforms fields + populate platform fields）→ Task 3 ✅
- §3.1 source-resolver populate（4 处）→ Task 4 ✅
- §3.2 归因规则 3 重写（coupon + promoPid + 时间窗）→ Task 5 ✅
- §3.3 sourceTagId 回填（4 个 return）→ Task 5 ✅
- §3.4 source-tag schema clickEvents → Task 1 ✅
- §3.5 PLATFORM_TYPE_MAP（douyin → douyin-ecom）→ Task 6 ✅
- §3.6 run() populate 补全 → Task 5 ✅
- §4.1 order-sync 删除 promoChannelId → Task 7 ✅
- §4.2 source.ts promoChannelId → promoCampaignId → Task 7 ✅
- §4.3 query.ts where→filters + promoChannelId→promoCampaign + 删除 orderStatus → Task 8 ✅
- §4.4 report.ts where→filters + commissionAmount→commission + promoChannelId→promoCampaign + populate → Task 8 ✅
- cron.test.ts 同步更新（spec 审查时发现的遗漏）→ Task 3 ✅

**2. Placeholder scan:** 无 TBD/TODO/占位符，所有代码完整 ✅

**3. Type consistency:**
- `service("syncScheduler")` — Task 3 cron.ts + Task 3 cron.test.ts 一致 ✅
- `service("adapterRegistry")` — Task 2 services/index.ts key + 现有 sync.ts/click-orchestrator.ts 调用一致 ✅
- `promoCampaign?.documentId` — Task 4 source-resolver populate + Task 7 source.ts 返回 一致 ✅
- `filters.promoPid` — Task 5 attribution 规则 3 + Task 5 测试 mock 一致 ✅
- `PLATFORM_TYPE_MAP` — Task 6 定义 + 使用一致 ✅
- `o.commission` — Task 8 report.ts + order schema 字段名 一致 ✅
- `filters`/`sort`/`start` — Task 8 query.ts + report.ts + 测试 一致 ✅
