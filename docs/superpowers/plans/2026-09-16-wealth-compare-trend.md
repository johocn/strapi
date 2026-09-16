# 财富筛选与趋势对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 C 端财富大厅筛选缺陷（货币理财类型、7日年化排序、对比选品搜索），新增多产品累计收益趋势同图对比。

**Architecture:** 后端 `compare-service` 新增 `compareTrend` 方法（普通产品净值归一化、货币理财万份收益累计，统一"累计收益率%"并按日期对齐前值填充），新增 content-api 路由与控制器；`product` 服务扩展 `annual7d` 内存排序。前端 hall 页补类型/排序选项，compare 页新增选品搜索与多曲线 SVG 趋势卡片。

**Tech Stack:** Strapi v5 插件（TypeScript, jest/ts-jest）、uni-app（Vue3, Composition API）

**Spec:** `docs/superpowers/specs/2026-09-16-wealth-compare-trend-design.md`

---

## File Structure

**后端（basic 仓库 `plugins/zhao-wealth`）：**
- `server/src/services/compare-service.ts` — 新增 `compareTrend(productIds, period)`：口径计算 + 日期对齐
- `server/src/controllers/compare.ts` — 新增 `trend` handler
- `server/src/routes/content-api.ts` — 新增 `GET /v1/wealth/compare/trend` 路由
- `server/src/services/product.ts` — `enrichProducts` 加 `latestAnnual7d`；`sortProducts` 加 `annual7d` 分支
- `server/src/__tests__/compare-trend.test.ts` — 新建趋势口径测试
- `server/src/__tests__/product-sort.test.ts` — 新建 annual7d 排序测试

**前端（strapi-wealth 仓库）：**
- `services/api.ts` — 新增 `compareTrend()`
- `pages/hall/index.vue` — TYPES/typeLabels 加 money-wealth；SORT_OPTIONS 加 annual7d
- `pages/compare/index.vue` — 选品搜索 + 趋势对比卡片（多线 SVG）

---

### Task 1: 后端——compareTrend 服务（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/compare-service.ts`
- Test: `plugins/zhao-wealth/server/src/__tests__/compare-trend.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `plugins/zhao-wealth/server/src/__tests__/compare-trend.test.ts`：

```typescript
'use strict';

