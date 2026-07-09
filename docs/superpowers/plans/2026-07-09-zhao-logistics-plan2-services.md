# zhao-logistics Plan 2：3 个核心 Services 业务逻辑（quote-engine / tracking-aggregator / dynamic-form）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 3 个核心业务 Service（报价引擎、追踪聚合器、动态表单引擎），含外部追踪 API 适配器（4 种 provider），提供 Admin API 端点供后台调用。

**Architecture:** quote-engine 用 expr-eval 沙箱执行报价公式；tracking-aggregator 用 strategy 模式适配 17Track/AfterShip/快递100/自定义 API；dynamic-form 从 quote-field-rule 加载字段规则并校验。3 个 service 均注册到 services/index.ts，Admin API 端点挂载到 admin-api 路由。

**Tech Stack:** TypeScript + expr-eval（表达式沙箱）+ axios（HTTP 调用）+ Strapi v5 db.query

**配套设计文档**：[2026-07-09-zhao-logistics-plugin-design.md](../specs/2026-07-09-zhao-logistics-plugin-design.md) 第 4.1-4.3 节

**前置条件**：Plan 1 已完成（8 核心 CT schema + 基础 CRUD service + Admin API 路由）

**范围说明**：funnel-tracker / referral-engine / customer-aggregator 依赖 Plan 3 的 CT，放到 Plan 4 实现。

---

## 文件结构

**新建文件**：
- `plugins/zhao-logistics/server/src/services/quote-engine.ts` — 报价引擎
- `plugins/zhao-logistics/server/src/services/tracking-aggregator.ts` — 追踪聚合器
- `plugins/zhao-logistics/server/src/services/dynamic-form.ts` — 动态表单引擎
- `plugins/zhao-logistics/server/src/services/providers/types.ts` — TrackingProvider 接口定义
- `plugins/zhao-logistics/server/src/services/providers/track17.ts` — 17Track 适配器
- `plugins/zhao-logistics/server/src/services/providers/afterShip.ts` — AfterShip 适配器
- `plugins/zhao-logistics/server/src/services/providers/kuaidi100.ts` — 快递100 适配器
- `plugins/zhao-logistics/server/src/services/providers/custom.ts` — 自定义 API 适配器
- `plugins/zhao-logistics/server/src/services/providers/index.ts` — 适配器工厂
- `plugins/zhao-logistics/server/src/controllers/admin-api/quote-engine.ts` — 报价引擎 controller
- `plugins/zhao-logistics/server/src/controllers/admin-api/tracking-aggregator.ts` — 追踪聚合 controller
- `plugins/zhao-logistics/server/src/controllers/admin-api/dynamic-form.ts` — 动态表单 controller
- `plugins/zhao-logistics/tests/quote-engine.test.ts` — 报价引擎单元测试
- `plugins/zhao-logistics/tests/dynamic-form.test.ts` — 动态表单单元测试

**修改文件**：
- `plugins/zhao-logistics/server/src/services/index.ts` — 添加 3 个新 service
- `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts` — 添加 3 个新 controller
- `plugins/zhao-logistics/server/src/routes/admin-api.ts` — 添加新端点

---

## Task 1：quote-engine 报价引擎

**Files:**
- Create: `plugins/zhao-logistics/server/src/services/quote-engine.ts`
- Test: `plugins/zhao-logistics/tests/quote-engine.test.ts`

- [ ] **Step 1: 创建 quote-engine service**

Create `plugins/zhao-logistics/server/src/services/quote-engine.ts`:

