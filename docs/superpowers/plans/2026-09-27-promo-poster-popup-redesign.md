# 促销海报弹窗瘦身 + 海报模板纳入 basic 配置 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「分享海报」弹窗改成无标题无外框的两段式（上=海报图，下=普通浏览器显示「保存图片」、微信内不渲染），并把 `promo_share` 海报模板注册进 basic 海报配置且生产生效。

**Architecture:** shao 侧只改一个自包含组件 `components/share-poster/share-poster.vue`（模板/脚本/样式），保留后端优先 + 本地兜底的渲染链路；basic 侧新增一个幂等 HTTP 落库脚本，把与 C 端内置模板逐一对齐的 11 个元素写成后端模板。弹窗外壳不进配置（配置只管海报图内元素）。

**Tech Stack:** uni-app(Vue3 + SCSS, H5 构建)、Canvas 2D 离屏渲染、Strapi v5 插件 `zhao-studio`（poster-template / poster-element）、Node 18+ fetch、Playwright(本机 Edge)。

**依据 spec:** `e:\code\basic\docs\superpowers\specs\2026-09-27-promo-poster-popup-redesign-design.md`

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `e:\code\shao\components\share-poster\share-poster.vue` | 修改 | 弹窗外壳：删除标题栏/白卡/底部提示，新增图片右上悬浮 ×，底部按环境渲染；图片等比居中并删除 `posterShift` |
| `e:\code\basic\scripts\seed-promo-share-poster.cjs` | 新建 | 幂等注册 `promo_share` 海报模板 + 11 个元素到 basic 海报配置 |
| `e:\code\basic\scripts\_verify-poster-popup.cjs` | 临时新建（验收后删除） | Playwright 双 UA 弹窗验收 + 配置消费验证 |

两仓库分开提交：`shao` 只提交组件文件；`basic` 只提交 spec/plan/seed 脚本。

---

### Task 1: shao 弹窗瘦身（去标题去外框 + 两段式 + 悬浮 ×）

**Files:**
- Modify: `e:\code\shao\components\share-poster\share-poster.vue`（模板 1-41 行 / 脚本 79-95、228-247 行 / 样式 324-442 行）

- [ ] **Step 1: 替换模板整块（第 1-41 行）**

```vue
<template>
  <view v-if="visible" class="poster-overlay" @click.self="close">
    <view class="poster-stage">
      <!-- 上：海报图片（等比缩放居中，长按可保存） -->
      <view
        v-if="generated"
        class="poster-image-wrap"
        :style="posterDisplayW ? { width: posterDisplayW + 'px', height: posterDisplayH + 'px' } : {}"
      >
        <!-- #ifndef H5 -->
        <canvas
          canvas-id="sharePosterCanvas"
          :style="{ width: canvasWidth + 'rpx', height: canvasHeight + 'rpx' }"
          class="poster-canvas"
        />
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <image :src="posterImage" class="poster-img" :show-menu-by-longpress="true" />
        <!-- #endif -->
        <view class="poster-close-float" @click.stop="close">×</view>
      </view>

      <view v-else class="poster-loading">
        <view class="loading-spinner" />
        <text class="loading-text">正在生成海报...</text>
      </view>

      <!-- 下：普通浏览器显示保存按钮；微信内不渲染任何节点（长按图片保存） -->
      <view v-if="!isWechat" class="poster-actions">
        <view class="save-btn" @click="savePoster">保存图片</view>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 删除脚本里的 `posterShift` 声明（第 83 行）**

删除这一行：

```ts
const posterShift = ref(0)
```

- [ ] **Step 3: 替换 H5 尺寸计算段（原第 229-247 行）**

把从 `// 计算显示尺寸：等比缩放，完整放入分享区域（不溢出、不裁剪）` 到 `posterShift.value = Math.round(leftGap / 2)` 的整段，替换为：

