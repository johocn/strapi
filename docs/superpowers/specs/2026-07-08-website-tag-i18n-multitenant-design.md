# 官网标签 CRUD 重设计 + i18n + 多租户隔离 + JSON 示例填充

> **日期：** 2026-07-08
> **状态：** 设计已确认，待编写实施计划
> **关联：** zhao-tag 插件、zhao-website 插件、web 前端

---

## 1. 背景与目标

### 1.1 现状

- 7 个 zhao-website CT（article/product/case/faq/tutorial/compliance/download）已通过 `manyToMany → plugin::zhao-tag.tag` 关联标签
- zhao-tag 插件有 4 个 CT：tag / tag-group / tag-index / knowledge-point，能力丰富但未被充分复用
- zhao-tag 与 zhao-website 所有 CT **均未启用 i18n**
- tag 表无 site 关联，所有租户共用一份标签池
- article 已有 15 个 SEO 字段（seoTitle/seoDescription/seoKeywords 等），但 seoKeywords 与 tags.slug 割裂

### 1.2 目标

1. **zhao-tag 与官网 9 个 CT 启用 i18n**（当前仅 zh-CN locale，其他语言后续按需添加）
2. **tag/tag-group 加 site 关联 + isPublic 双字段**，实现公共/站点标签分级
3. **复用 tag-group 语义化分组**（如"解决方案/行业/产品线"）
4. **不新增 SEO 字段**，通过 tags.slug 自动生成 meta keywords
5. **前端 JSON 字段增加示例与一键填充按钮**

---

## 2. 架构总览

### 2.1 改动范围

| 层级 | 改动 |
|---|---|
| Strapi 配置 | 启用 i18n 插件 + 配置 zh-CN 默认 locale |
| zhao-tag schema | tag/tag-group 加 i18n + site 关联 + isPublic（tag-group 新增） |
| zhao-website schema | 9 个 CT 加 i18n（article/product/case/faq/tutorial/compliance/download/article-category/brand-info） |
| zhao-tag service | create/update 校验 isPublic + site 合法性 |
| zhao-tag controller | list 支持 siteId/isPublic 筛选 |
| zhao-website service | 7 CT populate tags.tagGroup |
| zhao-website controller | 7 CT list 支持 tagGroup 筛选 |
| web API | tag.js 新增 listBySite/listPublic |
| web 组件 | 新建 TagSelector.vue（分组选择器）+ JsonExampleBlock.vue（JSON 示例填充） |
| web 页面 | 7 CT edit.vue 集成 TagSelector + 7 CT list.vue 增加 tagGroup 筛选 + JSON 字段示例 |

### 2.2 多语言策略

- 启用 i18n 框架，仅配置 zh-CN 默认 locale
- tag/tag-group 核心字段（name/description/slug）localized
- 9 个 CT 的核心内容字段 localized（详见第 4 章）
- 其他 locale 后续按需添加，不影响当前中文版本运行

### 2.3 公共/站点标签策略

| isPublic | site | 类型 | 创建权限 |
|---|---|---|---|
| true | null | 公共标签 | 仅 admin |
| false | <某 site> | 站点标签 | admin + 站点管理员 |
| true | <某 site> | 非法组合 | 后端拒绝 |
| false | null | 非法组合 | 后端拒绝 |

### 2.4 SEO 与标签关系说明（向用户公开）

官网中心的内容支持两种 SEO 关键词来源：

1. **自动模式（推荐）**：从关联标签的 slug 自动生成 meta keywords
   - 渲染逻辑：`meta keywords = tags.map(t => t.slug).join(',')`
   - 适用：常规内容

2. **手动覆盖模式**：填写 seoKeywords 字段
   - 渲染逻辑：`meta keywords = seoKeywords || tags.map(t => t.slug).join(',')`
   - 适用：着陆页、营销活动页

**标签的 SEO 价值：**
- `tag.slug`：SEO 关键词载体，建议英文/拼音
- `tag-group`：语义化分组，用于 URL 结构与面包屑
- `tag.isPublic`：公共标签跨站复用，站点标签仅本站可见

---

## 3. zhao-tag schema 改动

### 3.1 tag schema

