# 1Panel 服务器部署配置方案

## 目标

在 1Panel 管理的服务器上部署 Strapi 后端 + web 后台管理 + shao C 端，单端口 80 对外，支持多租户域名。

## 约束

- 服务器使用 1Panel 面板管理
- 对外仅开放 80 端口（SSL 时 443）
- 每个租户有自己的域名，在后台租户配置中设置 domain 字段
- C 端使用 shao 目录（UniApp H5），服务租户域名
- 后台管理使用 web 目录，域名 h.joho.cn 固定不变
- 管理权限由 Strapi 登录用户名 + zhao-auth 角色权限控制
- Strapi 提供后台服务（API + Admin 面板）

---

## 1. 整体架构

### 网络拓扑

```
互联网 → :80/:443 → 1Panel OpenResty(Nginx)
                    │
                    ├─ h.joho.cn → /var/www/web/（后台管理静态文件）
                    │              /api → http://127.0.0.1:1337/api
                    │              /admin → http://127.0.0.1:1337/admin
                    │              /uploads → http://127.0.0.1:1337/uploads
                    │
                    ├─ 租户域名A（如 5.joho.cn）→ /var/www/shao/（C端静态文件）
                    │                           /api → http://127.0.0.1:1337/api
                    │                           /uploads → http://127.0.0.1:1337/uploads
                    │
                    ├─ 租户域名B（如 example.com）→ /var/www/shao/（同一份C端静态文件）
                    │                            /api → http://127.0.0.1:1337/api
                    │
                    └─ Strapi 后端：127.0.0.1:1337（PM2 管理，不对外暴露）
```

### 核心设计原则

1. **单一端口**：所有流量走 80 端口（SSL 时 443），Nginx 按 Host 头分发
2. **域名分离**：`h.joho.cn` 固定走后台管理，租户域名走 C 端
3. **静态文件隔离**：web 和 shao 各自独立目录，shao 同一份文件服务所有租户域名
4. **API 统一反代**：所有域名共享同一个 Strapi 后端，通过 Host 头或 `x-site-id` header 识别租户
5. **SSL**：1Panel 内置 Let's Encrypt 自动申请

### 1Panel 中的组件

| 组件 | 1Panel 管理 | 端口 | 备注 |
|---|---|---|---|
| OpenResty (Nginx) | 1Panel 应用商店安装 | 80/443 | 网站反代 + 静态文件托管 |
| Node.js (Strapi) | PM2 管理 | 1337 | 仅 127.0.0.1，不对外暴露 |
| PostgreSQL | 1Panel 应用商店安装 | 5432 | 仅 127.0.0.1 |
| Redis | 1Panel 应用商店安装 | 6379 | 仅 127.0.0.1 |

---

## 2. Nginx 配置方案

### 2.1 后台管理（h.joho.cn）

在 1Panel 中创建静态网站 `h.joho.cn`，手动编辑 Nginx 配置：

```nginx
server {
    listen 80;
    # SSL 启用后追加：
    # listen 443 ssl;
    # ssl_certificate /path/to/h.joho.cn.crt;
    # ssl_certificate_key /path/to/h.joho.cn.key;
    server_name h.joho.cn;

    root /var/www/web;
    index index.html;

    # SPA 前端路由（uniapp H5 history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反代到 Strapi
    location /api/ {
        proxy_pass http://127.0.0.1:1337/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strapi Admin 面板
    location /admin/ {
        proxy_pass http://127.0.0.1:1337/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 文件上传/静态资源
    location /uploads/ {
        proxy_pass http://127.0.0.1:1337/uploads/;
    }
}
```

后台管理权限控制：Strapi admin 面板 `/admin/` 已有认证，web 前端通过 JWT token 鉴权，`zhao-auth` policy 校验角色权限。

### 2.2 C 端（租户域名，通配配置）

在 1Panel 中创建静态网站（默认站点），或直接用 default_server 匹配所有非 h.joho.cn 的域名：

```nginx
server {
    listen 80 default_server;
    # SSL 启用后追加：
    # listen 443 ssl default_server;
    server_name _;

    root /var/www/shao;
    index index.html;

    # SPA 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反代到 Strapi（租户域名由 site-resolver 中间件通过 Host 头识别）
    location /api/ {
        proxy_pass http://127.0.0.1:1337/api/;
        proxy_set_header Host $host;           # 关键：传递真实租户域名给 site-resolver
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 文件上传/静态资源
    location /uploads/ {
        proxy_pass http://127.0.0.1:1337/uploads/;
    }

    # 租户域名禁止访问 Strapi admin
    location /admin/ {
        return 444;
    }
}
```

### 2.3 租户域名识别链路

