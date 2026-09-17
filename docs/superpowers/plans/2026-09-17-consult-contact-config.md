# 服务人联系方式分级匹配实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** C 端咨询弹窗联系方式按「推荐人(服务人) → 城市就近 → 全局配置」三级匹配展示，服务人配置由管理端维护，写后更新缓存。

**Architecture:** 新增 content-type `wealth-consult-contact`（一条记录=一个服务人），在 `consultation-service` 中实现 `resolveContact` 匹配链路 + 内存缓存，公开接口 `GET /v1/wealth/consult/config` 增强（可选 token 解析推荐人 + city/经纬度参数），管理端新增 consult-contacts CRUD；C 端弹窗打开时尝试定位并携带参数，展示服务人信息；管理端新增服务人配置页。

**Tech Stack:** Strapi v5 插件（zhao-wealth）、zhao-sso 服务门面（sso-jwt/sso-user）、uni-app H5、web 管理端（uni-app）。

**关联 spec:** `docs/superpowers/specs/2026-09-17-consult-contact-config-design.md`

---

## 文件结构

| 文件 | 仓库 | 职责 |
|---|---|---|
| `plugins/zhao-wealth/server/src/content-types/wealth-consult-contact/schema.json` | basic | 服务人配置 content-type |
| `plugins/zhao-wealth/server/src/content-types/index.ts` | basic | 注册新 content-type |
| `plugins/zhao-wealth/server/src/services/consultation-service.ts` | basic | `resolveContact` 匹配链路 + 服务人 CRUD + 缓存 |
| `plugins/zhao-wealth/server/src/controllers/consultation.ts` | basic | 公开 config 增强 + 管理端 CRUD handlers |
| `plugins/zhao-wealth/server/src/routes/content-api.ts` | basic | consult/config 路由（保持 auth:false） |
| `plugins/zhao-wealth/server/src/routes/admin-api.ts` | basic | consult-contacts CRUD 路由 |
| `plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts` | basic | resolveContact/CRUD 单测 |
| `services/api.ts` | strapi-wealth | `getConsultConfig` 支持参数 |
| `pages/detail/index.vue` | strapi-wealth | 定位 + 服务人信息展示 |
| `src/api/wealth.js` | web | consult-contacts CRUD API |
| `src/pages/wealth/consult-contact/index.vue` | web | 服务人配置列表 |
| `src/pages/wealth/consult-contact/form.vue` | web | 服务人配置表单 |
| `src/pages.json` | web | 注册两个新页面 |

---

### Task 1: 后端 content-type：wealth-consult-contact

**Files:**
- Create: `plugins/zhao-wealth/server/src/content-types/wealth-consult-contact/schema.json`
- Modify: `plugins/zhao-wealth/server/src/content-types/index.ts`

- [ ] **Step 1: 创建 schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "wealth_consult_contacts",
  "info": {
    "singularName": "wealth-consult-contact",
    "pluralName": "wealth-consult-contacts",
    "displayName": "服务人联系方式"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "inviterId": { "type": "integer", "required": true, "unique": true },
    "nickname": { "type": "string" },
    "branchName": { "type": "string" },
    "branchPhones": { "type": "json" },
    "latitude": { "type": "decimal" },
    "longitude": { "type": "decimal" },
    "city": { "type": "string" },
    "enterpriseWechatQr": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "enterpriseWechatId": { "type": "string" },
    "personalWechatQr": { "type": "media", "allowedTypes": ["images"], "multiple": false },
    "personalWechatId": { "type": "string" }
  }
}
```

- [ ] **Step 2: 注册 content-type**

在 `plugins/zhao-wealth/server/src/content-types/index.ts`：
- import 行末尾追加：`import wealthConsultContact from './wealth-consult-contact/schema.json';`
- 导出对象中 `'wealth-consult-config': { schema: wealthConsultConfig },` 之后追加：
```ts
  'wealth-consult-contact': { schema: wealthConsultContact },
```

- [ ] **Step 3: 校验 JSON 语法**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-wealth/server/src/content-types/wealth-consult-contact/schema.json','utf8')); console.log('schema ok')"`
Expected: `schema ok`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-wealth/server/src/content-types/wealth-consult-contact/schema.json plugins/zhao-wealth/server/src/content-types/index.ts
git commit -m "feat(zhao-wealth): 新增服务人联系方式 content-type wealth-consult-contact"
```

---

### Task 2: 服务层：resolveContact 匹配链路 + 服务人 CRUD + 缓存（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/consultation-service.ts`
- Modify: `plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts`

- [ ] **Step 1: 写失败测试**

在 `plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts` 追加以下测试块：

