# 优美惠市集双节促销宣传页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「优美惠市集生鲜超市」落库一条 10.1—10.8 的双节促销活动记录，让 C 端宣传页可直接转发，并修正微信分享卡片的标题与缩略图。

**Architecture:** 不新增任何数据结构与模块类型，全部复用现有活动宣传页体系：由 `scripts/seed-youmeihui-festival-promo.cjs` 调管理端接口幂等写入一条 `promoTemplate=sale` 的活动记录，C 端 `pages/activity/promo.vue` 按 `promoModules` 渲染；分享卡片仅改 `setupPromoShare()` 一处（标题去掉硬拼后缀、缩略图取封面图）。

**Tech Stack:** Strapi 4 + 插件 `zhao-point` / `zhao-auth` / `zhao-oss`；Node 18+（`fetch`）；PowerShell（Windows）；uni-app（shao，H5 + 小程序）。

**设计依据:** `docs/superpowers/specs/2026-09-26-youmeihui-festival-promo-design.md`

**仓库约定:**
- `e:\code\basic` —— 脚本与文档
- `e:\code\shao` —— C 端改动。**该仓库工作区有他人未提交改动**（`components/share-guide/share-guide.vue`、`pages/tasks/tasks.vue`、`services/api.ts`、`utils/use-share-claim.ts`），全程只 `git add` 本计划涉及的文件，禁止 `git add .`

---

### Task 1: 探测管理端鉴权

现有脚本 `scripts/import-ai-activity.cjs:45` 已给出可用范式：`POST /zhao-auth/v1/login` 传 `{identifier, password}`，响应里的 `jwt` 即管理端 token，可直接用于 `/zhao-point/v1/admin/adm/*`。本任务把它跑通并确认权限足够。

**Files:**
- 参考: `scripts/import-ai-activity.cjs:13-50`（`api()` 封装与登录范式，无需修改）

- [ ] **Step 1: 确认本地 Strapi 已启动**

Run:
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:1337/api/zhao-auth/v1/auth/config' | ConvertTo-Json -Depth 4
```
Expected: 返回 JSON 且 HTTP 200。若连接被拒，先启动本地 Strapi develop 再继续。

- [ ] **Step 2: 登录取 token**

Run:
```powershell
$login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:1337/api/zhao-auth/v1/login' -ContentType 'application/json' -Body (@{ identifier = '1117'; password = 'a123456' } | ConvertTo-Json)
$login | ConvertTo-Json -Depth 3
$global:zek = $login.jwt
"token length = " + $zek.Length
```
Expected: `token length` 大于 0。若 `jwt` 为空，说明本地测试账号不同 —— 停下问用户要一个本地可用账号，不要改脚本里的默认值。

- [ ] **Step 3: 用 token 试调管理端活动列表**

Run:
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:1337/api/zhao-point/v1/admin/adm/activities?page=1&pageSize=1' -Headers @{ Authorization = "Bearer $zek" } | ConvertTo-Json -Depth 4
```
Expected: HTTP 200，响应含 `list` 与 `total`。若返回 403 且提示渠道/租户相关，说明该账号缺 `has-channel-scope` / `has-tenant-access` 所需权限 —— 停下问用户换账号。

- [ ] **Step 4: 无需提交**

本任务只做探测，不产生文件改动。

---

### Task 2: 探测图片上传通道

海报要作为封面图与分享缩略图，必须先确认上传通道可用。`zhao-oss` 的上传端点是 `POST /zhao-oss/v1/upload`（`plugins/zhao-oss/server/src/routes/api.ts:19`），控制器取 `ctx.request.files` 里第一个文件，并从 body 读 `data.name` / `data.folder`（默认 `/general`）。

**Files:**
- 参考: `plugins/zhao-oss/server/src/routes/api.ts:19`
- 参考: `plugins/zhao-oss/server/src/controllers/api-controller.ts:23-52`

- [ ] **Step 1: 准备一张探针图**

用用户提供的实拍图中的任意一张（绝对路径，注意 shell 引号）：

```
c:\Users\Administrator\.trae-cn\attachments\6ab729fa683c3feed0919f80\368e3926-95d6-4c19-a963-9517581dd689_1e425c95-8bfa-480c-8aac-2c59dea18c18_优美惠.jpg
```

