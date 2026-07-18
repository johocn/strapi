# 服务器配置手册（Strapi + Vendure 双部署）

本手册描述在**同一台服务器**上部署 Strapi（内容管理）和 Vendure（电商）的完整流程。两个服务共享 PostgreSQL，独立运行，通过 Nginx 反向代理按域名分发。

## 一、部署架构

```
                 ┌──────────────────────────────────────┐
                 │           Nginx (80/443)             │
                 │  按域名分发：                          │
                 │  - admin.joho.cn  → Strapi (1337)    │
                 │  - h.joho.cn      → Strapi (1337)    │
                 │  - shop.joho.cn   → Vendure (3020)   │
                 └────────────┬─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼─────┐         ┌────▼────┐
   │ Strapi  │          │  Vendure  │         │PostgreSQL│
   │ :1337   │          │  :3020    │         │  :5432  │
   │ (pm2)   │          │  (pm2)    │         │         │
   └─────────┘          └───────────┘         └─────────┘
   /www/apps/strapi     /www/apps/vendure      共享：strapi + vendure 库
```

### 端口规划

| 端口 | 服务 | 监听地址 | 说明 |
|------|------|----------|------|
| 80/443 | Nginx | 0.0.0.0 | 对外唯一入口 |
| 1337 | Strapi | 127.0.0.1 | 内容管理 API + Admin |
| 3020 | Vendure | 127.0.0.1 | 电商 API + Dashboard + Admin UI |
| 5432 | PostgreSQL | 127.0.0.1 | 数据库（不对外） |
| 6379 | Redis | 127.0.0.1 | Strapi 队列依赖（不对外） |

### 目录结构

```
/www/
├── sites/                    # 1Panel 站点目录（前端静态资源）
│   ├── admin.joho.cn/        # web 后台管理页面（H5 构建）
│   ├── h.joho.cn/            # shao C 端页面（H5 构建）
│   └── shop.joho.cn/         # vshop 商城前端（H5 构建）
└── apps/                     # 后端应用目录
    ├── strapi/               # Strapi 项目（含 plugins/）
    │   ├── dist/             # Strapi 构建产物
    │   ├── plugins/*/dist/   # 各插件构建产物
    │   ├── config/
    │   ├── .env
    │   └── package.json
    └── vendure/              # Vendure 项目（含预编译产物）
        ├── packages/
        │   ├── core/dist/
        │   ├── admin-ui-plugin/lib/
        │   ├── <业务插件>/lib/
        │   └── dev-server/
        │       ├── dist/     # 入口 + Dashboard 静态资源
        │       ├── prod-start.js
        │       └── .env
        └── build-prod.ps1    # 本地构建脚本
```

---

## 二、环境要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ / Alibaba Cloud Linux | Ubuntu 22.04 LTS |
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB（需严格限制 Node 堆） | 4 GB+ |
| 磁盘 | 40 GB | 100 GB |
| Node.js | `^20.19.0` 或 `>=22.12.0` | 22.x LTS |
| PostgreSQL | 12+ | 14+ |
| Redis | 6.x+ | 7.x |
| 1Panel | 最新版 | 最新版（含 OpenResty/Nginx） |

**2GB 内存服务器特别说明**：Strapi 和 Vendure 同时运行时内存紧张，必须严格按本手册配置 `NODE_OPTIONS=--max-old-space-size=512/768` 和 pm2 `--max-memory-restart`。

---

## 三、安装基础组件

### 3.1 安装 1Panel + OpenResty + PostgreSQL + Redis

参考 [1panel-install.md](1panel-install.md) 完成基础环境安装，本手册不重复。

### 3.2 创建数据库

登录 1Panel → 数据库 → PostgreSQL → 创建数据库：

| 数据库名 | 用户名 | 用途 |
|----------|--------|------|
| `strapi_prod` | `strapi_user` | Strapi 主数据库 |
| `vendure_prod` | `vendure_user` | Vendure 主数据库 |

设置强密码并记录。两个用户互相隔离，禁止跨库访问。

### 3.3 安装 Node.js + pm2

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# 安装 Node.js 22 LTS
nvm install 22
nvm use 22
node -v  # 应输出 v22.x.x

