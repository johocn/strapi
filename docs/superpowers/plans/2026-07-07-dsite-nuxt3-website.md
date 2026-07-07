# dsite (Nuxt3) 官网前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Nuxt3 SSR 官网前端，消费 zhao-website 公开 API，覆盖 7 个 CT 的列表/详情页 + 首页/关于/联系，支持整站级模板系统（首期 default 模板 + 扩展点）。

**Architecture:** Nuxt3 SSR + 同域反代（/api → Strapi 1337）。layouts/templates/<name>.vue 编排 sections 实现模板差异化，components/sections + components/content 跨模板共享。站点信息通过新增的 /site-info 公开端点聚合返回。

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, 原生 CSS + CSS 变量, $fetch/useFetch, useState, useSeoMeta

---

## File Structure

```
dsite/
├─ package.json
├─ nuxt.config.ts
├─ tsconfig.json
├─ .gitignore
├─ app.vue
├─ assets/css/
│   ├─ main.css
│   └─ themes/default.css
├─ composables/
│   ├─ useApi.ts
│   ├─ useSite.ts
│   ├─ useSeo.ts
│   └─ useTemplate.ts
├─ layouts/
│   ├─ default.vue
│   └─ templates/default.vue
├─ components/
│   ├─ common/{AppHeader,AppFooter,Pagination,PageLoading}.vue
│   ├─ sections/{HeroSection,FeaturedProducts,FeaturedArticles,FeaturedCases}.vue
│   └─ content/{ArticleCard,ProductCard,CaseCard,TutorialCard,FaqItem,DownloadItem}.vue
├─ pages/
│   ├─ index.vue
│   ├─ articles/{index,[slug]}.vue + articles/category/[slug].vue
│   ├─ products/{index,[slug]}.vue
│   ├─ cases/{index,[slug]}.vue
│   ├─ faqs/index.vue
│   ├─ tutorials/{index,[slug]}.vue
│   ├─ compliance/{index,[slug]}.vue
│   ├─ downloads/index.vue
│   ├─ about.vue
│   └─ contact.vue
└─ plugins/zhao-website (backend): 新增 site-info controller + route
```

---

### Task 1: 后端 site-info 端点 + dsite 项目脚手架

**Files:**
- Create: `e:\code\dsite\package.json`
- Create: `e:\code\dsite\nuxt.config.ts`
- Create: `e:\code\dsite\tsconfig.json`
- Create: `e:\code\dsite\.gitignore`
- Create: `e:\code\dsite\app.vue`
- Create: `e:\code\dsite\assets\css\main.css`
- Create: `e:\code\dsite\assets\css\themes\default.css`
- Create: `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\site-info.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\index.ts`
- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\content-api.ts`

- [ ] **Step 1: 创建 dsite package.json**

```json
{
  "name": "dsite",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "nuxt": "^3.13.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  }
}
```

- [ ] **Step 2: 创建 nuxt.config.ts**

```ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: true,
  runtimeConfig: {
    public: {
      apiBase: '/api/zhao-website/v1',
    },
  },
  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:1337/api', changeOrigin: true },
    },
  },
  css: [
    '~/assets/css/main.css',
    '~/assets/css/themes/default.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  routeRules: {
    '/sitemap.xml': { proxy: 'http://localhost:1337/api/zhao-website/v1/sitemap.xml' },
    '/robots.txt': { proxy: 'http://localhost:1337/api/zhao-website/v1/robots.txt' },
    '/llms.txt': { proxy: 'http://localhost:1337/api/zhao-website/v1/llms.txt' },
  },
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules
.nuxt
.output
dist
*.log
.env
.DS_Store
```

- [ ] **Step 5: 创建 app.vue**

```vue
<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
```

- [ ] **Step 6: 创建 assets/css/main.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.6;
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity 0.2s;
}
a:hover { opacity: 0.8; }

img { max-width: 100%; height: auto; }

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section {
  padding: var(--spacing-section) 0;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 40px;
  text-align: center;
}

.btn {
  display: inline-block;
  padding: 12px 32px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.9; }

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.grid {
  display: grid;
  gap: 24px;
}
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }

@media (max-width: 768px) {
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .section { padding: 40px 0; }
  .section-title { font-size: 24px; margin-bottom: 24px; }
}
```

- [ ] **Step 7: 创建 assets/css/themes/default.css**

```css
:root {
  --color-primary: #ff0000;
  --color-primary-dark: #cc0000;
  --color-text: #333333;
  --color-text-light: #666666;
  --color-bg: #ffffff;
  --color-bg-alt: #f8f8f8;
  --color-border: #eeeeee;
  --spacing-section: 80px;
  --font-size-base: 16px;
  --header-height: 64px;
}
```

- [ ] **Step 8: 创建后端 site-info controller**

创建 `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\site-info.ts`：

```ts
export default {
  async info(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      ctx.body = null;
      return;
    }
    // 用 knex 查 site-config + template 关系（Document Service 关系 filter 不稳定）
    const db = strapi.db.connection;
    const site = await db('zhao_site_configs')
      .where('document_id', siteId)
      .select('id', 'site_name', 'site_description', 'logo', 'favicon', 'icp_number',
              'seo_keywords', 'seo_description', 'customer_service_url', 'domain',
              'template', 'theme_config', 'extra_config', 'share_title', 'share_description', 'share_image')
      .first();
    if (!site) {
      ctx.body = null;
      return;
    }
    let template = null;
    if (site.template) {
      template = await db('zhao_site_templates').where('id', site.template).select('id', 'name', 'display_name', 'theme_config').first();
    }
    // brand-info + seo-config（若存在）
    let brandInfo = null;
    let seoConfig = null;
    try {
      brandInfo = await strapi.plugin('zhao-website').service('brand-info').find(siteId);
    } catch (e) {}
    try {
      seoConfig = await strapi.plugin('zhao-website').service('seo-config').find(siteId);
    } catch (e) {}
    ctx.body = {
      siteName: site.site_name,
      siteDescription: site.site_description,
      logo: site.logo,
      favicon: site.favicon,
      icpNumber: site.icp_number,
      seoKeywords: site.seo_keywords,
      seoDescription: site.seo_description,
      customerServiceUrl: site.customer_service_url,
      domain: site.domain,
      shareTitle: site.share_title,
      shareDescription: site.share_description,
      shareImage: site.share_image,
      themeConfig: site.theme_config || {},
      extraConfig: site.extra_config || {},
      template: template ? { name: template.name, displayName: template.display_name, themeConfig: template.theme_config || {} } : { name: 'default', displayName: '默认', themeConfig: {} },
      brandInfo,
      seoConfig,
    };
  },
};
```

- [ ] **Step 9: 注册 controller**

修改 `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\index.ts`：

```ts
import article from "./article";
import product from "./product";
import casE from "./case";
import faq from "./faq";
import tutorial from "./tutorial";
import compliance from "./compliance";
import download from "./download";
import lead from "./lead";
import seoOutput from "./seo-output";
import siteInfo from "./site-info";

export default {
  article,
  product,
  case: casE,
  faq,
  tutorial,
  compliance,
  download,
  lead,
  "seo-output": seoOutput,
  "site-info": siteInfo,
};
```

- [ ] **Step 10: 注册路由**

修改 `e:\code\basic\plugins\zhao-website\server\src\routes\content-api.ts`，在 SEO 输出之后追加：

