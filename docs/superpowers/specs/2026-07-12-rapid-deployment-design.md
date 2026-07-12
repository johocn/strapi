# 服务器快速安装设计 — Strapi + Vendure + 前端多站点

> 日期：2026-07-12
> 环境：阿里云 2G 内存 / 40G 磁盘 / 1Panel（已 Docker 安装 PostgreSQL + Redis）
> 域名：多子域名，仅暴露 80/443 端口

## 1. 背景与目标

### 1.1 现状
- 本地开发使用 `E:\code\basic` 目录下的 Strapi 5 项目，包含 12+ 个 `zhao-*` 插件
- Vendure 后端和 4 个前端（vshop/shop/site/dsite）为独立仓库
- 服务器为阿里云 2G 内存、40G 磁盘，已通过 1Panel 安装 Docker 运行 PostgreSQL + Redis
- 现有 Dockerfile 为多阶段构建，但 2G 内存下 Docker 构建 + 运行 Strapi 极易 OOM

### 1.2 目标
- **本地构建，服务器直接运行**：所有后端在本地 `npm run build` 后提交 dist/build，服务器 `git pull` 后直接 `node dist/src/index.js`
- **前端通过 1Panel 上传**：4 个前端静态项目本地构建后上传
- **仅暴露 80/443**：所有服务通过 Nginx（1Panel 内置 OpenResty）反向代理
- **低内存占用**：2G 内存下 Strapi + Vendure + PostgreSQL + Redis 稳定运行

### 1.3 原则
- 后端（Strapi + Vendure）用 PM2 管理进程，Docker 仅用于 PostgreSQL + Redis
- `.gitignore` 允许 `dist/` 和 `build/` 提交到 git
- 服务器 `git pull` + `npm ci --production` 后直接运行，不做任何编译/构建
- 4 个前端通过 1Panel 网站管理界面直接上传静态文件

## 2. 仓库与远程关系

| 本地目录 | GitHub 远程 | 服务器部署路径 | 部署方式 |
|---------|-----------|--------------|---------|
| `E:\code\basic` | `git@github.com:johocn/strapi.git` | `/opt/joho/strapi/` | git clone |
| （独立仓库） | `git@github.com:johocn/vendure.git` | `/opt/joho/vendure/` | git clone |
| （独立仓库） | `git@github.com:johocn/vshop.git` | `/opt/joho/vshop/dist/` | 1Panel 上传 |
| （独立仓库） | `git@github.com:johocn/shop.git` | `/opt/joho/shop/dist/` | 1Panel 上传 |
| （独立仓库） | `git@github.com:johocn/site.git` | `/opt/joho/site/dist/` | 1Panel 上传 |
| （独立仓库） | `git@github.com:johocn/dsite.git` | `/opt/joho/dsite/dist/` | 1Panel 上传 |

## 3. 服务器目录布局

```
/opt/joho/
├── strapi/                    # git clone git@github.com:johocn/strapi.git strapi
│   ├── node_modules/          # npm ci --production
│   ├── dist/                  # 预构建后提交
│   ├── build/                 # 预构建后提交
│   ├── config/                # 包含 plugins.ts
│   ├── plugins/               # 所有 zhao-* 插件（dist 预构建后提交）
│   │   ├── zhao-auth/dist/
│   │   ├── zhao-website/dist/
│   │   └── ...
│   ├── public/uploads/        # 上传文件（持久化，使用软链接或 NFS）
│   ├── .env                   # 手动配置
│   └── package.json
│
├── vendure/                   # git clone git@github.com:johocn/vendure.git vendure
│   ├── node_modules/          # npm ci --production
│   ├── dist/                  # 预构建后提交
│   ├── assets/                # 上传文件（持久化）
│   ├── .env                   # 手动配置
│   └── package.json
│
├── vshop/dist/                # 1Panel 网站上传
├── shop/dist/                 # 1Panel 网站上传
├── site/dist/                 # 1Panel 网站上传
├── dsite/dist/                # 1Panel 网站上传
│
├── ecosystem.config.js        # PM2 配置文件
├── strapi.env                 # Strapi 环境变量
├── vendure.env                # Vendure 环境变量
├── install.sh                 # 安装脚本
└── nginx-template.conf        # Nginx 配置参考
```

