# 货币型产品收益数据采集链路修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-wealth 队列采集路径，让货币型产品的万份收益/七日年化正确写入 `wealth_money_incomes` 表，并部署补采幸福99 历史收益数据。

**Architecture:** 在 `jobs/collect-job.ts` 的 `processNavData` 中，参照同步降级路径 `collectNavSync`（`controllers/collect.ts` 96-133 行已实现）补齐收益写库：对每条净值记录拆分 `tenThousandIncome`/`sevenDayAnnualized` 字段，按 `product + incomeDate` upsert 到 `wealth-money-income`。净值保存判定（双条件去重）保持不变，收益写库独立于净值的 insert/update/skip。

**Tech Stack:** Strapi v5 插件（zhao-wealth）、TypeScript、Jest（插件测试）、Bull（Redis 队列）

**Spec:** `docs/superpowers/specs/2026-09-14-money-income-collect-fix-design.md`

---

## File Structure

- Modify: `plugins/zhao-wealth/server/src/jobs/collect-job.ts` — `processNavData` 增加收益字段拆分与 `wealth-money-income` upsert
- Test: `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts` — 新增 5 个收益写库用例，mock 增加 income 查询
- Build: `plugins/zhao-wealth/dist/` — `npm run build` 产物（部署铁律：必须重建并提交）
- Deploy: joho 服务器 `git pull` + `pm2 restart strapi`

---

### Task 1: processNavData 收益写库（TDD）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/jobs/collect-job.ts`（`processNavData` 函数，14-44 行）
- Test: `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts`

- [ ] **Step 1: 更新测试文件 — mock 增加 income 查询注册**

在 `__tests__/collect-job.test.ts` 的 `beforeEach` 中增加 `incomeQuery`，并注册到 `mockStrapi.db.query` 的 uid 分支：

```typescript
beforeEach(() => {
  navQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
  snapshotQuery = { delete: jest.fn() };
  metricQuery = { delete: jest.fn() };
  incomeQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
  mockStrapi = {
    db: {
      query: jest.fn((uid: string) => {
        if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
        if (uid === 'plugin::zhao-wealth.wealth-annual-snapshot') return snapshotQuery;
        if (uid === 'plugin::zhao-wealth.wealth-risk-metric') return metricQuery;
        if (uid === 'plugin::zhao-wealth.wealth-money-income') return incomeQuery;
        throw new Error(`unexpected uid: ${uid}`);
      }),
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
});
```

同时在 describe 顶部声明 `let incomeQuery: any;`（放在 `let metricQuery: any;` 之后）。

- [ ] **Step 2: 新增 5 个收益写库测试用例**

在 `collect-job.test.ts` 末尾（最后一个 `it` 之后、describe 闭合之前）追加：

```typescript
it('新日期且带收益字段 → 净值 create + 收益 create', async () => {
  navQuery.findOne.mockResolvedValue(null);
  incomeQuery.findOne.mockResolvedValue(null);
  const processNavData = getProcessNavData();

  const result = await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.0, accNav: 1.0, tenThousandIncome: '0.4876', sevenDayAnnualized: '0.0188', dataSource: 'crawler' },
  ]);

  expect(navQuery.create).toHaveBeenCalledTimes(1);
  expect(incomeQuery.create).toHaveBeenCalledTimes(1);
  expect(incomeQuery.create).toHaveBeenCalledWith({
    data: {
      product: 1,
      incomeDate: d(1),
      tenThousandIncome: 0.4876,
      sevenDayAnnual: 0.0188,
      dataSource: 'crawler',
    },
  });
  expect(result).toEqual({ insertCount: 1, updateCount: 0, updatedDates: [] });
});

it('同日期同净值但收益变化 → 净值跳过 + 收益 update', async () => {
  navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.0, accNav: 1.0 });
  incomeQuery.findOne.mockResolvedValue({ id: 20 });
  const processNavData = getProcessNavData();

  const result = await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.0, accNav: 1.0, tenThousandIncome: '0.5123', sevenDayAnnualized: '0.0199', dataSource: 'crawler' },
  ]);

  expect(navQuery.update).not.toHaveBeenCalled();
  expect(incomeQuery.create).not.toHaveBeenCalled();
  expect(incomeQuery.update).toHaveBeenCalledWith({
    where: { id: 20 },
    data: {
      incomeDate: d(1),
      tenThousandIncome: 0.5123,
      sevenDayAnnual: 0.0199,
      dataSource: 'crawler',
    },
  });
  expect(result).toEqual({ insertCount: 0, updateCount: 0, updatedDates: [] });
});

it('同日期不同净值且带收益 → 净值 update + 收益 update', async () => {
  navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.0, accNav: 1.0 });
  incomeQuery.findOne.mockResolvedValue({ id: 20 });
  const processNavData = getProcessNavData();

  const result = await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.02, accNav: 1.02, tenThousandIncome: '0.5123', sevenDayAnnualized: '0.0199', dataSource: 'crawler' },
  ]);

  expect(navQuery.update).toHaveBeenCalledTimes(1);
  expect(incomeQuery.update).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ insertCount: 0, updateCount: 1, updatedDates: [d(1)] });
});

it('无收益字段 → 不写 income 表', async () => {
  navQuery.findOne.mockResolvedValue(null);
  const processNavData = getProcessNavData();

  const result = await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.01, accNav: 1.01, dataSource: 'crawler' },
  ]);

  expect(incomeQuery.findOne).not.toHaveBeenCalled();
  expect(incomeQuery.create).not.toHaveBeenCalled();
  expect(incomeQuery.update).not.toHaveBeenCalled();
  expect(result).toEqual({ insertCount: 1, updateCount: 0, updatedDates: [] });
});

it('仅有一个收益字段 → 仍写 income，另一字段为 null', async () => {
  navQuery.findOne.mockResolvedValue(null);
  incomeQuery.findOne.mockResolvedValue(null);
  const processNavData = getProcessNavData();

  await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.0, tenThousandIncome: '0.4876', dataSource: 'crawler' },
  ]);

  expect(incomeQuery.create).toHaveBeenCalledWith({
    data: {
      product: 1,
      incomeDate: d(1),
      tenThousandIncome: 0.4876,
      sevenDayAnnual: null,
      dataSource: 'crawler',
    },
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/collect-job.test.ts
```
Expected: 5 个新用例 FAIL（`incomeQuery is not defined` 或 `unexpected uid: plugin::zhao-wealth.wealth-money-income`），既有 5 个用例 PASS。

