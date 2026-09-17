# 产品详情页「预约咨询」「加入组合方案」修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 C 端财富产品详情页「预约咨询」（两 Tab：联系/留言，电话不显示号码直接拨打、免登录查看、预留联系方式选填）与「加入组合方案」（支持加入已有组合、新建方案默认「方案N」+ 3 个常用名称预设）功能，并修复后端组合方案 IDOR 越权与参数校验缺陷。

**Architecture:** 后端（basic/zhao-wealth）在 portfolio-service 增加 userId 归属校验（detail/update/delete/performance/export 全部按 `{id, userId}` 查询）与 createPlan products 非空校验、createBooking 留言预留电话格式校验；控制器透传 userId。前端（strapi-wealth）重写 detail 页两个弹窗，组合列表页增加改名能力。

**Tech Stack:** Strapi 插件（zhao-wealth，TS/Jest）、uni-app Vue3 H5（strapi-wealth，wealth-line 分支）、PostgreSQL。

**Spec:** `docs/superpowers/specs/2026-09-17-consult-portfolio-popups-design.md`

---

## 文件结构

- `e:\code\basic\plugins\zhao-wealth\server\src\services\portfolio-service.ts` — 归属校验 + createPlan 校验（改）
- `e:\code\basic\plugins\zhao-wealth\server\src\controllers\portfolio.ts` — 透传 userId、校验 result.ok（改）
- `e:\code\basic\plugins\zhao-wealth\server\src\services\consultation-service.ts` — 留言预留电话格式校验（改）
- `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\portfolio-service.test.ts` — 归属/校验单测（改）
- `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\consultation-service.test.ts` — 电话格式单测（改）
- `e:\code\strapi-wealth\pages\detail\index.vue` — 咨询弹窗 + 组合弹窗重构（改）
- `e:\code\strapi-wealth\pages\portfolio\list.vue` — 组合改名（改）
- `e:\code\strapi-wealth\components\portfolio-card.vue` — 卡片加「改名」入口（改）
- `e:\code\strapi-wealth\services\api.ts` — 已具备 `getPortfolioPlans`/`updatePortfolioPlan`，无需改动

---

### Task 1: 后端 portfolio-service 归属校验 + 创建校验（TDD）

**Files:**
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\portfolio-service.test.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\portfolio-service.ts`

- [ ] **Step 1: 改写测试文件（先写失败用例 + 修正既有用例签名）**

将 `portfolio-service.test.ts` 全文替换为：

```ts
'use strict';

