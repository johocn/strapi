# 注册与登录

## 注册

- 入口：`/pages/register/register`
- 必填：手机号、密码、确认密码
- 可选：邀请码（渠道邀请码决定用户归属渠道）
- 协议：勾选用户协议

## 登录

- 入口：`/pages/login/login`
- 本地登录：手机号 + 密码 / 验证码
- 三方登录：微信/支付宝/抖音（由后台开关控制可见性）

## 忘记密码

- 入口：`/pages/forgot-password/forgot-password`
- 通过手机验证码重置

## 三方登录回调

- 入口：`/pages/auth-callback/auth-callback`
- 三方授权后自动跳转

## 渠道归属

- 注册时填写的邀请码决定用户渠道归属
- 登录后访问的课程/商品按渠道权限过滤
