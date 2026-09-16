# 财富首页统一7日年化 + 最近更新排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页所有年化展示统一为近7日年化，默认按最新净值日期降序，并补充下拉刷新/更新提示/缺数据降级文案。

**Architecture:** 后端在 `product.ts` 的 enrichProducts 中顺带暴露 `latestNavDate`（复用已查的最新净值，零额外查询），`sortProducts` 新增 `latestNav` 分支；推荐/评分榜接口补 `annual7d` 字段。前端 `AnnualCard` 统一取 `latestAnnual7d`，hall 页默认排序改为"最近更新"并接入提示/下拉刷新。

**Tech Stack:** Strapi v5 插件（TypeScript + jest）、uni-app Vue3（vite H5）、Playwright/SSH 部署。

**Spec:** `docs/superpowers/specs/2026-09-16-wealth-home-annual7d-design.md`

---

### Task 1: 后端 product.ts — latestNavDate 暴露与 latestNav 排序（TDD）

**Files:**
- Test: `plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts`（重写 mock 区分 nav/snapshot）
- Modify: `plugins/zhao-wealth/server/src/services/product.ts`

- [ ] **Step 1: 重写测试文件（先 FAIL）**

将 `plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts` 整个替换为：

```ts
'use strict';

describe('product.findList sortBy', () => {
  let service: any;

  beforeEach(() => {
    const mockProductFindMany = jest.fn();
    const mockCount = jest.fn();
    const mockNavFindOne = jest.fn();
    const mockSnapshotFindOne = jest.fn();
    const mockOtherFindOne = jest.fn().mockResolvedValue(null);
    const mockQuery = jest.fn().mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-product') {
        return { findMany: mockProductFindMany, count: mockCount };
      }
      if (name === 'plugin::zhao-wealth.wealth-nav') {
        return { findOne: mockNavFindOne, findMany: mockNavFindOne };
      }
      if (name === 'plugin::zhao-wealth.wealth-annual-snapshot') {
        return { findOne: mockSnapshotFindOne, findMany: mockSnapshotFindOne };
      }
      return { findOne: mockOtherFindOne, findMany: mockOtherFindOne };
    });
    const mockStrapi = {
      db: { query: mockQuery },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    jest.resetModules();

    // 产品列表：3 个产品
    mockProductFindMany.mockResolvedValue([
      { id: 1, productName: 'A' },
      { id: 2, productName: 'B' },
      { id: 3, productName: 'C' },
    ]);
    mockCount.mockResolvedValue(3);

    // 最新净值：产品1 → 09-15，产品2 → 09-10，产品3 无净值；无 where 时返回全库最新 09-15
    mockNavFindOne.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) return Promise.resolve({ navDate: '2026-09-15T16:00:00.000Z', unitNav: 1.02 });
      if (pid === 2) return Promise.resolve({ navDate: '2026-09-10T16:00:00.000Z', unitNav: 1.01 });
      return Promise.resolve(null);
    });

    // 年化快照：产品1 annual7d=0.03，产品2 annual7d=0.05，产品3 无
    mockSnapshotFindOne.mockImplementation((opts: any) => {
      const pid = opts.where?.product;
      if (pid === 1) return Promise.resolve({ annual7d: 0.03, annual1m: 0.04, snapshotDate: '2026-09-15' });
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

  it('sortBy=latestNav 按最新净值日期降序，无净值排末尾，并透传 latestNavDate', async () => {
    const result = await service.findList({ status: true }, 1, 10, { sortBy: 'latestNav' });
    const ids = result.list.map((p: any) => p.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(result.list[0].latestNavDate).toBe('2026-09-15');
    expect(result.list[2].latestNavDate).toBeNull();
  });

  it('findList 返回体附加全库最新净值日期 latestNavDate', async () => {
    const result = await service.findList({ status: true }, 1, 10, {});
    expect(result.latestNavDate).toBe('2026-09-15');
  });
});
```

- [ ] **Step 2: 运行测试确认 FAIL**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx jest product-sort --no-coverage`
Expected: `latestNavDate` 相关断言失败（`Cannot read properties of undefined` 或 `expected undefined to be '2026-09-15'`）

- [ ] **Step 3: 实现 product.ts 三处改动**

在 `plugins/zhao-wealth/server/src/services/product.ts`：

a) `enrichProducts` 的 `result[pid]`（现有第 127 行 `latestNav: latestNav || null,` 后）追加：
```ts
        latestNavDate: latestNav?.navDate ? String(latestNav.navDate).slice(0, 10) : null,
