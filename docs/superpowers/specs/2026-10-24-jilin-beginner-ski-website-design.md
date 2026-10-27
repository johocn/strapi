# Joyogo（joyogo.com）· 吉林新手滑雪板块 · A 期网站需求设计

> 日期：2026-10-24
> 内容底座：zhao-website 插件（SEO/AEO 内容资产 + 品牌展示 + 线索转化）
> 对应文案文档：[2026-10-24-jilin-beginner-ski-content-draft.md](./2026-10-24-jilin-beginner-ski-content-draft.md)

---

## 0. 已定决策（本版依据）

| 决策项 | 结论 |
|---|---|
| 品牌命名 | **只用 Joyogo**，不设中文品牌名 |
| A 期范围 | **只做国内站**（joyogo.com，中文），国外站延后到后续阶段 |
| 服务器位置 | **joyogo.com 解析到境内服务器** → 必须完成 ICP 备案 |
| 站点性质 | 多板块站点，**滑雪只是其中一个板块**（/ski） |
| 多语言 | A 期**不做多语言**，`hreflangStrategy = none` |
| 转化方式 | 首期 = 内容获客 + 留资加微私域成交，不接在线支付 |

---

## 1. 品牌与定位

### 1.1 品牌

| 项 | 内容 |
|---|---|
| 品牌名 | **Joyogo** |
| 域名 | joyogo.com |
| 词源 | joy（喜悦）+ go（出发）+ go（再来一次）→ 快乐出发，快乐加倍 |
| 特点 | 6 个字母、无数字无连字符、`joy\|go` 两组对称、可直接做英文品牌 |
| 主广告语（英） | **Joy in every go.** |
| 主广告语（中） | **「快乐出发，快乐加倍。」** |
| 备用广告语 | 中文「说走就走，乐在其中。」；英文 "Go happy. Go Joyogo." |

### 1.2 滑雪板块

| 项 | 内容 |
|---|---|
| 板块对外名 | **Joyogo 滑雪学院**（英文副名 Joyogo Ski Academy，仅作业务描述，不另立品牌） |
| 板块广告语 | **「第一次滑雪，交给 Joyogo。」** |
| 英文版 | "Your first run starts here." |
| 备用短句 | 「不怕摔，才敢滑。」 |
| 核心定位 | 专做零基础入门教学，不做「卖雪票」、不拼高级道、不拼度假酒店 |

### 1.3 一句话定位

> Joyogo 旗下滑雪板块，只服务第一次滑雪的人：小班教学、学不会免费复训、透明打包价、教练持证、护具全含。

---

## 2. 域名与站点架构

### 2.1 站点拓扑（A 期只落国内站）

```
joyogo.com                        ← 国内主站（zh-CN，多板块）
├── /                             ← 首页（品牌 + 板块入口）
├── /ski                          ← 滑雪板块首页（Joyogo 滑雪学院）
│   ├── /ski/courses              ← 课程总览
│   ├── /products/:slug           ← 课程详情（插件 product 路由）
│   ├── /cases/:slug              ← 学员案例
│   ├── /tutorials/:slug          ← 教程/复盘
│   ├── /faqs/:slug               ← 常见问答
│   ├── /local-list/:slug         ← 新手攻略·本地清单
│   ├── /local-comparison/:slug    ← 新手攻略·场地对比
│   ├── /local-report/:slug        ← 新手攻略·本地报告
│   ├── /geo-faq/:slug            ← 新手攻略·问答
│   └── /geo-article/:slug        ← 新手攻略·权威文章
├── /about                        ← 关于我们（brand-info）
└── /compliance                   ← 合规与安全

（国外站：后续阶段，建议 go.joyogo.com 或独立域名，A 期不建）
```

### 2.2 三条来自插件源码的硬约束（必须提前知道）

