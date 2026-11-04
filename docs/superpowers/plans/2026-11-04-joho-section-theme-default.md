# 多板块内容模型 + 主题「设为默认」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让静态主题演示页的「设为默认」真正写入站点级默认主题并即时刷新预览；同时把「业务板块」数据模型的落地拆成可执行任务。

**Architecture:** 静态演示期用 `theme.js` 新增的「站点默认」存储层（`localStorage["joyogo-ski-theme-default"]`）模拟站点级配置，解析优先级 `?theme=` > 本机覆盖 > 站点默认 > 内置默认；后台页点击按钮写站点默认、清除本机覆盖、递增预览版本号重载全部 iframe。正式站阶段在 zhao-website 插件新增 `section` 类型，内容以 manyToOne 归属板块，板块侧反向聚合。

**Tech Stack:** 原生 CSS/JS（无构建）、Node 内置 vm 做逻辑测试、Edge headless 截图、agent-browser 交互校验、Strapi 5 插件 schema、ssh/scp 部署。

**Spec:** `docs/superpowers/specs/2026-11-04-joho-site-section-content-model-design.md`

---

## 阶段一：静态演示页「设为默认」（本期交付）

### Task 1: 为 theme.js 增加站点默认层

**Files:**
- Modify: `docs/superpowers/specs/ski-theme/theme.js`（全文重写）
- Test: `E:\code\.tmp\theme-default.test.js`（临时，不提交）

- [ ] **Step 1: 写失败测试**

创建 `E:\code\.tmp\theme-default.test.js`：

```js
const fs = require('fs');
const vm = require('vm');

const SRC = fs.readFileSync('E:/code/basic/docs/superpowers/specs/ski-theme/theme.js', 'utf8');
const CFG = {
  default: 'amber',
  themes: [
    { id: 'nordic' }, { id: 'energy' }, { id: 'warm' }, { id: 'amber' }
  ]
};

function boot(opts) {
  opts = opts || {};
  const store = new Map();
  if (opts.stored) store.set('joyogo-ski-theme', opts.stored);
  if (opts.site) store.set('joyogo-ski-theme-default', opts.site);
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k)
  };
  const el = { v: null };
  const document = {
    documentElement: {
      setAttribute: (k, v) => { el.v = v; },
      getAttribute: () => el.v
    }
  };
  const ctx = {
    window: { JOYOGO_THEME: CFG },
    document,
    localStorage,
    location: { search: opts.search || '' }
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { T: ctx.window.JoyogoTheme, store };
}

const results = [];
function check(name, actual, expected) {
  const ok = actual === expected;
  results.push({ name, ok, actual, expected });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' → ' + actual + ' (期望 ' + expected + ')');
}

check('无存储回落到内置默认', boot({}).T.current(), 'amber');
check('本机覆盖优先', boot({ stored: 'warm' }).T.current(), 'warm');
check('站点默认生效', boot({ site: 'nordic' }).T.current(), 'nordic');
check('本机覆盖高于站点默认', boot({ stored: 'warm', site: 'nordic' }).T.current(), 'warm');
check('URL 参数最高', boot({ search: '?theme=energy', stored: 'warm' }).T.current(), 'energy');

const s = boot({ stored: 'warm', site: 'nordic' });
s.T.setSiteDefault('energy');
check('setSiteDefault 写入站点默认', s.store.get('joyogo-ski-theme-default'), 'energy');
check('setSiteDefault 清除本机覆盖', s.store.has('joyogo-ski-theme'), false);
check('setSiteDefault 后立即生效', s.T.current(), 'energy');
check('defaultTheme 返回生效默认', s.T.defaultTheme(), 'energy');
check('builtinDefault 保持不变', s.T.builtinDefault(), 'amber');

s.T.clearSiteDefault();
check('clearSiteDefault 回到内置默认', s.T.defaultTheme(), 'amber');

const fails = results.filter(r => !r.ok).length;
console.log('---');
console.log('合计 ' + results.length + ' 项，失败 ' + fails + ' 项');
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node E:\code\.tmp\theme-default.test.js`
Expected: 第一条报错 `TypeError: ctx.window.JoyogoTheme is undefined` 或 `s.T.setSiteDefault is not a function`，说明测试确实在测新能力。

