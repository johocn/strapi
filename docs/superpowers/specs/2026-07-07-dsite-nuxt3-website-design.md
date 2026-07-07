# dsite (Nuxt3) 官网前端设计

## 1. 核心目标

构建面向 C 端的企业官网前端，消费 zhao-website 插件公开 API，覆盖 7 个内容类型（article/product/case/faq/tutorial/compliance/download）的列表与详情页，支持多租户同域识别、SEO 优化、留资转化，并通过模板系统支持整站级布局重组。

## 2. 技术栈

- **框架**：Nuxt 3（SSR + 混合渲染，nitro prerender 静态页）
- **样式**：原生 CSS + CSS 变量（主题切换），不引入 UI 库避免包体膨胀
- **HTTP**：$fetch + useFetch（内置 SSR 友好）
- **SEO**：useSeoMeta + useHead + sitemap 反代
- **状态**：useState（SSR 友好的轻量状态），不引入 Pinia
- **部署**：Node 运行时（SSR），与 Strapi 同域反代

## 3. 架构概览

```
浏览器 → Nginx → ┬─ /api/* → Strapi (basic, port 1337)
                 └─ /*      → dsite Nuxt SSR (port 3000)
```

- **站点识别**：Strapi 的 site-resolver 中间件靠 host 自动注入 ctx.state.siteId，dsite 无需传 siteId
- **API 调用**：dsite 运行时通过 $fetch 调用 `/api/zhao-website/v1/*`，同域相对路径，无 CORS
- **模板选择**：启动时拉取当前 site 的 template.name，映射到 dsite 内置布局

## 4. 页面结构

### 4.1 路由设计

| 路径 | 页面 | 数据源 | 渲染 |
|---|---|---|---|
| `/` | 首页 | 聚合（精选文章 + 精选产品 + 精选案例） | SSR |
| `/articles` | 文章列表 | GET /articles | SSR |
| `/articles/:slug` | 文章详情 | GET /articles/:slug + related | SSR |
| `/articles/category/:slug` | 分类文章 | GET /articles/category/:slug | SSR |
| `/products` | 产品列表 | GET /products | SSR |
| `/products/:slug` | 产品详情 | GET /products/:slug | SSR |
| `/cases` | 案例列表 | GET /cases | SSR |
| `/cases/:slug` | 案例详情 | GET /cases/:slug | SSR |
| `/faqs` | FAQ 列表 | GET /faqs | SSR |
| `/tutorials` | 教程列表 | GET /tutorials | SSR |
| `/tutorials/:slug` | 教程详情 | GET /tutorials/:slug | SSR |
| `/compliance` | 合规列表 | GET /compliance | SSR |
| `/compliance/:slug` | 合规详情 | GET /compliance/:slug | SSR |
| `/downloads` | 下载列表 | GET /downloads | SSR |
| `/about` | 关于我们 | site-config 静态信息 | prerender |
| `/contact` | 联系我们 | 留资表单 + site-config | prerender + CSR 提交 |

### 4.2 页面布局分区

所有页面共享 Layout：

```
Header (logo + nav + channel switcher?)
├─ Hero/Section (页面特定)
├─ Main Content
└─ Footer (site-config + compliance links + ICP)
```

模板系统通过重组 section 顺序/显隐实现差异化，组件库共用。

## 5. 模板系统设计

### 5.1 设计决策

- **调整时机**：渐进式。首期路径 A（代码层多套组件，开发期调整 + 重新部署），架构上预留路径 B（配置驱动，运营期调整）的扩展点
- **调整粒度**：Section 级。不同模板可重组 section 顺序、显隐、栅格布局；section 内部的 content 组件结构固定
- **首期交付**：仅 default 模板，但目录结构与扩展点齐全

### 5.2 核心机制