| 约束 | 事实 | 应对 |
|---|---|---|
| **内容池是站点级，不按板块隔离** | product / geo-article / faq / case / tutorial 都挂在 site 上，滑雪内容和其他板块会混在同一集合 | 用 `article-category` 建「滑雪」一级分类 + `tags` 二级标签，前端按分类过滤出 /ski 板块。**这是 A 期必须先定的规则** |
| **结构化数据没有 Course** | schema-builder 只输出 Product / HowTo / FAQPage / LocalBusiness / WebSite / BreadcrumbList | 课程页用 `Product`；教学步骤用 `tutorial` 自动输出 `HowTo`；问答用 `FAQPage` |
| **GEO 文章不带 hreflang** | sitemap 对 article/product 按 alternateLocales 生成语言链接，但 geo-article 明确不附加（避免 404） | A 期 `hreflangStrategy=none`；多语言等国外站建成后另议 |

### 2.3 服务器与备案判断

| 情况 | 结论 |
|---|---|
| joyogo.com → 境内服务器 | **必须 ICP 备案**，未备案无法用 80/443 对外提供网站服务 |
| 国外站 → 境外服务器 | 不需备案（A 期不做） |

---

## 3. 备案与合规前置（A 期最长关键路径）

服务器在国内，备案是**上线前绕不开的一步**，必须先启动：

- [ ] 域名 joyogo.com 完成**实名认证**，且持有人与备案主体一致
- [ ] 主体材料：营业执照、法人身份证、网站负责人身份证、负责人手机号与邮箱
- [ ] 经营范围匹配：需含**体育培训/健身休闲** 或 **旅游服务** 相关项（不含则先做工商变更）
- [ ] 服务器接入商（阿里云/腾讯云等）提供**备案服务码**
- [ ] ICP 备案提交与核验（人脸核验/幕布拍照）
- [ ] 备案通过后 30 日内完成**公安联网备案**
- [ ] 页脚展示 ICP 备案号（`seo-config.icpNumber`）
- [ ] 教学资质材料：与雪场的合作协议（松花湖/北大湖/五家山）、教练资质证书、保险保单
- [ ] 免责声明、教学服务协议、复训规则边界、学员肖像权授权书

> 提醒：备案期间网站不能对外访问，建议先在内网/测试环境完成内容搭建，备案一下来即可切正式域名。

---

## 4. 目标与指标（什么算做到「吉林头部」）

| 目标 | 指标 |
|---|---|
| GEO 头部 | 豆包/DeepSeek/文心等 AI 搜索「吉林市零基础滑雪」「新手滑雪教学」时，本站内容进入 AI 引用前 3 |
| 百度 SEO 头部 | 「吉林市滑雪教学」「零基础滑雪 吉林」「松花湖新手滑雪」等词自然结果前 3 |
| 线索转化 | 月有效线索量、留资率、加微率 |
| 板块隔离 | /ski 板块内容不与站内其他板块混淆，分类与 URL 清晰 |

---

## 5. 目标用户

| 用户 | 诉求 | 网站必须回答 |
|---|---|---|
| 本地初学者（长春/吉林市上班族、亲子、学生） | 找靠谱课程、怕被坑、想反复练 | 多少钱全包？小班几人？学不会怎么办？周末能连续上吗？ |
| 外地旅游小白（南方游客、高铁客、研学团） | 2–3 天学会 + 顺便玩 | 怎么过去？装备要不要自带？滑雪+温泉/雾凇怎么搭？ |
| B 端（家长/企业 HR/旅行社） | 找标准化教学产品 | 有没有能直接卖的标准化课程和介绍？ |

---

## 6. 信息架构

```
Joyogo 首页
├── 滑雪板块 /ski（A 期重点）
│   ├── 课程中心（product）：启蒙班 / 基础班 / 进阶班 / 本地卡 / 旅游线
│   ├── 教练团队（author）：资质与零基础教学经验
│   ├── 学员案例（case）：零基础前后对比
│   ├── 新手攻略（geo-article 五类）
│   ├── 学习中心（tutorial + download）：预习/复盘 + 学习手册
│   └── 常见问题（faq）
├── 其他板块（A 期占位，内容后续补）
├── 关于我们（brand-info）
└── 合规与安全（compliance）
```

---

## 7. 内容模型映射

