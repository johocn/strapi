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
- **本地构建，服务器直接运行**：所有后端在本地 `npm run build` 后提交 dist/build，服务器 `git pull` 后直接运行
- **前端通过 1Panel 网站管理**：4 个前端仓库在服务器 git clone，1Panel 添加网站指向对应 dist 目录，SSL/域名由面板管理
- **仅暴露 80/443**：所有服务通过 Nginx（1Panel 内置 OpenResty）反向代理
- **低内存占用**：2G 内存下 Strapi + Vendure + PostgreSQL + Redis 稳定运行

### 1.3 原则
- 后端（Strapi + Vendure）用 PM2 管理进程，Docker 仅用于 PostgreSQL + Redis
- `.gitignore` 允许 `dist/` 和 `build/` 提交到 git
- 服务器 `git pull` + `npm ci --production` 后直接运行，不做任何编译/构建
- 4 个前端仓库在服务器 clone，1Panel 网站面板管理域名和 SSL

## 2. 仓库与远程关系

| 本地目录 | GitHub 远程 | 服务器部署路径 | 运行方式 |
|---------|-----------|--------------|---------|
| `E:\code\basic` | `git@github.com:johocn/strapi.git` | `/opt/joho/strapi/` | PM2 Node.js |
| （独立仓库） | `git@github.com:johocn/vendure.git` | `/opt/joho/vendure/` | PM2 Node.js |
| （独立仓库） | `git@github.com:johocn/vshop.git` | `/opt/joho/vshop/` | 1Panel 网站指向 `vshop/dist/` |
| （独立仓库） | `git@github.com:johocn/shop.git` | `/opt/joho/shop/` | 1Panel 网站指向 `shop/dist/` |
| （独立仓库） | `git@github.com:johocn/site.git` | `/opt/joho/site/` | 1Panel 网站指向 `site/dist/` |
| （独立仓库） | `git@github.com:johocn/dsite.git` | `/opt/joho/dsite/` | 1Panel 网站指向 `dsite/dist/` |

## 3. 服务器目录布局

```
/opt/joho/
├── strapi/                    # git clone git@github.com:johocn/strapi.git strapi
│   ├── node_modules/          # npm ci --production（服务器安装）
│   ├── dist/                  # 预构建后提交到 git
│   ├── build/                 # 预构建后提交到 git（需修改 .gitignore）
│   ├── config/                # plugins.ts 使用 resolve: ./plugins/zhao-*
│   ├── plugins/               # 所有 zhao-* 插件（dist 预构建后提交）
│   │   ├── zhao-auth/dist/
│   │   ├── zhao-website/dist/
│   │   └── ...
│   ├── public/uploads/        # 上传文件（持久化，手动创建）
│   ├── .env                   # 从 .env.example 复制后编辑
│   └── package.json
│
├── vendure/                   # git clone git@github.com:johocn/vendure.git vendure
│   ├── node_modules/          # npm ci --production（服务器安装）
│   ├── dist/                  # 预构建后提交
│   ├── assets/                # 上传文件
│   ├── .env                   # 从 vendure 的 .env.example 复制后编辑
│   └── package.json
│
├── vshop/                     # git clone（前端1）
│   └── dist/                  # 1Panel 网站指向此目录
├── shop/                      # git clone（前端2）
│   └── dist/                  # 1Panel 网站指向此目录
├── site/                      # git clone（前端3）
│   └── dist/                  # 1Panel 网站指向此目录
├── dsite/                     # git clone（前端4）
│   └── dist/                  # 1Panel 网站指向此目录
│
├── ecosystem.config.js        # PM2 配置（由 install.sh 生成）
├── strapi.env                 # Strapi 环境变量（手动编辑）
├── vendure.env                # Vendure 环境变量（手动编辑）
├── install.sh                 # 安装脚本
└── nginx-template.conf        # Nginx 配置参考（1Panel 网站配置辅助）
```

## 4. 卡点与解决方案

### 4.1 .gitignore 修改（必须）

当前 `.gitignore` 中 `build` 被忽略，但 Strapi 5 需要 `build/`（admin panel 静态文件）才能启动。

**本地修改 `.gitignore`：**

```diff
 # Strapi
 .env
 license.txt
 exports
 .strapi
-build
+!build/
 .strapi-updater.json
 .strapi-cloud.json
```

**注意**：只改 `basic` 仓库的 `.gitignore`，不影响其他 repo。改完后务必重新 `npm run build` 生成 `build/` 并提交。

### 4.2 插件 dist 必须在本地构建

`strapi build`（即 `npm run build`）依赖于所有插件已构建好 `dist/`。Dockerfile 中使用的是：
```
for plugin in plugins/zhao-*/; do
  npx -y @strapi/sdk-plugin build
done
npm run build
```

**本地首次构建必须执行同样步骤**。详见第 7 节。

### 4.3 Vendure entry point 待确认

PM2 配置中的 `script` 字段需要知道 Vendure 的入口文件。通常为 `dist/index.js` 或 `dist/server.js`。服务器安装时需要先检查再设置。