- [ ] **Step 4: 实现 processNavData 收益写库**

修改 `plugins/zhao-wealth/server/src/jobs/collect-job.ts`，将 `processNavData`（14-44 行）整体替换为：

```typescript
export async function processNavData(strapi: any, productId: number, navData: any[]) {
  let insertCount = 0;
  let updateCount = 0;
  const updatedDates: string[] = [];

  for (const nav of navData) {
    const { tenThousandIncome, sevenDayAnnualized, ...navOnly } = nav;

    const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: productId, navDate: nav.navDate },
    });

    if (!existing) {
      await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
        data: { product: productId, ...navOnly },
      });
      insertCount++;
    } else if (Number(existing.unitNav) !== Number(nav.unitNav)) {
      await strapi.db.query('plugin::zhao-wealth.wealth-nav').update({
        where: { id: existing.id },
        data: {
          unitNav: nav.unitNav,
          accNav: nav.accNav ?? existing.accNav,
          dataSource: nav.dataSource ?? existing.dataSource,
        },
      });
      updateCount++;
      updatedDates.push(nav.navDate);
    }

    // 货币型产品收益（万份收益/七日年化）写入独立表，独立于净值判定
    if (tenThousandIncome != null || sevenDayAnnualized != null) {
      const existingIncome = await strapi.db.query('plugin::zhao-wealth.wealth-money-income').findOne({
        where: { product: productId, incomeDate: nav.navDate },
      });
      const incomeData = {
        incomeDate: nav.navDate,
        tenThousandIncome: tenThousandIncome != null ? Number(tenThousandIncome) : null,
        sevenDayAnnual: sevenDayAnnualized != null ? Number(sevenDayAnnualized) : null,
        dataSource: 'crawler',
      };
      if (existingIncome) {
        await strapi.db.query('plugin::zhao-wealth.wealth-money-income').update({
          where: { id: existingIncome.id },
          data: incomeData,
        });
      } else {
        await strapi.db.query('plugin::zhao-wealth.wealth-money-income').create({
          data: { product: productId, ...incomeData },
        });
      }
    }
  }

  return { insertCount, updateCount, updatedDates };
}
```

注意：收益字段显式拆分，`navOnly` 不再携带 `tenThousandIncome`/`sevenDayAnnualized`（`wealth-nav` schema 无此字段，原先会被静默丢弃，现在显式排除，行为等价）。

- [ ] **Step 5: 运行测试确认通过**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run test -- __tests__/collect-job.test.ts
```
Expected: 10 个用例全部 PASS（5 既有 + 5 新增）。若全量测试有其他套件既有失败（如 holding-service/controllers 引用不存在模块），与本次改动无关，只需本文件 10 个用例通过。

- [ ] **Step 6: 提交**

```bash
git add plugins/zhao-wealth/server/src/jobs/collect-job.ts plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts
git commit -m "fix(zhao-wealth): processNavData 写入货币型产品收益（万份收益/七日年化）到 money-incomes"
```

---

### Task 2: 重建 dist 并推送

**Files:**
- Build: `plugins/zhao-wealth/dist/`（构建产物）

- [ ] **Step 1: 重建插件 dist**

Run（在 `plugins/zhao-wealth` 目录下）:
```
npm run build
```
Expected: `dist/server/index.mjs` 重新生成。

- [ ] **Step 2: 自检 dist 含新逻辑**

```powershell
Select-String -Path plugins/zhao-wealth/dist/server/index.mjs -Pattern "wealth-money-income" | Measure-Object | Select-Object Count
```
Expected: Count >= 1（命中）。若为 0，说明构建未包含新代码，回到 Task 1 Step 4 检查。

- [ ] **Step 3: 提交 dist 并推送**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist，含货币型收益写库"
git push origin main
```
Expected: push 成功，`origin/main` 指向新提交。