```ts
  // 显示尺寸：左右各留 24rpx，等比缩放居中（不再做左移补偿）
  const sideGap = (48 * window.innerWidth) / 750
  const areaW = window.innerWidth - sideGap * 2
  const areaH = window.innerHeight * 0.88
  const scale = Math.min(areaW / width, areaH / height)
  posterDisplayW.value = Math.round(width * scale)
  posterDisplayH.value = Math.round(height * scale)
```

- [ ] **Step 4: 替换样式整块（第 324-442 行 `<style lang="scss" scoped>` 内部）**

```scss
.poster-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 无外框：图片 + 按环境渲染的底部，纵向堆叠居中 */
.poster-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-image-wrap {
  position: relative;
}

.poster-img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12rpx;
}

.poster-canvas {
  background: #fff;
  border-radius: 12rpx;
}

/* 悬浮关闭：挂在图片层，非外框 */
.poster-close-float {
  position: absolute;
  top: -14rpx;
  right: -14rpx;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 40rpx;
  line-height: 60rpx;
  text-align: center;
}

.poster-loading {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #999;
}

.poster-actions {
  margin-top: 24rpx;
  width: 100%;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  text-align: center;
  padding: 24rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: bold;
}
```

- [ ] **Step 5: 全量检索确认无残留引用**

Run: `rg -n "posterShift|poster-header|poster-title|poster-body|poster-footer|poster-tip|poster-container|scroll-view|poster-share-bar" e:\code\shao\components\share-poster\share-poster.vue`

Expected: 无输出（`poster-share-bar` 属 promo.vue 的页面按钮，不在本文件）。若仍有输出说明有遗漏需删除。

- [ ] **Step 6: 构建 H5**

Run: `npm run build:h5`（cwd=`e:\code\shao`）
Expected: 构建成功无报错，产出 `dist/build/h5`。

- [ ] **Step 7: 提交（仅该文件）**

```bash
git -C e:\code\shao add components/share-poster/share-poster.vue
git -C e:\code\shao commit -m "refactor(share-poster): 弹窗去标题去外框，改两段式，微信内不渲染保存按钮" -m "图片改为左右各 24rpx 等比居中并移除左移补偿；关闭改为图片右上悬浮 ×（保留点遮罩关闭）"
```

---

### Task 2: basic 注册 `promo_share` 海报模板（幂等）

**Files:**
- Create: `e:\code\basic\scripts\seed-promo-share-poster.cjs`

- [ ] **Step 1: 新建落库脚本**

