# strapi-site 四级可回退风格模板体系 + SEO/Geo/多语言 设计文档

日期：2026-09-06
范围：strapi-site（Next.js C 端官网工程）+ zhao-common / zhao-website（Strapi 插件）
状态：已与用户逐项确认

***

## 1. 背景与目标

strapi-site 目前仅有一个极简首页（单语言、无主题机制、依赖 `/api/zhao-website/v1` 代理取数）。本设计将 C 端官网升级为**可配置、可回退、多语言、SEO/Geo 就绪**的模板体系：

1. **四级可回退风格模板体系**（搭积木）：一级全局基调 → 二级风格模板（头条/知乎）→ 三级页面类型（首页/列表/详情）→ 四级页面内模块风格；未配置逐级向上回退。
2. **域名判断租户**：复用现有 `site-resolver` 中间件（Host/domain → siteId），本设计不重复实现。
3. **多语言**：官方 Strapi i18n 插件 + 子目录路由 + 无前缀即默认语言。
4. **数据过滤条件统一定义**：内容查询的统一过滤规则收敛到一级配置。
5. **SEO/Geo 优化**：Local SEO 增强（A 阶段实施），为多地域站点预留扩展空间（B 阶段契约）。

配置存放位置：全部存于 Strapi 后端（`zhao-common.site-template` + `zhao-common.site-config`，走已有 `getMergedConfig` 合并链），strapi-site 前端通过 API 读取合并后配置渲染，前端不落库。

***

## 2. 总体架构

```
请求 → zhao-common site-resolver（Host/domain → siteId，已实现）
     → strapi-site middleware（解析语言前缀，无前缀=defaultLocale）
     → 页面渲染：读取站点合并配置（template preset + 租户覆盖）
         ├─ 一级：设计令牌 / 多语言 / 数据过滤
         ├─ 二级：域名→租户→风格模板（toutiao/zhihu/default）
         ├─ 三级：页面类型布局（home/list/detail）
         └─ 四级：页面内模块列表与模块风格
     → 内容查询：统一 content-filter（套用一级过滤条件）
     → SEO 输出：seo-meta（Geo 标签 + 结构化数据 + hreflang）/ sitemap / llms.txt
```

***

## 3. 四级可回退风格模板体系

### 3.1 配置模型（复用 site-template 机制）

四级配置统一承载于 `zhao-common.site-template`（`presetConfig` / `themeConfig`）+ `zhao-common.site-config`（`template` 关联、`themeConfig`、`extraConfig`）。沿用现有 `getMergedConfig`：模板预设值 ← 租户自定义值，租户优先。无需新增 content-type。

### 3.2 一级：全局站点基调（兜底层）

存于模板 `presetConfig.global`：

```json
{
  "global": {
    "designTokens": {
      "colors": { "primary": "#1a73e8", "bg": "#ffffff", "text": "#1f2329" },
      "fonts": { "body": "system-ui", "heading": "system-ui" },
      "radius": 8,
      "spacing": { "base": 16, "section": 48 }
    },
    "layout": {
      "header": { "style": "default", "sticky": true },
      "footer": { "style": "default", "columns": 3 }
    },
    "locales": {
      "defaultLocale": "zh-CN",
      "alternateLocales": ["en"]
    },
    "filters": {
      "siteScoped": true,
      "defaultStatus": "published",
      "excludeDeleted": true,
      "allowIndex": "auto"
    }
  }
}
```

- `designTokens` / `layout`：全局视觉与通用骨架，四级回退的最终兜底。

- `locales`：多语言定义（见第 5 节）。

- `filters`：数据过滤条件（见第 4 节）。

### 3.3 二级：域名识别 + 风格模板

- 域名识别：`site-resolver` 中间件已完成（`query.domain` → `x-site-domain` → `Host`），产出 `ctx.state.siteId`。

- 风格模板：租户通过 `site-config.template` 关联一个 `site-template`。`presetConfig.style` 声明风格预设：