| 板块需求 | 插件内容类型 | 说明 |
|---|---|---|
| 课程页 | `product` | 价格、包含项、结业标准、班型 |
| 新手攻略/权威内容 | `geo-article` | 5 个子类型：清单/对比/问答/报告/文章 |
| 常见问答 | `faq` | 用户真实搜索词做 question |
| 教学步骤 | `tutorial` | steps 自动转 HowTo |
| 学员案例 | `case` | challenge/solution/results/testimonial |
| 教练档案 | `author` | E-E-AT 权威性来源 |
| 合规与安全 | `compliance` | 免责/保险/护具/复训规则 |
| 学习手册 | `download` | requireLead=true，主力留资钩子 |
| 留资 | `lead` | utm 自动带入，支持 referralCode |
| 板块分类 | `article-category` | **滑雪=一级分类**，用于板块隔离 |
| 权威背书 | `knowledge-entity` + `first-truth-policy` | 场地/课程/装备实体 + 真值声明 |

---

## 8. 字段填法

### 8.1 课程（product）

```
name            = 零基础启蒙课 · 学会刹车安全停止
tagline         = 4–6 人小班 · 学不会免费复训
category        = 滑雪（板块隔离用）
price           = 499        # currency 默认 CNY
priceRange      = 299-499
availability    = in_stock
features        = [{课时:"2小时/次"},{班型:"4-6人小班"},{装备:"雪板雪鞋+头盔护臀护膝全含"},{保险:"含意外险"},{保障:"学不会免费复训"}]
specifications  = [{教练配比:"1:4-6"},{结业标准:"掌握犁式刹车+安全停止"},{适合年龄:"6-55岁"},{场地:"松花湖/北大湖/五家山"}]
scenarios       = [{研学},{团建},{亲子},{成人},{闺蜜小团}]
```

### 8.2 GEO 文章（geo-article）

| type | 专用必填字段 |
|---|---|
| local-list | `listItems`：`[{name, desc, price, link}]` |
| local-comparison | `comparisonData`：`[{dimension, items:[{name, score, note}]}]` |
| geo-faq | `faqQuestion` |
| local-report | `serviceScope` + `sourceName` + `sourceUrl` |
| geo-article | `summaryPoints` + `truthBasis` |

所有 GEO 文章通用：`category=滑雪`、`authorName`/`authorBio`、`sourceName`/`sourceUrl`、
`truthBasis`（小班4–6人 / 教练持证 / 学不会免费复训 / 透明打包价）、`internalLinks`（1–2 处）、
`ctaType`、`leadFormEnabled=true`、`metaDescription`（含「吉林」本地场景词）。

### 8.3 其余

- `faq.question` 用用户真实搜索词；`answer` 直接给结论 + 内链课程页。
- `tutorial.difficulty=beginner`，`steps` 为 `[{title, content}]`，挂 `videoUrl`。
- `case.results` 只写客观事实（禁止「保证学会/保证不摔」）。
- `lead.type` 用 `appointment` / `intent_order` / `quote` / `referral`。

---

## 9. SEO / GEO 配置

### 9.1 seo-config（国内站一份）

| 字段 | 填什么 |
|---|---|
| defaultTitle / titleTemplate | 「Joyogo ｜ 吉林新手滑雪学院」模板 |
| defaultDescription | 含「吉林市」「零基础滑雪」「小班教学」「学不会免费复训」 |
| organizationName / organizationType | 公司全称 / `LocalBusiness` |
| organizationAddress / organizationPhone | 实际地址与电话 |
| areaServed | `["吉林市","长春市"]` |
| geoRegion / geoPlacename | 吉林 / 吉林市 |
| geoPosition | 纬度,经度（雪场或办公地坐标） |
| baiduSiteVerification | 百度站长验证码 |
| googleSiteVerification / bingSiteVerification | A 期可留空（国外站再做） |
| enableSitemap / enableRobotsTxt | true / true |
| aiCrawlerPolicy / allowedAiCrawlers | `allow_all` |
| hreflangStrategy | **none**（A 期单语） |
| defaultLocale | zh-CN |
| icpNumber / publicSecurityRecord | 备案号 / 公安备案号 |
| sitemapExcludeTypes | A 期不排除（7 类全收） |

