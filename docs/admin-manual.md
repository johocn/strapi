# 跨境官网系统后台管理手册

## 目录
- [Ch1 系统概述](#ch1-系统概述)
- [Ch2 角色与权限](#ch2-角色与权限)

---

## Ch1 系统概述

### 1.1 平台定位

本系统基于 **Strapi v5** 构建的多租户官网运营平台，面向跨境业务场景，集成内容运营、课程学习、题库考试、积分营销、物流询价、理财展示等能力，通过统一的中心化架构为多个租户站点提供完整的后台管理能力。

**核心特性**：

- 多租户隔离：渠道（channel）→ 站点（site）→ 内容类型（CT）三层模型
- 中心化架构：11 个业务中心独立运营、权限解耦
- 灵活角色：5 系统角色 + 22 中心角色，覆盖运营、编辑、讲师等场景
- 多端发布：官网、直播工作室、多平台分发一体化

### 1.2 11 中心架构

系统按业务域划分为 11 个中心，每个中心对应独立菜单与权限树：

```
                          ┌──────────────────────────┐
                          │      跨境官网系统          │
                          │   (Strapi v5 后台)        │
                          └────────────┬─────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌──────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │ course  │   │  study    │  │   quiz     │  │  point    │  │ marketing │
   │ center  │   │  center   │  │   center   │  │  center   │  │  center   │
   │ 课程中心 │   │ 学习数据  │  │  题库系统  │  │  积分体系  │  │ 营销运营  │
   └────┬────┘   └─────┬─────┘  └──────┬─────┘  └─────┬─────┘  └─────┬─────┘
        │              │               │               │              │
        └──────────────┴───────┬───────┴───────────────┘              │
                               │                                      │
        ┌──────────────┬───────┴────────┬───────────────┬─────────────┘
        │              │                │               │
   ┌────▼────┐   ┌─────▼─────┐   ┌──────▼─────┐  ┌─────▼─────┐
   │ system  │   │   tag     │   │  studio    │  │  website  │
   │ center  │   │  center   │  │   center   │  │  center   │
   │系统工具 │   │ 标签体系  │  │ 直播工作室 │  │ 官网中心  │
   └────┬────┘   └─────┬─────┘   └──────┬─────┘  └─────┬─────┘
        │              │                │               │
        └──────────────┴───────┬────────┴───────────────┘
                               │
                        ┌──────▼──────┐     ┌─────────────┐
                        │ logistics   │     │   wealth    │
                        │  center     │     │   center    │
                        │ 物流中心    │     │  理财中心   │
                        └─────────────┘     └─────────────┘
```

| 中心 key | 中文名 | 主要职责 |
|---|---|---|
| `course-center` | 课程中心 | 课程、课时、分类、用户授权 |
| `study-center` | 学习数据 | 课程进度、课时进度 |
| `quiz-center` | 题库系统 | 题目、考试、答题记录、批量考试 |
| `point-center` | 积分体系 | 积分类型、规则、产品、兑换、自提点、签到 |
| `marketing-center` | 营销运营 | 渠道、网络、成员、邀请、兑换码 |
| `system-center` | 系统工具 | 媒体、回收站、功能开关、站点配置、用户角色、OSS、三方、SSO、租户、模板 |
| `tag-center` | 标签体系 | 标签、分组、知识点、标签索引 |
| `studio-center` | 直播工作室 | 工作室、内容采集、多平台发布、数据分析、广告位 |
| `website-center` | 官网中心 | SEO、品牌、文章、产品、案例、合规、FAQ、教程、下载、线索、知识实体/关系、AI 摘要、第一真值 |
| `logistics-center` | 物流中心 | 询价、货物追踪、联系渠道、客户评价、通知订阅、落地页、转化漏斗、意向订单、推荐奖励、客户档案 |
| `wealth-center` | 理财中心 | 产品、公司、数据采集、风险指标、推荐配置、年报、年化收益 |

### 1.3 多租户模型

系统采用 **channel → site → CT** 三层隔离模型：

```
channel（渠道）
   │  顶层业务隔离单元，对应一个业务主体
   │
   ├── site（站点）
   │      官网/落地站点的独立单元，拥有独立域名与品牌配置
   │
   │   └── CT（Content Type，内容类型）
   │           站点内的具体内容实体（文章、产品、案例等）
   │
   └── site ...
```

**隔离规则**：

- **channel**：业务主体边界，渠道间数据完全隔离
- **site**：站点级隔离，站点间内容、配置、标签独立
- **CT**：内容类型粒度，由各中心管理（如官网中心的文章、产品、案例）
- **公共标签**（`isPublic=true` 且 `site=null`）由 admin 创建，所有站点共享；站点标签仅本站可见

### 1.4 快速入门

**标准操作流程**：

1. **登录后台**：访问 Strapi 管理后台，使用管理员分配的账号登录
2. **选择站点**：在站点切换器选择当前操作的站点（数据按站点隔离）
3. **导航到中心**：左侧菜单选择目标中心（如「官网中心」）
4. **操作 CT**：在中心内选择内容类型，执行查看/新增/编辑/删除等操作

**权限提示**：

- 不同角色可见的中心与按钮不同，详见 [Ch2 角色与权限](#ch2-角色与权限)
- 缺失某菜单或按钮时，联系 admin 或 channel-admin 调整角色分配

---

## Ch2 角色与权限

### 2.1 角色总览

系统共定义 **27 个角色**，分为两类：

- **5 系统角色**：跨中心的全局角色
- **22 中心角色**：11 中心 × {manager, editor} 两套角色

### 2.2 系统角色（5 个）

| 角色 key | 中文名 | 权限范围 |
|---|---|---|
| `admin` | 系统管理员 | 全部 11 中心的全部权限，含 system-center；可分配任意角色 |
| `channel-admin` | 渠道管理员 | 排除 system-center 主体权限，但保留 tenant/site-config/feature-flag/user-roles/SSO 扩展；其余 10 中心全权；可分配角色 |
| `plugin-manager` | 插件管理员 | course/quiz/point/tag/studio 5 中心全权 + website/logistics/wealth 编辑（read/create/update，不含 delete/manage） |
| `instructor` | 讲师 | 跨中心只读：课程/学习/标签部分可写，官网/物流/理财/工作室只读 |
| `user` | 普通用户 | 无后台权限（前台用户） |

### 2.3 中心角色（22 个）

每个中心提供 manager（管理员）与 editor（编辑）两个角色：

| 角色 key | 中文名 | 权限范围 |
|---|---|---|
| `course-manager` | 课程管理员 | 课程中心全部权限（含 delete） |
| `course-editor` | 课程编辑 | 课程中心 read/create/update（不含 delete/manage） |
| `study-manager` | 学习数据管理员 | 学习数据中心全部权限 |
| `study-editor` | 学习数据编辑 | 学习数据中心 read/create/update |
| `quiz-manager` | 题库管理员 | 题库系统中心全部权限 |
| `quiz-editor` | 题库编辑 | 题库系统中心 read/create/update |
| `point-manager` | 积分管理员 | 积分体系中心全部权限 |
| `point-editor` | 积分编辑 | 积分体系中心 read/create/update |
| `marketing-manager` | 营销管理员 | 营销运营中心全部权限 |
| `marketing-editor` | 营销编辑 | 营销运营中心 read/create/update |
| `system-manager` | 系统管理员(中心) | 系统工具中心全部权限 |
| `system-editor` | 系统编辑 | 系统工具中心 read/create/update |
| `tag-manager` | 标签管理员 | 标签体系中心全部权限 |
| `tag-editor` | 标签编辑 | 标签体系中心 read/create/update |
| `studio-manager` | 工作室管理员 | 直播工作室中心全部权限 |
| `studio-editor` | 工作室编辑 | 直播工作室中心 read/create/update |
| `website-manager` | 官网管理员 | 官网中心全部权限 |
| `website-editor` | 官网编辑 | 官网中心 read/create/update |
| `logistics-manager` | 物流管理员 | 物流中心全部权限 |
| `logistics-editor` | 物流编辑 | 物流中心 read/create/update |
| `wealth-manager` | 理财管理员 | 理财中心全部权限 |
| `wealth-editor` | 理财编辑 | 理财中心 read/create/update |

> **manager vs editor 区别**：manager 拥有 `.delete` 与 `.manage` 权限；editor 仅 read/create/update，无法删除或执行管理类操作。

### 2.4 权限矩阵

角色 × 中心权限范围对照：

| 角色 | course | study | quiz | point | marketing | system | tag | studio | website | logistics | wealth | 角色分配 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `admin` | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | ✅ |
| `channel-admin` | 全部 | 全部 | 全部 | 全部 | 全部 | ⚠️部分 | 全部 | 全部 | 全部 | 全部 | 全部 | ✅ |
| `plugin-manager` | 全部 | — | 全部 | 全部 | — | — | 全部 | 全部 | 编辑 | 编辑 | 编辑 | ❌ |
| `instructor` | 读写 | 读写 | — | 只读* | — | — | 读写 | 只读 | 只读 | 只读 | 只读 | ❌ |
| `{center}-manager` | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | ❌ |
| `{center}-editor` | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | ❌ |

**图例说明**：

- **全部**：该中心全部权限（read/create/update/delete/manage）
- **编辑**：read/create/update（不含 delete/manage）
- **读写**：read/create/update（instructor 在课程/学习/标签中心有部分写权限）
- **只读**：仅 read
- **⚠️部分**：channel-admin 在 system-center 主体被排除，但保留 tenant、site-config、feature-flag、user-roles、SSO 扩展、media-meta 等子项权限
- **只读\***：instructor 在 point 中心仅有 rule-template/sign-in-record 的只读权限
- **—**：无该中心权限
- **本中心全权 / 本中心编辑**：仅对该角色所属中心生效，其他中心无权限

### 2.5 角色分配操作

**可分配角色**：仅 `admin` 与 `channel-admin` 拥有角色分配权限（`role.assign` / `role.revoke`）。

**操作步骤**：

1. 登录后台，导航至 **系统工具 → 用户角色**
2. 在用户列表中查找目标用户，点击「分配角色」
3. 选择目标角色：
   - 系统角色：admin / channel-admin / plugin-manager / instructor / user
   - 中心角色：选择对应中心的 manager 或 editor
4. 确认分配，系统记录角色日志（可通过「操作日志」查看）
5. 用户重新登录后，权限生效

**注意事项**：

- admin 可分配任意角色，包括其他 admin
- channel-admin 可分配中心角色与 instructor/user，但不可分配 admin 或 channel-admin
- 角色变更记录可通过 `role.read-logs` 权限查看
- 撤销角色使用「撤销角色」操作（`role.revoke`）

---

## Ch3 官网中心

官网中心（website-center）负责站点内容运营与对外发布能力，覆盖 SEO、品牌、文章、产品、案例、合规、FAQ、教程、下载、线索留资、用户行为日志、知识图谱、AI 摘要、第一真值策略共 18 个内容类型（CT）。所有 CT 隶属 `plugin::zhao-website`，按站点（site）隔离。

**通用约定**：

- 所有 CT 通过 `site` 关联字段绑定到 `plugin::zhao-common.site-config`，确保站点级数据隔离
- 内容类 CT（article/product/case/compliance/faq/tutorial/download）使用 `status` 枚举控制状态流转：`draft` → `published` → `archived`，并配 `publishedAt` 发布时间戳
- 软删除：所有 CT 含 `deletedAt` 字段（默认 null），由插件 lifecycle 维护
- 多语言：内容类 CT 启用 i18n，关键文本字段 `localized: true`
- 知识图谱三件套：`knowledge-entity`（实体）、`knowledge-relation`（关系）、`first-truth-policy`（真值声明）联动运营
- 行为日志类（lead/visit-log/interaction/search-log）`content-manager.visible: false`，由前台或接口写入，不在 Content Manager 直接编辑

### 3.1 SEO 全局配置（seo-config）

**用途**：站点级 SEO 全局配置，含 meta、站点验证、统计代码、sitemap/robots、AI 爬虫策略、Schema.org、地理信息、ICP 备案等。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_seo_configs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（oneToOne） |
| defaultTitle | string | 否 | 默认标题，maxLength 60 |
| titleTemplate | string | 否 | 标题模板，maxLength 60 |
| defaultDescription | string | 否 | 默认描述，maxLength 160 |
| defaultKeywords | string | 否 | 默认关键词，maxLength 200 |
| ogImage | media | 否 | Open Graph 默认图 |
| favicon | media | 否 | 站点 favicon |
| googleSiteVerification | string | 否 | Google 站点验证码 |
| baiduSiteVerification | string | 否 | 百度站点验证码 |
| bingSiteVerification | string | 否 | Bing 站点验证码 |
| baiduAnalyticsId | string | 否 | 百度统计 ID |
| googleAnalyticsId | string | 否 | Google Analytics ID |
| customHeadCode | text | 否 | 自定义 head 代码 |
| customBodyCode | text | 否 | 自定义 body 代码 |
| enableSitemap | boolean | 否 | 启用 sitemap，默认 true |
| sitemapExcludeTypes | json | 否 | sitemap 排除的 CT 列表 |
| enableRobotsTxt | boolean | 否 | 启用 robots.txt，默认 true |
| robotsContent | text | 否 | robots.txt 内容 |
| aiCrawlerPolicy | enumeration | 否 | AI 爬虫策略：allow_all / block_all / selective，默认 allow_all |
| geoRegion | string | 否 | 地理区域 |
| geoPlacename | string | 否 | 地理地名 |
| geoPosition | string | 否 | 地理位置坐标 |
| geoICBM | string | 否 | ICBM 坐标 |
| defaultLocale | string | 否 | 默认语言，默认 zh-CN |
| alternateLocales | json | 否 | 备选语言列表 |
| hreflangStrategy | enumeration | 否 | hreflang 策略：none / subdirectory / subdomain / tld，默认 subdirectory |
| organizationName | string | 否 | 组织名（Schema.org） |
| organizationLogo | media | 否 | 组织 Logo |
| organizationType | string | 否 | 组织类型 |
| schemaSameAs | json | 否 | Schema.org sameAs |
| schemaContactPoint | json | 否 | Schema.org 联系点 |
| icpNumber | string | 否 | ICP 备案号 |
| publicSecurityRecord | string | 否 | 公安备案号 |
| extraConfig | json | 否 | 扩展配置 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → SEO 全局配置 → 选择站点查看
- **创建**：每个站点仅允许 1 条（oneToOne），通常初始化站点时自动创建
- **编辑**：选择记录 → 修改字段 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色；建议改用字段停用，不直接删除）

#### 业务规则

- 与 site-config 为 oneToOne 关系，一个站点仅一条 SEO 配置
- 关闭 draftAndPublish，配置修改即时生效
- 启用 sitemap/robots 后，前台根据该记录生成 `/sitemap.xml`、`/robots.txt`
- `aiCrawlerPolicy=selective` 时需结合 `extraConfig` 配置白名单
- `hreflangStrategy` 决定多语言 URL 结构，需与品牌信息 `defaultLocale` 一致

### 3.2 企业品牌信息（brand-info）

**用途**：站点企业品牌信息，含公司名、Logo、联系方式、社交、办公地点、资质证书等，作为 Schema.org Organization 数据源。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_brand_infos

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（oneToOne） |
| companyName | string | 是 | 公司全称，maxLength 200，localized |
| shortName | string | 否 | 公司简称，maxLength 100，localized |
| slogan | string | 否 | 品牌口号，maxLength 200，localized |
| logo | media | 否 | 品牌 Logo |
| logoDark | media | 否 | 深色模式 Logo |
| favicon | media | 否 | 站点 favicon |
| description | text | 否 | 品牌简介，localized |
| foundingDate | date | 否 | 成立日期 |
| registeredAddress | string | 否 | 注册地址，maxLength 500，localized |
| officeAddress | string | 否 | 办公地址，maxLength 500，localized |
| contactPhone | string | 否 | 联系电话，maxLength 30 |
| contactEmail | email | 否 | 联系邮箱 |
| serviceHotline | string | 否 | 服务热线，maxLength 30 |
| businessHours | string | 否 | 营业时间，maxLength 100 |
| wechatQrCode | media | 否 | 微信二维码 |
| wechatPublicAccount | string | 否 | 微信公众号名 |
| miniProgramName | string | 否 | 小程序名 |
| socialLinks | json | 否 | 社交链接列表 |
| offices | json | 否 | 分支机构列表，localized |
| certificates | json | 否 | 资质证书列表，localized |
| legalRepresentative | string | 否 | 法定代表人 |
| registeredCapital | string | 否 | 注册资本 |
| unifiedSocialCreditCode | string | 否 | 统一社会信用代码 |
| businessScope | text | 否 | 经营范围，localized |
| mainEntity | relation → knowledge-entity | 否 | 关联知识图谱主实体 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 企业品牌信息 → 选择站点
- **创建**：每站点 1 条（oneToOne），点击"创建" → 填写字段 → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 与 site-config 为 oneToOne，每站点仅 1 条品牌信息
- 启用 i18n，多语言字段需逐 locale 维护
- `mainEntity` 关联 knowledge-entity 后，可作为 Schema.org Organization 结构化数据来源
- `unifiedSocialCreditCode` 应与 first-truth-policy 中 `business_license` 类声明一致

### 3.3 资讯文章（article）

**用途**：站点资讯、博客、新闻等长文内容，支持分类、标签、SEO、Schema.org、知识实体关联。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_articles

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| title | string | 是 | 标题，maxLength 200，localized |
| slug | uid | 是 | URL 别名，由 title 生成，localized |
| excerpt | text | 否 | 摘要，localized |
| content | text | 是 | 正文，localized |
| coverImage | media | 否 | 封面图 |
| category | relation → article-category | 否 | 文章分类（manyToOne） |
| tags | relation → tag | 否 | 标签（manyToMany，plugin::zhao-tag） |
| author | string | 否 | 作者，maxLength 50 |
| authorTitle | string | 否 | 作者头衔，maxLength 50 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| isPinned | boolean | 否 | 是否置顶，默认 false |
| viewCount | biginteger | 否 | 浏览数，默认 0 |
| likeCount | biginteger | 否 | 点赞数，默认 0 |
| collectCount | biginteger | 否 | 收藏数，默认 0 |
| shareCount | biginteger | 否 | 分享数，默认 0 |
| readingTime | integer | 否 | 阅读时长（分钟） |
| wordCount | integer | 否 | 字数 |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| seoKeywords | string | 否 | SEO 关键词，maxLength 200，localized |
| canonicalUrl | string | 否 | 规范 URL，maxLength 500，localized |
| ogTitle | string | 否 | OG 标题，maxLength 200，localized |
| ogDescription | text | 否 | OG 描述，localized |
| ogImage | media | 否 | OG 图 |
| ogType | enumeration | 否 | OG 类型：article / product / website / video，默认 article |
| twitterCard | enumeration | 否 | Twitter 卡片：summary / summary_large_image / product，默认 summary_large_image |
| schemaType | string | 否 | Schema.org 类型 |
| schemaJson | json | 否 | Schema.org JSON-LD，localized |
| allowIndex | boolean | 否 | 允许收录，默认 true |
| noFollow | boolean | 否 | nofollow，默认 false |
| sitemapPriority | decimal | 否 | sitemap 优先级，默认 0.7 |
| sitemapFrequency | enumeration | 否 | 更新频率：always / hourly / daily / weekly / monthly / yearly / never，默认 weekly |
| sourceType | enumeration | 否 | 来源类型：original / studio / external，默认 original |
| sourceUrl | string | 否 | 来源 URL |
| sourceArticleDraft | relation → article-draft | 否 | 关联工作室草稿（plugin::zhao-studio） |
| mainEntity | relation → knowledge-entity | 否 | 主实体（manyToOne） |
| mentionedEntities | relation → knowledge-entity | 否 | 提及实体（manyToMany） |
| structuredData | json | 否 | 结构化数据 |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 资讯文章 → 列表筛选（按站点/分类/状态）
- **创建**：点击"创建" → 填写 title/content → 选择 category/tags → 设置 SEO → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published`（设置 publishedAt）→ `archived`（下线）
- `slug` 由 `title` 自动生成，需保持唯一
- `sourceType=studio` 时关联 `sourceArticleDraft`，由工作室分发流程同步
- `mainEntity` / `mentionedEntities` 关联知识图谱，用于实体抽取与关联推荐
- 浏览/点赞/收藏/分享计数由前台接口写入，禁止后台手动修改

### 3.4 文章分类（article-category）

**用途**：文章/产品/案例/教程/FAQ/下载等内容的统一分类树，支持父子层级。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_article_categories

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 分类名，maxLength 100，localized |
| slug | uid | 是 | URL 别名，由 name 生成，localized |
| description | text | 否 | 分类描述，localized |
| parent | relation → article-category | 否 | 父分类（manyToOne，自关联） |
| order | integer | 否 | 排序，默认 0 |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| status | boolean | 否 | 启用状态，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

> 反向关联（children/articles/tutorials/faqs/downloads/products）由对应 CT 通过 mappedBy 维护，不在本表展开。

#### 操作步骤

- **查看**：进入官网中心 → 文章分类 → 树形列表
- **创建**：点击"创建" → 填写 name → 选择 parent（可选）→ 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色；有子分类或关联内容时禁止删除）

#### 业务规则

- 通过 `parent` 自关联形成分类树，建议层级 ≤ 3
- 一个分类可被多种 CT（article/product/case/tutorial/faq/download）共享引用
- `slug` 全站唯一，作为前台 URL 路径段
- `status=false` 时前台隐藏，但保留关联内容

### 3.5 产品/方案（product）

**用途**：站点产品或解决方案展示，含规格、特性、应用场景、价格区间、案例关联。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_products

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 产品名，maxLength 200，localized |
| slug | uid | 是 | URL 别名，由 name 生成，localized |
| tagline | string | 否 | 标语，maxLength 200，localized |
| description | text | 否 | 简短描述，localized |
| content | text | 否 | 详情正文，localized |
| coverImage | media | 否 | 封面图 |
| images | media（multiple） | 否 | 多图 |
| category | relation → article-category | 否 | 分类（manyToOne） |
| tags | relation → tag | 否 | 标签（manyToMany） |
| features | json | 否 | 特性列表，localized |
| specifications | json | 否 | 规格参数，localized |
| scenarios | json | 否 | 应用场景 |
| priceRange | string | 否 | 价格区间，maxLength 100 |
| priceUnit | string | 否 | 价格单位，maxLength 20 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| viewCount | biginteger | 否 | 浏览数，默认 0 |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| seoKeywords | string | 否 | SEO 关键词，maxLength 200，localized |
| canonicalUrl | string | 否 | 规范 URL，maxLength 500 |
| ogImage | media | 否 | OG 图 |
| allowIndex | boolean | 否 | 允许收录，默认 true |
| sitemapPriority | decimal | 否 | sitemap 优先级，默认 0.7 |
| sitemapFrequency | enumeration | 否 | 更新频率：always / hourly / daily / weekly / monthly / yearly / never，默认 weekly |
| mainEntity | relation → knowledge-entity | 否 | 主实体（manyToOne） |
| mentionedEntities | relation → knowledge-entity | 否 | 提及实体（manyToMany） |
| structuredData | json | 否 | 结构化数据 |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

> 反向关联 cases 由 case CT 通过 mappedBy 维护。

#### 操作步骤

- **查看**：进入官网中心 → 产品/方案 → 列表筛选
- **创建**：点击"创建" → 填写 name → 上传封面 → 编辑 features/specifications → 关联 category/tags → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `features`/`specifications` 为 JSON 结构，建议统一 schema（如 `{key, label, value}`）
- `cases` 反向关联由 case CT 的 `relatedProducts` 字段维护
- `mainEntity` 关联知识图谱实体用于产品知识库

### 3.6 落地案例（case）

**用途**：客户落地案例展示，含客户信息、挑战、方案、成果、证言。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_cases

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| title | string | 是 | 案例标题，maxLength 200，localized |
| slug | uid | 是 | URL 别名，由 title 生成，localized |
| clientName | string | 是 | 客户名，maxLength 100，localized |
| clientLogo | media | 否 | 客户 Logo |
| clientIndustry | string | 否 | 客户行业，maxLength 50 |
| clientDescription | text | 否 | 客户简介，localized |
| challenge | text | 是 | 挑战，localized |
| solution | text | 是 | 解决方案，localized |
| results | json | 是 | 成果数据，localized |
| testimonial | text | 否 | 客户证言，localized |
| testimonialAuthor | string | 否 | 证言作者，maxLength 50 |
| testimonialTitle | string | 否 | 证言作者头衔，maxLength 100 |
| coverImage | media | 否 | 封面图 |
| images | media（multiple） | 否 | 多图 |
| tags | relation → tag | 否 | 标签（manyToMany） |
| relatedProducts | relation → product | 否 | 关联产品（manyToMany） |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| viewCount | biginteger | 否 | 浏览数，默认 0 |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| allowIndex | boolean | 否 | 允许收录，默认 true |
| mainEntity | relation → knowledge-entity | 否 | 主实体（manyToOne） |
| mentionedEntities | relation → knowledge-entity | 否 | 提及实体（manyToMany） |
| structuredData | json | 否 | 结构化数据 |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 落地案例 → 列表筛选
- **创建**：点击"创建" → 填写客户信息 → 编辑 challenge/solution/results → 关联产品 → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `results` 为 JSON，建议结构 `{metric, value, unit, description}`
- `relatedProducts` 双向同步至 product 的 `cases` 反向关联
- `mainEntity` 关联知识图谱，用于案例 ↔ 产品 ↔ 实体三角推荐

### 3.7 合规公示（compliance）

**用途**：站点合规性公示信息，含公告、政策、报告、证书、协议。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_compliances

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| title | string | 是 | 标题，maxLength 200，localized |
| slug | uid | 是 | URL 别名，由 title 生成，localized |
| category | enumeration | 是 | 类别：notice / policy / report / certificate / agreement |
| content | text | 是 | 正文，localized |
| effectiveDate | date | 否 | 生效日期 |
| expiryDate | date | 否 | 失效日期 |
| tags | relation → tag | 否 | 标签（manyToMany） |
| isPinned | boolean | 否 | 是否置顶，默认 false |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| allowIndex | boolean | 否 | 允许收录，默认 true |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 合规公示 → 按 category 筛选
- **创建**：点击"创建" → 选择 category → 填写 content → 设置生效/失效日期 → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `effectiveDate`/`expiryDate` 控制前台展示窗口，过期内容前台隐藏但保留
- `category=certificate` 应与 brand-info 的 `certificates` 字段保持一致
- `category=agreement` 通常对应隐私政策、服务条款等

### 3.8 常见问答（faq）

**用途**：站点 FAQ 问答对，支持分类、排序、知识实体关联。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_faqs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| question | text | 是 | 问题，localized |
| answer | text | 是 | 答案，localized |
| slug | uid | 是 | URL 别名，由 question 生成 |
| category | relation → article-category | 否 | 分类（manyToOne） |
| tags | relation → tag | 否 | 标签（manyToMany） |
| order | integer | 否 | 排序，默认 0 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| viewCount | biginteger | 否 | 浏览数，默认 0 |
| mainEntity | relation → knowledge-entity | 否 | 主实体（manyToOne） |
| mentionedEntities | relation → knowledge-entity | 否 | 提及实体（manyToMany） |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 常见问答 → 按 category 筛选
- **创建**：点击"创建" → 填写 question/answer → 选择 category → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `order` 控制前台展示顺序，数值小的在前
- FAQ 自动生成 Schema.org FAQPage 结构化数据
- `mainEntity` 关联知识实体后，可作为 ai-content-summary 中 `summaryType=faq` 的数据源

### 3.9 教程/操作指南（tutorial）

**用途**：站点操作教程、使用指南，含步骤、材料、难度、预估时长。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_tutorials

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| title | string | 是 | 标题，maxLength 200，localized |
| slug | uid | 是 | URL 别名，由 title 生成，localized |
| description | text | 否 | 简介，localized |
| coverImage | media | 否 | 封面图 |
| steps | json | 是 | 步骤列表，localized |
| materials | json | 否 | 所需材料 |
| estimatedTime | string | 否 | 预估时长，maxLength 50 |
| difficulty | enumeration | 否 | 难度：beginner / intermediate / advanced，默认 beginner |
| result | text | 否 | 预期结果，localized |
| category | relation → article-category | 否 | 分类（manyToOne） |
| tags | relation → tag | 否 | 标签（manyToMany） |
| order | integer | 否 | 排序，默认 0 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| viewCount | biginteger | 否 | 浏览数，默认 0 |
| mainEntity | relation → knowledge-entity | 否 | 主实体（manyToOne） |
| mentionedEntities | relation → knowledge-entity | 否 | 提及实体（manyToMany） |
| structuredData | json | 否 | 结构化数据 |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 教程/操作指南 → 按 difficulty 筛选
- **创建**：点击"创建" → 填写 title → 编辑 steps（JSON 数组）→ 设置 difficulty → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `steps` 建议 JSON 结构：`[{order, title, content, image}]`
- 自动生成 Schema.org HowTo 结构化数据
- `difficulty` 用于前台按用户级别筛选

### 3.10 下载文件管理（download）

**用途**：站点下载资源管理，含白皮书、手册、数据表、模板、指南、证书等。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_downloads

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 资源名，maxLength 200，localized |
| description | text | 否 | 描述，localized |
| file | media | 是 | 文件 |
| fileType | enumeration | 否 | 类型：whitepaper / brochure / datasheet / template / guide / certificate / other，默认 other |
| fileSize | biginteger | 否 | 文件大小（字节） |
| category | relation → article-category | 否 | 分类（manyToOne） |
| tags | relation → tag | 否 | 标签（manyToMany） |
| relatedContentType | string | 否 | 关联内容类型，maxLength 30 |
| relatedContentId | string | 否 | 关联内容 ID |
| requireLead | boolean | 否 | 是否需要留资，默认 true |
| downloadCount | biginteger | 否 | 下载次数，默认 0 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| order | integer | 否 | 排序，默认 0 |
| status | enumeration | 否 | 状态：draft / published / archived，默认 draft |
| publishedAt | datetime | 否 | 发布时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 下载文件管理 → 按 fileType 筛选
- **创建**：点击"创建" → 上传 file → 选择 fileType → 设置 requireLead → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`draft` → `published` → `archived`
- `requireLead=true` 时，前台下载需先提交 lead（type=download），自动写入 lead.downloadFileId
- `fileSize` 由 lifecycle 在保存时根据 media 自动计算
- `downloadCount` 由前台下载接口自增，禁止后台手动修改

### 3.11 线索/留资（lead）

**用途**：前台用户留资/线索记录，含联系方式、来源、UTM、跟进状态。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_leads

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| type | enumeration | 是 | 类型：contact / download / quote / appointment / demo / partner / intent_order / referral |
| contactName | string | 否 | 联系人姓名，maxLength 50 |
| contactPhone | string | 否 | 联系电话，maxLength 30 |
| contactEmail | email | 否 | 联系邮箱 |
| contactCompany | string | 否 | 公司，maxLength 200 |
| contactTitle | string | 否 | 职位，maxLength 100 |
| message | text | 否 | 留言 |
| sourceType | string | 否 | 来源类型，maxLength 30 |
| sourceId | string | 否 | 来源 ID |
| referralCode | string | 否 | 推荐码，maxLength 50 |
| sourceUrl | string | 否 | 来源 URL，maxLength 500 |
| downloadFileId | string | 否 | 下载文件 ID |
| utmSource | string | 否 | UTM source |
| utmMedium | string | 否 | UTM medium |
| utmCampaign | string | 否 | UTM campaign |
| utmContent | string | 否 | UTM content |
| utmTerm | string | 否 | UTM term |
| referrer | string | 否 | 来源页，maxLength 500 |
| userAgent | string | 否 | UA，maxLength 500 |
| ipAddress | string | 否 | IP，maxLength 50 |
| assignedTo | relation → admin::user | 否 | 分配跟进人（manyToOne） |
| status | enumeration | 否 | 状态：new / contacted / qualified / unqualified / converted / invalid，默认 new |
| followUpRecords | json | 否 | 跟进记录列表 |
| remark | text | 否 | 备注 |
| convertedAt | datetime | 否 | 转化时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：本 CT 在 Content Manager 不可见（`visible: false`），通过自定义线索管理视图或 API 查看
- **创建**：由前台表单/接口自动写入；后台可通过自定义页面创建
- **编辑**：通过自定义视图修改 status/assignedTo/followUpRecords
- **删除**：通过自定义视图软删除（仅 website-manager 角色）

#### 业务规则

- 状态流转：`new` → `contacted` → `qualified` → `converted`（或 `unqualified` / `invalid`）
- `converted` 时设置 `convertedAt`，并可能联动 marketing-center 的推荐奖励、logistics-center 的意向订单
- `type=intent_order` / `type=referral` 分别对接物流中心意向订单与营销中心推荐奖励
- `assignedTo` 关联 admin 用户，用于线索分配与业绩归属
- `followUpRecords` 建议 JSON 结构：`[{at, by, action, note}]`
- PII 数据（电话/邮箱/IP）需遵循合规要求，定期清理或脱敏

### 3.12 访问日志（visit-log）

**用途**：站点访问行为日志，含页面浏览、内容浏览、CTA 点击、搜索等。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_visit_logs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| type | enumeration | 是 | 类型：page_view / article_view / product_view / case_view / download_click / cta_click / search / external_click |
| pageUrl | string | 否 | 页面 URL，maxLength 500 |
| pageTitle | string | 否 | 页面标题，maxLength 200 |
| targetType | string | 否 | 目标类型，maxLength 30 |
| targetId | string | 否 | 目标 ID |
| referrer | string | 否 | 来源 URL，maxLength 500 |
| referrerDomain | string | 否 | 来源域名，maxLength 200 |
| searchKeyword | string | 否 | 搜索关键词，maxLength 200 |
| utmSource | string | 否 | UTM source |
| utmMedium | string | 否 | UTM medium |
| utmCampaign | string | 否 | UTM campaign |
| userAgent | string | 否 | UA，maxLength 500 |
| deviceType | enumeration | 否 | 设备：desktop / mobile / tablet，默认 desktop |
| browser | string | 否 | 浏览器，maxLength 50 |
| os | string | 否 | 操作系统，maxLength 50 |
| ipAddress | string | 否 | IP，maxLength 50 |
| country | string | 否 | 国家，maxLength 50 |
| region | string | 否 | 地区，maxLength 100 |
| city | string | 否 | 城市，maxLength 100 |
| sessionId | string | 否 | 会话 ID，maxLength 100 |
| visitorId | string | 否 | 访客 ID，maxLength 100 |
| userId | relation → users-permissions.user | 否 | 登录用户（manyToOne） |
| dwellTime | integer | 否 | 停留时长（秒） |
| scrollDepth | integer | 否 | 滚动深度（百分比） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：本 CT 在 Content Manager 不可见，通过数据分析视图或 API 查看
- **创建**：由前台埋点 SDK 自动写入；不支持后台手动创建
- **编辑**：禁止编辑（日志数据不可变）
- **删除**：通过定期清理任务软删除（仅 website-manager 角色）

#### 业务规则

- 日志数据不可变，禁止后台修改
- `visitorId` 通过 cookie 持久化，`sessionId` 单次会话
- 与 interaction（点赞/收藏/分享）、search-log（搜索）互补，构成完整行为画像
- IP/UA 等隐私数据需遵循合规要求，建议定期脱敏或聚合
- 数据量增长快，需配置 TTL 或归档策略

### 3.13 内容互动记录（interaction）

**用途**：用户对内容的点赞、收藏、分享行为记录。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_interactions

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| type | enumeration | 是 | 类型：like / collect / share |
| targetType | string | 是 | 目标类型，maxLength 30 |
| targetId | string | 是 | 目标 ID |
| visitorId | string | 是 | 访客 ID，maxLength 100 |
| userId | relation → users-permissions.user | 否 | 登录用户（manyToOne） |
| ipAddress | string | 否 | IP，maxLength 50 |
| userAgent | string | 否 | UA，maxLength 500 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：本 CT 在 Content Manager 不可见，通过数据分析视图或 API 查看
- **创建**：由前台互动接口自动写入（点赞/收藏/分享按钮触发）
- **编辑**：禁止编辑
- **删除**：用户取消互动时软删除（仅 website-manager 角色可批量清理）

#### 业务规则

- 同一 visitorId 对同一 target 的同类型互动应唯一（由接口层校验）
- 写入时同步自增对应 CT 的 likeCount/collectCount/shareCount
- 取消互动时软删除并自减计数
- `targetType` 通常为 `article`/`product`/`case`/`tutorial`/`faq`/`download`

### 3.14 搜索日志（search-log）

**用途**：站点前台用户搜索行为日志，用于搜索词分析与内容优化。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_search_logs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| keyword | string | 是 | 搜索词，maxLength 200 |
| resultCount | integer | 否 | 结果数，默认 0 |
| visitorId | string | 否 | 访客 ID，maxLength 100 |
| ipAddress | string | 否 | IP，maxLength 50 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：本 CT 在 Content Manager 不可见，通过搜索分析视图或 API 查看
- **创建**：由前台搜索接口自动写入
- **编辑**：禁止编辑
- **删除**：通过定期清理任务软删除（仅 website-manager 角色）

#### 业务规则

- 日志数据不可变
- 与 visit-log 中 `type=search` 互补：search-log 聚焦搜索词，visit-log 记录完整访问链路
- 用于热门搜索词、零结果词分析，反向指导内容运营

### 3.15 知识图谱实体（knowledge-entity）

**用途**：站点知识图谱实体节点，覆盖组织、人物、产品、服务等 18 种 schema.org 类型。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_knowledge_entities

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| entityType | enumeration | 是 | 实体类型：Organization / Person / Product / Service / Place / Event / CreativeWork / Article / CaseStudy / Offer / Review / FAQ / HowTo / BreadcrumbList / Brand / ContactPoint / QuantitativeValue / DefinedTerm |
| name | string | 是 | 实体名，maxLength 200 |
| slug | uid | 是 | URL 别名，由 name 生成 |
| identifier | string | 否 | 外部标识，maxLength 100 |
| description | text | 否 | 描述 |
| sameAs | json | 否 | 等同 URI 列表（Schema.org sameAs） |
| image | media | 否 | 实体图 |
| url | string | 否 | 实体 URL，maxLength 500 |
| properties | json | 否 | 扩展属性 |
| refTargetType | string | 否 | 引用目标类型，maxLength 30 |
| refTargetId | string | 否 | 引用目标 ID |
| confidence | decimal | 否 | 置信度，默认 1.0 |
| sourceType | enumeration | 否 | 来源：official / derived / manual / imported，默认 official |
| lastVerifiedAt | datetime | 否 | 最后校验时间 |
| verificationStatus | enumeration | 否 | 校验状态：verified / pending / outdated / conflict，默认 verified |
| verifiedBy | relation → admin::user | 否 | 校验人（manyToOne） |
| status | boolean | 否 | 启用状态，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

> 反向关联（brandInfos/subjectRelations/objectRelations/*MainEntities/*Mentions/firstTruthPolicies）由各 CT 通过 mappedBy 维护，不在本表展开。

#### 操作步骤

- **查看**：进入官网中心 → 知识图谱实体 → 按 entityType 筛选
- **创建**：点击"创建" → 选择 entityType → 填写 name → 设置 properties → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色；被 first-truth-policy 或内容引用时禁止删除）

#### 业务规则

- 知识图谱核心实体表，与 knowledge-relation、first-truth-policy 构成"实体-关系-真值"三元组
- `entityType` 决定 Schema.org 类型，影响结构化数据生成
- `verificationStatus=conflict` 时需人工介入，配合 first-truth-policy 解决冲突
- `confidence` < 1.0 的实体不应直接用于结构化数据发布
- 被多 CT 通过 `mainEntity` / `mentionedEntities` 引用，删除前需解绑

### 3.16 知识图谱关系（knowledge-relation）

**用途**：知识图谱实体间关系（三元组：subject-predicate-object）。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_knowledge_relations

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| subjectEntity | relation → knowledge-entity | 是 | 主体实体（manyToOne） |
| predicate | string | 是 | 谓词，maxLength 100 |
| objectEntity | relation → knowledge-entity | 否 | 客体实体（manyToOne） |
| objectValue | json | 否 | 客体值（非实体时使用） |
| objectText | text | 否 | 客体文本 |
| sourceUrl | string | 否 | 来源 URL，maxLength 500 |
| sourceType | enumeration | 否 | 来源：official / derived / manual / inferred，默认 manual |
| confidence | decimal | 否 | 置信度，默认 1.0 |
| lastVerifiedAt | datetime | 否 | 最后校验时间 |
| verificationStatus | enumeration | 否 | 校验状态：verified / pending / outdated / conflict，默认 verified |
| status | boolean | 否 | 启用状态，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 知识图谱关系 → 按 subjectEntity/predicate 筛选
- **创建**：点击"创建" → 选择 subjectEntity → 填写 predicate → 选择 objectEntity 或填写 objectValue → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 三元组结构：`subjectEntity` - `predicate` - (`objectEntity` | `objectValue` | `objectText`)
- `objectEntity` 与 `objectValue`/`objectText` 互斥，二选一
- `sourceType=inferred` 表示 AI 推断关系，需人工校验后改为 `verified`
- `predicate` 建议遵循 Schema.org 属性命名（如 `memberOf`、`worksFor`、`parentOrganization`）
- 与 first-truth-policy 联动：冲突关系需通过真值策略解决

### 3.17 机器可读摘要（ai-content-summary）

**用途**：为内容生成机器可读摘要（TLDR、关键事实、FAQ、技术规格等），供 AI 检索与结构化输出。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_ai_summaries

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| targetType | string | 是 | 目标类型，maxLength 30 |
| targetId | string | 是 | 目标 ID |
| summaryType | enumeration | 是 | 摘要类型：tldr / key_facts / faq / qa_pairs / technical_spec / executive_brief / comparison / howto |
| content | json | 是 | 摘要内容（结构化） |
| contentText | text | 否 | 摘要纯文本 |
| language | string | 否 | 语言，默认 zh-CN |
| version | integer | 否 | 版本，默认 1 |
| generatedBy | enumeration | 否 | 生成方式：manual / ai_assisted / ai_generated / hybrid，默认 manual |
| aiProvider | string | 否 | AI 供应方，maxLength 50 |
| aiModel | string | 否 | AI 模型，maxLength 100 |
| generatedAt | datetime | 否 | 生成时间 |
| verifiedAt | datetime | 否 | 校验时间 |
| verificationStatus | enumeration | 否 | 校验状态：verified / pending / outdated / conflict，默认 verified |
| status | boolean | 否 | 启用状态，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 机器可读摘要 → 按 targetType/summaryType 筛选
- **创建**：点击"创建" → 选择 targetType/targetId → 选择 summaryType → 编辑 content（JSON）→ 保存
- **编辑**：选择记录 → 编辑 → 保存（建议递增 version）
- **删除**：选择记录 → 删除（仅 website-manager 角色）

#### 业务规则

- 一条内容可关联多条摘要（不同 summaryType/language）
- `generatedBy=ai_generated` 必须经过人工校验（`verificationStatus=verified`）后方可对外使用
- `content` 为 JSON，结构由 `summaryType` 决定（如 `qa_pairs` 为 `[{q, a}]`）
- `verificationStatus=outdated` 在源内容更新后自动标记，需重新生成
- AI 爬虫（如 GPTBot、ClaudeBot）读取优先级高于原文，是 AI 时代 SEO 的关键资产

### 3.18 第一真值策略声明（first-truth-policy）

**用途**：站点关键事实声明的权威来源记录，用于解决多源数据冲突。

**所属插件**：plugin::zhao-website
**集合名**：zhao_website_first_truths

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| claim | string | 是 | 声明描述，maxLength 200 |
| claimKey | string | 是 | 声明键，maxLength 100 |
| claimCategory | enumeration | 否 | 类别：business_license / brand_claim / technical_spec / certification / financial / logistics_promise / other，默认 brand_claim |
| canonicalEntity | relation → knowledge-entity | 否 | 关联知识实体（manyToOne） |
| canonicalValue | text | 是 | 权威值 |
| canonicalValueType | enumeration | 否 | 值类型：text / number / date / url / json，默认 text |
| canonicalSourceUrl | string | 否 | 来源 URL，maxLength 500 |
| canonicalSourceType | enumeration | 否 | 来源类型：government / official_site / third_party_verified / internal，默认 official_site |
| conflictResolution | enumeration | 否 | 冲突解决策略：latest / earliest / highest_confidence / manual，默认 manual |
| lastVerifiedAt | datetime | 是 | 最后校验时间 |
| verificationStatus | enumeration | 否 | 校验状态：verified / pending / outdated / conflict，默认 verified |
| conflictDetails | json | 否 | 冲突详情 |
| priority | integer | 否 | 优先级，默认 100 |
| status | boolean | 否 | 启用状态，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入官网中心 → 第一真值策略声明 → 按 claimCategory/verificationStatus 筛选
- **创建**：点击"创建" → 填写 claim/claimKey → 设置 canonicalValue → 选择 canonicalSourceType → 设置 lastVerifiedAt → 保存
- **编辑**：选择记录 → 编辑 → 保存（建议同步更新 lastVerifiedAt）
- **删除**：选择记录 → 删除（仅 website-manager 角色；被知识实体引用时禁止删除）

#### 业务规则

- 同一 `claimKey` 在站点内应唯一，作为该事实的权威来源
- `canonicalSourceType=government` 优先级最高，`internal` 最低
- `conflictResolution=manual` 时由人工裁决，其他策略由系统按规则选取
- `verificationStatus=conflict` 触发 `conflictDetails` 记录冲突源，需人工校验
- 与 knowledge-entity/knowledge-relation 联动：实体属性的权威值优先取自 first-truth-policy
- `priority` 数值大的优先级高，用于多声明冲突时排序
- AI 摘要、结构化数据、前台展示中涉及该声明时，必须以 first-truth-policy 为准

---

## Ch4 物流中心

物流中心（logistics-center）负责跨境物流业务的询价、报价、货物追踪、客户运营、营销转化与推荐奖励能力，覆盖询价单、询价动态字段规则、报价规则、报价公式、货物追踪、追踪节点、追踪 API 配置、联系渠道矩阵、客户评价、通知订阅、营销落地页、转化漏斗、转化事件、意向订单、推荐奖励、客户档案共 16 个内容类型（CT）。所有 CT 隶属 `plugin::zhao-logistics`，按站点（site）隔离。

**通用约定**：

- 所有 CT 通过 `site` 关联字段绑定到 `plugin::zhao-common.site-config`，确保站点级数据隔离
- 软删除：所有 CT 含 `deletedAt` 字段（默认 null），由插件 lifecycle 维护
- 多语言：部分 CT（quote-field-rule / quote-price-formula / tracking-node / contact-matrix / review / landing-page）启用 i18n，关键文本字段 `localized: true`
- 询价全链路：`dynamic-form.validate → quote-engine.calculate → 创建 quote-request → lead.createPublic → customer-aggregator.upsertFromQuote → referral-engine.applyCode → funnel-tracker.track`
- 订单转化全链路：`更新 intent-order.status=delivered → 查 referral → referral-engine.markConverted → customer-aggregator.upsertFromOrder`
- 所有 CT `draftAndPublish: false`，不启用 Strapi 草稿发布工作流，状态由业务枚举字段管理

### 4.1 物流询价单（quote-request）

**用途**：记录客户提交的跨境物流询价请求及报价结果。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_quote_requests

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| trackingNo | string | 否 | 追踪号，maxLength 50 |
| routeId | string | 是 | 路线 ID，maxLength 50 |
| origin | string | 是 | 始发地，maxLength 100 |
| destination | string | 是 | 目的地，maxLength 100 |
| serviceProvider | string | 否 | 服务商，maxLength 50 |
| cargoType | string | 是 | 货物类型，maxLength 50 |
| weight | decimal | 是 | 重量 |
| volume | decimal | 否 | 体积 |
| formData | json | 是 | 动态表单数据 |
| quotedPrice | json | 否 | 报价结果 |
| status | enumeration | 是 | 状态：draft / submitted / quoted / accepted / rejected / expired，默认 submitted |
| leadId | string | 否 | 关联线索 ID |
| customerName | string | 是 | 客户名称，maxLength 100 |
| customerContact | string | 是 | 客户联系方式，maxLength 200 |
| customerType | enumeration | 否 | 客户类型：individual / business / fba_seller |
| utmSource | string | 否 | UTM 来源，maxLength 100 |
| utmMedium | string | 否 | UTM 媒介，maxLength 100 |
| utmCampaign | string | 否 | UTM 活动，maxLength 100 |
| lang | string | 是 | 语言，maxLength 10 |
| remark | text | 否 | 备注 |
| expiresAt | datetime | 否 | 报价过期时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 物流询价单 → 按 status/routeId/customerType 筛选
- **创建**：主要由前台询价表单自动写入（询价全链路）；后台可点击"创建" → 填写 routeId/origin/destination/cargoType/weight/formData/customerName/customerContact/lang → 保存
- **编辑**：选择记录 → 编辑（如回填 quotedPrice、调整 status）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`draft → submitted → quoted → accepted/rejected/expired`
- 询价提交全链路：`dynamic-form.validate → quote-engine.calculate → 创建 quote-request → lead.createPublic → customer-aggregator.upsertFromQuote → referral-engine.applyCode → funnel-tracker.track`
- `formData` 由 quote-field-rule 动态渲染并校验，`quotedPrice` 由 quote-price-rule/quote-price-formula 计算回填
- `expiresAt` 到期后由定时任务将 status 置为 `expired`
- `leadId` 与官网中心 lead CT 联动，`customerContact` 用于 customer-aggregator 聚合匹配

### 4.2 询价动态字段规则（quote-field-rule）

**用途**：按路线/服务商/客户类型动态配置询价表单字段。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_quote_field_rules

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 规则名称，maxLength 100，localized |
| routeId | string | 否 | 路线 ID，maxLength 50 |
| serviceProvider | string | 否 | 服务商，maxLength 50 |
| customerType | enumeration | 否 | 客户类型：individual / business / fba_seller |
| isActive | boolean | 是 | 是否启用，默认 true |
| priority | integer | 否 | 优先级，默认 0 |
| fields | json | 是 | 字段定义，localized |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 询价动态字段规则 → 按 routeId/customerType/isActive 筛选
- **创建**：点击"创建" → 填写 name → 设置 routeId/serviceProvider/customerType 匹配条件 → 编辑 fields（字段定义 JSON）→ 设置 priority → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 匹配优先级：`routeId + serviceProvider + customerType` 三维精确匹配优先，其次按 `priority` 数值大的优先
- `fields` 为动态字段定义数组，由 `dynamic-form.validate` 服务在询价提交时校验
- 启用 i18n，`name`/`fields` 按 locale 区分，支持多语言表单
- 停用规则（`isActive=false`）不参与匹配，但不影响历史询价单已提交的 formData

### 4.3 报价规则表（quote-price-rule）

**用途**：按路线/服务商/重量区间配置报价规则。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_quote_price_rules

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| routeId | string | 是 | 路线 ID，maxLength 50 |
| serviceProvider | string | 是 | 服务商，maxLength 50 |
| minWeight | decimal | 是 | 最小重量 |
| maxWeight | decimal | 是 | 最大重量 |
| pricePerKg | decimal | 是 | 单价（每公斤） |
| currency | string | 是 | 币种，maxLength 10，默认 CNY |
| volumetricFactor | integer | 否 | 体积重系数 |
| minCharge | decimal | 否 | 最低收费 |
| surcharges | json | 否 | 附加费配置 |
| formula | relation → quote-price-formula | 否 | 关联报价公式（manyToOne） |
| effectiveFrom | date | 是 | 生效起始日 |
| effectiveTo | date | 否 | 生效截止日 |
| isActive | boolean | 是 | 是否启用，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 报价规则表 → 按 routeId/serviceProvider/isActive 筛选
- **创建**：点击"创建" → 填写 routeId/serviceProvider → 设置 minWeight/maxWeight/pricePerKg/currency → 设置 effectiveFrom → 可选关联 formula → 保存
- **编辑**：选择记录 → 编辑 → 保存（建议同步调整 effectiveTo）
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 匹配规则：`routeId + serviceProvider + weight∈[minWeight,maxWeight]` 且 `isActive=true` 且在 effectiveFrom/effectiveTo 有效期内
- `volumetricFactor` 用于体积重计算：`体积重 = volume / volumetricFactor`，与实际重量取大者计费
- `minCharge` 保证最低收费，`surcharges` 支持燃油附加费、旺季附加费等
- 可关联 quote-price-formula 走公式计算，未关联则按 `pricePerKg × weight` 简单计算
- 时间重叠的规则按 `priority`（如有）或创建时间倒序匹配，命中首条即返回

### 4.4 报价公式模板（quote-price-formula）

**用途**：配置可复用的报价计算公式及变量定义。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_quote_price_formulas

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 公式名称，maxLength 100，localized |
| description | text | 否 | 描述，localized |
| expression | text | 是 | 公式表达式 |
| variables | json | 是 | 变量定义 |
| isActive | boolean | 是 | 是否启用，默认 true |
| price_rules | relation → quote-price-rule | 否 | 关联报价规则（oneToMany，mappedBy formula） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 报价公式模板 → 按 isActive 筛选
- **创建**：点击"创建" → 填写 name → 编写 expression → 定义 variables → 保存
- **编辑**：选择记录 → 编辑 → 保存（被 price_rules 引用时谨慎修改 expression）
- **删除**：选择记录 → 删除（仅 logistics-manager 角色；被报价规则引用时禁止删除）

#### 业务规则

- `expression` 为安全表达式（由 `quote-engine.calculate` 沙箱求值），引用 `variables` 中定义的变量
- 启用 i18n，`name`/`description` 按 locale 区分，但 `expression`/`variables` 不区分语言
- 一条公式可被多条 quote-price-rule 引用（oneToMany 反向关系）
- 停用公式（`isActive=false`）后，引用它的规则将回退到 `pricePerKg × weight` 简单计算

### 4.5 货物追踪主表（tracking-shipment）

**用途**：记录货物物流追踪主信息及节点列表。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_tracking_shipments

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| trackingNo | string | 是 | 运单号，maxLength 50 |
| orderId | string | 否 | 关联订单 ID，maxLength 50 |
| status | enumeration | 是 | 状态：pending / in_transit / customs / hold / delivered / exception / returned，默认 pending |
| origin | string | 是 | 始发地，maxLength 100 |
| destination | string | 是 | 目的地，maxLength 100 |
| serviceProvider | string | 否 | 服务商，maxLength 50 |
| eta | datetime | 否 | 预计到达时间 |
| actualDelivery | datetime | 否 | 实际送达时间 |
| customerName | string | 否 | 客户名称，maxLength 100 |
| customerContact | string | 否 | 客户联系方式，maxLength 200 |
| lastSyncAt | datetime | 否 | 最后同步时间 |
| syncProvider | relation → tracking-provider | 否 | 关联追踪 API 配置（manyToOne） |
| nodes | relation → tracking-node | 否 | 追踪节点列表（oneToMany，mappedBy shipment） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 货物追踪主表 → 按 status/serviceProvider/trackingNo 筛选
- **创建**：点击"创建" → 填写 trackingNo/origin/destination → 可选关联 syncProvider → 保存
- **编辑**：选择记录 → 编辑（如更新 status/eta/actualDelivery）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`pending → in_transit → customs → delivered`；异常分支 `hold / exception / returned`
- `status=delivered` 时回填 `actualDelivery`，并触发通知订阅（subscription）推送
- `lastSyncAt` 由 tracking-provider 定时同步任务更新，`syncProvider` 决定数据来源
- `nodes` 子表记录完整物流轨迹，与主表 status 联动（最新节点决定主表状态）
- `trackingNo` 在站点内建议唯一，避免重复录入

### 4.6 追踪节点（tracking-node）

**用途**：记录货物物流轨迹的逐个节点事件。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_tracking_nodes

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| shipment | relation → tracking-shipment | 是 | 关联运单（manyToOne，inversedBy nodes） |
| nodeStatus | enumeration | 是 | 节点状态：done / active / pending / alert |
| nodeType | enumeration | 是 | 节点类型：picked_up / export / import / customs / hold / delivery / delivered / exception |
| location | string | 否 | 位置，maxLength 100 |
| eventTime | datetime | 是 | 事件时间 |
| description | text | 是 | 描述，localized |
| dataSource | enumeration | 是 | 数据来源：internal / external，默认 internal |
| providerRef | string | 否 | 外部服务商引用 ID，maxLength 50 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 追踪节点 → 按 shipment/nodeStatus/nodeType 筛选
- **创建**：点击"创建" → 选择 shipment → 设置 nodeType/nodeStatus/eventTime → 填写 description → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 每条节点归属一个 tracking-shipment，按 `eventTime` 升序构成完整轨迹
- `nodeStatus=active` 表示当前进行节点，每条 shipment 通常仅一个 active 节点
- `nodeStatus=alert` 触发异常通知，联动 subscription 推送
- `dataSource=external` 表示由 tracking-provider 同步而来，`providerRef` 记录外部唯一 ID 防止重复同步
- 启用 i18n，`description` 按 locale 区分，支持多语言轨迹展示

### 4.7 追踪 API 配置（tracking-provider）

**用途**：配置外部物流追踪 API 凭证与参数。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_tracking_providers

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 配置名称，maxLength 100 |
| providerType | enumeration | 是 | 服务商类型：track17 / afterShip / kuaidi100 / customApi |
| apiKey | string | 是 | API Key，maxLength 200 |
| apiSecret | string | 否 | API Secret，maxLength 200 |
| endpoint | string | 否 | 自定义端点 URL，maxLength 500 |
| isEnabled | boolean | 是 | 是否启用，默认 true |
| rateLimit | integer | 否 | 速率限制（次/分钟） |
| supportedCarriers | json | 否 | 支持的承运商列表 |
| extraConfig | json | 否 | 扩展配置 |
| shipments | relation → tracking-shipment | 否 | 关联运单（oneToMany，mappedBy syncProvider） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 追踪 API 配置 → 按 providerType/isEnabled 筛选
- **创建**：点击"创建" → 填写 name → 选择 providerType → 填写 apiKey → 可选 apiSecret/endpoint/rateLimit → 保存
- **编辑**：选择记录 → 编辑（如轮换 apiKey）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色；被运单引用时建议先停用）

#### 业务规则

- `apiKey`/`apiSecret` 为敏感凭证，后台展示需脱敏，禁止日志输出明文
- `providerType=customApi` 时必须填写 `endpoint`，由自定义适配器对接
- `rateLimit` 控制定时同步任务的调用频率，避免触发服务商限流
- `supportedCarriers` 决定该配置可解析的承运商列表，未匹配的 trackingNo 跳过同步
- 同一站点可配置多个 provider，按 `isEnabled=true` 且 `rateLimit` 余量选择调度

### 4.8 联系渠道矩阵（contact-matrix）

**用途**：按语言/国家配置多渠道联系信息。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_contact_matrices

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| lang | enumeration | 是 | 语言：cn / jp / kr / vn |
| flag | string | 是 | 国旗标识，maxLength 10 |
| short | string | 是 | 简码，maxLength 10 |
| primary | json | 是 | 主要联系方式，localized |
| channels | json | 是 | 多渠道列表，localized |
| hotline | json | 是 | 热线配置，localized |
| email | email | 是 | 邮箱 |
| callbackNote | text | 否 | 回呼说明，localized |
| isActive | boolean | 是 | 是否启用，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 联系渠道矩阵 → 按 lang/isActive 筛选
- **创建**：点击"创建" → 选择 lang → 填写 flag/short → 编辑 primary/channels/hotline（JSON）→ 填写 email → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- `lang` 在站点内建议唯一，避免同一语言多套配置冲突
- 启用 i18n，`primary`/`channels`/`hotline`/`callbackNote` 按 locale 区分
- `channels` 支持电话、Line、KakaoTalk、Zalo、微信、邮件等多渠道，与 subscription 的 `channel` 枚举对齐
- 停用配置（`isActive=false`）后前台不再展示，但不影响历史订阅

### 4.9 客户评价（review）

**用途**：管理客户评价、案例证言及回复。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_reviews

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| authorName | string | 是 | 评价人姓名，maxLength 100，localized |
| authorCompany | string | 否 | 评价人公司，maxLength 100 |
| authorTitle | string | 否 | 评价人职位，maxLength 50 |
| authorCountry | string | 是 | 评价人国家，maxLength 10 |
| routeId | string | 否 | 路线 ID，maxLength 50 |
| serviceProvider | string | 否 | 服务商，maxLength 50 |
| rating | integer | 是 | 评分（1-5） |
| content | text | 是 | 评价内容，localized |
| videoUrl | string | 否 | 视频地址，maxLength 500 |
| videoPoster | media | 否 | 视频封面图（single） |
| images | media | 否 | 评价图片（multiple） |
| testimonialType | enumeration | 是 | 证言类型：text / video / case_study，默认 text |
| isVerified | boolean | 是 | 是否已验证，默认 false |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| publishedAt | datetime | 否 | 发布时间 |
| status | enumeration | 是 | 状态：pending / approved / rejected，默认 pending |
| replyContent | text | 否 | 回复内容，localized |
| replyAt | datetime | 否 | 回复时间 |
| orderRef | string | 否 | 关联订单号，maxLength 50 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 客户评价 → 按 status/testimonialType/isFeatured 筛选
- **创建**：点击"创建" → 填写 authorName/authorCountry/rating/content → 选择 testimonialType → 可选上传 videoUrl/images → 保存
- **编辑**：选择记录 → 编辑（审核、填写 replyContent）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`pending → approved/rejected`
- `status=approved` 后前台展示，`isFeatured=true` 在首页/精选位优先展示
- `replyContent` 由运营回复，填写后回填 `replyAt`
- `isVerified` 标记是否核实真实客户，未核实评价不建议置顶
- `rating` 建议 1-5 整数，用于聚合评分统计
- 启用 i18n，`authorName`/`content`/`replyContent` 按 locale 区分

### 4.10 通知订阅（subscription）

**用途**：记录用户对追踪/报价/促销/Newsletter 的通知订阅。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_subscriptions

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| subscriberType | enumeration | 是 | 订阅类型：tracking_update / quote_reply / promotion / newsletter |
| channel | enumeration | 是 | 渠道：email / line / kakao / zalo / wechat / sms |
| channelTarget | string | 是 | 渠道目标（邮箱/账号/手机号），maxLength 200 |
| trackingNo | string | 否 | 关联运单号，maxLength 50 |
| quoteRequestId | string | 否 | 关联询价单 ID |
| eventFilter | json | 否 | 事件过滤条件 |
| frequency | enumeration | 是 | 频率：realtime / daily / weekly，默认 realtime |
| isActive | boolean | 是 | 是否启用，默认 true |
| subscribedAt | datetime | 是 | 订阅时间 |
| unsubscribedAt | datetime | 否 | 取消订阅时间 |
| language | string | 是 | 语言，maxLength 10 |
| lastNotifiedAt | datetime | 否 | 最后通知时间 |
| notifyCount | integer | 否 | 通知次数，默认 0 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 通知订阅 → 按 subscriberType/channel/isActive 筛选
- **创建**：主要由前台订阅行为自动写入；后台可点击"创建" → 选择 subscriberType/channel → 填写 channelTarget → 设置 frequency/language → 保存
- **编辑**：选择记录 → 编辑（如停用 isActive、回填 unsubscribedAt）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- `subscriberType=tracking_update` 需填 `trackingNo`，`quote_reply` 需填 `quoteRequestId`
- `channel` 与 contact-matrix 的 channels 对齐，确保渠道可用
- `frequency=realtime` 即时推送，`daily/weekly` 由聚合任务批量发送
- 用户取消订阅时置 `isActive=false` 并回填 `unsubscribedAt`，禁止再向其推送
- `eventFilter` 支持按节点类型、状态变更等过滤，避免噪音通知

### 4.11 营销落地页（landing-page）

**用途**：配置营销活动落地页内容与转化目标。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_landing_pages

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| slug | uid | 是 | URL slug |
| title | string | 是 | 标题，maxLength 200，localized |
| campaignName | string | 是 | 活动名称，maxLength 100 |
| utmSource | string | 是 | UTM 来源，maxLength 100 |
| utmMedium | string | 是 | UTM 媒介，maxLength 100 |
| utmCampaign | string | 是 | UTM 活动，maxLength 100 |
| utmContent | string | 否 | UTM 内容，maxLength 100 |
| utmTerm | string | 否 | UTM 关键词，maxLength 100 |
| conversionGoal | enumeration | 是 | 转化目标：quote_submit / contact_click / phone_call / download |
| heroContent | json | 是 | 首屏内容，localized |
| sections | json | 是 | 区块内容，localized |
| formConfig | json | 否 | 表单配置 |
| seoTitle | string | 否 | SEO 标题，maxLength 60，localized |
| seoDescription | string | 否 | SEO 描述，maxLength 160，localized |
| ogImage | media | 否 | Open Graph 图（single） |
| variant | string | 否 | A/B 测试变体标识，maxLength 20 |
| parentPageId | string | 否 | 父页面 ID |
| isActive | boolean | 是 | 是否启用，默认 true |
| startAt | datetime | 否 | 开始时间 |
| endAt | datetime | 否 | 结束时间 |
| publishedAt | datetime | 否 | 发布时间 |
| status | enumeration | 是 | 状态：draft / published / archived，默认 draft |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 营销落地页 → 按 status/campaignName/conversionGoal 筛选
- **创建**：点击"创建" → 填写 slug/title/campaignName → 设置 UTM 参数与 conversionGoal → 编辑 heroContent/sections → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`draft → published → archived`
- 业务概念状态由 `status` + `isActive` + `startAt`/`endAt`/`publishedAt` 组合判定：`draft`（草稿）→ `scheduled`（已发布但 startAt 未到）→ `active`（startAt~endAt 内且 published）→ `expired`（endAt 已过）
- `slug` 在站点内唯一，决定前台访问路径
- `conversionGoal` 与 conversion-event 联动，`funnel-tracker.track` 按目标记录转化事件
- `variant` 支持 A/B 测试，`parentPageId` 关联主页面用于变体归组
- 启用 i18n，`title`/`heroContent`/`sections`/`seoTitle`/`seoDescription` 按 locale 区分

### 4.12 转化漏斗（conversion-funnel）

**用途**：定义营销转化漏斗步骤及关联事件。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_conversion_funnels

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 漏斗名称，maxLength 100 |
| lang | string | 否 | 语言，maxLength 10 |
| steps | json | 是 | 漏斗步骤定义 |
| isActive | boolean | 是 | 是否启用，默认 true |
| events | relation → conversion-event | 否 | 关联转化事件（oneToMany，mappedBy funnel） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 转化漏斗 → 按 isActive/lang 筛选
- **创建**：点击"创建" → 填写 name → 编辑 steps（步骤数组）→ 保存
- **编辑**：选择记录 → 编辑 → 保存（被 events 引用时谨慎调整 steps 顺序）
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- `steps` 为有序步骤数组，每步含 `step`/`eventName`/`description` 等，与 conversion-event 的 `step`+`eventName` 对齐
- `events` 反向关联所有归属该漏斗的转化事件，用于漏斗分析
- 停用漏斗（`isActive=false`）后不再接收新事件，但历史事件保留
- `lang` 用于按语言区分漏斗配置，未设置则为站点默认语言

### 4.13 转化事件（conversion-event）

**用途**：记录用户在转化漏斗中的具体事件。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_conversion_events

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| funnel | relation → conversion-funnel | 是 | 关联漏斗（manyToOne，inversedBy events） |
| eventName | string | 是 | 事件名，maxLength 50 |
| step | integer | 是 | 漏斗步骤序号 |
| visitorId | string | 是 | 访客 ID，maxLength 100 |
| user | relation → users-permissions.user | 否 | 登录用户（manyToOne） |
| sessionId | string | 否 | 会话 ID，maxLength 100 |
| landingPageId | string | 否 | 落地页 ID |
| quoteRequestId | string | 否 | 询价单 ID |
| utmSource | string | 否 | UTM 来源，maxLength 100 |
| utmMedium | string | 否 | UTM 媒介，maxLength 100 |
| utmCampaign | string | 否 | UTM 活动，maxLength 100 |
| lang | string | 否 | 语言，maxLength 10 |
| ipAddress | string | 否 | IP，maxLength 45 |
| userAgent | string | 否 | UA，maxLength 500 |
| occurredAt | datetime | 是 | 事件发生时间 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 转化事件 → 按 funnel/eventName/step 筛选
- **创建**：主要由前台 `funnel-tracker.track` 自动写入；后台可点击"创建" → 选择 funnel → 填写 eventName/step/visitorId/occurredAt → 保存
- **编辑**：禁止编辑（事件数据不可变）
- **删除**：选择记录 → 删除（仅 logistics-manager 角色可批量清理）

#### 业务规则

- 事件数据不可变，禁止后台修改（保证漏斗分析准确性）
- `funnel`+`step`+`eventName` 三元组定位漏斗位置，由 `funnel-tracker.track` 写入
- `landingPageId`/`quoteRequestId` 串联落地页与询价单，构成完整转化路径
- `visitorId` 通过 cookie 持久化，`sessionId` 单次会话，与官网中心 visit-log 共享标识
- `ipAddress`/`userAgent` 为隐私数据，需遵循合规要求，建议定期脱敏

### 4.14 意向订单（intent-order）

**用途**：记录由询价转化的意向订单及履约状态。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_intent_orders

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| orderNo | string | 是 | 订单号，maxLength 50 |
| quoteRequestId | string | 是 | 关联询价单 ID |
| customerName | string | 是 | 客户名称，maxLength 100 |
| customerContact | string | 是 | 客户联系方式，maxLength 200 |
| customerType | enumeration | 否 | 客户类型：individual / business / fba_seller |
| confirmedPrice | json | 是 | 确认价格 |
| cargoSummary | json | 是 | 货物摘要 |
| routeSummary | json | 是 | 路线摘要 |
| plannedShipDate | date | 否 | 计划发货日 |
| actualShipDate | date | 否 | 实际发货日 |
| status | enumeration | 是 | 状态：intent / confirmed / shipping / delivered / cancelled，默认 intent |
| assignedTo | relation → admin::user | 否 | 负责人（manyToOne） |
| followUpRecords | json | 否 | 跟进记录 |
| contractSigned | boolean | 否 | 是否已签合同，默认 false |
| depositPaid | boolean | 否 | 是否已付定金，默认 false |
| depositAmount | decimal | 否 | 定金金额 |
| convertedToOrderId | string | 否 | 转化后的正式订单 ID |
| remark | text | 否 | 备注 |
| leadId | string | 否 | 关联线索 ID |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 意向订单 → 按 status/assignedTo/customerType 筛选
- **创建**：主要由询价单转化生成；后台可点击"创建" → 填写 orderNo/quoteRequestId/customerName/customerContact/confirmedPrice/cargoSummary/routeSummary → 保存
- **编辑**：选择记录 → 编辑（更新 status、回填 actualShipDate/convertedToOrderId）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`intent → confirmed → shipping → delivered`；取消分支 `cancelled`
- 订单转化全链路：`更新 status=delivered → 查 referral → referral-engine.markConverted → customer-aggregator.upsertFromOrder`
- `status=shipping` 时回填 `actualShipDate`，并联动创建 tracking-shipment
- `contractSigned`/`depositPaid` 为履约前置条件，建议签合同+付定金后再置 `confirmed`
- `assignedTo` 关联 admin::user，用于销售归属与业绩统计
- `convertedToOrderId` 标记正式订单系统 ID，完成转化后回填

### 4.15 推荐奖励（referral）

**用途**：记录推荐关系及奖励发放状态。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_referrals

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| referralCode | string | 是 | 推荐码，maxLength 50 |
| referrerName | string | 是 | 推荐人姓名，maxLength 100 |
| referrerContact | string | 是 | 推荐人联系方式，maxLength 200 |
| referrerCustomerId | string | 否 | 推荐人客户 ID |
| refereeName | string | 是 | 被推荐人姓名，maxLength 100 |
| refereeContact | string | 是 | 被推荐人联系方式，maxLength 200 |
| refereeCustomerId | string | 否 | 被推荐人客户 ID |
| referralChannel | enumeration | 是 | 推荐渠道：friend / community / exhibition / partner / other |
| referralSource | string | 否 | 推荐来源，maxLength 100 |
| status | enumeration | 是 | 状态：pending / contacted / qualified / converted / rewarded / invalid，默认 pending |
| quoteRequestId | string | 否 | 关联询价单 ID |
| intentOrderId | string | 否 | 关联意向订单 ID |
| rewardType | enumeration | 是 | 奖励类型：points / cash / discount / gift |
| rewardAmount | decimal | 否 | 奖励金额 |
| rewardStatus | enumeration | 否 | 奖励状态：pending / issued / claimed，默认 pending |
| rewardIssuedAt | datetime | 否 | 奖励发放时间 |
| conversionValue | decimal | 否 | 转化价值 |
| convertedAt | datetime | 否 | 转化时间 |
| remark | text | 否 | 备注 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 推荐奖励 → 按 status/rewardStatus/referralChannel 筛选
- **创建**：主要由前台 `referral-engine.applyCode` 自动写入；后台可点击"创建" → 填写 referralCode/referrer/referee 信息 → 选择 referralChannel/rewardType → 保存
- **编辑**：选择记录 → 编辑（更新 status、发放奖励）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 状态流转：`pending → contacted → qualified → converted → rewarded`；失效分支 `invalid`
- `rewardStatus` 流转：`pending → issued → claimed`
- 推荐码应用：询价提交时 `referral-engine.applyCode` 校验 `referralCode` 并创建 referral 记录
- 转化触发：intent-order `status=delivered` 时 `referral-engine.markConverted` 将 status 置 `converted`、回填 `convertedAt`/`conversionValue`
- 奖励发放：`rewardStatus=issued` 回填 `rewardIssuedAt`，`claimed` 表示被推荐人已领取
- `referralCode` 在站点内建议唯一，防止冲突

### 4.16 客户档案（customer-profile）

**用途**：聚合客户询价/订单数据，统一管理客户档案与生命周期。

**所属插件**：plugin::zhao-logistics
**集合名**：zhao_logistics_customer_profiles

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| site | relation → site-config | 是 | 关联站点（manyToOne） |
| name | string | 是 | 客户名称，maxLength 100 |
| contactPhone | string | 是 | 联系电话，maxLength 50 |
| contactEmail | string | 否 | 邮箱，maxLength 100 |
| contactLine | string | 否 | Line 账号，maxLength 100 |
| contactWechat | string | 否 | 微信号，maxLength 100 |
| contactKakao | string | 否 | KakaoTalk 账号，maxLength 100 |
| contactZalo | string | 否 | Zalo 账号，maxLength 100 |
| company | string | 否 | 公司，maxLength 100 |
| title | string | 否 | 职位，maxLength 50 |
| customerType | enumeration | 是 | 客户类型：individual / business / fba_seller |
| country | string | 是 | 国家，maxLength 10 |
| preferredLang | string | 否 | 偏好语言，maxLength 10 |
| preferredRoute | json | 否 | 偏好路线 |
| preferredService | json | 否 | 偏好服务 |
| totalQuoteCount | integer | 否 | 累计询价数，默认 0 |
| totalOrderCount | integer | 否 | 累计订单数，默认 0 |
| totalOrderValue | decimal | 否 | 累计订单金额，默认 0 |
| lastQuoteAt | datetime | 否 | 最后询价时间 |
| lastOrderAt | datetime | 否 | 最后订单时间 |
| lifecycleStage | enumeration | 是 | 生命周期阶段：lead / active / repeat / vip / churned，默认 lead |
| tags | json | 否 | 标签 |
| assignedTo | relation → admin::user | 否 | 负责人（manyToOne） |
| sourceChannel | string | 否 | 来源渠道，maxLength 50 |
| utmSource | string | 否 | UTM 来源，maxLength 100 |
| remark | text | 否 | 备注 |
| relatedLeadIds | json | 否 | 关联线索 ID 列表 |
| relatedQuoteIds | json | 否 | 关联询价单 ID 列表 |
| relatedOrderIds | json | 否 | 关联订单 ID 列表 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入物流中心 → 客户档案 → 按 lifecycleStage/customerType/assignedTo 筛选
- **创建**：主要由 `customer-aggregator.upsertFromQuote/upsertFromOrder` 自动聚合；后台可点击"创建" → 填写 name/contactPhone/customerType/country → 保存
- **编辑**：选择记录 → 编辑（补充联系方式、调整 assignedTo/tags）→ 保存
- **删除**：选择记录 → 删除（仅 logistics-manager 角色）

#### 业务规则

- 生命周期计算：由 `customer-aggregator` 根据 `totalQuoteCount`/`totalOrderCount`/`totalOrderValue` 自动计算 `lifecycleStage`
  - `lead`：仅询价无订单（`totalOrderCount=0`）
  - `active`：首单成交（`totalOrderCount=1`）
  - `repeat`：复购客户（`totalOrderCount≥2`）
  - `vip`：高价值客户（`totalOrderValue` 达阈值或 `totalOrderCount≥N`）
  - `churned`：长期未活跃（`lastOrderAt` 超过设定周期）
- 聚合来源：`upsertFromQuote` 在询价提交时按 `customerContact` 匹配/创建档案；`upsertFromOrder` 在订单转化时累加订单数据
- `relatedLeadIds`/`relatedQuoteIds`/`relatedOrderIds` 记录关联业务 ID，便于跨中心追溯
- `assignedTo` 关联 admin::user，用于销售归属与客户分配
- 多渠道联系字段与 contact-matrix/subscription 的 channel 对齐，支持多触点运营

---

## Ch5 课程中心

课程中心（menu.course-center）承载课程内容生产、课时管理、分类维护、用户授权与学习数据全链路，CT 由 `plugin::zhao-course` 提供。

权限结构：

```
menu.course-center（课程中心）
├── menu.course（课程管理）：course.read/create/update/publish/delete
├── menu.lesson（课时管理）：lesson.read/create/update/delete
├── menu.category（课程分类）：course-category.read/create/update/delete
└── menu.auth（用户授权）：user-course.read/grant
```

### 5.1 课程（course）

**用途**：管理课程主体信息、价格、状态与关联资源。

**所属插件**：plugin::zhao-course
**集合名**：zhao_courses

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | string | 是 | 课程标题 |
| slug | uid | 否 | URL slug，targetField title |
| description | text | 否 | 课程简介 |
| cover | media | 否 | 课程封面图（single） |
| thumbnail | media | 否 | 缩略图（single） |
| author | string | 否 | 讲师/作者 |
| difficulty | enumeration | 否 | 难度：beginner / intermediate / advanced / expert，默认 beginner |
| duration | string | 否 | 时长描述 |
| level | enumeration | 否 | 等级：introductory / foundation / advanced / professional，默认 introductory |
| language | enumeration | 否 | 语言：zh-CN / zh-TW / en-US / ja-JP / ko-KR，默认 zh-CN |
| keywords | json | 否 | 关键词列表 |
| studentCount | integer | 否 | 学员数，默认 0 |
| viewCount | integer | 否 | 浏览数，默认 0 |
| likeCount | integer | 否 | 点赞数，默认 0 |
| isFeatured | boolean | 否 | 是否精选，默认 false |
| isFree | boolean | 否 | 是否免费，默认 false |
| originalPrice | decimal | 否 | 原价，默认 0 |
| discountPrice | decimal | 否 | 优惠价，默认 0 |
| enrollStartDate | datetime | 否 | 报名开始时间 |
| enrollEndDate | datetime | 否 | 报名结束时间 |
| courseStartDate | datetime | 否 | 课程开始时间 |
| courseEndDate | datetime | 否 | 课程结束时间 |
| publishDate | datetime | 否 | 发布时间 |
| status | enumeration | 否 | 状态：draft / pending / published / archived，默认 draft |
| auditStatus | enumeration | 否 | 审核状态：pending / approved / rejected，默认 pending |
| rating | decimal | 否 | 评分，默认 0 |
| ratingCount | integer | 否 | 评分数，默认 0 |
| category | relation → course-category | 否 | 关联分类（manyToOne，inversedBy courses） |
| tags | relation → tag | 否 | 关联标签（manyToMany） |
| lessons | relation → course-lesson | 否 | 关联课时（oneToMany，mappedBy course） |
| quizzes | relation → quiz | 否 | 关联题目（oneToMany，mappedBy course） |
| exams | relation → quiz-exam | 否 | 关联考试（oneToMany，mappedBy course） |
| sort | integer | 否 | 排序，默认 0 |
| enablePoints | boolean | 否 | 是否启用积分，默认 false |
| points | integer | 否 | 积分数，默认 0 |
| pointsType | enumeration | 否 | 积分类型：course_points / lesson_points，默认 course_points |
| isPaid | boolean | 否 | 是否付费，默认 false |
| price | decimal | 否 | 价格，默认 0 |
| channelScope | enumeration | 否 | 渠道范围：all / specific，默认 all |
| channelIds | json | 否 | 渠道 ID 列表，默认 [] |
| allowCrossChannel | boolean | 否 | 是否允许跨渠道，默认 true |
| pointChannel | relation → channel | 否 | 积分渠道（manyToOne） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入课程中心 → 课程管理 → 按 status/auditStatus/category/isFeatured 筛选
- **创建**：点击"创建" → 填写 title → 选择 category/difficulty/level/language → 编辑 description/cover → 设置价格/时间 → 保存
- **编辑**：选择记录 → 编辑（如调整 lessons/quizzes/exams、变更 status）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）
- **发布**：草稿状态下点击"发布"（需 admin / channel-admin 角色）

#### 业务规则

- 状态流转：`draft → pending → published → archived`；`draft` 也可直接 `published`
- 审核流转：`auditStatus`：`pending → approved/rejected`，`approved` 是 `published` 的前置条件
- `channelScope=all` 全渠道可见，`specific` 时按 `channelIds` 限定可见渠道
- `isFree=true` 时忽略 `originalPrice`/`discountPrice`/`isPaid`/`price`
- `enablePoints=true` 时按 `pointsType` 发放积分（`course_points` 课程完成、`lesson_points` 课时完成）
- 启用 draftAndPublish，草稿/发布双态管理
- 关联 `lessons`/`quizzes`/`exams` 构成完整课程内容树

### 5.2 课时（course-lesson）

**用途**：管理课程下的课时内容、媒体资源与学习配置。

**所属插件**：plugin::zhao-course
**集合名**：zhao_course_lessons

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | string | 是 | 课时标题 |
| slug | uid | 否 | URL slug，targetField title |
| type | enumeration | 否 | 类型：video / audio / article / quiz，默认 video |
| thumbnail | media | 否 | 缩略图（single） |
| summary | text | 否 | 课时简介 |
| content | richtext | 否 | 课时正文 |
| video_url | string | 否 | 视频 URL |
| audio_url | string | 否 | 音频 URL |
| images | media | 否 | 图片（multiple） |
| attachments | media | 否 | 附件（multiple） |
| duration | integer | 否 | 时长（秒），默认 0 |
| isFreePreview | boolean | 否 | 是否免费预览，默认 false |
| previewDuration | integer | 否 | 免费预览时长（秒），默认 0 |
| sequenceNumber | integer | 否 | 序号，默认 0 |
| learningObjectives | text | 否 | 学习目标 |
| prerequisites | text | 否 | 前置要求 |
| completionThreshold | integer | 否 | 完成阈值（%），默认 100 |
| isRequired | boolean | 否 | 是否必修，默认 true |
| course | relation → course | 否 | 关联课程（manyToOne，inversedBy lessons） |
| tags | relation → tag | 否 | 关联标签（manyToMany） |
| quizzes | relation → quiz | 否 | 关联题目（oneToMany，mappedBy lesson） |
| exams | relation → quiz-exam | 否 | 关联考试（oneToMany，mappedBy lesson） |
| sort | integer | 否 | 排序，默认 0 |
| enablePoints | boolean | 否 | 是否启用积分，默认 false |
| points | integer | 否 | 积分数，默认 0 |
| pointsType | enumeration | 否 | 积分类型：lesson_points / quiz_points，默认 lesson_points |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入课程中心 → 课时管理 → 按 course/type/isRequired 筛选
- **创建**：点击"创建" → 填写 title → 选择 course/type → 编辑 content/video_url/audio_url → 保存
- **编辑**：选择记录 → 编辑（调整 sequenceNumber/sort、补充 attachments）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `type=video` 需填 `video_url`，`audio` 需填 `audio_url`，`article`/`quiz` 需编辑 `content`/关联 `quizzes`
- `isFreePreview=true` 时按 `previewDuration` 限时免费观看，超时转付费
- `isRequired=true` 为必修课时，影响课程完成度计算
- `completionThreshold` 控制视为完成的观看进度阈值（如 100 表示需完整观看）
- `sequenceNumber`/`sort` 决定课时排序，建议课程内唯一递增
- 关闭 draftAndPublish，直接发布
- 关联 `course` 后通过 `quizzes`/`exams` 承载随堂测试

### 5.3 课程分类（course-category）

**用途**：管理课程分类与渠道可见性。

**所属插件**：plugin::zhao-course
**集合名**：zhao_course_categories

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 分类名称 |
| description | text | 否 | 分类描述 |
| sort | integer | 否 | 排序，默认 0 |
| courses | relation → course | 否 | 关联课程（oneToMany，mappedBy category） |
| channelScope | enumeration | 否 | 渠道范围：all / specific，默认 all |
| channelIds | json | 否 | 渠道 ID 列表，默认 [] |
| allowCrossChannel | boolean | 否 | 是否允许跨渠道，默认 true |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入课程中心 → 课程分类 → 按 channelScope/sort 筛选
- **创建**：点击"创建" → 填写 name → 编辑 description → 设置 channelScope → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin 角色；被 courses 引用时建议先迁移）

#### 业务规则

- `channelScope=all` 全渠道可见，`specific` 时按 `channelIds` 限定
- `allowCrossChannel=true` 允许该分类下课程跨渠道共享
- `sort` 决定分类展示顺序
- 删除前应确认无关联课程，或先迁移至其他分类

### 5.4 用户课程授权（user-course-auth）

**用途**：管理用户对课程的访问授权与有效期。

**所属插件**：plugin::zhao-course
**集合名**：zhao_user_course_auths

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 授权用户（manyToOne） |
| course | relation → course | 否 | 关联课程（manyToOne） |
| authType | enumeration | 否 | 授权类型：free / paid / admin_grant，默认 free |
| expiresAt | datetime | 否 | 过期时间 |
| isExpired | boolean | 否 | 是否已过期，默认 false |
| channel | relation → channel | 否 | 授权所属渠道（manyToOne） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入课程中心 → 用户授权 → 按 authType/isExpired/course 筛选
- **创建/授权**：点击"授权管理" → 选择 user + course → 设置 authType/expiresAt → 保存（需 admin / channel-admin 角色）
- **编辑**：选择记录 → 编辑（如续期 expiresAt、撤销授权）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin 角色）

#### 业务规则

- `authType`：`free`（免费课自动授权）/`paid`（付费购买后授权）/`admin_grant`（后台手动授权）
- `expiresAt` 为空表示永久授权；过期后 `isExpired=true` 自动失效，用户无法继续学习
- 一条 user+course 建议唯一，避免重复授权
- `channel` 记录授权来源渠道，用于跨渠道运营统计
- 关闭 draftAndPublish，授权记录直接生效

### 5.5 课程学习记录（course-progress）

**用途**：记录用户在课程维度的学习进度与完成状态。

**所属插件**：plugin::zhao-course
**集合名**：zhao_course_progresses

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 学习用户（manyToOne） |
| course | relation → course | 否 | 关联课程（manyToOne） |
| completedLessons | integer | 否 | 已完成课时数，默认 0 |
| totalLessons | integer | 否 | 总课时数，默认 0 |
| progress | decimal | 否 | 进度百分比（0-100），默认 0 |
| isCompleted | boolean | 否 | 是否已完成课程，默认 false |
| pointsEarned | integer | 否 | 已获积分，默认 0 |
| isPointsClaimed | boolean | 否 | 积分是否已领取，默认 false |
| lessonPointsSummary | json | 否 | 课时积分汇总，默认 {} |
| lastStudyAt | datetime | 否 | 最后学习时间 |

#### 操作步骤

- **查看**：进入学习数据 → 课程进度 → 按 user/course/isCompleted 筛选
- **创建**：主要由前台学习行为自动写入；后台可点击"创建" → 选择 user+course → 保存
- **编辑**：选择记录 → 编辑（如人工标记 isCompleted、调整积分领取状态）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `progress` = `completedLessons` / `totalLessons` × 100，由系统按 lesson-progress 自动汇总
- `isCompleted=true` 当 `progress=100`（或满足课程完成阈值）
- `isPointsClaimed` 标记积分是否已发放到 point-center，避免重复发放
- `lessonPointsSummary` 缓存各课时积分明细，用于积分核算
- `lastStudyAt` 由 lesson-progress 写入时同步更新

### 5.6 课时学习记录（lesson-progress）

**用途**：记录用户在课时维度的学习进度、答题情况与积分。

**所属插件**：plugin::zhao-course
**集合名**：zhao_lesson_progresses

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 学习用户（manyToOne） |
| lesson | relation → course-lesson | 否 | 关联课时（manyToOne） |
| course | relation → course | 否 | 关联课程（manyToOne） |
| progress | decimal | 否 | 进度百分比（0-100），默认 0 |
| playPosition | integer | 否 | 播放位置（秒），默认 0 |
| duration | integer | 否 | 总时长（秒），默认 0 |
| isCompleted | boolean | 否 | 是否已完成，默认 false |
| isAnswered | boolean | 否 | 是否已答题，默认 false |
| isCorrect | boolean | 否 | 是否答对，默认 false |
| pointsEarned | integer | 否 | 已获积分，默认 0 |
| isPointsClaimed | boolean | 否 | 积分是否已领取，默认 false |
| calculatedPoints | integer | 否 | 计算积分，默认 0 |
| quizPointsDetail | json | 否 | 答题积分明细，默认 {} |
| lastStudyAt | datetime | 否 | 最后学习时间 |

#### 操作步骤

- **查看**：进入学习数据 → 课时进度 → 按 user/lesson/course/isCompleted 筛选
- **创建**：主要由前台播放/答题行为自动写入；后台可点击"创建" → 选择 user+lesson+course → 保存
- **编辑**：选择记录 → 编辑（如人工调整 isCompleted、积分状态）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `progress` 由播放进度或答题完成度计算，达到 `lesson.completionThreshold` 即 `isCompleted=true`
- `playPosition` 记录断点续播位置，`duration` 同步课时总时长
- `isAnswered`/`isCorrect` 仅对 `type=quiz` 课时有意义，记录随堂答题结果
- `pointsEarned`/`calculatedPoints`/`quizPointsDetail` 用于课时积分核算与防重发
- `isPointsClaimed=true` 后不再重复计入 course-progress 的 `lessonPointsSummary`
- 写入时同步更新对应 course-progress 的 `completedLessons`/`progress`/`lastStudyAt`

---

## Ch6 学习中心

学习中心（menu.study-center）在权限树中存在，但**无独立 Content Type**，所有学习数据由 `plugin::zhao-course` 的 `course-progress` 与 `lesson-progress` 承载。

### 6.1 数据来源

| 视图 | 数据来源 | 字段定义 |
|---|---|---|
| 课程进度 | `zhao_course_progresses` | 详见 [5.5 课程学习记录](#55-课程学习记录course-progress) |
| 课时进度 | `zhao_lesson_progresses` | 详见 [5.6 课时学习记录](#56-课时学习记录lesson-progress) |

### 6.2 权限结构

```
menu.study-center（学习数据）
├── menu.progress（课程进度）
│   ├── course-progress.read
│   └── course-progress.update
└── menu.lesson-progress（课时进度）
    ├── lesson-progress.read
    └── lesson-progress.update
```

### 6.3 角色与查看方式

- **可见角色**：admin / channel-admin / plugin-manager / instructor / user
- **查看路径**：后台进入"学习数据" → 课程进度 / 课时进度，按 user/course/isCompleted 筛选
- **数据写入来源**：所有数据由前台学习行为（播放、答题）自动写入，后台仅做查看与人工修正（如标记完成、调整积分领取状态）

### 6.4 业务规则

- 学习中心是**只读为主**的视图层，不维护独立 CT
- 写入路径统一由 `plugin::zhao-course` 的 progress 服务处理，避免双写不一致
- `study-manager` / `study-editor` 角色仅控制菜单可见性，实际数据操作权限沿用 course-progress/lesson-progress 的 action 配置

---

## Ch7 题库中心

题库中心（menu.quiz-center）承载题目生产、批量导入、考试配置、答题记录与考试记录全链路，CT 由 `plugin::zhao-quiz` 提供。

### 7.1 题目（quiz）

**用途**：管理题库题目、选项、答案与解析。

**所属插件**：plugin::zhao-quiz
**集合名**：zhao_quizzes

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | richtext | 是 | 题干 |
| type | enumeration | 是 | 题型：single_choice / multiple_choice / true_false / fill_blank / short_answer / essay / matching / ordering |
| options | json | 否 | 选项列表 |
| answer | text | 否 | 标准答案 |
| explanation | richtext | 否 | 答案解析 |
| difficulty | enumeration | 否 | 难度：easy / medium / hard，默认 medium |
| points | integer | 否 | 分值，默认 0 |
| sort | integer | 否 | 排序，默认 0 |
| isPublished | boolean | 否 | 是否发布，默认 false |
| course | relation → course | 否 | 关联课程（manyToOne，inversedBy quizzes） |
| lesson | relation → course-lesson | 否 | 关联课时（manyToOne，inversedBy quizzes） |
| tags | relation → tag | 否 | 关联标签（manyToMany） |
| exams | relation → quiz-exam | 否 | 关联考试（manyToMany，mappedBy questions） |
| channelScope | enumeration | 否 | 渠道范围：all / specific，默认 all |
| channelIds | json | 否 | 渠道 ID 列表，默认 [] |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入题库中心 → 题目 → 按 type/difficulty/isPublished/course 筛选
- **创建**：点击"创建" → 编辑 title（题干）→ 选择 type → 编辑 options/answer/explanation → 设置 difficulty/points → 保存
- **编辑**：选择记录 → 编辑（如修正答案、补充解析）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）
- **发布**：编辑 `isPublished=true`（需 admin / channel-admin / plugin-manager / instructor 角色）

#### 业务规则

- `type` 决定判分方式：`single_choice`/`multiple_choice`/`true_false`/`fill_blank` 自动判分；`short_answer`/`essay` 需人工评分
- `options` 为 JSON 数组，结构随 type 变化（如 matching 为配对、ordering 为有序列表）
- `answer` 对客观题存标准答案，主观题为参考答案
- `isPublished=false` 的题目不进入考试抽取池
- `channelScope=all` 全渠道可用，`specific` 时按 `channelIds` 限定
- 关联 `course`/`lesson` 后作为随堂题；关联 `exams` 后作为考试题
- 关闭 draftAndPublish，通过 `isPublished` 控制发布

### 7.2 批量导入（quiz-batch）

**用途**：批量导入题目文件及处理结果跟踪。

**所属插件**：plugin::zhao-quiz
**集合名**：zhao_quiz_batches

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 批次名称 |
| file | media | 否 | 导入文件（single） |
| templateFile | media | 否 | 模板文件（single） |
| totalCount | integer | 否 | 总数，默认 0 |
| successCount | integer | 否 | 成功数，默认 0 |
| errorCount | integer | 否 | 失败数，默认 0 |
| errors | json | 否 | 错误明细 |
| status | enumeration | 否 | 状态：pending / processing / completed / failed，默认 pending |
| course | relation → course | 否 | 关联课程（manyToOne） |
| lesson | relation → course-lesson | 否 | 关联课时（manyToOne） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入题库中心 → 批量导入 → 按 status/course 筛选
- **创建**：点击"创建" → 填写 name → 上传 file（按 templateFile 模板格式）→ 可选关联 course/lesson → 保存
- **编辑**：禁止编辑（导入结果不可变）
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- 状态流转：`pending → processing → completed/failed`
- `file` 必须符合 `templateFile` 格式，否则 `errorCount` 上升
- `errors` 记录每行失败原因（行号 + 错误信息），用于排查
- `successCount + errorCount = totalCount`，处理完成后 `status=completed`
- 导入成功的题目自动归属 `course`/`lesson`，可批量入题库
- 关闭 draftAndPublish，记录直接生效

### 7.3 考试配置（quiz-exam）

**用途**：配置考试规则、题目组卷与判分参数。

**所属插件**：plugin::zhao-quiz
**集合名**：zhao_quiz_exams

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | string | 是 | 考试标题 |
| description | text | 否 | 考试说明 |
| timeLimit | integer | 否 | 时长限制（分钟），默认 0（不限时） |
| passScore | decimal | 否 | 及格分，默认 60 |
| totalPoints | integer | 否 | 总分，默认 0 |
| questionCount | integer | 否 | 题目数，默认 0 |
| randomOrder | boolean | 否 | 是否乱序，默认 false |
| allowRetry | boolean | 否 | 是否允许重试，默认 true |
| maxAttempts | integer | 否 | 最大次数，默认 0（不限） |
| showResult | boolean | 否 | 是否显示结果，默认 true |
| questionPoints | json | 否 | 题目分值配置 |
| course | relation → course | 否 | 关联课程（manyToOne，inversedBy exams） |
| lesson | relation → course-lesson | 否 | 关联课时（manyToOne，inversedBy exams） |
| questions | relation → quiz | 否 | 关联题目（manyToMany，inversedBy exams） |
| channelScope | enumeration | 否 | 渠道范围：all / specific，默认 all |
| channelIds | json | 否 | 渠道 ID 列表，默认 [] |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入题库中心 → 考试配置 → 按 course/channelScope 筛选
- **创建**：点击"创建" → 填写 title → 设置 timeLimit/passScore/maxAttempts → 关联 questions → 编辑 questionPoints → 保存
- **编辑**：选择记录 → 编辑（如调整题目、修改 passScore）→ 保存（已有 attempt 时谨慎调整）
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `allowRetry=true` 时 `maxAttempts` 控制最大次数（0 表示不限）；`allowRetry=false` 时仅可考 1 次
- `passScore` 为及格线，`totalPoints` 由 `questionPoints` 汇总或手动设置
- `randomOrder=true` 时题目与选项均乱序，防止作弊
- `questionPoints` 为 JSON，按 questionId 配置分值，影响 `totalPoints`
- `showResult=true` 提交后立即展示成绩与解析
- `channelScope=all` 全渠道可用，`specific` 时按 `channelIds` 限定
- 关联 `course`/`lesson` 作为课程/课时考试；`questions` 多对多关联题目
- 关闭 draftAndPublish，配置直接生效

### 7.4 答题记录（quiz-record）

**用途**：记录用户单题作答、判分与积分明细。

**所属插件**：plugin::zhao-quiz
**集合名**：zhao_quiz_records

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 答题用户（manyToOne） |
| quiz | relation → quiz | 否 | 关联题目（manyToOne） |
| answer | json | 否 | 用户答案 |
| isCorrect | boolean | 否 | 是否答对 |
| score | decimal | 否 | 自动得分，默认 0 |
| teacherScore | decimal | 否 | 教师评分，默认 0 |
| scoringStatus | enumeration | 否 | 判分状态：pending / auto_graded / manual_graded，默认 pending |
| grader | relation → users-permissions.user | 否 | 评分人（manyToOne） |
| gradedAt | datetime | 否 | 评分时间 |
| totalPoints | integer | 否 | 总积分，默认 0 |
| submittedAt | datetime | 否 | 提交时间 |
| duration | integer | 否 | 用时（秒），默认 0 |
| course | relation → course | 否 | 关联课程（manyToOne） |
| lesson | relation → course-lesson | 否 | 关联课时（manyToOne） |

#### 操作步骤

- **查看**：进入题库中心 → 答题记录 → 按 user/quiz/scoringStatus/isCorrect 筛选
- **创建**：主要由前台答题行为自动写入；后台可点击"创建" → 选择 user+quiz → 编辑 answer → 保存
- **编辑**：选择记录 → 编辑（如人工评分 `teacherScore`、更新 scoringStatus）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）
- **导出**：支持按筛选条件导出（需 quiz-record.export 权限）

#### 业务规则

- 判分流转：`pending → auto_graded`（客观题自动）/`manual_graded`（主观题人工）
- 客观题（single/multiple/true_false/fill）按 `quiz.answer` 自动判分，置 `isCorrect` 与 `score`
- 主观题（short_answer/essay）`scoringStatus=pending`，由 `grader` 人工评 `teacherScore` 后置 `manual_graded`
- `totalPoints` = 客观 `score` + 主观 `teacherScore`，影响积分发放
- `course`/`lesson` 记录答题来源，用于随堂题统计
- 关闭 draftAndPublish，记录直接生效

### 7.5 考试记录（quiz-exam-attempt）

**用途**：记录用户参加考试的完整作答、得分与通过状态。

**所属插件**：plugin::zhao-quiz
**集合名**：zhao_quiz_exam_attempts

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 考试用户（manyToOne） |
| exam | relation → quiz-exam | 否 | 关联考试（manyToOne） |
| answers | json | 否 | 答卷内容 |
| totalScore | decimal | 否 | 总得分，默认 0 |
| isPassed | boolean | 否 | 是否通过 |
| startedAt | datetime | 否 | 开始时间 |
| submittedAt | datetime | 否 | 提交时间 |
| duration | integer | 否 | 用时（秒），默认 0 |
| attemptNumber | integer | 否 | 第几次尝试，默认 1 |

#### 操作步骤

- **查看**：进入题库中心 → 考试记录 → 按 user/exam/isPassed 筛选
- **创建**：主要由前台 `quiz-exam.submit` 自动写入；后台可点击"创建" → 选择 user+exam → 保存
- **编辑**：选择记录 → 编辑（如人工调整 `totalScore`、`isPassed`）→ 保存（需 quiz-exam-attempt.grade 权限）
- **删除**：选择记录 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `isPassed` 由 `totalScore >= exam.passScore` 判定
- `attemptNumber` 标识同一用户的考试次数，受 `exam.allowRetry`/`maxAttempts` 约束
  - `allowRetry=false`：仅允许 `attemptNumber=1`
  - `maxAttempts>0`：`attemptNumber` 不可超过 `maxAttempts`
- `duration` = `submittedAt - startedAt`，受 `exam.timeLimit` 限制
- `answers` 为 JSON，按 questionId 存储用户作答，关联 quiz-record 明细
- `totalScore` 由各题 `score`/`teacherScore` 汇总，主观题需人工评分后回填
- 关闭 draftAndPublish，记录直接生效

---

## Ch8 积分中心

积分中心（menu.point-center）承载积分类型、规则模板、获取/扣除规则、积分记录、商品兑换、自提点、签到与渠道核销全链路，CT 由 `plugin::zhao-point` 提供。

### 8.1 积分规则（point-rule）

**用途**：定义积分获取与扣除规则及频次限制。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_rules

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| action | string | 是 | 行为标识，唯一 |
| category | enumeration | 是 | 积分类别：increase / decrease |
| points | integer | 是 | 积分变动值 |
| description | string | 否 | 描述，maxLength 200 |
| enabled | boolean | 否 | 是否启用，默认 true |
| limitPerDay | integer | 否 | 每日总限制，默认 0（不限） |
| limitPerUser | integer | 否 | 每用户总限制，默认 0 |
| limitPerDayPerUser | integer | 否 | 每用户每日限制，默认 0 |
| isOneTime | boolean | 否 | 是否一次性，默认 false |
| startTime | time | 否 | 每日生效开始时间 |
| endTime | time | 否 | 每日生效结束时间 |
| applicableChannels | json | 否 | 适用渠道列表 |
| priority | integer | 否 | 优先级，默认 0 |
| taskGroup | enumeration | 否 | 任务分组：daily / interact / learn / social / onetime / other / redeem / penalty，默认 other |
| extraConfig | json | 否 | 扩展配置 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入积分中心 → 积分规则 → 按 category/taskGroup/enabled 筛选
- **创建**：点击"创建" → 填写 action/category/points → 设置 limitPerDay/isOneTime 等限制 → 保存
- **编辑**：选择规则 → 编辑（如调整 points、停用 enabled）→ 保存
- **删除**：选择规则 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- `category=increase` 为获取积分，`decrease` 为扣除积分
- `action` 全局唯一，作为积分记录的 `action` 来源键
- 限制优先级：`isOneTime`（一次性）> `limitPerUser`（总量）> `limitPerDayPerUser`（每日）> `limitPerDay`（全局每日）
- `startTime`/`endTime` 为日内时间窗，控制规则仅在每日该时段生效
- `taskGroup` 用于前台任务分组展示，`penalty`/`redeem` 为特殊分组
- `applicableChannels` 为空则全渠道适用，否则仅命中渠道触发
- 关闭 draftAndPublish，规则直接生效

### 8.2 规则模板（rule-template）

**用途**：沉淀积分规则预设与字段约束，便于批量创建规则。

**所属插件**：plugin::zhao-point
**集合名**：zhao_rule_templates

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 模板名称，maxLength 100 |
| description | text | 否 | 描述 |
| category | enumeration | 是 | 类别：increase / decrease |
| defaultPoints | integer | 否 | 默认积分值，默认 0 |
| defaultLimitPerDay | integer | 否 | 默认每日限制，默认 0 |
| defaultIsOneTime | boolean | 否 | 默认是否一次性，默认 false |
| configSchema | json | 是 | 配置字段 schema |
| builtIn | boolean | 否 | 是否内置模板，默认 false |
| enabled | boolean | 否 | 是否启用，默认 true |

#### 操作步骤

- **查看**：进入积分中心 → 规则模板 → 按 category/builtIn 筛选
- **创建**：点击"创建" → 填写 name/category → 编辑 configSchema → 设置默认值 → 保存
- **编辑**：选择模板 → 编辑 → 保存（`builtIn=true` 的模板建议不修改）
- **删除**：选择模板 → 删除（内置模板禁止删除）

#### 业务规则

- `configSchema` 定义由该模板创建规则时的可填字段与校验规则
- `builtIn=true` 为系统内置模板，不可删除，编辑需谨慎
- `defaultPoints`/`defaultLimitPerDay`/`defaultIsOneTime` 作为创建规则时的预填值
- 关闭 draftAndPublish，模板直接生效

### 8.3 积分记录（point-record）

**用途**：记录用户积分变动明细与变动后余额。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_records

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 是 | 用户（manyToOne） |
| action | string | 是 | 行为标识 |
| type | enumeration | 是 | 类型：increase（获取）/ decrease（消耗/扣除） |
| points | integer | 是 | 积分变动值 |
| balance | integer | 是 | 变动后余额 |
| source | string | 否 | 来源，maxLength 64 |
| method | string | 否 | 获取方式，maxLength 100 |
| orderId | string | 否 | 关联订单 ID，maxLength 64 |
| remark | text | 否 | 备注 |
| operator | relation → admin::user | 否 | 操作人（manyToOne，人工调整时回填） |
| expiresAt | datetime | 否 | 预计过期时间 |
| expiredAt | datetime | 否 | 实际过期时间 |
| channel | relation → zhao-channel.channel | 否 | 渠道（manyToOne） |
| userChannel | relation → zhao-channel.channel | 否 | 用户所属渠道（manyToOne） |

#### 操作步骤

- **查看**：进入积分中心 → 积分记录 → 按 user/type/channel/action 筛选
- **创建**：主要由业务行为自动写入；后台可点击"创建" → 选择 user → 填写 action/type/points/balance → 保存（需人工调整权限）
- **编辑**：禁止编辑（记录数据不可变，保证余额链准确）
- **删除**：选择记录 → 删除（仅 admin 角色，且需同步修正余额链）

#### 业务规则

- `type=increase` 表示获取积分，`decrease` 表示消耗或扣除
- `balance` 为本次变动后的用户余额，必须与前一条记录余额衔接，构成不可篡改的余额链
- `action` 对应 point-rule 的 `action`，`source`/`method` 标记触发来源与方式
- `operator` 仅在人工调整（adjust）时回填，关联 admin::user
- `expiresAt`/`expiredAt` 配合 point-config 的 `expiryEnabled`，过期积分由定时任务清理
- `channel` 为发生渠道，`userChannel` 为用户归属渠道，跨渠道场景二者可能不同
- 关闭 draftAndPublish，记录直接生效

### 8.4 积分配置（point-config）

**用途**：积分模块全局开关、兑换与过期策略配置。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_configs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| moduleEnabled | boolean | 否 | 模块总开关，默认 true |
| earnEnabled | boolean | 否 | 获取积分开关，默认 true |
| redeemEnabled | boolean | 否 | 兑换开关，默认 true |
| expiryEnabled | boolean | 否 | 过期机制开关，默认 false |
| expiryDays | integer | 否 | 积分有效期天数，默认 365 |
| expiryReminderDays | integer | 否 | 过期提前提醒天数，默认 7 |
| minRedeemPoints | integer | 否 | 最小兑换积分，默认 0 |
| maxDailyEarn | integer | 否 | 每日获取上限，默认 0（不限） |
| defaultExchangeRate | decimal(10,2) | 否 | 默认兑换率，默认 1.00 |
| remark | text | 否 | 备注 |
| signInEnabled | boolean | 否 | 签到开关，默认 true |
| tasksEnabled | boolean | 否 | 任务体系开关，默认 true |
| quizRetryEnabled | boolean | 否 | 题库重试获积分开关，默认 true |
| quizMaxRetryCount | integer | 否 | 题库最大重试次数，默认 1 |
| maxDailyQuiz | integer | 否 | 每日题库获积分上限，默认 3 |
| tencentMapKey | string | 否 | 腾讯地图 key（自提点定位） |

#### 操作步骤

- **查看**：进入积分中心 → 积分配置 → 查看当前全局配置
- **创建/编辑**：通常仅一条全局配置；选择记录 → 编辑各开关与阈值 → 保存
- **删除**：不建议删除（全局唯一配置）

#### 业务规则

- `moduleEnabled` 为总开关，关闭后所有积分行为停止
- `earnEnabled`/`redeemEnabled` 分别控制获取与兑换，可独立开关
- `expiryEnabled=true` 时启用积分过期，`expiryDays` 控制有效期，`expiryReminderDays` 控制提醒
- `minRedeemPoints` 限制单次兑换最低积分门槛
- `maxDailyEarn` 限制单用户每日获取上限，0 表示不限
- 题库相关配置与 quiz-center 联动：`quizRetryEnabled` 控制重试是否获积分，`maxDailyQuiz` 限制每日获积分题数
- 关闭 draftAndPublish，配置直接生效

### 8.5 积分类型（point-type）

**用途**：定义积分分类与独立过期策略。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_types

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 类型名称 |
| code | string | 是 | 类型编码，唯一 |
| description | string | 否 | 描述，maxLength 500 |
| enabled | boolean | 否 | 是否启用，默认 true |
| canExpire | boolean | 否 | 该类型积分是否可过期，默认 false |
| expireDays | integer | 否 | 过期天数，默认 365 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入积分中心 → 积分类型 → 按 enabled 筛选
- **创建**：点击"创建" → 填写 name/code → 设置 canExpire/expireDays → 保存
- **编辑**：选择类型 → 编辑 → 保存（`code` 已被引用时不建议修改）
- **删除**：选择类型 → 删除（已被 point-record 引用时谨慎）

#### 业务规则

- `code` 全局唯一，作为积分记录与规则的类型标识
- `canExpire=true` 时该类型积分按 `expireDays` 独立过期，覆盖 point-config 全局策略
- `expireDays` 仅在 `canExpire=true` 时生效
- 关闭 draftAndPublish，类型直接生效

### 8.6 积分商品（point-product）

**用途**：管理积分商城商品、库存、配送与销售模式。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_products

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 商品名称，maxLength 100 |
| subtitle | string | 否 | 副标题，maxLength 200 |
| description | text | 否 | 描述 |
| detail | richtext | 否 | 详情 |
| category | string | 否 | 分类，maxLength 50 |
| coverImage | media | 否 | 封面图（single，images） |
| images | media | 否 | 图片集（multiple，images） |
| video | media | 否 | 视频（single，videos） |
| pointsCost | integer | 是 | 积分价格 |
| originalPrice | decimal(10,2) | 否 | 原价 |
| stock | integer | 否 | 剩余库存，默认 0 |
| totalStock | integer | 否 | 总库存，默认 0 |
| deliveryType | enumeration | 是 | 配送方式：self_pickup / express / both |
| salesMode | enumeration | 否 | 销售模式：points_only / purchase_only / hybrid，默认 points_only |
| price | decimal(10,2) | 否 | 现金价格（hybrid/purchase_only 时使用） |
| channel | relation → zhao-channel.channel | 否 | 归属渠道（manyToOne） |
| allowCrossChannel | boolean | 否 | 允许跨渠道兑换，默认 false |
| allowGlobalPoints | boolean | 否 | 允许全局积分兑换，默认 true |
| status | enumeration | 否 | 上下架状态：on_shelf / off_shelf，默认 on_shelf |
| maxPerUser | integer | 否 | 每用户限购，默认 0（不限） |
| sortOrder | integer | 否 | 排序，默认 0 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入积分中心 → 积分商品 → 按 status/category/channel 筛选
- **创建**：点击"创建" → 填写 name/pointsCost → 选择 deliveryType/salesMode → 上传封面/图片 → 设置库存 → 保存
- **编辑**：选择商品 → 编辑（如调整 stock、上下架 status）→ 保存
- **删除**：选择商品 → 删除（仅 admin / channel-admin / plugin-manager 角色）

#### 业务规则

- 状态流转：`on_shelf`（上架）↔ `off_shelf`（下架），下架后前台不可见
- `deliveryType`：`self_pickup` 仅自提、`express` 仅快递、`both` 两者皆可
- `salesMode`：`points_only` 纯积分、`purchase_only` 纯现金、`hybrid` 积分+现金
- `stock` 随兑换扣减，`totalStock` 为历史总量，`stock=0` 时自动不可兑
- `maxPerUser>0` 限制单用户兑换数量
- `allowCrossChannel=false` 时仅本渠道用户可兑，`allowGlobalPoints` 控制是否允许跨类型积分
- 关闭 draftAndPublish，商品直接生效

### 8.7 积分兑换（point-redemption）

**用途**：记录用户积分兑换订单及履约状态。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_redemptions

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 是 | 兑换用户（manyToOne） |
| product | relation → point-product | 否 | 关联商品（manyToOne） |
| itemName | string | 是 | 商品名称，maxLength 100 |
| pointsCost | integer | 是 | 单个积分价 |
| quantity | integer | 否 | 数量，默认 1 |
| totalCost | integer | 是 | 总积分消耗 |
| status | enumeration | 否 | 状态：pending / approved / rejected / shipped / completed / cancelled，默认 pending |
| deliveryType | enumeration | 否 | 配送方式：self_pickup / express |
| pickupCode | string | 否 | 自提码，maxLength 20 |
| pickupLocation | relation → pickup-location | 否 | 自提点（manyToOne） |
| salesMode | enumeration | 否 | 销售模式：points_only / purchase_only / hybrid |
| priceAmount | decimal(10,2) | 否 | 现金金额 |
| pointsAmount | integer | 否 | 积分金额 |
| expressCompany | string | 否 | 快递公司，maxLength 50 |
| trackingNumber | string | 否 | 快递单号，maxLength 100 |
| receiverName | string | 否 | 收货人，maxLength 50 |
| receiverPhone | string | 否 | 收货电话，maxLength 20 |
| receiverAddress | text | 否 | 收货地址 |
| remark | text | 否 | 备注 |
| operator | relation → admin::user | 否 | 操作人（manyToOne） |
| completedAt | datetime | 否 | 完成时间 |
| channel | relation → zhao-channel.channel | 否 | 渠道（manyToOne） |
| deductionDetail | json | 否 | 积分扣减明细 |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入积分中心 → 积分兑换 → 按 status/deliveryType/user 筛选
- **创建**：主要由前台兑换行为自动写入；后台可点击"创建" → 选择 user/product → 填写 totalCost → 保存
- **编辑**：选择订单 → 编辑（更新 status、回填 trackingNumber/completedAt）→ 保存
- **删除**：选择订单 → 删除（仅 admin / channel-admin 角色）

#### 业务规则

- 状态流转：`pending`（待处理）→ `approved`（已审核）→ `shipped`（已发货）→ `completed`（已完成）；分支 `rejected`（拒绝）/ `cancelled`（取消）
- `deliveryType=self_pickup` 需关联 `pickupLocation` 并生成 `pickupCode`，核销后置 `completed`
- `deliveryType=express` 需在 `shipped` 时回填 `expressCompany`/`trackingNumber`，签收后置 `completed` 并回填 `completedAt`
- `totalCost = pointsCost × quantity`，`deductionDetail` 记录多积分类型扣减明细
- `salesMode=hybrid` 时 `priceAmount`+`pointsAmount` 组合支付
- 兑换扣减积分写入 point-record（type=decrease），取消/拒绝需逆向回补
- 关闭 draftAndPublish，订单直接生效

### 8.8 自提点（pickup-location）

**用途**：维护商品自提点位置与营业信息。

**所属插件**：plugin::zhao-point
**集合名**：zhao_pickup_locations

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 自提点名称，maxLength 100 |
| address | text | 否 | 地址 |
| latitude | decimal(10,7) | 否 | 纬度 |
| longitude | decimal(10,7) | 否 | 经度 |
| phone | string | 否 | 联系电话，maxLength 20 |
| businessHours | string | 否 | 营业时间，maxLength 200 |
| businessLicense | media | 否 | 营业执照（single，images） |
| coverImage | media | 否 | 封面图（single，images） |
| description | text | 否 | 描述 |
| status | enumeration | 否 | 状态：active / inactive，默认 active |
| sortOrder | integer | 否 | 排序，默认 0 |
| channels | relation → zhao-channel.channel | 否 | 关联渠道（manyToMany） |
| deletedAt | datetime | 否 | 软删除时间戳 |

#### 操作步骤

- **查看**：进入积分中心 → 自提点 → 按 status 筛选
- **创建**：点击"创建" → 填写 name/address → 设置经纬度与营业时间 → 关联 channels → 保存
- **编辑**：选择自提点 → 编辑（如停用 status=inactive）→ 保存
- **删除**：选择自提点 → 删除（被 point-redemption 引用时谨慎）

#### 业务规则

- `status=active` 的自提点才可在兑换时选择
- `latitude`/`longitude` 用于前台地图定位，配合 point-config 的 `tencentMapKey`
- `channels` 为空则全渠道可见，否则仅关联渠道用户可选
- 关闭 draftAndPublish，自提点直接生效

### 8.9 签到记录（sign-in-record）

**用途**：记录用户每日签到及连签奖励。

**所属插件**：plugin::zhao-point
**集合名**：zhao_point_sign_in_records

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 是 | 签到用户（manyToOne） |
| signInDate | date | 是 | 签到日期 |
| streakDays | integer | 否 | 连续签到天数，默认 1 |
| pointsEarned | integer | 否 | 本次获得积分，默认 0 |
| isStreakReward | boolean | 否 | 是否为连签奖励，默认 false |

#### 操作步骤

- **查看**：进入积分中心 → 签到记录 → 按 user/signInDate 筛选
- **创建**：主要由前台签到行为自动写入；后台可点击"创建" → 选择 user → 填写 signInDate → 保存
- **编辑**：禁止编辑（签到数据不可变）
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `user`+`signInDate` 唯一，同一用户每日仅可签到一次
- `streakDays` 由前一天记录推算，连续签到累加，中断归 1
- `isStreakReward=true` 表示该条为连签里程碑奖励，`pointsEarned` 为奖励积分
- 签到获积分由 point-rule 中 `taskGroup=daily` 的规则触发，写入 point-record
- 关闭 draftAndPublish，记录直接生效

### 8.10 渠道核销（channel-verification）

**用途**：记录渠道上下级核销行为的审计日志。

**所属插件**：plugin::zhao-point
**集合名**：zhao_channel_verifications

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| verifier | relation → users-permissions.user | 是 | 核销人（manyToOne） |
| verifiedUser | relation → users-permissions.user | 是 | 被核销用户（manyToOne） |
| channel | relation → zhao-channel.channel | 是 | 核销渠道（manyToOne） |
| direction | enumeration | 是 | 方向：superior_to_subordinate / subordinate_to_superior |
| method | enumeration | 是 | 方式：qr_scan / manual |
| status | enumeration | 否 | 状态：pending / approved / rejected，默认 pending |
| qrCodeToken | string | 否 | 二维码 token，唯一，maxLength 64 |
| qrCodeExpiresAt | datetime | 否 | 二维码过期时间 |
| location | json | 否 | 核销位置信息 |
| remark | text | 否 | 备注 |
| verifiedAt | datetime | 否 | 核销完成时间 |

#### 操作步骤

- **查看**：进入积分中心 → 渠道核销 → 按 status/direction/method 筛选
- **创建**：主要由扫码核销行为自动写入；后台可点击"创建" → 选择 verifier/verifiedUser/channel → 设置 direction/method → 保存
- **编辑**：选择记录 → 编辑（更新 status、回填 verifiedAt）→ 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin 角色）

#### 业务规则

- `direction` 标识核销方向：`superior_to_subordinate`（上级核销下级）/ `subordinate_to_superior`（下级核销上级）
- `method=qr_scan` 需生成 `qrCodeToken` 并设置 `qrCodeExpiresAt`，过期后不可核销
- 状态流转：`pending`（待核销）→ `approved`（已通过）/ `rejected`（已拒绝），通过时回填 `verifiedAt`
- `location` 记录核销时的地理位置，用于风控审计
- 核销通过后联动渠道成员关系与积分发放
- 关闭 draftAndPublish，记录直接生效

---

## Ch9 营销中心

营销中心（menu.marketing-center）承载渠道层级树、用户渠道归属、邀请码分销链与渠道成员管理，CT 由 `plugin::zhao-channel` 提供。

### 9.1 渠道（channel）

**用途**：管理渠道层级树及站点关联，作为多租户顶层隔离单元。

**所属插件**：plugin::zhao-channel
**集合名**：zhao_channels

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 渠道名称，maxLength 100 |
| code | string | 是 | 渠道编码，唯一，maxLength 32 |
| channelTier | enumeration | 是 | 渠道层级：root / core / senior / global / authorized / official / partner / agent / national / regional / city / county / local / store，默认 store |
| parentChannel | relation → channel | 否 | 父级渠道（manyToOne，inversedBy childChannels） |
| childChannels | relation → channel | 否 | 子级渠道（oneToMany，mappedBy parentChannel） |
| sites | relation → site-config | 否 | 关联站点（manyToMany，inversedBy channels） |
| status | boolean | 否 | 启用状态，默认 true |
| description | text | 否 | 描述 |
| path | text | 否 | 层级路径 |
| depth | integer | 否 | 层级深度，默认 0，min 0 max 7 |
| deletedAt | datetime | 否 | 软删除时间戳 |
| extraConfig | json | 否 | 扩展配置，默认 "{}" |

#### 操作步骤

- **查看**：进入营销中心 → 渠道 → 按 channelTier/status/parentChannel 筛选
- **创建**：点击"创建" → 填写 name/code → 选择 channelTier 与 parentChannel → 关联 sites → 保存
- **编辑**：选择渠道 → 编辑（如调整层级、停用 status）→ 保存（`code` 已被引用时不建议修改）
- **删除**：选择渠道 → 删除（存在子渠道时禁止删除）

#### 业务规则

- `code` 全局唯一，作为渠道标识贯穿各中心
- `channelTier` 定义渠道等级，`root` 为顶层根渠道，`store` 为最末级门店
- `parentChannel`/`childChannels` 构成自引用层级树，`depth` 标识层级深度（最大 7 层）
- `path` 缓存完整层级路径，用于快速查询祖先/后代
- `sites` 关联该渠道可访问的站点（manyToMany），一个渠道可关联多站点
- `status=false` 停用渠道，其下用户与内容不再生效
- 关闭 draftAndPublish，渠道直接生效

### 9.2 用户渠道关联（user-channel）

**用途**：记录用户与渠道的归属关系及授权来源。

**所属插件**：plugin::zhao-channel
**集合名**：zhao_user_channels

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 用户（manyToOne） |
| channel | relation → channel | 否 | 渠道（manyToOne） |
| grantedBy | relation → users-permissions.user | 否 | 授权人（manyToOne） |

#### 操作步骤

- **查看**：进入营销中心 → 用户渠道关联 → 按 user/channel 筛选
- **创建**：点击"创建" → 选择 user/channel → 选择 grantedBy → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 admin / channel-admin 角色）

#### 业务规则

- 一个用户可关联多个渠道（多对多），实现跨渠道归属
- `grantedBy` 记录授权操作人，用于审计
- 该关系为积分记录 `userChannel`、兑换 `channel` 等字段的来源
- 关闭 draftAndPublish，记录直接生效

### 9.3 用户邀请码（user-invite）

**用途**：管理用户邀请码与分销链信息。

**所属插件**：plugin::zhao-channel
**集合名**：zhao_user_invites

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → users-permissions.user | 否 | 所属用户（oneToOne） |
| inviteCode | string | 是 | 邀请码，唯一，maxLength 16 |
| invitedBy | relation → users-permissions.user | 否 | 邀请人（manyToOne） |
| inviteChannel | relation → channel | 否 | 邀请归属渠道（manyToOne） |
| inviteMethod | enumeration | 否 | 邀请方式：invite_code / organic，默认 organic |
| distributionPath | text | 否 | 分销路径 |
| distributionDepth | integer | 否 | 分销深度，默认 0，min 0 max 2 |

#### 操作步骤

- **查看**：进入营销中心 → 用户邀请码 → 按 inviteMethod/inviteChannel 筛选
- **创建**：点击"创建" → 选择 user → 填写 inviteCode → 设置 invitedBy/inviteChannel → 保存
- **编辑**：选择记录 → 编辑 → 保存（`inviteCode` 已被使用时不建议修改）
- **删除**：选择记录 → 删除（仅 admin / channel-admin 角色）

#### 业务规则

- `user` 为 oneToOne，每个用户对应一条邀请码记录
- `inviteCode` 全局唯一，作为用户专属邀请码
- `inviteMethod`：`invite_code` 通过邀请码注册、`organic` 自然注册
- `distributionDepth` 限制分销层级（最大 2 层），`distributionPath` 缓存完整上级链
- `invitedBy` 记录直接邀请人，与 sso-referral-relation 联动构建推荐树
- 关闭 draftAndPublish，记录直接生效

### 9.4 渠道成员关联（channel-member）

**用途**：管理渠道成员及成员角色。

**所属插件**：plugin::zhao-channel
**集合名**：zhao_channel_members

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| channel | relation → channel | 否 | 渠道（manyToOne，inversedBy members） |
| user | relation → users-permissions.user | 否 | 成员用户（manyToOne） |
| role | enumeration | 是 | 成员角色：owner / admin / member，默认 member |
| invitedBy | relation → users-permissions.user | 否 | 邀请人（manyToOne） |
| isCurrent | boolean | 否 | 是否为用户当前渠道，默认 false |

#### 操作步骤

- **查看**：进入营销中心 → 渠道成员关联 → 按 channel/role 筛选
- **创建**：点击"创建" → 选择 channel/user → 设置 role → 保存
- **编辑**：选择记录 → 编辑（如调整 role、设置 isCurrent）→ 保存
- **删除**：选择记录 → 删除（`owner` 角色禁止删除）

#### 业务规则

- `role`：`owner`（渠道所有者）/ `admin`（渠道管理员）/ `member`（普通成员）
- `isCurrent=true` 标识用户当前活跃渠道，同一用户仅一条 `isCurrent=true`
- `owner` 为渠道创建者，每个渠道仅一个，不可删除
- `invitedBy` 记录邀请加入的操作人
- 关闭 draftAndPublish，记录直接生效

---

## Ch10 系统中心

系统中心（menu.system-center）聚合多租户站点配置、SSO 身份体系、三方登录与权限管理，CT 跨 `plugin::zhao-common`、`plugin::zhao-sso`、`plugin::zhao-third`、`plugin::zhao-auth` 四个插件。

### 10.1 站点配置（site-config）

**用途**：多租户站点核心配置，定义品牌、SEO、功能开关与渠道归属。

**所属插件**：plugin::zhao-common
**集合名**：zhao_site_configs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| siteName | string | 否 | 站点名称，maxLength 100 |
| siteDescription | text | 否 | 站点描述 |
| logo | media | 否 | Logo（single，images） |
| favicon | media | 否 | favicon（single，images） |
| icpNumber | string | 否 | ICP 备案号，maxLength 50 |
| seoKeywords | string | 否 | SEO 关键词，maxLength 500 |
| seoDescription | text | 否 | SEO 描述 |
| tencentMapKey | string | 否 | 腾讯地图 key，maxLength 64 |
| shareTitle | string | 否 | 分享标题，maxLength 100 |
| shareDescription | string | 否 | 分享描述，maxLength 200 |
| shareImage | media | 否 | 分享图（single，images） |
| customerServiceUrl | string | 否 | 客服链接，maxLength 500 |
| domain | string | 否 | 站点域名，唯一，maxLength 255 |
| channels | relation → channel | 否 | 关联渠道（manyToMany，mappedBy sites） |
| featureFlags | json | 否 | 功能开关：sso / points / quiz / course / channel / thirdParty / oss / website |
| template | relation → site-template | 否 | 站点模板（manyToOne，inversedBy sites） |
| extraConfig | json | 否 | 扩展配置 |
| themeConfig | json | 否 | 主题配置，默认 "{}" |
| channelUsage | enumeration | 是 | 渠道使用模式：site_only / site_and_cross / site_cross_user，默认 site_cross_user |
| tags | relation → tag | 否 | 标签（oneToMany，mappedBy site） |
| tagGroups | relation → tag-group | 否 | 标签分组（oneToMany，mappedBy site） |
| website_* | relation | 否 | 官网中心内容关联（article / case / faq / tutorial / product 等共 15 项 oneToMany） |
| logistics_* | relation | 否 | 物流中心内容关联（quote-request / tracking-shipment / landing-page 等共 15 项 oneToMany） |

#### 操作步骤

- **查看**：进入系统中心 → 站点配置 → 按 domain/channelUsage 筛选
- **创建**：点击"创建" → 填写 siteName/domain → 配置品牌与 SEO → 设置 featureFlags → 关联 channels → 保存
- **编辑**：选择站点 → 编辑（如调整 featureFlags、切换 channelUsage）→ 保存
- **删除**：选择站点 → 删除（仅 admin 角色，存在关联内容时禁止删除）

#### 业务规则

- 多租户核心：`domain` 全局唯一，决定前台访问入口
- `channels` 关联该站点所属渠道（manyToMany），一个站点可属多个渠道
- `featureFlags` 为功能开关 JSON，控制各中心模块在站点的启用状态
- `channelUsage` 定义渠道使用模式：`site_only`（仅站点）/ `site_and_cross`（站点+跨站）/ `site_cross_user`（站点+跨站+用户，默认）
- `template` 关联 site-template，创建时可继承模板预设
- `website_*`/`logistics_*` 反向聚合各中心归属本站点的内容，用于级联查询与清理
- `tags`/`tagGroups` 关联标签体系，站点级标签仅本站可见
- 关闭 draftAndPublish，配置直接生效

### 10.2 站点模板（site-template）

**用途**：定义租户配置模板的预设值与字段约束。

**所属插件**：plugin::zhao-common
**集合名**：zhao_site_templates

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 模板名称，maxLength 100 |
| displayName | string | 否 | 显示名称，maxLength 100 |
| description | text | 否 | 描述 |
| presetConfig | json | 是 | 预设配置 |
| fieldConstraints | json | 是 | 字段约束 |
| enabled | boolean | 否 | 是否启用，默认 true |
| isDefault | boolean | 否 | 是否默认模板，默认 false |
| sites | relation → site-config | 否 | 应用该模板的站点（oneToMany，mappedBy template） |
| themeConfig | json | 否 | 主题配置，默认 "{}" |

#### 操作步骤

- **查看**：进入系统中心 → 站点模板 → 按 enabled/isDefault 筛选
- **创建**：点击"创建" → 填写 name → 编辑 presetConfig/fieldConstraints → 保存
- **编辑**：选择模板 → 编辑 → 保存（已被站点引用时谨慎修改约束）
- **删除**：选择模板 → 删除（`isDefault=true` 或被引用时禁止删除）

#### 业务规则

- `presetConfig` 为创建站点时的预填配置，`fieldConstraints` 定义字段校验规则
- `isDefault=true` 的模板为系统默认，新建站点未指定模板时使用
- `sites` 反向关联所有应用该模板的站点
- `themeConfig` 定义主题预设，可被 site-config 的 `themeConfig` 继承
- 关闭 draftAndPublish，模板直接生效

### 10.3 SSO 用户（sso-user）

**用途**：SSO 中心化用户主表，记录身份与登录状态。

**所属插件**：plugin::zhao-sso
**集合名**：sso_users

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| uuid | string | 是 | 用户 UUID，唯一 |
| username | string | 否 | 用户名，唯一 |
| mobile | string | 否 | 手机号，唯一 |
| email | email | 否 | 邮箱，唯一 |
| password_hash | string | 否 | 密码哈希 |
| avatar_url | string | 否 | 头像 URL |
| nickname | string | 否 | 昵称 |
| status | enumeration | 是 | 状态：active / blocked / inactive，默认 active |
| register_channel | string | 否 | 注册渠道 |
| last_login_channel | string | 否 | 最后登录渠道 |
| invite_code_used | string | 否 | 注册时使用的邀请码 |
| invited_by | integer | 否 | 邀请人 ID |
| utm_source | string | 否 | UTM 来源 |
| utm_medium | string | 否 | UTM 媒介 |
| utm_campaign | string | 否 | UTM 活动 |
| last_login_at | datetime | 否 | 最后登录时间 |
| login_count | integer | 是 | 登录次数，默认 0 |
| password_changed_at | datetime | 否 | 密码修改时间 |
| third_party_bindings | relation → sso-third-party-binding | 否 | 三方绑定（oneToMany，mappedBy user） |

#### 操作步骤

- **查看**：进入系统中心 → SSO 用户 → 按 status/register_channel 筛选
- **创建**：主要由注册流程自动写入；后台可点击"创建" → 填写 uuid/username/mobile → 设置 status → 保存
- **编辑**：选择用户 → 编辑（如封禁 status=blocked、重置密码）→ 保存
- **删除**：选择用户 → 删除（仅 admin 角色，需同步清理关联令牌与绑定）

#### 业务规则

- `uuid` 全局唯一，为 SSO 用户主标识；`username`/`mobile`/`email` 各自唯一
- `status`：`active`（正常）/ `blocked`（封禁）/ `inactive`（未激活），`blocked` 后禁止登录
- `login_count` 每次成功登录+1，`last_login_at`/`last_login_channel` 记录最近登录
- `invite_code_used`/`invited_by` 记录注册来源，与 sso-referral-relation 联动
- `register_channel` 标识注册渠道，用于渠道归因
- `third_party_bindings` 反向关联所有三方账号绑定
- 关闭 draftAndPublish，用户直接生效

### 10.4 SSO 应用（sso-app）

**用途**：注册接入 SSO 的应用及授权配置。

**所属插件**：plugin::zhao-sso
**集合名**：sso_apps

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| app_code | string | 是 | 应用编码，唯一 |
| app_name | string | 是 | 应用名称 |
| app_secret | string | 是 | 应用密钥 |
| redirect_uris | json | 是 | 回调 URI 列表 |
| allowed_grant_types | json | 是 | 允许的授权类型 |
| is_active | boolean | 是 | 是否启用，默认 true |
| description | string | 否 | 描述 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 应用 → 按 is_active 筛选
- **创建**：点击"创建" → 填写 app_code/app_name/app_secret → 配置 redirect_uris/allowed_grant_types → 保存
- **编辑**：选择应用 → 编辑（如更新 app_secret、停用 is_active）→ 保存（`app_code` 不建议修改）
- **删除**：选择应用 → 删除（仅 admin 角色）

#### 业务规则

- `app_code` 全局唯一，作为令牌、授权码、用户应用角色的关联键
- `app_secret` 为敏感字段，仅服务端校验使用，禁止外泄
- `redirect_uris` 为合法回调地址白名单，授权时校验
- `allowed_grant_types` 定义该应用支持的 OAuth 授权类型（如 authorization_code / refresh_token）
- `is_active=false` 停用应用，所有令牌与授权码失效
- 关闭 draftAndPublish，应用直接生效

### 10.5 SSO 渠道（sso-channel）

**用途**：定义 SSO 渠道编码与 UTM 模板。

**所属插件**：plugin::zhao-sso
**集合名**：sso_channels

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| channel_code | string | 是 | 渠道编码，唯一 |
| channel_name | string | 是 | 渠道名称 |
| channel_type | string | 是 | 渠道类型 |
| utm_template | json | 否 | UTM 模板 |
| is_active | boolean | 是 | 是否启用，默认 true |
| description | string | 否 | 描述 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 渠道 → 按 channel_type/is_active 筛选
- **创建**：点击"创建" → 填写 channel_code/channel_name/channel_type → 编辑 utm_template → 保存
- **编辑**：选择渠道 → 编辑 → 保存（`channel_code` 不建议修改）
- **删除**：选择渠道 → 删除（已被用户/令牌引用时谨慎）

#### 业务规则

- `channel_code` 全局唯一，与 sso-user 的 `register_channel`/`last_login_channel` 对齐
- `utm_template` 定义该渠道的 UTM 参数模板，用于注册归因
- `is_active=false` 停用渠道，该渠道不再接受注册与登录
- 关闭 draftAndPublish，渠道直接生效

### 10.6 SSO 三方绑定（sso-third-party-binding）

**用途**：记录 SSO 用户与三方账号的绑定关系。

**所属插件**：plugin::zhao-sso
**集合名**：sso_third_party_bindings

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → sso-user | 否 | 所属用户（manyToOne，inversedBy third_party_bindings） |
| provider | string | 是 | 三方提供方 |
| provider_user_id | string | 是 | 三方用户 ID |
| provider_union_id | string | 否 | 三方 unionId |
| provider_nickname | string | 否 | 三方昵称 |
| provider_avatar | string | 否 | 三方头像 |
| provider_data | json | 否 | 三方原始数据 |
| bound_at | datetime | 是 | 绑定时间 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 三方绑定 → 按 user/provider 筛选
- **创建**：主要由三方登录流程自动写入；后台可点击"创建" → 选择 user → 填写 provider/provider_user_id → 保存
- **编辑**：禁止编辑（绑定关系不可变）
- **删除**：选择记录 → 删除（解绑操作，需 admin 角色）

#### 业务规则

- `provider`+`provider_user_id` 标识三方账号唯一性
- `provider_union_id` 用于跨应用打通同一用户主体
- 一个 SSO 用户可绑定多个三方账号（oneToMany），但同一 provider 通常仅一条
- `bound_at` 记录绑定时间，解绑后可重新绑定
- 关闭 draftAndPublish，记录直接生效

### 10.7 SSO OAuth 配置（sso-oauth-config）

**用途**：配置 SSO 作为 OAuth 客户端接入三方平台的应用凭证。

**所属插件**：plugin::zhao-sso
**集合名**：sso_oauth_configs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| provider | string | 是 | 三方提供方 |
| app_id | string | 是 | 应用 ID |
| app_secret | string | 是 | 应用密钥 |
| scope | string | 否 | 授权范围 |
| extra_config | json | 否 | 扩展配置 |
| redirect_uris | json | 否 | 回调 URI |
| is_enabled | boolean | 是 | 是否启用，默认 true |
| description | string | 否 | 描述 |

#### 操作步骤

- **查看**：进入系统中心 → SSO OAuth 配置 → 按 provider/is_enabled 筛选
- **创建**：点击"创建" → 填写 provider/app_id/app_secret → 配置 scope/redirect_uris → 保存
- **编辑**：选择记录 → 编辑（如更新 app_secret、停用 is_enabled）→ 保存
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `provider` 标识三方平台（如 wechat / alipay），与 sso-third-party-binding 的 `provider` 对齐
- `app_id`/`app_secret` 为敏感凭证，仅服务端调用三方 API 时使用
- `redirect_uris` 为 OAuth 回调白名单
- `is_enabled=false` 停用该 provider 的 OAuth 接入
- 关闭 draftAndPublish，配置直接生效

### 10.8 SSO 令牌（sso-token）

**用途**：管理用户访问令牌与刷新令牌及撤销状态。

**所属插件**：plugin::zhao-sso
**集合名**：sso_tokens

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → sso-user | 否 | 所属用户（manyToOne） |
| app_code | string | 是 | 应用编码 |
| access_token_jti | text | 是 | 访问令牌 JTI，唯一 |
| refresh_token | text | 是 | 刷新令牌，唯一 |
| refresh_expires_at | datetime | 是 | 刷新令牌过期时间 |
| revoked | boolean | 是 | 是否撤销，默认 false |
| revoked_at | datetime | 否 | 撤销时间 |
| channel_code | string | 否 | 渠道编码 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 令牌 → 按 user/app_code/revoked 筛选
- **创建**：主要由登录流程自动写入；后台一般不手动创建
- **编辑**：选择令牌 → 编辑（如撤销 revoked=true、回填 revoked_at）→ 保存
- **删除**：选择令牌 → 删除（仅 admin 角色，过期或已撤销令牌可定期清理）

#### 业务规则

- `access_token_jti` 为访问令牌唯一标识，`refresh_token` 为刷新令牌
- `revoked=true` 撤销令牌，立即失效，回填 `revoked_at`
- `refresh_expires_at` 控制刷新令牌有效期，过期后需重新登录
- `app_code` 标识令牌归属应用，`channel_code` 标识登录渠道
- 用户封禁（sso-user.status=blocked）时需撤销其所有令牌
- 关闭 draftAndPublish，记录直接生效

### 10.9 SSO 授权码（sso-auth-code）

**用途**：记录 OAuth 授权码及使用状态。

**所属插件**：plugin::zhao-sso
**集合名**：sso_auth_codes

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| code | string | 是 | 授权码，唯一 |
| user | relation → sso-user | 否 | 授权用户（manyToOne） |
| app_code | string | 是 | 应用编码 |
| redirect_uri | text | 是 | 回调 URI |
| channel_code | string | 否 | 渠道编码 |
| scopes | json | 否 | 授权范围 |
| expires_at | datetime | 是 | 过期时间 |
| used | boolean | 是 | 是否已使用，默认 false |

#### 操作步骤

- **查看**：进入系统中心 → SSO 授权码 → 按 user/app_code/used 筛选
- **创建**：主要由授权流程自动写入；后台一般不手动创建
- **编辑**：禁止编辑（授权码一次性，数据不可变）
- **删除**：选择记录 → 删除（仅 admin 角色，过期记录可定期清理）

#### 业务规则

- `code` 全局唯一，为 OAuth authorization_code 授权类型的临时凭证
- 授权码一次性使用，`used=true` 后不可再用
- `expires_at` 控制有效期（通常短时，如 10 分钟），过期失效
- `redirect_uri` 必须与 sso-app 的 `redirect_uris` 白名单匹配
- `scopes` 限定授权范围，换发令牌时校验
- 关闭 draftAndPublish，记录直接生效

### 10.10 SSO 用户应用角色（sso-user-app-role）

**用途**：定义用户在具体应用下的角色。

**所属插件**：plugin::zhao-sso
**集合名**：sso_user_app_roles

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → sso-user | 否 | 用户（manyToOne） |
| app_code | string | 是 | 应用编码 |
| role | string | 是 | 角色标识 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 用户应用角色 → 按 user/app_code/role 筛选
- **创建**：点击"创建" → 选择 user → 填写 app_code/role → 保存
- **编辑**：选择记录 → 编辑（如调整 role）→ 保存
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `user`+`app_code` 定位用户在某应用的角色，同一用户在不同应用可有不同角色
- `role` 为角色标识，与 zhao-auth 的 permission 角色体系对齐
- 该关系为令牌签发时注入角色声明的来源
- 关闭 draftAndPublish，记录直接生效

### 10.11 SSO 邀请码（sso-invite-code）

**用途**：管理邀请码及使用限制。

**所属插件**：plugin::zhao-sso
**集合名**：sso_invite_codes

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| code | string | 是 | 邀请码，唯一 |
| creator | relation → sso-user | 否 | 创建者（manyToOne） |
| invite_type | enumeration | 是 | 类型：system（系统）/ user_campaign（用户活动） |
| max_uses | integer | 否 | 最大使用次数 |
| use_count | integer | 是 | 已使用次数，默认 0 |
| per_user_limit | integer | 是 | 单用户使用限制，默认 1 |
| valid_from | datetime | 否 | 生效时间 |
| valid_until | datetime | 否 | 失效时间 |
| bonus_tags | json | 否 | 奖励标签 |
| is_active | boolean | 是 | 是否启用，默认 true |

#### 操作步骤

- **查看**：进入系统中心 → SSO 邀请码 → 按 invite_type/is_active 筛选
- **创建**：点击"创建" → 填写 code → 选择 invite_type → 设置 max_uses/per_user_limit/有效期 → 保存
- **编辑**：选择记录 → 编辑（如停用 is_active、调整 max_uses）→ 保存（`code` 不建议修改）
- **删除**：选择记录 → 删除（`invite_type=system` 谨慎删除）

#### 业务规则

- `invite_type`：`system` 为系统级邀请码、`user_campaign` 为用户活动码
- `max_uses` 控制总使用次数，`use_count` 达到上限后不可再用
- `per_user_limit` 控制单用户使用次数，防止刷单
- `valid_from`/`valid_until` 定义有效期，超出范围不可使用
- `bonus_tags` 标记奖励规则，注册时触发积分/权益发放
- `is_active=false` 停用邀请码，立即失效
- 关闭 draftAndPublish，记录直接生效

### 10.12 SSO 邀请使用记录（sso-invite-usage）

**用途**：记录邀请码被使用的明细。

**所属插件**：plugin::zhao-sso
**集合名**：sso_invite_usages

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| invite_code | relation → sso-invite-code | 否 | 邀请码（manyToOne） |
| user | relation → sso-user | 否 | 使用用户（manyToOne） |
| channel_code | string | 否 | 渠道编码 |
| app_code | string | 否 | 应用编码 |
| used_at | datetime | 是 | 使用时间 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 邀请使用记录 → 按 invite_code/user 筛选
- **创建**：主要由注册使用邀请码时自动写入；后台可点击"创建" → 选择 invite_code/user → 填写 used_at → 保存
- **编辑**：禁止编辑（使用记录不可变）
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- 每次使用邀请码注册写入一条，同时累加 sso-invite-code 的 `use_count`
- `channel_code`/`app_code` 记录使用场景，用于渠道归因
- 与 sso-invite-stats 联动，统计邀请码总使用量与活跃量
- 关闭 draftAndPublish，记录直接生效

### 10.13 SSO 邀请统计（sso-invite-stats）

**用途**：聚合邀请码的邀请总量与活跃量统计。

**所属插件**：plugin::zhao-sso
**集合名**：sso_invite_stats

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| invite_code | relation → sso-invite-code | 否 | 邀请码（oneToOne） |
| total_invites | integer | 是 | 总邀请数 |
| active_invites | integer | 是 | 活跃邀请数 |
| last_invited_at | datetime | 否 | 最后邀请时间 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 邀请统计 → 按 invite_code 筛选
- **创建/编辑**：主要由统计任务自动聚合写入；后台一般不手动维护
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `invite_code` 为 oneToOne，每个邀请码对应一条统计
- `total_invites` 为累计邀请数，`active_invites` 为活跃被邀请人数
- 统计数据由定时任务从 sso-invite-usage 聚合，非实时
- `last_invited_at` 标识最近一次邀请时间
- 关闭 draftAndPublish，记录直接生效

### 10.14 SSO 推荐关系（sso-referral-relation）

**用途**：记录邀请人与被邀请人的推荐层级关系。

**所属插件**：plugin::zhao-sso
**集合名**：sso_referral_relations

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| inviter | relation → sso-user | 否 | 邀请人（manyToOne） |
| invitee | relation → sso-user | 否 | 被邀请人（manyToOne） |
| invite_code | relation → sso-invite-code | 否 | 使用的邀请码（manyToOne） |
| level | integer | 是 | 推荐层级 |
| channel_code | string | 否 | 渠道编码 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 推荐关系 → 按 inviter/invitee/level 筛选
- **创建**：主要由注册使用邀请码时自动写入；后台可点击"创建" → 选择 inviter/invitee → 填写 level → 保存
- **编辑**：禁止编辑（推荐关系不可变）
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `inviter`+`invitee` 定位一条推荐关系，构建推荐树
- `level` 标识层级（1=直推，2=间推...），受 user-invite 的 `distributionDepth`（最大 2）约束
- `invite_code` 记录触发该关系的邀请码
- `channel_code` 记录注册渠道，用于渠道归因与分销结算
- 关闭 draftAndPublish，记录直接生效

### 10.15 SSO 短信验证码（sso-sms-code）

**用途**：记录短信验证码及使用状态。

**所属插件**：plugin::zhao-sso
**集合名**：sso_sms_codes

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| mobile | string | 是 | 手机号 |
| code | string | 是 | 验证码 |
| scene | string | 是 | 场景，默认 login |
| expires_at | datetime | 是 | 过期时间 |
| used | boolean | 是 | 是否已使用，默认 false |
| ip | string | 否 | 请求 IP |
| provider | string | 否 | 短信提供方，默认 mock |

#### 操作步骤

- **查看**：进入系统中心 → SSO 短信验证码 → 按 mobile/scene/used 筛选
- **创建**：主要由发送验证码流程自动写入；后台一般不手动创建
- **编辑**：选择记录 → 编辑（如标记 used=true）→ 保存
- **删除**：选择记录 → 删除（仅 admin 角色，过期记录可定期清理）

#### 业务规则

- `scene` 标识用途（login / register / reset_password 等）
- 验证码一次性使用，`used=true` 后不可再用
- `expires_at` 控制有效期（通常 5 分钟），过期失效
- `provider` 标识短信服务商，`mock` 为开发环境模拟
- `ip` 记录请求来源，用于频控与风控
- 关闭 draftAndPublish，记录直接生效

### 10.16 SSO 登录日志（sso-login-log）

**用途**：记录用户登录行为及成败原因。

**所属插件**：plugin::zhao-sso
**集合名**：sso_login_logs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| user | relation → sso-user | 否 | 登录用户（manyToOne） |
| login_type | string | 是 | 登录类型 |
| provider | string | 否 | 登录提供方 |
| channel_code | string | 否 | 渠道编码 |
| app_code | string | 否 | 应用编码 |
| ip | string | 否 | 登录 IP |
| user_agent | string | 否 | UA |
| success | boolean | 是 | 是否成功 |
| fail_reason | string | 否 | 失败原因 |

#### 操作步骤

- **查看**：进入系统中心 → SSO 登录日志 → 按 user/login_type/success 筛选
- **创建**：主要由登录流程自动写入；后台一般不手动创建
- **编辑**：禁止编辑（日志数据不可变）
- **删除**：选择记录 → 删除（仅 admin 角色，过期日志可定期归档清理）

#### 业务规则

- `login_type` 标识登录方式（password / sms / oauth 等）
- `success=false` 时 `fail_reason` 记录失败原因（如密码错误、账号封禁）
- `channel_code`/`app_code` 记录登录场景，用于审计
- `ip`/`user_agent` 为隐私数据，需遵循合规要求，建议定期脱敏
- 成功登录联动 sso-user 的 `login_count`/`last_login_at`
- 关闭 draftAndPublish，记录直接生效

### 10.17 三方登录配置（third-party-config）

**用途**：配置微信/支付宝/抖音等三方登录应用凭证。

**所属插件**：plugin::zhao-third
**集合名**：third_party_configs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 配置名称 |
| platform | enumeration | 是 | 平台：wechat / alipay / douyin |
| appType | enumeration | 是 | 应用类型：official_account / mini_program / open_platform / h5 / app |
| appId | string | 是 | 应用 ID |
| appSecret | string | 是 | 应用密钥 |
| enabled | boolean | 否 | 是否启用，默认 true |
| site | relation → site-config | 否 | 关联站点（manyToOne） |

#### 操作步骤

- **查看**：进入系统中心 → 三方登录配置 → 按 platform/appType/enabled 筛选
- **创建**：点击"创建" → 填写 name → 选择 platform/appType → 填写 appId/appSecret → 关联 site → 保存
- **编辑**：选择记录 → 编辑（如更新 appSecret、停用 enabled）→ 保存
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `platform`+`appType` 定位具体三方应用形态（如微信公众号、微信小程序）
- `appId`/`appSecret` 为敏感凭证，仅服务端调用三方 API 时使用
- `site` 关联站点，支持不同站点配置不同三方应用
- `enabled=false` 停用该三方登录入口
- content-manager 中 `visible=false`，需通过定制界面或 API 管理
- 关闭 draftAndPublish，配置直接生效

### 10.18 三方账号绑定（third-party-account）

**用途**：记录用户与三方账号的绑定关系。

**所属插件**：plugin::zhao-third
**集合名**：third_party_accounts

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| platform | enumeration | 是 | 平台：wechat / alipay / douyin |
| appType | enumeration | 是 | 应用类型：official_account / mini_program / open_platform / h5 / app |
| openId | string | 是 | openId |
| unionId | string | 否 | unionId |
| nickname | string | 否 | 三方昵称 |
| avatar | string | 否 | 三方头像 |
| user | relation → users-permissions.user | 否 | 关联用户（manyToOne） |

#### 操作步骤

- **查看**：进入系统中心 → 三方账号绑定 → 按 platform/user 筛选
- **创建**：主要由三方登录流程自动写入；后台可点击"创建" → 填写 platform/appType/openId → 关联 user → 保存
- **编辑**：禁止编辑（绑定关系不可变）
- **删除**：选择记录 → 删除（解绑操作，需 admin 角色）

#### 业务规则

- `platform`+`appType`+`openId` 定位三方账号唯一性
- `unionId` 用于同一平台下跨应用打通用户主体
- `user` 关联 users-permissions 用户，一个用户可绑定多个三方账号
- content-manager 中 `visible=false`，需通过定制界面或 API 管理
- 关闭 draftAndPublish，记录直接生效

### 10.19 角色权限（permission）

**用途**：定义角色及权限树，作为权限体系核心。

**所属插件**：plugin::zhao-auth
**集合名**：zhao_permissions

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| role | string | 是 | 角色标识，唯一，maxLength 50 |
| displayName | string | 是 | 显示名称，maxLength 50 |
| description | text | 否 | 描述 |
| permissions | json | 是 | 权限列表，默认 [] |
| isSystem | boolean | 是 | 是否系统角色，默认 false |
| level | integer | 否 | 角色等级，默认 20，min 1 max 100 |

#### 操作步骤

- **查看**：进入系统中心 → 角色权限 → 按 isSystem/level 筛选
- **创建**：点击"创建" → 填写 role/displayName → 编辑 permissions JSON → 设置 level → 保存
- **编辑**：选择角色 → 编辑（如调整 permissions）→ 保存（`isSystem=true` 的角色禁止删除）
- **删除**：选择角色 → 删除（`isSystem=true` 禁止删除）

#### 业务规则

- `role` 全局唯一，作为角色标识贯穿权限校验
- `permissions` 为 JSON 数组，存储该角色的权限点列表
- `isSystem=true` 为系统内置角色（如 admin / channel-admin），不可删除
- `level` 定义角色等级，低等级不可管理高等级角色（数值越小等级越高）
- 与 sso-user-app-role、role-channel 联动，控制用户在应用与渠道内的权限
- 关闭 draftAndPublish，角色直接生效

### 10.20 角色渠道绑定（role-channel）

**用途**：记录角色与渠道的绑定关系。

**所属插件**：plugin::zhao-auth
**集合名**：zhao_role_channels

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| role | string | 是 | 角色标识 |
| channel | relation → channel | 否 | 渠道（manyToOne） |
| assignedBy | integer | 否 | 分配人 ID |

#### 操作步骤

- **查看**：进入系统中心 → 角色渠道绑定 → 按 role/channel 筛选
- **创建**：点击"创建" → 填写 role → 选择 channel → 填写 assignedBy → 保存
- **编辑**：选择记录 → 编辑 → 保存
- **删除**：选择记录 → 删除（仅 admin 角色）

#### 业务规则

- `role`+`channel` 定义角色在具体渠道的授权范围
- `assignedBy` 记录分配操作人 ID，用于审计
- 该关系为渠道级权限隔离的依据，与 role-action-log 联动审计
- 关闭 draftAndPublish，记录直接生效

### 10.21 角色操作日志（role-action-log）

**用途**：记录角色分配与撤销的操作审计日志。

**所属插件**：plugin::zhao-auth
**集合名**：zhao_role_action_logs

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| operatorId | integer | 是 | 操作人 ID |
| targetUserId | integer | 是 | 目标用户 ID |
| action | enumeration | 是 | 操作类型：assign（分配）/ revoke（撤销） |
| role | string | 是 | 角色名称 |
| reason | text | 否 | 操作原因 |
| timestamp | datetime | 是 | 操作时间 |

#### 操作步骤

- **查看**：进入系统中心 → 角色操作日志 → 按 operatorId/action/role 筛选
- **创建**：主要由角色分配/撤销操作自动写入；后台一般不手动创建
- **编辑**：禁止编辑（审计日志不可变）
- **删除**：选择记录 → 删除（仅 admin 角色，过期日志可定期归档）

#### 业务规则

- `action`：`assign`（分配角色）/ `revoke`（撤销角色），记录角色变更方向
- `operatorId`+`targetUserId` 定位操作人与被操作用户，构成审计三元组（+`role`）
- `reason` 记录操作原因，用于合规审计
- 关闭 `timestamps`，由 `timestamp` 字段显式记录操作时间
- 关闭 draftAndPublish，记录直接生效
