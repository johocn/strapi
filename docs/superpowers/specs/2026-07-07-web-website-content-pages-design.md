# web（uni-app）官网内容管理增量改造设计

> 日期：2026-07-07
> 范围：在现有 web/ uni-app 项目中新增 6 个内容 CT（product/case/faq/tutorial/compliance/download）的 list + edit 页面，与现有 article 模板融合。

## 1. 背景与定位

### 1.1 现状
- `web/` 是 uni-app 项目，已有 90+ 页面，website 模块已有 3 页面（article/list, article/edit, lead/list）
- `web/src/api/website.js` 的 `createContentApi(resource)` 已封装 6 个 CT 的完整 CRUD（list/detail/create/update/delete/publish/archive）
- `pages.json` 已注册 website 命名空间
- zhao-website Admin UI（Strapi 后台）已覆盖 kg/first-truth/ai-summaries/stats 等特殊管理页面，uni-app 中不重复实现

### 1.2 定位
**只做 6 个内容 CT 的 list + edit 页面**，复用 article 模板模式 + 差异点适配。不重复造 Strapi Admin UI 已覆盖的功能。

## 2. 技术栈

- uni-app + Vue 3（与现有 web/ 项目一致）
- 复用现有组件：PageHeader / RichEditor / TagPicker / MediaPicker
- 复用 `src/api/website.js` 的 `createContentApi(resource)` 返回的 API
- 复用 `src/utils/request.js` 的 token 注入 + x-site-id 注入
- 复用 `hasPermission` 权限检查

## 3. 6 个 CT 的字段差异

### 3.1 product（产品/方案）
- 主字段：`name`（非 title）
- slug targetField：name
- 特有字段：tagline, description, content, coverImage, images[], features(json), specifications(json), scenarios(json), priceRange, priceUnit, isFeatured
- 关系：category(article-category manyToOne), tags(tag manyToMany)

### 3.2 case（落地案例）
- 主字段：`title`
- 特有字段：clientName(必填), clientLogo, clientIndustry, clientDescription, challenge(必填), solution(必填), results(json 必填), testimonial, testimonialAuthor, testimonialTitle, coverImage, images[]
- 关系：tags, relatedProducts(product manyToMany)

### 3.3 faq（常见问答）
- 主字段：`question`（非 title，text 类型）
- slug targetField：question
- 特有字段：answer(text 必填), order, isFeatured
- 关系：category, tags
- 无 coverImage

### 3.4 tutorial（教程/操作指南）
- 主字段：`title`
- 特有字段：description, coverImage, steps(json 必填), materials(json), estimatedTime, difficulty(beginner/intermediate/advanced), result
- 关系：category, tags

### 3.5 compliance（合规公示）
- 主字段：`title`
- 特有字段：category(notice/policy/report/certificate/agreement 必填), content(text 必填), effectiveDate(date), expiryDate(date), isPinned
- 关系：tags
- 无 coverImage

### 3.6 download（下载文件管理）
- 主字段：`name`（非 title）
- 特有字段：description, file(media 必填), fileType(whitepaper/brochure/datasheet/template/guide/certificate/other), fileSize, requireLead(boolean default true), downloadCount, order
- 关系：category, tags
- 无 slug 字段（与 article 不同，无需 slug 输入）

## 4. 页面设计

### 4.1 通用 list 页面结构（6 个 CT 共用模式）
```
PageHeader（标题 + 新增按钮）
├── 搜索区（关键词输入 + 状态筛选 picker）
├── 列表区（卡片列表，每卡片显示主字段 + 元信息 + 状态 + 操作按钮）
│   └── 操作：发布/下架/编辑/删除（按权限显示）
├── loading 状态
├── 空状态
└── 分页（loadMore 或简单分页）
```

### 4.2 通用 edit 页面结构
```
PageHeader（标题：新增/编辑 + 保存按钮）
├── 基本信息区
│   ├── 主字段输入（name/title/question）
│   ├── slug 输入（download 无）
│   └── 分类选择（category picker，compliance 用枚举）
├── 内容区
│   ├── 富文本编辑（RichEditor，faq 用 question+answer 两个 textarea）
│   ├── 特有字段输入（如 product 的 features/specifications 用 json 编辑器）
│   └── 媒体选择（coverImage/images/file 用 MediaPicker）
├── 标签区（TagPicker）
├── SEO 区（seoTitle/seoDescription，部分 CT 有）
├── 状态区（status picker + isFeatured switch）
└── 底部操作（保存草稿 / 发布）
```

### 4.3 各 CT 的 list 页面差异

| CT | 卡片主字段 | 卡片元信息 | 搜索字段 |
|---|---|---|---|
| product | name | tagline, priceRange, category | name |
| case | title | clientName, clientIndustry | title, clientName |
| faq | question（截断 80 字） | category, order | question |
| tutorial | title | difficulty, estimatedTime, category | title |
| compliance | title | category(枚举显示), effectiveDate | title |
| download | name | fileType, fileSize, downloadCount | name |

### 4.4 各 CT 的 edit 页面差异

