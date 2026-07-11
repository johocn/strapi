# 服务器配置手册

## 1. 服务器环境

### 1.1 系统要求
- **操作系统**: Ubuntu 22.04 LTS / CentOS 7+
- **内存**: 至少 4GB（建议 8GB）
- **磁盘**: 至少 40GB 可用空间
- **网络**: 公网 IP，仅开放 80/443 端口（内部服务通过 Docker 网络通信）

### 1.2 预装软件
- **1Panel**: 服务器管理面板
- **Docker**: 容器化部署
- **PostgreSQL**: 数据库（1Panel 应用商店安装）
- **Nginx**: 反向代理（1Panel 站点配置）

---

## 2. 目录结构

```
/www/
├── sites/                    # 1Panel 站点目录
│   ├── admin.joho.cn/        # Strapi 后台管理页面 (web)
│   │   └── index/            # H5 构建产物
│   ├── h.joho.cn/            # shao 多组合页面
│   │   └── index/            # H5 构建产物
│   └── shop.joho.cn/         # Vendure 前端 (vshop)
│       └── index/            # H5 构建产物
└── apps/                     # Docker 应用目录
    └── strapi/               # Strapi + Vendure 部署
        ├── docker-compose.yml
        ├── Dockerfile
        ├── dist/             # Strapi 构建产物
        ├── config/           # Strapi 配置
        ├── uploads/          # 上传文件（持久化）
        └── vendure/          # Vendure 配置
            └── assets/       # Vendure 静态资源
```

---

## 3. 数据库配置

### 3.1 创建数据库（1Panel 操作）

登录 1Panel → 数据库 → PostgreSQL → 创建数据库

| 数据库名 | 用户名 | 用途 |
|----------|--------|------|
| `strapi_prod` | `strapi_user` | Strapi 主数据库 |
| `vendure_prod` | `vendure_user` | Vendure 主数据库 |

### 3.2 配置数据库访问权限

确保 PostgreSQL 允许从 Docker 容器访问：

```sql
-- 允许从任意地址访问（生产环境建议限制 IP）
ALTER USER strapi_user WITH PASSWORD 'your_strapi_password';
ALTER USER vendure_user WITH PASSWORD 'your_vendure_password';
GRANT ALL PRIVILEGES ON DATABASE strapi_prod TO strapi_user;
GRANT ALL PRIVILEGES ON DATABASE vendure_prod TO vendure_user;
```

---

## 4. Docker Compose 部署

### 4.1 克隆代码仓库

```bash
# 克隆 Strapi 项目
cd /www/apps
git clone https://github.com/johocn/strapi.git strapi
cd strapi

# 克隆 Vendure 项目（如果 Vendure 在独立仓库）
cd /www/apps
git clone https://github.com/johocn/vendure.git vendure
```

### 4.2 构建 Strapi

```bash
cd /www/apps/strapi
npm install
npm run build
```

### 4.3 修改配置

编辑 `/www/apps/strapi/docker-compose.yml`，替换数据库密码：

```yaml
# Strapi 数据库配置
DATABASE_PASSWORD: "your_strapi_password"

# Vendure 数据库配置
DB_PASSWORD: "your_vendure_password"
```

### 4.4 启动服务

```bash
cd /www/apps/strapi
docker-compose up -d --build
```

### 4.5 验证服务

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f strapi
docker-compose logs -f vendure

# 测试 Strapi API（通过 Docker 内部网络）
docker-compose exec strapi curl http://strapi:1337/api/health

# 测试 Vendure API（通过 Docker 内部网络）
docker-compose exec vendure curl http://vendure:3000/shop-api
```

---

## 5. Nginx 站点配置

### 5.1 站点 1: admin.joho.cn（Strapi 后台管理）

**根目录**: `/www/sites/admin.joho.cn/index`

**Nginx 配置**:

```nginx
server {
    listen 80;
    server_name admin.joho.cn;

    root /www/sites/admin.joho.cn/index;
    index index.html;

    # Let's Encrypt 验证
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

    # 文件上传
    location /uploads/ {
        proxy_pass http://127.0.0.1:1337/uploads/;
        proxy_set_header Host $host;
    }

    access_log /www/sites/admin.joho.cn/log/access.log main;
    error_log /www/sites/admin.joho.cn/log/error.log;
}
```

### 5.2 站点 2: h.joho.cn（shao 多组合页面）

**根目录**: `/www/sites/h.joho.cn/index`

**Nginx 配置**:

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

### 5.3 站点 3: shop.joho.cn（Vendure 前端）

**根目录**: `/www/sites/shop.joho.cn/index`

**Nginx 配置**:

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

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Vendure Shop API
    location /shop-api/ {
        proxy_pass http://127.0.0.1:3000/shop-api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Vendure Admin API
    location /admin-api/ {
        proxy_pass http://127.0.0.1:3001/admin-api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Vendure Admin UI
    location /vendure-admin/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /www/sites/shop.joho.cn/log/access.log main;
    error_log /www/sites/shop.joho.cn/log/error.log;
}
```

---

## 6. 前端部署

### 6.1 web（Strapi 后台管理页面）

**构建命令**:

```bash
cd E:\code\web
npm install
npm run build:h5
```