describe('compare-service.compareTrend', () => {
  let service: any;
  let mockFindOne: jest.Mock;
  let mockFindMany: jest.Mock;

  beforeEach(() => {
    mockFindOne = jest.fn();
    mockFindMany = jest.fn();
    const mockQuery = jest.fn().mockReturnValue({ findOne: mockFindOne, findMany: mockFindMany });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品查询：按 id 返回产品（普通产品默认，money-wealth 产品返回 money 类型）
    mockFindOne.mockImplementation((opts: any) => {
      if (opts.where && opts.where.id === 3) {
        return Promise.resolve({ id: 3, productName: '货币理财A', productType: 'money-wealth' });
      }
      if (opts.where && opts.where.id === 1) {
        return Promise.resolve({ id: 1, productName: '产品A', productType: 'bank-wealth' });
      }
      if (opts.where && opts.where.id === 2) {
        return Promise.resolve({ id: 2, productName: '产品B', productType: 'bank-wealth' });
      }
      return Promise.resolve(null);
    });

    // 净值/收益序列查询：按 product id 区分
    mockFindMany.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) {
        return Promise.resolve([
          { navDate: '2026-08-01', unitNav: 1.00 },
          { navDate: '2026-08-02', unitNav: 1.01 },
          { navDate: '2026-08-03', unitNav: 1.02 },
        ]);
      }
      if (pid === 2) {
        return Promise.resolve([
          { navDate: '2026-08-02', unitNav: 2.00 },
          { navDate: '2026-08-03', unitNav: 2.04 },
        ]);
      }
      if (pid === 3) {
        return Promise.resolve([
          { incomeDate: '2026-08-01', tenThousandIncome: 0.5 },
          { incomeDate: '2026-08-02', tenThousandIncome: 0.6 },
        ]);
      }
      return Promise.resolve([]);
    });

    const factory = require('../services/compare-service').default;
    service = factory({ strapi: mockStrapi });
  });

  it('普通产品按区间首条净值归一化为累计收益率%', async () => {
    const result = await service.compareTrend([1], 'm1');
    expect(result.series).toHaveLength(1);
    expect(result.series[0].productId).toBe(1);
    // (1.01/1.00-1)*100=1, (1.02/1.00-1)*100=2
    expect(result.series[0].values).toEqual([0, 1, 2]);
  });

  it('货币理财按万份收益累计为累计收益率%', async () => {
    const result = await service.compareTrend([3], 'm1');
    expect(result.series[0].productType).toBe('money-wealth');
    // 0.5/10000*100=0.005, (0.5+0.6)/10000*100=0.011
    expect(result.series[0].values).toEqual([0.005, 0.011]);
  });

  it('多产品按日期并集对齐，缺失前值填充、首点前补 0', async () => {
    const result = await service.compareTrend([1, 2], 'm1');
    expect(result.dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    // 产品B 首条净值 08-02 为基准：08-01 补 0，08-02 为 0，08-03 (2.04/2-1)*100=2
    expect(result.series[1].values).toEqual([0, 0, 2]);
  });

  it('产品数不足 2 个时应抛错', async () => {
    await expect(service.compareTrend([1], 'm1')).rejects.toThrow('对比产品数量必须为 2-4 个');
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd plugins/zhao-wealth && npx jest compare-trend --no-coverage
```
Expected: FAIL — `compareTrend is not a function`

- [ ] **Step 3: 实现 compareTrend**

在 `plugins/zhao-wealth/server/src/services/compare-service.ts` 中，于 `PERIOD_TO_ANNUAL_FIELD` 后追加周期天数映射，并在 service 对象中 `compareProducts` 方法后新增 `compareTrend`：

```typescript
const PERIOD_TO_DAYS: Record<string, number> = { m1: 30, m3: 90, m6: 180, y1: 365 };
```

```typescript
  /**
   * 多产品累计收益趋势对比
   * 普通产品：区间首条净值归一化 (nav/base-1)*100
   * 货币理财：万份收益累计 (Σ tenThousandIncome/10000)*100
   * 统一日期轴对齐，缺失前值填充、首点前补 0
   */
  async compareTrend(productIds: number[], period: string) {
    if (productIds.length < 2 || productIds.length > 4) {
      throw new Error('对比产品数量必须为 2-4 个');
    }

    const days = PERIOD_TO_DAYS[period] || 30;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const series = await Promise.all(productIds.map(async (productId: number) => {
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { id: productId, status: true },
      });
      if (!product) {
        throw new Error(`产品 ${productId} 不存在或已下架`);
      }

      let points: { date: string; value: number }[] = [];
      if (product.productType === 'money-wealth') {
        const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
          where: { product: productId, incomeDate: { $gte: startStr, $lte: endStr } },
          orderBy: { incomeDate: 'asc' },
          limit: 2000,
        });
        let cum = 0;
        points = incomes.map((r: any) => {
          cum += Number(r.tenThousandIncome || 0) / 10000;
          return { date: r.incomeDate, value: cum * 100 };
        });
      } else {
        const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
          where: { product: productId, navDate: { $gte: startStr, $lte: endStr } },
          orderBy: { navDate: 'asc' },
          limit: 2000,
        });
        if (navs.length > 0) {
          const base = Number(navs[0].unitNav) || 1;
          points = navs.map((r: any) => ({
            date: r.navDate,
            value: ((Number(r.unitNav) || base) / base - 1) * 100,
          }));
        }
      }

      return {
        productId: product.id,
        productName: product.productName,
        productType: product.productType,
        points,
      };
    }));

    // 日期并集（升序去重）
    const dateSet = new Set<string>();
    for (const s of series) {
      for (const p of s.points) dateSet.add(p.date);
    }
    const dates = [...dateSet].sort();

    // 按日期轴对齐：缺失前值填充，首点前补 0
    const aligned = series.map((s) => {
      const values: number[] = [];
      let last: number | null = null;
      let idx = 0;
      for (const d of dates) {
        while (idx < s.points.length && s.points[idx].date < d) {
          last = s.points[idx].value;
          idx++;
        }
        if (idx < s.points.length && s.points[idx].date === d) {
          last = s.points[idx].value;
          idx++;
        }
        values.push(last === null ? 0 : last);
      }
      return {
        productId: s.productId,
        productName: s.productName,
        productType: s.productType,
        values,
      };
    });

    return { period, startDate: startStr, endDate: endStr, dates, series: aligned };
  },
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd plugins/zhao-wealth && npx jest compare-trend --no-coverage
```
Expected: 4 passed

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/compare-service.ts plugins/zhao-wealth/server/src/__tests__/compare-trend.test.ts
git commit -m "feat(zhao-wealth): compareTrend 多产品累计收益趋势服务（TDD）"
```