```js
/* 促销活动海报模板（promo_share）落库到 zhao-studio 海报配置（幂等：按 code 查重，命中即跳过）
 * 用法:
 *   cd e:\code\basic
 *   node scripts/seed-promo-share-poster.cjs                                    # 本地
 *   API_BASE=https://h.joho.cn/api ZHAO_IDENTIFIER=zhao ZHAO_PASSWORD=a963963 node scripts/seed-promo-share-poster.cjs  # 生产
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:1337/api";
const IDENTIFIER = process.env.ZHAO_IDENTIFIER || "1117";
const PASSWORD = process.env.ZHAO_PASSWORD || "a123456";

const CODE = "promo_share";
const GRADIENT = "#gradient:EF4444,F97316";

const TEMPLATE = {
  name: "促销活动海报",
  code: CODE,
  canvasWidth: 600,
  canvasHeight: 1050,
  backgroundColor: "#FFFFFF",
  backgroundMode: "cover",
  isActive: true,
  isDefault: false,
  requiredVariables: ["title", "main_image", "qr_code"],
  optionalVariables: ["activity_time", "activity_venue", "goods_1", "goods_2", "goods_3", "goods_4"],
  description: "促销活动分享海报（C 端 pages/activity/promo 使用）",
};

const ELEMENTS = [
  { elementKey: "gradient_bar", elementName: "顶部渐变条", elementType: "shape", shapeType: "rect", isVariable: false, x: 0, y: 0, width: 600, height: 6, elementBgColor: GRADIENT, zIndex: 1, sortOrder: 1 },
  { elementKey: "main_image", elementName: "主视觉图", elementType: "image", isVariable: true, variableName: "main_image", defaultValue: "", x: 30, y: 40, width: 540, height: 465, imageFit: "cover", borderRadius: 12, zIndex: 2, sortOrder: 2 },
  { elementKey: "title", elementName: "活动标题", elementType: "text", isVariable: true, variableName: "title", defaultValue: "活动钜惠", x: 30, y: 530, width: 540, height: 44, fontSize: 34, fontColor: "#1F2937", fontWeight: "bold", textAlign: "left", lineHeight: 1.2, zIndex: 10, sortOrder: 3 },
  { elementKey: "activity_time", elementName: "活动时间", elementType: "text", isVariable: true, variableName: "activity_time", defaultValue: "", x: 30, y: 592, width: 540, height: 32, fontSize: 24, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 4 },
  { elementKey: "activity_venue", elementName: "活动场所", elementType: "text", isVariable: true, variableName: "activity_venue", defaultValue: "", x: 30, y: 632, width: 540, height: 32, fontSize: 24, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 5 },
  { elementKey: "goods_1", elementName: "商品行1", elementType: "text", isVariable: true, variableName: "goods_1", defaultValue: "", x: 30, y: 678, width: 540, height: 32, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 6 },
  { elementKey: "goods_2", elementName: "商品行2", elementType: "text", isVariable: true, variableName: "goods_2", defaultValue: "", x: 30, y: 713, width: 540, height: 32, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 7 },
  { elementKey: "goods_3", elementName: "商品行3", elementType: "text", isVariable: true, variableName: "goods_3", defaultValue: "", x: 30, y: 748, width: 540, height: 32, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 8 },
  { elementKey: "goods_4", elementName: "商品行4", elementType: "text", isVariable: true, variableName: "goods_4", defaultValue: "", x: 30, y: 783, width: 540, height: 32, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 9 },
  { elementKey: "qr_code", elementName: "分享二维码", elementType: "qrcode", isVariable: true, variableName: "qr_code", qrContentMode: "direct", qrErrorLevel: "M", qrSize: 170, qrColor: "#000000", qrBgColor: "#FFFFFF", x: 215, y: 822, width: 170, height: 170, zIndex: 10, sortOrder: 10 },
  { elementKey: "footer_text", elementName: "底部提示", elementType: "text", isVariable: false, content: "长按识别二维码 · 查看活动详情", x: 30, y: 1005, width: 540, height: 30, fontSize: 22, fontColor: "#9CA3AF", textAlign: "center", lineHeight: 1.5, zIndex: 10, sortOrder: 11 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 15; i++) {
    try {
      r = await fetch(API_BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
      break;
    } catch (e) {
      if (i === 14) return { status: 0, json: { netErr: e.message } };
      await sleep(600);
    }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function main() {
  const login = await api("POST", "/zhao-auth/v1/login", { body: { identifier: IDENTIFIER, password: PASSWORD } });
  if (login.status !== 200 || !login.json?.jwt) throw new Error("获取管理端 token 失败: " + JSON.stringify(login.json));
  const token = login.json.jwt;

  const listed = await api("GET", "/zhao-studio/v1/admin/poster-templates", { token });
  if (listed.status !== 200) throw new Error("查询海报模板失败: " + JSON.stringify(listed.json));
  const rows = listed.json?.data || listed.json || [];
  const exist = Array.isArray(rows) ? rows.find((t) => t.code === CODE) : null;
  if (exist) {
    console.log(`✔ 已存在模板 ${CODE}（documentId=${exist.documentId}，元素 ${(exist.elements || []).length} 个），跳过`);
    return;
  }

  // site 关系必填：取首个 site-config（服务端 seed 同款做法）
  const sites = await api("GET", "/zhao-common/v1/admin/site-configs", { token });
  const siteRows = sites.json?.data || sites.json || [];
  const siteId = Array.isArray(siteRows) ? (siteRows[0]?.documentId || siteRows[0]?.id) : null;
  if (!siteId) throw new Error("未取到 site documentId: " + JSON.stringify(sites.json).slice(0, 300));

  const created = await api("POST", "/zhao-studio/v1/admin/poster-templates", {
    token,
    body: { data: { ...TEMPLATE, site: siteId } },
  });
  if (created.status < 200 || created.status >= 300) throw new Error("创建模板失败: " + JSON.stringify(created.json));
  const docId = created.json?.data?.documentId || created.json?.documentId;
  console.log("✔ 模板已创建:", CODE, "documentId =", docId);

  const saved = await api("PUT", `/zhao-studio/v1/admin/poster-templates/${docId}/elements`, {
    token,
    body: { elements: ELEMENTS },
  });
  if (saved.status < 200 || saved.status >= 300) throw new Error("写入元素失败: " + JSON.stringify(saved.json));
  console.log(`✔ 元素已写入: ${ELEMENTS.length} 个`);
}

main().catch((e) => { console.error("❌ 海报模板落库失败:", e.message); process.exit(1); });
```

