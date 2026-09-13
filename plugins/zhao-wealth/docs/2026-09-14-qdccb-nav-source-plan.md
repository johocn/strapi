# 青岛银行净值源路由 + 采集网址公示 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 subagent-driven 或 executing-plans 逐任务执行本计划。步骤使用 `- [ ]` 复选框追踪。

**Goal:** 为 zhao-wealth 增加青岛银行官网采集器（qdccb，Playwright 页面内 fetch）、将中国理财网注册为可选净值源（chinawealth），并为产品新增"采集网址"字段（navSourceUrl）供 C 端展示净值来源。

**Architecture:** 复用现有 `collectRules.source` 按产品路由净值采集器。新增 qdccb 采集器（官网页面内 fetch，纯 HTTP 已验证不可用）；chinawealth 采集器修复净值参数约定（登记编码优先取 options.registerCode）并注册进 factory。`wealth-product` 新增 `navSourceUrl` 字段，采集器返回 → 采集中心可编辑 → 入库 → C 端详情页展示"净值来源"链接。

**Tech Stack:** Strapi 插件（TypeScript）、Playwright（playwright-manager 复用）、UniApp Vue3（管理端 web / C 端 strapi-wealth）

**设计文档:** `plugins/zhao-wealth/docs/2026-09-14-qdccb-nav-source-design.md`

**部署铁律（务必遵守）:** 插件 `server/src` 改动后必须 `npm run build` 重建 `plugins/zhao-wealth/dist`，dist 与源码一起 commit + push，再走 deploy.sh；只提交源码不重建 dist 会静默失效。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `basic/plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json` | 修改 | 新增 `navSourceUrl` 字段 |
| `basic/plugins/zhao-wealth/server/src/collectors/chinawealth-collector.ts` | 修改 | collectNavData 参数修复 + 返回 navSourceUrl |
| `basic/plugins/zhao-wealth/server/src/collectors/qingdao-collector.ts` | 新建 | 青岛银行官网采集器（Playwright 页面内 fetch） |
| `basic/plugins/zhao-wealth/server/src/collectors/collector-factory.ts` | 修改 | 注册 qdccb/chinawealth + getAvailableSources |
| `basic/plugins/zhao-wealth/server/src/collectors/index.ts` | 修改 | 导出 QingdaoCollector |
| `basic/plugins/zhao-wealth/server/src/controllers/admin-api.ts` | 修改 | confirmCollect 写入 navSourceUrl |
| `web/src/pages/wealth/collect/index.vue` | 修改 | 数据源选项 + 采集网址编辑 |
| `web/src/pages/wealth/product/form.vue` | 修改 | 产品编辑页采集网址字段 |
| `strapi-wealth/pages/detail/index.vue` | 修改 | C 端净值来源展示块 |

---

### Task 1: wealth-product schema 新增 navSourceUrl 字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json`

- [ ] **Step 1: 添加字段**

在 `registerCode` 字段定义后（`"registerCode": { "type": "string", "required": true, "unique": true },` 之后）新增：

```json
"navSourceUrl": { "type": "string" },
```

即字段块变为（仅示意新增行）：

```json
    "registerCode": { "type": "string", "required": true, "unique": true },
    "navSourceUrl": { "type": "string" },
```

注意保持 JSON 合法（逗号）。

- [ ] **Step 2: 校验 JSON**

Run: `python -m json.tool e:\code\basic\plugins\zhao-wealth\server\src\content-types\wealth-product\schema.json > $null`
Expected: 无输出无报错（JSON 合法）

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-wealth/server/src/content-types/wealth-product/schema.json && git commit -m "feat(zhao-wealth): add navSourceUrl field to wealth-product"
```

---

### Task 2: ChinawealthCollector 净值参数修复 + 返回 navSourceUrl

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\chinawealth-collector.ts`

