# Joyogo · 吉林新手滑雪板块 · A 期内容文案

> 日期：2026-10-24
> 配套设计文档：[2026-10-24-jilin-beginner-ski-website-design.md](./2026-10-24-jilin-beginner-ski-website-design.md)
> 品牌：**Joyogo**（不设中文名）｜板块：**Joyogo 滑雪学院**｜站点：joyogo.com（A 期只做国内站）
> 用途：可直接粘贴进 zhao-website 后台。价格为示例价，上线前按实际定价替换；`xx` 为待填占位。

## 前置约定

- 所有内容 `category` 统一设为 **滑雪**（板块隔离，前端 /ski 按此过滤）。
- 所有详情页沿用插件固定前缀：`/products/:slug`、`/faqs/:slug`、`/local-list/:slug` 等。
- 学习场所：松花湖滑雪场、北大湖滑雪场、五家山滑雪场（吉林市）；长春作辐射客群。

---

# 一、品牌与板块文案（首页 + /ski 板块页）

## 1.1 主品牌

```
主广告语（英）：Joy in every go.
主广告语（中）：快乐出发，快乐加倍。
备用           ：说走就走，乐在其中。/ Go happy. Go Joyogo.
```

## 1.2 滑雪板块

```
板块名        ：Joyogo 滑雪学院（英文副名 Joyogo Ski Academy）
板块广告语    ：第一次滑雪，交给 Joyogo。
英文          ：Your first run starts here.
备用短句      ：不怕摔，才敢滑。
一句话定位    ：只服务第一次滑雪的人——小班教学、学不会免费复训、透明打包价、教练持证、护具全含。
```

## 1.3 /ski 板块首页文案

```
H1      ：Joyogo 滑雪学院 · 吉林新手滑雪，第一次就学会
副标题  ：4–6 人小班｜学不会免费复训｜雪票+装备+护具+保险全含，无隐形消费
三个信任点：
  ① 小班 4–6 人，教练配比 1:4–6
  ② 教练持证，专带零基础与儿童
  ③ 学不会免费复训，掌握犁式刹车再结业
两条产品线入口：
  本地线 —— 周卡/月卡，周末反复练（长春、吉林市）
  旅游线 —— 2 天学会滑雪 + 温泉/雾凇打包（外地游客）
主 CTA  ：免费领取《零基础滑雪避坑清单》
```

---

# 二、课程产品（product，5 条）

> 每条均需：`category = 滑雪`、`status = published`、`availability = in_stock`。

## 2.1 启蒙班

| 字段 | 内容 |
|---|---|
| name | 零基础启蒙课 · 学会刹车安全停止 |
| tagline | 4–6 人小班 · 学不会免费复训 |
| description | 专为完全没上过雪的小白设计，不追求滑快，只求「能停住、不怕摔、敢站上雪道」。 |
| priceRange | 299–499 元 |
| price | 499 |
| features | 课时：2 小时/次；班型：4–6 人小班；装备：雪板雪鞋+头盔护臀护膝全含；保险：含意外险；保障：学不会免费复训 |
| specifications | 教练配比 1:4–6；结业标准：掌握犁式刹车+安全停止；适合年龄 6–55 岁；场地：松花湖/北大湖/五家山任选 |
| scenarios | 研学、亲子、成人上班族、闺蜜小团 |

## 2.2 基础班

| 字段 | 内容 |
|---|---|
| name | 基础班 · 犁式转弯与初级道控速 |
| tagline | 从「能停」到「能滑」，初级道全程无压力 |
| description | 在已掌握刹车的基础上，学会犁式转弯与初级道控速滑行。 |
| priceRange | 599–899 元 |
| price | 899 |
| features | 课时：3 节课；班型：小班；装备全含；保险含；考核通过发结业证 |
| specifications | 结业标准：初级道独立控速下滑+安全制动；前置：已掌握刹车停止；场地：松花湖/北大湖/五家山 |
| scenarios | 本地复训、周末连续课 |

## 2.3 进阶班

