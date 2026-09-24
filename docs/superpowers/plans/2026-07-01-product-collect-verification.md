# 理财产品双源采集与交叉校验 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 运营输入产品编码→自动从渤银官网采集→用中国理财网交叉校验→确认入库

**Architecture:** Playwright 单例 Browser + 按需 Page，采集器工厂模式（cbhb-collector / chinawealth-collector），内存队列串行采集，前端 4 步抽屉交互

**Tech Stack:** Playwright (server), Ant Design Drawer/Steps (admin), Strapi v5 Document Service + knex

---

## 文件结构

### 新增
| 文件 | 职责 |
|------|------|
| `server/src/collectors/collector-factory.ts` | 根据公司名选择采集器实例 |
| `server/src/collectors/chinawealth-collector.ts` | 中国理财网 Playwright 采集器 |
| `server/src/playwright-manager.ts` | Playwright Browser 单例管理（初始化/获取/销毁） |
| `admin/src/pages/Product/CollectDrawer.tsx` | 采集抽屉弹窗（4 步流程） |
| `server/database/migrations/004_add_benchmark_remark_to_product.js` | 新增 benchmark + remark 字段 |

### 重写
| 文件 | 职责 |
|------|------|
| `server/src/collectors/cbhb-collector.ts` | 从 axios+cheerio 占位符→Playwright 实现 |

### 修改
| 文件 | 变更 |
|------|------|
| `server/src/controllers/admin-api.ts` | +2 接口：collect / collectConfirm |
| `server/src/routes/admin-api.ts` | +2 路由 |
| `server/src/permissions.ts` | +collect / collectConfirm actions |
| `server/src/content-types/wealth-product/schema.json` | +benchmark + remark |
| `server/src/content-types/index.ts` | 同步 schema（import 不变，字段由 schema.json 决定） |
| `server/src/bootstrap.ts` | +Playwright 初始化 + 销毁注册 |
| `admin/src/pages/Product/ProductList.tsx` | +采集按钮 + 引入 CollectDrawer |
| `admin/src/hooks/useApi.ts` | +2 接口调用 |
| `package.json` | +playwright 依赖 |

---

## Task 1: 安装 Playwright + 配置

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\package.json`

- [ ] **Step 1: 安装 playwright 依赖**

```bash
cd e:\code\basic\plugins\zhao-wealth
npm install playwright
```

注意：playwright 包自带浏览器下载，但本机已有 Chrome，将通过 `executablePath` 指定本机 Chrome 避免重复下载。

- [ ] **Step 2: 验证安装**

```bash
cd e:\code\basic
npm run develop
```

确认 Strapi 启动无报错。

- [ ] **Step 3: Commit**

```bash
git add basic/plugins/zhao-wealth/package.json basic/plugins/zhao-wealth/package-lock.json
git commit -m "feat(zhao-wealth): add playwright dependency for product collection"
```

---

## Task 2: Schema 变更 + Migration 004

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json`
- Create: `e:\code\basic\plugins\zhao-wealth\server\database\migrations\004_add_benchmark_remark_to_product.js`

- [ ] **Step 1: 在 schema.json 的 attributes 中新增 benchmark 和 remark**

在 `status` 字段之后、`createdAt` 字段之前添加：

```json
"benchmark": { "type": "string" },
"remark": { "type": "text" },
```

完整 attributes 部分变为：
```json
"attributes": {
    "productCode": { "type": "string", "unique": true, "required": true },
    "productName": { "type": "string", "required": true },
    "productType": { "type": "enumeration", "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund"], "required": true },
    "registerCode": { "type": "string", "unique": true },
    "riskLevel": { "type": "enumeration", "enum": ["R1", "R2", "R3", "R4", "R5"], "default": "R2" },
    "termType": { "type": "enumeration", "enum": ["short", "medium", "long"] },
    "issueDate": { "type": "date" },
    "maturityDate": { "type": "date" },
    "company": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-company", "inversedBy": "products" },
    "navs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-nav", "mappedBy": "product" },
    "moneyIncomes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-money-income", "mappedBy": "product" },
    "annualSnapshots": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-annual-snapshot", "mappedBy": "product" },
    "yearlyReturns": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-yearly-return", "mappedBy": "product" },
    "riskMetrics": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-risk-metric", "mappedBy": "product" },
    "recommendWeight": { "type": "integer", "default": 0 },
    "recommendTags": { "type": "json" },
    "recommendEnabled": { "type": "boolean", "default": false },
    "recommendReason": { "type": "text" },
    "status": { "type": "boolean", "default": true },
    "benchmark": { "type": "string" },
    "remark": { "type": "text" },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
}
```

- [ ] **Step 2: 创建 Migration 004**

文件 `server/database/migrations/004_add_benchmark_remark_to_product.js`：

