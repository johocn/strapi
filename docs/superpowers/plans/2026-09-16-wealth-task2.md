# 任务 2 实施计划：组合配比简化 + 预约咨询三渠道重构

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 组合方案添加产品默认等权（免配比输入，高级设置可调）；预约咨询重构为三渠道（电话/微信可视化/在线留言），留言支持预留联系方式，管理端可回复（参考活动留言板）。

**Architecture:** 后端在 `portfolio-service` 加 `normalizeProducts`（缺配比填 1，计算归一化零改动）；`wealth-consultation` schema 扩展三渠道+回复字段，`consultation-service` 按 submitType 校验落库并新增管理端列表/回复/配置方法；新增 `wealth-consult-config` 存企业/个人微信二维码与微信号，公开接口供 C 端展示。C 端（strapi-wealth）详情页弹窗改三 Tab；管理端（web）新建咨询留言页 + 二维码配置区，复用 activity/messages.vue 模式。

**Tech Stack:** TypeScript / Jest / Strapi 6 content-api / uni-app（C 端）/ vue3（web 管理端）

**Spec:** `docs/superpowers/specs/2026-09-16-wealth-task2-design.md`

---

### Task 1: 组合方案配比简化（后端 TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/portfolio-service.ts`
- Create: `plugins/zhao-wealth/server/src/__tests__/portfolio-service.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `__tests__/portfolio-service.test.ts`：

```typescript
'use strict';