---

### Task 2: 后端——compare-trend 控制器与路由

**Files:**
- Modify: `plugins/zhao-wealth/server/src/controllers/compare.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/content-api.ts`

- [ ] **Step 1: 控制器新增 trend handler**

在 `plugins/zhao-wealth/server/src/controllers/compare.ts` 的 `compare` 方法后新增：

```typescript
  /**
   * C 端：多产品累计收益趋势
   * GET /v1/wealth/compare/trend?productIds=1,2,3&period=m1
   */
  async trend(ctx) {
    try {
      const { productIds, period = 'm1' } = ctx.query;

      if (!productIds) {
        ctx.body = errorResponse(400, 'productIds 参数必填');
        return;
      }

      const ids = String(productIds)
        .split(',')
        .map((s: string) => Number(s.trim()))
        .filter((n: number) => !isNaN(n) && n > 0);

      const validPeriods = ['m1', 'm3', 'm6', 'y1'];
      if (!validPeriods.includes(period as string)) {
        ctx.body = errorResponse(400, '无效的 period，可选 m1/m3/m6/y1');
        return;
      }

      const result = await strapi.service('plugin::zhao-wealth.compare-service').compareTrend(ids, period as string);

      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 趋势对比失败: ${error.message}`);
      ctx.body = errorResponse(500, error.message || '趋势对比失败');
    }
  },
```

- [ ] **Step 2: 注册路由**

在 `plugins/zhao-wealth/server/src/routes/content-api.ts` 中 `compare.compare` 路由（`path: '/v1/wealth/compare'`）之后新增：

```typescript
    {
      method: 'GET',
      path: '/v1/wealth/compare/trend',
      handler: 'compare.trend',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
```

注意：`/v1/wealth/compare/trend` 必须在 `/v1/wealth/compare` 之后注册，且两路径互不冲突（Strapi 按精确匹配）。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-wealth/server/src/controllers/compare.ts plugins/zhao-wealth/server/src/routes/content-api.ts
git commit -m "feat(zhao-wealth): compare/trend 控制器与路由"
```

---

### Task 3: 后端——product sortBy annual7d（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/product.ts`
- Test: `plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts`：

```typescript
'use strict';

describe('product.findList sortBy=annual7d', () => {
  let service: any;

  beforeEach(() => {
    const mockFindMany = jest.fn();
    const mockFindOne = jest.fn();
    const mockCount = jest.fn();
    const mockQuery = jest.fn().mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findMany: mockFindMany, count: mockCount };
      }
      return { findOne: mockFindOne, findMany: mockFindMany };
    });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品列表：3 个产品
    mockFindMany.mockImplementation((opts: any) => {
      if (opts.limit !== undefined && !opts.orderBy) {
        return Promise.resolve([
          { id: 1, productName: 'A' },
          { id: 2, productName: 'B' },
          { id: 3, productName: 'C' },
        ]);
      }
      return Promise.resolve([]);
    });
    mockCount.mockResolvedValue(3);

    // 聚合数据：产品1 annual7d=0.03，产品2 annual7d=0.05，产品3 无快照
    mockFindOne.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) return Promise.resolve({ annual7d: 0.03, annual1m: 0.04, snapshotDate: '2026-09-10' });
      if (pid === 2) return Promise.resolve({ annual7d: 0.05, annual1m: 0.06, snapshotDate: '2026-09-10' });
      return Promise.resolve(null);
    });

    const factory = require('../services/product').default;
    service = factory({ strapi: mockStrapi });
  });

  it('按最新年化快照 annual7d 降序排序，无数据排末尾', async () => {
    const result = await service.findList({ status: true }, 1, 10, { sortBy: 'annual7d' });
    const ids = result.list.map((p: any) => p.id);
    expect(ids).toEqual([2, 1, 3]);
    expect(result.list[0].latestAnnual7d).toBe(0.05);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd plugins/zhao-wealth && npx jest product-sort --no-coverage
```
Expected: FAIL — `latestAnnual7d` 为 undefined，排序结果 [1,2,3] 而非 [2,1,3]

- [ ] **Step 3: 实现**

在 `plugins/zhao-wealth/server/src/services/product.ts`：

a) `enrichProducts` 的 `result[pid]` 对象中，`latestAnnual1m` 之后追加：

