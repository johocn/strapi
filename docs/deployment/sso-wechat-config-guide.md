# zhao-sso 微信登录配置手册

本手册指导您完成 zhao-sso 微信登录的完整配置,包括微信公众号准备、sso 后台配置、应用接入、Nginx 配置、前端接入、非微信环境降级登录和验证流程。

## 目录

1. [架构概览](#1-架构概览)
2. [微信公众号准备](#2-微信公众号准备)
3. [sso 配置录入](#3-sso-配置录入)
4. [sso-app 接入](#4-sso-app-接入)
5. [Nginx 配置](#5-nginx-配置)
6. [前端接入](#6-前端接入)
7. [非微信环境降级登录](#7-非微信环境降级登录)
8. [验证流程](#8-验证流程)
9. [故障排查](#9-故障排查)
10. [应用配置端配置案例](#10-应用配置端配置案例)

---

## 1. 架构概览

### 1.1 与 c 端 zhao-third 的区分

| 维度 | c 端 (zhao-third) | sso 端 (zhao-sso) |
|---|---|---|
| 入口路由 | `/api/zhao-third/v1/wechat/callback` | `/api/zhao-sso/v1/auth/wechat` |
| 配置表 | `third_party_configs` | `sso_oauth_configs` |
| 公众号 appId | wx17d58d73062d1899 | **独立的另一个公众号 appId** |
| 用户体系 | users-permissions.user | sso-user |
| 回调产物 | 直接签发 JWT | 生成 authCode,应用方再换 token |

### 1.2 授权形态

| 场景 | appType | scope | 授权方式 |
|---|---|---|---|
| 微信浏览器内(h.joho.cn 移动端) | official_account | snsapi_userinfo / snsapi_base | 公众号网页授权 |
| PC 浏览器(Vendure 等) | open_platform | snsapi_login | 开放平台扫码 |
| 小程序 | mini_program | — | uni.login + jscode2session |
| APP | app | snsapi_userinfo | uni.login + oauth2 |
| **非微信浏览器(降级)** | — | — | **账号密码 → /v1/auth/password-authorize** |

### 1.3 邀请码/渠道码流转

| 参数 | 指向域名 | sso 侧处理 | 应用方处理 |
|---|---|---|---|
| invite_code | v.joho.cn | 建立 sso-user 分销 | 应用方也建立分销 |
| channel_code | h.joho.cn | 建立 sso-user 分销 | 应用方也建立分销 |

两类邀请码在所有登录流程中(密码登录、微信网页授权、小程序登录、APP 登录、降级登录)均会被透传到 sso 的 channel-sync 服务,建立 sso-user 分销关系,与 zhao-auth 解耦。

---

## 2. 微信公众号准备

### 2.1 申请认证服务号

sso 微信登录需要**独立的微信公众号**(与 c 端 zhao-third 用的公众号不同),且必须是**认证服务号**(订阅号无网页授权权限)。

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 注册新的服务号(或复用已有认证服务号)
3. 完成微信认证(300 元/年)

### 2.2 获取 AppID 和 AppSecret

1. 进入「开发 → 基本配置」
2. 记录 **AppID**(开发者ID)
3. 点击「重置」获取 **AppSecret**(开发者密码),妥善保存

### 2.3 配置 JS 接口安全域名

> JSSDK 签名必需,用于 h.joho.cn 移动端分享等功能。

1. 进入「设置与开发 → 公众号设置 → 功能设置」
2. 点击「JS接口安全域名」的「设置」
3. 填写: `h.joho.cn`(不加 http://)
4. 按提示下载 `MP_verify_xxx.txt` 上传到 h.joho.cn 根目录

### 2.4 配置网页授权域名

> 公众号网页授权必需,用于微信内登录。

1. 进入「设置与开发 → 公众号设置 → 功能设置」
2. 点击「网页授权域名」的「设置」
3. 填写: `h.joho.cn`(sso 中转回调所在域名)
4. 上传同样的校验文件

### 2.5 配置 IP 白名单

> 获取 access_token 必需,不配会报 invalid appid。

1. 进入「开发 → 基本配置」
2. 找到「IP白名单」点击「修改」
3. 添加服务器公网 IP(多个用换行分隔)
4. 查看服务器公网 IP: `curl ifconfig.me`

### 2.6 (可选)开放平台配置

如果需要 PC 扫码登录,还需在[微信开放平台](https://open.weixin.qq.com/)创建网站应用,获取开放平台 AppID/AppSecret,并绑定公众号(unionId 打通)。

---

## 3. sso 配置录入

### 3.1 录入微信公众号配置

1. 登录 h.joho.cn 后台
2. 进入「SSO → 三方绑定」页面
3. 点击右上角「**配置微信登录**」按钮
4. 在 OAuth 配置编辑页填写:

| 字段 | 值 |
|---|---|
| 配置名称* | h.joho.cn 微信公众号 |
| 平台* | wechat |
| 应用类型* | official_account |
| AppID* | (2.2 获取的 AppID) |
| AppSecret* | (2.2 获取的 AppSecret) |
| 是否启用 | 开 |
| Token | (2.2 的消息校验 Token,可选) |
| EncodingAESKey | (2.2 的消息加解密密钥,可选) |
| OAuth Scope* | ☑ snsapi_userinfo ☑ snsapi_base |
| redirect_uris | `http://h.joho.cn/api/zhao-sso/v1/auth/wechat/callback` |

5. 点击保存

### 3.2 录入开放平台配置(可选,PC 扫码用)

重复 3.1,应用类型选 `open_platform`,AppID/AppSecret 用开放平台的。

### 3.3 也可在 Strapi admin 录入

- 访问 `http://h.joho.cn/admin`
- 进入「SSO 统一登录 → OAuth配置」Tab
- 点击「新建」填写配置(简化表单,extra_config 用 JSON 文本框)

---

## 4. sso-app 接入

每个接入 sso 的业务方都需要在 sso 注册为应用。

### 4.1 录入 h.joho.cn 应用

1. 进入「SSO → 应用管理」
2. 点击「新建」
3. 填写:

| 字段 | 值 |
|---|---|
| app_code | admin |
| app_name | 后台管理 |
| app_secret | (自动生成或自定义) |
| redirect_uris | `http://h.joho.cn/#/pages/login/callback` |
| allowed_grant_types | authorization_code, refresh_token |
| is_active | 开 |

### 4.2 录入其他应用

为 v.joho.cn / Vendure 等业务方分别录入应用,记录各自的 app_code 和 app_secret。

---

## 5. Nginx 配置

### 5.1 h.joho.cn 配置

确保 h.joho.cn 的 nginx 配置透传代理头(参考 `d:\zhao\strapi\docs\deployment\nginx-h-joho-cn.conf`):

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:1337/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    client_max_body_size 100m;
}
```

**关键**: `X-Forwarded-Host` 和 `X-Forwarded-Proto` 必须设置,否则 sso 中转回调 302 重定向 URL 会变成 localhost。

### 5.2 重载 nginx

```bash
nginx -t && nginx -s reload
```

### 5.3 验证代理头

```bash
curl -I -H "Host: h.joho.cn" "http://127.0.0.1/api/zhao-sso/v1/auth/wechat/callback?code=test&state=xxx"
# 应返回 302,Location 指向 h.joho.cn 而非 localhost
```

---

## 6. 前端接入

### 6.1 使用 wx-sso-login 组件(strapi-backend)

wx-sso-login 组件位于 `strapi-backend/components/wx-sso-login/wx-sso-login.vue`,自动适配四种环境:

- **H5 微信浏览器**: 根据 oauthScopes 动态渲染"快速登录"(snsapi_base)和"完善资料登录"(snsapi_userinfo)按钮
- **H5 非微信浏览器**: 自动降级为账号密码登录表单(详见第 7 章)
- **小程序**: 渲染"微信登录"按钮,调用 uni.login + jscode2session
- **APP**: 渲染"微信登录"按钮,调用 uni.login + oauth2

#### 6.1.1 Props 完整说明

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| appCode | String | (必填) | sso-app 的 app_code |
| redirectUri | String | '' | OAuth 回调地址,必须与 sso-app 的 redirect_uris 白名单匹配 |
| inviteCode | String | '' | 邀请码(来自 v.joho.cn),透传到 sso 建立分销 |
| channelCode | String | '' | 渠道码(来自 h.joho.cn),透传到 sso 建立分销 |
| fallbackMode | String | 'code' | 降级模式: 'code'=OAuth 授权码模式(跳转 redirect_uri?code=xxx); 'token'=直接换 token(emit success) |
| fallbackEnabled | Boolean | true | 是否启用非微信环境降级表单;false 时非微信环境仍显示"微信扫码登录"按钮 |

#### 6.1.2 Events

| 事件 | 参数 | 触发时机 |
|---|---|---|
| success | { access_token, refresh_token, user } | token 模式(fallbackMode='token')降级登录成功,或小程序/APP 登录成功 |
| error | Error | 登录失败 |
| redirect | url: string | 即将跳转(微信授权页或 redirect_uri?code=xxx) |

#### 6.1.3 基本用法

```vue
<template>
  <view>
    <WxSsoLogin
      app-code="admin"
      redirect-uri="http://h.joho.cn/#/pages/login/callback"
      :invite-code="inviteCode"
      :channel-code="channelCode"
      fallback-mode="code"
      :fallback-enabled="true"
      @success="onLoginSuccess"
      @error="onLoginError"
      @redirect="onRedirect"
    />
  </view>
</template>

<script setup>
import WxSsoLogin from '@/components/wx-sso-login/wx-sso-login.vue'

const inviteCode = ''  // 从 URL 参数获取
const channelCode = '' // 从 URL 参数获取

function onLoginSuccess({ access_token, refresh_token, user }) {
  // 存储 token
  uni.setStorageSync('sso_access_token', access_token)
  uni.setStorageSync('sso_refresh_token', refresh_token)
  // 跳转首页
  uni.switchTab({ url: '/pages/index/index' })
}

function onLoginError(err) {
  uni.showToast({ title: '登录失败', icon: 'none' })
}

function onRedirect(url) {
  console.log('跳转授权:', url)
}
</script>
```

### 6.2 处理 OAuth 回调(H5/PC 场景)

在 redirect-uri 指定的回调页(如 `/pages/login/callback`)处理。strapi-backend 已内置 `pages/login/callback.vue`,可直接使用或参考实现:

```vue
<script setup>
import { onLoad } from '@dcloudio/uni-app'
import { publicPost } from '@/utils/request.js'

onLoad(async (options) => {
  const { code, state, error } = options

  if (error) {
    uni.showToast({ title: decodeURIComponent(error), icon: 'none' })
    return
  }

  if (code) {
    // 用 authCode 换 token
    const result = await publicPost('/zhao-sso/v1/auth/token', {
      grant_type: 'authorization_code',
      code,
      app_code: 'admin',
      app_secret: '你的app_secret',
      redirect_uri: 'http://h.joho.cn/#/pages/login/callback',
    })
    uni.setStorageSync('sso_access_token', result.access_token)
    uni.setStorageSync('sso_refresh_token', result.refresh_token)
    uni.switchTab({ url: '/pages/index/index' })
  }
})
</script>
```

> **重要**: 调用 `/v1/auth/token`、`/v1/auth/password-authorize`、`/v1/auth/login` 等**公开认证接口**时,必须使用 `publicPost`/`publicGet`(来自 `utils/request.js`),**不要**使用普通的 `post`/`get`。
>
> 原因: 普通的 `post` 在收到 401 时会触发 token 刷新/登出重定向逻辑,而密码错误时后端返回的 401 不是"token 过期",会误导致用户被登出。`publicPost` 不走 401 刷新逻辑,直接抛出错误给业务层处理。

### 6.3 后续 API 请求带 token

```javascript
// 在 request 封装中注入
const token = uni.getStorageSync('sso_access_token')
if (token) {
  header['Authorization'] = `Bearer ${token}`
}
```

### 6.4 SSO_BASE_URL 配置

wx-sso-login 组件的 SSO_BASE_URL 按以下优先级解析:

1. `import.meta.env.VITE_SSO_BASE_URL`(可在 .env 文件配置)
2. `window.location.origin + '/api/zhao-sso/v1'`(默认行为,适配同源部署)
3. 兜底 `'http://h.joho.cn/api/zhao-sso/v1'`

如需指向其他环境,在 `.env` 文件中设置:
```
VITE_SSO_BASE_URL=https://your-sso-domain/api/zhao-sso/v1
```

---

## 7. 非微信环境降级登录

### 7.1 设计目标

PC 浏览器、手机非微信浏览器(如 Safari、Chrome)中无法使用微信公众号网页授权。wx-sso-login 组件通过 `fallbackEnabled` prop 自动降级为账号密码登录,保证非微信环境也能完成 SSO 登录,且邀请码/渠道码仍正确透传到分销链路。

### 7.2 两种降级模式

| 模式 | fallbackMode | 流程 | 适用场景 |
|---|---|---|---|
| Code 模式(默认) | `'code'` | 调 `/v1/auth/password-authorize` 拿 code → 跳转 `redirect_uri?code=xxx` → 回调页用 code 换 token | 与微信 OAuth 流程一致,适合需要统一回调处理的场景 |
| Token 模式 | `'token'` | 调 `/v1/auth/login` 直接拿 access_token + refresh_token → emit success | 简单直接,适合 SPA 不需要跳转的场景 |

### 7.3 Code 模式数据流

```
[用户输入账号密码]
       ↓
[POST /v1/auth/password-authorize]
  Body: { app_code, identifier, password, redirect_uri, invite_code?, channel_code?, scopes? }
       ↓
[sso-auth.login 校验密码 + syncChannelInvite 建立分销]
       ↓
[sso-oauth.generateAuthCode 生成 code 并持久化 invite_code 到 sso_auth_codes 表]
       ↓
[返回 { code, redirect_uri, state }]
       ↓
[前端跳转 redirect_uri?code=xxx&state=xxx]
       ↓
[回调页用 code 调 /v1/auth/token 换 access_token + refresh_token]
```

### 7.4 Token 模式数据流

```
[用户输入账号密码]
       ↓
[POST /v1/auth/login]
  Body: { type:'password', app_code, identifier, password, invite_code?, channel_code? }
       ↓
[sso-auth.login 校验密码 + syncChannelInvite 建立分销]
       ↓
[sso-jwt.signTokenPair 签发 access_token + refresh_token]
       ↓
[返回 { access_token, refresh_token, expires_in, token_type, user }]
       ↓
[前端 emit success,业务方自行存储 token 并跳转]
```

### 7.5 password-authorize 接口详解

**路径**: `POST /api/zhao-sso/v1/auth/password-authorize`
**认证**: 无需认证(公开接口)
**作用**: 用账号密码换取 OAuth 授权码,与微信 OAuth 流程统一

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| app_code | string | 是 | sso-app 应用代码 |
| identifier | string | 是 | 用户名 / 邮箱 / 手机号 |
| password | string | 是 | 密码 |
| redirect_uri | string | 是 | 回调地址,必须在 sso-app 的 redirect_uris 白名单中 |
| state | string | 否 | 透传参数,原样返回 |
| invite_code | string | 否 | 邀请码(v.joho.cn),建立分销关系 |
| channel_code | string | 否 | 渠道码(h.joho.cn),建立分销关系 |
| scopes | string[] | 否 | 申请的 OAuth scopes |

**成功响应** (HTTP 200):
```json
{
  "code": "uuid-uuid",
  "redirect_uri": "http://h.joho.cn/#/pages/login/callback",
  "state": ""
}
```

**错误响应**:

| HTTP | code | 说明 |
|---|---|---|
| 400 | — | app_code/identifier/password/redirect_uri 必填 |
| 400 | SSO_OAUTH_002 | redirect_uri 不在允许列表中 |
| 401 | SSO_AUTH_003 | 用户名/邮箱/手机号或密码错误 |
| 404 | SSO_OAUTH_001 | 应用不存在或已禁用 |

### 7.6 前端示例

#### Code 模式(默认)
```vue
<WxSsoLogin
  app-code="admin"
  redirect-uri="http://h.joho.cn/#/pages/login/callback"
  :invite-code="inviteCode"
  :channel-code="channelCode"
  fallback-mode="code"
  :fallback-enabled="true"
  @redirect="onRedirect"
/>
```

#### Token 模式
```vue
<WxSsoLogin
  app-code="admin"
  :invite-code="inviteCode"
  :channel-code="channelCode"
  fallback-mode="token"
  :fallback-enabled="true"
  @success="onLoginSuccess"
  @error="onLoginError"
/>
```

### 7.7 测试页

strapi-backend 内置测试页 `pages/sso/test-fallback.vue`,访问 `http://localhost:5173/#/pages/sso/test-fallback` 可验证降级登录功能,页面会显示事件日志,便于调试。

---

## 8. 验证流程

### 8.1 验证 h.joho.cn 微信内登录

1. 在手机微信中打开 `http://h.joho.cn/#/pages/login/login`
2. 应看到「快速登录」和「完善资料登录」按钮
3. 点击「完善资料登录」
4. 弹出微信授权框 → 点击允许
5. 跳转回 h.joho.cn,登录成功

### 8.2 验证 PC 扫码登录

1. 在 PC 浏览器打开接入方页面(如 Vendure 登录页)
2. 点击「微信扫码登录」
3. 跳转显示二维码
4. 用微信扫码 → 确认登录
5. 跳回接入方,登录成功

### 8.3 验证小程序登录

1. 在微信小程序中打开接入方
2. 点击「微信登录」
3. uni.login 拉起微信授权
4. 登录成功,拿到 token

### 8.4 验证非微信环境降级登录

1. 在 PC Chrome / Safari / Edge 等非微信浏览器中打开使用 wx-sso-login 的页面
2. 应自动看到「账号登录」表单(用户名 + 密码 + 登录按钮),不显示微信扫码按钮
3. 输入正确账号密码 → 点击「登录」
   - Code 模式: 浏览器跳转到 `redirect_uri?code=xxx&state=`,回调页用 code 换 token
   - Token 模式: 触发 success 事件,事件参数含 access_token / refresh_token
4. 输入错误密码 → 显示错误 toast「用户名/邮箱/手机号或密码错误」,不跳转

### 8.5 验证 JSSDK 签名

```bash
curl -X POST "http://h.joho.cn/api/zhao-sso/v1/auth/jssdk-signature" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://h.joho.cn/","appType":"official_account"}'
```

应返回:
```json
{
  "appId": "wx...",
  "timestamp": "1784895243",
  "nonceStr": "xxx",
  "signature": "sha1签名"
}
```

### 8.6 接口端到端验证(curl)

```bash
# 1. 健康检查
curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/_health
# 预期: 204

# 2. password-authorize 拿 code(含邀请码透传)
curl -s -X POST http://localhost:1337/api/zhao-sso/v1/auth/password-authorize \
  -H "Content-Type: application/json" \
  -d '{"app_code":"admin","identifier":"admin","password":"Admin@12345","redirect_uri":"http://h.joho.cn/#/pages/login/callback","invite_code":"TEST001","channel_code":"CH001"}'
# 预期: 返回 {code, redirect_uri, state}

# 3. 用 code 换 token
curl -s -X POST http://localhost:1337/api/zhao-sso/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"authorization_code","code":"<上一步的code>","app_code":"admin","app_secret":"<你的app_secret>","redirect_uri":"http://h.joho.cn/#/pages/login/callback"}'
# 预期: 返回 {access_token, refresh_token, expires_in, token_type}

# 4. 错误密码返回 401
curl -s -X POST http://localhost:1337/api/zhao-sso/v1/auth/password-authorize \
  -H "Content-Type: application/json" \
  -d '{"app_code":"admin","identifier":"admin","password":"wrong","redirect_uri":"http://h.joho.cn/#/pages/login/callback"}'
# 预期: HTTP 401, {"error":"...","code":"SSO_AUTH_003"}

# 5. redirect_uri 白名单校验
curl -s -X POST http://localhost:1337/api/zhao-sso/v1/auth/password-authorize \
  -H "Content-Type: application/json" \
  -d '{"app_code":"admin","identifier":"admin","password":"Admin@12345","redirect_uri":"http://evil.com/callback"}'
# 预期: HTTP 400, {"error":"redirect_uri 不在允许列表中","code":"SSO_OAUTH_002"}
```

> **PowerShell 用户注意**: 在 PowerShell 中调用 `curl.exe` 传递 JSON body 时,由于 PowerShell 5.x 会剥离双引号,建议使用 `--%` 停止解析符号:
> ```powershell
> curl.exe --% -s -X POST http://localhost:1337/api/zhao-sso/v1/auth/password-authorize -H "Content-Type: application/json" -d "{\"app_code\":\"admin\",\"identifier\":\"admin\",\"password\":\"Admin@12345\",\"redirect_uri\":\"http://h.joho.cn/#/pages/login/callback\"}"
> ```
> 或将 JSON 写入临时文件用 `-d "@body.json"` 调用。

---

## 9. 故障排查

### 9.1 invalid appid

**原因**: AppID 错误或 IP 白名单未配置

**排查**:
1. 检查 sso 配置中 AppID 是否与公众号后台一致(注意去除前后空格)
2. 检查公众号后台「IP白名单」是否包含服务器公网 IP
3. 服务器执行 `curl ifconfig.me` 确认公网 IP

### 9.2 redirect_uri 参数错误

**原因**: 网页授权域名未配置或不匹配

**排查**:
1. 检查公众号后台「网页授权域名」是否配置为 `h.joho.cn`
2. 检查 sso 中转回调 URL 是否为 `http://h.joho.cn/api/zhao-sso/v1/auth/wechat/callback`

### 9.3 重定向到 localhost

**原因**: Nginx 未透传 X-Forwarded-Host

**排查**:
1. 检查 nginx 配置 `location /api/` 块是否有 `proxy_set_header X-Forwarded-Host $host;`
2. 执行 `curl -I -H "Host: h.joho.cn" "http://127.0.0.1/api/zhao-sso/v1/auth/wechat/callback?code=test&state=xxx"` 验证

### 9.4 JSSDK 签名失败

**原因**: JS接口安全域名未配置或 url 参数错误

**排查**:
1. 检查公众号后台「JS接口安全域名」是否配置为 `h.joho.cn`
2. 检查前端调用签名接口时,url 参数是否为当前页面 URL(不含 # 后部分)
3. 检查 access_token/jsapi_ticket 是否获取成功(看 strapi 日志)

### 9.5 scope 不在配置列表

**原因**: 前端传入的 scope 未在 sso 配置的 oauthScopes 中

**排查**:
1. 进入 sso OAuth 配置编辑页,确认 OAuth Scope 多选了对应选项
2. 调 `GET /api/zhao-sso/v1/auth/wechat/config?appType=official_account` 确认返回的 oauthScopes

### 9.6 微信内不弹授权框

**原因**: 用户已关注公众号(snsapi_userinfo 静默授权)

**排查**:
1. 取消关注公众号后重试
2. 用未关注的好友账号测试
3. 开发者工具: 清缓存 → 重新打开

### 9.7 token 兑换报 "Cannot read properties of undefined (reading 'id')"

**原因**: sso-oauth.exchangeCode 中 `strapi.db.query.findOne` 未 populate user 关系(已在最新版本修复)

**排查**:
1. 检查 `plugins/zhao-sso/server/src/services/sso-oauth.ts` 中 `exchangeCode` 方法的 `findOne` 调用是否包含 `populate: ["user"]`
2. 若缺失,补充后重新编译插件(`npx tsc -p server/tsconfig.json --outDir dist`)并重启 Strapi

### 9.8 非微信环境输入错误密码被登出/跳转首页

**原因**: 前端 `ssoPasswordAuthorize` 误用了普通 `post()`,401 响应触发了 token 刷新/登出逻辑

**排查**:
1. 检查 `strapi-backend/src/api/sso.js` 中 `ssoPasswordAuthorize`、`ssoPasswordLogin`、`ssoWechatMiniProgramLogin`、`ssoWechatAppLogin`、`ssoJssdkSignature`、`ssoWechatConfig` 是否使用 `publicPost`/`publicGet`
2. 检查 `strapi-backend/src/utils/request.js` 是否导出了 `publicPost`/`publicGet`
3. 若缺失,参考第 6 章的实现修复

### 9.9 邀请码未建立分销关系

**原因**: channel-sync.syncUserInvite 中 inviteCode 参数位置错误(传给了 externalInviteCode 而非 inviterCode)

**排查**:
1. 检查 `plugins/zhao-sso/server/src/services/channel-sync.ts` 中 `syncUserInvite` 调用 `createForUser` 时,inviteCode 是否在第 2 参数位置(inviterCode)
2. 数据库验证: `SELECT * FROM zhao_user_invites ORDER BY id DESC LIMIT 5;`,确认 `invite_method='invite_code'`、`invited_by` 不为 null、`distribution_depth > 0`

### 9.10 日志查看

```bash
# 实时查看 strapi 日志
pm2 logs strapi --lines 100

# 过滤 sso 相关
pm2 logs strapi --lines 100 | grep zhao-sso
```

---

## 10. 应用配置端配置案例

本章以多租户租户详情页为参考,演示应用方如何接入 sso。每个接入 sso 的应用都需要在 sso 后台录入应用配置,并在前端集成 wx-sso-login 组件。

### 10.1 案例: 接入"我的门店管理系统"

#### 10.1.1 在 sso 后台录入应用

进入「SSO → 应用管理 → 新建」,填写:

| 字段 | 值 | 说明 |
|---|---|---|
| app_code | `mystore` | 应用唯一标识,前端 wx-sso-login 的 app-code prop |
| app_name | 门店管理系统 | 应用显示名称 |
| app_secret | (自动生成) | 应用密钥,前端换 token 时需传入,**妥善保存** |
| redirect_uris | `https://mystore.example.com/#/pages/login/callback` | OAuth 回调地址,**必须与前端实际 URL 完全一致**(含 hash 路由) |
| allowed_grant_types | `authorization_code, refresh_token` | 允许的 OAuth 授权类型 |
| is_active | 开 | 启用应用 |

#### 10.1.2 在应用前端集成 wx-sso-login

将 `wx-sso-login.vue` 组件复制到应用项目的 `components/wx-sso-login/` 目录,在登录页引入:

```vue
<template>
  <view class="login-page">
    <view class="login-title">门店管理系统</view>
    <WxSsoLogin
      app-code="mystore"
      :redirect-uri="redirectUri"
      :invite-code="inviteCode"
      :channel-code="channelCode"
      fallback-mode="code"
      :fallback-enabled="true"
      @redirect="onRedirect"
      @error="onLoginError"
    />
  </view>
</template>

<script setup>
import WxSsoLogin from '@/components/wx-sso-login/wx-sso-login.vue'
import { publicPost } from '@/utils/request.js'

// OAuth 回调地址(必须与 sso-app 的 redirect_uris 一致)
const redirectUri = window.location.origin + '/#/pages/login/callback'

// 从 URL 参数获取邀请码/渠道码
const inviteCode = new URLSearchParams(location.search).get('invite_code') || ''
const channelCode = new URLSearchParams(location.search).get('channel_code') || ''

function onRedirect(url) {
  console.log('跳转:', url)
}

function onLoginError(err) {
  uni.showToast({ title: err?.message || '登录失败', icon: 'none' })
}
</script>
```

#### 10.1.3 创建 OAuth 回调页

在 `pages/login/callback.vue` 处理 OAuth 回调:

```vue
<template>
  <view class="callback-page">
    <view v-if="loading">登录中...</view>
    <view v-else-if="error" class="error">{{ error }}</view>
    <view v-else>登录成功,正在跳转...</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { publicPost } from '@/utils/request.js'
import { onLoad } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref('')

onLoad(async (options) => {
  const { code, error: errParam } = options
  if (errParam) {
    error.value = decodeURIComponent(errParam)
    loading.value = false
    return
  }
  if (!code) {
    error.value = '未收到授权码'
    loading.value = false
    return
  }
  try {
    const result = await publicPost('/zhao-sso/v1/auth/token', {
      grant_type: 'authorization_code',
      code,
      app_code: 'mystore',
      app_secret: '<10.1.1 中保存的 app_secret>',
      redirect_uri: window.location.origin + '/#/pages/login/callback',
    })
    uni.setStorageSync('sso_access_token', result.access_token)
    uni.setStorageSync('sso_refresh_token', result.refresh_token)
    uni.reLaunch({ url: '/pages/dashboard/index' })
  } catch (e) {
    error.value = e?.message || 'token 兑换失败'
  } finally {
    loading.value = false
  }
})
</script>
```

#### 10.1.4 后续 API 请求注入 token

在应用的请求封装中,从 storage 读取 sso_access_token 并注入 Authorization 头:

```javascript
// utils/request.js
const token = uni.getStorageSync('sso_access_token')
if (token) {
  header['Authorization'] = `Bearer ${token}`
}
```

#### 10.1.5 在 pages.json 注册路由

```json
{
  "pages": [
    { "path": "pages/login/index", "style": { "navigationBarTitleText": "登录" } },
    { "path": "pages/login/callback", "style": { "navigationBarTitleText": "登录回调" } },
    { "path": "pages/dashboard/index", "style": { "navigationBarTitleText": "控制台" } }
  ]
}
```

### 10.2 多环境 redirect_uris 配置

一个应用通常需要支持多个环境的回调,在 sso-app 的 redirect_uris 中配置多个 URL:

| 环境 | redirect_uri 示例 |
|---|---|
| 生产 | `https://mystore.example.com/#/pages/login/callback` |
| 预发布 | `https://mystore-pre.example.com/#/pages/login/callback` |
| 本地开发 | `http://localhost:5173/#/pages/login/callback` |
| 本地开发(Strapi admin 端口) | `http://localhost:5174/#/pages/login/callback` |

> **注意**: redirect_uri 必须与前端实际请求的 URL **完全一致**(包括协议、端口、路径、hash)。`http://` 与 `https://`、`localhost` 与 `127.0.0.1`、带尾斜杠与不带尾斜杠均视为不同。

### 10.3 邀请码/渠道码获取与透传

邀请码来自 v.joho.cn 邀请链接,渠道码来自 h.joho.cn 渠道链接,通常通过 URL 参数传递:

```
https://mystore.example.com/?invite_code=ABC123&channel_code=XYZ789#/pages/login/index
```

前端在登录页解析后透传给 wx-sso-login 组件,组件会自动透传到 sso 后端的 password-authorize / wechat / miniprogram / app 等接口,sso 的 channel-sync 服务会建立 sso-user 分销关系,与 zhao-auth 解耦。

---

## 附录:接口速查

### 公开接口(无需认证)

| 接口 | 方法 | 路径 |
|---|---|---|
| 微信授权跳转 | GET | `/api/zhao-sso/v1/auth/wechat` |
| 微信中转回调 | GET | `/api/zhao-sso/v1/auth/wechat/callback` |
| 小程序登录 | POST | `/api/zhao-sso/v1/auth/wechat/miniprogram` |
| APP 登录 | POST | `/api/zhao-sso/v1/auth/wechat/app` |
| JSSDK 签名 | POST | `/api/zhao-sso/v1/auth/jssdk-signature` |
| 微信登录配置 | GET | `/api/zhao-sso/v1/auth/wechat/config` |
| **降级密码登录(code 模式)** | POST | `/api/zhao-sso/v1/auth/password-authorize` |
| **降级密码登录(token 模式)** | POST | `/api/zhao-sso/v1/auth/login` |
| 换取 token | POST | `/api/zhao-sso/v1/auth/token` |

### 管理接口(需认证)

| 接口 | 方法 | 路径 |
|---|---|---|
| OAuth 配置列表 | GET | `/api/zhao-sso/v1/admin/oauth-configs` |
| 新建 OAuth 配置 | POST | `/api/zhao-sso/v1/admin/oauth-configs` |
| 三方绑定列表 | GET | `/api/zhao-sso/v1/admin/bindings` |
| 删除三方绑定 | DELETE | `/api/zhao-sso/v1/admin/bindings/:id` |
