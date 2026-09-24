# 站点通用配置设计

## 概述
在 zhao-common 插件中新增 `site-config` content-type，提供站点通用配置的存储和管理能力。前端新增配置页面，按分组展示各项配置。

## 数据隔离
- 通用站点配置 → zhao-common `site-config`
- 三方登录/支付配置 → zhao-third `third-party-config`（已有）
- 积分配置 → zhao-point `point-config`（已有）

## 后端设计

### Content-Type: `site-config`

单例模式（全局只有一条记录），字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| siteName | string(100) | 站点名称 |
| siteDescription | text | 站点描述 |
| logo | media | 站点 Logo |
| favicon | media | 网站图标 |
| icpNumber | string(50) | 备案号 |
| seoKeywords | string(500) | SEO 关键词 |
| seoDescription | text | SEO 描述 |
| tencentMapKey | string(64) | 腾讯地图 Key |
| shareTitle | string(100) | 分享标题 |
| shareDescription | string(200) | 分享描述 |
| shareImage | media | 分享封面图 |
| customerServiceUrl | string(500) | 客服链接 |
| extraConfig | json | 扩展配置 |

### API 路由

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /v1/admin/site-config | 获取完整配置 | site-config.read |
| PUT | /v1/admin/site-config | 更新配置 | site-config.update |
| GET | /v1/site-config | 公开接口（不含敏感字段） | 无 |

### Service: `site-config`

- `getConfig()` — 获取配置，无记录则返回默认值
- `updateConfig(data)` — 更新配置，无记录则创建
- `getPublicConfig()` — 返回公开字段（siteName, siteDescription, logo, favicon, seoKeywords, seoDescription, shareTitle, shareDescription, shareImage, tencentMapKey, icpNumber, customerServiceUrl）

### 权限

在 zhao-auth 的权限体系中注册：
- `site-config.read` — admin, channel-admin, plugin-manager
- `site-config.update` — admin, channel-admin

## 前端设计

### 页面: `web/pages/settings/site-config.vue`

分组表单：

1. **基本设置** — 站点名称、描述、Logo、Favicon、备案号、客服链接
2. **SEO 设置** — 关键词、描述
3. **地图服务** — 腾讯地图 Key
4. **分享设置** — 分享标题、描述、封面图

页面加载时调用 `GET /admin/site-config`，保存时调用 `PUT /admin/site-config`。

### 前端 API

`web/src/api/site-config.js`:
- `getSiteConfig()` — 获取配置
- `updateSiteConfig(data)` — 更新配置
- `getPublicSiteConfig()` — 公开接口

## 实现步骤

1. zhao-common: 新增 `site-config` content-type schema
2. zhao-common: 新增 `site-config` service
3. zhao-common: 新增 `site-config` controller
4. zhao-common: 注册路由（admin + public）
5. zhao-common: 注册权限
6. 前端: 新增 API 文件
7. 前端: 新增配置页面
8. 前端: 注册路由
