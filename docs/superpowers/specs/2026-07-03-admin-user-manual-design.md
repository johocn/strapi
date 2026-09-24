# Admin 后台用户使用手册设计

## 概述

为 admin 超级管理员编制后台用户使用手册，覆盖系统管理 + 业务监督两大职责，按工作流程组织，极简操作步骤风格。

## 设计决策

| 维度 | 决策 |
|---|---|
| 受众 | 仅 admin 超级管理员 |
| 范围 | 系统级管理 + 业务监督（巡视数据，不含业务内容创建） |
| 组织方式 | 按工作流程（非按功能模块） |
| 输出形式 | 多文件 + 索引（docs/manual/admin/ 下） |
| 颗粒度 | 极简操作步骤（步骤 + 验证，无原理/FAQ/截图） |
| 语言 | 中文 |

## 文件结构

```
docs/manual/admin/
  index.md                    # 导航 + admin 职责速查表
  01-initial-setup.md         # 首次系统初始化
  02-add-tenant.md            # 新增租户
  03-business-overview.md     # 业务监督
  04-permission-management.md # 权限管理
  05-template-config.md       # 模板与站点配置
  06-system-maintenance.md    # 系统维护
```

## 各文件内容

### index.md — 导航页

- 手册目的（admin 系统管理 + 业务监督）
- 6 个流程链接 + 一句话说明
- admin 职责速查表：7 个粗粒度模块开关（sso/points/quiz/course/channel/thirdParty/oss）对应的页面入口

### 01-initial-setup.md — 首次系统初始化

步骤：
1. 登录 → `/pages/login/index`
2. 配置 OSS → `/pages/oss/settings`（必填，否则媒体上传不可用）
3. 配置三方登录 → `/pages/third/config-list`（可选）
4. 站点配置 → `/pages/settings/site-config`，作用域选"租户级"
5. 确认 featureFlags → `/pages/tenant/detail`，开启 course/points/quiz 等

验证：C 端访问 `getPublicConfig` 返回正确配置

### 02-add-tenant.md — 新增租户

步骤：
1. 新建租户 → `/pages/tenant/detail`，填写 siteName/domain
2. 关联渠道 → 同页"关联渠道"区块，选择已有渠道
3. 配置 featureFlags → 同页"功能开关"区块，开启所需模块
4. 配置模板样式 → 同页"模板样式"区块，选预设或自定义配色
5. 分配渠道管理员 → `/pages/system/user-roles`，给用户分配 channel-admin 角色

验证：用 channel-admin 账号登录，能看到对应租户数据

### 03-business-overview.md — 业务监督

入口清单（只看不创建）：
- 课程巡视 → `/pages/course/list`（查看状态分布）
- 题库巡视 → `/pages/quiz/list`
- 积分巡视 → `/pages/points/records` + `/pages/points/statistics`
- 学习数据 → `/pages/study/progress`
- 渠道网络 → `/pages/channel/network`

每个入口列"看什么指标"，不讲如何创建

### 04-permission-management.md — 权限管理

- 角色管理 → `/pages/system/role-management`（创建自定义角色 + level 层级）
- 用户角色分配 → `/pages/system/user-roles`（assignRole）
- 权限树查看 → `/pages/system/permissions`
- 渠道权限 → `/pages/channel/members`（渠道成员管理）
- 操作日志 → `/pages/system/role-logs`
- 含层级校验规则说明（admin=100 可管理一切，channel-admin=50 只管自己渠道）

### 05-template-config.md — 模板与站点配置

- 模板管理 → `/pages/settings/site-template`（5 套预设：coursera-blue/khan-green/udemy-violet/edx-deep/netease-red）
- 站点配置 → `/pages/settings/site-config`
  - 租户级配置：作用域选"租户级"
  - 渠道级覆盖：作用域选"渠道级" → 选渠道 → 只填覆盖字段
- 细粒度配置字段说明（signInPoints / pointsEnabled / authMode 等）
- 验证：切换租户后 C 端配置正确变化

### 06-system-maintenance.md — 系统维护

- OSS 管理 → `/pages/oss/dashboard`
- 媒体资源 → `/pages/media/list`
- 三方用户 → `/pages/third/accounts`
- 系统配置 → `/pages/system/tools`
- 验证记录 → `/pages/verification/records`

## 统一文件格式

每个流程文件遵循：

```markdown
# 流程名

## 步骤
1. 操作名 → 入口路径
   - 要点
2. 操作名
   - 要点
3. ...

## 验证
- 预期结果
```

## 写作约束

- 语言：中文
- 所有入口路径用 `→ /pages/xxx` 格式
- 不写代码、不写 API 调用
- 每个步骤 1-2 行说明
- 验证标准可操作（"看到 xxx 列表"、"返回 xxx"）
- 无原理说明、无 FAQ、无截图

## 不包含

- channel-admin / plugin-manager 角色的专属操作（admin 手册不覆盖）
- 业务内容创建流程（创建课程/题库/积分产品等）
- 后端 API 文档
- 部署运维指南
