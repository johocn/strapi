# admin-manual.md 14 章文档重建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 docs/admin-manual.md 重建为 14 章完整后台管理手册，覆盖 13 插件 104 个 CT + 27 角色。

**Architecture:** 单文件重写 docs/admin-manual.md。按章顺序编写，每 2-3 章一个 commit。数据来源：permissions.ts（中心/角色）+ 各插件 schema.json（CT 字段）+ 现有 spec 文档（业务流程）。

**Tech Stack:** Markdown, Strapi v5 plugin 架构

---

## 文件结构

**改动文件**：仅 `docs/admin-manual.md`（完全重写）

**数据来源**（只读）：
- `plugins/zhao-auth/server/src/permissions.ts` — 11 中心 + 27 角色
- `plugins/*/server/src/content-types/*/schema.json` — 104 CT 字段
- `docs/superpowers/specs/2026-07-09-zhao-logistics-plugin-design.md` — 物流业务流程
- `docs/2026-07-07-zhao-website-user-guide.md` — 官网指南

**CT 清单汇总**（13 插件 104 CT）：
- zhao-auth(3) / zhao-channel(4) / zhao-common(2) / zhao-course(6) / zhao-logistics(16)
- zhao-point(10) / zhao-quiz(5) / zhao-sso(14) / zhao-studio(10) / zhao-tag(4)
- zhao-third(2) / zhao-wealth(10) / zhao-website(18)

---

### Task 1: Ch1 系统概述 + Ch2 角色与权限

**Files:**
- Modify: `docs/admin-manual.md`（完全重写，从头开始）

- [ ] **Step 1: 编写 Ch1 系统概述**

内容包括：
- 平台定位：Strapi v5 多租户官网系统
- 11 中心架构图（ASCII）：course/study/quiz/point/marketing/system/tag/studio/website/logistics/wealth
- 多租户模型：channel → site → CT 三层隔离
- 快速入门：登录后台 → 选择站点 → 导航到中心 → 操作 CT

- [ ] **Step 2: 编写 Ch2 角色与权限**

内容包括：
- 5 系统角色表格：admin / channel-admin / plugin-manager / instructor / user（含说明）
- 22 中心角色表格：11 中心 × manager/editor（含说明）
- 权限矩阵：角色 × 中心（manager 全权限 / editor 无 delete / instructor 只读 / admin 全部 / channel-admin 排除 system-center）
- 角色分配操作步骤

- [ ] **Step 3: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch1 系统概述 + Ch2 角色与权限"
```

---

### Task 2: Ch3 官网中心（18 CT）

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch3）

- [ ] **Step 1: 编写 Ch3 官网中心**

按 CT 分节，覆盖 zhao-website 18 个 CT：
- seo-config（SEO全局配置）
- brand-info（企业品牌信息）
- article（资讯文章）
- article-category（文章分类）
- product（产品/方案）
- case（落地案例）
- compliance（合规公示）
- faq（常见问答）
- tutorial（教程/操作指南）
- download（下载文件管理）
- lead（线索/留资）
- visit-log（访问日志）
- interaction（内容互动记录）
- search-log（搜索日志）
- knowledge-entity（知识图谱实体）
- knowledge-relation（知识图谱关系）
- ai-content-summary（机器可读摘要）
- first-truth-policy（第一真值策略声明）

每节含：用途/所属插件/集合名/字段表/操作步骤/业务规则

- [ ] **Step 2: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch3 官网中心（18 CT）"
```

---

### Task 3: Ch4 物流中心（16 CT）

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch4）

- [ ] **Step 1: 编写 Ch4 物流中心**

按 CT 分节，覆盖 zhao-logistics 16 个 CT：
- quote-request（询价单）
- quote-field-rule（询价动态字段规则）
- quote-price-rule（报价规则表）
- quote-price-formula（报价公式模板）
- tracking-shipment（货物追踪主表）
- tracking-node（追踪节点）
- tracking-provider（追踪API配置）
- contact-matrix（联系渠道矩阵）
- review（客户评价）
- subscription（通知订阅）
- landing-page（营销落地页）
- conversion-funnel（转化漏斗）
- conversion-event（转化事件）
- intent-order（意向订单）
- referral（推荐奖励）
- customer-profile（客户档案）

每节含：用途/所属插件/集合名/字段表/操作步骤/业务规则（重点说明集成点：询价提交全链路/订单转化全链路）

- [ ] **Step 2: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch4 物流中心（16 CT）"
```

---

### Task 4: Ch5 课程中心 + Ch6 学习中心 + Ch7 题库中心

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch5-7）

- [ ] **Step 1: 编写 Ch5 课程中心**

覆盖 zhao-course 6 个 CT：
- course（课程）
- course-lesson（课时）
- course-category（课程分类）
- user-course-auth（用户课程授权）
- course-progress（课程学习记录）
- lesson-progress（课时学习记录）

- [ ] **Step 2: 编写 Ch6 学习中心**

学习中心在 permissions.ts 中有 menu.study-center，但实际 CT 由 zhao-course 的 course-progress/lesson-progress 承载。说明学习中心是课程学习数据的查看视图，无独立 CT。

- [ ] **Step 3: 编写 Ch7 题库中心**

覆盖 zhao-quiz 5 个 CT：
- quiz（题目）
- quiz-batch（批量导入）
- quiz-exam（考试配置）
- quiz-record（答题记录）
- quiz-exam-attempt（考试记录）

- [ ] **Step 4: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch5 课程中心 + Ch6 学习中心 + Ch7 题库中心"
```

