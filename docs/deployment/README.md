# 1Panel 服务器安装部署指南

本指南面向运维人员，从零开始描述在全新服务器上安装 1Panel 并部署整个系统（Strapi 后端 + web 后台管理 + shao C 端）的完整步骤。

部署架构：单端口 80（SSL 时 443）对外，Nginx 按 Host 头分发；Strapi/PostgreSQL/Redis 仅监听 127.0.0.1，不对外暴露。

---

## 一、环境要求

| 项目 | 最低配置 | 推荐配置 |
|---|---|---|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ / Debian 10+ | Ubuntu 22.04 LTS |
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 40 GB | 100 GB |

其他要求：
- 需要 root 权限（或具备 sudo 的账号）
- 服务器已开放 80/443 端口（用于 Web 访问）
- 已备案域名并完成 DNS 解析（如 `h.joho.cn` 指向服务器 IP）

---

## 二、安装 1Panel

### 2.1 一键安装命令（官方脚本）

以 root 用户登录服务器，执行官方一键安装脚本：

```bash
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && sudo bash quick_start.sh
```

> 如服务器在中国大陆，安装脚本会自动使用国内镜像源。如需手动指定安装目录，可在脚本提示时输入自定义路径（默认 `/opt`）。

### 2.2 安装过程说明

安装脚本会交互式询问以下信息，按提示输入：

1. **安装目录**：默认 `/opt`，可直接回车采用默认值
2. **面板端口**：自定义一个随机高位端口（如 `38974`），不要使用常见端口
3. **面板用户名**：设置登录用户名（避免使用 `admin`）
4. **面板密码**：设置强密码（建议 16 位以上，含大小写字母、数字、特殊字符）
5. **面板入口**：设置安全入口路径（如 `/mypanel`），访问面板时需带上

安装完成后，终端会输出面板访问地址、用户名、密码和入口，请妥善保存：

```
面板地址: http://<服务器IP>:<端口>/<安全入口>
用户名:   <你设置的用户名>
密码:     <你设置的密码>
```

### 2.3 访问 1Panel 面板

浏览器打开上一步输出的面板地址，使用设置的用户名密码登录。

> 若无法访问，检查服务器安全组/防火墙是否放行了面板端口。

### 2.4 面板初始配置

登录后建议立即完成以下安全配置：

1. **确认安全入口**：面板设置 → 安全 → 确认安全入口已启用（关闭后任何人可直接访问登录页，强烈建议保持开启）
2. **启用 MFA 两步验证**：面板设置 → 安全 → 开启 MFA，绑定 Google Authenticator 或类似 TOTP 应用
3. **修改默认端口**：如安装时使用了常见端口，建议在面板设置中改为随机高位端口
4. **绑定域名（可选）**：面板设置 → 域名，绑定一个二级域名通过 HTTPS 访问面板

---

## 三、安装基础组件

### 3.1 安装 OpenResty (Nginx)

1. 进入 1Panel 面板 → **应用商店**
2. 搜索 `OpenResty`，点击安装
3. 名称保持默认，版本选择最新稳定版，点击确认
4. 等待安装完成（1Panel 会自动以 Docker 容器方式运行 OpenResty，并接管 80/443 端口）

验证安装：

```bash
# 检查 OpenResty 容器运行状态
docker ps | grep openresty

# 测试 Nginx 响应（应返回默认欢迎页 HTML）
curl -I http://127.0.0.1
```

> 安装 OpenResty 后，1Panel 的「网站」菜单才可用。后续所有 Nginx 站点配置均通过 1Panel 网站管理。

### 3.2 安装 PostgreSQL

1. 进入 1Panel 面板 → **应用商店**
2. 搜索 `PostgreSQL`，点击安装
3. 版本选择 14 或 16，设置数据库 root 密码（强密码，妥善保存）
4. 点击确认，等待安装完成

安装完成后创建 strapi 数据库和用户：

**方式一：通过 1Panel 界面（推荐）**

1. 1Panel 面板 → **数据库** → PostgreSQL → 连接管理
2. 创建数据库：名称 `strapi`，字符集 `UTF8`
3. 创建用户并授权：用户名 `strapi`，密码设置强密码，授权访问 `strapi` 数据库

**方式二：命令行**