## 4. 内存分配方案

### 4.1 内存预算

| 服务 | 类型 | 内存占用 | 说明 |
|------|------|---------|------|
| PostgreSQL | Docker | ~250MB | shared_buffers=256MB |
| Redis | Docker | ~50MB | maxmemory=128MB, allkeys-lru |
| Strapi 5 | PM2 | ~500MB | --max-old-space-size=800 |
| Vendure | PM2 | ~400MB | --max-old-space-size=600 |
| PM2 daemon + OS | 系统 | ~200MB | 内核缓存 + PM2 守护进程 |
| **总计** | | **~1.4GB** | 剩余 ~600MB 余量应对峰值 |

### 4.2 PM2 配置

```js
// /opt/joho/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: '/opt/joho/strapi',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=800',
        HOST: '127.0.0.1',
        PORT: 1337,
      },
      env_file: '/opt/joho/strapi.env',
      max_memory_restart: '850M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '/var/log/joho/strapi-error.log',
      out_file: '/var/log/joho/strapi-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'vendure',
      cwd: '/opt/joho/vendure',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=600',
        HOST: '127.0.0.1',
        PORT: 3000,
      },
      env_file: '/opt/joho/vendure.env',
      max_memory_restart: '650M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '/var/log/joho/vendure-error.log',
      out_file: '/var/log/joho/vendure-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

### 4.3 Strapi 优化策略

1. **数据库连接池**：`config/database.ts` 中 `pool: { min: 1, max: 5 }`（原为 min:2, max:10）
2. **Redis 缓存**：通过 `zhao-channel` 插件配置 `REDIS_HOST=127.0.0.1`，启用 Redis 缓存
3. **禁用非必需插件**：考虑在服务器上禁用 `@strapi/plugin-cloud`（仅与 Strapi Cloud 相关）

## 5. 本地构建流程

### 5.1 Git 策略调整

当前 `basic/.gitignore` 中 `build` 被忽略。需要在 `strapi` 远程仓库中改为允许提交：

```gitignore
# .gitignore 修改
- build
+ !build/
```

### 5.2 构建命令

每条命令在 `E:\code\basic` 目录下执行：

```bash
# 构建所有插件 dist
for /d %p in (plugins\zhao-*) do (
  if exist "%p\package.json" (
    cd "%p"
    call npx @strapi/sdk-plugin build
    cd ..
  )
)

# 构建 Strapi（TS 编译 + admin panel）
npm run build

# 推送到 strapi 远程
git add .
git commit -m "build: rebuild dist and build for server deploy"
git push strapi main
```

## 6. 服务器安装脚本设计

### 6.1 脚本概要

`install.sh` 放在服务器 `/opt/joho/` 目录下，半自动执行。共 7 步：

```
Step 1: 环境检查
  ├── Node.js >= 20
  ├── npm >= 6
  ├── pm2（未安装则 npm i -g pm2）
  ├── Git 已安装
  └── Docker（PostgreSQL + Redis）已运行

Step 2: 创建目录
  ├── /opt/joho/
  └── /var/log/joho/

Step 3: 克隆后端仓库
  ├── git clone git@github.com:johocn/strapi.git /opt/joho/strapi
  └── git clone git@github.com:johocn/vendure.git /opt/joho/vendure
      （已存在则 git pull 更新）

Step 4: 安装生产依赖
  ├── cd /opt/joho/strapi && npm ci --production --ignore-scripts
  └── cd /opt/joho/vendure && npm ci --production --ignore-scripts

