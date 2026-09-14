# 货币理财类型体系 + 特有风险提示 + 7日年化走势 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `money-wealth`（货币理财）类型并修正产品3，补充货币理财特有风险提示（披露表），C 端货币型产品改展示官方 7 日年化走势与收益两列净值表。

**Architecture:** 后端枚举加 `money-wealth`、杭银采集器按 `leixing=活钱管理` 自动归类、新增收益序列接口；数据层修正产品3 类型 + 插入披露文案；前端 `isMoneyFund` 扩展为 `isCashManagement`（money-wealth/money-fund 共用收益展示），新增收益序列加载与 7 日年化走势图，净值表改收益两列。

**Tech Stack:** Strapi v5 插件（zhao-wealth）、TypeScript、Jest、uni-app（strapi-wealth）、PostgreSQL

**Spec:** `docs/superpowers/specs/2026-09-14-money-wealth-type-risk-annual-trend-design.md`

---

## File Structure

- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json` — 枚举加 `money-wealth`
- Modify: `plugins/zhao-wealth/server/src/collectors/hzbank-collector.ts:141-144` — 按 `leixing` 判货币理财
- Modify: `plugins/zhao-wealth/server/src/controllers/nav.ts` — 新增 `moneyIncomeTimeSeries`
- Modify: `plugins/zhao-wealth/server/src/routes/content-api.ts` — 新增收益序列路由
- Test: `plugins/zhao-wealth/server/src/__tests__/hzbank-collector.test.ts` — 新建，映射用例
- Test: `plugins/zhao-wealth/server/src/__tests__/controllers.test.ts` — 新增收益序列接口用例
- Deploy: joho（git pull + restart + SQL）
- Modify: `E:\code\strapi-wealth\utils\format.ts` — `'money-wealth': '货币理财'`
- Modify: `E:\code\strapi-wealth\services\api.ts` — `getProductMoneyIncomes`
- Modify: `E:\code\strapi-wealth\pages\detail\index.vue` — isCashManagement + 7日年化走势 + 收益两列净值表
- Deploy: `E:\code\strapi-wealth\deploy-wealth.ps1` → v.joho.cn/wealth

---

### Task 1: 后端类型枚举 + 采集器映射 + 收益序列接口（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json`
- Modify: `plugins/zhao-wealth/server/src/collectors/hzbank-collector.ts`
- Modify: `plugins/zhao-wealth/server/src/controllers/nav.ts`
- Modify: `plugins/zhao-wealth/server/src/routes/content-api.ts`
- Test: `plugins/zhao-wealth/server/src/__tests__/hzbank-collector.test.ts`（新建）
- Test: `plugins/zhao-wealth/server/src/__tests__/controllers.test.ts`

- [ ] **Step 1: 枚举新增 money-wealth**

修改 `plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json`（18 行）：

```json
    "productType": { "type": "enumeration", "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund", "money-wealth"] },
```

- [ ] **Step 2: 杭银采集器货币理财分支**

修改 `plugins/zhao-wealth/server/src/collectors/hzbank-collector.ts`（141-144 行），`leixing=活钱管理` 优先判定：

```typescript
      // 产品类型映射（活钱管理=现金管理类理财，优先于 touzileixin 判定）
      let productType = 'bank-wealth';
      if (d.leixing === '活钱管理') productType = 'money-wealth';
      else if (d.touzileixin === '固定收益类') productType = 'bank-wealth';
      else if (d.touzileixin === '权益类') productType = 'stock-fund';
      else if (d.touzileixin === '混合类') productType = 'mixed-fund';
```

- [ ] **Step 3: 编写采集器映射测试（先失败）**

新建 `plugins/zhao-wealth/server/src/__tests__/hzbank-collector.test.ts`：

