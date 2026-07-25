# zhao-sso 微信登录设计文档

- 日期: 2026-07-24
- 作者: TRAE 协作设计
- 状态: 待评审

## 背景与目标

zhao-sso 是统一单点登录中心,服务于多个业务方:h.joho.cn 后台、c 端 v.joho.cn(备选)、Vendure 等。现有 sso 微信登录仅支持开放平台扫码(qrconnect + snsapi_login),缺少公众号网页授权链路,且后台缺少微信配置管理 UI。

本设计目标:在 zhao-sso 中扩展微信登录能力,与 c 端 zhao-third 微信登录完全隔离(独立公众号 appId、独立配置表、独立用户体系 sso-user),并补全配置管理 UI 和 uniapp 三方登录组件,最终输出配置手册。

## 需求确认

| 维度 | 结论 |
|---|---|
| 服务场景 | h.joho.cn 移动端(微信公众号内) + c 端 v.joho.cn(备选) + Vendure 等 PC 端 |
| 授权形态 | 公众号网页授权(移动端) + 开放平台扫码(PC端),按 client/UA 切换 |
| 公众号配置 | 独立 appId/appSecret,存 sso-oauth-config 表,与 c 端 zhao-third 完全隔离 |
| 用户体系 | sso-user(与 c 端 users-permissions.user 独立) |
| JSSDK | 需要(h.joho.cn 移动端分享,且 web 场景登录必需) |
| 配置 UI | 增强 oauth-config 编辑页 + binding 页入口 + Strapi admin 新增 Tab |
| 邀请码/渠道码 | inviteCode(指向 v.joho.cn) 和 channelCode(指向 h.joho.cn) 都建立 sso-user 分销,并透传给应用方 |
| sso-user 分销 | 独立建立,不依赖 zhao-auth(sso 将来独立拆分) |
| 多端登录 | uniapp 三方登录组件整合 uni.login(OBJECT),支持小程序/H5/APP |
| OAuth Scope | 多选(snsapi_userinfo / snsapi_base),前端按勾选动态渲染登录按钮 |
| 交付物 | 代码 + 配置手册 |

## 与 c 端 zhao-third 的区分

| 维度 | c 端 (zhao-third) | sso 端 (zhao-sso) |
|---|---|---|
| 入口路由 | `/api/zhao-third/v1/wechat/callback` | `/api/zhao-sso/v1/auth/wechat` |
| 配置表 | `third_party_configs` | `sso_oauth_configs` |
| 公众号 appId | wx17d58d73062d1899 | 独立的另一个公众号 appId |
| 用户体系 | users-permissions.user | sso-user |
| 绑定表 | `third_party_accounts` | `sso_third_party_bindings` |
| 回调产物 | 直接签发 zhao-auth JWT,302 回前端带 token | 生成 authCode,302 回应用方带 code,应用方再调 /auth/token 换 access_token |
| JSSDK 路由 | `/api/zhao-third/v1/third/jssdk-signature` | `/api/zhao-sso/v1/auth/jssdk-signature` |
| 小程序登录 | `/api/zhao-third/v1/third/callback` (platform=wechat, appType=mini_program) | `/api/zhao-sso/v1/auth/wechat/miniprogram` |

## 架构定位

sso 是统一登录中心,不是多租户系统。隔离机制:

| 维度 | 机制 | 说明 |
|---|---|---|
| 用户注册 | 应用码 (app_code) | 用户通过某 app_code 注册,归属该应用 |
| 应用接入 | sso-app 表 | 每个接入方是一个 sso-app,有 app_code/app_secret/redirect_uris |
| OAuth 配置 | 全局共享 | 微信公众号/开放平台配置是 sso 中心自己的资源,所有接入方共用同一套微信 appId/appSecret |
| 授权码 | 绑定 app_code | sso-auth-code 记录 user + app_code + redirect_uri,换取 token 时校验 |

sso-oauth-config 不需要租户隔离(site 关联),注册通过应用码隔离。

## 数据模型

### sso-oauth-config schema 扩展

现有字段:provider / app_id / app_secret / scope / extra_config(json) / redirect_uris(json) / is_enabled / description

新增字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string, required | 配置名称 |
| `app_type` | enumeration: `official_account` / `open_platform` / `mini_program` / `app` / `default` | 应用类型,微信必填;其他默认 default |

extra_config JSON 约定(微信专属字段):

```json
{
  "token": "公众号消息token",
  "encodingAESKey": "公众号消息加解密密钥",
  "oauthScopes": ["snsapi_userinfo", "snsapi_base"],
  "authUpgrade": false
}
```

### 配置查询方法