| 字段 | 内容 |
|---|---|
| name | 进阶班 · 平行式入门 |
| tagline | 从犁式到平行式，迈向中级道 |
| description | 面向已能稳定犁式下初级道的学员，过渡到平行式。 |
| priceRange | 999–1299 元 |
| price | 1299 |
| features | 课时：4 节课；私教/小班可选；中级道上雪 |
| specifications | 结业标准：中级道平行式连贯滑行；前置：基础班结业 |
| scenarios | 进阶玩家、长期学员 |

## 2.4 本地线 · 周卡/月卡

| 字段 | 内容 |
|---|---|
| name | 本地畅滑卡 · 周卡/月卡 |
| tagline | 家住长春/吉林市，周末反复练，一次付费管一个月 |
| description | 为本地学员设计的反复练习方案，有效期内不限次预约教学。 |
| priceRange | 周卡 399 元 / 月卡 999 元 |
| price | 999 |
| features | 有效期内不限次教学预约；错峰时段优先；社群陪练；装备全含 |
| specifications | 适用：长春/吉林市本地学员；有效期：7 天 / 30 天 |
| scenarios | 学生、上班族、亲子周末 |

## 2.5 旅游线

| 字段 | 内容 |
|---|---|
| name | 2 天小白学会滑雪 · 含温泉/雾凇打包 |
| tagline | 这次来吉林，真教会你滑雪，顺便泡温泉看雾凇 |
| description | 面向外地游客：2 天教学 + 接送 + 住宿 + 温泉/雾凇/民俗餐可选。 |
| priceRange | 1299–1999 元 |
| price | 1699 |
| features | 2 天教学；住宿+接送；温泉/雾凇/民俗餐可选；装备全含；保险含 |
| specifications | 结业标准：独立犁式刹车下初级道；适合 6–55 岁零基础；行程 2–3 天 |
| scenarios | 南方游客、周末高铁客、情侣闺蜜 |

---

# 三、常见问答（faq，20 条）

格式：`question` / `answer`，`category = 滑雪`。

1. **吉林市零基础滑雪贵吗？**
   全包价 299 元起，含雪票+雪板雪鞋+头盔护具+保险+课时，无隐形消费，不需要单独租护具、无需教练小费。

2. **第一次滑雪会摔得很疼吗？**
   我们会先教「怎么安全地摔、怎么站起来」，配齐护臀护膝头盔，从平地练起，摔是可控的。

3. **零基础多久能学会刹车？**
   大多数成人一节启蒙课（约 2 小时）就能掌握犁式刹车和安全停止。

4. **学不会怎么办？**
   学不会免费复训，掌握犁式刹车再结业——这是我们的承诺，具体规则见「合规与安全」页。

5. **小班几个人？**
   启蒙/基础班 4–6 人，教练配比 1:4–6；也可选 1v1。

6. **要自己带装备吗？**
   不需要，雪板雪鞋头盔护具全部包含，人来就行。

7. **松花湖、北大湖、五家山，新手去哪个？**
   都适合新手。我们按你住的方位和当天人流排课，避开初级道人挤人的高峰时段。

8. **滑雪和温泉/雾凇怎么一起安排？**
   走旅游线，2 天教学 + 温泉/雾凇/民俗餐打包，行程我们配好。

9. **南方人第一次来吉林滑雪要注意什么？**
   保暖分层穿、提前 1 小时到、别空腹；课前有线上预习视频可先看。

10. **孩子几岁能学？**
    6 岁以上可参加零基础课，教练有儿童教学经验，亲子班可陪同。

11. **需要买滑雪保险吗？**
    打包价已含意外险。

12. **一个人报名会不会尴尬？**
    小班全是新手，同伴都是第一次，气氛友好，我们还常组「新手局」。

13. **周末人太多怎么办？**
    错峰教学，避开高峰时段，选人少的时段上课。

14. **怎么从长春过去？**
    自驾/高铁都方便，旅游线含接送，具体看套餐。

15. **女孩子学滑雪难吗？**
    不难，女生柔韧性和重心控制通常更好，闺蜜小团很受欢迎。

16. **可以分期上课吗？**
    可以，本地周卡/月卡就是为反复练习设计的，可多次预约。