```typescript
'use strict';

jest.mock('../utils/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { httpClient } from '../utils/http-client';

const MOCK_DETAIL = {
  contenttitle: '幸福99金钱包测试款',
  dengjino: 'Z7002226000246',
  rizengzhang: '低风险',
  touzileixin: '固定收益类',
  leixing: '活钱管理',
  yunzuomoshi: '开放式',
  licaiqixian: '每日开放',
  chengliriqi: '2026-08-27',
  jieshuriqi: '2099-12-31',
  danweijingzhi: '1.0',
  leijijingzhi: '1.0',
};

describe('hzbank-collector.collectProductInfo', () => {
  let collector: any;

  beforeEach(() => {
    jest.resetModules();
    (httpClient.get as jest.Mock).mockReset();
    collector = require('../collectors/hzbank-collector').default;
  });

  it('leixing=活钱管理 → productType=money-wealth（即使 touzileixin=固定收益类）', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({ data: MOCK_DETAIL });
    const result = await collector.collectProductInfo('JQB2673J');
    expect(result.productType).toBe('money-wealth');
  });

  it('无活钱管理字段时按 touzileixin 映射（回归：固定收益类 → bank-wealth）', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({
      data: { ...MOCK_DETAIL, leixing: '固定收益' },
    });
    const result = await collector.collectProductInfo('JQB2668J');
    expect(result.productType).toBe('bank-wealth');
  });
});
```

确认 hzbank-collector 导出形态（`export default` class 还是工厂）——若非 class default，按文件实际导出形态调整 `collector.collectProductInfo` 的调用方式。

- [ ] **Step 4: 运行采集器测试确认失败**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/hzbank-collector.test.ts
```
Expected: 用例 1 FAIL（productType 为 bank-wealth）、用例 2 PASS。

- [ ] **Step 5: 实现采集器分支后重跑**

Expected: 2 个用例全部 PASS。

- [ ] **Step 6: 新增收益序列接口方法**

修改 `plugins/zhao-wealth/server/src/controllers/nav.ts`，在 `timeSeries` 后追加：

```typescript
  /**
   * 货币型产品收益序列（万份收益/七日年化，C端）
   */
  async moneyIncomeTimeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 100 } = ctx.query;

      const where = { product: Number(id) };

      const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
        where,
        limit: Math.min(pageSize, 500),
        offset: (page - 1) * pageSize,
        orderBy: { incomeDate: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').count({ where });

      const list = incomes.map(n => ({
        date: n.incomeDate,
        tenThousandIncome: n.tenThousandIncome,
        sevenDayAnnual: n.sevenDayAnnual,
      }));

      ctx.body = paginatedResponse(list, page, pageSize, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 收益序列查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },
```

- [ ] **Step 7: 注册路由**

修改 `plugins/zhao-wealth/server/src/routes/content-api.ts`，在 `products/:id/nav` 路由（24-32 行）后追加：

```typescript
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/money-incomes',
      handler: 'nav.moneyIncomeTimeSeries',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
```

- [ ] **Step 8: 编写接口测试（先失败）**

在 `plugins/zhao-wealth/server/src/__tests__/controllers.test.ts` 的 `describe('controllers integration')` 内新增块（参照文件内 disclosure/compare 块的 mock 模式）：

```typescript
  describe('nav money-income timeSeries', () => {
    it('GET /products/:id/money-incomes 返回倒序分页收益列表', async () => {
      const { strapi, call } = buildCtx('GET', '/v1/wealth/products/3/money-incomes?pageSize=2');
      // 按既有测试文件的 mock 结构注册 wealth-money-income 的 findMany/count
      // findMany 返回 [{ incomeDate: '2026-09-13', tenThousandIncome: 0.4876, sevenDayAnnual: 0.0188 }, { incomeDate: '2026-09-12', ... }]
      // count 返回 17
      const res = await call();
      expect(res.body.meta.pagination.total).toBe(17);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]).toMatchObject({ date: '2026-09-13', tenThousandIncome: 0.4876, sevenDayAnnual: 0.0188 });
    });
  });
```

注意：controllers.test.ts 的 mock 结构（`buildCtx`、strapi.db.query 的 uid 注册方式）以文件现有代码为准，按该文件的既有模式补齐 `wealth-money-income` 的 findMany/count mock。

- [ ] **Step 9: 运行接口测试确认失败**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/controllers.test.ts
```
Expected: 新块 FAIL（方法不存在或路由未注册）、既有块 PASS。