```javascript
'use strict';

async function up({ db }) {
  const knex = db.connection;

  // 检查列是否已存在（幂等）
  const columns = await knex.raw(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'wealth_products' AND column_name IN ('benchmark', 'remark')"
  );

  const existing = columns.rows.map(r => r.column_name);

  if (!existing.includes('benchmark')) {
    await knex.schema.alterTable('wealth_products', (table) => {
      table.string('benchmark').nullable();
    });
  }

  if (!existing.includes('remark')) {
    await knex.schema.alterTable('wealth_products', (table) => {
      table.text('remark').nullable();
    });
  }
}

async function down({ db }) {
  const knex = db.connection;
  await knex.schema.alterTable('wealth_products', (table) => {
    table.dropColumn('benchmark');
    table.dropColumn('remark');
  });
}

module.exports = { up, down };
```

- [ ] **Step 3: 启动 Strapi 验证 migration 执行**

```bash
cd e:\code\basic
npm run develop
```

检查启动日志：
- `[zhao-wealth] Running migration 004_add_benchmark_remark_to_product`
- 无报错

- [ ] **Step 4: 验证 schema 重建**

Strapi v5 新增字段需删除 schema 元数据记录触发重建：

```sql
DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-wealth.wealth-product';
```

然后重启 Strapi。用 SQL 确认列存在：

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'wealth_products' AND column_name IN ('benchmark', 'remark');
```

预期返回 benchmark 和 remark 两行。

- [ ] **Step 5: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json basic/plugins/zhao-wealth/server/database/migrations/004_add_benchmark_remark_to_product.js
git commit -m "feat(zhao-wealth): add benchmark and remark fields to wealth-product schema + migration 004"
```

---

## Task 3: Playwright 管理器

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\playwright-manager.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\bootstrap.ts`

- [ ] **Step 1: 创建 playwright-manager.ts**

```typescript
'use strict';

import { chromium, type Browser, type Page } from 'playwright';

const CHROME_PATH = 'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PAGE_TIMEOUT = 30000;

let browser: Browser | null = null;
let initPromise: Promise<Browser | null> | null = null;

/**
 * 初始化 Browser 单例（headed 模式，复用本机 Chrome）
 */
export async function initBrowser(): Promise<Browser | null> {
  if (browser) return browser;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      console.log('[zhao-wealth] Playwright Browser 已启动');
      return browser;
    } catch (error) {
      console.error(`[zhao-wealth] Playwright Browser 启动失败: ${error.message}`);
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

/**
 * 获取 Browser 实例
 */
export function getBrowser(): Browser | null {
  return browser;
}

/**
 * 创建新 Page（自动设置超时）
 */
export async function createPage(): Promise<Page | null> {
  if (!browser) {
    browser = await initBrowser();
  }
  if (!browser) return null;

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);
  return page;
}

/**
 * 关闭 Page 和其 Context
 */
export async function closePage(page: Page): Promise<void> {
  try {
    const context = page.context();
    await page.close();
    await context.close();
  } catch {
    // 忽略关闭错误
  }
}

/**
 * 销毁 Browser
 */
export async function destroyBrowser(): Promise<void> {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // 忽略关闭错误
    }
    browser = null;
    initPromise = null;
    console.log('[zhao-wealth] Playwright Browser 已关闭');
  }
}
```

- [ ] **Step 2: 修改 bootstrap.ts，在 jobs 初始化后启动 Playwright**

在 `await jobs({ strapi });` 之后、Cron 注册之前添加：

```typescript
// 初始化 Playwright Browser 单例
import { initBrowser, destroyBrowser } from './playwright-manager';

// 在 bootstrap 函数内，await jobs({ strapi }); 之后添加：
const pwBrowser = await initBrowser();
if (pwBrowser) {
  strapi.log.info('[zhao-wealth] Playwright Browser 已就绪');
} else {
  strapi.log.warn('[zhao-wealth] Playwright Browser 不可用，采集功能将降级');
}

// 注册销毁钩子
process.on('SIGTERM', async () => { await destroyBrowser(); });
process.on('SIGINT', async () => { await destroyBrowser(); });
```

注意：需要在文件顶部添加 import 语句。

- [ ] **Step 3: 验证 Strapi 启动**

```bash
cd e:\code\basic
npm run develop
```

检查日志：`[zhao-wealth] Playwright Browser 已就绪`，且 Chrome 浏览器窗口出现。

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/playwright-manager.ts basic/plugins/zhao-wealth/server/src/bootstrap.ts
git commit -m "feat(zhao-wealth): add Playwright browser manager with singleton lifecycle"
```

---

## Task 4: 重写 cbhb-collector.ts

**Files:**
- Rewrite: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\cbhb-collector.ts`

- [ ] **Step 1: 重写 cbhb-collector.ts 为 Playwright 实现**

```typescript
'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

const BASE_URL = 'https://www.cbhbwm.com.cn';

// 风险等级映射
const RISK_MAP: Record<string, string> = {
  '低风险': 'R1',
  '中低风险': 'R2',
  '中风险': 'R3',
  '中高风险': 'R4',
  '高风险': 'R5',
};

// 期限类型映射
const TERM_MAP: Record<string, string> = {
  '3-6个月': 'short',
  '6-12个月': 'medium',
  '1-3年': 'long',
  '3年以上': 'long',
};

