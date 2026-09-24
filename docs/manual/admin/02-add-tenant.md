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

6. 配置跨渠道开关 → 同页"渠道配置"区块
   - 开关 ON（默认 site_cross_user）：用户可见跨渠道课程/分类，可使用个人渠道数据
   - 开关 OFF（site_only）：仅展示站点渠道数据，跨渠道内容全部屏蔽
   - 该开关优先级高于站点配置页的"跨渠道访问"子开关
   - 详见 [07-channel-usage.md](07-channel-usage.md)

## 验证

- 用 channel-admin 账号登录后台
- 控制台顶部租户切换器显示该租户
- 切换到该租户后，能看到关联渠道的数据
- 跨渠道开关状态与配置一致