- [ ] **Step 2: 调上传接口**

Run（`curl.exe` 为 Windows 10 1803+ 自带，需已通过 Task 1 的 `$zek`）：
```powershell
curl.exe -s -X POST 'http://127.0.0.1:1337/api/zhao-oss/v1/upload' -H "Authorization: Bearer $zek" -F "files=@c:\Users\Administrator\.trae-cn\attachments\6ab729fa683c3feed0919f80\368e3926-95d6-4c19-a963-9517581dd689_1e425c95-8bfa-480c-8aac-2c59dea18c18_优美惠.jpg" -F "folder=/general"
```
Expected A（本地 OSS 已配置）: 返回 JSON，含可访问的图片地址（`url` 或 `ossUrl` 字段）。
Expected B（本地未配置 OSS）: 返回 4xx/5xx 或错误 JSON。

- [ ] **Step 3: 按结果决定，不自行造通道**

- 命中 A：记下这个地址，Task 3 直接复用同一通道。
- 命中 B：**不要**改 `zhao-oss` 配置、不要换别的上传接口，直接告诉用户「本地 OSS 未配置」并给出两个选项（① 用户提供一个已上线的图片 URL；② 本次先不带封面图落库，图片后补）。等用户答复后再继续 Task 3。

- [ ] **Step 4: 无需提交**

---

### Task 3: 生成并上传主视觉海报

**Files:**
- 产出（不入库仓库）: `e:\code\basic\scripts\_youmeihui-poster`（生成的图片文件）

- [ ] **Step 1: 生成海报**

用 `GenerateImage`，参考图按顺序传入用户提供的三张实拍：
1. `..._优美惠.jpg`（店招）
2. `..._优美惠1.jpg`（玻璃门招商贴）
3. `..._优美惠2.jpg`（帐篷横幅）

Prompt（中文，写实摄影风格，参考 `<图片1>` 的店面与招牌、`<图片3>` 的帐篷横幅陈列）：
> 生鲜超市双节促销主视觉海报：写实摄影风格，红金主色调，画面中央是堆头陈列的整箱瓶装水、抽纸与啤酒，前景放一只切开露出红瓤的西瓜，背景有中秋灯笼与国庆红元素，顶部烫金大字「中秋好礼相送」，下方红底白字「国庆钜惠狂欢」，底部一行小字「10.1—10.8 进店免费领西瓜」。构图饱满、光线明亮、真实店铺氛围，无夸张插画感，不出现在参考图中的真实人物面部。

输出路径: `e:\code\basic\scripts\_youmeihui-poster`

- [ ] **Step 2: 人工确认海报**

打开生成的图片，确认三件事：文字无错字漏字、西瓜与商品陈列清晰、整体是写实照片观感而非插画。**不满足就调 prompt 重生成**，不要带着错字上线。

- [ ] **Step 3: 上传海报，拿到 COVER_URL**

复用 Task 2 中验证可用的上传通道，上传 `scripts\_youmeihui-poster` 生成的文件，取出可访问地址：

```powershell
curl.exe -s -X POST 'http://127.0.0.1:1337/api/zhao-oss/v1/upload' -H "Authorization: Bearer $zek" -F "files=@e:\code\basic\scripts\_youmeihui-poster.png" -F "folder=/share"
```
Expected: 返回含图片地址的 JSON。把该地址记为 `COVER_URL`，供 Task 4 使用。若 Task 2 走的是兜底分支（不带封面图），本任务整体跳过，Task 4 以 `COVER_URL` 为空运行。

- [ ] **Step 4: 无需提交**（生成的图片是临时产物，不纳入版本库）

---

### Task 4: 写落库脚本

**Files:**
- Create: `e:\code\basic\scripts\seed-youmeihui-festival-promo.cjs`

- [ ] **Step 1: 写入脚本全文**

