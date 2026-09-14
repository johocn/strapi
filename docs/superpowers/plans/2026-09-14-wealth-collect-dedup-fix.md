# 净值采集去重与反馈修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 采集去重改为「日期+净值」双重判断（插入/更新/跳过），净值更新联动重算指标，前端展示真实新增/更新数。

**Architecture:** 后端 `collect-job.ts` 抽出可单测的 `processNavData()` 保存函数（返回 insert/update 计数与更新日期），collect-single 处理器调用它；净值更新时删除同日期年化快照+风险指标后触发补缺 job 重算。`wealth-collect-config` 新增 `lastInsertCount`/`lastUpdateCount` 字段（Strapi 重启自动迁移）。前端监察页重新采集后自动刷新列表，采集中心批量结果展示真实新增/更新数。

**Tech Stack:** Strapi v5 插件（TypeScript）、jest、uni-app Vue3（web 仓库）

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `e:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts` | 修改 | 抽出 `processNavData` 保存函数，去重改双条件，联动删除指标，写摘要 |
| `e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-collect-config\schema.json` | 修改 | 新增 `lastInsertCount`/`lastUpdateCount` 字段 |
| `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\collect-job.test.ts` | 新建 | `processNavData` 去重逻辑单测 |
| `e:\code\web\src\pages\wealth\monitor\index.vue` | 修改 | `doCollect` 成功后调 `loadMonitor()` 刷新 |
| `e:\code\web\src\pages\wealth\collect\index.vue` | 修改 | 批量采集结果展示真实新增/更新数，0 新增提示数据源未更新 |

## 后端现状（关键代码）

`collect-job.ts` collect-single 处理器当前去重（93-108 行）：
```ts
let savedCount = 0;
for (const nav of navData) {
  const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
    where: { product: productId, navDate: nav.navDate },
  });
  if (existing) continue;
  await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({ data: { product: productId, ...nav } });
  savedCount++;
}
```

### Task 1: schema 增加采集摘要字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-collect-config\schema.json`

- [ ] **Step 1: 修改 schema.json**，在 `failReason` 后新增两个字段：

```json
    "failReason": { "type": "text" },
    "lastInsertCount": { "type": "integer", "default": 0 },
    "lastUpdateCount": { "type": "integer", "default": 0 },
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/content-types/wealth-collect-config/schema.json
git commit -m "feat(zhao-wealth): collect-config 新增 lastInsertCount/lastUpdateCount 采集摘要字段"
```

### Task 2: 抽出 processNavData 并实现双条件去重（先写测试）

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\__tests__\collect-job.test.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts`

- [ ] **Step 1: 写失败测试**，创建 `__tests__/collect-job.test.ts`：

```ts
'use strict';