17. **团建/研学能做吗？**
    可以，有标准化团体课程，直接对接企业 HR / 学校 / 旅行社。

18. **体验课和正式课什么区别？**
    体验课 1 小时感受；正式课是小班体系课，有结业标准和复训保障。

19. **课后会忘吗？**
    有视频复盘和《零基础滑雪学习手册》，可反复看，社群还能约复练。

20. **怎么报名？**
    点页面「免费咨询」留电话或加微信，客服 1 对 1 帮你选课排序。

---

# 四、GEO 文章（geo-article，6 篇）

> **发布硬门槛**：`geo-article` 改为 `status = published` 时会强制校验，不达标直接报 `GEO_AUDIT_FAIL` 发不出去。
> 每篇必须齐全：地域词标题、`summaryPoints` / `localTips` / `infoBoundary` 三模块、信源、真值声明、
> 知识实体、作者、匹配的 `jsonLdType`、非 none 的 `riskType`、审核四勾 + 审核人 + 审核日期。
> 物料准备与完整规则见设计文档第 15 节。

## 4.0 每篇通用字段（复制这段，再填各自差异）

```
category          = 滑雪
status            = draft            # 齐了再改 published
authorName        = （教练姓名）
authorBio         = （持证情况 + 从业年限 + 擅长零基础/儿童）
sourceName        = （权威来源名称）
sourceUrl         = （公开链接）
sourcePublishedAt = （发布时间）
riskType          = finance-insurance
riskDisclaimer    = 本文所述保险为意外险，保障范围以保单条款为准；教学服务以签署的服务协议为准。
reviewChecks      = {eaat: true, tech: true, compliance: true, business: true}
reviewerName      = （审核人）
reviewedAt        = （审核日期）
metaDescription   = （必须含「吉林」本地场景词）
leadFormEnabled   = true
```

> **两个措辞红线**：正文出现「保险」→ `riskType` 必须是 `finance-insurance`（已按此设置）；
> 正文**不要写「合同 / 法律 / 律师」**，统一写「服务协议 / 合规说明」——否则会要求 `riskType=legal`，与金融类冲突导致发不出去。


## 4.1 local-list｜吉林市新手滑雪场怎么选（含五家山）

```
type            = local-list
title           = 吉林市新手滑雪场怎么选：松花湖、北大湖、五家山
metaTitle       = 吉林市新手滑雪场推荐：松花湖/北大湖/五家山怎么选
metaDescription = 吉林市零基础滑雪去哪家？松花湖、北大湖、五家山三家新手友好度、价格、人流量对比，附透明打包价。
listItems       = [
  {"name":"松花湖滑雪场","desc":"初级道独立、配套成熟，新手最友好","price":"含雪票教学从xx元起","link":"/products/lingji-qimeng"},
  {"name":"北大湖滑雪场","desc":"雪质好、中高级道多，新手建议错峰","price":"含雪票教学从xx元起","link":"/products/lingji-qimeng"},
  {"name":"五家山滑雪场","desc":"相对小众、人流少，适合怕拥挤的初学者","price":"含雪票教学从xx元起","link":"/products/lingji-qimeng"}
]
jsonLdType        = ItemList
summaryPoints     = 三家都适合新手：松花湖配套最成熟、北大湖雪质最好但需错峰、五家山人流最少
localTips         = 吉林市市区到松花湖最近；节假日初级道人最多，建议选工作日上午上雪
infoBoundary      = 本文对比基于 2026 雪季公开票价与新手上雪体验，不含高级道、住宿与餐饮评价
truthBasis        = [小班4–6人, 透明打包价]
mentionedEntities = [松花湖滑雪场, 北大湖滑雪场, 五家山滑雪场, 吉林市]
internalLinks     = [{课程中心:/products}, {常见问题:/faqs}]
ctaType           = consult-appointment
```

## 4.2 local-comparison｜松花湖 vs 北大湖 vs 五家山