describe('portfolio-service 配比简化', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-portfolio-plan') {
      return { create: mockCreate, update: mockUpdate, findOne: mockFindOne };
    }
    return { create: jest.fn(), update: jest.fn(), findOne: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/portfolio-service').default;
    service = factory({ strapi: { db: { query: mockQuery } } });
  });

  it('normalizeProducts：缺失配比自动填 1（等权），已有配比保留', () => {
    const normalized = service.normalizeProducts([
      { productId: 1, productName: 'A', addedDate: '2026-09-16' },
      { productId: 2, productName: 'B', allocationRatio: 0.3, addedDate: '2026-09-16' },
    ]);
    expect(normalized[0].allocationRatio).toBe(1);
    expect(normalized[1].allocationRatio).toBe(0.3);
  });

  it('createPlan 落库前自动等权填充', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    await service.createPlan('user-1', {
      planName: '测试组合',
      products: [{ productId: 1, productName: 'A', addedDate: '2026-09-16' }],
    });
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('updatePlan 落库前自动等权填充', async () => {
    mockUpdate.mockResolvedValue({ id: 2 });
    await service.updatePlan(2, {
      products: [{ productId: 3, productName: 'C', addedDate: '2026-09-16' }],
    });
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: FAIL——`service.normalizeProducts` 为 undefined（尚未实现）。

- [ ] **Step 3: 实现 normalizeProducts 并接入 createPlan/updatePlan**

`services/portfolio-service.ts` 中，在 `createPlan` 函数定义之前插入：

```typescript
  /**
   * 配比规范化：缺失 allocationRatio 的产品默认等权（填 1，计算侧按归一化处理）
   */
  function normalizeProducts(products: PortfolioProduct[]): PortfolioProduct[] {
    return products.map((p) => {
      const ratio = Number(p.allocationRatio);
      if (p.allocationRatio === undefined || p.allocationRatio === null || !isFinite(ratio)) {
        return { ...p, allocationRatio: 1 };
      }
      return p;
    });
  }
```

`createPlan` 内第 44 行 `products: planData.products,` 改为：

```typescript
        products: normalizeProducts(planData.products),
```

`updatePlan` 内第 131 行 `if (planData.products !== undefined) data.products = planData.products;` 改为：

```typescript
    if (planData.products !== undefined) data.products = normalizeProducts(planData.products);
```

文件底部返回对象中追加 `normalizeProducts`（与 `createPlan` 等同级导出，供测试与控制器复用）：

```typescript
  return { createPlan, getPlans, getPlanDetail, updatePlan, deletePlan, calculatePlanPerformance, normalizeProducts };
```

（若原返回对象写法不同，按既有格式追加。）

- [ ] **Step 4: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 3 个新用例通过；其余全量通过。

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/portfolio-service.ts plugins/zhao-wealth/server/src/__tests__/portfolio-service.test.ts
git commit -m "feat(zhao-wealth): 组合方案配比等权默认（normalizeProducts 缺省填1）"
```

---

### Task 2: 咨询数据模型扩展 + 三渠道服务（后端 TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-consultation/schema.json`
- Modify: `plugins/zhao-wealth/server/src/services/consultation-service.ts`
- Create: `plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts`

- [ ] **Step 1: 扩展 schema**

`content-types/wealth-consultation/schema.json`：
- `name` 的 `"required": true` 改为 `"required": false`
- `phone` 的 `"required": true` 改为 `"required": false`
- `status` 枚举改为 `["pending", "confirmed", "completed", "cancelled", "replied"]`
- 在 `message` 属性后新增：

```json
    "submitType": {
      "type": "enumeration",
      "enum": ["phone", "wechat", "message"],
      "default": "phone"
    },
    "contactType": {
      "type": "enumeration",
      "enum": ["phone", "email", "wechat"]
    },
    "contactValue": {
      "type": "string"
    },
    "wechatType": {
      "type": "enumeration",
      "enum": ["personal", "enterprise"]
    },
    "reply": {
      "type": "text"
    },
    "repliedAt": {
      "type": "datetime"
    }
```

- [ ] **Step 2: 写失败测试**

创建 `__tests__/consultation-service.test.ts`：

```typescript
'use strict';

describe('consultation-service 三渠道', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockUpdate = jest.fn();
  const mockCount = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-consultation') {
      return { create: mockCreate, update: mockUpdate, findMany: mockFindMany, count: mockCount };
    }
    return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/consultation-service').default;
    service = factory({ strapi: { db: { query: mockQuery } } });
  });

  it('phone 渠道：phone 必填且 11 位，name 选填', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    const ok = await service.createBooking('u1', { submitType: 'phone', name: '小李', phone: '13800138000' });
    expect(ok.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.submitType).toBe('phone');
  });

  it('phone 渠道：手机号非法返回错误', async () => {
    const bad = await service.createBooking('u1', { submitType: 'phone', phone: '123' });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('message 渠道：留言必填，联系方式至少一项', async () => {
    mockCreate.mockResolvedValue({ id: 2 });
    const ok = await service.createBooking('u1', {
      submitType: 'message', name: '', message: '想了解净值型理财',
      contactType: 'wechat', contactValue: 'wx_abc',
    });
    expect(ok.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.submitType).toBe('message');
    expect(mockCreate.mock.calls[0][0].data.contactValue).toBe('wx_abc');
  });

  it('message 渠道：无留言内容返回错误', async () => {
    const bad = await service.createBooking('u1', { submitType: 'message', message: '', contactType: 'phone', contactValue: '13800138000' });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(400);
  });

  it('wechat 提交型：wechatType 与 contactValue 必填', async () => {
    mockCreate.mockResolvedValue({ id: 3 });
    const ok = await service.createBooking('u1', { submitType: 'wechat', wechatType: 'personal', contactValue: 'wx_abc' });
    expect(ok.ok).toBe(true);
  });

  it('管理端回复：写入 reply/repliedAt 并置状态 replied', async () => {
    mockUpdate.mockResolvedValue({ id: 1, reply: '已为您安排理财师' });
    const r = await service.replyBooking(1, '已为您安排理财师');
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.reply).toBe('已为您安排理财师');
    expect(data.status).toBe('replied');
    expect(data.repliedAt).toBeTruthy();
    expect(r.ok).toBe(true);
  });

  it('管理端列表：支持状态与渠道筛选分页', async () => {
    mockFindMany.mockResolvedValue([{ id: 1, submitType: 'message' }]);
    mockCount.mockResolvedValue(1);
    const r = await service.adminListBookings({ page: 1, pageSize: 20, status: 'pending', submitType: 'message' });
    const where: any = mockFindMany.mock.calls[0][0].where;
    expect(where.status).toBe('pending');
    expect(where.submitType).toBe('message');
    expect(r.total).toBe(1);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: FAIL——`createBooking` 无校验返回结构、`replyBooking`/`adminListBookings` 未定义。

- [ ] **Step 4: 重写 consultation-service.ts**

完整替换文件内容：

```typescript
'use strict';

import type { Core } from '@strapi/strapi';

const PHONE_RE = /^1\d{10}$/;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query('plugin::zhao-wealth.wealth-consultation');

  function fail(code: number, msg: string) {
    return { ok: false, code, msg };
  }

  /**
   * 创建预约咨询（三渠道）
   * submitType: phone | wechat | message
   */
  async function createBooking(userId: string, bookingData: {
    submitType?: string;
    name?: string;
    phone?: string;
    contactType?: string;
    contactValue?: string;
    wechatType?: string;
    message?: string;
    productId?: number;
    portfolioPlanId?: number;
    preferredTime?: string;
    preferredChannel?: string;
  }) {
    const submitType = bookingData.submitType || 'phone';

    if (submitType === 'phone') {
      if (!bookingData.phone || !PHONE_RE.test(bookingData.phone)) {
        return fail(400, '请输入正确的11位手机号');
      }
    } else if (submitType === 'wechat') {
      if (!bookingData.wechatType || !bookingData.contactValue) {
        return fail(400, '请选择微信类型并填写微信号');
      }
    } else if (submitType === 'message') {
      if (!bookingData.message || !String(bookingData.message).trim()) {
        return fail(400, '请输入留言内容');
      }
      if (!bookingData.contactType || !bookingData.contactValue) {
        return fail(400, '请至少预留一种联系方式（电话/邮箱/微信）');
      }
    } else {
      return fail(400, '无效的提交渠道');
    }

    const record = await query().create({
      data: {
        userId,
        submitType,
        name: bookingData.name || null,
        phone: bookingData.phone || null,
        contactType: bookingData.contactType || null,
        contactValue: bookingData.contactValue || null,
        wechatType: bookingData.wechatType || null,
        message: bookingData.message || null,
        productId: bookingData.productId || null,
        portfolioPlanId: bookingData.portfolioPlanId || null,
        preferredTime: bookingData.preferredTime || null,
        preferredChannel: bookingData.preferredChannel || 'branch',
        status: 'pending',
      },
    });
    return { ok: true, record };
  }

  /**
   * 获取用户的预约/留言列表
   */
  async function getBookings(userId: string) {
    const records = await query().findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit: 100,
    });
    return records;
  }

  /**
   * 取消预约
   */
  async function cancelBooking(bookingId: number) {
    const record = await query().update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
    return record;
  }

  /**
   * 管理端：留言/咨询列表（分页 + 状态/渠道筛选）
   */
  async function adminListBookings(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    submitType?: string;
  }) {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 20, 100);
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.submitType && params.submitType !== 'all') where.submitType = params.submitType;

    const [records, total] = await Promise.all([
      query().findMany({ where, orderBy: { createdAt: 'desc' }, limit: pageSize, offset }),
      query().count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  /**
   * 管理端：回复留言（置 replied 状态）
   */
  async function replyBooking(bookingId: number, reply: string) {
    if (!reply || !String(reply).trim()) {
      return fail(400, '请输入回复内容');
    }
    const record = await query().update({
      where: { id: bookingId },
      data: { reply, repliedAt: new Date().toISOString(), status: 'replied' },
    });
    return { ok: true, record };
  }

  return { createBooking, getBookings, cancelBooking, adminListBookings, replyBooking };
};
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 7 个新用例通过；全量通过。若既有测试引用旧 `createBooking` 返回结构（直接 record），同步检查 `controllers.test.ts` 等并适配 `{ ok, record }`。

- [ ] **Step 6: 适配控制器 consultation.ts**

`controllers/consultation.ts` 的 `create` 方法改为（第 9-35 行替换）：

```typescript
  async create(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { submitType, name, phone, contactType, contactValue, wechatType, message, productId, portfolioPlanId, preferredTime, preferredChannel } = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').createBooking(String(userId), {
        submitType,
        name,
        phone,
        contactType,
        contactValue,
        wechatType,
        message,
        productId,
        portfolioPlanId,
        preferredTime,
        preferredChannel,
      });
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '提交成功，我们将在1个工作日内与您联系');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 创建预约咨询失败: ${error.message}`);
      ctx.body = errorResponse(500, '提交失败');
    }
  },