```json
{
  "style": "toutiao" | "zhihu" | "default",
  "pagePresets": {}
}
```

| style     | 语义      | 页面默认形态                     |
| --------- | ------- | -------------------------- |
| `toutiao` | 头条信息流   | 列表页大图卡片流、首页内容聚合、详情页正文居中窄栏  |
| `zhihu`   | 知乎问答/卡片 | 列表页问答卡片（标题+摘要+来源）、详情页宽栏+侧栏 |
| `default` | 通用      | 常规布局，各页面模块由三级/四级覆盖         |

- 租户可在 `site-config.themeConfig` / `extraConfig` 中覆盖 `style` 与二级预设值（租户优先）。

### 3.4 三级：页面类型

`presetConfig.pages` 按页面类型定义布局与默认模块：

```json
{
  "pages": {
    "home":    { "layout": "default", "modules": ["hero", "article-feed", "map"], "seo": {} },
    "list":    { "layout": "default", "modules": ["breadcrumb", "article-grid", "pagination"] },
    "detail":  { "layout": "default", "modules": ["article-header", "article-body", "related"] }
  }
}
```

页面类型固定三组：`home`（首页）、`list`（列表页：articles/products/cases/tutorials/faqs/downloads）、`detail`（详情页：文章/产品/case 详情）。

### 3.5 四级：页面内模块风格

`presetConfig.modules` 定义每个模块的类型与风格；三级页面的 `modules` 数组引用模块名并可按租户调整顺序/增删：

```json
{
  "modules": {
    "hero":         { "style": "centered" | "split", "height": 360 },
    "article-feed": { "style": "card" | "compact", "columns": 3 },
    "article-grid": { "style": "card" | "list", "columns": 3, "showCover": true },
    "map":          { "enabled": true, "zoom": 12, "useTencentMap": true },
    "breadcrumb":   { "enabled": true },
    "pagination":   { "style": "numbered" | "load-more" },
    "article-header": { "showMeta": true, "showShare": false },
    "article-body":   { "typography": "default", "showToc": false },
    "related":        { "count": 6 }
  }
}
```

模块清单以代码为准（前端 `components/modules/` 目录一个模块一个目录），模块可扩展，配置只驱动可见性/样式/参数，不做动态加载任意代码。

### 3.6 回退链

```
四级模块配置 → 三级页面默认模块 → 二级风格 pagePresets → 一级 global.designTokens/layout
```

每一级查找 key 缺失或值为 `null`/`""`/`false`（显式禁用除外）即向上一级回退；一级兜底值硬编码于前端（保证任何情况下可渲染）。

### 3.7 配置读取接口

strapi-site 通过新增的公开只读接口获取合并配置：

- 接口：`GET /api/zhao-common/v1/site-config/merged`（或复用现有站点公开配置接口扩展），返回 `getMergedConfig` 结果（`{ config, meta }`，`config` 已含模板预设+租户覆盖）。

- 前端在根布局/服务端组件读取一次，注入上下文供各页面/模块消费。

- 缓存：按 siteId 服务端缓存短 TTL（如 60s），管理端改动模板/配置后最长 1 分钟生效。

***

## 4. 数据过滤统一层

### 4.1 一级过滤配置

见 3.2 节 `global.filters`：

| 键                | 取值                        | 语义                                       |
| ---------------- | ------------------------- | ---------------------------------------- |
| `siteScoped`     | bool                      | 强制按租户 `site` 隔离                          |
| `defaultStatus`  | string                    | 默认内容状态，`published`                       |
| `excludeDeleted` | bool                      | 排除软删除（`deletedAt: null`）                 |
| `allowIndex`     | `auto` / `strict` / `off` | `auto`=模型有该字段才过滤；`strict`=强制过滤；`off`=不过滤 |

`allowIndex: auto` 为默认，解决历史问题：`faq`/`tutorial` 模型无 `allowIndex` 字段，硬编码过滤导致 SQL 500。

### 4.2 content-filter 服务（zhao-website）

