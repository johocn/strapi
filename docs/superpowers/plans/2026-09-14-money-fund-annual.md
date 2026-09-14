# 货币型产品多期限年化收益 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让货币型产品（幸福99，产品3）按万份收益单利口径计算 8 期限年化快照（新增 1日/3日/2周），C 端提示净值恒 1 原因，合规标注口径差异。

**Architecture:** 后端扩展 `nav-calculator.ts` 的 `calculateMoneyFundSnapshot` 期限为 8 个（与净值型对齐），统一单利公式 `窗口万份收益均值×365/10000`，窗口不足输出 null（前端 `formatPercent(null)` 自动显示 `--`）。前端 `pages/detail/index.vue` 对 `money-fund` 类型加三处提示（产品卡片标识、计算说明弹窗、净值区文案）。

**Tech Stack:** Strapi v5 插件（zhao-wealth）、TypeScript、Jest、uni-app（strapi-wealth，vite base=/wealth/）

**Spec:** `docs/superpowers/specs/2026-09-14-money-fund-annual-design.md`

---

## File Structure

- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts` — `calculateMoneyFundSnapshot` 期限扩展为 8 期限
- Test: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts` — 新增 `describe('calculateMoneyFundSnapshot')` 块
- Build: `plugins/zhao-wealth/dist/` — 重建产物（部署铁律）
- Deploy: joho 服务器（git pull + pm2 restart + SQL 改类型 + 触发重算）
- Modify: `E:\code\strapi-wealth\pages\detail\index.vue` — 三处 money-fund 提示
- Deploy: `E:\code\strapi-wealth\deploy-wealth.ps1` → v.joho.cn/wealth

---

### Task 1: 货币型多期限计算（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts`（`calculateMoneyFundSnapshot`，93-136 行）
- Test: `plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts`

- [ ] **Step 1: 新增测试块（先写失败测试）**

在 `nav-calculator.test.ts` 末尾追加（复用文件顶部 `d()` 辅助函数；新增 `INCOME_UID` 常量与 mock 注册）：

```typescript
describe('nav-calculator.calculateMoneyFundSnapshot', () => {
  let mockStrapi: any;
  let mockQueries: Record<string, any>;
  const PRODUCT_UID = 'plugin::zhao-wealth.wealth-product';
  const INCOME_UID = 'plugin::zhao-wealth.wealth-money-income';

  // 06-01 ~ 06-20 共 20 天，万份收益恒 0.5
  const incomeDataset = Array.from({ length: 20 }, (_, i) => ({
    incomeDate: new Date(2026, 5, i + 1),
    tenThousandIncome: 0.5,
  }));

  beforeEach(() => {
    jest.resetModules();
    mockQueries = {};
    mockQueries[PRODUCT_UID] = { findOne: jest.fn() };
    mockQueries[INCOME_UID] = {
      findOne: jest.fn(),
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
        const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
        return incomeDataset.filter((r) => {
          const t = new Date(r.incomeDate).getTime();
          return t >= gte && t <= lte;
        });
      }),
    };
    mockStrapi = {
      db: { query: jest.fn((uid: string) => mockQueries[uid]) },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getService() {
    return require('../services/nav-calculator').default({ strapi: mockStrapi });
  }

  it('8 期限全部输出：1日/3日/7日/2周 有值，1月及以上 null（待积累）', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    const service = getService();

    // snapshotDate = 06-20：1日窗口 06-20（1条）、3日 06-18~20（3条）、7日 06-14~20（7条）、
    // 2周 06-07~20（14条）均可算；1月需 30 条不足 → null
    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 5, 20));

    expect(snapshot.annual1d).toBe(0.01825); // 0.5×365/10000
    expect(snapshot.annual3d).toBe(0.01825);
    expect(snapshot.annual7d).toBe(0.01825);
    expect(snapshot.annual2w).toBe(0.01825);
    expect(snapshot.annual1m).toBeNull();
    expect(snapshot.annual3m).toBeNull();
    expect(snapshot.annual6m).toBeNull();
    expect(snapshot.annual1y).toBeNull();
    expect(snapshot.isEstimate).toBe(false);
  });

  it('当日无收益记录 → annual1d 为 null', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    const service = getService();

    // snapshotDate = 07-01：数据集最晚 06-20，当日窗口 0 条
    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 6, 1));

    expect(snapshot.annual1d).toBeNull();
    expect(snapshot.annual7d).toBeNull();
  });

  it('3日窗口按均值年化：0.5/0.7/0.6 → 0.0219', async () => {
    mockQueries[PRODUCT_UID].findOne.mockResolvedValue({ id: 1, productType: 'money-fund' });
    mockQueries[INCOME_UID].findMany.mockImplementation(({ where }: any) => {
      const gte = where.incomeDate.$gte ? new Date(where.incomeDate.$gte).getTime() : -Infinity;
      const lte = where.incomeDate.$lte ? new Date(where.incomeDate.$lte).getTime() : Infinity;
      const dataset = [
        { incomeDate: new Date(2026, 5, 18), tenThousandIncome: 0.5 },
        { incomeDate: new Date(2026, 5, 19), tenThousandIncome: 0.7 },
        { incomeDate: new Date(2026, 5, 20), tenThousandIncome: 0.6 },
      ];
      return dataset.filter((r) => {
        const t = new Date(r.incomeDate).getTime();
        return t >= gte && t <= lte;
      });
    });
    const service = getService();

    const snapshot = await service.calculateMoneyFundSnapshot(1, new Date(2026, 5, 20));

    expect(snapshot.annual3d).toBe(0.0219); // (0.5+0.7+0.6)/3 × 365 / 10000
    expect(snapshot.annual7d).toBeNull(); // 仅 3 条不足 7 天
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/nav-calculator.test.ts
```
Expected: 新 describe 的 3 个用例 FAIL（`annual1d` undefined，因现有实现只算 7d/1m/3m/6m/1y），既有 recalculateMissing 3 个用例 PASS。

