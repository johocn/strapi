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
