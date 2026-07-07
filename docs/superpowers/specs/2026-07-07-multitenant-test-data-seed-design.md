# 多租户网站测试数据种子脚本设计

## 1. 核心目标

创建一个独立种子脚本 `scripts/seed-website-test-data.js`，为多租户网站系统填充全量测试数据，覆盖所有功能模块（3 个租户 + 7 个业务 CT + 5 个高级 CT），支持 `--clean` 清理重置，与现有 `seed-tag-groups.js` 模式一致。

## 2. 约束决策

| 维度 | 决策 |
|---|---|
| 数据范围 | 全量覆盖（site-config/template/channel + article-category/tag + 7 业务 CT + knowledge-entity/first-truth/ai-summary/lead/interaction） |
| 执行方式 | 独立脚本手动执行（`node scripts/seed-website-test-data.js`） |
| 数据来源 | 重新生成（不复用 tutorial.md 数据） |
| 租户数量 | 3 个测试 site-config（localhost/tenant-a.local/tenant-b.local）+ 3 个 channel |
| 清理功能 | 支持 `--clean` 参数，按 document_id 前缀精确清理 + 重插 |
| 高级数据量 | 少量代表性（每 CT 3-9 条） |
| 脚本架构 | 单文件（`scripts/seed-website-test-data.js`），内部按模块分函数 |
| 技术路径 | knex 直连（参考 `seed-tag-groups.js` 模式） |

## 3. 技术路径

- **连接方式**：knex 直连 PostgreSQL，从 `.env` 读取 `DATABASE_*` 配置
- **documentId 生成**：固定前缀 + 补 0 至 25 位（如 `testsite00000000000000001`），保证幂等
- **关系处理**：
  - M2O 关系：先查 target id，再插 source 的 `xxx_id` 字段
  - M2M 关系：先查双方 id，再插 join 表（表名 `{owner}_{attr}_lnk`）
  - 物理外键（site_id）：从 site-config 查数值 id
- **幂等性**：先 `select` 判断存在，再 `insert`（避免 partial unique index 的 onConflict 问题）
- **JSON 字段**：knex 直写需 `JSON.stringify`（如 features/steps/results）
- **清理标识**：所有测试数据 document_id 统一前缀（`test` + CT 缩写），channel 用 `code LIKE 'test-%'`

## 4. 数据量汇总

| 模块 | CT | 数据量 | 备注 |
|---|---|---|---|
| 1 | site-config + channel | 3 + 3 | 3 租户 + 3 渠道 + 3 关联 |
| 2 | article-category | 15 | 每站点 5 个 |
| 3 | tag + tag-group | 15 + 3 | 全局共享 |
| 4 | article | 15 | 每站点 5 篇（3 published + 1 draft + 1 archived） |
| 5 | product | 4 | 1+1+2 |
| 6 | case | 7 | 2+2+3 |
| 7 | faq | 15 | 每站点 5 条 |
| 7 | tutorial | 9 | 每站点 3 个（覆盖 3 难度） |
| 7 | compliance | 12 | 每站点 4 条（覆盖 5 枚举） |
| 7 | download | 6 | 每站点 2 个 |
| 8 | knowledge-entity + relation | 9 + 6 | 每站点 3 实体 + 2 关系 |
| 9 | first-truth | 9 | 每站点 3 条 |
| 9 | ai-summary | 6 | 每站点 2 条 |
| 10 | lead | 15 | 每站点 5 条（new/contacted/converted） |
| 10 | interaction | 24 | 每站点 8 条（search/view/click/share） |
| **总计** | | **~175 条** | |

## 5. 模块设计

### 模块 1：site-config + channel（多租户基础）

3 个测试站点：

| document_id | siteName | domain | template | channel | channelTier |
|---|---|---|---|---|---|
| testsite00000000000000001 | 圣麟主站 | localhost | default | 官方直营(test-official) | official |
| testsite00000000000000002 | 昭易科技 | tenant-a.local | coursera-blue | 华东大区(test-regional) | regional |
| testsite00000000000000003 | 智教云 | tenant-b.local | netease-red | 上海分部(test-city) | city |

- 固定 document_id 保证幂等
- channel 树结构：官方直营(根) → 华东大区 → 上海分部（演示层级）
- site-config ↔ channel M2M 关联通过 join 表 `zhao_channels_site_configs_lnk`

### 模块 2：article-category（分类）