- [ ] **Step 3: 实现期限扩展**

修改 `plugins/zhao-wealth/server/src/services/nav-calculator.ts` 的 `calculateMoneyFundSnapshot`（93-136 行），将 periods 数组替换为 8 期限，并移除快照初始对象中写死的 `annual1d: null / annual3d: null / annual2w: null`（由循环统一赋值）：

```typescript
  async calculateMoneyFundSnapshot(productId: number, snapshotDate: Date) {
    const periods = [
      { field: 'annual1d', days: 1 },
      { field: 'annual3d', days: 3 },
      { field: 'annual7d', days: 7 },
      { field: 'annual2w', days: 14 },
      { field: 'annual1m', days: 30 },
      { field: 'annual3m', days: 90 },
      { field: 'annual6m', days: 180 },
      { field: 'annual1y', days: 365 },
    ];

    const snapshot: any = {
      product: productId,
      snapshotDate,
      isEstimate: false,
    };

    for (const period of periods) {
      const startDate = new Date(snapshotDate);
      startDate.setDate(startDate.getDate() - period.days);

      const incomes = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findMany({
        where: {
          product: productId,
          incomeDate: { $gte: toDateStr(startDate), $lte: toDateStr(snapshotDate) },
        },
      });

      if (incomes.length < period.days) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 货基${productId}周期${period.field}收益数据不足`);
        continue;
      }

      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const annualReturn = calculateMoneyFundAnnual(totalIncome, period.days);

      snapshot[period.field] = annualReturn;
    }

    return snapshot;
  },
```

注意：函数体其余部分（快照初始对象仅保留 product/snapshotDate/isEstimate，移除 `annual1d: null, annual3d: null, annual2w: null` 三行）与注释 `// 缺失日期填充0` 之后的逻辑不变。

- [ ] **Step 4: 运行测试确认通过**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/nav-calculator.test.ts
```
Expected: 6 个用例全部 PASS（3 既有 + 3 新增）。

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts plugins/zhao-wealth/server/src/__tests__/nav-calculator.test.ts
git commit -m "feat(zhao-wealth): 货币型年化快照补齐 1日/3日/2周 期限（8 期限全覆盖）"
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
Select-String -Path plugins/zhao-wealth/dist/server/index.mjs -Pattern "annual2w|annual1d" | Measure-Object | Select-Object Count
```
Expected: Count >= 2（命中）。若为 0，回到 Task 1 Step 3 检查。

