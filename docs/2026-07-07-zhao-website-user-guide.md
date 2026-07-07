# zhao-website 使用手册

> 本手册覆盖三个前端的日常使用：dsite 官网前端、web 管理后台、zhao-website Admin UI。

---

## 目录

- [一、系统概览](#一系统概览)
- [二、dsite 官网前端使用](#二dsite-官网前端使用)
- [三、web 管理后台使用](#三web-管理后台使用)
- [四、zhao-website Admin UI 使用](#四zhao-website-admin-ui-使用)
- [五、常见问题](#五常见问题)

---

## 一、系统概览

### 1.1 三个前端的定位

| 前端 | 技术栈 | 定位 | 访问者 |
|---|---|---|---|
| **dsite** | Nuxt 3 SSR | 面向 C 端的官网门户 | 潜在客户、访客 |
| **web** | uni-app + Vue 3 | 移动端管理后台 | 运营、编辑、管理员 |
| **Admin UI** | React + antd 5 | Strapi 内嵌的高级管理面板 | 超级管理员、SEO/知识工程师 |

### 1.2 系统架构

```
                    ┌─ dsite (Nuxt SSR, :3000) ── C 端访客
浏览器 → Nginx ─────┤
                    ├─ web (uni-app H5, :8080) ── 运营人员
                    │
                    └─ Strapi (basic, :1337)
                         ├─ Content Manager (内置)
                         ├─ zhao-website Admin UI (插件)
                         ├─ zhao-studio (插件)
                         └─ 公开 API (/api/zhao-website/v1/*)
```

### 1.3 数据流

- **dsite** 通过 `/api/zhao-website/v1/*` 公开端点读取已发布内容
- **web** 通过 `/api/zhao-website/v1/*` + 鉴权 token 管理草稿/发布/下架
- **Admin UI** 通过 `/api/zhao-website/admin/*` 管理站点级配置（知识图谱、真值、SEO 输出等）

### 1.4 内容类型（CT）一览

共 7 个核心 CT + 4 个站点级配置 CT：

| CT | 说明 | 状态流 | 管理入口 |
|---|---|---|---|
| article | 资讯文章 | draft → published → archived | web + Admin UI Dashboard |
| product | 产品 | draft → published → archived | web |
| case | 成功案例 | draft → published → archived | web |
| faq | 常见问题 | draft → published → archived | web |
| tutorial | 教程指南 | draft → published → archived | web |
| compliance | 合规公示 | draft → published → archived | web |
| download | 下载资源 | draft → published → archived | web |
| article-category | 文章分类 | — | Strapi Content Manager |
| knowledge-entity | 知识图谱实体 | — | Admin UI |
| first-truth | 真值事实 | — | Admin UI |
| ai-summary | AI 摘要 | — | Admin UI |
| brand-info / seo-config / lead / interaction | 品牌/SEO/留资/互动 | — | Admin UI / 自动采集 |

---

## 二、dsite 官网前端使用

### 2.1 访问方式

- **生产环境**：通过域名直接访问（如 `https://www.example.com`）
- **本地开发**：`cd e:\code\dsite; npm run dev` → 访问 `http://localhost:3000`
- **前提条件**：Strapi 后端运行在 `:1337`，且 `site-config` 表有匹配当前域名的记录

### 2.2 页面导览

| 路径 | 页面 | 功能说明 |
|---|---|---|
| `/` | 首页 | Hero 主视觉 + 精选产品（3）+ 精选案例（2）+ 最新资讯（3） |
| `/articles` | 资讯列表 | 分页浏览，支持标题搜索、状态筛选 |
| `/articles/:slug` | 文章详情 | 正文 + 相关文章推荐（按标签关联） |
| `/articles/category/:slug` | 分类文章 | 按分类筛选文章列表 |
| `/products` | 产品列表 | 分页浏览所有产品 |
| `/products/:slug` | 产品详情 | 介绍 + 核心特性 + 应用场景 + 咨询 CTA |
| `/cases` | 案例列表 | 分页浏览成功案例 |
| `/cases/:slug` | 案例详情 | 客户背景 + 挑战 + 方案 + 成果 + 客户证言 |
| `/faqs` | 常见问题 | 折叠式问答列表，按 order 排序 |
| `/tutorials` | 教程列表 | 按难度（入门/中级/高级）筛选 |
| `/tutorials/:slug` | 教程详情 | 操作步骤 + 所需材料 + 预期结果 |
| `/compliance` | 合规公示 | 按分类（公告/政策/报告/证书/协议）筛选 |
| `/compliance/:slug` | 合规详情 | 生效日期 + 有效期 + 正文 |
| `/downloads` | 下载中心 | 文件列表，点击触发下载 |
| `/about` | 关于我们 | 公司介绍 + 客服入口 |
| `/contact` | 联系我们 | 留资表单（姓名/手机/邮箱/公司/留言） |

### 2.3 留资转化流程

1. 访客在 `/contact` 页面填写表单
2. 表单包含 **honeypot 隐藏字段**（`website`），机器人会填写此字段触发静默丢弃
3. 提交成功后显示致谢信息，后端记录留资（含 IP/UA/来源页）
4. 管理员可在 Admin UI Dashboard 的"线索"Tab 查看

### 2.4 下载资源流程

1. 访客在 `/downloads` 点击下载按钮
2. 系统调用 `/api/zhao-website/v1/downloads/:slug`
3. 若资源 `requireLead = true` 且访客未登录 → 返回 403 → 自动跳转 `/contact` 引导留资
4. 若允许下载 → 返回文件 URL → 浏览器打开下载 + 后端 `downloadCount +1`

### 2.5 多租户识别

dsite 无需手动选择租户：
- 生产环境：Strapi 通过访问域名自动识别 siteId
- 本地开发：`site-config` 表需配置 `domain = localhost`
- 多租户测试：可通过 `?domain=xxx.com` 参数切换

### 2.6 SEO 输出

以下路径由 Strapi 直接生成，dsite 通过 routeRules 反代：

| 路径 | 说明 | 格式 |
|---|---|---|
| `/sitemap.xml` | 站点地图 | XML |
| `/robots.txt` | 爬虫协议 | text |
| `/llms.txt` | LLM 友好摘要 | text |

每个详情页自动注入 `useSeoMeta`（title/description/og 标签），基于站点的 `seo-config.titleTemplate` 模板。

---

## 三、web 管理后台使用

### 3.1 登录与权限

**访问方式**：
- 移动端：通过 uni-app 打包的 H5/App/小程序
- 本地开发：`cd e:\code\web; npm run dev:h5` → 访问 `http://localhost:8080`

**登录流程**：
1. 输入账号密码（由超级管理员在 Strapi 后台创建）
2. 系统根据用户角色加载权限列表
3. 每次进入 Dashboard 自动刷新权限，避免使用缓存

**权限模型**：
| 角色 | 权限范围 |
|---|---|
| admin | 全部 CT 的 create/update/publish/delete |
| channel-admin | 其渠道范围内的 CT 管理 |
| plugin-manager | 插件配置管理 |
| instructor | 教程类内容管理 |
| user | 只读访问 |

权限检查方式：页面按钮通过 `hasPermission('article.create')` 等控制显隐，无权限的按钮自动隐藏。

### 3.2 内容管理通用流程

所有 7 个 CT（article/product/case/faq/tutorial/compliance/download）遵循统一模式：

#### 3.2.1 列表页

```
PageHeader（含"+ 新增"按钮）
├─ 搜索区（标题/名称搜索 + 状态筛选）
├─ 卡片列表
│   └─ 每张卡片：标题 + 摘要 + 状态标签 + 日期
│       └─ 操作按钮：发布/下架/编辑/删除（按权限显隐）
├─ Loading / 空状态
└─ 分页
```

**操作说明**：
- **搜索**：输入关键词后按回车或点击搜索
- **状态筛选**：下拉选择"全部/草稿/已发布/已下架"
- **发布**：草稿状态显示"发布"按钮，点击后调用 publish 接口
- **下架**：已发布状态显示"下架"按钮，点击后调用 archive 接口
- **编辑**：点击卡片或"编辑"按钮跳转编辑页
- **删除**：二次确认后软删除（设置 `deletedAt`）

#### 3.2.2 编辑页

```
PageHeader（含"存草稿"/"发布"按钮）
└─ scroll-view
    ├─ 基本信息区（标题/名称/slug/分类/标签等）
    ├─ 内容区（正文/描述/富文本）
    └─ 扩展区（SEO 配置/JSON 字段等）
```

**关键操作**：
- **存草稿**：保存内容，status = draft
- **发布**：保存后调用 publish 接口，status = published
- **标签输入**：逗号分隔的字符串，提交时自动转数组
- **JSON 字段**（如产品的 features/specifications/scenarios、案例的 results、教程的 steps/materials）：用 textarea 编辑，支持 JSON 容错解析（`safeParse`），解析失败时降级为空数组

### 3.3 各 CT 特有字段说明

#### 3.3.1 文章（article）

| 字段 | 类型 | 说明 |
|---|---|---|
| title | string | 标题（必填） |
| slug | uid | URL 别名（留空自动生成） |
| category | string | 文章分类（文本） |
| excerpt | text | 摘要 |
| content | text | 正文（HTML） |
| coverImage | media | 封面图 |
| tags | relation | 标签（多对多，逗号分隔输入） |
| seoTitle/seoDescription/seoKeywords | string | SEO 配置 |
| canonicalUrl | string | 规范链接 |
| allowIndex | boolean | 是否允许收录 |

#### 3.3.2 产品（product）

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 产品名称（必填，注意是 name 不是 title） |
| tagline | string | 一句话标语 |
| priceRange | string | 价格区间 |
| priceUnit | string | 价格单位 |
| features | json | 核心特性（JSON 数组） |
| specifications | json | 规格参数（JSON 对象） |
| scenarios | json | 应用场景（JSON 数组） |
| isFeatured | boolean | 是否精选（首页展示） |
| category | relation | 产品分类 |
| coverImage | media | 产品图 |

**JSON 字段示例**：

`features` 示例：
```json
["高速处理", "低功耗", "工业级可靠性"]
```

`specifications` 示例：
```json
{ "weight": "1.2kg", "dimensions": "200×150×50mm", "power": "12V/2A" }
```

`scenarios` 示例：
```json
[{ "name": "工业自动化", "desc": "产线数据采集" }]
```

#### 3.3.3 案例（case）

| 字段 | 类型 | 说明 |
|---|---|---|
| title | string | 案例标题（必填） |
| clientName | string | 客户名称（必填） |
| clientIndustry | string | 客户行业 |
| challenge | text | 挑战（必填，HTML） |
| solution | text | 解决方案（必填，HTML） |
| results | json | 成果（必填，JSON 数组） |
| testimonial | text | 客户证言 |
| testimonialAuthor | string | 证言人姓名 |
| testimonialTitle | string | 证言人职位 |
| tags | relation | 标签 |
| relatedProducts | relation | 相关产品（多对多） |

`results` 示例：
```json
[{ "metric": "效率提升", "value": "300%" }, { "metric": "成本降低", "value": "40%" }]
```

#### 3.3.4 FAQ（faq）

| 字段 | 类型 | 说明 |
|---|---|---|
| question | string | 问题（必填，注意是 question 不是 title） |
| answer | text | 答案（必填） |
| order | integer | 排序（数字越小越靠前） |
| isFeatured | boolean | 是否精选 |
| category | relation | 分类 |
| tags | relation | 标签 |

**无封面图、无 slug 字段。**

#### 3.3.5 教程（tutorial）

| 字段 | 类型 | 说明 |
|---|---|---|
| title | string | 标题（必填） |
| slug | uid | URL 别名（必填） |
| description | text | 教程简介 |
| coverImage | media | 封面图 |
| steps | json | 操作步骤（必填，JSON 数组） |
| materials | json | 所需材料（JSON 数组） |
| estimatedTime | string | 预计耗时（如 "30 分钟"） |
| difficulty | enum | 难度：beginner/intermediate/advanced |
| result | text | 预期结果（HTML） |
| category | relation | 分类 |
| tags | relation | 标签 |

`steps` 示例：
```json
[{ "title": "登录系统", "content": "打开浏览器访问..." }, { "title": "配置参数", "content": "在设置页..." }]
```

#### 3.3.6 合规公示（compliance）

| 字段 | 类型 | 说明 |
|---|---|---|
| title | string | 标题（必填） |
| slug | uid | URL 别名（必填） |
| category | enum | 分类（必填）：notice/policy/report/certificate/agreement |
| content | text | 正文（必填，HTML） |
| effectiveDate | date | 生效日期 |
| expiryDate | date | 有效期至 |
| isPinned | boolean | 是否置顶 |
| tags | relation | 标签 |
| seoTitle/seoDescription | string | SEO 配置 |
| allowIndex | boolean | 是否允许收录 |

**category 是字段级枚举（非关系），共 5 个值**：公告/政策/报告/证书/协议。

#### 3.3.7 下载资源（download）

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 资源名称（必填，注意是 name 不是 title） |
| description | text | 资源描述 |
| file | media | 文件（必填） |
| fileType | enum | 类型：whitepaper/brochure/datasheet/template/guide/certificate/other |
| fileSize | biginteger | 文件大小（自动） |
| requireLead | boolean | 是否需要留资（默认 true） |
| downloadCount | biginteger | 下载次数（自动） |
| isFeatured | boolean | 是否精选 |
| order | integer | 排序 |
| category | relation | 分类 |
| tags | relation | 标签 |

**无 slug 字段、无 status 字段**（draftAndPublish 已关闭）。

`fileType` 共 7 值：白皮书/宣传册/数据表/模板/指南/证书/其他。

### 3.4 发布流程

1. 在列表页点击"+ 新增"进入编辑页
2. 填写内容，点击"存草稿"保存（status = draft）
3. 预览确认后点击"发布"（status = published，设置 publishedAt）
4. 已发布内容可在列表页点击"下架"（status = archived）
5. 下架后可重新编辑发布

**dsite 官网只展示 published 状态的内容**，草稿和已下架内容不对外可见。

---

## 四、zhao-website Admin UI 使用

### 4.1 访问方式

- 入口：Strapi 后台左侧菜单 → "官网中心"
- URL：`https://strapi-admin.example.com/plugins/zhao-website`
- 权限：需超级管理员或被授予 `plugin::zhao-website` 访问权限

### 4.2 侧边栏菜单

```
官网中心
├─ Dashboard        仪表盘
├─ Studio Bridge    Studio 桥接
├─ Knowledge Graph  知识图谱
├─ First-Truth      真值管理
├─ AI Summaries     AI 摘要
└─ SEO Output       SEO 输出
```

### 4.3 Dashboard（仪表盘）

**功能**：站点运营数据概览。

**四个统计卡片**：
| 卡片 | 数据源 | 说明 |
|---|---|---|
| 文章总数 | article CT | 已发布文章数量 |
| 产品总数 | product CT | 已发布产品数量 |
| 线索总数 | lead CT | 留资记录数 |
| 搜索热度 | interaction CT | 搜索互动数 |

**两个 Tab**：
- **线索**：最新留资记录列表（姓名/手机/来源页/时间），支持点击查看详情
- **搜索**：热门搜索词统计（基于 interaction 的 search 类型）

### 4.4 Studio Bridge（Studio 桥接）

**功能**：从 zhao-studio 草稿一键发布为官网文章。

**操作流程**：
1. 选择 Studio 草稿（下拉选择，按更新时间倒序）
2. 填写发布参数：
   - 标题（默认取草稿标题，可修改）
   - 分类（article-category 关系）
   - 标签（逗号分隔）
   - slug（留空自动生成）
3. 点击"发布到官网"
4. 系统自动：
   - 在 article CT 创建记录
   - 复制草稿正文到 article.content
   - 调用 publish 接口设为 published 状态
   - 回写 Studio 草稿的 `publishedArticleId` 关联

**状态提示**：
- 成功：绿色提示 + 跳转文章编辑页
- 失败：红色错误提示（常见原因：slug 冲突、分类不存在）

### 4.5 Knowledge Graph（知识图谱）

**功能**：管理站点级知识图谱实体与关系，用于 SEO JSON-LD 和 AI 摘要。

**实体管理**：
- **新增实体**：填写 name/entityType（Organization/Person/Product/Place 等）/description/url
- **编辑实体**：点击列表项进入编辑
- **删除实体**：二次确认后软删除

**关系管理**：
- 选择源实体 → 选择关系类型（founder/memberOf/parentOrganization 等）→ 选择目标实体
- 关系类型遵循 Schema.org 词汇表

**JSON-LD 导出**：
- 点击"导出 JSON-LD"按钮
- 生成 `@graph` 结构的 JSON-LD 文档
- 自动注入到 dsite 详情页的 `<script type="application/ld+json">`

### 4.6 First-Truth（真值管理）

**功能**：管理站点级"真值事实"，用于多源信息冲突检测。

**真值 CRUD**：
- **字段**：key（唯一标识）/value/category/source/confidence(0-1)/verified
- **新增**：填写 key + value + category + source
- **编辑**：点击列表项
- **删除**：二次确认

**冲突检测**：
- 系统自动扫描所有 CT 内容，提取与真值 key 同名的字段
- 若发现冲突值（如真值说"成立年份=2010"，某文章写"2008 年成立"）→ 列表标红
- 点击冲突项查看详情：真值 vs 各来源值

**验证操作**：
- 对未验证的真值点击"验证"按钮 → verified = true
- 验证后的真值不可删除（需先取消验证）

### 4.7 AI Summaries（AI 摘要）

**功能**：管理 CT 内容的 AI 生成摘要。

**列表**：
- 显示所有已生成摘要的记录（CT 类型 + 标题 + 摘要预览 + 更新时间）
- 支持按 CT 类型筛选

**操作**：
- **编辑摘要**：点击列表项进入编辑，修改 summary 字段
- **重新生成**：点击"重新生成"按钮 → 调用 AI 服务重新生成摘要
  - 前提：需配置 AI 服务（在 `zhao-website` 插件配置中设置 API key）
  - 耗时：约 5-15 秒
  - 失败处理：显示错误信息，保留原摘要

**应用场景**：
- dsite 列表页的卡片摘要
- SEO meta description
- llms.txt 的内容摘要

### 4.8 SEO Output（SEO 输出）

**功能**：查看和调试 SEO 输出文件。

**三个 Tab**：

#### 4.8.1 sitemap.xml
- 显示当前站点的 XML 站点地图
- 包含所有 published 状态的 CT URL
- 自动更新频率：实时（每次请求重新生成）
- 格式：`<urlset>` 标准 XML

#### 4.8.2 robots.txt
- 显示爬虫协议
- 内容基于 `seo-config` 的 `robotsAllow`/`robotsDisallow` 配置
- 自动包含 sitemap.xml 的引用

#### 4.8.3 llms.txt
- LLM 友好的纯文本摘要
- 包含站点简介 + 主要内容列表 + 真值事实摘要
- 用于 ChatGPT/Claude 等 LLM 抓取时提供结构化信息

**调试技巧**：
- 切换 Tab 即时查看不同格式
- 可复制内容到本地验证
- 生产环境通过 `https://www.example.com/sitemap.xml` 直接访问

---

## 五、常见问题

### 5.1 dsite 官网

**Q: 访问 dsite 显示空白或报错？**
A: 检查以下几点：
1. Strapi 后端是否运行在 `:1337`
2. `site-config` 表是否有 `domain = localhost` 记录（本地开发）
3. dsite 的 `nitro.devProxy` 配置是否正确（`/api` 代理到 `http://localhost:1337/api`）
4. 浏览器控制台查看具体错误

**Q: 页面内容不更新？**
A: dsite 是 SSR 模式，每次请求都会重新渲染。若内容未更新：
1. 确认 Strapi 中内容状态为 `published`
2. 检查 `deletedAt` 是否为 null
3. 清除浏览器缓存

**Q: 下载资源提示需要留资？**
A: 资源的 `requireLead = true` 且未登录时会返回 403。解决方式：
1. 在 `/contact` 页面填写留资表单
2. 或管理员在 web 后台将 `requireLead` 改为 false

**Q: 多租户如何测试？**
A: 本地开发时 `localhost` 只能绑定一个 site。多租户测试方式：
- 通过 `?domain=tenant-a.com` 参数切换
- 或配置多个本地域名（修改 hosts 文件）

### 5.2 web 管理后台

**Q: 按钮不显示？**
A: 按钮显隐由权限控制。检查方式：
1. 确认账号角色（admin/channel-admin/plugin-manager/instructor/user）
2. 退出重新登录刷新权限
3. 联系超级管理员在 Strapi 后台调整角色权限

**Q: JSON 字段保存失败？**
A: JSON 字段（features/specifications/scenarios/results/steps/materials）需符合 JSON 语法：
1. 字符串必须用双引号
2. 数组用 `[...]`，对象用 `{...}`
3. 系统使用 `safeParse` 容错，解析失败会降级为空数组，不会报错但内容丢失
4. 建议先用 JSON 在线校验工具验证

**Q: 发布后官网看不到？**
A: 检查以下几点：
1. 内容 status 是否为 `published`（不是 draft/archived）
2. `publishedAt` 是否已设置
3. `deletedAt` 是否为 null
4. dsite 页面刷新（SSR 会实时拉取）

**Q: 标签输入格式？**
A: 标签用逗号分隔的字符串输入，例如 `资讯,公告,行业动态`。系统自动转为数组提交。

### 5.3 zhao-website Admin UI

**Q: Studio Bridge 发布失败？**
A: 常见原因：
1. **slug 冲突**：已有文章使用相同 slug → 修改 slug 后重试
2. **分类不存在**：选择的分类已被删除 → 重新选择分类
3. **草稿已被发布**：草稿已关联 publishedArticleId → 检查草稿状态

**Q: Knowledge Graph JSON-LD 不生效？**
A: 检查以下几点：
1. 实体的 entityType 是否符合 Schema.org 规范
2. 关系类型是否在 Schema.org 词汇表内
3. dsite 详情页是否包含 `<script type="application/ld+json">` 标签
4. 用 Google Rich Results Test 验证

**Q: First-Truth 冲突检测不显示？**
A: 冲突检测基于字段名匹配：
1. 真值的 key 必须与 CT 字段名一致（如 `foundingYear`）
2. 检测是异步的，新内容需等待几分钟
3. 只检测 published 状态的内容

**Q: AI 摘要重新生成失败？**
A: 检查以下几点：
1. AI 服务 API key 是否配置（插件配置）
2. 网络是否可访问 AI 服务
3. 源内容是否为空（草稿内容不会生成摘要）
4. 查看浏览器 Network 面板的错误响应

**Q: sitemap.xml 内容不全？**
A: sitemap 只包含 published 状态的 CT。检查方式：
1. 在 Strapi Content Manager 确认内容状态
2. 检查 `deletedAt` 字段
3. sitemap 实时生成，无缓存，刷新即可

### 5.4 通用问题

**Q: 忘记密码？**
A: 联系超级管理员在 Strapi 后台 → Content Manager → User → 重置密码。

**Q: 如何创建新用户？**
A: 超级管理员在 Strapi 后台 → Content Manager → User → 新增，分配角色后保存。

**Q: 如何配置新租户？**
A:
1. Strapi 后台 → Content Manager → site-config → 新增
2. 填写 siteName/domain/template（关联 site-template）/featureFlags
3. 若新模板：先在 site-template 创建记录（name/displayName/themeConfig）
4. dsite 自动识别域名渲染对应站点

**Q: 如何修改官网主题色？**
A:
- **配色**：修改 `dsite/assets/css/themes/default.css` 的 `--color-primary` 等 CSS 变量
- **布局**：修改 `dsite/layouts/templates/default.vue` 的 section 编排
- **新增模板**：在 `dsite/layouts/templates/` 下新建 `<name>.vue`，在 `site-template` 表创建同名记录

**Q: 数据库迁移如何执行？**
A: 迁移脚本在 `plugins/<plugin>/server/database/migrations/` 目录，由 `zhao-common` 的 bootstrap 自动执行。重启 Strapi 即触发。

**Q: 如何备份数据？**
A:
1. 数据库：`mysqldump -u root -p zhao > backup.sql`
2. 上传文件：备份 `public/uploads/` 目录
3. 配置：备份 `.env` 和 `config/` 目录

---

## 附录：快捷参考

### A.1 dsite 路由速查

```
/                          首页
/articles                  文章列表
/articles/:slug            文章详情
/articles/category/:slug   分类文章
/products                  产品列表
/products/:slug            产品详情
/cases                     案例列表
/cases/:slug               案例详情
/faqs                      FAQ 列表
/tutorials                 教程列表
/tutorials/:slug           教程详情
/compliance                合规列表
/compliance/:slug          合规详情
/downloads                 下载列表
/about                     关于
/contact                   联系
/sitemap.xml               站点地图
/robots.txt                爬虫协议
/llms.txt                  LLM 摘要
```

### A.2 web 管理后台路由速查

```
/pages/website/dashboard              仪表盘
/pages/website/article/list           文章列表
/pages/website/article/edit           文章编辑
/pages/website/product/list           产品列表
/pages/website/product/edit           产品编辑
/pages/website/case/list              案例列表
/pages/website/case/edit              案例编辑
/pages/website/faq/list               FAQ 列表
/pages/website/faq/edit               FAQ 编辑
/pages/website/tutorial/list          教程列表
/pages/website/tutorial/edit          教程编辑
/pages/website/compliance/list        合规列表
/pages/website/compliance/edit        合规编辑
/pages/website/download/list          下载列表
/pages/website/download/edit          下载编辑
/pages/website/lead/list              线索列表
```

### A.3 Admin UI 菜单速查

```
/plugins/zhao-website                 Dashboard
/plugins/zhao-website/studio-bridge   Studio Bridge
/plugins/zhao-website/knowledge-graph Knowledge Graph
/plugins/zhao-website/first-truth     First-Truth
/plugins/zhao-website/ai-summaries    AI Summaries
/plugins/zhao-website/seo-output      SEO Output
```

### A.4 CT 字段差异速查表

| CT | 主字段 | 特有 | 无 |
|---|---|---|---|
| article | title | content/excerpt/coverImage | — |
| product | name | tagline/priceRange/features/specifications/scenarios | title |
| case | title | clientName/challenge/solution/results/testimonial | — |
| faq | question | answer/order | title/coverImage/slug |
| tutorial | title | steps/materials/difficulty/estimatedTime | — |
| compliance | title | category(枚举)/content/effectiveDate/expiryDate | coverImage |
| download | name | file/fileType/requireLead/downloadCount | title/slug |

### A.5 状态流转速查

```
draft ──发布──→ published ──下架──→ archived
  ↑                                    │
  └──────────重新编辑──────────────────┘
```

- **draft**：草稿，官网不可见
- **published**：已发布，官网可见
- **archived**：已下架，官网不可见，可恢复为 draft