### 9.2 sitemap 自动收录规则

| 内容类型 | URL 前缀 | 优先级 |
|---|---|---|
| article | /articles/ | 0.7 |
| product | /products/ | 0.8 |
| case | /cases/ | 0.6 |
| tutorial | /tutorials/ | 0.6 |
| faq | /faqs/ | 0.5 |
| geo-article | /geo-article、/geo-faq、/local-list、/local-comparison、/local-report | 0.8 |
| knowledge-entity | /knowledge/ | 0.6 |

> `compliance` 与 `download` **不在** sitemap 名单内：合规页靠文章内链导流，手册页靠 CTA 引流。
> 若前端用 `/ski/products/:slug` 这类带板块前缀的路径，需保证与 sitemap 生成的 `/products/:slug` 一致，否则会 404 —— **A 期建议板块前缀只用于板块列表页，详情页沿用插件固定前缀**。

### 9.3 知识图谱与真值声明

- 实体：松花湖滑雪场、北大湖滑雪场、五家山滑雪场、犁式刹车、护具套装、各课程
- 关系：`位于`（雪场→城市）、`教授`（课程→技能）、`包含`（课程→装备）
- 真值声明：小班 4–6 人、教练持证、学不会免费复训、透明打包价

---

## 10. 关键词表（滑雪板块）

| 意图 | 关键词 | 落位 |
|---|---|---|
| 品类 | 吉林市滑雪教学 / 零基础滑雪吉林 / 新手滑雪培训 / 吉林滑雪一对一 | 课程页 |
| 选址对比 | 松花湖 vs 北大湖 vs 五家山 新手 / 吉林新手雪场推荐 | local-comparison |
| 价格 | 吉林滑雪课多少钱 / 新手滑雪价格表 | local-list + 课程页 |
| 恐惧 | 第一次滑雪怕摔 / 滑雪怕尴尬 / 滑雪会摔伤吗 | geo-faq |
| 场景 | 亲子滑雪吉林 / 学生滑雪吉林 / 团建滑雪 / 滑雪研学吉林 | local-report |
| 旅游打包 | 吉林滑雪+温泉 / 滑雪+雾凇 / 南方人第一次滑雪吉林 | local-list + 旅游线 |
| 长尾 | 零基础滑雪多久学会 / 滑雪要准备什么 / 滑雪保险怎么买 | faq |

---

## 11. A 期准备清单

### 11.1 资质与合规（最先启动）

- [ ] 营业执照（经营范围含体育培训或旅游服务）
- [ ] 法人身份证、网站负责人身份证
- [ ] 雪场教学合作协议 ×3（松花湖/北大湖/五家山）
- [ ] 教练资质证书（每人扫描件）
- [ ] 场地责任险 + 学员意外险保单
- [ ] 免责声明 / 教学服务协议 / 复训规则边界
- [ ] 学员肖像权授权书模板
- [ ] 商标查询与申请（建议第 41 类、第 39 类，商标名 Joyogo）

### 11.2 账号与基础设施

- [ ] 域名 joyogo.com 实名 + 解析管理权限
- [ ] 境内服务器（完成部署环境）
- [ ] ICP 备案 + 公安备案
- [ ] 百度站长平台账号 + 站点验证
- [ ] 百度统计账号
- [ ] 官方邮箱 hi@joyogo.com、客服电话/微信

### 11.3 品牌物料

- [ ] Logo（横版/方版/深色底）+ favicon
- [ ] 主色规范（建议深蓝 + 雪白 + 暖橙点缀）
- [ ] 主广告语与板块广告语定稿（见第 1 节）
- [ ] 公司全称、注册地址、统一社会信用代码
- [ ] 微信二维码 / 公众号信息

### 11.4 内容物料