背景：调用方约定 `collector.collectNavData(productCode, { registerCode })`（见 `controllers/collect.ts` collectNavSync），但 ChinawealthCollector 现有 `collectNavData(registerCode)` 只认第一参数。改为：登记编码优先取 `options.registerCode`，无则回退第一参数（兼容旧调用）。同时 `collectProductInfo`/`collectByRegisterCode` 返回值增加 `navSourceUrl`。

- [ ] **Step 1: 先读文件确认现有方法结构**

Run: `Get-Content e:\code\basic\plugins\zhao-wealth\server\src\collectors\chinawealth-collector.ts`
确认 `collectNavData`、`collectByRegisterCode`、`collectProductInfo` 三个方法及 Playwright 使用方式（`createPage`/`closePage`、`page.on('response')` 拦截、表格解析）。

- [ ] **Step 2: 改造 collectNavData 签名与参数解析**

将方法签名改为：

```ts
async collectNavData(productCode: string, options?: { registerCode?: string }): Promise<any[]> {
  const registerCode = (options && options.registerCode) || productCode;
  // 后续逻辑不变，使用 registerCode 打开理财网详情页采集净值
  ...
}
```

在方法体首行插入 registerCode 解析；其余 Playwright 采集逻辑保持原样。

- [ ] **Step 3: collectByRegisterCode / collectProductInfo 返回值增加 navSourceUrl**

在两个方法返回的产品字段对象中加入：

```ts
navSourceUrl: `https://xinxipilu.chinawealth.com.cn/queryMenu/prodType/prodTypeDetail?prodRegCode=${registerCode}`,
```

（registerCode 为方法内已解析的登记编码变量；若该方法内部变量名不同，按实际变量名替换）

- [ ] **Step 4: 类型检查**

Run: `cd e:\code\basic\plugins\zhao-wealth && npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错（若项目无 tsconfig 或报错为既有问题，记录并跳过）

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-wealth/server/src/collectors/chinawealth-collector.ts && git commit -m "fix(zhao-wealth): chinawealth collector accept registerCode from options and expose navSourceUrl"
```

---

### Task 3: 新建 qingdao-collector.ts（Playwright 页面内 fetch）

**Files:**
- Create: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\qingdao-collector.ts`

背景：纯 HTTP POST `https://www.qdccb.com/eportal/ui` 返回 0 条（已验证 3 次），必须用 Playwright 打开官网净值查询页后在页面内 fetch（自动带 session cookie/Referer）。

- [ ] **Step 1: 先写本机验证脚本，实测接口返回字段名**

Create: `e:\code\.tmp\verify-qdccb.js`

```js
const { chromium } = require('playwright');

const PAGE_URL = 'https://www.qdccb.com/eportal/ui?pageId=cad5fba118244923ab077d6071fc4b4d&aisiteOutPageId=b9d7863b63f74689b5fe16de82f45bce';
const CODE = process.argv[2] || 'CCRSFDKFJZ03A9';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const post = async (portlet) => {
    const params = new URLSearchParams({
      moduleId: '3567249ec8ca464d8c77a548570c2928',
      pageSize: '10', pageNo: '1', prdCode: CODE,
      start: '0', end: '10', portal.url: portlet,
    }).toString();
    return page.evaluate(async ({ url, params }) => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: params,
      });
      return resp.json();
    }, { url: '/eportal/ui?portal.url=' + encodeURIComponent(portlet), params });
  };

  const info = await post('/portlet/finance!queryData.portlet');
  console.log('INFO success=', info.success, 'total=', info.totalCount);
  const rows = info.result || info.aaData || [];
  console.log('INFO rows=', rows.length);
  if (rows.length) console.log('INFO row0=', JSON.stringify(rows[0], null, 1));

  const nav = await post('/portlet/finance!queryNavData.portlet');
  console.log('NAV success=', nav.success, 'total=', nav.totalCount);
  const navRows = nav.result || nav.aaData || [];
  console.log('NAV rows=', navRows.length);
  if (navRows.length) console.log('NAV row0=', JSON.stringify(navRows[0], null, 1));

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: 运行验证脚本**

Run: `cd e:\code\basic\plugins\zhao-wealth && node e:\code\.tmp\verify-qdccb.js CCRSFDKFJZ03A9`

Expected: `INFO rows >= 1` 且 `NAV rows >= 1`。**记录 INFO row0 与 NAV row0 的实际字段名**，用于 Step 4 字段映射。
若 `require('playwright')` 解析失败，用 `cd e:\code\basic && node ...` 重试（playwright 可能装在根 node_modules）；仍失败则检查 `plugins/zhao-wealth/package.json` dependencies 确认 playwright 依赖位置。

- [ ] **Step 3: 用 CCRSFDKFJZ09A 再测一次**

Run: `cd e:\code\basic\plugins\zhao-wealth && node e:\code\.tmp\verify-qdccb.js CCRSFDKFJZ09A`
Expected: 记录结果。若 INFO rows=0（官网查不到），符合预期——该产品净值走 chinawealth（Task 5 配置）。

- [ ] **Step 4: 依据实测字段名创建采集器**

Create: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\qingdao-collector.ts`

