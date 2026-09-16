# 财富 4 任务实施计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 4 个财富模块任务：① 评分榜单先排序后分页（晨夕盈21 上榜）+ 净值走势 6 位小数；② 年化快照 578 个重复日期清理 + 产品级锁防复发；③ 09-16 风险指标（rankPercentile/sharpe）补缺验证；④ C 端三页走查与残留修复。

**Architecture:** 任务 1a 是纯排序逻辑修复（scoring-service.getScoreLeaderboard 先全量取产品→评分→排序→切片）；任务 2 在 nav-calculator 两处写入段加产品级 Redis 锁（复用 acquireLock/releaseLock），清理存量重复 SQL；任务 3 为数据触发+验证（触发链已存在，collect-job.ts 191-192 行）；任务 4 走查产出问题清单再修。

**Tech Stack:** TypeScript / Jest / BullMQ（Redis）/ PostgreSQL（生产）/ uni-app（C 端）

**Spec:** `docs/superpowers/specs/2026-09-16-wealth-4tasks-design.md`

---

### Task 1: 榜单排序修复 + 净值精度（后端 TDD + 前端）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts`（getScoreLeaderboard 分页逻辑）
- Test: `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts`
- Modify: `pages/detail/index.vue`（strapi-wealth 仓库，toFixed(4)→(6)）

- [ ] **Step 1: 写失败测试——分页边界外的最高分产品必须上榜**

在 `scoring-service.test.ts` 顶部 mock 区（第 14-22 行）增加两个 mock：

```typescript
  const mockProductFindMany = jest.fn();
  const mockProductCount = jest.fn();
```

并在 mockQuery 的 wealth-product 分支追加：

```typescript
    if (name === 'plugin::zhao-wealth.wealth-product') return { findOne: mockProductFindOne, findMany: mockProductFindMany, count: mockProductCount };
```

文件末尾追加用例（`it('config 含按类型收益标尺...')` 之前的 describe 内任意位置插入均可，放在最后一个 `});` 之前）：

```typescript
  it('榜单：分页边界外的最高分产品必须上榜', async () => {
    const products = [1, 2, 3, 4, 5, 6].map((id) => ({
      id, productType: 'bank-wealth', operationMode: 'open', status: true, recommendWeight: 0,
    }));
    mockProductFindMany.mockResolvedValue(products);
    mockProductCount.mockResolvedValue(6);
    // 评分快照只覆盖前 5 个产品（产品 6 无快照 → 走实时计算，得分最高）
    mockScoreFindMany.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => ({ product: { id }, snapshotDate: '2026-09-16', period: 'm1', compositeScore: 60 + id }))
    );
    mockProductFindOne.mockResolvedValue({ id: 6, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.02 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const board = await service.getScoreLeaderboard({ pageSize: 5 });
    expect(board.records.length).toBe(5);
    expect(board.records[0].id).toBe(6); // 最高分产品必须排第一
    expect(board.total).toBe(6);
  });
```

注：产品 6 实时计算得分为 `returnScore=70（0.02/0.05→50+20）`、`volatility=90、drawdown=100`、`composite=70×.5+90×.25+100×.25=82.5→83`，高于快照分 65，故 records[0].id===6。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 新用例失败——当前实现分页取前 5 个产品（1-5），产品 6 不在 records 中（`records[0].id` 为 1 而非 6）。

- [ ] **Step 3: 修复 getScoreLeaderboard——先全量取产品再评分排序后切片**

`plugins/zhao-wealth/server/src/services/scoring-service.ts` 第 263-272 行，将：

```typescript
    const limit = Math.min(pageSize, 50);
    const offset = (page - 1) * limit;

    const products = await productQuery.findMany({
      where,
      limit,
      offset,
      orderBy: { recommendWeight: 'desc' },
      populate: ['company'],
    });
```

改为：

```typescript
    const limit = Math.min(pageSize, 50);
    const offset = (page - 1) * limit;

    // 全量取上架产品（数量小），评分组装后再排序切片，避免 recommendWeight 分页把高分产品挤出榜单
    const products = await productQuery.findMany({
      where,
      limit: 500,
      orderBy: { recommendWeight: 'desc' },
      populate: ['company'],
    });
```

第 338 行，将：

```typescript
    return { records, total, page, pageSize: limit };
```

改为：

```typescript
    return { records: records.slice(offset, offset + limit), total, page, pageSize: limit };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 全部通过（新增用例 records[0].id===6，total===6）。

- [ ] **Step 5: 提交后端修复**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "fix(zhao-wealth): 评分榜单先评分排序再分页（修复高分产品被 recommendWeight 分页挤出）"
```

- [ ] **Step 6: 前端净值精度——toFixed(4) → toFixed(6)**

