# www.joho.cn 多板块内容模型与主题作用域设计

日期：2026-11-04
状态：待评审
范围：zhao-website / zhao-common 插件的数据模型规划 + 静态主题演示页的「设为默认」实现

## 1. 背景与目标

www.joho.cn 是综合站点，滑雪只是首个专题板块，后续会有温泉、包车、研学等板块。现有内容类型只关联 `site` 与 `article-category`，没有板块概念，导致：

- 板块只能靠分类树隐式表达，与「内容主题分类」语义混叠；
- 查询服务不支持按板块过滤，无法做板块独立首页、独立导航、独立主题；
- 新增板块时无法收敛影响面。

目标：

1. 引入独立「业务板块」实体，内容按板块归属，板块侧反向聚合；
2. 主题支持站点默认 + 板块覆盖两级作用域；
3. 前台路径按板块分区，SEO 权重可独立累积；
4. 静态演示页提供可验收的「设为默认」交互。

非目标：本期不写正式站 Strapi 后台写库代码，不迁移历史内容。

## 2. 现状事实（代码依据）

- 内容类型清单：`plugins/zhao-website/server/src/content-types/index.ts`
- 各内容仅关联 `site` + `category`：`article` / `geo-article` / `faq` / `tutorial` / `product` 的 `schema.json`
- 分类树支持父子，并被 articles/tutorials/faqs/downloads/products 反引用：`article-category/schema.json`
- 查询过滤只处理 `siteId/status/deletedAt/allowIndex/locale`：`services/content-filter.ts`
- 站点主题存储：`zhao-common site-config.themeConfig`（json）、`site-template.themeConfig`（json）
- 对外路由：`routes/content-api.ts`，无板块维度

## 3. 数据模型

### 3.1 新增 `plugin::zhao-website.section`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| site | relation manyToOne → `plugin::zhao-common.site-config` | 必填，inversedBy `website_sections` | 板块归属站点 |
| name | string(100) | 必填、localized | 板块名 |
| slug | uid(name) | 必填、localized | 前台路径段 |
| description | text | localized | 板块简介 |
| icon / cover | media(images) | 可空 | 导航图标 / 首页视觉 |
| themeConfig | json | 默认 `{"mode":"inherit","theme":"amber"}` | 板块主题策略 |
| order | integer | 默认 0 | 导航排序 |
| status | boolean | 默认 true | 上下线 |
| seoTitle / seoDescription | string(60/160) | localized | 板块 SEO |
| deletedAt | datetime | 默认 null | 软删除 |
| articles / geoArticles / tutorials / faqs / products / downloads | relation oneToMany | mappedBy `section` | 聚合列表 |

`section.themeConfig.mode`：`inherit` 继承站点默认；`custom` 使用 `theme` 指定主题。

### 3.2 内容类型新增 `section`

对 `article`、`geo-article`、`tutorial`、`faq`、`product`、`download` 统一新增：

```json
"section": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-website.section",
  "inversedBy": "articles"
}
```

字段可空：历史内容与站点级通用页（关于我们、隐私政策）不选板块，仍按原扁平路径渲染。

### 3.3 分类与板块

`article-category` 新增 `section`（manyToOne，可空），仅用于板块内分类导航与筛选。

单一真相：**内容的板块归属只看内容自身的 `section`**，不通过分类继承。分类允许跨板块复用同名主题（例如「安全须知」），但同一篇内容只属一个板块。

### 3.4 slug 唯一性

Strapi `uid` 唯一性在同类型内全局生效，板块前缀不会让其细分。采用方案 A：保存时自动拼板块前缀，`slug` 生成为 `{section.slug}-{原标题}`；板块为空时保持原生成规则。前台路径仍按 `/{板块}/{类型}/{slug}` 组织，slug 前缀只用于满足全局唯一约束，不在页面上展示。

## 4. 主题作用域

生效优先级（高 → 低）：

1. URL `?theme=`：仅评审/预览使用，不写入任何存储；
2. 板块 `section.themeConfig`：`mode=custom` 时取 `theme`；
3. 站点 `site-config.themeConfig.defaultTheme`：后台「设为默认」写入此处；
4. 模板 `site-template.themeConfig.defaultTheme`：新建站点的预设值；
5. 兜底 `amber`。

约束：

- 「设为默认」只影响 `mode=inherit` 的板块；`custom` 板块保持不变，按钮区域须显示「将影响 N / M 个板块」。
- 主题差异只允许落在 token（颜色、圆角、阴影、焦点环）；结构、间距、栏目顺序在任何主题下完全一致。

