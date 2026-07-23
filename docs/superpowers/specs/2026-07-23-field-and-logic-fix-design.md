# 字段与逻辑修复设计（子项目 B1+B2+B3）

> 日期：2026-07-23
> 状态：待审阅
> 范围：修复 zhao-deal schema 反向关系 + 服务注册 + 安全 hotfix（B1）、zhao-track 归因链路（B2）、zhao-track 代码迁移 + API 修复（B3），共 13 个致命问题

---

## 1. 背景与目标

### 1.1 背景

淘宝客业务流程调研发现 3 个插件共 52 个问题（13 致命 / 22 重要 / 17 次要）。本子项目聚焦 13 个致命问题，是让淘宝客业务跑通的最小必要修复。

### 1.2 目标

- B1：补全 zhao-deal schema 反向关系（5 致命）、修复服务注册（2 致命）、修复凭据泄露（1 致命 hotfix）
- B2：修复归因链路根因（1 致命根因 + 3 致命连锁）、修复规则 3 死代码（1 致命）
- B3：修复 promoChannelId 残留引用（3 致命）、修复 Document Service API 参数误用（2 致命）

### 1.3 不在范围内

- zhao-deal 审核链路补全（product-candidate reject/batch、approve 防重、权限拆分）→ 子项目 B5
- zhao-studio 功能补全（平台配置暴露、变体 CRUD、实验 update/delete、groupBy）→ 子项目 B4
- 真实平台 API 接入 → 子项目 C
- 次要问题（代码质量/契约不一致）

---

## 2. B1 基础层修复（zhao-deal）

### 2.1 Schema 反向关系补全

3 个 schema 缺少被 inversedBy 引用的 mappedBy 反向字段，导致 Strapi 加载时关系退化或报错。

**platform/schema.json** — 新增 3 个 relation：

```json
"coupons": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-deal.coupon", "mappedBy": "platform"
},
"products": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-deal.product", "mappedBy": "platform"
},
"categories": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-deal.category", "mappedBy": "platform"
}
```

**category/schema.json** — 新增 2 个 relation：

```json
"coupons": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-deal.coupon", "mappedBy": "category"
},
"products": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-deal.product", "mappedBy": "category"
}
```

**coupon/schema.json** — 新增 2 个 relation：

```json
"product": {
  "type": "relation", "relation": "oneToOne",
  "target": "plugin::zhao-deal.product", "mappedBy": "coupon"
},
"clickEvents": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-track.click-event", "mappedBy": "coupon"
}
```

**source-tag/schema.json**（zhao-track）— 新增 1 个 relation（B2 范围，但属同类问题）：

```json
"clickEvents": {
  "type": "relation", "relation": "oneToMany",
  "target": "plugin::zhao-track.click-event", "mappedBy": "sourceTag"
}
```

### 2.2 服务注册修复

**问题 A：adapterRegistry 未注册为服务**

bootstrap.ts 第 41 行用 `plugin.service("adapterRegistry", registry)` 注入，但 Strapi v5 的 `service(name)` 不支持 setter。

**修复**：

1. 新建 `services/adapter-registry-service.ts`，导出 `initRegistry`（async，bootstrap 时调用）和工厂函数（返回单例）
2. `services/index.ts` 新增 `adapterRegistry` key
3. `bootstrap.ts` 调用 `initRegistry(strapi)` 初始化单例
4. `sync.ts` 和 `click-orchestrator.ts` 中 `service("adapterRegistry")` 调用不变（key 已注册）

新建文件 `server/src/services/adapter-registry-service.ts`：

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
    const cfg = { appKey: platform.appKey || "", appSecret: platform.appSecret || "", apiEndpoint: platform.apiEndpoint || "" };
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

修改 `services/index.ts`：

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

修改 `bootstrap.ts` 第 14-41 行 → 替换为：

