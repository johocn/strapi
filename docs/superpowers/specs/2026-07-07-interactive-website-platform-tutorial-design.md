# 交互官网平台实例教程设计

## 1. 核心目标

以交互官网平台（zhao-website）自身为案例，编写一份"从零到上线"的实例教程文档。产品 = 交互官网平台本身（自举），所有内容板块填充实际运营数据，演示如何在一个空白多租户系统中搭建一个完整、可信、可作为参考范例的官网站点。

## 2. 教程定位

| 维度 | 决策 |
|---|---|
| 目标读者 | 三者兼顾（运营人员 + 开发者 + 销售演示） |
| 交付形态 | Markdown 文档 + 截图录屏（文档先交付，截图位标注） |
| 行业背景 | 自举（产品=交互官网平台本身） |
| 高级板块 | 多租户配置 + dsite 前端联调 + Studio Bridge + Admin UI 6 个页面操作示例 |
| 篇幅深度 | 详细版（800-1200 行，每步详细说明+技术原理+数据示例+截图） |
| 结构 | 线性流程式（从零到上线） |

## 3. 章节结构

### 第 1 章：环境准备
- 1.1 前置条件（Node 20+、PostgreSQL、Redis 可选）
- 1.2 启动 Strapi（`cd basic; npm run develop`）
- 1.3 验证 bootstrap 自动创建默认 site-config + 5 套预设模板
- 1.4 创建管理员账号
- 1.5 验证公开 API 可访问
- 技术原理：bootstrap 种子机制、site-resolver 识别优先级、默认 site-config 无 domain 的原因

### 第 2 章：多租户配置
- 2.1 编辑默认 site-config（siteName="交互官网平台"、domain="localhost"）
- 2.2 选择模板（关联 default）
- 2.3 配置 featureFlags（channel=true, oss=true，其余 false）
- 2.4 创建 channel（name="官方直营"、code="official"、channelTier="official"）
- 2.5 关联 channel 到 site-config
- 2.6 验证 site-info API
- 虚拟数据：site-config 完整 JSON（siteName="交互官网平台"、customerServiceUrl="https://www.joho.cn"、icpNumber="沪ICP备2026000001号"）
- 技术原理：site-config 与 site-template 关系、channelUsage 枚举、featureFlags 作用、domain unique 约束

### 第 3 章：分类与标签体系
- 3.1 创建 5 个 article-category（产品动态/行业洞察/客户故事/产品教程/公告通知）
- 3.2 创建 15+ tag（按 3 组：产品类/行业类/功能类）
- 3.3 验证列表
- 技术原理：article-category 共用机制、tag manyToMany 跨 CT 复用、slug uid 生成

### 第 4 章：7 个 CT 内容创建
每个 CT 小节包含：字段说明 + 完整 JSON 数据 + 操作步骤 + 验证

- 4.1 product（1 个）：交互官网平台本身
- 4.2 case（3 个）：制造业集团 / 教育机构 / SaaS 公司
- 4.3 article（5 篇）：多租户架构 / SSR+SEO / 模板系统 / 知识图谱 / Studio Bridge
- 4.4 faq（8 条）：租户数量 / 自定义域名 / 多语言 / SEO / 发布流程 / 私有化 / Strapi 增强 / CRM 对接
- 4.5 tutorial（6 个）：5 分钟搭建（beginner）/ 多租户配置（intermediate）/ 自定义模板（advanced）/ API 集成（advanced）/ 权限配置（intermediate）/ 性能优化（advanced）
- 4.6 compliance（8 条）：服务协议 / 隐私政策 / 数据处理协议 / 等保三级备案 / ISO27001 证书 / ISO9001 证书 / 高新技术企业认证 / 软件著作权登记
- 4.7 download（3 个）：白皮书 / 数据表 / 技术指南

### 第 5 章：Strapi Admin UI 操作示例
覆盖 zhao-website 插件 6 个管理页面的完整操作演示，每节含字段说明 + 操作步骤 + JSON 数据示例 + 截图位

- 5.1 Dashboard 仪表盘
  - 查看 4 个统计卡片（文章/产品/线索/搜索热度）
  - 线索 Tab：查看留资列表，点击查看详情
  - 搜索 Tab：查看热门搜索词统计
  - 截图：Dashboard 全屏、线索列表、搜索统计

- 5.2 Studio Bridge 一键发布
  - 选择 Studio 草稿（如《2026 年度产品路线图》）
  - 填写发布参数 JSON 示例：
    ```json
    {
      "draftId": "studio-draft-001",
      "title": "交互官网平台 2026 年度产品路线图",
      "category": "产品动态",
      "tags": ["产品动态", "内容管理"],
      "slug": "2026-product-roadmap"
    }
    ```
  - 点击"发布到官网" → 验证 article 创建 + 双向关联
  - 截图：Studio Bridge 表单、发布成功提示

