import os

content = r"""# zhao-third 三方登录插件使用手册

## 一、插件概述

`zhao-third` 是 Strapi v5 的三方登录插件，支持微信（公众号/小程序/开放平台）、支付宝、抖音三种主流平台的 OAuth 登录集成。用户可通过第三方平台账号快速注册/登录，系统自动创建本地用户并绑定三方账号。

### 核心特性

- **微信三端接入**: 同时支持微信公众号、微信小程序、微信开放平台
- **unionId 跨平台合并**: 同一微信开放平台下的公众号/小程序/开放平台共享 unionId，自动关联已有账号
- **自动注册**: 首次登录自动创建本地用户，无需额外注册流程
- **绑定/解绑**: 已登录用户可绑定/解绑三方账号
- **邀请码支持**: 集成 zhao-channel user-invite 服务，自动处理邀请码分销链
- **权限集成**: 集成 zhao-auth 认证与授权中间件

---

## 二、安装与配置

### 2.1 安装

```bash
# 复制插件到项目 plugins 目录
cp -r zhao-third /path/to/strapi-project/plugins/

# 安装依赖
cd /path/to/strapi-project
npm install
```

### 2.2 配置三方平台凭证（管理后台）

插件启动后，通过管理后台的 `第三方登录配置` 菜单，为每个平台添加配置：

| 字段 | 说明 | 示例 |
|------|------|------|
| `platform` | 平台名称 | wechat / alipay / douyin |
| `appType` | 应用子类型 | official_account / mini_program / open_platform / default |
| `appId` | 应用 ID | wx1234567890abcdef |
| `appSecret` | 应用密钥 | abcdef1234567890abcdef1234567890 |
| `enabled` | 是否启用 | true / false |
| `extraConfig` | 额外配置(JSON) | 支付宝需要配置 RSA2 密钥等 |

### 2.3 微信平台配置对照

| appType | 微信平台入口 | 需要配置的 AppId |
|---------|------------|-----------------|
| official_account | 微信公众平台 (https://mp.weixin.qq.com/) | 公众号 AppId |
| mini_program | 微信小程序后台 (https://mp.weixin.qq.com/) | 小程序 AppId |
| open_platform | 微信开放平台 (https://open.weixin.qq.com/) | 开放平台 AppId |

---

## 三、支持的平台与接入方式

### 3.1 微信 (wechat)

微信平台分为三种子类型，共用 `/auth/wechat/` 路由前缀，通过 `appType` 区分：

| 子类型 | 路由 appType | 认证流程 | 特性 |
|--------|-------------|---------|------|
| 微信公众号 | official_account | 网页授权码 → access_token → userinfo | 需在公众号配置网页授权域名 |
| 微信小程序 | mini_program | wx.login() → jscode2session → 解密 encryptedData | 前端调用 wx.login 获取 code |
| 微信开放平台 | open_platform | 扫码授权 → access_token → userinfo | PC 端扫码登录 |

**unionId 机制**: 如果公众号、小程序同属一个微信开放平台，它们共享 unionId。插件会优先通过 unionId 查找已有账号，实现跨应用的用户合并。

### 3.2 支付宝 (alipay)

- **appType**: default
- **认证流程**: 网页授权码 → alipay.system.oauth.token 获取 access_token
- **注意**: 生产环境需要配置 RSA2 签名，可通过 `extraConfig` 字段传入私钥

### 3.3 抖音 (douyin)

- **appType**: default
- **认证流程**: 授权码 → access_token → userinfo
- **需在抖音开放平台配置**: 回调域名

---

## 四、API 接口说明

所有接口前缀: 根据 Strapi 配置而定，通常为 `/api/zhao-third` 或 `/zhao-third`

### 4.1 获取授权 URL（公开）

获取三方 OAuth 授权页面链接，前端跳转到此 URL 让用户授权。

```
POST /api/zhao-third/auth/:platform/url
```

**请求参数**:

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台: wechat/alipay/douyin |
| appType | body | string | 是 | 子类型: official_account/mini_program/open_platform/default |
| redirectUri | body | string | 是 | 授权后重定向地址 |
| state | body | string | 否 | 自定义状态参数，可用于 CSRF 防护 |

**请求示例**:
```json
POST /api/zhao-third/auth/wechat/url
{
  "appType": "official_account",
  "redirectUri": "https://example.com/auth/callback",
  "state": "random_state_string"
}
```

**响应示例**:
```json
{
  "url": "https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx123&redirect_uri=https://example.com/auth/callback&response_type=code&scope=snsapi_userinfo&state=random_state_string#wechat_redirect"
}
```

> **注意**: 微信小程序无 Web 授权 URL，调用此接口返回 `null`。小程序端应直接调用 wx.login() 获取 code 后调用 callback 接口。

### 4.2 回调处理（公开 — 核心登录接口）

用户授权后，三方平台回调到前端页面，前端获取 `code` 参数后调用此接口完成登录。

```
POST /api/zhao-third/auth/:platform/callback
```

**请求参数**:

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台名称 |
| appType | body | string | 是 | 子类型 |
| code | body | string | 是 | 三方平台返回的授权码 |
| inviteCode | body | string | 否 | 邀请码（分销场景） |
| encryptedData | body | string | 否 | 微信小程序加密数据（需获取用户信息时） |
| iv | body | string | 否 | 微信小程序加密向量 |

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 42,
    "username": "wechat_official_a_1a2b3c4d"
  },
  "isNewUser": true
}
```

**处理流程**:
1. 用 code 向三方平台换取 access_token + user info
2. 查找已有绑定记录（优先 unionId → 回退 openId）
3. 如已绑定 → 直接生成 JWT 返回
4. 如未绑定 → 自动创建用户 → 调用 user-invite 创建分销记录 → 创建绑定记录 → 生成 JWT

### 4.3 绑定三方账号（需登录）

已登录用户将三方账号绑定到当前账号。

```
POST /api/zhao-third/bind/:platform
```

**请求头**: `Authorization: Bearer <token>`

**请求参数**:

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台名称 |
| appType | body | string | 是 | 子类型 |
| code | body | string | 是 | 授权码 |

**响应**:
```json
{
  "id": 1,
  "user": 42,
  "platform": "wechat",
  "appType": "official_account",
  "openId": "oXXX...",
  "nickname": "张三",
  "boundAt": "2026-05-16T10:30:00.000Z"
}
```

### 4.4 解绑三方账号（需登录）

解除当前用户绑定的三方账号。

```
DELETE /api/zhao-third/bind/:platform?appType=official_account
```

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "ok": true
}
```

### 4.5 查询已绑定账号（需登录）

获取当前用户所有已绑定的三方账号列表。

```
GET /api/zhao-third/accounts
```

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
[
  {
    "id": 1,
    "platform": "wechat",
    "appType": "official_account",
    "nickname": "张三",
    "avatar": "https://thirdwx.qlogo.cn/...",
    "boundAt": "2026-05-16T10:30:00.000Z"
  },
  {
    "id": 2,
    "platform": "alipay",
    "appType": "default",
    "nickname": null,
    "avatar": null,
    "boundAt": "2026-05-16T10:35:00.000Z"
  }
]
```

---

## 五、管理员接口

管理后台接口，需管理员登录后使用。

### 5.1 平台配置管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/zhao-third/third-party-configs | admin/editor | 获取所有配置 |
| GET | /api/zhao-third/third-party-configs/:documentId | admin/editor | 获取单个配置 |
| POST | /api/zhao-third/third-party-configs | admin | 创建配置 |
| PUT | /api/zhao-third/third-party-configs/:documentId | admin | 更新配置 |
| DELETE | /api/zhao-third/third-party-configs/:documentId | super-admin | 删除配置 |

### 5.2 三方账号管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/zhao-third/third-party-accounts | admin/editor/viewer | 获取所有绑定关系 |
| GET | /api/zhao-third/third-party-accounts/:documentId | admin/editor/viewer | 获取单个绑定关系 |
| DELETE | /api/zhao-third/third-party-accounts/:documentId | admin | 删除绑定关系 |

---

## 六、前端集成指南

### 6.1 微信公众号登录

```javascript
// 1. 获取授权 URL，前端跳转
const res = await fetch('/api/zhao-third/auth/wechat/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appType: 'official_account',
    redirectUri: window.location.origin + '/auth/wechat/callback',
  })
});
const { url } = await res.json();
window.location.href = url;

// 2. 在回调页面（redirectUri），URL 上带有 code 参数
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

// 3. 调用 callback 接口完成登录
const callbackRes = await fetch('/api/zhao-third/auth/wechat/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appType: 'official_account',
    code,
    inviteCode: params.get('state'),
  })
});
const { token, user, isNewUser } = await callbackRes.json();
localStorage.setItem('token', token);
```

### 6.2 微信小程序登录

```javascript
// 小程序端
Page({
  onLoad() {
    wx.login({
      success: async (res) => {
        const loginRes = await new Promise((resolve, reject) => {
          wx.request({
            url: 'https://your-server.com/api/zhao-third/auth/wechat/callback',
            method: 'POST',
            data: { appType: 'mini_program', code: res.code },
            success: resolve, fail: reject,
          });
        });
        const { token, user, isNewUser } = loginRes.data;
        wx.setStorageSync('token', token);
      }
    });
  },
  onGetUserInfo(e) {
    if (e.detail.errMsg === 'getUserInfo:ok') {
      wx.request({
        url: 'https://your-server.com/api/zhao-third/auth/wechat/callback',
        method: 'POST',
        data: {
          appType: 'mini_program',
          code: this.data.loginCode,
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
        },
      });
    }
  }
});
```

### 6.3 微信开放平台扫码登录

```javascript
const res = await fetch('/api/zhao-third/auth/wechat/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appType: 'open_platform',
    redirectUri: window.location.origin + '/auth/wechat/callback',
  })
});
const { url } = await res.json();
window.open(url, 'wechat_login', 'width=800,height=600');
// 回调处理同公众号流程
```

### 6.4 支付宝登录

```javascript
const res = await fetch('/api/zhao-third/auth/alipay/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appType: 'default',
    redirectUri: window.location.origin + '/auth/alipay/callback',
  })
});
const { url } = await res.json();
window.location.href = url;
```

### 6.5 抖音登录

```javascript
const res = await fetch('/api/zhao-third/auth/douyin/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appType: 'default',
    redirectUri: window.location.origin + '/auth/douyin/callback',
  })
});
const { url } = await res.json();
window.location.href = url;
```

---

## 七、错误码说明

| 错误码 | 消息模板 | 说明 |
|--------|---------|------|
| THIRD_001 | 三方平台不支持 (platform={platform}) | 不支持的 platform 或 appType 组合 |
| THIRD_002 | 授权码无效或已过期 | 三方平台返回的 code 无效或已过期 |
| THIRD_003 | 获取三方用户信息失败 | 无法从三方平台获取用户信息 |
| THIRD_004 | 该三方账号已被绑定 | 该三方账号已被其他用户绑定 |
| THIRD_005 | 未找到三方账号绑定 | 解绑时找不到对应绑定记录 |
| THIRD_006 | 三方账号绑定失败 | 绑定操作失败（如 JWT 生成失败） |
| THIRD_007 | 三方解绑失败 | 解绑操作失败 |
| THIRD_008 | 三方登录配置不存在 | 未配置对应 platform/appType 的 appId/appSecret |

所有错误响应格式:
```json
{
  "error": {
    "status": 500,
    "name": "InternalServerError",
    "message": "授权码无效或已过期",
    "details": { "code": "THIRD_002" }
  }
}
```

---

## 八、数据模型

### 8.1 third-party-account（三方账号绑定表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 主键 |
| user | relation | 关联用户 (manyToOne → users-permissions.user) |
| platform | enumeration | wechat / alipay / douyin |
| appType | enumeration | official_account / mini_program / open_platform / default |
| openId | string | 三方平台用户唯一标识 (最大128位) |
| unionId | string | 微信 unionId（跨应用标识，最大128位） |
| nickname | string | 三方平台昵称 (最大100位) |
| avatar | string | 三方平台头像 URL (最大500位) |
| rawProfile | json | 原始用户信息 |
| boundAt | datetime | 绑定时间 |

### 8.2 third-party-config（三方登录配置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 主键 |
| platform | enumeration | wechat / alipay / douyin |
| appType | enumeration | official_account / mini_program / open_platform / default |
| appId | string | 应用 ID (最大64位) |
| appSecret | string | 应用密钥 (最大128位) |
| enabled | boolean | 是否启用 |
| extraConfig | json | 额外配置（如支付宝 RSA2 密钥等） |

---

## 九、依赖关系

### 9.1 必需依赖

- **Strapi v5** (^5.45.0): Strapi 核心框架

### 9.2 可选依赖（增强功能）

- **zhao-auth**: 提供 JWT 生成、authenticate/authorize 中间件
- **zhao-common**: 提供 i18n 国际化错误消息
- **zhao-channel** (user-invite service): 提供邀请码分销链创建

> **说明**: 如果 zhao-auth/zhao-common/zhao-channel 未安装，插件仍可正常使用基本的三方登录功能，仅跳过对应的增强功能。

---

## 十、常见问题

### Q: 微信小程序登录返回 errcode=40163？
A: 表示 code 已过期。微信小程序 code 有效期仅 5 分钟，请确保在获取 code 后尽快调用 callback 接口。

### Q: 微信公众号授权后返回 redirect_uri 参数错误？
A: 需要在微信公众平台「开发 → 接口权限 → 网页授权」中配置网页授权域名。

### Q: 支付宝 RSA2 签名如何配置？
A: 支付宝的签名需要在服务器端实现 RSA2 签名逻辑。当前插件简化了签名流程，生产环境需通过 `extraConfig` 字段传入支付宝私钥，并在服务端自行实现签名。

### Q: unionId 合并时不生效？
A: 确保公众号/小程序已绑定到同一个微信开放平台账号，绑定后才能获取到 unionId。

### Q: 用户已有一个三方账号绑定，还能绑定更多吗？
A: 可以。每个用户可以同时绑定来自多个平台或多个子类型的三方账号，互不冲突。

---

> **版本**: 1.0.0 | **更新日期**: 2026-05-16
"""

filepath = r"e:\code\plugins\zhao-third\使用手册.md"
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print(f"OK: {filepath} ({len(content)} bytes)")
