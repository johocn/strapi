const fs = require("fs");
const path = require("path");

const content = `# zhao-third 三方登录插件使用手册

## 一、插件概述

\`zhao-third\` 是 Strapi v5 的三方登录插件，支持微信（公众号/小程序/开放平台）、支付宝、抖音三种主流平台的 OAuth 登录集成。用户可通过第三方平台账号快速注册/登录，系统自动创建本地用户并绑定三方账号。

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

\`\`\`bash
# 复制插件到项目 plugins 目录
cp -r zhao-third /path/to/strapi-project/plugins/

# 安装依赖
cd /path/to/strapi-project
npm install
\`\`\`

### 2.2 配置三方平台凭证（管理后台）

插件启动后，通过管理后台的 \`第三方登录配置\` 菜单，为每个平台添加配置：

| 字段 | 说明 | 示例 |
|------|------|------|
| \`platform\` | 平台名称 | wechat / alipay / douyin |
| \`appType\` | 应用子类型 | official_account / mini_program / open_platform / default |
| \`appId\` | 应用 ID | wx1234567890abcdef |
| \`appSecret\` | 应用密钥 | abcdef1234567890abcdef1234567890 |
| \`enabled\` | 是否启用 | true / false |
| \`extraConfig\` | 额外配置(JSON) | 支付宝需要配置 RSA2 密钥等 |

### 2.3 微信平台配置对照

| appType | 微信平台入口 | 需要配置的 AppId |
|---------|------------|-----------------|
| official_account | 微信公众平台 | 公众号 AppId |
| mini_program | 微信小程序后台 | 小程序 AppId |
| open_platform | 微信开放平台 | 开放平台 AppId |

---

## 三、支持的平台与接入方式

### 3.1 微信 (wechat)

微信平台分为三种子类型，共用 \`/auth/wechat/\` 路由前缀，通过 \`appType\` 区分：

| 子类型 | 路由 appType | 认证流程 | 特性 |
|--------|-------------|---------|------|
| 微信公众号 | official_account | 网页授权码 → access_token → userinfo | 需在公众号配置网页授权域名 |
| 微信小程序 | mini_program | wx.login() → jscode2session → 解密 encryptedData | 前端调用 wx.login 获取 code |
| 微信开放平台 | open_platform | 扫码授权 → access_token → userinfo | PC 端扫码登录 |

**unionId 机制**: 如果公众号、小程序同属一个微信开放平台，它们共享 unionId。插件会优先通过 unionId 查找已有账号，实现跨应用的用户合并。

### 3.2 支付宝 (alipay)

- **appType**: default
- **认证流程**: 网页授权码 → alipay.system.oauth.token 获取 access_token
- **注意**: 生产环境需要配置 RSA2 签名，可通过 \`extraConfig\` 字段传入私钥

### 3.3 抖音 (douyin)

- **appType**: default
- **认证流程**: 授权码 → access_token → userinfo
- **需在抖音开放平台配置**: 回调域名

---

## 四、API 接口说明

所有接口前缀: 根据 Strapi 配置而定，通常为 \`/api/zhao-third\` 或 \`/zhao-third\`

### 4.1 获取授权 URL（公开）

获取三方 OAuth 授权页面链接，前端跳转到此 URL 让用户授权。

\`\`\`
POST /api/zhao-third/auth/:platform/url
\`\`\`

**请求参数**:

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台: wechat/alipay/douyin |
| appType | body | string | 是 | 子类型: official_account/mini_program/open_platform/default |
| redirectUri | body | string | 是 | 授权后重定向地址 |
| state | body | string | 否 | 自定义状态参数，可用于 CSRF 防护 |

**响应示例**:
\`\`\`json
{
  "url": "https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx123&redirect_uri=..."
}
\`\`\`

> **注意**: 微信小程序无 Web 授权 URL，调用此接口返回 \`null\`。小程序端应直接调用 wx.login() 获取 code 后调用 callback 接口。

### 4.2 回调处理（公开 — 核心登录接口）

\`\`\`
POST /api/zhao-third/auth/:platform/callback
\`\`\`

**请求参数**:

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台名称 |
| appType | body | string | 是 | 子类型 |
| code | body | string | 是 | 三方平台返回的授权码 |
| inviteCode | body | string | 否 | 邀请码（分销场景） |
| encryptedData | body | string | 否 | 微信小程序加密数据 |
| iv | body | string | 否 | 微信小程序加密向量 |

**响应示例**:
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 42, "username": "wechat_official_a_1a2b3c4d" },
  "isNewUser": true
}
\`\`\`

**处理流程**:
1. 用 code 向三方平台换取 access_token + user info
2. 查找已有绑定记录（优先 unionId → 回退 openId）
3. 如已绑定 → 直接生成 JWT 返回
4. 如未绑定 → 自动创建用户 → 调用 user-invite 创建分销记录 → 创建绑定记录 → 生成 JWT

### 4.3 绑定三方账号（需登录）

\`\`\`
POST /api/zhao-third/bind/:platform
\`\`\`

**请求头**: \`Authorization: Bearer <token>\`

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| platform | path | string | 是 | 平台名称 |
| appType | body | string | 是 | 子类型 |
| code | body | string | 是 | 授权码 |

### 4.4 解绑三方账号（需登录）

\`\`\`
DELETE /api/zhao-third/bind/:platform?appType=official_account
\`\`\`

### 4.5 查询已绑定账号（需登录）

\`\`\`
GET /api/zhao-third/accounts
\`\`\`

---

## 五、管理员接口

### 5.1 平台配置管理

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | /api/zhao-third/third-party-configs | admin/editor |
| GET | /api/zhao-third/third-party-configs/:documentId | admin/editor |
| POST | /api/zhao-third/third-party-configs | admin |
| PUT | /api/zhao-third/third-party-configs/:documentId | admin |
| DELETE | /api/zhao-third/third-party-configs/:documentId | super-admin |

### 5.2 三方账号管理

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | /api/zhao-third/third-party-accounts | admin/editor/viewer |
| GET | /api/zhao-third/third-party-accounts/:documentId | admin/editor/viewer |
| DELETE | /api/zhao-third/third-party-accounts/:documentId | admin |

---

## 六、前端集成指南

### 6.1 微信公众号登录

\`\`\`javascript
// 1. 获取授权 URL
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

// 2. 回调页面获取 code
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

// 3. 调用 callback 完成登录
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
\`\`\`

### 6.2 微信小程序登录

\`\`\`javascript
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
        const { token } = loginRes.data;
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
\`\`\`

### 6.3 微信开放平台扫码登录

\`\`\`javascript
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
// 回调处理同公众号
\`\`\`

### 6.4 支付宝登录

\`\`\`javascript
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
\`\`\`

### 6.5 抖音登录

\`\`\`javascript
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
\`\`\`

---

## 七、错误码说明

| 错误码 | 消息 | 说明 |
|--------|------|------|
| THIRD_001 | 三方平台不支持 | 不支持的 platform 或 appType |
| THIRD_002 | 授权码无效或已过期 | code 无效 |
| THIRD_003 | 获取三方用户信息失败 | 无法获取用户信息 |
| THIRD_004 | 该三方账号已被绑定 | 账号已被其他用户绑定 |
| THIRD_005 | 未找到三方账号绑定 | 解绑时无对应记录 |
| THIRD_006 | 三方账号绑定失败 | 绑定操作失败 |
| THIRD_007 | 三方解绑失败 | 解绑操作失败 |
| THIRD_008 | 三方登录配置不存在 | 未配置 appId/appSecret |

---

## 八、数据模型

### third-party-account（三方账号绑定表）

| 字段 | 类型 | 说明 |
|------|------|------|
| user | relation | manyToOne → users-permissions.user |
| platform | enumeration | wechat / alipay / douyin |
| appType | enumeration | official_account / mini_program / open_platform / default |
| openId | string | 三方平台用户唯一标识 |
| unionId | string | 微信 unionId（跨应用标识） |
| nickname | string | 三方平台昵称 |
| avatar | string | 三方平台头像 URL |
| rawProfile | json | 原始用户信息 |
| boundAt | datetime | 绑定时间 |

### third-party-config（三方登录配置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| platform | enumeration | wechat / alipay / douyin |
| appType | enumeration | official_account / mini_program / open_platform / default |
| appId | string | 应用 ID |
| appSecret | string | 应用密钥 |
| enabled | boolean | 是否启用 |
| extraConfig | json | 额外配置（如 RSA2 密钥） |

---

## 九、依赖关系

- **必需**: Strapi v5 (^5.45.0)
- **可选**: zhao-auth (JWT + 中间件), zhao-common (i18n 错误消息), zhao-channel (邀请码分销链)

> 可选依赖未安装时，插件仍可正常使用基本的三方登录功能。

---

## 十、常见问题

### Q: 微信小程序登录返回 errcode=40163？
A: code 已过期。微信小程序 code 有效期仅 5 分钟，需尽快调用 callback 接口。

### Q: 微信公众号 redirect_uri 参数错误？
A: 需在微信公众平台配置网页授权域名。

### Q: unionId 合并不生效？
A: 确保公众号/小程序已绑定到同一个微信开放平台账号。

### Q: 能绑定多个三方账号吗？
A: 可以。每个用户可绑定多个平台或多个子类型的三方账号。

---

> **版本**: 1.0.0 | **更新日期**: 2026-05-16
`;

const filepath = "e:\\code\\plugins\\zhao-third\\使用手册.md";
fs.writeFileSync(filepath, content, "utf-8");
const stats = fs.statSync(filepath);
console.log("OK: " + filepath + " (" + stats.size + " bytes)");