```typescript
        latestAnnual7d: snapshot?.annual7d != null ? Number(snapshot.annual7d) : null,
```

b) `findList` 的 list 组装（第 43-51 行 map）中，`latestAnnual1m` 之后追加：

```typescript
      latestAnnual7d: enrichedMap[product.id]?.latestAnnual7d ?? null,
```

c) `sortProducts` 的 switch 中，`case 'annual1m'` 后新增：

```typescript
    case 'annual7d':
      // 近7日年化降序，无数据排末尾
      sorted.sort((a, b) => {
        const ra = a.latestAnnual7d ?? -Infinity;
        const rb = b.latestAnnual7d ?? -Infinity;
        return rb - ra;
      });
      break;
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd plugins/zhao-wealth && npx jest product-sort --no-coverage
```
Expected: 1 passed

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/product.ts plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts
git commit -m "feat(zhao-wealth): 产品列表支持按近7日年化排序"
```

---

### Task 4: 后端全量测试 + 构建 dist + 提交推送

**Files:**
- Modify: `plugins/zhao-wealth/dist`（构建产物）

- [ ] **Step 1: 全量测试**

```bash
cd plugins/zhao-wealth && npm test -- --no-coverage
```
Expected: 全部通过（既有套件 + 新增 compare-trend/product-sort）。若存在与本任务无关的既有失败套件（如引用不存在 holding 模块的旧套件），记录但不处理。

- [ ] **Step 2: 重建 dist**

```bash
cd plugins/zhao-wealth && npm run build
```
Expected: `✓ built in ~7s` + `Build complete!`

- [ ] **Step 3: dist 自检**

```bash
rg -l "compareTrend" plugins/zhao-wealth/dist/server && rg -l "annual7d" plugins/zhao-wealth/dist/server
```
Expected: 两个关键字均在 dist 命中（`plugins/zhao-wealth/dist/server/index.mjs`）

- [ ] **Step 4: 提交推送**

```bash
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(zhao-wealth): 重建 dist（compare-trend + annual7d 排序）"
git push origin main
```

---

### Task 5: 部署 joho + 接口验证

**Files:** 无（远程操作）

- [ ] **Step 1: 部署脚本（base64 传输执行）**

本地 PowerShell 构造脚本并执行：

```powershell
$script = @'
#!/bin/bash
set -e
cd /www/apps/strapi
git pull origin main >/dev/null 2>&1
if grep -rq "compareTrend" plugins/zhao-wealth/dist/server && grep -rq "annual7d" plugins/zhao-wealth/dist/server; then
  echo "DIST_CHECK_OK"
else
  echo "DIST_CHECK_FAIL" >&2
  exit 1
fi
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
sleep 8
echo "DONE"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: `DIST_CHECK_OK` + `PM2_RESTART_OK` + `DONE`

- [ ] **Step 2: 接口验证（未登录应为 401 而非 404）**

```powershell
$cmd = 'curl -s -o /dev/null -w "%{http_code}" "http://localhost:1337/api/zhao-wealth/v1/wealth/compare/trend?productIds=1,2&period=m1"'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: `401`（sso-authenticated 策略生效，路由已注册）

- [ ] **Step 3: 数据口径抽查（直接查库确认序列长度）**

```powershell
$cmd = 'export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH; ls /usr/lib/postgresql/*/bin/psql 2>/dev/null || which psql || find / -name psql -type f 2>/dev/null | head -1'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
若找到 psql 路径，用其确认产品 5（宁银理财）近 90 天净值条数 > 0；若 psql 不可用则跳过（由 Step 2 的 401 验证 + 单测覆盖保证）。