1. 用户访问 `5.joho.cn` → Nginx 匹配 default_server
2. shao 前端 `env.ts` 的 `resolveSiteDomain()` 读取 `window.location.hostname` = `5.joho.cn`
3. shao 前端请求 `/api/...`，Nginx 反代到 Strapi，`proxy_set_header Host $host` 传递 `5.joho.cn`
4. Strapi 的 `site-resolver` 中间件读取 `ctx.request.header.host` = `5.joho.cn`
5. 查 `site-config` 表的 `domain` 字段，命中后注入 `ctx.state.siteId`

### 2.4 Nginx 配置管理方式

在 1Panel 中通过 **网站 > 创建网站 > 静态网站** 创建两个站点：
1. `h.joho.cn` → 根目录 `/var/www/web`
2. 默认站点（或通配 `*`）→ 根目录 `/var/www/shao`

创建后手动编辑各自 Nginx 配置追加 `/api`、`/admin`、`/uploads` 反代规则。

SSL 通过 1Panel 的"网站 > SSL > Let's Encrypt"一键申请。

### 2.5 SSL 证书说明

| 域名类型 | SSL 方案 |
|---|---|
| h.joho.cn | 1Panel Let's Encrypt 单域名证书 |
| 租户域名 | 1Panel Let's Encrypt 逐个申请（需 DNS 解析生效后） |
| 通配符证书 | 如租户域名都是 `*.joho.cn` 子域名，可申请通配符证书 |

建议初期 HTTP 跑通后再加 SSL。

---

## 3. Strapi 后端部署

### 3.1 部署目录结构

```
/opt/strapi/                    # Strapi 后端部署目录
├── basic/                      # 从 git 拉取的项目
│   ├── config/
│   ├── src/
│   ├── plugins/                # 13 个 zhao-* 插件
│   ├── dist/
│   ├── .env                    # 生产环境变量
│   ├── package.json
│   └── ...
├── ecosystem.config.js         # PM2 配置
└── logs/                       # 日志目录
```

### 3.2 环境变量（.env 生产配置）

```bash
# Server
HOST=127.0.0.1                 # 仅监听本地，由 Nginx 反代
PORT=1337

# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<强密码>
DATABASE_SSL=false

# Redis（zhao-channel 用）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Strapi Secrets
APP_KEYS=<生成>
API_TOKEN_SALT=<生成>
ADMIN_JWT_SECRET=<生成>
TRANSFER_TOKEN_SALT=<生成>
JWT_SECRET=<生成>

# SMS Provider（zhao-sso 用）
SMS_PROVIDER=mock              # 生产改为 aliyun 或 tencent
SMS_ALIYUN_ACCESS_KEY_ID=
SMS_ALIYUN_ACCESS_KEY_SECRET=
SMS_ALIYUN_SIGN_NAME=
SMS_ALIYUN_TEMPLATE_CODE=
```

### 3.3 PM2 配置（ecosystem.config.js）

```js
module.exports = {
  apps: [{
    name: 'strapi',
    cwd: '/opt/strapi/basic',
    script: 'npm',
    args: 'start',
    instances: 1,                // Strapi 不支持多实例（数据库迁移竞争）
    autorestart: true,
    max_restarts: 10,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/opt/strapi/logs/error.log',
    out_file: '/opt/strapi/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### 3.4 部署命令

```bash
# 1. 拉取代码
cd /opt/strapi
git clone <repo-url> basic
cd basic

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 构建插件
./scripts/build-plugins.sh

# 4. 构建主项目
npm run build

# 5. 配置环境变量
cp .env.example .env
# 编辑 .env 填入生产配置

# 6. 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # 设置开机自启
```

### 3.5 前端部署

```bash
# 后台管理（web）
# HBuilderX 构建 H5 → unpackage/dist/build/h5/
# 上传到 /var/www/web/

# C 端（shao）
# HBuilderX 构建 H5 → unpackage/dist/build/h5/
# 上传到 /var/www/shao/
```

前端生产环境配置：
- web `env.js`：`BASE_API='/api'`（同源）— 已正确配置
- shao `env.ts`：需将默认值从 `http://localhost:1337/api` 改为 `/api`

### 3.6 1Panel 组件安装

| 组件 | 安装方式 | 端口 | 备注 |
|---|---|---|---|
| OpenResty | 1Panel 应用商店 | 80/443 | 网站反代 + 静态文件 |
| PostgreSQL | 1Panel 应用商店 | 5432 | 绑定 127.0.0.1 |
| Redis | 1Panel 应用商店 | 6379 | 绑定 127.0.0.1 |
| Node.js | 1Panel 运行环境或 nvm | - | PM2 全局安装 |

