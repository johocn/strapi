# config-form 默认值修复 & 授权作用域冲突解决

## 问题

1. **编辑时 appId/appSecret 默认值为空**：PLATFORM_FIELDS 中 appId/appSecret 与 schema 字段重复，loadDetail 中 fields.forEach 用 `ec[field.key]`（extraConfig 中无 appId）覆盖了之前从 schema 赋的值
2. **授权作用域冲突**：后台选 `snsapi_base`（静默授权），C端需要 `snsapi_userinfo`（获取昵称头像），无法兼顾

## 方案

### 修复1：PLATFORM_FIELDS 移除 schema 重复字段

- 从所有 PLATFORM_FIELDS 组合中删除 `appId`/`appSecret` 条目
- 新增 `PLATFORM_HINTS` 映射，按 `platform:appType` 提供 appId/appSecret 的 hint 文案
- 模板中在"平台配置"区域前，固定渲染 appId/appSecret 输入框，hint 从 PLATFORM_HINTS 取

### 修复2：oauthScope 拆分为双字段

- `oauthScope`：后台默认授权作用域（picker：snsapi_base / snsapi_userinfo）
- `authUpgrade`：C端授权升级开关（switch，默认关闭），仅 oauthScope=snsapi_base 时显示

C端逻辑：
```
if oauthScope === 'snsapi_base' && authUpgrade === true:
  → 首次静默获取 openid，需要用户信息时自动重定向 snsapi_userinfo
else:
  → 直接使用 oauthScope 指定的作用域
```

管理员三种选择：
- 静默 + 关闭升级 = 纯静默
- 静默 + 开启升级 = 静默优先，需要时自动升级
- snsapi_userinfo = 直接弹窗授权

## 改动文件

- `web/pages/third/config-form.vue`：PLATFORM_FIELDS 移除 appId/appSecret、新增 PLATFORM_HINTS、oauthScope 改 picker + authUpgrade switch、loadDetail 修复
