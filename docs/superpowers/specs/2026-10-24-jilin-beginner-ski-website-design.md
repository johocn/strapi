# 吉林市新手滑雪项目 · 网站需求与开发任务设计（zhao-website）

> 日期：2026-10-24
> 定位：吉林市新手滑雪学院官网。核心交付「学会滑雪」，而非卖雪票/拼高级道。
> 底座：zhao-website 插件（SEO/AEO 内容资产 + 品牌展示 + 线索转化）。

---

## 0. 一句话定位

做一个「吉林市新手滑雪」内容官网：让第一次滑雪的人，在百度 / 豆包 / DeepSeek / 小红书
搜「吉林零基础滑雪 / 新手滑雪教学」时第一个看到我们，看完愿意留电话/加微信，然后成交课程。

## 1. 三项目标（可衡量）

| 目标 | 指标 |
|---|---|
| GEO 头部 | AI 搜索「吉林市零基础滑雪」等词时，本站内容进入 AI 引用前 3 |
| 百度 SEO 头部 | 「吉林市滑雪教学」等词自然结果前 3 |
| 线索转化 | 月有效线索量、留资率、加微率 |

## 2. 学习场所（教学场地）

- 松花湖滑雪场（吉林市）
- 北大湖滑雪场（吉林市）
- 五家山滑雪场（吉林市）
- 辐射客群：长春（庙香山、天定山等本地雪场）

> 知识图谱实体、GEO 对比/清单内容均覆盖以上场地；对比维度以「新手友好度」为核心。

## 3. 目标用户与场景

| 用户 | 诉求 | 网站必须回答 |
|---|---|---|
| 本地初学者（长春/吉林市上班族、亲子、学生） | 找靠谱课程、怕被坑、想反复练 | 多少钱全包？小班几人？学不会怎么办？周末能连续上吗？ |
| 外地旅游小白（南方游客、高铁客、研学团） | 2–3 天学会 + 顺便玩 | 怎么过去？装备要不要自带？滑雪+温泉/雾凇怎么搭？ |
| 家长 / 企业 HR / 旅行社（B 端分销） | 找标准化教学产品 | 有没有能直接卖的标准化课程和介绍？ |

## 4. 产品线

1. **分级课程**：启蒙班（0 基础 · 学会刹车停止）→ 基础班（犁式转弯 · 初级道控速）→ 进阶班（平行式 · 中级道）。
2. **本地线**：周卡 / 月卡 / 周末连续课，主打就近反复练习。
3. **旅游线**：2–3 天小白学会滑雪 + 吉林轻文旅（温泉/雾凇/民俗餐）打包。
4. **保障**：小班 4–6 人、学不会免费复训、教练持证、护具全含、透明打包价（无隐形消费）。

## 5. 站点结构

```
首页
├── 课程中心（product）
│   ├── 启蒙班 / 基础班 / 进阶班
│   ├── 本地线（周卡/月卡）
│   └── 旅游线（2–3 天打包）
├── 教练团队（author）—— 资质 E-E-AT 背书
├── 学员案例（case）—— 零基础前后对比
├── 新手攻略（geo-article）—— 清单/对比/问答/报告/攻略
├── 学习中心（tutorial + download）—— 预习/复盘 + 手册（留资）
├── 常见问题（faq）
├── 关于我们（brand-info）
├── 合规与安全（compliance）—— 免责/保险/护具/复训规则
└── 留资转化（lead）
```

## 6. 内容字段填法（对应真实字段）

### 6.1 课程产品（product）

```
name            = 「零基础启蒙课 · 学会刹车安全停止」
tagline         = 「4-6人小班 · 学不会免费复训」
description     = 面向完全没上过雪的本地/游客小白
price           = 499  （currency 默认 CNY）
priceRange      = "299-899"
availability    = in_stock
features        = [{课时, 班型, 装备, 保险, 保障}]
specifications  = [{教练配比, 结业标准, 适合年龄}]
scenarios       = [{研学, 团建, 亲子, 成人}]
```

> 结构化数据自动输出为 `Product`（非 Course）。「学不会免费复训」同时挂 features + compliance。

