# 宁银理财净值采集器（任务 3）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-wealth 插件新增宁银理财采集器，实现 ZGN2660096E（宁银理财宁欣日日薪日开理财96号-E）净值采集，官网（www.wmbnb.com，需 Playwright 绕过 TLS 指纹 WAF）为主源、中国理财网为兜底，并将官网逐日年化（incomeratio）随净值入库。

**Architecture:** 仿南银采集器模式：Playwright 会话内 fetch 官网 `funddaytable.json` 翻页拉全量净值，映射 `cdate→navDate / netvalue→unitNav / totalnetvalue→accNav / incomeratio→annualYield`；主源失败自动切中国理财网（登记编码）。`wealth-nav` 新增 `annualYield` 字段，`processNavData` 透传。采集器注册到 `collector-factory` 与管理端下拉。

**Tech Stack:** TypeScript、Playwright（playwright-manager 单例）、Strapi v5 插件、Jest + ts-jest；管理端为 uni-app H5（web 仓库）。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `plugins/zhao-wealth/server/src/content-types/wealth-nav/schema.json` | 修改：新增 `annualYield` 字段 |
| `plugins/zhao-wealth/server/src/jobs/collect-job.ts` | 修改：`processNavData` update 路径透传 `annualYield` |
| `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts` | 修改：新增 annualYield 透传用例 |
| `plugins/zhao-wealth/server/src/collectors/ningyin-collector.ts` | 创建：宁银采集器（官网 Playwright + 中国理财网兜底） |
| `plugins/zhao-wealth/server/src/__tests__/ningyin-collector.test.ts` | 创建：宁银采集器单测 |
| `plugins/zhao-wealth/server/src/collectors/collector-factory.ts` | 修改：注册 `ningyin`/`宁银理财` 采集源 |
| `web/src/pages/wealth/collect/index.vue` | 修改：管理端下拉追加「宁银理财」 |

---

### Task 1: wealth-nav 新增 annualYield 字段 + processNavData 透传

**Files:**
- Modify: `plugins/zhao-wealth/server/src/content-types/wealth-nav/schema.json`
- Modify: `plugins/zhao-wealth/server/src/jobs/collect-job.ts`
- Modify: `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts`

- [ ] **Step 1: 写失败测试**

在 `plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts` 的 `describe('collect-job.processNavData')` 块末尾（`收入数据 upsert` 相关用例之后）追加以下用例：

```ts
it('annualYield：create 透传，update 覆盖，缺省保留原值', async () => {
  const processNavData = getProcessNavData();

  // create 路径：annualYield 随净值入库
  navQuery.findOne.mockResolvedValueOnce(null);
  await processNavData(mockStrapi, 1, [
    { navDate: d(1), unitNav: 1.01, accNav: 1.01, annualYield: 1.72, dataSource: 'crawler' },
  ]);
  expect(navQuery.create).toHaveBeenCalledWith({
    data: { product: 1, navDate: d(1), unitNav: 1.01, accNav: 1.01, annualYield: 1.72, dataSource: 'crawler' },
  });

  // update 路径：净值变化时 annualYield 一并覆盖
  navQuery.findOne.mockResolvedValueOnce({ id: 10, unitNav: 1.00, accNav: 1.00, dataSource: 'old' });
  await processNavData(mockStrapi, 1, [
    { navDate: d(2), unitNav: 1.02, accNav: 1.02, annualYield: 3.2, dataSource: 'crawler' },
  ]);
  expect(navQuery.update).toHaveBeenCalledWith({
    where: { id: 10 },
    data: { unitNav: 1.02, accNav: 1.02, annualYield: 3.2, dataSource: 'crawler' },
  });

  // update 路径：annualYield 缺省保留原值
  navQuery.findOne.mockResolvedValueOnce({ id: 11, unitNav: 1.00, accNav: 1.00, annualYield: 1.5, dataSource: 'old' });
  await processNavData(mockStrapi, 1, [
    { navDate: d(3), unitNav: 1.02 },
  ]);
  expect(navQuery.update).toHaveBeenCalledWith({
    where: { id: 11 },
    data: { unitNav: 1.02, accNav: 1.00, annualYield: 1.5, dataSource: 'old' },
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

在 `e:\code\basic\plugins\zhao-wealth` 下运行：

```
npm test -- --testPathPattern="collect-job"
```

预期：`annualYield：create 透传，update 覆盖，缺省保留原值` 用例 FAIL（update 调用断言不匹配，因 update data 中无 `annualYield`）。其余用例应 PASS（jest `toEqual` 忽略 undefined 属性，既有断言不受影响）。

> 若提示 `jest 不是内部或外部命令`（本地 node_modules 缺 devDependencies），先执行 `npm install` 再重跑。

- [ ] **Step 3: 实现 schema 字段与透传**

修改 `plugins/zhao-wealth/server/src/content-types/wealth-nav/schema.json`，在 `"dataSource"` 属性之后追加：

```json
    "annualYield": { "type": "decimal", "precision": 12, "scale": 6 },