```
type            = local-comparison
title           = 松花湖 vs 北大湖 vs 五家山：新手该去哪个？
metaTitle       = 松花湖vs北大湖vs五家山 新手滑雪对比（2026吉林）
metaDescription = 三家吉林市滑雪场新手向实测对比：新手友好度、人流量、交通便利、价格透明度，一次看清。
comparisonData  = [
  {"dimension":"新手友好度","items":[
    {"name":"松花湖","score":9,"note":"初级道独立，教练点位多"},
    {"name":"北大湖","score":7,"note":"雪质好但中高级道多"},
    {"name":"五家山","score":8,"note":"坡度平缓、人流少"}]},
  {"dimension":"人流量少","items":[
    {"name":"五家山","score":9,"note":"偏小众，排队少"},
    {"name":"北大湖","score":7,"note":"节假日较拥挤"},
    {"name":"松花湖","score":6,"note":"热门，初级道高峰拥挤"}]},
  {"dimension":"交通便利","items":[
    {"name":"松花湖","score":8,"note":"距吉林市区近"},
    {"name":"北大湖","score":7,"note":"自驾为主"},
    {"name":"五家山","score":7,"note":"自驾方便"}]},
  {"dimension":"价格透明","items":[
    {"name":"松花湖","score":9,"note":"打包价无隐形消费"},
    {"name":"北大湖","score":9,"note":"打包价无隐形消费"},
    {"name":"五家山","score":9,"note":"打包价无隐形消费"}]}
]
jsonLdType        = ItemList
summaryPoints     = 新手友好度：松花湖 9 > 五家山 8 > 北大湖 7；怕拥挤优先五家山，图配套优先松花湖
localTips         = 北大湖中高级道多，零基础务必错峰并固定在初级道区域练习；五家山坡缓人少更适合第一课
infoBoundary      = 评分为 1–10 的主观体验分值，基于新手视角，不适用于进阶玩家选场
truthBasis        = [教练持证]
mentionedEntities = [松花湖滑雪场, 北大湖滑雪场, 五家山滑雪场]
internalLinks     = [{旅游线:/products/lvyou-2tian}, {新手攻略:/local-list}]
ctaType           = consult-appointment
```

## 4.3 geo-faq｜第一次滑雪怕摔、怕尴尬怎么办

```
type           = geo-faq
faqQuestion    = 第一次滑雪怕摔、怕尴尬怎么办？
title          = 吉林市第一次滑雪怕摔怕尴尬？四步让新手安全上雪
metaDescription = 第一次滑雪怕摔怕尴尬？吉林新手教学四步：先学安全摔倒站起、全程护具、小班全是新手、从平地练起。
jsonLdType     = FAQPage
summaryPoints  = ①先学安全摔倒与站起 ②护臀护膝头盔全含 ③小班全是新手不尴尬 ④从平地练起再上初级道
localTips      = 吉林市雪季 12 月至次年 3 月，新手建议选工作日上午人少时段；上雪前别空腹
infoBoundary   = 以上为常见新手场景的通用建议，个体体能与年龄差异请以教练现场评估为准
truthBasis     = [护具全含, 小班4–6人]
mentionedEntities = [犁式刹车, 滑雪护具套装]
internalLinks  = [{启蒙班:/products/lingji-qimeng}]
ctaType        = consult-appointment
```

## 4.4 local-report｜吉林市亲子滑雪研学怎么安排

```
type           = local-report
title          = 吉林市亲子滑雪研学怎么安排？教练给出标准方案
metaDescription = 吉林市亲子滑雪研学安排：6岁以上可学、亲子班可陪同、团体标准化课程、含意外险，松花湖/北大湖/五家山均可。
serviceScope   = 服务吉林市区县，含松花湖/北大湖/五家山教学点，团体可安排接送
sourceName     = 吉林市文旅局公开信息
sourceUrl      = https://...
jsonLdType     = Article
summaryPoints  = 6岁以上可学；亲子班家长可陪同；研学团体有标准化课程与结业标准；打包价含保险
localTips      = 吉林市研学团体建议提前 5 个工作日预约；儿童需自带保暖内衣与手套内衬
infoBoundary   = 年龄与陪同规则为通用口径，具体团体方案按人数、场地与时段单独确认
businessData   = [{period:"2026雪季", content:"研学团体单班上限 20 人", caliber:"口径：自营团体课程排班规则"}]
truthBasis     = [透明打包价, 教练持证]
mentionedEntities = [松花湖滑雪场, 北大湖滑雪场, 五家山滑雪场, 零基础启蒙课]
internalLinks  = [{课程中心:/products}, {学员案例:/cases}]
ctaType        = consult-appointment
```