---

### Task 6: C 端——hall 筛选修复 + 7日年化排序

**Files:**
- Modify: `strapi-wealth/pages/hall/index.vue`

- [ ] **Step 1: 类型筛选补货币理财**

`pages/hall/index.vue` 第 109-110 行改为：

```typescript
const TYPES = ['', 'bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund', 'money-wealth']
const typeLabels = ['全部类型', '银行理财', '股票基金', '债券基金', '混合基金', '货币基金', '货币理财']
```

- [ ] **Step 2: 排序加 7 日年化**

`pages/hall/index.vue` 第 113-118 行改为：

```typescript
const SORT_OPTIONS = [
  { key: 'score', label: '综合评分' },
  { key: 'annual7d', label: '近7日年化' },
  { key: 'annual1m', label: '近1月年化' },
  { key: 'volatility', label: '波动率' },
]
```

- [ ] **Step 3: 提交**

```bash
cd strapi-wealth && git add pages/hall/index.vue
git commit -m "fix(wealth): hall 筛选补货币理财 + 排序加近7日年化"
```

---

### Task 7: C 端——compare 选品搜索 + 趋势对比卡片

**Files:**
- Modify: `strapi-wealth/services/api.ts`
- Modify: `strapi-wealth/pages/compare/index.vue`

- [ ] **Step 1: api.ts 新增 compareTrend**

`services/api.ts` 中 `compareProducts` 之后追加：

```typescript
// 多产品累计收益趋势对比
export function compareTrend(productIds: (string | number)[], period: string = 'm1') {
  return get(`${V1}/compare/trend`, { productIds: productIds.join(','), period }).then(extractItem)
}
```

- [ ] **Step 2: compare 页选品弹窗加搜索**

`pages/compare/index.vue` script 部分：

a) 新增状态（`pickerList` 定义附近）：

```typescript
const pickerKeyword = ref('')
const searchTimer = ref<any>(null)
```

b) 新增搜索函数（`loadPicker` 之后）：

```typescript
function onPickerSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => {
    pickerOpen.value && loadPicker()
  }, 300)
}
```

c) `loadPicker` 改造为带关键字：

```typescript
async function loadPicker() {
  try {
    const params: any = { page: 1, pageSize: 100 }
    if (pickerKeyword.value) params.productName = pickerKeyword.value
    const res = await getProductList(params)
    pickerList.value = res.list || []
  } catch (e) {
    pickerList.value = []
  }
}
```

d) 选品弹窗模板（`modal-title` 行之后）加搜索框：

```html
        <view class="picker-search">
          <input class="picker-search-input" v-model="pickerKeyword" placeholder="搜索产品名称" confirm-type="search" @confirm="onPickerSearch" @input="onPickerSearch" />
        </view>
```

e) 样式（`<style scoped>` 内追加）：

```css
.picker-search { padding: 16rpx 20rpx; border-bottom: 1rpx solid #f0f0f0; }
.picker-search-input { background: #f5f5f5; border-radius: 8rpx; height: 60rpx; padding: 0 20rpx; font-size: 26rpx; }
```

- [ ] **Step 3: compare 页趋势对比卡片（模板）**

a) 引入 API：`import { getProductList, compareProducts, compareTrend } from '../../services/api'`

b) 对比结果卡片之后、`footer-disclaimer` 之前加趋势卡片：

