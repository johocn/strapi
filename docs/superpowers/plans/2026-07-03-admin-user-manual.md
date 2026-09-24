# Admin 后台用户使用手册 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 admin 超级管理员编制后台用户使用手册，7 个 markdown 文件，按工作流程组织，极简操作步骤风格。

**Architecture:** 纯文档任务，无代码/测试。在 `e:\code\docs\manual\admin\` 下创建 index.md + 6 个流程文件。每个文件遵循统一格式（步骤 + 验证）。所有页面入口路径已从 web/pages 实际目录结构核查。

**Tech Stack:** Markdown

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `docs/manual/admin/index.md` | 导航页 + admin 职责速查表 |
| `docs/manual/admin/01-initial-setup.md` | 首次系统初始化流程 |
| `docs/manual/admin/02-add-tenant.md` | 新增租户流程 |
| `docs/manual/admin/03-business-overview.md` | 业务监督入口清单 |
| `docs/manual/admin/04-permission-management.md` | 权限管理流程 |
| `docs/manual/admin/05-template-config.md` | 模板与站点配置流程 |
| `docs/manual/admin/06-system-maintenance.md` | 系统维护入口清单 |

---

### Task 1: 创建 index.md 导航页

**Files:**
- Create: `e:\code\docs\manual\admin\index.md`

- [ ] **Step 1: 创建 index.md**

写入以下内容：

```markdown
# Admin 后台用户使用手册

本手册面向 admin 超级管理员，覆盖系统管理 + 业务监督两大职责。

## 工作流程

1. [首次系统初始化](01-initial-setup.md) — 首次部署后必做配置
2. [新增租户](02-add-tenant.md) — 创建租户并分配管理员
3. [业务监督](03-business-overview.md) — 巡视各业务模块数据
4. [权限管理](04-permission-management.md) — 角色/用户/渠道权限
5. [模板与站点配置](05-template-config.md) — 模板样式 + 细粒度配置
6. [系统维护](06-system-maintenance.md) — OSS/三方/系统工具

## admin 职责速查表

7 个粗粒度模块开关，在 `/pages/tenant/detail` 的"功能开关"区块控制：

| 开关 | 说明 | 关联页面 |
|---|---|---|
| sso | SSO 单点登录 | `/pages/third/config-list` |
| points | 积分系统 | `/pages/points/config` |
| quiz | 题库管理 | `/pages/quiz/list` |
| course | 课程管理 | `/pages/course/list` |
| channel | 渠道管理 | `/pages/channel/list` |
| thirdParty | 三方登录 | `/pages/third/config-list` |
| oss | OSS 存储 | `/pages/oss/settings` |

关闭某开关后，对应模块在前端菜单中隐藏，后端 API 拒绝访问。
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认内容完整，标题和表格格式正确。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/index.md
git commit -m "docs(manual): 新增 admin 使用手册 index 导航页"
```

---

### Task 2: 创建 01-initial-setup.md

**Files:**
- Create: `e:\code\docs\manual\admin\01-initial-setup.md`

- [ ] **Step 1: 创建 01-initial-setup.md**

写入以下内容：

```markdown
# 首次系统初始化

部署后首次登录 admin 账号必做的配置流程。

## 步骤

1. 登录后台 → `/pages/login/index`
   - 使用 admin 账号登录，进入控制台

2. 配置 OSS 存储 → `/pages/oss/settings`
   - 填写存储服务商、Bucket、AccessKey、SecretKey
   - 必填，否则媒体上传功能不可用

3. 配置三方登录（可选） → `/pages/third/config-list`
   - 如需微信/QQ 等三方登录，在此配置
   - 跳过不影响核心功能

4. 站点配置 → `/pages/settings/site-config`
   - 顶部作用域选择器选"租户级"
   - 配置站点名称、积分规则、认证模式等

5. 确认功能开关 → `/pages/tenant/detail`
   - 编辑当前租户
   - 在"功能开关"区块开启所需模块（course/points/quiz 等）