---

### Task 3: 生产部署与补采验证（joho）

**Files:**
- Deploy: joho 服务器（SSH 别名 `joho`，Strapi 目录 `/www/apps/strapi`）

- [ ] **Step 1: 部署（git pull + 重启）**

在服务器执行（Windows PowerShell 传含引号命令会被剥引号，用 base64 编码远程脚本）：

```powershell
$cmd = "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:`$PATH; export PM2_HOME=/home/admin/.pm2; pm2 restart strapi"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: git pull 拉到 Task 2 的最新提交；pm2 restart strapi 成功。

- [ ] **Step 2: 自检线上 dist 含收益写库**

```powershell
$cmd = "grep -c 'wealth-money-income' /www/apps/strapi/plugins/zhao-wealth/dist/server/index.mjs"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 输出 >= 1。

- [ ] **Step 3: 触发产品3 采集（补采收益）**

等待 strapi 启动（约 20 秒），然后调用采集触发接口。Strapi admin 登录凭据需从服务器 `.env` 或既有 token 获取；若无法获取登录态，可改为直接等定时任务（20:00 全量采集）执行后验证。获取到 token 后：

```powershell
$cmd = @'
TOKEN=$(curl -s -X POST http://localhost:1337/admin/login -H 'Content-Type: application/json' -d '{"email":"<EMAIL>","password":"<PASS>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
curl -s -X POST http://localhost:1337/api/zhao-wealth/v1/admin/collect/trigger -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"productId":3}'
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 返回成功响应，日志出现 `产品3采集成功，新增X条，更新Y条（共17条）`。

- [ ] **Step 4: 验证 money_incomes 落库**

```powershell
$cmd = @'
cd /www/apps/strapi
DBPASS=$(grep -oP "(?<=^DATABASE_PASSWORD=).*" .env)
DBUSER=$(grep -oP "(?<=^DATABASE_USERNAME=).*" .env)
DBNAME=$(grep -oP "(?<=^DATABASE_NAME=).*" .env)
PSQL="docker exec -e PGPASSWORD=$DBPASS 1Panel-postgresql-pIe0 psql -U $DBUSER -d $DBNAME -t -A -F|"
$PSQL -c "SELECT lnk.wealth_product_id, COUNT(*), MAX(m.income_date) FROM wealth_money_incomes m JOIN wealth_money_incomes_product_lnk lnk ON lnk.wealth_money_income_id = m.id GROUP BY lnk.wealth_product_id ORDER BY 1;"
$PSQL -c "SELECT m.income_date, m.ten_thousand_income, m.seven_day_annual FROM wealth_money_incomes m JOIN wealth_money_incomes_product_lnk lnk ON lnk.wealth_money_income_id = m.id WHERE lnk.wealth_product_id = 3 ORDER BY m.income_date DESC LIMIT 3;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 产品3 有 17 条收益记录，最新 income_date = 2026-09-13，`ten_thousand_income=0.4876`、`seven_day_annual=0.0188`。

- [ ] **Step 5: 验证既有净值未受影响**

```powershell
$cmd = "docker exec -e PGPASSWORD=`$(grep -oP '(?<=^DATABASE_PASSWORD=).*' /www/apps/strapi/.env) 1Panel-postgresql-pIe0 psql -U `$(grep -oP '(?<=^DATABASE_USERNAME=).*' /www/apps/strapi/.env) -d `$(grep -oP '(?<=^DATABASE_NAME=).*' /www/apps/strapi/.env) -t -A -c \"SELECT COUNT(*), MAX(nav_date) FROM wealth_navs n JOIN wealth_navs_product_lnk lnk ON lnk.wealth_nav_id = n.id WHERE lnk.wealth_product_id = 3;\""
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```
Expected: 产品3 净值仍为 17 条、最新 2026-09-13（采集未破坏既有数据）。

---

## Self-Review

**1. Spec coverage:**
- §3.1 processNavData 拆分收益字段 → Task 1 Step 4 ✓
- §3.2 收益写库独立于净值判定、计数不变 → Task 1 Step 4 + Step 2 测试用例（同日期同净值但收益变化 → 收益 update 且计数不变）✓
- §3.3 补采历史 → Task 3 Step 3/4 ✓
- §4 测试 5 用例 → Task 1 Step 2 ✓
- §5 不做项（类型标注/监察展示）→ 计划未涉及 ✓
- §6 部署 → Task 2 + Task 3 ✓

**2. Placeholder scan:** 无 TBD/TODO；Task 3 Step 3 的 `<EMAIL>`/`<PASS>` 为执行时从服务器 .env 读取的占位说明（已注明来源），非计划缺口。

**3. Type consistency:** `processNavData` 返回类型 `{ insertCount, updateCount, updatedDates }` 不变；`incomeData` 字段名（incomeDate/tenThousandIncome/sevenDayAnnual/dataSource）与 `wealth-money-income` schema 一致；测试断言与实现一致。`d(day)` 辅助函数在既有测试中已定义，新用例复用。