### 4.4 public/uploads 持久化

`public/uploads/` 在 `.gitignore` 中（`public/uploads/*`），服务器上 git clone 后不会自动创建。安装脚本需要手动创建此目录并设置权限。

### 4.5 服务器 SSH 密钥

`git@github.com:johocn/` 下的仓库均为私有，服务器需要有 GitHub SSH 密钥才能 clone。

## 5. 内存分配方案

### 5.1 内存预算

| 服务 | 类型 | 内存占用 | 说明 |
|------|------|---------|------|
| PostgreSQL | Docker | ~250MB | 1Panel 已安装，shared_buffers=256MB |
| Redis | Docker | ~50MB | 1Panel 已安装，maxmemory=128MB |
| Strapi 5 | PM2 | ~500MB | `--max-old-space-size=800` |
| Vendure | PM2 | ~400MB | `--max-old-space-size=600` |
| PM2 daemon + OS | 系统 | ~200MB | 内核缓存 + pm2 守护进程 |
| **总计** | | **~1.4GB** | 剩余 ~600MB 余量 |

### 5.2 Strapi 优化

1. **数据库连接池**：`config/database.ts` 改为 `pool: { min: 1, max: 5 }`（原 min:2, max:10）
2. **Redis 缓存**：通过 `zhao-channel` 配置 `REDIS_HOST=127.0.0.1`，减少数据库查询
3. **禁用非必需插件**：可在 `config/plugins.ts` 中注释掉 `@strapi/plugin-cloud`（仅与 Strapi Cloud 相关）

### 5.3 PM2 配置

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
      script: 'dist/index.js',   // TODO: 服务器安装时确认 Vendure 实际入口
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

## 6. 域名与 Nginx 配置

### 6.1 子域名规划

| 域名 | 后端监听 | 指向目录 | 备注 |
|------|---------|---------|------|
| `api.joho.cn` | Strapi 127.0.0.1:1337 | — | 后端 API + admin |
| `shop-api.joho.cn` | Vendure 127.0.0.1:3000 | — | 电商后端 API |
| `shop.joho.cn` | — | `/opt/joho/shop/dist/` | 国内电商前端 |
| `cross.joho.cn` | — | `/opt/joho/vshop/dist/` | 跨境电商前端 |
| `course.joho.cn` | — | `/opt/joho/site/dist/` | 课程管理前端 |
| `www.joho.cn` | — | `/opt/joho/dsite/dist/` | 多租户官网 |

### 6.2 1Panel 配置步骤

4 个前端站点直接在 1Panel 面板操作：

1. **网站 → 创建网站** → 选择 "反向代理" 类型
2. 填写域名（如 `shop.joho.cn`）
3. 选择 "静态文件部署" 模式，根目录选择 `/opt/joho/shop/dist/`
4. 1Panel 自动处理 SSL 证书（Let's Encrypt）+ Nginx 配置
5. 重复以上步骤为 `cross.joho.cn`、`course.joho.cn`、`www.joho.cn`

2 个后端站点在 1Panel 创建，但作为 "反向代理" 模式：

1. **网站 → 创建网站** → 选择 "反向代理" 类型
2. 填写域名 `api.joho.cn`，目标地址 `http://127.0.0.1:1337`
3. 填写域名 `shop-api.joho.cn`，目标地址 `http://127.0.0.1:3000`
4. 1Panel 自动生成 OpenResty 配置并申请 SSL 证书

### 6.3 Nginx 关键参数

```nginx
# 后端代理通用配置（在 1Panel 网站设置中配置）
proxy_read_timeout 60s;
proxy_send_timeout 60s;
client_max_body_size 50m;
proxy_set_header X-Forwarded-Proto $scheme;
```

> **重要**：所有 Nginx 配置在 1Panel 面板中修改，不要手动编辑 `/etc/nginx/nginx.conf`。

## 7. 本地构建流程

### 7.1 Git 远程配置

```bash
# 在 E:\code\basic 目录下执行
cd E:\code\basic

# 添加 strapi 远程
git remote add strapi git@github.com:johocn/strapi.git

# 查看所有远程
git remote -v
# strapi  git@github.com:johocn/strapi.git (fetch)
# strapi  git@github.com:johocn/strapi.git (push)
```

### 7.2 构建脚本

在 `E:\code\basic` 下创建 `build-prod.bat`，一键完成所有构建：

```batch
@echo off
chcp 65001 > nul
echo ===== 构建所有插件 =====
cd /d "%~dp0"

for /d %%p in (plugins\zhao-*) do (
    if exist "%%p\package.json" (
        echo [插件] 构建 %%p
        cd "%%p"
        call npx -y @strapi/sdk-plugin build
        if errorlevel 1 (
            echo [警告] %%p 构建失败，使用预编译 dist
        )
        cd "%~dp0"
    )
)

echo ===== 构建 Strapi 应用 =====
call npm run build

echo ===== 构建完成 =====
echo 请确认 dist/ 和 build/ 目录已更新
echo git add -A . && git commit -m "build: rebuild for deploy"
echo git push strapi main
```

