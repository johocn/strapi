# GEO 文章发布全流程手册（从 0 到上线，小白版）

> 适用对象：内容运营 / 编辑 / 审核 / 新入职开发
> 适用内容：zhao-website 插件「GEO 文章」从底层数据到线上页面的完整发布链路
> 配套：`docs/GEO文章写作手册.md`（单篇字段怎么写）+ `docs/superpowers/specs/2026-09-06-geo-publish-gate-design.md`（门禁设计）
> 完整示例：2026-09-07 发布的 4 篇教育类 GEO 文章（主文 + FAQ + 清单 + 对比）
> 本文写作结构：每个环节按「它是什么 → 为什么要做 → 具体怎么做（含命令/脚本/示例）→ 常见坑」展开，全程可照着做。

***

## 0. 阅读方式与全链路总纲

### 0.1 一篇文章从 0 到上线，要经过什么

```
[1 内容规划] → [2 底层数据认知] → [3 内容基础设施准备] → [4 文章录入]
→ [5 审核门禁] → [6 后端发布] → [7 前端发布] → [8 线上验证]
```

简化成三个阶段：

| 阶段  | 做什么                          | 由谁做             | 产物                                      |
| --- | ---------------------------- | --------------- | --------------------------------------- |
| 数据层 | 建分类/标签/作者/评审/真值/知识实体/关系，录入文章 | 编辑 + 开发（SQL 模板） | 数据库里的文章记录                               |
| 发布层 | 后端插件源码改动 → 重建 dist → 部署到服务器  | 开发              | 线上 API 生效（sitemap/接口）                   |
| 展示层 | 前端静态站重新构建 → 部署 → 验证 SEO      | 开发              | [www.joho.cn](http://www.joho.cn) 页面可访问 |

### 0.2 为什么是"三层"

- 数据存 PostgreSQL，由 zhao-website 插件提供 API；

- 前端是 Next.js **静态导出**站点，页面在**构建时**从 API 拉数据生成 HTML 文件，发布到 nginx；

- 所以改文章内容 → 必须**重新构建前端**才生效；改后端接口 → 必须**重建插件 dist + 重启**才生效。

### 0.3 本文以哪次发布为例子

2026-09-07 发布的 4 篇文章（教育/职业规划主题，站点 joho.cn）：

| 文章                 | 类型               | 路由                                                         | 终审人      |
| ------------------ | ---------------- | ---------------------------------------------------------- | -------- |
| 职业没有一劳永逸：长期学习规划    | geo-article      | `/geo-article/career-lifelong-learning-plan`               | 兰台（长期价值） |
| 职业规划与长期学习常见问题      | geo-faq          | `/geo-faq/career-learning-faq`                             | 时宜（短期价值） |
| 长期学习规划资源清单         | local-list       | `/local-list/lifelong-learning-resource-list`              | 时宜       |
| 在线课程 vs 线下培训 vs 自学 | local-comparison | `/local-comparison/online-course-vs-offline-vs-self-study` | 时宜       |

作者统一为笔名「天问」（作者档案 id `au-tian-wen-000001`）。

***

## 1. 内容规划（写之前先想清楚）

### 1.1 选类型

5 种类型对应 5 种搜索意图，一篇只选一个（见写作手册第 1 章）。本次选了 4 种：主文（资讯）、FAQ（问答）、清单、对比。

### 1.2 定标题

标题必须含「地域 + 场景 + 价值词」，本次示例：`职业没有一劳永逸，做好长期学习规划，应对时代变化`。

### 1.3 定作者与审核人

- 作者档案（author）先建好：本次为「天问」，笔名简介取自屈原《楚辞·天问》。

- 审核人（admin 后台账号）先建好：**兰台**（长期价值类终审）、**时宜**（短期价值类终审）。

- 评审依据（写作手册第 25 章门禁）：长期价值内容走兰台，短期价值（FAQ/清单/对比）走时宜。

### 1.4 想清楚要不要配套数据

文章要关联的知识实体、真值声明若还不存在，必须**先在数据层建好**（见第 3 章），否则文章挂不上关系。

***

## 2. 底层数据认知（小白必读，避免"莫名其妙空页面"）

### 2.1 核心表长什么样

文章主表：`zhao_website_geo_articles`（一篇文章一行）。

```
zhao_website_geo_articles
├── document_id     唯一业务标识（ga- 前缀，如 ga-main-000000001）
├── title / slug     标题 / URL 路径
├── type             geo-article / geo-faq / local-report / local-comparison / local-list
├── content          HTML 正文
├── locale           语言（i18n，默认 zh-CN）
├── meta_title / meta_description / canonical_url / json_ld_type   SEO
├── risk_type / info_boundary / summary_points / local_tips        合规 + 要点
├── status / reviewer_name / reviewed_at / review_checks           审核
└── ...其他字段
```

关联表（`xxx_lnk`）：记录文章与 分类/标签/作者/审核人/真值/实体 的"多对多关系"。

```
zhao_website_geo_articles_site_lnk         文章↔站点
zhao_website_geo_articles_author_lnk       文章↔作者
zhao_website_geo_articles_editor_lnk       文章↔编辑(admin)
zhao_website_geo_articles_reviewer_lnk     文章↔审核人(admin)
zhao_website_geo_articles_category_lnk     文章↔分类
zhao_website_geo_articles_tags_lnk         文章↔标签
zhao_website_geo_articles_truth_basis_lnk  文章↔真值声明
zhao_website_geo_articles_mentioned_entities_lnk  文章↔知识实体
```

### 2.2 【铁律】lnk 关联表：直插 SQL 必须同步写

Strapi 把"多对多关系"存成独立的 `_lnk` 表，**不是**在主表里放外键列。

> 症状：只 INSERT 文章主表、不写 lnk 表 → 前端按 `site` 过滤文章时**一条都查不到**，页面列表/详情全空（404 或空列表）。

正确姿势（模板 SQL 已写全，照着改 document\_id 即可）：

```sql
INSERT INTO zhao_website_geo_articles (document_id, title, slug, ...) VALUES (...);
INSERT INTO zhao_website_geo_articles_site_lnk (geo_article_id, site_config_id, geo_article_ord)
SELECT id, 1, 0 FROM zhao_website_geo_articles WHERE document_id = 'ga-main-000000001';
```

> 例外：通过后台 admin 界面创建文章时，Strapi 会自动写 lnk，**没有此问题**。lnk 铁律只针对 SQL 直插。

### 2.3 【铁律】locale：直插文章必须写 `zh-CN`

文章表启用了 i18n（多语言）。SQL 直插**必须显式写** **`locale = 'zh-CN'`**。

> 症状：locale 为 NULL → 前端构建时按 `locale=zh-CN` 过滤 → 返回空 → 文章页不生成，只有 `__missing__` 占位页（访问 404）。

已发生过的修复（参考 `tmp_fix_article_locale.sql`）：

```sql
UPDATE zhao_website_geo_articles SET locale = 'zh-CN', updated_at = now()
WHERE locale IS NULL AND deleted_at IS NULL AND document_id IN ('ga-main-000000001','ga-faq-000000001',...);
```

### 2.4 document\_id 前缀约定（一眼识别记录类型）

| 前缀     | 类型     | 示例                    |
| ------ | ------ | --------------------- |
| `cat-` | 文章分类   | cat-career-planning   |
| `tag-` | 主题标签   | tag-lifelong-learning |
| `au-`  | 作者档案   | au-tian-wen-000001    |
| `ad-`  | 后台审核账号 | ad-lantai-000001      |
| `ga-`  | GEO 文章 | ga-main-000000001     |
| `kge-` | 知识实体   | kge-education-000001  |
| `kgr-` | 知识关系   | kgr-provides-00000001 |
| `kft-` | 真值声明   | kft-xxx               |

### 2.5 数据依据纪律（别编造公司事实）

当 `brand_infos`（品牌信息表）全空、站点配置只有 站名/描述/关键词 时：

- **允许**：教育领域的通用知识术语（职业教育/终身学习等）、平台定位（areaServed/category）。

- **禁止**：虚构公司事实（法定代表人、成立日期、注册资本等）——没有真实依据就是编造。

本次知识图谱只录了 15 个实体（平台 + 通用术语）就是按此纪律。

***

## 3. 内容基础设施准备（建文章之前先建这些）

按依赖顺序执行，**实体和真值必须先于文章存在**（文章才能关联）。

### 3.1 分类 + 标签 + 作者 + 审核账号

模板：`e:\code\tmp_article_foundation.sql`（本文发布前的完整示例）

| 内容   | 表                                  | 必填要点                                                                                           |
| ---- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| 分类   | zhao\_website\_article\_categories | document\_id/name/slug/status='true' + site\_lnk                                               |
| 标签   | zhao\_tags                         | document\_id/name/slug/color + site\_lnk                                                       |
| 作者   | zhao\_website\_authors             | name/slug/position/bio/experience\_years + site\_lnk                                           |
| 审核账号 | admin\_users                       | username/password(bcrypt 哈希)/is\_active + roles\_lnk（兰台=Super Admin 角色 id 1，时宜=Editor 角色 id 2） |

**具体 SQL 示例**（完整版见 `tmp_article_foundation.sql`）：

```sql
-- ① 分类（status='true' 才是启用；"order" 是关键字要加引号）
INSERT INTO zhao_website_article_categories (
  document_id,     -- 唯一业务标识（cat- 前缀，全局唯一）
  name,            -- 分类显示名
  slug,            -- URL 唯一标识，发布后不改
  description,     -- 分类简介
  "order",         -- 列表排序号（"order" 是 SQL 关键字，必须加引号）
  seo_title,       -- 分类页 SEO 标题
  seo_description, -- 分类页 SEO 描述
  status,          -- 'true'=启用｜'false'=隐藏
  deleted_at,      -- 软删除时间，NULL=未删除
  created_at,      -- 创建时间
  updated_at,      -- 更新时间
  published_at     -- 发布时间（草稿流程控制是否可见）
) VALUES ('cat-career-planning','职业规划','career-planning','职业发展与长期规划类内容','1',
        '职业规划','职业规划、长期学习与职业技能提升','true',NULL,now(),now(),now());

-- ② 分类必须挂 site_lnk（site_config_id=1 即 joho.cn），否则按 site 过滤查不到
--    字段：article_category_id=分类数字 id｜site_config_id=站点数字 id｜article_category_ord=排序号
INSERT INTO zhao_website_article_categories_site_lnk (article_category_id, site_config_id, article_category_ord)
SELECT id, 1, 0 FROM zhao_website_article_categories WHERE document_id='cat-career-planning';

-- ③ 审核账号：password 必须是 bcrypt 哈希（用 admin 后台或工具生成，禁止写明文）
INSERT INTO admin_users (
  document_id,       -- 唯一业务标识（ad- 前缀）
  firstname,         -- 名（后台显示）
  lastname,          -- 姓（后台显示）
  username,          -- 登录名（文章 reviewer 按它匹配）
  email,             -- 登录邮箱
  password,          -- bcrypt 哈希，不是明文
  is_active,         -- 'true'=可登录
  blocked,           -- 'false'=未封禁
  prefered_language, -- 后台界面语言 zh-CN
  created_at,        -- 创建时间
  updated_at         -- 更新时间
) VALUES ('ad-lantai-000001','兰台','终审','lantai','lantai@joho.cn',
        '$2b$10$XWSgYO1vTuX52wSjaehW8uEYHLJllvLgl3m3MS7KQKHWADcOmvts.','true','false','zh-CN',now(),now());

-- ④ 挂角色：兰台=Super Admin(role id 1)｜时宜=Editor(role id 2)
--    字段：user_id=审核账号数字 id｜role_id=角色数字 id｜role_ord/user_ord=排序号（0 即可）
INSERT INTO admin_users_roles_lnk (user_id, role_id, role_ord, user_ord)
SELECT u.id, r.id, 0, 0 FROM admin_users u JOIN admin_roles r
  ON r.id = CASE u.username WHEN 'lantai' THEN 1 ELSE 2 END
WHERE u.username IN ('lantai','shiyi');
```

### 3.2 知识实体 + 知识关系（知识图谱）

模板：`tmp_kg_seed.sql` / `tmp_kg_seed2.sql` / `tmp_kg_seed3.sql`（分三批完成 15 实体 / 15 关系）

录入顺序（每步都要写对应 lnk）：

```
① INSERT 实体 → ② 实体 site_lnk → ③ INSERT 关系 → ④ 关系 site_lnk → ⑤ subject_entity_lnk → ⑥ object_entity_lnk
```

要点：

- 实体表 `zhao_website_knowledge_entities`：entity\_type 枚举 Organization/Service/DefinedTerm/Place 等；slug 全局唯一。

- 关系表 `zhao_website_knowledge_relations`：predicate 用统一谓词（provides/category/slogan/keywords/areaServed）；属性型关系用 object\_text 存值，指向实体的关系才写 object\_entity\_lnk。

- 关系过滤必须用实体**数字 id**（`strapi.db.query` 按关系过滤 documentId 字符串会 PG 报 integer 类型错误，500）。

**具体 SQL 示例**（完整版见 `tmp_kg_seed.sql`）：

```sql
-- ① 实体（zhao_website_knowledge_entities）
INSERT INTO zhao_website_knowledge_entities (
  document_id,          -- 唯一业务标识（kge- 前缀）
  entity_type,          -- 实体类型枚举：Organization/Service/DefinedTerm/Place
  name,                 -- 实体显示名
  slug,                 -- URL 唯一标识（全局唯一，知识页 /knowledge/{slug}）
  description,          -- 实体描述
  url,                  -- 官网/权威链接（没有就 NULL）
  properties,           -- 扩展属性 JSON（如 slogan/seoKeywords）
  confidence,           -- 置信度 0~1（0.9=高置信人工录入）
  source_type,          -- 数据来源：official=官网｜manual=人工整理
  last_verified_at,     -- 最近核验时间
  verification_status,  -- 核验状态：verified=已核验
  status,               -- true=发布启用
  deleted_at,           -- 软删除，NULL=未删除
  created_at,           -- 创建时间
  updated_at,           -- 更新时间
  published_at          -- 发布时间
) VALUES ('kge-education-000001','DefinedTerm','教育','education','教育是培养人的社会实践活动，是 joho.cn 的核心服务领域',
        NULL,NULL,0.9,'manual',now(),'verified',true,NULL,now(),now(),now());

-- ② 实体 site_lnk（字段：knowledge_entity_id=实体数字 id｜site_config_id=站点 id｜knowledge_entity_ord=排序号）
INSERT INTO zhao_website_knowledge_entities_site_lnk (knowledge_entity_id, site_config_id, knowledge_entity_ord)
SELECT id, 1, 0 FROM zhao_website_knowledge_entities WHERE document_id='kge-education-000001';

-- ③ 关系：属性型关系值存 object_text；指向实体的关系才写 subject/object lnk
INSERT INTO zhao_website_knowledge_relations (
  document_id,          -- 唯一业务标识（kgr- 前缀）
  predicate,            -- 谓词枚举：provides/category/slogan/keywords/areaServed
  object_value,         -- 结构化对象值（本示例属性型关系用 NULL）
  object_text,          -- 属性型关系的文本值（如 slogan 的值）
  source_type,          -- 数据来源：official=官网｜manual=人工整理
  confidence,           -- 置信度 0~1
  last_verified_at,     -- 最近核验时间
  verification_status,  -- verified=已核验
  status,               -- true=发布启用
  deleted_at,           -- 软删除，NULL=未删除
  created_at,           -- 创建时间
  updated_at,           -- 更新时间
  published_at          -- 发布时间
) VALUES ('kgr-slogan-000000001','slogan',NULL,'让学习更有价值','official',1.0,now(),'verified',true,NULL,now(),now(),now());

-- ④⑤⑥ 关系 site_lnk + subject_entity_lnk + object_entity_lnk（照模板按 slug 匹配实体，一步写完）
```

### 3.3 真值声明（第一真值）

模板：`tmp_kg_seed_truths.sql`（+ truths2/truths3，共 18 条，全部 verified）

- 表 `zhao_website_first_truths`：claim（一句话声明）/ claim\_key（唯一键，如 `domain_vocational_education_def`）/ claim\_category / canonical\_value / canonical\_source\_type（government/official\_site/third\_party\_verified/internal）/ last\_verified\_at / verification\_status。

- 录入顺序：`INSERT 真值 → 真值 site_lnk → canonical_entity_lnk`（挂到被背书的实体）。

- 本次 18 条 = 品牌事实 8 条（official\_site 来源）+ 领域定义 10 条（internal 来源），覆盖全部 15 实体。

**具体 SQL 示例**（完整版见 `tmp_kg_seed_truths.sql`）：

```sql
-- ① 真值（claim_key 是唯一键，重复执行会被拦截；canonical_source_type 用枚举）
INSERT INTO zhao_website_first_truths (
  document_id,              -- 唯一业务标识（kft- 前缀）
  claim,                    -- 一句话声明（自然语言，给人和 AI 阅读）
  claim_key,                -- 唯一键（重复执行被唯一约束拦截，整体回滚）
  claim_category,           -- 真值分类：brand_claim=品牌主张/domain_definition=领域定义 等
  canonical_value,          -- 规范化值（机器可复用的标准答案）
  canonical_value_type,     -- 值类型：text/url/number
  canonical_source_url,     -- 来源链接（官网页面等）
  canonical_source_type,    -- 来源类型：government/official_site/third_party_verified/internal
  conflict_resolution,      -- 冲突处理方式：manual=人工裁定
  last_verified_at,         -- 最近核验时间
  verification_status,      -- verified=已核验
  priority,                 -- 优先级 0~100（越高越重要，用于排序展示）
  status,                   -- true=发布启用
  deleted_at,               -- 软删除，NULL=未删除
  created_at,               -- 创建时间
  updated_at,               -- 更新时间
  published_at              -- 发布时间
) VALUES ('kft-slogan-000001','joho.cn 的品牌主张是「让学习更有价值」','brand_slogan_joho_cn','brand_claim',
        '让学习更有价值','text','https://www.joho.cn','official_site','manual',
        now(),'verified',90,true,NULL,now(),now(),now());

-- ② 真值 site_lnk（字段：first_truth_policy_id=真值数字 id｜site_config_id=站点 id｜first_truth_policy_ord=排序号）
INSERT INTO zhao_website_first_truths_site_lnk (first_truth_policy_id, site_config_id, first_truth_policy_ord)
SELECT id, 1, 0 FROM zhao_website_first_truths WHERE document_id='kft-slogan-000001';

-- ③ canonical_entity_lnk：真值挂到被背书的实体（如 joho-cn）
--    字段：first_truth_policy_id=真值数字 id｜knowledge_entity_id=实体数字 id｜first_truth_policy_ord=排序号
INSERT INTO zhao_website_first_truths_canonical_entity_lnk (first_truth_policy_id, knowledge_entity_id, first_truth_policy_ord)
SELECT t.id, e.id, 0 FROM zhao_website_first_truths t JOIN zhao_website_knowledge_entities e ON e.slug='joho-cn'
WHERE t.document_id='kft-slogan-000001';
```

### 3.4 执行 SQL 的方法（Windows → 线上库）

模板 SQL 在本地编写，通过 SSH 管道执行到服务器 PostgreSQL。**管道执行时** **`docker exec`** **必须加** **`-i`** **才支持 stdin**。按依赖顺序，每个模板一条命令：

```powershell
# ① 基础设施：分类/标签/作者/审核账号（必须先跑，后面的文章要关联）
Get-Content e:\code\tmp_article_foundation.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

# ② 知识实体/关系（二批、三批把文件名换成 tmp_kg_seed2.sql / tmp_kg_seed3.sql）
Get-Content e:\code\tmp_kg_seed.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

# ③ 真值声明（同样有 truths2 / truths3）
Get-Content e:\code\tmp_kg_seed_truths.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

# ④ 文章主文 + ⑤ 补充文（FAQ/清单/对比）
Get-Content e:\code\tmp_article_main.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"
Get-Content e:\code\tmp_article_supplement.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"
```

- 每个模板末尾自带**验证 SELECT**，执行输出直接打到终端——核对各 lnk 计数是否符合预期（比如主文 truth\_basis=10、mentioned=10）。

- 只查不改时，把 SQL 用 `-c` 参数直接传，不需要模板文件：

```powershell
ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \"SELECT document_id, title, status FROM zhao_website_geo_articles WHERE deleted_at IS NULL ORDER BY id\""
```

> 整库清空用户等危险操作必须用现成脚本 `scripts/reset_users.sh`（DRY 模式），禁止裸手。

***

## 4. 文章录入（核心字段逐个说）

模板：`tmp_article_main.sql`（主文示例）+ `tmp_article_supplement.sql`（FAQ/清单/对比 3 篇示例）

### 4.1 身份与内容字段

| 字段                          | 本次示例                            | 说明           |
| --------------------------- | ------------------------------- | ------------ |
| document\_id                | ga-main-000000001               | 唯一，ga- 前缀    |
| type                        | geo-article                     | 决定路由前缀与页面骨架  |
| title                       | 职业没有一劳永逸，做好长期学习规划，应对时代变化        | H1，含价值词      |
| slug                        | career-lifelong-learning-plan   | URL，发布后不改    |
| content                     | HTML 正文（结论先行 + H2 分节 + 表格 + 锚链） | 见写作手册第 3 章   |
| published\_at / article\_no | now() / G2026090701             | 时间+唯一编号      |
| author\_name / author\_bio  | 天问 / 简介                         | 未关联作者档案时的回退值 |

### 4.2 SEO 字段（搜索引擎展示，本次重点）

| 字段                | 本次示例                                                            | 规则                                                                                               |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| meta\_title       | 职业没有一劳永逸：长期学习规划四步法 \| joho.cn                                   | ≤60 字；站点后缀在录入时自带（SERP 品牌展示）                                                                      |
| meta\_description | 职业没有一劳永逸。掌握四步法制定长期学习规划…                                         | ≤160 字，含场景词                                                                                      |
| canonical\_url    | <https://www.joho.cn/geo-article/career-lifelong-learning-plan> | 绝对 URL，防重复收录                                                                                     |
| json\_ld\_type    | Article                                                         | 类型映射见写作手册 20.4：geo-faq→FAQPage、local-list→ItemList、local-comparison→ItemList、geo-article→Article |

### 4.3 合规与信任字段

| 字段                            | 本次示例                                  |
| ----------------------------- | ------------------------------------- |
| risk\_type                    | other（教育类一般信息；金融/健康/法律须选对应品类）         |
| risk\_disclaimer              | 本文为教育与职业发展类信息参考，不构成任何升学、就业或投资承诺…      |
| info\_boundary                | 本文方法框架适用于大多数职业发展阶段；统计数据口径以官方发布为准…     |
| summary\_points / local\_tips | 3-5 条结论 / 2-3 条本地建议（必填）               |
| source\_name / source\_url    | 中华人民共和国教育部 / <https://www.moe.gov.cn> |

### 4.4 转化字段

| 字段                  | 本次示例                | 说明     |
| ------------------- | ------------------- | ------ |
| cta\_type           | consult-appointment | 文末转化出口 |
| lead\_form\_enabled | false               | 留资表单开关 |
| read\_points        | 10                  | 阅读发放积分 |

### 4.5 审核字段

| 字段                            | 本次示例                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| status                        | published                                                        |
| reviewer\_name / reviewed\_at | 兰台 / now()                                                       |
| review\_checks                | {"eaat":true,"tech":true,"compliance":true,"business":true} 四类全勾 |
| review\_note                  | 主文属长期价值内容，兰台终审通过…                                                |

### 4.6 8 组关系 lnk（模板已写全，照着填）

```
site → author → editor(admin=1) → reviewer(按 username) → category → tags → truthBasis → mentionedEntities
```

- truthBasis：主文关联 10 条真值（按 claim\_key 匹配），补充文各 3-4 条。

- mentionedEntities：主文 10 个实体、补充文 4-6 个（按 slug 匹配，只关联正文实际出现的）。

**具体 SQL 示例**（主文 8 组 lnk，完整见 `tmp_article_main.sql`，补充文同理只改 document\_id）：

```sql
-- 通用约定：lnk 表不存 document_id，全部存【数字 id】；*_ord 是排序号，写 0 即可。
--   geo_article_id=文章数字 id｜site_config_id=站点数字 id（1=joho.cn）｜user_id=后台用户数字 id
--   author_id=作者档案数字 id｜article_category_id=分类数字 id｜tag_id=标签数字 id
--   first_truth_policy_id=真值数字 id｜knowledge_entity_id=知识实体数字 id

-- site（文章挂到站点，前端按 site 过滤的必备关系）
INSERT INTO zhao_website_geo_articles_site_lnk (geo_article_id, site_config_id, geo_article_ord)
SELECT id, 1, 0 FROM zhao_website_geo_articles WHERE document_id = 'ga-main-000000001';
-- author（按作者档案 document_id 匹配，取回数字 id）
INSERT INTO zhao_website_geo_articles_author_lnk (geo_article_id, author_id)
SELECT a.id, u.id FROM zhao_website_geo_articles a JOIN zhao_website_authors u
  ON u.document_id = 'au-tian-wen-000001' WHERE a.document_id = 'ga-main-000000001';
-- editor（编辑人 = 后台 admin 用户 id 1，固定）
INSERT INTO zhao_website_geo_articles_editor_lnk (geo_article_id, user_id)
SELECT a.id, 1 FROM zhao_website_geo_articles a WHERE a.document_id = 'ga-main-000000001';
-- reviewer（终审人，按审核账号 username 匹配）
INSERT INTO zhao_website_geo_articles_reviewer_lnk (geo_article_id, user_id)
SELECT a.id, u.id FROM zhao_website_geo_articles a JOIN admin_users u
  ON u.username = 'lantai' WHERE a.document_id = 'ga-main-000000001';
-- category（文章归属分类，按分类 document_id 匹配）
INSERT INTO zhao_website_geo_articles_category_lnk (geo_article_id, article_category_id)
SELECT a.id, c.id FROM zhao_website_geo_articles a JOIN zhao_website_article_categories c
  ON c.document_id = 'cat-career-planning' WHERE a.document_id = 'ga-main-000000001';
-- tags（主题标签，可多选，IN 列表）
INSERT INTO zhao_website_geo_articles_tags_lnk (geo_article_id, tag_id, tag_ord)
SELECT a.id, t.id, 0 FROM zhao_website_geo_articles a JOIN zhao_tags t
  ON t.document_id IN ('tag-career-planning','tag-long-term-learning','tag-lifelong-learning','tag-vocational-skills')
WHERE a.document_id = 'ga-main-000000001';
-- truthBasis（真值依据，按 claim_key 匹配真值；主文关联 10 条）
INSERT INTO zhao_website_geo_articles_truth_basis_lnk (geo_article_id, first_truth_policy_id, first_truth_policy_ord)
SELECT a.id, t.id, 0 FROM zhao_website_geo_articles a JOIN zhao_website_first_truths t
  ON t.claim_key IN ('platform_positioning_online_learning','brand_slogan_joho_cn','core_domain_education',
                     'domain_vocational_education_def','domain_lifelong_learning_def','domain_learning_methods_def',
                     'domain_online_education_def','domain_course_def','domain_knowledge_payment_def','core_keywords_edu_learning_course')
WHERE a.document_id = 'ga-main-000000001';
-- mentionedEntities（正文实际提及的知识实体，按实体 slug 匹配；主文关联 10 个）
INSERT INTO zhao_website_geo_articles_mentioned_entities_lnk (geo_article_id, knowledge_entity_id, knowledge_entity_ord)
SELECT a.id, e.id, 0 FROM zhao_website_geo_articles a JOIN zhao_website_knowledge_entities e
  ON e.slug IN ('joho-cn','education','learning','course','online-education','online-course',
                'vocational-education','lifelong-learning','learning-methods','knowledge-payment')
WHERE a.document_id = 'ga-main-000000001';
```

### 4.7 插入后立刻自检

模板 SQL 末尾自带验证语句，执行后检查：

```sql
SELECT id, document_id, title, slug, type, status, article_no, reviewer_name, json_ld_type, risk_type, cta_type
FROM zhao_website_geo_articles WHERE deleted_at IS NULL;
-- 8 组 lnk 计数，每组应为预期值
```

***

## 5. 审核门禁（发布达标检查）

### 5.1 系统自动门禁

status 转 published 时系统自动校验（auditGeoArticle，12 条标准 → 14 项校验），未达标禁止发布；admin 可 `?force=true` 跳过（留痕）。

### 5.2 人工自检接口

后台 admin 端点（完整路径带 `v1/admin` 段，**漏 v1 或 admin 会 405/404**）：

```
GET /api/zhao-website/v1/admin/geo-articles/:documentId/audit-check
```

- 未登录访问应返回 401「未登录或登录已过期」——若是 404 说明接口没生效（dist 未重建，见第 6 章）。

- 本次 4 篇全部返回 pass。

**调用命令**（PowerShell，先本地 1337 验证，再对线上 https）：

```powershell
# ① 未登录直接调（应 401；若 404 = dist 未重建，先看第 6 章）
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check"

# ② admin 登录拿 token（邮箱/密码换成实际审核账号）
$body  = '{"email":"lantai@joho.cn","password":"你的密码"}'
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:1337/admin/login" -ContentType "application/json" -Body $body).data.token

# ③ 带 token 调 audit-check（返回 pass / 未达标项列表）
Invoke-RestMethod -Method Get -Uri "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check" -Headers @{Authorization="Bearer $token"} | ConvertTo-Json -Depth 5
```

***

## 6. 后端发布（zhao-website 插件）

### 6.1 【铁律】插件加载的是 dist，不是源码

Strapi 插件实际加载 `plugins/zhao-website/dist` 构建产物。**改了** **`server/src`** **源码必须重建 dist**：

```powershell
cd e:\code\basic\plugins\zhao-website
npm run build
```

只提交源码不重建 dist 的后果：新接口直接 404（本次 sitemap 扩展就因此踩坑过）。

### 6.2 部署前自检

提交前确认 dist 包含新代码关键字：

```powershell
Select-String -Path e:\code\basic\plugins\zhao-website\dist\server -Pattern "career-lifelong|knowledge-entity" -List
```

无命中 = 未重建，必须重新 `npm run build`。

### 6.3 走部署脚本

后端部署走 `e:\code\basic\docs\deployment\deploy.sh`（禁止裸手 SSH 命令）。脚本逻辑：`git pull` 拉新代码 → `npm install` → `pm2 restart strapi`，所以**在服务器上执行**，不是本地跑。

```powershell
# ① 本地提交源码 + dist（在 strapi 仓库目录，如 e:\code\basic）
git add plugins/zhao-website
git commit -m "feat(zhao-website): xxx"
git push origin main

# ② SSH 到 joho 执行部署脚本（deploy.sh 已随 git 拉到 /www/apps/strapi）
ssh joho "export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:PATH; export PM2_HOME=/home/admin/.pm2; cd /www/apps/strapi && bash docs/deployment/deploy.sh"
```

> 注：`deploy.sh` 执行 `npm install`，2G 内存服务器上首次/大版本安装可能很慢甚至 OOM，属已知风险，耐心等；日常小改动基本无感。

### 6.4 重启后验证

- 重启命令在项目记忆中有固化版本（pm2 管理用户 admin，node v22）。

- 验证新接口用本机 curl：路径带 `/api` 前缀，未登录应为 401/403 而非 404。

```powershell
# ① 公开接口（facts.json，不需要登录，应 200）
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/facts.json"

# ② 内容接口（注意带 /api 前缀 + locale=zh-CN，应 200）
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/geo-articles?locale=zh-CN&pageSize=5"

# ③ admin 接口未登录（应 401；若 404 = dist 未重建，回 6.1）
curl -s -o NUL -w "%{http_code}" "http://localhost:1337/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check"
```

***

## 7. 前端发布（strapi-site 静态站点）

### 7.1 为什么要重新构建

前端是**静态导出**，页面 HTML 在构建期生成。新增/修改文章后必须重建，否则新文章页 404。

### 7.2 【铁律】构建前必须清缓存

Next.js 增量构建会复用 `.next` fetch-cache：**已请求过的 URL 在数据变更后仍返回旧缓存**（本次第三批实体录入时发现：education 实体页出边缺失但接口正常）。

```powershell
Remove-Item -Recurse -Force e:\code\strapi-site\.next, e:\code\strapi-site\out
```

### 7.3 生产环境变量（覆盖 .env.local）

```powershell
$env:NEXT_PUBLIC_SITE_URL="https://www.joho.cn"
$env:NEXT_PUBLIC_API_ORIGIN="https://www.joho.cn"
npm run build
```

- PowerShell 下 `process.env` 优先级高于 `.env.local`（验证方法：产物 JSON-LD 的 url 应为 <https://www.joho.cn）。>

- 构建完成后恢复本地 `env.local`（本地验证用 localhost）。

### 7.4 SEO 元数据机制（本次重点，已上线）

| 机制                       | 位置                                         | 说明                                                                                                                                                    |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根布局 title 模板             | `app/layout.tsx`                           | template="%s"，**不要再拼站点后缀**（metaTitle 自带）                                                                                                              |
| 首页 metadata              | `app/[locale]/page.tsx`                    | generateMetadata：title/description/canonical                                                                                                          |
| 【坑】`(default)` re-export | `app/(default)/page.tsx`                   | 必须 `export { default, generateMetadata }`——只 re-export default 会丢根路径 `/` 的 canonical/description（症状：index.html 无 canonical、description 是默认值，而 /en 正常） |
| 文章 JSON-LD               | `lib/geo-seo.ts`                           | image 必须拼 SITE\_URL 绝对化                                                                                                                               |
| 实体页 SEO                  | `components/views/KnowledgeEntityView.tsx` | canonical + @type 透传 JSON-LD + sameAs                                                                                                                 |
| sitemap                  | 后端 `services/sitemap.ts`                   | 已收录 GEO 文章（按类型映射 /geo-article 等前缀）+ 知识实体 /knowledge/xxx                                                                                               |

### 7.5 部署前端

前端发布一条龙（在 `e:\code\strapi-site` 目录下执行，含第 7.2/7.3 步）：

```powershell
cd e:\code\strapi-site
Remove-Item -Recurse -Force .next, out            # ① 清缓存（铁律，否则旧数据）
$env:NEXT_PUBLIC_SITE_URL  = "https://www.joho.cn"  # ② 生产环境变量
$env:NEXT_PUBLIC_API_ORIGIN = "https://www.joho.cn"
npm run build                                       # ③ 构建静态产物（out/）
powershell -ExecutionPolicy Bypass -File e:\code\strapi-site\deploy-www.ps1   # ④ 部署到 nginx
# ⑤ 构建完成记得恢复本地 env.local（本地验证用 localhost）
```

脚本流程：本地产物 tar 打包 → scp 上传 → 远程解包替换站点目录（`/opt/1panel/apps/openresty/openresty/www/sites/www.joho.cn/index`），结束后自动校验 `SYNC_OK`。

***

## 8. 线上验证清单（发布后必过）

```powershell
# 1) 页面全部 200
https://www.joho.cn/geo-article/career-lifelong-learning-plan          # 200
https://www.joho.cn/geo-faq/career-learning-faq                        # 200
https://www.joho.cn/local-list/lifelong-learning-resource-list         # 200
https://www.joho.cn/local-comparison/online-course-vs-offline-vs-self-study  # 200
https://www.joho.cn/knowledge/learning                                 # 200

# 2) 每页检查（用浏览器查看源代码或脚本匹配）
<title>                      # 文章 metaTitle，无多余模板后缀
rel="canonical"              # 每页都有，指向自身绝对 URL
application/ld+json          # 首页 2 块(Organization+WebSite)、文章 ≥1 块(Article/FAQPage/ItemList)

# 3) sitemap 收录
https://www.joho.cn/sitemap.xml   # 本次 20 个 URL：首页+4 文章+15 知识实体

# 4) 接口鉴权
# 后台接口未登录访问 = 401 而非 404
```

**实际可跑的验证命令**（PowerShell）：

```powershell
# 页面状态码（逐个改 URL，全 200）
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/geo-article/career-lifelong-learning-plan"
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/knowledge/learning"

# sitemap 收录（应命中 geo-article 与 knowledge 条目）
curl -s "https://www.joho.cn/sitemap.xml" | Select-String "geo-article|/knowledge/"

# canonical 与 JSON-LD（应各命中一次以上）
$html = curl -s "https://www.joho.cn/geo-article/career-lifelong-learning-plan"
$html | Select-String 'rel="canonical"'
$html | Select-String 'application/ld\+json'

# 线上 admin 接口未登录（应 401，404 = 线上 dist 未重建）
curl -s -o NUL -w "%{http_code}" "https://www.joho.cn/api/zhao-website/v1/admin/geo-articles/ga-main-000000001/audit-check"
```

***

## 9. 常见错误速查表（本次踩过的坑，按出现顺序）

| #  | 症状                             | 原因                                       | 修复                                                           | <br />        |
| -- | ------------------------------ | ---------------------------------------- | ------------------------------------------------------------ | ------------- |
| 1  | 列表/详情空，site 过滤匹配不到             | SQL 直插没写 `_site_lnk`                     | 按模板补 lnk（lnk 铁律）                                             | <br />        |
| 2  | 文章页不生成，只有 __missing__          | locale 为 NULL                            | 显式 `locale='zh-CN'`（`tmp_fix_article_locale.sql`）            | <br />        |
| 3  | 文章页 404（已建文章）                  | 前端未重新构建/未清缓存                             | 清 `.next,out` + 生产 env 重建 + deploy-[www.ps1](http://www.ps1) | <br />        |
| 4  | 实体页出边缺失但接口正常                   | 增量构建 fetch-cache 旧缓存                     | `Remove-Item .next,out` 清缓存重 build                           | <br />        |
| 5  | 新后台接口 404                      | 只改 src 没重建 dist                          | `npm run build` 重建 dist 并提交                                  | <br />        |
| 6  | 后台接口 405/404                   | 路由路径漏 `v1/admin` 段                       | 完整路径 `/api/zhao-website/v1/admin/...`                        | <br />        |
| 7  | 新增 controller 后 Strapi 启动崩溃重启  | 没在 `controllers/index.ts` 注册             | 注册后重建 dist                                                   | <br />        |
| 8  | 首页无 canonical、description 是默认值 | `(default)/page.tsx` 只 re-export default | 补 `generateMetadata` re-export                               | <br />        |
| 9  | 文章 JSON-LD image 是相对路径         | 没拼 SITE\_URL                             | `${SITE_URL}${url}`                                          | <br />        |
| 10 | 关系过滤报 integer 类型错误 500         | 过滤用了 documentId 而非数字 id                  | 用实体数字 id 过滤                                                  | <br />        |
| 11 | title 带 "                      | strapi-site" 后缀                          | 根布局 template 有站点后缀                                           | template="%s" |
| 12 | 重复执行 SQL 报错                    | lnk 唯一约束                                 | 属预期防护，整体回滚无污染                                                | <br />        |

***

## 10. 一次发布的完整操作顺序（浓缩版清单）

- [ ] 1\. 规划：选类型、定标题（含地域+场景）、定作者与审核人

- [ ] 2\. 数据层：跑 `tmp_article_foundation.sql`（分类/标签/作者/审核账号，命令见 3.4）

- [ ] 3\. 数据层：跑 `tmp_kg_seed*.sql`（实体→关系→各 lnk，实体和真值先于文章，命令见 3.4）

- [ ] 4\. 数据层：跑 `tmp_kg_seed_truths*.sql`（真值 → 真值 site\_lnk → canonical\_entity\_lnk，命令见 3.4）

- [ ] 5\. 数据层：跑 `tmp_article_main.sql` / `tmp_article_supplement.sql`（文章 + 8 组 lnk + locale，命令见 3.4、SQL 示例见 4.6）

- [ ] 6\. 数据层：核对模板末尾验证 SQL 输出（各 lnk 计数正确）

- [ ] 7\. 门禁：调用 audit-check 接口（命令见 5.2），4 篇全部 pass；reviewChecks 四类全勾

- [ ] 8\. 后端：若改了 server/src → 重建 dist → grep 自检 → 提交推送 → 服务器跑 deploy.sh（命令见 6.3）

- [ ] 9\. 前端：清 `.next,out` → 生产 env 构建 → deploy-[www.ps1（命令见](http://www.ps1（命令见) 7.5）

- [ ] 10\. 验证：页面 200、canonical/JSON-LD/title 正确、sitemap 收录、后台接口 401（命令见 8）

***

## 附：相关文件与脚本索引

| 文件                                        | 用途                |
| ----------------------------------------- | ----------------- |
| `e:\code\tmp_article_foundation.sql`      | 分类/标签/作者/审核账号模板   |
| `e:\code\tmp_article_main.sql`            | 主文录入模板（含 8 组 lnk） |
| `e:\code\tmp_article_supplement.sql`      | FAQ/清单/对比补充文模板    |
| `e:\code\tmp_kg_seed.sql`（+2/3）           | 知识实体/关系三批模板       |
| `e:\code\tmp_kg_seed_truths.sql`（+2/3）    | 真值声明三批模板          |
| `e:\code\tmp_fix_article_locale.sql`      | locale 修复模板       |
| `e:\code\tmp_article_audit_data.sql`      | 审计输入数据查询          |
| `e:\code\basic\docs\deployment\deploy.sh` | 后端部署脚本            |
| `e:\code\strapi-site\deploy-www.ps1`      | 前端部署脚本            |
| `e:\code\docs\GEO文章写作手册.md`               | 单篇字段填写规范          |