```

修改 `plugins/zhao-wealth/server/src/jobs/collect-job.ts` 的 `processNavData` update 分支（第 33-40 行附近），在 `data:` 中追加 annualYield 一行：

```ts
        data: {
          unitNav: nav.unitNav,
          accNav: nav.accNav ?? existing.accNav,
          annualYield: nav.annualYield != null ? Number(nav.annualYield) : existing.annualYield,
          dataSource: nav.dataSource ?? existing.dataSource,
        },
```

create 路径无需改动（`annualYield` 不在解构剔除列表中，已随 `...navOnly` 透传）。

- [ ] **Step 4: 运行测试验证通过**

```
npm test -- --testPathPattern="collect-job"
```

预期：全部 PASS（含新增用例与既有用例）。

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-wealth/server/src/content-types/wealth-nav/schema.json plugins/zhao-wealth/server/src/jobs/collect-job.ts plugins/zhao-wealth/server/src/__tests__/collect-job.test.ts
git commit -m "feat(wealth): wealth-nav 新增 annualYield 字段并透传（宁银官网逐日年化）"
```

---

### Task 2: 宁银采集器测试（TDD 先行）

**Files:**
- Create: `plugins/zhao-wealth/server/src/__tests__/ningyin-collector.test.ts`

- [ ] **Step 1: 写测试文件**

创建 `plugins/zhao-wealth/server/src/__tests__/ningyin-collector.test.ts`：

