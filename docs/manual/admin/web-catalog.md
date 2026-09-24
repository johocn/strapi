# web 后台页面清单

按业务模块分组，每页注明路径 + 职责。

## 租户管理

- `/pages/tenant/list` — 租户列表
- `/pages/tenant/detail` — 租户详情/编辑（含 channelUsage 开关）

## 课程管理

- `/pages/course/list` — 课程列表
- `/pages/course/form` — 课程编辑
- `/pages/course/detail` — 课程详情
- `/pages/course/category/list` — 分类列表
- `/pages/course/category/form` — 分类编辑
- `/pages/course/lesson/list` — 课时列表
- `/pages/course/lesson/form` — 课时编辑
- `/pages/course/lesson/detail` — 课时详情
- `/pages/course/tag/list` — 课程标签
- `/pages/course/auth/list` — 课程权限

## 题库管理

- `/pages/quiz/list` — 题库列表
- `/pages/quiz/form` — 题目编辑
- `/pages/quiz/exam/list` — 试卷列表
- `/pages/quiz/exam/form` — 试卷编辑
- `/pages/quiz/record/list` — 答题记录
- `/pages/quiz/record/detail` — 记录详情
- `/pages/quiz/batch-upload` — 批量上传

## 积分兑换

- `/pages/points/config` — 积分配置
- `/pages/points/rules` — 积分规则
- `/pages/points/types` — 积分类型
- `/pages/points/statistics` — 积分统计
- `/pages/points/records` — 积分记录
- `/pages/points/sign-in-records` — 签到记录
- `/pages/points/products` — 兑换商品
- `/pages/points/exchanges` — 兑换记录
- `/pages/points/pickup-locations` — 自提点
- `/pages/points/pickup-verify` — 自提核销

## 渠道管理

- `/pages/channel/list` — 渠道列表
- `/pages/channel/detail` — 渠道详情
- `/pages/channel/members` — 成员管理
- `/pages/channel/network` — 渠道网络

## 系统设置

- `/pages/settings/site-config` — 站点配置（含 channelUsage 只读展示）
- `/pages/settings/site-template` — 模板配置
- `/pages/system/user-roles` — 用户角色
- `/pages/system/role-management` — 角色管理
- `/pages/system/permissions` — 权限配置
- `/pages/system/role-logs` — 操作日志
- `/pages/system/tools` — 系统工具（含使用手册入口）
- `/pages/system/profile` — 个人资料

## 其他

- `/pages/dashboard` — 仪表盘
- `/pages/login` — 登录
- `/pages/register` — 注册
- `/pages/auth-callback` — 三方回调
- `/pages/oss/dashboard` — OSS 仪表盘
- `/pages/oss/records` — OSS 记录
- `/pages/oss/settings` — OSS 配置
- `/pages/media/list` — 媒体库
- `/pages/tag/list` — 标签管理
- `/pages/tag/form` — 标签编辑
- `/pages/tag/groups` — 标签分组
- `/pages/tag/knowledge` — 知识点
- `/pages/tag/knowledge-form` — 知识点编辑
- `/pages/tag/presets` — 预设标签
- `/pages/tag/search` — 标签搜索
- `/pages/third/config-list` — 三方配置
- `/pages/third/config-form` — 三方编辑
- `/pages/third/accounts` — 三方账号
- `/pages/third-party/config` — 三方配置（旧）
- `/pages/distribution/invites` — 邀请分销
- `/pages/redemption/codes` — 兑换码
- `/pages/redemption/records` — 兑换记录
- `/pages/study/progress` — 学习进度
- `/pages/study/lesson-progress` — 课时进度
- `/pages/verification/records` — 核销记录
- `/pages/manual/index` — 使用手册首页
- `/pages/manual/viewer` — 文档查看器
- `/pages/manual/search` — 文档搜索