```ts
describe('consultation-service 服务人分级匹配', () => {
  let service: any;
  const mockContactQuery = jest.fn();
  const mockCfgFindOne = jest.fn();
  const mockSsoFindById = jest.fn();

  const mockQuery2 = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-consultation') {
      return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    }
    if (name === 'plugin::zhao-wealth.wealth-consult-contact') {
      return mockContactQuery();
    }
    if (name === 'plugin::zhao-wealth.wealth-consult-config') {
      return { findOne: mockCfgFindOne };
    }
    return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/consultation-service').default;
    service = factory({
      strapi: {
        db: { query: mockQuery2 },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({ findById: mockSsoFindById }) }),
      },
    });
  });

  it('推荐人是服务人：返回该服务人配置', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 1, inviterId: 9, nickname: '王经理', branchName: '市南支行',
        branchPhones: ['0532-88888888'], latitude: 36.07, longitude: 120.38, city: '青岛',
        enterpriseWechatQr: { url: '/uploads/ent.png' }, enterpriseWechatId: 'qd-wealth',
        personalWechatQr: null, personalWechatId: null,
      }),
    });
    const r = await service.resolveContact({ invitedBy: 9 });
    expect(r.branchName).toBe('市南支行');
    expect(r.nickname).toBe('王经理');
    expect(r.enterpriseWechatId).toBe('qd-wealth');
  });

  it('无推荐人：城市命中返回城市服务人', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([{
        id: 2, inviterId: 10, nickname: '李顾问', branchName: '李沧支行',
        branchPhones: [], latitude: 36.16, longitude: 120.43, city: '青岛',
        enterpriseWechatQr: null, enterpriseWechatId: null,
        personalWechatQr: { url: '/uploads/personal.png' }, personalWechatId: 'li-1888',
      }]),
    });
    const r = await service.resolveContact({ invitedBy: null, city: '青岛' });
    expect(r.nickname).toBe('李顾问');
    expect(r.personalWechatId).toBe('li-1888');
  });

  it('城市多服务人：有经纬度按距离最近', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([
        { id: 3, inviterId: 11, nickname: '近点', city: '青岛', latitude: 36.06, longitude: 120.37, branchPhones: [] },
        { id: 4, inviterId: 12, nickname: '远点', city: '青岛', latitude: 36.16, longitude: 120.50, branchPhones: [] },
      ]),
    });
    const r = await service.resolveContact({ invitedBy: null, city: '青岛', latitude: 36.065, longitude: 120.375 });
    expect(r.nickname).toBe('近点');
  });

  it('城市未命中：落全局配置兜底', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    });
    mockCfgFindOne.mockResolvedValue({
      enterpriseWechatQr: { url: '/uploads/global.png' },
      personalWechatQr: null,
      enterpriseWechatId: 'global-wealth',
      personalWechatId: null,
    });
    const r = await service.resolveContact({ invitedBy: null, city: '不存在市' });
    expect(r.enterpriseWechatId).toBe('global-wealth');
  });

  it('全局也无配置：空字段占位', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    });
    mockCfgFindOne.mockResolvedValue(null);
    const r = await service.resolveContact({ invitedBy: null, city: '不存在市' });
    expect(r.enterpriseWechatId).toBeNull();
    expect(r.personalWechatId).toBeNull();
  });

  it('管理端创建服务人配置：写入 inviterId 唯一记录', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 1, inviterId: 9 });
    mockContactQuery.mockReturnValue({ create: mockCreate });
    const r = await service.adminCreateContact({ inviterId: 9, nickname: '王经理' });
    expect(r.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.inviterId).toBe(9);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd plugins/zhao-wealth && npx jest __tests__/consultation-service.test.ts -t "服务人分级匹配" 2>&1 | tail -20`
Expected: FAIL（`service.resolveContact is not a function`）

- [ ] **Step 3: 实现服务层**

在 `plugins/zhao-wealth/server/src/services/consultation-service.ts` 中：

a) 文件顶部新增常量与工具函数（放在 `const PHONE_RE` 之后）：

```ts
const CONTACT_UID = 'plugin::zhao-wealth.wealth-consult-contact';
const CONFIG_UID = 'plugin::zhao-wealth.wealth-consult-config';

/** 内存缓存：inviter:{id} / city:{name} / global。服务人配置低频变更，写后清空即可 */
const contactCache = new Map<string, any>();

function cacheGet<T>(key: string): T | undefined {
  return contactCache.get(key) as T | undefined;
}
function cacheSet(key: string, value: any) {
  contactCache.set(key, value);
}
function cacheClear() {
  contactCache.clear();
}

/** 经纬度距离（米，Haversine） */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 服务人记录 → 对外响应结构（媒体字段取 url） */
function shapeContact(c: any) {
  if (!c) return null;
  let phones: string[] = [];
  if (Array.isArray(c.branchPhones)) phones = c.branchPhones;
  else if (c.branchPhones) {
    try { phones = JSON.parse(c.branchPhones); } catch { phones = []; }
  }
  return {
    nickname: c.nickname || null,
    branchName: c.branchName || null,
    branchPhones: phones,
    enterpriseWechatQr: c.enterpriseWechatQr?.url || null,
    personalWechatQr: c.personalWechatQr?.url || null,
    enterpriseWechatId: c.enterpriseWechatId || null,
    personalWechatId: c.personalWechatId || null,
  };
}

/** 同城多服务人就近选取：有客户经纬度按距离最近；无则 id 升序取第一 */
function pickNearest(list: any[], latitude?: number | null, longitude?: number | null) {
  if (list.length <= 1) return list[0];
  if (latitude == null || longitude == null) return list[0];
  let best = list[0];
  let bestDist = Infinity;
  for (const c of list) {
    if (c.latitude == null || c.longitude == null) continue;
    const d = haversineMeters(latitude, longitude, Number(c.latitude), Number(c.longitude));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
```

