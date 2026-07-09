# admin-manual.md 14 章文档重建设计

> **Phase 2** of "全部最近新增功能归类到 web 目录面板" 任务。Phase 1（权限树补全 + 22 新角色）已完成。

## 目标

将现有 `docs/admin-manual.md`（仅 34 行，只含标签 SEO 说明）重建为 14 章完整后台管理手册，覆盖全部 11 个中心、27 个角色、所有 CT 的操作说明。

## 范围

**改动文件**：仅 `docs/admin-manual.md`（完全重写）

**不改动**：
- 代码文件（纯文档任务）
- 其他 docs/ 下的设计文档（保留作为参考来源）

**参考来源**：
- `plugins/zhao-auth/server/src/permissions.ts` — 11 中心 + 27 角色 + 权限树
- 各插件 `server/src/content-types/*/schema.json` — CT 字段定义
- `docs/superpowers/specs/2026-07-09-zhao-logistics-plugin-design.md` — 物流中心业务流程
- `docs/superpowers/specs/2026-07-09-zhao-logistics-acceptance-manual.md` — 物流验收手册
- `docs/2026-07-07-zhao-website-user-guide.md` — 官网用户指南

---

## 1. 文档结构（14 章）

| 章 | 标题 | 内容 |
|---|---|---|
| Ch1 | 系统概述 | 平台定位、11 中心架构、多租户模型、快速入门 |
| Ch2 | 角色与权限 | 27 角色（5 系统 + 22 中心）、权限矩阵、角色分配流程 |
| Ch3 | 官网中心 | website 16 CT（SEO/品牌/文章/产品/案例/合规/FAQ/教程/下载/线索/访问日志/互动/搜索日志/知识实体/知识关系/AI摘要/第一性真理）|
| Ch4 | 物流中心 | logistics 16 CT（询价/报价规则/追踪/联系矩阵/评价/订阅/落地页/漏斗/订单/推荐/客户档案等）|
| Ch5 | 课程中心 | course 相关 CT |
| Ch6 | 学习中心 | study 相关 CT |
| Ch7 | 题库中心 | quiz 相关 CT（题库/考试/批量考试）|
| Ch8 | 积分中心 | point 相关 CT（积分规则/规则模板/签到记录）|
| Ch9 | 营销中心 | marketing 相关 CT（渠道/渠道权限/用户渠道）|
| Ch10 | 系统中心 | system 相关 CT（租户/站点/配置/功能开关/SSO 全套/Media）|
| Ch11 | 标签中心 | tag 相关 CT（标签/标签组/标签索引）|
| Ch12 | 工作室中心 | studio 10 CT（采集/发布/统计/广告）|
| Ch13 | 理财中心 | wealth 10 CT（产品/净值/公司/采集配置/持仓/风险指标/推荐配置/年报/年化收益/收益分配）|
| Ch14 | 常见问题 | FAQ、故障排查、技术约束速查 |

---

## 2. 每章内部结构（按 CT 分节）

每个中心章（Ch3-Ch13）按 CT 分节，每节包含：

### 2.1 标准节结构

```markdown
### X.Y {CT 中文名}（{ct-singularName}）

**用途**：{一句话说明 CT 的业务用途}

**所属插件**：{plugin::zhao-xxx}
**集合名**：{collectionName}

#### 字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| {field} | {type} | 是/否 | {说明} |

#### 操作步骤

- **查看**：{步骤}
- **创建**：{步骤}
- **编辑**：{步骤}
- **删除**：{步骤}（仅 manager 角色）
- **特殊操作**：{如有，如 collect/trigger/export 等}

#### 业务规则

- {关联关系}
- {状态流转}
- {约束条件}
```

### 2.2 Ch1/Ch2/Ch14 特殊结构

- **Ch1 系统概述**：平台定位 + 11 中心架构图（ASCII）+ 多租户模型 + 快速入门（登录/导航/基础操作）
- **Ch2 角色与权限**：27 角色表格 + 权限矩阵（角色 × 中心）+ 角色分配操作步骤
- **Ch14 常见问题**：FAQ（按业务场景分类）+ 故障排查（常见错误及解决）+ 技术约束速查（Strapi v5 限制）

---

## 3. 各章内容要点

### Ch1 系统概述
- 平台定位：Strapi v5 多租户官网系统
- 11 中心架构图：course/study/quiz/point/marketing/system/tag/studio/website/logistics/wealth
- 多租户模型：channel → site → CT 三层隔离
- 快速入门：登录后台 → 选择站点 → 导航到中心 → 操作 CT