- [ ] **Step 3: 实现 theme.js**

全文替换 `docs/superpowers/specs/ski-theme/theme.js`：

```js
/* 主题引导脚本：页面 <head> 内同步加载，首帧前套用，避免闪色。
   优先级：URL ?theme=预览 > 本机覆盖 > 站点默认 > theme.config.js 内置默认 */
(function () {
  var cfg = window.JOYOGO_THEME || { default: 'amber', themes: [] };
  var list = (cfg.themes || []).map(function (t) { return t.id; });
  var KEY = 'joyogo-ski-theme';
  var SITE_KEY = 'joyogo-ski-theme-default';

  function valid(id) { return !!id && (list.indexOf(id) !== -1); }

  function fromUrl() {
    var m = /[?&]theme=([a-z]+)/.exec(location.search);
    return m && valid(m[1]) ? m[1] : null;
  }
  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, id) {
    try { localStorage.setItem(key, id); } catch (e) {}
  }
  function removeStored(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function siteDefault() {
    var v = readStored(SITE_KEY);
    return valid(v) ? v : null;
  }
  function fallback() { return siteDefault() || cfg.default || 'amber'; }
  function apply(id) { document.documentElement.setAttribute('data-theme', id); }

  var stored = readStored(KEY);
  var current = fromUrl() || (valid(stored) ? stored : null) || fallback();
  apply(current);

  window.JoyogoTheme = {
    list: function () { return (cfg.themes || []).slice(); },
    /* theme.config.js 里写死的值，永远不作为「后台默认」展示 */
    builtinDefault: function () { return cfg.default || 'amber'; },
    /* 当前生效的站点默认：站点配置优先，否则内置默认 */
    defaultTheme: function () { return fallback(); },
    current: function () { return document.documentElement.getAttribute('data-theme'); },
    /* 本机覆盖：只影响当前浏览器 */
    preview: function (id) {
      if (!valid(id)) return false;
      writeStored(KEY, id);
      apply(id);
      return true;
    },
    /* 站点默认：写入配置层，并清掉本机覆盖让当前页跟随 */
    setSiteDefault: function (id) {
      if (!valid(id)) return false;
      writeStored(SITE_KEY, id);
      removeStored(KEY);
      apply(id);
      return true;
    },
    clearSiteDefault: function () {
      removeStored(SITE_KEY);
      apply(fromUrl() || fallback());
      return this.current();
    },
    /* 清除本机覆盖，回落到站点默认 */
    reset: function () {
      removeStored(KEY);
      apply(fromUrl() || fallback());
      return this.current();
    }
  };
})();
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node E:\code\.tmp\theme-default.test.js`
Expected: 全部 PASS，末行 `合计 11 项，失败 0 项`，退出码 0。

- [ ] **Step 5: 提交**

```bash
git add docs/superpowers/specs/ski-theme/theme.js
git commit -m "feat(ski-theme): theme.js 增加站点默认解析层"
```

---

### Task 2: admin.html 的「设为默认」写入站点默认并刷新预览

**Files:**
- Modify: `docs/superpowers/specs/ski-theme/admin.html`

- [ ] **Step 1: 状态行增加「恢复内置默认」按钮，并修正按钮对齐**

把 `.state .btn{margin-left:auto}` 改为：

```css
  .state .btn{margin-left:0}
  .state .btn:first-of-type{margin-left:auto}
```

把状态行区块替换为：