| CT | 主字段 | 富文本字段 | 媒体字段 | 特有字段表单 |
|---|---|---|---|---|
| product | name | description, content | coverImage, images[] | tagline, priceRange, priceUnit, features(json), specifications(json), scenarios(json) |
| case | title | challenge, solution, clientDescription, testimonial | coverImage, images[], clientLogo | clientName, clientIndustry, results(json), testimonialAuthor, testimonialTitle |
| faq | question | answer | 无 | order, isFeatured |
| tutorial | title | description, result | coverImage | steps(json), materials(json), estimatedTime, difficulty(枚举) |
| compliance | title | content | 无 | category(枚举), effectiveDate, expiryDate, isPinned |
| download | name | description | file(必填) | fileType(枚举), requireLead(switch), order |

## 5. 文件结构

```
web/
├── pages.json                                    # 修改：新增 12 条路由
├── src/
│   └── api/
│       └── website.js                            # 不变（createContentApi 已封装）
└── pages/
    └── website/
        ├── product/
        │   ├── list.vue                          # 新建
        │   └── edit.vue                          # 新建
        ├── case/
        │   ├── list.vue                          # 新建
        │   └── edit.vue                          # 新建
        ├── faq/
        │   ├── list.vue                          # 新建
        │   └── edit.vue                          # 新建
        ├── tutorial/
        │   ├── list.vue                          # 新建
        │   └── edit.vue                          # 新建
        ├── compliance/
        │   ├── list.vue                          # 新建
        │   └── edit.vue                          # 新建
        └── download/
            ├── list.vue                          # 新建
            └── edit.vue                          # 新建
```

共 12 个新建 .vue 文件 + 1 个 pages.json 修改。

## 6. pages.json 新增路由

```json
{ "path": "pages/website/product/list", "style": { "navigationBarTitleText": "产品方案" } },
{ "path": "pages/website/product/edit", "style": { "navigationBarTitleText": "产品编辑" } },
{ "path": "pages/website/case/list", "style": { "navigationBarTitleText": "落地案例" } },
{ "path": "pages/website/case/edit", "style": { "navigationBarTitleText": "案例编辑" } },
{ "path": "pages/website/faq/list", "style": { "navigationBarTitleText": "常见问答" } },
{ "path": "pages/website/faq/edit", "style": { "navigationBarTitleText": "问答编辑" } },
{ "path": "pages/website/tutorial/list", "style": { "navigationBarTitleText": "教程指南" } },
{ "path": "pages/website/tutorial/edit", "style": { "navigationBarTitleText": "教程编辑" } },
{ "path": "pages/website/compliance/list", "style": { "navigationBarTitleText": "合规公示" } },
{ "path": "pages/website/compliance/edit", "style": { "navigationBarTitleText": "合规编辑" } },
{ "path": "pages/website/download/list", "style": { "navigationBarTitleText": "下载管理" } },
{ "path": "pages/website/download/edit", "style": { "navigationBarTitleText": "下载编辑" } }
```

## 7. API 调用约定

所有 6 个 CT 复用 `createContentApi(resource)` 返回的 API：

```js
import { productApi, caseApi, faqApi, tutorialApi, complianceApi, downloadApi } from '../../src/api/website.js'

// list 页面
const res = await productApi.list({ page: 1, pageSize: 20, status: 'published' })

// edit 页面
const detail = await productApi.detail(documentId)
await productApi.create({ data: { name, slug, ... } })
await productApi.update(documentId, { data: { name, slug, ... } })
await productApi.publish(documentId)
await productApi.archive(documentId)
```

## 8. 权限约定

各 CT 的权限 key 与 article 模式一致：
- `{ct}.create` / `{ct}.update` / `{ct}.publish` / `{ct}.delete`
- 通过 `hasPermission('product.create')` 等检查

## 9. 不做的事

- 不在 uni-app 中实现 kg/first-truth/ai-summaries/stats/studio-bridge/seo-config（Strapi Admin UI 已覆盖）
- 不做 C 端官网渲染（dsite Nuxt3 项目）
- 不修改现有 article/lead 页面
- 不修改 `src/api/website.js`（已封装完毕）
- 不新增组件（复用 PageHeader/RichEditor/TagPicker/MediaPicker）

## 10. 风险点

1. **json 字段编辑**：product 的 features/specifications/scenarios、case 的 results、tutorial 的 steps/materials 需要简洁的 json 编辑 UI。方案：用 textarea + JSON.parse 校验，不引入代码编辑器组件。
2. **download 的 file 必填**：edit 页面需强制校验 file 字段已选择才允许保存。
3. **compliance 的 category 枚举**：与 article-category 关系不同，是字段级枚举，UI 用 picker 选择 5 个固定值。
4. **faq 无 coverImage**：edit 页面不显示媒体选择区。
5. **list 页面分页**：uni-app 的 onReachBottom 或手动 loadMore 按钮，参考 article/list 现有模式。

## 11. 验收标准

1. `pages.json` 新增 12 条路由，无 JSON 语法错误
2. 12 个 .vue 文件均可在 uni-app 开发模式下访问，无白屏
3. 各 list 页面可加载数据（空列表也行）
4. 各 edit 页面表单可提交（即使后端返回验证错误也能正常发起请求）
5. 各 CT 的特有字段正确显示在 edit 页面
6. 权限按钮按 `hasPermission` 结果显示/隐藏
7. 现有 article/lead 页面不受影响