- [ ] **Step 3: 提交 dist 并推送**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist，含货币型 8 期限年化"
git push origin main
```
Expected: push 成功。

---

### Task 3: 后端部署 + 产品3 类型修正 + 重算验证（joho）

**Files:**
- Deploy: joho 服务器（SSH 别名 `joho`，strapi 目录 `/www/apps/strapi`）

- [ ] **Step 1: 部署（git pull + 重启）**

Windows PowerShell 传含引号命令会被剥引号，用 base64 编码远程脚本：

```powershell
$cmd = "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:`$PATH; export PM2_HOME=/home/admin/.pm2; pm2 restart strapi"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: git pull 拉到 Task 2 最新提交；pm2 restart 成功。

- [ ] **Step 2: 产品3 类型修正（bank-wealth → money-fund）**

```powershell
$cmd = @'
cd /www/apps/strapi
DBPASS=$(grep -oP "(?<=^DATABASE_PASSWORD=).*" .env)
DBUSER=$(grep -oP "(?<=^DATABASE_USERNAME=).*" .env)
DBNAME=$(grep -oP "(?<=^DATABASE_NAME=).*" .env)
docker exec -e PGPASSWORD=$DBPASS 1Panel-postgresql-pIe0 psql -U $DBUSER -d $DBNAME -c "UPDATE wealth_products SET product_type = 'money-fund' WHERE id = 3 RETURNING id, product_type;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: `RETURNING` 输出 `3|money-fund`。

- [ ] **Step 3: 触发产品3 年化重算**

等待 strapi 启动（约 20 秒）。admin 登录凭据在服务器 `/www/apps/strapi/.env` 或本地 basic 仓库 `.env` 中获取（EMAIL/PASSWORD 字段）。若凭据不可得，改用 bull 入队方式（参照既有 `collect.recalculate` 的队列 job，或直接调用 strapi 服务 `nav-calculator.recalculateSnapshots(3, '2026-08-27', '2026-09-13')`——实现时选择已验证可用的方式）。成功后确认日志出现年化重算完成：

```powershell
$cmd = "pm2 logs strapi --lines 30 --nostream 2>/dev/null | grep -E '年化|annual' | tail -5"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 出现产品3 年化快照重算完成的日志。

- [ ] **Step 4: 验证产品3 年化快照字段（核心验证）**

```powershell
$cmd = @'
cd /www/apps/strapi
DBPASS=$(grep -oP "(?<=^DATABASE_PASSWORD=).*" .env)
DBUSER=$(grep -oP "(?<=^DATABASE_USERNAME=).*" .env)
DBNAME=$(grep -oP "(?<=^DATABASE_NAME=).*" .env)
docker exec -e PGPASSWORD=$DBPASS 1Panel-postgresql-pIe0 psql -U $DBUSER -d $DBNAME -c "SELECT snapshot_date, annual1d, annual3d, annual7d, annual2w, annual1m FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk lnk ON lnk.wealth_annual_snapshot_id = s.id WHERE lnk.wealth_product_id = 3 ORDER BY snapshot_date DESC LIMIT 3;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 最新快照 `annual1d` 非 null（≈0.018）、`annual3d`/`annual7d`/`annual2w` 有值、`annual1m` 为 null（待积累）。若 1d 也为 null（当日万份收益为 0 的记录导致窗口不足判定），至少 7d/2w 必须有值，且 1m 保持 null。

---

### Task 4: C 端详情页三处提示 + 构建部署（strapi-wealth → v.joho.cn/wealth）

**Files:**
- Modify: `E:\code\strapi-wealth\pages\detail\index.vue`

- [ ] **Step 1: 新增 isMoneyFund 计算属性**

在 `<script setup lang="ts">` 中 `product` ref 定义之后（约 356 行附近）新增：

```typescript
const isMoneyFund = computed(() => product.value?.productType === 'money-fund')
```
确认 `product` 是 `ref`（模板中使用 `product.productName`，脚本中为 `product.value`），`computed` 已在 vue import 中（现有 import 已含）。

- [ ] **Step 2: 产品卡片加"现金管理类"标识**

修改产品信息卡片头部（模板 8-11 行），在 `product-name` 与 `RiskTag` 之间插入：

```html
        <view class="product-head">
          <text class="product-name">{{ product.productName }}</text>
          <view v-if="isMoneyFund" class="money-fund-badge">现金管理类</view>
          <RiskTag :level="product.riskLevel" />
        </view>