**文件：** `basic/plugins/zhao-tag/server/src/content-types/tag/schema.json`

**新增 pluginOptions：**
```json
"pluginOptions": {
  "i18n": { "localized": true }
}
```

**字段 localized 标记：**
- `name` / `slug` / `description` → localized
- `color` / `icon` / `tagGroup` / `parent` / `children` / `sort` / `isPreset` / `isPublic` / `indexes` / `deletedAt` → 不加

**新增 site 关联（在 isPublic 之后）：**
```json
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "inversedBy": "tags"
}
```

### 3.2 tag-group schema

**文件：** `basic/plugins/zhao-tag/server/src/content-types/tag-group/schema.json`

**新增 pluginOptions i18n**（同 tag）

**字段 localized 标记：**
- `name` / `slug` / `description` → localized
- `color` / `icon` / `sort` / `parent` / `children` / `tags` → 不加

**新增 isPublic + site 字段（保持与 tag 一致）：**
```json
"isPublic": { "type": "boolean", "default": true },
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "inversedBy": "tagGroups"
}
```

### 3.3 tag-index 与 knowledge-point 不动

- tag-index：多态索引，无需 i18n（索引不存内容），无需 site（通过 tag 间接关联）
- knowledge-point：独立知识点树，本次不改

---

## 4. zhao-website 9 个 CT schema 加 i18n

### 4.1 需要启用 i18n 的 CT（9 个）

| CT | localized 字段 |
|---|---|
| article | title/slug/excerpt/content/seoTitle/seoDescription/seoKeywords/canonicalUrl/ogTitle/ogDescription/schemaJson |
| product | name/slug/summary/description/features/specifications/seoTitle/seoDescription/seoKeywords |
| case | title/slug/clientName/summary/challenge/solution/result/testimonial/seoTitle/seoDescription/seoKeywords |
| faq | question/answer/seoTitle/seoDescription/seoKeywords |
| tutorial | title/slug/summary/content/steps/seoTitle/seoDescription/seoKeywords |
| compliance | title/slug/summary/content/issuingAuthority/seoTitle/seoDescription/seoKeywords |
| download | title/slug/description/seoTitle/seoDescription/seoKeywords |
| article-category | name/slug/description/seoTitle/seoDescription |
| brand-info | companyName/shortName/slogan/description/registeredAddress/officeAddress/businessScope |

**统一改动：** 每个 schema.json 顶层加 `pluginOptions: { i18n: { localized: true } }`

**site 字段：** 9 个 CT 均已存在（manyToOne/oneToOne → site-config, required: true），无需改动

### 4.2 不启用 i18n 的 CT（9 个）

| CT | 理由 |
|---|---|
| seo-config | 配置类，通过 defaultLocale/alternateLocales/hreflangStrategy 字段管理多语言策略 |
| knowledge-entity | schema.org 实体，跨语言通用 |
| knowledge-relation | 关系数据，无文本内容 |
| first-truth-policy | 策略配置，无用户可见文本 |
| ai-content-summary | AI 摘要，按 locale 生成独立记录 |
| lead | 线索数据，用户提交内容不翻译 |
| interaction | 互动记录，用户提交内容 |
| visit-log | 日志，无内容 |
| search-log | 日志，无内容 |

---

## 5. 前端 JSON 示例与填充按钮

### 5.1 适用 CT 与 JSON 字段

| CT | JSON 字段 | 用途 |
|---|---|---|
| article | schemaJson | 结构化数据（JSON-LD） |
| product | features, specifications | 产品特性/规格参数 |
| seo-config | sitemapExcludeTypes, alternateLocales, schemaSameAs, schemaContactPoint, extraConfig | 站点级配置 |
| brand-info | socialLinks | 社交链接 |
| tutorial | steps | 教程步骤 |
| knowledge-entity | sameAs, properties | schema.org 实体属性 |

### 5.2 示例 JSON 内容