- [ ] **Step 10: 运行全量相关测试确认通过**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/hzbank-collector.test.ts __tests__/controllers.test.ts
```
Expected: 全部 PASS（holding-service/controllers 既有失败套件与本次无关，忽略）。

- [ ] **Step 11: 提交**

```bash
git add plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json plugins/zhao-wealth/server/src/collectors/hzbank-collector.ts plugins/zhao-wealth/server/src/controllers/nav.ts plugins/zhao-wealth/server/src/routes/content-api.ts plugins/zhao-wealth/server/src/__tests__/hzbank-collector.test.ts plugins/zhao-wealth/server/src/__tests__/controllers.test.ts
git commit -m "feat(zhao-wealth): 新增货币理财类型+杭银活钱管理归类+收益序列接口"
```

---

### Task 2: 重建 dist 并推送

**Files:**
- Build: `plugins/zhao-wealth/dist/`

- [ ] **Step 1: 重建插件 dist**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run build
```
Expected: `dist/server/index.mjs` 重新生成。

- [ ] **Step 2: 自检 dist 含新逻辑**

```powershell
Select-String -Path plugins/zhao-wealth/dist/server/index.mjs -Pattern "money-wealth|money-incomes" | Measure-Object | Select-Object Count
```
Expected: Count >= 2。若为 0，回到 Task 1 检查。

- [ ] **Step 3: 提交 dist 并推送**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist，含货币理财类型与收益序列接口"
git push origin main
```
Expected: push 成功。

---

### Task 3: 部署 joho + 数据修正 + 接口验证

**Files:**
- Deploy: joho 服务器（strapi 目录 `/www/apps/strapi`，postgres 容器 `1Panel-postgresql-pIe0`，DB 配置在 `/www/apps/strapi/.env`）

- [ ] **Step 1: 部署（git pull + 重启）**

```powershell
$cmd = "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:`$PATH; export PM2_HOME=/home/admin/.pm2; pm2 restart strapi"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: pull 到 Task 2 提交；restart 成功。

- [ ] **Step 2: 产品3 类型修正 + 披露文案插入**

```powershell
$cmd = @'
cd /www/apps/strapi
DBPASS=$(grep -oP "(?<=^DATABASE_PASSWORD=).*" .env)
DBUSER=$(grep -oP "(?<=^DATABASE_USERNAME=).*" .env)
DBNAME=$(grep -oP "(?<=^DATABASE_NAME=).*" .env)
docker exec -e PGPASSWORD=$DBPASS 1Panel-postgresql-pIe0 psql -U $DBUSER -d $DBNAME -c "UPDATE wealth_products SET product_type = 'money-wealth' WHERE id = 3 RETURNING id, product_type;"
docker exec -e PGPASSWORD=$DBPASS 1Panel-postgresql-pIe0 psql -U $DBUSER -d $DBNAME -c "INSERT INTO wealth_disclosures (title, content, product_type, status, effective_date, created_at, updated_at, published_at) VALUES ('货币理财风险提示', '本产品为银行现金管理类理财产品。产品不保本、不保收益，业绩比较基准仅为参考，不构成收益承诺；产品采用摊余成本法估值，份额净值通常保持稳定，收益以产品实际运作结果为准；投资者应关注产品说明书中关于赎回时效、费用等的约定。理财非存款，产品有风险，投资须谨慎。', 'money-wealth', true, '2026-09-14', NOW(), NOW(), NOW());"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 类型输出 `3|money-wealth`；INSERT 0 1。若 wealth_disclosures 表存在额外必填列或不同列名，按实际表结构调整（先用 `\d wealth_disclosures` 确认）。

- [ ] **Step 3: 接口验证（核心）**

```powershell
$cmd = "sleep 15; curl -s 'http://127.0.0.1:1337/api/zhao-wealth/v1/wealth/products/3/money-incomes?pageSize=3' | head -c 600"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 返回 paginatedResponse，data 含 date/tenThousandIncome/sevenDayAnnual（最新 09-13，sevenDayAnnual≈0.0188）。未登录访问带 SSO 鉴权（该接口 sso-authenticated 策略），若返回 401，改用 admin 登录 token 验证。

- [ ] **Step 4: 披露接口验证**