```

- [ ] **Step 3: 年化计算说明弹窗补充净值恒 1 原因**

修改弹窗 explain-warn 区（300 行），在其后追加：

```html
          <view class="explain-warn">货币基金按万份收益单利折算年化，与净值复利口径不同。</view>
          <view v-if="isMoneyFund" class="explain-warn">本产品为现金管理类，净值恒为 1，收益体现于万份收益/七日年化。</view>
```

- [ ] **Step 4: 净值走势图区 + 净值表区提示文案**

净值走势图 card（137 行 `section-title` 后）插入：

```html
        <view class="section-title">净值走势</view>
        <view v-if="isMoneyFund" class="nav-flat-tip">本产品为现金管理类，净值恒为 1，走势为水平线属正常现象，收益体现于万份收益/七日年化。</view>
```

净值表 card（177-181 行 toggle 标题后）插入：

```html
        <view class="section-title toggle" @click="navOpen = !navOpen">
          <text>净值表（最近10条）</text>
          <text class="toggle-arrow">{{ navOpen ? '收起 ▴' : '展开 ▾' }}</text>
        </view>
        <view v-if="isMoneyFund" class="nav-flat-tip">本产品为现金管理类，净值恒为 1，收益体现于万份收益/七日年化。</view>
```

- [ ] **Step 5: 新增样式**

在 `<style>` 区（找到 `.nav-source-tip` 或 `.explain-warn` 样式附近）新增：

```css
.money-fund-badge {
  align-self: center;
  margin-left: 12rpx;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #ffffff;
  background: linear-gradient(90deg, #7c4dff, #9d5cff);
  border-radius: 20rpx;
}
.nav-flat-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a7ab5;
  line-height: 1.5;
}
```

- [ ] **Step 6: 本地构建**

Run（在 `E:\code\strapi-wealth` 目录下）:
```
npm run build:h5
```
Expected: 生成 `dist\build\h5\index.html` 与 assets。

- [ ] **Step 7: 提交**

```bash
git add pages/detail/index.vue
git commit -m "feat(wealth-fe): 货币型产品净值恒1提示（卡片标识/弹窗说明/净值区文案）"
git push origin wealth-line
```

- [ ] **Step 8: 部署到 v.joho.cn/wealth**

Run（在 `E:\code\strapi-wealth` 目录下）:
```
powershell -File deploy-wealth.ps1
```
Expected: 输出 `SYNC_OK` 与 `部署完成: https://v.joho.cn/wealth/`。

- [ ] **Step 9: 线上验证**

```powershell
$cmd = "curl -s -o /dev/null -w '%{http_code}' https://v.joho.cn/wealth/index.html"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 200。打开 `https://v.joho.cn/wealth/#/pages/detail/index?id=3`（若路由为 hash 模式）人工复核三处提示与年化 tab 数值（1日/3日/7日/2周 有值，1月显示 `--`）。

---

## Self-Review

**1. Spec coverage:**
- §4.1 数据修正（类型 SQL）→ Task 3 Step 2 ✓
- §4.2 货币型 8 期限补齐 → Task 1 ✓
- §4.3 重算与验证 → Task 3 Step 3/4 ✓
- §4.4 合规（弹窗口径说明）→ Task 4 Step 3（"历史业绩不预示未来收益"已存在于 110/114 行，无需新增）✓
- §4.5 C 端三处提示 → Task 4 Step 2/3/4 ✓
- §5 测试 → Task 1 Step 1-4 ✓
- §6 部署（basic + strapi-wealth）→ Task 2/3/4 ✓
- §7 不做项 → 计划未涉及 ✓

**2. Placeholder scan:** 无 TBD/TODO；Task 3 Step 3 的触发方式注明"实现时选择已验证可用的方式"（admin API 或 bull 入队），非计划缺口，两种路径均已给出。

**3. Type consistency:** `annual1d/3d/7d/2w/1m/3m/6m/1y` 字段名与 schema 及既有代码一致；`calculateMoneyFundAnnual(totalIncome, days)` 签名与 utils 定义一致；`isMoneyFund` 计算属性在模板三处引用一致；测试断言数值 `0.01825`（0.5×365/10000）与 `0.0219`（(0.5+0.7+0.6)/3×365/10000）经核算一致。
