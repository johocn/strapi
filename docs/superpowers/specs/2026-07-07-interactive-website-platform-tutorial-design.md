# 交互官网平台实例教程设计

## 1. 核心目标

以交互官网平台（zhao-website）自身为案例，编写一份"从零到上线"的实例教程文档。产品 = 交互官网平台本身（自举），所有内容板块填充实际运营数据，演示如何在一个空白多租户系统中搭建一个完整、可信、可作为参考范例的官网站点。

## 2. 教程定位

| 维度 | 决策 |
|---|---|
| 目标读者 | 三者兼顾（运营人员 + 开发者 + 销售演示） |
| 交付形态 | Markdown 文档 + 截图录屏（文档先交付，截图位标注） |
| 行业背景 | 自举（产品=交互官网平台本身） |
| 高级板块 | 多租户配置 + dsite 前端联调 + Studio Bridge（不含 Admin UI 高级） |
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
- 4.5 tutorial（3 个）：5 分钟搭建（beginner）/ 多租户配置（intermediate）/ 自定义模板（advanced）
- 4.6 compliance（4 条）：服务协议 / 隐私政策 / 数据处理协议 / 等保备案
- 4.7 download（3 个）：白皮书 / 数据表 / 技术指南

### 第 5 章：Studio Bridge 演示
- 5.1 前置条件：zhao-studio 草稿
- 5.2 撰写草稿《2026 年度产品路线图》
- 5.3 Admin UI → Studio Bridge
- 5.4 选择草稿 + 填写参数 + 发布
- 5.5 验证 article 创建 + 双向关联
- 5.6 dsite 访问确认
- 技术原理：双向关联机制、sourceType 溯源、原子性回滚

### 第 6 章：dsite 前端联调
- 6.1 启动 dsite dev server
- 6.2 验证 devProxy 联通
- 6.3 逐一验证 16 个页面路由（含预期内容）
- 6.4 验证 SEO 输出（sitemap/robots/llms + meta 标签）
- 6.5 验证留资流程（contact 表单 → Dashboard 线索）
- 6.6 验证下载流程（requireLead true/false 两种）
- 技术原理：nitro.devProxy、routeRules proxy、useSite SSR 友好性、useSeoMeta 自动注入

### 第 7 章：验收清单
- 7.1 多租户配置验收（5 项）
- 7.2 内容数据验收（10 项）
- 7.3 Studio Bridge 验收（5 项）
- 7.4 dsite 前端验收（8 项）
- 7.5 SEO 输出验收（4 项）
- 7.6 留资互动验收（3 项）

## 4. 虚拟数据原则

- **产品 = 交互官网平台本身**：product CT 的 name="交互官网平台"，描述系统真实能力
- **案例虚拟但坚固**：3 个案例（制造业/教育/SaaS）逻辑自洽，成果数据合理
- **文章真实功能介绍**：5 篇文章对应 5 个核心能力，内容专业可信
- **FAQ 真实功能问答**：8 条覆盖售前常见疑问
- **教程真实操作指南**：3 个对应 3 个难度等级
- **合规真实公示**：4 条符合国内法规要求
- **下载真实资源**：3 个对应白皮书/数据表/技术指南

## 5. 截图规范

- 每章标注截图位置（约 35 张）
- 截图内容预期详细说明
- 由用户后续在运行环境补充实际截图

## 6. 不在范围

- Admin UI 高级功能（知识图谱/真值/AI 摘要/SEO 输出 Tab）
- 多语言 i18n
- 多模板实现（仅用 default）
- 性能压测
- 部署上线（仅本地开发环境）

## 7. 交付文件

`docs/2026-07-07-interactive-website-platform-tutorial.md`（约 1000 行）