```ts
import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

const QDCCB_PAGE_URL =
  'https://www.qdccb.com/eportal/ui?pageId=cad5fba118244923ab077d6071fc4b4d&aisiteOutPageId=b9d7863b63f74689b5fe16de82f45bce';
const MODULE_ID = '3567249ec8ca464d8c77a548570c2928';

// 字段候选键（以本机 verify-qdccb.js 实测为准，仅保留实际命中的键）
const KEY_PRODUCT_CODE = ['prdCode', 'productCode', 'cpdm'];
const KEY_PRODUCT_NAME = ['prdName', 'productName', 'cpmc'];
const KEY_REGISTER_CODE = ['registerCode', 'regCode', 'djbm'];
const KEY_RISK_LEVEL = ['riskLevel', 'fxdj'];
const KEY_NAV_DATE = ['navDate', 'gzrq', 'rq'];
const KEY_UNIT_NAV = ['unitNav', 'dwjz'];
const KEY_ACC_NAV = ['accNav', 'ljjz'];

function pick(row: any, keys: string[]): string {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') return String(row[k]);
  }
  return '';
}

async function fetchPortlet(page: any, portlet: string, prdCode: string): Promise<any> {
  const params = new URLSearchParams({
    moduleId: MODULE_ID,
    pageSize: '10',
    pageNo: '1',
    prdCode,
    start: '0',
    end: '10',
    portal.url: portlet,
  }).toString();
  return page.evaluate(async ({ url, body }) => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
    });
    return resp.json();
  }, { url: '/eportal/ui?portal.url=' + encodeURIComponent(portlet), body: params });
}

export default class QingdaoCollector extends BaseCollector {
  async collectProductInfo(productCode: string): Promise<any> {
    const page = await createPage();
    try {
      await page.goto(QDCCB_PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      const data = await fetchPortlet(page, '/portlet/finance!queryData.portlet', productCode);
      const rows = data.result || data.aaData || [];
      if (!rows.length) {
        throw new Error(`未找到匹配产品（${productCode}），可改用中国理财网源（需登记编码）`);
      }
      const row = rows[0];
      return {
        productCode: pick(row, KEY_PRODUCT_CODE) || productCode,
        productName: pick(row, KEY_PRODUCT_NAME),
        registerCode: pick(row, KEY_REGISTER_CODE),
        riskLevel: pick(row, KEY_RISK_LEVEL),
        navSourceUrl: QDCCB_PAGE_URL,
      };
    } finally {
      await closePage(page);
    }
  }

  async collectNavData(productCode: string): Promise<any[]> {
    const page = await createPage();
    try {
      await page.goto(QDCCB_PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      const data = await fetchPortlet(page, '/portlet/finance!queryNavData.portlet', productCode);
      const rows = data.result || data.aaData || [];
      return rows.map((row: any) => ({
        navDate: pick(row, KEY_NAV_DATE),
        unitNav: pick(row, KEY_UNIT_NAV),
        accNav: pick(row, KEY_ACC_NAV),
        ...row,
      }));
    } finally {
      await closePage(page);
    }
  }
}
```