```html
  <div class="state">
    <span>后台默认：<b id="defName">—</b></span>
    <span>本机覆盖：<b id="locName">无</b></span>
    <span>当前生效：<b id="curName">—</b></span>
    <button class="btn btn-line btn-sm" id="reset" type="button">清除本机覆盖</button>
    <button class="btn btn-line btn-sm" id="resetDefault" type="button">恢复内置默认</button>
  </div>
```

- [ ] **Step 2: 更新「全站生效」说明文案**

把 `<p>静态站点没有写库能力：…本页的「设为默认」只对当前浏览器生效，用于评审验收。</p>` 替换为：

```html
    <p>点击任意卡片的「设为默认」，会把该主题写为<b>站点默认</b>：站点内所有「继承站点默认」的板块随之切换，已单独指定主题的板块不受影响。静态演示期以浏览器本地存储模拟站点配置；正式站由 Strapi 的 <code>site-config.themeConfig.defaultTheme</code> 承载，下方片段即替换目标。</p>
```

- [ ] **Step 3: 修改渲染与交互脚本**

在脚本开头变量区增加预览版本号：

```js
  var grid = document.getElementById('grid');
  var toastEl = document.getElementById('toast');
  var cfgText = document.getElementById('cfgText');
  var stamp = 0;
```

把 `cfgLine()` 改为读取生效默认：

```js
  function cfgLine(){
    return "window.JOYOGO_THEME = { default: '" + JoyogoTheme.defaultTheme() + "' };";
  }
```

把卡片 iframe 的 src 加上版本号（用于强制重载）：

```js
        '<div class="shot"><iframe src="./home.html?theme=' + t.id + '&v=' + stamp + '" title="' + t.name + ' 预览" loading="lazy" scrolling="no"></iframe></div>' +
```

把 `render()` 末尾三行改为：

```js
    document.getElementById('defName').textContent = nameOf(JoyogoTheme.defaultTheme());
    document.getElementById('locName').textContent = localTheme();
    document.getElementById('curName').textContent = nameOf(JoyogoTheme.current());
    cfgText.textContent = cfgLine();
```

把点击处理器里的「设为默认」分支改为：

```js
    if(set){
      JoyogoTheme.setSiteDefault(set);
      stamp++;
      render();
      toast('已将「' + nameOf(set) + '」设为全站默认，预览已刷新');
    }
```

新增「恢复内置默认」处理器，放在 `reset` 的监听之后：

```js
  document.getElementById('resetDefault').addEventListener('click', function(){
    JoyogoTheme.clearSiteDefault(); stamp++; render();
    toast('已恢复内置默认：' + nameOf(JoyogoTheme.builtinDefault()));
  });
```

把复制按钮的提示文本改为站点默认：

```js
    var text = 'default: ' + JoyogoTheme.defaultTheme();
```

- [ ] **Step 4: 本地静态打开校验渲染**

Run: `Start-Process msedge -ArgumentList "--headless=new","--disable-gpu","--hide-scrollbars","--virtual-time-budget=9000","--user-data-dir=E:\code\.tmp\edge-theme2","--window-size=1440,1400","--screenshot=E:\code\.tmp\t_admin_default.png","file:///E:/code/basic/docs/superpowers/specs/ski-theme/admin.html"`

Expected: 生成截图，状态行三栏 + 两个按钮在同一行不重叠，四张卡片正常，配置片段显示 `default: 'amber'`。

- [ ] **Step 5: 浏览器点击验证**

Run（本地无外网时改用 `file://` 地址）：

```bash
agent-browser open "file:///E:/code/basic/docs/superpowers/specs/ski-theme/admin.html"
agent-browser eval "document.getElementById('defName').textContent"
agent-browser find text "设为默认" click
agent-browser eval "document.getElementById('defName').textContent"
agent-browser eval "localStorage.getItem('joyogo-ski-theme-default')"
agent-browser eval "document.getElementById('locName').textContent"
agent-browser screenshot E:\code\.tmp\t_admin_after_set.png
```