```js
/* 优美惠市集「迎中秋庆国庆」促销宣传页落库（幂等：按 title 查重，命中即更新）
 * 用法: cd e:\code\basic && node scripts/seed-youmeihui-festival-promo.cjs
 * 可选环境变量:
 *   API_BASE        默认 http://127.0.0.1:1337/api
 *   ZHAO_IDENTIFIER 默认 1117（本地测试账号）
 *   ZHAO_PASSWORD   默认 a123456
 *   COVER_URL       海报图地址，缺省则封面不带底图
 * 前置: Strapi 已启动
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:1337/api";
const IDENTIFIER = process.env.ZHAO_IDENTIFIER || "1117";
const PASSWORD = process.env.ZHAO_PASSWORD || "a123456";
const COVER_URL = process.env.COVER_URL || "";

const TITLE = "免费领西瓜｜优美惠双节钜惠";

const DESCRIPTION =
  "10.1—10.8 双节同庆｜长春双阳优美惠市集生鲜超市。进店免费领西瓜 1/4 份，" +
  "农夫山泉 1×12 群友价 8.8，1800克心相印 15.9，崂山、青岛小优、燕京啤酒群友价 25。";

const PROMO_MODULES = [
  {
    type: "cover",
    sort: 1,
    config: {
      title: "中秋好礼相送 · 国庆钜惠狂欢",
      subtitle: "10.1—10.8 双节同庆 · 进店免费领西瓜",
      ...(COVER_URL ? { bgImage: COVER_URL } : {}),
    },
  },
  {
    type: "goods",
    sort: 2,
    config: { title: "群友价 · 双节钜惠", notice: "群友价需出示本页面，限购数量以门店为准" },
  },
  {
    type: "highlights",
    sort: 3,
    config: {
      title: "进店免费领",
      points: ["1/4 份西瓜免费领", "无需消费，到店即可", "每日限量，先到先得"],
    },
  },
  { type: "purpose", sort: 4, config: { title: "我们为什么这么做" } },
  {
    type: "notice",
    sort: 5,
    config: {
      title: "活动说明",
      html: "<p>每人限领 1 份</p><p>不与其他优惠叠加</p><p>数量有限，送完为止</p>",
    },
  },
  {
    type: "highlights",
    sort: 6,
    config: {
      title: "免费招商 · 10.1—12.31",
      points: ["10.1—12.31 免费招商", "生鲜、熟食、小吃、日用等品类均可", "招商电话 18514363399"],
    },
  },
  { type: "info", sort: 7, config: {} },
  { type: "contact", sort: 8, config: {} },
  { type: "floatContact", sort: 9, config: {} },
];

const PAYLOAD = {
  title: TITLE,
  type: "促销",
  category: "生鲜超市",
  description: DESCRIPTION,
  startTime: "2026-10-01T00:00:00+08:00",
  endTime: "2026-10-08T23:59:59+08:00",
  venueName: "优美惠市集生鲜超市",
  lat: 43.635025,
  lng: 125.583775,
  status: "ongoing",
  promoTemplate: "sale",
  promoColors: {
    primary: "#EF4444",
    accent: "#F97316",
    bg: "#FFF7F5",
    card: "#FFF1EE",
    text: "#1F2937",
    textDim: "#6B7280",
  },
  promoAssets: COVER_URL ? [{ name: "双节主视觉", url: COVER_URL, scene: "cover" }] : [],
  promoContact: {
    phone: "18514363399",
    notice: "招商合作、团购批发请致电",
    wechat: { id: "", qrcode: "" },
  },
  purpose: "扎根双阳，邻里超市。做有人情味的产品，开最有人情味的超市。",
  // 原价与单位用户未提供，一律留空，页面只显示群友价
  goodsList: [
    { name: "农夫山泉 1×12", promoPrice: 8.8, unit: "" },
    { name: "心相印 1800克", promoPrice: 15.9, unit: "" },
    { name: "崂山啤酒", promoPrice: 25, unit: "" },
    { name: "青岛小优", promoPrice: 25, unit: "" },
    { name: "燕京啤酒", promoPrice: 25, unit: "" },
  ],
  promoModules: PROMO_MODULES,
};

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
  const login = await api("POST", "/zhao-auth/v1/login", {
    body: { identifier: IDENTIFIER, password: PASSWORD },
  });
  if (login.status !== 200 || !login.json?.jwt) {
    throw new Error("获取管理端 token 失败: " + JSON.stringify(login.json));
  }
  const token = login.json.jwt;

  // 幂等：按 title 精确匹配已有记录（列表接口一次取 200 条，本场景足够）
  const listed = await api("GET", "/zhao-point/v1/admin/adm/activities?page=1&pageSize=200", { token });
  if (listed.status !== 200) {
    throw new Error("查询活动列表失败: " + JSON.stringify(listed.json));
  }
  const rows = listed.json?.list || listed.json?.data || [];
  const exist = rows.find((x) => (x?.title || x?.attributes?.title) === TITLE);

  if (exist) {
    const docId = exist.documentId || exist.attributes?.documentId;
    const updated = await api("PUT", `/zhao-point/v1/admin/adm/activities/${docId}`, { token, body: PAYLOAD });
    if (updated.status < 200 || updated.status >= 300) {
      throw new Error("更新活动失败: " + JSON.stringify(updated.json));
    }
    const d = updated.json?.data || updated.json;
    console.log("✔ 已更新既有活动:", d?.documentId || docId);
    console.log("  宣传页: /pages/activity/promo?act=" + (d?.documentId || docId));
    return;
  }

  const created = await api("POST", "/zhao-point/v1/admin/adm/activities", { token, body: PAYLOAD });
  if (created.status < 200 || created.status >= 300) {
    throw new Error("创建活动失败: " + JSON.stringify(created.json));
  }
  const d = created.json?.data || created.json;
  console.log("✔ 已创建活动:", d?.documentId || d?.id);
  console.log("  宣传页: /pages/activity/promo?act=" + (d?.documentId || d?.id));
  if (!COVER_URL) console.log("  注意: 未带封面图（COVER_URL 为空）");
}

main().catch((e) => { console.error("❌ 落库脚本失败:", e.message); process.exit(1); });
```