```bash
# 进入 PostgreSQL 容器
docker exec -it $(docker ps --filter "name=postgresql" -q) psql -U postgres

# 在 psql 提示符下执行：
CREATE DATABASE strapi ENCODING 'UTF8';
CREATE USER strapi WITH ENCRYPTED PASSWORD '替换为强密码';
GRANT ALL PRIVILEGES ON DATABASE strapi TO strapi;
\q
```

> 本文档 `.env` 默认使用 `postgres` 超级用户连接，生产环境建议使用独立的 `strapi` 普通用户。两种方式任选其一，确保 `.env` 中 `DATABASE_USERNAME` / `DATABASE_PASSWORD` 与实际一致即可。

确认绑定 127.0.0.1：

```bash
# 检查端口监听地址，应只监听 127.0.0.1:5432 或容器内部地址，不对外暴露
ss -tlnp | grep 5432
```

> 1Panel 安装的 PostgreSQL 默认仅在 Docker 内部网络监听，不直接对外暴露端口。Strapi 与 PostgreSQL 同机部署时，`DATABASE_HOST=127.0.0.1` 即可连通（1Panel 会自动映射端口到 127.0.0.1）。如不通，在 1Panel 数据库设置中确认端口映射绑定地址为 `127.0.0.1`。

### 3.3 安装 Redis

1. 进入 1Panel 面板 → **应用商店**
2. 搜索 `Redis`，点击安装
3. 版本选择 6 或 7，设置密码（可选但建议设置）
4. 点击确认，等待安装完成

设置密码（可选）：

- 安装时在「密码」栏填入强密码，留空则无密码
- 如安装时未设置，可在 1Panel → 数据库 → Redis → 设置中后续修改 `requirepass`

确认绑定 127.0.0.1：

```bash
# 检查端口监听地址，应仅 127.0.0.1:6379，不对外暴露
ss -tlnp | grep 6379

# 测试连接（无密码）
docker exec -it $(docker ps --filter "name=redis" -q) redis-cli ping
# 应返回 PONG

# 测试连接（有密码）
docker exec -it $(docker ps --filter "name=redis" -q) redis-cli -a 你的密码 ping
```

> 如 Redis 设置了密码，需在 Strapi `.env` 中取消 `REDIS_PASSWORD` 注释并填入密码。

### 3.4 安装 Node.js

Strapi 要求 Node.js `>=20.0.0 <=24.x.x`，推荐 20.x LTS。

**方式一：通过 1Panel 运行环境安装（推荐）**

1. 1Panel 面板 → **网站** → **运行环境** → **Node.js**
2. 点击创建运行环境，选择版本 `20.x` LTS
3. 等待安装完成

**方式二：通过 nvm 安装**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 加载 nvm（或重新登录终端）
source ~/.bashrc

# 安装 Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

全局安装 PM2：

```bash
npm install -g pm2
```

验证 node/npm/pm2 版本：

```bash
node -v    # 应输出 v20.x.x
npm -v     # 应输出 10.x.x
pm2 -v     # 应输出 5.x.x
```

> 如服务器在中国大陆，建议配置 npm 国内镜像加速依赖安装：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm config get registry
> ```

---

## 四、部署 Strapi 后端

### 4.1 拉取代码

```bash
mkdir -p /opt/strapi
cd /opt/strapi
git clone -b main git@github.com:johocn/strapi.git basic
cd basic
```

> 如服务器未配置 GitHub SSH 密钥，可改用 HTTPS 方式：
> ```bash
> git clone -b main https://github.com/johocn/strapi.git basic
> ```

### 4.2 安装依赖

```bash
cd /opt/strapi/basic
npm install --legacy-peer-deps
```

> 所有插件的依赖已合并到项目根目录 `package.json`，只需执行一次安装。`--legacy-peer-deps` 参数必需，用于解决依赖版本冲突。
> 如安装过程中被系统杀死（OOM），说明内存不足，可临时增加 swap（见第九章 9.5 节）。

### 4.3 构建插件

插件的 `dist` 目录被 `.gitignore` 忽略，不会提交到仓库，必须在服务器上构建：

```bash
cd /opt/strapi/basic
chmod +x scripts/build-plugins.sh
./scripts/build-plugins.sh
```

脚本会遍历 `plugins/zhao-*` 目录，逐个调用 `@strapi/sdk-plugin` 构建。完成后输出成功/失败统计，确保所有插件构建成功（失败数为 0）。

### 4.4 构建主项目

```bash
cd /opt/strapi/basic
npm run build
```

> 此步骤消耗内存较大，4GB 以下内存服务器建议先增加 swap。

### 4.5 配置环境变量

```bash
cd /opt/strapi/basic
cp docs/deployment/env.production.template .env
```

编辑 `.env`，填写数据库密码并生成 secrets：

```bash
vi .env
```

需要修改的关键项：

```env
# 数据库密码（与第三章 3.2 节创建用户时设置的密码一致）
DATABASE_PASSWORD=替换为你的数据库密码