**article.schemaJson：**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "image": ["https://example.com/photos/1x1/photo.jpg"],
  "datePublished": "2026-01-01",
  "dateModified": "2026-01-01",
  "author": { "@type": "Person", "name": "作者名" },
  "publisher": {
    "@type": "Organization",
    "name": "公司名",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.jpg" }
  },
  "description": "文章摘要"
}
```

**product.features：**
```json
[
  { "icon": "⚡", "title": "高性能", "description": "毫秒级响应" },
  { "icon": "🔒", "title": "安全可靠", "description": "金融级加密" },
  { "icon": "📱", "title": "多端适配", "description": "PC/移动/小程序" }
]
```

**product.specifications：**
```json
[
  { "label": "版本", "value": "企业版" },
  { "label": "授权方式", "value": "年付订阅" },
  { "label": "用户数", "value": "不限" },
  { "label": "存储空间", "value": "100GB" }
]
```

**seo-config.alternateLocales：**
```json
["en-US", "ja-JP", "ko-KR"]
```

**seo-config.schemaSameAs：**
```json
[
  "https://www.linkedin.com/company/your-company",
  "https://github.com/your-company",
  "https://www.youtube.com/@your-company",
  "https://weibo.com/your-company"
]
```

**seo-config.schemaContactPoint：**
```json
[
  {
    "@type": "ContactPoint",
    "telephone": "+86-400-xxx-xxxx",
    "contactType": "customer service",
    "areaServed": "CN",
    "availableLanguage": ["Chinese", "English"]
  }
]
```

**seo-config.sitemapExcludeTypes：**
```json
["visit-log", "search-log", "interaction"]
```

**seo-config.extraConfig：**
```json
{ "cacheTTL": 3600, "enableBrotli": true, "cdnPurgeOnPublish": true }
```

**brand-info.socialLinks：**
```json
{
  "wechat": { "qrcode": "https://example.com/wechat-qr.png", "accountId": "gh_xxxx" },
  "weibo": { "url": "https://weibo.com/your-company", "label": "官方微博" },
  "douyin": { "url": "https://douyin.com/user/your-company", "label": "抖音" },
  "linkedin": { "url": "https://linkedin.com/company/your-company", "label": "LinkedIn" },
  "github": { "url": "https://github.com/your-company", "label": "GitHub" }
}
```

**tutorial.steps：**
```json
[
  {
    "title": "步骤一：登录系统",
    "description": "使用管理员账号登录后台",
    "image": "https://example.com/step1.png",
    "tip": "默认账号 admin/admin"
  },
  {
    "title": "步骤二：进入配置页",
    "description": "点击左侧菜单「系统设置」",
    "image": "https://example.com/step2.png"
  },
  {
    "title": "步骤三：保存配置",
    "description": "填写完成后点击「保存」按钮",
    "tip": "保存后立即生效"
  }
]
```

**knowledge-entity.sameAs：**
```json
[
  "https://zh.wikipedia.org/wiki/你的公司",
  "https://www.crunchbase.com/organization/your-company"
]
```

**knowledge-entity.properties：**
```json
{
  "foundingDate": "2015-01-01",
  "foundingLocation": "北京",
  "numberOfEmployees": "50-200",
  "naics": "541511",
  "isicV4": "6201"
}
```

### 5.3 JsonExampleBlock 组件

**位置：** `web/src/components/JsonExampleBlock.vue`

**Props：**
- `fieldLabel`：字段中文名
- `exampleJson`：示例 JSON 字符串
- `fieldName`：表单字段名

**Events：**
- `fill`：点击填充按钮时触发

**填充逻辑：**
```js
function fillJsonExample(fieldName, exampleJson) {
  if (formData[fieldName] && formData[fieldName].trim()) {
    uni.showModal({
      title: '确认覆盖',
      content: `字段「${fieldName}」已有内容，确定用示例覆盖吗？`,
      success: (res) => {
        if (res.confirm) {
          formData[fieldName] = exampleJson
          uni.showToast({ title: '已填入示例', icon: 'success' })
        }
      }
    })
  } else {
    formData[fieldName] = exampleJson
    uni.showToast({ title: '已填入示例', icon: 'success' })
  }
}
```

---

## 6. 后端接口与前端选择器改动

### 6.1 后端改动

#### 6.1.1 zhao-website admin 接口 populate tags.tagGroup

7 个 CT 的 service populate 配置：
```ts
const populate = {
  tags: { populate: { tagGroup: true } },
  category: true,
  site: true,
  coverImage: true,
}
```

#### 6.1.2 zhao-website admin list 支持 tagGroup 筛选

7 个 CT 的 controller：
```ts
async find(ctx) {
  const { tagGroup, ...rest } = ctx.query
  const filters = rest.filters || {}
  if (tagGroup) {
    filters.tags = { tagGroup: { slug: tagGroup } }
  }
  ctx.query.filters = filters
}
```

#### 6.1.3 zhao-tag service 校验 isPublic + site

```ts
async create(data) {
  if (data.isPublic && data.site) {
    throw new Error('公共标签不能关联站点')
  }
  if (!data.isPublic && !data.site) {
    throw new Error('站点标签必须关联站点')
  }
  return strapi.documents('plugin::zhao-tag.tag').create({ data })
}
```

#### 6.1.4 zhao-tag admin list 支持 site 筛选

```ts
async find(ctx) {
  const { siteId, isPublic, ...rest } = ctx.query
  const filters = rest.filters || {}
  if (siteId) {
    filters.$or = [
      { isPublic: true },
      { site: { documentId: siteId } }
    ]
  }
  if (isPublic !== undefined) {
    filters.isPublic = isPublic
  }
  ctx.query.filters = filters
}
```

### 6.2 前端改动

#### 6.2.1 tag.js API 新增方法

```js
export const tagApi = {
  list: (params = {}) => get('/zhao-tag/v1/admin/tags', params).then(extractList),
  listBySite: (siteId) => get('/zhao-tag/v1/admin/tags', { siteId }).then(extractList),
  listPublic: () => get('/zhao-tag/v1/admin/tags', { isPublic: true }).then(extractList),
  // ...
}
```

#### 6.2.2 TagSelector 组件

**位置：** `web/src/components/TagSelector.vue`

**功能：**
- 按 tagGroup 分组展示标签
- 显示公共/站点标签徽章
- 支持多选
- v-model 绑定已选 tag documentId 数组

#### 6.2.3 CT edit 页集成 TagSelector

7 个 CT 的 edit.vue 替换原有 tags 字段：
```vue
<TagSelector v-model="formData.tags" label="标签" :siteId="formData.site" />
```

#### 6.2.4 CT list 页增加 tagGroup 筛选

7 个 CT 的 list.vue 增加分组筛选 picker。

---

## 7. 验收标准

### 7.1 后端

- [ ] Strapi i18n 插件已启用，zh-CN locale 已配置
- [ ] zhao-tag tag/tag-group schema 含 pluginOptions.i18n.localized
- [ ] zhao-tag tag/tag-group schema 含 site 关联字段
- [ ] zhao-tag tag-group schema 含 isPublic 字段
- [ ] zhao-website 9 个 CT schema 含 pluginOptions.i18n.localized
- [ ] zhao-tag create/update 拒绝非法 isPublic+site 组合
- [ ] zhao-tag list 接口支持 siteId 筛选（返回公共 + 本站）
- [ ] zhao-website 7 CT list 接口支持 tagGroup 筛选
- [ ] zhao-website 7 CT detail 接口 populate tags.tagGroup

### 7.2 前端

- [ ] TagSelector 组件按 tagGroup 分组展示
- [ ] TagSelector 显示公共/站点标签徽章
- [ ] 7 CT edit 页集成 TagSelector
- [ ] 7 CT list 页支持 tagGroup 筛选
- [ ] JsonExampleBlock 组件在 JSON 字段下方显示示例
- [ ] 一键填充按钮：空字段直接填入，有内容时弹确认框
- [ ] 各 JSON 字段示例内容完整（article/product/seo-config/brand-info/tutorial/knowledge-entity）

### 7.3 文档

- [ ] admin-manual.md 增加"标签与 SEO 关系说明"章节
- [ ] 说明自动模式 vs 手动覆盖模式

---

## 8. 不在本次范围

- 其他 locale 配置（en-US/ja-JP 等）后续按需添加
- tag-index 多态索引优化（当前够用）
- knowledge-point i18n（独立需求）
- seo-config i18n（通过字段策略管理，不本身 localized）
- 数据迁移脚本（i18n 启用后 Strapi 自动为老数据填充默认 locale）