C 端仓库 `e:\code\strapi-wealth`（当前分支应为 wealth-line），先定位：

Run: `cd e:\code\strapi-wealth && rg -n "toFixed\(4\)" pages/detail/index.vue`

Expected: 3 处命中（走势图 Y 轴 max/min 标签、趋势图最低/最高净值文字）。

将 3 处 `toFixed(4)` 全部改为 `toFixed(6)`（示例——以实际命中行的上下文为准）：

```typescript
      // 修改前
      max: this.navTrend.max.toFixed(4),
      min: this.navTrend.min.toFixed(4),
      // 修改后
      max: this.navTrend.max.toFixed(6),
      min: this.navTrend.min.toFixed(6),
```

同时检查趋势图下方"最低净值/最高净值"文字区（约 `最低 {{ navTrend.min.toFixed(4) }}`），同样改 6 位。改完运行 `rg -n "toFixed\(4\)" pages/detail/index.vue` 确认 0 命中。

- [ ] **Step 7: 提交前端修复**

```bash
cd e:\code\strapi-wealth
git add pages/detail/index.vue
git commit -m "fix(wealth): 净值走势数值保留 6 位小数（修复净值变动不可见）"
```

---

### Task 2: 年化快照去重（存量清理 + 产品级锁）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/services/nav-calculator.ts`（recalculateSnapshots / recalculateMissing 加锁）
- 数据：生产 PostgreSQL（备份 + 清理 SQL）
- Test: 复用现有测试（nav-calculator 相关测试若存在则补充锁行为用例；无则跳过，以全量测试回归为准）

- [ ] **Step 1: 备份 + 统计存量重复（生产）**

Run（本机 PowerShell → joho）：

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
$PSQL -c "CREATE TABLE IF NOT EXISTS wealth_annual_snapshots_bak_20260916 AS SELECT * FROM wealth_annual_snapshots;"
$PSQL -c "CREATE TABLE IF NOT EXISTS wealth_annual_snapshots_lnk_bak_20260916 AS SELECT * FROM wealth_annual_snapshots_product_lnk;"
$PSQL -c "SELECT count(*) dup_dates FROM (SELECT l.wealth_product_id,s.snapshot_date FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id GROUP BY 1,2 HAVING count(*)>1) t;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: dup_dates = 578（与 2026-09-16 诊断一致）。

- [ ] **Step 2: 清理重复（保留每 product+date 最小 id）**

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
$PSQL -c "DELETE FROM wealth_annual_snapshots_product_lnk WHERE wealth_annual_snapshot_id IN (SELECT s.id FROM wealth_annual_snapshots s JOIN (SELECT l.wealth_product_id pid,s.snapshot_date,min(s.id) keep_id FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id GROUP BY 1,2 HAVING count(*)>1) d ON d.pid=(SELECT l2.wealth_product_id FROM wealth_annual_snapshots_product_lnk l2 WHERE l2.wealth_annual_snapshot_id=s.id) AND d.snapshot_date=s.snapshot_date AND d.keep_id<>s.id);"
$PSQL -c "DELETE FROM wealth_annual_snapshots WHERE id IN (SELECT s.id FROM wealth_annual_snapshots s JOIN (SELECT l.wealth_product_id pid,s.snapshot_date,min(s.id) keep_id FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id GROUP BY 1,2 HAVING count(*)>1) d ON d.pid=(SELECT l2.wealth_product_id FROM wealth_annual_snapshots_product_lnk l2 WHERE l2.wealth_annual_snapshot_id=s.id) AND d.snapshot_date=s.snapshot_date AND d.keep_id<>s.id);"
$PSQL -c "SELECT count(*) dup_dates FROM (SELECT l.wealth_product_id,s.snapshot_date FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id GROUP BY 1,2 HAVING count(*)>1) t;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 两条 DELETE 成功，dup_dates 变 0。（DELETE 子查询在 PG 中允许引用同表；若报 "cannot delete from table ... because it is referenced" 则先删 lnk 再删主表——上面顺序已保证。）

- [ ] **Step 3: nav-calculator 加产品级锁（recalculateMissing）**

`plugins/zhao-wealth/server/src/services/nav-calculator.ts` 顶部导入锁工具：

```typescript
import { acquireLock, releaseLock } from '../utils';
```

将 `recalculateMissing` 方法体（第 205-232 行）改为（关键：`existingSnapshots` 查询移入锁内重查）：