**上传文件**:
- 构建产物: `E:\code\web\unpackage\dist\build\web\client\`
- 上传到服务器: `/www/sites/admin.joho.cn/index/`

### 6.2 shao（多组合页面）

**构建命令**:

```bash
cd E:\code\shao
npm install
npm run build:h5
```

**上传文件**:
- 构建产物: `E:\code\shao\unpackage\dist\build\web\client\`
- 上传到服务器: `/www/sites/h.joho.cn/index/`

### 6.3 vshop（Vendure 前端）

**构建命令**:

```bash
cd E:\code\vshop
npm install
npm run build:h5
```

**上传文件**:
- 构建产物: `E:\code\vshop\unpackage\dist\build\web\client\`
- 上传到服务器: `/www/sites/shop.joho.cn/index/`

---

## 7. SSL 配置

### 7.1 申请 SSL 证书（1Panel 操作）

1. 登录 1Panel → 站点 → 选择站点 → SSL
2. 选择 Let's Encrypt → 自动申请证书
3. 开启强制 HTTPS 跳转

### 7.2 SSL 配置示例

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

    # ... 其余配置同 HTTP
}
```

---

## 8. 运维命令

### 8.1 Docker Compose 命令

```bash
# 启动服务
cd /www/apps/strapi
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f strapi
docker-compose logs -f vendure
docker-compose logs -f redis

# 重启服务
docker-compose restart strapi

# 更新镜像（重新构建）
docker-compose up -d --build

# 查看容器状态
docker-compose ps

# 进入容器
docker-compose exec strapi bash
docker-compose exec vendure bash
```

### 8.2 数据库备份

```bash
# Strapi 数据库备份
pg_dump -h localhost -U strapi_user strapi_prod > /backup/strapi_backup_$(date +%Y%m%d).sql

# Vendure 数据库备份
pg_dump -h localhost -U vendure_user vendure_prod > /backup/vendure_backup_$(date +%Y%m%d).sql
```

### 8.3 日志查看

```bash
# Nginx 访问日志
tail -f /www/sites/admin.joho.cn/log/access.log

# Nginx 错误日志
tail -f /www/sites/admin.joho.cn/log/error.log

# Docker 日志
docker-compose logs -f --tail=100 strapi
```

---

## 9. 环境变量配置

### 9.1 Strapi 环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `DATABASE_CLIENT` | `postgres` | 数据库类型 |
| `DATABASE_HOST` | `host.docker.internal` | 数据库主机 |
| `DATABASE_PORT` | `5432` | 数据库端口 |
| `DATABASE_NAME` | `strapi_prod` | 数据库名 |
| `DATABASE_USERNAME` | `strapi_user` | 数据库用户名 |
| `DATABASE_PASSWORD` | 自定义 | 数据库密码 |
| `REDIS_HOST` | `redis` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |

### 9.2 Vendure 环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `DB_HOST` | `host.docker.internal` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `vendure_prod` | 数据库名 |
| `DB_USERNAME` | `vendure_user` | 数据库用户名 |
| `DB_PASSWORD` | 自定义 | 数据库密码 |
| `API_PORT` | `3000` | Shop API 端口 |
| `ADMIN_API_PORT` | `3001` | Admin API 端口 |
| `ADMIN_UI_PORT` | `3002` | Admin UI 端口 |
| `SUPERADMIN_USERNAME` | `superadmin` | 超级管理员用户名 |
| `SUPERADMIN_PASSWORD` | `superadmin` | 超级管理员密码 |

---

## 10. 故障排查

### 10.1 常见问题

| 问题 | 排查方法 |
|------|----------|
| Strapi 启动失败 | 查看日志 `docker-compose logs strapi` |
| 数据库连接失败 | 检查 PostgreSQL 端口是否开放，密码是否正确 |
| Nginx 502 错误 | 检查后端服务是否运行 `docker-compose ps` |
| 前端无法访问 API | 检查 Nginx 反向代理配置，验证 `proxy_pass` 地址 |
| 文件上传失败 | 检查 `client_max_body_size` 配置，确保上传目录有写入权限 |

### 10.2 端口占用

```bash
# 查看端口占用
netstat -tlnp | grep :1337
netstat -tlnp | grep :3000

# 杀掉占用进程
kill -9 $(lsof -ti:1337)
```

---

## 11. 安全建议

1. **修改默认密码**: 部署后立即修改 Strapi 和 Vendure 的管理员密码
2. **配置防火墙**: 仅开放必要端口（80、443），限制内部端口访问
3. **启用 SSL**: 所有站点强制 HTTPS
4. **定期备份**: 配置数据库自动备份任务
5. **更新镜像**: 定期更新 Docker 镜像，修复安全漏洞

---

## 12. 服务访问地址

| 服务 | 地址 |
|------|------|
| Strapi API | https://admin.joho.cn/api/ |
| Strapi Admin | https://admin.joho.cn/admin/ |
| Strapi 后台管理 | https://admin.joho.cn/ |
| shao 多组合页面 | https://h.joho.cn/ |
| Vendure Shop API | https://shop.joho.cn/shop-api/ |
| Vendure Admin API | https://shop.joho.cn/admin-api/ |
| Vendure Admin UI | https://shop.joho.cn/vendure-admin/ |
| Vendure 前端 | https://shop.joho.cn/ |