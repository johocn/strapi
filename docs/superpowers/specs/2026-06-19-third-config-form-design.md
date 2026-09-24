# 三方配置表单动态化改造

## 背景

`pages/third/config-form.vue` 当前是通用表单（6个固定字段），不区分平台类型，没有 hint 提示和预设值。后端 `zhao-third` bootstrap 已预设 5 条默认配置（微信公众号/小程序/开放平台、支付宝、抖音），每条带 extraConfig hint 字段，但前端未利用。

## 决策

改造 config-form.vue，根据 platform + appType 动态渲染字段，每个字段带 hint 说明和默认值。

## 平台字段映射

| platform | appType | 中文名 | 特有字段 |
|----------|---------|--------|----------|
| wechat | official_account | 微信公众号 | appId, appSecret, token, encodingAesKey, oauthScope |
| wechat | mini_program | 微信小程序 | appId, appSecret, mchId, mchKey, apiVersion |
| wechat | open_platform | 微信开放平台 | appId, appSecret, componentAccessToken, preAuthCode |
| alipay | default | 支付宝 | appId, appSecret, alipayPublicKey, signType |
| douyin | default | 抖音 | appId, appSecret, paymentMerchantId, paymentSalt, paymentToken |

## 字段定义

```javascript
const PLATFORM_FIELDS = {
  'wechat:official_account': [
    { key: 'appId', label: 'AppID', hint: '微信公众号 AppID（开发者ID），登录 mp.weixin.qq.com 获取', required: true },
    { key: 'appSecret', label: 'AppSecret', hint: '微信公众号 AppSecret（开发者密码），在公众号后台「开发→基本配置」获取', required: true, type: 'password' },
    { key: 'token', label: 'Token', hint: '服务器配置 Token，用于验证消息来源，自定义设置' },
    { key: 'encodingAesKey', label: 'EncodingAESKey', hint: '服务器配置消息加解密密钥，43位字符，可随机生成' },
    { key: 'oauthScope', label: '授权作用域', hint: 'snsapi_base：静默授权仅获openid；snsapi_userinfo：弹窗授权获取昵称头像', default: 'snsapi_base' },
  ],
  'wechat:mini_program': [
    { key: 'appId', label: 'AppID', hint: '微信小程序 AppID，登录 mp.weixin.qq.com 获取', required: true },
    { key: 'appSecret', label: 'AppSecret', hint: '微信小程序 AppSecret，在小程序后台「开发→开发管理→开发设置」获取', required: true, type: 'password' },
    { key: 'mchId', label: '商户号', hint: '微信支付商户号（如需支付功能），在 pay.weixin.qq.com 获取' },
    { key: 'mchKey', label: '商户密钥', hint: '微信支付商户API密钥（如需支付功能），在商户平台「账户中心→API安全」设置', type: 'password' },
    { key: 'apiVersion', label: '支付API版本', hint: '微信支付API版本：v2 或 v3，推荐 v3', default: 'v3' },
  ],
  'wechat:open_platform': [
    { key: 'appId', label: 'AppID', hint: '微信开放平台 AppID，登录 open.weixin.qq.com 获取', required: true },
    { key: 'appSecret', label: 'AppSecret', hint: '微信开放平台 AppSecret，在开放平台「管理中心→开发配置」获取', required: true, type: 'password' },
    { key: 'componentAccessToken', label: 'ComponentAccessToken', hint: '第三方平台 component_access_token，用于代公众号/小程序调用接口' },
    { key: 'preAuthCode', label: 'PreAuthCode', hint: '第三方平台预授权码，用于代公众号/小程序授权' },
  ],
  'alipay:default': [
    { key: 'appId', label: 'AppID', hint: '支付宝应用 AppID，在 open.alipay.com 「开发者中心」获取', required: true },
    { key: 'appSecret', label: '应用私钥', hint: '支付宝应用私钥（RSA2），使用支付宝密钥工具生成', required: true, type: 'password' },
    { key: 'alipayPublicKey', label: '支付宝公钥', hint: '支付宝公钥（用于验签），在应用详情「接口加签方式」中获取' },
    { key: 'signType', label: '签名算法', hint: '签名算法类型，推荐 RSA2', default: 'RSA2' },
  ],
  'douyin:default': [
    { key: 'appId', label: 'AppKey', hint: '抖音应用 AppKey，在 open.douyin.com 「开发者后台」获取', required: true },
    { key: 'appSecret', label: 'AppSecret', hint: '抖音应用 AppSecret，在开发者后台「应用详情」获取', required: true, type: 'password' },
    { key: 'paymentMerchantId', label: '支付商户号', hint: '抖音支付商户号（如需支付功能），在抖音支付商户后台获取' },
    { key: 'paymentSalt', label: '支付Salt', hint: '抖音支付 Salt（如需支付功能），在商户后台「开发配置」获取', type: 'password' },
    { key: 'paymentToken', label: '支付Token', hint: '抖音支付 Token（如需支付功能），用于支付回调验证', type: 'password' },
  ],
}
```

## 表单交互

1. 用户先选择 platform（微信/支付宝/抖音）
2. 选择 platform 后，appType 联动（微信有3种：official_account/mini_program/open_platform；支付宝/抖音只有 default）
3. 选择完 platform+appType 后，动态渲染对应字段，每个字段带 hint 和默认值
4. 通用字段（enabled、requireAuth）始终显示
5. 保存时，schema 字段（platform/appType/appId/appSecret/enabled/requireAuth）直接提交，其他字段合并到 extraConfig

## 数据流

- **加载**：从后端读取配置，schema 字段直接映射到 form，extraConfig 中的字段按 key 映射到 form
- **保存**：schema 字段直接提交，动态字段合并为 extraConfig JSON 提交

## 通用字段（始终显示）

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | switch | 是否启用此配置 |
| requireAuth | switch | 是否需要用户授权 |

## 影响范围

- 仅修改 `E:\code\web\pages\third\config-form.vue`
- 后端无需改动（schema 和 API 已支持）