# Redis 密码（如设置了密码则取消注释并填写）
# REDIS_PASSWORD=替换为你的redis密码
```

生成 Strapi 所需的 secrets（每个变量都需要单独生成一个）：

```bash
openssl rand -base64 32
```

将生成的值填入 `.env` 的以下变量（每个变量生成一次新的，不要复用）：

- `APP_KEYS`（逗号分隔的多个 key，建议生成 4 个）
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`

> `APP_KEYS` 示例格式：`APP_KEYS="生成的key1,生成的key2,生成的key3,生成的key4"`

根据业务需要，还可配置（可选）：

- `SMS_PROVIDER`：短信服务商（`mock` / `aliyun` / `tencent`），生产环境改为真实服务商
- `ALIYUN_OSS_*`：阿里云 OSS 配置，不配置则使用本地文件存储
- `SSO_REDIRECT_BASE_URL`：SSO 回调地址，生产域名 `https://h.joho.cn`

### 4.6 配置 PM2

```bash
# 复制 PM2 配置文件到部署目录上层
cp /opt/strapi/basic/docs/deployment/ecosystem.config.js /opt/strapi/

# 创建日志目录
mkdir -p /opt/strapi/logs

# 启动 Strapi
cd /opt/strapi
pm2 start ecosystem.config.js

# 保存进程列表（用于开机自启恢复）
pm2 save

# 设置开机自启（按提示执行输出的命令）
pm2 startup
```

> `pm2 startup` 会输出一条形如 `sudo env PATH=... pm2 startup ...` 的命令，复制执行即可完成开机自启配置。

### 4.7 验证后端

```bash
# 健康检查，应返回 {"status":"ok"}
curl http://127.0.0.1:1337/_health

# 查看 PM2 进程状态，strapi 应为 online
pm2 status

# 查看启动日志（确认无报错）
pm2 logs strapi --lines 50
```

首次启动时 Strapi 会自动创建数据库表结构，无需手动迁移。日志中出现 `Server listening on http://127.0.0.1:1337` 即表示启动成功。

---

## 五、配置 Nginx 网站

### 5.1 创建后台管理网站 (h.joho.cn)

1. 1Panel 面板 → **网站** → **创建网站**
2. 选择 **静态网站**
3. 主域名填 `h.joho.cn`
4. 根目录设为 `/var/www/web`
5. 点击确认创建

创建静态文件目录：

```bash
mkdir -p /var/www/web
```

编辑 Nginx 配置：

1. 1Panel 面板 → **网站** → 选择 `h.joho.cn` → **配置** → **Nginx 配置**
2. 将 `docs/deployment/nginx-h-joho-cn.conf` 的完整内容粘贴覆盖原有配置
3. 保存

也可在服务器上直接编辑配置文件（路径通常为 `/www/sites/h.joho.cn/proxy/h.joho.cn.conf`，以 1Panel 实际路径为准），将 `docs/deployment/nginx-h-joho-cn.conf` 内容写入。

重新加载 Nginx：

```bash
nginx -t && nginx -s reload
```

> 该配置包含：SPA 前端路由（`/`）、API 反代（`/api/`）、Strapi Admin 面板反代（`/admin/`）、文件上传反代（`/uploads/`）。

### 5.2 创建 C 端默认网站（租户域名）

1. 1Panel 面板 → **网站** → **创建网站**
2. 选择 **静态网站**
3. 主域名填 `_`（下划线，作为默认站点匹配所有未明确配置的域名），或留空作为默认站点
4. 根目录设为 `/var/www/shao`
5. 点击确认创建

创建静态文件目录：

```bash
mkdir -p /var/www/shao
```

编辑 Nginx 配置：

1. 1Panel 面板 → **网站** → 选择该默认站点 → **配置** → **Nginx 配置**
2. 将 `docs/deployment/nginx-tenant-default.conf` 的完整内容粘贴覆盖原有配置
3. 保存

重新加载 Nginx：

```bash
nginx -t && nginx -s reload
```