- [ ] **Step 2: 语法检查**

Run:
```powershell
node --check scripts\seed-youmeihui-festival-promo.cjs
```
Expected: 无输出（退出码 0）。

- [ ] **Step 3: 提交**

```powershell
git add scripts/seed-youmeihui-festival-promo.cjs
git commit -m "chore(zhao-point): 新增优美惠市集双节促销宣传页落库脚本"
```

---

### Task 5: 本地落库并验证幂等

**Files:**
- 运行: `scripts/seed-youmeihui-festival-promo.cjs`

- [ ] **Step 1: 带海报地址执行（若 Task 2 走兜底则去掉 `$env:COVER_URL`）**

Run:
```powershell
$env:COVER_URL = "<Task 3 得到的图片地址>"
node scripts\seed-youmeihui-festival-promo.cjs
```
Expected: 打印 `✔ 已创建活动: <documentId>` 与宣传页链接。记下 `documentId`。

- [ ] **Step 2: 再执行一次，验证幂等**

Run:
```powershell
node scripts\seed-youmeihui-festival-promo.cjs
```
Expected: 打印 `✔ 已更新既有活动: <同一个 documentId>`，**不产生第二条记录**。

- [ ] **Step 3: 确认库中只有一条**

Run:
```powershell
$h = @{ Authorization = "Bearer $zek" }
$rows = (Invoke-RestMethod -Uri 'http://127.0.0.1:1337/api/zhao-point/v1/admin/adm/activities?page=1&pageSize=200' -Headers $h).list
($rows | Where-Object { $_.title -eq '免费领西瓜｜优美惠双节钜惠' }).Count
```
Expected: `1`。

- [ ] **Step 4: 无需提交**（脚本已在 Task 4 提交）

---

### Task 6: 改 C 端分享逻辑

**Files:**
- Modify: `e:\code\shao\pages\activity\promo.vue:315-320`

现状（`setupPromoShare()`）：
```ts
function setupPromoShare() {
  const a = activity.value
  if (!a?.title) return
  const desc = (a.description || '').slice(0, 60) || undefined
  setupPageShare({ title: `${a.title}｜活动宣传`, desc, imgUrl: undefined })
}
```

- [ ] **Step 1: 替换为下述实现**