```typescript
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

**问题 B：cron 服务名不匹配**

cron.ts 第 5 行 `service("sync-scheduler")`（kebab-case），services/index.ts 注册为 `syncScheduler`（camelCase）。

**修复**：cron.ts 中 `"sync-scheduler"` → `"syncScheduler"`。

### 2.3 安全 Hotfix：listPlatforms 凭据泄露

content-api.ts 第 18 行 `/platforms` 是 `publicRoute`（无鉴权），query.ts 的 listPlatforms() 返回全部字段含 appKey/appSecret。

**修复**：

query.ts listPlatforms 加 fields 白名单：
```typescript
async listPlatforms() {
  return strapi.documents(PLATFORM_UID).findMany({
    fields: ["name", "code", "promoSite"],
  });
}
```

所有公开接口 populate platform 时加 fields 限制：
- listCoupons: `populate: { platform: { fields: ["name", "code"] }, product: true }`
- listProducts: `populate: { platform: { fields: ["name", "code"] }, category: true }`
- getCoupon: `populate: { platform: { fields: ["name", "code"] }, product: true }`
- listCategories: `populate: { platform: { fields: ["name", "code"] } }`
- getCollection: `populate: { coupons: { populate: { platform: { fields: ["name", "code"] } } } }`

---

## 3. B2 归因链路修复（zhao-track）

### 3.1 根因修复：source-resolver 未 populate promoCampaign

source-resolver.ts 的 4 处查询/创建都未 populate promoCampaign，导致 tag.promoCampaign 是 documentId 字符串而非对象。

**修复**：4 处都加 `populate: { promoCampaign: { populate: { channel: true } } }`。

| 位置 | 行号 | 修改 |
|------|------|------|
| sourceTagId 查询 | 45-47 | findMany 加 populate |
| utm 组合查询 | 64 | findMany 加 populate |
| deviceFingerprint 查询 | 78-84 | findMany 加 populate |
| 新建 SourceTag | 103-117 | create 后再 findOne 带 populate |

新建 SourceTag 修复：
```typescript
const newTag = await strapi.documents(SOURCE_TAG_UID).create({ data: { ... } });
const populated = await strapi.documents(SOURCE_TAG_UID).findOne({
  documentId: newTag.documentId,
  populate: { promoCampaign: { populate: { channel: true } } },
});
return { tag: populated, isNew: true };
```

### 3.2 归因规则 3 修复：死代码 → coupon + promoPid + 时间窗

attribution.ts 第 88-122 行，规则 3 与规则 1 查询完全相同（死代码）。

**修复**：规则 3 改为 coupon + promoPid + 时间窗，去掉 promoCampaign 和 ChannelPlatformConfig 反查。

4 级归因匹配维度：

| 规则 | 匹配维度 | 严格度 |
|------|---------|--------|
| 规则 1 (pid_match) | coupon + promoCampaign + 时间窗 | 最严格 |
| 规则 2 (click_match) | coupon + deviceFingerprint + 时间窗 | 独立维度 |
| 规则 3 (weak_match) | coupon + promoPid + 时间窗 | 比 1 弱(不限制 campaign)，比 4 强(要求 promoPid) |
| 规则 4 (fallback_match) | coupon + 时间窗 | 最宽松 |

修改后规则 3 代码（替换第 88-122 行）：

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

### 3.3 sourceTagId 回填修复

findMatchingClick 的 4 个 return 都未设置 sourceTagId，但 run() 第 170-172 行检查它。

**修复**：4 个 click 查询都加 `populate: { sourceTag: true }`，4 个 return 都加 `sourceTagId: clicks[0].sourceTag?.documentId`。

具体修改：
- 规则 1（第 48-56 行）：加 `populate: { sourceTag: true }`，return 加 `sourceTagId`
- 规则 2（第 71-79 行）：加 `populate: { sourceTag: true }`，return 加 `sourceTagId`
- 规则 3：已在 §3.2 修改中包含
- 规则 4（第 126-133 行）：加 `populate: { sourceTag: true }`，return 加 `sourceTagId`

### 3.4 source-tag schema 补充 clickEvents 反向关系

click-event 第 22-27 行 `sourceTag.inversedBy: "clickEvents"`，source-tag schema 缺少 clickEvents。

**修复**：source-tag/schema.json 新增（见 §2.1 已列出）。

### 3.5 ChannelPlatformConfig platform 跨实体语义修复

click-orchestrator.ts 第 83 行 `platform: { type: coupon.platform.code }` — coupon.platform 是 zhao-deal.platform（code: taobao/pdd/douyin/jd），channel-platform-config.platform 是 zhao-studio.publish-platform（type: 含 douyin-ecom 等）。`douyin` ≠ `douyin-ecom`。

**修复**：click-orchestrator.ts 第 78-91 行加映射表：

```typescript
// zhao-deal platform code → zhao-studio publish-platform type 映射
const PLATFORM_TYPE_MAP: Record<string, string> = {
  taobao: "taobao",
  pdd: "pdd",
  douyin: "douyin-ecom",
  jd: "jd",
};
```

第 83 行改为：
```typescript
filters: { channel: channelId, platform: { type: PLATFORM_TYPE_MAP[coupon.platform?.code] || coupon.platform?.code } },
```

### 3.6 归因 run() populate 补全

attribution.ts 第 153-158 行 `populate: { coupon: true }` → `populate: { coupon: true, promoCampaign: true }`。

---

## 4. B3 代码迁移 + API 修复（zhao-track）

### 4.1 order-sync.ts 删除 promoChannelId（致命）

order-sync.ts 第 104 行 `promoChannelId: item.promoChannelId` 写入已删除字段。

**修复**：删除第 104 行。promoCampaign 由归因 run() 第 173-175 行通过 click 回填，sync 时不设。

### 4.2 controllers/source.ts promoChannelId → promoCampaignId（致命）

source.ts 第 20 行 `promoChannelId: tag.promoChannelId` 恒为 undefined。

**修复**：

```typescript
// 第 20 行
promoChannelId: tag.promoChannelId,
// 改为
promoCampaignId: tag.promoCampaign?.documentId || null,
```

### 4.3 controllers/query.ts 修复（致命 + 重要）

4 类问题：

**A. Document Service API 参数名**

`where` → `filters`、`orderBy` → `sort`、`offset` → `start`（3 处 findMany）

**B. promoChannelId → promoCampaign**

buildWhere allowed 列表中 `promoChannelId` → `promoCampaign`（3 处）

**C. 删除 orderStatus**

orders 查询的 allowed 列表删除 `orderStatus`（order schema 无此字段）

**D. count 查询同步**

`strapi.db.query(UID).count({ where })` 保持 `where`（Entity Service API 正确），但 key 同步改为 `promoCampaign`

修改后完整 query.ts：

```typescript
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