## 4.5 geo-article｜零基础到犁式刹车：标准教学四步法

```
type           = geo-article
title          = 零基础到犁式刹车：标准教学四步法（吉林教学版）
metaTitle      = 零基础滑雪多久学会？犁式刹车标准四步法（吉林教学版）
metaDescription = 零基础滑雪多久能学会？吉林新手教学四步法：安全落地、平地推进、犁式制动、初级道控速，一节启蒙课掌握刹车。
jsonLdType     = Article
summaryPoints  = ①安全落地与摔倒 ②平地推进与站姿 ③犁式制动 ④初级道控速
localTips      = 吉林市初级道上午雪面较硬更易控速；练习时避开中午人流高峰
infoBoundary   = 四步法面向零基础成人，儿童与长者应按体能调整进度
truthBasis     = [结业标准:掌握犁式刹车+安全停止, 学不会免费复训]
mentionedEntities = [犁式刹车, 零基础启蒙课]
internalLinks  = [{启蒙班:/products/lingji-qimeng}, {犁式刹车三步教学:/tutorials/lixi-shache}]
ctaType        = consult-appointment
```

## 4.6 local-report｜2 天学会滑雪 + 温泉雾凇怎么安排

```
type           = local-report
title          = 吉林市 2 天学会滑雪+温泉雾凇：外地游客最省心行程
metaDescription = 来吉林 2 天学会滑雪怎么安排？2天教学+接送+住宿+温泉/雾凇/民俗餐打包，装备全含，适合南方游客与周末高铁客。
serviceScope   = 高铁/机场接送 + 2 天教学 + 住宿；温泉/雾凇/民俗餐可选
sourceName     = 本地住宿与温泉合作方公开报价
sourceUrl      = https://...
jsonLdType     = Article
summaryPoints  = Day1 上午线上预习+下午上雪1节课；Day2 上午复训1节+下午温泉或雾凇；装备全含，人来就行
localTips      = 吉林市 12 月–次年 2 月雾凇出现概率最高，看雾凇需早出发；高铁到吉林站后由套餐接送
infoBoundary   = 行程为示例排期，实际以当日雪场开放时间、天气与温泉预约情况调整
businessData   = [{period:"2025–2026雪季", content:"2 天旅游线含 2 节教学课", caliber:"口径：打包产品课程配置"}]
truthBasis     = [透明打包价, 学不会免费复训]
mentionedEntities = [松花湖滑雪场, 零基础启蒙课, 吉林市]
internalLinks  = [{旅游线:/products/lvyou-2tian}, {常见问题:/faqs}]
ctaType        = consult-appointment
```

---

# 五、配套内容（首批同步准备）

| 内容类型 | 数量 | 填写要点 |
|---|---|---|
| tutorial | 6 | 课前预习（装备穿戴、安全摔倒）+ 课后复盘（犁式刹车三步）；`difficulty=beginner`，`steps=[{title,content}]` |
| case | 6 | `challenge`/`solution`/`results`/`testimonial` 四段式；results 只写客观事实 |
| compliance | 4–6 | 免责声明、保险说明、护具配置、复训规则边界 |
| author | 8–10 | 教练档案：持证情况、从业年限、是否擅长零基础/儿童 |
| download | 1–2 | 《零基础滑雪学习手册》PDF，`requireLead=true` |

## 内容合规红线

- 禁止「保证学会」「保证不摔」「绝对安全」类承诺，统一改客观事实表述。
- 「学不会免费复训」必须写明规则边界：什么算学会、复训次数、有效期。
- 教练资质、保险条款必须真实可查。
- 学员照片/视频必须取得肖像权授权。