```typescript
    for (const product of products) {
      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: { product: product.id },
        select: ['navDate'],
        orderBy: { navDate: 'asc' },
      });

      if (navs.length === 0) continue;

      // 产品级锁：多 job 并发（采集触发/定时重算）时串行写入，防止同 product+date 重复
      const lockKey = `wealth:annual-snapshot:${product.id}`;
      const acquired = await acquireLock(lockKey, 600);
      if (!acquired) {
        strapi.log.warn(`[zhao-wealth] 产品${product.id}年化快照补缺已在执行中，跳过`);
        continue;
      }

      try {
        const existingSnapshots = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
          where: { product: product.id },
          select: ['snapshotDate'],
        });

        const existingDates = new Set(existingSnapshots.map((s: any) => toDateStr(s.snapshotDate)));
        const missingDates = navs.map((n: any) => toDateStr(n.navDate)).filter((dateStr: string) => !existingDates.has(dateStr));

        let calculated = 0;
        for (const dateStr of missingDates) {
          const snapshot = await this.calculateSnapshot(product.id, new Date(dateStr));
          if (snapshot) {
            await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
            calculated++;
          }
        }

        results.push({ productId: product.id, missingDates: missingDates.length, calculated });
      } finally {
        await releaseLock(lockKey);
      }
    }
```

- [ ] **Step 4: nav-calculator 加产品级锁（recalculateSnapshots）**

将 `recalculateSnapshots` 的写入段（第 150-167 行）改为：

```typescript
    for (const nav of navs) {
      const snapshot = await this.calculateSnapshot(productId, nav.navDate);

      if (snapshot) {
        const lockKey = `wealth:annual-snapshot:${productId}`;
        const acquired = await acquireLock(lockKey, 600);
        if (!acquired) {
          strapi.log.warn(`[zhao-wealth] 产品${productId}年化快照重算已在执行中，跳过${toDateStr(nav.navDate)}`);
          continue;
        }
        try {
          // 更新或创建快照（锁内 findOne 重查，避免并发双 create）
          const existing = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
            where: { product: productId, snapshotDate: toDateStr(nav.navDate) },
          });

          if (existing) {
            await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').update({
              where: { id: existing.id },
              data: snapshot,
            });
          } else {
            await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').create({ data: snapshot });
          }
        } finally {
          await releaseLock(lockKey);
        }
      }
    }
```

- [ ] **Step 5: 全量测试回归**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 全部通过（锁逻辑不改变已有行为，仅串行化；若 nav-calculator 有单测且 mock 了 utils 锁函数，则需同步 mock `acquireLock` 返回 true）。

- [ ] **Step 6: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/services/nav-calculator.ts
git commit -m "fix(zhao-wealth): 年化快照写入加产品级锁，防止并发重复"
```

- [ ] **Step 7: 重建 dist 并自检**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`

Expected: 构建成功。

Run: `rg -l "wealth:annual-snapshot" dist/server`

Expected: 命中 `dist/server/index.js`（锁 key 进入产物）。

---

### Task 3: 09-16 风险指标补缺验证

**Files:**
- 数据：生产 PostgreSQL + 触发现有补缺接口
- 代码检查：collect-job.ts 触发链（已确认存在，191-192 行，无需改动；若验证异常再修）

- [ ] **Step 1: 检查当日净值/快照齐备性（判断根因归属）**

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c"
$PSQL "SELECT n.product, max(n.nav_date) last_nav FROM wealth_navs n GROUP BY 1 ORDER BY 1;"
$PSQL "SELECT l.wealth_product_id, max(s.snapshot_date) last_snap FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id GROUP BY 1 ORDER BY 1;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 记录各产品最新净值日期与最新快照日期。

- [ ] **Step 2: 触发全量风险指标补缺（两阶段：先补快照再算指标）**

获取 admin jwt（zhao-auth `POST /api/zhao-auth/v1/admin/auth/local`，identifier=admin, password=Admin@12345），然后：

```powershell
$cmd = @'
JWT="PASTE_JWT_HERE"
curl -s -X POST http://127.0.0.1:1337/api/zhao-wealth/v1/admin/recalculate-risk-metric -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"type":"all"}'
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 返回补缺统计（各产品 missingDates 数）。

- [ ] **Step 3: 验证 09-16 rankPercentile/sharpe**

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c"
$PSQL "SELECT l.wealth_product_id pid,s.metric_name,count(*) FILTER (WHERE s.metric_value IS NOT NULL) nonnull FROM wealth_risk_metrics s JOIN wealth_risk_metrics_product_lnk l ON l.wealth_risk_metric_id=s.id WHERE s.snapshot_date='2026-09-16' AND s.period='m1' GROUP BY 1,2 ORDER BY 1,2;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected 分两种情况判断：
- 若 09-16 有净值的产品 sharpe 非空、且同日 ≥2 产品有快照时 rankPercentile 非空 → **根因=时序竞态，已通过补缺自愈**，任务完成
- 若补缺后仍全 null → 检查：
  1. 09-16 各产品净值是否存在（Step 1 结果）：净值缺失的产品属**数据源未更新**（模型预期，非 bug）
  2. 若净值齐但快照缺 → 排查 `recalculate-risk-metric` 接口是否先补快照（risk-metric-service.recalculateMissing 两阶段已确认存在，检查该接口路由是否走同一 service）
  3. 修复后重跑 Step 2

- [ ] **Step 4: 汇总根因结论并记录到计划附录**

无论自愈还是修复，将根因与验证数据追加到本计划文件末尾的「验证记录」节（若后续需要可在实施后更新 spec）。

---

### Task 4: C 端三页走查 + 残留修复

**Files:**
- 走查目标：`https://v.joho.cn/wealth/#/`（hall）、`/pages/detail/index?id=4|6`（detail）、`/pages/compare/index`（compare）
- 修复目标：`e:\code\strapi-wealth`（wealth-line 分支）hall/detail/compare 页面 + services/api.ts（视走查结果）