function d(day: number): Date {
  return new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('collect-job.processNavData', () => {
  let mockStrapi: any;
  let navQuery: any;
  let snapshotQuery: any;
  let metricQuery: any;

  beforeEach(() => {
    navQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
    snapshotQuery = { delete: jest.fn() };
    metricQuery = { delete: jest.fn() };
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
          if (uid === 'plugin::zhao-wealth.wealth-annual-snapshot') return snapshotQuery;
          if (uid === 'plugin::zhao-wealth.wealth-risk-metric') return metricQuery;
          throw new Error(`unexpected uid: ${uid}`);
        }),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getProcessNavData() {
    return require('../jobs/collect-job').processNavData;
  }

  it('新日期 → create 插入，insertCount 累加', async () => {
    navQuery.findOne.mockResolvedValue(null);
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.01, accNav: 1.01, dataSource: 'crawler' },
      { navDate: d(2), unitNav: 1.02, accNav: 1.02, dataSource: 'crawler' },
    ]);

    expect(navQuery.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ insertCount: 2, updateCount: 0, updatedDates: [] });
  });

  it('同日期同净值 → 跳过，不 create 不 update', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: '1.01', accNav: '1.01', dataSource: 'crawler' },
    ]);

    expect(navQuery.create).not.toHaveBeenCalled();
    expect(navQuery.update).not.toHaveBeenCalled();
    expect(result).toEqual({ insertCount: 0, updateCount: 0, updatedDates: [] });
  });

  it('同日期不同净值 → update 覆盖净值字段，updateCount 累加并记录日期', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01, dataSource: 'old' });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03, accNav: 1.03, dataSource: 'crawler' },
    ]);

    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { unitNav: 1.03, accNav: 1.03, dataSource: 'crawler' },
    });
    expect(navQuery.create).not.toHaveBeenCalled();
    expect(result).toEqual({ insertCount: 0, updateCount: 1, updatedDates: [d(1)] });
  });

  it('更新时 accNav/dataSource 缺省则保留原值', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01, dataSource: 'old' });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03 },
    ]);

    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { unitNav: 1.03, accNav: 1.01, dataSource: 'old' },
    });
    expect(result.updateCount).toBe(1);
  });

  it('返回的 updatedDates 可直接用于删除同日快照与指标', async () => {
    navQuery.findOne.mockResolvedValueOnce({ id: 10, unitNav: 1.01, accNav: 1.01 })
      .mockResolvedValueOnce({ id: 11, unitNav: 1.02, accNav: 1.02 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03 },
      { navDate: d(2), unitNav: 1.05 },
    ]);

    for (const dateStr of result.updatedDates) {
      await snapshotQuery.delete({ where: { product: 1, snapshotDate: dateStr } });
      await metricQuery.delete({ where: { product: 1, snapshotDate: dateStr } });
    }
    expect(snapshotQuery.delete).toHaveBeenCalledTimes(2);
    expect(metricQuery.delete).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd e:\code\basic\plugins\zhao-wealth
npx jest server/src/__tests__/collect-job.test.ts
```

Expected: FAIL（`Cannot find module '../jobs/collect-job'` 或 `processNavData is not a function`）

- [ ] **Step 3: 在 collect-job.ts 中新增 processNavData 导出函数**（文件顶部、import 之后插入）：

```ts
/**
 * 按「日期+净值」双重条件保存净值：
 * - 日期不存在 → 插入（insertCount++）
 * - 日期存在且净值相同 → 跳过
 * - 日期存在但净值不同 → 更新净值字段（updateCount++），记录日期供联动删除指标
 * 返回 { insertCount, updateCount, updatedDates }
 */
export async function processNavData(strapi: any, productId: number, navData: any[]) {
  let insertCount = 0;
  let updateCount = 0;
  const updatedDates: string[] = [];

  for (const nav of navData) {
    const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: productId, navDate: nav.navDate },
    });

    if (!existing) {
      await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
        data: { product: productId, ...nav },
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
  }

  return { insertCount, updateCount, updatedDates };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd e:\code\basic\plugins\zhao-wealth
npx jest server/src/__tests__/collect-job.test.ts
```

Expected: 5 passed

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/jobs/collect-job.ts plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts
git commit -m "feat(zhao-wealth): processNavData 双条件去重（插入/更新/跳过）+ 单测"
```

### Task 3: collect-single 处理器接入 processNavData 并联动指标重算

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\jobs\collect-job.ts`（collect-single 处理器 93-126 行）

- [ ] **Step 1: 替换 collect-single 处理器中的保存与成功分支**

将：
```ts
      let savedCount = 0;
      for (const nav of navData) {
        // 去重
        const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
          where: { product: productId, navDate: nav.navDate },
        });
        if (existing) continue;

        await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
          data: {
            product: productId,
            ...nav,
          },
        });
        savedCount++;
      }

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
        },
      });

      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，保存${savedCount}/${navData.length}条净值`);
```

替换为：
```ts
      const { insertCount, updateCount, updatedDates } = await processNavData(strapi, productId, navData);

      // 净值被更新时，删除同日期年化快照与风险指标，触发补缺重算（保证指标与净值一致）
      if (updateCount > 0) {
        for (const dateStr of updatedDates) {
          await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').delete({
            where: { product: productId, snapshotDate: dateStr },
          });
          await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').delete({
            where: { product: productId, snapshotDate: dateStr },
          });
        }
        strapi.log.info(`[zhao-wealth] 产品${productId}净值更新${updateCount}条，已清除对应日期指标待重算`);
      }

      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: config.id },
        data: {
          collectStatus: 'success',
          lastCollectTime: new Date(),
          failCount: 0,
          failReason: null,
          lastInsertCount: insertCount,
          lastUpdateCount: updateCount,
        },
      });

      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，新增${insertCount}条，更新${updateCount}条（共${navData.length}条）`);