```

- [ ] **Step 7: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/wealth-consultation/schema.json plugins/zhao-wealth/server/src/services/consultation-service.ts plugins/zhao-wealth/server/src/controllers/consultation.ts plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts
git commit -m "feat(zhao-wealth): 预约咨询三渠道（电话/微信/留言）+ 管理端回复"
```

---

### Task 3: 微信二维码配置 + 管理端路由（后端 TDD）

**Files:**
- Create: `plugins/zhao-wealth/server/src/content-types/wealth-consult-config/schema.json`
- Modify: `plugins/zhao-wealth/server/src/services/consultation-service.ts`
- Modify: `plugins/zhao-wealth/server/src/controllers/consultation.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/admin-api.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/content-api.ts`
- Test: `plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts`

- [ ] **Step 1: 新增 wealth-consult-config content-type**

创建 `content-types/wealth-consult-config/schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_consult_configs",
  "info": {
    "singularName": "wealth-consult-config",
    "pluralName": "wealth-consult-configs",
    "displayName": "咨询微信配置",
    "description": "预约咨询微信渠道二维码与微信号配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "enterpriseWechatQr": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "personalWechatQr": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "enterpriseWechatId": {
      "type": "string"
    },
    "personalWechatId": {
      "type": "string"
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

- [ ] **Step 2: 写失败测试（追加到 consultation-service.test.ts）**

```typescript
  it('咨询配置：返回二维码 URL 与微信号（无配置时返回 null 字段）', async () => {
    const mockCfgFindOne = jest.fn();
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-consultation') {
        return { create: mockCreate, update: mockUpdate, findMany: mockFindMany, count: mockCount };
      }
      if (name === 'plugin::zhao-wealth.wealth-consult-config') {
        return { findOne: mockCfgFindOne };
      }
      return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
    });
    mockCfgFindOne.mockResolvedValue({
      enterpriseWechatQr: { url: '/uploads/ent.png' },
      personalWechatQr: null,
      enterpriseWechatId: 'joho-wealth',
      personalWechatId: null,
    });
    const cfg = await service.getConsultConfig();
    expect(cfg.enterpriseWechatId).toBe('joho-wealth');
    expect(cfg.enterpriseWechatQr).toBe('/uploads/ent.png');
    expect(cfg.personalWechatQr).toBeNull();
  });
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: FAIL——`getConsultConfig` 未定义。

- [ ] **Step 4: 实现 getConsultConfig / adminUpdateConsultConfig**

`consultation-service.ts` 中，`replyBooking` 之后追加：

```typescript
  /**
   * 获取微信咨询配置（公开，C 端展示二维码）
   */
  async function getConsultConfig() {
    const cfgQuery = strapi.db.query('plugin::zhao-wealth.wealth-consult-config');
    const cfg = await cfgQuery.findOne({});
    if (!cfg) {
      return { enterpriseWechatQr: null, personalWechatQr: null, enterpriseWechatId: null, personalWechatId: null };
    }
    return {
      enterpriseWechatQr: cfg.enterpriseWechatQr?.url || null,
      personalWechatQr: cfg.personalWechatQr?.url || null,
      enterpriseWechatId: cfg.enterpriseWechatId || null,
      personalWechatId: cfg.personalWechatId || null,
    };
  }

  /**
   * 管理端：更新微信咨询配置（单条 upsert）
   */
  async function adminUpdateConsultConfig(data: {
    enterpriseWechatQr?: number;
    personalWechatQr?: number;
    enterpriseWechatId?: string;
    personalWechatId?: string;
  }) {
    const cfgQuery = strapi.db.query('plugin::zhao-wealth.wealth-consult-config');
    const existing = await cfgQuery.findOne({});
    const payload: any = {};
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;

    const record = existing
      ? await cfgQuery.update({ where: { id: existing.id }, data: payload })
      : await cfgQuery.create({ data: payload });
    return record;
  }
```