### 4.4 controllers/report.ts 修复（致命 + 重要）

4 类问题：

**A. where → filters**

**B. commissionAmount → commission**（3 处：第 34、41、54 行）

**C. promoChannelId → promoCampaign**（第 9、11、48 行）

**D. populate coupon + promoCampaign**

修改后完整 report.ts：

```typescript
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

---

## 5. 改动范围汇总

### 5.1 文件清单

| 操作 | 文件 | 子项目 | 致命数 |
|------|------|--------|--------|
| 修改 | zhao-deal/server/src/content-types/platform/schema.json | B1 | 1 |
| 修改 | zhao-deal/server/src/content-types/category/schema.json | B1 | 1 |
| 修改 | zhao-deal/server/src/content-types/coupon/schema.json | B1 | 2 |
| 修改 | zhao-track/server/src/content-types/source-tag/schema.json | B2 | 0（schema 完整性） |
| 新建 | zhao-deal/server/src/services/adapter-registry-service.ts | B1 | 1 |
| 修改 | zhao-deal/server/src/services/index.ts | B1 | 1 |
| 修改 | zhao-deal/server/src/bootstrap.ts | B1 | 1 |
| 修改 | zhao-deal/server/src/config/cron.ts | B1 | 1 |
| 修改 | zhao-deal/server/src/services/query.ts | B1 | 1（安全 hotfix） |
| 修改 | zhao-track/server/src/services/source-resolver.ts | B2 | 4（根因） |
| 修改 | zhao-track/server/src/services/attribution.ts | B2 | 2 |
| 修改 | zhao-track/server/src/services/click-orchestrator.ts | B2 | 1 |
| 修改 | zhao-track/server/src/services/order-sync.ts | B3 | 1 |
| 修改 | zhao-track/server/src/controllers/source.ts | B3 | 1 |
| 修改 | zhao-track/server/src/controllers/query.ts | B3 | 2 |
| 修改 | zhao-track/server/src/controllers/report.ts | B3 | 2 |
| 共计 | 16 个文件（1 新建 + 15 修改） | | 13 致命 |

### 5.2 不涉及的文件

- zhao-studio 任何文件（B4 范围）
- zhao-deal controllers/candidate.ts、routes/admin-api.ts（B5 范围）
- zhao-deal adapters/ 下的 stub 适配器（C 范围）

---

## 6. 测试策略

### 6.1 B1 测试

**Schema 反向关系测试**：新增/修改测试验证 platform.coupons、category.coupons、coupon.product、coupon.clickEvents 关系存在。

**adapterRegistry 服务测试**：验证 `strapi.plugin("zhao-deal").service("adapterRegistry")` 返回非 undefined。

**cron 服务名测试**：验证 cron 回调调用 `service("syncScheduler")` 而非 `service("sync-scheduler")`。

**安全 hotfix 测试**：验证 listPlatforms 返回结果不含 appKey/appSecret 字段。

### 6.2 B2 测试

**source-resolver populate 测试**：验证 identify() 返回的 tag.promoCampaign 是对象（有 documentId）而非字符串。

**归因规则 3 测试**：验证规则 3 查询条件包含 promoPid、不包含 promoCampaign，且与规则 1 不同。

**sourceTagId 回填测试**：验证 findMatchingClick 返回 sourceTagId。

**PLATFORM_TYPE_MAP 测试**：验证 douyin → douyin-ecom 映射。

### 6.3 B3 测试

**order-sync 测试**：验证 create data 不含 promoChannelId。

**query.ts 参数测试**：验证 findMany 使用 filters/sort/start 而非 where/orderBy/offset。

**report.ts 字段测试**：验证使用 o.commission 而非 o.commissionAmount、使用 promoCampaign 而非 promoChannelId。

### 6.4 回归验证

```bash
cd strapi/plugins/zhao-deal && npx jest --no-cache --no-coverage
cd strapi/plugins/zhao-track && npx jest --no-cache --no-coverage
cd strapi/plugins/zhao-deal && npm run build
cd strapi/plugins/zhao-track && npm run build
cd strapi/plugins/zhao-studio && npm run build
cd strapi/plugins/zhao-auth && npm run build
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Schema 加 relation 字段需数据库迁移 | 中（Strapi 自动 ALTER TABLE） | 开发环境自动迁移；生产环境需停机执行 |
| adapterRegistry 单例在测试环境可能未初始化 | 低 | 工厂函数降级返回空 registry |
| source-resolver create 后再查一次有性能损耗 | 低（仅新建 SourceTag 时，非高频） | 可接受 |
| PLATFORM_TYPE_MAP 硬编码映射可能遗漏新平台 | 低 | 映射表可后续移到 channel-platform-config schema 的字段 |
| query.ts count 与 findMany 使用不同 API（db.query vs documents） | 低（Strapi v5 两者都支持） | 保持现状，仅同步 key 名 |