```ts
'use strict';

/**
 * 宁银理财采集器测试
 * mock playwright-manager 的 createPage/closePage，用假 page 控制 goto/evaluate
 */

jest.mock('../playwright-manager', () => ({
  createPage: jest.fn(),
  closePage: jest.fn(),
}));

jest.mock('../collectors/chinawealth-collector');

import { createPage } from '../playwright-manager';
import ChinawealthCollector from '../collectors/chinawealth-collector';
import NingyinCollector from '../collectors/ningyin-collector';

const collector = new NingyinCollector();

// 官网 funddaytable 原始行
const row = (cdate: number, netvalue: string, totalnetvalue: string, incomeratio?: string) => ({
  cdate,
  netvalue,
  totalnetvalue,
  ...(incomeratio != null ? { incomeratio } : {}),
});

describe('ningyin-collector.collectNavData', () => {
  let mockGoto: jest.Mock;
  let mockEvaluate: jest.Mock;
  let mockCwCollectNav: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoto = jest.fn().mockResolvedValue(undefined);
    mockEvaluate = jest.fn();
    (createPage as jest.Mock).mockResolvedValue({ goto: mockGoto, evaluate: mockEvaluate });
    mockCwCollectNav = jest.fn();
    (ChinawealthCollector as unknown as jest.Mock).mockImplementation(() => ({
      collectNavData: mockCwCollectNav,
    }));
  });

  it('成功：funddaytable 映射为标准净值字段（含 annualYield），按日期降序', async () => {
    mockEvaluate.mockResolvedValue([
      row(1789315200000, '1.01092900', '1.01092900', '1.72'),
      row(1788969600000, '1.01073200', '1.01073200', '1.73'),
    ]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(mockGoto).toHaveBeenCalledWith(
      'https://www.wmbnb.com/product/productdetails/index.html?projectcode=ZGN2660096E',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    expect(result).toEqual([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', annualYield: '1.72', dataSource: 'crawler' },
      { navDate: '2026-09-10', unitNav: '1.01073200', accNav: '1.01073200', annualYield: '1.73', dataSource: 'crawler' },
    ]);
  });

  it('翻页：首页非空、次页为空时停止（evaluate 恰好调用 2 次）', async () => {
    mockEvaluate
      .mockResolvedValueOnce([row(1789315200000, '1.01092900', '1.01092900', '1.72')])
      .mockResolvedValueOnce([]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(mockEvaluate).toHaveBeenCalledTimes(2);
    expect(result.length).toBe(1);
  });

  it('过滤：无日期或净值全空的记录被剔除', async () => {
    mockEvaluate.mockResolvedValue([
      row(1789315200000, '1.01092900', '1.01092900', '1.72'),
      { netvalue: '1.2' },          // 无 cdate → 过滤
      { cdate: 1788969600000 },     // 净值全空 → 过滤
    ]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(result.length).toBe(1);
    expect(result[0].navDate).toBe('2026-09-14');
  });

  it('兜底：主源异常（evaluate 抛错）→ 调用中国理财网采集器', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));
    mockCwCollectNav.mockResolvedValue([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', dataSource: 'crawler' },
    ]);

    const result = await collector.collectNavData('ZGN2660096E', { registerCode: 'Z7002126000109' });

    expect(mockCwCollectNav).toHaveBeenCalledWith('ZGN2660096E', { registerCode: 'Z7002126000109' });
    expect(result).toEqual([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', dataSource: 'crawler' },
    ]);
  });

  it('兜底为空：中国理财网也未取到净值 → 抛错', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));
    mockCwCollectNav.mockResolvedValue([]);

    await expect(
      collector.collectNavData('ZGN2660096E', { registerCode: 'Z7002126000109' })
    ).rejects.toThrow('宁银理财净值采集失败: HTTP 403 改用中国理财网源（登记编码 Z7002126000109）也未获取到净值');
  });

  it('无登记编码：主源失败时抛「无法走中国理财网兜底」', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));

    await expect(collector.collectNavData('ZGN2660096E')).rejects.toThrow(
      '宁银理财净值采集失败: HTTP 403（无登记编码，无法走中国理财网兜底）'
    );
    expect(mockCwCollectNav).not.toHaveBeenCalled();
  });
});

describe('ningyin-collector.collectProductInfo', () => {
  let mockGoto: jest.Mock;
  let mockEvaluate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoto = jest.fn().mockResolvedValue(undefined);
    mockEvaluate = jest.fn();
    (createPage as jest.Mock).mockResolvedValue({ goto: mockGoto, evaluate: mockEvaluate });
  });

  it('成功：list.json 映射产品信息', async () => {
    mockEvaluate.mockResolvedValue({
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E',
      registerCode: 'Z7002126000109',
      riskLevel: '中低风险',
      riskLevelRaw: '中低风险',
      productType: 'bank-wealth',
      company: '宁银理财',
      issueDate: '2026-05-20',
    });

    const info = await collector.collectProductInfo('ZGN2660096E');

    expect(mockGoto).toHaveBeenCalledWith(
      'https://www.wmbnb.com/product/productdetails/index.html?projectcode=ZGN2660096E',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    expect(info).toEqual({
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E',
      registerCode: 'Z7002126000109',
      riskLevel: '中低风险',
      riskLevelRaw: '中低风险',
      productType: 'bank-wealth',
      company: '宁银理财',
      issueDate: '2026-05-20',
    });
  });

  it('失败：evaluate 返回 null → 返回 null', async () => {
    mockEvaluate.mockResolvedValue(null);

    expect(await collector.collectProductInfo('ZGN2660096E')).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```
npm test -- --testPathPattern="ningyin"
```

预期：FAIL——`Cannot find module '../collectors/ningyin-collector'`（实现文件尚不存在）。

---

### Task 3: 宁银采集器实现 + collector-factory 注册

**Files:**
- Create: `plugins/zhao-wealth/server/src/collectors/ningyin-collector.ts`
- Modify: `plugins/zhao-wealth/server/src/collectors/collector-factory.ts`

- [ ] **Step 1: 实现采集器**

创建 `plugins/zhao-wealth/server/src/collectors/ningyin-collector.ts`：

```ts
'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';
import ChinawealthCollector from './chinawealth-collector';

const NINGYIN_BASE_URL = 'https://www.wmbnb.com';
const DETAIL_PAGE_URL = (productCode: string): string =>
  `${NINGYIN_BASE_URL}/product/productdetails/index.html?projectcode=${productCode}`;

// 翻页保险丝：防止接口异常导致无限循环（65 条约 5 页，日开产品五年约 100 页）
const MAX_PAGES = 500;