## 验证

- 浏览器访问 `http://localhost:1337/api/zhao-common/v1/public/config?domain=localhost`
- 返回 JSON 中包含 `featureFlags`、`theme`、`pointsEnabled` 等字段且值正确
- admin 控制台首页能看到已开启模块的菜单入口
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认步骤 1-5 完整，验证标准可操作。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/01-initial-setup.md
git commit -m "docs(manual): 新增首次系统初始化流程"
```

---

### Task 3: 创建 02-add-tenant.md

**Files:**
- Create: `e:\code\docs\manual\admin\02-add-tenant.md`

- [ ] **Step 1: 创建 02-add-tenant.md**

写入以下内容：

```markdown
# 新增租户

创建新租户并分配渠道管理员的完整流程。

## 步骤

1. 新建租户 → `/pages/tenant/detail`
   - 填写站点名称（siteName）、域名（domain）
   - 域名用于 C 端识别租户（site-resolver 中间件按域名匹配）

2. 关联渠道 → 同页"关联渠道"区块
   - 点击"添加渠道"，选择已有渠道
   - 租户必须关联至少 1 个渠道，否则该租户下无数据可见

3. 配置功能开关 → 同页"功能开关"区块
   - 按租户需求开启模块（course/points/quiz/channel 等）
   - 关闭的模块在该租户的前端菜单中隐藏

4. 配置模板样式 → 同页"模板样式"区块
   - 选择预设模板（coursera-blue/khan-green/udemy-violet/edx-deep/netease-red）
   - 或自定义主题色、tabBar 颜色
   - 不配置则使用默认主题（#667eea）

5. 分配渠道管理员 → `/pages/system/user-roles`
   - 选择目标用户
   - 分配 channel-admin 角色
   - channel-admin 只能管理自己归属渠道关联的租户

## 验证

- 用 channel-admin 账号登录后台
- 控制台顶部租户切换器显示该租户
- 切换到该租户后，能看到关联渠道的数据
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认步骤 1-5 完整，验证标准可操作。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/02-add-tenant.md
git commit -m "docs(manual): 新增新增租户流程"
```

---

### Task 4: 创建 03-business-overview.md

**Files:**
- Create: `e:\code\docs\manual\admin\03-business-overview.md`

- [ ] **Step 1: 创建 03-business-overview.md**

写入以下内容：

```markdown
# 业务监督

admin 巡视各业务模块数据的入口清单。本章节只看数据，不创建内容。

## 步骤

1. 课程巡视 → `/pages/course/list`
   - 查看课程状态分布（草稿/待审核/已发布/已归档）
   - 控制台首页"课程状态"图表也展示此数据

2. 题库巡视 → `/pages/quiz/list`
   - 查看题目总数和类型分布

3. 积分巡视 → `/pages/points/records`
   - 查看积分发放记录
   - 积分统计 → `/pages/points/statistics`
   - 签到记录 → `/pages/points/sign-in-records`

4. 学习数据 → `/pages/study/progress`
   - 查看课程进度概览
   - 课时进度 → `/pages/study/lesson-progress`

5. 渠道网络 → `/pages/channel/network`
   - 查看渠道树形结构（父子渠道关系）

6. 兑换记录 → `/pages/redemption/records`
   - 查看兑换码使用记录

## 验证

- 各列表页能正常加载并显示数据
- 数据量与控制台首页统计卡片一致
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认 6 个入口完整。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/03-business-overview.md
git commit -m "docs(manual): 新增业务监督流程"
```

---

### Task 5: 创建 04-permission-management.md

**Files:**
- Create: `e:\code\docs\manual\admin\04-permission-management.md`

- [ ] **Step 1: 创建 04-permission-management.md**

写入以下内容：

```markdown
# 权限管理

admin 管理角色、用户权限、渠道权限的流程。

## 角色层级

