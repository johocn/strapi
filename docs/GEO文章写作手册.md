# GEO 文章写作手册

> 适用对象：内容运营 / 编辑 / 审核岗
> 适用内容：zhao-website 插件「GEO 文章」发布（5 种文章类型）
> 配套：后台发布页字段 + 前端 [www.joho.cn](http://www.joho.cn) 渲染模块链
> 本文写作结构：每个字段均按「设计目的 → 为什么这样设计 → 与其他数据的关系 → 如何填写（含示例）→ 这样做的好处」展开。

***

## 0. 阅读方式与手册总纲

### 0.1 设计目的

本手册回答三个问题：

1. **一篇文章由哪些模块组成**——发布页每个字段会渲染到页面哪个位置。
2. **每个模块为什么存在**——对应什么内容策略（本地 SEO、E-E-A-T、信任体系、转化承接）。
3. **怎么填才算合格**——逐字段规范 + 正反例 + 验收清单。

### 0.2 为什么这样设计（整体逻辑）

GEO 文章是"本地化内容 + 信任背书 + 转化承接"三位一体的内容单元：

- **本地化**：本地资讯/问答/报告/对比/清单，围绕服务区县与场景词写作（metaDescription 建议含吉林本地场景词）。

- **信任背书**：来源引用、真值声明、实体提及、作者卡片、审核信息，共同支撑 E-E-A-T（经验/专业/权威/可信）。

- **转化承接**：CTA、留资表单、悬浮客服、积分发放，把阅读流量转化为咨询/留资/下载。

### 0.3 与其他数据的关系

- **站点隔离**：每篇文章必须挂在 `site`（站点配置）下，前端按域名只展示本站点内容。

- **多语言**：`localized: true` 的字段（标题/正文/摘要/边界/免责等）各语言独立，前端 `/en/` 前缀 + hreflang 输出，缺翻译自动回退默认语言。

- **内容中台**：标签（zhao-tag）、分类（article-category）、真值声明（first-truth-policy）、知识实体（knowledge-entity）、作者档案（author）均为独立内容类型，通过关系关联，供跨文章复用。

### 0.4 前端渲染结构（写作视角，自上而下）

```
[RiskTip 风险提示]（固定，按 riskType）
[breadcrumb 面包屑] → [article-header 头部] → [geo-body 正文]
→ [comparison-table 对比表]① → [local-list 本地清单]② → [citation 引用]
→ [internal-link 内链] → [summary-tips 要点总结+本地贴士] → [info-boundary 信息边界]
→ [truth-basis 真值声明] → [entity-mentions 实体提及] → [author-card 作者卡片]
→ [cta 行动号召] → [lead-form 留资表单] → [geo-footer 页脚]
① 仅 type=local-comparison 渲染  ② 仅 type=local-list 渲染
```

模块顺序/启停由四级模板体系配置（默认如上），写作时只需按字段填写，无需关心顺序。

***

## 1. 文章类型（先选型，再写作）

### 1.1 设计目的

5 种类型对应 5 条本地化内容线，各有不同的页面骨架与结构化数据。

### 1.2 为什么这样设计

不同类型承载不同搜索意图：

| type                    | 搜索意图           | 页面骨架                    |
| ----------------------- | -------------- | ----------------------- |
| `geo-article` 本地资讯      | "XX地 怎么样/最新"   | 资讯正文                    |
| `geo-faq` 本地问答          | "XX地 XX 怎么办"   | 问答式正文 + FAQPage JSON-LD |
| `local-report` 本地报告     | "XX地 市场/趋势 报告" | 报告正文 + 数据表格             |
| `local-comparison` 对比评测 | "XX vs XX 哪个好" | 对比表模块                   |
| `local-list` 本地清单       | "XX 推荐/清单/排名"  | 清单模块                    |

### 1.3 与其他数据的关系

`type` 决定：路由前缀（/geo-faq/、/local-report/ 等）、页面分类标签、JSON-LD 默认类型、对比表/清单模块是否渲染。`faqQuestion` 仅 geo-faq 使用；`comparisonData` 仅 local-comparison；`listItems` 仅 local-list。

### 1.4 如何填写（含示例）

- 一篇内容只选一个最贴合的意图类型，不混写。

- 示例：用户搜"吉林 近视手术 公立还是私立"→ `geo-faq`，标题写问答式，正文先给结论再展开依据。

### 1.5 这样做的好处

意图与页面骨架一一对应，命中长尾搜索词，结构化数据（FAQPage/ItemList）可直接产出。

***

## 2. 标题、编号与封面（title / slug / faqQuestion / articleNo / coverImage / publishedAt）

### 2.1 设计目的

定义文章的搜索入口、唯一标识与首屏视觉。

### 2.2 为什么这样设计

- `title` 同时是 H1 与分享标题候选，必须含本地场景词。

- `slug` 由标题自动生成（uid），用于 URL，发布后不可随意改（改后旧链接失效，需做跳转）。

- `articleNo` 是**唯一数字标签**，用于页面"编号"展示与统计追踪（前端阅读埋点用 articleNo 兜底目标）。

- `faqQuestion`：geo-faq 专用，作为 H1 展示（优先于 title）。

- `coverImage`：封面图，用于列表卡片与分享缩略图。

- `publishedAt`：发布时间，展示在文章头部元信息行。

### 2.3 与其他数据的关系

- `slug` → URL 路径；`articleNo` → 埋点/统计关联；`faqQuestion` → GeoHeader 展示；`coverImage` → 分享/列表；`publishedAt` → GeoHeader 元信息。

### 2.4 如何填写（含示例）

- title：≤200 字，**含 \[城市/区县] + \[行业/场景] + \[价值词]**。

  - ✅ 示例：`吉林市近视手术医院怎么选：公立与私立的真实差异`

  - ❌ 反例：`近视手术全攻略`（无地域、无差异化）

- faqQuestion：问句形式。

  - ✅ 示例：`吉林做近视手术安全吗？公立医院和私立机构怎么选？`

- articleNo：发布前分配（如 `JL-2026-001`），保持唯一。

- coverImage：选清晰、与标题内容相关的本地实拍/机构图，比例建议 16:9；禁止无版权图片。

- publishedAt：与内容时间一致（报告类填统计周期截止后的实际发布日），不填未来时间。

### 2.5 这样做的好处

标题命中本地长尾词，URL 稳定可被收录，编号让每篇文章可被统计与引用，封面与时间提升点击率与时效信号。

***

## 3. 正文（content，HTML）

### 3.1 设计目的

文章主体内容，页面核心。

### 3.2 为什么这样设计

支持富文本（文字/表格/图片/锚链接/引用标注），允许在正文中穿插结构化元素（表格用于数据、锚链用于内链跳转、引用标注用于出处）。

### 3.3 与其他数据的关系

正文与引用（citation）、内链（internal-links）、真值声明、实体提及形成"论证网络"：正文主张 → 引用支撑 → 实体点名 → 真值背书。正文中提到的关键数据建议与 `businessData` 口径一致。

### 3.4 如何填写（含示例）

1. **结论先行**：第一段给核心结论（用户 3 秒内获得答案）。
2. **分节论证**：每节一个小标题，正文内可用 H2/H3。
3. **数据表格**：涉及对比/统计用表格（本地报告必填）。
4. **引用标注**：引用第三方数据处标注来源序号，与 citation 模块对应。
5. **锚链接**：正文内嵌 1-2 处内部锚链（跳站内其他文章/落地页）。
6. 长度建议：报告/对比 800-2000 字，问答 300-800 字。

   - ✅ 示例（表格片段）：

     ```html
     <h2>吉林市两家机构核心差异</h2>
     <table><tr><th>维度</th><th>A 机构</th><th>B 机构</th></tr>
     <tr><td>设备</td><td>...</td><td>...</td></tr></table>
     ```

   - ❌ 反例：大段无小标题的墙式文字、只有结论无依据、数据无出处。

### 3.5 这样做的好处

正文结构决定"可读性 + 可收录性 + 可信度"，表格与引用提升 E-E-A-T，锚链提升站内权重流转。

***

## 4. 风险提示（riskType / riskDisclaimer）

### 4.1 设计目的

在正文前展示风险/声明提示条，降低合规风险。

### 4.2 为什么这样设计

金融/健康/法律类内容需强制声明。枚举化（20 态）保证文案统一，`riskDisclaimer` 允许按文章微调。

### 4.3 与其他数据的关系

与文章内容领域相关：涉及投资理财选 `finance-*` 细分品类（股票/基金/债券等 16 类），涉及健康医疗选 `health`，涉及法律选 `legal`，一般信息分享选 `other`，不需要选 `none`（不渲染）。

### 4.4 如何填写（含示例）

- 默认：选最贴近的品类即可，前端自动渲染对应标签与文案。

- 自定义：`riskDisclaimer` 填附加说明（localized），覆盖默认文案。

  - ✅ 示例：股票类文章选 `finance-stock`；如需强调"本内容仅为某次调研记录"则填 `riskDisclaimer`。

  - ❌ 反例：理财内容选 `none`（漏声明）。

### 4.5 这样做的好处

统一合规声明，减少运营逐篇手写，避免"该声明未声明"。

***

## 5. 对比表（comparisonData，仅 local-comparison）

### 5.1 设计目的

以评分维度矩阵呈现多个对象的横向对比。

### 5.2 为什么这样设计

对比意图用结构化矩阵最能命中"XX vs XX"搜索，且可直接生成表格视觉模块。

### 5.3 与其他数据的关系

与正文表格互补：正文讲论证，对比表模块做"一眼对比"。对象名称尽量与 `mentionedEntities`（实体提及）一致，形成实体关联。

### 5.4 如何填写（含示例）

JSON 结构：`[{ "dimension": "维度名", "items": [{ "name": "对象", "score": 8.5, "note": "说明" }] }]`

- dimension：3-6 个维度（如 设备、医生、价格、术后服务）。

- score：0-10 分，客观、有依据。

- note：一句话说明打分依据。

  - ✅ 示例：

    ```json
    [{ "dimension": "设备", "items": [
       { "name": "A机构", "score": 9, "note": "2025 年购入最新一代设备" },
       { "name": "B机构", "score": 7, "note": "设备较老但维护良好" }] }]
    ```

  - ❌ 反例：无 note 的裸打分、维度少于 3 个、score 无依据。

- 维度 3-6 个；**每个分数必须带 note 依据**（一句话说明打分理由），禁止裸分。

### 5.5 这样做的好处

结构化对比可被 ItemList/LocalBusiness 结构化数据引用，提升搜索展现。

***

## 6. 本地清单（listItems，仅 local-list）

### 6.1 设计目的

以清单卡片形式呈现"推荐/排名/选购清单"。

### 6.2 为什么这样设计

清单类搜索（"XX 推荐/清单"）用卡片列表最直观，每项可带价格与跳转链接。

### 6.3 与其他数据的关系

`link` 可指向站内落地页或 `vendureProductListId` 关联的商品列表；价格与 `businessData` 口径一致。

### 6.4 如何填写（含示例）

JSON 结构：`[{ "name": "名称", "desc": "描述", "price": "价格", "link": "URL" }]`

- ✅ 示例：

  ```json
  [{ "name": "全飞秒套餐", "desc": "适合 18-45 岁，术后当天可恢复", "price": "¥16800 起", "link": "/products/flysmile" }]
  ```

- ❌ 反例：name 雷同、desc 空白、price 无单位。

- 每项必须完整填写：名称 + 描述 + 价格 + 跳转链接；缺失任一视为条目不达标。

### 6.5 这样做的好处

清单卡片 + 价格透明增强可信，link 直接承接转化。

***

## 7. 引用（sourceName / sourceUrl / sourcePublishedAt）

### 7.1 设计目的

标注权威来源，支撑数据与结论。

### 7.2 为什么这样设计

E-E-A-T 的核心证据链：正文每处关键数据都能溯源到公开信源。

### 7.3 与其他数据的关系

与正文引用标注对应；来源需真实公开（政府/协会/权威媒体）。

### 7.4 如何填写（含示例）

- sourceName：来源机构名；sourceUrl：可访问的公开链接；sourcePublishedAt：来源发布时间。

  - ✅ 示例：sourceName=`吉林省卫健委`，sourceUrl=`https://.../official`，sourcePublishedAt=`2026-08-01`。

  - ❌ 反例：填"某专家说"（无实名）、私密链接、过期信息不标时间。

### 7.5 这样做的好处

来源可溯源，显著提升信任度与收录质量。

***

## 8. 内链（internalLinks / vendureProductListId）

### 8.1 设计目的

站内锚文本跳转，串联内容与转化页。

### 8.2 为什么这样设计

1-2 处精准内链既不过度优化，又能把阅读权重导给转化页/相关文章。

### 8.3 与其他数据的关系

`internalLinks`（{text, url}）为自定义锚链；`vendureProductListId` 关联 Vendure 商品列表（正文内链使用）。

### 8.4 如何填写（含示例）

- internalLinks：1-2 个，锚文本自然（不是"点击这里"）。

  - ✅ 示例：`[{ "text": "吉林近视手术术前检查清单", "url": "/articles/pre-check" }]`

  - ❌ 反例：5 个以上链接堆砌、锚文本全部是"了解更多"。

### 8.5 这样做的好处

站内权重流转，提高转化页收录与排名。

***

## 9. 要点总结与本地贴士（summaryPoints / localTips）

### 9.1 设计目的

正文前的"结论速览"与"本地实用贴士"两个独立子块（前端 summary-tips 模块，任一非空才渲染）。

### 9.2 为什么这样设计

- **核心要点**：用户先看结论再决定是否深读；也为摘要/结构化数据提供素材。

- **本地贴士**：针对本地用户的落地建议（办理流程、避坑、营业时间、地址提示等），是"本地化内容"区别于通用内容的关键信号。

### 9.3 与其他数据的关系

- 核心要点应源自正文结论，与正文、businessData 口径一致。

- 本地贴士与服务范围（serviceScope）、信息边界（infoBoundary）互补：贴士是"怎么做更好"，边界是"结论在什么前提成立"。

### 9.4 如何填写（含示例）

- summaryPoints：3-6 条结论性短句，每条一行。

  - ✅ 示例：`1. 吉林近视手术公立私立均可做，关键看设备与医生\n2. ...`

  - ❌ 反例：与正文矛盾、超过 10 条。

- localTips：2-5 条本地化实操建议，每条约一行，写明对象与动作。

  - ✅ 示例：`术前检查建议预约工作日上午，避开周末排队高峰。\n昌邑区线下咨询点在地铁 1 号线 XX 站 B 口步行 3 分钟。`

  - ❌ 反例：写通用建议（"多比较再决定"）、与 serviceScope 矛盾的地点信息。

### 9.5 这样做的好处

核心要点提升阅读完成率与搜索摘要命中率；本地贴士增强本地实用价值与差异化竞争力。

***

## 10. 信息边界（infoBoundary）

### 10.1 设计目的

声明内容的统计范围/适用场景/局限性，防止误导。

### 10.2 为什么这样设计

信息边界让"结论成立的前提"透明化，是合规与可信的关键（尤其本地报告）。

### 10.3 与其他数据的关系

与 businessData（统计口径）、sourceName 呼应。

### 10.4 如何填写（含示例）

- 说明：样本范围、统计周期、适用人群、局限性。

  - ✅ 示例：`以上数据基于 2026 年 1-6 月吉林市 12 家机构公开信息整理，仅供学习参考，不构成就医建议。`

  - ❌ 反例：无边界说明的绝对化结论。

### 10.5 这样做的好处

避免绝对化表述风险，提升专业可信度。

***

## 11. 真值声明（truthBasis，关联 first-truth-policy）

### 11.1 设计目的

为文章背书的权威真值声明（如"本文遵循××公开数据口径"）。

### 11.2 为什么这样设计

把"一篇文章的主张"挂到平台级真值策略上，形成平台信任资产。

### 11.3 与其他数据的关系

多对多关联；真值声明内容在 first-truth-policy 内容类型中维护，文章只选不写。

### 11.4 如何填写（含示例）

- 后台选择已建的真值声明（如"数据来源以官方公开信息为准，更新至发布日"）。

- 无匹配时先在 first-truth-policy 内容类型中创建，再回文章关联。建声明时必填/常用字段：

  - `claim`：一句话声明（≤200 字）。

  - `claimKey`：唯一键（如 `data-official-update`），用于程序识别。

  - `claimCategory`：声明类别（business\_license / brand\_claim / technical\_spec / certification / financial / logistics\_promise / other）。

  - `canonicalValue`：权威基准值（文本/数字/日期/URL/JSON，由 canonicalValueType 决定）。

  - `canonicalSourceType`：信源类型（government / official\_site / third\_party\_verified / internal）。

  - `canonicalSourceUrl`：公开信源链接。

  - `lastVerifiedAt`：最后核验时间；`verificationStatus`：verified / pending / outdated / conflict。

- 文章侧选 1-3 条与本文主张直接相关的声明，不贪多。

### 11.5 这样做的好处

背书统一、跨文章复用，构建平台级信任体系。

***

## 12. 实体提及（mentionedEntities，关联 knowledge-entity）

### 12.1 设计目的

标记文中提及的知识实体（机构/人物/产品/地区），联动知识图谱。

### 12.2 为什么这样设计

实体关联让内容被"结构化理解"，提升相关性信号与站内实体知识库的丰富度。

### 12.3 与其他数据的关系

与 comparisonData 中的对象名、正文提及的机构名一致才生效。

### 12.4 如何填写（含示例）

- 选择正文中出现的核心实体（2-5 个），不选无关实体。

  - ✅ 示例：正文讨论"XX眼科"，则关联该实体。

- 实体需先在 knowledge-entity 内容类型中维护，创建时重点字段：

  - `entityType`：18 类枚举（Organization / Person / Product / Service / Place / Event / CreativeWork / Article / CaseStudy / Offer / Review / FAQ / HowTo / BreadcrumbList / Brand / ContactPoint / QuantitativeValue / DefinedTerm），选最贴合的一类。

  - `name` / `slug`：实体名称与唯一标识。

  - `identifier`：外部 ID（工商注册号、机构代码等）。

  - `sameAs`：外部权威档案链接（JSON 数组）。

  - `confidence`：置信度（0-1）；`verificationStatus`：verified / pending / outdated / conflict。

  - `sourceType`：official / derived / manual / imported。

### 12.5 这样做的好处

知识图谱联动，增强实体权威与站内语义网。

***

## 13. 知识关系（knowledge-relation，关联 knowledge-entity）

### 13.1 设计目的

定义"实体-关系-实体"三元组（主体/谓词/客体），把文章里点名的实体连成知识图谱。

### 13.2 为什么这样设计

文章通过 mentionedEntities 只关联"点"（实体）；实体之间的"线"（关系）在 knowledge-relation 中独立维护，可在任意实体上复用，形成跨文章的站内语义网，支撑实体主页聚合与关联推荐。

### 13.3 与其他数据的关系

- `subjectEntity`（主体）/ `objectEntity`（客体）均为 knowledge-entity 关系，必填主体、可空客体（属性型关系用 objectValue/objectText 代替客体）。

- `predicate`（谓词）：关系名称，建议使用系统谓词词典中的统一叫法（如"位于""成立于""提供服务""获得认证"），避免同义重复。

- `sourceType`：official / derived / manual / inferred；`confidence`：置信度 0-1；`verificationStatus` + `lastVerifiedAt`：核验状态。

- 关系与文章是**间接关联**：文章关联实体 → 实体挂载关系 → 前端按需聚合展示。

### 13.4 如何填写（含示例）

- 写作时不直接在文章页填关系；如文中事实涉及新关系，到知识图谱维护界面建立三元组后再回填实体。

- 三元组填写要点：主体选准确实体；谓词用词典统一词；客体选实体或用 objectValue/objectText 填值；每条关系标注来源与置信度。

  - ✅ 示例：主体 `XX眼科医院`，谓词 `位于`，客体 `吉林市船营区`；来源 official，置信度 1.0。

  - ❌ 反例：谓词口语化重复（"在""位于""坐落于"并存）、无来源的高置信关系、把文章观点写成事实关系。

### 13.5 这样做的好处

实体与关系分层维护，语义网可复用可校验，为实体页与关联内容提供数据基础。

***

## 14. 作者（author 关系 / authorName / authorBio）

### 14.1 设计目的

展示作者身份与背景，支撑 E-E-A-T。

### 14.2 为什么这样设计

作者档案（author 内容类型）可复用、带头像与从业年限；未关联时回退扁平字段 authorName/authorBio。前端有两个展示位：**GeoHeader** 头部元信息行（作者名+简介）与 **AuthorCard** 作者卡片（头像/职位/简介/年限）。

### 14.3 与其他数据的关系

author 为可选关系，缺失时前端回退 authorName + authorBio。关联作者档案后，前端以档案内容为准，扁平字段不再展示。

### 14.4 如何填写（含示例）

- 优先关联作者档案；无档案时填 authorName（≤50 字）+ authorBio（从业背景简介）。

  - ✅ 示例：authorName=`张医生`，authorBio=`从业 12 年，专注眼科屈光手术，公立医院背景`。

- 作者档案（author 内容类型）维护要点：

  - `name` / `slug`：姓名与唯一标识；`position`：职位头衔（如"本地家装行业分析师"）。

  - `bio`：从业背景（E-E-A-T 背书）；`avatar`：头像图。

  - `experienceYears`：从业年限；`sameAs`：外部档案链接（JSON）。

- 一名作者可挂多篇文章（author.geoArticles 反向聚合），改一次档案全站生效。

### 14.5 这样做的好处

作者背书提升内容权威，作者主页可聚合其全部内容。

***

## 15. CTA（ctaType）

### 15.1 设计目的

文末转化动作：下载清单 / 咨询预约。

### 15.2 为什么这样设计

把阅读完成用户导向下一步动作，是内容转化闭环的出口。

### 15.3 与其他数据的关系

`download-list` 与 leadForm 联动；`consult-appointment` 跳咨询页。`none` 不展示。

### 15.4 如何填写（含示例）

- 有转化目标选对应类型；纯资讯内容选 `none`。

  - ✅ 示例：本地清单文章选 `download-list`（下载完整清单）；本地报告选 `consult-appointment`。

### 15.5 这样做的好处

明确的转化出口，可统计 CTA 点击率。

***

## 16. 留资表单（leadFormEnabled）

### 16.1 设计目的

开启文内线索表单（姓名/联系方式留资）。

### 16.2 为什么这样设计

线索收集是内容营销的核心 ROI 指标，按文章粒度开关避免骚扰。

### 16.3 与其他数据的关系

与 ctaType=download-list 组合使用；线索进入留资管理。

### 16.4 如何填写（含示例）

- 需要留资转化时开启；纯资讯关闭。

  - ✅ 示例：本地报告开启留资表单 + CTA 下载完整报告。

### 16.5 这样做的好处

按篇收集高意向线索，直接度量内容价值。

***

## 17. 服务范围（serviceScope）

### 17.1 设计目的

声明本地服务范围：区县/自提/咨询地址/履约时效/配送范围。

### 17.2 为什么这样设计

本地化内容必须明确"覆盖哪里、怎么履约"，避免用户跨区域误咨询。

### 17.3 与其他数据的关系

与站点 NAP（地址/电话）呼应，供 LocalBusiness 结构化数据使用。

### 17.4 如何填写（含示例）

- ✅ 示例：`服务区域：吉林市船营区、昌邑区；线下咨询：XX路 XX号；时效：预约后 2 小时内响应。`

### 17.5 这样做的好处

明确履约边界，降低无效咨询与客诉。

***

## 18. 业务数据（businessData）

### 18.1 设计目的

结构化统计口径数据：`[{period, content, caliber}]`。

### 18.2 为什么这样设计

报告类内容的关键数字必须有"统计起止时间/内容/口径"，防止歧义。

### 18.3 与其他数据的关系

与正文表格、summaryPoints、infoBoundary 口径必须一致。

### 18.4 如何填写（含示例）

- ✅ 示例：`[{ "period": "2026年1-6月", "content": "吉林市近视手术量约 1200 台", "caliber": "卫健委公开统计口径" }]`

### 18.5 这样做的好处

数据可审计、可引用，报告可信度大增。

***

## 19. 案例（caseContent）

### 19.1 设计目的

真实案例（仅客观事实，禁止收益承诺）。

### 19.2 为什么这样设计

案例是最强说服力，但合规上只能写客观事实（过程/体验），禁止承诺收益（尤其金融/医疗）。

### 19.3 与其他数据的关系

案例主体可与 mentionedEntities 关联。

### 19.4 如何填写（含示例）

- ✅ 示例：`某客户于 2026-03 在 A 机构完成术前检查，选择全飞秒，术后 1 周复查视力 1.0。`

- ❌ 反例：`该客户投资后三个月赚了 50%`（收益承诺，禁用）。

### 19.5 这样做的好处

可信案例增强转化，同时守住合规底线。

***

## 20. SEO 与多语言（metaTitle / metaDescription / canonicalUrl / jsonLdType / allowIndex / noFollow / 多语言）

### 20.1 设计目的

控制页面收录与搜索引擎展现。

### 20.2 为什么这样设计

- metaTitle ≤60 字（搜索标题）；metaDescription ≤160 字（建议含吉林本地场景词）。

- canonicalUrl 防重复收录（多语言场景必配）。

- jsonLdType 决定结构化数据（Article/FAQPage/LocalBusiness/ItemList）。

- allowIndex/noFollow 控制索引策略。

- 多语言：localized 字段各语言独立，默认语言无前缀，备选语言 /en/，hreflang 自动输出，缺翻译详情页 302 回退默认语言。

### 20.3 与其他数据的关系

与 type（决定 JSON-LD 默认）、slug（URL）、title（默认 metaTitle）联动。

### 20.4 如何填写（含示例）

- ✅ 示例：metaTitle=`吉林近视手术医院怎么选？公立私立对比（2026）`，metaDescription=`吉林本地近视手术医院对比，涵盖设备、医生、价格，附术前检查清单。`，jsonLdType=`LocalBusiness`。

**文章类型 ↔ jsonLdType 映射表（发布必配）**

| 文章类型 | 推荐 jsonLdType |
|---|---|
| geo-faq | FAQPage |
| local-list | ItemList |
| local-comparison | ItemList |
| local-report | Article（站点配置本地地址时可 LocalBusiness） |
| geo-article | Article |

规则：显式配置优先；未配置时前端按上表推导（geo-faq→FAQPage，其余 Article）。

### 20.5 这样做的好处

正确的 SEO 字段直接决定搜索点击率与收录效率。

***

## 21. 运营与审核字段（readPoints / miniProgramPath / status / editor / reviewer / reviewChecks / reviewNote / reviewedAt）

### 21.1 设计目的

运营激励与发布质量把关。

### 21.2 为什么这样设计

- readPoints：用户阅读/下载提交后发放积分（拉活）。

- miniProgramPath：微信 WebView 场景跳转小程序原生商品页。

- status：draft → review → published → archived 全生命周期。

- editor/reviewer：后台记录编辑与审核人；前端展示用扁平 reviewerName/reviewedAt。

- reviewChecks：`{eaat, tech, compliance, business}` 四类验收自查。

- reviewNote：上线备注。

### 21.3 与其他数据的关系

- readPoints 发放走积分系统；miniProgramPath 需与小程序页面路径一致。

- editor/reviewer 为 admin::user 关系（仅后台记录，不参与前端展示）；前端展示用扁平 reviewerName/reviewedAt（GeoHeader 元信息行显示"审核 人名 日期"）。

### 21.4 如何填写（含示例）

- 流程：编辑创建（status=draft）→ 编辑提交（status=review，editor 自动记录）→ 审核验收（status=published，reviewer 自动记录）→ 下线归档（status=archived）。

- 发布前 reviewChecks 四类全勾（JSON `{eaat, tech, compliance, business}`）：

  - eaat（经验专业权威可信）：作者档案/来源/数据齐全可溯源，真值声明与实体已挂接

  - tech（技术）：页面/链接/多语言/移动端正常，canonical 与 hreflang 正确

  - compliance（合规）：风险提示、信息边界、无收益承诺、无绝对化表述

  - business（业务）：CTA/表单/积分配置正确，服务范围与业务数据口径一致

- reviewerName 填审核人姓名、reviewedAt 填审核日期（供前端展示）。

- reviewNote 填上线备注（如"首篇本地报告，数据口径已与运营确认"）。

### 21.5 这样做的好处

发布有门禁，责任可追溯，运营激励可度量。

***

## 22. 完整填写示例（local-report 类型）

以《吉林市近视手术市场观察报告（2026 上半年）》为例：

| 字段                        | 值                                                                      |
| ------------------------- | ---------------------------------------------------------------------- |
| type                      | local-report                                                           |
| title                     | 吉林市近视手术市场观察报告（2026 上半年）                                                |
| articleNo                 | JL-2026-001                                                            |
| coverImage / publishedAt  | 16:9 本地实拍图 / 2026-07-01                                                |
| content                   | 结论先行 + 分节（市场规模/机构对比/价格区间/注意事项）+ 数据表格                                   |
| riskType                  | health                                                                 |
| businessData              | \[{period:"2026年1-6月", content:"全市近视手术约 1200 台", caliber:"卫健委公开统计口径"}] |
| serviceScope              | 服务区域：船营区、昌邑区；线下咨询：XX路                                                  |
| summaryPoints             | 3-5 条核心结论                                                              |
| localTips                 | 术前检查建议预约工作日上午等 2-3 条本地建议                                               |
| infoBoundary              | 数据基于公开信息整理，仅供学习参考                                                      |
| sourceName/sourceUrl      | 吉林省卫健委 / 公开链接                                                          |
| internalLinks             | 1 条：术前检查清单文章                                                           |
| truthBasis                | 关联"数据以官方公开信息为准"声明（claimKey=data-official-update）                       |
| mentionedEntities         | 关联实体：XX眼科医院（Organization）、XX眼科中心（Organization）                         |
| author                    | 关联作者档案 张医生（position=屈光手术分析师）                                           |
| ctaType                   | consult-appointment                                                    |
| leadFormEnabled           | true                                                                   |
| metaTitle/metaDescription | 含"吉林"与场景词                                                              |
| reviewerName/reviewedAt   | 李审核 / 2026-07-02                                                       |
| reviewChecks              | eaat/tech/compliance/business 全勾                                       |

***

## 23. 验收自查清单（发布前逐项核对）

- [ ] 类型与搜索意图匹配，未混写

- [ ] 标题含地域+场景词，slug 已发布且不再改动

- [ ] 封面图清晰合规，发布时间已填且非未来时间

- [ ] 正文结论先行、分节、关键数据有表格与出处

- [ ] 涉及金融/健康/法律已选对应 riskType

- [ ] 对比表/清单结构合法，score 有 note

- [ ] 核心要点与本地贴士均已填（无内容则留空）

- [ ] 引用、真值声明、实体、作者档案均已挂接

- [ ] 涉及的新关系已在知识图谱维护界面建立三元组

- [ ] 信息边界与业务数据口径一致

- [ ] CTA/留资表单按需开关

- [ ] metaTitle/Description 合规且含本地场景词

- [ ] editor/reviewer 流程走完，reviewerName/reviewedAt 已填

- [ ] reviewChecks 四类全勾，reviewNote 已填

***

## 24. 常见错误与反例速查

| 错误      | 反例                    | 正确做法              |
| ------- | --------------------- | ----------------- |
| 无地域     | 近视手术全攻略               | 吉林近视手术怎么选         |
| 收益承诺    | 投资三个月赚 50%            | 仅客观描述             |
| 无来源数据   | 数据显示 80% 的人……         | 标注来源名称+URL+时间     |
| 漏风险声明   | 理财推荐无提示               | 选 finance-\* 类型   |
| 对比无依据   | 裸打分无 note             | 每分一句依据            |
| 内链堆砌    | 5 个"点击这里"             | 1-2 个自然锚文本        |
| 绝对化表述   | 全吉林最便宜                | 说明边界与口径           |
| 混写类型    | 报告里塞清单                | 一篇文章一个意图          |
| 实体乱关联   | 正文未提也挂 5 个实体          | 只关联正文实际出现的 2-5 个  |
| 真值乱挂    | 与本文主张无关的声明也选          | 只选直接背书本文主张的 1-3 条 |
| 关系当观点   | 把"XX 机构最好"建成事实关系      | 关系只存可核实事实，观点留在正文  |
| 贴士与范围矛盾 | 贴士写"全市免费配送"但服务范围只到昌邑区 | 贴士与服务范围口径一致       |

## 25. 上线达标门禁（发布前必过清单）

### 25.1 设计目的
把全手册核心标准压缩为"发布门禁"：status 转 published 时由系统自动校验，未达标禁止发布。

### 25.2 门禁校验组（对应前文各章）
| 组 | 校验项 | 对应章节 |
|---|---|---|
| 1 选型 | geo-faq 必须有 faqQuestion；local-comparison 必须有 comparisonData；local-list 必须有 listItems | 第 1/5/6 章 |
| 2 标题 | 标题必须含本地地域词（省/市/区县词典） | 第 2 章 |
| 3 核心模块 | summaryPoints、localTips、infoBoundary 三项必填 | 第 9/10 章 |
| 4 E-E-A-T | 来源引用（sourceName/sourceUrl）、真值声明≥1、实体≥1、作者档案或 authorName | 第 7/11/12/14 章 |
| 5 结构化 | jsonLdType 与文章类型匹配；local-report 必须配置 businessData | 第 18/20 章 |
| 6 转化 | ctaType 或 leadFormEnabled 至少一项（报告/评测/清单类） | 第 15/16 章 |
| 7 合规 | riskType≠none；正文含金融/健康/法律关键词须选对应类型（告警） | 第 4 章 |
| 8 审核 | reviewChecks 四类全勾 + reviewerName + reviewedAt | 第 21 章 |

### 25.3 逃生口
admin 用户可 `?force=true` 跳过门禁（留痕），非 admin 一律阻断。

### 25.4 自检
发布前可在后台调用"审核自检"接口，返回逐项达标/缺漏报告，不阻断。