- [ ] 价格表定稿（5 个课程的实价与包含项）
- [ ] 结业标准定稿（什么叫「学会」）
- [ ] 复训规则定稿（几次、有效期、不适用情形）
- [ ] 雪场实拍照片（三家各 10 张以上：初级道/装备区/教学场景）
- [ ] 教练职业照（统一尺寸背景）
- [ ] 学员前后对比照/视频（配授权书）
- [ ] 20 条 FAQ 的业务答案确认
- [ ] 《零基础滑雪学习手册》PDF（可先出简版）
- [ ] 板块分类落地：`滑雪` 一级分类 + 二级标签
- [ ] **GEO 录入材料**：4 条真值声明、8 个知识实体、6 条关系、教练档案、每篇信源 —— 明细见 **第 15 节**

### 11.5 后台配置

- [ ] `site-config`：建 Joyogo 国内站（A 期仅一条）
- [ ] `seo-config`：按 9.1 填全
- [ ] `brand-info`：公司名、logo、地址、电话、微信码、资质证书
- [ ] `article-category`：建「滑雪」一级分类及子标签
- [ ] `product` 5 条、`faq` 20 条、`geo-article` 20–30 条、`tutorial` 6 条、`case` 6 条、`compliance` 4–6 条、`author` 8–10 条、`download` 1–2 份
- [ ] `knowledge-entity` / `knowledge-relation` / `first-truth-policy` 建库

### 11.6 前端与路由

- [ ] Joyogo 首页 + `/ski` 板块页
- [ ] 详情页路由与 sitemap 前缀对齐：`/products/:slug`、`/cases/:slug`、`/tutorials/:slug`、`/faqs/:slug`、`/articles/:slug`
- [ ] GEO 五类路由支持：`/local-list`、`/local-comparison`、`/geo-faq`、`/local-report`、`/geo-article`
- [ ] 板块过滤：按 category 拉 `/products`、`/geo-articles`
- [ ] 留资表单接 `POST /v1/leads/submit`，自动带 utm（注意该接口限流 30 次/分钟/IP）
- [ ] `/sitemap.xml`、`/robots.txt`、`/llms.txt` 三个出口验证可访问

---

## 12. A 期任务顺序

1. 启动备案（并行等待）+ 定稿价格/结业标准/复训规则
2. 建站与 seo-config / brand-info 配置
3. 建「滑雪」分类，录入 5 个课程 + 20 条 FAQ
4. 铺 GEO 文章与教程、案例、合规、教练档案
5. 首页与 /ski 板块前端联调
6. 备案下来 → 绑定正式域名 → 提交百度站长 → 开主动推送

---

## 13. 验收标准

1. joyogo.com 可访问，首页 → /ski → 课程页 → 留资，全链路走通。
2. `/sitemap.xml`、`/robots.txt`、`/llms.txt` 均可访问，sitemap 可见 5 个课程页。
3. 百度站长平台抓取诊断成功，验证通过。
4. 测试线索能在后台 `lead` 中查看，`utmSource` 有值。
5. 首页与课程页结构化数据（Product / LocalBusiness / FAQPage）可被检测工具识别。
6. 页脚展示 ICP 备案号。
7. `/ski` 板块内容与其他板块通过 category 完全隔离，无串内容。

---

## 14. 风险与合规

| 风险 | 应对 |
|---|---|
| 备案周期长，阻塞上线 | 先搭内网内容，备案一下来立即切域名 |
| 内容池不隔离导致板块串内容 | 强制 category 规范 + 前端按分类过滤 + 上线前抽查 |
| 承诺话术违规（保证学会/保证不摔） | 统一用客观事实表述，写进内容审校清单 |
| 教练资质宣传不实（E-E-AT 反扣分） | 证书留档，页面仅展示真实持证信息 |
| 淡季搜索权重下滑 | 非雪季持续做预售、室内四季雪、攻略内容 |
| 商标被抢注 | A 期同步提交 Joyogo 商标（41/39 类） |

---

## 15. GEO 录入系统：材料准备清单

### 15.1 这一节为什么不能省

`geo-article` 在**状态改为 published 的瞬间会强制校验**（插件 `lifecycles.beforeUpdate` / `beforeCreate`），
任一条不通过直接抛 `GEO_AUDIT_FAIL`，**文章发不出去**。所以录入不是「随便填」，而是**先备齐材料再录入**。