# 安装 pm2（全局）
npm install -g pm2

# 配置 npm 国内镜像（推荐）
npm config set registry https://registry.npmmirror.com
```

---

## 四、部署 Strapi

详细步骤参考 [INSTALL.md](INSTALL.md)。本节仅列关键命令。

### 4.1 克隆与安装

```bash
cd /www/apps
git clone -b main git@github.com:johocn/strapi.git strapi
cd strapi/basic

# 2GB 内存服务器必须加限制
NODE_OPTIONS="--max-old-space-size=1024" npm install --legacy-peer-deps
```

### 4.2 配置环境变量

```bash
cp .env.example .env
vi .env
```

关键配置：
- `DATABASE_PASSWORD`：设为 strapi_user 的密码
- `DATABASE_NAME=strapi_prod`
- `DATABASE_USERNAME=strapi_user`
- `REDIS_HOST=127.0.0.1`、`REDIS_PORT=6379`
- 生成所有 secrets：`APP_KEYS`、`API_TOKEN_SALT`、`ADMIN_JWT_SECRET`、`TRANSFER_TOKEN_SALT`、`ENCRYPTION_KEY`、`JWT_SECRET`（每个用 `openssl rand -base64 32` 生成）
- `INIT_ADMIN_USERNAME`/`INIT_ADMIN_EMAIL`/`INIT_ADMIN_PASSWORD`：生产管理员账号

### 4.3 构建并启动

```bash
# 构建插件 + Strapi
chmod +x scripts/build-plugins.sh
NODE_OPTIONS="--max-old-space-size=1024" ./scripts/build-plugins.sh
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# pm2 启动
pm2 start npm --name strapi -- start
pm2 save
```

首次启动会自动初始化 admin 用户、根渠道、理财公司种子数据（详见 INSTALL.md）。

---

## 五、部署 Vendure

**关键差异**：Vendure 不在服务器上构建，所有产物在本地预编译后提交到 Git，服务器只拉取 + 安装运行时依赖 + 启动。详细说明参考 [vendure/INSTALL.md](../vendure/INSTALL.md)。

### 5.1 克隆仓库

```bash
cd /www/apps
git clone https://github.com/johocn/vendure.git vendure
cd vendure
```

### 5.2 安装运行时依赖（2GB 服务器推荐）

```bash
# 限制堆内存 + 跳过可选依赖和编译脚本（避免 better-sqlite3 OOM）
NODE_OPTIONS="--max-old-space-size=512" npm install --omit=dev --no-optional --ignore-scripts
```

**关键参数说明**：
- `--max-old-space-size=512`：限制 npm 自身堆内存 512MB
- `--omit=dev`：跳过 devDependencies
- `--no-optional`：跳过 optionalDependencies（含 sharp 平台二进制，下一步补装）
- `--ignore-scripts`：跳过 postinstall（避免触发 better-sqlite3 等原生模块编译）

**4GB+ 内存服务器可简化**：`npm install --omit=dev`

### 5.3 补装 sharp 平台二进制（必须）

步骤 5.2 用 `--no-optional` 跳过了 sharp 的 linux-x64 二进制，asset-server-plugin 依赖 sharp 做图像处理：

```bash
npm install --os=linux --cpu=x64 @img/sharp-linux-x64
node -e "require('sharp'); console.log('sharp OK')"  # 验证输出 sharp OK
```

### 5.4 配置环境变量

```bash
cp packages/dev-server/.env.example packages/dev-server/.env
vi packages/dev-server/.env
```

关键配置：

```env
# 数据库（使用步骤 3.2 创建的 vendure_user）
DB=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=vendure_user
DB_PASSWORD=<vendure_user 密码>
DB_NAME=vendure_prod

# API 端口（与 Strapi 1337 不冲突）
API_PORT=3020