```

b) `findList` 列表组装 map（现有第 45 行 `latestNav: ...` 后）追加：
```ts
      latestNavDate: enrichedMap[product.id]?.latestNavDate ?? null,
```

c) `sortProducts` switch（现有 `case 'annual7d'` 后）新增：
```ts
    case 'latestNav':
      sorted.sort((a, b) => {
        const ta = a.latestNavDate ? new Date(a.latestNavDate).getTime() : -Infinity;
        const tb = b.latestNavDate ? new Date(b.latestNavDate).getTime() : -Infinity;
        return tb - ta;
      });
      break;
```

d) `findList` 返回体（现有第 59 行 `return { list, page, pageSize: limit, total };` 前）追加全库最新净值日期：
```ts
    const latestNavRow = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      orderBy: { navDate: 'desc' },
    });

    return {
      list,
      page,
      pageSize: limit,
      total,
      latestNavDate: latestNavRow?.navDate ? String(latestNavRow.navDate).slice(0, 10) : null,
    };
```

- [ ] **Step 4: 运行测试确认 PASS**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx jest product-sort --no-coverage`
Expected: 3 个用例全部 PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/product.ts plugins/zhao-wealth/server/src/__tests__/product-sort.test.ts
git commit -m "feat(zhao-wealth): 产品列表按最新净值日期排序（latestNav）"
```

---

### Task 2: 后端 recommend-service + scoring-service 补 annual7d 字段

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/recommend-service.ts`
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts`

- [ ] **Step 1: recommend-service.ts 三处补 annual7d**

在 `plugins/zhao-wealth/server/src/services/recommend-service.ts`：

a) 手动推荐源（现有第 37 行 `annual1y: latestSnapshot?.annual1y,` 后）追加：
```ts
        annual7d: latestSnapshot?.annual7d != null ? Number(latestSnapshot.annual7d) : null,
```

b) 评分补充源（现有第 82 行 `annual1y: null,` 后）追加：
```ts
          annual7d: null,
```

c) 年化排名源（现有第 113 行 `annual1y: snapshot.annual1y,` 后）追加：
```ts
          annual7d: snapshot.annual7d != null ? Number(snapshot.annual7d) : null,
```

- [ ] **Step 2: scoring-service.ts 榜单补 latestAnnual7d**

在 `plugins/zhao-wealth/server/src/services/scoring-service.ts` 的 records map（现有第 316 行 `[annualKey]: ...` 之后）追加：
```ts
        latestAnnual7d: annual?.annual7d != null && !isNaN(Number(annual.annual7d))
          ? Number(annual.annual7d)
          : null,