### 6.2 GEO 文章（geo-article）

按 `type` 五选一：

| type | 必填字段 |
|---|---|
| local-list | listItems |
| local-comparison | comparisonData |
| geo-faq | faqQuestion |
| local-report | serviceScope + sourceName |
| geo-article | summaryPoints + truthBasis |

通用必填：`authorName/authorBio`（E-E-AT）、`sourceName/sourceUrl`（信源）、
`truthBasis`（真值声明）、`internalLinks`（1–2 处内链）、`ctaType`、
`leadFormEnabled=true`、`metaDescription`（含本地场景词）。

### 6.3 FAQ / tutorial / case / lead

- faq：question 用用户真实搜索词，answer 直接回答 + 内链。
- tutorial：steps 数组自动转 HowTo schema；difficulty=beginner；videoUrl 挂复盘视频。
- case：challenge/solution/results/testimonial；results 只写客观事实，禁止保证类承诺。
- lead：type（appointment/intent_order/quote/referral）、utm 自动带、referralCode 老带新。

## 7. sitemap 收录规则

| 内容类型 | URL 前缀 | 优先级 |
|---|---|---|
| article | /articles/ | 0.7 |
| product | /products/ | 0.8 |
| case | /cases/ | 0.6 |
| tutorial | /tutorials/ | 0.6 |
| faq | /faqs/ | 0.5 |
| geo-article | /geo-article、/geo-faq、/local-list、/local-comparison、/local-report | 0.8 |
| knowledge-entity | /knowledge/ | 0.6 |

> compliance、download 不在 sitemap 名单中；合规页靠文章内链导流，手册页靠 CTA 引流。
> `sitemapExcludeTypes` 默认不排除任何类型。

## 8. 关键词全表

- 品类词 → 课程页：吉林市滑雪教学 / 零基础滑雪吉林 / 新手滑雪培训 / 滑雪一对一
- 选址对比词 → comparison：松花湖 vs 北大湖 vs 五家山 新手
- 价格词 → list/课程：吉林滑雪课多少钱 / 新手滑雪价格表
- 恐惧词 → geo-faq/攻略：第一次滑雪怕摔 / 滑雪怕尴尬 / 滑雪会摔伤吗
- 场景词 → report：亲子滑雪吉林 / 学生滑雪吉林 / 团建滑雪 / 滑雪研学吉林
- 旅游打包词 → list/课程：吉林滑雪+温泉 / 滑雪+雾凇 / 南方人第一次滑雪吉林
- 长尾词 → faq：零基础滑雪多久学会 / 滑雪要准备什么 / 滑雪保险怎么买

## 9. 开发任务清单

阶段一（配置）：建站 site-config → seo-config 全局（含 geoRegion=吉林、geoPlacename=吉林市、
geoPosition=经纬度、areaServed=[吉林市,长春市]、aiCrawlerPolicy=allow_all、百度验证/推送）→ brand-info。

阶段二（内容）：product 5、geo-article 20–30、faq 20、tutorial 6、case 6、compliance 4–6、author 8–10、download 1–2。

阶段三（权威建设）：knowledge-entity（场地/课程/装备）+ knowledge-relation（位于/教授/包含）
+ first-truth-policy（小班 4–6 人、教练持证、学不会免费复训、透明打包价）。

## 10. 关键决策

1. 转化模式：首期 = GEO 获客 + 留资加微私域成交（不配在线支付）。在线下单/预约排期走二期（zhao-deal/zhao-course 或小程序）。
2. 地域：吉林市主战场（松花湖/北大湖/五家山），长春辐射。
3. 前端接缝：URL 前缀须与 sitemap 一致；geo-article 五类路由需前端支持；compliance 收录靠内链。

## 11. 风险与合规

- 禁止收益/安全承诺话术（保证学会/保证不摔），一律客观事实表达。
- 教学资质、免责、保险条款真实可查（E-E-AT 反扣分）。
- 淡季：预售 + 室内四季雪 + 攻略内容持续发，防止搜索权重归零。