```

- [ ] **Step 2: 回归测试**

```bash
cd e:\code\basic\plugins\zhao-wealth
npx jest server/src/__tests__/collect-job.test.ts server/src/__tests__/risk-metric-service.test.ts server/src/__tests__/nav-calculator.test.ts
```

Expected: 全部 PASS（holding-service/controllers 既有失败与本次无关）

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/jobs/collect-job.ts
git commit -m "feat(zhao-wealth): 采集成功联动指标重算，写入采集摘要字段"
```

### Task 4: 重建 dist 并推送

**Files:**
- Build: `e:\code\basic\plugins\zhao-wealth\dist`（构建产物）

- [ ] **Step 1: 重建 dist**

```bash
cd e:\code\basic\plugins\zhao-wealth
npm run build
```

Expected: `Build complete!`

- [ ] **Step 2: 自检 dist 含新逻辑**

```bash
cd e:\code\basic\plugins\zhao-wealth
rg -l "processNavData|lastInsertCount" dist\server\index.mjs
```

Expected: 命中 index.mjs

- [ ] **Step 3: 提交并推送**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist，含双条件去重与采集摘要"
git push origin main
```

Expected: `main -> main`

### Task 5: 前端监察页与采集中心反馈改造

**Files:**
- Modify: `e:\code\web\src\pages\wealth\monitor\index.vue:119-130`
- Modify: `e:\code\web\src\pages\wealth\collect\index.vue:811-841`

- [ ] **Step 1: monitor/index.vue 重新采集后自动刷新**

将 `doCollect` 改为成功回调刷新列表：

```ts
async function doCollect(item) {
  if (acting.value) return
  acting.value = true
  try {
    await triggerCollect({ productId: item.id })
    uni.showToast({ title: '采集任务已触发', icon: 'none' })
    loadMonitor()
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}
```

- [ ] **Step 2: collect/index.vue 批量采集结果展示真实新增/更新数**

将 `refreshBatchResult` 中 collect 分支替换为：

```ts
async function refreshBatchResult(type, done) {
  if (!done) {
    uni.showToast({ title: '任务仍在处理，可稍后刷新查看', icon: 'none' })
    return
  }
  const monitor = await getProductMonitor()
  const configs = await getAdminCollectConfigs({ pageSize: 500 })
  const failDetails = []
  if (type === 'collect') {
    let insertTotal = 0
    let updateTotal = 0
    for (const c of configs) {
      insertTotal += c.lastInsertCount || 0
      updateTotal += c.lastUpdateCount || 0
      if (c.collectStatus === 'failed') {
        failDetails.push({ productName: c.product?.productName || `产品${c.product?.id}`, reason: c.failReason || '采集失败' })
      }
    }
    if (insertTotal === 0 && updateTotal === 0 && failDetails.length === 0) {
      const maxNavDate = monitor.list.reduce((max, p) => (p.latestNav?.navDate > max ? p.latestNav.navDate : max), '')
      uni.showToast({ title: `数据源暂无新净值（最新 ${maxNavDate}）`, icon: 'none' })
    }
    batchResult.value = {
      successCount: (configs.length - failDetails.length) + (insertTotal > 0 || updateTotal > 0 ? 0 : 0),
      failCount: failDetails.length,
      failDetails,
      insertCount: insertTotal,
      updateCount: updateTotal,
    }
  } else {
    for (const p of monitor.list) {
      const status = type === 'annual' ? p.annualStatus : p.riskStatus
      if (status !== 'ok') {
        failDetails.push({ productName: p.productName, reason: status === 'danger' ? '无计算数据' : '未同步到最新净值日期' })
      }
    }
    batchResult.value = {
      successCount: monitor.list.length - failDetails.length,
      failCount: failDetails.length,
      failDetails,
    }
  }
  loadOverview()
  loadAnomalies()
  uni.showToast({ title: `批量${type === 'collect' ? '采集' : type === 'annual' ? '年化' : '风险指标'}完成`, icon: 'success' })
}
```

同时修改模板（约 315-325 行）在成功/失败统计下方增加新增/更新展示：

```html
    <view v-if="batchResult" class="batch-result">
        <view class="result-header">
          <text class="result-title">最近一次批量操作结果</text>
          <text class="result-close" @click="batchResult = null">×</text>
        </view>
        <view class="result-summary">
          <text>成功 {{ batchResult.successCount }} 个</text>
          <text v-if="batchResult.failCount > 0" class="fail-text">失败 {{ batchResult.failCount }} 个</text>
          <text v-if="batchResult.insertCount !== undefined" class="insert-text">新增 {{ batchResult.insertCount }} 条</text>
          <text v-if="batchResult.updateCount !== undefined" class="update-text">更新 {{ batchResult.updateCount }} 条</text>
        </view>
        <view v-for="(item, i) in (batchResult.failDetails || [])" :key="i" class="fail-detail">
          <text>{{ item.productName }}：{{ item.reason }}</text>
        </view>
      </view>
```

在 `<style scoped>` 中补充样式：

```css
.insert-text { color: #07c160; }
.update-text { color: #1677ff; }
```

- [ ] **Step 3: 本地构建验证**

```bash
cd e:\code\web
npm run build:h5
```

Expected: 构建成功，产物生成

- [ ] **Step 4: 提交并推送**

```bash
cd e:\code\web
git add src/pages/wealth/monitor/index.vue src/pages/wealth/collect/index.vue dist 2>/dev/null
git commit -m "feat(wealth): 监察页采集后自动刷新，批量采集展示真实新增/更新数"
git push origin main
```

### Task 6: 生产部署与验证

**Files:**
- 无代码文件；操作 joho（SSH 别名 `joho`，Strapi 部署机 39.97.54.5）与 h.joho.cn

- [ ] **Step 1: 后端部署（joho git pull + 重启）**

```bash
# 本地执行（Windows ssh 传复杂命令用 base64 编码脚本，避免剥引号）
```

远程脚本内容：
```bash
#!/bin/bash
cd /www/apps/strapi
git pull origin main
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi --update-env
```

Expected: `git pull` 拉到最新提交；strapi 重启 online

- [ ] **Step 2: 验证字段迁移与接口**

```bash
# 重启后查询 collect-configs 返回是否含 lastInsertCount/lastUpdateCount
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:1337/api/zhao-wealth/v1/admin/collect-configs
# 期望 401（未登录鉴权生效，接口已注册）
# 用 strapi 脚本查 wealth_collect_configs 表结构是否含新列
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "\d wealth_collect_configs" | grep -E "lastInsertCount|lastUpdateCount"
```

Expected: 401 + 两列存在

- [ ] **Step 3: 验证去重更新链路（手工改库模拟净值修正）**

```bash
# 1) 把产品3 某日净值改错，再触发单产品采集，观察是否 update 并重算指标
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "
UPDATE wealth_navs SET unit_nav = 0.99, acc_nav = 0.99 WHERE id = (SELECT lnk.wealth_nav_id FROM wealth_navs_product_lnk lnk WHERE lnk.wealth_product_id = 3 ORDER BY lnk.wealth_nav_ord LIMIT 1);"
# 2) 触发单产品采集（strapi 脚本调 collect.trigger 或直接跑 collect-single）
# 3) 查询该日期净值是否恢复正确值，年化快照/风险指标该日期是否重建
```

- [ ] **Step 4: 前端部署（h.joho.cn）**

执行 web 仓库的 H5 部署脚本（此前会话使用 deploy-h5.ps1，产物上传 h.joho.cn），验证输出 `SYNC_OK`。

- [ ] **Step 5: 线上回归**

- 登录 h.joho.cn → 采集中心 → 手动批量采集：轮询完成后面板展示"新增 X 条 / 更新 Y 条"；0 新增时 toast"数据源暂无新净值（最新日期）"
- 监察页 → 重新采集：toast 触发后列表自动刷新
- 检查 strapi 日志：`产品X采集成功，新增N条，更新M条`

## 自检

**Spec 覆盖：**
- 去重双条件（插入/更新/跳过）→ Task 2/3 ✅
- 净值更新联动删除指标触发重算 → Task 3 ✅
- lastInsertCount/lastUpdateCount 字段 + 清理 failReason → Task 1/3 ✅
- 监察页刷新 → Task 5 ✅
- 采集中心真实结果展示 + 0 新增提示 → Task 5 ✅
- 部署验证（含手工改库模拟）→ Task 6 ✅

**类型一致性：** `processNavData(strapi, productId, navData)` 返回 `{ insertCount, updateCount, updatedDates }`，Task 2 测试与 Task 3 调用处一致；前端字段 `lastInsertCount`/`lastUpdateCount` 与后端 schema 一致。