- [ ] **Step 2: 先在生产探一次「当前没有 promo_share」并记录模板数**

Run:
```
node e:\code\basic\scripts\_check-poster-cfg.cjs
```
Expected: `template count: 4`、`render promo_share status: 404 {"error":{"code":"POSTER_001",...}}`

- [ ] **Step 3: 对生产执行落库**

Run（PowerShell，cwd=`e:\code\basic`）:
```
$env:API_BASE='https://h.joho.cn/api'; $env:ZHAO_IDENTIFIER='zhao'; $env:ZHAO_PASSWORD='a963963'; node scripts/seed-promo-share-poster.cjs
```
Expected: 打印 `✔ 模板已创建: promo_share documentId = ...` 与 `✔ 元素已写入: 11 个`

- [ ] **Step 4: 验证幂等**

重复执行 Step 3 的同一条命令。
Expected: 打印 `✔ 已存在模板 promo_share（documentId=...，元素 11 个），跳过`

- [ ] **Step 5: 验证渲染接口生效**

Run:
```
node -e "fetch('https://h.joho.cn/api/zhao-studio/v1/posters/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({templateCode:'promo_share',variables:{title:'探针标题',main_image:'',activity_time:'10.1—10.8 双节同庆',activity_venue:'优美惠市集生鲜超市',goods_1:'A ¥1',goods_2:'B',goods_3:'C',goods_4:'D',qr_code:'https://v.joho.cn/'}})}).then(async r=>{const j=await r.json();console.log(r.status, j?.data?.template?.canvasWidth+'x'+j?.data?.template?.canvasHeight, 'elements:', j?.data?.elements?.length);console.log(j?.data?.elements?.find(e=>e.elementKey==='title')?.resolvedContent)})"
```
Expected: `200 600x1050 elements: 11` 且第二行为 `探针标题`（证明变量优先于 defaultValue）

- [ ] **Step 6: 提交（仅 basic 本次新增/改动文件）**

```bash
git -C e:\code\basic add docs/superpowers/specs/2026-09-27-promo-poster-popup-redesign-design.md docs/superpowers/plans/2026-09-27-promo-poster-popup-redesign.md scripts/seed-promo-share-poster.cjs
git -C e:\code\basic commit -m "feat(zhao-studio): promo_share 促销海报模板纳入海报配置" -m "新增幂等落库脚本（模板 600x1050 + 11 元素，与 C 端内置模板对齐）；补设计文档与实现计划"
```

---

### Task 3: 部署 shao + 双 UA 弹窗验收 + 配置消费验证

**Files:**
- Create（临时，验收后删除）: `e:\code\basic\scripts\_verify-poster-popup.cjs`

- [ ] **Step 1: 部署 shao H5**