- `findByProviderAndAppType(provider, appType)` — 按 provider+appType+is_enabled 查询,无 siteId 参数
- `findByProvider(provider)` — 向后兼容(默认取 app_type='default' 或第一条)

## 授权链路与邀请码流转

### 整体流程

```
应用方发起:
GET /api/zhao-sso/v1/auth/wechat?
  app_code=admin&
  redirect_uri=<回调URL>&
  inviteCode=xxx&        # 可选,指向 v.joho.cn
  channelCode=yyy        # 可选,指向 h.joho.cn
  scope=snsapi_userinfo  # 可选,由前端按钮传入

→ sso wechatRedirect 控制器:
  1. 校验 app_code 存在且 is_active
  2. 校验 redirect_uri 在 app 白名单
  3. 按 User-Agent 判断形态:
     - 微信浏览器内 → official_account
     - PC 浏览器 → open_platform
  4. scope 校验:必须在配置的 oauthScopes 列表中
  5. 把 {app_code, redirect_uri, inviteCode, channelCode, appType, scope} 编码进 state(base64url JSON)
  6. 调 sso-wechat.getAuthorizeUrl(state, appType, scope) → 302 到微信

→ 微信授权后回调:
GET /api/zhao-sso/v1/auth/wechat/callback?code=xxx&state=<base64>

→ sso wechatCallback 控制器:
  1. 解码 state 拿到 app_code/redirect_uri/inviteCode/channelCode/appType/scope
  2. 调 sso-wechat.handleCallback(code, appType) → 创建/匹配 sso-user + sso-third-party-binding
  3. sso 建立 sso-user 分销关系:
     - inviteCode 存在 → syncSsoUserChannel(user, inviteCode, 'invite')
     - channelCode 存在 → syncSsoUserChannel(user, channelCode, 'channel')
  4. 生成 authCode(绑定 user + app_code + redirect_uri)
  5. 302 回 redirect_uri?code=<authCode>&state=<base64含inviteCode/channelCode透传>

→ 应用方回调页:
  1. POST /api/zhao-sso/v1/auth/token {code, app_code, app_secret} → 换 access_token + refresh_token
  2. 注册/匹配应用方自己的用户
  3. 用透传的 inviteCode/channelCode 调 zhao-channel 建立应用方分销
```

### 邀请码/渠道码流转规则

| 参数 | 指向域名 | sso 侧处理 | 应用方处理 |
|---|---|---|---|
| inviteCode | v.joho.cn | 建立 sso-user 分销(调 sso channel-sync) | 应用方也建立自己的分销 |
| channelCode | h.joho.cn | 建立 sso-user 分销(调 sso channel-sync) | 应用方也建立自己的分销 |

统一逻辑:两个参数都建立 sso-user 分销,抽象为 `syncSsoUserChannel(user, code, codeType)`,codeType 区分 invite/channel。sso-user 分销独立,调 sso 自己的 channel-sync 服务,不依赖 zhao-auth。

### state 编码

base64url JSON:

```json
{
  "app_code": "admin",
  "redirect_uri": "https://h.joho.cn/#/pages/login/callback",
  "inviteCode": "xxx",
  "channelCode": "yyy",
  "appType": "official_account",
  "scope": "snsapi_userinfo"
}
```

### sso-wechat.ts 扩展

- `getAuthorizeUrl(state, appType, scope?)` 按 appType 分支:
  - official_account: `https://open.weixin.qq.com/connect/oauth2/authorize` + scope(默认 snsapi_userinfo)
  - open_platform: `https://open.weixin.qq.com/connect/qrconnect` + snsapi_login(现有逻辑)
- `handleCallback(code, appType)`:
  - 换 token (sns/oauth2/access_token)
  - official_account/open_platform: 额外拉 sns/userinfo 取昵称头像
  - 按 openid 查 sso-third-party-binding,命中返回 userId,否则创建 sso-user + binding
  - 返回 { userId, isNew }
- `handleMiniProgramCallback(code)` — 走 sns/jscode2session
- `handleAppCallback(code)` — 走 sns/oauth2/access_token(APP 微信登录)
- `getJssdkSignature(url, appType)` — JSSDK 签名
- `getWechatLoginConfig(appType)` — 返回 { enabled, appType, oauthScopes, appId }
- `getValidAccessToken`/`getJsapiTicket` — 内存缓存(带 errcode=40001 清缓存重试)
- `syncSsoUserChannel(user, code, codeType)` — 封装 sso-user 分销建立

### 新增路由