describe('portfolio-service 归属校验与创建校验', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();
  const mockProductCount = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-portfolio-plan') {
      return { create: mockCreate, update: mockUpdate, findOne: mockFindOne };
    }
    if (name === 'plugin::zhao-wealth.wealth-product') {
      return { count: mockProductCount, findMany: jest.fn() };
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
    mockProductCount.mockResolvedValue(1);
    mockCreate.mockResolvedValue({ id: 1 });
    const r = await service.createPlan('user-1', {
      planName: '测试组合',
      products: [{ productId: 1, productName: 'A', addedDate: '2026-09-16' }],
    });
    expect(r.ok).toBe(true);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('createPlan：products 为空数组返回 400', async () => {
    const r = await service.createPlan('user-1', { planName: '测试组合', products: [] });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('createPlan：包含无效产品（计数不匹配）返回 400', async () => {
    mockProductCount.mockResolvedValue(1); // 传了 2 个 productId，只存在 1 个
    const r = await service.createPlan('user-1', {
      planName: '测试组合',
      products: [
        { productId: 1, productName: 'A', addedDate: '2026-09-16' },
        { productId: 999, productName: 'X', addedDate: '2026-09-16' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('getPlanDetail：非本人返回 null，查询条件带 userId', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.getPlanDetail(1, 'other-user');
    expect(r).toBeNull();
    expect(mockFindOne.mock.calls[0][0].where).toEqual({ id: 1, userId: 'other-user' });
  });

  it('updatePlan：非本人返回 404 且不执行更新', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.updatePlan(1, 'other-user', { planName: 'x' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updatePlan 落库前自动等权填充（本人）', async () => {
    mockFindOne.mockResolvedValue({ id: 2, userId: 'user-1' });
    mockUpdate.mockResolvedValue({ id: 2 });
    const r = await service.updatePlan(2, 'user-1', {
      products: [{ productId: 3, productName: 'C', addedDate: '2026-09-16' }],
    });
    expect(r.ok).toBe(true);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.products[0].allocationRatio).toBe(1);
  });

  it('deletePlan：非本人返回 404', async () => {
    mockFindOne.mockResolvedValue(null);
    const r = await service.deletePlan(1, 'other-user');
    expect(r.ok).toBe(false);
    expect(r.code).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('deletePlan：本人归档成功', async () => {
    mockFindOne.mockResolvedValue({ id: 3, userId: 'user-1' });
    mockUpdate.mockResolvedValue({ id: 3, status: 'archived' });
    const r = await service.deletePlan(3, 'user-1');
    expect(r.ok).toBe(true);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.status).toBe('archived');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

在 `e:\code\basic\plugins\zhao-wealth` 下运行：

```bash
npx jest --runInBand src/__tests__/portfolio-service.test.ts
```

Expected: FAIL —— createPlan 相关用例（`r.ok` 为 undefined）、getPlanDetail 传参不匹配、updatePlan/deletePlan 签名错误（`service.updatePlan(2, 'user-1', {...})` 传 3 参但实现只收 2 参）。

- [ ] **Step 3: 修改 `portfolio-service.ts` 实现**

将 `createPlan` 替换为：

```ts
  /**
   * 创建组合方案（products 非空 + 产品存在性校验）
   */
  async function createPlan(userId: string, planData: {
    planName: string;
    planType?: string;
    products: PortfolioProduct[];
    totalAmount?: number;
  }) {
    const products = planData.products;
    if (!Array.isArray(products) || products.length === 0) {
      return { ok: false, code: 400, msg: '请至少选择一个产品' };
    }
    const productIds = products.map((p) => Number(p.productId)).filter((n) => Number.isFinite(n));
    if (productIds.length !== products.length) {
      return { ok: false, code: 400, msg: '产品参数不合法' };
    }
    const productQuery = strapi.db.query('plugin::zhao-wealth.wealth-product');
    const found = await productQuery.count({ where: { id: { $in: productIds } } });
    if (found !== productIds.length) {
      return { ok: false, code: 400, msg: '包含无效产品' };
    }
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const record = await query.create({
      data: {
        userId,
        planName: planData.planName,
        planType: planData.planType || 'custom',
        products: normalizeProducts(products),
        totalAmount: planData.totalAmount || null,
        status: 'active',
      },
    });
    return { ok: true, record };
  }
```

将 `getPlanDetail` 签名与查询条件替换为（首行 `async function getPlanDetail(planId: number, userId: string)`，并把 `findOne({ where: { id: planId } })` 改为 `findOne({ where: { id: planId, userId } })`）：

```ts
  async function getPlanDetail(planId: number, userId: string) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const plan = await query.findOne({ where: { id: planId, userId } });
    if (!plan) return null;
```

将 `updatePlan` 替换为：

```ts
  async function updatePlan(planId: number, userId: string, planData: {
    planName?: string;
    planType?: string;
    products?: PortfolioProduct[];
    totalAmount?: number;
  }) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const plan = await query.findOne({ where: { id: planId, userId } });
    if (!plan) return { ok: false, code: 404, msg: '组合方案不存在' };
    const data: any = {};
    if (planData.planName !== undefined) data.planName = planData.planName;
    if (planData.planType !== undefined) data.planType = planData.planType;
    if (planData.products !== undefined) data.products = normalizeProducts(planData.products);
    if (planData.totalAmount !== undefined) data.totalAmount = planData.totalAmount;
    const record = await query.update({ where: { id: planId }, data });
    return { ok: true, record };
  }
```

将 `deletePlan` 替换为：

```ts
  async function deletePlan(planId: number, userId: string) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const plan = await query.findOne({ where: { id: planId, userId } });
    if (!plan) return { ok: false, code: 404, msg: '组合方案不存在' };
    const record = await query.update({
      where: { id: planId },
      data: { status: 'archived' },
    });
    return { ok: true, record };
  }
```

将 `calculatePlanPerformance` 签名改为 `async function calculatePlanPerformance(planId: number, userId: string, period: string = 'm1')`，并把内部 `const plan = await getPlanDetail(planId);` 改为 `const plan = await getPlanDetail(planId, userId);`。

将 `exportPlanSummary` 签名改为 `async function exportPlanSummary(planId: number, userId: string)`，并把内部 `const plan = await getPlanDetail(planId);` 改为 `const plan = await getPlanDetail(planId, userId);`。

- [ ] **Step 4: 运行测试确认通过**

```bash
npx jest --runInBand src/__tests__/portfolio-service.test.ts
```

Expected: PASS（9 个用例）。

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/portfolio-service.ts plugins/zhao-wealth/server/src/__tests__/portfolio-service.test.ts
git commit -m "fix(zhao-wealth): 组合方案 detail/update/delete 增加 userId 归属校验，createPlan 校验 products 非空与产品存在性"
```

---

### Task 2: 后端 consultation 留言预留电话格式校验（TDD）

**Files:**
- Test: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\consultation-service.test.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\services\consultation-service.ts`

- [ ] **Step 1: 在测试文件 message 渠道 describe 块末尾追加两个用例**

在 `consultation-service.test.ts` 中 `it('message 渠道：无留言内容返回错误', ...)` 用例之后追加：

```ts
  it('message 渠道：预留电话格式非法返回 400', async () => {
    const bad = await service.createBooking('u1', {
      submitType: 'message', message: '想了解净值型理财',
      contactType: 'phone', contactValue: '12345',
    });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('message 渠道：预留电话格式合法通过', async () => {
    mockCreate.mockResolvedValue({ id: 4 });
    const ok = await service.createBooking('u1', {
      submitType: 'message', message: '想了解净值型理财',
      contactType: 'phone', contactValue: '13800138000',
    });
    expect(ok.ok).toBe(true);
  });
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx jest --runInBand src/__tests__/consultation-service.test.ts -t "预留电话格式"
```

Expected: FAIL —— 格式非法的 `12345` 当前仍会通过（createBooking 只校验非空）。

- [ ] **Step 3: 修改 `consultation-service.ts` 的 message 分支**

在 `createBooking` 的 message 分支中，`if (!bookingData.contactType || !bookingData.contactValue)` 判断之后追加：

```ts
      if (bookingData.contactType === 'phone' && !PHONE_RE.test(String(bookingData.contactValue))) {
        return fail(400, '手机号格式不正确');
      }
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx jest --runInBand src/__tests__/consultation-service.test.ts
```

Expected: PASS（全部用例，含新增 2 个）。

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/consultation-service.ts plugins/zhao-wealth/server/src/__tests__/consultation-service.test.ts
git commit -m "fix(zhao-wealth): 留言预留电话校验 11 位手机号格式"
```

---

### Task 3: 后端控制器透传 userId + createPlan 失败分支处理

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\portfolio.ts`

- [ ] **Step 1: 修改控制器**

将 `detail` 方法替换为：

```ts
  async detail(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { id } = ctx.params;
      const record = await strapi.service('plugin::zhao-wealth.portfolio-service').getPlanDetail(Number(id), String(userId));
      if (!record) {
        ctx.body = errorResponse(404, '组合方案不存在');
        return;
      }
      ctx.body = successResponse(record);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 组合方案详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
```

将 `create` 方法的结果处理替换为（保留原有 userId 获取与 planName/products 400 校验，仅把 `const record = await ...createPlan(...)` 之后改为）：

```ts
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').createPlan(String(userId), {
        planName,
        planType,
        products,
        totalAmount,
      });
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '创建成功');
```

将 `update` 方法替换为：

```ts
  async update(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { id } = ctx.params;
      const data = ctx.request.body;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').updatePlan(Number(id), String(userId), data);
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 更新组合方案失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },
```

将 `remove` 方法替换为：

```ts
  async remove(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { id } = ctx.params;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').deletePlan(Number(id), String(userId));
      if (!result.ok) {
        ctx.body = errorResponse(result.code, result.msg);
        return;
      }
      ctx.body = successResponse(result.record, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除组合方案失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },
```

将 `performance` 方法的服务调用替换为：

```ts
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { id } = ctx.params;
      const { period } = ctx.query;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').calculatePlanPerformance(Number(id), String(userId), period || 'm1');
```

将 `export` 方法的服务调用替换为：

```ts
      const userId = ctx.state.user?.id || ctx.state.ssoUser?.id;
      if (!userId) {
        ctx.body = errorResponse(401, '未登录');
        return;
      }
      const { id } = ctx.params;
      const result = await strapi.service('plugin::zhao-wealth.portfolio-service').exportPlanSummary(Number(id), String(userId));
```

- [ ] **Step 2: 运行全部单测确认无回归**

```bash
npx jest --runInBand
```

Expected: PASS（全部测试文件）。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-wealth/server/src/controllers/portfolio.ts
git commit -m "fix(zhao-wealth): portfolio 控制器透传 userId，create/update/delete 处理服务层失败分支"
```

---

### Task 4: 后端重建 dist + 推送 + 部署 joho + 接口验证

- [ ] **Step 1: 重建 dist 并提交推送**

```bash
npm run build
```

Expected: dist 重建成功。然后确认 dist 包含新签名（`getPlanDetail` 带 userId）：

```bash
Select-String -Path "e:\code\basic\plugins\zhao-wealth\dist\server\services\portfolio-service.js" -Pattern "请至少选择一个产品|userId"
```

Expected: 有命中（否则 dist 未重建，禁止提交）。

```bash
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(zhao-wealth): 重建 dist（组合归属校验 + 咨询校验）"
git push
```

- [ ] **Step 2: 部署 joho（拉取 + 重启）**

```bash
ssh admin@39.97.54.5 "cd /www/apps/strapi && git pull && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH && export PM2_HOME=/home/admin/.pm2 && pm2 restart strapi"
```

Expected: git pull 无冲突、pm2 restart 成功。

- [ ] **Step 3: 接口验证（越权 + 校验）**

用 base64 传参（Windows ssh 剥引号），脚本要点：

1. admin 登录 zhao-auth 拿 jwt（`Admin@12345`）；
2. 用 admin 创建一个用户 A 的组合方案（productId 取真实产品，如 `GET /api/zhao-wealth/v1/wealth/products?page=1&pageSize=1` 取第一个 id）；
3. 用另一个登录态（或直接伪造 `userId` 不同）调 `GET/PUT/DELETE /api/zhao-wealth/v1/wealth/portfolio-plans/:id`，断言 body.code === 404；
4. `POST /api/zhao-wealth/v1/wealth/portfolio-plans` 传 `products: []`，断言 body.code === 400；
5. `POST /api/zhao-wealth/v1/wealth/consultations` 传 `submitType:'message', message:'测试', contactType:'phone', contactValue:'123'`，断言 body.code === 400。

Expected: 全部符合预期。验证完成后删除测试产生的组合方案记录。

---

### Task 5: C 端 detail 页「预约咨询」弹窗重构（两 Tab）

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue`

- [ ] **Step 1: 修改脚本区（常量 + ref + 函数）**

将 `CONSULT_CHANNELS` 与 `CONSULT_TABS` 常量替换为：

```ts
const CONSULT_TABS = [
  { label: '联系', value: 'contact' },
  { label: '留言', value: 'leave' },
]
```

将 `consultForm` ref 替换为：

```ts
const consultForm = ref({
  tab: 'contact' as 'contact' | 'leave',
  name: '',
  message: '',
  contactType: 'phone' as 'phone' | 'email' | 'wechat',
  contactValue: '',
})
```

将 import（`@/services/api` 那段）追加 `getPortfolioPlans, updatePortfolioPlan`，并新增一行：

```ts
import { redirectToLogin } from '../../utils/auth'
```

在 `consultConfig` ref 之后新增：

```ts
const hasContactInfo = computed(() =>
  !!consultConfig.value.nickname ||
  !!consultConfig.value.branchName ||
  (consultConfig.value.branchPhones && consultConfig.value.branchPhones.length > 0) ||
  !!consultConfig.value.enterpriseWechatQr ||
  !!consultConfig.value.personalWechatQr ||
  !!consultConfig.value.enterpriseWechatId ||
  !!consultConfig.value.personalWechatId
)
```

将 `onConsult` 替换为（去掉登录拦截，免登录查看联系信息）：

```ts
function onConsult() {
  consultForm.value = {
    tab: 'contact',
    name: '',
    message: '',
    contactType: 'phone',
    contactValue: '',
  }
  loadConsultConfig()
  showConsultPopup.value = true
}
```

将 `submitConsultation` 替换为：

```ts
async function submitConsultation() {
  const f = consultForm.value
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => redirectToLogin(), 800)
    return
  }
  if (!f.message.trim()) {
    uni.showToast({ title: '请输入留言内容', icon: 'none' })
    return
  }
  if (f.contactValue.trim() && f.contactType === 'phone' && !/^1\d{10}$/.test(f.contactValue.trim())) {
    uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    await createConsultation({
      submitType: 'message',
      name: f.name.trim() || undefined,
      message: f.message.trim(),
      contactType: f.contactValue.trim() ? f.contactType : undefined,
      contactValue: f.contactValue.trim() || undefined,
      productId: product.value?.id || product.value?.documentId,
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

- [ ] **Step 2: 修改模板（咨询弹窗）**

将 `<!-- 预约咨询弹窗 -->` 整个块（`<view v-if="showConsultPopup" ...>` 到对应 `</view>`，即原电话/微信/留言三模板 + actions）替换为：

```html
    <!-- 预约咨询弹窗 -->
    <view v-if="showConsultPopup" class="popup-mask" @click="showConsultPopup = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">预约咨询</view>
        <view class="popup-product-name">{{ product?.productName }}</view>
        <view class="popup-tabs">
          <view
            v-for="t in CONSULT_TABS"
            :key="t.value"
            class="popup-tab"
            :class="{ active: consultForm.tab === t.value }"
            @click="consultForm.tab = t.value"
          >{{ t.label }}</view>
        </view>

        <!-- 联系 Tab：服务人信息 + 拨打 + 微信 -->
        <template v-if="consultForm.tab === 'contact'">
          <view class="wechat-servicer" v-if="consultConfig.nickname || consultConfig.branchName">
            <view class="servicer-line">
              <text class="servicer-name" v-if="consultConfig.nickname">{{ consultConfig.nickname }}</text>
              <text class="servicer-branch" v-if="consultConfig.branchName">{{ consultConfig.branchName }}</text>
            </view>
          </view>
          <view class="servicer-call" v-if="consultConfig.branchPhones && consultConfig.branchPhones.length">
            <view class="servicer-call-info">
              <text class="servicer-call-label">网点电话</text>
              <text class="servicer-call-note">号码不展示，点击直接拨打</text>
            </view>
            <view class="servicer-call-btn" @click="callPhone(consultConfig.branchPhones[0])">拨打电话</view>
          </view>
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
          <view class="wechat-empty" v-if="!hasContactInfo">联系方式配置中，请使用留言咨询</view>
        </template>

        <!-- 留言 Tab -->
        <template v-else>
          <view class="popup-field">
            <text class="popup-label">称呼 <text class="popup-optional">选填</text></text>
            <input class="popup-input" v-model="consultForm.name" placeholder="请输入您的称呼" maxlength="20" />
          </view>
          <view class="popup-field">
            <text class="popup-label">留言内容 <text class="required">*</text></text>
            <textarea class="popup-textarea" v-model="consultForm.message" placeholder="请输入想咨询的内容" maxlength="500" />
          </view>
          <view class="popup-field">
            <text class="popup-label">预留联系方式 <text class="popup-optional">选填</text></text>
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
        <view class="popup-actions">
          <view class="popup-btn-cancel" @click="showConsultPopup = false">取消</view>
          <view class="popup-btn-submit" v-if="consultForm.tab === 'leave'" @click="submitConsultation">提交留言</view>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: 追加 CSS**

在 detail/index.vue 的 `<style>` 内（`wechat-servicer` 相关样式附近）追加：

```css
.servicer-call {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.servicer-call-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.servicer-call-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.servicer-call-note {
  font-size: 12px;
  color: #999;
}
.servicer-call-btn {
  background: #667eea;
  color: #fff;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
}
.popup-optional {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}
```

- [ ] **Step 4: 提交**

```bash
git add pages/detail/index.vue
git commit -m "feat(wealth): 预约咨询弹窗重构为联系/留言两 Tab，电话不显示号码直接拨打，免登录查看联系信息，预留联系方式选填"
```

---

### Task 6: C 端 detail 页「加入组合方案」弹窗重构（加入已有 + 新建 + 预设名称）

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue`

- [ ] **Step 1: 修改脚本区**

将 `portfolioForm` ref 替换为：

```ts
const portfolioForm = ref({
  mode: 'new' as 'existing' | 'new',
  planId: null as number | null,
  planName: '',
  totalAmount: '',
})
const myPlans = ref<any[]>([])
const PRESET_PLAN_NAMES = ['稳健增值', '进取配置', '教育金储备']
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
function planSeqName(n: number): string {
  return n <= 10 ? '方案' + CN_NUM[n - 1] : '方案' + n
}
```

将 `onAddToPortfolio` 替换为：

```ts
async function onAddToPortfolio() {
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const res = await getPortfolioPlans({ page: 1, pageSize: 100 })
    myPlans.value = res?.records || []
  } catch {
    myPlans.value = []
  }
  portfolioForm.value = {
    mode: 'new',
    planId: null,
    planName: planSeqName(myPlans.value.length + 1),
    totalAmount: '',
  }
  showPortfolioPopup.value = true
}
```

在 `submitCreatePortfolio` 之前新增辅助函数：

```ts
function planProductList(p: any): any[] {
  return typeof p.products === 'string' ? JSON.parse(p.products) : (p.products || [])
}
function planProductCount(p: any): number {
  return planProductList(p).length
}
function formatPlanAmount(amount: any): string {
  if (!amount) return ''
  const n = Number(amount)
  if (isNaN(n)) return ''
  return n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toFixed(0) + '元'
}
function selectPlan(p: any) {
  portfolioForm.value.mode = 'existing'
  portfolioForm.value.planId = p.id
}
function onPlanNameInput() {
  portfolioForm.value.mode = 'new'
  portfolioForm.value.planId = null
}
```

将 `submitCreatePortfolio` 整体替换为：

```ts
async function submitCreatePortfolio() {
  const pid = product.value?.id || product.value?.documentId
  if (!pid) {
    uni.showToast({ title: '产品信息缺失', icon: 'none' })
    return
  }
  const newProduct = {
    productId: product.value?.id,
    productName: product.value?.productName,
    allocationRatio: 1,
    addedDate: new Date().toISOString().split('T')[0],
  }
  uni.showLoading({ title: '保存中...' })
  try {
    // 加入已有组合
    if (portfolioForm.value.mode === 'existing' && portfolioForm.value.planId) {
      const plan = myPlans.value.find((p) => p.id === portfolioForm.value.planId)
      const cur = plan ? planProductList(plan) : []
      if (cur.some((p) => Number(p.productId) === Number(newProduct.productId))) {
        uni.hideLoading()
        uni.showToast({ title: '该产品已在组合中', icon: 'none' })
        return
      }
      await updatePortfolioPlan(portfolioForm.value.planId, {
        products: [...cur, newProduct],
        totalAmount: plan?.totalAmount ?? null,
      })
      uni.hideLoading()
      showPortfolioPopup.value = false
      uni.showToast({ title: '加入成功', icon: 'success' })
      const targetId = portfolioForm.value.planId
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/portfolio/detail?id=${targetId}` })
      }, 1000)
      return
    }
    // 新建方案
    if (!portfolioForm.value.planName.trim()) {
      uni.hideLoading()
      uni.showToast({ title: '请输入方案名称', icon: 'none' })
      return
    }
    const res = await createPortfolioPlan({
      planName: portfolioForm.value.planName.trim(),
      planType: 'custom',
      products: [newProduct],
      totalAmount: portfolioForm.value.totalAmount ? Number(portfolioForm.value.totalAmount) : null,
    })
    uni.hideLoading()
    showPortfolioPopup.value = false
    uni.showToast({ title: '创建成功', icon: 'success' })
    const newId = res?.id || res?.documentId
    if (newId) {
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/portfolio/detail?id=${newId}` })
      }, 1000)
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}
```

- [ ] **Step 2: 修改模板（组合弹窗）**

将 `<!-- 创建组合方案弹窗 -->` 整个块替换为：

```html
    <!-- 加入组合方案弹窗 -->
    <view v-if="showPortfolioPopup" class="popup-mask" @click="showPortfolioPopup = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">加入组合方案</view>
        <view class="popup-product-name">{{ product?.productName }}</view>

        <template v-if="myPlans.length > 0">
          <view class="popup-field">
            <text class="popup-label">加入已有组合</text>
            <view
              v-for="p in myPlans"
              :key="p.id"
              class="plan-option"
              :class="{ active: portfolioForm.mode === 'existing' && portfolioForm.planId === p.id }"
              @click="selectPlan(p)"
            >
              <view class="plan-option-radio"></view>
              <view class="plan-option-info">
                <text class="plan-option-name">{{ p.planName }}</text>
                <text class="plan-option-meta">{{ planProductCount(p) }} 只产品{{ p.totalAmount ? ' · ' + formatPlanAmount(p.totalAmount) : '' }}</text>
              </view>
            </view>
          </view>
          <view class="popup-divider"></view>
        </template>

        <view class="popup-field">
          <text class="popup-label">新建方案</text>
          <view class="preset-names">
            <view
              v-for="n in PRESET_PLAN_NAMES"
              :key="n"
              class="preset-name"
              :class="{ active: portfolioForm.planName === n }"
              @click="portfolioForm.planName = n; onPlanNameInput()"
            >{{ n }}</view>
          </view>
          <input class="popup-input" v-model="portfolioForm.planName" placeholder="请输入方案名称" maxlength="30" @input="onPlanNameInput" />
        </view>
        <view class="popup-field">
          <text class="popup-label">假设金额（可选）</text>
          <input class="popup-input" v-model="portfolioForm.totalAmount" placeholder="请输入假设金额（元）" type="digit" />
        </view>
        <view class="popup-actions">
          <view class="popup-btn-cancel" @click="showPortfolioPopup = false">取消</view>
          <view class="popup-btn-submit" @click="submitCreatePortfolio">{{ portfolioForm.mode === 'existing' && portfolioForm.planId ? '加入该组合' : '创建' }}</view>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: 追加 CSS**

```css
.plan-option {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
.plan-option.active {
  border-color: #667eea;
  background: #f5f7ff;
}
.plan-option-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #ccc;
  flex-shrink: 0;
}
.plan-option.active .plan-option-radio {
  border-color: #667eea;
  background: #667eea;
  box-shadow: inset 0 0 0 3px #fff;
}
.plan-option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.plan-option-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.plan-option-meta {
  font-size: 12px;
  color: #999;
}
.preset-names {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.preset-name {
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  color: #666;
}
.preset-name.active {
  border-color: #667eea;
  color: #667eea;
  background: #f5f7ff;
}
.popup-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0 12px;
}
```

- [ ] **Step 4: 提交**

```bash
git add pages/detail/index.vue
git commit -m "feat(wealth): 加入组合方案弹窗支持加入已有组合，新建方案默认方案N+常用名称预设，防重复加入"
```

---

### Task 7: C 端「我的组合方案」改名

**Files:**
- Modify: `e:\code\strapi-wealth\components\portfolio-card.vue`
- Modify: `e:\code\strapi-wealth\pages\portfolio\list.vue`

- [ ] **Step 1: portfolio-card.vue 增加「改名」按钮**

将 `<view class="card-header">` 块替换为：

```html
    <view class="card-header">
      <text class="plan-name">{{ plan.planName }}</text>
      <view class="card-header-right">
        <view class="plan-type-tag" :class="plan.planType">
          {{ planTypeLabel }}
        </view>
        <view class="card-rename" @click.stop="$emit('rename', plan)">改名</view>
      </view>
    </view>
```

将 `defineEmits(['click'])` 替换为 `defineEmits(['click', 'rename'])`，并在 `<style>` 追加：

```css
.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-rename {
  font-size: 12px;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 999px;
  padding: 2px 10px;
}
```

- [ ] **Step 2: list.vue 增加改名弹窗**

在模板 `</view>`（`portfolio-list` 根节点闭合前）追加：

```html
    <!-- 改名弹窗 -->
    <view v-if="showRename" class="rename-mask" @click="showRename = false">
      <view class="rename-card" @click.stop="">
        <view class="rename-title">修改方案名称</view>
        <input class="rename-input" v-model="renameName" maxlength="30" placeholder="请输入方案名称" />
        <view class="rename-actions">
          <view class="rename-btn cancel" @click="showRename = false">取消</view>
          <view class="rename-btn ok" @click="confirmRename">保存</view>
        </view>
      </view>
    </view>
```

将 `PortfolioCard` 使用处替换为：

```html
      <PortfolioCard
        v-for="plan in plans"
        :key="plan.id"
        :plan="plan"
        @click="goDetail"
        @rename="openRename"
      />
```

脚本区：将 import 替换为：

```ts
import { getPortfolioPlans, updatePortfolioPlan } from '@/services/api'
import { showError } from '@/utils/request'
```

在 `goCreate` 之前追加：

```ts
const showRename = ref(false)
const renamePlan = ref<any>(null)
const renameName = ref('')

function openRename(plan: any) {
  renamePlan.value = plan
  renameName.value = plan.planName
  showRename.value = true
}

async function confirmRename() {
  const name = renameName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入方案名称', icon: 'none' })
    return
  }
  if (!renamePlan.value) return
  uni.showLoading({ title: '保存中...' })
  try {
    await updatePortfolioPlan(renamePlan.value.id, { planName: name })
    uni.hideLoading()
    showRename.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
    await loadPlans()
  } catch (error: any) {
    uni.hideLoading()
    showError(error.message || '保存失败')
  }
}
```

`<style>` 追加：

```css
.rename-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.rename-card {
  width: 80%;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}
.rename-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
  text-align: center;
}
.rename-input {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
.rename-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.rename-btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 999px;
  font-size: 14px;
}
.rename-btn.cancel {
  border: 1px solid #e5e5e5;
  color: #666;
}
.rename-btn.ok {
  background: #667eea;
  color: #fff;
}
```

- [ ] **Step 3: 提交**

```bash
git add components/portfolio-card.vue pages/portfolio/list.vue
git commit -m "feat(wealth): 我的组合方案支持修改方案名称"
```

---

### Task 8: C 端构建部署 + 验证

- [ ] **Step 1: 推送 wealth-line 并部署**

```bash
git push
powershell -ExecutionPolicy Bypass -File e:\code\strapi-wealth\deploy-wealth.ps1
```

Expected: push 成功（`origin/wealth-line`）、deploy-wealth.ps1 输出 SYNC_OK 类成功标志。

- [ ] **Step 2: 线上验证**

用 curl 验证 C 端页面可访问：

```bash
curl -s -o NUL -w "%{http_code}" https://v.joho.cn/wealth/
```

Expected: 200。

- [ ] **Step 3: 功能走查清单（人工/浏览器）**

1. 未登录打开 `https://v.joho.cn/wealth/#/pages/detail/index?id=2` → 点「预约咨询」→ 默认「联系」Tab，显示服务人卡片、拨打按钮（无号码）、微信二维码；点「拨打电话」触发拨号。
2. 切「留言」→ 提交空内容被拦；预留电话填 `123` 被拦（格式）；未登录点提交留言 → 跳 SSO 登录。
3. 登录后打开「加入组合方案」→ 显示我的组合列表（若有）+ 新建方案默认「方案N」；点预设名称「稳健增值」填充；选中已有组合 → 提交「加入该组合」；重复加入同一产品 → toast「该产品已在组合中」。
4. 我的组合列表页 → 卡片「改名」→ 修改名称保存 → 列表刷新。
5. 越权验证（后端已完成）：另一账号无法查看/修改/删除他人组合。

---

## Self-Review

**Spec 覆盖：**
- A 咨询弹窗两 Tab（联系/留言）→ Task 5；电话不显示号码直接拨打 → Task 5；免登录查看 → Task 5；留言预留选填 + 电话格式校验 → Task 5 + Task 2；文案「网名」→「称呼」→ Task 5（label 改为「称呼」）。
- B 组合弹窗加入已有 + 新建默认「方案N」+ 3 常用名称预设 + 防重复 → Task 6；我的组合可改名 → Task 7。
- C 越权修复 → Task 1/3；products 空数组 400 → Task 1；留言电话格式 → Task 2。
- 测试 → Task 1/2 单测 + Task 4 接口验证；部署 → Task 4（后端）/Task 8（C 端）。

**Placeholder 扫描：** 无 TBD/TODO；每个代码步骤含完整代码。

**类型一致性：** `getPlanDetail(planId, userId)` / `updatePlan(planId, userId, data)` / `deletePlan(planId, userId)` / `calculatePlanPerformance(planId, userId, period)` / `exportPlanSummary(planId, userId)` 签名在 Task 1/3/4 一致；`createPlan` 返回 `{ok, record}` 或 `{ok:false, code, msg}` 与 Task 3 控制器判断一致；前端 `consultForm.tab`、`portfolioForm.mode/planId` 在 Task 5/6 模板与脚本一致。