返回对象追加 `getConsultConfig, adminUpdateConsultConfig`。

- [ ] **Step 5: 控制器追加 5 个方法**

`controllers/consultation.ts` 的 `disclosure` 方法之后追加：

```typescript
  /**
   * GET /v1/wealth/consult/config（公开）
   */
  async consultConfig(ctx) {
    try {
      const cfg = await strapi.service('plugin::zhao-wealth.consultation-service').getConsultConfig();
      ctx.body = successResponse(cfg);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * GET /v1/admin/consultations
   */
  async adminList(ctx) {
    try {
      const { page, pageSize, status, submitType } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminListBookings({ page, pageSize, status, submitType });
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/admin/consultations/:id/reply
   */
  async adminReply(ctx) {
    try {
      const { id } = ctx.params;
      const { reply } = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').replyBooking(Number(id), reply);
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '回复成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 回复留言失败: ${error.message}`);
      ctx.body = errorResponse(500, '回复失败');
    }
  },

  /**
   * GET /v1/admin/consult-config
   */
  async adminGetConfig(ctx) {
    try {
      const cfg = await strapi.service('plugin::zhao-wealth.consultation-service').getConsultConfig();
      ctx.body = successResponse(cfg);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * PUT /v1/admin/consult-config
   */
  async adminUpdateConfig(ctx) {
    try {
      const body = ctx.request.body;
      const record = await strapi.service('plugin::zhao-wealth.consultation-service').adminUpdateConsultConfig(body);
      ctx.body = successResponse(record, '配置已保存');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置保存失败: ${error.message}`);
      ctx.body = errorResponse(500, '保存失败');
    }
  },
```

- [ ] **Step 6: 注册路由**

`routes/admin-api.ts`，在 `// ===== 客户持仓` 区块之前追加：

```typescript
    // ===== 预约咨询管理 =====
    adminRoute('GET', '/v1/admin/consultations', 'consultation.adminList'),
    adminRoute('POST', '/v1/admin/consultations/:id/reply', 'consultation.adminReply'),
    adminRoute('GET', '/v1/admin/consult-config', 'consultation.adminGetConfig'),
    adminRoute('PUT', '/v1/admin/consult-config', 'consultation.adminUpdateConfig'),
```

`routes/content-api.ts`，在 `// === 预约咨询 ===` 区块内追加（无 SSO 策略，公开）：

```typescript
    {
      method: 'GET',
      path: '/v1/wealth/consult/config',
      handler: 'consultation.consultConfig',
      config: {
        auth: false,
      },
    },
```

- [ ] **Step 7: 运行全量测试**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 全部通过（含新增配置用例）。

- [ ] **Step 8: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/wealth-consult-config plugins/zhao-wealth/server/src/services/consultation-service.ts plugins/zhao-wealth/server/src/controllers/consultation.ts plugins/zhao-wealth/server/src/routes/admin-api.ts plugins/zhao-wealth/server/src/routes/content-api.ts plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts
git commit -m "feat(zhao-wealth): 微信二维码咨询配置 + 管理端咨询列表/回复/配置路由"
```

---

### Task 4: 后端全量测试 + 重建 dist + 推送

**Files:**
- Test: `plugins/zhao-wealth/__tests__`（全量）
- Build: `plugins/zhao-wealth/dist`

- [ ] **Step 1: 全量测试**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 全部通过（任务 1 计划的前端/后端改动已在本地，需与本次改动共存——若任务 1 未执行，本任务只跑任务 2 相关测试）。

- [ ] **Step 2: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`

Expected: 构建成功。

- [ ] **Step 3: dist 自检**

Run: `rg -l "normalizeProducts|submitType|consult-config" dist/server`

Expected: 命中 `dist/server/index.js`。

- [ ] **Step 4: 提交并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(zhao-wealth): 重建 dist（组合等权 + 咨询三渠道 + 微信配置）"
git push origin main
```

Expected: 推送成功。

---

### Task 5: C 端改造（strapi-wealth，wealth-line 分支）

**Files:**
- Modify: `pages/detail/index.vue`
- Modify: `pages/portfolio/list.vue`、`pages/portfolio/detail.vue`（配比高级设置）
- Modify: `services/api.ts`

- [ ] **Step 1: 组合弹窗去掉配比输入（detail.vue）**

模板第 309-312 行（配比输入块）删除：

```html
        <view class="popup-field">
          <text class="popup-label">配比(%) <text class="required">*</text></text>
          <input class="popup-input" v-model="portfolioForm.allocationRatio" placeholder="1-100" type="digit" maxlength="3" />
        </view>
```

`portfolioForm`（第 444-448 行）移除 `allocationRatio` 字段：

```typescript
const portfolioForm = ref({
  planName: '',
  totalAmount: '',
})
```

`onAddToPortfolio`（第 788-792 行）移除 `allocationRatio` 初始化：

```typescript
  portfolioForm.value = {
    planName: (product.value?.productName || '产品') + '组合',
    totalAmount: '',
  }
```

`submitCreatePortfolio`（第 797-807 行）移除配比校验块并等权传 1：

```typescript
async function submitCreatePortfolio() {
  // 表单验证
  if (!portfolioForm.value.planName.trim()) {
    uni.showToast({ title: '请输入方案名称', icon: 'none' })
    return
  }
  const pid = product.value?.id || product.value?.documentId
  if (!pid) {
    uni.showToast({ title: '产品信息缺失', icon: 'none' })
    return
  }
  uni.showLoading({ title: '创建中...' })
  try {
    const res = await createPortfolioPlan({
      planName: portfolioForm.value.planName.trim(),
      planType: 'custom',
      products: [{
        productId: product.value?.id,
        productName: product.value?.productName,
        allocationRatio: 1,
        addedDate: new Date().toISOString().split('T')[0],
      }],
      totalAmount: portfolioForm.value.totalAmount ? Number(portfolioForm.value.totalAmount) : null,
    })
    // ... 后续不变
```

- [ ] **Step 2: 咨询弹窗改三 Tab（detail.vue 模板）**

将咨询弹窗主体（第 269-292 行，姓名/手机号/咨询方式/备注四个 field）替换为：

```html
        <view class="popup-tabs">
          <view
            v-for="t in CONSULT_TABS"
            :key="t.value"
            class="popup-tab"
            :class="{ active: consultForm.submitType === t.value }"
            @click="consultForm.submitType = t.value"
          >{{ t.label }}</view>
        </view>

        <!-- 电话渠道 -->
        <template v-if="consultForm.submitType === 'phone'">
          <view class="popup-field">
            <text class="popup-label">网名</text>
            <input class="popup-input" v-model="consultForm.name" placeholder="请输入您的称呼" maxlength="20" />
          </view>
          <view class="popup-field">
            <text class="popup-label">手机号 <text class="required">*</text></text>
            <input class="popup-input" v-model="consultForm.phone" placeholder="请输入11位手机号" type="number" maxlength="11" />
          </view>
          <view class="popup-field">
            <text class="popup-label">咨询方式</text>
            <view class="channel-tabs">
              <view
                v-for="ch in CONSULT_CHANNELS"
                :key="ch.value"
                class="channel-tab"
                :class="{ active: consultForm.preferredChannel === ch.value }"
                @click="consultForm.preferredChannel = ch.value"
              >{{ ch.label }}</view>
            </view>
          </view>
        </template>

        <!-- 微信渠道（纯二维码展示） -->
        <template v-else-if="consultForm.submitType === 'wechat'">
          <view class="wechat-tip">扫码或复制微信号，添加理财顾问微信咨询</view>
          <view class="wechat-qr-row" v-if="consultConfig.enterpriseWechatQr || consultConfig.personalWechatQr">
            <view class="wechat-qr-item" v-if="consultConfig.enterpriseWechatQr">
              <image class="wechat-qr-img" :src="consultConfig.enterpriseWechatQr" mode="aspectFit" />
              <text class="wechat-qr-label">企业微信</text>
              <view class="wechat-id-row" v-if="consultConfig.enterpriseWechatId">
                <text class="wechat-id">{{ consultConfig.enterpriseWechatId }}</text>
                <view class="wechat-copy" @click="copyWechatId(consultConfig.enterpriseWechatId)">复制</view>
              </view>
            </view>
            <view class="wechat-qr-item" v-if="consultConfig.personalWechatQr">
              <image class="wechat-qr-img" :src="consultConfig.personalWechatQr" mode="aspectFit" />
              <text class="wechat-qr-label">个人微信</text>
              <view class="wechat-id-row" v-if="consultConfig.personalWechatId">
                <text class="wechat-id">{{ consultConfig.personalWechatId }}</text>
                <view class="wechat-copy" @click="copyWechatId(consultConfig.personalWechatId)">复制</view>
              </view>
            </view>
          </view>
          <view class="wechat-empty" v-else>二维码配置中，请使用电话或留言咨询</view>
        </template>

        <!-- 留言渠道 -->
        <template v-else>
          <view class="popup-field">
            <text class="popup-label">网名</text>
            <input class="popup-input" v-model="consultForm.name" placeholder="选填" maxlength="20" />
          </view>
          <view class="popup-field">
            <text class="popup-label">留言内容 <text class="required">*</text></text>
            <textarea class="popup-textarea" v-model="consultForm.message" placeholder="请输入想咨询的内容" maxlength="500" />
          </view>
          <view class="popup-field">
            <text class="popup-label">预留联系方式 <text class="required">*</text></text>
            <view class="channel-tabs">
              <view
                v-for="ct in CONTACT_TYPES"
                :key="ct.value"
                class="channel-tab"
                :class="{ active: consultForm.contactType === ct.value }"
                @click="consultForm.contactType = ct.value"
              >{{ ct.label }}</view>
            </view>
            <input
              class="popup-input"
              v-model="consultForm.contactValue"
              :placeholder="consultForm.contactType === 'phone' ? '请输入手机号' : consultForm.contactType === 'email' ? '请输入邮箱' : '请输入微信号'"
              :type="consultForm.contactType === 'phone' ? 'number' : 'text'"
              :maxlength="consultForm.contactType === 'phone' ? 11 : 60"
            />
          </view>
        </template>
```

微信渠道不显示提交按钮（该 Tab 无表单提交），提交按钮显示条件改（第 295 行）：

```html
          <view class="popup-btn-submit" v-if="consultForm.submitType !== 'wechat'" @click="submitConsultation">提交</view>
```

- [ ] **Step 3: 咨询脚本逻辑（detail.vue）**

`CONSULT_CHANNELS` 定义处（第 430-434 行）旁新增：

```typescript
const CONSULT_TABS = [
  { label: '电话', value: 'phone' },
  { label: '微信', value: 'wechat' },
  { label: '留言', value: 'message' },
]
const CONTACT_TYPES = [
  { label: '电话', value: 'phone' },
  { label: '邮箱', value: 'email' },
  { label: '微信', value: 'wechat' },
]
const consultConfig = ref({ enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '' })
```

`consultForm`（第 435-440 行）改为：

```typescript
const consultForm = ref({
  submitType: 'phone' as 'phone' | 'wechat' | 'message',
  name: '',
  phone: '',
  preferredChannel: 'online' as 'online' | 'branch' | 'phone',
  message: '',
  contactType: 'phone' as 'phone' | 'email' | 'wechat',
  contactValue: '',
})
```

`onConsult` 重置（第 850-855 行）改为：

```typescript
  consultForm.value = {
    submitType: 'phone',
    name: '',
    phone: '',
    preferredChannel: 'online',
    message: '',
    contactType: 'phone',
    contactValue: '',
  }
  loadConsultConfig()
  showConsultPopup.value = true
```

新增函数（`submitConsultation` 之前）：

```typescript
function copyWechatId(id: string) {
  uni.setClipboardData({
    data: id,
    success: () => uni.showToast({ title: '微信号已复制', icon: 'none' }),
  })
}

async function loadConsultConfig() {
  try {
    consultConfig.value = await getConsultConfig()
  } catch (e) {
    consultConfig.value = { enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '' }
  }
}
```

`submitConsultation`（第 860-892 行）改为：

```typescript
async function submitConsultation() {
  const f = consultForm.value
  if (f.submitType === 'phone' && (!f.phone || !/^1\d{10}$/.test(f.phone))) {
    uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
    return
  }
  if (f.submitType === 'message') {
    if (!f.message.trim()) {
      uni.showToast({ title: '请输入留言内容', icon: 'none' })
      return
    }
    if (!f.contactValue.trim()) {
      uni.showToast({ title: '请预留联系方式', icon: 'none' })
      return
    }
  }
  uni.showLoading({ title: '提交中...' })
  try {
    await createConsultation({
      submitType: f.submitType,
      name: f.name.trim() || undefined,
      phone: f.submitType === 'phone' ? f.phone : undefined,
      contactType: f.submitType === 'message' ? f.contactType : undefined,
      contactValue: f.submitType === 'message' ? f.contactValue.trim() : undefined,
      productId: product.value?.id || product.value?.documentId,
      preferredChannel: f.preferredChannel,
      message: f.submitType === 'message' ? f.message : undefined,
    })
    uni.hideLoading()
    showConsultPopup.value = false
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  }
}
```

- [ ] **Step 4: services/api.ts 新增/调整**

`services/api.ts` 中 `createConsultation`（第 98 行附近）保持透传 body；新增：

```typescript
export const getConsultConfig = () =>
  get(`${V1}/consult/config`).then(extractItem)
```

- [ ] **Step 5: 组合方案页配比高级设置（portfolio/list.vue、portfolio/detail.vue）**

- `portfolio/list.vue`：如存在多产品创建/编辑弹窗，删除必填配比输入，改为默认等权；如已有编辑功能，增加「高级设置」展开块（每个产品配比 % 输入，合计校验 100%，提交时换算 0-1）
- `portfolio/detail.vue`：方案详情展示配比缺失时显示「等权」；如存在编辑，同样加高级设置
- 实施时以两个文件实际结构为准（先 `rg -n "allocationRatio|配比"` 定位），改动最小化

- [ ] **Step 6: 提交 C 端**

```bash
cd e:\code\strapi-wealth
git add pages/detail/index.vue pages/portfolio/list.vue pages/portfolio/detail.vue services/api.ts
git commit -m "feat(wealth): 组合等权默认 + 咨询三渠道弹窗（微信二维码/留言）"
```

---

### Task 6: 管理端（web 仓库）咨询留言页 + 二维码配置

**Files:**
- Modify: `src/api/wealth.js`
- Create: `src/pages/activity/consultation-messages.vue`
- Modify: 路由注册（按 web 仓库既有方式，如 `src/router` 或 pages 配置）

- [ ] **Step 1: wealth.js 新增咨询 API**

`src/api/wealth.js` 末尾追加：

```javascript
// ==================== 预约咨询管理 ====================
// 列表（?status=pending|replied|all&submitType=phone|wechat|message|all&page=&pageSize=）
export function getAdminConsultations(params = {}) {
  return adminGet(`${ADMIN}/consultations`, params).then(extractList)
}
// 回复（body:{reply}）
export function replyConsultation(id, reply) {
  return adminPost(`${ADMIN}/consultations/${id}/reply`, { reply })
}
// 微信二维码配置
export function getAdminConsultConfig() {
  return adminGet(`${ADMIN}/consult-config`)
}
export function updateAdminConsultConfig(data) {
  return adminPut(`${ADMIN}/consult-config`, data)
}
```

（`extractList` 返回 `{ list, pagination }`；adminGet/adminPut 已从 request.js 导入。）

- [ ] **Step 2: 创建咨询留言页 `src/pages/activity/consultation-messages.vue`**

参考 `messages.vue` 结构与样式，模板主体：

```html
<template>
  <view class="page-container">
    <PageHeader title="咨询留言管理"></PageHeader>

    <view class="filter-section">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">状态</text>
          <picker mode="selector" :range="statusOptions" :value="statusIndex" @change="handleStatusChange">
            <view class="picker-value">
              <text>{{ statusOptions[statusIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="filter-item">
          <text class="filter-label">渠道</text>
          <picker mode="selector" :range="channelOptions" :value="channelIndex" @change="handleChannelChange">
            <view class="picker-value">
              <text>{{ channelOptions[channelIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <view class="msg-list" v-if="!loading && rows.length > 0">
      <view v-for="row in rows" :key="row.documentId || row.id" class="msg-card">
        <view class="msg-head">
          <text class="msg-no">#{{ row.id ?? '' }}</text>
          <text class="msg-user">{{ row.name || '匿名' }}</text>
          <text class="channel-badge" :class="'ch-' + (row.submitType || 'phone')">{{ channelText(row.submitType) }}</text>
          <text class="status-badge" :class="statusClass(row.status)">{{ statusText(row.status) }}</text>
        </view>
        <view class="msg-meta">
          <text class="msg-time">{{ formatTime(row.createdAt || row.created_at) }}</text>
        </view>
        <view class="msg-body">
          <view class="contact-line" v-if="row.phone">{{ '电话：' + row.phone }}</view>
          <view class="contact-line" v-if="row.contactType && row.contactValue">{{ '预留' + contactTypeText(row.contactType) + '：' + row.contactValue }}</view>
          <text class="msg-content">{{ row.message || '（无留言内容）' }}</text>
        </view>
        <view class="msg-reply" v-if="row.reply">
          <text class="msg-a">答</text>
          <view class="reply-main">
            <view class="msg-label-row">
              <text class="admin-label">管理员</text>
              <text class="msg-label-time">{{ formatTime(row.repliedAt || row.replied_at) }}</text>
            </view>
            <text class="reply-text">{{ row.reply }}</text>
          </view>
        </view>
        <view class="card-actions" v-if="row.status !== 'replied'">
          <view class="action-btn" @click="openReply(row)">回复</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无咨询留言</text>
    </view>

    <view class="pagination" v-if="pageCount() > 1">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ pageCount() }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= pageCount() }">下一页</view>
    </view>

    <!-- 回复弹层 -->
    <view class="modal-mask" v-if="showReply" @click="closeReply">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">回复留言</text>
          <text class="modal-close" @click="closeReply">✕</text>
        </view>
        <view class="modal-body">
          <view class="msg-preview" v-if="current">
            <text class="msg-preview-label">用户留言：</text>
            <text class="msg-preview-text">{{ current.message || '（无留言内容）' }}</text>
          </view>
          <textarea class="reply-textarea" v-model="replyText" placeholder="请输入回复内容" :maxlength="500"></textarea>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeReply">取消</button>
          <button class="btn-submit" @click="submitReply">提交回复</button>
        </view>
      </view>
    </view>
  </view>
</template>
```

script 部分（参考 messages.vue，核心逻辑）：

```html
<script setup>
import { ref, onMounted } from 'vue'
import { getAdminConsultations, replyConsultation } from '../../api/wealth.js'
import PageHeader from '../../components/PageHeader.vue'

const statusOptions = ['全部状态', '待回复', '已回复']
const statusValues = ['', 'pending', 'replied']
const statusIndex = ref(0)
const channelOptions = ['全部渠道', '电话', '微信', '留言']
const channelValues = ['', 'phone', 'wechat', 'message']
const channelIndex = ref(0)
const rows = ref([])
const pagination = ref({})
const currentPage = ref(1)
const loading = ref(false)
const showReply = ref(false)
const current = ref(null)
const replyText = ref('')

const statusTextMap = { pending: '待回复', replied: '已回复', confirmed: '已确认', cancelled: '已取消' }
const statusClassMap = { pending: 'open', replied: 'replied', confirmed: 'replied', cancelled: 'default' }
const channelTextMap = { phone: '电话', wechat: '微信', message: '留言' }
const contactTypeTextMap = { phone: '电话', email: '邮箱', wechat: '微信' }

function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }
function channelText(s) { return channelTextMap[s || 'phone'] || '电话' }
function contactTypeText(t) { return contactTypeTextMap[t] || t || '-' }

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleStatusChange(e) { statusIndex.value = Number(e.detail.value); loadMessages(1) }
function handleChannelChange(e) { channelIndex.value = Number(e.detail.value); loadMessages(1) }

async function loadMessages(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: 20 }
    if (statusValues[statusIndex.value]) params.status = statusValues[statusIndex.value]
    if (channelValues[channelIndex.value]) params.submitType = channelValues[channelIndex.value]
    const res = await getAdminConsultations(params)
    rows.value = res?.list ?? res?.data ?? []
    pagination.value = res?.pagination ?? {}
    currentPage.value = page
  } catch (e) {
    rows.value = []
    pagination.value = {}
  } finally {
    loading.value = false
  }
}

function pageCount() {
  const p = pagination.value
  if (p.pageCount) return p.pageCount
  const total = Number(p.total) || 0
  return Math.max(1, Math.ceil(total / 20))
}

function prevPage() { if (currentPage.value > 1) loadMessages(currentPage.value - 1) }
function nextPage() { if (currentPage.value < pageCount()) loadMessages(currentPage.value + 1) }

function openReply(m) { current.value = m; replyText.value = ''; showReply.value = true }
function closeReply() { showReply.value = false; current.value = null }

async function submitReply() {
  if (!replyText.value.trim()) { uni.showToast({ title: '请输入回复内容', icon: 'none' }); return }
  try {
    await replyConsultation(current.value.id, replyText.value.trim())
    uni.showToast({ title: '回复成功', icon: 'success' })
    closeReply()
    loadMessages(currentPage.value)
  } catch (e) { /* 错误提示由 request.js 统一弹出 */ }
}

onMounted(() => { loadMessages(1) })
</script>
```

样式复制 `messages.vue` 对应 class（msg-list/msg-card/status-badge 等），追加：

```css
.channel-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; background: #f0f5ff; color: #597ef7; }
.contact-line { font-size: 24rpx; color: #666; margin-bottom: 8rpx; }
```

- [ ] **Step 3: 注册路由**

按 web 仓库既有路由注册方式（`src/router/*.js` 或页面菜单配置）注册 `activity/consultation-messages` 页面（实施时 `rg -n "activity/messages" src/router` 定位后仿照追加）。

- [ ] **Step 4: 提交 web 管理端**

```bash
cd e:\code\web
git add src/api/wealth.js src/pages/activity/consultation-messages.vue <路由文件>
git commit -m "feat(web): 预约咨询留言管理页（列表/筛选/回复）+ 咨询API"
```

---

### Task 7: 部署 + 线上验证

- [ ] **Step 1: 部署后端 joho**

```powershell
ssh joho "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH && export PM2_HOME=/home/admin/.pm2 && pm2 restart strapi"
```

Expected: pull 成功、pm2 restart 成功。

- [ ] **Step 2: C 端部署**

```bash
cd e:\code\strapi-wealth
git push origin wealth-line
# 按既有部署脚本同步 v.joho.cn/wealth
```

Expected: 线上资源 hash 与本地一致。

- [ ] **Step 3: web 管理端部署**

按 web 仓库既有部署流程（vite 构建 + 发布；实施时确认部署目标）。

- [ ] **Step 4: 数据库验证（joho）**

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c"
$PSQL "\d wealth_consultations"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 新列 submit_type/contact_type/contact_value/wechat_type/reply/replied_at 已自动创建。

- [ ] **Step 5: 线上功能验证**

1. C 端（微信浏览器）详情页：咨询弹窗三 Tab 正常；电话渠道提交成功；留言渠道校验生效；微信 Tab 显示占位文案（配置前）
2. 管理端：配置页上传企业/个人微信二维码 + 填微信号 → 保存成功
3. C 端微信 Tab 刷新：显示二维码 + 复制按钮，点击复制 toast「微信号已复制」
4. 管理端咨询留言页：电话/留言记录列表可见（渠道标签正确）、回复弹层提交成功、状态变已回复
5. C 端「我的咨询」列表：显示管理员回复内容与时间
6. 组合方案：详情页添加产品无配比输入 → 创建成功；详情页显示配比或「等权」

---

## Self-Review

**Spec coverage:**
- A1 normalizeProducts（createPlan/updatePlan 等权）→ Task 1 ✓
- A2 C 端免配比 + 高级设置 → Task 5 Step 1/5 ✓
- B1 schema 扩展（submitType/contactType/contactValue/wechatType/reply/repliedAt/status+replied/name/phone 选填）→ Task 2 Step 1 ✓
- B2 wealth-consult-config + 公开接口 → Task 3 ✓
- B3 createBooking 三渠道校验 / admin 列表回复路由 → Task 2/3 ✓
- B4 C 端三 Tab + 微信二维码复制 + 我的咨询回复展示 → Task 5 ✓
- B5 管理端留言页 + 二维码配置 → Task 6 ✓
- 部署验证 → Task 7 ✓

**Placeholder scan:** 无 TBD/TODO；Task 5 Step 5 与 Task 6 Step 3 的「以实际结构为准」属探索式运行步骤（给出 rg 定位命令），非占位符。

**Type consistency:** `createBooking` 统一返回 `{ ok, record? | code, msg }`（Task 2 Step 4 定义，控制器 Step 6 消费）；`getConsultConfig` 返回四字段对象（Task 3 Step 4 定义，控制器/测试 Step 2/5 一致）；`adminListBookings` 返回 `{ records, total, page, pageSize }`（Task 2 Step 4 定义，Task 6 前端按 `res.list ?? res.data` 读取——注意：`successResponse` 包装后的结构与 extractList 的兼容，实施时若 extractList 取 `list` 字段，需在控制器 adminList 返回 `{ list: records, pagination: {...} }` 适配，见下）

**兼容性修正（内联）：** `adminListBookings` 返回 `{ records, total, page, pageSize }`，但 web 端 `extractList` 期望 `{ list, pagination }`。`controllers/consultation.ts` 的 `adminList` 方法组装返回时改为：

```typescript
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminListBookings({ page, pageSize, status, submitType });
      ctx.body = successResponse({
        list: result.records,
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total },
      });
```

**验证记录（实施后填写）：**
- Task 7 数据库列与线上功能结论：