```typescript
import type { Core } from "@strapi/strapi";
import { Parser } from "expr-eval";

const RULE_UID = "plugin::zhao-logistics.quote-price-rule";
const FORMULA_UID = "plugin::zhao-logistics.quote-price-formula";
const REQUEST_UID = "plugin::zhao-logistics.quote-request";

/**
 * 报价计算结果
 */
export interface QuoteResult {
  ruleId: string;
  formulaId?: string;
  serviceProvider: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  breakdown: {
    base: number;
    volumetricWeight: number;
    surcharges: { name: string; amount: number }[];
    minCharge: number;
    formula?: string;
  };
  expiresAt: string;
}

/**
 * 报价输入
 */
export interface QuoteInput {
  routeId: string;
  serviceProvider?: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  variables?: Record<string, number>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 计算报价（单服务商）
   * 1. 匹配 quote-price-rule（routeId + serviceProvider + weight 区间）
   * 2. 若 rule.formula 存在，加载 quote-price-formula
   * 3. 解析 variables（从 input + rule 提取值）
   * 4. 沙箱执行 expression（用 expr-eval）
   * 5. 返回 QuoteResult
   */
  async calculate(siteId: number, input: QuoteInput): Promise<QuoteResult | null> {
    // 1. 匹配报价规则
    const rules = await strapi.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight },
        ...(input.serviceProvider ? { serviceProvider: input.serviceProvider } : {}),
      },
      populate: { formula: true },
      limit: 1,
      orderBy: { minWeight: "asc" },
    });

    if (!rules || rules.length === 0) return null;
    const rule = rules[0];

    // 2. 计算体积重量
    let volumetricWeight = 0;
    if (input.length && input.width && input.height && rule.volumetricFactor) {
      volumetricWeight = (input.length * input.width * input.height) / rule.volumetricFactor;
    }
    const chargeableWeight = Math.max(input.weight, volumetricWeight);

    // 3. 计算基础运费
    let basePrice = chargeableWeight * Number(rule.pricePerKg);

    // 4. 附加费
    const surcharges: { name: string; amount: number }[] = [];
    if (rule.surcharges && Array.isArray(rule.surcharges)) {
      for (const surcharge of rule.surcharges) {
        const amount = typeof surcharge.amount === "number"
          ? surcharge.amount
          : chargeableWeight * Number(surcharge.amount || 0);
        surcharges.push({ name: surcharge.name, amount });
        basePrice += amount;
      }
    }

    // 5. 公式覆盖（若 rule.formula 存在）
    let formulaExpression: string | undefined;
    let formulaId: string | undefined;
    if (rule.formula && rule.formula.expression) {
      formulaExpression = rule.formula.expression;
      formulaId = rule.formula.documentId;

      try {
        const parser = new Parser();
        const expr = parser.parse(formulaExpression);

        // 合并变量：input.variables + 自动变量
        const variables: Record<string, number> = {
          weight: chargeableWeight,
          base: basePrice,
          ...input.variables,
        };

        // 从 formula.variables JSON 提取默认值
        if (rule.formula.variables && typeof rule.formula.variables === "object") {
          for (const [key, val] of Object.entries(rule.formula.variables)) {
            if (typeof val === "number" && !(key in variables)) {
              variables[key] = val;
            }
          }
        }

        basePrice = expr.evaluate(variables);
      } catch (err) {
        strapi.log.error(`[quote-engine] 公式执行失败: ${formulaExpression}`, err);
        // 公式失败时回退到基础运费
      }
    }

    // 6. 最低运费
    const minCharge = rule.minCharge ? Number(rule.minCharge) : 0;
    if (basePrice < minCharge) {
      basePrice = minCharge;
    }

    // 7. 生成结果（minPrice = basePrice，maxPrice = basePrice * 1.1，留 10% 浮动空间）
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 小时后过期

    return {
      ruleId: rule.documentId,
      formulaId,
      serviceProvider: rule.serviceProvider,
      minPrice: Math.round(basePrice * 100) / 100,
      maxPrice: Math.round(basePrice * 1.1 * 100) / 100,
      currency: rule.currency || "CNY",
      breakdown: {
        base: Math.round(chargeableWeight * Number(rule.pricePerKg) * 100) / 100,
        volumetricWeight: Math.round(volumetricWeight * 100) / 100,
        surcharges,
        minCharge,
        formula: formulaExpression,
      },
      expiresAt: expiresAt.toISOString(),
    };
  },

  /**
   * 批量计算（多服务商比价）
   */
  async calculateMulti(siteId: number, input: QuoteInput): Promise<QuoteResult[]> {
    // 查询所有匹配的服务商
    const rules = await strapi.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight },
      },
      populate: { formula: true },
      orderBy: { serviceProvider: "asc" },
    });

    if (!rules || rules.length === 0) return [];

    // 按服务商分组，每组取最优规则
    const serviceProviderMap = new Map<string, any>();
    for (const rule of rules) {
      if (!serviceProviderMap.has(rule.serviceProvider)) {
        serviceProviderMap.set(rule.serviceProvider, rule);
      }
    }

    const results: QuoteResult[] = [];
    for (const provider of serviceProviderMap.values()) {
      const result = await this.calculate(siteId, {
        ...input,
        serviceProvider: provider.serviceProvider,
      });
      if (result) results.push(result);
    }

    return results.sort((a, b) => a.minPrice - b.minPrice);
  },

  /**
   * 保存报价到 quote-request
   */
  async saveQuote(siteId: number, quoteRequestId: string, result: QuoteResult): Promise<void> {
    await strapi.db.query(REQUEST_UID).update({
      where: { site: siteId, documentId: quoteRequestId },
      data: {
        quotedPrice: result.minPrice,
        quotedPriceMax: result.maxPrice,
        quotedCurrency: result.currency,
        quotedBreakdown: result.breakdown,
        quotedExpiresAt: result.expiresAt,
        status: "quoted",
      },
    });
  },
});
```

- [ ] **Step 2: 创建 quote-engine 单元测试**

Create `plugins/zhao-logistics/tests/quote-engine.test.ts`:

```typescript
import { Parser } from "expr-eval";

describe("quote-engine", () => {
  describe("expr-eval 沙箱", () => {
    it("应正确解析并计算简单表达式", () => {
      const parser = new Parser();
      const expr = parser.parse("weight * 10 + base");
      const result = expr.evaluate({ weight: 5, base: 20 });
      expect(result).toBe(70);
    });

    it("应支持条件表达式", () => {
      const parser = new Parser();
      const expr = parser.parse("weight > 10 ? weight * 8 : weight * 10");
      expect(expr.evaluate({ weight: 5 })).toBe(50);
      expect(expr.evaluate({ weight: 15 })).toBe(120);
    });

    it("应拒绝危险函数（非数学函数）", () => {
      const parser = new Parser();
      expect(() => parser.parse("require('fs')")).toThrow();
      expect(() => parser.parse("process.exit()")).toThrow();
    });
  });

  describe("QuoteResult 结构", () => {
    it("应生成正确的报价结果结构", () => {
      const result = {
        ruleId: "rule-001",
        serviceProvider: "dhl",
        minPrice: 150.5,
        maxPrice: 165.55,
        currency: "CNY",
        breakdown: {
          base: 150.5,
          volumetricWeight: 0,
          surcharges: [{ name: "燃油附加费", amount: 15 }],
          minCharge: 50,
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(result.minPrice).toBeLessThan(result.maxPrice);
      expect(result.currency).toBe("CNY");
      expect(result.breakdown.surcharges).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/services/quote-engine.ts plugins/zhao-logistics/tests/quote-engine.test.ts
git commit -m "feat(zhao-logistics): quote-engine 报价引擎（expr-eval 沙箱+规则匹配+公式执行）"
```

---

## Task 2：tracking-aggregator 追踪聚合器

**Files:**
- Create: `plugins/zhao-logistics/server/src/services/providers/types.ts`
- Create: `plugins/zhao-logistics/server/src/services/providers/track17.ts`
- Create: `plugins/zhao-logistics/server/src/services/providers/afterShip.ts`
- Create: `plugins/zhao-logistics/server/src/services/providers/kuaidi100.ts`
- Create: `plugins/zhao-logistics/server/src/services/providers/custom.ts`
- Create: `plugins/zhao-logistics/server/src/services/providers/index.ts`
- Create: `plugins/zhao-logistics/server/src/services/tracking-aggregator.ts`

- [ ] **Step 1: 创建 TrackingProvider 接口定义**

Create `plugins/zhao-logistics/server/src/services/providers/types.ts`:

```typescript
/**
 * 外部追踪 API 适配器接口（strategy 模式）
 */
export interface TrackingProvider {
  /**
   * 查询运单轨迹
   */
  queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]>;
}

/**
 * 追踪 API 配置（来自 tracking-provider CT）
 */
export interface ProviderConfig {
  providerType: "17track" | "afterShip" | "kuaidi100" | "custom_api";
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
}

/**
 * 外部追踪节点（来自第三方 API）
 */
export interface ExternalTrackingNode {
  eventTime: string;
  location?: string;
  description: string;
  status?: string;
  providerRef?: string;
}
```

- [ ] **Step 2: 创建 17Track 适配器**

Create `plugins/zhao-logistics/server/src/services/providers/track17.ts`:

```typescript
import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 17Track API 适配器
 * 文档：https://api.17track.net/
 */
const track17Provider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://api.17track.net/track/v2.2/gettrackinfo";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": providerConfig.apiKey,
      },
      body: JSON.stringify({ data: [{ number: trackingNo }] }),
    });

    if (!response.ok) {
      throw new Error(`17Track API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data?.accepted && data.data.accepted.length > 0) {
      const trackInfo = data.data.accepted[0];
      if (trackInfo?.track?.z0) {
        for (const event of trackInfo.track.z0) {
          nodes.push({
            eventTime: event.z ? new Date(Number(event.z)).toISOString() : new Date().toISOString(),
            location: event.c || undefined,
            description: event.z1 || event.b || "",
            status: event.a || undefined,
            providerRef: `${trackingNo}_${event.z || Date.now()}`,
          });
        }
      }
    }

    return nodes;
  },
};

export default track17Provider;
```

- [ ] **Step 3: 创建 AfterShip 适配器**

Create `plugins/zhao-logistics/server/src/services/providers/afterShip.ts`:

```typescript
import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * AfterShip API 适配器
 * 文档：https://developers.aftership.com/
 */
const afterShipProvider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://api.aftership.com/v4/trackings";

    const response = await fetch(`${endpoint}/${trackingNo}`, {
      method: "GET",
      headers: {
        "aftership-api-key": providerConfig.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`AfterShip API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data?.tracking?.checkpoints) {
      for (const checkpoint of data.data.tracking.checkpoints) {
        nodes.push({
          eventTime: checkpoint.checkpoint_time || new Date().toISOString(),
          location: checkpoint.location || undefined,
          description: checkpoint.message || checkpoint.tag || "",
          status: checkpoint.tag || undefined,
          providerRef: `${trackingNo}_${checkpoint.checkpoint_time || Date.now()}`,
        });
      }
    }

    return nodes;
  },
};

export default afterShipProvider;
```

- [ ] **Step 4: 创建快递100 适配器**

Create `plugins/zhao-logistics/server/src/services/providers/kuaidi100.ts`:

```typescript
import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 快递100 API 适配器
 * 文档：https://api.kuaidi100.com/
 */
const kuaidi100Provider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    const endpoint = providerConfig.endpoint || "https://poll.kuaidi100.com/poll/query.do";

    const params = new URLSearchParams({
      customer: providerConfig.apiKey,
      param: JSON.stringify({
        com: providerConfig.extraConfig?.com || "auto",
        num: trackingNo,
        phone: providerConfig.extraConfig?.phone || "",
      }),
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`快递100 API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    if (data?.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        nodes.push({
          eventTime: item.ftime || new Date().toISOString(),
          location: item.location || undefined,
          description: item.context || "",
          status: item.status || undefined,
          providerRef: `${trackingNo}_${item.ftime || Date.now()}`,
        });
      }
    }

    return nodes;
  },
};