```html
    <!-- 趋势对比（累计收益%） -->
    <view v-if="trendData && trendData.dates && trendData.dates.length >= 2" class="card">
      <view class="section-title">趋势对比（累计收益%）</view>
      <view class="trend-legend">
        <view v-for="(s, i) in trendData.series" :key="s.productId" class="trend-legend-item">
          <text class="trend-legend-line" :style="{ background: TREND_COLORS[i % TREND_COLORS.length] }"></text>
          <text class="trend-legend-name">{{ s.productName }}</text>
          <text v-if="s.productType === 'money-wealth'" class="trend-legend-tag">货币理财</text>
        </view>
      </view>
      <view class="trend-chart">
        <view class="line-chart-body">
          <view class="line-chart-yaxis">
            <text class="y-label">{{ formatPercent(trendAdjustedMax, 2) }}</text>
            <text class="y-label">{{ formatPercent(trendAdjustedMin, 2) }}</text>
          </view>
          <view class="line-chart-svg" v-html="trendChartSvg"></view>
        </view>
        <view class="line-chart-xaxis">
          <text class="x-label">{{ trendData.dates[0] }}</text>
          <text class="x-label">{{ trendData.dates[trendData.dates.length - 1] }}</text>
        </view>
      </view>
      <view class="chart-note">累计收益：普通产品按净值涨跌、货币理财按万份收益累计。历史业绩不预示未来收益</view>
    </view>
    <view v-else-if="trendLoaded && compared.length" class="card">
      <view class="section-title">趋势对比</view>
      <view class="empty-inline">数据积累中，暂不展示趋势</view>
    </view>
```

- [ ] **Step 4: compare 页趋势对比卡片（script）**

a) 新增状态（`compared` 定义附近）：

```typescript
const trendData = ref<any>(null)
const trendLoaded = ref(false)
const TREND_COLORS = ['#667eea', '#f5222d', '#07c160', '#fa8c16']
```

b) `doCompare` 改造为并行请求：

```typescript
async function doCompare() {
  if (selected.value.length < 2) return
  loading.value = true
  trendLoaded.value = false
  trendData.value = null
  try {
    const ids = selected.value.map((p: any) => p.id || p.documentId)
    const [cmp, trend] = await Promise.all([
      compareProducts(ids, period.value),
      compareTrend(ids, period.value),
    ])
    compared.value = cmp || []
    trendData.value = trend
  } catch (e: any) {
    uni.showToast({ title: e.message || '对比失败', icon: 'none' })
    compared.value = []
    trendData.value = null
  } finally {
    loading.value = false
    trendLoaded.value = true
  }
}
```

c) 趋势图 computed（`rows` computed 附近追加）：

```typescript
// 趋势图 Y 轴范围
const trendAdjustedMin = computed(() => {
  const data = trendData.value
  if (!data || !data.series?.length) return 0
  const all = data.series.flatMap((s: any) => s.values)
  if (!all.length) return 0
  const min = Math.min(...all)
  const range = Math.max(...all) - min || 0.0001
  return min - range * 0.15
})
const trendAdjustedMax = computed(() => {
  const data = trendData.value
  if (!data || !data.series?.length) return 0
  const all = data.series.flatMap((s: any) => s.values)
  if (!all.length) return 0
  const max = Math.max(...all)
  const range = max - Math.min(...all) || 0.0001
  return max + range * 0.15
})

// 多产品趋势折线 SVG（X 轴按日期索引等距，Y 轴统一区间）
const trendChartSvg = computed(() => {
  const data = trendData.value
  if (!data || !data.dates || data.dates.length < 2 || !data.series?.length) return ''
  const w = 300, h = 160
  const all = data.series.flatMap((s: any) => s.values)
  const max = Math.max(...all)
  const min = Math.min(...all)
  const range = max - min || 0.0001
  const padding = range * 0.15
  const adjustedMin = min - padding
  const adjustedRange = max - adjustedMin || 0.0001
  const n = data.dates.length

  const lines = data.series.map((s: any, idx: number) => {
    const color = TREND_COLORS[idx % TREND_COLORS.length]
    const pts = s.values.map((v: number, i: number) => ({
      x: n > 1 ? (i / (n - 1)) * 100 : 50,
      y: ((max - v) / adjustedRange) * 100,
    }))
    const polylinePts = pts.map(p => `${(p.x / 100 * w).toFixed(1)},${(p.y / 100 * h).toFixed(1)}`).join(' ')
    const dash = s.productType === 'money-wealth' ? ' stroke-dasharray="4 3"' : ''
    const circles = pts.map(p =>
      `<circle cx="${(p.x / 100 * w).toFixed(1)}" cy="${(p.y / 100 * h).toFixed(1)}" r="1.8" fill="${color}"/>`
    ).join('')
    return `<polyline points="${polylinePts}" stroke="${color}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${dash}/>${circles}`
  }).join('')

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="${h}">
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#f0f0f0" stroke-width="1"/>
    ${lines}
  </svg>`
})
```