> 该配置使用 `listen 80 default_server`，所有非 `h.joho.cn` 的域名都会命中此 server。`/api/` 反代时通过 `proxy_set_header Host $host` 传递真实租户域名给 Strapi 的 `site-resolver` 中间件识别租户。`/admin/` 返回 444，禁止租户域名访问 Strapi 管理面板。

### 5.3 配置 SSL（可选，建议）

生产环境强烈建议启用 HTTPS。

1. 1Panel 面板 → **网站** → 选择 `h.joho.cn` → **SSL** → **Let's Encrypt**
2. 确认 `h.joho.cn` 已 DNS 解析到当前服务器 IP
3. 点击申请，等待签发成功
4. 申请成功后启用「强制 HTTPS」

租户域名的 SSL：

- 如所有租户域名都是 `*.joho.cn` 子域名，可申请一张通配符证书覆盖
- 否则需为每个租户域名逐个申请（需先完成 DNS 解析）
- 申请通配符证书需使用 DNS 验证方式（1Panel 支持）

> 启用 SSL 后，需在 Nginx 配置中取消 `listen 443 ssl` 及 `ssl_certificate` 相关行的注释。1Panel 申请证书后通常自动完成这一步，确认配置中 443 监听已启用即可。

---

## 六、部署前端

### 6.1 构建后台管理 (web)