```ts
    // ===== SEO 输出 =====
    publicRoute("GET", "/sitemap.xml", "content-api.seo-output.sitemap"),
    publicRoute("GET", "/robots.txt", "content-api.seo-output.robots"),
    publicRoute("GET", "/llms.txt", "content-api.seo-output.llmsTxt"),
    publicRoute("GET", "/manifest.json", "content-api.seo-output.manifest"),
    // ===== 站点信息 =====
    publicRoute("GET", "/site-info", "content-api.site-info.info"),
```

- [ ] **Step 11: 安装 dsite 依赖**

Run（在 `e:\code\dsite`）：
```powershell
npm install
```
Expected: node_modules 创建成功，.nuxt 目录生成

- [ ] **Step 12: Commit 后端 + 脚手架**

```powershell
cd e:\code\basic; git add plugins/zhao-website/server/src/controllers/content-api/site-info.ts plugins/zhao-website/server/src/controllers/content-api/index.ts plugins/zhao-website/server/src/routes/content-api.ts; git commit -m "feat(zhao-website): 新增 site-info 公开端点"
cd e:\code\dsite; git init; git add .; git commit -m "feat(dsite): Nuxt3 项目脚手架 + 全局样式"
```

---

### Task 2: Composables（数据层）

**Files:**
- Create: `e:\code\dsite\composables\useApi.ts`
- Create: `e:\code\dsite\composables\useSite.ts`
- Create: `e:\code\dsite\composables\useSeo.ts`
- Create: `e:\code\dsite\composables\useTemplate.ts`

- [ ] **Step 1: 创建 useApi.ts**

```ts
export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  const request = <T>(url: string, opts: any = {}): Promise<T> => {
    return $fetch<T>(url, { ...opts })
  }

  return {
    // 通用
    list: (resource: string, params: Record<string, any> = {}) =>
      request(`${base}/${resource}`, { params }),
    detail: (resource: string, slug: string, params: Record<string, any> = {}) =>
      request(`${base}/${resource}/${slug}`, { params }),
    // 文章
    articlesFeatured: (params: Record<string, any> = {}) => request(`${base}/articles/featured`, { params }),
    articlesByCategory: (slug: string, params: Record<string, any> = {}) => request(`${base}/articles/category/${slug}`, { params }),
    articleRelated: (slug: string) => request(`${base}/articles/${slug}/related`),
    // FAQ
    faqsByCategory: (slug: string, params: Record<string, any> = {}) => request(`${base}/faqs/category/${slug}`, { params }),
    // 教程
    tutorialsByDifficulty: (level: string, params: Record<string, any> = {}) => request(`${base}/tutorials/difficulty/${level}`, { params }),
    // 合规
    complianceByCategory: (cat: string, params: Record<string, any> = {}) => request(`${base}/compliance/category/${cat}`, { params }),
    // 站点
    siteInfo: () => request(`${base}/site-info`),
    // 留资/互动
    submitLead: (data: Record<string, any>) => request(`${base}/leads/submit`, { method: 'POST', body: data }),
    trackInteraction: (data: Record<string, any>) => request(`${base}/interactions/track`, { method: 'POST', body: data }),
    // 下载
    downloadFile: (slug: string) => request(`${base}/downloads/${slug}`),
  }
}
```

- [ ] **Step 2: 创建 useSite.ts**

```ts
export async function useSite() {
  const site = useState<any>('site', () => null)
  if (!site.value) {
    try {
      const api = useApi()
      site.value = await api.siteInfo()
    } catch (e) {
      site.value = null
    }
  }
  return site
}
```

- [ ] **Step 3: 创建 useSeo.ts**

```ts
export function useSeo(options: {
  title?: string
  description?: string
  keywords?: string
  image?: string
  type?: string
  url?: string
}) {
  const site = useState<any>('site', () => null)
  const siteName = computed(() => site.value?.siteName || '')
  const siteDesc = computed(() => site.value?.siteDescription || '')
  const siteKeywords = computed(() => site.value?.seoKeywords || '')
  const titleTemplate = computed(() => site.value?.seoConfig?.titleTemplate || '%s')

  const fullTitle = computed(() => {
    const t = options.title || siteName.value
    return titleTemplate.value.replace('%s', t)
  })

  useHead({
    title: fullTitle.value,
  })
  useSeoMeta({
    description: options.description || siteDesc.value,
    keywords: options.keywords || siteKeywords.value,
    ogTitle: fullTitle.value,
    ogDescription: options.description || siteDesc.value,
    ogImage: options.image || site.value?.shareImage,
    ogType: options.type || 'website',
  })
}
```

- [ ] **Step 4: 创建 useTemplate.ts**

```ts
export function useTemplate() {
  const site = useState<any>('site', () => null)
  const templateName = computed(() => site.value?.template?.name || 'default')
  return { templateName }
}
```

- [ ] **Step 5: Commit**

```powershell
cd e:\code\dsite; git add composables; git commit -m "feat(dsite): composables 数据层（useApi/useSite/useSeo/useTemplate）"
```

---

### Task 3: Layout 系统 + 通用组件

**Files:**
- Create: `e:\code\dsite\layouts\default.vue`
- Create: `e:\code\dsite\layouts\templates\default.vue`
- Create: `e:\code\dsite\components\common\AppHeader.vue`
- Create: `e:\code\dsite\components\common\AppFooter.vue`
- Create: `e:\code\dsite\components\common\Pagination.vue`
- Create: `e:\code\dsite\components\common\PageLoading.vue`

- [ ] **Step 1: 创建 layouts/default.vue（模板入口）**

```vue
<template>
  <div>
    <LayoutTemplateDefault v-if="templateName === 'default'" />
    <LayoutTemplateDefault v-else />
  </div>
</template>

<script setup>
const { templateName } = useTemplate()
</script>
```

- [ ] **Step 2: 创建 layouts/templates/default.vue**

```vue
<template>
  <div class="site-wrapper">
    <AppHeader />
    <main class="site-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
await useSite()
</script>

<style>
.site-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.site-main {
  flex: 1;
  padding-top: var(--header-height);
}
</style>
```

- [ ] **Step 3: 创建 components/common/AppHeader.vue**

```vue
<template>
  <header class="app-header">
    <div class="container header-inner">
      <NuxtLink to="/" class="logo">
        <img v-if="site?.logo?.url" :src="site.logo.url" :alt="site?.siteName" class="logo-img" />
        <span v-else class="logo-text">{{ site?.siteName || '官网' }}</span>
      </NuxtLink>
      <nav class="nav">
        <NuxtLink to="/" class="nav-link">首页</NuxtLink>
        <NuxtLink to="/products" class="nav-link">产品</NuxtLink>
        <NuxtLink to="/cases" class="nav-link">案例</NuxtLink>
        <NuxtLink to="/articles" class="nav-link">资讯</NuxtLink>
        <NuxtLink to="/tutorials" class="nav-link">教程</NuxtLink>
        <NuxtLink to="/faqs" class="nav-link">问答</NuxtLink>
        <NuxtLink to="/compliance" class="nav-link">合规</NuxtLink>
        <NuxtLink to="/downloads" class="nav-link">下载</NuxtLink>
        <NuxtLink to="/about" class="nav-link">关于</NuxtLink>
        <NuxtLink to="/contact" class="nav-link">联系</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup>
const site = useState<any>('site', () => null)
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--header-height);
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  z-index: 100;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}
.logo-img { height: 40px; }
.logo-text { font-size: 20px; font-weight: 700; color: var(--color-primary); }
.nav { display: flex; gap: 24px; }
.nav-link { color: var(--color-text); font-size: 15px; }
.nav-link.router-link-active { color: var(--color-primary); font-weight: 600; }
@media (max-width: 768px) {
  .nav { gap: 12px; overflow-x: auto; }
  .nav-link { font-size: 13px; white-space: nowrap; }
}
</style>
```

