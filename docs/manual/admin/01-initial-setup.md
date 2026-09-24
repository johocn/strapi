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