新增轻量服务，统一构建过滤条件并查询：

```ts
buildWhere(siteId, uid, extra = {}) {
  const f = mergedConfig.global.filters;   // 复用现有合并链
  const where = { ...extra };
  if (f.siteScoped) where.site = siteId;
  if (f.defaultStatus) where.status = f.defaultStatus;
  if (f.excludeDeleted) where.deletedAt = null;
  if (f.allowIndex === "strict") where.allowIndex = true;
  else if (f.allowIndex === "auto" && strapi.getModel(uid)?.attributes?.allowIndex) where.allowIndex = true;
  return where;
}
```

- `findMany(uid, siteId, params)`：内部调用 `buildWhere` 后查询，各 content-api 服务收敛到该入口。

- 存量替换：sitemap / llms-txt / article / product / case / faq / tutorial / download 等查询改走 `buildWhere`。默认行为与现状一致（兼容迁移），顺带根治 allowIndex 硬编码问题。

- `filters` 缺省时按现状逻辑兜底（`siteScoped=true, defaultStatus=published, excludeDeleted=true, allowIndex=auto`）。

- B 阶段预留：`filters` 可扩展 `region` 键（缺省不启用）。

***

## 5. 多语言方案（官方 i18n 插件）

### 5.1 存储

- 启用 Strapi 官方 i18n 插件；article/product/case/faq/tutorial/download/compliance 等**内容模型全部开启** **`localized`**，同内容按 locale 分行存储。

- 站点级多语言以 `seo-config.defaultLocale/alternateLocales` 为**唯一事实源**；一级 `global.locales` 是前端读取的合并视图（后端配置合并时由 seo-config 映射而来），避免两处配置冲突。

### 5.2 前端路由（子目录方案）

- **URL 即语言**：无前缀 = 默认语言（zh-CN）；`/en/` 前缀 = 对应 alternateLocale。语言完全由 URL 决定，无 Cookie 记忆、无重定向（杜绝重复内容）。

- **middleware.ts**：解析 pathname 首段 locale；前缀不在站点启用的语言列表 → 重定向回默认语言路径；解析结果注入请求头供服务端组件读取。

- **语言切换器**：生成同路径其他语言 URL（`/en/articles/xxx` ↔ `/articles/xxx`），纯 URL 导航。

- 前端不引入 i18n 库（避免新依赖），用轻量自研：middleware 解析 + 少量静态文案字典 + 服务端读取 Strapi 多语言内容。

### 5.3 内容回退

- **详情页**：访问 `/en/articles/xxx` 但无 en 翻译 → **302 到默认语言版本** `/articles/xxx`；默认语言也无 → 404。保证 URL 语言与内容语言一致。

- **列表页/首页/分类页**（聚合页）：不重定向，只展示当前语言下有翻译的内容；无内容则空列表。

### 5.4 hreflang 输出

- 只输出**实际存在翻译版本**的语言 alternate（避免指向空语言页）。

- 无翻译时只输出 canonical + `x-default`（指向默认语言）。

- 默认语言输出无前缀 URL；备选语言输出 `/en/` 前缀 URL。与现有 `seo-meta._buildHreflangEntries`（subdirectory 分支）一致，后端少量调整（按实际存在性过滤）。

***

## 6. Local SEO 增强（A 阶段实施）

### 6.1 seo-config 新增字段

| 字段                    | 类型     | 语义                     |
| --------------------- | ------ | ---------------------- |
| `organizationAddress` | text   | 组织地址（NAP-Address）      |
| `organizationPhone`   | string | 组织电话（NAP-Phone）        |
| `areaServed`          | json   | 服务区域列表，如 `["北京","上海"]` |

### 6.2 seo-meta 输出增强

- **Geo meta 四标签**：`geo.region` / `geo.placename` / `geo.position` / `ICBM`，有值即输出（沿用现有 `geoRegion/geoPlacename/geoPosition/geoICBM` 字段）。