b) 新增服务方法（放在 `getConsultConfig` 之前）：

```ts
  /** 按邀请人（服务人）查询配置，缓存键 inviter:{id} */
  async function findContactByInviter(inviterId: number) {
    const key = `inviter:${inviterId}`;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const contact = await strapi.db.query(CONTACT_UID).findOne({ where: { inviterId } });
    cacheSet(key, contact || null);
    return contact || null;
  }

  /** 按城市查询服务人列表（id 升序），缓存键 city:{name} */
  async function findContactsByCity(city: string) {
    const key = `city:${city}`;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const list = await strapi.db.query(CONTACT_UID).findMany({
      where: { city },
      orderBy: { id: 'asc' },
    });
    cacheSet(key, list);
    return list;
  }

  /** 全局配置兜底（企业微信无图仅返回个人微信），缓存键 global */
  async function getGlobalConfig() {
    const key = 'global';
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const cfg = await strapi.db.query(CONFIG_UID).findOne({});
    const shaped = {
      nickname: null,
      branchName: null,
      branchPhones: [],
      enterpriseWechatQr: cfg?.enterpriseWechatQr?.url || null,
      personalWechatQr: cfg?.personalWechatQr?.url || null,
      enterpriseWechatId: cfg?.enterpriseWechatId || null,
      personalWechatId: cfg?.personalWechatId || null,
    };
    cacheSet(key, shaped);
    return shaped;
  }

  /**
   * 服务人联系方式分级匹配：
   * 1. 有推荐人且该推荐人是服务人 → 返回服务人配置
   * 2. 无推荐人/推荐人非服务人 → 城市就近（同城多服务人按经纬度最近）
   * 3. 城市未命中 → 全局配置兜底（企业微信无图仅个人微信）
   * 4. 全局也无 → 空字段占位
   */
  async function resolveContact(params: {
    invitedBy?: number | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    if (params.invitedBy) {
      const inviterContact = await findContactByInviter(params.invitedBy);
      if (inviterContact) return shapeContact(inviterContact);
    }
    if (params.city) {
      const list = await findContactsByCity(params.city);
      if (list.length > 0) {
        const pick = pickNearest(list, params.latitude, params.longitude);
        return shapeContact(pick);
      }
    }
    return getGlobalConfig();
  }

  /** 管理端：服务人配置列表（分页） */
  async function adminListContacts(params: { page?: number; pageSize?: number; city?: string }) {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 20, 100);
    const offset = (page - 1) * pageSize;
    const where: any = {};
    if (params.city) where.city = params.city;

    const [records, total] = await Promise.all([
      strapi.db.query(CONTACT_UID).findMany({
        where, orderBy: { id: 'desc' }, limit: pageSize, offset,
      }),
      strapi.db.query(CONTACT_UID).count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  /** 管理端：创建服务人配置 */
  async function adminCreateContact(data: any) {
    if (!data.inviterId) return fail(400, '请选择服务人');
    const payload: any = {
      inviterId: Number(data.inviterId),
      nickname: data.nickname || null,
      branchName: data.branchName || null,
      branchPhones: data.branchPhones ?? null,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      city: data.city || null,
    };
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;
    const record = await strapi.db.query(CONTACT_UID).create({ data: payload });
    cacheClear();
    return { ok: true, record };
  }

  /** 管理端：更新服务人配置 */
  async function adminUpdateContact(id: number, data: any) {
    const payload: any = {};
    if (data.inviterId !== undefined) payload.inviterId = Number(data.inviterId);
    if (data.nickname !== undefined) payload.nickname = data.nickname;
    if (data.branchName !== undefined) payload.branchName = data.branchName;
    if (data.branchPhones !== undefined) payload.branchPhones = data.branchPhones;
    if (data.latitude !== undefined) payload.latitude = data.latitude != null ? Number(data.latitude) : null;
    if (data.longitude !== undefined) payload.longitude = data.longitude != null ? Number(data.longitude) : null;
    if (data.city !== undefined) payload.city = data.city;
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;
    const record = await strapi.db.query(CONTACT_UID).update({ where: { id }, data: payload });
    cacheClear();
    return { ok: true, record };
  }

  /** 管理端：删除服务人配置 */
  async function adminDeleteContact(id: number) {
    await strapi.db.query(CONTACT_UID).delete({ where: { id } });
    cacheClear();
    return { ok: true };
  }
```

c) 在 `getConsultConfig` 中同步使用全局缓存（保持 `adminUpdateConsultConfig` 写后失效）：

替换 `getConsultConfig` 函数体为：
```ts
  async function getConsultConfig() {
    return getGlobalConfig();
  }
```