| 角色 | level | 职责范围 |
|---|---|---|
| admin | 100 | 管理一切 |
| channel-admin | 50 | 管理自己归属渠道关联的租户 |
| plugin-manager | 30 | 管理细粒度配置（site-config） |
| student | 10 | C 端学员（不可登录后台） |

层级校验规则：低 level 角色不能管理高 level 角色，同级不能互相管理。

## 步骤

1. 创建自定义角色 → `/pages/system/role-management`
   - 点击"新建角色"
   - 填写角色名、显示名、描述
   - 勾选权限点（从权限树选择）
   - level 默认 50，admin 可调整

2. 分配用户角色 → `/pages/system/user-roles`
   - 选择目标用户
   - 选择角色（admin/channel-admin/自定义角色）
   - 点击"分配"
   - 非 admin 分配时会自动校验：操作者只能分配自己渠道内的成员

3. 查看权限树 → `/pages/system/permissions`
   - 浏览所有权限点定义
   - 用于创建角色时参考可选权限

4. 渠道成员管理 → `/pages/channel/members`
   - 查看渠道下的成员列表
   - 管理成员的渠道归属

5. 查看操作日志 → `/pages/system/role-logs`
   - 审计角色分配、权限变更记录

## 验证

- 新建角色后，在 `/pages/system/role-management` 列表中可见
- 分配角色后，用户登录后台能看到对应权限的菜单
- 操作日志中记录了本次分配操作
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认角色层级表 + 5 个步骤完整。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/04-permission-management.md
git commit -m "docs(manual): 新增权限管理流程"
```

---

### Task 6: 创建 05-template-config.md

**Files:**
- Create: `e:\code\docs\manual\admin\05-template-config.md`

- [ ] **Step 1: 创建 05-template-config.md**

写入以下内容：

```markdown
# 模板与站点配置

admin 管理模板样式和细粒度配置的流程。

## 预设模板

5 套预设模板，在 `/pages/settings/site-template` 管理：

| 模板 | 主题色 | 风格 |
|---|---|---|
| coursera-blue | #0056D2 | 学术蓝（默认） |
| khan-green | #14BF95 | 学院绿 |
| udemy-violet | #A435F0 | 鲜艳紫 |
| edx-deep | #02262B | 深蓝学术 |
| netease-red | #D8232A | 课堂红 |

## 步骤

1. 管理模板 → `/pages/settings/site-template`
   - 查看 5 套预设模板的配色
   - 可编辑模板的 themeConfig（primaryColor/secondaryColor/navStyle/cardStyle/tabBarColor/tabBarActiveColor）

2. 租户级配置 → `/pages/settings/site-config`
   - 顶部作用域选择器选"租户级"
   - 配置对所有渠道生效的字段
   - 关键字段：
     - `pointsEnabled` — 积分总开关
     - `signInPoints` — 每日签到积分
     - `authMode` — 认证模式（local/sso）
     - `paymentEnabled` — 支付开关

3. 渠道级覆盖 → `/pages/settings/site-config`
   - 作用域选择器切"渠道级"
   - 选择目标渠道
   - 只填需要覆盖的字段（如 `signInPoints=20` 覆盖租户级的 10）
   - 后端浅合并：渠道级字段覆盖租户级，未覆盖的字段保持租户级值

4. 租户级模板配置 → `/pages/tenant/detail`
   - 编辑租户
   - 在"模板样式"区块选择预设模板或自定义配色
   - 保存后 C 端立即生效

## 验证

- 切换租户后，C 端访问 `getPublicConfig` 返回的 `theme.primaryColor` 与配置一致
- 渠道级配置在 C 端带 `?channel=<id>` 参数时正确覆盖租户级
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认预设模板表 + 4 个步骤完整。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/05-template-config.md
git commit -m "docs(manual): 新增模板与站点配置流程"
```

---

### Task 7: 创建 06-system-maintenance.md

**Files:**
- Create: `e:\code\docs\manual\admin\06-system-maintenance.md`

- [ ] **Step 1: 创建 06-system-maintenance.md**

写入以下内容：

```markdown
# 系统维护