# 生产环境必须关闭调试旁路
DEV_BYPASS_SMS=false
DEV_BYPASS_WECHAT=false
DEV_BYPASS_ALIPAY=false
DEV_BYPASS_DOUYIN=false
```

### 5.5 验证关键产物存在

```bash
ls node_modules/@vendure/core/dist/index.js
ls packages/dev-server/dist/index.js
ls packages/dev-server/dist/index.html
ls packages/dev-server/dist/test-plugins/floor-builder/index.js
```

任何文件缺失说明 Git 拉取不完整，执行 `git pull` 重新拉取。

### 5.6 启动 Vendure

**彻底清理可能残留的 pm2 进程**（重要，避免之前注册的坏进程干扰）：

```bash
pm2 delete vendure 2>/dev/null
pm2 kill
pm2 clear

# 重新注册
pm2 start /www/apps/vendure/packages/dev-server/prod-start.js \
  --name vendure \
  --cwd /www/apps/vendure/packages/dev-server \
  --max-memory-restart 1G \
  --node-args="--max-old-space-size=768"

# 查看日志（看到 "now running on port 3020" 即启动成功）
pm2 logs vendure --lines 80

# 持久化
pm2 save
pm2 startup
```

**关键点**：
- script 用**绝对路径**（`/www/apps/vendure/packages/dev-server/prod-start.js`）
- `--cwd` 指向 `packages/dev-server`（让 dotenv 找到 `.env`，让 `require('./dist/index')` 能解析）

启动成功后日志输出：

```
Vendure server (v3.6.4) now running on port 3020
Shop API:       http://localhost:3020/shop-api
Admin API:      http://localhost:3020/admin-api
Dashboard UI:   http://localhost:3020/dashboard
Admin UI:       http://localhost:3020/admin
```

### 5.7 验证服务

```bash
# 本机测试 API
curl http://127.0.0.1:3020/health
curl -X POST http://127.0.0.1:3020/shop-api -H "Content-Type: application/json" -d '{"query":"{__typename}"}'