```powershell
$cmd = "curl -s 'http://127.0.0.1:1337/api/zhao-wealth/v1/wealth/disclosure?productType=money-wealth' | head -c 500"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 返回 title=货币理财风险提示 的披露记录。

---

### Task 4: 前端改造 + 构建部署（strapi-wealth → v.joho.cn/wealth）

**Files:**
- Modify: `E:\code\strapi-wealth\utils\format.ts`
- Modify: `E:\code\strapi-wealth\services\api.ts`
- Modify: `E:\code\strapi-wealth\pages\detail\index.vue`

- [ ] **Step 1: getTypeLabel 新增货币理财**

修改 `E:\code\strapi-wealth\utils\format.ts`（63 行附近 TYPE_LABELS 映射）：

```typescript
  'money-fund': '货币基金',
  'money-wealth': '货币理财',
```

- [ ] **Step 2: api.ts 新增收益序列**

修改 `E:\code\strapi-wealth\services\api.ts`，在 `getProductNavSeries`（20-22 行）后追加：

```typescript
export function getProductMoneyIncomes(productId: string | number, params = {}) {
  return get(`${V1}/products/${productId}/money-incomes`, params).then(extractList)
}
```

- [ ] **Step 3: 详情页 isCashManagement + 数据加载**

修改 `E:\code\strapi-wealth\pages\detail\index.vue`：

1) import 追加（354 行附近）：

```typescript
  getProductMoneyIncomes,
```

2) `isMoneyFund`（359 行附近）替换为：

```typescript
const isCashManagement = computed(() => {
  const t = product.value?.productType
  return t === 'money-wealth' || t === 'money-fund'
})
```

3) 新增收益序列 ref（navSeries 定义附近）：

```typescript
const moneyIncomes = ref<any[]>([])
```

4) `loadAll` 的 Promise.all（784-790 行）追加（仅货币型请求）：

```typescript
    const [p, snap, rm, navList, yrList, incomeList] = await Promise.all([
      getProductDetail(id),
      getProductAnnualSnapshot(id).catch(() => null),
      getProductRiskMetric(id).catch(() => null),
      getProductNavSeries(id, { pageSize: 30 }).catch(() => []),
      getProductYearlyReturn(id).catch(() => []),
      getProductMoneyIncomes(id, { pageSize: 30 }).catch(() => [])
    ])
```
并在 794 行后追加：

```typescript
    moneyIncomes.value = incomeList?.list || incomeList || []