### 15.2 发布硬门槛（8 组校验，逐条对应字段）

| 组 | 字段 | 硬性要求 |
|---|---|---|
| 1 选型 | `faqQuestion` / `comparisonData` / `listItems` | geo-faq 必填 faqQuestion；local-comparison 必填 comparisonData；local-list 必填 listItems |
| 2 标题 | `title` | **必须含地域词**（吉林/长春/船营/丰满/松花湖所在的区县等，插件内置词典） |
| 3 核心模块 | `summaryPoints` `localTips` `infoBoundary` | 三块**全部必填且非空** |
| 4 E-E-A-T | `sourceName` / `sourceUrl` / `truthBasis` / `mentionedEntities` / `author`或`authorName` | 信源至少 1 条；**真值声明至少 1 条**；**知识实体至少 1 个**；作者档案或作者名必有 |
| 5 结构化 | `jsonLdType`（+ local-report 的 `businessData`） | geo-faq→FAQPage；local-list/local-comparison→ItemList；local-report→Article 或 LocalBusiness；geo-article→Article。**local-report 还必须填 businessData** |
| 6 转化 | `ctaType` / `leadFormEnabled` | ctaType≠none 或 leadFormEnabled=true（这一条是 warning 级，但仍计入通过判定） |
| 7 合规 | `riskType` | 必填且不能是 none；正文命中敏感词时必须选对应类型（见 15.5） |
| 8 审核 | `reviewChecks` `reviewerName` `reviewedAt` | reviewChecks 的 **eaat / tech / compliance / business 四项全勾**；审核人、审核日期必填 |

### 15.3 需要提前备好的 7 类材料

| # | 材料 | 具体内容 | 对应字段 |
|---|---|---|---|
| 1 | **真值声明库**（先建后选） | 每条含：声明文案、唯一键、类别、规范值、权威来源链接、来源类型、核验日期 | `first-truth-policy`：claim / claimKey / claimCategory / canonicalValue / canonicalSourceUrl / canonicalSourceType / lastVerifiedAt |
| 2 | **知识实体库** | 每个实体：类型、名称、slug、简介、官网链接、同义词链接、核验状态、核验日期 | `knowledge-entity`：entityType / name / slug / description / url / sameAs / verificationStatus / lastVerifiedAt |
| 3 | **知识关系库** | 主体、谓语、客体、举证原文（仅后台可见）、来源链接 | `knowledge-relation`：subjectEntity / predicate / objectEntity / evidenceText / sourceUrl / lastVerifiedAt |
| 4 | **作者档案 / 教练资质** | 姓名、头像、从业年限、持证情况、擅长零基础与儿童 | `author`：name / bio / avatar；文章侧 `authorName` + `authorBio` |
| 5 | **权威信源清单** | 每篇至少 1 条：来源名称 + 公开链接 + 发布时间 | `sourceName` / `sourceUrl` / `sourcePublishedAt` |
| 6 | **正文物料** | HTML 正文（文字/表格/图片/锚链接/引用标注）、封面图（建议 ≥1200×675） | `content` / `coverImage` |
| 7 | **审核材料** | 审核人姓名、审核日期、四类自查结论 | `reviewerName` / `reviewedAt` / `reviewChecks` |

### 15.4 滑雪板块：先备这 4 条真值 + 8 个实体

**真值声明（4 条，全站复用）**

| claimKey | claim | claimCategory | canonicalValue | 来源 |
|---|---|---|---|---|
| class-size | 小班 4–6 人，教练配比 1:4–6 | brand_claim | 4–6 人 / 1:4–6 | 内部教学 SOP |
| coach-cert | 教练持证上岗 | certification | 持滑雪指导员证（证书编号可查） | 教练证书留档 |
| free-retrain | 学不会免费复训 | brand_claim | 掌握犁式刹车+安全停止方为结业；未达标免费复训 | 教学服务协议 |
| all-inclusive | 透明打包价，含雪票/装备/护具/保险/课时 | brand_claim | 无隐形消费，护具不另租，无教练小费 | 价格公示表 |