在 `adminUpdateConsultConfig` 的 `return record;` 前追加 `cacheClear();`。

d) 在返回对象（`return { createBooking, ... }`）中追加：
```ts
    resolveContact,
    adminListContacts,
    adminCreateContact,
    adminUpdateContact,
    adminDeleteContact,
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd plugins/zhao-wealth && npx jest __tests__/consultation-service.test.ts 2>&1 | tail -20`
Expected: PASS（原三渠道用例 + 新增分级匹配用例全部通过）

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/consultation-service.ts plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts
git commit -m "feat(zhao-wealth): 服务人分级匹配 resolveContact + 服务人 CRUD + 缓存"
```

---

### Task 3: 路由与控制器：公开 config 增强 + 管理端 consult-contacts CRUD

**Files:**
- Modify: `plugins/zhao-wealth/server/src/controllers/consultation.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/content-api.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/admin-api.ts`

- [ ] **Step 1: 增强公开 consultConfig 控制器**

替换 `plugins/zhao-wealth/server/src/controllers/consultation.ts` 中的 `consultConfig` handler：

```ts
  /**
   * GET /v1/wealth/consult/config（公开，可选登录）
   * 带 token 时解析推荐人；带 city/latitude/longitude 时城市就近匹配
   */
  async consultConfig(ctx) {
    try {
      const { city, latitude, longitude } = ctx.query;
      let invitedBy = null;

      const authHeader = ctx.request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwtService = strapi.plugin('zhao-sso').service('sso-jwt');
          const payload = await jwtService.verifyToken(authHeader.slice(7));
          if (payload && payload.type === 'access' && payload.id) {
            const ssoUser = await strapi.plugin('zhao-sso').service('sso-user').findById(payload.id);
            invitedBy = ssoUser?.invited_by || null;
          }
        } catch (e) {
          // 无效/过期 token 视为未登录，继续走城市/全局
        }
      }

      const cfg = await strapi.service('plugin::zhao-wealth.consultation-service').resolveContact({
        invitedBy,
        city: city || null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
      });
      ctx.body = successResponse(cfg);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 咨询配置查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
```

- [ ] **Step 2: 追加管理端 CRUD 控制器**

在 `plugins/zhao-wealth/server/src/controllers/consultation.ts` 的 `adminUpdateConfig` handler 之后追加：

```ts
  /**
   * GET /v1/admin/consult-contacts
   */
  async adminListContacts(ctx) {
    try {
      const { page, pageSize, city } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminListContacts({ page, pageSize, city });
      ctx.body = successResponse({
        list: result.records,
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total },
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 服务人配置列表失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  /**
   * POST /v1/admin/consult-contacts
   */
  async adminCreateContact(ctx) {
    try {
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminCreateContact(ctx.request.body);
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '已保存');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 服务人配置创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '保存失败');
    }
  },

  /**
   * PUT /v1/admin/consult-contacts/:id
   */
  async adminUpdateContact(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.service('plugin::zhao-wealth.consultation-service').adminUpdateContact(Number(id), ctx.request.body);
      ctx.body = successResponse(result.record, '已保存');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 服务人配置更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '保存失败');
    }
  },

  /**
   * DELETE /v1/admin/consult-contacts/:id
   */
  async adminDeleteContact(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.service('plugin::zhao-wealth.consultation-service').adminDeleteContact(Number(id));
      ctx.body = successResponse(null, '已删除');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 服务人配置删除失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },
```

- [ ] **Step 3: 确认公开路由保持 auth:false**

`plugins/zhao-wealth/server/src/routes/content-api.ts` 中 `GET /v1/wealth/consult/config` 路由**不改**（已是 `auth: false` 无策略），控制器内已做可选登录解析。

- [ ] **Step 4: 追加管理端路由**

在 `plugins/zhao-wealth/server/src/routes/admin-api.ts` 末尾（consultations 段附近）追加：

```ts
    // ===== 服务人联系方式配置 =====
    adminRoute('GET', '/v1/admin/consult-contacts', 'consultation.adminListContacts'),
    adminRoute('POST', '/v1/admin/consult-contacts', 'consultation.adminCreateContact'),
    adminRoute('PUT', '/v1/admin/consult-contacts/:id', 'consultation.adminUpdateContact'),
    adminRoute('DELETE', '/v1/admin/consult-contacts/:id', 'consultation.adminDeleteContact'),
```

- [ ] **Step 5: 运行测试**

Run: `cd plugins/zhao-wealth && npx jest __tests__/consultation-service.test.ts 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-wealth/server/src/controllers/consultation.ts plugins/zhao-wealth/server/src/routes/content-api.ts plugins/zhao-wealth/server/src/routes/admin-api.ts
git commit -m "feat(zhao-wealth): 咨询配置公开接口分级匹配 + 管理端服务人 CRUD 路由"
```

---

### Task 4: 构建 zhao-wealth dist 并提交推送

**Files:**
- 构建产物：`plugins/zhao-wealth/dist`

- [ ] **Step 1: 重建 dist**

Run: `cd plugins/zhao-wealth && npm run build`
Expected: 编译通过，`dist/server/src/content-types/index.js` 含 `wealth-consult-contact`

- [ ] **Step 2: 验证 dist 包含新接口**

Run: `rg -n "resolveContact|consult-contacts" plugins/zhao-wealth/dist/server -l`
Expected: 命中 `services/consultation.js`、`controllers/consultation.js`、`routes/admin-api.js`

- [ ] **Step 3: Commit + Push**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist（服务人分级匹配 + CRUD）"
git push origin main
```