| 路由 | 方法 | 场景 | 入参 | 返回 |
|---|---|---|---|---|
| `/v1/auth/wechat` | GET | H5/PC 跳转授权 | query: app_code/redirect_uri/inviteCode?/channelCode?/scope? | 302 |
| `/v1/auth/wechat/callback` | GET | 微信中转回调 | query: code/state | 302 回应用方 |
| `/v1/auth/wechat/miniprogram` | POST | 小程序登录 | body: code/appCode/inviteCode?/channelCode? | {access_token, refresh_token, user} |
| `/v1/auth/wechat/app` | POST | APP 登录 | body: code/appCode/inviteCode?/channelCode? | {access_token, refresh_token, user} |
| `/v1/auth/jssdk-signature` | POST | JSSDK 签名 | body: url/appType? | {appId, timestamp, nonceStr, signature} |
| `/v1/auth/wechat/config` | GET | 获取可用登录方式 | query: appCode/appType | {enabled, appType, oauthScopes, appId} |

小程序/APP 接口直接返回 token(不走 OAuth 授权码模式),因为无 redirect_uri 跳转,由 uni.login 拿到 code 后直接 POST 换 token。这是 OAuth2 授权码模式的特例:小程序/APP 场景由 uni.login 充当授权交互,后端直接签发 token,省去 authCode 交换步骤。

## JSSDK 与 uniapp 登录组件

### sso JSSDK 签名接口

`POST /api/zhao-sso/v1/auth/jssdk-signature`,返回 {appId, timestamp, nonceStr, signature}。供 H5 微信浏览器场景使用。

### uniapp 三方登录组件(strapi-backend)

组件位置:`d:\zhao\strapi-backend\components\wx-sso-login\wx-sso-login.vue`(新建)

职责:
1. 检测运行环境(H5 微信浏览器 / 小程序 / APP / PC 浏览器)
2. 按环境调用对应的登录方式
3. 统一回调,返回 sso token 给业务页面

多端适配逻辑:

```typescript
function login(options: { appCode, redirectUri, inviteCode?, channelCode? }) {
  // #ifdef MP-WEIXIN
  uni.login({
    provider: 'weixin',
    success: (res) => {
      // res.code → POST sso /v1/auth/wechat/miniprogram { code, appCode, inviteCode, channelCode }
    }
  })
  // #endif

  // #ifdef H5
  if (isWechatBrowser()) {
    // 1. 调 sso /v1/auth/jssdk-signature 拿签名
    // 2. wx.config() 注入
    // 3. 调 sso /v1/auth/wechat/config 拿 oauthScopes,动态渲染登录按钮
    // 4. 跳转 sso /v1/auth/wechat?appCode=xxx&redirectUri=xxx&scope=snsapi_xxx
    // 5. sso 302 回 redirectUri?code=<authCode>
    // 6. 用 authCode 调 sso /v1/auth/token 换 access_token
  } else {
    // PC 浏览器: 直接跳 sso 扫码
    window.location.href = `${ssoBaseUrl}/v1/auth/wechat?appCode=xxx&redirectUri=xxx`
  }
  // #endif

  // #ifdef APP-PLUS
  uni.login({
    provider: 'weixin',
    success: (res) => {
      // res.code → POST sso /v1/auth/wechat/app
    }
  })
  // #endif
}
```

### OAuth Scope 多选

配置端:oauth-config edit.vue 中 oauthScopes 多选,至少选 1 项,存 extra_config.oauthScopes 数组。

运行时:
- `["snsapi_base"]` → 仅"快速登录"按钮
- `["snsapi_userinfo"]` → 仅"完善资料登录"按钮
- `["snsapi_base", "snsapi_userinfo"]` → 两个按钮都显示(默认)

前端组件读取 `GET /v1/auth/wechat/config` 获取 oauthScopes,动态渲染按钮。用户点击按钮,组件把对应 scope 传给 sso /v1/auth/wechat?scope=snsapi_xxx。

sso 后端 wechatRedirect 校验 scope 是否在配置的 oauthScopes 列表中,不在则报错。

## 配置 UI 设计

### 增强 oauth-config 编辑页(strapi-backend)

文件:`d:\zhao\strapi-backend\pages\sso\oauth-config\edit.vue`(重写)

表单结构:

```
基础信息
├── 配置名称* (name)
├── 平台* (provider): wechat / alipay / douyin / google / github
├── 应用类型* (app_type):
│   wechat → official_account / open_platform / mini_program / app / default
│   其他 → default
├── AppID* (app_id)
├── AppSecret* (app_secret)
├── 是否启用 (is_enabled): 开关
└── 描述 (description)

微信专属字段 (provider=wechat 时动态显示,存 extra_config JSON)
├── 公众号 (app_type=official_account)
│   ├── Token (消息校验)
│   ├── EncodingAESKey (消息加解密)
│   ├── OAuth Scope* (多选,至少选1项):
│   │   ☑ snsapi_userinfo  (完善资料登录,授权获取昵称头像)
│   │   ☑ snsapi_base      (快速登录,静默授权)
│   └── 授权升级 (authUpgrade): 开关
├── 开放平台 (app_type=open_platform)
│   └── 备注: PC 扫码登录用
├── 小程序 (app_type=mini_program)
│   └── (预留)
└── APP (app_type=app)
    └── (预留)

回调配置
├── redirect_uris (JSON 数组,文本框)
└── scope (文本)
```

实现:PLATFORM_FIELDS 映射表、PLATFORM_HINTS 提示文案,提交时把微信专属字段打包到 extra_config JSON。

### binding 页面增加入口(strapi-backend)

文件:`d:\zhao\strapi-backend\pages\sso\binding\list.vue`(修改)

新增:
1. 顶部操作栏增加"配置微信登录"按钮 → 跳转 pages/sso/oauth-config/edit
2. 列表行增加"编辑"按钮 → 跳转 pages/sso/oauth-config/edit?documentId=xxx
3. 增加"新增绑定"按钮 → 弹窗手动录入 provider/provider_user_id

### Strapi 内置 admin 新增 Tab(zhao-sso admin)

文件:`d:\zhao\strapi\plugins\zhao-sso\admin\src\pages\HomePage.tsx`(修改)

现有 5 个 Tab:dashboard / users / apps / channels / logs

新增 2 个 Tab:
- oauth-configs — OAuth 配置管理(CRUD,复用后端 /v1/admin/oauth-configs API)
- bindings — 三方绑定管理(CRUD,复用后端 /v1/admin/bindings API)

实现:新建 OauthConfigsTab.tsx 和 BindingsTab.tsx(参考现有 AppsTab.tsx 模式)。API_PREFIX 改为正确的 /api/zhao-sso/v1/admin。

### 三个配置入口的关系

| 入口 | 项目 | 用途 | 字段复杂度 |
|---|---|---|---|
| strapi-backend/pages/sso/oauth-config/edit.vue | uniapp 后台 | 主用,微信专属字段动态渲染,h.joho.cn 后台管理员配置 | 高 |
| plugins/zhao-sso/admin/src/pages/OauthConfigsTab.tsx | Strapi admin | 备用,简化表单 | 中 |
| 后端 API /v1/admin/oauth-configs | 后端 | 数据源,两个前端共用 | — |

主推 strapi-backend edit.vue,h.joho.cn 后台是日常管理入口;Strapi admin 作为备用,简化处理。

## 后端文件改动清单

### A. schema 扩展

- `plugins/zhao-sso/server/src/content-types/sso-oauth-config/schema.json`:新增 name(string,required)、app_type(enum) 字段

### B. service 层

- `services/sso-oauth-config.ts`:新增 findByProviderAndAppType(provider, appType);findByProvider 向后兼容
- `services/sso-wechat.ts`:重构 getAuthorizeUrl/handleCallback 按 appType 分支;新增 handleMiniProgramCallback/handleAppCallback/getJssdkSignature/getWechatLoginConfig/getValidAccessToken/getJsapiTicket/syncSsoUserChannel
- `services/channel-sync.ts`:新增 syncFromSsoLogin(user, code, codeType),封装 sso-user 分销建立(不依赖 zhao-auth)

### C. controller 层

- `controllers/oauth-controller.ts`:重构 wechatRedirect/wechatCallback;新增 wechatMiniProgramLogin/wechatAppLogin/jssdkSignature/wechatConfig

### D. routes

- `routes/api.ts`:新增 POST /v1/auth/wechat/miniprogram、POST /v1/auth/wechat/app、POST /v1/auth/jssdk-signature、GET /v1/auth/wechat/config

### E. 前端 strapi-backend

- `pages/sso/oauth-config/edit.vue`:重写,微信专属字段动态渲染、oauthScopes 多选
- `pages/sso/binding/list.vue`:修改,增加"配置微信登录"入口、新增绑定
- `components/wx-sso-login/wx-sso-login.vue`:新建,多端适配登录组件
- `src/api/sso.js`:扩展,新增 wechat/miniprogram、wechat/app、jssdk-signature、wechat/config 接口封装

### F. Strapi admin

- `admin/src/pages/HomePage.tsx`:新增 oauth-configs / bindings 两个 Tab;修正 API_PREFIX
- `admin/src/pages/OauthConfigsTab.tsx`:新建
- `admin/src/pages/BindingsTab.tsx`:新建