## 5. 后台组织

- 内容管理器新增分组「业务板块」，下挂：板块、文章分类、文章、GEO 文章、教程、问答、产品、下载。
- 板块编辑页三个 tab：基础信息（name/slug/description/cover/order/status/SEO）、主题（继承/指定 + 主题选择器）、内容（六个聚合列表，可按类型与状态筛选）。
- 内容编辑页新增「所属板块」选择器，置于分类之前，便于按板块收窄分类候选。
- 主题配置页展示每个主题的生效范围（哪些板块继承、哪些板块自定义）。

## 6. 前台路径

| 页面 | 路径 |
|---|---|
| 板块首页 | `/{section}` |
| GEO 文章 | `/{section}/guides/{slug}` |
| 普通文章 | `/{section}/blog/{slug}` |
| 教程 | `/{section}/courses/{slug}` |
| 问答 | `/{section}/faq`（列表） / `/{section}/faq/{slug}` |
| 产品 | `/{section}/products/{slug}` |
| 站点级通用页 | `/about`、`/privacy` 等扁平路径 |

板块首页需输出 `ItemList` 结构化数据，聚合该板块下已发布内容；未选板块的内容不进入任何板块页。

## 7. 静态演示页「设为默认」（本期交付）

文件：`docs/superpowers/specs/ski-theme/admin.html`

行为：

1. 点击任意主题卡片的「设为默认」→ 写入站点默认（演示期以 `localStorage["joyogo-ski-theme-default"]` 模拟站点级配置）；
2. 立即重载全部预览 iframe（带缓存清除参数），保证预览渲染与最新主题变量一致；卡片 iframe 固定展示各自主题，不随站点默认切换；
3. 更新顶部状态行三栏（后台默认 / 本机覆盖 / 当前生效）、卡片徽标、可复制配置片段；「后台默认」实时显示刚设定的主题名；
4. Toast 提示主题名，并注明影响范围；
5. 提供「恢复内置默认」，清除演示期写入的站点默认，回到 `theme.config.js` 的 `default`。

解析优先级（演示页与三张页面一致）：`?theme=` > 本机覆盖（`joyogo-ski-theme`）> 站点默认（`joyogo-ski-theme-default`）> `theme.config.js` 的 `default`。

演示页须明确标注边界：静态站无写库能力，真实全站生效需替换 `theme.config.js` 或后续接入 Strapi 的 `site-config.themeConfig`。

## 8. 查询与接口

- `services/content-filter.ts` 增加 `sectionSlug` / `sectionId` 维度，与现有 `siteId/status/locale` 组合过滤；
- `routes/content-api.ts` 增加 `GET /sections`、`GET /sections/:slug`（含内容聚合与主题配置）；
- 现有 `/articles`、`/geo-articles`、`/tutorials`、`/faqs`、`/products` 增加可选 `section` 过滤参数，缺省行为保持不变。

## 9. 迁移与兼容

- 新增字段全部可空，历史数据无需回填即可上线；
- 上线后按板块逐批回填 `section`，未回填内容继续走扁平路径；
- 板块删除使用软删除，已关联内容置空 `section` 而非级联删除。

## 10. 风险

| 风险 | 处理 |
|---|---|
| slug 全局唯一导致跨板块同名冲突 | 方案 A：保存时自动拼板块前缀 |
| 板块主题与站点默认不一致时出现漏色 | 全部颜色已 token 化，主题仅替换变量；新增组件必须只用 token |
| 跨板块内容需要复用 | 人工复制一份并各自归属，不做多板块关系，避免去重与排序歧义 |
| 板块结构与内容分类职责再次混叠 | 分类不参与板块归属判定，仅用于板块内导航 |
| 权限 | 「设为默认」限定超级管理员；普通编辑只能查看 |

## 11. 验收标准

1. 四套主题下，任意页面的栏目结构、元素位置、间距完全一致，仅颜色/圆角/阴影不同；
2. 后台「设为默认」点击后，状态行「后台默认」、卡片徽标、配置片段、全部预览 iframe 均更新，无残留旧主题渲染；
3. 板块模型上线后，`section` 为空的历史内容访问路径与现状完全一致；
4. 同一板块前缀下不同板块的同名内容可正常保存与访问；
5. `/{section}` 首页只聚合本板块已发布内容，且输出 ItemList 结构化数据。