---

### Task 5: C 端改造（strapi-wealth）

**Files:**
- Modify: `services/api.ts`
- Modify: `pages/detail/index.vue`

- [ ] **Step 1: getConsultConfig 支持参数**

`services/api.ts` 中替换：

```ts
export const getConsultConfig = () =>
  get(`${V1}/consult/config`).then(extractItem)
```

为：

```ts
export const getConsultConfig = (params = {}) =>
  get(`${V1}/consult/config`, params).then(extractItem)
```

- [ ] **Step 2: 弹窗打开时定位并传参**

`pages/detail/index.vue` 中：

a) 新增定位函数（放在 `loadConsultConfig` 之前）：

```ts
// H5 定位：成功返回经纬度与城市，失败/拒权返回 null（自然落全局兜底）
function locateCity(): Promise<{ latitude: number; longitude: number; city: string } | null> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => resolve({
        latitude: res.latitude,
        longitude: res.longitude,
        city: (res as any).city || '',
      }),
      fail: () => resolve(null),
    })
  })
}
```

b) 替换 `loadConsultConfig`：

```ts
async function loadConsultConfig() {
  const loc = await locateCity()
  try {
    consultConfig.value = await getConsultConfig(loc ? {
      city: loc.city,
      latitude: loc.latitude,
      longitude: loc.longitude,
    } : {})
  } catch (e) {
    consultConfig.value = { enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '' }
  }
}
```

- [ ] **Step 3: 展示服务人信息（网点/昵称/电话）**

`pages/detail/index.vue` 微信 Tab 的二维码行（`v-if="consultConfig.enterpriseWechatQr || consultConfig.personalWechatQr"` 所在 view）**之前**插入：

```html
<!-- 服务人信息：昵称/网点/电话 -->
<view class="wechat-servicer" v-if="consultConfig.nickname || consultConfig.branchName || (consultConfig.branchPhones && consultConfig.branchPhones.length)">
  <view class="servicer-line" v-if="consultConfig.nickname || consultConfig.branchName">
    <text class="servicer-name" v-if="consultConfig.nickname">{{ consultConfig.nickname }}</text>
    <text class="servicer-branch" v-if="consultConfig.branchName">{{ consultConfig.branchName }}</text>
  </view>
  <view class="servicer-phones" v-if="consultConfig.branchPhones && consultConfig.branchPhones.length">
    <text class="servicer-phone" v-for="(p, i) in consultConfig.branchPhones" :key="i" @click="callPhone(p)">{{ p }}</text>
  </view>
</view>
```

并在 `copyWechatId` 函数之后新增：

```ts
function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}
```

同步在 script 的 `consultConfig` ref 初始化中补充新字段：

```ts
const consultConfig = ref({ enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '', nickname: '', branchName: '', branchPhones: [] })
```

样式（追加到 style 段）：

```css
.wechat-servicer { margin-bottom: 24rpx; }
.servicer-line { display: flex; align-items: center; margin-bottom: 8rpx; }
.servicer-name { font-size: 30rpx; font-weight: 600; color: #333; margin-right: 16rpx; }
.servicer-branch { font-size: 26rpx; color: #888; }
.servicer-phones { display: flex; flex-wrap: wrap; gap: 16rpx; }
.servicer-phone { font-size: 26rpx; color: #2b6de8; text-decoration: underline; }
```

- [ ] **Step 4: 构建并验证产物**

Run: `cd e:\code\strapi-wealth && npm run build:h5`
Expected: 构建成功；`rg -l "wechat-servicer" dist/build/h5/assets` 命中

- [ ] **Step 5: Commit + Push**

```bash
git add services/api.ts pages/detail/index.vue
git commit -m "feat(wealth-c): 咨询弹窗定位 + 服务人网点/昵称/电话展示"
git push origin wealth-line
```

---

### Task 6: 管理端服务人配置页（web）

**Files:**
- Modify: `src/api/wealth.js`
- Create: `src/pages/wealth/consult-contact/index.vue`
- Create: `src/pages/wealth/consult-contact/form.vue`
- Modify: `src/pages.json`

- [ ] **Step 1: 新增 CRUD API**

`src/api/wealth.js` 中追加（放在 consult-config 相关函数附近）：