```

- [ ] **Step 3: 运行全量测试确认无回归**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`
Expected: 全部 PASS（此任务为纯字段补充，无新测试）

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-wealth/server/src/services/recommend-service.ts plugins/zhao-wealth/server/src/services/scoring-service.ts
git commit -m "feat(zhao-wealth): 推荐与评分榜补充 annual7d 字段"
```

---

### Task 3: 全量测试 + 重建 dist + 推送 main

**Files:**
- Modify: `plugins/zhao-wealth/dist/*`（构建产物）

- [ ] **Step 1: 全量测试**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`
Expected: 全部 PASS（若存在与本任务无关的既有失败套件，记录但不处理）

- [ ] **Step 2: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`
Expected: `✓ built` / `Build complete!`

- [ ] **Step 3: dist 自检**

Run: `rg -l "latestNavDate" e:\code\basic\plugins\zhao-wealth\dist\server`
Expected: 命中（否则重跑 build）

- [ ] **Step 4: 提交并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist plugins/zhao-wealth/server
git commit -m "build(zhao-wealth): 重建 dist（latestNav 排序 + annual7d 字段）"
git push origin main
```
注意：只能 add 上述两个目录（工作区有其他无关文件，禁止 `git add .`/`-A`）

---

### Task 4: 部署 joho + 接口验证

**Files:** 无（远程部署）

- [ ] **Step 1: git pull + dist 自检 + pm2 restart**

PowerShell（Windows ssh 引号会剥，用 base64 传脚本）：
```powershell
$script = @'
#!/bin/bash
set -e
cd /www/apps/strapi
git pull origin main >/dev/null 2>&1
if grep -rq "latestNavDate" plugins/zhao-wealth/dist/server; then
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
Expected: `DIST_CHECK_OK` → `PM2_RESTART_OK` → `DONE`。若 git pull 冲突，报告输出，不要擅自 reset。

- [ ] **Step 2: 接口存活验证**

```powershell
$cmd = 'curl -s -o /dev/null -w "%{http_code}" "http://localhost:1337/api/zhao-wealth/v1/wealth/compare/trend?productIds=1,2&period=m1"'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash" 2>&1
```
Expected: `401`（服务已重启、路由存活）。若首次 000（服务未就绪），等待后重试一次。

---

### Task 5: 前端 AnnualCard 统一 7 日年化

**Files:**
- Modify: `e:\code\strapi-wealth\components\annual-card.vue`

- [ ] **Step 1: 修改模板年化区**

将第 20-35 行 `.card-annual` 整块替换为：
```html
    <view class="card-annual">
      <view class="annual-main">
        <text class="annual-label">近7日年化</text>
        <text v-if="displayAnnual !== null" class="annual-value" :class="getProfitClass(displayAnnual)">
          {{ formatPercent(displayAnnual) }}
        </text>
        <text v-else class="annual-value annual-empty">数据积累中</text>
      </view>
      <view class="annual-sub" v-if="product.latestNav?.unitNav">
        <text class="nav-label">单位净值</text>
        <text class="nav-value">{{ product.latestNav.unitNav }}</text>
        <text class="nav-date" v-if="product.latestNav.navDate">{{ product.latestNav.navDate }}</text>
      </view>
    </view>
```

- [ ] **Step 2: 修改 script 计算逻辑**

将第 56-68 行（`isShort`、`isMoney`、`displayAnnual` 三个 computed）替换为：
```ts
// 统一展示近7日年化（年化快照 annual7d），无数据时显示"数据积累中"
const displayAnnual = computed<number | null>(() => {
  const v = props.product.latestAnnual7d ?? props.product.annual7d
  return v !== undefined && v !== null ? Number(v) : null
})
```

- [ ] **Step 3: 追加降级样式**

在 `<style scoped>` 的 `.annual-value.flat` 规则后追加：
```css
.annual-value.annual-empty { font-size: 28rpx; color: #999; font-weight: normal; }
```

- [ ] **Step 4: Commit**

```bash
cd e:\code\strapi-wealth
git add components/annual-card.vue
git commit -m "feat(wealth): 产品卡片统一展示近7日年化，缺数据降级文案"
```

---

### Task 6: 前端 hall 页整合（默认最近更新 + 榜单/推荐 7 日年化 + 更新提示 + 下拉刷新）

**Files:**
- Modify: `e:\code\strapi-wealth\pages\hall\index.vue`
- Modify: `e:\code\strapi-wealth\src\pages.json`

- [ ] **Step 1: 模板改动**

`pages/hall/index.vue`：

a) 推荐卡片（第 18-19 行）改为：
```html
            <text class="rec-return" :class="getProfitClass(item.annual7d)">{{ formatPercent(item.annual7d) }}</text>
            <text class="rec-period">近7日年化</text>
```

b) 榜单年化（第 39-42 行）改为：
```html
            <text class="lb-annual" :class="getProfitClass(item.latestAnnual7d ?? item.annual7d)">
              {{ formatPercent(item.latestAnnual7d ?? item.annual7d) }}
            </text>
            <text class="lb-period">近7日年化</text>
```

c) 搜索栏上方加更新提示（第 48 行 `<!-- 搜索 -->` 前）：
```html
    <!-- 数据更新提示 -->
    <view v-if="latestNavDate" class="update-tip">数据更新至 {{ latestNavDate }}</view>
```

- [ ] **Step 2: script 改动**

a) `SORT_OPTIONS`（第 113-118 行）改为（"最近更新"置首）：
```ts
const SORT_OPTIONS = [
  { key: 'latestNav', label: '最近更新' },
  { key: 'score', label: '综合评分' },
  { key: 'annual7d', label: '近7日年化' },
  { key: 'annual1m', label: '近1月年化' },
  { key: 'volatility', label: '波动率' },
]
```
（`sortIndex` 默认 `ref(0)` 即最近更新，无需改）

b) 新增状态（`list` ref 附近）：
```ts
const latestNavDate = ref('')
```

c) `load()` 里 `list.value = res.list || []` 后追加：
```ts
    latestNavDate.value = res.latestNavDate || ''
```

d) 新增下拉刷新处理（`load` 函数定义后追加）：
```ts
onMounted(() => {
  uni.setNavigationBarTitle({ title: '财富产品' })
})

// pages.json 已开启 enablePullDownRefresh，配合 onPullDownRefresh
```
同时把 script 顶部 `import { ref, onMounted } from 'vue'` 改为：
```ts
import { ref, onMounted } from 'vue'
```
（onMounted 已存在则跳过；若文件已定义 onMounted 的 load 调用，只追加下拉刷新函数）
在 `<script setup>` 末尾追加：
```ts
async function onPullDownRefresh() {
  page.value = 1
  await load()
  uni.stopPullDownRefresh()
}
```

- [ ] **Step 3: 样式追加**

`<style scoped>` 末尾追加：
```css
.update-tip {
  font-size: 22rpx; color: #999; padding: 8rpx 24rpx 0;
}
```

- [ ] **Step 4: pages.json 开启下拉刷新**

`e:\code\strapi-wealth\src\pages.json` 中 hall 页（`pages/hall/index`）的 style 追加：
```json
      "enablePullDownRefresh": true
```
（先 Read 确认 hall 页 style 现状，若已有 navigationBarTitleText 等保留并追加该键）

- [ ] **Step 5: Commit**

```bash
cd e:\code\strapi-wealth
git add pages/hall/index.vue src/pages.json
git commit -m "feat(wealth): 首页默认最近更新排序+7日年化统一+更新提示+下拉刷新"
```

---

### Task 7: 前端推送 + 构建部署 + 线上验证

**Files:** 无（构建与部署）

- [ ] **Step 1: 推送 wealth-line**

```bash
cd e:\code\strapi-wealth
git push origin wealth-line
```
Expected: `main..wealth-line` push 成功

- [ ] **Step 2: 本地构建 H5**

```bash
cd e:\code\strapi-wealth
npm run build:h5
```
Expected: 生成 `dist/build/h5/index.html`（新 hash）

- [ ] **Step 3: 执行部署脚本**

```powershell
powershell -ExecutionPolicy Bypass -File e:\code\strapi-wealth\deploy-wealth.ps1
```
Expected: `SYNC_OK` + `部署完成: https://v.joho.cn/wealth/`

- [ ] **Step 4: 线上验证**

```powershell
curl.exe -s -o NUL -w "%{http_code}" https://v.joho.cn/wealth/
```
Expected: `200`；且线上 index.html 引用的 assets hash 与本地产物一致（新产物生效）

---

## Self-Review

**1. Spec coverage:**
- ✅ 统一7日年化：Task 1（后端字段）、Task 5（卡片）、Task 6（榜单/推荐）
- ✅ 最近更新排序：Task 1（latestNav 排序 + latestNavDate）、Task 6（默认选项）
- ✅ 数据更新提示：Task 1（findList 返回 latestNavDate）、Task 6（模板 + load）
- ✅ 下拉刷新：Task 6（onPullDownRefresh + pages.json）
- ✅ 缺数据降级文案：Task 5（displayAnnual null → "数据积累中"）
- ✅ 推荐位同排序（口径）：Task 2（recommend 补 annual7d）、Task 6（推荐展示 annual7d）
- ✅ 评分榜：Task 2（scoring 补 latestAnnual7d）、Task 6（榜单展示）
- ✅ 构建部署：Task 3/4（后端）、Task 7（前端）

**2. Placeholder scan:** 无 TBD/占位；所有代码块完整。

**3. Type consistency:**
- `latestNavDate`（字符串 `YYYY-MM-DD` 或 null）在 Task 1 定义/暴露，Task 6 前端消费 —— 一致
- `latestAnnual7d` / `annual7d`（number | null）在 Task 1/2 定义，Task 5/6 消费 —— 一致
- sortBy 键名 `latestNav` 在 Task 1（后端 case）与 Task 6（前端 option key）一致
- `res.latestNavDate`（Task 6 前端读取）与 Task 1 返回体字段名一致