- [ ] **Step 4: 创建 components/common/AppFooter.vue**

```vue
<template>
  <footer class="app-footer">
    <div class="container footer-inner">
      <div class="footer-info">
        <div class="footer-name">{{ site?.siteName || '官网' }}</div>
        <p v-if="site?.siteDescription" class="footer-desc">{{ site.siteDescription }}</p>
      </div>
      <div class="footer-meta">
        <p v-if="site?.icpNumber" class="footer-icp">{{ site.icpNumber }}</p>
        <p class="footer-copy">© {{ new Date().getFullYear() }} {{ site?.siteName || '' }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const site = useState<any>('site', () => null)
</script>

<style scoped>
.app-footer {
  background: #1a1a1a;
  color: #999;
  padding: 40px 0;
  margin-top: 60px;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
}
.footer-name { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.footer-desc { font-size: 14px; max-width: 400px; }
.footer-meta { text-align: right; font-size: 13px; }
.footer-icp { margin-bottom: 4px; }
</style>
```

- [ ] **Step 5: 创建 components/common/Pagination.vue**

```vue
<template>
  <div v-if="totalPages > 1" class="pagination">
    <button class="page-btn" :disabled="page <= 1" @click="$emit('change', page - 1)">上一页</button>
    <span class="page-info">{{ page }} / {{ totalPages }}</span>
    <button class="page-btn" :disabled="page >= totalPages" @click="$emit('change', page + 1)">下一页</button>
  </div>
</template>

<script setup>
const props = defineProps<{ page: number; totalPages: number }>()
defineEmits<{ (e: 'change', p: number): void }>()
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 40px 0;
}
.page-btn {
  padding: 8px 20px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.page-btn:disabled { color: #ccc; cursor: not-allowed; }
.page-info { font-size: 14px; color: var(--color-text-light); }
</style>
```

- [ ] **Step 6: 创建 components/common/PageLoading.vue**