> 注意：`canonicalValueType` 用 text；`comparisonMode` 用 contains（表述型）。
> `lastVerifiedAt` 必填，否则 llms.txt 会把它当「未核验」，AI 不会引用。

**知识实体（8 个起步）**

| name | entityType | 说明 |
|---|---|---|
| 松花湖滑雪场 | Place | 教学点 |
| 北大湖滑雪场 | Place | 教学点 |
| 五家山滑雪场 | Place | 教学点 |
| 吉林市 | Place | 所在城市 |
| 犁式刹车 | DefinedTerm | 核心技能/结业标准 |
| 零基础启蒙课 | Service | 课程实体 |
| 滑雪护具套装 | Product | 头盔/护臀/护膝 |
| Joyogo 滑雪学院 | Organization | 品牌主体，关联 brand-info |

**知识关系（6 条起步）**：`位于`（雪场→吉林市）、`教授`（课程→犁式刹车）、`包含`（课程→护具套装）、`提供`（机构→课程）、`适用`（护具→零基础）、`同义`（犁式刹车→犁式制动）。

### 15.5 三个最容易踩、且会直接卡发布的坑

| 坑 | 现象 | 处理 |
|---|---|---|
| **敏感词命中** | 正文出现「保险」→ 系统按金融类判定，`riskType` 不是 `finance-*` 就校验不通过 | `riskType` 统一选 **`finance-insurance`**，`riskDisclaimer` 自填「本文所述保险为意外险，保障范围以保单条款为准」 |
| **法律词冲突** | 正文出现「合同/法律/律师」→ 要求 `riskType=legal`，但与上面金融类**不能同时满足** | 正文统一把「合同」改成「**服务协议**」，不写「法律/律师」字样 |
| **local-report 缺 businessData** | 报告类文章发布被拦 | 必须补 `businessData`：`[{period:"2026雪季", content:"共服务学员 N 人", caliber:"口径：自营课程报名人数"}]` |
| 标题缺地域词 | 如「第一次滑雪怕摔怎么办」会被直接拦 | 标题一律带「吉林市/吉林/松花湖」等地域词 |

### 15.6 录入顺序（照这个顺序做，不会返工）

1. 建 `article-category`：滑雪
2. 建 4 条真值声明（`first-truth-policy`）
3. 建 8 个知识实体（`knowledge-entity`）→ 再建 6 条关系（`knowledge-relation`）
4. 建教练档案（`author`）
5. 录入 GEO 文章草稿（status=draft）
6. 逐篇补：地域标题、三模块、信源、truthBasis、mentionedEntities、jsonLdType、businessData（报告类）、CTA
7. 勾选 reviewChecks 四项 + 填审核人/审核日期
8. 改 status=published（此时会自动过校验）

---

## 16. 视觉定稿（方案五 · Slope Energy）

### 16.1 选型结论

从 5 套原型中选定 **方案五 · 运动冲击（Slope Energy）**，作为 `/ski` 板块的视觉基准，
后续课程详情页、GEO 文章页均沿用同一套 token，不再另起风格。

原型文件（同目录）：

| 页面 | 文件 | 用途 |
|---|---|---|
| 板块首页 | `2026-10-27-joyogo-ski-prototype-energy.html` | `/ski` 首屏 + 产品线 + 课程 + 场地 + 案例 + 攻略 + FAQ + 留资 |
| 课程详情页 | `2026-10-27-joyogo-ski-prototype-energy-course.html` | `/products/:slug` · 以「启蒙班」为样板 |
| GEO 文章页 | `2026-10-27-joyogo-ski-prototype-energy-article.html` | `/local-list` · 以「吉林市新手滑雪场怎么选」为样板 |

其余 4 套（`-prototype.html` 暖光卡片、`-dark.html` 夜场沉浸、`-editorial.html` 纸感编辑、
`-minimal.html` 北欧留白）仅作为选型记录保留，不进入实现。

### 16.2 设计 token