- **Organization schema 地理节点**：从 `geoPosition`（`"39.90,116.40"`）解析 `geo.latitude/longitude`；输出 `address`、`areaServed`（有值才输出）。

- **LocalBusiness 分支**：`organizationType` 配置为 `LocalBusiness`/`Corporation` 等时输出对应 schema 类型（含地理节点）。

### 6.3 前端地图模块

四级模板新增 `map` 模块：复用 `tencentMapKey`（site-config）+ `geoPosition` 渲染腾讯地图；`enabled: false` 时隐藏。

风险：seo-config 加字段需重建 dist（`zhao-website` 插件）；Geo 标签/节点无值时静默跳过，不影响现有站点。

***

## 7. 多地域站点扩展预留（B 阶段，只约定不实现）

- **Geo 配置结构**：现有 4 个 Geo 字段视为全局默认；将来升级为 `geoConfig` 对象（全局值 + `perRegion` 覆盖 map：`{ beijing: {...}, shanghai: {...} }`）。本次不加字段，仅定契约。

- **URL 形态**：预留地域段 `/region/{citySlug}/`，与语言组合 `/en/region/beijing/articles/xxx`。本次不实现路由。

- **内容维度**：B 阶段再给内容模型加 `region` 过滤维度；本次不动内容模型。

- **一级 filters**：预留 `region` 可选键（缺省不按地域过滤）。

***

## 8. 前端落地结构（strapi-site）

```
app/
  middleware.ts                    # 语言前缀解析 + 重定向
  [locale]/(routes)/               # 无前缀=默认语言；/en/ 等前缀=备选语言
    page.tsx                       # 首页（home 页面类型）
    articles/page.tsx              # 列表页
    articles/[slug]/page.tsx       # 详情页
  layout.tsx                       # 读取合并配置，注入 SiteConfig 上下文
components/
  modules/                         # 四级模块（hero/article-feed/article-grid/map/...）
  layout/                          # Header/Footer（一级 layout）
lib/
  site-config.ts                   # 合并配置读取 + 短 TTL 缓存
  content-filter.ts                # 前端侧过滤/取数辅助（对应后端 content-filter）
  i18n.ts                          # 语言解析/静态文案字典
```

- 服务端组件为主，配置读取在根布局一次完成；语言由 URL 决定。

- 页面与模块按回退链查找配置，模块只做渲染不做路由。

***

## 9. 风险点

1. **内容模型开启 localized 为迁移型改造**：所有内容模型加 i18n、存量数据补默认语言记录、查询与 admin 后台均需适配，风险最高，需按内容类型分批实施。
2. **content-filter 收敛为重构**：约 10+ 处查询替换，默认行为与现状一致以降低回归；需全量回归 content-api 端点。
3. **seo-config 新增字段需重建 dist**：`zhao-website` 插件 `npm run build` 后 git 提交 dist 再部署。
4. **多语言 302 回退依赖内容翻译完整性**：翻译缺失时体验依赖 302，需后台提示未翻译条目。
5. **配置合并链深度依赖现有 site-template 机制**：`getMergedConfig` 的 preset 语义（json 深合并为浅合并）需按四级嵌套结构调整——若嵌套对象浅合并导致丢键，需在 content-filter/前端侧做逐级查找兜底。

***

## 10. 验收清单

- [ ] 四级配置可在管理端（site-template/site-config）配置，前端渲染生效，逐级回退正确

- [ ] 域名识别租户：不同域名返回不同站点配置与内容

- [ ] 数据过滤：sitemap / llms.txt / 各 content-api 全量回归 200，无 allowIndex 硬编码残留

- [ ] 多语言：`/en/articles/xxx` 返回英文内容；无翻译 302 到默认语言；hreflang 只输出存在的语言

- [ ] Local SEO：详情页/首页输出 Geo meta 四标签 + Organization/LocalBusiness schema 地理节点；地图模块可开关

- [ ] B 阶段契约写入本文档且本次未实现内容模型 region 维度

