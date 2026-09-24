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