---

## 4. 安全措施

| 层面 | 措施 |
|---|---|
| 端口隔离 | Strapi(1337)/PG(5432)/Redis(6379) 仅监听 127.0.0.1，不对外暴露 |
| Strapi Admin | `/admin/` 仅通过 h.joho.cn 访问，租户域名返回 444 |
| 后台管理权限 | Strapi admin 用户名 + 密码登录，zhao-auth 角色权限控制 |
| C 端权限 | shao 前端通过 JWT token 鉴权，租户隔离由 site-resolver 保证 |
| 数据库 | PostgreSQL 强密码，1Panel 管理的实例默认绑定 127.0.0.1 |
| Redis | 1Panel 管理的实例默认绑定 127.0.0.1，建议设置 requirepass |

---

## 5. 新增租户流程

```
1. DNS 配置：新租户域名（如 tenant.com）A 记录指向服务器 IP
        ↓
2. 1Panel 网站：在 OpenResty 中为新域名创建站点（或依赖 default_server 自动匹配）
        ↓
3. SSL（可选）：1Panel 为新域名申请 Let's Encrypt 证书
        ↓
4. 后台配置：h.joho.cn 登录 → 系统设置 → 站点配置 → 新增
   填写：siteName / domain=tenant.com / template / featureFlags
        ↓
5. 验证：浏览器访问 tenant.com，shao 前端加载，API 请求自动识别租户
```

无需改 Nginx：default_server 通配匹配所有未明确配置的域名。若需独立 SSL 或独立日志，则在 1Panel 中单独创建站点。

---

## 6. 部署脚本

```bash
#!/bin/bash
set -e

# ===== 配置区 =====
SSH_USER="root"
SSH_HOST="你的服务器IP"
REMOTE_DIR="/opt/strapi/basic"
WEB_DIST="/var/www/web"
SHAO_DIST="/var/www/shao"

# ===== 后端部署 =====
echo ">>> 部署后端..."
ssh $SSH_USER@$SSH_HOST << 'EOF'
  cd /opt/strapi/basic
  git pull origin main
  npm install --legacy-peer-deps
  ./scripts/build-plugins.sh
  npm run build
  pm2 restart strapi
  echo ">>> 后端部署完成"
EOF

# ===== 前端部署（web 后台） =====
echo ">>> 部署后台管理..."
scp -r e:/code/web/unpackage/dist/build/h5/* $SSH_USER@$SSH_HOST:$WEB_DIST/

# ===== 前端部署（shao C端） =====
echo ">>> 部署 C 端..."
scp -r e:/code/shao/unpackage/dist/build/h5/* $SSH_USER@$SSH_HOST:$SHAO_DIST/

echo ">>> 全部部署完成"
```

---

## 7. 日常运维命令

```bash
# 查看状态
pm2 status
pm2 logs strapi --lines 50

# 重启
pm2 restart strapi

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 8. 改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `shao/utils/env.ts` | 修改 | BASE_API 默认值从 `http://localhost:1337/api` 改为 `/api` |
| `docs/deployment/nginx-h-joho-cn.conf` | 新建 | 后台管理 Nginx 配置示例 |
| `docs/deployment/nginx-tenant-default.conf` | 新建 | 租户域名 Nginx 配置示例 |
| `docs/deployment/ecosystem.config.js` | 新建 | PM2 配置 |
| `docs/deployment/env.production.template` | 新建 | 生产环境变量模板 |
| `docs/deployment/README.md` | 新建 | 完整部署步骤 |

不改动：`web/src/config/env.js`（已正确配置）、`basic/config/server.ts`（HOST 通过 .env 控制）

---

## Self-Review

### 1. Placeholder 扫描
- 无 TBD/TODO，所有配置和流程完整

### 2. 内部一致性
- Nginx 反代目标 127.0.0.1:1337 与 .env 的 HOST=127.0.0.1 PORT=1337 一致
- 租户域名识别链路完整：Nginx Host header → site-resolver → siteId
- 前端 BASE_API='/api' 与 Nginx /api/ 反代一致
- shao env.ts 需改为 /api，与 web env.js 一致

### 3. 范围检查
- 部署方案独立完整，无代码逻辑变更（仅 env.ts 默认值调整）
- 部署文档为新建文件，不影响现有代码

### 4. 歧义检查
- "管理权限由登录用户名控制" = Strapi admin 账号 + zhao-auth 角色权限，非 Nginx 层面
- "域名在租户里配置" = 后台站点配置的 domain 字段，非 DNS 层面（DNS 需另外配置）
- 新增租户无需改 Nginx（default_server 通配），但需独立 SSL 时需在 1Panel 中创建站点
