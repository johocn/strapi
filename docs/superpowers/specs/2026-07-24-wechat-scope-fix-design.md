# 微信 H5 登录 scope 参数未透传修复设计

- **日期**: 2026-07-24
- **范围**: `strapi`（zhao-third 插件后端）
- **状态**: 已批准

## 1. 问题

H5 微信登录页有两个按钮：
- "快速登录"：前端传 `scope=snsapi_base`（静默授权，无弹窗）
- "完善资料登录"：前端传 `scope=snsapi_userinfo`（授权弹窗，获取昵称头像）

但后端 `getAuthUrl` 硬编码了 `params.scope`，忽略前端传的 scope，导致两个按钮都发 `snsapi_userinfo`，快速登录不是静默的。

## 2. 根因

| 层 | 问题 |
|---|---|
| 控制器 [third-party-auth.ts:6](file:///d:/zhao/strapi/plugins/zhao-third/server/src/controllers/third-party-auth.ts#L6) | `const { platform, appType, redirectUrl, state } = ctx.request.body` — 没解构 `scope` |
| service [third-party-auth.ts:10](file:///d:/zhao/strapi/plugins/zhao-third/server/src/services/third-party-auth.ts#L10) | `getAuthUrl(platform, appType, redirectUrl, siteId?, state?)` — 签名无 scope 参数 |
| service [third-party-auth.ts:34](file:///d:/zhao/strapi/plugins/zhao-third/server/src/services/third-party-auth.ts#L34) | `params.scope = appType === "official_account" ? "snsapi_userinfo" : "snsapi_login"` — 硬编码 |

## 3. 修复方案（2 处改动）

### 3.1 控制器

```typescript
const { platform, appType, redirectUrl, state, scope } = ctx.request.body;
const result = await authService.getAuthUrl(platform, appType, redirectUrl, siteDocId, state, scope);
```

### 3.2 service

```typescript
async getAuthUrl(platform, appType, redirectUrl, siteId?, state?, scope?) {
  ...
  params.scope = scope || (appType === "official_account" ? "snsapi_userinfo" : "snsapi_login");
}
```

## 4. 效果

- 快速登录 → `snsapi_base` → 微信静默授权（无弹窗）✓
- 完善资料登录 → `snsapi_userinfo` → 微信授权弹窗 ✓
- 前端未传 scope → 回退到原默认值（向后兼容）✓

## 5. 改动文件清单

1. [plugins/zhao-third/server/src/controllers/third-party-auth.ts](file:///d:/zhao/strapi/plugins/zhao-third/server/src/controllers/third-party-auth.ts) — 解构 scope + 传给 service
2. [plugins/zhao-third/server/src/services/third-party-auth.ts](file:///d:/zhao/strapi/plugins/zhao-third/server/src/services/third-party-auth.ts) — getAuthUrl 加 scope 参数，优先用前端值