注意：
1. 若 `createPage`/`closePage` 实际导出名不同（先读 `server/src/playwright-manager.ts` 确认），按实际导出调整 import
2. `createPage` 的签名若需要参数（如 `{ timeout }`），按实际用法传
3. 候选键数组按 Step 2 实测字段名精简，删除未命中的键
4. qdccb 官网只返回当前在售/可查产品；查不到时抛错走 catch（collect.ts 会转 404）

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-wealth/server/src/collectors/qingdao-collector.ts && git commit -m "feat(zhao-wealth): add qingdao bank collector (playwright in-page fetch)"
```

---

### Task 4: collector-factory 注册 qdccb/chinawealth + index.ts 导出

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\collector-factory.ts`
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\collectors\index.ts`

- [ ] **Step 1: 读 collector-factory.ts 确认结构**

Run: `Get-Content e:\code\basic\plugins\zhao-wealth\server\src\collectors\collector-factory.ts`
确认 `COLLECTOR_MAP` 与 `getAvailableSources()` 现状。

- [ ] **Step 2: 注册映射**

在 `COLLECTOR_MAP` 中增加：

```ts
import QingdaoCollector from './qingdao-collector';
import ChinawealthCollector from './chinawealth-collector';
// 在 map 中：
'qdccb': QingdaoCollector,
'青岛银行': QingdaoCollector,
'chinawealth': ChinawealthCollector,
'中国理财网': ChinawealthCollector,
```

- [ ] **Step 3: getAvailableSources 增加两项**

在返回数组中加入：

```ts
{ value: 'qdccb', label: '青岛银行' },
{ value: 'chinawealth', label: '中国理财网' },
```

- [ ] **Step 4: index.ts 导出 QingdaoCollector**

在 `e:\code\basic\plugins\zhao-wealth\server\src\collectors\index.ts` 中与现有导出并列增加：

```ts
export { default as QingdaoCollector } from './qingdao-collector';
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-wealth/server/src/collectors/collector-factory.ts plugins/zhao-wealth/server/src/collectors/index.ts && git commit -m "feat(zhao-wealth): register qdccb and chinawealth collectors"
```

---

### Task 5: confirmCollect 写入 navSourceUrl

**Files:**
- Modify: `e:\code\basic\plugins\zhao-wealth\server\src\controllers\admin-api.ts`

- [ ] **Step 1: 定位 confirmCollect 产品创建处**

Run: `rg -n "confirmCollect|create\(\{ data|collectRules" e:\code\basic\plugins\zhao-wealth\server\src\controllers\admin-api.ts`
定位创建 product 的 `create({ data: {...} })` 调用。

- [ ] **Step 2: 写入 navSourceUrl**

在 product 创建 data 对象中加入：

```ts
navSourceUrl: data.navSourceUrl || null,
```

若创建处按字段白名单拼装（如 `{ productCode: ..., productName: ... }`），加入该行；若直接透传 `data`，则无需改动（确认即可）。

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-wealth/server/src/controllers/admin-api.ts && git commit -m "feat(zhao-wealth): persist navSourceUrl on product confirm"
```

---

### Task 6: 管理端采集中心增加数据源与采集网址编辑

**Files:**
- Modify: `e:\code\web\src\pages\wealth\collect\index.vue`

- [ ] **Step 1: 读文件确认现有结构**

Run: `Get-Content e:\code\web\src\pages\wealth\collect\index.vue`
确认 `sourceOptions`、`sourceValues`、`query` 输入、`editForm`、`handleConfirm`、`initEditForm` 现状。