Expected: 第一次 `defName` 为「方案七 · 暖黄陶土」；点击第一张卡片后 `defName` 变为「方案四 · 北欧留白」，`localStorage` 返回 `nordic`，`locName` 为「无」，截图中第一张卡片带「当前生效」徽标且配置片段为 `default: 'nordic'`。

- [ ] **Step 6: 恢复状态并再验一次**

```bash
agent-browser eval "document.getElementById('resetDefault').click()"
agent-browser eval "document.getElementById('defName').textContent"
agent-browser close --all
```

Expected: 回到「方案七 · 暖黄陶土」，本地存储键被清除。

- [ ] **Step 7: 提交**

```bash
git add docs/superpowers/specs/ski-theme/admin.html
git commit -m "feat(ski-theme): 设为默认写入站点默认并重载预览"
```

---

### Task 3: 部署到 v.joho.cn 演示目录

**Files:**
- 部署目标：`/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index/ski-demo/themes/`

- [ ] **Step 1: 上传本次改动的两个文件**

```bash
scp "E:\code\basic\docs\superpowers\specs\ski-theme\theme.js" "E:\code\basic\docs\superpowers\specs\ski-theme\admin.html" joho:/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index/ski-demo/themes/
```

- [ ] **Step 2: 服务器侧核验**

```bash
ssh joho "curl -s -o /dev/null -w 'admin %{http_code}\n' https://v.joho.cn/ski-demo/themes/admin.html; curl -s -o /dev/null -w 'theme %{http_code}\n' https://v.joho.cn/ski-demo/themes/theme.js"
```

Expected: 两行均为 200。

- [ ] **Step 3: 线上点击验收（本机有外网时执行）**

```bash
agent-browser open "https://v.joho.cn/ski-demo/themes/admin.html"
agent-browser find text "设为默认" click
agent-browser eval "localStorage.getItem('joyogo-ski-theme-default')"
agent-browser screenshot E:\code\.tmp\t_admin_live.png
agent-browser close --all
```

Expected: 返回目标主题 id，截图状态行「后台默认」与卡片徽标一致，预览 iframe 已重载。

- [ ] **Step 4: 推送**

```bash
git push
```

---

## 阶段二：板块数据模型（后续计划，本期不写前端渲染）

> 说明：以下任务只覆盖插件数据模型与索引注册。查询过滤、对外路由、后台菜单分组、前台 `/{板块}/...` 路由需在阶段三单独出计划（要先读 `services/content-filter.ts`、`controllers/*` 与站点渲染工程的现有写法）。

### Task 4: 新增业务板块 content-type

**Files:**
- Create: `plugins/zhao-website/server/src/content-types/section/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/index.ts`

- [ ] **Step 1: 新建 schema**

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_sections",
  "info": {
    "singularName": "section",
    "pluralName": "sections",
    "displayName": "业务板块",
    "description": "站点下的业务分区（滑雪、温泉等）"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "sections"
    },
    "name": { "type": "string", "maxLength": 100, "required": true, "localized": true },
    "slug": { "type": "uid", "targetField": "name", "required": true, "localized": true },
    "description": { "type": "text", "localized": true },
    "icon": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] },
    "cover": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] },
    "themeConfig": {
      "type": "json",
      "default": { "mode": "inherit", "theme": "amber" }
    },
    "order": { "type": "integer", "default": 0 },
    "status": { "type": "boolean", "default": true },
    "seoTitle": { "type": "string", "maxLength": 60, "localized": true },
    "seoDescription": { "type": "string", "maxLength": 160, "localized": true },
    "deletedAt": { "type": "datetime", "default": null },
    "articles": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article", "mappedBy": "section" },
    "geoArticles": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.geo-article", "mappedBy": "section" },
    "tutorials": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "section" },
    "faqs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.faq", "mappedBy": "section" },
    "products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.product", "mappedBy": "section" },
    "downloads": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.download", "mappedBy": "section" }
  }
}
```

- [ ] **Step 2: 注册到插件内容类型索引**

`index.ts` 顶部增加：

```ts
import section from "./section/schema.json";
```

`export default` 对象中增加：

```ts
  "section": { schema: section },