---

### Task 5: Ch8 积分中心 + Ch9 营销中心 + Ch10 系统中心

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch8-10）

- [ ] **Step 1: 编写 Ch8 积分中心**

覆盖 zhao-point 10 个 CT：
- point-rule（积分规则）
- rule-template（规则模板）
- point-record（积分记录）
- point-config（积分配置）
- point-type（积分类型）
- point-product（积分商品）
- point-redemption（积分兑换）
- pickup-location（自提点）
- sign-in-record（签到记录）
- channel-verification（渠道核销）

- [ ] **Step 2: 编写 Ch9 营销中心**

覆盖 zhao-channel 4 个 CT：
- channel（渠道）
- user-channel（用户渠道关联）
- user-invite（用户邀请码）
- channel-member（渠道成员关联）

- [ ] **Step 3: 编写 Ch10 系统中心**

覆盖 zhao-common(2) + zhao-sso(14) + zhao-third(2) + zhao-auth(3) 共 21 个 CT：
- site-config（站点配置）— zhao-common
- site-template（站点模板）— zhao-common
- sso-user / sso-app / sso-channel — SSO 核心
- sso-third-party-binding / sso-oauth-config — 三方绑定
- sso-token / sso-auth-code — 令牌管理
- sso-user-app-role — 用户应用角色
- sso-invite-code / sso-invite-usage / sso-invite-stats / sso-referral-relation — 邀请体系
- sso-sms-code — 短信验证
- sso-login-log — 登录日志
- third-party-config / third-party-account — zhao-third
- permission / role-channel / role-action-log — zhao-auth

- [ ] **Step 4: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch8 积分中心 + Ch9 营销中心 + Ch10 系统中心"
```

---

### Task 6: Ch11 标签中心 + Ch12 工作室中心 + Ch13 理财中心

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch11-13）

- [ ] **Step 1: 编写 Ch11 标签中心**

覆盖 zhao-tag 4 个 CT：
- tag（标签）
- tag-group（标签分组）
- tag-index（标签索引）
- knowledge-point（知识点）

- [ ] **Step 2: 编写 Ch12 工作室中心**

覆盖 zhao-studio 10 个 CT：
- article-draft（草稿文章）
- collect-source（采集源）
- collect-task（采集任务）
- knowledge-point-index（知识点索引）
- publish-platform（发布平台）
- publish-account（发布账号）
- publish-record（发布记录）
- stat-summary（统计汇总）
- browser-log（浏览器日志）
- ad-slot（广告位）

- [ ] **Step 3: 编写 Ch13 理财中心**

覆盖 zhao-wealth 10 个 CT：
- wealth-product（理财产品）
- wealth-nav（净值数据）
- wealth-company（理财公司）
- wealth-collect-config（采集配置）
- wealth-customer-product（客户自选产品）
- wealth-risk-metric（风险指标）
- wealth-recommend-config（推荐配置）
- wealth-annual-snapshot（年化快照）
- wealth-yearly-return（年度收益）
- wealth-money-income（货币基金收益）

- [ ] **Step 4: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch11 标签中心 + Ch12 工作室中心 + Ch13 理财中心"
```

---

### Task 7: Ch14 常见问题 + 最终校验

**Files:**
- Modify: `docs/admin-manual.md`（追加 Ch14 + 全文校验）

- [ ] **Step 1: 编写 Ch14 常见问题**

内容包括：
- FAQ：登录问题 / 权限问题 / 数据不显示 / 多租户隔离
- 故障排查：500 错误 / 权限同步 / 编译问题
- 技术约束速查：Strapi v5 限制（Document Service / db.query / manyToMany / populate 格式等）

- [ ] **Step 2: 全文校验**

检查项：
- 14 章编号连续无遗漏
- 所有 CT 都有对应章节
- 章节交叉引用正确
- 字段表格式统一
- 无 TODO/TBD 占位

- [ ] **Step 3: 提交**

```bash
git add docs/admin-manual.md
git commit -m "docs(manual): Ch14 常见问题 + 全文校验完成"
```

---

## Self-Review

### 1. Spec coverage

| Spec 要求 | 对应 Task |
|---|---|
| Ch1 系统概述 | Task 1 |
| Ch2 角色与权限 | Task 1 |
| Ch3 官网中心 18 CT | Task 2 |
| Ch4 物流中心 16 CT | Task 3 |
| Ch5 课程中心 | Task 4 |
| Ch6 学习中心 | Task 4 |
| Ch7 题库中心 | Task 4 |
| Ch8 积分中心 | Task 5 |
| Ch9 营销中心 | Task 5 |
| Ch10 系统中心 | Task 5 |
| Ch11 标签中心 | Task 6 |
| Ch12 工作室中心 | Task 6 |
| Ch13 理财中心 | Task 6 |
| Ch14 常见问题 | Task 7 |
| 全文校验 | Task 7 |

✅ 全覆盖。CT 总数核对：18+16+6+0+5+10+4+21+4+10+10 = 104，与调研结果一致。

### 2. Placeholder scan
- 无 TBD/TODO，每个 Task 有明确的 CT 列表

### 3. Type consistency
- 每节结构统一：用途/所属插件/集合名/字段表/操作步骤/业务规则
- 章节编号 Ch1-Ch14 连续

### 4. 已知限制
- 学习中心无独立 CT（由 course-progress/lesson-progress 承载），Ch6 说明为查看视图
- 系统中心 CT 较多（21 个），按功能分组：站点/SSO核心/SSO扩展/三方/权限