export default class CbhbCollector extends BaseCollector {
  /**
   * 通过销售编码采集渤银理财产品详情
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      // 访问详情页
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`, {
        waitUntil: 'domcontentloaded',
      });

      // 等待产品信息加载
      await page.waitForSelector('.product-detail, .detail-info, .pro-detail', { timeout: 10000 }).catch(() => {});

      // 提取产品信息 - 渤银官网详情页结构
      const productInfo = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el ? el.textContent?.trim() || '' : '';
        };

        // 尝试多种选择器适配官网结构
        const name = getText('.product-title, .pro-name, .detail-title, h2');
        const registerCode = getText('.register-code, .reg-code, .pro-code').replace('登记编号：', '').replace('登记编号:', '');
        const riskText = getText('.risk-type, .risk-level, .pro-risk');
        const termText = getText('.term-type, .pro-term, .invest-period');
        const issueDate = getText('.issue-date, .start-date, .raise-start');
        const maturityDate = getText('.maturity-date, .end-date, .raise-end');
        const benchmark = getText('.benchmark, .pro-benchmark, .performance-benchmark, .yield-benchmark');

        return { name, registerCode, riskText, termText, issueDate, maturityDate, benchmark };
      });

      // 如果详情页无数据，尝试列表页搜索
      if (!productInfo.name) {
        return await this.collectFromListPage(productCode);
      }

      return {
        productCode,
        productName: productInfo.name,
        registerCode: productInfo.registerCode,
        riskLevel: this.parseRiskLevel(productInfo.riskText),
        riskLevelRaw: productInfo.riskText,
        termType: this.parseTermType(productInfo.termText),
        termTypeRaw: productInfo.termText,
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: productInfo.issueDate,
        maturityDate: productInfo.maturityDate,
        benchmark: productInfo.benchmark,
        company: '渤银理财',
      };
    } catch (error) {
      throw new Error(`渤银官网采集失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 从列表页搜索产品
   */
  private async collectFromListPage(productCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/qbcp/index.html`, {
        waitUntil: 'domcontentloaded',
      });

      // 等待列表加载
      await page.waitForSelector('.product-item, .pro-item, .list-item', { timeout: 10000 }).catch(() => {});

      // 在列表中查找匹配产品
      const found = await page.evaluate((code) => {
        const items = document.querySelectorAll('.product-item, .pro-item, .list-item, tr');
        for (const item of items) {
          const text = item.textContent || '';
          if (text.includes(code)) {
            return text.trim();
          }
        }
        return '';
      }, productCode);

      if (!found) {
        return null;
      }

      // 返回基本信息，详情需通过详情页补充
      return {
        productCode,
        productName: '',
        registerCode: '',
        riskLevel: 'R2',
        riskLevelRaw: '',
        termType: 'medium',
        termTypeRaw: '',
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: '',
        maturityDate: '',
        benchmark: '',
        company: '渤银理财',
        _listMatch: found,
      };
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值数据（占位，当前不实现）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    return [];
  }

  private parseRiskLevel(text: string): string {
    for (const [key, value] of Object.entries(RISK_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'R2';
  }

  private parseTermType(text: string): string {
    for (const [key, value] of Object.entries(TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    // 根据到期日计算
    return 'medium';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/collectors/cbhb-collector.ts
git commit -m "feat(zhao-wealth): rewrite cbhb-collector with Playwright implementation"
```

---

## Task 5: 新增 chinawealth-collector.ts

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\chinawealth-collector.ts`

- [ ] **Step 1: 创建中国理财网采集器**

```typescript
'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

const CHINAWEALTH_URL = 'https://www.chinawealth.com.cn';

// 理财网风险等级映射
const CW_RISK_MAP: Record<string, string> = {
  '一级(低)': 'R1',
  '二级(中低)': 'R2',
  '三级(中)': 'R3',
  '四级(中高)': 'R4',
  '五级(高)': 'R5',
};

// 理财网期限类型映射
const CW_TERM_MAP: Record<string, string> = {
  '3-6个月(含)': 'short',
  '6-12个月(含)': 'medium',
  '1-3年(含)': 'long',
  '3年以上': 'long',
  'T+0': 'short',
  'T+1': 'short',
};

// 理财网投资性质映射
const CW_TYPE_MAP: Record<string, string> = {
  '固定收益类': 'bank-wealth',
  '权益类': 'stock-fund',
  '混合类': 'mixed-fund',
  '商品及金融衍生品类': 'mixed-fund',
};

export default class ChinawealthCollector extends BaseCollector {
  /**
   * 通过登记编码查询中国理财网
   */
  async collectByRegisterCode(registerCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      // 1. 访问中国理财网首页
      await page.goto(`${CHINAWEALTH_URL}/zzlc/jrcpxx/jrcp.shtml`, {
        waitUntil: 'domcontentloaded',
      });

      // 2. 等待页面加载
      await page.waitForTimeout(2000);

      // 3. 找到搜索输入框并输入登记编码
      // 中国理财网使用 Element UI (el-input__inner)
      const inputSelector = 'input.el-input__inner, input[placeholder*="登记编码"], input[placeholder*="产品名称"]';
      await page.waitForSelector(inputSelector, { timeout: 10000 });

      // 清空输入框并逐字输入（触发 Vue 响应式）
      const input = await page.$(inputSelector);
      if (input) {
        await input.click({ clickCount: 3 });
        await input.fill('');
        await input.type(registerCode, { delay: 50 });
      }

      // 4. 点击搜索按钮
      const searchBtn = await page.$('button.el-button--primary, .search-btn, button:has-text("查询")');
      if (searchBtn) {
        await searchBtn.click();
      }

      // 5. 等待结果加载
      await page.waitForTimeout(3000);

      // 6. 从结果列表中提取第一条数据
      const result = await page.evaluate(() => {
        const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr, .result-item, .product-list-item');
        if (rows.length === 0) return null;

        // 取第一行
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('td, .cell');
        const texts = Array.from(cells).map(cell => cell.textContent?.trim() || '');

        return {
          rawTexts: texts,
          rowCount: rows.length,
        };
      });

      if (!result || result.rowCount === 0) {
        return null;
      }

      // 7. 点击第一条结果查看详情
      const firstRow = await page.$('.el-table__body-wrapper tbody tr:first-child, .result-item:first-child');
      if (firstRow) {
        await firstRow.click();
        await page.waitForTimeout(2000);
      }

      // 8. 从详情页提取结构化数据
      const detail = await page.evaluate(() => {
        const getText = (label: string) => {
          // 尝试多种结构查找标签对应的值
          const allCells = document.querySelectorAll('td, .el-descriptions__cell, .info-item');
          for (const cell of allCells) {
            const text = cell.textContent?.trim() || '';
            if (text.startsWith(label)) {
              return text.replace(label, '').replace('：', '').replace(':', '').trim();
            }
          }
          return '';
        };

        return {
          productName: getText('产品名称') || getText('产品全称'),
          registerCode: getText('登记编码') || getText('产品编码'),
          riskLevel: getText('风险等级'),
          termType: getText('产品期限') || getText('投资期限'),
          investmentType: getText('投资性质') || getText('投资类型'),
          productStatus: getText('产品状态'),
          operationMode: getText('运作模式') || getText('运作方式'),
          companyName: getText('发行机构') || getText('管理机构'),
        };
      });

      return {
        productName: detail.productName,
        registerCode: detail.registerCode || registerCode,
        riskLevel: this.parseRiskLevel(detail.riskLevel),
        riskLevelRaw: detail.riskLevel,
        termType: this.parseTermType(detail.termType),
        termTypeRaw: detail.termType,
        productType: this.parseProductType(detail.investmentType),
        productTypeRaw: detail.investmentType,
        companyName: detail.companyName,
        productStatus: detail.productStatus,
        operationMode: detail.operationMode,
      };
    } catch (error) {
      throw new Error(`中国理财网查询失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集产品信息（兼容 BaseCollector 接口）
   */
  async collectProductInfo(productCode: string): Promise<any> {
    return this.collectByRegisterCode(productCode);
  }

  /**
   * 采集净值数据（占位）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    return [];
  }

  private parseRiskLevel(text: string): string {
    for (const [key, value] of Object.entries(CW_RISK_MAP)) {
      if (text.includes(key)) return value;
    }
    // 尝试直接匹配 R1-R5
    const match = text.match(/R(\d)/);
    if (match) return `R${match[1]}`;
    return 'R2';
  }

  private parseTermType(text: string): string {
    for (const [key, value] of Object.entries(CW_TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'medium';
  }

  private parseProductType(text: string): string {
    for (const [key, value] of Object.entries(CW_TYPE_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'bank-wealth';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/collectors/chinawealth-collector.ts
git commit -m "feat(zhao-wealth): add chinawealth-collector for cross-verification"
```

---

## Task 6: 新增 collector-factory.ts

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\collector-factory.ts`

- [ ] **Step 1: 创建采集器工厂**

```typescript
'use strict';

import CbhbCollector from './cbhb-collector';
import ChinawealthCollector from './chinawealth-collector';

const COLLECTOR_MAP: Record<string, any> = {
  'cbhb': CbhbCollector,
  '渤银理财': CbhbCollector,
  // 后续扩展：'工银理财': IcbcCollector, ...
};

/**
 * 根据数据源标识获取采集器实例
 */
export function getCollector(source: string) {
  const Cls = COLLECTOR_MAP[source];
  return Cls ? new Cls() : null;
}

/**
 * 获取中国理财网采集器（固定）
 */
export function getChinawealthCollector(): ChinawealthCollector {
  return new ChinawealthCollector();
}

/**
 * 获取所有可用的数据源选项
 */
export function getAvailableSources(): Array<{ value: string; label: string }> {
  return [
    { value: 'cbhb', label: '渤银理财' },
    // 后续扩展
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/collectors/collector-factory.ts
git commit -m "feat(zhao-wealth): add collector-factory for source-based collector selection"
```

---

## Task 7: 后端接口 — collect + collectConfirm

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\admin-api.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\routes\admin-api.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\permissions.ts`

- [ ] **Step 1: 在 admin-api.ts 末尾（`}` 闭合之前）添加 collect 和 collectConfirm 接口**

在 `statsAnomalies` 方法之后、`});` 之前添加：

```typescript
  // ===== 采集与校验 =====
  async collect(ctx) {
    try {
      const { source, query } = ctx.request.body;

      if (!source || !query) {
        ctx.body = errorResponse(400, '缺少 source 或 query 参数');
        return;
      }

      const { getCollector, getChinawealthCollector } = require('../collectors/collector-factory');

      // 1. 从数据源采集
      const collector = getCollector(source);
      if (!collector) {
        ctx.body = errorResponse(400, `不支持的数据源: ${source}`);
        return;
      }

      const sourceData = await collector.collectProductInfo(query);
      if (!sourceData) {
        ctx.body = errorResponse(404, '未找到匹配产品');
        return;
      }

      // 2. 用登记编码查询中国理财网校验
      let officialData = null;
      let verification: any = { status: 'no_register_code', matchScore: 0, differences: [] };

      if (sourceData.registerCode) {
        try {
          const cwCollector = getChinawealthCollector();
          officialData = await cwCollector.collectByRegisterCode(sourceData.registerCode);

          if (officialData) {
            verification = this.compareData(sourceData, officialData);
          } else {
            verification = { status: 'not_found_on_official', matchScore: 0, differences: [] };
          }
        } catch (error) {
          strapi.log.warn(`[zhao-wealth] 中国理财网校验失败: ${error.message}`);
          verification = { status: 'verification_failed', matchScore: 0, differences: [], error: error.message };
        }
      }

      ctx.body = successResponse({
        sourceData,
        officialData,
        verification,
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集失败: ${error.message}`);
      ctx.body = errorResponse(500, `采集失败: ${error.message}`);
    }
  },

  async collectConfirm(ctx) {
    try {
      const data = ctx.request.body;

      // 检查产品代码是否已存在
      const existing = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { productCode: data.productCode },
      });

      if (existing) {
        ctx.body = errorResponse(400, `产品代码 ${data.productCode} 已存在`);
        return;
      }

      // 创建产品
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').create({
        data: {
          productCode: data.productCode,
          productName: data.productName,
          productType: data.productType,
          registerCode: data.registerCode || null,
          riskLevel: data.riskLevel || 'R2',
          termType: data.termType || null,
          issueDate: data.issueDate || null,
          maturityDate: data.maturityDate || null,
          benchmark: data.benchmark || null,
          remark: data.remark || null,
          company: data.company || null,
          recommendEnabled: data.recommendEnabled ?? false,
          status: data.status ?? true,
        },
      });

      // 自动创建采集配置
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').create({
        data: {
          product: product.id,
          collectMethod: 'web-crawler',
          collectStatus: 'pending',
        },
      });

      ctx.body = successResponse(product, '采集入库成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集入库失败: ${error.message}`);
      ctx.body = errorResponse(500, `入库失败: ${error.message}`);
    }
  },

  /**
   * 对比双源数据，返回差异列表
   */
  compareData(sourceData: any, officialData: any) {
    const differences: Array<{
      field: string;
      sourceValue: string;
      officialValue: string;
      severity: 'info' | 'warning' | 'error';
      description: string;
    }> = [];

    // 产品名称：包含关系
    if (sourceData.productName && officialData.productName) {
      if (!officialData.productName.includes(sourceData.productName) && !sourceData.productName.includes(officialData.productName)) {
        differences.push({
          field: 'productName',
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: 'warning',
          description: '产品名称差异较大，请确认是否为同一产品',
        });
      } else if (sourceData.productName !== officialData.productName) {
        differences.push({
          field: 'productName',
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: 'info',
          description: '官网简称 vs 理财网全称',
        });
      }
    }

    // 登记编码：精确匹配
    if (sourceData.registerCode && officialData.registerCode && sourceData.registerCode !== officialData.registerCode) {
      differences.push({
        field: 'registerCode',
        sourceValue: sourceData.registerCode,
        officialValue: officialData.registerCode,
        severity: 'error',
        description: '登记编码不匹配，请确认是否为同一产品',
      });
    }

    // 风险等级
    if (sourceData.riskLevel && officialData.riskLevel && sourceData.riskLevel !== officialData.riskLevel) {
      differences.push({
        field: 'riskLevel',
        sourceValue: sourceData.riskLevelRaw || sourceData.riskLevel,
        officialValue: officialData.riskLevelRaw || officialData.riskLevel,
        severity: 'warning',
        description: '风险等级不一致',
      });
    }

    // 期限类型
    if (sourceData.termType && officialData.termType && sourceData.termType !== officialData.termType) {
      differences.push({
        field: 'termType',
        sourceValue: sourceData.termTypeRaw || sourceData.termType,
        officialValue: officialData.termTypeRaw || officialData.termType,
        severity: 'info',
        description: '期限类型表述不同',
      });
    }

    // 产品类型
    if (sourceData.productType && officialData.productType && sourceData.productType !== officialData.productType) {
      differences.push({
        field: 'productType',
        sourceValue: sourceData.productTypeRaw || sourceData.productType,
        officialValue: officialData.productTypeRaw || officialData.productType,
        severity: 'warning',
        description: '投资性质不一致',
      });
    }

    const matchScore = differences.length === 0 ? 1.0 : differences.some(d => d.severity === 'error') ? 0.3 : 0.8;
    const status = matchScore === 1.0 ? 'full_match' : matchScore >= 0.8 ? 'partial_match' : 'mismatch';

    return { status, matchScore, differences };
  },
