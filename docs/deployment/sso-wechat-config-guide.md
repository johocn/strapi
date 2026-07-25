# zhao-sso 微信登录配置手册

本手册指导您完成 zhao-sso 微信登录的完整配置,包括微信公众号准备、sso 后台配置、应用接入、Nginx 配置、前端接入和验证流程。

## 目录

1. [架构概览](#1-架构概览)
2. [微信公众号准备](#2-微信公众号准备)
3. [sso 配置录入](#3-sso-配置录入)
4. [sso-app 接入](#4-sso-app-接入)
5. [Nginx 配置](#5-nginx-配置)
6. [前端接入](#6-前端接入)
7. [验证流程](#7-验证流程)
8. [故障排查](#8-故障排查)

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

### 1.3 邀请码/渠道码流转

| 参数 | 指向域名 | sso 侧处理 | 应用方处理 |
|---|---|---|---|
| invite_code | v.joho.cn | 建立 sso-user 分销 | 应用方也建立分销 |
| channel_code | h.joho.cn | 建立 sso-user 分销 | 应用方也建立分销 |

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

在 strapi-backend 的登录页引入组件:

```vue
<template>
  <view>
    <WxSsoLogin
      app-code="admin"
      redirect-uri="http://h.joho.cn/#/pages/login/callback"
      :invite-code="inviteCode"
      :channel-code="channelCode"
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

function onLoginSuccess({ accessToken, refreshToken, user }) {
  // 存储 token
  uni.setStorageSync('sso_access_token', accessToken)
  uni.setStorageSync('sso_refresh_token', refreshToken)
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

在 redirect-uri 指定的回调页(如 `/pages/login/callback`)处理:

```vue
<script setup>
import { onLoad } from '@dcloudio/uni-app'
import { ssoToken } from '@/api/sso.js'

onLoad(async (options) => {
  const { code, state, error } = options

  if (error) {
    uni.showToast({ title: decodeURIComponent(error), icon: 'none' })
    return
  }

  if (code) {
    // 用 authCode 换 token
    const result = await ssoToken({
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

### 6.3 后续 API 请求带 token

```javascript
// 在 request 封装中注入
const token = uni.getStorageSync('sso_access_token')
if (token) {
  header['Authorization'] = `Bearer ${token}`
}
```

---

## 7. 验证流程

### 7.1 验证 h.joho.cn 微信内登录

1. 在手机微信中打开 `http://h.joho.cn/#/pages/login/login`
2. 应看到「快速登录」和「完善资料登录」按钮
3. 点击「完善资料登录」
4. 弹出微信授权框 → 点击允许
5. 跳转回 h.joho.cn,登录成功

### 7.2 验证 PC 扫码登录

1. 在 PC 浏览器打开接入方页面(如 Vendure 登录页)
2. 点击「微信扫码登录」
3. 跳转显示二维码
4. 用微信扫码 → 确认登录
5. 跳回接入方,登录成功

### 7.3 验证小程序登录

1. 在微信小程序中打开接入方
2. 点击「微信登录」
3. uni.login 拉起微信授权
4. 登录成功,拿到 token

### 7.4 验证 JSSDK 签名

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

---

## 8. 故障排查

### 8.1 invalid appid

**原因**: AppID 错误或 IP 白名单未配置

**排查**:
1. 检查 sso 配置中 AppID 是否与公众号后台一致(注意去除前后空格)
2. 检查公众号后台「IP白名单」是否包含服务器公网 IP
3. 服务器执行 `curl ifconfig.me` 确认公网 IP

### 8.2 redirect_uri 参数错误

**原因**: 网页授权域名未配置或不匹配

**排查**:
1. 检查公众号后台「网页授权域名」是否配置为 `h.joho.cn`
2. 检查 sso 中转回调 URL 是否为 `http://h.joho.cn/api/zhao-sso/v1/auth/wechat/callback`

### 8.3 重定向到 localhost

**原因**: Nginx 未透传 X-Forwarded-Host

**排查**:
1. 检查 nginx 配置 `location /api/` 块是否有 `proxy_set_header X-Forwarded-Host $host;`
2. 执行 `curl -I -H "Host: h.joho.cn" "http://127.0.0.1/api/zhao-sso/v1/auth/wechat/callback?code=test&state=xxx"` 验证

### 8.4 JSSDK 签名失败

**原因**: JS接口安全域名未配置或 url 参数错误

**排查**:
1. 检查公众号后台「JS接口安全域名」是否配置为 `h.joho.cn`
2. 检查前端调用签名接口时,url 参数是否为当前页面 URL(不含 # 后部分)
3. 检查 access_token/jsapi_ticket 是否获取成功(看 strapi 日志)

### 8.5 scope 不在配置列表

**原因**: 前端传入的 scope 未在 sso 配置的 oauthScopes 中

**排查**:
1. 进入 sso OAuth 配置编辑页,确认 OAuth Scope 多选了对应选项
2. 调 `GET /api/zhao-sso/v1/auth/wechat/config?appType=official_account` 确认返回的 oauthScopes

### 8.6 微信内不弹授权框

**原因**: 用户已关注公众号(snsapi_userinfo 静默授权)

**排查**:
1. 取消关注公众号后重试
2. 用未关注的好友账号测试
3. 开发者工具: 清缓存 → 重新打开

### 8.7 日志查看

```bash
# 实时查看 strapi 日志
pm2 logs strapi --lines 100

# 过滤 sso 相关
pm2 logs strapi --lines 100 | grep zhao-sso
```

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
| 换取 token | POST | `/api/zhao-sso/v1/auth/token` |

### 管理接口(需认证)

| 接口 | 方法 | 路径 |
|---|---|---|
| OAuth 配置列表 | GET | `/api/zhao-sso/v1/admin/oauth-configs` |
| 新建 OAuth 配置 | POST | `/api/zhao-sso/v1/admin/oauth-configs` |
| 三方绑定列表 | GET | `/api/zhao-sso/v1/admin/bindings` |
| 删除三方绑定 | DELETE | `/api/zhao-sso/v1/admin/bindings/:id` |
