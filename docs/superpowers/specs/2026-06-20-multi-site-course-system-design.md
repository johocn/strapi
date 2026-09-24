# 多站点课程系统配置手册

## 目标

在同一服务器上部署两套课程系统，使用两个子域名，共享同一 Strapi 实例和数据库，实现：
- 站点信息不同（名称、logo、描述）
- 认证模式不同（一个本地登录，一个微信登录/SSO）
- 功能开关不同（积分、支付等）
- 课程数据独立（各自课程、课时、知识点）

## 架构

```
a.example.com ──┐
                ├──► Nginx ──► Strapi (:1337)
b.example.com ──┘         │
                           ├── 站点识别中间件：Host → siteId
                           ├── siteId → root channel 映射
                           └── 课程查询自动按 channelScope 过滤
```

## 核心设计

### 1. 站点识别中间件

**位置**：`zhao-common/server/src/middlewares/site-resolver.ts`

**职责**：
- 读取请求 `Host` 头
- 查询 `site-config` 表匹配 `domain` 字段
- 将 `siteId` 和 `siteChannelId` 注入 `ctx.state`

**逻辑**：
```
请求进入 → 读取 ctx.request.header.host
         → 去除端口号
         → 查 site-config 表 where domain = host
         → 找到 → ctx.state.siteId = record.id, ctx.state.siteChannelId = record.channel.id
         → 未找到 → 使用默认站点（第一条记录）
```

**注册**：在 `zhao-common/bootstrap.ts` 中 `strapi.server.use()` 注册为全局 Koa 中间件，位于认证中间件之前。

### 2. site-config 改造

**当前**：单例（只有一条记录）

**改造后**：多实例，新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `domain` | string (unique) | 绑定域名，如 `a.example.com` |
| `channel` | relation → channel | 关联的 root channel |

**extraConfig JSON** 保持不变，仍存储 authMode / featureFlags 等。

### 3. 课程数据隔离

**已有机制**：课程 content-type 已有 `channelScope` + `channelIds` 字段

**隔离方式**：
- 每个站点创建一个 root channel（如 code: `site-a`）
- 站点 A 的课程设置 `channelScope: "specific"`, `channelIds: [siteA_channelId]`
- 站点 B 的课程设置 `channelScope: "specific"`, `channelIds: [siteB_channelId]`
- `has-channel-scope` 策略已有，自动按用户 channel 过滤

**C端公开课程**：`has-channel-scope` 策略在游客模式下设置 `isGuest: true`，需增加站点维度过滤——公开课程查询时根据 `ctx.state.siteChannelId` 过滤。

### 4. 公开配置按站点返回

**当前**：`getPublicConfig()` 返回唯一站点配置

**改造后**：`getPublicConfig()` 读取 `ctx.state.siteId`，返回对应站点的配置

**实现**：
- `site-config` service 的 `getConfig()` 改为接受 `siteId` 参数
- controller 从 `ctx.state.siteId` 取值传入

### 5. 三方配置按站点隔离

`third-party-config` 新增 `site` 字段（relation → site-config），查询时按 `ctx.state.siteId` 过滤。

不同站点可配置不同的微信 AppID、不同的认证模式。

## 前端配置

### shao（C端）

**无需代码改动**。请求自动带 `Host` 头，后端按域名返回对应站点配置。

部署时需配置：
- `services/api.ts` 中 `BASE_URL` 改为相对路径或按域名动态获取
- 微信 H5 授权的 `redirectUri` 使用对应域名

### web（后台管理）

**无需代码改动**。管理后台通过域名访问，自动关联对应站点。

## Nginx 配置

```nginx
# 两套课程系统共用一个 Nginx server 块
server {
    listen 80;
    server_name a.example.com b.example.com;

    # Strapi API
    location /api/ {
        proxy_pass http://127.0.0.1:1337/api/;
        proxy_set_header Host $host;           # 关键：传递原始域名
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strapi Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:1337/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # C端前端 (shao)
    location / {
        root /var/www/shao;
        try_files $uri $uri/ /index.html;
    }

    # 后台管理前端 (web)
    location /manage/ {
        alias /var/www/web/;
        try_files $uri $uri/ /manage/index.html;
    }
}

# HTTPS 配置（生产环境必须）
server {
    listen 443 ssl http2;
    server_name a.example.com b.example.com;

    ssl_certificate     /etc/ssl/certs/example.com.pem;
    ssl_certificate_key /etc/ssl/certs/example.com.key;

    # 同上 location 配置...
}
```

## 数据初始化步骤

### 1. 创建 root channel

```sql
-- 站点 A 的 root channel
INSERT INTO zhao_channels (name, code, "channelTier", status, path, depth)
VALUES ('站点A', 'site-a', 'root', true, '/1', 0);

-- 站点 B 的 root channel
INSERT INTO zhao_channels (name, code, "channelTier", status, path, depth)
VALUES ('站点B', 'site-b', 'root', true, '/2', 0);
```

### 2. 创建 site-config

通过 Strapi Admin 或 API 创建两条 site-config 记录：

**站点 A**：
```json
{
  "siteName": "站点A名称",
  "domain": "a.example.com",
  "channel": 1,
  "extraConfig": {
    "authMode": "local",
    "thirdPartyEnabled": false,
    "pointsEnabled": true,
    "paymentEnabled": false
  }
}
```

**站点 B**：
```json
{
  "siteName": "站点B名称",
  "domain": "b.example.com",
  "channel": 2,
  "extraConfig": {
    "authMode": "third",
    "wechatMiniProgramEnabled": true,
    "thirdPartyEnabled": true,
    "pointsEnabled": true,
    "paymentEnabled": true
  }
}
```

### 3. 课程数据关联

创建课程时设置：
- `channelScope: "specific"`
- `channelIds: [对应站点的 root channelId]`

### 4. 用户角色分配

用户可属于多个 channel，通过 `role-channel` 授权表控制跨站点访问。

## 改动清单

| 模块 | 文件 | 改动 |
|------|------|------|
| zhao-common | site-config schema | 新增 `domain` (string, unique) + `channel` (relation) |
| zhao-common | site-resolver 中间件 | 新增：域名识别 + ctx.state 注入 |
| zhao-common | bootstrap.ts | 注册 site-resolver 中间件 |
| zhao-common | config service | `getConfig()` / `getPublicConfig()` 支持 siteId 参数 |
| zhao-common | config controller | 从 ctx.state.siteId 取值 |
| zhao-third | third-party-config schema | 新增 `site` (relation → site-config) |
| zhao-course | 课程公开查询 | 按 ctx.state.siteChannelId 过滤 |
| Nginx | 配置文件 | 双域名反代 + Host 头透传 |

## 风险点

1. **site-config 从单例改多实例**：现有数据需迁移（给唯一记录补 domain 字段）
2. **课程公开查询过滤**：当前 `channelScope: "all"` 的课程对所有站点可见，需确认是否需要改为站点隔离
3. **微信 OAuth 回调域名**：不同站点的微信 AppID 不同，回调域名必须与配置一致
4. **管理后台跨站点**：admin 用户可能需要管理两个站点的数据，需通过 channel 权限控制