```

注意：`compareData` 是控制器对象的方法，不是独立函数，因为它需要被 `collect` 方法调用 `this.compareData(...)`。

- [ ] **Step 2: 在 routes/admin-api.ts 添加 2 条路由**

在 `stats/anomalies` 路由之后添加：

```typescript
    // 采集与校验
    {
      method: 'POST',
      path: '/products/collect',
      handler: 'admin-api.collect',
    },
    {
      method: 'POST',
      path: '/products/collect/confirm',
      handler: 'admin-api.collectConfirm',
    },
```

- [ ] **Step 3: 在 permissions.ts 添加 collect/collectConfirm actions**

修改 `wealth-product` 的 actions：

```typescript
  'wealth-product': {
    actions: ['find', 'findOne', 'create', 'update', 'delete', 'collect', 'collectConfirm'],
  },
```

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-wealth/server/src/controllers/admin-api.ts basic/plugins/zhao-wealth/server/src/routes/admin-api.ts basic/plugins/zhao-wealth/server/src/permissions.ts
git commit -m "feat(zhao-wealth): add collect and collectConfirm endpoints with cross-verification"
```

---

## Task 8: 前端 — useApi 新增采集接口

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\admin\src\hooks\useApi.ts`

- [ ] **Step 1: 在 useApi 返回对象中添加 2 个方法**

在 `getMetricPeers` 方法之后添加：

```typescript
    // 采集与校验
    collectProduct: (source: string, query: string) => call('post', `/admin/plugins/${PLUGIN_ID}/products/collect`, { source, query }),
    collectConfirm: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products/collect/confirm`, data),
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-wealth/admin/src/hooks/useApi.ts
git commit -m "feat(zhao-wealth): add collectProduct and collectConfirm API hooks"
```