Step 5: 创建 .env 文件
  ├── 从 strapi 的 .env.example 复制生成 /opt/joho/strapi.env
  └── 从 vendure 的 .env.example 复制生成 /opt/joho/vendure.env
      （提示用户手动编辑填写数据库密码和密钥）

Step 6: PM2 启动
  ├── pm2 start /opt/joho/ecosystem.config.js
  └── pm2 save（设置开机自启）

Step 7: 输出结果
  ├── PM2 状态
  ├── 日志查看命令
  ├── Nginx 配置模板说明
  └── 1Panel 前端上传指引
```

### 6.2 幂等设计

- `npm ci --production`：每次执行锁定依赖，不会重复安装
- `git pull`：已有仓库时更新代码，不重新 clone
- `pm2 restart`：进程已存在时重载，不会创建重复进程
- `.env` 已存在则**不覆盖**，仅提示用户检查

### 6.3 需要用户手动操作的部分

1. **SSH 密钥**：提前将服务器 SSH 公钥添加到 GitHub（`git@github.com:johocn/strapi.git` 是私有仓库）
2. **编辑 .env**：脚本生成模板后，提示用户 `nano /opt/joho/strapi.env` 填写实际密钥
3. **1Panel 配置**：4 个前端通过 1Panel 网站界面上传 + Nginx 反向代理配置
4. **Nginx SSL 证书**：通过 1Panel 自动申请 Let's Encrypt 证书

## 7. Nginx 反向代理模板

### 7.1 域名分配

| 域名 | 后端监听 | 前端目录 |
|------|---------|---------|
| `api.joho.cn` | Strapi 127.0.0.1:1337 | — |
| `shop-api.joho.cn` | Vendure 127.0.0.1:3000 | — |
| `shop.joho.cn` | — | `/opt/joho/shop/dist` |
| `vshop.joho.cn` | — | `/opt/joho/vshop/dist` |
| `course.joho.cn` | — | `/opt/joho/site/dist` |
| `www.joho.cn` | — | `/opt/joho/dsite/dist` |

### 7.2 配置模板（按 1Panel 格式）

在 1Panel 网站管理中添加每个站点，分别上传静态文件后，1Panel 自动生成 OpenResty 配置。核心反向代理规则手动添加：

```nginx
# Strapi API（api.joho.cn）
location / {
    proxy_pass http://127.0.0.1:1337;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
    client_max_body_size 50m;
}

# Vendure API（shop-api.joho.cn）
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
    client_max_body_size 50m;
}
```

> 注意：1Panel 的网站管理会自动处理 SSL 证书（Let's Encrypt）和静态文件服务。Nginx 配置文件通过 1Panel 修改，不应手动编辑 OpenResty 的 nginx.conf。

## 8. 验收标准

1. 本地 `npm run build` 完成后，Strapi admin panel 可访问，所有插件正常加载
2. `dist/` 和 `build/` 已提交到 `git@github.com:johocn/strapi.git` 远程
3. 服务器 `install.sh` 执行后，Strapi 和 Vendure 通过 PM2 正常启动
4. `pm2 status` 显示两个进程在线，内存占用在预算范围内
5. 通过子域名 `api.joho.cn/admin` 可访问 Strapi admin
6. 通过子域名 `shop-api.joho.cn` 可访问 Vendure admin API
7. 4 个前端通过所在子域名可正常访问
8. 服务器重启后，PM2 + Docker（PostgreSQL + Redis）自动恢复

## 9. 不做的事

- 不在服务器上用 Docker 运行 Strapi 或 Vendure（仅 PM2 + Node.js）
- 不在服务器上运行 `npm run build` 或 `npx @strapi/sdk-plugin build`
- 不在服务器上配置 CI/CD（仅手动推送 + git pull）
- 不为 Vendure 前端（vshop/shop）提供构建脚本——由各仓库独立构建后上传
- 不处理 Vendure 项目的 `.env` 模板——由其仓库自行提供
- 不修改 `basic` 仓库的本地名称（保持 `basic`），仅远程名为 `strapi`