1. 用 HBuilderX 打开 `e:\code\web`
2. 菜单 → **发行** → **网站-PC Web 或手机 H5**
3. 等待构建完成，构建产物在 `e:\code\web\unpackage\dist\build\h5\`
4. 上传到服务器 `/var/www/web/`

上传方式（任选其一）：

```bash
# 方式一：scp 上传（在本地 Windows 终端执行，需配置 SSH）
scp -r e:/code/web/unpackage/dist/build/h5/* root@<服务器IP>:/var/www/web/

# 方式二：先打包再上传解压
# 本地打包
cd e:\code\web\unpackage\dist\build\h5
tar -czf web-h5.tar.gz *
# 上传后在服务器解压
ssh root@<服务器IP> "rm -rf /var/www/web/*"
scp web-h5.tar.gz root@<服务器IP>:/var/www/web/
ssh root@<服务器IP> "cd /var/www/web && tar -xzf web-h5.tar.gz && rm web-h5.tar.gz"
```

> 确认 `web` 的 API 地址配置 `BASE_API='/api'`（同源，通过 Nginx 反代），无需改动。

### 6.2 构建 C 端 (shao)

1. 用 HBuilderX 打开 `e:\code\shao`
2. 菜单 → **发行** → **网站-PC Web 或手机 H5**
3. 等待构建完成，构建产物在 `e:\code\shao\unpackage\dist\build\h5\`
4. 上传到服务器 `/var/www/shao/`

上传方式同 6.1：

```bash
scp -r e:/code/shao/unpackage/dist/build/h5/* root@<服务器IP>:/var/www/shao/
```

> 确认 `shao` 的 `env.ts` 中 `BASE_API` 默认值为 `/api`（同源，通过 Nginx 反代），租户域名通过 `window.location.hostname` 自动识别。

### 6.3 验证前端

- 浏览器访问 `http://h.joho.cn` → 应显示后台管理页面
- 浏览器访问 `http://h.joho.cn/admin` → 应显示 Strapi 管理面板登录页
- 浏览器访问 `http://<已配置的租户域名>` → 应显示 C 端页面

> 如前端页面空白或路由 404，检查 Nginx `try_files` 配置是否正确。如 API 请求 404，检查 Nginx `/api/` 反代配置。

---

## 七、新增租户

新增租户域名的完整流程：

1. **DNS 配置**：新域名（如 `tenant.com` 或 `5.joho.cn`）A 记录指向服务器 IP
2. **1Panel 创建站点（可选）**：
   - 如需独立 SSL 或独立日志，在 1Panel 中为新域名创建静态站点并申请证书
   - 如不需要独立 SSL，可跳过此步——`default_server` 会自动匹配所有未明确配置的域名
3. **后台配置站点**：
   - 浏览器登录 `http://h.joho.cn` 后台管理
   - 进入 **系统设置** → **站点配置** → **新增**
   - 填写：
     - `siteName`：站点名称（如「某某教育」）
     - `domain`：新域名（如 `tenant.com`，与 DNS 一致）
     - 选择模板（template）
     - 按需配置 featureFlags
4. **验证**：浏览器访问新域名，shao 前端加载，API 请求自动识别租户并返回对应站点数据

> 新增租户无需修改 Nginx 配置（`default_server` 通配匹配）。仅当需要为该租户单独配置 SSL 时，才需在 1Panel 中创建站点并申请证书。

---

## 八、日常运维

### 8.1 PM2 命令

```bash
pm2 status              # 查看进程状态
pm2 logs strapi         # 查看日志（实时）
pm2 logs strapi --lines 100   # 查看最近 100 行日志
pm2 restart strapi      # 重启 Strapi
pm2 reload strapi       # 零停机重启（Strapi fork 模式下等同于 restart）
pm2 stop strapi         # 停止 Strapi
pm2 monit               # 监控面板（CPU/内存/日志）
pm2 list                # 进程列表
```

### 8.2 Nginx 命令

```bash
nginx -t                 # 测试配置语法
nginx -s reload          # 重新加载配置（不停机）
nginx -s stop            # 停止 Nginx

# 查看访问日志
tail -f /var/log/nginx/h.joho.cn.access.log

# 查看错误日志
tail -f /var/log/nginx/h.joho.cn.error.log

# 查看租户站点日志
tail -f /var/log/nginx/tenant-default.error.log
```

> 1Panel 中 OpenResty 以容器方式运行，上述命令需在容器内执行，或通过 1Panel 面板「网站 → 日志」查看。也可使用：`docker exec $(docker ps --filter "name=openresty" -q) nginx -t`

### 8.3 数据库备份

**方式一：通过 1Panel 面板（推荐）**

1. 1Panel 面板 → **数据库** → PostgreSQL → 选择 `strapi` 数据库 → **备份**
2. 备份文件可下载到本地或上传到 1Panel 已对接的对象存储
3. 可在「计划任务」中设置定时自动备份

**方式二：命令行**

```bash
# 导出数据库（在服务器执行）
docker exec $(docker ps --filter "name=postgresql" -q) pg_dump -U postgres strapi > /opt/strapi/backup/strapi_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i $(docker ps --filter "name=postgresql" -q) psql -U postgres strapi < /opt/strapi/backup/strapi_20260710_120000.sql
```

建议配置定时备份（crontab）：

```bash
# 每天凌晨 3 点自动备份，保留最近 30 天
crontab -e
# 添加以下行：
0 3 * * * docker exec $(docker ps --filter "name=postgresql" -q) pg_dump -U postgres strapi > /opt/strapi/backup/strapi_$(date +\%Y\%m\%d).sql && find /opt/strapi/backup/ -name "strapi_*.sql" -mtime +30 -delete
```

### 8.4 更新部署

代码更新后的标准部署流程：

```bash
cd /opt/strapi/basic
git pull origin main
npm install --legacy-peer-deps
./scripts/build-plugins.sh
npm run build
pm2 restart strapi
```

也可使用项目自带的一键部署脚本 `docs/deployment/deploy.sh`（需先修改脚本中的 `SSH_USER`、`SSH_HOST` 等配置区，并在本地执行，会同时部署后端和前端）。

---

## 九、故障排查

### 9.1 502 Bad Gateway

表示 Nginx 无法连接到 Strapi 后端。

```bash
# 检查 Strapi 是否运行
pm2 status
# 如状态非 online，查看日志定位原因
pm2 logs strapi --lines 100

# 检查端口是否监听
ss -tlnp | grep 1337
# 应看到 127.0.0.1:1337 LISTEN

# 如 Strapi 未运行，尝试重启
pm2 restart strapi
```

常见原因：`.env` 配置错误（数据库密码不对、Redis 连不上）、构建产物缺失（未执行 build-plugins.sh）、内存不足导致进程被杀。

### 9.2 前端 API 404

```bash
# 检查 Nginx /api/ 反代配置是否存在
# 1Panel 面板 → 网站 → 对应站点 → 配置 → Nginx 配置
# 确认包含 location /api/ { proxy_pass http://127.0.0.1:1337/api/; }

# 检查 Strapi 路由是否注册
curl http://127.0.0.1:1337/_health
# 健康检查通过则后端正常，问题在 Nginx 配置或前端请求路径

# 重新加载 Nginx
nginx -t && nginx -s reload
```

### 9.3 租户域名无法识别

租户访问 C 端时未识别到对应站点。

```bash
# 检查 DNS 解析是否指向服务器 IP
dig <租户域名>
# 或
nslookup <租户域名>

# 检查 Nginx default_server 配置是否生效（应命中租户站点而非 h.joho.cn）
curl -H "Host: <租户域名>" http://127.0.0.1/

# 检查后台站点配置的 domain 字段是否与实际访问域名完全一致（含/不含 www）
# 登录 h.joho.cn 后台 → 系统设置 → 站点配置 → 确认 domain 字段

# 查看后端 site-resolver 中间件日志
pm2 logs strapi | grep site-resolver
```

常见原因：DNS 未生效、`default_server` 配置被其他站点覆盖、后台 `domain` 字段与实际域名不一致（注意 `www` 前缀差异）。

### 9.4 数据库连接失败

```bash
# 检查 PostgreSQL 容器状态
docker ps | grep postgresql
# 如未运行，启动它
docker start $(docker ps -a --filter "name=postgresql" -q)

# 检查端口映射
ss -tlnp | grep 5432

# 检查 .env 数据库配置
cat /opt/strapi/basic/.env | grep DATABASE

# 测试连接
docker exec -it $(docker ps --filter "name=postgresql" -q) psql -U postgres -d strapi -c "SELECT 1;"

# 查看 Strapi 启动日志中的数据库错误
pm2 logs strapi --lines 50 | grep -i "database\|knex\|connection"
```

常见原因：`.env` 中 `DATABASE_PASSWORD` 不对、1Panel PostgreSQL 容器未启动、端口映射绑定地址非 127.0.0.1。

### 9.5 内存不足

Strapi 构建（`npm run build`）和插件构建消耗大量内存。

```bash
# 查看内存使用
free -h

# 查看 PM2 进程内存
pm2 monit

# 查看 OOM 杀死记录
dmesg | grep -i "out of memory\|killed process"
```

临时增加 swap（4GB 内存服务器构建时强烈建议）：

```bash
# 创建 4GB swap 文件
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效（写入 fstab）
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 查看swap已启用
free -h
```

PM2 已配置 `max_memory_restart: 2G`，运行时内存超过 2G 会自动重启，避免内存泄漏导致服务器崩溃。构建完成后可按需关闭 swap。

---

## 十、附录

### 10.1 端口清单

| 服务 | 端口 | 对外 | 备注 |
|---|---|---|---|
| OpenResty | 80/443 | 是 | 唯一对外端口，所有流量入口 |
| Strapi | 1337 | 否 | 仅 127.0.0.1，PM2 管理 |
| PostgreSQL | 5432 | 否 | 仅 127.0.0.1，1Panel 容器 |
| Redis | 6379 | 否 | 仅 127.0.0.1，1Panel 容器 |
| 1Panel | 随机高位端口 | 否（建议） | 面板端口，建议不直接对外，可通过 Nginx 反代或仅限内网访问 |

### 10.2 目录清单

| 路径 | 说明 |
|---|---|
| `/opt/strapi/basic` | Strapi 后端项目目录 |
| `/opt/strapi/basic/.env` | 生产环境变量配置 |
| `/opt/strapi/ecosystem.config.js` | PM2 进程配置 |
| `/opt/strapi/logs` | PM2 日志目录（error.log / out.log） |
| `/opt/strapi/backup` | 数据库备份目录（建议创建） |
| `/var/www/web` | 后台管理静态文件（web H5 构建产物） |
| `/var/www/shao` | C 端静态文件（shao H5 构建产物，服务所有租户域名） |
| `/www/sites/h.joho.cn` | 1Panel 后台管理网站配置目录 |
| `/var/log/nginx` | Nginx 日志目录 |

### 10.3 相关文件

本部署涉及的所有配置文件（均位于项目 `docs/deployment/` 目录）：

| 文件 | 说明 |
|---|---|
| `nginx-h-joho-cn.conf` | 后台管理网站 Nginx 配置（h.joho.cn） |
| `nginx-tenant-default.conf` | C 端租户域名 Nginx 配置（default_server 通配） |
| `ecosystem.config.js` | PM2 进程管理配置 |
| `env.production.template` | 生产环境变量模板 |
| `deploy.sh` | 一键部署脚本（后端 + 前端） |
| `README.md` | 本文档 |

---

部署完成后，系统访问入口：

- 后台管理：`http://h.joho.cn`
- Strapi 管理面板：`http://h.joho.cn/admin`
- C 端：`http://<租户域名>`（需先在后台站点配置中新增）