```vue
<template>
  <div class="page-loading">
    <div class="spinner"></div>
    <p>加载中...</p>
  </div>
</template>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  color: var(--color-text-light);
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 7: 启动 dev 验证 Header/Footer 渲染**

Run（在 `e:\code\dsite`）：
```powershell
npm run dev
```
Expected: 访问 http://localhost:3000 报 404（无 pages），但 Header/Footer 应能渲染（因 layout 已挂载）。若报错则检查控制台。

- [ ] **Step 8: Commit**

```powershell
cd e:\code\dsite; git add layouts components/common; git commit -m "feat(dsite): layout 系统 + 通用组件（Header/Footer/Pagination/Loading）"
```

---

### Task 4: Content 卡片组件 + Section 区块

**Files:**
- Create: `e:\code\dsite\components\content\ArticleCard.vue`
- Create: `e:\code\dsite\components\content\ProductCard.vue`
- Create: `e:\code\dsite\components\content\CaseCard.vue`
- Create: `e:\code\dsite\components\content\TutorialCard.vue`
- Create: `e:\code\dsite\components\content\FaqItem.vue`
- Create: `e:\code\dsite\components\content\DownloadItem.vue`
- Create: `e:\code\dsite\components\sections\HeroSection.vue`
- Create: `e:\code\dsite\components\sections\FeaturedProducts.vue`
- Create: `e:\code\dsite\components\sections\FeaturedArticles.vue`
- Create: `e:\code\dsite\components\sections\FeaturedCases.vue`

- [ ] **Step 1: 创建 ArticleCard.vue**

```vue
<template>
  <NuxtLink :to="`/articles/${item.slug}`" class="card article-card">
    <div v-if="item.coverImage?.url" class="card-cover">
      <img :src="item.coverImage.url" :alt="item.title" />
    </div>
    <div class="card-body">
      <span v-if="item.category?.name" class="card-tag">{{ item.category.name }}</span>
      <h3 class="card-title">{{ item.title }}</h3>
      <p v-if="item.excerpt" class="card-desc">{{ item.excerpt }}</p>
      <div class="card-meta">
        <span v-if="item.publishedAt">{{ formatDate(item.publishedAt) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps<{ item: any }>()
function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('zh-CN') : ''
}
</script>

<style scoped>
.card { display: block; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.card-cover img { width: 100%; height: 180px; object-fit: cover; }
.card-body { padding: 20px; }
.card-tag { display: inline-block; padding: 2px 10px; background: var(--color-bg-alt); color: var(--color-primary); font-size: 12px; border-radius: 4px; margin-bottom: 8px; }
.card-title { font-size: 18px; font-weight: 600; color: var(--color-text); margin-bottom: 8px; line-height: 1.4; }
.card-desc { font-size: 14px; color: var(--color-text-light); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { margin-top: 12px; font-size: 13px; color: #999; }
</style>
```

- [ ] **Step 2: 创建 ProductCard.vue**

```vue
<template>
  <NuxtLink :to="`/products/${item.slug}`" class="card product-card">
    <div v-if="item.coverImage?.url" class="card-cover">
      <img :src="item.coverImage.url" :alt="item.name" />
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ item.name }}</h3>
      <p v-if="item.tagline" class="card-tagline">{{ item.tagline }}</p>
      <div class="card-meta">
        <span v-if="item.priceRange" class="price">{{ item.priceRange }}{{ item.priceUnit || '' }}</span>
        <span v-if="item.isFeatured" class="featured">精选</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps<{ item: any }>()
</script>

<style scoped>
.card { display: block; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s; }
.card:hover { transform: translateY(-4px); }
.card-cover img { width: 100%; height: 200px; object-fit: cover; }
.card-body { padding: 20px; }
.card-title { font-size: 20px; font-weight: 600; color: var(--color-text); margin-bottom: 8px; }
.card-tagline { font-size: 14px; color: var(--color-text-light); margin-bottom: 12px; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.price { font-size: 18px; font-weight: 700; color: var(--color-primary); }
.featured { padding: 2px 8px; background: var(--color-primary); color: #fff; font-size: 12px; border-radius: 4px; }
</style>
```

- [ ] **Step 3: 创建 CaseCard.vue**

```vue
<template>
  <NuxtLink :to="`/cases/${item.slug}`" class="card case-card">
    <div v-if="item.coverImage?.url" class="card-cover">
      <img :src="item.coverImage.url" :alt="item.title" />
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ item.title }}</h3>
      <p class="card-client">{{ item.clientName }}<span v-if="item.clientIndustry"> · {{ item.clientIndustry }}</span></p>
      <p v-if="item.challenge" class="card-desc">{{ item.challenge }}</p>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps<{ item: any }>()
</script>

<style scoped>
.card { display: block; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s; }
.card:hover { transform: translateY(-4px); }
.card-cover img { width: 100%; height: 200px; object-fit: cover; }
.card-body { padding: 20px; }
.card-title { font-size: 18px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.card-client { font-size: 14px; color: var(--color-primary); margin-bottom: 8px; }
.card-desc { font-size: 14px; color: var(--color-text-light); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
```

- [ ] **Step 4: 创建 TutorialCard.vue**

```vue
<template>
  <NuxtLink :to="`/tutorials/${item.slug}`" class="card tutorial-card">
    <div v-if="item.coverImage?.url" class="card-cover">
      <img :src="item.coverImage.url" :alt="item.title" />
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ item.title }}</h3>
      <div class="card-meta">
        <span v-if="item.difficulty" class="badge difficulty-{{ item.difficulty }}">{{ difficultyText(item.difficulty) }}</span>
        <span v-if="item.estimatedTime" class="time">{{ item.estimatedTime }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps<{ item: any }>()
function difficultyText(d: string) {
  return { beginner: '入门', intermediate: '中级', advanced: '高级' }[d] || d
}
</script>

<style scoped>
.card { display: block; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s; }
.card:hover { transform: translateY(-4px); }
.card-cover img { width: 100%; height: 160px; object-fit: cover; }
.card-body { padding: 16px 20px; }
.card-title { font-size: 16px; font-weight: 600; color: var(--color-text); margin-bottom: 8px; }
.card-meta { display: flex; gap: 12px; align-items: center; font-size: 13px; }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.difficulty-beginner { background: #e8f5e9; color: #07c160; }
.difficulty-intermediate { background: #fff3e0; color: #faad14; }
.difficulty-advanced { background: #ffebee; color: #f44336; }
.time { color: #999; }
</style>
```

- [ ] **Step 5: 创建 FaqItem.vue**

```vue
<template>
  <div class="faq-item">
    <button class="faq-question" @click="open = !open">
      <span>{{ item.question }}</span>
      <span class="faq-icon">{{ open ? '−' : '+' }}</span>
    </button>
    <div v-show="open" class="faq-answer">
      <p>{{ item.answer }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps<{ item: any }>()
const open = ref(false)
</script>

<style scoped>
.faq-item { background: #fff; border: 1px solid var(--color-border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
.faq-question { width: 100%; padding: 16px 20px; background: none; border: none; text-align: left; font-size: 16px; font-weight: 500; color: var(--color-text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.faq-icon { font-size: 22px; color: var(--color-primary); }
.faq-answer { padding: 0 20px 16px; color: var(--color-text-light); line-height: 1.7; }
</style>
```

- [ ] **Step 6: 创建 DownloadItem.vue**

```vue
<template>
  <div class="download-item">
    <div class="download-info">
      <h4 class="download-name">{{ item.name }}</h4>
      <p v-if="item.description" class="download-desc">{{ item.description }}</p>
      <div class="download-meta">
        <span v-if="item.fileType" class="badge">{{ fileTypeText(item.fileType) }}</span>
        <span v-if="item.fileSize" class="size">{{ formatSize(item.fileSize) }}</span>
        <span class="count">下载 {{ item.downloadCount || 0 }} 次</span>
      </div>
    </div>
    <button class="btn download-btn" @click="$emit('download', item)">下载</button>
  </div>
</template>

<script setup>
defineProps<{ item: any }>()
defineEmits<{ (e: 'download', item: any): void }>()
function fileTypeText(t: string) {
  return { whitepaper: '白皮书', brochure: '宣传册', datasheet: '数据表', template: '模板', guide: '指南', certificate: '证书', other: '其他' }[t] || t
}
function formatSize(s: any) {
  const n = Number(s)
  if (!n) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}
</script>

<style scoped>
.download-item { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #fff; border: 1px solid var(--color-border); border-radius: 8px; margin-bottom: 12px; }
.download-name { font-size: 16px; font-weight: 600; color: var(--color-text); margin-bottom: 4px; }
.download-desc { font-size: 14px; color: var(--color-text-light); margin-bottom: 8px; }
.download-meta { display: flex; gap: 12px; align-items: center; font-size: 13px; color: #999; }
.badge { padding: 2px 8px; background: var(--color-bg-alt); color: var(--color-primary); border-radius: 4px; }
.download-btn { flex-shrink: 0; }
</style>
```

- [ ] **Step 7: 创建 HeroSection.vue**

```vue
<template>
  <section class="hero">
    <div class="container hero-inner">
      <h1 class="hero-title">{{ site?.siteName || '企业官网' }}</h1>
      <p class="hero-desc">{{ site?.siteDescription || '专业的产品与服务' }}</p>
      <div class="hero-actions">
        <NuxtLink to="/products" class="btn">浏览产品</NuxtLink>
        <NuxtLink to="/contact" class="btn btn-outline">联系我们</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
const site = useState<any>('site', () => null)
</script>

<style scoped>
.hero { background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: #fff; padding: 100px 0; text-align: center; }
.hero-title { font-size: 42px; font-weight: 700; margin-bottom: 16px; }
.hero-desc { font-size: 18px; opacity: 0.9; margin-bottom: 32px; }
.hero-actions { display: flex; gap: 16px; justify-content: center; }
.hero-actions .btn { background: #fff; color: var(--color-primary); }
.hero-actions .btn-outline { background: transparent; color: #fff; border-color: #fff; }
@media (max-width: 768px) { .hero-title { font-size: 28px; } .hero-desc { font-size: 15px; } }
</style>
```

- [ ] **Step 8: 创建 FeaturedProducts.vue**

```vue
<template>
  <section class="section">
    <div class="container">
      <h2 class="section-title">精选产品</h2>
      <div class="grid grid-3">
        <ProductCard v-for="p in products" :key="p.documentId || p.id" :item="p" />
      </div>
      <div class="section-more">
        <NuxtLink to="/products" class="btn btn-outline">查看全部</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps<{ products: any[] }>()
</script>

<style scoped>
.section-more { text-align: center; margin-top: 32px; }
</style>
```

- [ ] **Step 9: 创建 FeaturedArticles.vue**

```vue
<template>
  <section class="section" style="background: var(--color-bg-alt);">
    <div class="container">
      <h2 class="section-title">最新资讯</h2>
      <div class="grid grid-3">
        <ArticleCard v-for="a in articles" :key="a.documentId || a.id" :item="a" />
      </div>
      <div class="section-more">
        <NuxtLink to="/articles" class="btn btn-outline">查看全部</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps<{ articles: any[] }>()
</script>

<style scoped>
.section-more { text-align: center; margin-top: 32px; }
</style>
```

- [ ] **Step 10: 创建 FeaturedCases.vue**

```vue
<template>
  <section class="section">
    <div class="container">
      <h2 class="section-title">成功案例</h2>
      <div class="grid grid-2">
        <CaseCard v-for="c in cases" :key="c.documentId || c.id" :item="c" />
      </div>
      <div class="section-more">
        <NuxtLink to="/cases" class="btn btn-outline">查看全部</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps<{ cases: any[] }>()
</script>

<style scoped>
.section-more { text-align: center; margin-top: 32px; }
</style>
```

- [ ] **Step 11: Commit**

```powershell
cd e:\code\dsite; git add components; git commit -m "feat(dsite): content 卡片组件 + section 区块"
```

---

### Task 5: 首页 + 文章页面

**Files:**
- Create: `e:\code\dsite\pages\index.vue`
- Create: `e:\code\dsite\pages\articles\index.vue`
- Create: `e:\code\dsite\pages\articles\[slug].vue`
- Create: `e:\code\dsite\pages\articles\category\[slug].vue`

- [ ] **Step 1: 创建 pages/index.vue（首页）**

```vue
<template>
  <div>
    <HeroSection />
    <FeaturedProducts :products="featuredProducts" />
    <FeaturedCases :cases="featuredCases" />
    <FeaturedArticles :articles="featuredArticles" />
  </div>
</template>

<script setup>
const api = useApi()
await useSite()
useSeo({})

const [
  featuredProducts,
  featuredCases,
  articlesRes,
] = await Promise.all([
  api.list('products', { 'filters[isFeatured][$eq]': true, 'pagination[pageSize]': 3 }),
  api.list('cases', { 'pagination[pageSize]': 2 }),
  api.articlesFeatured({ limit: 3 }),
])

const featuredArticles = computed(() => articlesRes?.list || articlesRes || [])
</script>
```

- [ ] **Step 2: 创建 pages/articles/index.vue（文章列表）**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">资讯文章</h1>
    <div class="list-toolbar">
      <input v-model="keyword" placeholder="搜索文章" class="search-input" @keyup.enter="reload(1)" />
    </div>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="grid grid-3">
      <ArticleCard v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">暂无文章</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const router = useRouter()

const keyword = ref(route.query.q || '')
const page = ref(Number(route.query.page) || 1)
const pageSize = 9
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    const params: any = { 'pagination[page]': p, 'pagination[pageSize]': pageSize }
    if (keyword.value) params['filters[title][$contains]'] = keyword.value
    const res = await api.list('articles', params)
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
    router.replace({ query: { q: keyword.value || undefined, page: p > 1 ? p : undefined } })
  } catch (e) {
    list.value = []
  } finally {
    pending.value = false
  }
}

await useSite()
useSeo({ title: '资讯文章' })
await reload(page.value)
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.list-toolbar { margin-bottom: 32px; }
.search-input { width: 100%; max-width: 400px; padding: 10px 16px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 15px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 3: 创建 pages/articles/[slug].vue（文章详情）**

```vue
<template>
  <article class="container section article-detail" v-if="item">
    <nav class="breadcrumb"><NuxtLink to="/articles">资讯</NuxtLink> / {{ item.title }}</nav>
    <h1 class="article-title">{{ item.title }}</h1>
    <div class="article-meta">
      <span v-if="item.category?.name">{{ item.category.name }}</span>
      <span v-if="item.publishedAt">{{ formatDate(item.publishedAt) }}</span>
    </div>
    <img v-if="item.coverImage?.url" :src="item.coverImage.url" :alt="item.title" class="article-cover" />
    <div class="article-content" v-html="item.content"></div>
    <div v-if="item.seoTitle || item.seoDescription" class="article-seo">
      <p v-if="item.seoTitle"><strong>SEO 标题：</strong>{{ item.seoTitle }}</p>
      <p v-if="item.seoDescription"><strong>SEO 描述：</strong>{{ item.seoDescription }}</p>
    </div>
    <section v-if="related.length" class="related">
      <h2 class="section-title">相关文章</h2>
      <div class="grid grid-3">
        <ArticleCard v-for="r in related" :key="r.documentId || r.id" :item="r" />
      </div>
    </section>
  </article>
  <div v-else class="container section empty">文章不存在或已下架</div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const item = ref<any>(null)
const related = ref<any[]>([])

try {
  item.value = await api.detail('articles', slug.value)
  if (item.value) {
    try { related.value = await api.articleRelated(slug.value) } catch (e) {}
    related.value = related.value?.list || related.value || []
  }
} catch (e) {
  item.value = null
}

await useSite()
useSeo({
  title: item.value?.title,
  description: item.value?.seoDescription || item.value?.excerpt,
  image: item.value?.coverImage?.url,
  type: 'article',
})

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }
</script>

<style scoped>
.breadcrumb { font-size: 13px; color: var(--color-text-light); margin-bottom: 16px; }
.article-title { font-size: 36px; font-weight: 700; margin-bottom: 12px; }
.article-meta { display: flex; gap: 16px; color: var(--color-text-light); font-size: 14px; margin-bottom: 24px; }
.article-cover { width: 100%; border-radius: 8px; margin-bottom: 32px; }
.article-content { font-size: 16px; line-height: 1.8; color: var(--color-text); }
.article-content :deep(p) { margin-bottom: 16px; }
.article-seo { margin-top: 32px; padding: 16px; background: var(--color-bg-alt); border-radius: 8px; font-size: 13px; }
.related { margin-top: 60px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 4: 创建 pages/articles/category/[slug].vue（分类文章）**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">分类：{{ slug }}</h1>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="grid grid-3">
      <ArticleCard v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">该分类暂无文章</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const page = ref(1)
const pageSize = 9
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)
const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    const res = await api.articlesByCategory(slug.value, { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
  } catch (e) {
    list.value = []
  } finally {
    pending.value = false
  }
}

await useSite()
useSeo({ title: `分类：${slug.value}` })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 5: 验证首页与文章页可访问**

Run（确保 Strapi 运行在 1337 + dsite dev）：
```powershell
npm run dev
```
访问 http://localhost:3000（首页）、http://localhost:3000/articles（列表）。预期页面渲染，若 API 报错检查 devProxy 配置。

- [ ] **Step 6: Commit**

```powershell
cd e:\code\dsite; git add pages; git commit -m "feat(dsite): 首页 + 文章页面（list/detail/category）"
```

---

### Task 6: 产品 + 案例 + FAQ + 教程页面

**Files:**
- Create: `e:\code\dsite\pages\products\index.vue`
- Create: `e:\code\dsite\pages\products\[slug].vue`
- Create: `e:\code\dsite\pages\cases\index.vue`
- Create: `e:\code\dsite\pages\cases\[slug].vue`
- Create: `e:\code\dsite\pages\faqs\index.vue`
- Create: `e:\code\dsite\pages\tutorials\index.vue`
- Create: `e:\code\dsite\pages\tutorials\[slug].vue`

- [ ] **Step 1: 创建 pages/products/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">产品中心</h1>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="grid grid-3">
      <ProductCard v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">暂无产品</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const page = ref(1)
const pageSize = 9
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)
const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    const res = await api.list('products', { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

await useSite()
useSeo({ title: '产品中心' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 2: 创建 pages/products/[slug].vue**

```vue
<template>
  <div class="container section product-detail" v-if="item">
    <nav class="breadcrumb"><NuxtLink to="/products">产品</NuxtLink> / {{ item.name }}</nav>
    <div class="product-header">
      <img v-if="item.coverImage?.url" :src="item.coverImage.url" :alt="item.name" class="product-cover" />
      <div class="product-info">
        <h1 class="product-name">{{ item.name }}</h1>
        <p v-if="item.tagline" class="product-tagline">{{ item.tagline }}</p>
        <p v-if="item.priceRange" class="product-price">{{ item.priceRange }}{{ item.priceUnit || '' }}</p>
        <NuxtLink to="/contact" class="btn">咨询购买</NuxtLink>
      </div>
    </div>
    <div v-if="item.description" class="product-section">
      <h2 class="block-title">产品介绍</h2>
      <div class="content" v-html="item.description"></div>
    </div>
    <div v-if="parseJson(item.features).length" class="product-section">
      <h2 class="block-title">核心特性</h2>
      <ul class="feature-list">
        <li v-for="(f, i) in parseJson(item.features)" :key="i">{{ typeof f === 'string' ? f : f.name || f.title || JSON.stringify(f) }}</li>
      </ul>
    </div>
    <div v-if="parseJson(item.scenarios).length" class="product-section">
      <h2 class="block-title">应用场景</h2>
      <ul class="feature-list">
        <li v-for="(s, i) in parseJson(item.scenarios)" :key="i">{{ typeof s === 'string' ? s : s.name || s.title || JSON.stringify(s) }}</li>
      </ul>
    </div>
  </div>
  <div v-else class="container section empty">产品不存在</div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const item = ref<any>(null)
try {
  item.value = await api.detail('products', route.params.slug as string)
} catch (e) { item.value = null }

await useSite()
useSeo({ title: item.value?.name, description: item.value?.tagline, image: item.value?.coverImage?.url })

function parseJson(v: any) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const r = JSON.parse(v); return Array.isArray(r) ? r : [] } catch (e) { return [] }
}
</script>

<style scoped>
.breadcrumb { font-size: 13px; color: var(--color-text-light); margin-bottom: 16px; }
.product-header { display: flex; gap: 40px; margin-bottom: 40px; }
.product-cover { width: 400px; border-radius: 8px; object-fit: cover; }
.product-name { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
.product-tagline { font-size: 16px; color: var(--color-text-light); margin-bottom: 16px; }
.product-price { font-size: 24px; font-weight: 700; color: var(--color-primary); margin-bottom: 24px; }
.product-section { margin-bottom: 40px; }
.block-title { font-size: 22px; font-weight: 600; margin-bottom: 16px; border-left: 4px solid var(--color-primary); padding-left: 12px; }
.feature-list { padding-left: 20px; }
.feature-list li { margin-bottom: 8px; line-height: 1.8; }
.empty { text-align: center; padding: 80px 0; }
@media (max-width: 768px) { .product-header { flex-direction: column; } .product-cover { width: 100%; } }
</style>
```

- [ ] **Step 3: 创建 pages/cases/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">成功案例</h1>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="grid grid-2">
      <CaseCard v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">暂无案例</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const page = ref(1)
const pageSize = 8
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)
const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    const res = await api.list('cases', { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

await useSite()
useSeo({ title: '成功案例' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 4: 创建 pages/cases/[slug].vue**

```vue
<template>
  <div class="container section case-detail" v-if="item">
    <nav class="breadcrumb"><NuxtLink to="/cases">案例</NuxtLink> / {{ item.title }}</nav>
    <h1 class="case-title">{{ item.title }}</h1>
    <div class="case-meta">
      <span v-if="item.clientName">客户：{{ item.clientName }}</span>
      <span v-if="item.clientIndustry">行业：{{ item.clientIndustry }}</span>
    </div>
    <img v-if="item.coverImage?.url" :src="item.coverImage.url" :alt="item.title" class="case-cover" />
    <section class="case-section">
      <h2 class="block-title">挑战</h2>
      <div class="content" v-html="item.challenge"></div>
    </section>
    <section class="case-section">
      <h2 class="block-title">解决方案</h2>
      <div class="content" v-html="item.solution"></div>
    </section>
    <section v-if="item.results" class="case-section">
      <h2 class="block-title">成果</h2>
      <ul class="result-list">
        <li v-for="(r, i) in parseJson(item.results)" :key="i">{{ typeof r === 'string' ? r : r.metric || r.value || JSON.stringify(r) }}</li>
      </ul>
    </section>
    <section v-if="item.testimonial" class="case-section testimonial">
      <blockquote>"{{ item.testimonial }}"</blockquote>
      <p v-if="item.testimonialAuthor" class="testimonial-author">— {{ item.testimonialAuthor }}<span v-if="item.testimonialTitle">，{{ item.testimonialTitle }}</span></p>
    </section>
  </div>
  <div v-else class="container section empty">案例不存在</div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const item = ref<any>(null)
try {
  item.value = await api.detail('cases', route.params.slug as string)
} catch (e) { item.value = null }

await useSite()
useSeo({ title: item.value?.title, description: item.value?.challenge, image: item.value?.coverImage?.url })

function parseJson(v: any) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const r = JSON.parse(v); return Array.isArray(r) ? r : [] } catch (e) { return [] }
}
</script>

<style scoped>
.breadcrumb { font-size: 13px; color: var(--color-text-light); margin-bottom: 16px; }
.case-title { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
.case-meta { display: flex; gap: 24px; color: var(--color-text-light); margin-bottom: 24px; }
.case-cover { width: 100%; border-radius: 8px; margin-bottom: 32px; }
.case-section { margin-bottom: 40px; }
.block-title { font-size: 22px; font-weight: 600; margin-bottom: 16px; border-left: 4px solid var(--color-primary); padding-left: 12px; }
.content { line-height: 1.8; }
.result-list { padding-left: 20px; }
.testimonial { background: var(--color-bg-alt); padding: 24px; border-radius: 8px; }
.testimonial blockquote { font-size: 18px; font-style: italic; margin-bottom: 12px; }
.testimonial-author { text-align: right; color: var(--color-text-light); }
.empty { text-align: center; padding: 80px 0; }
</style>
```

- [ ] **Step 5: 创建 pages/faqs/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">常见问题</h1>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="faq-list">
      <FaqItem v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">暂无问答</div>
  </div>
</template>

<script setup>
const api = useApi()
const list = ref<any[]>([])
const pending = ref(false)

async function reload() {
  pending.value = true
  try {
    const res = await api.list('faqs', { 'pagination[pageSize]': 50, 'sort[0]': 'order:asc' })
    list.value = res?.list || []
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

await useSite()
useSeo({ title: '常见问题' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.faq-list { max-width: 800px; margin: 0 auto; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 6: 创建 pages/tutorials/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">教程中心</h1>
    <div class="filter-bar">
      <button v-for="d in difficulties" :key="d.value" :class="['filter-btn', { active: activeDifficulty === d.value }]" @click="filterDifficulty(d.value)">{{ d.label }}</button>
    </div>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="grid grid-3">
      <TutorialCard v-for="item in list" :key="item.documentId || item.id" :item="item" />
    </div>
    <div v-else class="empty">暂无教程</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const page = ref(1)
const pageSize = 9
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)
const activeDifficulty = ref('')
const difficulties = [
  { value: '', label: '全部' },
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
]
const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    let res
    if (activeDifficulty.value) {
      res = await api.tutorialsByDifficulty(activeDifficulty.value, { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    } else {
      res = await api.list('tutorials', { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    }
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

function filterDifficulty(d: string) {
  activeDifficulty.value = d
  reload(1)
}

await useSite()
useSeo({ title: '教程中心' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 32px; }
.filter-btn { padding: 8px 20px; background: #fff; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; font-size: 14px; }
.filter-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 7: 创建 pages/tutorials/[slug].vue**

```vue
<template>
  <article class="container section tutorial-detail" v-if="item">
    <nav class="breadcrumb"><NuxtLink to="/tutorials">教程</NuxtLink> / {{ item.title }}</nav>
    <h1 class="tutorial-title">{{ item.title }}</h1>
    <div class="tutorial-meta">
      <span v-if="item.difficulty" class="badge difficulty-{{ item.difficulty }}">{{ difficultyText(item.difficulty) }}</span>
      <span v-if="item.estimatedTime">{{ item.estimatedTime }}</span>
    </div>
    <img v-if="item.coverImage?.url" :src="item.coverImage.url" :alt="item.title" class="tutorial-cover" />
    <p v-if="item.description" class="tutorial-desc">{{ item.description }}</p>
    <section class="tutorial-section">
      <h2 class="block-title">操作步骤</h2>
      <ol class="steps-list">
        <li v-for="(step, i) in parseJson(item.steps)" :key="i" class="step-item">
          <h4 v-if="step.title">{{ i + 1 }}. {{ step.title }}</h4>
          <p v-if="step.content || step.description">{{ step.content || step.description }}</p>
          <p v-if="typeof step === 'string'">{{ step }}</p>
        </li>
      </ol>
    </section>
    <section v-if="parseJson(item.materials).length" class="tutorial-section">
      <h2 class="block-title">所需材料</h2>
      <ul class="material-list">
        <li v-for="(m, i) in parseJson(item.materials)" :key="i">{{ typeof m === 'string' ? m : m.name || JSON.stringify(m) }}</li>
      </ul>
    </section>
    <section v-if="item.result" class="tutorial-section">
      <h2 class="block-title">预期结果</h2>
      <div class="content" v-html="item.result"></div>
    </section>
  </article>
  <div v-else class="container section empty">教程不存在</div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const item = ref<any>(null)
try {
  item.value = await api.detail('tutorials', route.params.slug as string)
} catch (e) { item.value = null }

await useSite()
useSeo({ title: item.value?.title, description: item.value?.description, image: item.value?.coverImage?.url })

function difficultyText(d: string) { return { beginner: '入门', intermediate: '中级', advanced: '高级' }[d] || d }
function parseJson(v: any) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const r = JSON.parse(v); return Array.isArray(r) ? r : [] } catch (e) { return [] }
}
</script>

<style scoped>
.breadcrumb { font-size: 13px; color: var(--color-text-light); margin-bottom: 16px; }
.tutorial-title { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
.tutorial-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; }
.badge { padding: 4px 12px; border-radius: 4px; font-size: 13px; }
.difficulty-beginner { background: #e8f5e9; color: #07c160; }
.difficulty-intermediate { background: #fff3e0; color: #faad14; }
.difficulty-advanced { background: #ffebee; color: #f44336; }
.tutorial-cover { width: 100%; border-radius: 8px; margin-bottom: 24px; }
.tutorial-desc { font-size: 16px; color: var(--color-text-light); margin-bottom: 32px; }
.tutorial-section { margin-bottom: 40px; }
.block-title { font-size: 22px; font-weight: 600; margin-bottom: 16px; border-left: 4px solid var(--color-primary); padding-left: 12px; }
.steps-list { padding-left: 0; list-style: none; }
.step-item { padding: 16px; background: var(--color-bg-alt); border-radius: 8px; margin-bottom: 12px; }
.step-item h4 { font-size: 16px; margin-bottom: 8px; }
.material-list { padding-left: 20px; }
.material-list li { margin-bottom: 8px; }
.empty { text-align: center; padding: 80px 0; }
</style>
```

- [ ] **Step 8: Commit**

```powershell
cd e:\code\dsite; git add pages; git commit -m "feat(dsite): 产品/案例/FAQ/教程 页面"
```

---

### Task 7: 合规 + 下载 + 关于 + 联系页面

**Files:**
- Create: `e:\code\dsite\pages\compliance\index.vue`
- Create: `e:\code\dsite\pages\compliance\[slug].vue`
- Create: `e:\code\dsite\pages\downloads\index.vue`
- Create: `e:\code\dsite\pages\about.vue`
- Create: `e:\code\dsite\pages\contact.vue`

- [ ] **Step 1: 创建 pages/compliance/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">合规公示</h1>
    <div class="filter-bar">
      <button v-for="c in categories" :key="c.value" :class="['filter-btn', { active: activeCategory === c.value }]" @click="filterCategory(c.value)">{{ c.label }}</button>
    </div>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length" class="compliance-list">
      <NuxtLink v-for="item in list" :key="item.documentId || item.id" :to="`/compliance/${item.slug}`" class="compliance-item">
        <span class="compliance-cat">{{ categoryText(item.category) }}</span>
        <span class="compliance-title">{{ item.title }}</span>
        <span v-if="item.effectiveDate" class="compliance-date">{{ formatDate(item.effectiveDate) }}</span>
        <span v-if="item.isPinned" class="pinned">置顶</span>
      </NuxtLink>
    </div>
    <div v-else class="empty">暂无合规信息</div>
  </div>
</template>

<script setup>
const api = useApi()
const list = ref<any[]>([])
const pending = ref(false)
const activeCategory = ref('')
const categories = [
  { value: '', label: '全部' },
  { value: 'notice', label: '公告' },
  { value: 'policy', label: '政策' },
  { value: 'report', label: '报告' },
  { value: 'certificate', label: '证书' },
  { value: 'agreement', label: '协议' },
]

async function reload() {
  pending.value = true
  try {
    let res
    if (activeCategory.value) {
      res = await api.complianceByCategory(activeCategory.value, { 'pagination[pageSize]': 50 })
    } else {
      res = await api.list('compliance', { 'pagination[pageSize]': 50 })
    }
    list.value = res?.list || []
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

function filterCategory(c: string) { activeCategory.value = c; reload() }
function categoryText(c: string) { return categories.find(x => x.value === c)?.label || c }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

await useSite()
useSeo({ title: '合规公示' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
.filter-btn { padding: 8px 20px; background: #fff; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; font-size: 14px; }
.filter-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.compliance-list { display: flex; flex-direction: column; gap: 12px; }
.compliance-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: #fff; border: 1px solid var(--color-border); border-radius: 8px; }
.compliance-cat { padding: 2px 10px; background: var(--color-bg-alt); color: var(--color-primary); font-size: 12px; border-radius: 4px; }
.compliance-title { flex: 1; font-size: 16px; color: var(--color-text); }
.compliance-date { font-size: 13px; color: #999; }
.pinned { padding: 2px 8px; background: var(--color-primary); color: #fff; font-size: 12px; border-radius: 4px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 2: 创建 pages/compliance/[slug].vue**

```vue
<template>
  <article class="container section compliance-detail" v-if="item">
    <nav class="breadcrumb"><NuxtLink to="/compliance">合规</NuxtLink> / {{ item.title }}</nav>
    <h1 class="compliance-title">{{ item.title }}</h1>
    <div class="compliance-meta">
      <span class="badge">{{ categoryText(item.category) }}</span>
      <span v-if="item.effectiveDate">生效日期：{{ formatDate(item.effectiveDate) }}</span>
      <span v-if="item.expiryDate">有效期至：{{ formatDate(item.expiryDate) }}</span>
    </div>
    <div class="compliance-content" v-html="item.content"></div>
  </article>
  <div v-else class="container section empty">合规信息不存在</div>
</template>

<script setup>
const api = useApi()
const route = useRoute()
const item = ref<any>(null)
try {
  item.value = await api.detail('compliance', route.params.slug as string)
} catch (e) { item.value = null }

await useSite()
useSeo({ title: item.value?.title, description: item.value?.seoDescription })

const categoryMap: Record<string, string> = { notice: '公告', policy: '政策', report: '报告', certificate: '证书', agreement: '协议' }
function categoryText(c: string) { return categoryMap[c] || c }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }
</script>

<style scoped>
.breadcrumb { font-size: 13px; color: var(--color-text-light); margin-bottom: 16px; }
.compliance-title { font-size: 32px; font-weight: 700; margin-bottom: 16px; }
.compliance-meta { display: flex; gap: 24px; align-items: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); font-size: 14px; color: var(--color-text-light); }
.badge { padding: 4px 12px; background: var(--color-bg-alt); color: var(--color-primary); border-radius: 4px; }
.compliance-content { font-size: 16px; line-height: 1.8; }
.compliance-content :deep(p) { margin-bottom: 16px; }
.empty { text-align: center; padding: 80px 0; }
</style>
```

- [ ] **Step 3: 创建 pages/downloads/index.vue**

```vue
<template>
  <div class="container section">
    <h1 class="page-title">下载中心</h1>
    <PageLoading v-if="pending" />
    <div v-else-if="list.length">
      <DownloadItem v-for="item in list" :key="item.documentId || item.id" :item="item" @download="handleDownload" />
    </div>
    <div v-else class="empty">暂无下载资源</div>
    <Pagination :page="page" :total-pages="totalPages" @change="reload" />
  </div>
</template>

<script setup>
const api = useApi()
const page = ref(1)
const pageSize = 20
const list = ref<any[]>([])
const total = ref(0)
const pending = ref(false)
const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function reload(p = 1) {
  pending.value = true
  page.value = p
  try {
    const res = await api.list('downloads', { 'pagination[page]': p, 'pagination[pageSize]': pageSize })
    list.value = res?.list || []
    total.value = res?.pagination?.total || 0
  } catch (e) { list.value = [] }
  finally { pending.value = false }
}

async function handleDownload(item: any) {
  try {
    const res = await api.downloadFile(item.slug)
    if (res?.url) {
      window.open(res.url, '_blank')
      uni?.showToast?.({ title: '开始下载', icon: 'success' })
    }
  } catch (e: any) {
    const msg = e?.statusCode === 403 ? '此资源需要先填写表单' : '下载失败'
    alert(msg)
    if (e?.statusCode === 403) {
      navigateTo('/contact')
    }
  }
}

await useSite()
useSeo({ title: '下载中心' })
await reload()
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 24px; }
.empty { text-align: center; padding: 80px 0; color: var(--color-text-light); }
</style>
```

- [ ] **Step 4: 创建 pages/about.vue**

```vue
<template>
  <div class="container section about-page">
    <h1 class="page-title">关于我们</h1>
    <div class="about-content">
      <img v-if="site?.logo?.url" :src="site.logo.url" :alt="site?.siteName" class="about-logo" />
      <h2 class="about-name">{{ site?.siteName || '企业官网' }}</h2>
      <p class="about-desc">{{ site?.siteDescription || '' }}</p>
      <div v-if="site?.customerServiceUrl" class="about-contact">
        <a :href="site.customerServiceUrl" class="btn" target="_blank">在线客服</a>
      </div>
    </div>
  </div>
</template>

<script setup>
const site = await useSite()
useSeo({ title: '关于我们' })
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 40px; }
.about-content { max-width: 800px; margin: 0 auto; text-align: center; }
.about-logo { height: 80px; margin-bottom: 24px; }
.about-name { font-size: 28px; font-weight: 700; margin-bottom: 16px; }
.about-desc { font-size: 16px; color: var(--color-text-light); line-height: 1.8; margin-bottom: 32px; }
</style>
```

- [ ] **Step 5: 创建 pages/contact.vue（含留资表单）**

```vue
<template>
  <div class="container section contact-page">
    <h1 class="page-title">联系我们</h1>
    <div class="contact-wrap">
      <div class="contact-info">
        <h2 class="block-title">{{ site?.siteName || '企业官网' }}</h2>
        <p v-if="site?.siteDescription" class="info-desc">{{ site.siteDescription }}</p>
        <div v-if="site?.customerServiceUrl" class="info-item">
          <a :href="site.customerServiceUrl" target="_blank">在线客服</a>
        </div>
      </div>
      <form class="contact-form" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label>姓名 *</label>
          <input v-model="form.name" required placeholder="您的姓名" />
        </div>
        <div class="form-item">
          <label>手机 *</label>
          <input v-model="form.phone" required placeholder="手机号码" />
        </div>
        <div class="form-item">
          <label>邮箱</label>
          <input v-model="form.email" type="email" placeholder="电子邮箱" />
        </div>
        <div class="form-item">
          <label>公司</label>
          <input v-model="form.company" placeholder="公司名称" />
        </div>
        <div class="form-item">
          <label>留言 *</label>
          <textarea v-model="form.message" required placeholder="请描述您的需求" rows="4"></textarea>
        </div>
        <input v-model="form.website" type="text" class="honeypot" tabindex="-1" autocomplete="off" />
        <button type="submit" class="btn" :disabled="submitting">{{ submitting ? '提交中...' : '提交' }}</button>
        <p v-if="submitted" class="success-msg">感谢留言，我们将尽快与您联系！</p>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
const api = useApi()
const site = await useSite()
useSeo({ title: '联系我们' })

const form = ref({ name: '', phone: '', email: '', company: '', message: '', website: '' })
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    await api.submitLead({
      name: form.value.name,
      phone: form.value.phone,
      email: form.value.email,
      company: form.value.company,
      message: form.value.message,
      website: form.value.website, // honeypot
    })
    submitted.value = true
    form.value = { name: '', phone: '', email: '', company: '', message: '', website: '' }
  } catch (e: any) {
    errorMsg.value = '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 40px; }
.contact-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; max-width: 1000px; margin: 0 auto; }
.block-title { font-size: 22px; font-weight: 600; margin-bottom: 16px; }
.info-desc { color: var(--color-text-light); line-height: 1.8; margin-bottom: 24px; }
.contact-form { display: flex; flex-direction: column; gap: 16px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item label { font-size: 14px; color: var(--color-text-light); }
.form-item input, .form-item textarea { padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 15px; font-family: inherit; }
.honeypot { position: absolute; left: -9999px; }
.success-msg { color: #07c160; font-size: 14px; }
.error-msg { color: #f44336; font-size: 14px; }
@media (max-width: 768px) { .contact-wrap { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 6: 验证全站可访问**

Run（确保 Strapi 运行 + dsite dev）：
```powershell
npm run dev
```
逐一访问：/ /articles /products /cases /faqs /tutorials /compliance /downloads /about /contact，确认页面渲染、API 调用正常。

- [ ] **Step 7: Commit**

```powershell
cd e:\code\dsite; git add pages; git commit -m "feat(dsite): 合规/下载/关于/联系 页面 + 留资表单"
```

---

## Self-Review

**1. Spec coverage:**
- §1 核心目标 → Task 1-7 覆盖 7 CT + 首页 + about/contact ✓
- §2 技术栈 → Task 1 nuxt.config + 原生 CSS ✓
- §3 架构概览 → Task 1 devProxy + Task 2 composables ✓
- §4 页面结构（16 路由）→ Task 5-7 全部覆盖 ✓
- §5 模板系统（渐进式 A + 预留 B）→ Task 3 layouts/default + templates/default + Task 2 useTemplate ✓
- §6 数据流 → Task 2 useApi/useSite/useSeo + Task 1 site-info 端点 ✓
- §7 留资与互动 → Task 7 contact 表单 + Task 7 download handleDownload ✓
- §8 本地开发 → Task 1 devProxy ✓
- §9 风险点（site-info 缺失）→ Task 1 Step 8-10 新增端点 ✓

**2. Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码 ✓

**3. Type consistency:**
- useApi 返回方法名（list/detail/articlesFeatured 等）在各页面调用一致 ✓
- useSite 返回 ref，各组件用 useState('site') 一致 ✓
- API 响应结构 res.list / res.pagination 在 list 页面一致 ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-dsite-nuxt3-website.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查，快速迭代

**2. Inline Execution** - 当前会话内执行，批量执行 + 检查点审查

Which approach?