- [ ] **Step 2: 数据源选项增加两项**

在 `sourceOptions` 中增加：

```js
{ value: 'qdccb', label: '青岛银行' },
{ value: 'chinawealth', label: '中国理财网' },
```

`sourceValues` 对应增加 `'qdccb'`、`'chinawealth'`（若为数组）。

- [ ] **Step 3: 查询输入 placeholder 动态化**

根据选中 source 切换 placeholder：

```js
const queryPlaceholder = computed(() => {
  if (source === 'chinawealth') return '请输入登记编码';
  if (source === 'qdccb') return '请输入产品代码（含类型后缀，如 CCRSFDKFJZ03A9）';
  return '请输入产品代码';
});
```

模板中 query 输入框 `:placeholder="queryPlaceholder"`。

- [ ] **Step 4: editForm 增加采集网址**

- 模板中（产品名称输入框附近）增加：

```html
<van-field v-model="editForm.navSourceUrl" label="采集网址" placeholder="净值来源网址，客户可自行查阅校验" />
```

- `initEditForm` / 编辑回填处增加 `navSourceUrl: ''`（或回填 `data.navSourceUrl`）
- `handleConfirm` 提交 payload 中增加 `navSourceUrl: editForm.navSourceUrl`（与 `source` 一起传给 confirm 接口）

- [ ] **Step 5: 本地构建校验**

Run: `cd e:\code\web && npx vite build --mode development 2>&1 | Select-Object -Last 5`（若项目构建命令不同，按 package.json scripts 调整）
Expected: 构建通过，无语法错误

- [ ] **Step 6: 提交**

```bash
cd e:\code\web && git add src/pages/wealth/collect/index.vue && git commit -m "feat(web): add qdccb/chinawealth sources and navSourceUrl editing in collect center"
```

---

### Task 7: 管理端产品编辑页增加采集网址字段

**Files:**
- Modify: `e:\code\web\src\pages\wealth\product\form.vue`

- [ ] **Step 1: 读文件确认表单结构**

Run: `Get-Content e:\code\web\src\pages\wealth\product\form.vue`
确认表单字段、数据加载（编辑回填）与提交 payload 拼装位置。

- [ ] **Step 2: 增加表单字段**

模板中增加：

```html
<van-field v-model="form.navSourceUrl" label="采集网址" placeholder="净值来源网址（客户可自行查阅校验）" />
```

- 表单初始数据增加 `navSourceUrl: ''`
- 编辑回填处增加 `navSourceUrl: data.navSourceUrl || ''`
- 提交 payload 中增加 `navSourceUrl: form.navSourceUrl`

- [ ] **Step 3: 构建校验**

Run: `cd e:\code\web && npx vite build --mode development 2>&1 | Select-Object -Last 5`
Expected: 构建通过

- [ ] **Step 4: 提交**

```bash
cd e:\code\web && git add src/pages/wealth/product/form.vue && git commit -m "feat(web): add navSourceUrl field to product edit form"
```

---

### Task 8: C 端产品详情页展示净值来源

**Files:**
- Modify: `e:\code\strapi-wealth\pages\detail\index.vue`

背景：C 端详情数据来自 `GET /api/zhao-wealth/content/product/:id`，product service 直接返回整条记录，新增字段 `navSourceUrl` 自动透出，后端无需改动。

- [ ] **Step 1: 读文件确认详情页结构**

Run: `Get-Content e:\code\strapi-wealth\pages\detail\index.vue`
确认产品数据对象（如 `product` / `detail`）与净值区块渲染位置。

- [ ] **Step 2: 增加净值来源展示块**

在净值区块附近（有 `navSourceUrl` 时才渲染）增加：

```html
<view v-if="product && product.navSourceUrl" class="nav-source">
  <text class="nav-source-label">净值来源：</text>
  <text class="nav-source-org">{{ product.company?.name || '' }}</text>
  <text class="nav-source-link" @click="openNavSource">{{ product.navSourceUrl }}</text>
</view>
```