admin 管理系统基础设施的入口清单。

## 步骤

1. OSS 管理 → `/pages/oss/dashboard`
   - 查看存储用量统计
   - OSS 记录 → `/pages/oss/records`
   - OSS 配置 → `/pages/oss/settings`

2. 媒体资源 → `/pages/media/list`
   - 查看已上传的媒体文件
   - 管理媒体分类

3. 三方用户 → `/pages/third/accounts`
   - 查看三方登录绑定的用户账号

4. 系统配置 → `/pages/system/tools`
   - 系统级参数配置

5. 验证记录 → `/pages/verification/records`
   - 查看验证码/验证记录

## 验证

- OSS dashboard 显示正确的存储用量
- 媒体列表能加载已上传文件
```

- [ ] **Step 2: 验证文件存在**

Read 文件确认 5 个入口完整。

- [ ] **Step 3: Commit**

```bash
cd e:\code
git add docs/manual/admin/06-system-maintenance.md
git commit -m "docs(manual): 新增系统维护流程"
```

---

### Task 8: 最终验证

**Files:**
- Verify: `e:\code\docs\manual\admin\` 目录

- [ ] **Step 1: 验证目录结构**

用 LS 列出 `e:\code\docs\manual\admin\` 目录，确认 7 个文件全部存在：
- index.md
- 01-initial-setup.md
- 02-add-tenant.md
- 03-business-overview.md
- 04-permission-management.md
- 05-template-config.md
- 06-system-maintenance.md

- [ ] **Step 2: 验证 index.md 链接可达**

Read index.md，确认 6 个流程链接的文件名与实际文件一致。

- [ ] **Step 3: 验证页面入口路径**

用 Grep 抽查手册中的 `/pages/xxx` 路径，确认与 `e:\code\web\pages\` 下的实际目录结构匹配。重点检查：
- `/pages/oss/settings` — web/pages/oss/settings.vue 存在
- `/pages/points/statistics` — web/pages/points/statistics.vue 存在
- `/pages/study/progress` — web/pages/study/progress.vue 存在
- `/pages/redemption/records` — web/pages/redemption/records.vue 存在

- [ ] **Step 4: Commit 最终验证（如有修正）**

如果 Step 3 发现路径错误，修正后提交：
```bash
cd e:\code
git add docs/manual/admin/
git commit -m "docs(manual): 修正页面入口路径"
```

如果无修正，跳过此步。

---

## Self-Review 结果

**1. Spec coverage:**
- index.md 导航 + 速查表 → Task 1 ✅
- 首次系统初始化 → Task 2 ✅
- 新增租户 → Task 3 ✅
- 业务监督 → Task 4 ✅
- 权限管理 → Task 5 ✅
- 模板与站点配置 → Task 6 ✅
- 系统维护 → Task 7 ✅
- 统一文件格式（步骤+验证） → 所有 Task 遵循 ✅
- 写作约束（中文/路径格式/无代码/极简） → 所有 Task 遵循 ✅

**2. Placeholder scan:** 无 TBD/TODO，所有步骤包含实际内容。

**3. Type consistency:** 页面入口路径在 index.md 速查表和各流程文件中一致。预设模板名称与 Task 6 中 5 套预设一致。

**4. 路径核查:**
- `/pages/oss/settings` → web/pages/oss/settings.vue ✅
- `/pages/oss/dashboard` → web/pages/oss/dashboard.vue ✅
- `/pages/points/statistics` → web/pages/points/statistics.vue ✅
- `/pages/study/progress` → web/pages/study/progress.vue ✅
- `/pages/redemption/records` → web/pages/redemption/records.vue ✅
- `/pages/channel/network` → web/pages/channel/network.vue ✅