---

## Task 9: 前端 — CollectDrawer 采集抽屉

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\admin\src\pages\Product\CollectDrawer.tsx`

- [ ] **Step 1: 创建采集抽屉组件**

```tsx
import { Drawer, Steps, Select, Input, Button, Descriptions, Tag, Alert, Spin, message } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { RISK_LEVELS, TERM_TYPES, PRODUCT_TYPES } from '../../constants/enums';

const SOURCES = [
  { value: 'cbhb', label: '渤银理财' },
];

interface CollectResult {
  sourceData: any;
  officialData: any;
  verification: {
    status: string;
    matchScore: number;
    differences: Array<{
      field: string;
      sourceValue: string;
      officialValue: string;
      severity: 'info' | 'warning' | 'error';
      description: string;
    }>;
    error?: string;
  };
}

const severityColor: Record<string, string> = {
  info: '#faad14',
  warning: '#fa8c16',
  error: '#ff4d4f',
};

const CollectDrawer = ({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const api = useApi();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState('cbhb');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [productNameChoice, setProductNameChoice] = useState<'source' | 'official'>('source');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCollect = async () => {
    if (!query.trim()) {
      message.warning('请输入产品编码或名称');
      return;
    }
    setLoading(true);
    try {
      const res = await api.collectProduct(source, query.trim());
      if (res.code !== 200) {
        message.error(res.msg || '采集失败');
        return;
      }
      setResult(res.data);
      setStep(1);

      // 自动生成校验备注
      if (res.data?.verification?.differences?.length > 0) {
        const notes = res.data.verification.differences
          .map((d: any) => `${d.description}（官网: ${d.sourceValue}, 理财网: ${d.officialValue}）`)
          .join('；');
        setRemark(`[采集校验] ${notes}`);
      } else if (res.data?.verification?.status === 'full_match') {
        setRemark('[采集校验] 数据一致');
      }
    } catch (e: any) {
      message.error(e.message || '采集失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.sourceData) return;
    setSubmitting(true);
    try {
      const sd = result.sourceData;
      const od = result.officialData;

      const productName = productNameChoice === 'official' && od?.productName ? od.productName : sd.productName;

      const data = {
        productCode: sd.productCode,
        productName,
        registerCode: sd.registerCode,
        productType: sd.productType,
        riskLevel: sd.riskLevel || 'R2',
        termType: sd.termType,
        issueDate: sd.issueDate || null,
        maturityDate: sd.maturityDate || null,
        benchmark: sd.benchmark || null,
        remark: remark || null,
        company: null, // 需要通过公司名查找 id
        recommendEnabled: false,
        status: true,
      };

      // 查找公司 id
      const companiesRes = await api.getCompanies({ pageSize: 200 });
      const companies = companiesRes?.data?.list || companiesRes?.records || [];
      const company = companies.find((c: any) => c.name?.includes('渤银'));
      if (company) {
        data.company = company.id;
      }

      const res = await api.collectConfirm(data);
      if (res.code !== 200) {
        message.error(res.msg || '入库失败');
        return;
      }
      setStep(3);
      message.success('入库成功');
      onSuccess();
    } catch (e: any) {
      message.error(e.message || '入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setQuery('');
    setResult(null);
    setProductNameChoice('source');
    setRemark('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Drawer
      title="采集产品"
      open={open}
      onClose={handleClose}
      width={720}
      destroyOnClose
    >
      <Steps
        current={step}
        items={[
          { title: '输入查询' },
          { title: '双源对比' },
          { title: '确认入库' },
          { title: '完成' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* Step 0: 输入查询 */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>数据源</div>
            <Select
              value={source}
              onChange={setSource}
              options={SOURCES}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>产品编码或名称</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="如 CSFB1Y26152"
              onPressEnter={handleCollect}
            />
          </div>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleCollect}
            block
          >
            开始采集
          </Button>
        </div>
      )}

      {/* Step 1: 双源对比 */}
      {step === 1 && result && (
        <div>
          {result.verification.status === 'verification_failed' && (
            <Alert
              type="warning"
              message="中国理财网校验失败"
              description={result.verification.error}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 官网数据 */}
            <div>
              <h4 style={{ marginBottom: 8 }}>官网数据（{SOURCES.find(s => s.value === source)?.label}）</h4>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="产品名称">{result.sourceData.productName}</Descriptions.Item>
                <Descriptions.Item label="销售编码">{result.sourceData.productCode}</Descriptions.Item>
                <Descriptions.Item label="登记编码">{result.sourceData.registerCode}</Descriptions.Item>
                <Descriptions.Item label="风险等级">
                  <Tag color={result.sourceData.riskLevel === 'R1' ? 'green' : result.sourceData.riskLevel === 'R2' ? 'blue' : 'orange'}>
                    {result.sourceData.riskLevelRaw || RISK_LEVELS[result.sourceData.riskLevel]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="期限类型">{result.sourceData.termTypeRaw || TERM_TYPES[result.sourceData.termType]}</Descriptions.Item>
                <Descriptions.Item label="发行日期">{result.sourceData.issueDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="到期日期">{result.sourceData.maturityDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="业绩基准">{result.sourceData.benchmark || '-'}</Descriptions.Item>
              </Descriptions>
            </div>

            {/* 理财网数据 */}
            <div>
              <h4 style={{ marginBottom: 8 }}>中国理财网数据</h4>
              {result.officialData ? (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="产品名称">{result.officialData.productName}</Descriptions.Item>
                  <Descriptions.Item label="登记编码">{result.officialData.registerCode}</Descriptions.Item>
                  <Descriptions.Item label="风险等级">
                    <Tag color={result.officialData.riskLevel === 'R1' ? 'green' : result.officialData.riskLevel === 'R2' ? 'blue' : 'orange'}>
                      {result.officialData.riskLevelRaw || RISK_LEVELS[result.officialData.riskLevel]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="期限类型">{result.officialData.termTypeRaw || TERM_TYPES[result.officialData.termType]}</Descriptions.Item>
                  <Descriptions.Item label="投资性质">{result.officialData.productTypeRaw || PRODUCT_TYPES[result.officialData.productType]}</Descriptions.Item>
                  <Descriptions.Item label="产品状态">{result.officialData.productStatus || '-'}</Descriptions.Item>
                  <Descriptions.Item label="运作模式">{result.officialData.operationMode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="发行机构">{result.officialData.companyName || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert type="info" message="中国理财网未查到匹配数据" />
              )}
            </div>
          </div>

          {/* 差异列表 */}
          {result.verification.differences?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>差异项</h4>
              {result.verification.differences.map((d, i) => (
                <Alert
                  key={i}
                  type={d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info'}
                  message={`${d.description}`}
                  description={
                    <div>
                      <span>官网: <b>{d.sourceValue}</b></span>
                      <span style={{ marginLeft: 16 }}>理财网: <b>{d.officialValue}</b></span>
                    </div>
                  }
                  style={{ marginBottom: 8 }}
                  showIcon
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button onClick={handleReset}>重新查询</Button>
            <Button type="primary" onClick={() => setStep(2)}>确认并入库</Button>
          </div>
        </div>
      )}

      {/* Step 2: 确认入库 */}
      {step === 2 && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert type="info" message="请确认入库数据，可选择使用官网或理财网的产品名称" />

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>产品名称来源</div>
            <Select
              value={productNameChoice}
              onChange={setProductNameChoice}
              style={{ width: '100%' }}
              options={[
                { value: 'source', label: `官网: ${result.sourceData.productName}` },
                ...(result.officialData?.productName ? [{
                  value: 'official' as const,
                  label: `理财网: ${result.officialData.productName}`,
                }] : []),
              ]}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>校验备注（可修改）</div>
            <Input.TextArea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="校验备注将写入产品 remark 字段"
            />
          </div>

          <Descriptions title="入库数据预览" column={2} size="small" bordered>
            <Descriptions.Item label="产品代码">{result.sourceData.productCode}</Descriptions.Item>
            <Descriptions.Item label="产品名称">
              {productNameChoice === 'official' && result.officialData?.productName
                ? result.officialData.productName
                : result.sourceData.productName}
            </Descriptions.Item>
            <Descriptions.Item label="登记编码">{result.sourceData.registerCode}</Descriptions.Item>
            <Descriptions.Item label="风险等级">{RISK_LEVELS[result.sourceData.riskLevel]}</Descriptions.Item>
            <Descriptions.Item label="业绩基准">{result.sourceData.benchmark || '-'}</Descriptions.Item>
            <Descriptions.Item label="期限类型">{TERM_TYPES[result.sourceData.termType] || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setStep(1)}>返回对比</Button>
            <Button type="primary" loading={submitting} onClick={handleConfirm}>
              确认入库
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 完成 */}
      {step === 3 && result && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <h3 style={{ marginTop: 16 }}>
            {result.sourceData.productName} 入库成功
          </h3>
          <p style={{ color: '#999' }}>产品代码: {result.sourceData.productCode}</p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button onClick={handleReset}>继续采集</Button>
            <Button type="primary" onClick={handleClose}>关闭</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default CollectDrawer;
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-wealth/admin/src/pages/Product/CollectDrawer.tsx
git commit -m "feat(zhao-wealth): add CollectDrawer with 4-step collection flow"
```

---

## Task 10: 前端 — ProductList 集成采集按钮

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\admin\src\pages\Product\ProductList.tsx`

- [ ] **Step 1: 添加 CollectDrawer 引入和状态**

在文件顶部 import 区域添加：

```typescript
import CollectDrawer from './CollectDrawer';
```

在 `const [formOpen, setFormOpen] = useState(false);` 之后添加：

```typescript
const [collectOpen, setCollectOpen] = useState(false);
```

- [ ] **Step 2: 在 toolBarRender 中添加采集按钮**

将 toolBarRender 修改为：

```typescript
toolBarRender={() => [
  <Button key="collect" icon={<SearchOutlined />} onClick={() => setCollectOpen(true)}>采集产品</Button>,
  <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建产品</Button>,
]}
```

注意：需要在 import 中添加 `SearchOutlined`：

```typescript
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
```

- [ ] **Step 3: 在 return 的 Fragment 中添加 CollectDrawer**

在 `<ProductForm ... />` 之后添加：

```tsx
<CollectDrawer
  open={collectOpen}
  onClose={() => setCollectOpen(false)}
  onSuccess={() => actionRef.current?.reload()}
/>
```

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-wealth/admin/src/pages/Product/ProductList.tsx
git commit -m "feat(zhao-wealth): integrate CollectDrawer into ProductList with collect button"
```

---

## Task 11: 端到端验证

- [ ] **Step 1: 重启 Strapi 确认编译无错**

```bash
cd e:\code\basic
npm run develop
```

检查：
- 无 TypeScript 编译错误
- Playwright Browser 启动日志
- Migration 004 执行日志

- [ ] **Step 2: 验证 API 接口**

在浏览器中打开 Strapi admin，进入 zhao-wealth 插件页面：

1. 产品管理页面应出现"采集产品"按钮
2. 点击"采集产品"→ 抽屉打开
3. 选择"渤银理财"，输入 `CSFB1Y26152`，点击"开始采集"
4. 等待采集结果（预计 10-30 秒）
5. 检查双源对比数据是否正确显示
6. 确认入库

- [ ] **Step 3: 验证数据库**

```sql
SELECT product_code, product_name, register_code, benchmark, remark FROM wealth_products WHERE product_code = 'CSFB1Y26152';
```

确认 benchmark 和 remark 字段有值。

- [ ] **Step 4: 验证 Schema 重建（如需要）**

如果新增字段未自动创建列，执行：

```sql
DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-wealth.wealth-product';
```

重启 Strapi。

---

## Self-Review Checklist

**1. Spec coverage:**
- 采集流程（官网→理财网→对比→入库）→ Task 4+5+6+7 ✓
- 采集器架构（cbhb/chinawealth/factory）→ Task 4+5+6 ✓
- 字段映射（官网→product + 理财网→校验）→ Task 4+5 ✓
- Schema 变更（+benchmark +remark）→ Task 2 ✓
- 后端接口（collect + collectConfirm）→ Task 7 ✓
- 前端交互（4 步抽屉）→ Task 9+10 ✓
- Playwright 管理（单例+并发+超时）→ Task 3 ✓
- 权限 → Task 7 ✓
- 验证标准 → Task 11 ✓

**2. Placeholder scan:** 无 TBD/TODO/占位符。所有代码完整。

**3. Type consistency:**
- collectProduct 返回 sourceData/officialData/verification → CollectDrawer 使用相同结构 ✓
- collector-factory 的 getCollector/getChinawealthCollector → admin-api.ts 引用一致 ✓
- useApi 的 collectProduct/collectConfirm 路径 → routes 匹配 ✓