- **模板标识**：site-config.template.name（如 "default"）
- **映射方式**：dsite 启动时通过 middleware 拉取 site-config（含 template 关系），存入 useState('site')
- **布局选择**：layouts/default.vue 根据 site.template.name 动态选择 layouts/templates/<name>.vue
- **Section 重组**：layouts/templates/<name>.vue 内自由编排 components/sections/* 的顺序、显隐、栅格
- **组件复用**：components/sections/* 和 components/content/* 跨模板共享，section 内部结构固定

### 5.3 文件结构（渐进式 A + 预留 B）

```
dsite/
├─ layouts/
│   ├─ default.vue              # 入口，根据 template.name 切换
│   └─ templates/
│       ├─ default.vue          # 默认模板布局（编排 sections）
│       └─ (minimal.vue)       # 未来扩展模板（不同 section 编排）
├─ components/
│   ├─ common/                  # 跨模板共享（Header/Footer/Pagination等）
│   ├─ sections/                # 可重组的区块（HeroSection/FeaturedProducts等）
│   │   └─ *.vue               # section 内部结构固定，对外暴露 props
│   ├─ content/                 # CT 特定组件（ArticleCard/ProductDetail等）
│   │   └─ *.vue               # 组件内部元素结构固定，样式靠 CSS 变量
│   └─ (templates/)            # 预留：未来路径 B 的模板特定组件
├─ pages/                       # 路由页面（数据获取 + 组件组合）
├─ composables/                 # useApi/useSite/useSeo/useTemplate
├─ assets/css/
│   ├─ main.css                 # 全局样式 + CSS 变量
│   └─ themes/
│       └─ default.css          # 模板主题变量
└─ nuxt.config.ts
```

### 5.4 路径 A：代码层多套模板（首期实现）

不同模板在 `layouts/templates/<name>.vue` 中编排 sections：

```vue
<!-- layouts/templates/default.vue -->
<template>
  <AppHeader />
  <main>
    <HeroSection :data="hero" />
    <FeaturedProducts :products="featured.products" />
    <FeaturedArticles :articles="featured.articles" />
    <FeaturedCases :cases="featured.cases" />
  </main>
  <AppFooter />
</template>
```

```vue
<!-- layouts/templates/minimal.vue（未来扩展） -->
<template>
  <AppHeader />
  <main>
    <FeaturedArticles :articles="featured.articles" />
    <HeroSection :data="hero" />  <!-- 顺序不同 -->
    <!-- FeaturedProducts 隐藏 -->
  </main>
  <AppFooter />
</template>
```

### 5.5 路径 B：配置驱动扩展点（预留，首期不实现）

为未来"运营期配置"预留的架构扩展点：

1. **themeConfig 字段已存在**：site-template.themeConfig（json）可存储 section 编排描述
2. **useTemplate composable 预留**：首期返回硬编码 default 布局，未来可读取 themeConfig 动态渲染
3. **section 组件契约**：所有 section 对外暴露标准化 props（data/title/visible 等），为配置驱动做准备
4. **升级路径**：未来实现 DynamicSectionRenderer 组件，根据 JSON 配置渲染 section 列表

```ts
// composables/useTemplate.ts（首期简化版）
export function useTemplate() {
  const site = useSite()
  const templateName = computed(() => site.value?.template?.name || 'default')
  // 首期：返回模板名，layouts/default.vue 用 v-if 切换
  // 未来：返回 themeConfig 描述的 section 列表，动态渲染
  return { templateName }
}
```

### 5.6 主题变量

```css
:root {
  --color-primary: #ff0000;
  --color-text: #333;
  --color-bg: #fff;
  --spacing-section: 80px;
  --font-size-base: 16px;
}
```

模板可通过覆盖这些变量实现配色切换（assets/css/themes/<name>.css），通过重组 sections 实现布局差异化。

## 6. 数据流

### 6.1 API 封装

```ts
// composables/useApi.ts
export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase // '/api/zhao-website/v1'
  return {
    list: (resource, params) => $fetch(`${base}/${resource}`, { params }),
    detail: (resource, slug) => $fetch(`${base}/${resource}/${slug}`),
    // ...
  }
}
```

### 6.2 站点信息

```ts
// composables/useSite.ts
export async function useSite() {
  const site = useState('site', () => null)
  if (!site.value) {
    site.value = await $fetch('/api/zhao-website/v1/site-info')
  }
  return site
}
```

- 需在 zhao-website 补充 `/site-info` 公开端点（返回 site-config + template + seo-config）
- 或复用现有 manifest.json 端点

### 6.3 SEO

- 每个页面 useSeoMeta 注入 title/description/og
- sitemap.xml / robots.txt / llms.txt 直接反代到 Strapi（nuxt route rules）
- 详情页注入 JSON-LD（structuredData 字段）

## 7. 留资与互动

### 7.1 留资表单

- `/contact` 页面 + 产品详情页侧边 CTA
- POST /leads/submit，含 honeypot 字段反爬
- 提交成功显示致谢，失败提示

### 7.2 互动追踪

- 文章/教程详情页的点赞、收藏按钮
- POST /interactions/track，visitorId 用 localStorage 生成
- download 链接触发 +1 downloadCount（requireLead 时引导留资）

## 8. 本地开发

### 8.1 同域模拟

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: { apiBase: '/api/zhao-website/v1' }
  },
  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:1337/api', changeOrigin: true }
    }
  }
})
```

- dsite 跑 localhost:3000
- /api/* 代理到 Strapi localhost:1337
- site-resolver 靠 host（localhost）识别，需在 site-config 表配置 localhost 域名

### 8.2 Strapi 侧准备

- 确认 site-config 表有 localhost 记录（domain: localhost）
- 确认 site-template 表有 default 记录（name: default, enabled: true, isDefault: true）
- 确认 zhao-website 公开 API 可访问

## 9. 风险点

1. **site-info 端点缺失**：zhao-website 未暴露聚合 site-config + template 的公开端点，需新增或复用 manifest.json
2. **localhost 多租户**：本地开发时 host=localhost 只能绑定一个 site，多租户测试需用 ?domain= 参数或配置多域名
3. **模板字段语义偏差**：后端 site-template 偏管理配置（presetConfig/fieldConstraints），dsite 需的 name 作为渲染模板标识，需约定取值范围
4. **SEO prerender 与动态内容**：静态页 prerender 时无法获取 site 信息，需在构建时注入或降级为 SSR

## 10. 文件清单

### 首期交付（单模板 default）

| 文件 | 职责 |
|---|---|
| nuxt.config.ts | 配置（runtime/devProxy/SEO） |
| app.vue | 根组件 |
| layouts/default.vue | 模板入口 |
| layouts/templates/default.vue | 默认模板布局 |
| components/common/AppHeader.vue | 顶部导航 |
| components/common/AppFooter.vue | 底部信息 |
| components/common/Pagination.vue | 分页 |
| components/common/PageLoading.vue | 加载状态 |
| components/sections/HeroSection.vue | 首页主视觉 |
| components/sections/FeaturedProducts.vue | 精选产品 |
| components/sections/FeaturedArticles.vue | 精选文章 |
| components/sections/FeaturedCases.vue | 精选案例 |
| components/content/ArticleCard.vue | 文章卡片 |
| components/content/ProductCard.vue | 产品卡片 |
| components/content/CaseCard.vue | 案例卡片 |
| components/content/TutorialCard.vue | 教程卡片 |
| components/content/FaqItem.vue | FAQ 项 |
| components/content/DownloadItem.vue | 下载项 |
| pages/index.vue | 首页 |
| pages/articles/index.vue | 文章列表 |
| pages/articles/[slug].vue | 文章详情 |
| pages/articles/category/[slug].vue | 分类文章 |
| pages/products/index.vue | 产品列表 |
| pages/products/[slug].vue | 产品详情 |
| pages/cases/index.vue | 案例列表 |
| pages/cases/[slug].vue | 案例详情 |
| pages/faqs/index.vue | FAQ 列表 |
| pages/tutorials/index.vue | 教程列表 |
| pages/tutorials/[slug].vue | 教程详情 |
| pages/compliance/index.vue | 合规列表 |
| pages/compliance/[slug].vue | 合规详情 |
| pages/downloads/index.vue | 下载列表 |
| pages/about.vue | 关于 |
| pages/contact.vue | 联系 |
| composables/useApi.ts | API 封装 |
| composables/useSite.ts | 站点信息 |
| composables/useSeo.ts | SEO 辅助 |
| composables/useTemplate.ts | 模板选择（首期返回 templateName，预留配置驱动） |
| assets/css/main.css | 全局样式 |
| assets/css/themes/default.css | 默认主题 |
| package.json | 依赖 |

## 11. 不在首期范围

- 多模板实现（仅预留架构）
- 多语言 i18n
- 用户登录态（SSO 对接）
- 搜索功能（全文检索）
- PWA 离线
- 评论系统