# pm2 状态
pm2 status
```

---

## 六、Nginx 站点配置

在 1Panel 中为每个域名创建站点，根目录指向 `/www/sites/<域名>/index`。下面是各站点的 Nginx 配置。

### 6.1 admin.joho.cn（Strapi 后台管理）

**根目录**: `/www/sites/admin.joho.cn/index`（web 项目 H5 构建产物）

```nginx
server {
    listen 80;
    server_name admin.joho.cn;

    root /www/sites/admin.joho.cn/index;
    index index.html;

    location ^~ /.well-known/acme-challenge {
        allow all;
        root /usr/share/nginx/html;
    }

    # SPA 路由回退
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
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 100m;
    }

    # Strapi Admin 面板
    location /admin/ {
        proxy_pass http://127.0.0.1:1337/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Strapi 上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:1337/uploads/;
        proxy_set_header Host $host;
    }

    access_log /www/sites/admin.joho.cn/log/access.log main;
    error_log /www/sites/admin.joho.cn/log/error.log;
}
```

### 6.2 h.joho.cn（shao C 端）

**根目录**: `/www/sites/h.joho.cn/index`（shao 项目 H5 构建产物）

```nginx
server {
    listen 80;
    server_name h.joho.cn;

    root /www/sites/h.joho.cn/index;
    index index.html;

    location ^~ /.well-known/acme-challenge {
        allow all;
        root /usr/share/nginx/html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # C 端调用 Strapi API
    location /api/ {
        proxy_pass http://127.0.0.1:1337/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100m;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:1337/uploads/;
        proxy_set_header Host $host;
    }

    access_log /www/sites/h.joho.cn/log/access.log main;
    error_log /www/sites/h.joho.cn/log/error.log;
}
```

### 6.3 shop.joho.cn（Vendure 前端 + Admin）

**根目录**: `/www/sites/shop.joho.cn/index`（vshop 项目 H5 构建产物）

```nginx
server {
    listen 80;
    server_name shop.joho.cn;

    root /www/sites/shop.joho.cn/index;
    index index.html;

    location ^~ /.well-known/acme-challenge {
        allow all;
        root /usr/share/nginx/html;
    }

    # vshop SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Vendure Shop API（前端商城调用）
    location /shop-api/ {
        proxy_pass http://127.0.0.1:3020/shop-api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Vendure Admin API（Dashboard/Admin UI 调用）
    location /admin-api/ {
        proxy_pass http://127.0.0.1:3020/admin-api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Vendure Dashboard UI（管理后台新）
    location /dashboard/ {
        proxy_pass http://127.0.0.1:3020/dashboard/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Vendure Admin UI（管理后台旧）
    location /admin/ {
        proxy_pass http://127.0.0.1:3020/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Vendure 静态资源
    location /assets/ {
        proxy_pass http://127.0.0.1:3020/assets/;
        proxy_set_header Host $host;
    }

    access_log /www/sites/shop.joho.cn/log/access.log main;
    error_log /www/sites/shop.joho.cn/log/error.log;
}
```

> **注意**：Vendure 的 Shop API、Admin API、Dashboard、Admin UI 全部监听同一端口 `3020`（由 prod-start.js 启动的单个 NestJS 进程提供），Nginx 通过路径前缀区分反代。

---

## 七、前端部署

### 7.1 web（Strapi 后台管理页面）

```bash
cd E:\code\web
npm install
npm run build:h5
```

构建产物 `E:\code\web\unpackage\dist\build\web\client\` 上传到 `/www/sites/admin.joho.cn/index/`

### 7.2 shao（C 端多组合页面）

```bash
cd E:\code\shao
npm install
npm run build:h5
```

构建产物 `E:\code\shao\unpackage\dist\build\web\client\` 上传到 `/www/sites/h.joho.cn/index/`

### 7.3 vshop（Vendure 商城前端）

```bash
cd E:\code\vshop
npm install
npm run build:h5
```

构建产物 `E:\code\vshop\unpackage\dist\build\web\client\` 上传到 `/www/sites/shop.joho.cn/index/`

---

## 八、SSL 配置

### 8.1 申请 SSL 证书（1Panel 操作）

1. 登录 1Panel → 站点 → 选择站点 → SSL
2. 选择 Let's Encrypt → 自动申请证书
3. 开启强制 HTTPS 跳转

### 8.2 SSL 配置示例（admin.joho.cn）

```nginx
server {
    listen 80;
    server_name admin.joho.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name admin.joho.cn;

    ssl_certificate /www/sites/admin.joho.cn/ssl/fullchain.pem;
    ssl_certificate_key /www/sites/admin.joho.cn/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... 其余 location 配置同 HTTP（见 6.1）
}
```

其他站点同理。

---

## 九、运维命令

### 9.1 pm2 进程管理

```bash
# 查看所有进程
pm2 status

# 查看 Strapi 日志
pm2 logs strapi --lines 100

# 查看 Vendure 日志
pm2 logs vendure --lines 100

# 重启 Strapi
pm2 restart strapi

# 重启 Vendure
pm2 restart vendure

# 持久化进程列表（服务器重启后自动恢复）
pm2 save
pm2 startup
```

### 9.2 更新代码

```bash
# 更新 Strapi
cd /www/apps/strapi/basic
git pull
NODE_OPTIONS="--max-old-space-size=1024" ./scripts/build-plugins.sh
NODE_OPTIONS="--max-old-space-size=1024" npm run build
pm2 restart strapi

# 更新 Vendure（无需服务器构建，产物已随 Git 提交）
cd /www/apps/vendure
git pull
pm2 restart vendure
```

### 9.3 数据库备份

```bash
# Strapi 数据库备份
pg_dump -h localhost -U strapi_user strapi_prod > /backup/strapi_$(date +%Y%m%d).sql

# Vendure 数据库备份
pg_dump -h localhost -U vendure_user vendure_prod > /backup/vendure_$(date +%Y%m%d).sql

# 定时任务（crontab -e）
0 3 * * * pg_dump -h localhost -U strapi_user strapi_prod > /backup/strapi_$(date +\%Y\%m\%d).sql
0 4 * * * pg_dump -h localhost -U vendure_user vendure_prod > /backup/vendure_$(date +\%Y\%m\%d).sql
```

### 9.4 日志查看

```bash
# Nginx 访问日志
tail -f /www/sites/admin.joho.cn/log/access.log
tail -f /www/sites/shop.joho.cn/log/access.log

# Nginx 错误日志
tail -f /www/sites/shop.joho.cn/log/error.log

# pm2 日志文件位置
ls ~/.pm2/logs/
```

---

## 十、常见问题

### 10.1 Vendure: `npm install` 报 `ENOENT: directory not empty, rename ... @eslint/eslintrc`

**原因**：之前安装残留了嵌套 `packages/*/node_modules`。

**解决**：彻底清理所有层级的 node_modules：

```bash
cd /www/apps/vendure
find . -name "node_modules" -type d -prune -exec rm -rf {} +
rm -f package-lock.json packages/*/package-lock.json
npm cache clean --force
NODE_OPTIONS="--max-old-space-size=512" npm install --omit=dev --no-optional --ignore-scripts
```

### 10.2 Vendure: `npm install` 报 `gyp ERR! better-sqlite3` 编译失败

**原因**：未加 `--ignore-scripts`，触发了 better-sqlite3 编译，服务器 Python 版本过低。

**解决**：必须加 `--ignore-scripts`（见 5.2）。生产用 PostgreSQL 不需要 better-sqlite3。

### 10.3 Vendure: 启动报错 `Could not load the "sharp" module using the linux-x64 runtime`

**原因**：`--no-optional` 跳过了 sharp 平台二进制。

**解决**：补装（见 5.3）：

```bash
npm install --os=linux --cpu=x64 @img/sharp-linux-x64
```

### 10.4 Vendure: 启动报错 `Cannot find module '/www/apps/vendure'`

**原因**：pm2 之前注册的进程入口指向了目录而非 `prod-start.js` 文件。

**解决**：彻底清理 pm2 并用正确参数重新注册（见 5.6）：

```bash
pm2 delete vendure 2>/dev/null
pm2 kill
pm2 clear

pm2 start /www/apps/vendure/packages/dev-server/prod-start.js \
  --name vendure \
  --cwd /www/apps/vendure/packages/dev-server \
  --max-memory-restart 1G \
  --node-args="--max-old-space-size=768"
```

### 10.5 Vendure: 启动报错 `Cannot find module './test-plugins/floor-builder'`

**原因**：dev-config.ts 静态引用了开发演示插件。

**解决**：产物已包含 `dist/test-plugins/` 目录。如仍报错确认 Git 拉取完整：

```bash
ls packages/dev-server/dist/test-plugins/floor-builder/index.js
```

不存在则 `git pull` 重新拉取。生产模式下这 3 个插件通过 `IS_PROD` 标志自动跳过加载，但静态 import 仍需文件存在以通过 require 解析。

### 10.6 Vendure: 启动报错 `ENOENT: ... scandir 'email-plugin/templates/partials'`

**原因**：`__dirname` 在 prod 模式下是 `packages/dev-server/dist`，相对路径解析错误。

**解决**：dev-config.ts 已引入 `devServerDir` 变量统一解析路径。确认代码为最新版本：

```bash
git pull
pm2 restart vendure
```

### 10.7 Vendure: Dashboard 显示「Build your dashboard or run in development mode」

**原因**：`packages/dev-server/dist` 缺少 Dashboard 静态资源（index.html / assets/）。

**解决**：本地执行 `.\build-prod.ps1` 重新构建并 `git push`，服务器 `git pull` 后重启。

### 10.8 Vendure: 内存不足导致启动失败

**原因**：Node.js 默认堆内存不足。

**解决**：启动时指定堆内存（2GB 服务器推荐 768MB）：

```bash
pm2 restart vendure --node-args="--max-old-space-size=768"
```

### 10.9 Vendure: 第三方登录/支付不生效

**原因**：`.env` 中 `DEV_BYPASS_*=true` 未关闭，或租户配置中心未配置 Channel 级密钥。

**解决**：
1. 确认 `packages/dev-server/.env` 中所有 `DEV_BYPASS_*` 为 `false`
2. 登录 Dashboard → Settings → Channels → 选择 Channel → 滚动到「租户配置中心」配置支付/微信登录/SSO/地图密钥

### 10.10 Strapi: `npm install` 被系统杀死（OOM）

**原因**：服务器内存不足。

**解决**：
1. 加 `NODE_OPTIONS="--max-old-space-size=1024"`
2. 配置 npm 国内镜像：`npm config set registry https://registry.npmmirror.com`
3. 临时增加 swap（见 1panel-install.md 第九章 9.5 节）

### 10.11 端口冲突

```bash
# 查看端口占用
netstat -tlnp | grep -E ':1337|:3020|:5432|:6379'

# 杀掉占用进程
kill -9 $(lsof -ti:1337)
kill -9 $(lsof -ti:3020)
```

---

## 十一、服务访问地址

部署完成后（替换 `<服务器IP>` 或使用域名）：

| 服务 | 地址 | 说明 |
|------|------|------|
| Strapi API | https://admin.joho.cn/api/ | 内容管理 API |
| Strapi Admin | https://admin.joho.cn/admin/ | Strapi 管理后台 |
| web 后台管理 | https://admin.joho.cn/ | Strapi 后台管理 H5 |
| shao C 端 | https://h.joho.cn/ | Strapi C 端 H5 |
| Vendure Shop API | https://shop.joho.cn/shop-api/ | 商城 API |
| Vendure Admin API | https://shop.joho.cn/admin-api/ | 管理 API |
| Vendure Dashboard | https://shop.joho.cn/dashboard/ | 新版管理后台 |
| Vendure Admin UI | https://shop.joho.cn/admin/ | 旧版管理后台 |
| Vendure 资源 | https://shop.joho.cn/assets/ | 静态资源 |
| vshop 商城前端 | https://shop.joho.cn/ | 商城 H5 |

**默认管理员账号**：
- Strapi：通过 `.env` 的 `INIT_ADMIN_*` 配置
- Vendure：`superadmin` / `superadmin`（首次登录后立即修改）

---

## 十二、安全建议

1. **修改默认密码**：部署后立即修改 Strapi 和 Vendure 的管理员密码
2. **配置防火墙**：仅开放 80/443 端口，1337/3020/5432/6379 仅监听 127.0.0.1
3. **启用 SSL**：所有站点强制 HTTPS（1Panel 一键申请 Let's Encrypt）
4. **定期备份**：配置 PostgreSQL 自动备份（见 9.3）
5. **更新系统**：定期 `apt update && apt upgrade` 修复安全漏洞
6. **pm2 监控**：`pm2 monit` 实时监控内存/CPU，配置告警
7. **日志轮转**：pm2 默认自动轮转日志，1Panel 也会轮转 Nginx 日志

---

## 十三、架构备注

### Strapi 部分

- **多租户**：通过 `zhao-channel` 插件实现三级渠道（平台根渠道 → 子渠道 → 孙渠道），每个渠道对应一个租户
- **插件体系**：14 个自定义插件位于 `basic/plugins/`，构建产物在 `plugins/*/dist/`
- **自动初始化**：首次启动自动创建 admin 用户、根渠道、理财公司种子数据
- **数据库**：Strapi 自己管理 schema（`synchronize` 由 Strapi 配置控制）

### Vendure 部分

- **多租户**：每个 Channel 即一个租户，租户级配置（支付、登录、地图）存储在 Channel 的 customFields（`authConfig`/`payConfig`/`mapConfig`），敏感字段 AES-256-GCM 加密存储
- **Dashboard 入口**：统一配置中心以 pageBlock 形式注入到 Channel 详情页（位于 custom-fields 区块下方），非左侧独立菜单
- **数据库同步**：`synchronize=true` 已开启，schema 变更自动应用，无需手动 migration
- **开发演示插件**：dev-config.ts 引用的 ReviewsPlugin、FloorBuilderPlugin、NavModifierPlugin 仅用于本地开发，生产模式自动跳过加载（通过 `IS_PROD` 标志 + `devOnlyPlugins` 数组实现）
- **路径解析**：dev-config.ts 中所有资源路径统一使用 `devServerDir` 变量，兼容 dev 模式（`__dirname = packages/dev-server`）和 prod 模式（`__dirname = packages/dev-server/dist`）
- **预编译产物**：所有 `dist/` 和 `lib/` 目录已提交到 Git，服务器无需构建，通过 `build-prod.ps1` 在本地构建后推送