```js
// ==================== 服务人联系方式配置 ====================
export function getConsultContactList(params = {}) {
  return adminGet(`${ADMIN}/consult-contacts`, params).then(extractList)
}
export function createConsultContact(data) {
  return adminPost(`${ADMIN}/consult-contacts`, data).then(extractItem)
}
export function updateConsultContact(id, data) {
  return adminPut(`${ADMIN}/consult-contacts/${id}`, data).then(extractItem)
}
export function deleteConsultContact(id) {
  return adminDel(`${ADMIN}/consult-contacts/${id}`).then(extractItem)
}
```

- [ ] **Step 2: 注册页面**

`src/pages.json` 中 `pages/wealth/disclosure/index` 附近追加：

```json
    { "path": "pages/wealth/consult-contact/index", "style": { "navigationBarTitleText": "服务人配置" } },
    { "path": "pages/wealth/consult-contact/form", "style": { "navigationBarTitleText": "服务人编辑" } },
```

- [ ] **Step 3: 列表页 index.vue**

创建 `src/pages/wealth/consult-contact/index.vue`：

```vue
<template>
  <view class="page-container">
    <PageHeader title="服务人配置" desc="按推荐人/城市就近展示咨询联系方式，未配置时落全局配置" />
    <view class="filter-section">
      <input class="filter-input" v-model="filters.city" placeholder="按城市筛选" />
      <button class="btn-primary" size="mini" @click="loadList(1)">查询</button>
      <button class="btn-primary" size="mini" @click="goForm()">新增服务人</button>
    </view>
    <view class="config-list" v-if="list.length">
      <view class="config-card" v-for="item in list" :key="item.id">
        <view class="card-top">
          <text class="card-title">{{ item.nickname || ('服务人#' + item.inviterId) }}</text>
          <text class="card-city" v-if="item.city">{{ item.city }}</text>
        </view>
        <view class="card-info" v-if="item.branchName">网点：{{ item.branchName }}</view>
        <view class="card-info" v-if="item.branchPhones && item.branchPhones.length">电话：{{ item.branchPhones.join(' / ') }}</view>
        <view class="card-actions">
          <button class="btn-primary" size="mini" @click="goForm(item)">编辑</button>
          <button class="btn-danger" size="mini" @click="remove(item)">删除</button>
        </view>
      </view>
    </view>
    <view class="empty" v-else>暂无服务人配置</view>
  </view>
</template>

<script>
import { getConsultContactList, deleteConsultContact } from '../../../api/wealth.js'

export default {
  data() {
    return { list: [], filters: { city: '' }, pagination: { page: 1, pageSize: 20, total: 0 } }
  },
  onShow() { this.loadList(1) },
  methods: {
    async loadList(page = 1) {
      try {
        const res = await getConsultContactList({ page, pageSize: this.pagination.pageSize, city: this.filters.city || undefined })
        this.list = res.list || []
        this.pagination = res.pagination || { page: 1, pageSize: 20, total: 0 }
      } catch (e) { uni.showToast({ title: e.message || '加载失败', icon: 'none' }) }
    },
    goForm(item) {
      uni.navigateTo({ url: `/pages/wealth/consult-contact/form${item ? '?id=' + item.id : ''}` })
    },
    remove(item) {
      uni.showModal({
        title: '确认删除', content: `删除服务人「${item.nickname || item.inviterId}」的配置？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteConsultContact(item.id)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.loadList(1)
          } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
        },
      })
    },
  },
}
</script>