### Ch2 角色与权限
- 5 系统角色：admin / channel-admin / plugin-manager / instructor / user
- 22 中心角色：{center}-manager / {center}-editor × 11 中心
- 权限矩阵：角色 × 中心（manager 全权限 / editor 无 delete / instructor 只读）
- 角色分配：admin/channel-admin 可分配角色

### Ch3 官网中心（16 CT）
SEO配置、品牌信息、文章、文章分类、产品、案例、合规、FAQ、教程、下载、线索、访问日志、互动记录、搜索日志、知识实体、知识关系、AI摘要、第一性真理

### Ch4 物流中心（16 CT）
询价单、报价字段规则、报价价格规则、报价公式、追踪运单、追踪节点、追踪服务商、联系矩阵、评价、订阅、落地页、转化漏斗、漏斗统计、转化事件、意向订单、推荐、推荐统计、客户档案

### Ch5 课程中心
课程相关 CT（需读取 zhao-course schema 确认）

### Ch6 学习中心
学习数据相关 CT（需读取 zhao-study schema 确认）

### Ch7 题库中心
题库、题目、考试、考试记录、批量考试

### Ch8 积分中心
积分规则、规则模板、签到记录

### Ch9 营销中心
渠道配置、渠道权限、用户渠道

### Ch10 系统中心
租户、站点配置、系统配置、功能开关、SSO 核心（用户/应用/角色）、SSO 扩展（三方绑定/OAuth配置/令牌/授权码/用户应用角色/邀请体系/短信验证）、Media 媒体资源

### Ch11 标签中心
标签、标签组、标签索引

### Ch12 工作室中心（10 CT）
文章草稿、采集源、采集任务、知识索引、发布平台、发布账号、发布记录、统计汇总、浏览日志、广告位

### Ch13 理财中心（10 CT）
产品、净值、公司、采集配置、客户持仓、风险指标、推荐配置、年报、年化收益、收益分配

### Ch14 常见问题
- FAQ：登录问题 / 权限问题 / 数据不显示 / 多租户隔离
- 故障排查：500 错误 / 权限同步 / 编译问题
- 技术约束速查：Strapi v5 限制（Document Service / db.query / manyToMany 等）

---

## 4. 实现策略

### 4.1 数据来源

编写时需读取以下文件获取准确字段信息：
- `plugins/zhao-auth/server/src/permissions.ts` — 确认中心/CT/权限完整列表
- `plugins/*/server/src/content-types/*/schema.json` — 确认每个 CT 的字段定义
- 现有 spec 文档 — 确认业务流程

### 4.2 文档规模

- 14 章 × 平均 150 行/章 ≈ 2100 行
- 重点中心（官网/物流/系统/理财）内容多，简单中心（标签/学习）内容少

### 4.3 编写顺序

按章顺序编写，每 2-3 章一个 commit：
1. Ch1-2（概述 + 角色）
2. Ch3-4（官网 + 物流，重点章节）
3. Ch5-8（课程/学习/题库/积分）
4. Ch9-11（营销/系统/标签）
5. Ch12-13（工作室/理财）
6. Ch14（FAQ）+ 最终校验

---

## 5. 已知限制

- **字段准确性**：需逐一读取 schema.json 确认字段，避免臆造
- **业务流程**：部分 CT 的业务流程需参考各插件 service 代码确认
- **前端操作步骤**：Strapi Content Manager 自动渲染 CT，操作步骤为通用流程（列表→创建→编辑→保存）
- **自定义端点**：部分 CT 有自定义 Admin API 端点（如物流的 review-action/intent-order-action），需单独说明

---

## Self-Review

### 1. Placeholder 扫描
- Ch5/Ch6 标注"需读取 schema 确认" — 这是实现时的数据来源指引，不是 spec placeholder
- 所有章节有明确内容范围

### 2. 内部一致性
- 14 章对应 11 中心 + 概述 + 角色 + FAQ，无遗漏
- 27 角色覆盖 Phase 1 新增的 22 个 + 现有 5 个
- CT 列表与 permissions.ts 的 PERMISSION_TREE 一致

### 3. 范围检查
- 单文件重写（admin-manual.md），适合单个实施计划
- 2100 行文档分 6 个 commit，工作量适中

### 4. 歧义检查
- 每章按 CT 分节明确
- 字段表格式统一
- 角色权限矩阵清晰