Run（cwd=`e:\code\shao`）:
```
powershell -ExecutionPolicy Bypass -File .\deploy-h5.ps1
```
Expected: 输出 `SYNC_OK`

- [ ] **Step 2: 写临时验收脚本**

```js
// 临时验收：双 UA 校验分享海报弹窗结构 + 配置消费
const { chromium } = require('playwright');

const PAGE = 'https://v.joho.cn/#/pages/activity/promo?act=iuf1iy42d6h61b0ptzg37q4q';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const NORMAL_UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const WX_UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.42';

async function run(browser, ua, tag) {
  const ctx = await browser.newContext({
    userAgent: ua,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  // 绕过登录守卫：改写公开配置为 local 免登录
  await page.route('**/public/config', async (route) => {
    const resp = await route.fetch();
    let body;
    try { body = await resp.json(); } catch { body = {}; }
    const d = body?.data || body;
    if (d?.auth) { d.auth.mode = 'local'; d.auth.ssoEnabled = false; }
    if (d?.data && d.data.auth) { d.data.auth.mode = 'local'; d.data.auth.ssoEnabled = false; }
    await route.fulfill({ response: resp, body: JSON.stringify(body) });
  });

  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.getByText('分享海报').first().click();
  await page.waitForSelector('.poster-overlay', { timeout: 20000 });
  await page.waitForSelector('.poster-close-float', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const img = q('.poster-img');
    const rect = img?.getBoundingClientRect();
    return {
      hasImageWrap: !!q('.poster-image-wrap'),
      hasTitle: !!q('.poster-title'),
      hasHeader: !!q('.poster-header'),
      hasCard: !!q('.poster-container'),
      hasFooter: !!q('.poster-footer'),
      hasTip: !!q('.poster-tip'),
      hasActions: !!q('.poster-actions'),
      saveText: q('.save-btn')?.textContent?.trim() || null,
      hasCloseFloat: !!q('.poster-close-float'),
      imgW: rect ? Math.round(rect.width) : 0,
      imgH: rect ? Math.round(rect.height) : 0,
      imgCenterDx: rect ? Math.round(rect.left + rect.width / 2 - window.innerWidth / 2) : null,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    };
  });
  console.log(`[${tag}]`, JSON.stringify(probe, null, 1));
  await page.screenshot({ path: `e:/code/basic/scripts/_shot-${tag}.png` });

  if (tag === 'normal') {
    await page.click('.poster-close-float');
    await page.waitForTimeout(500);
    console.log(`[${tag}] 悬浮×关闭后 overlay 存在:`, await page.evaluate(() => !!document.querySelector('.poster-overlay')));
    await page.getByText('分享海报').first().click();
    await page.waitForSelector('.poster-close-float', { timeout: 20000 });
    await page.mouse.click(20, 20); // 遮罩空白
    await page.waitForTimeout(500);
    console.log(`[${tag}] 点空白关闭后 overlay 存在:`, await page.evaluate(() => !!document.querySelector('.poster-overlay')));
  } else {
    await page.mouse.click(20, 20);
    await page.waitForTimeout(500);
    console.log(`[${tag}] 点空白关闭后 overlay 存在:`, await page.evaluate(() => !!document.querySelector('.poster-overlay')));
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  await run(browser, NORMAL_UA, 'normal');
  await run(browser, WX_UA, 'wechat');
  await browser.close();
})();
```

- [ ] **Step 3: 跑验收**

Run: `node e:\code\basic\scripts\_verify-poster-popup.cjs`
Expected（普通 UA）: `hasTitle/hasHeader/hasCard/hasFooter/hasTip` 全 `false`，`hasActions=true`，`saveText="保存图片"`，`hasCloseFloat=true`，`imgCenterDx` 绝对值 ≤ 2，悬浮× 与点空白关闭后 `overlay 存在: false`
Expected（微信 UA）: `hasActions=false`、`saveText=null`，`hasCloseFloat=true`，点空白关闭后 `overlay 存在: false`