- 5.3 Knowledge Graph 知识图谱
  - 实体 CRUD 示例 JSON：
    ```json
    {
      "name": "交互官网平台",
      "entityType": "Organization",
      "description": "多租户企业官网平台",
      "url": "https://www.joho.cn"
    }
    ```
  - 关系管理示例：交互官网平台（Organization）→ founder → 张某（Person）
  - JSON-LD 导出：点击导出按钮，复制 `@graph` 结构
  - 截图：实体列表、关系图、JSON-LD 输出

- 5.4 First-Truth 真值管理
  - 真值 CRUD 示例 JSON：
    ```json
    {
      "key": "foundingYear",
      "value": "2015",
      "category": "business_license",
      "source": "工商注册信息",
      "confidence": 1.0,
      "verified": true
    }
    ```
  - 冲突检测：扫描内容与真值的字段冲突，列表标红
  - 验证操作：对未验证真值点击"验证"按钮
  - 截图：真值列表、冲突检测、验证状态

- 5.5 AI Summaries AI 摘要
  - 列表查看：按 CT 类型筛选摘要
  - 编辑摘要：修改 summary 字段
  - 重新生成：调用 AI 服务重新生成（耗时 5-15 秒）
  - 摘要示例 JSON：
    ```json
    {
      "contentType": "article",
      "contentTitle": "多租户架构：一套代码如何支撑 100+ 企业官网",
      "summary": "本文解析交互官网平台的多租户架构，从域名识别、数据隔离到模板差异化，实测支撑 100+ 站点，QPS 800+。",
      "updatedAt": "2026-07-07T10:00:00Z"
    }
    ```
  - 截图：摘要列表、编辑表单、重新生成进度

- 5.6 SEO Output SEO 输出
  - sitemap.xml Tab：查看 XML 格式站点地图
  - robots.txt Tab：查看爬虫协议
  - llms.txt Tab：查看 LLM 友好摘要
  - 截图：三个 Tab 的输出内容

技术原理：6 个页面的数据来源、Admin UI 与公开 API 的边界、权限模型

### 第 6 章：Studio Bridge 深度演示
- 6.1 前置条件：zhao-studio 草稿
- 6.2 撰写草稿《2026 年度产品路线图》
- 6.3 Admin UI → Studio Bridge（接第 5.2 节）
- 6.4 选择草稿 + 填写参数 + 发布
- 6.5 验证 article 创建 + 双向关联
- 6.6 dsite 访问确认
- 技术原理：双向关联机制、sourceType 溯源、原子性回滚

### 第 7 章：dsite 前端联调
- 7.1 启动 dsite dev server
- 7.2 验证 devProxy 联通
- 7.3 逐一验证 16 个页面路由（含预期内容）
- 7.4 验证 SEO 输出（sitemap/robots/llms + meta 标签）
- 7.5 验证留资流程（contact 表单 → Dashboard 线索）
- 7.6 验证下载流程（requireLead true/false 两种）
- 技术原理：nitro.devProxy、routeRules proxy、useSite SSR 友好性、useSeoMeta 自动注入

### 第 8 章：验收清单
- 8.1 多租户配置验收（5 项）
- 8.2 内容数据验收（10 项）
- 8.3 Admin UI 操作验收（6 项）
- 8.4 Studio Bridge 验收（5 项）
- 8.5 dsite 前端验收（8 项）
- 8.6 SEO 输出验收（4 项）
- 8.7 留资互动验收（3 项）

## 4. 虚拟数据原则

- **产品 = 交互官网平台本身**：product CT 的 name="交互官网平台"，描述系统真实能力
- **案例虚拟但坚固**：3 个案例（制造业/教育/SaaS）逻辑自洽，成果数据合理
- **文章真实功能介绍**：5 篇文章对应 5 个核心能力，内容专业可信
- **FAQ 真实功能问答**：8 条覆盖售前常见疑问
- **教程真实操作指南**：6 个覆盖 3 个难度等级 + API 集成 + 权限配置 + 性能优化
- **合规真实公示**：8 条含 4 条协议政策 + 4 条资质证书（等保三级/ISO27001/ISO9001/高新企业/软著）
- **下载真实资源**：3 个对应白皮书/数据表/技术指南

## 5. 截图规范

- 每章标注截图位置（约 35 张）
- 截图内容预期详细说明
- 由用户后续在运行环境补充实际截图

## 6. 不在范围

- 多语言 i18n
- 多模板实现（仅用 default）
- 性能压测
- 部署上线（仅本地开发环境）

## 7. 交付文件

`docs/2026-07-07-interactive-website-platform-tutorial.md`（约 1200-1500 行）