<style scoped>
.page-container { padding: 24rpx; }
.filter-section { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.filter-input { flex: 1; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 12rpx 16rpx; font-size: 26rpx; }
.config-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; }
.card-city { font-size: 24rpx; color: #2b6de8; background: #eef3ff; padding: 4rpx 12rpx; border-radius: 8rpx; }
.card-info { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.card-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.btn-danger { background: #fdecec; color: #e64340; border: none; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
```

（注：`PageHeader`、`btn-primary` 等沿用 web 管理端既有组件/样式约定；若项目无 `PageHeader` 组件则去掉该行，用 `navigationBarTitleText` 即可。实现时先检查 `src/components` 是否已有 PageHeader。）

- [ ] **Step 4: 表单页 form.vue**

创建 `src/pages/wealth/consult-contact/form.vue`：

```vue
<template>
  <view class="form-container">
    <view class="form-group">
      <text class="form-label">服务人（邀请人）<text class="req">*</text></text>
      <picker :range="userOptions" range-key="label" @change="onPickUser">
        <view class="form-input picker-value">{{ selectedUser ? selectedUser.label : '请选择服务人（SSO用户）' }}</view>
      </picker>
    </view>
    <view class="form-group">
      <text class="form-label">服务人昵称</text>
      <input class="form-input" v-model="form.nickname" placeholder="如：王经理" />
    </view>
    <view class="form-group">
      <text class="form-label">网点名称</text>
      <input class="form-input" v-model="form.branchName" placeholder="如：青岛银行市南支行" />
    </view>
    <view class="form-group">
      <text class="form-label">网点电话（可多个，回车分隔）</text>
      <textarea class="form-input" v-model="phonesText" placeholder="0532-88886666&#10;13800000000" />
    </view>
    <view class="form-group">
      <text class="form-label">城市</text>
      <input class="form-input" v-model="form.city" placeholder="如：青岛" />
    </view>
    <view class="form-group">
      <text class="form-label">纬度（可选，同城就近排序用）</text>
      <input class="form-input" type="digit" v-model="form.latitude" placeholder="如：36.067" />
    </view>
    <view class="form-group">
      <text class="form-label">经度（可选）</text>
      <input class="form-input" type="digit" v-model="form.longitude" placeholder="如：120.383" />
    </view>
    <view class="form-group">
      <text class="form-label">企业微信二维码</text>
      <image v-if="form.enterpriseWechatQr" class="qr-preview" :src="form.enterpriseWechatQr" mode="aspectFit" @click="chooseQr('enterpriseWechatQr')" />
      <view v-else class="qr-upload" @click="chooseQr('enterpriseWechatQr')">上传二维码</view>
    </view>
    <view class="form-group">
      <text class="form-label">企业微信号</text>
      <input class="form-input" v-model="form.enterpriseWechatId" placeholder="企业微信号（选填）" />
    </view>
    <view class="form-group">
      <text class="form-label">个人微信二维码</text>
      <image v-if="form.personalWechatQr" class="qr-preview" :src="form.personalWechatQr" mode="aspectFit" @click="chooseQr('personalWechatQr')" />
      <view v-else class="qr-upload" @click="chooseQr('personalWechatQr')">上传二维码</view>
    </view>
    <view class="form-group">
      <text class="form-label">个人微信号</text>
      <input class="form-input" v-model="form.personalWechatId" placeholder="个人微信号（选填）" />
    </view>
    <button class="submit-btn" @click="save">保存</button>
  </view>
</template>

<script>
import { getConsultContactList, createConsultContact, updateConsultContact } from '../../../api/wealth.js'
import { listSsoUsers } from '../../../api/sso.js'

export default {
  data() {
    return {
      id: null,
      form: {
        inviterId: null, nickname: '', branchName: '', city: '',
        latitude: '', longitude: '', enterpriseWechatQr: '', enterpriseWechatId: '',
        personalWechatQr: '', personalWechatId: '',
      },
      phonesText: '',
      userOptions: [],
      selectedUser: null,
    }
  },
  async onLoad(query) {
    if (query.id) {
      this.id = Number(query.id)
      const res = await getConsultContactList({ page: 1, pageSize: 100 })
      const item = (res.list || []).find((x) => x.id === this.id)
      if (item) {
        this.form = {
          inviterId: item.inviterId, nickname: item.nickname || '', branchName: item.branchName || '',
          city: item.city || '', latitude: item.latitude ?? '', longitude: item.longitude ?? '',
          enterpriseWechatQr: item.enterpriseWechatQr || '', enterpriseWechatId: item.enterpriseWechatId || '',
          personalWechatQr: item.personalWechatQr || '', personalWechatId: item.personalWechatId || '',
        }
        this.phonesText = (item.branchPhones || []).join('\n')
      }
    }
    await this.loadUsers()
  },
  methods: {
    async loadUsers() {
      try {
        const res = await listSsoUsers({ page: 1, pageSize: 200 })
        this.userOptions = (res.list || []).map((u) => ({ label: `${u.username || u.mobile || u.email || u.id}（#${u.id}）`, value: u.id }))
        if (this.form.inviterId) {
          this.selectedUser = this.userOptions.find((o) => o.value === this.form.inviterId) || null
        }
      } catch (e) { /* 列表加载失败不阻塞表单 */ }
    },
    onPickUser(e) {
      this.selectedUser = this.userOptions[e.detail.value]
      this.form.inviterId = this.selectedUser ? this.selectedUser.value : null
    },
    chooseQr(field) {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          uni.uploadFile({
            url: `${this.$uploadUrl || '/api/zhao-wealth/v1/admin/upload'}`,
            filePath: res.tempFilePaths[0],
            name: 'files',
            success: (up) => {
              try {
                const body = JSON.parse(up.data)
                const fileId = Array.isArray(body) ? body[0].id : body.id
                this.form[field] = fileId
                uni.showToast({ title: '上传成功', icon: 'success' })
              } catch (e) { uni.showToast({ title: '上传失败', icon: 'none' }) }
            },
          })
        },
      })
    },
    async save() {
      if (!this.form.inviterId) { uni.showToast({ title: '请选择服务人', icon: 'none' }); return }
      const payload = { ...this.form, latitude: this.form.latitude === '' ? null : Number(this.form.latitude), longitude: this.form.longitude === '' ? null : Number(this.form.longitude) }
      payload.branchPhones = this.phonesText.split('\n').map((s) => s.trim()).filter(Boolean)
      try {
        if (this.id) { await updateConsultContact(this.id, payload) }
        else { await createConsultContact(payload) }
        uni.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 800)
      } catch (e) { uni.showToast({ title: e.message || '保存失败', icon: 'none' }) }
    },
  },
}
</script>