```

- [ ] **Step 4: 详情页 7 日年化走势图**

修改 `pages/detail/index.vue`：

1) `navTrend` computed 后（613 行后）新增 `incomeTrend` 与 `incomeLineSvg`（复制 navTrend/navLineSvg 结构，数据源换收益序列，Y 轴按百分比）：

```typescript
const incomeTrend = computed(() => {
  const data = [...moneyIncomes.value].slice(0, 20).reverse()
  if (data.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const values = data.map((d: any) => Number(d.sevenDayAnnual || 0)).filter(v => v > 0)
  if (values.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.0001
  const padding = range * 0.1
  const adjustedMin = min - padding
  const adjustedRange = max - adjustedMin || 0.0001

  const points = data
    .filter((d: any) => Number(d.sevenDayAnnual || 0) > 0)
    .map((d: any, i: number, arr: any[]) => ({
      date: formatDate(d.date),
      value: Number(d.sevenDayAnnual),
      x: arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50,
      y: ((max - Number(d.sevenDayAnnual)) / adjustedRange) * 100,
    }))

  return { points, min, max, range }
})

const incomeLineSvg = computed(() => {
  const pts = incomeTrend.value.points
  if (pts.length < 2) return ''
  const w = 300, h = 160
  const lastVal = pts[pts.length - 1]?.value
  const firstVal = pts[0]?.value
  const color = lastVal != null && firstVal != null && lastVal >= firstVal ? '#f5222d' : '#07c160'
  const fillColor = lastVal != null && firstVal != null && lastVal >= firstVal ? 'rgba(245,34,45,0.08)' : 'rgba(7,193,96,0.08)'

  const polylinePts = pts.map(p => `${(p.x / 100 * w).toFixed(1)},${(p.y / 100 * h).toFixed(1)}`).join(' ')
  const areaPts = `${(pts[0].x / 100 * w).toFixed(1)},${h} ${polylinePts} ${(pts[pts.length - 1].x / 100 * w).toFixed(1)},${h}`
  const circles = pts.map(p =>
    `<circle cx="${(p.x / 100 * w).toFixed(1)}" cy="${(p.y / 100 * h).toFixed(1)}" r="2" fill="${color}"/>`
  ).join('')
  return `<polyline points="${polylinePts}" fill="none" stroke="${color}" stroke-width="2"/>` +
    `<polygon points="${areaPts}" fill="${fillColor}"/>` +
    circles
})
```

2) 净值走势图 card（139 行）加类型判断 + 货币型展示 7 日年化走势：

```html
      <!-- 4a. 7日年化走势图（货币型/现金管理类） -->
      <view class="card" v-if="isCashManagement && incomeTrend.points.length >= 2">
        <view class="section-title">7日年化走势</view>
        <view class="nav-flat-tip">数据来源：产品官方披露的七日年化，可点击下方"净值来源"校验。</view>
        <view class="nav-trend-chart">
          <view class="line-chart-body">
            <view class="line-chart-yaxis">
              <text class="y-label">{{ formatPercent(incomeTrend.max, 3) }}</text>
              <text class="y-label">{{ formatPercent(incomeTrend.min, 3) }}</text>
            </view>
            <view class="line-chart-svg" v-html="incomeLineSvg"></view>
          </view>
          <view class="line-chart-xaxis">
            <text class="x-label">{{ incomeTrend.points[0].date }}</text>
            <text class="x-label">{{ incomeTrend.points[Math.floor(incomeTrend.points.length / 2)].date }}</text>
            <text class="x-label">{{ incomeTrend.points[incomeTrend.points.length - 1].date }}</text>
          </view>
          <view class="trend-info">
            <text class="trend-min">最低: {{ formatPercent(incomeTrend.min, 3) }}</text>
            <text class="trend-max">最高: {{ formatPercent(incomeTrend.max, 3) }}</text>
          </view>
        </view>
      </view>

      <!-- 4b. 净值走势图（净值型） -->
      <view class="card" v-if="!isCashManagement && navTrend.points.length >= 2">
        <view class="section-title">净值走势</view>
        <view class="nav-trend-chart">
          <view class="line-chart-body">
            <view class="line-chart-yaxis">
              <text class="y-label">{{ navTrend.max.toFixed(4) }}</text>
              <text class="y-label">{{ navTrend.min.toFixed(4) }}</text>
            </view>
            <view class="line-chart-svg" v-html="navLineSvg"></view>
          </view>
          <view class="line-chart-xaxis">
            <text class="x-label">{{ navTrend.points[0].date }}</text>
            <text class="x-label">{{ navTrend.points[Math.floor(navTrend.points.length / 2)].date }}</text>
            <text class="x-label">{{ navTrend.points[navTrend.points.length - 1].date }}</text>
          </view>
          <view class="trend-info">
            <text class="trend-min">最低: {{ navTrend.min.toFixed(4) }}</text>
            <text class="trend-max">最高: {{ navTrend.max.toFixed(4) }}</text>
          </view>
        </view>
      </view>
```

3) 净值表 card（180-206 行）货币型改收益两列：

```html
      <!-- 6. 净值表 -->
      <view class="card">
        <view class="section-title toggle" @click="navOpen = !navOpen">
          <text>{{ isCashManagement ? '收益明细（最近10条）' : '净值表（最近10条）' }}</text>
          <text class="toggle-arrow">{{ navOpen ? '收起 ▴' : '展开 ▾' }}</text>
        </view>
        <view v-if="isCashManagement" class="nav-flat-tip">本产品为现金管理类，净值恒为 1，收益体现于万份收益/七日年化。</view>
        <view v-if="navOpen" class="nav-table">
          <view v-if="!tableRows.length" class="empty-inline">{{ isCashManagement ? '暂无收益数据' : '暂无净值数据' }}</view>
          <view v-else>
            <view class="nav-row nav-head">
              <text class="nav-date">日期</text>
              <template v-if="isCashManagement">
                <text class="nav-unit">万份收益</text>
                <text class="nav-acc">七日年化</text>
              </template>
              <template v-else>
                <text class="nav-unit">单位净值</text>
                <text class="nav-acc">累计净值</text>
              </template>
            </view>
            <view v-for="(r, i) in tableRows" :key="i" class="nav-row">
              <text class="nav-date">{{ r.date }}</text>
              <text class="nav-unit">{{ r.unit }}</text>
              <text class="nav-acc">{{ r.acc }}</text>
            </view>
          </view>
        </view>
        <view v-if="product.navSourceUrl" class="nav-source">
          <text class="nav-source-label">净值来源：</text>
          <text class="nav-source-link" @click="openNavSource">{{ navSourceName }}</text>
          <text class="nav-source-tip">点击查看，可自行查阅校验</text>
        </view>
      </view>
```

4) script 新增 `tableRows` computed（替换原 `navs` 在模板中的引用）：

```typescript
const tableRows = computed<any[]>(() => {
  if (!isCashManagement.value) return navs.value
  return (moneyIncomes.value || []).slice(0, 10).map((r: any) => ({
    date: formatDate(r.date),
    unit: r.tenThousandIncome != null ? Number(r.tenThousandIncome).toFixed(4) : '--',
    acc: r.sevenDayAnnual != null ? formatPercent(r.sevenDayAnnual) : '--',
  }))
})
```

注意：若模板中其他位置仍引用 `navs`（404 行 computed），保留原定义不动；`formatDate`/`formatPercent` 需确认已在 import 中（现有 `formatPercent` 已用；`formatDate` 若未 import，从 `../utils/format` 引入）。

- [ ] **Step 5: 本地构建**

Run（在 `E:\code\strapi-wealth` 目录下）:
```
npm run build:h5
```
Expected: 构建成功，无 TS 报错（formatDate import 若缺失会在此暴露）。

- [ ] **Step 6: 提交并推送**

```bash
git add utils/format.ts services/api.ts pages/detail/index.vue
git commit -m "feat(wealth-fe): 货币理财类型+7日年化走势+收益两列净值表"
git push origin wealth-line
```

- [ ] **Step 7: 部署**

Run（在 `E:\code\strapi-wealth` 目录下）:
```
powershell -File deploy-wealth.ps1
```
Expected: 输出 `SYNC_OK` 与 `部署完成: https://v.joho.cn/wealth/`。

- [ ] **Step 8: 线上验证**

```powershell
$cmd = "curl -s -o /dev/null -w '%{http_code}' https://v.joho.cn/wealth/index.html"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 200。人工复核产品3 详情页：类型显示"货币理财"、7日年化走势图有值、收益明细表显示万份收益/七日年化、风险提示区显示"货币理财风险提示"。

---

## Self-Review

**1. Spec coverage:**
- §4.1.1 枚举 → Task 1 Step 1 ✓
- §4.1.2 采集器 → Task 1 Step 2/5 ✓
- §4.1.3 收益序列接口 → Task 1 Step 6/7 ✓
- §4.2 数据（类型+披露）→ Task 3 Step 2 ✓
- §4.3.1 类型文案 → Task 4 Step 1 ✓
- §4.3.2 api → Task 4 Step 2 ✓
- §4.3.3 详情页三处 → Task 4 Step 3/4 ✓
- §4.3.4 disclosure-block 免改 → 说明 ✓
- §5 测试 → Task 1 Step 3-10 ✓
- §6 部署 → Task 2/3/4 ✓
- §4.4 不做项 → 计划未涉及 ✓

**2. Placeholder scan:** 无 TBD/TODO；controllers.test.ts 的 mock 结构以该文件现有模式为准（Step 8 已注明），非占位。

**3. Type consistency:** `money-wealth` 枚举与 label 一致；`isCashManagement` 在模板三处（走势/净值表/提示）与 script 定义一致；`getProductMoneyIncomes` 在 api.ts 与 detail.vue import 一致；`tableRows` 在模板与 computed 一致；`incomeTrend`/`incomeLineSvg` 命名一致。