d) 样式追加：

```css
/* 趋势对比 */
.trend-legend { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 16rpx; }
.trend-legend-item { display: flex; align-items: center; gap: 8rpx; }
.trend-legend-line { width: 40rpx; height: 6rpx; border-radius: 3rpx; }
.trend-legend-name { font-size: 22rpx; color: #333; }
.trend-legend-tag { font-size: 18rpx; color: #999; background: #f5f5f5; padding: 2rpx 10rpx; border-radius: 6rpx; }
.trend-chart { background: #fafafa; border-radius: 10rpx; padding: 16rpx; }
.line-chart-body { display: flex; }
.line-chart-yaxis { width: 90rpx; display: flex; flex-direction: column; justify-content: space-between; padding: 4rpx 8rpx 4rpx 0; }
.y-label { font-size: 18rpx; color: #999; }
.line-chart-svg { flex: 1; }
.line-chart-xaxis { display: flex; justify-content: space-between; padding: 8rpx 4rpx 0; }
.x-label { font-size: 18rpx; color: #999; }
.chart-note { font-size: 20rpx; color: #999; margin-top: 12rpx; }
.empty-inline { text-align: center; color: #999; font-size: 24rpx; padding: 40rpx 0; }
```

- [ ] **Step 5: 提交**

```bash
cd strapi-wealth && git add services/api.ts pages/compare/index.vue
git commit -m "feat(wealth): 对比页选品搜索 + 多产品累计收益趋势对比"
```

---

### Task 8: C 端推送部署 + 线上走查

**Files:** 无（远程操作）

- [ ] **Step 1: 推送 wealth-line**

```bash
cd strapi-wealth && git push origin wealth-line
```
Expected: `wealth-line -> wealth-line`

- [ ] **Step 2: 部署 v.joho.cn/wealth**

按 strapi-wealth 既有部署方式（参考项目历史：scp 构建产物或服务器 git pull + 构建；以 `strapi-wealth/DEPLOYMENT.md` 或历史部署脚本为准）。部署后访问 `https://v.joho.cn/wealth` 走查：

- [ ] **Step 3: 线上走查清单**

1. hall 页：类型筛选出现"货币理财"，选中后仅展示 money-wealth 产品
2. hall 页：排序选"近7日年化"，列表按 7 日年化降序
3. compare 页：选品弹窗输入关键词可过滤产品
4. compare 页：选 2 个产品（含 1 个货币理财 + 1 个普通产品）点"开始对比"，趋势卡片显示两条曲线（货币理财为虚线），X 轴起止日期正确
5. 切换周期 tab 重新对比，曲线区间随之变化

---

## Self-Review

**Spec coverage:**
- 3.1 hall 补货币理财筛选 → Task 6 ✅
- 3.2 排序加 7 日年化 → Task 3（后端）+ Task 6（前端）✅
- 3.3 对比选品加搜索 → Task 7 ✅
- 4 趋势接口（口径/对齐/边界）→ Task 1 + Task 2 ✅
- 5 前端趋势卡片 → Task 7 ✅
- 6 测试 → Task 1/3 单测 + Task 4 全量 ✅
- 7 部署 → Task 5（后端）+ Task 8（前端）✅

**Placeholder scan:** 无 TBD/TODO；每步含完整代码与预期输出 ✅

**Type consistency:** `compareTrend`（服务/控制器/api.ts 三处签名一致，均接受 productIds: number[] + period: string）；`latestAnnual7d` 在 enrichProducts/findList/sortProducts 三处一致；前端 `trendData.dates/series[].values/productType` 与后端返回一致；`TREND_COLORS` 在模板与 script 同名单例 ✅

**边界说明:** Task 5 Step 3 的 psql 数据抽查为可选步骤（psql 可能不在 PATH），若不可用由 401 验证 + 单测覆盖兜底，不阻塞部署 ✅
