# 跨境官网系统后台管理手册

## 目录
- [Ch1 系统概述](#ch1-系统概述)
- [Ch2 角色与权限](#ch2-角色与权限)

---

## Ch1 系统概述

### 1.1 平台定位

本系统基于 **Strapi v5** 构建的多租户官网运营平台，面向跨境业务场景，集成内容运营、课程学习、题库考试、积分营销、物流询价、理财展示等能力，通过统一的中心化架构为多个租户站点提供完整的后台管理能力。

**核心特性**：

- 多租户隔离：渠道（channel）→ 站点（site）→ 内容类型（CT）三层模型
- 中心化架构：11 个业务中心独立运营、权限解耦
- 灵活角色：5 系统角色 + 22 中心角色，覆盖运营、编辑、讲师等场景
- 多端发布：官网、直播工作室、多平台分发一体化

### 1.2 11 中心架构

系统按业务域划分为 11 个中心，每个中心对应独立菜单与权限树：

```
                          ┌──────────────────────────┐
                          │      跨境官网系统          │
                          │   (Strapi v5 后台)        │
                          └────────────┬─────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌──────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │ course  │   │  study    │  │   quiz     │  │  point    │  │ marketing │
   │ center  │   │  center   │  │   center   │  │  center   │  │  center   │
   │ 课程中心 │   │ 学习数据  │  │  题库系统  │  │  积分体系  │  │ 营销运营  │
   └────┬────┘   └─────┬─────┘  └──────┬─────┘  └─────┬─────┘  └─────┬─────┘
        │              │               │               │              │
        └──────────────┴───────┬───────┴───────────────┘              │
                               │                                      │
        ┌──────────────┬───────┴────────┬───────────────┬─────────────┘
        │              │                │               │
   ┌────▼────┐   ┌─────▼─────┐   ┌──────▼─────┐  ┌─────▼─────┐
   │ system  │   │   tag     │   │  studio    │  │  website  │
   │ center  │   │  center   │  │   center   │  │  center   │
   │系统工具 │   │ 标签体系  │  │ 直播工作室 │  │ 官网中心  │
   └────┬────┘   └─────┬─────┘   └──────┬─────┘  └─────┬─────┘
        │              │                │               │
        └──────────────┴───────┬────────┴───────────────┘
                               │
                        ┌──────▼──────┐     ┌─────────────┐
                        │ logistics   │     │   wealth    │
                        │  center     │     │   center    │
                        │ 物流中心    │     │  理财中心   │
                        └─────────────┘     └─────────────┘
```

| 中心 key | 中文名 | 主要职责 |
|---|---|---|
| `course-center` | 课程中心 | 课程、课时、分类、用户授权 |
| `study-center` | 学习数据 | 课程进度、课时进度 |
| `quiz-center` | 题库系统 | 题目、考试、答题记录、批量考试 |
| `point-center` | 积分体系 | 积分类型、规则、产品、兑换、自提点、签到 |
| `marketing-center` | 营销运营 | 渠道、网络、成员、邀请、兑换码 |
| `system-center` | 系统工具 | 媒体、回收站、功能开关、站点配置、用户角色、OSS、三方、SSO、租户、模板 |
| `tag-center` | 标签体系 | 标签、分组、知识点、标签索引 |
| `studio-center` | 直播工作室 | 工作室、内容采集、多平台发布、数据分析、广告位 |
| `website-center` | 官网中心 | SEO、品牌、文章、产品、案例、合规、FAQ、教程、下载、线索、知识实体/关系、AI 摘要、第一真值 |
| `logistics-center` | 物流中心 | 询价、货物追踪、联系渠道、客户评价、通知订阅、落地页、转化漏斗、意向订单、推荐奖励、客户档案 |
| `wealth-center` | 理财中心 | 产品、公司、数据采集、风险指标、推荐配置、年报、年化收益 |

### 1.3 多租户模型

系统采用 **channel → site → CT** 三层隔离模型：

```
channel（渠道）
   │  顶层业务隔离单元，对应一个业务主体
   │
   ├── site（站点）
   │      官网/落地站点的独立单元，拥有独立域名与品牌配置
   │
   │   └── CT（Content Type，内容类型）
   │           站点内的具体内容实体（文章、产品、案例等）
   │
   └── site ...
```

**隔离规则**：

- **channel**：业务主体边界，渠道间数据完全隔离
- **site**：站点级隔离，站点间内容、配置、标签独立
- **CT**：内容类型粒度，由各中心管理（如官网中心的文章、产品、案例）
- **公共标签**（`isPublic=true` 且 `site=null`）由 admin 创建，所有站点共享；站点标签仅本站可见

### 1.4 快速入门

**标准操作流程**：

1. **登录后台**：访问 Strapi 管理后台，使用管理员分配的账号登录
2. **选择站点**：在站点切换器选择当前操作的站点（数据按站点隔离）
3. **导航到中心**：左侧菜单选择目标中心（如「官网中心」）
4. **操作 CT**：在中心内选择内容类型，执行查看/新增/编辑/删除等操作

**权限提示**：

- 不同角色可见的中心与按钮不同，详见 [Ch2 角色与权限](#ch2-角色与权限)
- 缺失某菜单或按钮时，联系 admin 或 channel-admin 调整角色分配

---

## Ch2 角色与权限

### 2.1 角色总览

系统共定义 **27 个角色**，分为两类：

- **5 系统角色**：跨中心的全局角色
- **22 中心角色**：11 中心 × {manager, editor} 两套角色

### 2.2 系统角色（5 个）

| 角色 key | 中文名 | 权限范围 |
|---|---|---|
| `admin` | 系统管理员 | 全部 11 中心的全部权限，含 system-center；可分配任意角色 |
| `channel-admin` | 渠道管理员 | 排除 system-center 主体权限，但保留 tenant/site-config/feature-flag/user-roles/SSO 扩展；其余 10 中心全权；可分配角色 |
| `plugin-manager` | 插件管理员 | course/quiz/point/tag/studio 5 中心全权 + website/logistics/wealth 编辑（read/create/update，不含 delete/manage） |
| `instructor` | 讲师 | 跨中心只读：课程/学习/标签部分可写，官网/物流/理财/工作室只读 |
| `user` | 普通用户 | 无后台权限（前台用户） |

### 2.3 中心角色（22 个）

每个中心提供 manager（管理员）与 editor（编辑）两个角色：

| 角色 key | 中文名 | 权限范围 |
|---|---|---|
| `course-manager` | 课程管理员 | 课程中心全部权限（含 delete） |
| `course-editor` | 课程编辑 | 课程中心 read/create/update（不含 delete/manage） |
| `study-manager` | 学习数据管理员 | 学习数据中心全部权限 |
| `study-editor` | 学习数据编辑 | 学习数据中心 read/create/update |
| `quiz-manager` | 题库管理员 | 题库系统中心全部权限 |
| `quiz-editor` | 题库编辑 | 题库系统中心 read/create/update |
| `point-manager` | 积分管理员 | 积分体系中心全部权限 |
| `point-editor` | 积分编辑 | 积分体系中心 read/create/update |
| `marketing-manager` | 营销管理员 | 营销运营中心全部权限 |
| `marketing-editor` | 营销编辑 | 营销运营中心 read/create/update |
| `system-manager` | 系统管理员(中心) | 系统工具中心全部权限 |
| `system-editor` | 系统编辑 | 系统工具中心 read/create/update |
| `tag-manager` | 标签管理员 | 标签体系中心全部权限 |
| `tag-editor` | 标签编辑 | 标签体系中心 read/create/update |
| `studio-manager` | 工作室管理员 | 直播工作室中心全部权限 |
| `studio-editor` | 工作室编辑 | 直播工作室中心 read/create/update |
| `website-manager` | 官网管理员 | 官网中心全部权限 |
| `website-editor` | 官网编辑 | 官网中心 read/create/update |
| `logistics-manager` | 物流管理员 | 物流中心全部权限 |
| `logistics-editor` | 物流编辑 | 物流中心 read/create/update |
| `wealth-manager` | 理财管理员 | 理财中心全部权限 |
| `wealth-editor` | 理财编辑 | 理财中心 read/create/update |

> **manager vs editor 区别**：manager 拥有 `.delete` 与 `.manage` 权限；editor 仅 read/create/update，无法删除或执行管理类操作。

### 2.4 权限矩阵

角色 × 中心权限范围对照：

| 角色 | course | study | quiz | point | marketing | system | tag | studio | website | logistics | wealth | 角色分配 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `admin` | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 | ✅ |
| `channel-admin` | 全部 | 全部 | 全部 | 全部 | 全部 | ⚠️部分 | 全部 | 全部 | 全部 | 全部 | 全部 | ✅ |
| `plugin-manager` | 全部 | — | 全部 | 全部 | — | — | 全部 | 全部 | 编辑 | 编辑 | 编辑 | ❌ |
| `instructor` | 读写 | 读写 | — | 只读* | — | — | 读写 | 只读 | 只读 | 只读 | 只读 | ❌ |
| `{center}-manager` | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | 本中心全权 | ❌ |
| `{center}-editor` | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | 本中心编辑 | ❌ |

**图例说明**：

- **全部**：该中心全部权限（read/create/update/delete/manage）
- **编辑**：read/create/update（不含 delete/manage）
- **读写**：read/create/update（instructor 在课程/学习/标签中心有部分写权限）
- **只读**：仅 read
- **⚠️部分**：channel-admin 在 system-center 主体被排除，但保留 tenant、site-config、feature-flag、user-roles、SSO 扩展、media-meta 等子项权限
- **只读\***：instructor 在 point 中心仅有 rule-template/sign-in-record 的只读权限
- **—**：无该中心权限
- **本中心全权 / 本中心编辑**：仅对该角色所属中心生效，其他中心无权限

### 2.5 角色分配操作

**可分配角色**：仅 `admin` 与 `channel-admin` 拥有角色分配权限（`role.assign` / `role.revoke`）。

**操作步骤**：

1. 登录后台，导航至 **系统工具 → 用户角色**
2. 在用户列表中查找目标用户，点击「分配角色」
3. 选择目标角色：
   - 系统角色：admin / channel-admin / plugin-manager / instructor / user
   - 中心角色：选择对应中心的 manager 或 editor
4. 确认分配，系统记录角色日志（可通过「操作日志」查看）
5. 用户重新登录后，权限生效

**注意事项**：

- admin 可分配任意角色，包括其他 admin
- channel-admin 可分配中心角色与 instructor/user，但不可分配 admin 或 channel-admin
- 角色变更记录可通过 `role.read-logs` 权限查看
- 撤销角色使用「撤销角色」操作（`role.revoke`）