| 项 | 值 | 用法 |
|---|---|---|
| `--navy` | `#071528` | 主背景（深色段） |
| `--navy-2` | `#0d2140` | 卡片/次级面板 |
| `--paper` | `#f4f1e8` | 浅色反段背景 |
| `--ink` | `#071528` | 浅色段文字与描边 |
| `--yellow` | `#e8ff3f` | 唯一强调色：CTA、序号、标签、跑马灯 |
| `--orange` | `#d97757` | 仅用于占位符边框（待填项） |
| `--white` | `#f7f5ee` | 浅色卡片底 |
| `--mute` | `#8ea3bd` | 深色段次级文字 |
| 标题字体 | Impact / Arial Narrow Bold 回退 | 全大写、窄体、大字号 |
| 正文字体 | PingFang SC / Microsoft YaHei | 16px / 1.7 |
| 网格 | 1280 / 1180 两档 max-width，32px 边距 | — |

组件规则：

- 按钮统一 `skewX(-6deg)`，内部文字反向 `skewX(6deg)` 抵消。
- 卡片切角两种：右下斜切 `polygon(0 0,100% 0,100% calc(100% - 26px),calc(100% - 26px) 100%,0 100%)`，左上斜切 `polygon(0 18px,18px 0,100% 0,100% 100%,0 100%)`。
- 深浅段交替：深（navy）→ 浅（paper）→ 深 → 浅，保证长页面节奏。
- 序号使用窄体大字（46–88px），透明描边或浅灰实色。
- 动效仅两处：跑马灯（26s 线性循环）+ 卡片 hover 位移；全部受 `prefers-reduced-motion` 关闭。

### 16.3 三页的结构对应

| 区块 | 首页 | 课程详情页 | GEO 文章页 |
|---|---|---|---|
| 数据源 | product / geo-article 聚合 | `product` 单条 | `geo-article`（type=local-list） |
| 首屏 | 品牌主张 + 双产品线入口 | 课程编号 + 结业目标 + 价格锚点 | 标题 + 类型标签 + E-E-A-T 署名行 |
| 核心模块 | 产品线 / 课程 / 为什么 / 场地 / 案例 / 攻略 / FAQ / 留资 | 解决什么 / 四步流程 / 结业标准 / 价格包含项 / 课前准备 / 场地 / 案例 / FAQ / 下一课 / 留资 | 结论先行 / 逐步讲解 / 对比表 / 本地提示 / 真值声明 / FAQ / 相关阅读 / CTA |
| 结构化数据 | Product + LocalBusiness + FAQPage | Product + FAQPage | ItemList + FAQPage |
| 转化 | 首屏双 CTA + 底部表单 | 价格区 CTA + 底部表单 | 侧栏按钮 + 页尾黄色 CTA 条 |

### 16.4 占位与合规约束（三页一致）

1. 价格、电话、地址、ICP/公安备案号、复训规则、改期规则、儿童年龄规则、集合点、雪场票价来源、
   学员信息、作者/审核人、信源链接 —— 一律 `.ph` 橙色虚线占位，**不填编造值**。
2. 实拍图位使用斜纹占位块，文案明确写「不使用 AI 生成图冒充实拍」。
3. 所有信任类主张（4–6 人小班、教练持证、学不会免费复训、透明打包价）标注「待核验」，
   真值声明核验通过前不升级为对外承诺。
4. 案例统一标「需授权」，未获肖像授权的图文不上线。
5. 「保险」「合同」等词会触发 `geo-article` 的 riskType 冲突校验，文章正文统一改用
   「服务协议」「保障说明」表述。
6. 表单仅做原型提示，真实提交走 `POST /v1/leads/submit`。

### 16.5 移动端约定

- ≤1024px：双栏一律转单栏，GEO 文章页正文列必须 `minmax(0,1fr)`，否则对比表会把页面撑出横向滚动。
- ≤720px：隐藏顶部导航与 TEL，汉堡菜单展开；底部固定「拨打电话 / 预约咨询」双按钮；
  正文下方补 `padding-bottom:66px` 避免遮挡。
- 课程详情页的页内二级导航横向滚动，滚动时高亮当前区块。