每站点 5 个分类（共 15 个），slug 含站点前缀保证全局唯一：
- 圣麟主站：main-product-news / main-industry-insights / main-customer-stories / main-product-tutorials / main-announcements
- 昭易科技：a-solutions / a-tech-sharing / a-customer-cases / a-user-guides / a-company-news
- 智教云：b-course-news / b-learning-insights / b-teaching-cases / b-operation-manuals / b-platform-announcements

- `site_id` 用数值 id（从 site-config 查询）
- 固定 document_id（`testcat00000000000000001` 起递增）

### 模块 3：tag + tag-group（标签）

3 个测试标签组（slug: test-product-tags / test-industry-tags / test-feature-tags）：
- 产品类：多租户/SSR/SEO优化/内容管理/模板系统
- 行业类：企业服务/SaaS/B2B/数字化转型/教育科技
- 功能类：知识图谱/真值管理/AI摘要/Studio Bridge/留资转化

- tag-group 全局共享，检查现有 10 个组避免重复
- tag 固定 document_id（`testtag00000000000000001` 起递增）
- tag ↔ tag-group 关联通过 join 表 `zhao_tags_tag_group_lnk`

### 模块 4：article（资讯文章）

每站点 5 篇（共 15 篇），固定 document_id（`testart0000000000000001` 起递增）：
- 圣麟主站：多租户架构设计/SSR SEO 最优解/模板系统演进/知识图谱实战/Studio Bridge 闭环
- 昭易科技：企业官网数字化转型/B2B 内容营销策略/多渠道获客方法/官网性能优化/SEO 收录加速
- 智教云：教育机构官网建设/在线课程展示技巧/招生转化提升/学习社区运营/教学案例分享

- `site_id` + `category_id` 关联本站点
- `tags` 通过 join 表 `zhao_website_articles_tags_lnk`
- `coverImage` 用 picsum 占位图
- 状态分布：3 published + 1 draft + 1 archived（演示状态流）
- published 设置 `publishedAt`，archived 设置 `deletedAt`

### 模块 5：product（产品）

4 个产品：
- 圣麟主站：交互官网平台（isFeatured:true, published）
- 昭易科技：企业 CMS 系统（published）
- 智教云：在线教育平台（isFeatured:true, published） + 课程商城（draft）

- 主字段 `name`（非 title）
- `features`/`specifications`/`scenarios` 用 `JSON.stringify`
- `category_id` 关联本站点分类

### 模块 6：case（落地案例）

7 个案例：
- 圣麟主站：某制造业集团官网矩阵（isFeatured）/ 某SaaS公司品牌升级
- 昭易科技：某零售企业数字化转型 / 某金融机构官网重构
- 智教云：某教育机构招生官网 / 某培训学校在线商城（isFeatured）/ 某大学门户建设

- `clientName`/`challenge`/`solution` 必填
- `results` 用 JSON 数组 `[{metric, value}]`
- `relatedProducts` 通过 join 表 `zhao_website_cases_products_lnk`
- `tags` 通过 join 表 `zhao_website_cases_tags_lnk`

### 模块 7：faq + tutorial + compliance + download

#### faq（15 条，每站点 5 条）
- 主字段 `question`（非 title），无 coverImage/slug
- `order` 按站点从 1 递增
- 3 条 isFeatured:true

#### tutorial（9 个，每站点 3 个）
- 覆盖 3 难度：beginner/intermediate/advanced
- `steps` JSON 数组 `[{title, content}]`，3-8 步
- `materials` JSON 数组
- 每站点分配不同难度组合

#### compliance（12 条，每站点 4 条）
- `category` 枚举：notice/policy/report/certificate/agreement（每站点覆盖 4 种）
- `effectiveDate`/`expiryDate` 固定日期（2026-01-01 起）
- 1 条 isPinned:true

#### download（6 个，每站点 2 个）
- 主字段 `name`（非 title），无 slug
- `fileType`：whitepaper/datasheet/guide
- `requireLead` 交替 true/false
- `file` 用占位 URL
- `downloadCount` 随机 100-5000

### 模块 8：knowledge-entity + knowledge-relation（知识图谱）

每站点 3 实体（共 9 个）+ 2 关系（共 6 条）：
- 圣麟主站：交互官网平台(Organization) / 张某(Person,创始人) / 多租户架构(Technology)
- 昭易科技：昭易科技(Organization) / 企业CMS(Product) / 李某(Person,CTO)
- 智教云：智教云(Organization) / 在线教育平台(Product) / 王某(Person,CEO)

关系：
- Organization → founder → Person
- Organization → produces → Product（或 Technology）