/**
 * 宁银理财采集器
 *
 * API 侦查结论（joho 实测）：
 *   官网 /ningbo-web/product/*.json 接口被 nginx WAF 按 TLS 指纹拦截（curl/Node fetch 均 403），
 *   必须 Playwright 真实浏览器会话内 fetch 同源请求。
 *   1. list.json?projectcode=  → 产品信息（登记编码在 id 字段，风险等级 risklevelDesc）
 *   2. funddaytable.json      → 净值分页表 { cdate(ms), netvalue, totalnetvalue, incomeratio }
 *      incomeratio 为近 7 日年化口径（与净值反算吻合），随净值入库为 annualYield
 *   3. 主源失败自动切中国理财网兜底（按登记编码，需调用方传入 registerCode）
 */
export default class NingyinCollector extends BaseCollector {
  /**
   * 采集产品基本信息 — Playwright 会话内 fetch list.json
   * 提取不到结构化信息时返回 null（提示走中国理财网补录登记编码）
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const code = productCode.toUpperCase();
    const page = await createPage();
    if (!page) {
      console.log('[ningyin] Playwright Browser 不可用，产品信息请通过中国理财网补录');
      return null;
    }

    try {
      await page.goto(DETAIL_PAGE_URL(code), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const info = await page.evaluate(async (c: string) => {
        const res = await fetch(`/ningbo-web/product/list.json?projectcode=${encodeURIComponent(c)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const p = j.list && j.list[0];
        if (!p) return null;
        return {
          productName: p.projectname || '',
          registerCode: p.id || '',
          riskLevel: p.risklevelDesc || '',
          riskLevelRaw: p.risklevelDesc || '',
          productType: 'bank-wealth',
          company: '宁银理财',
          issueDate: p.projectsetupdate ? new Date(p.projectsetupdate).toISOString().slice(0, 10) : '',
        };
      }, code);

      if (!info || !info.productName) {
        console.log('[ningyin] 未提取到产品信息（请确认产品代码或在中国理财网补录登记编码）');
        return null;
      }
      console.log(`[ningyin] 产品信息采集成功: ${info.productName}`);
      return info;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[ningyin] 产品信息采集失败: ${msg}`);
      return null;
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值数据 — 官网 funddaytable 翻页拉全量，失败自动切中国理财网兜底
   * 字段映射：cdate(ms)→navDate、netvalue→unitNav、totalnetvalue→accNav、incomeratio→annualYield
   */
  async collectNavData(productCode: string, options?: { registerCode?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const code = productCode.toUpperCase();
    const registerCode = (options && options.registerCode) || '';
    const startDate = (options && options.startDate) || '2020-01-01';
    const endDate = (options && options.endDate) || todayStr();

    try {
      return await this.collectViaOfficial(code, startDate, endDate);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[ningyin] 官网采集失败(${msg})，改用中国理财网源（登记编码 ${registerCode || '未知'}）`);
      return this.collectViaChinawealth(code, registerCode, msg);
    }
  }

  private async collectViaOfficial(code: string, startDate: string, endDate: string): Promise<any[]> {
    const page = await createPage();
    if (!page) throw new Error('Playwright Browser 不可用');

    try {
      await page.goto(DETAIL_PAGE_URL(code), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const list = await page.evaluate(
        async (args: { code: string; startDate: string; endDate: string }) => {
          const { code: c, startDate: sd, endDate: ed } = args;
          const perPage = 100; // 服务端有封顶（实测约 13-15 条/页），依赖翻页直至 list 为空
          const out: any[] = [];
          for (let pageno = 1; pageno <= MAX_PAGES; pageno++) {
            const url = `/ningbo-web/product/funddaytable.json?code=${encodeURIComponent(c)}&startdate=${sd}&enddate=${ed}&request_num=${perPage}&request_pageno=${pageno}`;
            const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            if (!j.list || j.list.length === 0) break;
            out.push(...j.list);
          }
          return out;
        },
        { code, startDate, endDate }
      );

      const records = list
        .filter((r: any) => r.cdate != null && (r.netvalue != null || r.totalnetvalue != null))
        .map((r: any) => ({
          navDate: toNavDate(r.cdate),
          unitNav: r.netvalue != null ? String(r.netvalue) : null,
          accNav: r.totalnetvalue != null ? String(r.totalnetvalue) : (r.netvalue != null ? String(r.netvalue) : null),
          annualYield: r.incomeratio != null ? String(r.incomeratio) : undefined,
          dataSource: 'crawler',
        }))
        .filter((r: any) => r.navDate && (r.unitNav || r.accNav));

      records.sort((a: any, b: any) => String(b.navDate).localeCompare(String(a.navDate)));

      if (records.length === 0) throw new Error('未获取到净值数据');
      console.log(`[ningyin] 官网净值采集完成: code=${code}, 共${records.length}条`);
      return records;
    } finally {
      await closePage(page);
    }
  }

  private async collectViaChinawealth(code: string, registerCode: string, cause: string): Promise<any[]> {
    if (!registerCode) {
      throw new Error(`宁银理财净值采集失败: ${cause}（无登记编码，无法走中国理财网兜底）`);
    }
    const fallback = await new ChinawealthCollector().collectNavData(code, { registerCode });
    if (fallback.length === 0) {
      throw new Error(`宁银理财净值采集失败: ${cause} 改用中国理财网源（登记编码 ${registerCode}）也未获取到净值`);
    }
    console.log(`[ningyin] 中国理财网兜底采集完成: registerCode=${registerCode}, 共${fallback.length}条`);
    return fallback;
  }
}

/** 今天日期 → YYYY-MM-DD（本地时区） */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 日期归一化 → YYYY-MM-DD（兼容毫秒时间戳 / 数字 / 字符串） */
function toNavDate(raw: any): string {
  if (raw == null) return '';
  if (typeof raw === 'number' || /^\d{10,13}$/.test(String(raw))) {
    const n = Number(raw);
    const ms = n < 1e12 ? n * 1000 : n;
    if (ms > 0) {
      const d = new Date(ms);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '';
  }
  const s = String(raw).trim().replace(/[/.]/g, '-');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return s.slice(0, 10);
}
```

- [ ] **Step 2: 注册采集源**

修改 `plugins/zhao-wealth/server/src/collectors/collector-factory.ts`：

```ts
import NingyinCollector from './ningyin-collector';
```

`COLLECTOR_MAP` 追加（`'南银理财': NanyinCollector,` 之后）：

```ts
  'ningyin': NingyinCollector,
  '宁银理财': NingyinCollector,
```

`getAvailableSources()` 返回数组追加（`{ value: 'nanyin', label: '南银理财' },` 之后）：

```ts
    { value: 'ningyin', label: '宁银理财' },
```

- [ ] **Step 3: 运行测试验证通过**

```
npm test -- --testPathPattern="ningyin|collect-job"
```

预期：ningyin-collector 与 collect-job 全部 PASS。

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-wealth/server/src/collectors/ningyin-collector.ts plugins/zhao-wealth/server/src/collectors/collector-factory.ts plugins/zhao-wealth/server/src/__tests__/ningyin-collector.test.ts
git commit -m "feat(wealth): 新增宁银理财采集器（官网 Playwright + 中国理财网兜底）"
```

---

### Task 4: 管理端采集源下拉追加「宁银理财」

**Files:**
- Modify: `web/src/pages/wealth/collect/index.vue`（web 仓库，非 basic）

- [ ] **Step 1: 追加选项与占位提示**

修改 `web/src/pages/wealth/collect/index.vue`：

第 401 行：

```ts
const sourceOptions = ['渤银理财', '杭银理财', '青岛银行', '中国理财网', '南银理财', '宁银理财']
```

第 402 行：

```ts
const sourceValues = ['cbhb', 'hzbank', 'qdccb', 'chinawealth', 'nanyin', 'ningyin']
```

第 485 行 `queryPlaceholder` computed 内，`'qdccb'` 分支之后追加：

```ts
  if (currentSource.value === 'ningyin') return '请输入产品代码（如 ZGN2660096E）'
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/wealth/collect/index.vue
git commit -m "feat(web): 管理端新增宁银理财采集源"
```

（web 仓库构建与部署在 Task 6 与插件一起执行。）

---

### Task 5: 本地构建 dist + 部署自检 + 提交（basic 仓库）

**Files:**
- 构建产物：`plugins/zhao-wealth/dist/`

- [ ] **Step 1: 重建插件 dist**

在 `e:\code\basic\plugins\zhao-wealth` 下运行：

```
npm run build
```

预期：构建成功，无 TS 报错。

- [ ] **Step 2: 部署自检**

确认新代码已进 dist（未命中 = 未重建，禁止提交）：

```
rg -n "ningyin|annualYield" e:\code\basic\plugins\zhao-wealth\dist\server
```

预期：命中 `ningyin-collector`（如 `NINGYIN_BASE_URL`）、`annualYield` 等关键字。

- [ ] **Step 3: 提交 dist**

```bash
git add plugins/zhao-wealth/dist
git commit -m "build(wealth): 重建 dist（宁银采集器 + annualYield 字段）"
```

- [ ] **Step 4: 推送**

```bash
git push
```

---

### Task 6: 部署 + 生产验证（joho）

**Files:** 无（部署操作）

- [ ] **Step 1: 部署插件（basic 仓库）**

在 `e:\code\basic` 下运行（部署铁律：本地构建 → 上传 dist → pm2 restart，绝不在服务器构建）：

```
node scripts/deploy.mjs
```

预期：上传成功、pm2 restart strapi 完成。

- [ ] **Step 2: 部署管理端（web 仓库）**

在 `e:\code\web` 下依次运行：

```
npm run build:h5
powershell -File deploy-h5.ps1
```

预期：h.joho.cn 站点更新，`SYNC_OK`。

- [ ] **Step 3: 确保「宁银理财」公司存在**

在 h.joho.cn 管理端确认 `wealth_company` 中存在公司「宁银理财」（无则新建；`fuzzyMatchCompany` 按简称匹配）。

- [ ] **Step 4: 生产验证——产品建档 + 采集**

在 h.joho.cn 管理端「采集中心」：
1. 数据源选「宁银理财」，输入产品代码 `ZGN2660096E`，点采集产品信息
   - 预期：源数据显示产品名「宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E」、登记编码 `Z7002126000109`、风险中低风险、发行机构匹配「宁银理财」
2. 确认入库（产品类型 bank-wealth）
3. 触发采集净值

- [ ] **Step 5: 生产验证——数据核对**

在 joho 服务器查询：

```bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin
export PM2_HOME=/home/admin/.pm2
pm2 logs strapi --lines 50 --nostream | grep '\[ningyin\]' | tail
```

并核对数据库：

```sql
-- 通过 strapi 生产库（psql）核对
SELECT COUNT(*) FROM wealth_navs n JOIN wealth_products p ON n.product = p.id
WHERE p."productCode" = 'ZGN2660096E';
-- 预期 65
SELECT n."navDate", n."unitNav", n."annualYield" FROM wealth_navs n
JOIN wealth_products p ON n.product = p.id
WHERE p."productCode" = 'ZGN2660096E' ORDER BY n."navDate" DESC LIMIT 5;
-- 预期最新 2026-09-14, unitNav 1.01092900, annualYield 1.72
```

- [ ] **Step 6: 生产验证——年化/风险补缺**

确认采集成功后自动触发 `recalculate-product` + `recalculate-risk-metric-product` 补缺任务执行无报错（pm2 日志无 ERROR）；管理端产品详情可见年化快照与风险指标（bank-wealth 净值型口径：波动/回撤/夏普）。

- [ ] **Step 7: 契约自检（可选）**

采集中心页重新采集一次，确认管理端显示「新增 65 条」而非「0 新增」（幂等：再采一次应 0 新增）。

---

## 自检记录（Self-Review）

- **Spec 覆盖**：官网主源（Task 3 collectViaOfficial）✓；中国理财网兜底（Task 3 collectViaChinawealth）✓；annualYield 入库（Task 1）✓；工厂注册（Task 3 Step 2）✓；管理端下拉（Task 4）✓；dist 重建自检（Task 5）✓；生产验证（Task 6）✓。
- **占位符扫描**：无 TBD/占位符；所有代码块完整。
- **类型一致性**：`collectNavData(code, {registerCode, startDate, endDate})` 签名与 BaseCollector/nanyin 惯例一致；`annualYield` 在采集器输出为 string、processNavData 写库转 Number（decimal 字段）；测试断言 `annualYield: '1.72'`（采集器层）与 `annualYield: 1.72`（入库层）分层一致。
- **注意**：`toNavDate` 与 `todayStr` 为采集器内局部函数（沿用 nanyin-collector 的模块内自包含惯例，避免跨采集器耦合）。