脚本中增加：

```js
function openNavSource() {
  if (product.value && product.value.navSourceUrl) {
    // #ifdef H5
    window.open(product.value.navSourceUrl, '_blank');
    // #endif
  }
}
```

样式 `.nav-source` 等按页面现有视觉风格补充（灰色小字、可点击下划线）。若页面数据变量名不同（非 `product`），按实际变量替换。

- [ ] **Step 3: 构建校验**

Run: `cd e:\code\strapi-wealth && npx vite build 2>&1 | Select-Object -Last 5`
Expected: 构建通过（若项目构建命令不同，按 package.json scripts 调整）

- [ ] **Step 4: 提交**

```bash
cd e:\code\strapi-wealth && git add pages/detail/index.vue && git commit -m "feat(wealth-fe): show nav source url on product detail"
```

---

### Task 9: 构建与部署（含 dist 铁律）

**Files:**
- 部署产物

- [ ] **Step 1: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`
Expected: dist 生成成功

- [ ] **Step 2: 验证 dist 含新代码（铁律自检）**

Run: `rg -n "QingdaoCollector|chinawealth|navSourceUrl" e:\code\basic\plugins\zhao-wealth\dist`
Expected: 三处关键字均有命中（dist 已重建）。无命中 = 未重建，回到 Step 1。

- [ ] **Step 3: 提交 dist 与源码并推送**

```bash
cd e:\code\basic && git add plugins/zhao-wealth && git commit -m "build(zhao-wealth): rebuild dist with qdccb/chinawealth collectors and navSourceUrl" && git push
```

- [ ] **Step 4: 执行后端部署**

按既有 deploy.sh 流程部署到 joho（`ssh joho`），部署后重启 Strapi 使新 schema 字段建列。

- [ ] **Step 5: 验证后端接口**

```bash
curl -s http://127.0.0.1:1337/api/zhao-wealth/v1/admin/collect-sources
```
Expected: 返回 sources 包含 `qdccb`（青岛银行）与 `chinawealth`（中国理财网）。
（接口路径以实际路由为准，若无 collect-sources 接口，通过前端采集中心下拉验证）

- [ ] **Step 6: 管理端部署**

构建 web 并部署（按 web 项目既有部署脚本/流程）。

- [ ] **Step 7: C 端部署**

构建 strapi-wealth 并部署到 v.joho.cn/wealth（构建需 `base: '/wealth/'`，见项目既有 deploy-wealth.ps1）。

- [ ] **Step 8: 端到端验证**

1. 管理端采集中心：选"青岛银行"→ 输 `CCRSFDKFJZ03A9` → 采集到产品信息（含采集网址）→ 入库（source=qdccb）→ 触发净值采集成功
2. 选"中国理财网"→ 输登记编码（CCRSFDKFJZ09A 的登记编码）→ 入库（source=chinawealth）→ 触发净值走理财网
3. C 端 v.joho.cn/wealth 产品详情：净值来源链接可见、可跳转
4. 无 navSourceUrl 的产品：详情页不显示来源块

---

## Self-Review 记录

- **Spec 覆盖**：qdccb 采集器（Task 3）、chinawealth 注册+参数修复（Task 2/4）、navSourceUrl 字段（Task 1）、采集网址入库（Task 5）、管理端采集中心与编辑（Task 6/7）、C 端展示（Task 8）、部署与验证（Task 9）——设计文档 3.1-3.6、第 6 节验证计划全覆盖。
- **占位符扫描**：无 TBD/TODO；候选键数组为有意为之（字段名需实测，Task 3 Step 1-2 已给实测路径与命令）。
- **类型一致性**：`collectNavData(productCode, options?: { registerCode?: string })` 在 Task 2/3 与 collect.ts 调用约定一致；`navSourceUrl` 字段名在后端 schema、采集器返回、管理端表单、C 端展示中统一。
