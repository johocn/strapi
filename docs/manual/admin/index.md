# Admin 后台用户使用手册

本手册面向 admin 超级管理员，覆盖系统管理 + 业务监督两大职责。

## 工作流程

1. [首次系统初始化](01-initial-setup.md) — 首次部署后必做配置
2. [新增租户](02-add-tenant.md) — 创建租户并分配管理员（含跨渠道开关）
3. [业务监督](03-business-overview.md) — 巡视各业务模块数据
4. [权限管理](04-permission-management.md) — 角色/用户/渠道权限
5. [模板与站点配置](05-template-config.md) — 模板样式 + 细粒度配置
6. [跨渠道开关配置](07-channel-usage.md) — channelUsage 三档语义与联动
7. [系统维护](06-system-maintenance.md) — OSS/三方/系统工具

## web 目录速查

见 [web 目录全量页面清单](web-catalog.md)

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
