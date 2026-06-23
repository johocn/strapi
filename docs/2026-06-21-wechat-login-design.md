# 微信登录完善设计文档

## 概述

在现有 zhao-third 插件基础上，完善三种微信登录场景：
1. H5 微信公众号登录（OAuth2.0）
2. 微信小程序登录（wx.login + encryptedData 解密）
3. 微信开放平台扫码登录（内嵌二维码 + 跳转扫码）

多租户支持：以租户（site）为单位配置微信参数，一个租户可关联多个渠道。

## 后端改动

### 1. 新增 wechat-crypto 工具

文件：`plugins/zhao-third/server/src/utils/wechat-crypto.ts`

- 实现 AES-128-CBC 解密算法
- 输入：`session_key`、`encryptedData`、`iv`
- 输出：解密后的用户数据（openId、unionId、昵称、头像、手机号等）
- 遵循微信官方加密数据解密规范：SHA256(session_key) 作 AES key，Base64 解码后 CBC 解密

### 2. 完善 exchangeWechatToken 方法

文件：`plugins/zhao-third/server/src/services/third-party-auth.ts`

#### 小程序场景（mini_program）

- `jscode2session` 获取 `session_key` + `openId`
- 若传入 `encryptedData/iv`，调用 `wechat-crypto` 解密获取 unionId、手机号
- 解密成功后更新返回的 `nickname`、`avatar`、`phoneNumber`

#### 公众号场景（official_account）

- `sns/oauth2/access_token` 获取 `access_token` + `openId`
- 若 scope 为 `snsapi_userinfo`，追加调用 `sns/userinfo` 获取昵称头像
- 返回完整的用户信息

#### 开放平台场景（open_platform）

- `sns/oauth2/access_token` 获取 `access_token` + `openId` + `unionId`
- 与公众号逻辑类似，scope 固定为 `snsapi_login`

### 3. 新增开放平台扫码登录路由

文件：`plugins/zhao-third/server/src/routes/content-api.ts`

新增路由：
```
POST /v1/third/qrconnect-url → third-party-auth.qrconnectUrl
```

Controller 方法 `qrconnectUrl`：
- 接收参数：`redirectUrl`、`siteId`（可选）
- 从数据库读取 `wechat/open_platform` 配置
- 生成内嵌二维码 URL：`https://open.weixin.qq.com/connect/qrconnect?appid=...&redirect_uri=...&response_type=code&scope=snsapi_login&state=...`
- 同时返回跳转授权 URL（供前端选择模式）
- 回调复用现有 `callback` 接口

### 4. 完善 publicConfig 接口

`getPublicConfig` 返回值增加 `authMode` 字段：
```json
{
  "platform": "wechat",
  "appType": "open_platform",
  "appId": "wx...",
  "enabled": true,
  "authMode": "qrconnect"
}
```

`authMode` 取值：
- `redirect`：跳转授权（公众号、开放平台跳转模式）
- `qrconnect`：内嵌二维码（开放平台）

### 5. 多租户支持

已有基础无需额外改动：
- `third-party-config` schema 有 `site` 关联字段
- `findByPlatformAndAppType` 已支持 `siteId` 过滤
- 所有 controller 从 `ctx.state.siteId` 透传

## 前端改动

### 1. 修复 wx-h5-login.ts 参数名

`redirectUri` → `redirectUrl`，与后端 controller 一致。

### 2. 新增 wx-open-platform-login.ts

文件：`utils/wx-open-platform-login.ts`

功能：
- `getQrconnectUrl(redirectUrl)`：调用后端获取内嵌二维码 URL
- `getRedirectAuthUrl(redirectUrl)`：调用后端获取跳转授权 URL
- `handleOpenPlatformCallback(code)`：处理扫码回调，复用 `/third/callback` 接口

### 3. 完善 wx-login.ts

- 小程序登录时传递 `encryptedData/iv` 到后端
- 调用 `wx.getUserProfile` 获取用户信息后，将 `encryptedData/iv` 连同 `code` 一起发送
- 处理后端返回的用户信息

### 4. login.vue 增加 PC 扫码登录

- 检测环境：非微信浏览器 + PC 环境
- 显示内嵌二维码（iframe 嵌入微信二维码页面）
- 备选跳转扫码按钮
- 扫码成功后回调处理

### 5. auth-callback.vue 完善

- 支持 `appType: 'open_platform'` 回调处理
- 根据 state 参数区分不同平台回调

## 数据流

```
H5 公众号:
  前端 → POST /third/auth-url → 微信授权页 → 用户授权 → redirectUrl?code=xxx
  → POST /third/callback(platform=wechat, appType=official_account, code=xxx) → JWT

小程序:
  wx.login → code
  wx.getUserProfile → encryptedData + iv
  → POST /third/callback(platform=wechat, appType=mini_program, code, encryptedData, iv)
  → 后端 jscode2session + AES 解密 → JWT

开放平台(内嵌二维码):
  前端 → POST /third/qrconnect-url → 二维码 URL → iframe 嵌入
  → 用户扫码 → redirectUrl?code=xxx
  → POST /third/callback(platform=wechat, appType=open_platform, code) → JWT

开放平台(跳转扫码):
  前端 → POST /third/auth-url → 跳转微信授权页 → 用户扫码 → redirectUrl?code=xxx
  → POST /third/callback(platform=wechat, appType=open_platform, code) → JWT
```

## 涉及文件清单

### 后端（zhao-third 插件）

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/utils/wechat-crypto.ts` | 新增 | AES 解密工具 |
| `server/src/services/third-party-auth.ts` | 修改 | 完善微信 token 换取 + 解密逻辑 |
| `server/src/controllers/third-party-auth.ts` | 修改 | 新增 qrconnectUrl 方法 |
| `server/src/routes/content-api.ts` | 修改 | 新增 qrconnect-url 路由 |
| `server/src/config.ts` | 修改 | publicConfig 返回 authMode |

### 前端（shao 项目）

| 文件 | 操作 | 说明 |
|------|------|------|
| `utils/wx-h5-login.ts` | 修改 | 修复参数名 redirectUri → redirectUrl |
| `utils/wx-open-platform-login.ts` | 新增 | 开放平台扫码登录工具 |
| `utils/wx-login.ts` | 修改 | 传递 encryptedData/iv |
| `pages/login/login.vue` | 修改 | 增加开放平台扫码登录 UI |
| `pages/auth-callback/auth-callback.vue` | 修改 | 支持开放平台回调 |
| `services/api.ts` | 修改 | 新增开放平台相关 API |