```ts
// 分享缩略图：优先封面模块配置的底图，回退活动宣传图；都缺时交回租户兜底
function promoShareImage() {
  const mods = page.value?.modules || []
  const cover = mods.find((m: any) => m?.type === 'cover')
  const raw = cover?.config?.bgImage || activity.value?.promoAssets?.[0]?.url || ''
  return resolveMediaUrl(raw) || undefined
}
function setupPromoShare() {
  const a = activity.value
  if (!a?.title) return
  const desc = (a.description || '').slice(0, 60) || undefined
  setupPageShare({ title: a.title, desc, imgUrl: promoShareImage() })
}
```

说明：`resolveMediaUrl` 已在文件顶部导入，签名 `(media: any) => string`，空值返回 `''`，因此 `|| undefined` 会正确回落租户级分享图。本改动为 3 行内联表达式，**不引入单测** —— 该逻辑嵌在 `.vue` 的 `<script setup>` 内，为它抽公共函数属于过度设计；验证走 Task 7 的 meta 校验。

- [ ] **Step 2: 类型检查**

Run（shao 仓库）:
```powershell
npx vue-tsc --noEmit
```
Expected: 无新增错误。若仓库未配置 `vue-tsc`，改用仓库既有的 `npm run build:h5` 或对应类型检查脚本，以实际脚本名为准。

- [ ] **Step 3: 提交（只加这一个文件）**

```powershell
git add pages/activity/promo.vue
git commit -m "fix(promo): 分享标题去掉硬拼后缀，缩略图取活动封面图"
```

---

### Task 7: 验收

**Files:**
- 运行: 公开聚合接口 + H5 页面

- [ ] **Step 1: 核对聚合接口**

Run:
```powershell
$doc = "<Task 5 得到的 documentId>"
$p = Invoke-RestMethod -Uri "http://127.0.0.1:1337/api/zhao-point/v1/promo/activity/$doc"
"modules: " + $p.modules.Count
$p.modules | ForEach-Object { "$($_.sort) $($_.type)" }
$p.contact | ConvertTo-Json -Depth 4
$p.activity.venueName, $p.activity.lat, $p.activity.lng
```
Expected: `modules` 为 9 条，顺序 `cover/goods/highlights/purpose/notice/highlights/info/contact/floatContact`；`contact.phone` 为 `18514363399`；地点与坐标与设计一致。

- [ ] **Step 2: 浏览器核对页面**

打开 H5 宣传页（本地 client 端口按仓库实际配置），逐项确认：9 块渲染完整、行动朱红配色生效（主色偏红而非模板默认玫红）、价目 5 条且只显示群友价、免费领西瓜与免费招商两块的文字正确、基本信息里的地点与一键导航可用。

用 `webapp-testing` / `agent-browser` 截图留证，并把截图给自己看一遍再判定通过。

- [ ] **Step 3: 校验分享 meta**