```

- [ ] **Step 3: 验证加载**

Run: `cd e:\code\basic; npm run develop`
Expected: 启动无 schema 报错，内容管理器出现「业务板块」条目。

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-website/server/src/content-types/section/schema.json plugins/zhao-website/server/src/content-types/index.ts
git commit -m "feat(zhao-website): 新增业务板块 content-type"
```

---

### Task 5: 六个内容类型挂接板块

**Files:**
- Modify: `plugins/zhao-website/server/src/content-types/article/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/geo-article/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/tutorial/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/faq/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/product/schema.json`
- Modify: `plugins/zhao-website/server/src/content-types/download/schema.json`

- [ ] **Step 1: 在每个 schema 的 `attributes` 内加入 section 关系**

各文件加入的 JSON 完全一致，只有 `inversedBy` 不同：

```json
"section": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-website.section",
  "inversedBy": "articles"
}
```

对应关系：

| 文件 | inversedBy |
|---|---|
| `article/schema.json` | `articles` |
| `geo-article/schema.json` | `geoArticles` |
| `tutorial/schema.json` | `tutorials` |
| `faq/schema.json` | `faqs` |
| `product/schema.json` | `products` |
| `download/schema.json` | `downloads` |

- [ ] **Step 2: 验证**

Run: `cd e:\code\basic; npm run develop`
Expected: 六个内容编辑页出现「所属板块」字段（可空），已存在的内容保存不受影响。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-website/server/src/content-types/article/schema.json plugins/zhao-website/server/src/content-types/geo-article/schema.json plugins/zhao-website/server/src/content-types/tutorial/schema.json plugins/zhao-website/server/src/content-types/faq/schema.json plugins/zhao-website/server/src/content-types/product/schema.json plugins/zhao-website/server/src/content-types/download/schema.json
git commit -m "feat(zhao-website): 内容类型关联业务板块"
```

---

### Task 6: 分类挂接板块（仅用于板块内导航）

**Files:**
- Modify: `plugins/zhao-website/server/src/content-types/article-category/schema.json`

- [ ] **Step 1: 在 `attributes` 内加入**

```json
"section": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-website.section",
  "inversedBy": "categories"
}
```

同时给 `section` 的 schema 补上反向字段：

```json
"categories": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article-category", "mappedBy": "section" }
```

- [ ] **Step 2: 验证**

Run: `cd e:\code\basic; npm run develop`
Expected: 分类编辑页出现「所属板块」，历史分类为空不受影响。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-website/server/src/content-types/article-category/schema.json plugins/zhao-website/server/src/content-types/section/schema.json
git commit -m "feat(zhao-website): 分类关联业务板块"
```

---

## 阶段三：待出计划（本文件不展开）

以下内容依赖阶段二产物，需另出计划：

1. `services/content-filter.ts` 增加 `sectionId/sectionSlug` 过滤维度；
2. `routes/content-api.ts` 与 controllers 增加 `GET /sections`、`GET /sections/:slug`，以及各内容列表的 `section` 参数；
3. 后台菜单分组「业务板块」与板块详情页三 tab；
4. 前台 `/{section}`、`/{section}/guides|blog|courses|products` 路由与 ItemList 结构化数据；
5. slug 保存时拼板块前缀的 lifecycle。

## 自检

- 规格覆盖：设计文档 §3.1→Task 4，§3.2→Task 5，§3.3→Task 6，§4/§7→Task 1-2，§6/§8/§5→阶段三。
- 类型与命名一致：`builtinDefault` / `defaultTheme` / `setSiteDefault` / `clearSiteDefault` 在 Task 1 定义，Task 2 使用，命名一致。
- 无占位符：阶段一每个步骤含完整代码与命令；阶段二明确标注为后续计划，不写前端渲染的伪代码。