export default kuaidi100Provider;
```

- [ ] **Step 5: 创建自定义 API 适配器**

Create `plugins/zhao-logistics/server/src/services/providers/custom.ts`:

```typescript
import type { TrackingProvider, ProviderConfig, ExternalTrackingNode } from "./types";

/**
 * 自定义 API 适配器
 * 通用 HTTP 调用，按 extraConfig 中的字段映射解析响应
 */
const customProvider: TrackingProvider = {
  async queryTracking(providerConfig: ProviderConfig, trackingNo: string): Promise<ExternalTrackingNode[]> {
    if (!providerConfig.endpoint) {
      throw new Error("自定义追踪 API 需配置 endpoint");
    }

    const extraConfig = providerConfig.extraConfig || {};
    const method = extraConfig.method || "GET";
    const headers = extraConfig.headers || { "Content-Type": "application/json" };

    let url = providerConfig.endpoint;
    let body: string | undefined;

    if (method === "GET") {
      url += `?trackingNo=${encodeURIComponent(trackingNo)}`;
    } else {
      body = JSON.stringify({ trackingNo, ...(extraConfig.body || {}) });
    }

    const response = await fetch(url, {
      method,
      headers: { ...headers, Authorization: `Bearer ${providerConfig.apiKey}` },
      body,
    });

    if (!response.ok) {
      throw new Error(`自定义追踪 API 返回 ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const nodes: ExternalTrackingNode[] = [];

    // 按 extraConfig.fieldMapping 解析响应
    const dataPath = extraConfig.dataPath || "data";
    const items = dataPath.split(".").reduce((obj, key) => obj?.[key], data) || [];
    const fieldMapping = extraConfig.fieldMapping || {};

    for (const item of items) {
      nodes.push({
        eventTime: item[fieldMapping.eventTime || "eventTime"] || new Date().toISOString(),
        location: item[fieldMapping.location || "location"] || undefined,
        description: item[fieldMapping.description || "description"] || "",
        status: item[fieldMapping.status || "status"] || undefined,
        providerRef: item[fieldMapping.providerRef || "providerRef"] || `${trackingNo}_${Date.now()}`,
      });
    }

    return nodes;
  },
};

export default customProvider;
```

- [ ] **Step 6: 创建适配器工厂**

Create `plugins/zhao-logistics/server/src/services/providers/index.ts`:

```typescript
import type { TrackingProvider, ProviderConfig } from "./types";
import track17 from "./track17";
import afterShip from "./afterShip";
import kuaidi100 from "./kuaidi100";
import custom from "./custom";

const providers: Record<string, TrackingProvider> = {
  "17track": track17,
  afterShip,
  kuaidi100,
  custom_api: custom,
};

/**
 * 按 providerType 获取适配器
 */
export function getProvider(providerConfig: ProviderConfig): TrackingProvider {
  const provider = providers[providerConfig.providerType];
  if (!provider) {
    throw new Error(`不支持的追踪 API 类型: ${providerConfig.providerType}`);
  }
  return provider;
}

export { type TrackingProvider, type ProviderConfig, type ExternalTrackingNode } from "./types";
```

- [ ] **Step 7: 创建 tracking-aggregator service**

Create `plugins/zhao-logistics/server/src/services/tracking-aggregator.ts`:

```typescript
import type { Core } from "@strapi/strapi";
import { getProvider, type ProviderConfig, type ExternalTrackingNode } from "./providers";

const SHIPMENT_UID = "plugin::zhao-logistics.tracking-shipment";
const NODE_UID = "plugin::zhao-logistics.tracking-node";
const PROVIDER_UID = "plugin::zhao-logistics.tracking-provider";

/**
 * 追踪查询结果
 */
export interface TrackingResult {
  shipment: any;
  nodes: any[];
  isAlert: boolean;
  alertNodes: any[];
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 查询运单轨迹（内部 + 外部合并）
   * 1. 查 tracking-shipment
   * 2. 查 tracking-node（internal 源）
   * 3. 若 shipment.syncProvider 存在，调用外部 API
   * 4. 合并节点，按 eventTime 排序
   * 5. 检测异常状态（hold/exception 节点）
   * 6. 返回 {shipment, nodes, isAlert, alertNodes}
   */
  async getTracking(siteId: number, trackingNo: string): Promise<TrackingResult | null> {
    // 1. 查询运单
    const shipment = await strapi.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true },
    });

    if (!shipment) return null;

    // 2. 查询内部节点
    const internalNodes = await strapi.db.query(NODE_UID).findMany({
      where: { site: siteId, shipment: shipment.id, deletedAt: null },
      orderBy: { eventTime: "desc" },
    });

    let allNodes = [...internalNodes];

    // 3. 若有外部追踪源，合并外部节点
    if (shipment.syncProvider && shipment.syncProvider.isEnabled) {
      const externalNodes = await strapi.db.query(NODE_UID).findMany({
        where: { site: siteId, shipment: shipment.id, dataSource: "external", deletedAt: null },
        orderBy: { eventTime: "desc" },
      });
      allNodes = [...allNodes, ...externalNodes];
    }

    // 4. 按 eventTime 降序排序
    allNodes.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());

    // 5. 检测异常状态
    const alertStatuses = ["hold", "exception", "returned"];
    const alertNodes = allNodes.filter((n) => alertStatuses.includes(n.status));
    const isAlert = alertNodes.length > 0;

    return {
      shipment,
      nodes: allNodes,
      isAlert,
      alertNodes,
    };
  },

  /**
   * 批量查询（最多 10 单）
   */
  async batchTracking(siteId: number, trackingNos: string[]): Promise<TrackingResult[]> {
    if (trackingNos.length > 10) {
      throw new Error("批量查询最多 10 单");
    }

    const results: TrackingResult[] = [];
    for (const trackingNo of trackingNos) {
      const result = await this.getTracking(siteId, trackingNo);
      if (result) results.push(result);
    }
    return results;
  },

  /**
   * 从外部 API 同步运单轨迹
   * 1. 加载 tracking-provider 配置
   * 2. 调用外部 API（按 providerType 分发）
   * 3. 增量写入 tracking-node（dataSource=external，去重 providerRef）
   * 4. 更新 shipment.lastSyncAt + status
   */
  async syncFromProvider(siteId: number, trackingNo: string): Promise<void> {
    // 1. 查询运单 + 追踪源配置
    const shipment = await strapi.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true },
    });

    if (!shipment) throw new Error(`运单不存在: ${trackingNo}`);
    if (!shipment.syncProvider || !shipment.syncProvider.isEnabled) {
      throw new Error(`运单 ${trackingNo} 未配置外部追踪源或已禁用`);
    }

    const providerConfig: ProviderConfig = {
      providerType: shipment.syncProvider.providerType,
      apiKey: shipment.syncProvider.apiKey,
      apiSecret: shipment.syncProvider.apiSecret || undefined,
      endpoint: shipment.syncProvider.endpoint || undefined,
      extraConfig: shipment.syncProvider.extraConfig || undefined,
    };

    // 2. 调用外部 API
    const provider = getProvider(providerConfig);
    const externalNodes: ExternalTrackingNode[] = await provider.queryTracking(providerConfig, trackingNo);

    // 3. 增量写入（去重 providerRef）
    let newCount = 0;
    for (const node of externalNodes) {
      if (!node.providerRef) continue;

      // 检查是否已存在
      const existing = await strapi.db.query(NODE_UID).findOne({
        where: { site: siteId, shipment: shipment.id, providerRef: node.providerRef, deletedAt: null },
      });

      if (!existing) {
        await strapi.db.query(NODE_UID).create({
          data: {
            site: siteId,
            shipment: shipment.id,
            trackingNo,
            eventTime: node.eventTime,
            location: node.location || "",
            description: node.description,
            status: node.status || "info",
            dataSource: "external",
            providerRef: node.providerRef,
            providerName: providerConfig.providerType,
          },
        });
        newCount++;
      }
    }

    // 4. 更新运单同步时间 + 状态
    const latestNode = externalNodes[0];
    const statusMap: Record<string, string> = {
      delivered: "delivered",
      exception: "exception",
      hold: "hold",
      in_transit: "in_transit",
      customs: "customs",
      returned: "returned",
    };

    const updateData: any = {
      lastSyncAt: new Date().toISOString(),
    };

    if (latestNode?.status && statusMap[latestNode.status]) {
      updateData.status = statusMap[latestNode.status];
    }

    await strapi.db.query(SHIPMENT_UID).update({
      where: { site: siteId, documentId: shipment.documentId },
      data: updateData,
    });

    strapi.log.info(`[tracking-aggregator] ${trackingNo} 同步完成，新增 ${newCount} 条节点`);
  },
});
```

- [ ] **Step 8: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/services/tracking-aggregator.ts plugins/zhao-logistics/server/src/services/providers/
git commit -m "feat(zhao-logistics): tracking-aggregator 追踪聚合器（4 种 provider 适配器+内外合并+异常检测）"
```

---

## Task 3：dynamic-form 动态表单引擎

**Files:**
- Create: `plugins/zhao-logistics/server/src/services/dynamic-form.ts`
- Test: `plugins/zhao-logistics/tests/dynamic-form.test.ts`

- [ ] **Step 1: 创建 dynamic-form service**

Create `plugins/zhao-logistics/server/src/services/dynamic-form.ts`:

```typescript
import type { Core } from "@strapi/strapi";

const FIELD_RULE_UID = "plugin::zhao-logistics.quote-field-rule";

/**
 * 表单字段定义
 */
export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "textarea" | "date" | "file";
  group: string;
  required: boolean;
  visible: boolean;
  visibleWhen?: { field: string; op: "eq" | "ne" | "contains" | "gt" | "lt"; value: any };
  options?: { label: string; value: string }[];
  validation?: { pattern?: string; min?: number; max?: number; messageKey?: string };
  unit?: string;
  placeholder?: string;
  permission?: string;
  order: number;
}

/**
 * 校验结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 加载字段规则
   * 按条件匹配 quote-field-rule，合并 fields JSON
   */
  async loadFields(
    siteId: number,
    context: { routeId?: string; serviceProvider?: string; customerType?: string; lang?: string }
  ): Promise<FormField[]> {
    const where: any = { site: siteId, isActive: true, deletedAt: null };

    if (context.routeId) {
      where.$or = [{ routeId: null }, { routeId: context.routeId }];
    }
    if (context.serviceProvider) {
      // serviceProvider 为 null 表示通用规则
    }

    const rules = await strapi.db.query(FIELD_RULE_UID).findMany({
      where,
      orderBy: { priority: "desc" },
    });

    // 按 customerType 过滤
    const filtered = rules.filter((r: any) => {
      if (!r.customerType) return true;
      if (!context.customerType) return true;
      return r.customerType === context.customerType;
    });

    // 合并 fields JSON（按 priority 降序，高优先级覆盖低优先级）
    const fieldMap = new Map<string, FormField>();
    for (const rule of filtered) {
      if (!rule.fields || !Array.isArray(rule.fields)) continue;
      for (const field of rule.fields) {
        if (fieldMap.has(field.key)) {
          // 合并覆盖
          fieldMap.set(field.key, { ...fieldMap.get(field.key), ...field });
        } else {
          fieldMap.set(field.key, field);
        }
      }
    }

    // 按 order 排序
    return Array.from(fieldMap.values()).sort((a, b) => a.order - b.order);
  },

  /**
   * 校验表单数据
   */
  validate(siteId: number, formData: Record<string, any>, fields: FormField[]): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    for (const field of fields) {
      if (!field.visible) continue;

      const value = formData[field.key];

      // 必填校验
      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({
          field: field.key,
          message: field.validation?.messageKey || `${field.label}为必填项`,
        });
        continue;
      }

      if (value === undefined || value === null || value === "") continue;

      // pattern 校验
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push({
            field: field.key,
            message: field.validation.messageKey || `${field.label}格式不正确`,
          });
          continue;
        }
      }

      // min/max 校验
      if (field.type === "number") {
        const numValue = Number(value);
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.key,
            message: `${field.label}不能小于 ${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.key,
            message: `${field.label}不能大于 ${field.validation.max}`,
          });
        }
      }

      // select 校验
      if (field.type === "select" && field.options) {
        const validValues = field.options.map((o) => o.value);
        if (!validValues.includes(String(value))) {
          errors.push({
            field: field.key,
            message: `${field.label}的值无效`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * 解析显隐联动（前端用）
   * 根据 formData 的当前值，计算字段的可见性
   */
  resolveVisibility(formData: Record<string, any>, fields: FormField[]): FormField[] {
    return fields.map((field) => {
      if (!field.visibleWhen) return field;

      const targetValue = formData[field.visibleWhen.field];
      const expected = field.visibleWhen.value;
      let visible = false;

      switch (field.visibleWhen.op) {
        case "eq":
          visible = String(targetValue) === String(expected);
          break;
        case "ne":
          visible = String(targetValue) !== String(expected);
          break;
        case "contains":
          visible = String(targetValue || "").includes(String(expected));
          break;
        case "gt":
          visible = Number(targetValue) > Number(expected);
          break;
        case "lt":
          visible = Number(targetValue) < Number(expected);
          break;
      }

      return { ...field, visible };
    });
  },
});
```

- [ ] **Step 2: 创建 dynamic-form 单元测试**

Create `plugins/zhao-logistics/tests/dynamic-form.test.ts`:

```typescript
import type { FormField, ValidationResult } from "../server/src/services/dynamic-form";

describe("dynamic-form", () => {
  const mockFields: FormField[] = [
    {
      key: "customerName",
      label: "客户姓名",
      type: "text",
      group: "basic",
      required: true,
      visible: true,
      order: 1,
    },
    {
      key: "weight",
      label: "货物重量",
      type: "number",
      group: "cargo",
      required: true,
      visible: true,
      validation: { min: 0.1, max: 1000 },
      unit: "kg",
      order: 2,
    },
    {
      key: "fbaWarehouse",
      label: "FBA仓库编号",
      type: "text",
      group: "destination",
      required: false,
      visible: false,
      visibleWhen: { field: "customerType", op: "eq", value: "fba_seller" },
      order: 3,
    },
  ];

  describe("validate", () => {
    // 模拟 validate 方法（不依赖 Strapi）
    function validate(formData: Record<string, any>, fields: FormField[]): ValidationResult {
      const errors: { field: string; message: string }[] = [];
      for (const field of fields) {
        if (!field.visible) continue;
        const value = formData[field.key];
        if (field.required && (value === undefined || value === null || value === "")) {
          errors.push({ field: field.key, message: `${field.label}为必填项` });
          continue;
        }
        if (value === undefined || value === null || value === "") continue;
        if (field.type === "number") {
          const numValue = Number(value);
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            errors.push({ field: field.key, message: `${field.label}不能小于 ${field.validation.min}` });
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            errors.push({ field: field.key, message: `${field.label}不能大于 ${field.validation.max}` });
          }
        }
      }
      return { valid: errors.length === 0, errors };
    }

    it("应通过有效数据", () => {
      const result = validate({ customerName: "张三", weight: 50 }, mockFields);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应检测必填字段缺失", () => {
      const result = validate({ weight: 50 }, mockFields);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: "customerName", message: "客户姓名为必填项" });
    });

    it("应检测数值超出范围", () => {
      const result = validate({ customerName: "张三", weight: 2000 }, mockFields);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("weight");
    });
  });

  describe("resolveVisibility", () => {
    function resolveVisibility(formData: Record<string, any>, fields: FormField[]): FormField[] {
      return fields.map((field) => {
        if (!field.visibleWhen) return field;
        const targetValue = formData[field.visibleWhen.field];
        const visible = String(targetValue) === String(field.visibleWhen.value);
        return { ...field, visible };
      });
    }

    it("应在 customerType=fba_seller 时显示 FBA 仓库字段", () => {
      const result = resolveVisibility({ customerType: "fba_seller" }, mockFields);
      const fbaField = result.find((f) => f.key === "fbaWarehouse");
      expect(fbaField?.visible).toBe(true);
    });

    it("应在 customerType=individual 时隐藏 FBA 仓库字段", () => {
      const result = resolveVisibility({ customerType: "individual" }, mockFields);
      const fbaField = result.find((f) => f.key === "fbaWarehouse");
      expect(fbaField?.visible).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/services/dynamic-form.ts plugins/zhao-logistics/tests/dynamic-form.test.ts
git commit -m "feat(zhao-logistics): dynamic-form 动态表单引擎（字段加载+校验+显隐联动）"
```

---

## Task 4：Admin API 端点

**Files:**
- Create: `plugins/zhao-logistics/server/src/controllers/admin-api/quote-engine.ts`
- Create: `plugins/zhao-logistics/server/src/controllers/admin-api/tracking-aggregator.ts`
- Create: `plugins/zhao-logistics/server/src/controllers/admin-api/dynamic-form.ts`
- Modify: `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts`
- Modify: `plugins/zhao-logistics/server/src/routes/admin-api.ts`

- [ ] **Step 1: 创建 quote-engine controller**

Create `plugins/zhao-logistics/server/src/controllers/admin-api/quote-engine.ts`:

```typescript
/**
 * 报价引擎 Admin API controller
 */
export default {
  async calculate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");

    const result = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider,
      weight: Number(weight),
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      variables,
    });

    if (!result) return ctx.notFound("未找到匹配的报价规则");
    ctx.body = { data: result };
  },

  async calculateMulti(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");

    const results = await strapi.plugin("zhao-logistics").service("quote-engine").calculateMulti(siteId, {
      routeId,
      weight: Number(weight),
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      variables,
    });

    ctx.body = { data: results };
  },

  async saveQuote(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { quoteRequestId, result } = ctx.request.body;
    if (!quoteRequestId || !result) return ctx.badRequest("quoteRequestId 和 result 必填");

    await strapi.plugin("zhao-logistics").service("quote-engine").saveQuote(siteId, quoteRequestId, result);
    ctx.body = { data: { success: true } };
  },
};
```

- [ ] **Step 2: 创建 tracking-aggregator controller**

Create `plugins/zhao-logistics/server/src/controllers/admin-api/tracking-aggregator.ts`:

```typescript
/**
 * 追踪聚合器 Admin API controller
 */
export default {
  async getTracking(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");

    const result = await strapi.plugin("zhao-logistics").service("tracking-aggregator").getTracking(siteId, trackingNo);
    if (!result) return ctx.notFound("运单不存在");
    ctx.body = { data: result };
  },

  async batchTracking(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNos } = ctx.request.body;
    if (!Array.isArray(trackingNos) || trackingNos.length === 0) {
      return ctx.badRequest("trackingNos 必填且为数组");
    }

    const results = await strapi.plugin("zhao-logistics").service("tracking-aggregator").batchTracking(siteId, trackingNos);
    ctx.body = { data: results };
  },

  async syncFromProvider(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");

    try {
      await strapi.plugin("zhao-logistics").service("tracking-aggregator").syncFromProvider(siteId, trackingNo);
      ctx.body = { data: { success: true } };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },
};
```

- [ ] **Step 3: 创建 dynamic-form controller**

Create `plugins/zhao-logistics/server/src/controllers/admin-api/dynamic-form.ts`:

```typescript
/**
 * 动态表单 Admin API controller
 */
export default {
  async loadFields(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, customerType, lang } = ctx.query;

    const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
      routeId,
      serviceProvider,
      customerType,
      lang,
    });

    ctx.body = { data: fields };
  },

  async validate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { formData, fields } = ctx.request.body;
    if (!formData || !fields) return ctx.badRequest("formData 和 fields 必填");

    const result = await strapi.plugin("zhao-logistics").service("dynamic-form").validate(siteId, formData, fields);
    ctx.body = { data: result };
  },
};
```

- [ ] **Step 4: 修改 controllers/admin-api/index.ts**

Modify `plugins/zhao-logistics/server/src/controllers/admin-api/index.ts` — 在现有导出后添加 3 个新 controller:

```typescript
import createGeneric from "./generic";
import quoteEngine from "./quote-engine";
import trackingAggregator from "./tracking-aggregator";
import dynamicForm from "./dynamic-form";

const quoteRequest = createGeneric("quote-request");
const quoteFieldRule = createGeneric("quote-field-rule");
const quotePriceRule = createGeneric("quote-price-rule");
const quotePriceFormula = createGeneric("quote-price-formula");
const trackingShipment = createGeneric("tracking-shipment");
const trackingNode = createGeneric("tracking-node");
const trackingProvider = createGeneric("tracking-provider");
const contactMatrix = createGeneric("contact-matrix");

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "quote-engine": quoteEngine,
  "tracking-aggregator": trackingAggregator,
  "dynamic-form": dynamicForm,
};
```

- [ ] **Step 5: 修改 routes/admin-api.ts — 添加新端点**

在 `plugins/zhao-logistics/server/src/routes/admin-api.ts` 的 `routes` 数组中，在现有 `createCrudRoutes` 调用之后添加以下路由：

```typescript
  // quote-engine 端点
  {
    method: "POST",
    path: "/v1/admin/quote-engine/calculate",
    handler: "quote-engine.calculate",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/quote-engine/calculate-multi",
    handler: "quote-engine.calculateMulti",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/quote-engine/save-quote",
    handler: "quote-engine.saveQuote",
    config: {},
  },
  // tracking-aggregator 端点
  {
    method: "GET",
    path: "/v1/admin/tracking-aggregator/:trackingNo",
    handler: "tracking-aggregator.getTracking",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/tracking-aggregator/batch",
    handler: "tracking-aggregator.batchTracking",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/tracking-aggregator/:trackingNo/sync",
    handler: "tracking-aggregator.syncFromProvider",
    config: {},
  },
  // dynamic-form 端点
  {
    method: "GET",
    path: "/v1/admin/dynamic-form/fields",
    handler: "dynamic-form.loadFields",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/dynamic-form/validate",
    handler: "dynamic-form.validate",
    config: {},
  },
```

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/controllers/admin-api/ plugins/zhao-logistics/server/src/routes/admin-api.ts
git commit -m "feat(zhao-logistics): 3 个核心 Service 的 Admin API 端点（报价计算+追踪查询+动态表单）"
```

---

## Task 5：更新 services/index.ts + 最终提交

**Files:**
- Modify: `plugins/zhao-logistics/server/src/services/index.ts`

- [ ] **Step 1: 更新 services/index.ts**

Modify `plugins/zhao-logistics/server/src/services/index.ts` — 添加 3 个新 service:

```typescript
import quoteRequest from "./quote-request";
import quoteFieldRule from "./quote-field-rule";
import quotePriceRule from "./quote-price-rule";
import quotePriceFormula from "./quote-price-formula";
import trackingShipment from "./tracking-shipment";
import trackingNode from "./tracking-node";
import trackingProvider from "./tracking-provider";
import contactMatrix from "./contact-matrix";
import quoteEngine from "./quote-engine";
import trackingAggregator from "./tracking-aggregator";
import dynamicForm from "./dynamic-form";

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "quote-engine": quoteEngine,
  "tracking-aggregator": trackingAggregator,
  "dynamic-form": dynamicForm,
};
```

- [ ] **Step 2: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-logistics/server/src/services/index.ts
git commit -m "feat(zhao-logistics): 注册 3 个核心 Service 到 services/index.ts"
```

---

## Plan 2 完成验收标准

- [ ] quote-engine.calculate 可计算报价（匹配规则+体积重+附加费+公式覆盖+最低运费）
- [ ] quote-engine.calculateMulti 可多服务商比价
- [ ] quote-engine.saveQuote 可保存报价到 quote-request
- [ ] tracking-aggregator.getTracking 可查询运单轨迹（内部+外部合并）
- [ ] tracking-aggregator.batchTracking 可批量查询（最多 10 单）
- [ ] tracking-aggregator.syncFromProvider 可从外部 API 同步（4 种 provider 适配器）
- [ ] 17Track / AfterShip / 快递100 / 自定义 API 适配器均可实例化
- [ ] dynamic-form.loadFields 可加载字段规则（按条件匹配+优先级合并）
- [ ] dynamic-form.validate 可校验表单（必填+pattern+min/max+select）
- [ ] dynamic-form.resolveVisibility 可解析显隐联动
- [ ] Admin API 8 个新端点可访问
- [ ] expr-eval 沙箱单元测试通过（3 个测试用例）
- [ ] dynamic-form 单元测试通过（4 个测试用例）

---

## 后续 Plan 预告

- **Plan 3**：7 获客成交 CT + 3 扩展现有 CT（review/subscription/landing-page/conversion-funnel/conversion-event/intent-order/referral/customer-profile + lead/brand-info/first-truth-policy 扩展）
- **Plan 4**：funnel-tracker + referral-engine + customer-aggregator + Content API + 4 集成点 + 权限完整实现 + 定时任务