Run（H5 页面地址替换为实际地址；分享标题应不含「｜活动宣传」后缀）:
```powershell
$html = (Invoke-WebRequest -Uri "<H5 宣传页完整 URL>").Content
$html -split "`n" | Select-String -Pattern 'og:title|og:description|og:image|twitter:title|twitter:image'
```
Expected: `og:title` 为 `免费领西瓜｜优美惠双节钜惠`；`og:image` 为 Task 3 的封面图地址（未带封面图时应回落租户分享图，不得为空字符串）。

- [ ] **Step 4: 记录真机待办**

微信内转发卡片的最终观感只能在真机上确认。把「请在微信里打开页面并转发一次，确认卡片标题与缩略图」作为交付说明的一部分交给用户，**不要**在本地反复重试。

---

### Task 8: 提交与推送

**Files:**
- `e:\code\basic`: 设计文档、计划、落库脚本
- `e:\code\shao`: `pages/activity/promo.vue`

- [ ] **Step 1: 确认 basic 仓库待提交范围**

Run:
```powershell
git status --short
```
Expected: 只有 `docs/superpowers/plans/2026-09-26-youmeihui-festival-promo.md`（设计文档已在 `f5c1c0ee21` 提交，不应再出现）与 `scripts/seed-youmeihui-festival-promo.cjs`（已在 Task 4 提交，不应再出现），以及他人既有改动。逐文件确认无构建残留、无临时图片。

- [ ] **Step 2: 提交并推送 basic**

```powershell
git add docs/superpowers/plans/2026-09-26-youmeihui-festival-promo.md
git commit -m "docs(zhao-point): 优美惠市集双节促销宣传页实现计划"
git push
```

- [ ] **Step 3: 提交并推送 shao（只加改动文件）**

```powershell
git add pages/activity/promo.vue
git commit -m "fix(promo): 分享标题去掉硬拼后缀，缩略图取活动封面图"
git push
```

- [ ] **Step 4: 部署 shao**

按仓库既有部署流程发布 H5（`v.joho.cn`），部署后确认线上页面能正常打开、分享 meta 与本地一致。

---

### Task 9: 生产环境落库

本地落库只用于自测，真实顾客访问的是线上数据。本任务把同一条记录写到生产。

**Files:**
- 运行: `scripts/seed-youmeihui-festival-promo.cjs`

- [ ] **Step 1: 探一次生产登录**

生产账号与本地不同，先用管理端登录端点在线上试一次，**只读不写**：

```powershell
$body = @{ identifier = '<生产账号>'; password = '<生产密码>' } | ConvertTo-Json
$p = Invoke-RestMethod -Method Post -Uri 'https://h.joho.cn/api/zhao-auth/v1/login' -ContentType 'application/json' -Body $body
"token length = " + $p.jwt.Length
```
Expected: token 长度大于 0。若登录被 SSO 拦截或提示缺租户上下文，**停下问用户**，由用户提供线上可用凭据，不要绕。

- [ ] **Step 2: 生产上传海报拿线上 COVER_URL**

线上图片必须是线上可访问的地址，本地地址顾客打不开。用 Step 1 的 token 上传海报：

```powershell
curl.exe -s -X POST 'https://h.joho.cn/api/zhao-oss/v1/upload' -H "Authorization: Bearer $($p.jwt)" -F "files=@e:\code\basic\scripts\_youmeihui-poster.png" -F "folder=/share"
```
Expected: 返回线上可访问的图片地址（`/share/` 前缀，匿名 https 可访问）。把它记为线上 `COVER_URL`。

- [ ] **Step 3: 生产落库**

```powershell
$env:API_BASE = 'https://h.joho.cn/api'
$env:ZHAO_IDENTIFIER = '<生产账号>'
$env:ZHAO_PASSWORD = '<生产密码>'
$env:COVER_URL = '<线上 COVER_URL>'
node scripts\seed-youmeihui-festival-promo.cjs
```
Expected: 打印 `✔ 已创建活动: <线上 documentId>`（或 `已更新既有活动`）。记下线上 `documentId`。

- [ ] **Step 4: 线上验收**

Run:
```powershell
$doc = '<线上 documentId>'
$r = Invoke-RestMethod -Uri "https://h.joho.cn/api/zhao-point/v1/promo/activity/$doc"
$r.modules.Count
$r.contact.phone
```
Expected: `9` 与 `18514363399`。再用微信打开线上宣传页，确认 9 块渲染、封面图正常显示、一键导航指向长春双阳，并转发一次确认卡片标题与缩略图。

- [ ] **Step 5: 交付说明**

向用户输出：线上宣传页地址、活动起止时间、商品单位为空的待补项、招商电话与日期已上页、真机转发结果由用户确认。

---

## 自检记录

**规格覆盖**：设计文档的落库数据 → Task 4；9 个模块 → Task 4；C 端分享改造 → Task 6；海报生成与上传 → Task 2/3；两处探测（鉴权、上传）→ Task 1/2；验收 → Task 7；生产落地 → Task 9；「不做」清单未出现任何对应任务。

**类型一致性**：`COVER_URL` 在 Task 3 产出、Task 4/5/9 消费；`documentId` 在 Task 5 产出、Task 7/9 消费；`setupPromoShare` / `promoShareImage` 在 Task 6 定义并当处使用。

**已知缺口**：`npx vue-tsc --noEmit`（Task 6 Step 2）与 H5 本地端口、shao 部署流程（Task 8 Step 4）沿用仓库既有约定，执行时以仓库实际脚本为准；这三处若与预期不符，按实际命令替换即可，不影响任务划分。