- `entityType` 遵循 Schema.org
- `structuredData` 存储 JSON-LD 片段
- 实体先插入，查询 id 后再插入关系

### 模块 9：first-truth + ai-summary

#### first-truth（9 条，每站点 3 条）
- 圣麟主站：foundingYear=2015 / employeeCount=200 / serviceCount=100+
- 昭易科技：foundingYear=2018 / employeeCount=50 / productCount=3
- 智教云：foundingYear=2020 / employeeCount=80 / courseCount=500+

- `category` 枚举：business_license/brand_claim/technical_spec/certification/financial/other
- `confidence` 0.8-1.0
- `verified` 交替 true/false

#### ai-summary（6 条，每站点 2 条）
- 每站点 1 条 article 摘要 + 1 条 product 摘要
- `contentType` 枚举：article/product/case/faq/tutorial
- `contentId` 关联对应 CT 的 documentId
- `summary` 100-200 字

### 模块 10：lead + interaction

#### lead（15 条，每站点 5 条）
- name: 张三/李四/王五/赵六/钱七
- phone: 13800138000-13800138004
- email: test1@example.com - test5@example.com
- company: 测试公司A/B/C/D/E
- message: 了解多租户方案/咨询价格/预约演示
- sourcePage: /contact / /products/xxx / /downloads/xxx
- status: 2 new + 2 contacted + 1 converted
- `site_id` 关联站点
- `ip` 测试 IP（192.168.1.x）
- `userAgent` 固定测试 UA

#### interaction（24 条，每站点 8 条）
- search: 3 条（"多租户"/"SEO"/"价格"）
- view: 3 条（article 详情页）
- click: 1 条（CTA 按钮）
- share: 1 条（文章分享）
- `targetType` 枚举：article/product/case/faq/tutorial/compliance/download/page
- `targetId` 关联 CT documentId 或页面路径
- `visitorId` 固定测试访客 ID（test-visitor-001）
- `action` 枚举：search/view/click/share/like/collect

### 模块 11：清理逻辑（--clean 参数）

清理顺序（反依赖序）：
1. interaction（无依赖）
2. lead
3. ai-summary
4. first-truth
5. knowledge-relation → knowledge-entity
6. download → compliance → tutorial → faq → case → product → article（含 join 表）
7. article-category
8. tag → tag-group（仅测试创建的）
9. channel（test-%）→ site-config（testsite%）
10. site-config ↔ channel join 表

清理标识：
- 所有测试数据 document_id 统一前缀：`test` + CT 缩写
- channel 用 `code LIKE 'test-%'`
- 按 LIKE 删除，不影响生产数据

### 模块 12：执行入口

命令：
```powershell
# 清理测试数据
node scripts/seed-website-test-data.js --clean

# 插入测试数据
node scripts/seed-website-test-data.js

# 清理 + 插入（重置）
node scripts/seed-website-test-data.js --clean --seed
```

输出格式：
```
[1/12] 清理测试数据...
  - 删除 interaction: 24 条
  - 删除 lead: 15 条
  ...
[2/12] 插入 site-config: 3 条
[3/12] 插入 channel: 3 条 + 关联 3 条
...
[12/12] 插入 lead: 15 条 + interaction: 24 条
完成！总计插入 175 条测试数据。
```

## 6. 文件结构

```
e:\code\basic\scripts\
  seed-website-test-data.js   (新增，单文件，约 800-1000 行)
  seed-tag-groups.js          (现有，参考模板)
  seed-kp.js                  (现有)
```

## 7. 不在范围

- 迁移脚本（不进入 migration-runner 自动执行）
- bootstrap 内嵌种子（不污染生产启动路径）
- 性能压测数据（不生成 100+ 条单 CT 数据）
- 真实文件上传（file 字段用占位 URL）
- 真实图片生成（coverImage 用 picsum 占位图）
- 多语言 i18n 数据
- 真实 AI 服务调用（ai-summary 直接写入预生成文本）

## 8. 验收标准

- [ ] `node scripts/seed-website-test-data.js --clean` 能清理所有测试数据
- [ ] `node scripts/seed-website-test-data.js` 能插入全部 175 条测试数据
- [ ] 重复执行不报唯一约束冲突（幂等）
- [ ] 清理 + 重插后数据一致
- [ ] 3 个 site-config 通过 `domain` 可识别
- [ ] 7 个业务 CT 在 web 后台可见
- [ ] 5 个高级 CT 在 Admin UI 可见
- [ ] 不影响生产数据（清理只删 `test%` 前缀）