### 7.3 推送命令

```bash
git add -A .
git commit -m "build: rebuild for deploy"
git push strapi main
```

## 8. 服务器安装脚本设计

### 8.1 工作方式

`install.sh` 放在服务器 `/opt/joho/` 目录。半自动执行，需要用户参与的步骤会暂停提示。

```
流程图：

用户上传 install.sh 到 /opt/joho/

Step 1: 环境检查
  ├─ Node.js 版本检查 (≥20)
  ├─ npm 可用
  ├─ PM2 安装 (未安装则 npm i -g pm2)
  ├─ Git 可用
  └─ Docker 运行中 (PostgreSQL + Redis 已启动)

Step 2: 创建必要目录
  ├─ /opt/joho/（已有）
  ├─ /var/log/joho/（日志目录）
  └─ /opt/joho/strapi/public/uploads/（上传文件目录）

  【暂停】--> 提示用户添加 SSH 公钥到 GitHub

Step 3: 克隆所有仓库
  ├─ git clone git@github.com:johocn/strapi.git /opt/joho/strapi
  ├─ git clone git@github.com:johocn/vendure.git /opt/joho/vendure
  ├─ git clone git@github.com:johocn/vshop.git /opt/joho/vshop
  ├─ git clone git@github.com:johocn/shop.git /opt/joho/shop
  ├─ git clone git@github.com:johocn/site.git /opt/joho/site
  └─ git clone git@github.com:johocn/dsite.git /opt/joho/dsite
  （已存在则 git pull）

Step 4: 安装生产依赖
  ├─ cd /opt/joho/strapi && npm ci --production --ignore-scripts
  └─ cd /opt/joho/vendure && npm ci --production --ignore-scripts

Step 5: 生成 .env 模板
  ├─ cp /opt/joho/strapi/.env.example /opt/joho/strapi.env
  └─ cp /opt/joho/vendure/.env.example /opt/joho/vendure.env

  【暂停】--> 提示用户编辑 .env 文件：
  nano /opt/joho/strapi.env    # 填写数据库密码、密钥
  nano /opt/joho/vendure.env   # 填写数据库密码

Step 6: PM2 启动
  ├─ 生成 ecosystem.config.js
  ├─ pm2 start /opt/joho/ecosystem.config.js
  └─ pm2 save（设置开机自启）

Step 7: 输出安装结果
  ├─ PM2 进程状态
  ├─ 日志查看命令: tail -f /var/log/joho/strapi-error.log
  ├─ 1Panel 操作指引:
  │   1. 打开 1Panel → 网站 → 创建网站
  │   2. 添加 api.joho.cn → 反向代理 → 127.0.0.1:1337
  │   3. 添加 shop-api.joho.cn → 反向代理 → 127.0.0.1:3000
  │   4. 添加 shop.joho.cn → 静态文件 → /opt/joho/shop/dist/
  │   5. 添加 cross.joho.cn → 静态文件 → /opt/joho/vshop/dist/
  │   6. 添加 course.joho.cn → 静态文件 → /opt/joho/site/dist/
  │   7. 添加 www.joho.cn → 静态文件 → /opt/joho/dsite/dist/
  └─ 1Panel 自动申请 SSL 证书
```

### 8.2 幂等设计

| 操作 | 幂等方式 |
|------|---------|
| 目录已存在 | `mkdir -p` 直接跳过 |
| 仓库已 clone | `git pull` 更新代码 |
| node_modules 已安装 | `npm ci --production` 锁定版本，不会重复下载 |
| PM2 进程已存在 | `pm2 restart` 重载配置，不会重复创建 |
| .env 已存在 | **不覆盖**，仅提示用户检查 |
| 日志文件 | 追加模式，不清除历史 |

## 9. 验收标准

1. `.gitignore` 中 `build` 已改为 `!build/`，`dist/` 和 `build/` 已提交到 `strapi` 远程
2. 本地 `build-prod.bat` 执行成功，Strapi admin panel 可访问
3. 服务器 `install.sh` 执行完毕，PM2 显示 `strapi` 和 `vendure` 两个进程 online
4. 4 个前端仓库已 clone 到对应目录
5. 1Panel 网站管理添加 6 个站点，SSL 证书正常
6. 通过 `api.joho.cn/admin` 可打开 Strapi 后台
7. 服务器重启后 `pm2 status` 和 `docker ps` 自动恢复
8. 磁盘 40G 空间，日志配置 logrotate 自动轮转

## 10. 不做的事

- 不在服务器上用 Docker 运行 Strapi 或 Vendure（仅 PM2 + Node.js）
- 不在服务器上运行 `npm ci` 以外的 npm 命令（绝对不执行 `npm run build`）
- 不修改 `.gitignore` 以外的项目文件（保持与本地一致）
- 不为 4 个前端仓库提供构建脚本——各自独立构建，dist 通过 git pull 或 1Panel 上传更新
- 不配置 CI/CD 流水线
- 不修改 `basic` 仓库的本地文件夹名称（保留 `basic`），仅远程推送名称为 `strapi`