## 错误处理

### 中转回调错误重定向

sso-wechat.ts 新增 buildErrorRedirect(ctx, message, state):

```typescript
const { redirect_uri } = decodeState(state);
const errorUrl = `${redirect_uri}?error=${encodeURIComponent(message)}`;
ctx.response.redirect(errorUrl);
```

redirect_uri 从 state 解码,不依赖 X-Forwarded-Host(因为应用方回调 URL 是已知的)。但 JSSDK 签名接口需要正确的 domain,读 X-Forwarded-Host。

### 错误场景与处理

| 场景 | HTTP | 处理 |
|---|---|---|
| 配置未找到(provider/appType) | 404 | JSON 错误或重定向带 error |
| 微信 token 换取失败(invalid code) | 302 | 重定向回应用方带 ?error=微信token换取失败:xxx |
| app_code 无效或未启用 | 400 | JSON 错误 |
| redirect_uri 不在白名单 | 400 | JSON 错误 |
| scope 不在配置的 oauthScopes 列表 | 400 | JSON 错误"当前配置未启用该登录方式" |
| 微信 API 调用失败(access_token/jsapi_ticket) | 400 | JSON 错误 |
| JSSDK 签名 url 缺失 | 400 | JSON 错误 |

### access_token 缓存失效

微信返回 errcode=40001(access_token 过期/无效) 时清缓存重试一次,不递归避免死循环。

## sso 服务域名

sso 是 strapi 后端插件,路由挂在 `/api/zhao-sso/*`。sso 服务通过 strapi 所在服务器对外提供,域名复用业务方域名之一(h.joho.cn 或 v.joho.cn),无需独立域名。

微信中转回调 URL 形如:`http://<strapi域名>/api/zhao-sso/v1/auth/wechat/callback`

微信公众平台需配置:
- JS接口安全域名: h.joho.cn(sso 主要服务域名)
- 网页授权域名: strapi 服务器域名(中转回调所在域名,如 h.joho.cn)

## Nginx 配置要点

strapi 服务器域名(如 h.joho.cn)的 nginx 配置需透传代理头:

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

与 c 端 v.joho.cn 配置一致,确保 sso 中转回调 302 重定向 URL 正确。

## 配置手册交付物

完成后输出 `d:\zhao\strapi\docs\deployment\sso-wechat-config-guide.md`,内容:

1. 微信公众号准备:申请认证服务号、获取 AppID/AppSecret、配置 JS接口安全域名、网页授权域名、IP白名单
2. sso 配置录入:在 h.joho.cn 后台 pages/sso/oauth-config/edit 录入配置(图文步骤)
3. sso-app 接入:在 pages/sso/apps 录入接入方(app_code/app_secret/redirect_uris)
4. Nginx 配置:sso 域名的反代配置(X-Forwarded-Host/Proto 透传)
5. 前端接入:strapi-backend 业务页接入 wx-sso-login 组件示例
6. 验证流程:微信内访问 h.joho.cn 测试登录、PC 扫码测试
7. 故障排查:常见问题(invalid appid、域名未配置、IP白名单等)

## 测试验证点

| 验证项 | 方法 |
|---|---|
| 配置录入 | 在 h.joho.cn 后台录入微信 official_account 配置,oauthScopes 多选 |
| 公众号授权(h.joho.cn 微信内) | 微信内访问 h.joho.cn → wx-sso-login 组件 → 完善资料登录 → 弹授权框 → 回调拿 token |
| PC 扫码(v.joho.cn 或 Vendure) | PC 浏览器访问 → 跳 sso 扫码 → 微信扫码 → 回调拿 token |
| 小程序登录 | uni.login 拿 code → POST /wechat/miniprogram → 拿 token |
| JSSDK 签名 | POST /jssdk-signature → 返回正确签名,wx.config 成功 |
| 邀请码/渠道码流转 | URL 带 inviteCode/channelCode → sso 建立 sso-user 分销 → 透传给应用方 |
| 错误重定向 | 用 invalid code 测试 → 302 回应用方带 error |
| 配置 UI | strapi-backend edit.vue 动态字段、Strapi admin Tab CRUD |

## YAGNI 原则

本设计排除以下非必要功能:
- 多租户隔离(sso 通过 app_code 隔离,不需要 site 关联)
- Redis 缓存(当前单进程,内存缓存足够;多进程部署时再引入)
- 绑定记录的手动编辑(只支持新增/解绑,编辑场景极少)
- 支付宝/抖音的 JSSDK(本设计聚焦微信)
- Strapi admin 的微信专属字段动态渲染(简化处理,主推 strapi-backend edit.vue)