<style scoped>
.form-container { padding: 24rpx; }
.form-group { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 26rpx; color: #333; margin-bottom: 12rpx; }
.req { color: #e64340; }
.form-input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; min-height: 44rpx; width: 100%; box-sizing: border-box; }
.picker-value { display: flex; align-items: center; color: #333; }
.qr-preview { width: 240rpx; height: 240rpx; border-radius: 8rpx; }
.qr-upload { width: 240rpx; height: 240rpx; border: 1rpx dashed #bbb; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; color: #999; font-size: 26rpx; }
.submit-btn { background: #2b6de8; color: #fff; border-radius: 44rpx; margin-top: 40rpx; }
</style>
```

**实现说明（无占位）：**
- `listSsoUsers` 已存在于 `src/api/sso.js`（返回 `{ list }` 结构）
- 二维码上传复用管理端既有上传通道：先确认 `src/utils/request.js` 或全局是否有统一上传方法（如 `uploadFile`），有则替换 `uni.uploadFile` 的 URL 为既有约定路径；管理端文件上传实际地址为 Strapi 上传端点 `/api/upload`（经网关）。**实现时先查 `src/utils/request.js` 中 `adminGet` 的 baseURL 前缀约定，上传 URL 用相同前缀 + `/upload`。**

- [ ] **Step 5: 构建并验证**

Run: `cd e:\code\web && npm run build:h5`
Expected: 构建成功

- [ ] **Step 6: Commit + Push**

```bash
git add src/api/wealth.js src/pages/wealth/consult-contact/index.vue src/pages/wealth/consult-contact/form.vue src/pages.json
git commit -m "feat(web): 服务人联系方式配置页（列表+表单）"
git push origin main
```

---

### Task 7: 部署与线上验证

- [ ] **Step 1: 部署后端到 joho**

```bash
# 本机
cd e:\code\basic && git push origin main
# joho（SSH）
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
cd /www/apps/strapi && git pull origin main
pm2 restart strapi
```

Expected: `pm2 list` 中 strapi online；`\d wealth_consult_contacts` 表存在

- [ ] **Step 2: 验证表结构**

```bash
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "\d wealth_consult_contacts"
```
Expected: 含 `inviter_id`（unique）、`nickname`、`branch_name`、`branch_phones`、`latitude`、`longitude`、`city`、`enterprise_wechat_qr`、`enterprise_wechat_id`、`personal_wechat_qr`、`personal_wechat_id`

- [ ] **Step 3: 验证公开接口（未登录）**

```bash
curl -s "http://127.0.0.1:1337/api/zhao-wealth/v1/wealth/consult/config?city=%E9%9D%92%E5%B2%9B"
```
Expected: 返回全局配置兜底（无服务人数据时）或对应城市服务人

- [ ] **Step 4: 验证管理端接口**

```bash
JWT=$(curl -s -X POST http://127.0.0.1:1337/api/zhao-auth/v1/admin/auth/local -H "Content-Type: application/json" -d '{"identifier":"admin","password":"Admin@12345"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['jwt'])")
curl -s -X POST "http://127.0.0.1:1337/api/zhao-wealth/v1/admin/consult-contacts" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"inviterId":2,"nickname":"测试服务人","branchName":"市南支行","branchPhones":["0532-88888888"],"city":"青岛"}'
curl -s "http://127.0.0.1:1337/api/zhao-wealth/v1/admin/consult-contacts" -H "Authorization: Bearer $JWT"
```
Expected: 创建成功返回 200 body.code=200；列表含该记录（验证后删除该测试数据）

- [ ] **Step 5: 部署 C 端**

```bash
cd e:\code\strapi-wealth && powershell -ExecutionPolicy Bypass -File deploy-wealth.ps1
```
Expected: SYNC_OK

- [ ] **Step 6: 部署管理端**

```bash
cd e:\code\web && powershell -ExecutionPolicy Bypass -File deploy-h5.ps1
```
Expected: SYNC_OK

- [ ] **Step 7: C 端走查**

浏览器打开 `https://v.joho.cn/wealth/#/pages/detail/index?id=6`，打开预约咨询弹窗：
- 微信 Tab 显示服务人昵称/网点/电话（如有配置）
- 企业微信无图时仅显示个人微信
- 未登录也可打开弹窗（落全局配置）

- [ ] **Step 8: 管理端走查**

浏览器打开 `https://h.joho.cn/#/pages/wealth/consult-contact/index`：
- 列表/新增/编辑/删除正常
- 城市筛选正常

---

## 自审记录

- **Spec 覆盖**：服务人表（Task 1）、匹配链路（Task 2）、接口增强（Task 3）、C 端定位+展示（Task 5）、管理端页（Task 6）、缓存写后失效（Task 2 c）、企业微信无图降级（getGlobalConfig）、跨城不走就近（resolveContact 仅按 city 精确匹配）
- **类型一致**：`resolveContact` 参数名 `invitedBy/city/latitude/longitude` 在服务/控制器/C 端保持一致；`adminListContacts/adminCreateContact/adminUpdateContact/adminDeleteContact` 命名在服务/控制器/路由一致
- **无占位**：全部步骤含完整代码与命令；Task 6 中两处"实现时先确认"均给出明确候选方案