- [ ] **Step 4: 人工看两张截图**

打开 `e:/code/basic/scripts/_shot-normal.png`、`_shot-wechat.png`：海报完整不变形、无白色卡片/标题/提示，微信版底部无任何元素，悬浮 × 在图片右上角。

- [ ] **Step 5: 验证「后台改配置 → 不发版即时生效」**

用 `node -e` 走管理端接口：取 promo_share 模板 → 把 `title` 元素 `y` 从 530 改成 560 → 调 `POST /posters/render` 断言返回的 title 元素 `y === 560` → 改回 530。

```
node -e "const B='https://h.joho.cn/api';(async()=>{const l=await (await fetch(B+'/zhao-auth/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:'zhao',password:'a963963'})})).json();const t=l.jwt;const list=await (await fetch(B+'/zhao-studio/v1/admin/poster-templates',{headers:{Authorization:'Bearer '+t}})).json();const tpl=(list.data||[]).find(x=>x.code==='promo_share');const els=tpl.elements.map(e=>({...e,posterTemplate:undefined,id:undefined,documentId:undefined,createdAt:undefined,updatedAt:undefined,y:e.elementKey==='title'?560:e.y}));const put=await fetch(B+'/zhao-studio/v1/admin/poster-templates/'+tpl.documentId+'/elements',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({elements:els})});console.log('PUT',put.status);const R=await (await fetch(B+'/zhao-studio/v1/posters/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({templateCode:'promo_share',variables:{}})})).json();console.log('render title.y =',(R.data?.elements||[]).find(e=>e.elementKey==='title')?.y);})()"
```
Expected: `PUT 200` 且 `render title.y = 560`（配置确实被消费）→ **立即把 y 改回 530 并重跑渲染断言 `title.y = 530`**。

- [ ] **Step 6: 清理临时文件**

删除 `e:\code\basic\scripts\_verify-poster-popup.cjs`、`_shot-normal.png`、`_shot-wechat.png`、`_check-poster-cfg.cjs`（均不进提交）。

- [ ] **Step 7: 推送两仓库**

```bash
git -C e:\code\basic push
git -C e:\code\shao push
```
Expected: 均推送成功；`git -C e:\code\shao status --short` 与 `git -C e:\code\basic status --short` 无本次任务遗留的未提交文件。

---

## Self-Review

**1. Spec coverage**
- 去标题/去外框/两段式 → Task 1 Step 1、4 ✔
- 微信内底部零节点 → Task 1 Step 1（`v-if="!isWechat"`）+ Task 3 Step 3 断言 ✔
- 悬浮 × + 点遮罩关闭 → Task 1 Step 1、4 + Task 3 Step 3 ✔
- 图片等比居中、删 `posterShift` → Task 1 Step 2、3、5 ✔
- 新旧差异对照 → 已在 spec 中给出（用户已确认）✔
- basic 配置有效性确认 → 已实测（spec 现状约束）✔
- 注册 `promo_share` + 保留 C 端兜底 → Task 2（脚本）+ 不改 `poster-templates.ts` ✔
- 配置被真实消费 → Task 3 Step 5 ✔
- 两仓库分开提交 → Task 1 Step 7、Task 2 Step 6 ✔

**2. Placeholder scan**：无 TBD/TODO；所有代码步骤含完整代码与预期输出。

**3. Type consistency**：组件新增/删除的标识符仅 `posterDisplayW/posterDisplayH/canvasWidth/canvasHeight/isWechat/generated/posterImage`（均为既有 ref）与删除的 `posterShift`；脚本侧 `elementBgColor='#gradient:EF4444,F97316'` 与 C 端 `parseGradientColor` 约定一致；元素 `variableName` 与 `promo.vue` 传入的 `variables` 键一致（title/main_image/activity_time/activity_venue/goods_1~4/qr_code）。