- [ ] **Step 1: 自动化走查（Playwright + Edge）**

用 webapp-testing 或本地 Playwright 脚本打开三页，逐项核对：
- hall：货币理财筛选、近 7 日年化排序（默认"最近更新"）、数据更新至提示、下拉刷新、榜单（产品 6 应列第一）
- detail id=4/id=6：综合评分 74/78、星级、维度分、净值 6 位显示
- compare：选品搜索、多曲线趋势卡、货币虚线、Y 轴百分比

记录与预期不符的每一项（页面 + 现象 + 复现路径）。

- [ ] **Step 2: 人工微信浏览器复核**

在微信浏览器打开同一批页面，重点核对自动化难以覆盖项（SSO 登录态、下拉刷新、字体渲染）。把发现补充进问题清单。

- [ ] **Step 3: 修复问题清单**

按 Step 1-2 清单逐项修复（示例——以实际清单为准）：
- 若 hall 榜单未显示产品 6 → 检查 hall 页请求参数与后端返回（应已由 Task 1a 修复，走查确认）
- 若详情页数值仍 4 位 → 检查缓存（应已由 Task 1b 修复）
- 其他发现的 UI/交互/数据问题按最小改动修复

- [ ] **Step 4: 复走查验证**

重复 Step 1-2，确认清单全部关闭。

- [ ] **Step 5: 提交 C 端修复**

```bash
cd e:\code\strapi-wealth
git add <实际修改文件>
git commit -m "fix(wealth): C 端走查问题修复"
```

---

## 部署与验证（所有后端任务完成后统一）

- [ ] **D1: 重建 dist（Task 2 Step 7 已做，Task 1 后端已提交源码，需一并重建）**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build && rg -l "slice\(offset|wealth:annual-snapshot" dist/server`

Expected: 命中 `dist/server/index.js`。

- [ ] **D2: 提交 dist 并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist（榜单排序修复 + 快照写入锁）"
git push origin main
```

- [ ] **D3: 部署 joho**

```powershell
ssh joho "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH && export PM2_HOME=/home/admin/.pm2 && pm2 restart strapi"
```

Expected: pull 成功、pm2 restart 成功。

- [ ] **D4: C 端部署（strapi-wealth → v.joho.cn/wealth）**

```bash
cd e:\code\strapi-wealth
git push origin wealth-line
# 按既有部署脚本更新 v.joho.cn/wealth（dist 同步，非构建）
```

Expected: 线上资源 hash 与本地一致。

- [ ] **D5: 线上验证**

- curl 榜单接口（需 SSO token，可用走查替代）：hall 页产品 6 列第一
- 详情页净值 6 位显示
- 09-16 rank/sharpe 补缺结果（Task 3 Step 3）

---

## Self-Review

**Spec coverage:**
- 任务 1a（榜单先排序后分页）→ Task 1 Step 1-5 ✓
- 任务 1b（toFixed 6 位）→ Task 1 Step 6-7 ✓
- 任务 2 存量清理 → Task 2 Step 1-2 ✓；产品级锁 → Task 2 Step 3-4 ✓；dist 自检 → Step 7 ✓
- 任务 3 补缺验证 + 触发链检查（结论：已存在，无需改动）→ Task 3 ✓
- 任务 4 走查流程 → Task 4 ✓
- 部署与验证 → D1-D5 ✓

**Placeholder scan:** 唯一占位 `PASTE_JWT_HERE`（Task 3 Step 2，上一步登录输出填充，属正常运行期流程）；Task 4 Step 3 问题清单以走查结果为准（走查是任务输入，非占位符）。

**Type consistency:** `acquireLock(lockKey, 600)` / `releaseLock(lockKey)` 与 risk-metric-job.ts 既有用法一致；锁 key 统一 `wealth:annual-snapshot:{productId}`；`getScoreLeaderboard` 返回结构不变（records/total/page/pageSize）。

**验证记录（实施后填写）：**
- Task 3 根因结论：
